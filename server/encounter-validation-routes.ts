import { Router, Request, Response } from "express";
import { encounterSignatureValidator } from "./encounter-signature-validation.js";
import { db } from "./db.js";
import { encounters, orders, medicalProblems } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { medicalProblemsDelta } from "./medical-problems-delta-service.js";
import { medicationDelta } from "./medication-delta-service.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * GET /api/encounters/:encounterId/validation
 * Validate encounter readiness for signature
 */
router.get("/encounters/:encounterId/validation", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;

    // Verify user has access to this encounter
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    const validationResult = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    res.json(validationResult);

  } catch (error) {
    console.error("Error validating encounter:", error);
    res.status(500).json({ error: "Failed to validate encounter" });
  }
});

/**
 * POST /api/encounters/:encounterId/validate-and-sign
 * Validate encounter and sign if all requirements are met
 */
router.post("/encounters/:encounterId/validate-and-sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;
    const { signatureNote, forceSign = false } = req.body;

    // Verify user has access to this encounter
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    // Validate encounter
    const validationResult = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    // If validation fails and not forcing, return validation errors
    if (!validationResult.canSign && !forceSign) {
      return res.status(400).json({
        error: "Encounter validation failed",
        validation: validationResult,
        canForceSign: validationResult.errors.every(e => e.category !== 'legal')
      });
    }

    // Sign the encounter
    const signedEncounter = await signEncounter(encounterId, userId, signatureNote);

    // Sign medical problems if they exist
    await medicalProblemsDelta.signEncounter(encounterId, userId);
    
    // Process medication orders through delta service (handles pending->active workflow)
    try {
      await medicationDelta.processOrderDelta(encounter[0].patientId, encounterId, userId);
    } catch (medicationError) {
      console.error(`❌ [EncounterSign] Failed to process medications:`, medicationError);
      // Continue with signing even if medication processing fails
    }

    res.json({
      success: true,
      encounter: signedEncounter,
      validation: validationResult,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error validating and signing encounter:", error);
    res.status(500).json({ error: "Failed to validate and sign encounter" });
  }
});

/**
 * POST /api/orders/:orderId/sign
 * Sign individual order
 */
router.post("/orders/:orderId/sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;
    const { signatureNote } = req.body;

    // Get the order and verify access
    const order = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify provider has access (either ordered by them or assigned to encounter they own)
    if (order[0].orderedBy !== userId) {
      const encounter = await db.select()
        .from(encounters)
        .where(eq(encounters.id, order[0].encounterId!))
        .limit(1);

      if (encounter.length === 0 || encounter[0].providerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Validate order before signing
    const orderValidation = await this.validateOrder(order[0]);
    if (!orderValidation.isValid) {
      return res.status(400).json({
        error: "Order validation failed",
        validation: orderValidation
      });
    }

    // Sign the order
    const [signedOrder] = await db
      .update(orders)
      .set({
        orderStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        providerNotes: signatureNote || order[0].providerNotes
      })
      .where(eq(orders.id, orderId))
      .returning();

    // If this is a medication order, activate the corresponding medication
    if (signedOrder.orderType === "medication" && signedOrder.encounterId) {
      console.log(`💊 [OrderSign] Activating medication for signed order ${orderId}`);
      try {
        const { medicationDelta } = await import("./medication-delta-service.js");
        await medicationDelta.signMedicationOrders(
          signedOrder.encounterId,
          [orderId],
          userId
        );
        console.log(`✅ [OrderSign] Medication activated for order ${orderId}`);
      } catch (medicationError) {
        console.error(`❌ [OrderSign] Failed to activate medication for order ${orderId}:`, medicationError);
        // Continue with response - order is still signed
      }
    }

    res.json({
      success: true,
      order: signedOrder,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error signing order:", error);
    res.status(500).json({ error: "Failed to sign order" });
  }
});

/**
 * POST /api/orders/bulk-sign
 * Sign multiple orders at once
 */
router.post("/orders/bulk-sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { orderIds, signatureNote } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "Order IDs array is required" });
    }

    const results = {
      signed: [],
      failed: [],
      total: orderIds.length
    };

    for (const orderId of orderIds) {
      try {
        // Get and validate order
        const order = await db.select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (order.length === 0) {
          results.failed.push({ orderId, error: "Order not found" });
          continue;
        }

        // Verify access
        if (order[0].orderedBy !== userId) {
          const encounter = await db.select()
            .from(encounters)
            .where(eq(encounters.id, order[0].encounterId!))
            .limit(1);

          if (encounter.length === 0 || encounter[0].providerId !== userId) {
            results.failed.push({ orderId, error: "Access denied" });
            continue;
          }
        }

        // Validate order
        const orderValidation = await this.validateOrder(order[0]);
        if (!orderValidation.isValid) {
          results.failed.push({ 
            orderId, 
            error: "Validation failed", 
            details: orderValidation.errors 
          });
          continue;
        }

        // Sign the order
        const [signedOrder] = await db
          .update(orders)
          .set({
            orderStatus: "approved",
            approvedBy: userId,
            approvedAt: new Date(),
            providerNotes: signatureNote || order[0].providerNotes
          })
          .where(eq(orders.id, orderId))
          .returning();

        results.signed.push(signedOrder);

      } catch (error) {
        results.failed.push({ 
          orderId, 
          error: "System error", 
          details: error.message 
        });
      }
    }

    // Activate medications for signed medication orders
    const medicationOrderIds = results.signed
      .filter((order: any) => order.orderType === "medication" && order.encounterId)
      .map((order: any) => order.id);

    if (medicationOrderIds.length > 0) {
      console.log(`💊 [BulkSign] Activating medications for ${medicationOrderIds.length} signed medication orders`);
      try {
        const { medicationDelta } = await import("./medication-delta-service.js");
        
        // Group by encounter for efficient processing
        const ordersByEncounter = results.signed
          .filter((order: any) => order.orderType === "medication" && order.encounterId)
          .reduce((acc: any, order: any) => {
            if (!acc[order.encounterId]) {
              acc[order.encounterId] = [];
            }
            acc[order.encounterId].push(order.id);
            return acc;
          }, {});

        for (const [encounterId, orderIds] of Object.entries(ordersByEncounter)) {
          await medicationDelta.signMedicationOrders(
            parseInt(encounterId),
            orderIds as number[],
            userId
          );
        }
        
        console.log(`✅ [BulkSign] Medications activated for all signed orders`);
      } catch (medicationError) {
        console.error(`❌ [BulkSign] Failed to activate medications:`, medicationError);
        // Continue with response - orders are still signed
      }
    }

    res.json({
      success: true,
      results,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error bulk signing orders:", error);
    res.status(500).json({ error: "Failed to bulk sign orders" });
  }
});

/**
 * GET /api/encounters/:encounterId/signature-requirements
 * Get summary of what needs to be completed before signing
 */
router.get("/encounters/:encounterId/signature-requirements", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;

    // Verify access
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    // Get validation result
    const validation = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    // Get unsigned orders count
    const unsignedOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.encounterId, encounterId),
          eq(orders.orderStatus, "draft")
        )
      );

    // Build requirements summary
    const requirements = {
      canSign: validation.canSign,
      totalErrors: validation.errors.length,
      totalWarnings: validation.warnings.length,
      requirements: {
        documentation: {
          soapNote: !validation.errors.some(e => e.code === 'MISSING_SOAP_NOTE'),
          chiefComplaint: !validation.errors.some(e => e.code === 'MISSING_CHIEF_COMPLAINT'),
          soapStructure: !validation.errors.some(e => ['MISSING_SUBJECTIVE', 'MISSING_OBJECTIVE', 'MISSING_ASSESSMENT', 'MISSING_PLAN'].includes(e.code))
        },
        coding: {
          cptCodes: !validation.errors.some(e => e.code === 'MISSING_CPT_CODE'),
          diagnoses: !validation.errors.some(e => e.code === 'MISSING_DIAGNOSIS'),
          primaryDiagnosis: !validation.errors.some(e => e.code === 'MISSING_PRIMARY_DIAGNOSIS')
        },
        orders: {
          allOrdersSigned: unsignedOrders.length === 0,
          unsignedCount: unsignedOrders.length,
          unsignedOrderIds: unsignedOrders.map(o => o.id)
        },
        results: {
          criticalResultsAcknowledged: !validation.errors.some(e => e.code === 'UNACKNOWLEDGED_CRITICAL_RESULTS'),
          medicalProblemsSigned: !validation.errors.some(e => e.code === 'UNSIGNED_MEDICAL_PROBLEMS')
        }
      },
      errors: validation.errors,
      warnings: validation.warnings
    };

    res.json(requirements);

  } catch (error) {
    console.error("Error getting signature requirements:", error);
    res.status(500).json({ error: "Failed to get signature requirements" });
  }
});

/**
 * Helper method to sign encounter
 */
async function signEncounter(encounterId: number, userId: number, signatureNote?: string) {
  const [signedEncounter] = await db
    .update(encounters)
    .set({
      encounterStatus: "signed",
      endTime: new Date(),
      updatedAt: new Date()
      // Note: signedBy, signedAt, signatureNote fields would need to be added to schema
    })
    .where(eq(encounters.id, encounterId))
    .returning();

  return signedEncounter;
}

/**
 * Helper method to validate individual order
 */
async function validateOrder(order: any) {
  const validation = {
    isValid: true,
    errors: []
  };

  switch (order.orderType) {
    case 'medication':
      if (!order.medicationName) validation.errors.push('Medication name is required');
      if (!order.dosage) validation.errors.push('Dosage is required');
      if (!order.sig) validation.errors.push('Patient instructions (Sig) are required');
      if (!order.quantity || order.quantity <= 0) validation.errors.push('Valid quantity is required');
      if (!order.routeOfAdministration) validation.errors.push('Route of administration is required');
      break;

    case 'lab':
      if (!order.testName) validation.errors.push('Test name is required');
      if (!order.clinicalIndication) validation.errors.push('Clinical indication is required');
      break;

    case 'imaging':
      if (!order.studyType) validation.errors.push('Study type is required');
      if (!order.region) validation.errors.push('Body region is required');
      if (!order.clinicalIndication) validation.errors.push('Clinical indication is required');
      break;

    case 'referral':
      if (!order.specialtyType) validation.errors.push('Specialty type is required');
      if (!order.urgency) validation.errors.push('Urgency level is required');
      if (!order.clinicalIndication) validation.errors.push('Referral reason is required');
      break;
  }

  validation.isValid = validation.errors.length === 0;
  return validation;
}

export default router;