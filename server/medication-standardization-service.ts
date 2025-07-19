/**
 * Medication Standardization Service
 * 
 * Handles proper parsing and standardization of medication names according to EMR standards
 * Used by both AI-parsed orders and manual entry to ensure consistency
 */

import { MedicationFormularyService } from './medication-formulary-service';

export interface StandardizedMedication {
  medicationName: string;        // Clean medication name (e.g., "Montelukast")
  brandName?: string;           // Brand name if applicable (e.g., "Singulair")
  genericName?: string;         // Generic name if different from medication name
  strength: string;             // Standardized strength (e.g., "10 mg")
  dosageForm: string;          // Standardized form (e.g., "tablet")
  route: string;               // Standardized route (e.g., "oral")
  sig: string;                 // Patient instructions
  quantity: number;            // Quantity to dispense
  quantityUnit: string;        // Unit for quantity (e.g., "tablets", "mL", "inhalers") - REQUIRED for safety
  refills: number;             // Number of refills
  daysSupply: number;          // Days supply
  clinicalIndication?: string; // Why prescribed
  diagnosisCode?: string;      // ICD-10 code
  requiresPriorAuth?: boolean; // Prior auth required
  rxNormCode?: string;         // RxNorm concept ID
  ndcCode?: string;           // National Drug Code
}

export class MedicationStandardizationService {
  
  /**
   * Parse and standardize medication from AI-extracted text
   * Handles cases like "Montelukast 10 mg tablet" or "HCTZ 25mg tablet"
   */
  static standardizeMedicationFromAI(rawMedicationName: string, rawDosage?: string, rawForm?: string, rawRoute?: string): Partial<StandardizedMedication> {
    console.log(`🔧 [MedStandardization] Standardizing AI medication: "${rawMedicationName}", dosage: "${rawDosage}", form: "${rawForm}"`);
    
    let medicationName = rawMedicationName;
    let strength = rawDosage || '';
    let dosageForm = rawForm || '';
    let route = rawRoute || 'oral';
    
    // Parse compound medication name that includes strength and form
    const compoundPattern = /^([A-Za-z\s]+?)\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|units?|IU|%)?)\s*(tablet|capsule|liquid|injection|cream|ointment|patch|inhaler|drops)?$/i;
    const match = rawMedicationName.match(compoundPattern);
    
    if (match) {
      medicationName = match[1].trim();
      const extractedStrength = match[2].trim();
      const extractedForm = match[3]?.toLowerCase();
      
      // Use extracted strength if no separate dosage provided
      if (!rawDosage || rawDosage === extractedStrength) {
        strength = extractedStrength;
      }
      
      // Use extracted form if no separate form provided  
      if (!rawForm && extractedForm) {
        dosageForm = extractedForm;
      }
      
      console.log(`🔧 [MedStandardization] Parsed compound name: "${medicationName}" + "${strength}" + "${dosageForm}"`);
    }
    
    // Standardize medication name (proper case)
    medicationName = this.standardizeMedicationName(medicationName);
    
    // Standardize strength format
    strength = this.standardizeStrength(strength);
    
    // Standardize dosage form with intelligent defaults
    dosageForm = this.standardizeDosageForm(dosageForm, medicationName, route);
    
    // Standardize route
    route = this.standardizeRoute(route);
    
    const result = {
      medicationName,
      strength,
      dosageForm,
      route
    };
    
    console.log(`🔧 [MedStandardization] Standardized result:`, result);
    return result;
  }

  /**
   * Fix AI-generated sig instructions to use dosage form count instead of strength
   * Converts "Take 25 mg by mouth once daily" to "Take 1 tablet by mouth once daily"
   */
  static standardizeSigInstruction(rawSig: string, dosageForm: string, strength: string): string {
    if (!rawSig || !dosageForm) return rawSig;
    
    console.log(`🔧 [SigStandardization] Input: "${rawSig}", form: "${dosageForm}", strength: "${strength}"`);
    
    // Pattern to match strength-based sig instructions
    const strengthPattern = /take\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units?|IU|%)\s+by\s+mouth/i;
    const match = rawSig.match(strengthPattern);
    
    if (match) {
      const mentionedStrength = match[1] + ' ' + match[2];
      
      // Check if mentioned strength matches medication strength
      if (strength.toLowerCase().includes(mentionedStrength.toLowerCase())) {
        // Replace with "1 [dosage form]" for standard single-unit dosing
        const standardizedSig = rawSig.replace(strengthPattern, `Take 1 ${dosageForm} by mouth`);
        console.log(`🔧 [SigStandardization] Converted: "${rawSig}" → "${standardizedSig}"`);
        return standardizedSig;
      }
    }
    
    // Handle other routes (topical, etc.)
    const topicalPattern = /apply\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units?|IU|%)\s+topically/i;
    const topicalMatch = rawSig.match(topicalPattern);
    
    if (topicalMatch) {
      const mentionedStrength = topicalMatch[1] + ' ' + topicalMatch[2];
      
      if (strength.toLowerCase().includes(mentionedStrength.toLowerCase())) {
        const standardizedSig = rawSig.replace(topicalPattern, `Apply 1 ${dosageForm} topically`);
        console.log(`🔧 [SigStandardization] Converted topical: "${rawSig}" → "${standardizedSig}"`);
        return standardizedSig;
      }
    }
    
    // Return original if no standardization needed
    return rawSig;
  }
  
  /**
   * Standardize medication name to proper case
   */
  private static standardizeMedicationName(name: string): string {
    if (!name) return '';
    
    // Handle common abbreviations and brand names
    const commonMedications: { [key: string]: string } = {
      'hctz': 'Hydrochlorothiazide',
      'lisinopril': 'Lisinopril',
      'montelukast': 'Montelukast',
      'singulair': 'Montelukast', // Brand to generic
      'metformin': 'Metformin',
      'glucophage': 'Metformin',
      'amlodipine': 'Amlodipine',
      'norvasc': 'Amlodipine',
      'atorvastatin': 'Atorvastatin',
      'lipitor': 'Atorvastatin',
      'simvastatin': 'Simvastatin',
      'zocor': 'Simvastatin'
    };
    
    const normalizedName = name.toLowerCase().trim();
    if (commonMedications[normalizedName]) {
      return commonMedications[normalizedName];
    }
    
    // Default to proper case
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Standardize strength format (e.g., "10mg" -> "10 mg")
   */
  private static standardizeStrength(strength: string): string {
    if (!strength) return '';
    
    // Add space between number and unit if missing
    return strength.replace(/(\d+(?:\.\d+)?)(mg|mcg|g|mL|units?|IU|%)/gi, '$1 $2')
                  .replace(/\s+/g, ' ')
                  .trim();
  }
  
  /**
   * Standardize dosage form with intelligent defaults
   */
  private static standardizeDosageForm(form: string, medicationName?: string, route?: string): string {
    // Get intelligent default from formulary if no form provided
    if (!form && medicationName) {
      const intelligentDefault = MedicationFormularyService.getDefaultForm(medicationName, route);
      console.log(`💊 [MedicationStandardization] No form provided for ${medicationName}, using intelligent default: ${intelligentDefault}`);
      return intelligentDefault;
    }
    
    if (!form) return 'solution'; // Safest generic default (not tablet!)
    
    const formMap: { [key: string]: string } = {
      'tab': 'tablet',
      'tabs': 'tablet',
      'cap': 'capsule',
      'caps': 'capsule',
      'sol': 'solution',
      'susp': 'suspension',
      'inj': 'injection',
      'top': 'topical',
      'inh': 'inhaler'
    };
    
    const normalizedForm = form.toLowerCase().trim();
    return formMap[normalizedForm] || normalizedForm;
  }
  
  /**
   * Standardize route of administration
   */
  private static standardizeRoute(route: string): string {
    if (!route) return 'oral';
    
    const routeMap: { [key: string]: string } = {
      'po': 'oral',
      'by mouth': 'oral',
      'orally': 'oral',
      'topical': 'topical',
      'top': 'topical',
      'im': 'injection',
      'iv': 'injection',
      'sq': 'injection',
      'subq': 'injection',
      'subcutaneous': 'injection',
      'intramuscular': 'injection',
      'intravenous': 'injection',
      'inh': 'inhalation',
      'inhaled': 'inhalation'
    };
    
    const normalizedRoute = route.toLowerCase().trim();
    return routeMap[normalizedRoute] || normalizedRoute;
  }
  
  /**
   * Validate medication data for completeness
   */
  static validateMedication(med: Partial<StandardizedMedication>): { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[];
    pharmacyRequirements: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pharmacyRequirements: string[] = [];
    
    // REQUIRED FIELDS - Pharmacy will reject without these
    if (!med.medicationName) {
      errors.push('Medication name is required');
    }
    
    if (!med.strength) {
      errors.push('Strength/dosage is required');
    }
    
    if (!med.dosageForm) {
      errors.push('Dosage form is required (tablet, capsule, liquid, etc.)');
    }
    
    if (!med.sig) {
      errors.push('Sig (patient instructions) is required for pharmacy');
    } else {
      // Validate sig completeness
      const sigLower = med.sig.toLowerCase();
      if (!sigLower.includes('take') && !sigLower.includes('apply') && !sigLower.includes('inject') && !sigLower.includes('inhale')) {
        warnings.push('Sig should start with action verb (Take, Apply, Inject, Inhale, etc.)');
      }
      if (!sigLower.match(/\b(daily|twice|three times|four times|every|prn|as needed|hours|days)\b/)) {
        warnings.push('Sig should include frequency (daily, twice daily, every X hours, etc.)');
      }
    }
    
    if (!med.quantity || med.quantity <= 0) {
      errors.push('Quantity to dispense is required');
    } else if (med.quantity > 360) {
      warnings.push('Quantity exceeds typical 90-day supply limits - may require prior auth');
    }
    
    // CRITICAL SAFETY: Quantity unit is required to prevent dangerous ambiguity
    if (!med.quantityUnit) {
      errors.push('Quantity unit is required (e.g., tablets, mL, inhalers) - ambiguous quantities are dangerous');
    }
    
    if (med.refills === undefined || med.refills < 0) {
      errors.push('Number of refills is required (use 0 for no refills)');
    } else if (med.refills > 11) {
      errors.push('Maximum 11 refills allowed per federal law');
    }
    
    // Days Supply validation
    if (!med.daysSupply || med.daysSupply <= 0) {
      errors.push('Days supply is required for insurance billing');
    } else if (med.daysSupply > 90) {
      warnings.push('Days supply >90 may require special insurance approval');
    }
    
    // Route validation
    if (!med.route) {
      errors.push('Route of administration is required');
    }
    
    // Clinical indication for certain medications
    if (!med.clinicalIndication) {
      warnings.push('Clinical indication recommended for audit compliance');
    }
    
    // Controlled substance checks
    if (med.medicationName) {
      const controlledSubstances = [
        'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'codeine',
        'alprazolam', 'lorazepam', 'clonazepam', 'diazepam',
        'adderall', 'ritalin', 'methylphenidate', 'amphetamine',
        'tramadol', 'gabapentin' // Schedule V in some states
      ];
      
      const isControlled = controlledSubstances.some(drug => 
        med.medicationName!.toLowerCase().includes(drug)
      );
      
      if (isControlled) {
        pharmacyRequirements.push('Controlled substance - DEA number required');
        pharmacyRequirements.push('Electronic prescribing required in most states');
        if (med.refills && med.refills > 5) {
          errors.push('Controlled substances (Schedule III-V) limited to 5 refills');
        }
        if (med.daysSupply && med.daysSupply > 30) {
          warnings.push('Controlled substances typically limited to 30-day supply');
        }
      }
    }
    
    // Prior authorization common medications
    const priorAuthMeds = [
      'humira', 'enbrel', 'remicade', 'stelara', 'cosentyx',
      'ozempic', 'wegovy', 'mounjaro', 'jardiance',
      'eliquis', 'xarelto', 'pradaxa'
    ];
    
    if (med.medicationName && priorAuthMeds.some(drug => 
      med.medicationName!.toLowerCase().includes(drug)
    )) {
      pharmacyRequirements.push('Prior authorization likely required');
      med.requiresPriorAuth = true;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      pharmacyRequirements
    };
  }
  
  /**
   * Format medication for display in EMR interface
   */
  static formatMedicationDisplay(med: Partial<StandardizedMedication>): {
    primaryName: string;
    strengthAndForm: string;
    fullDescription: string;
  } {
    const primaryName = med.medicationName || 'Unknown Medication';
    const strengthAndForm = `${med.strength || ''} ${med.dosageForm || ''}`.trim();
    const route = med.route && med.route !== 'oral' ? ` - ${med.route}` : '';
    const fullDescription = `${primaryName} ${strengthAndForm}${route}`.trim();
    
    return {
      primaryName,
      strengthAndForm,
      fullDescription
    };
  }
}