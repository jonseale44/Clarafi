import { Router } from 'express';
import { SubscriptionKeyService } from './subscription-key-service';
import { db } from './db';
import { users, healthSystems, subscriptionKeys } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Middleware to ensure user is admin of their health system
const ensureHealthSystemAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Generate keys for health system (admin only)
router.post('/generate', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const { providerCount, staffCount, tier } = req.body;
    const userId = req.user.id;

    // Get user's health system
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.healthSystemId) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }

    // Validate tier matches health system subscription
    const [healthSystem] = await db.select().from(healthSystems)
      .where(eq(healthSystems.id, user.healthSystemId));
    
    if (!healthSystem || healthSystem.subscriptionTier !== tier) {
      return res.status(400).json({ error: 'Tier does not match health system subscription' });
    }

    // Check current key counts against limits
    const currentKeys = await SubscriptionKeyService.getActiveKeyCount(user.healthSystemId);
    const limits = healthSystem.subscriptionLimits as any || {};
    
    if (currentKeys.providers + providerCount > limits.providerKeys) {
      return res.status(400).json({ 
        error: `Would exceed provider key limit (${limits.providerKeys})` 
      });
    }
    
    if (currentKeys.staff + staffCount > limits.staffKeys) {
      return res.status(400).json({ 
        error: `Would exceed staff key limit (${limits.staffKeys})` 
      });
    }

    // Generate keys
    const keys = await SubscriptionKeyService.createKeysForHealthSystem(
      user.healthSystemId,
      tier,
      providerCount,
      staffCount
    );

    res.json({ success: true, keys });
  } catch (error) {
    console.error('Error generating keys:', error);
    res.status(500).json({ error: 'Failed to generate keys' });
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
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.healthSystemId) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }

    // Get all keys for the health system
    const keys = await db.select({
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
      userEmail: users.email
    })
    .from(subscriptionKeys)
    .leftJoin(users, eq(subscriptionKeys.usedBy, users.id))
    .where(eq(subscriptionKeys.healthSystemId, user.healthSystemId));

    // Get counts
    const counts = await SubscriptionKeyService.getActiveKeyCount(user.healthSystemId);

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