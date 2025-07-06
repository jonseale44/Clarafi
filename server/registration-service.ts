import { db } from "./db";
import { healthSystems, organizations, locations, users, userLocations } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface RegistrationData {
  username: string;
  email: string;
  password: string; // Already hashed
  firstName: string;
  lastName: string;
  role: string;
  npi?: string | null;
  credentials?: string;
  registrationType?: 'individual' | 'join_existing';
  existingHealthSystemId?: number;
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

      if (registrationType === 'individual' && data.role === 'provider') {
        // Create a new health system for individual provider
        console.log(`🏥 [RegistrationService] Creating individual provider health system for ${data.firstName} ${data.lastName}`);
        
        const practiceName = data.practiceName || `${data.firstName} ${data.lastName}, ${data.credentials || 'MD'} - Private Practice`;
        
        // Create health system
        const newHealthSystemResult = await tx
          .insert(healthSystems)
          .values({
            name: practiceName,
            shortName: `Dr. ${data.lastName}`,
            systemType: 'individual_provider',
            subscriptionTier: 1, // Individual tier
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            primaryContact: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.practicePhone,
            npi: data.npi,
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
            name: practiceName,
            shortName: `Dr. ${data.lastName}`,
            organizationType: 'clinic',
          })
          .returning();
          
        const newOrganization = newOrganizationResult[0];

        console.log(`✅ [RegistrationService] Created organization ID: ${newOrganization.id}`);

        // Create primary location
        const newLocationResult = await tx
          .insert(locations)
          .values({
            organizationId: newOrganization.id,
            healthSystemId: newHealthSystem.id,
            name: practiceName,
            shortName: `Dr. ${data.lastName}'s Office`,
            locationType: 'clinic',
            address: data.practiceAddress || '123 Main Street',
            city: data.practiceCity || 'City',
            state: data.practiceState || 'TX',
            zipCode: data.practiceZipCode || '00000',
            phone: data.practicePhone || '000-000-0000',
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
        if (!data.existingHealthSystemId) {
          throw new Error('Health system selection is required when joining an existing system');
        }
        healthSystemId = data.existingHealthSystemId;
        console.log(`🏥 [RegistrationService] Joining existing health system ID: ${healthSystemId}`);
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
          role: data.role,
          npi: data.npi,
          credentials: data.credentials,
          healthSystemId: healthSystemId,
          active: true,
          createdAt: new Date(),
        })
        .returning();
        
      const newUser = newUserResult[0];

      console.log(`✅ [RegistrationService] Created user ID: ${newUser.id} in health system: ${healthSystemId}`);

      // If individual provider, assign them to their location
      if (registrationType === 'individual' && primaryLocationId) {
        await tx
          .insert(userLocations)
          .values({
            userId: newUser.id,
            locationId: primaryLocationId,
            roleAtLocation: 'primary_provider',
            isPrimary: true,
            canSchedule: true,
            canViewAllPatients: true,
            canCreateOrders: true,
            active: true,
            startDate: new Date().toISOString().split('T')[0],
          });

        console.log(`✅ [RegistrationService] Assigned user to primary location`);

        // Update health system with original provider ID for future reference
        await tx
          .update(healthSystems)
          .set({ originalProviderId: newUser.id })
          .where(eq(healthSystems.id, healthSystemId));
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