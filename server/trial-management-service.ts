// Trial Management Service
// Handles trial status, reminders, and graceful account restrictions

import { db } from './db.js';
import { healthSystems, users } from '@shared/schema';
import { eq, lt, and, gte } from 'drizzle-orm';
import { EmailVerificationService } from './email-verification-service.js';

export interface TrialStatus {
  status: 'active' | 'warning' | 'expired' | 'grace_period' | 'deactivated';
  daysRemaining: number;
  trialEndDate: Date;
  gracePeriodEndDate: Date | null;
  restrictions: {
    readOnly: boolean;
    noNewPatients: boolean;
    noDataExport: boolean;
  };
}

export class TrialManagementService {
  
  /**
   * Get trial status for a health system
   */
  static async getTrialStatus(healthSystemId: number): Promise<TrialStatus> {
    const [healthSystem] = await db
      .select({
        subscriptionStartDate: healthSystems.subscriptionStartDate,
        subscriptionStatus: healthSystems.subscriptionStatus,
        subscriptionTier: healthSystems.subscriptionTier,
      })
      .from(healthSystems)
      .where(eq(healthSystems.id, healthSystemId));

    if (!healthSystem) {
      throw new Error('Health system not found');
    }

    // If already paid, no trial restrictions
    if (healthSystem.subscriptionStatus === 'active') {
      return {
        status: 'active',
        daysRemaining: -1, // No limit
        trialEndDate: new Date(0),
        gracePeriodEndDate: null,
        restrictions: {
          readOnly: false,
          noNewPatients: false,
          noDataExport: false,
        }
      };
    }

    const now = new Date();
    const startDate = healthSystem.subscriptionStartDate || now;
    
    // Get trial duration (default 30 days, but can be overridden for testing)
    const trialDays = this.getTrialDuration();
    const trialEndDate = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));
    const gracePeriodEndDate = new Date(trialEndDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7-day grace period
    
    const timeUntilExpiry = trialEndDate.getTime() - now.getTime();
    const timeUntilGraceExpiry = gracePeriodEndDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000));

    // Determine status and restrictions
    if (timeUntilExpiry > 0) {
      // Still in trial period
      if (daysRemaining <= 3) {
        return {
          status: 'warning',
          daysRemaining,
          trialEndDate,
          gracePeriodEndDate,
          restrictions: {
            readOnly: false,
            noNewPatients: false,
            noDataExport: false,
          }
        };
      } else {
        return {
          status: 'active',
          daysRemaining,
          trialEndDate,
          gracePeriodEndDate,
          restrictions: {
            readOnly: false,
            noNewPatients: false,
            noDataExport: false,
          }
        };
      }
    } else if (timeUntilGraceExpiry > 0) {
      // In grace period - read-only access
      return {
        status: 'grace_period',
        daysRemaining: 0,
        trialEndDate,
        gracePeriodEndDate,
        restrictions: {
          readOnly: true,
          noNewPatients: true,
          noDataExport: false, // Allow data export during grace period
        }
      };
    } else {
      // Trial and grace period expired
      return {
        status: 'deactivated',
        daysRemaining: 0,
        trialEndDate,
        gracePeriodEndDate,
        restrictions: {
          readOnly: true,
          noNewPatients: true,
          noDataExport: true,
        }
      };
    }
  }

  /**
   * Get trial duration in days (allows override for testing)
   */
  static getTrialDuration(): number {
    // Allow environment override for testing
    if (process.env.NODE_ENV === 'development' && process.env.TRIAL_DURATION_OVERRIDE) {
      const override = parseInt(process.env.TRIAL_DURATION_OVERRIDE);
      if (!isNaN(override)) {
        console.log(`🧪 [TrialManagement] Using trial duration override: ${override} days`);
        return override;
      }
    }
    return 30; // Default 30 days
  }

  /**
   * Send trial reminder emails
   */
  static async sendTrialReminders(): Promise<void> {
    console.log('📧 [TrialManagement] Checking for trial reminders...');
    
    const now = new Date();
    const trialDays = this.getTrialDuration();
    
    // Find health systems that need reminders (7 days, 3 days, 1 day)
    const reminderWindows = [7, 3, 1];
    
    for (const daysBeforeExpiry of reminderWindows) {
      const reminderDate = new Date(now.getTime() - ((trialDays - daysBeforeExpiry) * 24 * 60 * 60 * 1000));
      const nextReminderDate = new Date(reminderDate.getTime() + (24 * 60 * 60 * 1000));
      
      const healthSystemsNeedingReminder = await db
        .select({
          id: healthSystems.id,
          name: healthSystems.name,
          email: healthSystems.email,
          subscriptionStartDate: healthSystems.subscriptionStartDate,
          originalProviderId: healthSystems.originalProviderId,
        })
        .from(healthSystems)
        .where(
          and(
            eq(healthSystems.subscriptionStatus, 'trial'),
            eq(healthSystems.subscriptionTier, 1),
            gte(healthSystems.subscriptionStartDate, reminderDate),
            lt(healthSystems.subscriptionStartDate, nextReminderDate)
          )
        );

      for (const healthSystem of healthSystemsNeedingReminder) {
        await this.sendTrialReminderEmail(healthSystem, daysBeforeExpiry);
      }
    }
  }

  /**
   * Send individual trial reminder email
   */
  private static async sendTrialReminderEmail(
    healthSystem: any,
    daysRemaining: number
  ): Promise<void> {
    if (!healthSystem.originalProviderId) {
      console.warn(`⚠️ [TrialManagement] No provider ID for health system ${healthSystem.id}`);
      return;
    }

    // Get the provider's email
    const [provider] = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, healthSystem.originalProviderId));

    if (!provider) {
      console.warn(`⚠️ [TrialManagement] Provider not found for health system ${healthSystem.id}`);
      return;
    }

    try {
      await this.sendReminderEmail(provider.email, provider.firstName, daysRemaining, healthSystem.name);
      console.log(`📧 [TrialManagement] Sent ${daysRemaining}-day reminder to ${provider.email}`);
    } catch (error) {
      console.error(`❌ [TrialManagement] Failed to send reminder email:`, error);
    }
  }

  /**
   * Send reminder email using SendGrid
   */
  private static async sendReminderEmail(
    email: string,
    firstName: string,
    daysRemaining: number,
    practiceName: string
  ): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ [TrialManagement] SENDGRID_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const { MailService } = await import('@sendgrid/mail');
    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';

    const upgradeUrl = `${baseUrl}/dashboard?upgrade=true`;
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.com';
    
    let subject: string;
    let urgencyLevel: string;
    let urgencyColor: string;
    
    if (daysRemaining === 1) {
      subject = '⚠️ Your Clarafi Trial Expires Tomorrow - Upgrade Now to Keep Your Data';
      urgencyLevel = 'URGENT';
      urgencyColor = '#dc2626'; // red-600
    } else if (daysRemaining === 3) {
      subject = '⏰ 3 Days Left in Your Clarafi Trial - Secure Your Account';
      urgencyLevel = 'Important';
      urgencyColor = '#ea580c'; // orange-600
    } else {
      subject = '📅 One Week Left in Your Clarafi Trial - Time to Upgrade';
      urgencyLevel = 'Reminder';
      urgencyColor = '#0891b2'; // cyan-600
    }

    const emailContent = {
      to: email,
      from: fromEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${urgencyColor}; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">${urgencyLevel}: Trial Ending Soon</h2>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${firstName},</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Your <strong>30-day free trial</strong> for <em>${practiceName}</em> expires in 
              <span style="color: ${urgencyColor}; font-weight: bold; font-size: 18px;">${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</span>.
            </p>
            
            ${daysRemaining === 1 ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="color: #dc2626; font-weight: bold; margin: 0;">
                  ⚠️ After tomorrow, your account will be restricted to read-only access for 7 days, 
                  then deactivated if no payment is received.
                </p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <h3 style="color: #1f2937; margin-top: 0;">What happens when your trial expires?</h3>
              <ul style="color: #4b5563; line-height: 1.6;">
                <li><strong>Day 31-37:</strong> Read-only access to your data</li>
                <li><strong>After Day 37:</strong> Account deactivated (data retained for 90 days)</li>
                <li><strong>Data export:</strong> Available during read-only period</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${upgradeUrl}" 
                 style="background-color: #FFD700; color: #003366; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Upgrade to Professional ($149/month)
              </a>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h3 style="color: #1f2937; margin-top: 0;">✅ Keep All Your Features:</h3>
              <ul style="color: #4b5563; line-height: 1.6; columns: 2; margin: 0;">
                <li>AI SOAP notes</li>
                <li>Voice transcription</li>
                <li>Complete patient charts</li>
                <li>Lab results tracking</li>
                <li>Medication management</li>
                <li>Vital signs</li>
                <li>Problem lists</li>
                <li>And much more...</li>
              </ul>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Questions? Reply to this email or contact support.<br>
              <a href="${upgradeUrl}" style="color: #0891b2;">Upgrade now</a> to avoid any interruption.
            </p>
          </div>
        </div>
      `,
      text: `
Hi ${firstName},

Your 30-day free trial for ${practiceName} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.

${daysRemaining === 1 ? 'WARNING: After tomorrow, your account will be restricted to read-only access for 7 days, then deactivated if no payment is received.' : ''}

What happens when your trial expires:
- Day 31-37: Read-only access to your data
- After Day 37: Account deactivated (data retained for 90 days)
- Data export: Available during read-only period

Upgrade to Professional ($149/month) to keep all your features:
${upgradeUrl}

Questions? Reply to this email or contact support.
      `
    };

    await mailService.send(emailContent);
  }

  /**
   * Handle expired trials - set to read-only or deactivate
   */
  static async processExpiredTrials(): Promise<void> {
    console.log('🔄 [TrialManagement] Processing expired trials...');
    
    const now = new Date();
    const trialDays = this.getTrialDuration();
    const gracePeriodDays = 7;
    
    // Find trials that just expired (should go to read-only)
    const expiredDate = new Date(now.getTime() - (trialDays * 24 * 60 * 60 * 1000));
    const deactivationDate = new Date(now.getTime() - ((trialDays + gracePeriodDays) * 24 * 60 * 60 * 1000));
    
    // Update health systems that should be in grace period
    await db
      .update(healthSystems)
      .set({ subscriptionStatus: 'grace_period' })
      .where(
        and(
          eq(healthSystems.subscriptionStatus, 'trial'),
          lt(healthSystems.subscriptionStartDate, expiredDate)
        )
      );
    
    // Update health systems that should be deactivated
    await db
      .update(healthSystems)
      .set({ subscriptionStatus: 'deactivated' })
      .where(
        and(
          eq(healthSystems.subscriptionStatus, 'grace_period'),
          lt(healthSystems.subscriptionStartDate, deactivationDate)
        )
      );
    
    console.log('✅ [TrialManagement] Trial processing complete');
  }

  /**
   * Testing utilities - DO NOT USE IN PRODUCTION
   */
  static async setTrialExpiryForTesting(healthSystemId: number, daysFromNow: number): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Trial manipulation only allowed in development');
    }
    
    const targetDate = new Date(Date.now() - ((30 - daysFromNow) * 24 * 60 * 60 * 1000));
    
    await db
      .update(healthSystems)
      .set({ subscriptionStartDate: targetDate })
      .where(eq(healthSystems.id, healthSystemId));
    
    console.log(`🧪 [TrialManagement] Set trial expiry for health system ${healthSystemId} to ${daysFromNow} days from now`);
  }
}