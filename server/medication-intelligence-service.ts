/**
 * Medication Intelligence Service
 * 
 * Provides intelligent medication suggestions, validations, and automatic updates
 * Based on real-world medication databases and clinical decision support
 */

export interface MedicationIntelligence {
  // Standard strengths available for this medication
  availableStrengths: string[];
  
  // Available dosage forms for this medication
  availableForms: string[];
  
  // Standard routes for each form
  formRouteMapping: { [form: string]: string[] };
  
  // Standard sig templates for this medication
  standardSigs: {
    strength: string;
    form: string;
    route: string;
    frequency: string;
    sig: string;
  }[];
  
  // Clinical information
  therapeuticClass: string;
  indication: string;
  commonDoses: string[];
  maxDailyDose?: string;
  
  // Pharmacy information
  requiresPriorAuth: boolean;
  isControlled: boolean;
  brandNames: string[];
  
  // Contraindications and warnings
  blackBoxWarning?: string;
  ageRestrictions?: string;
  renalAdjustment?: boolean;
  hepaticAdjustment?: boolean;
}

export class MedicationIntelligenceService {
  
  /**
   * Get comprehensive medication intelligence for a given medication
   */
  static getMedicationIntelligence(medicationName: string): MedicationIntelligence | null {
    const normalizedName = medicationName.toLowerCase().trim();
    
    // Comprehensive medication database with real-world clinical data
    const medicationDatabase: { [key: string]: MedicationIntelligence } = {
      'hydrochlorothiazide': {
        availableStrengths: ['12.5 mg', '25 mg', '50 mg'],
        availableForms: ['tablet', 'capsule'],
        formRouteMapping: {
          'tablet': ['oral'],
          'capsule': ['oral']
        },
        standardSigs: [
          { strength: '12.5 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '25 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '25 mg', form: 'tablet', route: 'oral', frequency: 'twice daily', sig: 'Take 1 tablet by mouth twice daily' },
          { strength: '50 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' }
        ],
        therapeuticClass: 'Thiazide Diuretic',
        indication: 'Hypertension, Edema',
        commonDoses: ['25 mg once daily', '50 mg once daily'],
        maxDailyDose: '100 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Microzide'],
        renalAdjustment: true
      },
      
      'lisinopril': {
        availableStrengths: ['2.5 mg', '5 mg', '10 mg', '20 mg', '30 mg', '40 mg'],
        availableForms: ['tablet'],
        formRouteMapping: {
          'tablet': ['oral']
        },
        standardSigs: [
          { strength: '2.5 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '5 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '10 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '20 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '40 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' }
        ],
        therapeuticClass: 'ACE Inhibitor',
        indication: 'Hypertension, Heart Failure, Post-MI',
        commonDoses: ['10 mg once daily', '20 mg once daily'],
        maxDailyDose: '40 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Prinivil', 'Zestril'],
        renalAdjustment: true
      },
      
      'aspirin': {
        availableStrengths: ['81 mg', '325 mg', '500 mg', '650 mg'],
        availableForms: ['tablet', 'chewable tablet', 'enteric-coated tablet'],
        formRouteMapping: {
          'tablet': ['oral'],
          'chewable tablet': ['oral'],
          'enteric-coated tablet': ['oral']
        },
        standardSigs: [
          { strength: '81 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily' },
          { strength: '81 mg', form: 'chewable tablet', route: 'oral', frequency: 'once daily', sig: 'Chew 1 tablet by mouth once daily' },
          { strength: '325 mg', form: 'tablet', route: 'oral', frequency: 'every 6 hours', sig: 'Take 1 tablet by mouth every 6 hours as needed for pain' },
          { strength: '325 mg', form: 'enteric-coated tablet', route: 'oral', frequency: 'twice daily', sig: 'Take 1 enteric-coated tablet by mouth twice daily' }
        ],
        therapeuticClass: 'Antiplatelet/NSAID',
        indication: 'Cardioprotection, Pain Relief, Anti-inflammatory',
        commonDoses: ['81 mg once daily', '325 mg twice daily'],
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Bayer', 'Ecotrin', 'Bufferin']
      },
      
      'montelukast': {
        availableStrengths: ['4 mg', '5 mg', '10 mg'],
        availableForms: ['tablet', 'chewable tablet', 'granules'],
        formRouteMapping: {
          'tablet': ['oral'],
          'chewable tablet': ['oral'],
          'granules': ['oral']
        },
        standardSigs: [
          { strength: '4 mg', form: 'chewable tablet', route: 'oral', frequency: 'once daily', sig: 'Chew 1 tablet by mouth once daily in the evening' },
          { strength: '5 mg', form: 'chewable tablet', route: 'oral', frequency: 'once daily', sig: 'Chew 1 tablet by mouth once daily in the evening' },
          { strength: '10 mg', form: 'tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 tablet by mouth once daily in the evening' }
        ],
        therapeuticClass: 'Leukotriene Receptor Antagonist',
        indication: 'Asthma, Allergic Rhinitis',
        commonDoses: ['10 mg once daily (adults)', '5 mg once daily (children 6-14)', '4 mg once daily (children 2-5)'],
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Singulair'],
        blackBoxWarning: 'Neuropsychiatric events including agitation, aggression, anxiousness, dream abnormalities, hallucinations, depression, insomnia, irritability, restlessness, suicidal thinking and behavior, and tremor'
      },
      
      'metformin': {
        availableStrengths: ['500 mg', '850 mg', '1000 mg'],
        availableForms: ['tablet', 'extended-release tablet'],
        formRouteMapping: {
          'tablet': ['oral'],
          'extended-release tablet': ['oral']
        },
        standardSigs: [
          { strength: '500 mg', form: 'tablet', route: 'oral', frequency: 'twice daily', sig: 'Take 1 tablet by mouth twice daily with meals' },
          { strength: '850 mg', form: 'tablet', route: 'oral', frequency: 'twice daily', sig: 'Take 1 tablet by mouth twice daily with meals' },
          { strength: '1000 mg', form: 'tablet', route: 'oral', frequency: 'twice daily', sig: 'Take 1 tablet by mouth twice daily with meals' },
          { strength: '500 mg', form: 'extended-release tablet', route: 'oral', frequency: 'once daily', sig: 'Take 1 extended-release tablet by mouth once daily with dinner' }
        ],
        therapeuticClass: 'Biguanide Antidiabetic',
        indication: 'Type 2 Diabetes Mellitus',
        commonDoses: ['500 mg twice daily', '1000 mg twice daily'],
        maxDailyDose: '2550 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Glucophage', 'Fortamet'],
        renalAdjustment: true
      }
    };
    
    return medicationDatabase[normalizedName] || null;
  }
  
  /**
   * Auto-generate appropriate sig based on medication, strength, form, and route
   */
  static generateSigFromComponents(medicationName: string, strength: string, form: string, route: string, frequency?: string): string {
    const intelligence = this.getMedicationIntelligence(medicationName);
    
    if (intelligence) {
      // Find matching standard sig
      const matchingSig = intelligence.standardSigs.find(sig => 
        sig.strength === strength && 
        sig.form === form && 
        sig.route === route &&
        (!frequency || sig.frequency === frequency)
      );
      
      if (matchingSig) {
        return matchingSig.sig;
      }
      
      // If no exact match, generate based on form and route
      return this.generateGenericSig(form, route, frequency || 'once daily');
    }
    
    // Fallback for unknown medications
    return this.generateGenericSig(form, route, frequency || 'once daily');
  }
  
  /**
   * Extract components from a sig instruction
   */
  static extractComponentsFromSig(sig: string): { frequency?: string; route?: string; form?: string; timing?: string } {
    const components: any = {};
    
    // Extract frequency
    if (sig.includes('once daily') || sig.includes('daily')) components.frequency = 'once daily';
    else if (sig.includes('twice daily') || sig.includes('two times daily')) components.frequency = 'twice daily';
    else if (sig.includes('three times daily') || sig.includes('every 8 hours')) components.frequency = 'three times daily';
    else if (sig.includes('four times daily') || sig.includes('every 6 hours')) components.frequency = 'four times daily';
    else if (sig.includes('every 12 hours')) components.frequency = 'twice daily';
    
    // Extract route
    if (sig.includes('by mouth') || sig.includes('orally')) components.route = 'oral';
    else if (sig.includes('topically') || sig.includes('to skin')) components.route = 'topical';
    else if (sig.includes('in eye') || sig.includes('ophthalmic')) components.route = 'ophthalmic';
    
    // Extract form hints
    if (sig.includes('tablet')) components.form = 'tablet';
    else if (sig.includes('capsule')) components.form = 'capsule';
    else if (sig.includes('chew')) components.form = 'chewable tablet';
    else if (sig.includes('apply')) components.form = 'cream';
    
    // Extract timing
    if (sig.includes('with meals') || sig.includes('with food')) components.timing = 'with meals';
    else if (sig.includes('before meals')) components.timing = 'before meals';
    else if (sig.includes('in the evening') || sig.includes('at bedtime')) components.timing = 'evening';
    else if (sig.includes('in the morning')) components.timing = 'morning';
    
    return components;
  }
  
  /**
   * Generate generic sig instruction
   */
  private static generateGenericSig(form: string, route: string, frequency: string): string {
    const action = this.getActionForForm(form);
    const routeText = this.getRouteText(route);
    const frequencyText = this.getFrequencyText(frequency);
    
    return `${action} 1 ${form} ${routeText} ${frequencyText}`;
  }
  
  private static getActionForForm(form: string): string {
    if (form.includes('chew')) return 'Chew';
    if (form.includes('cream') || form.includes('ointment') || form.includes('gel')) return 'Apply';
    if (form.includes('drop')) return 'Instill';
    if (form.includes('patch')) return 'Apply';
    return 'Take';
  }
  
  private static getRouteText(route: string): string {
    switch (route) {
      case 'oral': return 'by mouth';
      case 'topical': return 'topically';
      case 'ophthalmic': return 'in eye';
      case 'otic': return 'in ear';
      case 'nasal': return 'in nose';
      case 'rectal': return 'rectally';
      case 'transdermal': return 'topically';
      default: return 'by mouth';
    }
  }
  
  private static getFrequencyText(frequency: string): string {
    switch (frequency) {
      case 'once daily': return 'once daily';
      case 'twice daily': return 'twice daily';
      case 'three times daily': return 'three times daily';
      case 'four times daily': return 'four times daily';
      case 'every 6 hours': return 'every 6 hours';
      case 'every 8 hours': return 'every 8 hours';
      case 'every 12 hours': return 'every 12 hours';
      case 'as needed': return 'as needed';
      default: return 'once daily';
    }
  }
  
  /**
   * Validate if a medication combination is clinically appropriate
   */
  static validateMedicationCombination(medicationName: string, strength: string, form: string, route: string): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const intelligence = this.getMedicationIntelligence(medicationName);
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (!intelligence) {
      return {
        isValid: true,
        warnings: ['Medication not in database - please verify manually'],
        suggestions: []
      };
    }
    
    // Validate strength
    if (!intelligence.availableStrengths.includes(strength)) {
      warnings.push(`${strength} is not a standard strength for ${medicationName}`);
      suggestions.push(`Available strengths: ${intelligence.availableStrengths.join(', ')}`);
    }
    
    // Validate form
    if (!intelligence.availableForms.includes(form)) {
      warnings.push(`${form} is not available for ${medicationName}`);
      suggestions.push(`Available forms: ${intelligence.availableForms.join(', ')}`);
    }
    
    // Validate route for form
    if (intelligence.formRouteMapping[form] && !intelligence.formRouteMapping[form].includes(route)) {
      warnings.push(`${route} route is not appropriate for ${form} form`);
      suggestions.push(`Appropriate routes for ${form}: ${intelligence.formRouteMapping[form].join(', ')}`);
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }
}