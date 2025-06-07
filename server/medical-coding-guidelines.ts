/**
 * Medicare E&M Guidelines and CPT Coding Logic
 * Based on 2021 E&M Documentation Guidelines and CMS Medicare Guidelines
 */

export interface EMComplexityFactors {
  problemsAddressed: number;
  dataReviewed: DataComplexity;
  riskLevel: RiskLevel;
  timeSpent?: number; // Optional time-based coding
}

export interface DataComplexity {
  reviewedRecords: boolean;
  orderedTests: boolean;
  interpretedResults: boolean;
  discussedWithOthers: boolean;
  independentHistorian: boolean;
}

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high';

export interface CPTCodeRule {
  code: string;
  description: string;
  newPatient: boolean;
  establishedPatient: boolean;
  minProblems: number;
  maxProblems?: number;
  requiredDataPoints: number;
  minimumRisk: RiskLevel;
  timeRange?: [number, number]; // [min, max] minutes
  complexity: 'straightforward' | 'low' | 'moderate' | 'high';
}

// 2024 Medicare E&M Guidelines - Office/Outpatient Visits
export const CPT_OFFICE_VISIT_CODES: CPTCodeRule[] = [
  // New Patient Visits
  {
    code: "99202",
    description: "Office visit, new patient, straightforward complexity",
    newPatient: true,
    establishedPatient: false,
    minProblems: 1,
    maxProblems: 1,
    requiredDataPoints: 0,
    minimumRisk: 'minimal',
    timeRange: [15, 29],
    complexity: 'straightforward'
  },
  {
    code: "99203", 
    description: "Office visit, new patient, low complexity",
    newPatient: true,
    establishedPatient: false,
    minProblems: 1,
    maxProblems: 2,
    requiredDataPoints: 1,
    minimumRisk: 'low',
    timeRange: [30, 44],
    complexity: 'low'
  },
  {
    code: "99204",
    description: "Office visit, new patient, moderate complexity", 
    newPatient: true,
    establishedPatient: false,
    minProblems: 2,
    maxProblems: 4,
    requiredDataPoints: 2,
    minimumRisk: 'moderate',
    timeRange: [45, 59],
    complexity: 'moderate'
  },
  {
    code: "99205",
    description: "Office visit, new patient, high complexity",
    newPatient: true, 
    establishedPatient: false,
    minProblems: 3,
    requiredDataPoints: 3,
    minimumRisk: 'high',
    timeRange: [60, 74],
    complexity: 'high'
  },
  
  // Established Patient Visits
  {
    code: "99212",
    description: "Office visit, established patient, straightforward complexity",
    newPatient: false,
    establishedPatient: true,
    minProblems: 1,
    maxProblems: 1,
    requiredDataPoints: 0,
    minimumRisk: 'minimal',
    timeRange: [10, 19],
    complexity: 'straightforward'
  },
  {
    code: "99213",
    description: "Office visit, established patient, low complexity",
    newPatient: false,
    establishedPatient: true,
    minProblems: 1,
    maxProblems: 2,
    requiredDataPoints: 1,
    minimumRisk: 'low', 
    timeRange: [20, 29],
    complexity: 'low'
  },
  {
    code: "99214",
    description: "Office visit, established patient, moderate complexity",
    newPatient: false,
    establishedPatient: true,
    minProblems: 2,
    maxProblems: 4,
    requiredDataPoints: 2,
    minimumRisk: 'moderate',
    timeRange: [30, 39],
    complexity: 'moderate'
  },
  {
    code: "99215",
    description: "Office visit, established patient, high complexity",
    newPatient: false,
    establishedPatient: true,
    minProblems: 3,
    requiredDataPoints: 3,
    minimumRisk: 'high',
    timeRange: [40, 54],
    complexity: 'high'
  }
];

// Common In-Office Procedures
export const PROCEDURE_CPT_CODES = [
  { code: "90471", description: "Immunization administration, first injection" },
  { code: "90472", description: "Immunization administration, additional injection" },
  { code: "12001", description: "Simple repair of superficial wounds, 2.5 cm or less" },
  { code: "12002", description: "Simple repair of superficial wounds, 2.6 cm to 7.5 cm" },
  { code: "11055", description: "Paring or cutting of benign hyperkeratotic lesion" },
  { code: "11056", description: "Paring or cutting, 2 to 4 lesions" },
  { code: "17000", description: "Destruction of premalignant lesions, first lesion" },
  { code: "17003", description: "Destruction of premalignant lesions, additional lesions" },
  { code: "11730", description: "Avulsion of nail plate, partial or complete" },
  { code: "10060", description: "Incision and drainage of abscess" },
  { code: "20610", description: "Arthrocentesis, aspiration and/or injection, major joint" },
  { code: "93000", description: "Electrocardiogram, routine ECG with interpretation" },
  { code: "94010", description: "Spirometry" },
  { code: "99401", description: "Preventive counseling, 15 minutes" },
  { code: "99402", description: "Preventive counseling, 30 minutes" },
  { code: "96116", description: "Neurobehavioral status exam" }
];

/**
 * Calculate E&M complexity score based on documentation
 */
export function calculateEMComplexity(factors: EMComplexityFactors): number {
  let score = 0;
  
  // Problems addressed (weighted heavily)
  if (factors.problemsAddressed === 1) score += 1;
  else if (factors.problemsAddressed === 2) score += 2;
  else if (factors.problemsAddressed >= 3 && factors.problemsAddressed <= 4) score += 3;
  else if (factors.problemsAddressed >= 5) score += 4;
  
  // Data complexity
  let dataPoints = 0;
  if (factors.dataReviewed.reviewedRecords) dataPoints++;
  if (factors.dataReviewed.orderedTests) dataPoints++;
  if (factors.dataReviewed.interpretedResults) dataPoints++;
  if (factors.dataReviewed.discussedWithOthers) dataPoints++;
  if (factors.dataReviewed.independentHistorian) dataPoints++;
  
  score += Math.min(dataPoints, 3); // Cap at 3 points
  
  // Risk level
  switch (factors.riskLevel) {
    case 'minimal': score += 1; break;
    case 'low': score += 2; break;
    case 'moderate': score += 3; break;
    case 'high': score += 4; break;
  }
  
  return score;
}

/**
 * Determine appropriate CPT code based on patient history and complexity
 */
export function determineBestCPTCode(
  isNewPatient: boolean,
  complexityFactors: EMComplexityFactors
): CPTCodeRule | null {
  const eligibleCodes = CPT_OFFICE_VISIT_CODES.filter(code => 
    isNewPatient ? code.newPatient : code.establishedPatient
  );
  
  // Sort by complexity score (highest first) to maximize billing
  const sortedCodes = eligibleCodes.sort((a, b) => {
    const scoreA = getComplexityScore(a.complexity);
    const scoreB = getComplexityScore(b.complexity);
    return scoreB - scoreA;
  });
  
  // Find the highest complexity code that meets requirements
  for (const code of sortedCodes) {
    if (meetsRequirements(code, complexityFactors)) {
      return code;
    }
  }
  
  // Fallback to lowest complexity if nothing else qualifies
  return sortedCodes[sortedCodes.length - 1] || null;
}

function getComplexityScore(complexity: string): number {
  switch (complexity) {
    case 'high': return 4;
    case 'moderate': return 3;
    case 'low': return 2;
    case 'straightforward': return 1;
    default: return 0;
  }
}

function meetsRequirements(code: CPTCodeRule, factors: EMComplexityFactors): boolean {
  // Check problems count
  if (factors.problemsAddressed < code.minProblems) return false;
  if (code.maxProblems && factors.problemsAddressed > code.maxProblems) return false;
  
  // Check data points
  const dataPoints = Object.values(factors.dataReviewed).filter(Boolean).length;
  if (dataPoints < code.requiredDataPoints) return false;
  
  // Check risk level
  const riskLevels = ['minimal', 'low', 'moderate', 'high'];
  const currentRiskIndex = riskLevels.indexOf(factors.riskLevel);
  const requiredRiskIndex = riskLevels.indexOf(code.minimumRisk);
  if (currentRiskIndex < requiredRiskIndex) return false;
  
  return true;
}

/**
 * Risk assessment keywords for automated risk level determination
 */
export const RISK_ASSESSMENT_KEYWORDS = {
  minimal: [
    'routine follow-up', 'stable condition', 'medication refill', 
    'well visit', 'preventive care', 'vaccination'
  ],
  low: [
    'minor illness', 'acute uncomplicated', 'otitis media', 
    'pharyngitis', 'upper respiratory infection', 'skin rash'
  ],
  moderate: [
    'acute complicated', 'chronic illness stable', 'new problem',
    'prescription drug management', 'minor surgery', 'diagnostic procedure'
  ],
  high: [
    'acute severe illness', 'chronic illness unstable', 'decision for major surgery',
    'drug therapy requiring monitoring', 'emergency department visit',
    'hospitalization', 'cardiovascular imaging', 'psychiatric illness'
  ]
};

/**
 * Data complexity keywords
 */
export const DATA_COMPLEXITY_KEYWORDS = {
  reviewedRecords: ['reviewed records', 'prior notes', 'previous visit', 'medical history reviewed'],
  orderedTests: ['ordered labs', 'ordered imaging', 'ordered x-ray', 'ordered CT', 'ordered MRI', 'CBC', 'BMP'],
  interpretedResults: ['lab results', 'imaging results', 'test results', 'abnormal', 'normal'],
  discussedWithOthers: ['discussed with', 'consulted', 'specialist recommendation'],
  independentHistorian: ['family member provided', 'caregiver states', 'interpreter used']
};