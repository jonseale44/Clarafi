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

    // Trigger order delivery processing for all signed orders (PDF generation happens here)
    console.log(`📄 [ValidationSign] ===== TRIGGERING ORDER DELIVERY PROCESSING =====`);
    console.log(`📄 [ValidationSign] Order ID: ${orderId}, User ID: ${userId}`);
    console.log(`📄 [ValidationSign] Order details:`, JSON.stringify(signedOrder, null, 2));
    console.log(`📄 [ValidationSign] 🚨 THIS IS WHERE PDF GENERATION SHOULD BE TRIGGERED 🚨`);
    
    try {
      console.log(`📄 [ValidationSign] Importing order delivery service...`);
      const { orderDeliveryService } = await import("./order-delivery-service.js");
      console.log(`📄 [ValidationSign] ✅ Order delivery service imported successfully`);
      
      console.log(`📄 [ValidationSign] 🎯 CALLING PDF GENERATION PIPELINE: processSignedOrder(${orderId}, ${userId})...`);
      await orderDeliveryService.processSignedOrder(orderId, userId);
      console.log(`✅ [ValidationSign] ===== ORDER DELIVERY PROCESSING COMPLETED =====`);
      console.log(`✅ [ValidationSign] 📄 PDF GENERATION PIPELINE FINISHED`);
    } catch (deliveryError) {
      console.error(`❌ [ValidationSign] ===== ORDER DELIVERY FAILED =====`);
      console.error(`❌ [ValidationSign] 📄 PDF GENERATION PIPELINE FAILED`);
      console.error(`❌ [ValidationSign] Error:`, deliveryError);
      console.error(`❌ [ValidationSign] Stack:`, deliveryError.stack);
    }

    // If this is a medication order, activate the corresponding medication
    console.log(`🔍 [ValidationSign] === INDIVIDUAL ORDER SIGNED ===`);
    console.log(`🔍 [ValidationSign] Order ID: ${orderId}, Type: ${signedOrder.orderType}`);
    console.log(`🔍 [ValidationSign] Encounter ID: ${signedOrder.encounterId}`);
    console.log(`🔍 [ValidationSign] Condition check: orderType='${signedOrder.orderType}' && encounterId=${signedOrder.encounterId}`);
    
    if (signedOrder.orderType === "medication" && signedOrder.encounterId) {
      console.log(`💊 [ValidationSign] ✅ CONDITION MET - Activating medication for signed order ${orderId}`);
      try {
        const { medicationDelta } = await import("./medication-delta-service.js");
        
        console.log(`💊 [ValidationSign] Calling signMedicationOrders with:`);
        console.log(`💊 [ValidationSign] - Encounter: ${signedOrder.encounterId}`);
        console.log(`💊 [ValidationSign] - Order IDs: [${orderId}]`);
        console.log(`💊 [ValidationSign] - Provider: ${userId}`);
        
        await medicationDelta.signMedicationOrders(
          signedOrder.encounterId,
          [orderId],
          userId
        );
        console.log(`✅ [ValidationSign] Successfully activated medication for order ${orderId}`);
      } catch (medicationError) {
        console.error(`❌ [ValidationSign] Failed to activate medication for order ${orderId}:`, medicationError);
        console.error(`❌ [ValidationSign] Error stack:`, (medicationError as Error).stack);
        // Continue with response - order is still signed
      }
    } else {
      console.log(`❌ [ValidationSign] CONDITION NOT MET - No medication activation`);
      if (signedOrder.orderType !== "medication") {
        console.log(`❌ [ValidationSign] - Reason: Order type is '${signedOrder.orderType}', not 'medication'`);
      }
      if (!signedOrder.encounterId) {
        console.log(`❌ [ValidationSign] - Reason: No encounter ID present`);
      }
    }
    console.log(`🔍 [ValidationSign] === END INDIVIDUAL ORDER SIGNING ===`);

    // Generate PDF for signed order
    console.log(`📄 [ValidationSign] ===== PDF GENERATION STARTING =====`);
    console.log(`📄 [ValidationSign] Order type: ${signedOrder.orderType}, Patient: ${signedOrder.patientId}`);
    
    try {
      const { pdfService } = await import("./pdf-service.js");
      
      let pdfBuffer: Buffer | null = null;
      
      if (signedOrder.orderType === 'medication') {
        console.log(`📄 [ValidationSign] Generating medication PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateMedicationPDF([signedOrder], signedOrder.patientId, userId);
      } else if (signedOrder.orderType === 'lab') {
        console.log(`📄 [ValidationSign] Generating lab PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateLabPDF([signedOrder], signedOrder.patientId, userId);
      } else if (signedOrder.orderType === 'imaging') {
        console.log(`📄 [ValidationSign] Generating imaging PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateImagingPDF([signedOrder], signedOrder.patientId, userId);
      } else {
        console.log(`📄 [ValidationSign] ⚠️ Unknown order type: ${signedOrder.orderType}, skipping PDF generation`);
      }
      
      if (pdfBuffer) {
        console.log(`📄 [ValidationSign] ✅ Successfully generated ${signedOrder.orderType} PDF for order ${orderId} (${pdfBuffer.length} bytes)`);
      }
      
      console.log(`📄 [ValidationSign] ===== PDF GENERATION COMPLETED =====`);
      
    } catch (pdfError) {
      console.error(`📄 [ValidationSign] ❌ PDF generation failed for order ${orderId}:`, pdfError);
      console.error(`📄 [ValidationSign] ❌ PDF Error stack:`, (pdfError as Error).stack);
      // Continue with response - order is still signed
    }
    console.log(`📄 [SingleSign] Order type: ${signedOrder.orderType}, Patient: ${signedOrder.patientId}`);
    
    try {
      const { PDFGenerationService } = await import("./pdf-generation-service.js");
      const pdfService = new PDFGenerationService();
      
      let pdfBuffer: Buffer | null = null;
      
      if (signedOrder.orderType === 'medication') {
        console.log(`📄 [SingleSign] Generating medication PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateMedicationPDF([signedOrder], signedOrder.patientId, userId);
        console.log(`📄 [SingleSign] ✅ Medication PDF generated (${pdfBuffer.length} bytes)`);
      } else if (signedOrder.orderType === 'lab') {
        console.log(`📄 [SingleSign] Generating lab PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateLabPDF([signedOrder], signedOrder.patientId, userId);
        console.log(`📄 [SingleSign] ✅ Lab PDF generated (${pdfBuffer.length} bytes)`);
      } else if (signedOrder.orderType === 'imaging') {
        console.log(`📄 [SingleSign] Generating imaging PDF for order ${orderId}`);
        pdfBuffer = await pdfService.generateImagingPDF([signedOrder], signedOrder.patientId, userId);
        console.log(`📄 [SingleSign] ✅ Imaging PDF generated (${pdfBuffer.length} bytes)`);
      } else {
        console.log(`📄 [SingleSign] ⚠️ Unknown order type: ${signedOrder.orderType}, skipping PDF generation`);
      }
      
      if (pdfBuffer) {
        console.log(`📄 [SingleSign] ✅ Successfully generated ${signedOrder.orderType} PDF for order ${orderId}`);
      }
      
      console.log(`📄 [SingleSign] ===== PDF GENERATION COMPLETED =====`);
      
    } catch (pdfError) {
      console.error(`📄 [SingleSign] ❌ PDF generation failed for order ${orderId}:`, pdfError);
      console.error(`📄 [SingleSign] ❌ PDF Error stack:`, (pdfError as Error).stack);
      // Continue with response - order is still signed
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
        const orderValidation = await validateOrder(order[0]);
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

    console.log(`🔍 [BulkSign] BEFORE PDF GENERATION - Results object:`, JSON.stringify(results, null, 2));
    console.log(`🔍 [BulkSign] Signed orders array:`, results.signed);
    console.log(`🔍 [BulkSign] Signed orders length:`, results.signed.length);

    // Generate PDFs for signed orders
    console.log(`📄 [BulkSign] ===== PDF GENERATION STARTING =====`);
    console.log(`📄 [BulkSign] Total signed orders: ${results.signed.length}`);
    
    try {
      const { PDFGenerationService } = await import("./pdf-generation-service.js");
      const pdfService = new PDFGenerationService();
      
      // Group orders by type and patient for PDF generation
      const ordersByTypeAndPatient = results.signed.reduce((acc: any, order: any) => {
        const key = `${order.patientId}_${order.orderType}`;
        if (!acc[key]) {
          acc[key] = {
            patientId: order.patientId,
            orderType: order.orderType,
            orders: []
          };
        }
        acc[key].orders.push(order);
        return acc;
      }, {});

      console.log(`📄 [BulkSign] Grouped orders by type and patient:`, Object.keys(ordersByTypeAndPatient));

      for (const [key, group] of Object.entries(ordersByTypeAndPatient)) {
        const { patientId, orderType, orders } = group as any;
        
        console.log(`📄 [BulkSign] Processing ${orderType} orders for patient ${patientId}`);
        console.log(`📄 [BulkSign] Orders:`, orders.map((o: any) => ({ id: o.id, orderType: o.orderType, orderDetails: o.orderDetails })));
        
        try {
          let pdfBuffer: Buffer | null = null;
          
          if (orderType === 'medication') {
            console.log(`📄 [BulkSign] Generating medication PDF for patient ${patientId}`);
            pdfBuffer = await pdfService.generateMedicationPDF(orders, patientId, userId);
            console.log(`📄 [BulkSign] ✅ Medication PDF generated (${pdfBuffer.length} bytes)`);
          } else if (orderType === 'lab') {
            console.log(`📄 [BulkSign] Generating lab PDF for patient ${patientId}`);
            pdfBuffer = await pdfService.generateLabPDF(orders, patientId, userId);
            console.log(`📄 [BulkSign] ✅ Lab PDF generated (${pdfBuffer.length} bytes)`);
          } else if (orderType === 'imaging') {
            console.log(`📄 [BulkSign] Generating imaging PDF for patient ${patientId}`);
            pdfBuffer = await pdfService.generateImagingPDF(orders, patientId, userId);
            console.log(`📄 [BulkSign] ✅ Imaging PDF generated (${pdfBuffer.length} bytes)`);
          } else {
            console.log(`📄 [BulkSign] ⚠️ Unknown order type: ${orderType}, skipping PDF generation`);
          }
          
          if (pdfBuffer) {
            console.log(`📄 [BulkSign] ✅ Successfully generated ${orderType} PDF for patient ${patientId}`);
          }
          
        } catch (pdfError) {
          console.error(`📄 [BulkSign] ❌ Failed to generate ${orderType} PDF for patient ${patientId}:`, pdfError);
          console.error(`📄 [BulkSign] ❌ PDF Error stack:`, (pdfError as Error).stack);
        }
      }
      
      console.log(`📄 [BulkSign] ===== PDF GENERATION COMPLETED =====`);
      
    } catch (pdfError) {
      console.error(`📄 [BulkSign] ❌ PDF generation system error:`, pdfError);
      console.error(`📄 [BulkSign] ❌ System error stack:`, (pdfError as Error).stack);
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