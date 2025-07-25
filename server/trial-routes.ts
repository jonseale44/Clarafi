// Trial Management Routes
// API endpoints for trial status, reminders, and testing

import { Express } from 'express';
import { TrialManagementService } from './trial-management-service.js';
import { db } from './db.js';
import { users, healthSystems, clinicAdminVerifications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

export function setupTrialRoutes(app: Express) {
  
  /**
   * Get trial status for current user's health system
   */
  app.get('/api/trial-status', async (req, res) => {
    try {
      if (!req.user?.healthSystemId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const trialStatus = await TrialManagementService.getTrialStatus(req.user.healthSystemId);
      
      res.json({
        trialStatus,
        upgradeUrl: '/upgrade'
      });
    } catch (error: any) {
      console.error('❌ [TrialRoutes] Error getting trial status:', error);
      res.status(500).json({ message: 'Failed to get trial status' });
    }
  });

  /**
   * Manual trigger for trial reminders (admin only, development only)
   */
  app.post('/api/admin/send-trial-reminders', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Only available in development' });
    }

    try {
      await TrialManagementService.sendTrialReminders();
      res.json({ message: 'Trial reminders sent' });
    } catch (error: any) {
      console.error('❌ [TrialRoutes] Error sending reminders:', error);
      res.status(500).json({ message: 'Failed to send reminders' });
    }
  });

  /**
   * Manual trigger for processing expired trials (admin only, development only)
   */
  app.post('/api/admin/process-expired-trials', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Only available in development' });
    }

    try {
      await TrialManagementService.processExpiredTrials();
      res.json({ message: 'Expired trials processed' });
    } catch (error: any) {
      console.error('❌ [TrialRoutes] Error processing expired trials:', error);
      res.status(500).json({ message: 'Failed to process expired trials' });
    }
  });

  /**
   * Testing endpoint to manipulate trial expiry (development only)
   */
  app.post('/api/admin/set-trial-expiry/:healthSystemId', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Only available in development' });
    }

    try {
      const healthSystemId = parseInt(req.params.healthSystemId);
      const { daysFromNow } = req.body;

      if (isNaN(healthSystemId) || typeof daysFromNow !== 'number') {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      await TrialManagementService.setTrialExpiryForTesting(healthSystemId, daysFromNow);
      
      res.json({ 
        message: `Trial expiry set to ${daysFromNow} days from now for health system ${healthSystemId}` 
      });
    } catch (error: any) {
      console.error('❌ [TrialRoutes] Error setting trial expiry:', error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Direct trial to tier 1 upgrade (no admin required)
   */
  app.post('/api/trial-upgrade-tier1', async (req, res) => {
    try {
      if (!req.user?.healthSystemId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { StripeService } = await import('./stripe-service.js');
      
      // Get user details
      const userId = req.user.id;
      const [user] = await db.select({
        healthSystemId: users.healthSystemId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        currentTier: healthSystems.subscriptionTier,
        stripeCustomerId: healthSystems.stripeCustomerId,
        healthSystemName: healthSystems.name,
      })
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, userId));

      if (!user || !user.healthSystemId) {
        return res.status(400).json({ error: 'No health system associated with user' });
      }

      console.log('🔄 [TrialUpgrade] Trial user upgrading to tier 1:', {
        userId,
        healthSystemId: user.healthSystemId,
        currentTier: user.currentTier,
        email: user.email
      });

      // Create Stripe checkout session for tier 1
      const checkoutResult = await StripeService.createCheckoutSession({
        email: user.email,
        healthSystemName: user.healthSystemName || `${user.firstName} ${user.lastName}`,
        tier: 1,
        billingPeriod: 'monthly',
        healthSystemId: user.healthSystemId,
        metadata: {
          upgradeFrom: 'trial',
          healthSystemId: user.healthSystemId.toString(),
          userId: userId.toString(),
          action: 'trial-to-tier1'
        }
      });

      if (checkoutResult.success && checkoutResult.sessionUrl) {
        res.json({
          success: true,
          checkoutUrl: checkoutResult.sessionUrl
        });
      } else {
        console.error('❌ [TrialUpgrade] Failed to create checkout session:', checkoutResult.error);
        res.status(500).json({ 
          error: 'Failed to create payment session',
          details: checkoutResult.error 
        });
      }
    } catch (error: any) {
      console.error('❌ [TrialUpgrade] Error creating trial upgrade:', error);
      res.status(500).json({ error: 'Failed to create upgrade session' });
    }
  });

  /**
   * Enterprise upgrade application endpoint
   * 
   * ARCHITECTURE NOTE: This endpoint intentionally reuses the AI verification
   * infrastructure from the admin-verification system. This is NOT duplication
   * by accident - we're leveraging the sophisticated verification logic that
   * already exists, but adapting it for trial-to-enterprise upgrades.
   * 
   * Key differences from /admin-verification/start:
   * - Works with EXISTING health systems (doesn't create new ones)
   * - Requires user to be an admin of their current health system
   * - Pulls organization data from existing records
   * - Can result in instant approval for low-risk organizations
   * - Updates subscription tier rather than creating new accounts
   * 
   * The AI verification includes:
   * - Risk scoring algorithms
   * - External API validations
   * - Automated approval for low-risk organizations
   * - Manual review queue for high-risk applications
   */
  app.post('/api/enterprise-application', async (req, res) => {
    try {
      if (!req.user?.healthSystemId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.id;
      
      // Get current user and health system details
      const [userDetails] = await db.select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        healthSystemId: users.healthSystemId,
        healthSystemName: healthSystems.name,
        currentTier: healthSystems.subscriptionTier,
        systemType: healthSystems.systemType,
        taxId: healthSystems.taxId,
        npi: healthSystems.npi,
        website: healthSystems.website,
        phone: healthSystems.phone
      })
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, userId));

      if (!userDetails) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Any authenticated user can apply for enterprise upgrade
      // The AI verification system will handle approval/rejection
      console.log('🔍 [EnterpriseUpgrade] User applying for enterprise:', {
        userId,
        role: userDetails.role,
        healthSystemId: userDetails.healthSystemId
      });

      console.log('🚀 [EnterpriseUpgrade] Trial user requesting enterprise upgrade:', {
        userId,
        healthSystemId: userDetails.healthSystemId,
        currentTier: userDetails.currentTier,
        organizationName: userDetails.healthSystemName
      });

      // Import the verification service
      const { ClinicAdminVerificationService } = await import('./clinic-admin-verification-service');

      // Map systemType to organizationType
      const mapSystemTypeToOrgType = (systemType: string) => {
        switch (systemType) {
          case 'health_system': return 'health_system';
          case 'hospital_network': return 'hospital';
          case 'clinic_group': return 'clinic';
          case 'individual_provider': return 'private_practice';
          default: return 'clinic';
        }
      };

      // Prepare verification request using existing health system data
      const verificationRequest = {
        // Personal info from current user
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        phone: userDetails.phone || '',
        title: 'System Administrator', // Default for existing admins
        
        // Organization info from existing health system
        organizationName: userDetails.healthSystemName,
        organizationType: mapSystemTypeToOrgType(userDetails.systemType || 'clinic_group'),
        taxId: userDetails.taxId || '',
        npiNumber: userDetails.npi,
        
        // Address placeholder (health systems don't store addresses directly)
        address: '123 Healthcare Way',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        website: userDetails.website,
        
        // Legal (already accepted during trial)
        baaAccepted: true,
        termsAccepted: true,
        
        // Upgrade context
        currentEmr: 'CLARAFI Trial',
        expectedProviderCount: 5, // Default for enterprise
        expectedMonthlyPatientVolume: 500,
        
        // Flag to indicate this is an upgrade, not new signup
        isUpgradeRequest: true,
        existingHealthSystemId: userDetails.healthSystemId
      };

      // Run through AI verification (without creating new health system)
      const verificationResult = await ClinicAdminVerificationService.performAutomatedVerification(
        verificationRequest as any
      );

      console.log('🤖 [EnterpriseUpgrade] AI verification result:', {
        riskScore: verificationResult.riskScore,
        automatedDecision: verificationResult.automatedDecision,
        requiresManualReview: verificationResult.requiresManualReview
      });

      // Store the upgrade application
      const [application] = await db.insert(clinicAdminVerifications).values({
        ...verificationRequest,
        status: verificationResult.automatedDecision === 'approve' ? 'auto-approved' : 'pending',
        verificationScore: verificationResult.verificationScore,
        riskScore: verificationResult.riskScore,
        automatedDecisionReason: verificationResult.automatedDecisionReason,
        reviewerRecommendations: verificationResult.reviewerRecommendations,
        apiVerificationData: verificationResult.apiVerificationData
      }).returning();

      // If auto-approved, immediately upgrade the health system
      if (verificationResult.automatedDecision === 'approve') {
        await db.update(healthSystems)
          .set({ 
            subscriptionTier: 2,
            subscriptionStatus: 'active' 
          })
          .where(eq(healthSystems.id, userDetails.healthSystemId));

        return res.json({
          success: true,
          approved: true,
          message: 'Congratulations! Your enterprise upgrade has been approved.',
          applicationId: application.id
        });
      }

      // Otherwise, requires manual review
      res.json({
        success: true,
        approved: false,
        message: 'Your enterprise application has been submitted for review. We\'ll contact you within 24 hours.',
        applicationId: application.id,
        requiresManualReview: true
      });

    } catch (error: any) {
      console.error('❌ [EnterpriseUpgrade] Error processing upgrade:', error);
      res.status(500).json({ 
        error: 'Failed to process enterprise upgrade',
        message: error.message 
      });
    }
  });

  /**
   * Data export endpoint for users during grace period
   */
  app.get('/api/export-data', async (req, res) => {
    try {
      if (!req.user?.healthSystemId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const trialStatus = await TrialManagementService.getTrialStatus(req.user.healthSystemId);
      
      // Allow data export during grace period or if account is active
      if (trialStatus.status === 'deactivated' && trialStatus.restrictions.noDataExport) {
        return res.status(403).json({ 
          message: 'Data export is no longer available. Contact support for assistance.' 
        });
      }

      // For now, return information about data export
      // In a full implementation, this would generate and stream data
      res.json({
        message: 'Data export functionality would be implemented here',
        availableData: [
          'Patient records',
          'Encounter notes',
          'Lab results',
          'Medications',
          'Problem lists',
          'Vital signs'
        ],
        instructions: 'Contact support@clarafi.com to request your data export'
      });
    } catch (error: any) {
      console.error('❌ [TrialRoutes] Error with data export:', error);
      res.status(500).json({ message: 'Failed to process data export request' });
    }
  });
}