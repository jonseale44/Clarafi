import OpenAI from 'openai';
import { 
  CPT_OFFICE_VISIT_CODES, 
  PROCEDURE_CPT_CODES, 
  RISK_ASSESSMENT_KEYWORDS,
  DATA_COMPLEXITY_KEYWORDS,
  determineBestCPTCode,
  calculateEMComplexity,
  EMComplexityFactors,
  DataComplexity,
  RiskLevel
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
      console.log(`🏥 [CPT Extractor] Starting advanced extraction from clinical text (${clinicalText.length} chars)`);
      
      // Analyze complexity factors first
      const complexityFactors = this.analyzeComplexityFactors(clinicalText);
      const isNewPatient = patientContext?.isNewPatient ?? this.determineNewPatientStatus(clinicalText, patientContext);
      
      console.log(`🏥 [CPT Extractor] Patient type: ${isNewPatient ? 'NEW' : 'ESTABLISHED'}`);
      console.log(`🏥 [CPT Extractor] Complexity factors:`, complexityFactors);

      // Build comprehensive prompt with Medicare guidelines
      const prompt = this.buildAdvancedCodingPrompt(clinicalText, complexityFactors, isNewPatient, patientContext);

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
      
      // Apply billing optimization logic
      extractedData = this.optimizeBilling(extractedData, complexityFactors, isNewPatient);
      
      // Generate automatic diagnosis-to-CPT mappings
      extractedData.mappings = this.generateAutomaticMappings(extractedData.cptCodes, extractedData.diagnoses);
      
      console.log(`✅ [CPT Extractor] Optimized billing: ${extractedData.cptCodes?.length || 0} CPT codes, ${extractedData.diagnoses?.length || 0} diagnoses`);
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

  private buildAdvancedCodingPrompt(
    clinicalText: string, 
    complexityFactors: EMComplexityFactors, 
    isNewPatient: boolean, 
    patientContext?: PatientContext
  ): string {
    const visitType = isNewPatient ? "NEW PATIENT" : "ESTABLISHED PATIENT";
    const eligibleCodes = CPT_OFFICE_VISIT_CODES
      .filter(code => isNewPatient ? code.newPatient : code.establishedPatient)
      .map(code => `${code.code}: ${code.description}`)
      .join('\n');

    return `
MEDICAL CODING ANALYSIS

PATIENT TYPE: ${visitType}
${patientContext?.previousEncounterCount !== undefined ? 
  `Previous encounters: ${patientContext.previousEncounterCount}` : ''}

CLINICAL DOCUMENTATION:
${clinicalText}

COMPLEXITY ANALYSIS COMPLETED:
- Problems addressed: ${complexityFactors.problemsAddressed}
- Data reviewed: ${Object.values(complexityFactors.dataReviewed).filter(Boolean).length} points
- Risk level: ${complexityFactors.riskLevel}

ELIGIBLE E&M CODES FOR ${visitType}:
${eligibleCodes}

AVAILABLE PROCEDURE CODES:
${PROCEDURE_CPT_CODES.slice(0, 10).map(p => `${p.code}: ${p.description}`).join('\n')}

CODING INSTRUCTIONS:

1. SELECT THE HIGHEST APPROPRIATE E&M CODE:
   - For NEW patients: Choose from 99202-99205 based on complexity
   - For ESTABLISHED patients: Choose from 99212-99215 based on complexity
   - MAXIMIZE billing by selecting the highest code that meets requirements
   - Consider all documented work: problems, data, risk, time

2. CODE ALL PERFORMED PROCEDURES:
   - Only include procedures actually performed during this visit
   - Do NOT include lab tests, imaging, or referrals (these are separate)
   - Include: injections, minor surgeries, ECGs, spirometry, wound care

3. ASSIGN COMPREHENSIVE DIAGNOSES:
   - Primary diagnosis: Main reason for visit
   - Secondary diagnoses: All conditions addressed or affecting care
   - Use most specific ICD-10 codes available
   - Include chronic conditions if managed during visit

4. BILLING OPTIMIZATION RULES:
   - Never undercode - select highest appropriate level
   - Ensure medical necessity for all codes
   - Document complexity factors clearly
   - Follow Medicare guidelines for code selection

Return ONLY a JSON object in this exact format:
{
  "cptCodes": [
    {
      "code": "99214",
      "description": "Office visit, established patient, moderate complexity",
      "complexity": "moderate"
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

  private optimizeBilling(
    extractedData: ExtractedCPTData, 
    complexityFactors: EMComplexityFactors, 
    isNewPatient: boolean
  ): ExtractedCPTData {
    // Apply our Medicare guidelines logic to verify/optimize the E&M code
    const recommendedCode = determineBestCPTCode(isNewPatient, complexityFactors);
    
    if (recommendedCode && extractedData.cptCodes.length > 0) {
      // Find the E&M code in the extracted data
      const emCodeIndex = extractedData.cptCodes.findIndex(code => 
        code.code.startsWith('992') // E&M codes
      );
      
      if (emCodeIndex >= 0) {
        // Compare with our recommendation and use the higher one
        const currentCode = extractedData.cptCodes[emCodeIndex];
        const currentComplexity = this.getComplexityScore(currentCode.complexity || 'straightforward');
        const recommendedComplexity = this.getComplexityScore(recommendedCode.complexity);
        
        if (recommendedComplexity > currentComplexity) {
          console.log(`🔧 [Billing Optimization] Upgrading ${currentCode.code} to ${recommendedCode.code}`);
          extractedData.cptCodes[emCodeIndex] = {
            code: recommendedCode.code,
            description: recommendedCode.description,
            complexity: recommendedCode.complexity
          };
        }
      }
    }
    
    // Remove any lab/radiology codes that shouldn't be here
    extractedData.cptCodes = extractedData.cptCodes.filter(code => {
      const codeNum = parseInt(code.code);
      // Keep E&M codes (99201-99499) and procedure codes, exclude lab/radiology
      return (codeNum >= 99201 && codeNum <= 99499) || 
             (codeNum >= 10000 && codeNum <= 69999) || // Surgical procedures
             (codeNum >= 90000 && codeNum <= 99199);   // Medicine procedures
    });
    
    return extractedData;
  }

  private getComplexityScore(complexity: string): number {
    switch (complexity) {
      case 'high': return 4;
      case 'moderate': return 3;
      case 'low': return 2;
      case 'straightforward': return 1;
      default: return 0;
    }
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