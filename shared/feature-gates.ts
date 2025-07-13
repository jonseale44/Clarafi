// Feature gating configuration for subscription tiers
// This central configuration controls which features are available at each tier
// EASILY MODIFIABLE: Change any boolean value to adjust tier access

export type SubscriptionTier = 1 | 2;

export interface FeatureGate {
  tier1: boolean;
  tier2: boolean;
  description: string; // Human-readable description for admin UI
  category: 'core' | 'chart' | 'ai' | 'integration' | 'admin';
}

// PRICING CONFIGURATION - Easy to modify
export const TIER_PRICING = {
  tier1: {
    monthly: 99,
    annual: 990, // 2 months free
    name: 'Personal EMR',
    description: 'Full documentation features for individual providers',
    trialDays: 30,
  },
  tier2: {
    monthly: 'custom', // Contact sales
    annual: 'custom',
    name: 'Enterprise EMR',
    description: 'Complete EMR with all integrations',
    trialDays: 30,
  }
} as const;

// FEATURE GATES - Modify these booleans to change tier access
export const FEATURE_GATES = {
  // Core EMR Features - Available to all tiers
  aiSoapNotes: { 
    tier1: true, tier2: true,
    description: 'AI-powered SOAP note generation',
    category: 'core'
  },
  voiceTranscription: { 
    tier1: true, tier2: true,
    description: 'Voice-to-text medical transcription',
    category: 'core'
  },
  basicPatientManagement: { 
    tier1: true, tier2: true,
    description: 'Patient demographics and basic info',
    category: 'core'
  },
  
  // Chart Sections - All available to tier 1 for full documentation
  fullPatientChart: { 
    tier1: true, tier2: true,
    description: 'Complete patient medical record access',
    category: 'chart'
  },
  medicalProblems: { 
    tier1: true, tier2: true,
    description: 'Problem list management',
    category: 'chart'
  },
  medications: { 
    tier1: true, tier2: true,
    description: 'Medication list and reconciliation',
    category: 'chart'
  },
  allergies: { 
    tier1: true, tier2: true,
    description: 'Allergy and intolerance tracking',
    category: 'chart'
  },
  labResults: { 
    tier1: true, tier2: true,
    description: 'Lab result viewing and trends',
    category: 'chart'
  },
  imaging: { 
    tier1: true, tier2: true,
    description: 'Imaging results and reports',
    category: 'chart'
  },
  vitals: { 
    tier1: true, tier2: true,
    description: 'Vital signs tracking',
    category: 'chart'
  },
  familyHistory: { 
    tier1: true, tier2: true,
    description: 'Family medical history',
    category: 'chart'
  },
  socialHistory: { 
    tier1: true, tier2: true,
    description: 'Social history documentation',
    category: 'chart'
  },
  surgicalHistory: { 
    tier1: true, tier2: true,
    description: 'Surgical history tracking',
    category: 'chart'
  },
  
  // AI Features - All available to tier 1
  aiClinicalSuggestions: { 
    tier1: true, tier2: true,
    description: 'AI-powered clinical suggestions',
    category: 'ai'
  },
  aiFullChartContext: { 
    tier1: true, tier2: true,
    description: 'AI access to complete patient history',
    category: 'ai'
  },
  aiOrderSuggestions: {
    tier1: true, tier2: true,
    description: 'AI-suggested orders and medications',
    category: 'ai'
  },
  
  // Integration Features - Only available to tier 2
  ePrescribing: { 
    tier1: false, tier2: true,
    description: 'Electronic prescribing to pharmacies',
    category: 'integration'
  },
  labOrdering: { 
    tier1: false, tier2: true,
    description: 'Direct lab order transmission to Quest/LabCorp',
    category: 'integration'
  },
  imagingOrdering: { 
    tier1: false, tier2: true,
    description: 'Direct imaging order transmission',
    category: 'integration'
  },
  billingIntegration: { 
    tier1: false, tier2: true,
    description: 'Revenue cycle management',
    category: 'integration'
  },
  patientPortal: { 
    tier1: false, tier2: true,
    description: 'Patient access portal',
    category: 'integration'
  },
  patientMessaging: { 
    tier1: false, tier2: true,
    description: 'Secure patient messaging',
    category: 'integration'
  },
  
  // Administrative Features - Only available to tier 2
  multiLocation: { 
    tier1: false, tier2: true,
    description: 'Multi-location practice support',
    category: 'admin'
  },
  userManagement: { 
    tier1: false, tier2: true,
    description: 'Team and user management',
    category: 'admin'
  },
  subscriptionKeys: { 
    tier1: false, tier2: true,
    description: 'Generate and manage subscription keys',
    category: 'admin'
  },
  customReports: { 
    tier1: false, tier2: true,
    description: 'Custom reporting and analytics',
    category: 'admin'
  },
  bulkOperations: { 
    tier1: false, tier2: true,
    description: 'Bulk patient operations',
    category: 'admin'
  },
  auditLogs: { 
    tier1: false, tier2: true,
    description: 'Comprehensive audit logging',
    category: 'admin'
  },
} as const;

export type FeatureName = keyof typeof FEATURE_GATES;

// Helper function to check if a feature is available
export function hasFeature(tier: SubscriptionTier, feature: FeatureName): boolean {
  const gate = FEATURE_GATES[feature];
  return tier === 1 ? gate.tier1 : gate.tier2;
}

// Get all available features for a tier
export function getAvailableFeatures(tier: SubscriptionTier): FeatureName[] {
  return Object.entries(FEATURE_GATES)
    .filter(([_, gate]) => tier === 1 ? gate.tier1 : gate.tier2)
    .map(([feature]) => feature as FeatureName);
}

// Get restricted features for a tier
export function getRestrictedFeatures(tier: SubscriptionTier): FeatureName[] {
  return Object.entries(FEATURE_GATES)
    .filter(([_, gate]) => tier === 1 ? !gate.tier1 : !gate.tier2)
    .map(([feature]) => feature as FeatureName);
}