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
          eq(subscriptionKeys.usedAt, null)
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
      if (currentTier === 1) {
        monthlySubscriptionCost = 149; // Personal EMR
      } else if (currentTier === 2) {
        monthlySubscriptionCost = 399; // Enterprise EMR
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

  console.log('✅ [ClinicAdminRoutes] Clinic admin routes registered');
}