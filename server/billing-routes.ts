// Billing Routes
// Handles payment methods, billing history, and automated billing configuration

import { Router } from 'express';
import { db } from './db.js';
import { healthSystems, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { StripeService } from './stripe-service.js';
import { PaymentAutomationService } from './payment-automation-service.js';
import { BillingCalculationService } from './billing-calculation-service.js';
import Stripe from 'stripe';

const router = Router();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get payment methods for the health system
router.get('/payment-methods', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db
      .select({
        healthSystemId: users.healthSystemId,
        stripeCustomerId: healthSystems.stripeCustomerId,
      })
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, userId));
    
    if (!user?.stripeCustomerId) {
      return res.json({ cards: [], bankAccounts: [] });
    }
    
    const paymentMethods = await PaymentAutomationService.getPaymentMethods(user.stripeCustomerId);
    res.json(paymentMethods);
    
  } catch (error: any) {
    console.error('❌ [Billing] Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Get billing history
router.get('/history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 12;
    
    // Get user's health system
    const [user] = await db
      .select({ healthSystemId: users.healthSystemId })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user?.healthSystemId) {
      return res.json([]);
    }
    
    const history = await PaymentAutomationService.getPaymentHistory(user.healthSystemId, limit);
    res.json(history);
    
  } catch (error: any) {
    console.error('❌ [Billing] Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get current subscription details
router.get('/current-subscription', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db
      .select({
        healthSystemId: users.healthSystemId,
        subscriptionTier: healthSystems.subscriptionTier,
        subscriptionStatus: healthSystems.subscriptionStatus,
        stripeSubscriptionId: healthSystems.stripeSubscriptionId,
      })
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, userId));
    
    if (!user?.healthSystemId) {
      return res.json({
        tier: 0,
        monthlyTotal: 0,
        nextBillingDate: null,
        status: 'no_subscription',
      });
    }
    
    // Calculate monthly total
    let monthlyTotal = 0;
    let nextBillingDate = null;
    
    if (user.subscriptionTier === 1) {
      monthlyTotal = 149; // Tier 1 flat rate
    } else if (user.subscriptionTier === 2) {
      // Calculate based on active users
      const calculation = await BillingCalculationService.calculateMonthlyBilling(user.healthSystemId);
      monthlyTotal = calculation.monthlyTotal;
    }
    
    // Get next billing date from Stripe if subscription exists
    if (user.stripeSubscriptionId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        nextBillingDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }
    
    res.json({
      tier: user.subscriptionTier,
      monthlyTotal,
      nextBillingDate,
      status: user.subscriptionStatus || 'no_subscription',
    });
    
  } catch (error: any) {
    console.error('❌ [Billing] Error fetching subscription details:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Create payment method setup session
router.post('/setup-payment-method', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db
      .select({ healthSystemId: users.healthSystemId })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user?.healthSystemId) {
      return res.status(400).json({ error: 'No health system associated with user' });
    }
    
    const setupUrl = await PaymentAutomationService.createPaymentSetupLink(user.healthSystemId);
    res.json({ setupUrl });
    
  } catch (error: any) {
    console.error('❌ [Billing] Error creating payment setup session:', error);
    res.status(500).json({ error: 'Failed to create payment setup session' });
  }
});

// Configure ACH payment (for enterprise accounts)
router.post('/setup-ach', ensureAuthenticated, async (req, res) => {
  try {
    const { bankAccountToken } = req.body;
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db
      .select({
        stripeCustomerId: healthSystems.stripeCustomerId,
        role: users.role,
      })
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, userId));
    
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }
    
    // Only allow admins to set up ACH
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required for ACH setup' });
    }
    
    const result = await PaymentAutomationService.setupACHDebit(
      user.stripeCustomerId,
      bankAccountToken
    );
    
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ [Billing] Error setting up ACH:', error);
    res.status(500).json({ error: 'Failed to set up ACH payment' });
  }
});

// Update payment preferences
router.post('/update-preferences', ensureAuthenticated, async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;
    
    // Get user's health system
    const [user] = await db
      .select({
        healthSystemId: users.healthSystemId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user?.healthSystemId || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Update health system metadata with payment preferences
    await db
      .update(healthSystems)
      .set({
        metadata: {
          paymentPreferences: preferences,
        },
      })
      .where(eq(healthSystems.id, user.healthSystemId));
    
    res.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ [Billing] Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update payment preferences' });
  }
});

export default router;