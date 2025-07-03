/**
 * Pharmacy Validation Service
 * 
 * GPT-powered pharmacy compliance validation for medication orders
 * Ensures all prescriptions meet pharmacy and insurance requirements
 */

import OpenAI from "openai";
import { MedicationStandardizationService } from "./medication-standardization-service.js";

export interface PharmacyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  calculatedDaysSupply?: number;
  insuranceConsiderations?: string[];
  deaSchedule?: string;
  priorAuthRequired?: boolean;
  alternativeSuggestions?: Array<{
    medication: string;
    reason: string;
  }>;
}

export interface MedicationOrderForValidation {
  medicationName: string;
  strength: string;
  dosageForm: string;
  sig: string;
  quantity: number;
  refills: number;
  daysSupply?: number;
  route: string;
  clinicalIndication?: string;
  patientAge?: number;
  patientWeight?: number;
  renalFunction?: string;
  hepaticFunction?: string;
  allergies?: string[];
  currentMedications?: string[];
}

export class PharmacyValidationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Validate medication order with GPT-powered pharmacy intelligence
   */
  async validateMedicationOrder(order: MedicationOrderForValidation): Promise<PharmacyValidationResult> {
    console.log(`💊 [PharmacyValidation] Validating order: ${order.medicationName} ${order.strength}`);

    // First run basic validation
    const basicValidation = MedicationStandardizationService.validateMedication({
      medicationName: order.medicationName,
      strength: order.strength,
      dosageForm: order.dosageForm,
      sig: order.sig,
      quantity: order.quantity,
      refills: order.refills,
      daysSupply: order.daysSupply || 0,
      route: order.route,
      clinicalIndication: order.clinicalIndication
    });

    // If basic validation fails critically, return early
    if (basicValidation.errors.length > 0) {
      return {
        isValid: false,
        errors: basicValidation.errors,
        warnings: basicValidation.warnings,
        suggestions: ["Please correct the errors before proceeding"],
        insuranceConsiderations: []
      };
    }

    try {

      // Use GPT for advanced validation
      const prompt = `You are an expert clinical pharmacist with 25 years experience reviewing prescriptions for pharmacy compliance, insurance requirements, and patient safety. Review this medication order:

MEDICATION ORDER:
- Medication: ${order.medicationName} ${order.strength}
- Form: ${order.dosageForm}
- Sig: ${order.sig}
- Quantity: ${order.quantity}
- Refills: ${order.refills}
- Days Supply: ${order.daysSupply || 'Not specified'}
- Route: ${order.route}
- Clinical Indication: ${order.clinicalIndication || 'Not specified'}

PATIENT CONTEXT:
- Age: ${order.patientAge || 'Unknown'}
- Weight: ${order.patientWeight ? order.patientWeight + ' kg' : 'Unknown'}
- Renal Function: ${order.renalFunction || 'Unknown'}
- Hepatic Function: ${order.hepaticFunction || 'Unknown'}
- Allergies: ${order.allergies?.join(', ') || 'None documented'}
- Current Medications: ${order.currentMedications?.join(', ') || 'None documented'}

Provide a comprehensive pharmacy validation analysis in JSON format:

{
  "validation_passed": boolean,
  "critical_errors": ["List any errors that would cause pharmacy rejection"],
  "warnings": ["List any warnings or concerns"],
  "suggestions": ["List suggestions to improve the prescription"],
  "calculated_days_supply": number (calculate based on sig and quantity),
  "insurance_considerations": ["List insurance-related considerations"],
  "dea_schedule": "CII/CIII/CIV/CV/None",
  "prior_auth_likely": boolean,
  "alternative_suggestions": [
    {
      "medication": "Alternative medication name",
      "reason": "Why this might be better"
    }
  ],
  "dosing_assessment": {
    "appropriate_for_indication": boolean,
    "within_normal_range": boolean,
    "adjustment_needed": "none/renal/hepatic/age/weight",
    "specific_concerns": "string"
  },
  "interaction_check": {
    "significant_interactions": ["List any concerning drug interactions"],
    "food_interactions": ["List any food interactions"],
    "disease_interactions": ["List any disease state interactions"]
  },
  "pharmacy_notes": "Additional notes for the pharmacist"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical pharmacist performing prescription validation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent validation
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error("No response from GPT");
      }

      const gptValidation = JSON.parse(response);

      // Calculate days supply if not provided
      let calculatedDaysSupply = order.daysSupply;
      if (!calculatedDaysSupply && gptValidation.calculated_days_supply) {
        calculatedDaysSupply = gptValidation.calculated_days_supply;
      }

      // Combine basic and GPT validation results
      const result: PharmacyValidationResult = {
        isValid: gptValidation.validation_passed && basicValidation.errors.length === 0,
        errors: [
          ...basicValidation.errors,
          ...(gptValidation.critical_errors || [])
        ],
        warnings: [
          ...basicValidation.warnings,
          ...(gptValidation.warnings || []),
          ...(gptValidation.interaction_check?.significant_interactions || [])
        ],
        suggestions: gptValidation.suggestions || [],
        calculatedDaysSupply,
        insuranceConsiderations: gptValidation.insurance_considerations || [],
        deaSchedule: gptValidation.dea_schedule !== 'None' ? gptValidation.dea_schedule : undefined,
        priorAuthRequired: gptValidation.prior_auth_likely || basicValidation.pharmacyRequirements.includes('Prior authorization likely required'),
        alternativeSuggestions: gptValidation.alternative_suggestions || []
      };

      // Add dosing concerns to warnings if any
      if (gptValidation.dosing_assessment && !gptValidation.dosing_assessment.appropriate_for_indication) {
        result.warnings.push(gptValidation.dosing_assessment.specific_concerns || "Dosing may not be appropriate for indication");
      }

      console.log(`✅ [PharmacyValidation] Validation complete:`, {
        valid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

      return result;

    } catch (error) {
      console.error(`❌ [PharmacyValidation] Error validating order:`, error);
      
      // Return minimal validation result if GPT fails
      return {
        isValid: false,
        errors: ["Validation service temporarily unavailable"],
        warnings: ["Manual pharmacy review required"],
        suggestions: ["Please have pharmacist manually review this prescription"],
        insuranceConsiderations: []
      };
    }
  }

  /**
   * Calculate days supply from sig and quantity
   */
  async calculateDaysSupply(sig: string, quantity: number, dosageForm: string): Promise<number> {
    try {
      const prompt = `As a pharmacist, calculate the days supply for this prescription:
Sig: ${sig}
Quantity: ${quantity} ${dosageForm}

Return ONLY a number representing the days supply.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 10
      });

      const response = completion.choices[0].message.content;
      const daysSupply = parseInt(response?.trim() || "0");
      
      return daysSupply > 0 ? daysSupply : 30; // Default to 30 if calculation fails

    } catch (error) {
      console.error(`❌ [PharmacyValidation] Error calculating days supply:`, error);
      return 30; // Default
    }
  }

  /**
   * Suggest appropriate refills based on medication type and indication
   */
  suggestRefills(medicationName: string, clinicalIndication: string, isControlled: boolean): number {
    // Controlled substances
    if (isControlled) {
      return 0; // No refills for Schedule II, limited for III-V
    }

    // Antibiotics
    if (medicationName.match(/cillin|cycline|mycin|floxacin|azole|cef/i)) {
      return 0; // Usually no refills for antibiotics
    }

    // Chronic conditions
    if (clinicalIndication?.match(/hypertension|diabetes|hyperlipidemia|hypothyroid|depression|anxiety/i)) {
      return 5; // 6 months of refills for chronic conditions
    }

    // Default
    return 2; // 3 months total
  }

  /**
   * Generate default patient instructions (sig) from medication details
   */
  generateDefaultSig(dosage: string, frequency: string, route: string): string {
    // Clean up the inputs
    const cleanDosage = dosage?.trim() || "1";
    const cleanFrequency = frequency?.toLowerCase().trim() || "once daily";
    const cleanRoute = route?.toLowerCase().trim() || "by mouth";
    
    // Handle common frequency patterns
    let sigFrequency = cleanFrequency;
    if (cleanFrequency.includes("daily") || cleanFrequency.includes("qd")) {
      sigFrequency = "once daily";
    } else if (cleanFrequency.includes("twice") || cleanFrequency.includes("bid")) {
      sigFrequency = "twice daily";
    } else if (cleanFrequency.includes("three") || cleanFrequency.includes("tid")) {
      sigFrequency = "three times daily";
    } else if (cleanFrequency.includes("four") || cleanFrequency.includes("qid")) {
      sigFrequency = "four times daily";
    } else if (cleanFrequency.includes("bedtime") || cleanFrequency.includes("hs")) {
      sigFrequency = "at bedtime";
    } else if (cleanFrequency.includes("prn") || cleanFrequency.includes("as needed")) {
      sigFrequency = "as needed";
    }
    
    // Handle common routes
    let sigRoute = cleanRoute;
    if (cleanRoute.includes("mouth") || cleanRoute.includes("oral") || cleanRoute.includes("po")) {
      sigRoute = "by mouth";
    } else if (cleanRoute.includes("skin") || cleanRoute.includes("topical")) {
      sigRoute = "to affected area";
    } else if (cleanRoute.includes("eye") || cleanRoute.includes("ophthalmic")) {
      sigRoute = "to affected eye(s)";
    } else if (cleanRoute.includes("ear") || cleanRoute.includes("otic")) {
      sigRoute = "to affected ear(s)";
    } else if (cleanRoute.includes("nose") || cleanRoute.includes("nasal")) {
      sigRoute = "to each nostril";
    } else if (cleanRoute.includes("inhale") || cleanRoute.includes("inhalation")) {
      sigRoute = "by inhalation";
    }
    
    // Build the sig
    let sig = `Take ${cleanDosage}`;
    
    // Add route
    if (sigRoute !== "by mouth") {
      sig += ` ${sigRoute}`;
    }
    
    // Add frequency
    sig += ` ${sigFrequency}`;
    
    return sig;
  }
}

// Export singleton instance
export const pharmacyValidation = new PharmacyValidationService();