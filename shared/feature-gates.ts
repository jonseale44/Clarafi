// Feature gating configuration for subscription tiers
// This central configuration controls which features are available at each tier

export type SubscriptionTier = 1 | 2 | 3;

export interface FeatureGate {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
}

export const FEATURE_GATES = {
  // Core EMR Features
  aiSoapNotes: { tier1: true, tier2: true, tier3: true },
  voiceTranscription: { tier1: true, tier2: true, tier3: true },
  basicPatientManagement: { tier1: true, tier2: true, tier3: true },
  
  // Chart Sections - The key decision point
  fullPatientChart: { tier1: false, tier2: true, tier3: true },
  medicalProblems: { tier1: false, tier2: true, tier3: true },
  medications: { tier1: false, tier2: true, tier3: true },
  allergies: { tier1: false, tier2: true, tier3: true },
  labResults: { tier1: false, tier2: true, tier3: true },
  imaging: { tier1: false, tier2: true, tier3: true },
  vitals: { tier1: false, tier2: true, tier3: true },
  familyHistory: { tier1: false, tier2: true, tier3: true },
  socialHistory: { tier1: false, tier2: true, tier3: true },
  surgicalHistory: { tier1: false, tier2: true, tier3: true },
  
  // AI Features - Context-aware based on tier
  aiClinicalSuggestions: { tier1: true, tier2: true, tier3: true },
  aiFullChartContext: { tier1: false, tier2: true, tier3: true }, // Key differentiator
  
  // Advanced Features
  ePrescribing: { tier1: false, tier2: true, tier3: true },
  labOrdering: { tier1: false, tier2: true, tier3: true },
  billingIntegration: { tier1: false, tier2: false, tier3: true },
  multiLocation: { tier1: false, tier2: true, tier3: true },
  customReports: { tier1: false, tier2: true, tier3: true },
  patientPortal: { tier1: false, tier2: false, tier3: true },
  
  // Administrative
  userManagement: { tier1: false, tier2: true, tier3: true },
  bulkOperations: { tier1: false, tier2: true, tier3: true },
  auditLogs: { tier1: false, tier2: false, tier3: true },
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