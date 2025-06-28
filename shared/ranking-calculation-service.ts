/**
 * CENTRALIZED MEDICAL PROBLEMS RANKING CALCULATION SERVICE
 * 
 * Single source of truth for all ranking calculations across the system.
 * Consolidates algorithm logic and eliminates technical debt from dual ranking systems.
 * 
 * ALGORITHM: GPT-4.1 generated factor scores + user weight preferences = final ranking
 * - Factor scores are raw clinical values in specific ranges (not percentages)
 * - User weights adjust the relative importance of each factor
 * - Final rank = 100 - totalWeightedScore (lower number = higher priority)
 */

// Configuration constants - centralized to eliminate hardcoded values
export const RANKING_CONFIG = {
  // GPT factor score ranges (as defined in unified-medical-problems-parser.ts)
  FACTOR_RANGES: {
    clinical_severity: { min: 0, max: 40 },
    treatment_complexity: { min: 0, max: 30 },
    patient_frequency: { min: 0, max: 20 },
    clinical_relevance: { min: 0, max: 10 }
  },
  
  // Default user weight preferences
  DEFAULT_WEIGHTS: {
    clinical_severity: 40,
    treatment_complexity: 30,
    patient_frequency: 20,
    clinical_relevance: 10
  },
  
  // Ranking scale bounds
  SCALE: {
    highest_priority: 1.00,
    lowest_priority: 99.99,
    default_fallback: 99.99
  },
  
  // Priority level thresholds for UI styling
  PRIORITY_THRESHOLDS: {
    critical: 20,     // 1.00-20.00 = Critical (red)
    high: 40,         // 20.01-40.00 = High (orange)
    medium: 70,       // 40.01-70.00 = Medium (yellow)
    low: 99.99        // 70.01-99.99 = Low (green)
  }
} as const;

// Type definitions
export interface RankingFactors {
  clinical_severity: number;
  treatment_complexity: number;
  patient_frequency: number;
  clinical_relevance: number;
}

export interface RankingWeights {
  clinical_severity: number;
  treatment_complexity: number;
  patient_frequency: number;
  clinical_relevance: number;
}

export interface RankingResult {
  finalRank: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  calculationDetails: {
    factors: RankingFactors;
    weights: RankingWeights;
    weightedScores: RankingFactors;
    totalWeightedScore: number;
  };
}

/**
 * CORE RANKING CALCULATION FUNCTION
 * 
 * Converts GPT-4.1 generated factor scores + user weights into final ranking
 * 
 * @param factors - Raw factor scores from GPT (0-40, 0-30, 0-20, 0-10 ranges)
 * @param weights - User preference weights for factor importance
 * @returns Complete ranking result with calculation details
 */
export function calculateMedicalProblemRanking(
  factors: RankingFactors | null | undefined,
  weights: RankingWeights = RANKING_CONFIG.DEFAULT_WEIGHTS
): RankingResult {
  // Handle missing or invalid factors
  if (!factors || !isValidFactors(factors)) {
    console.warn('🚨 [RankingCalculation] Invalid or missing factors, using fallback ranking');
    return createFallbackResult(weights);
  }

  // Apply weight adjustments to factor scores
  const weightedScores: RankingFactors = {
    clinical_severity: applyWeightAdjustment(
      factors.clinical_severity, 
      weights.clinical_severity, 
      RANKING_CONFIG.DEFAULT_WEIGHTS.clinical_severity,
      RANKING_CONFIG.FACTOR_RANGES.clinical_severity.max
    ),
    treatment_complexity: applyWeightAdjustment(
      factors.treatment_complexity,
      weights.treatment_complexity,
      RANKING_CONFIG.DEFAULT_WEIGHTS.treatment_complexity,
      RANKING_CONFIG.FACTOR_RANGES.treatment_complexity.max
    ),
    patient_frequency: applyWeightAdjustment(
      factors.patient_frequency,
      weights.patient_frequency,
      RANKING_CONFIG.DEFAULT_WEIGHTS.patient_frequency,
      RANKING_CONFIG.FACTOR_RANGES.patient_frequency.max
    ),
    clinical_relevance: applyWeightAdjustment(
      factors.clinical_relevance,
      weights.clinical_relevance,
      RANKING_CONFIG.DEFAULT_WEIGHTS.clinical_relevance,
      RANKING_CONFIG.FACTOR_RANGES.clinical_relevance.max
    )
  };

  // Calculate total weighted score
  const totalWeightedScore = 
    weightedScores.clinical_severity +
    weightedScores.treatment_complexity +
    weightedScores.patient_frequency +
    weightedScores.clinical_relevance;

  // Convert to final ranking (100 - total = higher factors = lower rank number = higher priority)
  const finalRank = Math.max(
    RANKING_CONFIG.SCALE.highest_priority,
    Math.min(RANKING_CONFIG.SCALE.lowest_priority, 100 - totalWeightedScore)
  );

  // Determine priority level for UI styling
  const priorityLevel = getPriorityLevel(finalRank);

  return {
    finalRank: parseFloat(finalRank.toFixed(2)),
    priorityLevel,
    calculationDetails: {
      factors,
      weights,
      weightedScores,
      totalWeightedScore: parseFloat(totalWeightedScore.toFixed(2))
    }
  };
}

/**
 * WEIGHT ADJUSTMENT ALGORITHM
 * 
 * Adjusts factor score based on user weight preference while maintaining clinical validity
 */
function applyWeightAdjustment(
  factorScore: number,
  userWeight: number,
  defaultWeight: number,
  maxFactorRange: number
): number {
  // Calculate weight multiplier (how much user deviates from default)
  const weightMultiplier = userWeight / defaultWeight;
  
  // Apply multiplier while ensuring we don't exceed factor range
  const adjustedScore = factorScore * weightMultiplier;
  
  // Clamp to valid range for this factor
  return Math.max(0, Math.min(maxFactorRange, adjustedScore));
}

/**
 * PRIORITY LEVEL CLASSIFICATION
 * 
 * Converts numerical ranking to categorical priority level for UI styling
 */
function getPriorityLevel(rank: number): 'critical' | 'high' | 'medium' | 'low' {
  if (rank <= RANKING_CONFIG.PRIORITY_THRESHOLDS.critical) return 'critical';
  if (rank <= RANKING_CONFIG.PRIORITY_THRESHOLDS.high) return 'high';
  if (rank <= RANKING_CONFIG.PRIORITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * FACTOR VALIDATION
 * 
 * Ensures factor scores are within expected ranges
 */
function isValidFactors(factors: any): factors is RankingFactors {
  if (!factors || typeof factors !== 'object') return false;
  
  const requiredFields: (keyof RankingFactors)[] = [
    'clinical_severity',
    'treatment_complexity', 
    'patient_frequency',
    'clinical_relevance'
  ];
  
  return requiredFields.every(field => {
    const value = factors[field];
    const range = RANKING_CONFIG.FACTOR_RANGES[field];
    return typeof value === 'number' && 
           value >= range.min && 
           value <= range.max;
  });
}

/**
 * FALLBACK RESULT GENERATION
 * 
 * Creates safe fallback when factors are missing or invalid
 */
function createFallbackResult(weights: RankingWeights): RankingResult {
  const fallbackFactors: RankingFactors = {
    clinical_severity: 5,
    treatment_complexity: 3,
    patient_frequency: 2,
    clinical_relevance: 1
  };
  
  return {
    finalRank: RANKING_CONFIG.SCALE.default_fallback,
    priorityLevel: 'low',
    calculationDetails: {
      factors: fallbackFactors,
      weights,
      weightedScores: fallbackFactors,
      totalWeightedScore: 11
    }
  };
}

/**
 * STYLING UTILITY FUNCTIONS
 * 
 * Provides consistent UI styling based on priority level
 */
export function getRankingStyles(priorityLevel: 'critical' | 'high' | 'medium' | 'low') {
  const baseStyles = "px-2 py-1 rounded-full text-xs font-medium";
  
  switch (priorityLevel) {
    case 'critical':
      return `${baseStyles} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
    case 'high':
      return `${baseStyles} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400`;
    case 'medium':
      return `${baseStyles} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`;
    case 'low':
      return `${baseStyles} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`;
    default:
      return `${baseStyles} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400`;
  }
}

export function getPriorityDisplayName(priorityLevel: 'critical' | 'high' | 'medium' | 'low'): string {
  return priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1);
}

/**
 * BATCH CALCULATION UTILITY
 * 
 * Efficiently calculates rankings for multiple problems
 */
export function calculateBatchRankings(
  problems: Array<{ id: number; rankingFactors?: RankingFactors }>,
  weights: RankingWeights = RANKING_CONFIG.DEFAULT_WEIGHTS
): Array<{ id: number; ranking: RankingResult }> {
  return problems.map(problem => ({
    id: problem.id,
    ranking: calculateMedicalProblemRanking(problem.rankingFactors, weights)
  }));
}

/**
 * LEGACY MIGRATION UTILITIES
 * 
 * Functions to help migrate from old dual ranking system
 */
export function shouldUseLegacyRank(
  problem: { rankScore?: number; rankingFactors?: RankingFactors }
): boolean {
  // Use legacy rank if factors are missing but rankScore exists
  return !!problem.rankScore && !problem.rankingFactors;
}

export function migrateLegacyRanking(legacyRank: number): RankingResult {
  // Convert legacy rank to new format for display consistency
  const priorityLevel = getPriorityLevel(legacyRank);
  
  return {
    finalRank: legacyRank,
    priorityLevel,
    calculationDetails: {
      factors: { clinical_severity: 0, treatment_complexity: 0, patient_frequency: 0, clinical_relevance: 0 },
      weights: RANKING_CONFIG.DEFAULT_WEIGHTS,
      weightedScores: { clinical_severity: 0, treatment_complexity: 0, patient_frequency: 0, clinical_relevance: 0 },
      totalWeightedScore: 0
    }
  };
}