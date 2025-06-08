import OpenAI from 'openai';
import { 
  CPT_OFFICE_VISIT_CODES, 
  PROCEDURE_CPT_CODES, 
  CPT_REIMBURSEMENT_RATES
} from './medical-coding-guidelines.js';

interface CPTCode {
  code: string;
  description: string;
  complexity?: string;
  reasoning?: string;
}

interface DiagnosisCode {
  diagnosis: string;
  icd10Code: string;
  isPrimary: boolean;
}

interface DiagnosisMapping {
  diagnosisId: string;
  cptCodes: string[];
  isSelected: boolean;
}

interface ExtractedCPTData {
  cptCodes: CPTCode[];
  diagnoses: DiagnosisCode[];
  mappings?: DiagnosisMapping[];
}

interface PatientContext {
  isNewPatient: boolean;
  previousEncounterCount: number;
  medicalHistory: string[];
  currentProblems: string[];
}

export class CPTExtractor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractCPTCodesAndDiagnoses(
    clinicalText: string, 
    patientContext?: PatientContext
  ): Promise<ExtractedCPTData> {
    try {
      console.log(`🏥 [CPT Extractor] Starting GPT-only extraction from clinical text (${clinicalText.length} chars)`);
      
      const isNewPatient = patientContext?.isNewPatient ?? false;
      console.log(`🏥 [CPT Extractor] Patient type: ${isNewPatient ? 'NEW' : 'ESTABLISHED'}`);

      const prompt = this.buildComprehensiveMedicarePrompt(clinicalText, isNewPatient, patientContext);
      
      console.log(`🔍 [CPT Extractor] FULL PROMPT TO GPT:`);
      console.log(`📝 [CPT Extractor] Clinical text length: ${clinicalText.length} chars`);
      console.log(`📋 [CPT Extractor] Clinical text preview: ${clinicalText.substring(0, 500)}...`);
      console.log(`🏥 [CPT Extractor] Patient context:`, JSON.stringify(patientContext, null, 2));

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      console.log(`🤖 [CPT Extractor] RAW GPT RESPONSE:`);
      console.log(content);

      let extractedData = JSON.parse(content) as ExtractedCPTData;
      
      console.log(`📊 [CPT Extractor] PARSED GPT DATA:`);
      console.log(`CPT Codes:`, JSON.stringify(extractedData.cptCodes, null, 2));
      console.log(`Diagnoses:`, JSON.stringify(extractedData.diagnoses, null, 2));
      
      // Generate automatic diagnosis-to-CPT mappings
      extractedData.mappings = this.generateAutomaticMappings(extractedData.cptCodes, extractedData.diagnoses);
      
      console.log(`✅ [CPT Extractor] GPT-selected billing: ${extractedData.cptCodes?.length || 0} CPT codes, ${extractedData.diagnoses?.length || 0} diagnoses`);
      
      return extractedData;

    } catch (error) {
      console.error('❌ [CPT Extractor] Error in GPT extraction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract CPT codes: ${errorMessage}`);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert medical billing specialist with deep knowledge of Medicare E&M guidelines, CPT coding, and revenue optimization. 

Your expertise includes:
- 2024 Medicare E&M Documentation Guidelines
- CPT code selection for maximum legitimate reimbursement
- ICD-10 diagnosis coding accuracy
- New vs established patient determination
- Medical decision making complexity analysis
- Procedure coding for in-office services

Your goal is to maximize legitimate billing while ensuring accuracy and compliance. You understand the difference between new and established patients, complexity scoring, and appropriate code selection for optimal reimbursement.`;
  }

  private buildComprehensiveMedicarePrompt(
    clinicalText: string, 
    isNewPatient: boolean, 
    patientContext?: PatientContext
  ): string {
    const visitType = isNewPatient ? "NEW PATIENT" : "ESTABLISHED PATIENT";
    const eligibleCodes = CPT_OFFICE_VISIT_CODES
      .filter(code => isNewPatient ? code.newPatient : code.establishedPatient)
      .map(code => `${code.code}: ${code.description} - Medicare Rate: $${CPT_REIMBURSEMENT_RATES[code.code] || 'N/A'}`)
      .join('\n');

    return `
MEDICARE BILLING OPTIMIZATION ANALYSIS

PATIENT STATUS: ${visitType}
${patientContext?.previousEncounterCount !== undefined ? 
  `Previous encounters: ${patientContext.previousEncounterCount}` : ''}
${patientContext?.medicalHistory?.length ? 
  `Medical history: ${patientContext.medicalHistory.slice(0, 5).join(', ')}` : ''}

CLINICAL DOCUMENTATION:
${clinicalText}

=== MEDICARE E&M GUIDELINES 2024 ===

ELIGIBLE CODES FOR ${visitType}:
${eligibleCodes}

KEY COMPLEXITY FACTORS YOU MUST ANALYZE:
1. PROBLEMS ADDRESSED:
   - 1 problem = straightforward/low complexity
   - 2 problems = low/moderate complexity  
   - 3+ problems = moderate/high complexity

2. DATA REVIEWED & ORDERED:
   - Review of records/tests = +1 point
   - Ordering diagnostic tests = +1 point
   - Independent interpretation = +2 points
   - Discussion with other providers = +1 point
   - 0-1 points = minimal, 2 points = limited, 3+ points = moderate/extensive

3. MEDICAL DECISION MAKING RISK:
   - Minimal: Self-limited problems, OTC meds
   - Low: Stable chronic illness, prescription meds
   - Moderate: Acute illness, minor surgery, chronic illness with exacerbation
   - High: Acute serious illness, major surgery, drug therapy requiring monitoring

MEDICARE BILLING OPTIMIZATION RULES:
- NEVER undercode - select the HIGHEST appropriate level supported by documentation
- NEW patients (99202-99205): No professional services in past 3 years
- ESTABLISHED patients (99212-99215): Professional services within past 3 years
- Choose the highest complexity level when 2 of 3 factors (problems, data, risk) support it
- Time-based coding available for counseling >50% of visit time

REVENUE MAXIMIZATION EXAMPLES:
- If documentation shows 2+ problems + test ordering + moderate risk = 99214 (not 99213)
- If new patient with comprehensive exam + moderate complexity = 99204 (not 99203)
- Multiple chronic conditions managed = higher complexity level

PROCEDURE CODES TO CONSIDER:
${PROCEDURE_CPT_CODES.slice(0, 15).map(p => `${p.code}: ${p.description}`).join('\n')}

DIAGNOSIS IDENTIFICATION REQUIREMENTS:
- IDENTIFY ALL CONDITIONS mentioned, assessed, or managed during the visit
- Include primary diagnosis (main reason for visit) AND all secondary diagnoses
- Secondary diagnoses include: chronic conditions addressed, comorbidities affecting care, conditions requiring monitoring
- Do NOT miss any condition that adds complexity or affects medical decision making
- Examples: If COPD exacerbation is primary, but hypertension is also managed/discussed, include BOTH

CRITICAL BILLING RULES:
1. REVENUE MAXIMIZATION: Select the HIGHEST appropriate code level supported by documentation
2. COMPREHENSIVE DIAGNOSIS CODING: Include ALL diagnoses that justify complexity scoring
3. Medicare compliance: Document reasoning for complexity level selection

Return ONLY a JSON object with your optimal billing decision:
{
  "cptCodes": [
    {
      "code": "99214",
      "description": "Office visit, established patient, moderate complexity",
      "complexity": "moderate",
      "reasoning": "2 chronic conditions addressed (COPD exacerbation + hypertension), lab results reviewed, moderate risk"
    }
  ],
  "diagnoses": [
    {
      "diagnosis": "Chronic obstructive pulmonary disease exacerbation",
      "icd10Code": "J44.1",
      "isPrimary": true
    },
    {
      "diagnosis": "Hypertension",
      "icd10Code": "I10",
      "isPrimary": false
    }
  ]
}`;
  }

  private generateAutomaticMappings(cptCodes: CPTCode[], diagnoses: DiagnosisCode[]): DiagnosisMapping[] {
    const mappings: DiagnosisMapping[] = [];
    
    // Create mappings for each diagnosis
    diagnoses.forEach((diagnosis) => {
      // Map all CPT codes to primary diagnosis, only E&M codes to secondary
      const applicableCptCodes = diagnosis.isPrimary 
        ? cptCodes.map(cpt => cpt.code)
        : cptCodes.filter(cpt => cpt.code.startsWith('992')).map(cpt => cpt.code);
      
      mappings.push({
        diagnosisId: diagnosis.icd10Code,
        cptCodes: applicableCptCodes,
        isSelected: true // Pre-select all mappings for optimal billing
      });
    });
    
    return mappings;
  }
}