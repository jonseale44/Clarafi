/**
 * Chart Medication Service
 * Handles direct medication management in patient chart independent of encounter workflow
 * Provides production-level EMR medication management capabilities
 */

import { db } from "./db.js";
import { medications, medicationFormulary, patients, encounters } from "../shared/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { MedicationStandardizationService } from "./medication-standardization-service.js";

export interface ChartMedicationInput {
  patientId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  route?: string;
  quantity?: number;
  daysSupply?: number;
  refills?: number;
  sig?: string;
  clinicalIndication?: string;
  startDate: string;
  prescriberId: number;
  strength?: string;
  dosageForm?: string;
}

export interface MoveToOrdersInput {
  medicationId: number;
  encounterId: number;
  quantity?: number;
  daysSupply?: number;
  refills?: number;
  clinicalIndication?: string;
  requestedBy: number;
}

export class ChartMedicationService {
  private standardizationService: MedicationStandardizationService;

  constructor() {
    this.standardizationService = new MedicationStandardizationService();
  }

  /**
   * Add medication directly to patient chart (independent of encounter)
   */
  async addChartMedication(input: ChartMedicationInput): Promise<any> {
    console.log(`💊 [ChartMedication] Adding medication directly to chart for patient ${input.patientId}`);
    console.log(`💊 [ChartMedication] Medication: ${input.medicationName} ${input.dosage} ${input.frequency}`);

    try {
      // Validate patient exists
      const [patient] = await db.select()
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1);

      if (!patient) {
        throw new Error(`Patient ${input.patientId} not found`);
      }

      // Create virtual encounter for chart-based medication
      // This maintains data integrity while enabling chart-independent management
      const chartEncounter = await this.getOrCreateChartEncounter(input.patientId, input.prescriberId);

      // Standardize medication using existing service
      const standardizedMedication = await this.standardizationService.standardizeAndEnhance({
        medicationName: input.medicationName,
        dosage: input.dosage,
        frequency: input.frequency,
        route: input.route,
        sig: input.sig,
        quantity: input.quantity,
        daysSupply: input.daysSupply
      });

      // Check for potential duplicates
      const existingMedications = await this.checkForDuplicates(
        input.patientId,
        standardizedMedication.genericName || standardizedMedication.medicationName
      );

      if (existingMedications.length > 0) {
        console.log(`⚠️ [ChartMedication] Found ${existingMedications.length} potential duplicate(s)`);
        // Return duplicate information for user decision
        return {
          success: false,
          duplicatesFound: true,
          existingMedications,
          proposedMedication: standardizedMedication
        };
      }

      // Insert medication with chart source attribution
      const [newMedication] = await db.insert(medications).values({
        patientId: input.patientId,
        encounterId: chartEncounter.id,
        medicationName: standardizedMedication.medicationName,
        genericName: standardizedMedication.genericName,
        brandName: standardizedMedication.brandName,
        dosage: input.dosage,
        strength: standardizedMedication.strength || input.strength,
        dosageForm: standardizedMedication.dosageForm || input.dosageForm,
        route: standardizedMedication.route || input.route || 'oral',
        frequency: input.frequency,
        quantity: input.quantity,
        daysSupply: input.daysSupply,
        refillsRemaining: input.refills || 0,
        totalRefills: input.refills || 0,
        sig: input.sig || standardizedMedication.sig,
        clinicalIndication: input.clinicalIndication,
        startDate: input.startDate,
        status: 'active',
        prescriber: 'Chart Entry',
        prescriberId: input.prescriberId,
        firstEncounterId: chartEncounter.id,
        lastUpdatedEncounterId: chartEncounter.id,
        rxNormCode: standardizedMedication.rxNormCode,
        ndcCode: standardizedMedication.ndcCode,
        // Chart-specific fields
        sourceOrderId: null, // No source order - direct chart entry
        reasonForChange: 'Direct chart entry',
        changeLog: [{
          action: 'chart_added',
          timestamp: new Date().toISOString(),
          userId: input.prescriberId,
          details: 'Added directly to patient chart'
        }]
      }).returning();

      console.log(`✅ [ChartMedication] Successfully added medication ${newMedication.id} to chart`);

      return {
        success: true,
        medication: newMedication,
        standardizedData: standardizedMedication
      };

    } catch (error) {
      console.error(`❌ [ChartMedication] Error adding medication to chart:`, error);
      throw error;
    }
  }

  /**
   * Move existing medication to orders for refill
   */
  async moveToOrders(input: MoveToOrdersInput): Promise<any> {
    console.log(`🔄 [MoveToOrders] Converting medication ${input.medicationId} to refill order`);

    try {
      // Get existing medication
      const [existingMedication] = await db.select()
        .from(medications)
        .where(eq(medications.id, input.medicationId))
        .limit(1);

      if (!existingMedication) {
        throw new Error(`Medication ${input.medicationId} not found`);
      }

      // Calculate intelligent refill quantities
      const refillData = this.calculateRefillQuantities(existingMedication, input);

      // Create draft order
      const { orders } = await import("../shared/schema.js");
      
      const [draftOrder] = await db.insert(orders).values({
        patientId: existingMedication.patientId,
        encounterId: input.encounterId,
        orderType: 'medication',
        orderStatus: 'draft',
        medicationName: existingMedication.medicationName,
        dosage: existingMedication.dosage,
        quantity: refillData.quantity,
        sig: existingMedication.sig,
        refills: refillData.refills,
        form: existingMedication.dosageForm,
        routeOfAdministration: existingMedication.route,
        daysSupply: refillData.daysSupply,
        clinicalIndication: input.clinicalIndication || existingMedication.clinicalIndication,
        priority: 'routine',
        orderedBy: input.requestedBy,
        providerNotes: `Refill for existing medication ID ${input.medicationId}`
      }).returning();

      // Update medication with refill reference
      await db.update(medications)
        .set({
          changeLog: sql`COALESCE(change_log, '[]'::jsonb) || ${JSON.stringify([{
            action: 'moved_to_orders',
            timestamp: new Date().toISOString(),
            userId: input.requestedBy,
            orderId: draftOrder.id,
            details: 'Converted to refill order'
          }])}`
        })
        .where(eq(medications.id, input.medicationId));

      console.log(`✅ [MoveToOrders] Created draft order ${draftOrder.id} for medication refill`);

      return {
        success: true,
        draftOrder,
        refillData,
        originalMedication: existingMedication
      };

    } catch (error) {
      console.error(`❌ [MoveToOrders] Error converting medication to order:`, error);
      throw error;
    }
  }

  /**
   * Get or create a virtual "Chart Management" encounter for direct medication management
   */
  private async getOrCreateChartEncounter(patientId: number, providerId: number): Promise<any> {
    // Look for existing chart management encounter
    const existingChartEncounter = await db.select()
      .from(encounters)
      .where(and(
        eq(encounters.patientId, patientId),
        eq(encounters.encounterType, 'Chart Management')
      ))
      .limit(1);

    if (existingChartEncounter.length > 0) {
      return existingChartEncounter[0];
    }

    // Create new chart management encounter
    const [chartEncounter] = await db.insert(encounters).values({
      patientId,
      providerId,
      encounterType: 'Chart Management',
      encounterSubtype: 'Direct Chart Entry',
      startTime: new Date(),
      encounterStatus: 'active',
      chiefComplaint: 'Chart medication management',
      note: 'Virtual encounter for direct chart medication management'
    }).returning();

    console.log(`📋 [ChartEncounter] Created chart management encounter ${chartEncounter.id}`);
    return chartEncounter;
  }

  /**
   * Check for potential duplicate medications
   */
  private async checkForDuplicates(patientId: number, medicationName: string): Promise<any[]> {
    return db.select()
      .from(medications)
      .where(and(
        eq(medications.patientId, patientId),
        eq(medications.status, 'active'),
        sql`LOWER(${medications.medicationName}) LIKE ${`%${medicationName.toLowerCase()}%`}`
      ));
  }

  /**
   * Calculate intelligent refill quantities based on existing medication
   */
  private calculateRefillQuantities(medication: any, input: MoveToOrdersInput) {
    // Use provided values or intelligent defaults
    const quantity = input.quantity || medication.quantity || this.calculateDefaultQuantity(medication);
    const daysSupply = input.daysSupply || medication.daysSupply || 30; // Default 30-day supply
    const refills = input.refills !== undefined ? input.refills : 
                   medication.refillsRemaining > 0 ? medication.refillsRemaining : 5; // Default 5 refills

    return { quantity, daysSupply, refills };
  }

  /**
   * Calculate default quantity based on frequency and days supply
   */
  private calculateDefaultQuantity(medication: any): number {
    const daysSupply = medication.daysSupply || 30;
    const frequency = medication.frequency?.toLowerCase() || '';

    // Parse frequency to daily count
    let dailyCount = 1; // Default
    if (frequency.includes('twice') || frequency.includes('bid') || frequency.includes('2')) {
      dailyCount = 2;
    } else if (frequency.includes('three') || frequency.includes('tid') || frequency.includes('3')) {
      dailyCount = 3;
    } else if (frequency.includes('four') || frequency.includes('qid') || frequency.includes('4')) {
      dailyCount = 4;
    }

    return daysSupply * dailyCount;
  }

  /**
   * Search medication formulary for intelligent suggestions
   */
  async searchFormulary(query: string, limit: number = 10): Promise<any[]> {
    console.log(`🔍 [Formulary] Searching for: "${query}"`);

    try {
      const results = await db.select()
        .from(medicationFormulary)
        .where(sql`
          LOWER(${medicationFormulary.genericName}) LIKE ${`%${query.toLowerCase()}%`} OR
          EXISTS (
            SELECT 1 FROM unnest(${medicationFormulary.brandNames}) AS brand_name
            WHERE LOWER(brand_name) LIKE ${`%${query.toLowerCase()}%`}
          ) OR
          EXISTS (
            SELECT 1 FROM unnest(${medicationFormulary.commonNames}) AS common_name
            WHERE LOWER(common_name) LIKE ${`%${query.toLowerCase()}%`}
          )
        `)
        .orderBy(medicationFormulary.popularityRank)
        .limit(limit);

      console.log(`✅ [Formulary] Found ${results.length} matches`);
      return results;

    } catch (error) {
      console.error(`❌ [Formulary] Search error:`, error);
      return [];
    }
  }
}

export const chartMedicationService = new ChartMedicationService();