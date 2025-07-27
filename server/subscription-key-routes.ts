import { Router } from 'express';
import { SubscriptionKeyService } from './subscription-key-service';
import { db } from './db.js';
import { users, healthSystems, subscriptionKeys } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { StripeService } from './stripe-service.js';

const router = Router();

// Middleware to ensure user is admin of their health system
const ensureHealthSystemAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Create Stripe checkout session for purchasing keys
router.post('/create-checkout', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const { providerCount, nurseCount, staffCount } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Get user's health system details
    const [user] = await db.select({
      healthSystemId: users.healthSystemId,
      email: users.email,
      healthSystemName: healthSystems.name,
      subscriptionTier: healthSystems.subscriptionTier
    })
    .from(users)
    .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
    .where(eq(users.id, userId));
    
    if (!user || !user.healthSystemId) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }
    
    // Only allow for Tier 2 health systems
    if (user.subscriptionTier !== 2) {
      return res.status(403).json({ 
        error: 'Subscription keys are only available for Enterprise (Tier 2) health systems' 
      });
    }
    
    // Calculate total monthly cost
    const monthlyAmount = (providerCount * 399) + (nurseCount * 99) + (staffCount * 49);
    
    console.log(`💰 [SubscriptionKeys] Creating checkout session:`, {
      providerCount,
      nurseCount, 
      staffCount,
      monthlyAmount,
      healthSystemName: user.healthSystemName
    });
    
    // Create checkout session using StripeService
    const checkoutUrl = await StripeService.createPerUserBillingCheckout({
      email: user.email,
      healthSystemId: user.healthSystemId,
      healthSystemName: user.healthSystemName || 'Unknown Health System',
      userCounts: {
        providers: providerCount,
        nurses: nurseCount,
        staff: staffCount
      },
      monthlyAmount
    });
    
    res.json({ 
      success: true, 
      checkoutUrl,
      message: 'Redirecting to payment...'
    });
    
  } catch (error: any) {
    console.error('❌ [SubscriptionKeys] Error creating checkout:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Generate keys for health system (admin only)
router.post('/generate', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const { providerCount, nurseCount, staffCount, tier, healthSystemId } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;

    console.log(`🔑 [SubscriptionKeys] Generate request from user ${userId} - Providers: ${providerCount}, Nurses: ${nurseCount}, Staff: ${staffCount}, Tier: ${tier}`);

    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      console.error(`❌ [SubscriptionKeys] User ${userId} not found`);
      return res.status(400).json({ error: 'User not found' });
    }

    // Determine which health system to generate keys for
    let targetHealthSystemId: number;
    
    // System admins (with username 'admin') can generate keys for any health system
    if (user.username === 'admin' && healthSystemId) {
      targetHealthSystemId = healthSystemId;
      console.log(`🔑 [SubscriptionKeys] System admin generating keys for health system ${healthSystemId}`);
    } else {
      // Regular admins can only generate for their own health system
      if (!user.healthSystemId) {
        console.error(`❌ [SubscriptionKeys] User ${userId} has no health system`);
        return res.status(400).json({ error: 'No health system associated with user' });
      }
      targetHealthSystemId = user.healthSystemId;
      console.log(`🏥 [SubscriptionKeys] User ${userId} generating keys for their health system ${targetHealthSystemId}`);
    }

    // Validate tier matches health system subscription
    const [healthSystem] = await db.select().from(healthSystems)
      .where(eq(healthSystems.id, targetHealthSystemId));
    
    console.log(`🏥 [SubscriptionKeys] Health system details:`, {
      id: healthSystem?.id,
      name: healthSystem?.name,
      subscriptionTier: healthSystem?.subscriptionTier,
      requestedTier: tier
    });
    
    if (!healthSystem) {
      console.error(`❌ [SubscriptionKeys] Health system not found`);
      return res.status(404).json({ error: 'Health system not found' });
    }
    
    // Only allow key generation for Tier 2 health systems
    if (healthSystem.subscriptionTier !== 2) {
      console.error(`❌ [SubscriptionKeys] Non-Tier 2 health system attempted key generation - Health system tier: ${healthSystem.subscriptionTier}`);
      return res.status(403).json({ 
        error: `Subscription keys are only available for Enterprise (Tier 2) health systems. ${healthSystem.name} is currently on Tier ${healthSystem.subscriptionTier}.` 
      });
    }
    
    if (healthSystem.subscriptionTier !== tier) {
      console.error(`❌ [SubscriptionKeys] Tier mismatch - Health system tier: ${healthSystem.subscriptionTier}, Requested tier: ${tier}`);
      return res.status(400).json({ error: `Tier mismatch: ${healthSystem?.name} is tier ${healthSystem?.subscriptionTier}, but you requested tier ${tier} keys` });
    }

    // For tier 2 (enterprise), there are no hard limits - it's a per-user pricing model
    // Only check limits for tier 1 (single provider)
    if (tier === 1) {
      const currentKeys = await SubscriptionKeyService.getActiveKeyCount(targetHealthSystemId);
      
      console.log(`🔐 [SubscriptionKeys] Current key counts:`, currentKeys);
      console.log(`📋 [SubscriptionKeys] Requested: ${providerCount} provider keys, ${nurseCount} nurse keys, ${staffCount} staff keys`);
      
      // Tier 1 only allows 1 provider
      if (currentKeys.providers + providerCount > 1) {
        console.error(`❌ [SubscriptionKeys] Tier 1 provider limit exceeded: ${currentKeys.providers} + ${providerCount} > 1`);
        return res.status(400).json({ 
          error: `Tier 1 subscriptions are limited to 1 provider. You currently have ${currentKeys.providers} active provider key${currentKeys.providers !== 1 ? 's' : ''}. Please upgrade to Enterprise (Tier 2) for multiple providers.`,
          details: {
            currentProviderKeys: currentKeys.providers,
            providerKeyLimit: 1,
            requestedKeys: providerCount
          }
        });
      }
      
      // Tier 1 doesn't support nurse or staff keys
      if (nurseCount > 0 || staffCount > 0) {
        console.error(`❌ [SubscriptionKeys] Tier 1 does not support nurse/staff keys`);
        return res.status(400).json({ 
          error: `Tier 1 subscriptions do not support nurse or staff keys. Please upgrade to Enterprise (Tier 2) for multi-user support.`
        });
      }
    } else {
      // For tier 2, just log the current state for monitoring
      const currentKeys = await SubscriptionKeyService.getActiveKeyCount(targetHealthSystemId);
      console.log(`🔐 [SubscriptionKeys] Current key counts (Tier 2 - no limits):`, currentKeys);
      console.log(`📋 [SubscriptionKeys] Requested: ${providerCount} provider keys, ${nurseCount} nurse keys, ${staffCount} staff keys`);
      console.log(`📈 [SubscriptionKeys] Will result in: ${currentKeys.providers + providerCount} providers, ${currentKeys.nurses + nurseCount} nurses, ${currentKeys.staff + staffCount} staff`);
    }

    // Generate keys
    const keys = await SubscriptionKeyService.createKeysForHealthSystem(
      targetHealthSystemId,
      tier,
      providerCount,
      nurseCount,
      staffCount,
      userId // Pass the current user ID who is generating the keys
    );

    res.json({ success: true, keys });
  } catch (error) {
    console.error('Error generating keys:', error);
    // Handle specific error messages from the service
    if (error instanceof Error && error.message) {
      res.status(500).json({ 
        error: error.message.includes('Trial') || error.message.includes('payment') ? 
          error.message : 
          'Unable to generate subscription keys at this time. Please try again later or contact support.'
      });
    } else {
      res.status(500).json({ 
        error: 'Unable to generate subscription keys at this time. Please try again later or contact support.' 
      });
    }
  }
});

// Validate and use a key
router.post('/validate', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { key } = req.body;
    const userId = req.user.id;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Invalid key format' });
    }

    const result = await SubscriptionKeyService.validateAndUseKey(key, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      keyType: result.keyType,
      subscriptionTier: result.subscriptionTier,
      healthSystemId: result.healthSystemId
    });
  } catch (error) {
    console.error('Error validating key:', error);
    res.status(500).json({ error: 'Failed to validate key' });
  }
});

// Get keys for health system (admin only)
router.get('/list', ensureHealthSystemAdmin, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    // System admins (username: 'admin') can see all keys from all health systems
    const isSystemAdmin = user?.username === 'admin';
    
    if (!isSystemAdmin && (!user || !user.healthSystemId)) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }

    // Get all keys - system admins see all, others see only their health system
    let keysQuery = db.select({
      id: subscriptionKeys.id,
      key: subscriptionKeys.key,
      keyType: subscriptionKeys.keyType,
      status: subscriptionKeys.status,
      createdAt: subscriptionKeys.createdAt,
      expiresAt: subscriptionKeys.expiresAt,
      usedAt: subscriptionKeys.usedAt,
      usedBy: subscriptionKeys.usedBy,
      userName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      healthSystemId: subscriptionKeys.healthSystemId,
      metadata: subscriptionKeys.metadata,
      subscriptionTier: subscriptionKeys.subscriptionTier,
      monthlyPrice: subscriptionKeys.monthlyPrice
    })
    .from(subscriptionKeys)
    .leftJoin(users, eq(subscriptionKeys.usedBy, users.id));
    
    // Apply filter for non-system admins
    let keys;
    if (!isSystemAdmin) {
      keys = await keysQuery.where(eq(subscriptionKeys.healthSystemId, user.healthSystemId));
    } else {
      keys = await keysQuery;
    }

    // Get counts - for system admins, show total across all systems
    let counts;
    if (isSystemAdmin) {
      // Get total counts across all health systems
      const allKeys = await db.select().from(subscriptionKeys);
      const activeKeys = allKeys.filter(k => k.status === 'active');
      counts = {
        total: allKeys.length,
        available: activeKeys.length,
        used: allKeys.filter(k => k.status === 'used').length,
        providers: activeKeys.filter(k => k.keyType === 'provider').length,
        staff: activeKeys.filter(k => k.keyType === 'staff').length
      };
    } else {
      counts = await SubscriptionKeyService.getActiveKeyCount(user.healthSystemId);
    }

    res.json({ keys, counts });
  } catch (error) {
    console.error('Error listing keys:', error);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// Deactivate a key (admin only)
router.post('/deactivate/:keyId', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;

    // Verify key belongs to user's health system
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [key] = await db.select().from(subscriptionKeys)
      .where(eq(subscriptionKeys.id, keyId));

    if (!key || key.healthSystemId !== user.healthSystemId) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const result = await SubscriptionKeyService.deactivateKey(keyId, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating key:', error);
    res.status(500).json({ error: 'Failed to deactivate key' });
  }
});

// Regenerate a key (admin only)
router.post('/regenerate/:keyId', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;

    // Verify key belongs to user's health system
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [key] = await db.select().from(subscriptionKeys)
      .where(eq(subscriptionKeys.id, keyId));

    if (!key || key.healthSystemId !== user.healthSystemId) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const result = await SubscriptionKeyService.regenerateKey(keyId, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, key: result.key });
  } catch (error) {
    console.error('Error regenerating key:', error);
    res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

// Check user's verification status
router.get('/verification-status', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const [user] = await db.select({
      verificationStatus: users.verificationStatus,
      verifiedAt: users.verifiedAt,
      healthSystemId: users.healthSystemId,
      healthSystemName: healthSystems.name,
      subscriptionTier: healthSystems.subscriptionTier
    })
    .from(users)
    .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
    .where(eq(users.id, userId));

    res.json({
      verificationStatus: user.verificationStatus,
      verifiedAt: user.verifiedAt,
      healthSystem: user.healthSystemName,
      subscriptionTier: user.subscriptionTier
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

export default router;