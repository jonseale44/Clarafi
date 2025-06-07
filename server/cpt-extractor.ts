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
Analyze this clinical documentation and determine appropriate CPT codes and diagnoses for billing purposes.

Clinical Documentation:
${soapNote}

CODING REQUIREMENTS:

1. CPT CODES: Determine and assign appropriate billing codes for all services provided:
   - Office visits (99201-99215): Assess complexity based on:
     * Number of problems addressed (straightforward=1, low=2, moderate=3-4, high=5+)
     * Amount of data reviewed (labs, imaging, records)
     * Risk level (minimal, low, moderate, high)
   - Procedures performed: Assign specific CPT codes for any injections, minor surgeries, biopsies
   - Diagnostic services: Code for ECG, spirometry, vision screening, etc. if performed
   - Preventive care visits (99381-99397): If this is a wellness/physical exam
   - Any other billable services actually provided

2. DIAGNOSES: Assign accurate ICD-10 codes for all conditions addressed:
   - Primary diagnosis: Main reason for this visit
   - Secondary diagnoses: Additional conditions managed or affecting care
   - Include both acute conditions and chronic disease management
   - Use most specific ICD-10 codes available

MEDICAL CODING GUIDELINES:
- Base visit complexity on actual clinical work documented
- Only code procedures that were actually performed, not just discussed
- Assign the most specific and accurate ICD-10 codes
- Ensure CPT codes match the level of service actually provided
- Consider medical necessity for all assigned codes

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
        model: "gpt-4.1-nano",
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