// Healthcare data scheduler functionality - no actual cron needed in development
import { importUSHealthcareData } from './texas-healthcare-data.js';

interface UpdateConfig {
  enableAutoUpdates: boolean;
  updateFrequency: 'weekly' | 'biweekly' | 'monthly';
  updateDay: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  updateHour: number; // 0-23, preferably during low usage hours
  maxRetries: number;
  backoffHours: number[];
}

class HealthcareDataScheduler {
  private config: UpdateConfig;
  private isRunning: boolean = false;
  private currentTask: NodeJS.Timeout | null = null;

  constructor() {
    // Default configuration - conservative approach
    this.config = {
      enableAutoUpdates: false, // Disabled by default - admin must enable
      updateFrequency: 'weekly', // CMS updates NPPES weekly
      updateDay: 'monday', // Monday mornings for fresh weekly data
      updateHour: 4, // 4 AM local time (low usage period)
      maxRetries: 3,
      backoffHours: [1, 4, 12] // Progressive backoff: 1hr, 4hr, 12hr
    };
  }

  /**
   * Initialize the scheduler based on admin configuration
   */
  public initialize(adminConfig?: Partial<UpdateConfig>) {
    if (adminConfig) {
      this.config = { ...this.config, ...adminConfig };
    }

    if (this.config.enableAutoUpdates) {
      this.startScheduler();
      console.log('📅 [HealthcareDataScheduler] Automatic updates enabled');
      console.log(`🕐 Next update: ${this.getNextUpdateTime()}`);
    } else {
      console.log('📅 [HealthcareDataScheduler] Automatic updates disabled (manual trigger only)');
    }
  }

  /**
   * Start the cron scheduler (simulated for development)
   */
  private startScheduler() {
    const cronPattern = this.getCronPattern();
    
    console.log(`📅 [HealthcareDataScheduler] Would schedule with pattern: ${cronPattern}`);
    console.log('📝 [HealthcareDataScheduler] Cron scheduling simulated in development environment');
    
    // In production, this would use actual cron scheduling
    // For now, we just log the configuration
  }

  /**
   * Perform the actual update with retry logic
   */
  private async performUpdate(retryCount: number = 0): Promise<void> {
    this.isRunning = true;
    
    try {
      // Check system resources before starting
      const systemLoad = await this.checkSystemLoad();
      if (systemLoad > 80) {
        console.log('⚠️ [HealthcareDataScheduler] System load too high, postponing update');
        this.scheduleRetry(retryCount);
        return;
      }

      // Perform the import
      await importUSHealthcareData();
      
      console.log('✅ [HealthcareDataScheduler] Scheduled update completed successfully');
      
      // Reset retry count on success
      retryCount = 0;
      
    } catch (error) {
      console.error('❌ [HealthcareDataScheduler] Scheduled update failed:', error);
      
      if (retryCount < this.config.maxRetries) {
        this.scheduleRetry(retryCount);
      } else {
        console.error('💥 [HealthcareDataScheduler] Max retries exceeded, manual intervention required');
        // TODO: Send admin notification
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(retryCount: number) {
    const nextRetry = retryCount + 1;
    const backoffHours = this.config.backoffHours[retryCount] || 24;
    
    console.log(`🔄 [HealthcareDataScheduler] Scheduling retry ${nextRetry} in ${backoffHours} hours`);
    
    this.currentTask = setTimeout(() => {
      this.performUpdate(nextRetry);
    }, backoffHours * 60 * 60 * 1000);
  }

  /**
   * Generate cron pattern based on configuration
   */
  private getCronPattern(): string {
    const days = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const dayOfWeek = days[this.config.updateDay];
    const hour = this.config.updateHour;
    
    switch (this.config.updateFrequency) {
      case 'weekly':
        return `0 ${hour} * * ${dayOfWeek}`; // Every week on specified day/hour
      case 'biweekly':
        return `0 ${hour} * * ${dayOfWeek}#1,${dayOfWeek}#3`; // 1st and 3rd week
      case 'monthly':
        return `0 ${hour} 1 * *`; // 1st day of every month
      default:
        return `0 ${hour} * * ${dayOfWeek}`;
    }
  }

  /**
   * Get human-readable next update time
   */
  private getNextUpdateTime(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[Object.values({
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    }).indexOf(Object.keys({
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    }).findIndex(key => key === this.config.updateDay))];
    
    const hour = this.config.updateHour === 0 ? '12:00 AM' : 
                 this.config.updateHour < 12 ? `${this.config.updateHour}:00 AM` :
                 this.config.updateHour === 12 ? '12:00 PM' :
                 `${this.config.updateHour - 12}:00 PM`;
    
    return `${this.config.updateFrequency} on ${day} at ${hour}`;
  }

  /**
   * Check system load (simplified version)
   */
  private async checkSystemLoad(): Promise<number> {
    // In production, this would check actual system metrics
    // For now, return a safe value
    return 25; // Simulated low load
  }

  /**
   * Enable/disable automatic updates
   */
  public setAutoUpdates(enabled: boolean) {
    this.config.enableAutoUpdates = enabled;
    
    if (enabled) {
      this.startScheduler();
      console.log('✅ [HealthcareDataScheduler] Automatic updates enabled');
    } else {
      if (this.currentTask) {
        clearTimeout(this.currentTask);
        this.currentTask = null;
      }
      console.log('❌ [HealthcareDataScheduler] Automatic updates disabled');
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<UpdateConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableAutoUpdates) {
      // Restart scheduler with new config
      this.startScheduler();
      console.log('🔄 [HealthcareDataScheduler] Configuration updated, scheduler restarted');
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): UpdateConfig {
    return { ...this.config };
  }

  /**
   * Manual trigger for updates (bypasses schedule)
   */
  public async triggerUpdate(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Update already in progress');
    }

    console.log('🚀 [HealthcareDataScheduler] Manual update triggered');
    await this.performUpdate();
  }

  /**
   * Check if update is currently running
   */
  public isUpdateRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const healthcareDataScheduler = new HealthcareDataScheduler();

// Auto-initialize with default settings
healthcareDataScheduler.initialize();