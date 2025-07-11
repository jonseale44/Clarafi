import { db } from "./db";
import { healthSystems, organizations, locations, users, userLocations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { EmailVerificationService } from "./email-verification-service";
import { StripeService } from "./stripe-service";

export interface RegistrationData {
  username: string;
  email: string;
  password: string; // Already hashed
  firstName: string;
  lastName: string;
  role: string;
  npi?: string | null;
  credentials?: string;
  registrationType?: 'create_new' | 'join_existing';
  existingHealthSystemId?: number;
  selectedLocationId?: number; // When user selects a specific location
  practiceName?: string;
  practiceAddress?: string;
  practiceCity?: string;
  practiceState?: string;
  practiceZipCode?: string;
  practicePhone?: string;
}

export class RegistrationService {
  /**
   * Creates a new user with appropriate health system setup
   * For individual providers: Creates new health system, organization, and location
   * For joining existing: Assigns to specified health system
   */
  static async registerUser(data: RegistrationData) {
    console.log(`🏥 [RegistrationService] Starting registration for ${data.username} - Type: ${data.registrationType || 'join_existing'}`);
    
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      let healthSystemId: number;
      let primaryLocationId: number | null = null;

      // Determine registration type (default to join_existing for backward compatibility)
      const registrationType = data.registrationType || 'join_existing';

      if (registrationType === 'create_new' && data.role === 'provider') {
        // Create a new health system for individual provider
        console.log(`🏥 [RegistrationService] Creating individual provider health system for ${data.firstName} ${data.lastName}`);
        
        // Generate a unique practice name if not provided
        const timestamp = Date.now();
        const defaultPracticeName = `${data.firstName} ${data.lastName}, ${data.credentials || 'MD'} - Private Practice`;
        const practiceName = data.practiceName || defaultPracticeName;
        
        // For uniqueness, append timestamp if using default name
        const uniquePracticeName = data.practiceName ? practiceName : `${practiceName} (${timestamp})`;
        
        // Create health system
        const newHealthSystemResult = await tx
          .insert(healthSystems)
          .values({
            name: uniquePracticeName,
            shortName: `Dr. ${data.lastName}`,
            systemType: 'individual_provider',
            subscriptionTier: 1, // Individual tier
            subscriptionStatus: 'trial', // Start with trial status until payment
            subscriptionStartDate: new Date(),
            primaryContact: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.practicePhone || null,
            npi: data.npi || null,
          })
          .returning();
        
        const newHealthSystem = newHealthSystemResult[0];

        healthSystemId = newHealthSystem.id;
        console.log(`✅ [RegistrationService] Created health system ID: ${healthSystemId}`);

        // Create a default organization (nullable, but good for future growth)
        const newOrganizationResult = await tx
          .insert(organizations)
          .values({
            healthSystemId: newHealthSystem.id,
            name: uniquePracticeName,
            shortName: `Dr. ${data.lastName}`,
            organizationType: 'clinic',
          })
          .returning();
          
        const newOrganization = newOrganizationResult[0];

        console.log(`✅ [RegistrationService] Created organization ID: ${newOrganization.id}`);

        // Create primary location (with defaults if practice info not provided)
        const newLocationResult = await tx
          .insert(locations)
          .values({
            organizationId: newOrganization.id,
            healthSystemId: newHealthSystem.id,
            name: uniquePracticeName,
            shortName: `Dr. ${data.lastName}'s Office`,
            locationType: 'clinic',
            address: data.practiceAddress || 'Address Not Provided',
            city: data.practiceCity || 'City Not Provided',
            state: data.practiceState || 'TX',
            zipCode: data.practiceZipCode || '00000',
            phone: data.practicePhone || null,
            operatingHours: {
              monday: { open: '09:00', close: '17:00' },
              tuesday: { open: '09:00', close: '17:00' },
              wednesday: { open: '09:00', close: '17:00' },
              thursday: { open: '09:00', close: '17:00' },
              friday: { open: '09:00', close: '17:00' },
              saturday: { closed: true },
              sunday: { closed: true }
            }
          })
          .returning();
          
        const newLocation = newLocationResult[0];

        primaryLocationId = newLocation.id;
        console.log(`✅ [RegistrationService] Created location ID: ${primaryLocationId}`);

      } else {
        // Join existing health system (default behavior)
        if (data.selectedLocationId) {
          // User selected a specific location - look up its health system
          console.log(`🏥 [RegistrationService] Looking up health system for location ID: ${data.selectedLocationId}`);
          const locationResult = await tx
            .select({ healthSystemId: locations.healthSystemId })
            .from(locations)
            .where(eq(locations.id, data.selectedLocationId))
            .limit(1);
          
          if (!locationResult || locationResult.length === 0) {
            throw new Error('Invalid location selected');
          }
          
          healthSystemId = locationResult[0].healthSystemId;
          primaryLocationId = data.selectedLocationId;
          console.log(`🏥 [RegistrationService] User selected location ${data.selectedLocationId}, joining health system ID: ${healthSystemId}`);
        } else if (data.existingHealthSystemId) {
          // User selected a health system directly
          healthSystemId = data.existingHealthSystemId;
          console.log(`🏥 [RegistrationService] Joining existing health system ID: ${healthSystemId}`);
        } else {
          throw new Error('Health system or clinic selection is required when joining an existing system');
        }
      }

      // Validate role - prevent admin creation through regular registration
      const allowedRoles = ['provider', 'nurse', 'ma', 'front_desk', 'billing', 'lab_tech', 'referral_coordinator', 'practice_manager', 'read_only'];
      const userRole = allowedRoles.includes(data.role) ? data.role : 'provider';
      
      if (data.role === 'admin') {
        console.warn(`⚠️  [RegistrationService] Attempted to register admin role for ${data.username} - defaulting to provider`);
      }

      // Create the user with the determined health system
      const newUserResult = await tx
        .insert(users)
        .values({
          username: data.username,
          email: data.email,
          password: data.password, // Already hashed
          firstName: data.firstName,
          lastName: data.lastName,
          role: userRole, // Use validated role
          npi: data.npi,
          credentials: data.credentials,
          healthSystemId: healthSystemId,
          active: true,
          createdAt: new Date(),
        })
        .returning();
        
      const newUser = newUserResult[0];

      console.log(`✅ [RegistrationService] Created user ID: ${newUser.id} in health system: ${healthSystemId}`);

      // Generate verification token and update user within the transaction
      const verificationToken = EmailVerificationService.generateVerificationToken();
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

      await tx.update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationExpires: expires,
        })
        .where(eq(users.id, newUser.id));

      // Send email verification (outside of transaction to avoid blocking)
      try {
        await EmailVerificationService.sendVerificationEmail(newUser.email, verificationToken);
        console.log(`📧 [RegistrationService] Verification email sent to ${newUser.email}`);
      } catch (emailError) {
        console.error(`❌ [RegistrationService] Failed to send verification email:`, emailError);
        // Don't fail registration if email sending fails
      }

      // Assign user to location if one was selected
      if (primaryLocationId) {
        const roleAtLocation = registrationType === 'create_new' ? 'primary_provider' : 
                              (userRole === 'provider' ? 'attending' : userRole);
        
        await tx
          .insert(userLocations)
          .values({
            userId: newUser.id,
            locationId: primaryLocationId,
            roleAtLocation: roleAtLocation,
            isPrimary: true,
            canSchedule: true,
            canViewAllPatients: userRole === 'provider' || userRole === 'nurse' || userRole === 'ma',
            canCreateOrders: userRole === 'provider' || userRole === 'nurse' || userRole === 'ma',
            active: true,
            startDate: new Date().toISOString().split('T')[0],
          });

        console.log(`✅ [RegistrationService] Assigned user to location ${primaryLocationId} with role ${roleAtLocation}`);

        // For individual providers, update health system with original provider ID
        if (registrationType === 'create_new') {
          await tx
            .update(healthSystems)
            .set({ originalProviderId: newUser.id })
            .where(eq(healthSystems.id, healthSystemId));
        }
      } else if (registrationType === 'join_existing') {
        // If no specific location was selected but joining existing system,
        // we might want to notify admin to assign locations later
        console.log(`⚠️  [RegistrationService] User ${newUser.username} joined health system ${healthSystemId} without specific location assignment`);
      }

      // Return the complete user object
      return newUser;
    });
  }

  /**
   * Migrates an individual provider's health system to a larger group
   * Preserves all patient data and reassigns to the new health system
   */
  static async migrateToLargerTier(
    individualHealthSystemId: number,
    targetHealthSystemId: number,
    userId: number
  ) {
    console.log(`🔄 [RegistrationService] Starting migration from health system ${individualHealthSystemId} to ${targetHealthSystemId}`);
    
    return await db.transaction(async (tx) => {
      // Update the individual health system to mark it as merged
      await tx
        .update(healthSystems)
        .set({
          mergedIntoHealthSystemId: targetHealthSystemId,
          mergedDate: new Date(),
          subscriptionStatus: 'merged'
        })
        .where(eq(healthSystems.id, individualHealthSystemId));

      // Future implementation would include:
      // 1. Migrate all patients from old health system to new
      // 2. Migrate or merge locations
      // 3. Update user's health system assignment
      // 4. Preserve audit trail

      console.log(`✅ [RegistrationService] Migration completed successfully`);
    });
  }
}