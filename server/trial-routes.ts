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
        name: user.healthSystemName || `${user.firstName} ${user.lastName}`,
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
   * Enterprise upgrade flow
   * 
   * ARCHITECTURAL DECISION (July 24, 2025):
   * Enterprise upgrades now redirect to the existing /admin-verification page
   * rather than maintaining a separate endpoint. This simplifies the architecture
   * by reusing the comprehensive AI verification infrastructure already in place.
   * 
   * When trial users apply for enterprise:
   * 1. They are redirected to /admin-verification
   * 2. They go through the standard enterprise verification flow
   * 3. If approved, we can merge their existing trial data with the new enterprise account
   * 
   * This approach avoids code duplication and ensures all enterprise applications
   * go through the same rigorous verification process.
   */

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