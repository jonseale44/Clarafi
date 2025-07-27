import { db } from './db.js';
import { subscriptionKeys, users, subscriptionHistory, emailNotifications, healthSystems } from '../shared/schema';
import { eq, and, lt, gte, or } from 'drizzle-orm';
import crypto from 'crypto';
import { PER_USER_PRICING, getUserPricingTier } from '../shared/feature-gates';

export class SubscriptionKeyService {
  /**
   * Generate a unique subscription key with format: PREFIX-YEAR-XXXX-XXXX
   */
  static generateKey(healthSystemShortName: string, keyType: 'provider' | 'nurse' | 'staff' | 'admin'): string {
    const prefix = healthSystemShortName.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const random1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const random2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    
    return `${prefix}-${year}-${random1}-${random2}`;
  }

  /**
   * Create subscription keys for a health system when they purchase a tier
   */
  static async createKeysForHealthSystem(
    healthSystemId: number,
    tier: number,
    providerCount: number,
    nurseCount: number,
    staffCount: number,
    createdByUserId: number = 1
  ) {
    const [healthSystem] = await db.select().from(healthSystems)
      .where(eq(healthSystems.id, healthSystemId));
    
    if (!healthSystem) {
      throw new Error('Health system not found');
    }

    // Payment enforcement: After trial period, require payment before generating keys
    if (healthSystem.subscriptionStatus === 'trial') {
      // Check if trial has ended
      const trialEndDate = healthSystem.trialEndDate || 
        new Date(healthSystem.subscriptionStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      if (new Date() > trialEndDate) {
        throw new Error('Trial period has ended. Please complete payment to generate additional keys.');
      }
    } else if (healthSystem.subscriptionStatus === 'trial_expired') {
      throw new Error('Trial has expired. Please complete payment to generate additional keys.');
    } else if (healthSystem.subscriptionStatus === 'deactivated') {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Ensure we only support tier 1 or 2
    if (tier !== 1 && tier !== 2) {
      throw new Error('Invalid subscription tier. Only tiers 1 and 2 are supported.');
    }

    const shortName = healthSystem.shortName || 'EMR';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours expiry for unused keys

    const keys = [];

    // Generate provider keys
    for (let i = 0; i < providerCount; i++) {
      const key = this.generateKey(shortName, 'provider');
      const [insertedKey] = await db.insert(subscriptionKeys).values({
        keyValue: key,
        healthSystemId,
        keyType: 'provider',
        createdBy: createdByUserId, // User who initiated key generation
        expiresAt: expiresAt,
        metadata: {
          subscriptionTier: tier,
          monthlyPrice: PER_USER_PRICING.provider.monthly.toString(),
          generationBatch: new Date().toISOString(),
          index: i + 1,
          totalInBatch: providerCount
        }
      }).returning();
      keys.push(insertedKey);
    }

    // Generate nurse keys
    for (let i = 0; i < nurseCount; i++) {
      const key = this.generateKey(shortName, 'nurse');
      const [insertedKey] = await db.insert(subscriptionKeys).values({
        keyValue: key,
        healthSystemId,
        keyType: 'nurse',
        createdBy: createdByUserId, // User who initiated key generation
        expiresAt: expiresAt,
        metadata: {
          subscriptionTier: tier,
          monthlyPrice: PER_USER_PRICING.clinicalStaff.monthly.toString(),
          generationBatch: new Date().toISOString(),
          index: i + 1,
          totalInBatch: nurseCount
        }
      }).returning();
      keys.push(insertedKey);
    }

    // Generate staff keys
    for (let i = 0; i < staffCount; i++) {
      const key = this.generateKey(shortName, 'staff');
      // Staff keys can be for clinical or admin staff - default to general staff pricing
      const [insertedKey] = await db.insert(subscriptionKeys).values({
        keyValue: key,
        healthSystemId,
        keyType: 'staff',
        createdBy: createdByUserId, // User who initiated key generation
        expiresAt: expiresAt,
        metadata: {
          subscriptionTier: tier,
          monthlyPrice: PER_USER_PRICING.generalStaff.monthly.toString(),
          generationBatch: new Date().toISOString(),
          index: i + 1,
          totalInBatch: staffCount
        }
      }).returning();
      keys.push(insertedKey);
    }

    // Update health system subscription limits
    await db.update(healthSystems)
      .set({
        subscriptionLimits: {
          providerKeys: providerCount,
          nurseKeys: nurseCount,
          staffKeys: staffCount,
          totalUsers: providerCount + nurseCount + staffCount
        }
      })
      .where(eq(healthSystems.id, healthSystemId));

    // Record in subscription history
    await db.insert(subscriptionHistory).values({
      healthSystemId,
      previousTier: healthSystem.subscriptionTier || 0,
      newTier: tier,
      changeType: 'upgrade',
      gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days grace
      dataExpiresAt: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 30 days + 7 days grace
      metadata: {
        keysGenerated: keys.length,
        providerKeys: providerCount,
        nurseKeys: nurseCount,
        staffKeys: staffCount
      }
    });

    return keys;
  }

  /**
   * Validate and use a subscription key
   */
  static async validateAndUseKey(keyString: string, userId: number) {
    // Check if key exists and is valid
    const [key] = await db.select().from(subscriptionKeys)
      .where(eq(subscriptionKeys.keyValue, keyString));

    if (!key) {
      return { success: false, error: 'Invalid key' };
    }

    // Check if key is already used
    if (key.status === 'used') {
      return { success: false, error: 'Key has already been used' };
    }

    // Check if key is deactivated
    if (key.status === 'deactivated') {
      return { success: false, error: 'Key has been deactivated' };
    }

    // Check if key is expired
    if (key.status === 'expired' || (key.expiresAt && new Date() > key.expiresAt)) {
      // Update status if not already marked as expired
      if (key.status !== 'expired') {
        await db.update(subscriptionKeys)
          .set({ status: 'expired' })
          .where(eq(subscriptionKeys.id, key.id));
      }
      return { success: false, error: 'Key has expired' };
    }

    // Check if health system subscription is active
    const [healthSystem] = await db.select().from(healthSystems)
      .where(eq(healthSystems.id, key.healthSystemId));

    if (!healthSystem || healthSystem.subscriptionStatus !== 'active') {
      return { success: false, error: 'Health system subscription is not active' };
    }

    // Get subscription tier from metadata
    const subscriptionTier = key.metadata?.subscriptionTier as number || 2;

    // Use the key
    await db.update(subscriptionKeys)
      .set({
        status: 'used',
        assignedTo: userId,
        assignedAt: new Date(),
        usageCount: 1,
        lastUsedAt: new Date()
      })
      .where(eq(subscriptionKeys.id, key.id));

    // Update user verification status - only tier 1 or 2 now
    const verificationStatus = 'verified';
    await db.update(users)
      .set({
        verificationStatus,
        verifiedWithKeyId: key.id,
        verifiedAt: new Date(),
        healthSystemId: key.healthSystemId // Update user's health system if using key
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      keyType: key.keyType,
      subscriptionTier: subscriptionTier,
      healthSystemId: key.healthSystemId
    };
  }

  /**
   * Get active key count for a health system
   */
  static async getActiveKeyCount(healthSystemId: number) {
    const activeKeys = await db.select().from(subscriptionKeys)
      .where(and(
        eq(subscriptionKeys.healthSystemId, healthSystemId),
        or(
          eq(subscriptionKeys.status, 'active'),
          eq(subscriptionKeys.status, 'used')
        )
      ));

    const providerKeys = activeKeys.filter(k => k.keyType === 'provider');
    const nurseKeys = activeKeys.filter(k => k.keyType === 'nurse');
    const staffKeys = activeKeys.filter(k => k.keyType === 'staff');

    return {
      total: activeKeys.length,
      providers: providerKeys.length,
      nurses: nurseKeys.length,
      staff: staffKeys.length,
      used: activeKeys.filter(k => k.status === 'used').length,
      available: activeKeys.filter(k => k.status === 'active').length
    };
  }

  /**
   * Deactivate a key (when staff member leaves)
   */
  static async deactivateKey(keyId: number, deactivatedByUserId: number) {
    const [key] = await db.select().from(subscriptionKeys)
      .where(eq(subscriptionKeys.id, keyId));

    if (!key) {
      return { success: false, error: 'Key not found' };
    }

    if (key.status === 'deactivated') {
      return { success: false, error: 'Key already deactivated' };
    }

    await db.update(subscriptionKeys)
      .set({
        status: 'deactivated',
        deactivatedBy: deactivatedByUserId,
        deactivatedAt: new Date()
      })
      .where(eq(subscriptionKeys.id, keyId));

    // If key was used, update user's verification status
    if (key.usedBy) {
      await db.update(users)
        .set({
          verificationStatus: 'unverified',
          verifiedWithKeyId: null,
          verifiedAt: null
        })
        .where(eq(users.id, key.usedBy));
    }

    return { success: true };
  }

  /**
   * Regenerate an expired or deactivated key
   */
  static async regenerateKey(oldKeyId: number, adminUserId: number) {
    const [oldKey] = await db.select().from(subscriptionKeys)
      .where(eq(subscriptionKeys.id, oldKeyId));

    if (!oldKey) {
      return { success: false, error: 'Key not found' };
    }

    if (oldKey.status === 'used') {
      return { success: false, error: 'Cannot regenerate a used key' };
    }

    // Check key limits
    const keyCount = await this.getActiveKeyCount(oldKey.healthSystemId);
    const [healthSystem] = await db.select().from(healthSystems)
      .where(eq(healthSystems.id, oldKey.healthSystemId));

    const limits = healthSystem?.subscriptionLimits as any || {};
    
    if (oldKey.keyType === 'provider' && keyCount.providers >= limits.providerKeys) {
      return { success: false, error: 'Provider key limit reached' };
    }
    
    if (oldKey.keyType === 'nurse' && keyCount.nurses >= limits.nurseKeys) {
      return { success: false, error: 'Nurse key limit reached' };
    }
    
    if (oldKey.keyType === 'staff' && keyCount.staff >= limits.staffKeys) {
      return { success: false, error: 'Staff key limit reached' };
    }

    // Deactivate old key
    await db.update(subscriptionKeys)
      .set({
        status: 'deactivated',
        deactivatedBy: adminUserId,
        deactivatedAt: new Date()
      })
      .where(eq(subscriptionKeys.id, oldKeyId));

    // Generate new key
    const shortName = healthSystem?.shortName || 'EMR';
    const newKey = this.generateKey(shortName, oldKey.keyType as any);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const [regeneratedKey] = await db.insert(subscriptionKeys).values({
      keyValue: newKey,
      healthSystemId: oldKey.healthSystemId,
      keyType: oldKey.keyType,
      createdBy: adminUserId,
      expiresAt,
      metadata: {
        subscriptionTier: oldKey.metadata?.subscriptionTier || 2,
        monthlyPrice: oldKey.metadata?.monthlyPrice || PER_USER_PRICING.provider.monthly.toString(),
        regeneratedFrom: oldKeyId,
        regeneratedBy: adminUserId,
        regeneratedAt: new Date().toISOString(),
        regenerationCount: ((oldKey.metadata as any)?.regenerationCount || 0) + 1
      }
    }).returning();

    return { success: true, key: regeneratedKey };
  }

  /**
   * Check and expire old unused keys
   */
  static async expireUnusedKeys() {
    const expiredKeys = await db.update(subscriptionKeys)
      .set({ status: 'expired' })
      .where(and(
        eq(subscriptionKeys.status, 'active'),
        lt(subscriptionKeys.expiresAt, new Date())
      ))
      .returning();

    return expiredKeys.length;
  }

  /**
   * Send email notifications for subscription changes
   */
  static async sendSubscriptionNotification(
    userId: number | null,
    healthSystemId: number,
    notificationType: string,
    emailAddress: string,
    subject: string,
    metadata: any = {}
  ) {
    await db.insert(emailNotifications).values({
      userId,
      healthSystemId,
      notificationType,
      emailAddress,
      subject,
      metadata
    });

    // In production, integrate with SendGrid here
    console.log(`Email notification queued: ${notificationType} to ${emailAddress}`);
  }
}