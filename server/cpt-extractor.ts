import OpenAI from "openai";
import {
  CPT_OFFICE_VISIT_CODES,
  PROCEDURE_CPT_CODES,
  CPT_REIMBURSEMENT_RATES,
} from "./medical-coding-guidelines.js";
import { TokenCostAnalyzer } from "./token-cost-analyzer.js";

interface CPTCode {
  code: string;
  description: string;
  complexity?: string;
  reasoning?: string;
  modifiers?: string[]; // CPT modifiers (e.g., ['25', '59', 'LT'])
  modifierReasoning?: string; // GPT's reasoning for modifier selection
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
  intelligentMappings?: any[];
}

interface PatientContext {
  isNewPatient: boolean;
  previousEncounterCount: number;
  medicalHistory: string[];
  currentProblems: string[];
  patientAge?: number;
  dateOfBirth?: string;
}

export class CPTExtractor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractCPTCodesAndDiagnoses(
    clinicalText: string,
    patientContext?: PatientContext,
  ): Promise<ExtractedCPTData> {
    try {
      console.log(
        `🏥 [CPT Extractor] Starting GPT-only extraction from clinical text (${clinicalText.length} chars)`,
      );

      const isNewPatient = patientContext?.isNewPatient ?? false;
      console.log(
        `🏥 [CPT Extractor] Patient type: ${isNewPatient ? "NEW" : "ESTABLISHED"}`,
      );

      const prompt = this.buildComprehensiveMedicarePrompt(
        clinicalText,
        isNewPatient,
        patientContext,
      );

      console.log(`🔍 [CPT Extractor] FULL PROMPT TO GPT:`);
      console.log(
        `📝 [CPT Extractor] Clinical text length: ${clinicalText.length} chars`,
      );
      console.log(
        `📋 [CPT Extractor] Clinical text preview: ${clinicalText.substring(0, 500)}...`,
      );
      console.log(
        `🏥 [CPT Extractor] Patient context:`,
        JSON.stringify(patientContext, null, 2),
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      // Log comprehensive token usage and cost analysis
      if (response.usage) {
        const costAnalysis = TokenCostAnalyzer.logCostAnalysis(
          'CPT_Extractor',
          response.usage,
          'gpt-4.1',
          {
            clinicalTextLength: clinicalText.length,
            isNewPatient: patientContext?.isNewPatient,
            patientAge: patientContext?.patientAge,
            previousEncounters: patientContext?.previousEncounterCount
          }
        );
        
        // Log cost projections for billing optimization
        const projections = TokenCostAnalyzer.calculateProjections(costAnalysis.totalCost, 50);
        console.log(`💰 [CPT_Extractor] COST PROJECTIONS:`);
        console.log(`💰 [CPT_Extractor] Daily (50 encounters): ${projections.formatted.daily}`);
        console.log(`💰 [CPT_Extractor] Monthly: ${projections.formatted.monthly}`);
        console.log(`💰 [CPT_Extractor] Yearly: ${projections.formatted.yearly}`);
      }

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      console.log(`🤖 [CPT Extractor] RAW GPT RESPONSE:`);
      console.log(content);

      let extractedData = JSON.parse(content) as ExtractedCPTData;

      console.log(`📊 [CPT Extractor] PARSED GPT DATA:`);
      console.log(
        `CPT Codes:`,
        JSON.stringify(extractedData.cptCodes, null, 2),
      );
      console.log(
        `Diagnoses:`,
        JSON.stringify(extractedData.diagnoses, null, 2),
      );

      // Generate automatic diagnosis-to-CPT mappings
      extractedData.mappings = this.generateAutomaticMappings(
        extractedData.cptCodes,
        extractedData.diagnoses,
      );

      console.log(
        `✅ [CPT Extractor] GPT-selected billing: ${extractedData.cptCodes?.length || 0} CPT codes, ${extractedData.diagnoses?.length || 0} diagnoses`,
      );

      return extractedData;
    } catch (error) {
      console.error("❌ [CPT Extractor] Error in GPT extraction:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
    patientContext?: PatientContext,
  ): string {
    const visitType = isNewPatient ? "NEW PATIENT" : "ESTABLISHED PATIENT";
    const eligibleCodes = CPT_OFFICE_VISIT_CODES.filter((code) =>
      isNewPatient ? code.newPatient : code.establishedPatient,
    )
      .map(
        (code) =>
          `${code.code}: ${code.description} - Medicare Rate: $${CPT_REIMBURSEMENT_RATES[code.code] || "N/A"}`,
      )
      .join("\n");

    // Generate age-specific preventive medicine guidance
    const patientAge = patientContext?.patientAge;
    const ageSpecificGuidance = patientAge ? this.getAgeSpecificPreventiveGuidance(patientAge, isNewPatient) : "";

    return `
MEDICARE BILLING OPTIMIZATION ANALYSIS

PATIENT STATUS: ${visitType}
${patientAge ? `PATIENT AGE: ${patientAge} years` : ""}
${
  patientContext?.previousEncounterCount !== undefined
    ? `Previous encounters: ${patientContext.previousEncounterCount}`
    : ""
}
${
  patientContext?.medicalHistory?.length
    ? `Medical history: ${patientContext.medicalHistory.slice(0, 5).join(", ")}`
    : ""
}

${ageSpecificGuidance}

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
${PROCEDURE_CPT_CODES.slice(0, 15)
  .map((p) => `${p.code}: ${p.description}`)
  .join("\n")}

MANDATORY DIAGNOSIS REQUIREMENTS - CRITICAL FOR BILLING:
- SCAN THE ENTIRE CLINICAL DOCUMENTATION for every mentioned condition
- ASSESSMENT/PLAN section contains billable diagnoses - extract ALL of them
- Include PRIMARY diagnosis (chief complaint) AND ALL SECONDARY diagnoses
- Secondary diagnoses: chronic conditions managed, comorbidities treated, conditions requiring follow-up
- REVENUE IMPACT: Each additional diagnosis increases complexity scoring and justifies higher E&M codes
- BILLING RULE: If multiple conditions are documented, ALL must be coded for maximum reimbursement

COMPREHENSIVE BILLING ANALYSIS:
1. EVALUATION & MANAGEMENT CODES:
   - Problem-focused visits: 99202-99205 (new) or 99212-99215 (established)
   - Preventive medicine: 99381-99387 (new) or 99391-99397 (established) for wellness/routine care
   - Match diagnosis to appropriate E&M category (Z00.00 = preventive codes, not problem-focused)

2. PROCEDURE CODES - Identify ALL performed procedures:
   - Cryotherapy/destruction: 17110 (up to 14 lesions), 17111 (15+ lesions)
   - Injections, biopsies, minor procedures
   - In-office diagnostic procedures

3. DIAGNOSIS-TO-CODE MAPPING:
   - Wellness visits (Z00.xx) → Preventive medicine codes (99381-99387/99391-99397)
   - Warts/lesions (B07.xx) → Destruction procedures (17110/17111)
   - Acute conditions → Problem-focused E&M codes
   - Multiple unrelated services may require separate code sets

CRITICAL BILLING RULES:
1. REVENUE MAXIMIZATION: Select the HIGHEST appropriate code level supported by documentation
2. COMPREHENSIVE DIAGNOSIS CODING: Include ALL diagnoses that justify complexity scoring
3. Medicare compliance: Document reasoning for complexity level selection

CRITICAL INSTRUCTION: Analyze ONLY the clinical text provided in this specific request. Do NOT use any examples, templates, or previous case data. Every diagnosis and CPT code must come directly from the documentation you are analyzing RIGHT NOW.

MANDATORY: If you identify multiple conditions in the clinical documentation, you MUST include ALL of them in the diagnoses array. Missing any documented condition results in revenue loss and billing compliance failure.

MANDATORY: Identify ALL billable services performed during this encounter. Include BOTH evaluation/management AND any procedures performed.

Return ONLY a JSON object with this exact structure:
{
  "cptCodes": [
    {
      "code": "99204",
      "description": "Office visit, new patient, moderate complexity",
      "complexity": "moderate",
      "reasoning": "Problem-focused visit for respiratory symptoms with moderate complexity"
    },
    {
      "code": "99386", 
      "description": "Preventive medicine service, new patient, 40-64 years",
      "complexity": "preventive",
      "reasoning": "Annual wellness exam component of visit"
    },
    {
      "code": "17110",
      "description": "Destruction of benign lesions, up to 14 lesions",
      "complexity": "procedure",
      "reasoning": "Cryotherapy performed on skin lesions"
    }
  ],
  "diagnoses": [
    {
      "diagnosis": "Breathlessness and chest tightness",
      "icd10Code": "R06.4",
      "isPrimary": true
    },
    {
      "diagnosis": "Routine general medical examination",
      "icd10Code": "Z00.00",
      "isPrimary": false
    },
    {
      "diagnosis": "Viral warts, unspecified",
      "icd10Code": "B07.9",
      "isPrimary": false
    }
  ],
  "intelligentMappings": [
    {
      "diagnosisIndex": 0,
      "cptIndex": 0,
      "clinicalRationale": "Respiratory symptoms require problem-focused E&M evaluation",
      "shouldSelect": true
    },
    {
      "diagnosisIndex": 1,
      "cptIndex": 1,
      "clinicalRationale": "Wellness examination maps to preventive medicine service",
      "shouldSelect": true
    },
    {
      "diagnosisIndex": 2,
      "cptIndex": 2,
      "clinicalRationale": "Wart removal procedure directly treats viral warts diagnosis",
      "shouldSelect": true
    }
  ]
}

VALIDATION CHECK: Count the conditions you mentioned in your reasoning. Your diagnoses array MUST contain the same number of conditions. If your reasoning mentions "2 conditions" but you only list 1 diagnosis, you have made an error.`;
  }

  private getAgeSpecificPreventiveGuidance(patientAge: number, isNewPatient: boolean): string {
    const preventivePrefix = isNewPatient ? "993" : "993";
    let ageCode = "";
    let ageRange = "";
    
    if (patientAge < 1) {
      ageCode = isNewPatient ? "99381" : "99391";
      ageRange = "infant (under 1 year)";
    } else if (patientAge >= 1 && patientAge <= 4) {
      ageCode = isNewPatient ? "99382" : "99392";
      ageRange = "early childhood (1-4 years)";
    } else if (patientAge >= 5 && patientAge <= 11) {
      ageCode = isNewPatient ? "99383" : "99393";
      ageRange = "late childhood (5-11 years)";
    } else if (patientAge >= 12 && patientAge <= 17) {
      ageCode = isNewPatient ? "99384" : "99394";
      ageRange = "adolescent (12-17 years)";
    } else if (patientAge >= 18 && patientAge <= 39) {
      ageCode = isNewPatient ? "99385" : "99395";
      ageRange = "young adult (18-39 years)";
    } else if (patientAge >= 40 && patientAge <= 64) {
      ageCode = isNewPatient ? "99386" : "99396";
      ageRange = "adult (40-64 years)";
    } else if (patientAge >= 65) {
      ageCode = isNewPatient ? "99387" : "99397";
      ageRange = "senior (65+ years)";
    }

    return `
AGE-SPECIFIC PREVENTIVE MEDICINE CODING:
For patient age ${patientAge} years, the correct preventive medicine code is:
${ageCode}: Preventive medicine, ${isNewPatient ? 'new' : 'established'} patient, ${ageRange}
Medicare Rate: $${CPT_REIMBURSEMENT_RATES[ageCode] || "N/A"}

CRITICAL: Always use the age-appropriate preventive medicine code. Using incorrect age ranges will result in claim denials.`;
  }

  private generateAutomaticMappings(
    cptCodes: CPTCode[],
    diagnoses: DiagnosisCode[],
  ): DiagnosisMapping[] {
    const mappings: DiagnosisMapping[] = [];

    // Create mappings for each diagnosis
    diagnoses.forEach((diagnosis) => {
      // Map all CPT codes to primary diagnosis, only E&M codes to secondary
      const applicableCptCodes = diagnosis.isPrimary
        ? cptCodes.map((cpt) => cpt.code)
        : cptCodes
            .filter((cpt) => cpt.code.startsWith("992"))
            .map((cpt) => cpt.code);

      mappings.push({
        diagnosisId: diagnosis.icd10Code,
        cptCodes: applicableCptCodes,
        isSelected: true, // Pre-select all mappings for optimal billing
      });
    });

    return mappings;
  }
}
