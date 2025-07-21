import { Router } from 'express';
import { healthcareDataScheduler } from './healthcare-data-scheduler.js';
// Simple auth check for admin routes
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!roles.includes(req.session?.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

const router = Router();

/**
 * Get current automatic update settings
 */
router.get('/api/admin/healthcare-update-settings', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const config = healthcareDataScheduler.getConfig();
    res.json({ 
      success: true, 
      settings: config,
      status: {
        isRunning: healthcareDataScheduler.isUpdateRunning(),
        nextUpdate: config.enableAutoUpdates ? 'Scheduled according to settings' : 'Manual only'
      }
    });
  } catch (error) {
    console.error('Error fetching healthcare update settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch update settings' 
    });
  }
});

/**
 * Update automatic update settings
 */
router.post('/api/admin/healthcare-update-settings', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      enableAutoUpdates,
      updateFrequency,
      updateDay,
      updateHour,
      maxRetries
    } = req.body;

    // Validate settings
    if (updateHour < 0 || updateHour > 23) {
      return res.status(400).json({
        success: false,
        message: 'Update hour must be between 0-23'
      });
    }

    if (!['weekly', 'biweekly', 'monthly'].includes(updateFrequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update frequency'
      });
    }

    const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (!validDays.includes(updateDay)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update day'
      });
    }

    // Update configuration
    healthcareDataScheduler.updateConfig({
      enableAutoUpdates,
      updateFrequency,
      updateDay,
      updateHour: parseInt(updateHour),
      maxRetries: parseInt(maxRetries) || 3
    });

    res.json({ 
      success: true, 
      message: 'Update settings saved successfully',
      settings: healthcareDataScheduler.getConfig()
    });

    console.log(`⚙️ [Admin] Healthcare update settings updated by user ${req.session?.user?.username || 'unknown'}`);
    
  } catch (error) {
    console.error('Error updating healthcare update settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
});

/**
 * Enable/disable automatic updates (quick toggle)
 */
router.post('/api/admin/healthcare-auto-updates/toggle', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { enabled } = req.body;
    
    healthcareDataScheduler.setAutoUpdates(enabled);
    
    res.json({ 
      success: true, 
      message: `Automatic updates ${enabled ? 'enabled' : 'disabled'}`,
      enabled
    });

    console.log(`🔄 [Admin] Automatic healthcare updates ${enabled ? 'enabled' : 'disabled'} by user ${req.session?.user?.username || 'unknown'}`);
    
  } catch (error) {
    console.error('Error toggling automatic updates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle automatic updates' 
    });
  }
});

/**
 * Trigger immediate update (manual)
 */
router.post('/api/admin/healthcare-data/update-now', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    if (healthcareDataScheduler.isUpdateRunning()) {
      return res.status(409).json({
        success: false,
        message: 'An update is already in progress'
      });
    }

    // Trigger update asynchronously
    healthcareDataScheduler.triggerUpdate().catch(error => {
      console.error('Manual healthcare data update failed:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Manual update started successfully' 
    });

    console.log(`🚀 [Admin] Manual healthcare data update triggered by user ${req.session?.user?.username || 'unknown'}`);
    
  } catch (error) {
    console.error('Error triggering manual update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to trigger manual update' 
    });
  }
});

/**
 * Get update status and history
 */
router.get('/api/admin/healthcare-data/update-status', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const config = healthcareDataScheduler.getConfig();
    
    res.json({
      success: true,
      status: {
        isRunning: healthcareDataScheduler.isUpdateRunning(),
        autoUpdatesEnabled: config.enableAutoUpdates,
        frequency: config.updateFrequency,
        nextScheduled: config.enableAutoUpdates ? `${config.updateDay}s at ${config.updateHour}:00` : 'Manual only',
        lastUpdate: 'Check database for most recent import', // TODO: Add timestamp tracking
        systemRecommendation: getSystemRecommendation()
      }
    });
    
  } catch (error) {
    console.error('Error fetching update status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch update status' 
    });
  }
});

/**
 * Get system recommendation for update frequency
 */
function getSystemRecommendation() {
  return {
    frequency: 'weekly',
    day: 'monday', 
    hour: 4,
    reasoning: 'CMS updates NPPES data weekly on Sundays. Monday 4 AM ensures fresh data during low usage hours.'
  };
}

export { router as healthcareUpdateSettingsRoutes };