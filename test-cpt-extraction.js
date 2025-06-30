// Quick test to isolate CPT extraction issue
import { CPTExtractor } from './server/cpt-extractor.js';

async function testCPTExtraction() {
  try {
    console.log('Testing CPT extraction...');
    
    const cptExtractor = new CPTExtractor();
    const testSoapNote = `
SUBJECTIVE: Patient presents with diabetes type 2, hypertension, and chronic kidney disease.
OBJECTIVE: Blood pressure 140/90, glucose 180, creatinine 1.8
ASSESSMENT: Diabetes type 2 uncontrolled, hypertension, CKD stage 3
PLAN: Continue metformin, increase lisinopril, nephrology referral
    `;
    
    const patientContext = {
      isNewPatient: false,
      previousEncounterCount: 3,
      medicalHistory: ['Diabetes', 'Hypertension'],
      currentProblems: ['Diabetes type 2', 'Hypertension', 'CKD']
    };
    
    const result = await cptExtractor.extractCPTCodesAndDiagnoses(testSoapNote, patientContext);
    console.log('CPT extraction successful:', result);
    
  } catch (error) {
    console.error('CPT extraction failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testCPTExtraction();