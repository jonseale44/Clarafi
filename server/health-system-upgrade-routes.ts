import { Router } from 'express';
import { db } from './db.js';
import { healthSystems, users, subscriptionHistory } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { StripeService } from './stripe-service';
import { SubscriptionConfig } from './subscription-config';

const router = Router();

// Middleware to ensure user is admin of their health system
const ensureHealthSystemAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get current subscription status
router.get('/status', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user and their health system
    const [user] = await db.select({
      healthSystemId: users.healthSystemId,
      healthSystemName: healthSystems.name,
      subscriptionTier: healthSystems.subscriptionTier,
      subscriptionStatus: healthSystems.subscriptionStatus,
      stripeCustomerId: healthSystems.stripeCustomerId,
      stripeSubscriptionId: healthSystems.stripeSubscriptionId,
      subscriptionStartDate: healthSystems.subscriptionStartDate,
      subscriptionEndDate: healthSystems.subscriptionEndDate,
    })
    .from(users)
    .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
    .where(eq(users.id, userId));
    
    if (!user || !user.healthSystemId) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }
    
    // Get tier configuration
    const tierConfig = SubscriptionConfig.getInstance().getTier(user.subscriptionTier || 1);
    
    res.json({
      currentTier: user.subscriptionTier || 1,
      tierName: tierConfig.name,
      subscriptionStatus: user.subscriptionStatus || 'trial',
      features: tierConfig.features,
      canUpgrade: user.subscriptionTier !== 2, // Can upgrade if not already tier 2
      availableUpgrades: user.subscriptionTier === 1 ? [2] : []
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create checkout session for upgrade
router.post('/upgrade-checkout', ensureHealthSystemAdmin, async (req, res) => {
  try {
    const { targetTier, billingPeriod } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!targetTier || ![1, 2].includes(targetTier)) {
      return res.status(400).json({ error: 'Invalid target tier' });
    }
    
    if (!billingPeriod || !['monthly', 'annual'].includes(billingPeriod)) {
      return res.status(400).json({ error: 'Invalid billing period' });
    }
    
    // Get user and health system
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
    
    // Prevent downgrade
    if (targetTier <= (user.currentTier || 1)) {
      return res.status(400).json({ error: 'Cannot downgrade subscription tier' });
    }
    
    // Create Stripe checkout session for upgrade
    const checkoutResult = await StripeService.createCheckoutSession({
      email: user.email,
      name: user.healthSystemName || `${user.firstName} ${user.lastName}`,
      tier: targetTier as 1 | 2,
      billingPeriod: billingPeriod as 'monthly' | 'annual',
      healthSystemId: user.healthSystemId,
      metadata: {
        upgradeFrom: (user.currentTier || 1).toString(),
        healthSystemId: user.healthSystemId.toString(),
        userId: userId.toString(),
        action: 'upgrade'
      }
    });
    
    if (checkoutResult.success && checkoutResult.sessionUrl) {
      res.json({
        success: true,
        checkoutUrl: checkoutResult.sessionUrl
      });
    } else {
      console.error('Failed to create checkout session:', checkoutResult.error);
      res.status(500).json({ 
        error: 'Failed to create payment session',
        details: checkoutResult.error 
      });
    }
  } catch (error) {
    console.error('Error creating upgrade checkout:', error);
    res.status(500).json({ error: 'Failed to create upgrade checkout' });
  }
});

// Handle successful upgrade (called by Stripe webhook)
router.post('/complete-upgrade', async (req, res) => {
  try {
    // This endpoint should be called by our Stripe webhook handler
    // Verify internal API key or webhook signature
    const { healthSystemId, newTier, stripeSubscriptionId } = req.body;
    
    // Update health system tier
    await db.update(healthSystems)
      .set({
        subscriptionTier: newTier,
        subscriptionStatus: 'active',
        stripeSubscriptionId: stripeSubscriptionId,
        subscriptionStartDate: new Date(),
      })
      .where(eq(healthSystems.id, healthSystemId));
    
    // Record in subscription history
    await db.insert(subscriptionHistory).values({
      healthSystemId,
      previousTier: 1, // Would need to track this
      newTier,
      changeType: 'upgrade',
      gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      dataExpiresAt: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 30 days + 7 days
      metadata: {
        stripeSubscriptionId,
        upgradeDate: new Date().toISOString()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing upgrade:', error);
    res.status(500).json({ error: 'Failed to complete upgrade' });
  }
});

export { router as healthSystemUpgradeRoutes };