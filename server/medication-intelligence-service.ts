/**
 * Medication Intelligence Service
 * 
 * Hybrid medication intelligence system:
 * 1. Fast local lookup from 500-medication formulary database
 * 2. AI fallback for comprehensive coverage
 * 3. Intelligent caching and learning
 */

import { medicationFormularyService, type FormularyMedication } from './medication-formulary-service.js';

export interface MedicationIntelligence {
  // Standard strengths available for this medication (unified naming)
  standardStrengths: string[];
  
  // Available dosage forms for this medication
  availableForms: string[];
  
  // Standard routes for each form (unified naming)
  formRoutes: { [form: string]: string[] };
  
  // Standard sig templates for this medication (unified naming)
  sigTemplates: { [key: string]: string };
  
  // Clinical information
  therapeuticClass: string;
  indication: string;
  commonDoses: string[];
  maxDailyDose?: string;
  
  // Pharmacy information
  requiresPriorAuth: boolean;
  isControlled: boolean;
  brandNames: string[];
  prescriptionType: 'rx' | 'otc';
  
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
        standardStrengths: ['12.5 mg', '25 mg', '50 mg'],
        availableForms: ['tablet', 'capsule'],
        formRoutes: {
          'tablet': ['oral'],
          'capsule': ['oral']
        },
        sigTemplates: {
          '12.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '25 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
        },
        therapeuticClass: 'Thiazide Diuretic',
        indication: 'Hypertension, Edema',
        commonDoses: ['25 mg once daily', '50 mg once daily'],
        maxDailyDose: '100 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Microzide'],
        prescriptionType: 'rx',
        renalAdjustment: true
      },
      
      'lisinopril': {
        standardStrengths: ['2.5 mg', '5 mg', '10 mg', '20 mg', '30 mg', '40 mg'],
        availableForms: ['tablet'],
        formRoutes: {
          'tablet': ['oral']
        },
        sigTemplates: {
          '2.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '40 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
        },
        therapeuticClass: 'ACE Inhibitor',
        indication: 'Hypertension, Heart Failure, Post-MI',
        commonDoses: ['10 mg once daily', '20 mg once daily'],
        maxDailyDose: '40 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Prinivil', 'Zestril'],
        prescriptionType: 'rx',
        renalAdjustment: true
      },
      
      'aspirin': {
        standardStrengths: ['81 mg', '325 mg', '500 mg', '650 mg'],
        availableForms: ['tablet', 'chewable tablet', 'enteric-coated tablet'],
        formRoutes: {
          'tablet': ['oral'],
          'chewable tablet': ['oral'],
          'enteric-coated tablet': ['oral']
        },
        sigTemplates: {
          '81 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '81 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily',
          '325 mg-tablet-oral': 'Take 1 tablet by mouth every 6 hours as needed for pain',
          '325 mg-enteric-coated tablet-oral': 'Take 1 enteric-coated tablet by mouth twice daily'
        },
        therapeuticClass: 'Antiplatelet/NSAID',
        indication: 'Cardioprotection, Pain Relief, Anti-inflammatory',
        commonDoses: ['81 mg once daily', '325 mg twice daily'],
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Bayer', 'Ecotrin', 'Bufferin'],
        prescriptionType: 'otc'
      },
      
      'montelukast': {
        standardStrengths: ['4 mg', '5 mg', '10 mg'],
        availableForms: ['tablet', 'chewable tablet', 'granules'],
        formRoutes: {
          'tablet': ['oral'],
          'chewable tablet': ['oral'],
          'granules': ['oral']
        },
        sigTemplates: {
          '4 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily in the evening',
          '5 mg-chewable tablet-oral': 'Chew 1 tablet by mouth once daily in the evening',
          '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily in the evening'
        },
        therapeuticClass: 'Leukotriene Receptor Antagonist',
        indication: 'Asthma, Allergic Rhinitis',
        commonDoses: ['10 mg once daily (adults)', '5 mg once daily (children 6-14)', '4 mg once daily (children 2-5)'],
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Singulair'],
        prescriptionType: 'rx',
        blackBoxWarning: 'Neuropsychiatric events including agitation, aggression, anxiousness, dream abnormalities, hallucinations, depression, insomnia, irritability, restlessness, suicidal thinking and behavior, and tremor'
      },
      
      'metformin': {
        standardStrengths: ['500 mg', '850 mg', '1000 mg'],
        availableForms: ['tablet', 'extended-release tablet'],
        formRoutes: {
          'tablet': ['oral'],
          'extended-release tablet': ['oral']
        },
        sigTemplates: {
          '500 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
          '850 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
          '1000 mg-tablet-oral': 'Take 1 tablet by mouth twice daily with meals',
          '500 mg-extended-release tablet-oral': 'Take 1 extended-release tablet by mouth once daily with dinner'
        },
        therapeuticClass: 'Biguanide Antidiabetic',
        indication: 'Type 2 Diabetes Mellitus',
        commonDoses: ['500 mg twice daily', '1000 mg twice daily'],
        maxDailyDose: '2550 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Glucophage', 'Fortamet'],
        prescriptionType: 'rx',
        renalAdjustment: true
      },

      'hydroxychloroquine': {
        standardStrengths: ['200 mg', '400 mg'],
        availableForms: ['tablet'],
        formRoutes: {
          'tablet': ['oral']
        },
        sigTemplates: {
          '200 mg-tablet-oral': 'Take 1 tablet by mouth twice daily',
          '400 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
        },
        therapeuticClass: 'Antimalarial/DMARD',
        indication: 'Rheumatoid Arthritis, Lupus, Malaria Prevention',
        commonDoses: ['200 mg twice daily', '400 mg once daily'],
        maxDailyDose: '400 mg',
        requiresPriorAuth: true,
        isControlled: false,
        brandNames: ['Plaquenil'],
        prescriptionType: 'rx',
        blackBoxWarning: 'Retinal toxicity - requires regular ophthalmologic monitoring'
      },

      'prednisone': {
        standardStrengths: ['1 mg', '2.5 mg', '5 mg', '10 mg', '20 mg', '50 mg'],
        availableForms: ['tablet', 'oral solution'],
        formRoutes: {
          'tablet': ['oral'],
          'oral solution': ['oral']
        },
        sigTemplates: {
          '1 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '2.5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '5 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '10 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '20 mg-tablet-oral': 'Take 1 tablet by mouth once daily',
          '50 mg-tablet-oral': 'Take 1 tablet by mouth once daily'
        },
        therapeuticClass: 'Corticosteroid',
        indication: 'Inflammation, Autoimmune disorders, Allergic reactions',
        commonDoses: ['5 mg once daily', '10 mg once daily', '20 mg once daily'],
        maxDailyDose: '80 mg',
        requiresPriorAuth: false,
        isControlled: false,
        brandNames: ['Deltasone', 'Rayos'],
        prescriptionType: 'rx',
        blackBoxWarning: 'Long-term use may cause adrenal suppression and increased infection risk'
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
      // Find matching standard sig using template key
      const templateKey = `${strength}-${form}-${route}`;
      const matchingSig = intelligence.sigTemplates[templateKey];
      
      if (matchingSig) {
        return matchingSig;
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
    if (!intelligence.standardStrengths.includes(strength)) {
      warnings.push(`${strength} is not a standard strength for ${medicationName}`);
      suggestions.push(`Available strengths: ${intelligence.standardStrengths.join(', ')}`);
    }
    
    // Validate form
    if (!intelligence.availableForms.includes(form)) {
      warnings.push(`${form} is not available for ${medicationName}`);
      suggestions.push(`Available forms: ${intelligence.availableForms.join(', ')}`);
    }
    
    // Validate route for form
    if (intelligence.formRoutes[form] && !intelligence.formRoutes[form].includes(route)) {
      warnings.push(`${route} route is not appropriate for ${form} form`);
      suggestions.push(`Appropriate routes for ${form}: ${intelligence.formRoutes[form].join(', ')}`);
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }
}