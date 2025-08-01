// Stripe Payment Service
// Handles all payment processing for subscription tiers

import Stripe from 'stripe';
import { subscriptionConfig } from './subscription-config.js';
import { db } from './db.js';
import { healthSystems, users, conversionEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PER_USER_PRICING } from '@shared/feature-gates';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export interface CreateSubscriptionParams {
  email: string;
  name: string;
  tier: 1 | 2;
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

export interface PerUserBillingCheckoutParams {
  healthSystemId: number;
  healthSystemName: string;
  email: string;
  monthlyAmount: number;
  userCounts: {
    providers: number;
    clinicalStaff: number;
    adminStaff: number;
    readOnly: number;
  };
  billingDetails: {
    providers: { count: number; rate: number; total: number };
    clinicalStaff: { count: number; rate: number; total: number };
    adminStaff: { count: number; rate: number; total: number };
    readOnly: { count: number; rate: number; total: number };
  };
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
    tier: 1 | 2
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
    newTier: 1 | 2,
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
          
          // Check if this is a per-user billing (subscription key purchase)
          if (session.metadata?.billingType === 'per_user') {
            console.log(`🔑 [Stripe] Processing subscription key purchase for health system ${healthSystemId}`);
            
            // Import the subscription key service
            const { SubscriptionKeyService } = await import('./subscription-key-service.js');
            
            // Get key counts from metadata
            const providerCount = parseInt(session.metadata.providerCount || '0');
            const nurseCount = parseInt(session.metadata.nurseCount || '0');
            const staffCount = parseInt(session.metadata.staffCount || '0');
            
            console.log(`📦 [Stripe] Generating keys:`, { providerCount, nurseCount, staffCount });
            
            // Generate the subscription keys
            const generatedKeys = await SubscriptionKeyService.createKeysForHealthSystem(
              healthSystemId,
              providerCount,
              staffCount,
              nurseCount // Pass nurse count as third parameter
            );
            
            console.log(`✅ [Stripe] Generated ${generatedKeys.length} subscription keys for health system ${healthSystemId}`);
            
            // Send email with the generated keys
            try {
              const { EmailVerificationService } = await import('./email-verification-service.js');
              
              // Get health system details for the email
              const [healthSystem] = await db.select()
                .from(healthSystems)
                .where(eq(healthSystems.id, healthSystemId));
              
              if (healthSystem?.primaryContactEmail) {
                // Format the keys for email
                const keysByType = {
                  provider: generatedKeys.filter(k => k.keyType === 'provider'),
                  nurse: generatedKeys.filter(k => k.keyType === 'clinicalStaff'),
                  staff: generatedKeys.filter(k => k.keyType === 'adminStaff')
                };
                
                const keysHtml = `
                  <h2>Your CLARAFI Subscription Keys</h2>
                  <p>Thank you for your purchase! Here are your new subscription keys:</p>
                  
                  ${keysByType.provider.length > 0 ? `
                    <h3>Provider Keys ($399/month each)</h3>
                    <ul>
                      ${keysByType.provider.map(k => `<li><code>${k.key}</code></li>`).join('')}
                    </ul>
                  ` : ''}
                  
                  ${keysByType.nurse.length > 0 ? `
                    <h3>Nurse/Clinical Staff Keys ($99/month each)</h3>
                    <ul>
                      ${keysByType.nurse.map(k => `<li><code>${k.key}</code></li>`).join('')}
                    </ul>
                  ` : ''}
                  
                  ${keysByType.staff.length > 0 ? `
                    <h3>Administrative Staff Keys ($49/month each)</h3>
                    <ul>
                      ${keysByType.staff.map(k => `<li><code>${k.key}</code></li>`).join('')}
                    </ul>
                  ` : ''}
                  
                  <p>To use these keys, share them with your staff members who will use them during account registration.</p>
                  <p>You can also view and manage your keys at: <a href="https://${process.env.REPLIT_DEV_DOMAIN}/admin/subscription-keys">Subscription Keys Dashboard</a></p>
                `;
                
                await EmailVerificationService.sendEmail({
                  to: healthSystem.primaryContactEmail,
                  subject: 'CLARAFI - Your New Subscription Keys',
                  html: keysHtml,
                  text: `Your CLARAFI Subscription Keys\n\n${generatedKeys.map(k => `${k.key} (${k.keyType})`).join('\n')}\n\nView your keys at: https://${process.env.REPLIT_DEV_DOMAIN}/admin/subscription-keys`
                });
                
                console.log(`📧 [Stripe] Sent subscription keys email to ${healthSystem.primaryContactEmail}`);
              }
            } catch (emailError) {
              console.error('❌ [Stripe] Failed to send subscription keys email:', emailError);
              // Don't fail the webhook, keys are still generated
            }
            
          } else if (session.metadata?.upgradeType === 'tier2') {
            console.log(`🚀 [Stripe] Processing tier 2 upgrade for health system ${healthSystemId}`);
            
            // Update health system to tier 2
            await db.update(healthSystems)
              .set({
                subscriptionTier: 2,
                subscriptionStatus: 'active',
                subscriptionStartDate: new Date(),
              })
              .where(eq(healthSystems.id, healthSystemId));
            
            console.log(`✅ [Stripe] Upgraded health system ${healthSystemId} to tier 2`);
            
            // Track conversion event for subscription upgrade
            try {
              // Get the original provider who created the health system
              const healthSystem = await db.select().from(healthSystems).where(eq(healthSystems.id, healthSystemId)).limit(1);
              const originalProviderId = healthSystem[0]?.originalProviderId;
              
              if (originalProviderId) {
                await db.insert(conversionEvents).values({
                  userId: originalProviderId,
                  healthSystemId: healthSystemId,
                  eventType: 'subscription_upgrade',
                  eventTimestamp: new Date(),
                  sessionId: null,
                  deviceType: 'unknown',
                  browserInfo: null,
                  acquisitionId: null,
                  eventData: {
                    fromTier: 1,
                    toTier: 2,
                    upgradeMethod: 'stripe_checkout',
                    sessionId: session.id,
                    stripeCustomerId: session.customer,
                  },
                  monetaryValue: session.amount_total ? session.amount_total / 100 : null, // Convert from cents to dollars
                });
                console.log(`🎯 [Stripe] Tracked subscription upgrade conversion for health system ${healthSystemId}`);
              }
            } catch (trackingError) {
              console.error('❌ [Stripe] Failed to track upgrade conversion:', trackingError);
              // Don't fail the upgrade if tracking fails
            }
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
    tier: 1 | 2;
    billingPeriod: 'monthly' | 'annual';
    healthSystemId: number;
    metadata?: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; sessionUrl?: string; error?: string }>;
  
  // Create a checkout session for upgrading (overloaded)
  static async createCheckoutSession(
    customerId: string,
    tier: 1 | 2,
    billingPeriod: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ): Promise<string | null>;
  
  // Implementation
  static async createCheckoutSession(
    paramsOrCustomerId: any,
    tier?: 1 | 2,
    billingPeriod?: 'monthly' | 'annual',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<any> {
    try {
      // Handle object parameter (new registration)
      if (typeof paramsOrCustomerId === 'object' && paramsOrCustomerId.email) {
        const params = paramsOrCustomerId;
        
        // Simple tier-based pricing in test mode
        let priceAmount: number;
        let productName: string;
        let productDescription: string;
        
        switch (params.tier) {
          case 1:
            priceAmount = 149; // $149/month for Personal EMR
            productName = 'Clarafi Personal EMR';
            productDescription = 'Full documentation features for individual providers';
            break;
          case 2:
            priceAmount = 299; // $299/month starting price for Enterprise
            productName = 'Clarafi Enterprise EMR';
            productDescription = 'Complete EMR with all integrations and admin features';
            break;
          default:
            console.error(`❌ [Stripe] Invalid tier: ${params.tier}`);
            return {
              success: false,
              error: `Invalid subscription tier: ${params.tier}`
            };
        }
        
        console.log(`💰 [Stripe] Creating checkout session: ${productName} - $${priceAmount}/month`);
        console.log(`📧 [Stripe] Customer email: ${params.email}`);
        console.log(`🏥 [Stripe] Health System ID: ${params.healthSystemId}`);
        console.log(`🏷️ [Stripe] Metadata:`, params.metadata);
        console.log(`🌐 [Stripe] Domain: ${process.env.REPLIT_DEV_DOMAIN}`);
        
        const sessionParams = {
          customer_email: params.email,
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: productName,
                description: productDescription,
              },
              unit_amount: priceAmount * 100, // Convert to cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          }],
          mode: 'subscription' as const,
          metadata: {
            healthSystemId: params.healthSystemId.toString(),
            tier: params.tier.toString(),
            userId: params.metadata?.userId || '',
            registrationType: params.metadata?.registrationType || 'unknown',
          },
          success_url: `https://${process.env.REPLIT_DEV_DOMAIN}/auth?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN}/auth?payment=cancelled`,
        };
        
        console.log(`📝 [Stripe] Session params:`, JSON.stringify(sessionParams, null, 2));
        
        // Create simple checkout session with minimal configuration
        const session = await stripe.checkout.sessions.create(sessionParams);
        
        console.log(`✅ [Stripe] Session created successfully`);
        console.log(`🆔 [Stripe] Session ID: ${session.id}`);
        console.log(`🔗 [Stripe] Session URL: ${session.url}`);
        console.log(`📊 [Stripe] Session status: ${session.status}`);
        console.log(`💳 [Stripe] Payment status: ${session.payment_status}`);
        console.log(`🔍 [Stripe] Full session object:`, JSON.stringify({
          id: session.id,
          url: session.url,
          status: session.status,
          payment_status: session.payment_status,
          mode: session.mode,
          customer_email: session.customer_email,
          metadata: session.metadata,
          created: session.created,
          expires_at: session.expires_at,
        }, null, 2));

        if (!session.url) {
          console.error(`❌ [Stripe] No URL returned in session!`);
          console.error(`❌ [Stripe] Full session response:`, session);
          return {
            success: false,
            error: 'Stripe session created but no checkout URL returned'
          };
        }

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
    } catch (error: any) {
      console.error('❌ [Stripe] Error creating checkout session:', error);
      console.error('❌ [Stripe] Error type:', error.type);
      console.error('❌ [Stripe] Error message:', error.message);
      console.error('❌ [Stripe] Error code:', error.code);
      console.error('❌ [Stripe] Error status:', error.statusCode);
      console.error('❌ [Stripe] Request ID:', error.requestId);
      
      if (error.raw) {
        console.error('❌ [Stripe] Raw error response:', JSON.stringify(error.raw, null, 2));
      }
      
      // Log Stripe-specific error details
      if (error.type === 'StripeAPIError') {
        console.error('❌ [Stripe] API Error Details:', {
          type: error.type,
          rawType: error.rawType,
          code: error.code,
          docUrl: error.doc_url,
          requestId: error.requestId,
          statusCode: error.statusCode,
          charge: error.charge,
          decline_code: error.decline_code,
          param: error.param,
        });
      }
      
      // Return appropriate response based on call type
      if (typeof paramsOrCustomerId === 'object' && paramsOrCustomerId.email) {
        return { 
          success: false, 
          error: error.message || 'Failed to create checkout session' 
        };
      }
      return null;
    }
  }

  // Create a checkout session for per-user billing (Enterprise Tier 2)
  static async createPerUserBillingCheckout(params: PerUserBillingCheckoutParams): Promise<string> {
    try {
      console.log('💰 [Stripe] Creating per-user billing checkout:', {
        healthSystemName: params.healthSystemName,
        monthlyAmount: params.monthlyAmount,
        userCounts: params.userCounts
      });

      // Create line items for each user type with active users
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      
      if (params.userCounts.providers > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Provider Users',
              description: `${params.userCounts.providers} active provider(s) at $${PER_USER_PRICING.provider.monthly}/month each`,
            },
            unit_amount: PER_USER_PRICING.provider.monthly * 100, // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: params.userCounts.providers,
        });
      }

      if (params.userCounts.clinicalStaff > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Clinical Staff Users',
              description: `${params.userCounts.clinicalStaff} active clinical staff at $${PER_USER_PRICING.clinicalStaff.monthly}/month each`,
            },
            unit_amount: PER_USER_PRICING.clinicalStaff.monthly * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: params.userCounts.clinicalStaff,
        });
      }

      if (params.userCounts.adminStaff > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Administrative Staff Users',
              description: `${params.userCounts.adminStaff} active admin staff at $${PER_USER_PRICING.adminStaff.monthly}/month each`,
            },
            unit_amount: PER_USER_PRICING.adminStaff.monthly * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: params.userCounts.adminStaff,
        });
      }

      if (params.userCounts.readOnly > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Read-Only Users',
              description: `${params.userCounts.readOnly} read-only user(s) at $${PER_USER_PRICING.readOnly.monthly}/month each`,
            },
            unit_amount: PER_USER_PRICING.readOnly.monthly * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: params.userCounts.readOnly,
        });
      }

      // If no active users, add a placeholder item
      if (lineItems.length === 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Clarafi Enterprise EMR - Base Subscription',
              description: 'No active users currently. You will be billed as users are added.',
            },
            unit_amount: 100, // $1 placeholder
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: params.email,
        line_items: lineItems,
        mode: 'subscription',
        success_url: `https://${process.env.REPLIT_DEV_DOMAIN}/admin/subscription-keys?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN}/admin/subscription-keys?payment=cancelled`,
        metadata: {
          healthSystemId: params.healthSystemId.toString(),
          healthSystemName: params.healthSystemName,
          billingType: 'per_user',
          totalUsers: Object.values(params.userCounts).reduce((a, b) => a + b, 0).toString(),
          monthlyTotal: params.monthlyAmount.toString(),
          providerCount: params.userCounts.providers.toString(),
          nurseCount: params.userCounts.clinicalStaff.toString(),
          staffCount: params.userCounts.adminStaff.toString(),
        },
        subscription_data: {
          metadata: {
            healthSystemId: params.healthSystemId.toString(),
            billingType: 'per_user',
          },
        },
        allow_promotion_codes: true,
      });

      if (!session.url) {
        throw new Error('Stripe session created but no checkout URL returned');
      }

      console.log('✅ [Stripe] Per-user billing checkout session created:', session.id);
      return session.url;
    } catch (error: any) {
      console.error('❌ [Stripe] Error creating per-user billing checkout:', error);
      throw new Error(`Failed to create billing checkout: ${error.message}`);
    }
  }
}