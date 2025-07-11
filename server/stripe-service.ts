// Stripe Payment Service
// Handles all payment processing for subscription tiers

import Stripe from 'stripe';
import { subscriptionConfig } from './subscription-config';
import { db } from './db';
import { healthSystems, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export interface CreateSubscriptionParams {
  email: string;
  name: string;
  tier: 1 | 2 | 3;
  billingPeriod: 'monthly' | 'annual';
  healthSystemId?: number;
  paymentMethodId?: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  customerId?: string;
  clientSecret?: string;
  error?: string;
  requiresAction?: boolean;
}

export class StripeService {
  // Create a new customer in Stripe
  static async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'clarafi_emr',
      },
    });
  }

  // Create a subscription for a user
  static async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    try {
      // Get pricing configuration
      const pricing = subscriptionConfig.getPricing(params.tier);
      const priceAmount = params.billingPeriod === 'annual' ? 
        (typeof pricing.annual === 'number' ? pricing.annual : 0) : 
        (typeof pricing.monthly === 'number' ? pricing.monthly : 0);

      if (priceAmount === 0 || typeof pricing.monthly === 'string') {
        return {
          success: false,
          error: 'Custom pricing requires contacting sales',
        };
      }

      // Create or retrieve customer
      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: params.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.createCustomer(params.email, params.name);
      }

      // Create price (dynamic pricing)
      const price = await stripe.prices.create({
        unit_amount: priceAmount * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: params.billingPeriod === 'annual' ? 'year' : 'month',
        },
        product_data: {
          name: `Clarafi ${pricing.name} - ${params.billingPeriod}`,
          metadata: {
            tier: params.tier.toString(),
            billing_period: params.billingPeriod,
          },
        },
      });

      // Create subscription with trial period
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          tier: params.tier.toString(),
          healthSystemId: params.healthSystemId?.toString() || '',
        },
      };

      // Add trial period if configured
      if (pricing.trialDays && pricing.trialDays > 0) {
        subscriptionData.trial_period_days = pricing.trialDays;
      }

      // Add payment method if provided
      if (params.paymentMethodId) {
        subscriptionData.default_payment_method = params.paymentMethodId;
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);
      
      // Get the client secret for payment confirmation
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      return {
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret: paymentIntent?.client_secret || undefined,
        requiresAction: paymentIntent?.status === 'requires_action',
      };
    } catch (error: any) {
      console.error('Stripe subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create subscription',
      };
    }
  }

  // Update health system with subscription info
  static async updateHealthSystemSubscription(
    healthSystemId: number,
    subscriptionId: string,
    customerId: string,
    tier: 1 | 2 | 3
  ): Promise<void> {
    await db.update(healthSystems)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
      })
      .where(eq(healthSystems.id, healthSystemId));

    // Store Stripe IDs in a separate table or as JSON metadata
    // For now, we'll use the existing schema
  }

  // Cancel a subscription
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  // Update subscription (upgrade/downgrade)
  static async updateSubscription(
    subscriptionId: string,
    newTier: 1 | 2 | 3,
    newBillingPeriod: 'monthly' | 'annual'
  ): Promise<SubscriptionResult> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const pricing = subscriptionConfig.getPricing(newTier);
      
      const priceAmount = newBillingPeriod === 'annual' ? 
        (typeof pricing.annual === 'number' ? pricing.annual : 0) : 
        (typeof pricing.monthly === 'number' ? pricing.monthly : 0);

      if (priceAmount === 0) {
        return {
          success: false,
          error: 'Custom pricing requires contacting sales',
        };
      }

      // Create new price
      const price = await stripe.prices.create({
        unit_amount: priceAmount * 100,
        currency: 'usd',
        recurring: {
          interval: newBillingPeriod === 'annual' ? 'year' : 'month',
        },
        product_data: {
          name: `Clarafi ${pricing.name} - ${newBillingPeriod}`,
          metadata: {
            tier: newTier.toString(),
            billing_period: newBillingPeriod,
          },
        },
      });

      // Update subscription
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: price.id,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          tier: newTier.toString(),
        },
      });

      return {
        success: true,
        subscriptionId: updatedSubscription.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update subscription',
      };
    }
  }

  // Handle webhook events from Stripe
  static async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 [Stripe] Checkout completed for session:', session.id);
        
        // Get metadata from the session
        if (session.metadata?.healthSystemId) {
          const healthSystemId = parseInt(session.metadata.healthSystemId);
          
          // Check if this is a tier 3 upgrade
          if (session.metadata?.upgradeType === 'tier3') {
            console.log(`🚀 [Stripe] Processing tier 3 upgrade for health system ${healthSystemId}`);
            
            // Update health system to tier 3
            await db.update(healthSystems)
              .set({
                subscriptionTier: 3,
                subscriptionStatus: 'active',
                subscriptionStartDate: new Date(),
              })
              .where(eq(healthSystems.id, healthSystemId));
            
            console.log(`✅ [Stripe] Upgraded health system ${healthSystemId} to tier 3`);
          } else if (session.metadata?.userId) {
            // Regular user subscription
            const userId = parseInt(session.metadata.userId);
            
            // Update health system subscription status
            await db.update(healthSystems)
              .set({
                subscriptionStatus: 'active',
                subscriptionStartDate: new Date(),
              })
              .where(eq(healthSystems.id, healthSystemId));
            
            console.log(`✅ [Stripe] Activated health system ${healthSystemId} for user ${userId}`);
          }
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        // Update health system subscription status
        if (subscription.metadata.healthSystemId) {
          await db.update(healthSystems)
            .set({
              subscriptionStatus: subscription.status === 'active' ? 'active' : 'suspended',
            })
            .where(eq(healthSystems.id, parseInt(subscription.metadata.healthSystemId)));
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription;
        if (deletedSub.metadata.healthSystemId) {
          await db.update(healthSystems)
            .set({
              subscriptionStatus: 'cancelled',
              subscriptionEndDate: new Date(),
            })
            .where(eq(healthSystems.id, parseInt(deletedSub.metadata.healthSystemId)));
        }
        break;

      case 'invoice.payment_succeeded':
        // Handle successful payment
        console.log('Payment succeeded for invoice:', event.data.object);
        break;

      case 'invoice.payment_failed':
        // Handle failed payment
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.error('Payment failed for customer:', failedInvoice.customer);
        // Could send email notification here
        break;
    }
  }

  // Get subscription details
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return null;
    }
  }

  // Create a checkout session for new registration
  static async createCheckoutSession(params: {
    email: string;
    name: string;
    tier: 1 | 2 | 3;
    billingPeriod: 'monthly' | 'annual';
    healthSystemId: number;
    metadata?: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; sessionUrl?: string; error?: string }>;
  
  // Create a checkout session for upgrading (overloaded)
  static async createCheckoutSession(
    customerId: string,
    tier: 1 | 2 | 3,
    billingPeriod: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ): Promise<string | null>;
  
  // Implementation
  static async createCheckoutSession(
    paramsOrCustomerId: any,
    tier?: 1 | 2 | 3,
    billingPeriod?: 'monthly' | 'annual',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<any> {
    try {
      // Handle object parameter (new registration)
      if (typeof paramsOrCustomerId === 'object' && paramsOrCustomerId.email) {
        const params = paramsOrCustomerId;
        const pricing = subscriptionConfig.getPricing(params.tier);
        const priceAmount = params.billingPeriod === 'annual' ? 
          (typeof pricing.annual === 'number' ? pricing.annual : 0) : 
          (typeof pricing.monthly === 'number' ? pricing.monthly : 0);

        const session = await stripe.checkout.sessions.create({
          customer_email: params.email,
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Clarafi ${pricing.name}`,
                description: pricing.description,
              },
              unit_amount: priceAmount * 100,
              recurring: {
                interval: params.billingPeriod === 'annual' ? 'year' : 'month',
              },
            },
            quantity: 1,
          }],
          mode: 'subscription',
          subscription_data: {
            trial_period_days: pricing.trialDays || 30,
            metadata: params.metadata || {},
          },
          metadata: {
            ...params.metadata,
            healthSystemId: params.healthSystemId.toString(),
          },
          success_url: params.successUrl || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://your-app.replit.app'}/auth?payment=success`,
          cancel_url: params.cancelUrl || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://your-app.replit.app'}/auth?payment=cancelled`,
        });

        return { 
          success: true, 
          sessionUrl: session.url 
        };
      }
      
      // Handle individual parameters (upgrade flow)
      const customerId = paramsOrCustomerId;
      const pricing = subscriptionConfig.getPricing(tier!);
      const priceAmount = billingPeriod === 'annual' ? 
        (typeof pricing.annual === 'number' ? pricing.annual : 0) : 
        (typeof pricing.monthly === 'number' ? pricing.monthly : 0);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Clarafi ${pricing.name}`,
              description: pricing.description,
            },
            unit_amount: priceAmount * 100,
            recurring: {
              interval: billingPeriod === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl!,
        cancel_url: cancelUrl!,
      });

      return session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      // Return appropriate response based on call type
      if (typeof paramsOrCustomerId === 'object' && paramsOrCustomerId.email) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to create checkout session' 
        };
      }
      return null;
    }
  }
}