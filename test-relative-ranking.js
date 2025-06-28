// Test script to verify the new relative percentage ranking system
const { calculateMedicalProblemRanking, RANKING_CONFIG } = require('./shared/ranking-calculation-service.ts');

console.log('Testing new relative percentage ranking system...\n');

// Test case from your spreadsheet: 4 patient conditions
const testFactors = [
  {
    name: 'Type 2 diabetes',
    factors: { clinical_severity: 40, treatment_complexity: 50, patient_frequency: 50, clinical_relevance: 40 }
  },
  {
    name: 'CKD Stage 5', 
    factors: { clinical_severity: 10, treatment_complexity: 20, patient_frequency: 30, clinical_relevance: 30 }
  },
  {
    name: 'Acute sinusitis',
    factors: { clinical_severity: 30, treatment_complexity: 10, patient_frequency: 10, clinical_relevance: 20 }
  },
  {
    name: 'Hip osteoarthritis',
    factors: { clinical_severity: 20, treatment_complexity: 20, patient_frequency: 10, clinical_relevance: 10 }
  }
];

// Verify factors sum to 100% for each category
const totals = {
  clinical_severity: 0,
  treatment_complexity: 0, 
  patient_frequency: 0,
  clinical_relevance: 0
};

testFactors.forEach(condition => {
  totals.clinical_severity += condition.factors.clinical_severity;
  totals.treatment_complexity += condition.factors.treatment_complexity;
  totals.patient_frequency += condition.factors.patient_frequency;
  totals.clinical_relevance += condition.factors.clinical_relevance;
});

console.log('Factor totals verification:');
console.log(`Clinical severity: ${totals.clinical_severity}% (should be 100%)`);
console.log(`Treatment complexity: ${totals.treatment_complexity}% (should be 100%)`);
console.log(`Patient frequency: ${totals.patient_frequency}% (should be 100%)`);
console.log(`Clinical relevance: ${totals.clinical_relevance}% (should be 100%)\n`);

// Test with default weights (40/30/20/10)
const defaultWeights = RANKING_CONFIG.DEFAULT_WEIGHTS;
console.log('Using default weights:', defaultWeights);
console.log('\nCalculated rankings:');

testFactors.forEach(condition => {
  const result = calculateMedicalProblemRanking(condition.factors, defaultWeights);
  console.log(`${condition.name}: ${result.finalRank}% (${result.priorityLevel} priority)`);
  console.log(`  Calculation: (${condition.factors.clinical_severity}*40 + ${condition.factors.treatment_complexity}*30 + ${condition.factors.patient_frequency}*20 + ${condition.factors.clinical_relevance}*10)/100 = ${result.calculationDetails.totalWeightedScore}%`);
});

console.log('\nExpected ranking order (highest % = highest priority):');
console.log('1. Type 2 diabetes (should be ~45%)');
console.log('2. CKD Stage 5 (should be ~19%)'); 
console.log('3. Acute sinusitis (should be ~19%)');
console.log('4. Hip osteoarthritis (should be ~17%)');