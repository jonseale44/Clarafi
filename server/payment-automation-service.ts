// Payment Automation Service
// Handles automated billing, payment methods, and dunning for enterprise accounts

import Stripe from 'stripe';
import { db } from './db.js';
import { healthSystems, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { EmailService } from './email-service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export interface PaymentMethodPreferences {
  preferredMethod: 'card' | 'ach_debit' | 'wire_transfer';
  autoRetry: boolean;
  invoiceSettings: {
    sendReminders: boolean;
    netTerms: 0 | 15 | 30 | 60; // NET payment terms
    customFooter?: string;
  };
}

export class PaymentAutomationService {
  
  /**
   * Set up ACH debit for enterprise accounts
   * Lower transaction fees (0.8% capped at $5 vs 2.9% + 30¢ for cards)
   */
  static async setupACHDebit(customerId: string, bankAccountToken: string) {
    try {
      // Attach bank account to customer
      const bankAccount = await stripe.customers.createSource(customerId, {
        source: bankAccountToken,
      });

      // Verify bank account with micro-deposits
      await stripe.customers.verifySource(customerId, bankAccount.id, {
        amounts: [32, 45], // Customer enters these amounts to verify
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: bankAccount.id,
        },
      });

      return { success: true, bankAccountId: bankAccount.id };
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] ACH setup error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Configure automated dunning (smart retry logic for failed payments)
   */
  static async configureDunning(subscriptionId: string) {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        collection_method: 'charge_automatically',
        days_until_due: null, // Charge immediately
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: 'automatic',
            },
            us_bank_account: {
              financial_connections: {
                permissions: ['payment_method', 'balances'],
              },
              verification_method: 'automatic',
            },
          },
          save_default_payment_method: 'on_subscription',
        },
      });

      // Configure retry schedule
      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'keep_as_draft',
          resumes_at: null,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Dunning configuration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up payment method updater (automatically updates expired cards)
   */
  static async enableCardUpdater(customerId: string) {
    try {
      await stripe.customers.update(customerId, {
        metadata: {
          card_updater_enabled: 'true',
          last_update_check: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Card updater error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a payment link for one-time setup
   */
  static async createPaymentSetupLink(healthSystemId: number): Promise<string> {
    try {
      const [healthSystem] = await db
        .select()
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId));

      if (!healthSystem) {
        throw new Error('Health system not found');
      }

      // Create a setup session for adding payment methods
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: healthSystem.stripeCustomerId || undefined,
        payment_method_types: ['card', 'us_bank_account'],
        success_url: `https://${process.env.REPLIT_DEV_DOMAIN}/dashboard?payment_setup=success`,
        cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN}/dashboard?payment_setup=cancelled`,
        metadata: {
          healthSystemId: healthSystemId.toString(),
          purpose: 'payment_method_setup',
        },
      });

      return session.url || '';
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Setup link error:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods for a customer
   */
  static async getPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      const bankAccounts = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'us_bank_account',
      });

      return {
        cards: paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: false, // You'd check against customer's default
        })),
        bankAccounts: bankAccounts.data.map(pm => ({
          id: pm.id,
          bankName: pm.us_bank_account?.bank_name,
          last4: pm.us_bank_account?.last4,
          accountType: pm.us_bank_account?.account_type,
          isDefault: false,
        })),
      };
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Get payment methods error:', error);
      return { cards: [], bankAccounts: [] };
    }
  }

  /**
   * Send payment reminder before charge attempt
   */
  static async sendPaymentReminder(healthSystemId: number, daysUntilCharge: number) {
    try {
      const [healthSystem] = await db
        .select({
          name: healthSystems.name,
          primaryContactEmail: healthSystems.primaryContactEmail,
        })
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId));

      if (!healthSystem || !healthSystem.primaryContactEmail) {
        return;
      }

      await EmailService.sendPaymentReminder({
        to: healthSystem.primaryContactEmail,
        healthSystemName: healthSystem.name,
        daysUntilCharge,
        updatePaymentUrl: `https://${process.env.REPLIT_DEV_DOMAIN}/billing/payment-methods`,
      });

      console.log(`📧 [PaymentAutomation] Sent payment reminder to ${healthSystem.name}`);
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Send reminder error:', error);
    }
  }

  /**
   * Handle failed payment with smart retry and communication
   */
  static async handleFailedPayment(invoice: Stripe.Invoice) {
    try {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) return;

      // Get health system
      const [healthSystem] = await db
        .select()
        .from(healthSystems)
        .where(eq(healthSystems.stripeCustomerId, customerId));

      if (!healthSystem) return;

      // Update subscription status
      await db
        .update(healthSystems)
        .set({
          subscriptionStatus: 'payment_failed',
          metadata: {
            ...healthSystem.metadata,
            lastPaymentFailure: new Date().toISOString(),
            failureReason: invoice.last_finalization_error?.message,
          },
        })
        .where(eq(healthSystems.id, healthSystem.id));

      // Send notification
      if (healthSystem.primaryContactEmail) {
        await EmailService.sendPaymentFailedNotification({
          to: healthSystem.primaryContactEmail,
          healthSystemName: healthSystem.name,
          amount: invoice.amount_due / 100,
          retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          updatePaymentUrl: `https://${process.env.REPLIT_DEV_DOMAIN}/billing/payment-methods`,
        });
      }

      console.log(`⚠️ [PaymentAutomation] Payment failed for ${healthSystem.name}`);
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Failed payment handler error:', error);
    }
  }

  /**
   * Get payment history for a health system
   */
  static async getPaymentHistory(healthSystemId: number, limit: number = 12) {
    try {
      const [healthSystem] = await db
        .select({ stripeCustomerId: healthSystems.stripeCustomerId })
        .from(healthSystems)
        .where(eq(healthSystems.id, healthSystemId));

      if (!healthSystem?.stripeCustomerId) {
        return [];
      }

      const invoices = await stripe.invoices.list({
        customer: healthSystem.stripeCustomerId,
        limit,
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000),
        amount: invoice.amount_paid / 100,
        status: invoice.status,
        pdfUrl: invoice.invoice_pdf,
        paymentMethod: invoice.payment_intent ? 'card' : 'bank_transfer',
        description: invoice.description || 'Monthly subscription',
      }));
    } catch (error: any) {
      console.error('❌ [PaymentAutomation] Get payment history error:', error);
      return [];
    }
  }
}