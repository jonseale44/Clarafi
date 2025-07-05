/**
 * Medication Formulary Service
 * Provides intelligent medication form defaults and validation
 * to prevent dangerous errors like "insulin tablet"
 */

interface MedicationFormularyEntry {
  medication: string;
  allowedForms: string[];
  defaultForm: string;
  route: string;
  class: string;
  isHighAlert?: boolean;
}

class MedicationFormularyService {
  private static medicationFormulary: Map<string, MedicationFormularyEntry> = new Map();
  private static medicationClassDefaults: Map<string, string> = new Map();
  
  static {
    // Initialize medication class defaults
    this.initializeClassDefaults();
    // Initialize specific medication entries
    this.initializeMedicationFormulary();
  }
  
  /**
   * Initialize default forms by medication class
   */
  private static initializeClassDefaults() {
    // Injectable medications
    this.medicationClassDefaults.set('insulin', 'injection');
    this.medicationClassDefaults.set('vaccine', 'injection');
    this.medicationClassDefaults.set('biologic', 'injection');
    this.medicationClassDefaults.set('anticoagulant_injectable', 'injection');
    
    // Oral medications (common default)
    this.medicationClassDefaults.set('ace_inhibitor', 'tablet');
    this.medicationClassDefaults.set('arb', 'tablet');
    this.medicationClassDefaults.set('beta_blocker', 'tablet');
    this.medicationClassDefaults.set('statin', 'tablet');
    this.medicationClassDefaults.set('antibiotic_oral', 'tablet');
    this.medicationClassDefaults.set('ssri', 'tablet');
    this.medicationClassDefaults.set('ppi', 'capsule');
    
    // Topical medications
    this.medicationClassDefaults.set('corticosteroid_topical', 'cream');
    this.medicationClassDefaults.set('antifungal_topical', 'cream');
    
    // Inhalers
    this.medicationClassDefaults.set('bronchodilator', 'inhaler');
    this.medicationClassDefaults.set('corticosteroid_inhaled', 'inhaler');
    
    // Liquid medications
    this.medicationClassDefaults.set('antibiotic_suspension', 'suspension');
    this.medicationClassDefaults.set('cough_syrup', 'liquid');
  }
  
  /**
   * Initialize specific medication formulary entries
   */
  private static initializeMedicationFormulary() {
    // Insulin products - MUST be injections
    const insulinProducts = [
      'insulin', 'glargine', 'lantus', 'basaglar', 'toujeo',
      'detemir', 'levemir', 'degludec', 'tresiba',
      'aspart', 'novolog', 'lispro', 'humalog', 'admelog',
      'glulisine', 'apidra', 'regular insulin', 'humulin', 'novolin'
    ];
    
    insulinProducts.forEach(insulin => {
      this.medicationFormulary.set(insulin.toLowerCase(), {
        medication: insulin,
        allowedForms: ['injection', 'pen', 'vial', 'cartridge'],
        defaultForm: 'injection',
        route: 'subcutaneous',
        class: 'insulin',
        isHighAlert: true
      });
    });
    
    // Anticoagulants - Injectable
    const anticoagulantsInjectable = [
      'heparin', 'enoxaparin', 'lovenox', 'dalteparin', 'fragmin',
      'fondaparinux', 'arixtra'
    ];
    
    anticoagulantsInjectable.forEach(med => {
      this.medicationFormulary.set(med.toLowerCase(), {
        medication: med,
        allowedForms: ['injection'],
        defaultForm: 'injection',
        route: 'subcutaneous',
        class: 'anticoagulant_injectable',
        isHighAlert: true
      });
    });
    
    // Common oral medications with specific forms
    this.medicationFormulary.set('metformin', {
      medication: 'metformin',
      allowedForms: ['tablet', 'tablet extended release'],
      defaultForm: 'tablet',
      route: 'oral',
      class: 'antidiabetic'
    });
    
    this.medicationFormulary.set('omeprazole', {
      medication: 'omeprazole',
      allowedForms: ['capsule', 'capsule delayed release'],
      defaultForm: 'capsule delayed release',
      route: 'oral',
      class: 'ppi'
    });
    
    // Inhalers
    const inhalers = [
      'albuterol', 'ventolin', 'proair', 'proventil',
      'budesonide', 'pulmicort', 'symbicort',
      'fluticasone', 'flovent', 'advair',
      'tiotropium', 'spiriva'
    ];
    
    inhalers.forEach(med => {
      this.medicationFormulary.set(med.toLowerCase(), {
        medication: med,
        allowedForms: ['inhaler', 'nebulizer solution'],
        defaultForm: 'inhaler',
        route: 'inhalation',
        class: 'bronchodilator'
      });
    });
    
    // Topical medications
    this.medicationFormulary.set('hydrocortisone', {
      medication: 'hydrocortisone',
      allowedForms: ['cream', 'ointment', 'lotion', 'tablet'],
      defaultForm: 'cream', // Most common for hydrocortisone
      route: 'topical',
      class: 'corticosteroid_topical'
    });
  }
  
  /**
   * Get intelligent default form for a medication
   */
  static getDefaultForm(medicationName: string, route?: string): string {
    if (!medicationName) return 'solution'; // Safest generic default
    
    const medNameLower = medicationName.toLowerCase();
    
    // First check specific medication formulary
    let formularyDefault: string | null = null;
    this.medicationFormulary.forEach((entry, key) => {
      if (medNameLower.includes(key) && !formularyDefault) {
        formularyDefault = entry.defaultForm;
      }
    });
    if (formularyDefault) return formularyDefault;
    
    // Check for class indicators in medication name
    if (medNameLower.includes('insulin') || medNameLower.includes('glargine') || 
        medNameLower.includes('aspart') || medNameLower.includes('lispro')) {
      return 'injection';
    }
    
    if (medNameLower.includes('inhaler') || medNameLower.includes('hfa') || 
        medNameLower.includes('diskus') || medNameLower.includes('respimat')) {
      return 'inhaler';
    }
    
    if (medNameLower.includes('cream') || medNameLower.includes('ointment') || 
        medNameLower.includes('gel') || medNameLower.includes('lotion')) {
      return medNameLower.match(/(cream|ointment|gel|lotion)/)?.[0] || 'topical';
    }
    
    if (medNameLower.includes('drops') || medNameLower.includes('ophthalmic')) {
      return 'drops';
    }
    
    if (medNameLower.includes('patch')) {
      return 'patch';
    }
    
    if (medNameLower.includes('suspension') || medNameLower.includes('syrup') ||
        medNameLower.includes('elixir') || medNameLower.includes('solution')) {
      return medNameLower.match(/(suspension|syrup|elixir|solution)/)?.[0] || 'liquid';
    }
    
    // Route-based defaults
    if (route) {
      const routeLower = route.toLowerCase();
      if (routeLower.includes('subcut') || routeLower.includes('inject') || 
          routeLower.includes('iv') || routeLower.includes('im')) {
        return 'injection';
      }
      if (routeLower.includes('topical') || routeLower.includes('skin')) {
        return 'cream';
      }
      if (routeLower.includes('inhal')) {
        return 'inhaler';
      }
      if (routeLower.includes('ophthalmic') || routeLower.includes('eye')) {
        return 'drops';
      }
    }
    
    // Default to solution (liquid) as safest option
    // Solutions can be given multiple routes, tablets cannot
    return 'solution';
  }
  
  /**
   * Validate if a form is allowed for a medication
   */
  static isFormAllowed(medicationName: string, form: string): boolean {
    if (!medicationName || !form) return false;
    
    const medNameLower = medicationName.toLowerCase();
    const formLower = form.toLowerCase();
    
    // Check specific formulary entries
    for (const [key, entry] of this.medicationFormulary) {
      if (medNameLower.includes(key)) {
        return entry.allowedForms.some(f => f.toLowerCase() === formLower);
      }
    }
    
    // Critical safety check: Insulin can NEVER be oral
    if ((medNameLower.includes('insulin') || medNameLower.includes('glargine') ||
         medNameLower.includes('aspart') || medNameLower.includes('lispro')) &&
        (formLower.includes('tablet') || formLower.includes('capsule') || 
         formLower === 'oral' || formLower.includes('pill'))) {
      console.error(`🚨 [MedicationFormulary] CRITICAL SAFETY ERROR: Insulin cannot be ${form}`);
      return false;
    }
    
    // Inhalers cannot be tablets
    if ((medNameLower.includes('albuterol') || medNameLower.includes('budesonide') ||
         medNameLower.includes('fluticasone') || medNameLower.includes('tiotropium')) &&
        (formLower.includes('tablet') || formLower.includes('capsule'))) {
      return false;
    }
    
    // If not in formulary, allow but log for review
    console.log(`📋 [MedicationFormulary] Medication "${medicationName}" with form "${form}" not in formulary - allowing but should be reviewed`);
    return true;
  }
  
  /**
   * Get medication class for a medication
   */
  static getMedicationClass(medicationName: string): string | null {
    if (!medicationName) return null;
    
    const medNameLower = medicationName.toLowerCase();
    
    // Check specific formulary
    for (const [key, entry] of this.medicationFormulary) {
      if (medNameLower.includes(key)) {
        return entry.class;
      }
    }
    
    // Pattern matching for common classes
    if (medNameLower.includes('cillin') || medNameLower.includes('cycline') || 
        medNameLower.includes('mycin') || medNameLower.includes('floxacin')) {
      return 'antibiotic';
    }
    
    if (medNameLower.includes('pril') || medNameLower.includes('ace inhibitor')) {
      return 'ace_inhibitor';
    }
    
    if (medNameLower.includes('sartan')) {
      return 'arb';
    }
    
    if (medNameLower.includes('olol') || medNameLower.includes('beta blocker')) {
      return 'beta_blocker';
    }
    
    if (medNameLower.includes('statin')) {
      return 'statin';
    }
    
    if (medNameLower.includes('prazole')) {
      return 'ppi';
    }
    
    return null;
  }
  
  /**
   * Check if medication is high alert
   */
  static isHighAlert(medicationName: string): boolean {
    if (!medicationName) return false;
    
    const medNameLower = medicationName.toLowerCase();
    
    // Check formulary
    for (const [key, entry] of this.medicationFormulary) {
      if (medNameLower.includes(key) && entry.isHighAlert) {
        return true;
      }
    }
    
    // Pattern matching for high alert medications
    const highAlertPatterns = [
      'insulin', 'heparin', 'warfarin', 'methotrexate', 'chemotherapy',
      'narcotic', 'opioid', 'morphine', 'fentanyl', 'hydromorphone'
    ];
    
    return highAlertPatterns.some(pattern => medNameLower.includes(pattern));
  }
}

export { MedicationFormularyService };