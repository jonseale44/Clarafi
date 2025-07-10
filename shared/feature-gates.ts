// Feature gating configuration for subscription tiers
// This central configuration controls which features are available at each tier
// EASILY MODIFIABLE: Change any boolean value to adjust tier access

export type SubscriptionTier = 1 | 2 | 3;

export interface FeatureGate {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
  description: string; // Human-readable description for admin UI
  category: 'core' | 'chart' | 'ai' | 'integration' | 'admin';
}

// PRICING CONFIGURATION - Easy to modify
export const TIER_PRICING = {
  tier1: {
    monthly: 99,
    annual: 990, // 2 months free
    name: 'Professional',
    description: 'Perfect for individual providers',
    trialDays: 30,
  },
  tier2: {
    monthly: 299, // Per user
    annual: 2990, // Per user
    name: 'Practice',
    description: 'For small to medium practices',
    minUsers: 3,
    trialDays: 14,
  },
  tier3: {
    monthly: 'custom', // Contact sales
    annual: 'custom',
    name: 'Enterprise',
    description: 'For large health systems',
    minUsers: 20,
    trialDays: 30,
  }
} as const;

// FEATURE GATES - Modify these booleans to change tier access
export const FEATURE_GATES = {
  // Core EMR Features
  aiSoapNotes: { 
    tier1: true, tier2: true, tier3: true,
    description: 'AI-powered SOAP note generation',
    category: 'core'
  },
  voiceTranscription: { 
    tier1: true, tier2: true, tier3: true,
    description: 'Voice-to-text medical transcription',
    category: 'core'
  },
  basicPatientManagement: { 
    tier1: true, tier2: true, tier3: true,
    description: 'Patient demographics and basic info',
    category: 'core'
  },
  
  // Chart Sections - Modify these to give/remove tier 1 access
  fullPatientChart: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Complete patient medical record access',
    category: 'chart'
  },
  medicalProblems: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Problem list management',
    category: 'chart'
  },
  medications: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Medication list and reconciliation',
    category: 'chart'
  },
  allergies: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Allergy and intolerance tracking',
    category: 'chart'
  },
  labResults: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Lab result viewing and trends',
    category: 'chart'
  },
  imaging: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Imaging results and reports',
    category: 'chart'
  },
  vitals: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Vital signs tracking',
    category: 'chart'
  },
  familyHistory: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Family medical history',
    category: 'chart'
  },
  socialHistory: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Social history documentation',
    category: 'chart'
  },
  surgicalHistory: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Surgical history tracking',
    category: 'chart'
  },
  
  // AI Features - Context-aware based on tier
  aiClinicalSuggestions: { 
    tier1: true, tier2: true, tier3: true,
    description: 'AI-powered clinical suggestions',
    category: 'ai'
  },
  aiFullChartContext: { 
    tier1: false, tier2: true, tier3: true,
    description: 'AI access to complete patient history',
    category: 'ai'
  },
  aiOrderSuggestions: {
    tier1: true, tier2: true, tier3: true,
    description: 'AI-suggested orders and medications',
    category: 'ai'
  },
  
  // Integration Features
  ePrescribing: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Electronic prescribing to pharmacies',
    category: 'integration'
  },
  labOrdering: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Direct lab order transmission',
    category: 'integration'
  },
  billingIntegration: { 
    tier1: false, tier2: false, tier3: true,
    description: 'Revenue cycle management',
    category: 'integration'
  },
  patientPortal: { 
    tier1: false, tier2: false, tier3: true,
    description: 'Patient access portal',
    category: 'integration'
  },
  
  // Administrative Features
  multiLocation: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Multi-location practice support',
    category: 'admin'
  },
  userManagement: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Team and user management',
    category: 'admin'
  },
  customReports: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Custom reporting and analytics',
    category: 'admin'
  },
  bulkOperations: { 
    tier1: false, tier2: true, tier3: true,
    description: 'Bulk patient operations',
    category: 'admin'
  },
  auditLogs: { 
    tier1: false, tier2: false, tier3: true,
    description: 'Comprehensive audit logging',
    category: 'admin'
  },
} as const;

export type FeatureName = keyof typeof FEATURE_GATES;

// Helper function to check if a feature is available
export function hasFeature(tier: SubscriptionTier, feature: FeatureName): boolean {
  const gate = FEATURE_GATES[feature];
  return gate[`tier${tier}` as keyof FeatureGate];
}

// Get all available features for a tier
export function getAvailableFeatures(tier: SubscriptionTier): FeatureName[] {
  return Object.entries(FEATURE_GATES)
    .filter(([_, gate]) => gate[`tier${tier}` as keyof FeatureGate])
    .map(([feature]) => feature as FeatureName);
}

// Get restricted features for a tier
export function getRestrictedFeatures(tier: SubscriptionTier): FeatureName[] {
  return Object.entries(FEATURE_GATES)
    .filter(([_, gate]) => !gate[`tier${tier}` as keyof FeatureGate])
    .map(([feature]) => feature as FeatureName);
}