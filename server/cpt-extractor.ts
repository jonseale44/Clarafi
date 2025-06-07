import OpenAI from 'openai';

interface CPTCode {
  code: string;
  description: string;
  complexity?: 'low' | 'medium' | 'high';
}

interface DiagnosisCode {
  diagnosis: string;
  icd10Code: string;
  isPrimary?: boolean;
}

interface ExtractedCPTData {
  cptCodes: CPTCode[];
  diagnoses: DiagnosisCode[];
}

/**
 * CPT Code Extractor Service
 * Extracts CPT codes and diagnoses from SOAP notes using GPT-4o
 */
export class CPTExtractor {
  private openai: OpenAI;

  constructor() {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * Extracts CPT codes and diagnoses from SOAP note content
   */
  async extractCPTCodesAndDiagnoses(soapNote: string): Promise<ExtractedCPTData> {
    try {
      console.log(`🏥 [CPT Extractor] Starting extraction from SOAP note (${soapNote.length} chars)`);

      const prompt = `
Analyze this SOAP note and extract ALL relevant CPT codes and diagnoses for billing purposes.

SOAP Note:
${soapNote}

EXTRACTION REQUIREMENTS:

1. CPT CODES: Extract all billable services, procedures, and encounters mentioned or implied:
   - Office visits (99201-99215 based on complexity)
   - Procedures performed (injections, minor surgeries, etc.)
   - Diagnostic services (ECG, spirometry, etc.)
   - Preventive care visits (99381-99397)
   - Any other billable services

2. DIAGNOSES: Extract all conditions mentioned with ICD-10 codes:
   - Primary diagnosis (main reason for visit)
   - Secondary diagnoses (comorbidities, incidental findings)
   - Include both acute and chronic conditions
   - Map to specific ICD-10 codes

MEDICAL DECISION-MAKING GUIDELINES:
- Use appropriate visit complexity based on number of problems, data reviewed, and risk
- Include all procedures actually performed or clearly documented
- Map diagnoses to most specific ICD-10 codes available
- Consider both billable and non-billable diagnoses for completeness

Return ONLY a JSON object in this exact format:
{
  "cptCodes": [
    {
      "code": "99213",
      "description": "Office visit, established patient, moderate complexity",
      "complexity": "medium"
    }
  ],
  "diagnoses": [
    {
      "diagnosis": "Essential hypertension",
      "icd10Code": "I10",
      "isPrimary": true
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a medical coding specialist with expertise in CPT and ICD-10 coding. Extract accurate billing codes from clinical documentation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 // Low temperature for consistent coding
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      const extractedData = JSON.parse(content) as ExtractedCPTData;
      
      console.log(`✅ [CPT Extractor] Extracted ${extractedData.cptCodes?.length || 0} CPT codes and ${extractedData.diagnoses?.length || 0} diagnoses`);
      
      return extractedData;

    } catch (error) {
      console.error('❌ [CPT Extractor] Error extracting CPT codes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract CPT codes: ${errorMessage}`);
    }
  }

  /**
   * Validates extracted CPT codes for basic format compliance
   */
  private validateCPTCode(code: string): boolean {
    // Basic CPT code validation (5 digits, specific ranges)
    const cptRegex = /^\d{5}$/;
    return cptRegex.test(code);
  }

  /**
   * Validates ICD-10 codes for basic format compliance
   */
  private validateICD10Code(code: string): boolean {
    // Basic ICD-10 validation (letter followed by 2-4 digits, optional decimal and more digits)
    const icd10Regex = /^[A-Z]\d{2}(\.\d{1,4})?$/;
    return icd10Regex.test(code);
  }
}