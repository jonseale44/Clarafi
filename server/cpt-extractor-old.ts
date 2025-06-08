import OpenAI from 'openai';
import { 
  CPT_OFFICE_VISIT_CODES, 
  PROCEDURE_CPT_CODES, 
  CPT_REIMBURSEMENT_RATES
} from './medical-coding-guidelines.js';

interface CPTCode {
  code: string;
  description: string;
  complexity?: 'straightforward' | 'low' | 'moderate' | 'high';
}

interface DiagnosisCode {
  diagnosis: string;
  icd10Code: string;
  isPrimary?: boolean;
}

interface ExtractedCPTData {
  cptCodes: CPTCode[];
  diagnoses: DiagnosisCode[];
  mappings?: DiagnosisMapping[];
}

interface DiagnosisMapping {
  diagnosisIndex: number;
  cptCodeIndex: number;
  selected: boolean;
}

interface PatientContext {
  isNewPatient: boolean;
  previousEncounterCount: number;
  medicalHistory: string[];
  currentProblems: string[];
}

/**
 * Advanced CPT Code Extractor Service
 * Uses Medicare E&M Guidelines and billing optimization
 */
export class CPTExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * Advanced CPT extraction with patient context and billing optimization
   */
  async extractCPTCodesAndDiagnoses(
    clinicalText: string, 
    patientContext?: PatientContext
  ): Promise<ExtractedCPTData> {
    try {
      console.log(`🏥 [CPT Extractor] Starting GPT-only extraction from clinical text (${clinicalText.length} chars)`);
      
      const isNewPatient = patientContext?.isNewPatient ?? false;
      
      console.log(`🏥 [CPT Extractor] Patient type: ${isNewPatient ? 'NEW' : 'ESTABLISHED'}`);

      // Build comprehensive prompt with complete Medicare guidelines for GPT
      const prompt = this.buildComprehensiveMedicarePrompt(clinicalText, isNewPatient, patientContext);

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

      let extractedData = JSON.parse(content) as ExtractedCPTData;
      
      // Generate automatic diagnosis-to-CPT mappings
      extractedData.mappings = this.generateAutomaticMappings(extractedData.cptCodes, extractedData.diagnoses);
      
      console.log(`✅ [CPT Extractor] GPT-selected billing: ${extractedData.cptCodes?.length || 0} CPT codes, ${extractedData.diagnoses?.length || 0} diagnoses`);
      console.log(`🔗 [CPT Extractor] Generated ${extractedData.mappings?.length || 0} automatic mappings`);
      
      return extractedData;

    } catch (error) {
      console.error('❌ [CPT Extractor] Error in advanced extraction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract CPT codes: ${errorMessage}`);
    }
  }

  /**
   * Analyze complexity factors from clinical text
   */
  private analyzeComplexityFactors(clinicalText: string): EMComplexityFactors {
    const text = clinicalText.toLowerCase();
    
    // Count problems addressed
    const problemsAddressed = this.countProblemsAddressed(text);
    
    // Analyze data complexity
    const dataReviewed: DataComplexity = {
      reviewedRecords: this.hasKeywords(text, DATA_COMPLEXITY_KEYWORDS.reviewedRecords),
      orderedTests: this.hasKeywords(text, DATA_COMPLEXITY_KEYWORDS.orderedTests),
      interpretedResults: this.hasKeywords(text, DATA_COMPLEXITY_KEYWORDS.interpretedResults),
      discussedWithOthers: this.hasKeywords(text, DATA_COMPLEXITY_KEYWORDS.discussedWithOthers),
      independentHistorian: this.hasKeywords(text, DATA_COMPLEXITY_KEYWORDS.independentHistorian)
    };
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(text);
    
    return {
      problemsAddressed,
      dataReviewed,
      riskLevel
    };
  }

  private countProblemsAddressed(text: string): number {
    // Look for multiple diagnoses, chief complaints, or problems
    const problemIndicators = [
      /chief complaint[s]?[:\-]\s*([^.]+)/gi,
      /diagnosis[:\-]\s*([^.]+)/gi,
      /problem[s]?[:\-]\s*([^.]+)/gi,
      /assessment[:\-]\s*([^.]+)/gi,
      /plan[:\-]\s*([^.]+)/gi
    ];
    
    let problemCount = 0;
    problemIndicators.forEach(regex => {
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(match => {
          // Count commas and "and" as separate problems
          const separators = (match.match(/,|and |&/gi) || []).length;
          problemCount += separators + 1;
        });
      }
    });
    
    return Math.max(problemCount, 1); // Minimum 1 problem
  }

  private hasKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  private determineRiskLevel(text: string): RiskLevel {
    if (this.hasKeywords(text, RISK_ASSESSMENT_KEYWORDS.high)) return 'high';
    if (this.hasKeywords(text, RISK_ASSESSMENT_KEYWORDS.moderate)) return 'moderate';
    if (this.hasKeywords(text, RISK_ASSESSMENT_KEYWORDS.low)) return 'low';
    return 'minimal';
  }

  private determineNewPatientStatus(clinicalText: string, patientContext?: PatientContext): boolean {
    if (patientContext?.previousEncounterCount !== undefined) {
      return patientContext.previousEncounterCount === 0;
    }
    
    // Look for indicators in clinical text
    const newPatientIndicators = [
      'new patient', 'first visit', 'initial visit', 'establishing care',
      'new to clinic', 'never seen before'
    ];
    
    const establishedIndicators = [
      'follow up', 'return visit', 'established patient', 'previous visit',
      'last seen', 'continuing care'
    ];
    
    const text = clinicalText.toLowerCase();
    
    if (this.hasKeywords(text, newPatientIndicators)) return true;
    if (this.hasKeywords(text, establishedIndicators)) return false;
    
    // Default to established if unclear
    return false;
  }

  private getSystemPrompt(): string {
    return `You are an expert medical coding specialist with deep knowledge of:
- 2024 Medicare E&M Documentation Guidelines
- CPT coding rules and billing optimization
- ICD-10-CM diagnosis coding
- Medical necessity requirements
- Compliance with CMS guidelines

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

CRITICAL: Your primary goal is REVENUE MAXIMIZATION while maintaining Medicare compliance. Always choose the highest appropriate code level. Document your reasoning for the selected complexity level.

Return ONLY a JSON object with your optimal billing decision:
{
  "cptCodes": [
    {
      "code": "99214",
      "description": "Office visit, established patient, moderate complexity",
      "complexity": "moderate",
      "reasoning": "2 chronic conditions addressed, lab results reviewed, moderate risk due to COPD exacerbation"
    }
  ],
  "diagnoses": [
    {
      "diagnosis": "Chronic obstructive pulmonary disease exacerbation",
      "icd10Code": "J44.1",
      "isPrimary": true
    }
  ]
}`;
  }



  private generateAutomaticMappings(cptCodes: CPTCode[], diagnoses: DiagnosisCode[]): DiagnosisMapping[] {
    const mappings: DiagnosisMapping[] = [];
    
    // Auto-map primary diagnosis to E&M code
    const primaryDiagIndex = diagnoses.findIndex(d => d.isPrimary);
    const emCodeIndex = cptCodes.findIndex(c => c.code.startsWith('992'));
    
    if (primaryDiagIndex >= 0 && emCodeIndex >= 0) {
      mappings.push({
        diagnosisIndex: primaryDiagIndex,
        cptCodeIndex: emCodeIndex,
        selected: true
      });
    }
    
    // Auto-map procedure-specific diagnoses
    cptCodes.forEach((cpt, cptIndex) => {
      if (!cpt.code.startsWith('992')) { // Not an E&M code
        // Map to most relevant diagnosis
        diagnoses.forEach((diagnosis, diagIndex) => {
          if (this.isProcedureRelevantToDiagnosis(cpt, diagnosis)) {
            mappings.push({
              diagnosisIndex: diagIndex,
              cptCodeIndex: cptIndex,
              selected: true
            });
          }
        });
      }
    });
    
    // Map remaining diagnoses to E&M code if not already mapped
    diagnoses.forEach((diagnosis, diagIndex) => {
      const alreadyMapped = mappings.some(m => m.diagnosisIndex === diagIndex);
      if (!alreadyMapped && emCodeIndex >= 0) {
        mappings.push({
          diagnosisIndex: diagIndex,
          cptCodeIndex: emCodeIndex,
          selected: true
        });
      }
    });
    
    return mappings;
  }

  private isProcedureRelevantToDiagnosis(cpt: CPTCode, diagnosis: DiagnosisCode): boolean {
    // Simple keyword matching for procedure relevance
    const cptDesc = cpt.description.toLowerCase();
    const diagnosisText = diagnosis.diagnosis.toLowerCase();
    
    // Injection procedures
    if (cptDesc.includes('injection') && 
        (diagnosisText.includes('arthritis') || diagnosisText.includes('joint') || diagnosisText.includes('pain'))) {
      return true;
    }
    
    // Wound care
    if (cptDesc.includes('repair') || cptDesc.includes('wound')) {
      return diagnosisText.includes('laceration') || diagnosisText.includes('wound') || diagnosisText.includes('injury');
    }
    
    // ECG
    if (cptDesc.includes('electrocardiogram') || cptDesc.includes('ecg')) {
      return diagnosisText.includes('cardiac') || diagnosisText.includes('heart') || diagnosisText.includes('chest pain');
    }
    
    return false;
  }

  /**
   * Validates extracted CPT codes for basic format compliance
   */
  private validateCPTCode(code: string): boolean {
    const cptRegex = /^\d{5}$/;
    return cptRegex.test(code);
  }

  /**
   * Validates ICD-10 codes for basic format compliance
   */
  private validateICD10Code(code: string): boolean {
    const icd10Regex = /^[A-Z]\d{2}(\.\d{1,4})?$/;
    return icd10Regex.test(code);
  }
}