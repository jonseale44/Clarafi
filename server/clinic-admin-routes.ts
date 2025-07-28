import { Express, Request, Response } from 'express';
import { db } from './db.js';
import { 
  users, 
  healthSystems, 
  subscriptionKeys,
  locations,
  patients,
  userLocations 
} from '../shared/schema';
import { eq, and, gte, or, sql } from 'drizzle-orm';


export function registerClinicAdminRoutes(app: Express) {
  // Middleware to ensure user is authenticated
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  // Middleware to ensure user is a clinic admin
  const requireClinicAdmin = (req: Request, res: Response, next: Function) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Clinic admin role required.' 
      });
    }
    next();
  };

  /**
   * Get clinic-specific statistics
   */
  app.get('/api/clinic-admin/stats', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const userId = req.user!.id;
      const healthSystemId = req.user!.healthSystemId;

      // Get total users in this health system
      const totalUsersResult = await db.select()
        .from(users)
        .where(eq(users.healthSystemId, healthSystemId));
      
      const totalUsers = totalUsersResult.length;

      // Count users by role
      const activeProviders = totalUsersResult.filter(u => 
        u.role === 'provider' && u.active
      ).length;
      
      const totalStaff = totalUsersResult.filter(u => 
        ['nurse', 'ma', 'front_desk', 'billing', 'lab_tech'].includes(u.role) && u.active
      ).length;

      // Get unused subscription keys
      const unusedKeysResult = await db.select()
        .from(subscriptionKeys)
        .where(and(
          eq(subscriptionKeys.healthSystemId, healthSystemId),
          eq(subscriptionKeys.status, 'active')
        ));
      
      const unusedKeys = unusedKeysResult.length;

      // Get health system details
      const healthSystemResult = await db.select()
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId))
        .limit(1);
      
      const healthSystem = healthSystemResult[0];
      const currentTier = healthSystem?.subscriptionTier || 2;

      // Calculate subscription cost based on tier
      let monthlySubscriptionCost = 0;
      let providerKeysUsed = 0;
      let nurseKeysUsed = 0;
      let staffKeysUsed = 0;
      
      if (currentTier === 1) {
        monthlySubscriptionCost = 149; // Personal EMR
      } else if (currentTier === 2) {
        // For Enterprise tier, calculate based on subscription keys in use
        const usedKeysResult = await db.select()
          .from(subscriptionKeys)
          .where(and(
            eq(subscriptionKeys.healthSystemId, healthSystemId),
            eq(subscriptionKeys.status, 'used')
          ));
        
        // Count keys by type and calculate total
        for (const key of usedKeysResult) {
          if (key.keyType === 'provider') {
            providerKeysUsed++;
          } else if (key.keyType === 'nurse') {
            nurseKeysUsed++;
          } else if (key.keyType === 'staff') {
            staffKeysUsed++;
          }
        }
        
        // Calculate total monthly cost based on per-user pricing
        monthlySubscriptionCost = (providerKeysUsed * 399) + (nurseKeysUsed * 99) + (staffKeysUsed * 49);
      }

      // Get location count
      const locationsResult = await db.select()
        .from(locations)
        .where(eq(locations.healthSystemId, healthSystemId));
      
      const locationsCount = locationsResult.length;

      // Get patient count
      const patientsResult = await db.select()
        .from(patients)
        .where(eq(patients.healthSystemId, healthSystemId));
      
      const patientsCount = patientsResult.length;

      // Mock next billing date (30 days from now)
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);



      res.json({
        totalUsers,
        activeProviders,
        totalStaff,
        unusedKeys,
        currentTier,
        subscriptionStatus: healthSystem?.subscriptionStatus || 'active',
        monthlySubscriptionCost,
        providerKeysUsed,
        nurseKeysUsed,
        staffKeysUsed,
        nextBillingDate: nextBillingDate.toISOString(),
        locationsCount,
        patientsCount
      });
    } catch (error) {
      console.error('Error fetching clinic admin stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch clinic statistics' 
      });
    }
  });

  /**
   * Get health system settings
   */
  app.get('/api/clinic-admin/health-system', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;

      const healthSystemResult = await db.select()
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId))
        .limit(1);

      if (!healthSystemResult.length) {
        return res.status(404).json({ error: 'Health system not found' });
      }

      res.json(healthSystemResult[0]);
    } catch (error) {
      console.error('Error fetching health system:', error);
      res.status(500).json({ 
        error: 'Failed to fetch health system information' 
      });
    }
  });

  /**
   * Update health system settings
   */
  app.patch('/api/clinic-admin/health-system', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      const updates = req.body;

      // Only allow updating certain fields
      const allowedFields = ['phone', 'address', 'city', 'state', 'zip'];
      const filteredUpdates: any = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const result = await db.update(healthSystems)
        .set(filteredUpdates)
        .where(eq(healthSystems.id, healthSystemId))
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating health system:', error);
      res.status(500).json({ 
        error: 'Failed to update health system information' 
      });
    }
  });

  /**
   * Get staff invitation templates
   */
  app.get('/api/clinic-admin/invitation-templates', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      // Return email templates for different roles
      const templates = {
        provider: {
          subject: 'Invitation to join [HealthSystemName] on Clarafi EMR',
          body: `Dear [StaffName],

You have been invited to join [HealthSystemName] as a Provider on the Clarafi EMR system.

To get started:
1. Click the registration link below
2. Enter the subscription key: [SubscriptionKey]
3. Complete your profile setup

Registration Link: [RegistrationLink]

This invitation expires in 30 days.

Best regards,
[AdminName]
[HealthSystemName]`
        },
        nurse: {
          subject: 'Invitation to join [HealthSystemName] on Clarafi EMR',
          body: `Dear [StaffName],

You have been invited to join [HealthSystemName] as a Nurse on the Clarafi EMR system.

To get started:
1. Click the registration link below
2. Enter the subscription key: [SubscriptionKey]
3. Complete your profile setup

Registration Link: [RegistrationLink]

This invitation expires in 30 days.

Best regards,
[AdminName]
[HealthSystemName]`
        },
        ma: {
          subject: 'Invitation to join [HealthSystemName] on Clarafi EMR',
          body: `Dear [StaffName],

You have been invited to join [HealthSystemName] as a Medical Assistant on the Clarafi EMR system.

To get started:
1. Click the registration link below
2. Enter the subscription key: [SubscriptionKey]
3. Complete your profile setup

Registration Link: [RegistrationLink]

This invitation expires in 30 days.

Best regards,
[AdminName]
[HealthSystemName]`
        }
      };

      res.json(templates);
    } catch (error) {
      console.error('Error fetching invitation templates:', error);
      res.status(500).json({ 
        error: 'Failed to fetch invitation templates' 
      });
    }
  });

  /**
   * Get users in the clinic admin's health system
   */
  app.get('/api/clinic-admin/users', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      
      // Get all users in this health system with location count
      const usersInHealthSystem = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          npi: users.npi,
          credentials: users.credentials,
          active: users.active,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          healthSystemId: users.healthSystemId,
          locationCount: sql<number>`COUNT(DISTINCT ${userLocations.locationId})`.as("locationCount"),
        })
        .from(users)
        .leftJoin(userLocations, eq(users.id, userLocations.userId))
        .where(eq(users.healthSystemId, healthSystemId))
        .groupBy(users.id)
        .orderBy(users.lastName, users.firstName);

      console.log(`🔍 [ClinicAdminRoutes] Fetched ${usersInHealthSystem.length} users for health system ${healthSystemId}`);
      res.json(usersInHealthSystem);
    } catch (error) {
      console.error('❌ [ClinicAdminRoutes] Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  /**
   * Get locations in the clinic admin's health system
   */
  app.get('/api/clinic-admin/locations', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      
      const locationsInHealthSystem = await db
        .select({
          id: locations.id,
          name: locations.name,
          shortName: locations.shortName,
          locationType: locations.locationType,
          address: locations.address,
          city: locations.city,
          state: locations.state,
          zipCode: locations.zipCode,
          phone: locations.phone,
          healthSystemId: locations.healthSystemId,
        })
        .from(locations)
        .where(eq(locations.healthSystemId, healthSystemId))
        .orderBy(locations.name);

      console.log(`🔍 [ClinicAdminRoutes] Fetched ${locationsInHealthSystem.length} locations for health system ${healthSystemId}`);
      res.json(locationsInHealthSystem);
    } catch (error) {
      console.error('❌ [ClinicAdminRoutes] Error fetching locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  });

  /**
   * Create a new location for the clinic admin's health system
   */
  app.post('/api/clinic-admin/locations', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      const { name, shortName, address, city, state, zipCode, phone, npi, taxId, locationType } = req.body;

      // Validate required fields
      if (!name || !address || !city || !state || !zipCode) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, address, city, state, and zipCode are required' 
        });
      }

      // Create the location
      const [newLocation] = await db.insert(locations)
        .values({
          name,
          shortName: shortName || name.substring(0, 20),
          address,
          city,
          state,
          zipCode,
          phone,
          npi,
          taxId,
          locationType: locationType || 'clinic',
          healthSystemId,
          active: true,
        })
        .returning();

      console.log(`✅ [ClinicAdminRoutes] Created new location: ${newLocation.id} for health system ${healthSystemId}`);
      res.status(201).json(newLocation);
    } catch (error) {
      console.error('❌ [ClinicAdminRoutes] Error creating location:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  });

  /**
   * Update a location in the clinic admin's health system
   */
  app.put('/api/clinic-admin/locations/:id', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      const locationId = parseInt(req.params.id);
      const updates = req.body;

      // Verify the location belongs to this health system
      const [existingLocation] = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, locationId),
          eq(locations.healthSystemId, healthSystemId)
        ))
        .limit(1);

      if (!existingLocation) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Update the location
      const [updatedLocation] = await db.update(locations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, locationId))
        .returning();

      console.log(`✅ [ClinicAdminRoutes] Updated location: ${locationId} for health system ${healthSystemId}`);
      res.json(updatedLocation);
    } catch (error) {
      console.error('❌ [ClinicAdminRoutes] Error updating location:', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  });

  /**
   * Delete a location from the clinic admin's health system
   */
  app.delete('/api/clinic-admin/locations/:id', requireAuth, requireClinicAdmin, async (req, res) => {
    try {
      const healthSystemId = req.user!.healthSystemId;
      const locationId = parseInt(req.params.id);

      // Verify the location belongs to this health system
      const [existingLocation] = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, locationId),
          eq(locations.healthSystemId, healthSystemId)
        ))
        .limit(1);

      if (!existingLocation) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Check if location has associated users
      const associatedUsers = await db.select()
        .from(userLocations)
        .where(eq(userLocations.locationId, locationId))
        .limit(1);

      if (associatedUsers.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete location with associated users. Please reassign users first.' 
        });
      }

      // Delete the location
      await db.delete(locations)
        .where(eq(locations.id, locationId));

      console.log(`✅ [ClinicAdminRoutes] Deleted location: ${locationId} for health system ${healthSystemId}`);
      res.json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('❌ [ClinicAdminRoutes] Error deleting location:', error);
      res.status(500).json({ error: 'Failed to delete location' });
    }
  });

  /**
   * Reset user password
   */
  app.post('/api/clinic-admin/users/:userId/reset-password', requireAuth, requireClinicAdmin, async (req, res) => {
    const { userId } = req.params;
    
    console.log('🔑 [ClinicAdmin] Password reset request for user:', userId);
    
    try {
      const userIdNum = parseInt(userId);
      
      // Verify clinic admin can reset this user
      const [targetUser] = await db.select()
        .from(users)
        .where(and(
          eq(users.id, userIdNum),
          eq(users.healthSystemId, req.user!.healthSystemId)
        ))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Update user with reset token
      await db.update(users)
        .set({
          emailVerificationToken: resetToken,
          emailVerificationExpires: resetExpires,
          requirePasswordChange: true
        })
        .where(eq(users.id, userIdNum));
      
      // Send password reset email
      try {
        const sgMail = await import('@sendgrid/mail');
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY || '');
        
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
        
        const msg = {
          to: targetUser.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.com',
          subject: 'Password Reset Request - CLARAFI',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>Hello ${targetUser.firstName},</p>
              <p>Your CLARAFI administrator has requested a password reset for your account.</p>
              <p>Please click the link below to reset your password:</p>
              <p style="margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Reset Password
                </a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all;">${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you did not request this password reset, please contact your administrator immediately.</p>
              <p>Best regards,<br>The CLARAFI Team</p>
            </div>
          `
        };
        
        await sgMail.default.send(msg);
        console.log('✅ [ClinicAdmin] Password reset email sent to:', targetUser.email);
        res.json({ success: true, message: 'Password reset email sent' });
      } catch (emailError) {
        console.error('❌ [ClinicAdmin] Error sending password reset email:', emailError);
        // Still return success - admin can see the error in logs
        res.json({ success: true, message: 'Password reset initiated (email may have failed)' });
      }
      
    } catch (error) {
      console.error('❌ [ClinicAdmin] Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  console.log('✅ [ClinicAdminRoutes] Clinic admin routes registered');
}