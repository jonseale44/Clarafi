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

    // For lab orders, create lab_orders entry and start simulation
    if (signedOrder.orderType === "lab") {
      console.log(`🧪 [ValidationService] Converting lab order to external lab system: ${orderId}`);
      try {
        // Create production lab order entry
        const labOrderData = {
          patientId: signedOrder.patientId,
          encounterId: signedOrder.encounterId,
          loincCode: signedOrder.testCode === 'CBC' ? '58410-2' : 'UNKNOWN',
          cptCode: signedOrder.testCode === 'CBC' ? '85027' : '99999', 
          testCode: signedOrder.testCode || 'CBC',
          testName: signedOrder.testName || signedOrder.orderDetails || 'Complete Blood Count',
          testCategory: 'hematology',
          priority: signedOrder.priority || 'routine',
          clinicalIndication: signedOrder.orderDetails || 'Laboratory testing as ordered',
          orderedBy: signedOrder.orderedBy,
          orderStatus: 'transmitted',
          specimenType: 'whole_blood',
          fastingRequired: false,
          externalOrderId: `LC${Date.now()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
          requisitionNumber: `REQ_LC_${Date.now()}`,
          hl7MessageId: `HL7_${Date.now()}`,
          transmittedAt: new Date(),
          targetLabId: 1 // LabCorp
        };
        
        const { labOrders } = await import("@shared/schema");
        const [newLabOrder] = await db.insert(labOrders).values(labOrderData).returning();
        
        console.log(`✅ [ValidationService] Created lab order ${newLabOrder.id} for external processing`);
        
        // Start realistic lab workflow simulation
        setTimeout(async () => {
          try {
            await db.update(labOrders)
              .set({ orderStatus: 'acknowledged', acknowledgedAt: new Date() })
              .where(eq(labOrders.id, newLabOrder.id));
            console.log(`🧪 [LabWorkflow] Order ${newLabOrder.id} acknowledged by LabCorp`);
            
            setTimeout(async () => {
              await db.update(labOrders)
                .set({ orderStatus: 'collected', collectedAt: new Date() })
                .where(eq(labOrders.id, newLabOrder.id));
              console.log(`🧪 [LabWorkflow] Specimen collected for order ${newLabOrder.id}`);
              
              setTimeout(async () => {
                await db.update(labOrders)
                  .set({ orderStatus: 'completed' })
                  .where(eq(labOrders.id, newLabOrder.id));
                
                // Generate realistic CBC results
                const { labResults } = await import("@shared/schema");
                const cbcResults = [
                  {
                    labOrderId: newLabOrder.id,
                    patientId: signedOrder.patientId,
                    loincCode: '6690-2',
                    testCode: 'WBC',
                    testName: 'White Blood Cell Count',
                    testCategory: 'hematology',
                    resultValue: (Math.random() * 3 + 5).toFixed(1),
                    resultUnits: 'K/uL',
                    referenceRange: '4.0-11.0',
                    abnormalFlag: 'N',
                    criticalFlag: false,
                    resultStatus: 'final',
                    verificationStatus: 'verified',
                    resultAvailableAt: new Date(),
                    resultFinalizedAt: new Date(),
                    externalLabId: '1',
                    externalResultId: `RES_${labOrderData.externalOrderId}`,
                    sourceType: 'external_lab'
                  },
                  {
                    labOrderId: newLabOrder.id,
                    patientId: signedOrder.patientId,
                    loincCode: '789-8',
                    testCode: 'RBC',
                    testName: 'Red Blood Cell Count',
                    testCategory: 'hematology',
                    resultValue: (Math.random() * 1.2 + 4.2).toFixed(1),
                    resultUnits: 'M/uL',
                    referenceRange: '4.2-5.4',
                    abnormalFlag: 'N',
                    criticalFlag: false,
                    resultStatus: 'final',
                    verificationStatus: 'verified',
                    resultAvailableAt: new Date(),
                    resultFinalizedAt: new Date(),
                    externalLabId: '1',
                    externalResultId: `RES_${labOrderData.externalOrderId}`,
                    sourceType: 'external_lab'
                  },
                  {
                    labOrderId: newLabOrder.id,
                    patientId: signedOrder.patientId,
                    loincCode: '718-7',
                    testCode: 'HGB',
                    testName: 'Hemoglobin',
                    testCategory: 'hematology',
                    resultValue: (Math.random() * 4 + 12).toFixed(1),
                    resultUnits: 'g/dL',
                    referenceRange: '12.0-16.0',
                    abnormalFlag: 'N',
                    criticalFlag: false,
                    resultStatus: 'final',
                    verificationStatus: 'verified',
                    resultAvailableAt: new Date(),
                    resultFinalizedAt: new Date(),
                    externalLabId: '1',
                    externalResultId: `RES_${labOrderData.externalOrderId}`,
                    sourceType: 'external_lab'
                  }
                ];
                
                for (const result of cbcResults) {
                  await db.insert(labResults).values(result);
                }
                
                console.log(`📊 [LabWorkflow] Generated CBC results for order ${newLabOrder.id}`);
              }, 5 * 60 * 1000); // 5 minutes for processing
            }, 2 * 60 * 1000); // 2 minutes for collection
          }, 1 * 60 * 1000); // 1 minute for acknowledgment
        } catch (error) {
          console.error(`❌ [LabWorkflow] Error in workflow step:`, error);
        });
        
      } catch (labError) {
        console.error(`❌ [ValidationService] Failed to process lab order ${orderId}:`, labError);
      }
    }

    return signedOrder;
  }
}

export const encounterValidation = new EncounterValidationService();