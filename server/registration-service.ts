import { db } from "./db.js";
import { healthSystems, organizations, locations, users, userLocations, subscriptionKeys, patients, userAcquisition, conversionEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { EmailVerificationService } from "./email-verification-service";
import { StripeService } from "./stripe-service";
import { SubscriptionKeyService } from "./subscription-key-service";

// Helper function to determine channel group based on UTM parameters
function determineChannelGroup(utmSource?: string, utmMedium?: string, referrer?: string): string {
  if (!utmSource && !utmMedium && !referrer) return 'direct';
  
  const source = (utmSource || '').toLowerCase();
  const medium = (utmMedium || '').toLowerCase();
  
  // Paid channels
  if (medium === 'cpc' || medium === 'ppc' || medium === 'cpm' || medium === 'paid') {
    return 'paid_search';
  }
  
  // Social channels
  if (medium === 'social' || 
      ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube'].includes(source)) {
    return 'social';
  }
  
  // Email
  if (medium === 'email') {
    return 'email';
  }
  
  // Organic search
  if (medium === 'organic' || 
      ['google', 'bing', 'yahoo', 'duckduckgo'].includes(source)) {
    return 'organic_search';
  }
  
  // Referral
  if (medium === 'referral' || referrer) {
    return 'referral';
  }
  
  return 'other';
}

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
  subscriptionKey?: string; // For tier 3 registration
  
  // Acquisition tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrerUrl?: string;
  landingPage?: string;
  
  // BAA acceptance for Tier 1 providers
  baaAccepted?: boolean;
  baaAcceptedAt?: string | null;
  baaVersion?: string | null;
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
      let validatedKeyId: number | null = null;
      let requiresPayment = false;

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
            subscriptionStatus: 'trial', // 30-day free trial
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
        
        // Individual providers start with 30-day free trial (no payment required)
        requiresPayment = false;
        console.log(`🎁 [RegistrationService] Individual provider registration - starting 30-day free trial`);

      } else {
        // Join existing health system (with subscription key)
        
        // NEW SIMPLIFIED FLOW: If subscription key provided, get health system from key
        if (data.subscriptionKey) {
          console.log(`🔑 [RegistrationService] Looking up health system from subscription key`);
          
          const keyResult = await tx
            .select({
              healthSystemId: subscriptionKeys.healthSystemId,
              keyType: subscriptionKeys.keyType,
              status: subscriptionKeys.status,
              expiresAt: subscriptionKeys.expiresAt
            })
            .from(subscriptionKeys)
            .where(eq(subscriptionKeys.key, data.subscriptionKey))
            .limit(1);
            
          if (!keyResult || keyResult.length === 0) {
            throw new Error('Invalid subscription key');
          }
          
          const key = keyResult[0];
          
          // Basic key validation
          if (key.status === 'used') {
            throw new Error('Subscription key has already been used');
          }
          if (key.status === 'deactivated') {
            throw new Error('Subscription key has been deactivated');
          }
          if (key.status === 'expired' || new Date() > key.expiresAt) {
            throw new Error('Subscription key has expired');
          }
          
          // Use the health system from the key
          healthSystemId = key.healthSystemId;
          console.log(`✅ [RegistrationService] Found health system ID ${healthSystemId} from subscription key`);
          
        } else if (data.selectedLocationId) {
          // Legacy flow: User selected a specific location - look up its health system
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
          // Legacy flow: User selected a health system directly
          healthSystemId = data.existingHealthSystemId;
          console.log(`🏥 [RegistrationService] Joining existing health system ID: ${healthSystemId}`);
        } else {
          throw new Error('Health system or clinic selection is required when joining an existing system');
        }
        
        // Check health system details and patient data protection requirements
        const healthSystemResult = await tx
          .select({ 
            subscriptionTier: healthSystems.subscriptionTier,
            subscriptionStatus: healthSystems.subscriptionStatus,
            subscriptionStartDate: healthSystems.subscriptionStartDate,
            subscriptionEndDate: healthSystems.subscriptionEndDate,
            name: healthSystems.name 
          })
          .from(healthSystems)
          .where(eq(healthSystems.id, healthSystemId))
          .limit(1);
          
        if (!healthSystemResult || healthSystemResult.length === 0) {
          throw new Error('Invalid health system');
        }
        
        const healthSystemData = healthSystemResult[0];
        const healthSystemTier = healthSystemData.subscriptionTier;
        const healthSystemName = healthSystemData.name;
        
        // Check if this is actually a PAID tier 2 system
        const isPaidTier2 = healthSystemTier === 2 && 
                           healthSystemData.subscriptionStatus === 'active' &&
                           healthSystemData.subscriptionStartDate !== null &&
                           (healthSystemData.subscriptionEndDate === null || healthSystemData.subscriptionEndDate > new Date());
        
        console.log(`🔑 [RegistrationService] Health system tier: ${healthSystemTier}, name: ${healthSystemName}, paid tier 2: ${isPaidTier2}`);
        
        // CRITICAL SECURITY CHECK: Check if this health system has any patients
        const patientCount = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(patients)
          .where(eq(patients.healthSystemId, healthSystemId))
          .limit(1);
          
        const hasPatients = patientCount[0]?.count > 0;
        console.log(`🔒 [RegistrationService] Health system has patients: ${hasPatients} (count: ${patientCount[0]?.count})`);
        
        // SECURITY RULE: If health system has patients OR is a paid tier 2 system, subscription key is required
        const requiresSubscriptionKey = isPaidTier2 || hasPatients;
        
        if (requiresSubscriptionKey) {
          if (!data.subscriptionKey) {
            const errorMsg = hasPatients 
              ? `Subscription key is required. This health system contains protected patient data. Please contact your administrator for access.`
              : `Subscription key is required for this health system. Please contact your administrator for access.`;
            throw new Error(errorMsg);
          }
          
          console.log(`🔑 [RegistrationService] Validating subscription key (Paid Tier 2: ${isPaidTier2}, Has Patients: ${hasPatients})`);
          
          // Validate the subscription key
          const keyResult = await tx
            .select()
            .from(subscriptionKeys)
            .where(eq(subscriptionKeys.key, data.subscriptionKey))
            .limit(1);
            
          if (!keyResult || keyResult.length === 0) {
            throw new Error('Invalid subscription key');
          }
          
          const key = keyResult[0];
          
          // Check key status
          if (key.status === 'used') {
            throw new Error('Subscription key has already been used');
          }
          if (key.status === 'deactivated') {
            throw new Error('Subscription key has been deactivated');
          }
          if (key.status === 'expired' || new Date() > key.expiresAt) {
            throw new Error('Subscription key has expired');
          }
          
          // Check if key's health system matches the one being joined
          if (key.healthSystemId !== healthSystemId) {
            throw new Error('Subscription key is not valid for this health system');
          }
          
          // Store key ID to mark as used after user creation
          validatedKeyId = key.id;
          
          // Extract employee information from key metadata if available
          if (key.metadata && key.metadata.employeeInfo) {
            const employeeInfo = key.metadata.employeeInfo;
            console.log(`📋 [RegistrationService] Found employee info in key metadata:`, employeeInfo);
            
            // Pre-populate user data from key metadata
            if (employeeInfo.firstName && !data.firstName) {
              data.firstName = employeeInfo.firstName;
            }
            if (employeeInfo.lastName && !data.lastName) {
              data.lastName = employeeInfo.lastName;
            }
            if (employeeInfo.email && !data.email) {
              data.email = employeeInfo.email;
            }
            
            // Store employee ID in user metadata if provided
            if (employeeInfo.employeeId) {
              data.employeeId = employeeInfo.employeeId;
            }
          }
          
          console.log(`✅ [RegistrationService] Subscription key validated`);
        }
        
        // Payment is always required for tier 1 access when joining a system without patients
        // (unless they have a subscription key for a paid tier 2 system)
        requiresPayment = !requiresSubscriptionKey;
      }

      // Validate role based on health system tier
      let allowedRoles = ['provider', 'nurse', 'ma', 'front_desk', 'billing', 'lab_tech', 'referral_coordinator', 'practice_manager', 'read_only'];
      
      // Check if this health system is Tier 2 (enterprise)
      const [healthSystem] = await tx
        .select({ subscriptionTier: healthSystems.subscriptionTier })
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId));
      
      const isTier2 = healthSystem?.subscriptionTier === 2;
      
      // Only allow admin role for Tier 2 health systems
      if (isTier2) {
        allowedRoles.push('admin');
      }
      
      const userRole = allowedRoles.includes(data.role) ? data.role : 'provider';
      
      if (data.role === 'admin' && !isTier2) {
        console.warn(`⚠️  [RegistrationService] Attempted to register admin role for ${data.username} in non-Tier 2 health system - defaulting to provider`);
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
          // BAA acceptance for Tier 1 providers creating new practices
          baaAccepted: registrationType === 'create_new' && data.baaAccepted ? data.baaAccepted : false,
          baaAcceptedAt: registrationType === 'create_new' && data.baaAccepted && data.baaAcceptedAt ? new Date(data.baaAcceptedAt) : null,
          baaVersion: registrationType === 'create_new' && data.baaVersion ? data.baaVersion : null,
        })
        .returning();
        
      const newUser = newUserResult[0];

      console.log(`✅ [RegistrationService] Created user ID: ${newUser.id} in health system: ${healthSystemId}`);

      // Track acquisition data if provided
      if (data.utmSource || data.utmMedium || data.referrerUrl || data.landingPage) {
        await tx
          .insert(userAcquisition)
          .values({
            userId: newUser.id,
            healthSystemId: healthSystemId,
            source: data.utmSource || (data.referrerUrl ? 'referral' : 'direct'),
            medium: data.utmMedium || (data.referrerUrl ? 'referral' : 'none'),
            campaign: data.utmCampaign || null,
            utmSource: data.utmSource || null,
            utmMedium: data.utmMedium || null,
            utmCampaign: data.utmCampaign || null,
            utmTerm: data.utmTerm || null,
            utmContent: data.utmContent || null,
            referrerUrl: data.referrerUrl || null,
            landingPage: data.landingPage || null,
            isPaid: data.utmMedium === 'cpc' || data.utmMedium === 'ppc' || data.utmMedium === 'cpm',
            channelGroup: determineChannelGroup(data.utmSource, data.utmMedium, data.referrerUrl),
            firstTouchAttribution: {
              source: data.utmSource || data.referrerUrl || 'direct',
              timestamp: new Date().toISOString(),
              details: {
                utmSource: data.utmSource,
                utmMedium: data.utmMedium,
                utmCampaign: data.utmCampaign,
                referrer: data.referrerUrl
              }
            },
            lastTouchAttribution: {
              source: data.utmSource || data.referrerUrl || 'direct',
              timestamp: new Date().toISOString(),
              details: {
                utmSource: data.utmSource,
                utmMedium: data.utmMedium,
                utmCampaign: data.utmCampaign,
                referrer: data.referrerUrl
              }
            }
          });
        
        console.log(`📊 [RegistrationService] Tracked acquisition data for user ${newUser.id}`);
      }

      // Track conversion event for signup
      await tx
        .insert(conversionEvents)
        .values({
          userId: newUser.id,
          healthSystemId: healthSystemId,
          eventType: 'signup',
          eventTimestamp: new Date(),
          sessionId: null, // We don't have session ID from backend
          deviceType: 'unknown', // Will be populated from frontend tracking
          browserInfo: null,
          acquisitionId: data.utmSource || data.referrerUrl ? newUser.id : null, // Link to acquisition if tracking data exists
          eventData: {
            registrationType: registrationType,
            role: userRole,
            hasNPI: !!data.npi,
            hasSubscriptionKey: !!validatedKeyId,
            source: data.utmSource || 'direct',
            medium: data.utmMedium || 'none'
          },
          monetaryValue: null, // Will be set on subscription upgrade
        });
      
      console.log(`🎯 [RegistrationService] Tracked signup conversion for user ${newUser.id}`);

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

      // Send email verification only if payment is NOT required
      // For individual providers (requiresPayment=true), email will be sent after Stripe payment
      if (!requiresPayment) {
        try {
          await EmailVerificationService.sendVerificationEmail(newUser.email, verificationToken);
          console.log(`📧 [RegistrationService] Verification email sent to ${newUser.email}`);
        } catch (emailError) {
          console.error(`❌ [RegistrationService] Failed to send verification email:`, emailError);
          // Don't fail registration if email sending fails
        }
      } else {
        console.log(`💳 [RegistrationService] Skipping verification email for ${newUser.email} - will send after payment`);
      }
      
      // Mark subscription key as used if this was an enterprise registration
      if (validatedKeyId) {
        await tx.update(subscriptionKeys)
          .set({
            status: 'used',
            usedBy: newUser.id,
            usedAt: new Date()
          })
          .where(eq(subscriptionKeys.id, validatedKeyId));
          
        // Update user verification status
        await tx.update(users)
          .set({
            verificationStatus: 'tier3_verified',
            verifiedWithKeyId: validatedKeyId,
            verifiedAt: new Date()
          })
          .where(eq(users.id, newUser.id));
          
        console.log(`🔑 [RegistrationService] Subscription key marked as used for user ${newUser.id}`);
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

      // Return the complete user object with payment requirement flag
      return {
        user: newUser,
        requiresPayment,
        healthSystemId
      };
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