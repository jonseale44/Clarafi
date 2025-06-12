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
        hasSignedOrders: false,
        hasCriticalResultsReviewed: false
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

      // Check SOAP note
      if (!enc.note || enc.note.trim().length === 0) {
        result.errors.push('SOAP note is required');
      } else {
        result.requirements.hasSOAPNote = true;
      }

      // Check CPT codes
      const cptCodes = enc.cptCodes as any[] || [];
      if (cptCodes.length === 0) {
        result.errors.push('At least one CPT code is required');
      } else {
        result.requirements.hasCPTCodes = true;
      }

      // Check diagnoses
      const diagnoses = enc.draftDiagnoses as any[] || [];
      if (diagnoses.length === 0) {
        result.errors.push('At least one diagnosis is required');
      } else {
        result.requirements.hasDiagnoses = true;
        
        // Check for primary diagnosis
        const hasPrimary = diagnoses.some((d: any) => d.isPrimary === true);
        if (!hasPrimary) {
          result.errors.push('A primary diagnosis must be designated');
        }
      }

      // Check orders
      const ordersList = await db.select()
        .from(orders)
        .where(eq(orders.encounterId, encounterId));

      const unsignedOrders = ordersList.filter(order => 
        order.orderStatus === 'draft' || 
        (order.orderStatus === 'pending' && !order.approvedBy)
      );

      if (unsignedOrders.length > 0) {
        result.errors.push(`${unsignedOrders.length} orders require signature`);
      } else {
        result.requirements.hasSignedOrders = true;
      }

      // Check critical results
      const criticalResults = await db.select()
        .from(labResults)
        .where(
          and(
            eq(labResults.patientId, enc.patientId),
            sql`${labResults.abnormalFlag} IN ('HH', 'LL')`,
            isNull(labResults.reviewedBy)
          )
        );

      if (criticalResults.length > 0) {
        result.errors.push(`${criticalResults.length} critical results require review`);
      } else {
        result.requirements.hasCriticalResultsReviewed = true;
      }

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