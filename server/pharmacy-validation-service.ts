/**
 * Pharmacy Validation Service
 *
 * GPT-powered pharmacy compliance validation for medication orders
 * Ensures all prescriptions meet pharmacy and insurance requirements
 */

import OpenAI from "openai";
import { MedicationStandardizationService } from "./medication-standardization-service.js";
import { MedicationFormularyService } from "./medication-formulary-service.js";
import { RxNormService } from "./rxnorm-service.js";

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
  missingFieldRecommendations?: {
    sig?: string;
    quantity?: number;
    refills?: number;
    daysSupply?: number;
    route?: string;
    clinicalIndication?: string;
  };
}

export interface MedicationOrderForValidation {
  medicationName: string;
  strength: string;
  dosageForm: string;
  sig: string;
  quantity: number;
  quantityUnit?: string;
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
  async validateMedicationOrder(
    order: MedicationOrderForValidation,
  ): Promise<PharmacyValidationResult> {
    console.log(
      `💊 [PharmacyValidation] Validating order: ${order.medicationName} ${order.strength}`,
    );

    // First run basic validation
    const basicValidation = MedicationStandardizationService.validateMedication(
      {
        medicationName: order.medicationName,
        strength: order.strength,
        dosageForm: order.dosageForm,
        sig: order.sig,
        quantity: order.quantity,
        refills: order.refills,
        daysSupply: order.daysSupply || 0,
        route: order.route,
        clinicalIndication: order.clinicalIndication,
      },
    );

    // If basic validation fails critically, return early
    if (basicValidation.errors.length > 0) {
      return {
        isValid: false,
        errors: basicValidation.errors,
        warnings: basicValidation.warnings,
        suggestions: ["Please correct the errors before proceeding"],
        insuranceConsiderations: [],
      };
    }

    try {
      // Check for missing fields
      const missingFields = {
        sig: !order.sig,
        quantity: !order.quantity || order.quantity === 0,
        refills: order.refills === undefined || order.refills === null,
        daysSupply: !order.daysSupply || order.daysSupply === 0,
        route: !order.route,
        clinicalIndication: !order.clinicalIndication,
      };

      // Use GPT for advanced validation
      const prompt = `You are an expert clinical pharmacist with 25 years experience reviewing prescriptions for pharmacy compliance, insurance requirements, and patient safety. Review this medication order:

MEDICATION ORDER:
- Medication: ${order.medicationName} ${order.strength}
- Form: ${order.dosageForm}
- Sig: ${order.sig || "MISSING"}
- Quantity: ${order.quantity || "MISSING"} ${order.quantityUnit || "(UNITS NOT SPECIFIED)"}
- Refills: ${order.refills !== undefined ? order.refills : "MISSING"}
- Days Supply: ${order.daysSupply || "MISSING"}
- Route: ${order.route || "MISSING"}
- Clinical Indication: ${order.clinicalIndication || "MISSING"}

PATIENT CONTEXT:
- Age: ${order.patientAge || "Unknown"}
- Weight: ${order.patientWeight ? order.patientWeight + " kg" : "Unknown"}
- Renal Function: ${order.renalFunction || "Unknown"}
- Hepatic Function: ${order.hepaticFunction || "Unknown"}
- Allergies: ${order.allergies?.join(", ") || "None documented"}
- Current Medications: ${order.currentMedications?.join(", ") || "None documented"}

IMPORTANT: 
1. For any field marked as 'MISSING', provide a recommended value in the missing_field_recommendations section based on the medication, indication, and patient context.
2. CRITICAL: If quantity is provided but doesn't match the days supply and sig (e.g., quantity 30 with sig "once daily" for 90 days supply), you MUST recommend the correct quantity in missing_field_recommendations. Calculate: (doses per day from sig) × (days supply) = correct quantity.
3. CRITICAL SAFETY: If quantity units are not specified, you MUST determine the appropriate unit based on the medication form. NEVER allow ambiguous quantities for injections, insulin, or liquid medications. For example:
   - Tablets/Capsules: "tablets" or "capsules"
   - Insulin: "mL" or "units" or "pens" or "vials"
   - Other injections: "mL" or "vials"
   - Liquids: "mL"
   - Creams/Ointments: "grams" or "tubes"
   - Inhalers: "inhalers"
   - Patches: "patches"

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
  "missing_field_recommendations": {
    "sig": "Recommended sig if missing (e.g., 'Take 1 tablet by mouth once daily')",
    "quantity": recommended quantity number if missing OR if current quantity doesn't match the days supply and sig - calculate the correct quantity based on sig and days supply (e.g., if sig is once daily and days supply is 90, quantity should be 90),
    "quantity_unit": "ALWAYS provide the appropriate unit for the quantity based on the medication form (e.g., 'tablets', 'mL', 'units', 'pens', 'vials', 'grams', 'inhalers')",
    "refills": recommended refills number if missing (e.g., 5),
    "daysSupply": recommended days supply if missing (e.g., 30),
    "route": "Recommended route if missing (e.g., 'oral')",
    "clinicalIndication": "Recommended indication if missing (e.g., 'Hypertension')"
  },
  "pharmacy_notes": "Additional notes for the pharmacist"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert clinical pharmacist performing prescription validation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent validation
        max_tokens: 30000,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error("No response from GPT");
      }

      const gptValidation = JSON.parse(response);
      
      // Add safety check for dangerous medication-form combinations
      const formAllowed = MedicationFormularyService.isFormAllowed(
        order.medicationName,
        order.dosageForm
      );
      
      if (!formAllowed) {
        const defaultForm = MedicationFormularyService.getDefaultForm(
          order.medicationName,
          order.route
        );
        
        // Add critical safety error
        gptValidation.compliance.errors.unshift(
          `CRITICAL SAFETY: ${order.medicationName} cannot be ${order.dosageForm}. Should be ${defaultForm}.`
        );
        
        // Add to warnings if not already present
        if (!gptValidation.safety_assessment.specific_concerns.includes('dangerous form')) {
          gptValidation.safety_assessment.specific_concerns += 
            ` DANGEROUS FORM: ${order.medicationName} ${order.dosageForm} is medically impossible and dangerous.`;
        }
      }

      // Calculate days supply if not provided
      let calculatedDaysSupply = order.daysSupply;
      if (!calculatedDaysSupply && gptValidation.calculated_days_supply) {
        calculatedDaysSupply = gptValidation.calculated_days_supply;
      }

      // Combine basic and GPT validation results
      const result: PharmacyValidationResult = {
        isValid:
          gptValidation.validation_passed &&
          basicValidation.errors.length === 0,
        errors: [
          ...basicValidation.errors,
          ...(gptValidation.critical_errors || []),
        ],
        warnings: [
          ...basicValidation.warnings,
          ...(gptValidation.warnings || []),
          ...(gptValidation.interaction_check?.significant_interactions || []),
        ],
        suggestions: gptValidation.suggestions || [],
        calculatedDaysSupply,
        insuranceConsiderations: gptValidation.insurance_considerations || [],
        deaSchedule:
          gptValidation.dea_schedule !== "None"
            ? gptValidation.dea_schedule
            : undefined,
        priorAuthRequired:
          gptValidation.prior_auth_likely ||
          basicValidation.pharmacyRequirements.includes(
            "Prior authorization likely required",
          ),
        alternativeSuggestions: gptValidation.alternative_suggestions || [],
        missingFieldRecommendations:
          gptValidation.missing_field_recommendations || {},
      };

      // Add dosing concerns to warnings if any
      if (
        gptValidation.dosing_assessment &&
        !gptValidation.dosing_assessment.appropriate_for_indication
      ) {
        result.warnings.push(
          gptValidation.dosing_assessment.specific_concerns ||
            "Dosing may not be appropriate for indication",
        );
      }

      console.log(`✅ [PharmacyValidation] Validation complete:`, {
        valid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });

      return result;
    } catch (error) {
      console.error(`❌ [PharmacyValidation] Error validating order:`, error);

      // Return minimal validation result if GPT fails
      return {
        isValid: false,
        errors: ["Validation service temporarily unavailable"],
        warnings: ["Manual pharmacy review required"],
        suggestions: [
          "Please have pharmacist manually review this prescription",
        ],
        insuranceConsiderations: [],
      };
    }
  }

  /**
   * Calculate days supply from sig and quantity
   */
  async calculateDaysSupply(
    sig: string,
    quantity: number,
    dosageForm: string,
  ): Promise<number> {
    try {
      const prompt = `As a pharmacist, calculate the days supply for this prescription:
Sig: ${sig}
Quantity: ${quantity} ${dosageForm}

Return ONLY a number representing the days supply.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
        max_tokens: 100,
      });

      const response = completion.choices[0].message.content;
      const daysSupply = parseInt(response?.trim() || "0");

      return daysSupply > 0 ? daysSupply : 30; // Default to 30 if calculation fails
    } catch (error) {
      console.error(
        `❌ [PharmacyValidation] Error calculating days supply:`,
        error,
      );
      return 30; // Default
    }
  }

  /**
   * Suggest appropriate refills based on medication type and indication
   */
  suggestRefills(
    medicationName: string,
    clinicalIndication: string,
    isControlled: boolean,
  ): number {
    // Controlled substances
    if (isControlled) {
      return 0; // No refills for Schedule II, limited for III-V
    }

    // Antibiotics
    if (medicationName.match(/cillin|cycline|mycin|floxacin|azole|cef/i)) {
      return 0; // Usually no refills for antibiotics
    }

    // Chronic conditions
    if (
      clinicalIndication?.match(
        /hypertension|diabetes|hyperlipidemia|hypothyroid|depression|anxiety/i,
      )
    ) {
      return 5; // 6 months of refills for chronic conditions
    }

    // Default
    return 2; // 3 months total
  }
}

// Export singleton instance
export const pharmacyValidation = new PharmacyValidationService();
