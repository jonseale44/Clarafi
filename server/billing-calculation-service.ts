// Billing Calculation Service
// Calculates per-user billing for Enterprise (Tier 2) health systems

import { db } from './db';
import { users, subscriptionKeys } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { PER_USER_PRICING } from '@shared/feature-gates';

// Define the user billing interface
interface UserBillingInfo {
  userId: number;
  role: string;
  pricingTier: keyof typeof PER_USER_PRICING;
  monthlyRate: number;
  status: 'active' | 'inactive';
}

// Define the billing calculation result
interface BillingCalculation {
  healthSystemId: number;
  activeUsers: {
    providers: number;
    clinicalStaff: number;
    adminStaff: number;
    readOnly: number;
  };
  userDetails: UserBillingInfo[];
  monthlyTotal: number;
  breakdown: {
    providers: { count: number; rate: number; total: number };
    clinicalStaff: { count: number; rate: number; total: number };
    adminStaff: { count: number; rate: number; total: number };
    readOnly: { count: number; rate: number; total: number };
  };
}

export class BillingCalculationService {
  /**
   * Calculate the monthly billing for a health system based on active users
   */
  static async calculateMonthlyBilling(healthSystemId: number): Promise<BillingCalculation> {
    console.log(`💰 [BillingCalc] Calculating billing for health system ${healthSystemId}`);

    // Get all active users for this health system
    const activeUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.healthSystemId, healthSystemId),
          eq(users.active, true),
          // Only include users with verified subscription keys
          isNotNull(users.verifiedWithKeyId)
        )
      );

    console.log(`👥 [BillingCalc] Found ${activeUsers.length} active users with verified keys`);

    // Categorize users by pricing tier
    const userDetails: UserBillingInfo[] = [];
    const activeUserCounts = {
      providers: 0,
      clinicalStaff: 0,
      adminStaff: 0,
      readOnly: 0
    };

    for (const user of activeUsers) {
      const pricingTier = this.getUserPricingTier(user.role);
      const monthlyRate = PER_USER_PRICING[pricingTier].monthly;
      
      userDetails.push({
        userId: user.id,
        role: user.role,
        pricingTier,
        monthlyRate,
        status: 'active'
      });

      // Increment the appropriate counter
      switch (pricingTier) {
        case 'provider':
          activeUserCounts.providers++;
          break;
        case 'clinicalStaff':
          activeUserCounts.clinicalStaff++;
          break;
        case 'adminStaff':
          activeUserCounts.adminStaff++;
          break;
        case 'readOnly':
          activeUserCounts.readOnly++;
          break;
      }
    }

    // Calculate totals by tier
    const breakdown = {
      providers: {
        count: activeUserCounts.providers,
        rate: PER_USER_PRICING.provider.monthly,
        total: activeUserCounts.providers * PER_USER_PRICING.provider.monthly
      },
      clinicalStaff: {
        count: activeUserCounts.clinicalStaff,
        rate: PER_USER_PRICING.clinicalStaff.monthly,
        total: activeUserCounts.clinicalStaff * PER_USER_PRICING.clinicalStaff.monthly
      },
      adminStaff: {
        count: activeUserCounts.adminStaff,
        rate: PER_USER_PRICING.adminStaff.monthly,
        total: activeUserCounts.adminStaff * PER_USER_PRICING.adminStaff.monthly
      },
      readOnly: {
        count: activeUserCounts.readOnly,
        rate: PER_USER_PRICING.readOnly.monthly,
        total: activeUserCounts.readOnly * PER_USER_PRICING.readOnly.monthly
      }
    };

    const monthlyTotal = breakdown.providers.total + 
                        breakdown.clinicalStaff.total + 
                        breakdown.adminStaff.total + 
                        breakdown.readOnly.total;

    console.log(`💵 [BillingCalc] Monthly total: $${monthlyTotal}`);
    console.log(`📊 [BillingCalc] Breakdown:`, breakdown);

    return {
      healthSystemId,
      activeUsers: activeUserCounts,
      userDetails,
      monthlyTotal,
      breakdown
    };
  }

  /**
   * Get unused subscription keys for a health system
   */
  static async getUnusedKeys(healthSystemId: number) {
    const unusedKeys = await db.select()
      .from(subscriptionKeys)
      .where(
        and(
          eq(subscriptionKeys.healthSystemId, healthSystemId),
          eq(subscriptionKeys.isUsed, false),
          eq(subscriptionKeys.isActive, true)
        )
      );

    return unusedKeys;
  }

  /**
   * Determine the pricing tier based on user role
   */
  private static getUserPricingTier(role: string): keyof typeof PER_USER_PRICING {
    switch (role) {
      case 'provider':
        return 'provider';
      case 'nurse':
      case 'ma':
      case 'lab_tech':
        return 'clinicalStaff';
      case 'admin':
      case 'practice_manager':
      case 'front_desk':
      case 'billing':
      case 'referral_coordinator':
        return 'adminStaff';
      case 'read_only':
        return 'readOnly';
      default:
        // Default to clinical staff pricing for unknown roles
        console.warn(`⚠️ [BillingCalc] Unknown role "${role}" - defaulting to clinical staff pricing`);
        return 'clinicalStaff';
    }
  }

  /**
   * Calculate prorated billing for mid-cycle user additions
   */
  static calculateProratedCharge(monthlyRate: number, daysRemaining: number): number {
    const daysInMonth = 30; // Simplify to 30 days
    return Math.round((monthlyRate / daysInMonth) * daysRemaining * 100) / 100;
  }

  /**
   * Generate billing report for a health system
   */
  static async generateBillingReport(healthSystemId: number) {
    const billing = await this.calculateMonthlyBilling(healthSystemId);
    const unusedKeys = await this.getUnusedKeys(healthSystemId);

    return {
      ...billing,
      unusedKeys: unusedKeys.length,
      reportGeneratedAt: new Date().toISOString()
    };
  }
}