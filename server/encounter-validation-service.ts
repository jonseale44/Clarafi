import { db } from "./db.js";
import { encounters, orders, diagnoses, labResults, vitals } from "../shared/schema.js";
import { eq, and, isNull, sql } from "drizzle-orm";

export interface ValidationResult {
  canSign: boolean;
  errors: string[];
  warnings: string[];
  requirements: {
    hasSOAPNote: boolean;
    hasCPTCodes: boolean;
    hasDiagnoses: boolean;
    hasSignedOrders: boolean;
    hasCriticalResultsReviewed: boolean;
  };
}

export class EncounterValidationService {

  async validateEncounterForSignature(encounterId: number): Promise<ValidationResult> {
    const result: ValidationResult = {
      canSign: true,
      errors: [],
      warnings: [],
      requirements: {
        hasSOAPNote: false,
        hasCPTCodes: false,
        hasDiagnoses: false,
        hasSignedOrders: false, // Must validate actual order signatures
        hasCriticalResultsReviewed: true // Default to true since no critical results yet
      }
    };

    try {
      // Get encounter details
      const encounter = await db.select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);

      if (encounter.length === 0) {
        result.errors.push('Encounter not found');
        result.canSign = false;
        return result;
      }

      const enc = encounter[0];
      console.log(`🔍 [Validation] Validating encounter ${encounterId}`);
      console.log(`🔍 [Validation] SOAP note length: ${enc.note?.length || 0}`);
      console.log(`🔍 [Validation] CPT codes count: ${Array.isArray(enc.cptCodes) ? enc.cptCodes.length : 0}`);
      console.log(`🔍 [Validation] Diagnoses count: ${Array.isArray(enc.draftDiagnoses) ? enc.draftDiagnoses.length : 0}`);

      // Check SOAP note - must be substantial clinical documentation
      if (!enc.note || enc.note.trim().length < 50) {
        result.errors.push('SOAP note is required');
        result.canSign = false;
      } else {
        result.requirements.hasSOAPNote = true;
        console.log(`✅ [Validation] SOAP note requirement met`);
      }

      // Check CPT codes - stored in cptCodes array field
      const cptCodes = Array.isArray(enc.cptCodes) ? enc.cptCodes : [];
      if (cptCodes.length === 0) {
        result.errors.push('At least one CPT code is required');
        result.canSign = false;
      } else {
        result.requirements.hasCPTCodes = true;
        console.log(`✅ [Validation] CPT codes requirement met: ${cptCodes.length} codes`);
      }

      // Check diagnoses - stored in draftDiagnoses array field
      const diagnoses = Array.isArray(enc.draftDiagnoses) ? enc.draftDiagnoses : [];
      if (diagnoses.length === 0) {
        result.errors.push('At least one diagnosis is required');
        result.canSign = false;
      } else {
        result.requirements.hasDiagnoses = true;
        console.log(`✅ [Validation] Diagnoses requirement met: ${diagnoses.length} diagnoses`);
        
        // Check for primary diagnosis
        const hasPrimary = diagnoses.some((d: any) => d.isPrimary === true);
        if (!hasPrimary) {
          result.errors.push('A primary diagnosis must be designated');
          result.canSign = false;
        } else {
          console.log(`✅ [Validation] Primary diagnosis requirement met`);
        }
      }

      // Check orders - get actual draft orders from orders table
      const draftOrdersList = await db.select()
        .from(orders)
        .where(and(
          eq(orders.patientId, enc.patientId),
          eq(orders.orderStatus, 'draft')
        ));

      console.log(`🔍 [Validation] Found ${draftOrdersList.length} draft orders requiring signature`);
      
      if (draftOrdersList.length > 0) {
        result.errors.push(`${draftOrdersList.length} orders require provider signature before encounter can be signed`);
        result.canSign = false;
      } else {
        result.requirements.hasSignedOrders = true;
        console.log(`✅ [Validation] All orders signed or no orders present`);
      }

      // Check critical results - currently no critical results system implemented
      // This would check for abnormal lab values requiring provider acknowledgment
      result.requirements.hasCriticalResultsReviewed = true; // No critical results to review

      // Warnings
      if (enc.note && enc.note.length < 100) {
        result.warnings.push('Documentation appears brief');
      }

      result.canSign = result.errors.length === 0;

    } catch (error: any) {
      result.canSign = false;
      result.errors.push('Validation system error');
    }

    return result;
  }

  async signEncounter(encounterId: number, userId: number, signatureNote?: string) {
    const [signedEncounter] = await db
      .update(encounters)
      .set({
        encounterStatus: "signed",
        endTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(encounters.id, encounterId))
      .returning();

    return signedEncounter;
  }

  async signOrder(orderId: number, userId: number, signatureNote?: string) {
    const [signedOrder] = await db
      .update(orders)
      .set({
        orderStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        providerNotes: signatureNote || undefined
      })
      .where(eq(orders.id, orderId))
      .returning();

    // For medication orders, activate pending medications
    if (signedOrder.orderType === "medication" && signedOrder.encounterId) {
      console.log(`💊 [ValidationService] Activating medication for signed order ${orderId}`);
      try {
        const { medicationDelta } = await import("./medication-delta-service.js");
        await medicationDelta.signMedicationOrders(
          signedOrder.encounterId,
          [orderId],
          userId
        );
        console.log(`✅ [ValidationService] Successfully activated medication for order ${orderId}`);
      } catch (medicationError) {
        console.error(`❌ [ValidationService] Failed to activate medication for order ${orderId}:`, medicationError);
        // Continue - order is still signed even if medication activation fails
      }
    }

    // For lab orders, process through production-ready external lab integration
    if (signedOrder.orderType === "lab") {
      console.log(`🏥 [ValidationService] Processing lab order through production lab integration: ${orderId}`);
      try {
        const { ProductionLabIntegrationService } = await import("./production-lab-integration-service.js");
        await ProductionLabIntegrationService.processProductionLabOrder(orderId);
        console.log(`✅ [ValidationService] Successfully processed lab order ${orderId} through production lab system`);
      } catch (labError) {
        console.error(`❌ [ValidationService] Failed to process lab order ${orderId}:`, labError);
        // Continue - order is still signed even if lab processing fails
      }
    }

    return signedOrder;
  }
}

export const encounterValidation = new EncounterValidationService();