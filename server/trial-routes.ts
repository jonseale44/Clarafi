// Trial Management Routes
// API endpoints for trial status, reminders, and testing

import { Express } from 'express';
import { TrialManagementService } from './trial-management-service.js';

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
        upgradeUrl: '/dashboard?upgrade=true'
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