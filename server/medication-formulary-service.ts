/**
 * Medication Formulary Service
 * 
 * Provides fast local lookup for 500 most commonly prescribed medications
 * with AI fallback for comprehensive coverage
 */

import { db } from './db.js';
import { medicationFormulary } from '../shared/schema.js';
import { eq, ilike, or, sql } from 'drizzle-orm';

export interface FormularyMedication {
  id: number;
  genericName: string;
  brandNames: string[];
  commonNames: string[];
  standardStrengths: string[];
  availableForms: string[];
  formRoutes: Record<string, string[]>;
  sigTemplates: Record<string, string>;
  commonDoses: string[];
  maxDailyDose?: string;
  therapeuticClass: string;
  indication: string;
  blackBoxWarning?: string;
  ageRestrictions?: string;
  prescriptionType: string;
  isControlled: boolean;
  controlledSchedule?: string;
  requiresPriorAuth: boolean;
  renalAdjustment: boolean;
  hepaticAdjustment: boolean;
  popularityRank?: number;
}

export interface MedicationMatch {
  medication: FormularyMedication;
  matchType: 'exact' | 'generic' | 'brand' | 'common' | 'partial';
  confidence: number;
}

export class MedicationFormularyService {
  private medicationCache = new Map<string, FormularyMedication[]>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  constructor() {
    console.log('🏥 [MedicationFormulary] Service initialized');
  }

  /**
   * Search for medications in the local formulary
   */
  async searchMedications(query: string, limit: number = 10): Promise<MedicationMatch[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [];
    }

    console.log(`🔍 [MedicationFormulary] Searching for: "${query}"`);

    try {
      // Search with multiple strategies for best matches
      const results = await db
        .select()
        .from(medicationFormulary)
        .where(
          or(
            ilike(medicationFormulary.genericName, `${normalizedQuery}%`),
            ilike(medicationFormulary.genericName, `%${normalizedQuery}%`)
          )
        )
        .limit(limit);

      const matches: MedicationMatch[] = results.map((med: any) => {
        const medication: FormularyMedication = {
          id: med.id,
          genericName: med.genericName,
          brandNames: med.brandNames || [],
          commonNames: med.commonNames || [],
          standardStrengths: med.standardStrengths,
          availableForms: med.availableForms,
          formRoutes: med.formRoutes as Record<string, string[]>,
          sigTemplates: med.sigTemplates as Record<string, string>,
          commonDoses: med.commonDoses || [],
          maxDailyDose: med.maxDailyDose || undefined,
          therapeuticClass: med.therapeuticClass,
          indication: med.indication,
          blackBoxWarning: med.blackBoxWarning || undefined,
          ageRestrictions: med.ageRestrictions || undefined,
          prescriptionType: med.prescriptionType,
          isControlled: med.isControlled || false,
          controlledSchedule: med.controlledSchedule || undefined,
          requiresPriorAuth: med.requiresPriorAuth || false,
          renalAdjustment: med.renalAdjustment || false,
          hepaticAdjustment: med.hepaticAdjustment || false,
          popularityRank: med.popularityRank || undefined,
        };

        // Determine match type and confidence
        const { matchType, confidence } = this.calculateMatchScore(medication, normalizedQuery);

        return { medication, matchType, confidence };
      });

      console.log(`✅ [MedicationFormulary] Found ${matches.length} matches for "${query}"`);
      return matches;

    } catch (error) {
      console.error('❌ [MedicationFormulary] Search error:', error);
      return [];
    }
  }

  /**
   * Get medication by exact generic name
   */
  async getMedicationByGenericName(genericName: string): Promise<FormularyMedication | null> {
    try {
      const result = await db
        .select()
        .from(medicationFormulary)
        .where(ilike(medicationFormulary.genericName, genericName.toLowerCase()))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const med = result[0];
      return {
        id: med.id,
        genericName: med.genericName,
        brandNames: med.brandNames || [],
        commonNames: med.commonNames || [],
        standardStrengths: med.standardStrengths,
        availableForms: med.availableForms,
        formRoutes: med.formRoutes as Record<string, string[]>,
        sigTemplates: med.sigTemplates as Record<string, string>,
        commonDoses: med.commonDoses || [],
        maxDailyDose: med.maxDailyDose || undefined,
        therapeuticClass: med.therapeuticClass,
        indication: med.indication,
        blackBoxWarning: med.blackBoxWarning || undefined,
        ageRestrictions: med.ageRestrictions || undefined,
        prescriptionType: med.prescriptionType,
        isControlled: med.isControlled,
        controlledSchedule: med.controlledSchedule || undefined,
        requiresPriorAuth: med.requiresPriorAuth,
        renalAdjustment: med.renalAdjustment,
        hepaticAdjustment: med.hepaticAdjustment,
        popularityRank: med.popularityRank || undefined,
      };
    } catch (error) {
      console.error('❌ [MedicationFormulary] Get by generic name error:', error);
      return null;
    }
  }

  /**
   * Generate smart sig (prescription instructions) based on formulary data
   */
  generateSmartSig(medication: FormularyMedication, strength: string, form: string): string {
    const key = `${strength}-${form}-oral`;
    
    // Try exact match first
    if (medication.sigTemplates[key]) {
      return medication.sigTemplates[key];
    }

    // Try common dose patterns
    const commonDose = medication.commonDoses.find(dose => 
      dose.includes(strength) || dose.includes(strength.split(' ')[0])
    );

    if (commonDose) {
      return `Take as directed: ${commonDose}`;
    }

    // Fallback based on therapeutic class
    return this.getDefaultSigByClass(medication.therapeuticClass, strength, form);
  }

  /**
   * Check if medication requires special handling
   */
  getMedicationAlerts(medication: FormularyMedication): string[] {
    const alerts: string[] = [];

    if (medication.isControlled) {
      alerts.push(`Controlled substance (${medication.controlledSchedule})`);
    }

    if (medication.requiresPriorAuth) {
      alerts.push('Prior authorization may be required');
    }

    if (medication.blackBoxWarning) {
      alerts.push(`FDA Black Box Warning: ${medication.blackBoxWarning}`);
    }

    if (medication.renalAdjustment) {
      alerts.push('Dose adjustment needed in renal impairment');
    }

    if (medication.hepaticAdjustment) {
      alerts.push('Dose adjustment needed in hepatic impairment');
    }

    if (medication.ageRestrictions) {
      alerts.push(`Age restrictions: ${medication.ageRestrictions}`);
    }

    return alerts;
  }

  /**
   * Get formulary statistics
   */
  async getFormularyStats(): Promise<{
    totalMedications: number;
    byTherapeuticClass: Record<string, number>;
    controlled: number;
    priorAuth: number;
  }> {
    try {
      const stats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          therapeuticClass: medicationFormulary.therapeuticClass,
          controlled: sql<number>`COUNT(*) FILTER (WHERE ${medicationFormulary.isControlled} = true)`,
          priorAuth: sql<number>`COUNT(*) FILTER (WHERE ${medicationFormulary.requiresPriorAuth} = true)`,
        })
        .from(medicationFormulary)
        .where(eq(medicationFormulary.active, true))
        .groupBy(medicationFormulary.therapeuticClass);

      const byTherapeuticClass: Record<string, number> = {};
      let totalMedications = 0;
      let controlled = 0;
      let priorAuth = 0;

      for (const stat of stats) {
        byTherapeuticClass[stat.therapeuticClass] = stat.total;
        totalMedications += stat.total;
        controlled += stat.controlled;
        priorAuth += stat.priorAuth;
      }

      return {
        totalMedications,
        byTherapeuticClass,
        controlled,
        priorAuth,
      };
    } catch (error) {
      console.error('❌ [MedicationFormulary] Stats error:', error);
      return {
        totalMedications: 0,
        byTherapeuticClass: {},
        controlled: 0,
        priorAuth: 0,
      };
    }
  }

  private calculateMatchScore(medication: FormularyMedication, query: string): {
    matchType: MedicationMatch['matchType'];
    confidence: number;
  } {
    // Exact generic name match
    if (medication.genericName.toLowerCase() === query) {
      return { matchType: 'exact', confidence: 1.0 };
    }

    // Exact brand name match
    if (medication.brandNames.some(brand => brand.toLowerCase() === query)) {
      return { matchType: 'brand', confidence: 0.95 };
    }

    // Exact common name match
    if (medication.commonNames.some(common => common.toLowerCase() === query)) {
      return { matchType: 'common', confidence: 0.9 };
    }

    // Partial generic name match
    if (medication.genericName.toLowerCase().startsWith(query)) {
      const ratio = query.length / medication.genericName.length;
      return { matchType: 'generic', confidence: 0.7 + (ratio * 0.2) };
    }

    // Partial brand name match
    const brandMatch = medication.brandNames.find(brand => 
      brand.toLowerCase().startsWith(query)
    );
    if (brandMatch) {
      const ratio = query.length / brandMatch.length;
      return { matchType: 'brand', confidence: 0.6 + (ratio * 0.2) };
    }

    return { matchType: 'partial', confidence: 0.5 };
  }

  private getDefaultSigByClass(therapeuticClass: string, strength: string, form: string): string {
    const classDefaults: Record<string, string> = {
      'ACE Inhibitor': `Take 1 ${form} by mouth once daily`,
      'Calcium Channel Blocker': `Take 1 ${form} by mouth once daily`,
      'Beta-Blocker': `Take 1 ${form} by mouth twice daily`,
      'SSRI': `Take 1 ${form} by mouth once daily`,
      'NSAID': `Take 1 ${form} by mouth every 6-8 hours as needed for pain`,
      'Analgesic': `Take 1-2 ${form}s by mouth every 4-6 hours as needed for pain`,
      'Antibiotic': `Take 1 ${form} by mouth as directed until finished`,
    };

    return classDefaults[therapeuticClass] || `Take 1 ${form} by mouth as directed`;
  }
}

// Export singleton instance
export const medicationFormularyService = new MedicationFormularyService();