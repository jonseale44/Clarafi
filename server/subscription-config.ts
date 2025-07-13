// Subscription Configuration Service
// This service allows dynamic configuration of tiers, features, and pricing
// Can be overridden by environment variables or database settings

import { FEATURE_GATES, TIER_PRICING, FeatureName, SubscriptionTier } from '@shared/feature-gates';

interface DynamicPricing {
  tier1Monthly?: number;
  tier1Annual?: number;
  tier2Monthly?: number;
  tier2Annual?: number;
  tier1TrialDays?: number;
  tier2TrialDays?: number;
}

interface DynamicFeatures {
  [key: string]: {
    tier1?: boolean;
    tier2?: boolean;
  };
}

export class SubscriptionConfig {
  private static instance: SubscriptionConfig;
  private dynamicPricing: DynamicPricing = {};
  private dynamicFeatures: DynamicFeatures = {};
  
  private constructor() {
    this.loadFromEnvironment();
  }
  
  static getInstance(): SubscriptionConfig {
    if (!this.instance) {
      this.instance = new SubscriptionConfig();
    }
    return this.instance;
  }
  
  // Load configuration from environment variables
  private loadFromEnvironment() {
    // Pricing overrides from environment
    if (process.env.TIER1_MONTHLY_PRICE) {
      this.dynamicPricing.tier1Monthly = parseInt(process.env.TIER1_MONTHLY_PRICE);
    }
    if (process.env.TIER1_ANNUAL_PRICE) {
      this.dynamicPricing.tier1Annual = parseInt(process.env.TIER1_ANNUAL_PRICE);
    }
    if (process.env.TIER2_MONTHLY_PRICE) {
      this.dynamicPricing.tier2Monthly = parseInt(process.env.TIER2_MONTHLY_PRICE);
    }
    if (process.env.TIER2_ANNUAL_PRICE) {
      this.dynamicPricing.tier2Annual = parseInt(process.env.TIER2_ANNUAL_PRICE);
    }
    
    // Trial days overrides
    if (process.env.TIER1_TRIAL_DAYS) {
      this.dynamicPricing.tier1TrialDays = parseInt(process.env.TIER1_TRIAL_DAYS);
    }
    if (process.env.TIER2_TRIAL_DAYS) {
      this.dynamicPricing.tier2TrialDays = parseInt(process.env.TIER2_TRIAL_DAYS);
    }
    
    // Feature overrides from environment
    // Example: FEATURE_MEDICATIONS_TIER1=true
    Object.keys(FEATURE_GATES).forEach(feature => {
      const envKey = `FEATURE_${feature.toUpperCase()}_`;
      
      if (process.env[`${envKey}TIER1`] !== undefined) {
        if (!this.dynamicFeatures[feature]) this.dynamicFeatures[feature] = {};
        this.dynamicFeatures[feature].tier1 = process.env[`${envKey}TIER1`] === 'true';
      }
      if (process.env[`${envKey}TIER2`] !== undefined) {
        if (!this.dynamicFeatures[feature]) this.dynamicFeatures[feature] = {};
        this.dynamicFeatures[feature].tier2 = process.env[`${envKey}TIER2`] === 'true';
      }
    });
  }
  
  // Get pricing for a specific tier
  getPricing(tier: SubscriptionTier) {
    const tierKey = `tier${tier}` as keyof typeof TIER_PRICING;
    const basePricing = TIER_PRICING[tierKey];
    
    if (!basePricing) {
      throw new Error(`Invalid tier: ${tier}`);
    }
    
    if (tier === 1) {
      return {
        ...basePricing,
        monthly: this.dynamicPricing.tier1Monthly ?? basePricing.monthly,
        annual: this.dynamicPricing.tier1Annual ?? basePricing.annual,
        trialDays: this.dynamicPricing.tier1TrialDays ?? basePricing.trialDays,
      };
    } else if (tier === 2) {
      return {
        ...basePricing,
        // Tier 2 has 'custom' pricing, return 299 as default for now
        monthly: this.dynamicPricing.tier2Monthly ?? 299,
        annual: this.dynamicPricing.tier2Annual ?? 2990,
        trialDays: this.dynamicPricing.tier2TrialDays ?? basePricing.trialDays,
      };
    }
    
    throw new Error(`Invalid tier: ${tier}`);
  }
  
  // Check if a feature is available for a tier
  hasFeature(tier: SubscriptionTier, feature: FeatureName): boolean {
    // Check dynamic overrides first
    const dynamicFeature = this.dynamicFeatures[feature];
    if (dynamicFeature && dynamicFeature[`tier${tier}`] !== undefined) {
      return dynamicFeature[`tier${tier}`]!;
    }
    
    // Fall back to static configuration
    const gate = FEATURE_GATES[feature];
    return gate[`tier${tier}` as keyof typeof gate] as boolean;
  }
  
  // Get all features for a tier
  getFeaturesForTier(tier: SubscriptionTier): Array<{
    name: FeatureName;
    enabled: boolean;
    description: string;
    category: string;
  }> {
    return Object.entries(FEATURE_GATES).map(([name, config]) => ({
      name: name as FeatureName,
      enabled: this.hasFeature(tier, name as FeatureName),
      description: config.description,
      category: config.category,
    }));
  }
  
  // Update configuration dynamically (for admin UI in future)
  updatePricing(updates: DynamicPricing) {
    this.dynamicPricing = { ...this.dynamicPricing, ...updates };
  }
  
  updateFeature(feature: FeatureName, tier: SubscriptionTier, enabled: boolean) {
    if (!this.dynamicFeatures[feature]) {
      this.dynamicFeatures[feature] = {};
    }
    this.dynamicFeatures[feature][`tier${tier}`] = enabled;
  }
  
  // Export current configuration (for admin UI)
  exportConfiguration() {
    return {
      pricing: {
        tier1: this.getPricing(1),
        tier2: this.getPricing(2),
      },
      features: Object.entries(FEATURE_GATES).reduce((acc, [name, config]) => {
        acc[name] = {
          description: config.description,
          category: config.category,
          tier1: this.hasFeature(1, name as FeatureName),
          tier2: this.hasFeature(2, name as FeatureName),
        };
        return acc;
      }, {} as Record<string, any>),
    };
  }
}

// Export singleton instance
export const subscriptionConfig = SubscriptionConfig.getInstance();