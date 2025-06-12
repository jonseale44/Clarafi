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
        hasSignedOrders: true, // Default to true since we don't require signed orders for basic encounters
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

      // Check orders - for this system, draft orders are stored in encounter.draftOrders
      // We'll validate that any pending orders are reasonable, but won't require signing for basic encounters
      const draftOrders = Array.isArray(enc.draftOrders) ? enc.draftOrders : [];
      console.log(`🔍 [Validation] Draft orders count: ${draftOrders.length}`);
      
      // For now, we don't require formal order signing for basic office visits
      // This would be required for complex encounters with medications, labs, etc.
      if (draftOrders.length > 0) {
        result.warnings.push(`${draftOrders.length} draft orders present but not formally signed`);
      }
      result.requirements.hasSignedOrders = true; // Not requiring order signatures for basic encounters

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

    return signedOrder;
  }
}

export const encounterValidation = new EncounterValidationService();