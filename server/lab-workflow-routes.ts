/**
 * Lab Workflow Routes - Advanced lab result processing endpoints
 * Handles result-triggered encounters, automated follow-up ordering, and comprehensive reporting
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { labResults, encounters, labOrders } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import LabWorkflowService from "./lab-workflow-service";

const router = Router();

/**
 * POST /api/lab-workflow/process-critical/:resultId
 * Process a critical lab result and trigger automated workflows
 */
router.post("/process-critical/:resultId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const resultId = parseInt(req.params.resultId);
    if (!resultId) {
      return APIResponseHandler.badRequest(res, "Valid result ID is required");
    }

    const workflow = await LabWorkflowService.processCriticalResult(resultId);
    
    return APIResponseHandler.success(res, workflow, 201);
  } catch (error) {
    console.error("Error processing critical result:", error);
    return APIResponseHandler.error(res, "WORKFLOW_ERROR", "Failed to process critical result");
  }
});

/**
 * POST /api/lab-workflow/process-batch
 * Process multiple critical lab results in batch
 */
router.post("/process-batch", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { resultIds } = req.body;
    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return APIResponseHandler.badRequest(res, "Array of result IDs is required");
    }

    const workflows = await LabWorkflowService.processBatchResults(resultIds);
    
    return APIResponseHandler.success(res, workflows, 201);
  } catch (error) {
    console.error("Error processing batch results:", error);
    return APIResponseHandler.error(res, "BATCH_WORKFLOW_ERROR", "Failed to process batch results");
  }
});

/**
 * GET /api/lab-workflow/report/:patientId
 * Generate comprehensive lab report for a patient
 */
router.get("/report/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    const timeframeDays = parseInt(req.query.timeframe as string) || 90;

    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Valid patient ID is required");
    }

    const report = await LabWorkflowService.generateComprehensiveReport(patientId, timeframeDays);
    
    return APIResponseHandler.success(res, report);
  } catch (error) {
    console.error("Error generating lab report:", error);
    return APIResponseHandler.error(res, "REPORT_ERROR", "Failed to generate lab report");
  }
});

/**
 * GET /api/lab-workflow/critical-queue
 * Get queue of critical results requiring workflow processing
 */
router.get("/critical-queue", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // Get unprocessed critical results
    const criticalResults = await db
      .select({
        id: labResults.id,
        patientId: labResults.patientId,
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        abnormalFlag: labResults.abnormalFlag,
        sourceType: labResults.sourceType,
        sourceConfidence: labResults.sourceConfidence,
        resultAvailableAt: labResults.resultAvailableAt
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.abnormalFlag, 'HH'), // High critical
          eq(labResults.resultStatus, 'final')
        )
      )
      .orderBy(desc(labResults.resultAvailableAt))
      .limit(50);

    return APIResponseHandler.success(res, criticalResults);
  } catch (error) {
    console.error("Error fetching critical queue:", error);
    return APIResponseHandler.error(res, "QUEUE_ERROR", "Failed to fetch critical results queue");
  }
});

/**
 * GET /api/lab-workflow/follow-up-encounters/:patientId
 * Get follow-up encounters created for a patient's lab results
 */
router.get("/follow-up-encounters/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Valid patient ID is required");
    }

    const followUpEncounters = await db
      .select({
        id: encounters.id,
        encounterType: encounters.encounterType,
        status: encounters.status,
        chiefComplaint: encounters.chiefComplaint,
        encounterDate: encounters.encounterDate,
        providerId: encounters.providerId
      })
      .from(encounters)
      .where(
        and(
          eq(encounters.patientId, patientId),
          eq(encounters.encounterType, 'follow_up')
        )
      )
      .orderBy(desc(encounters.encounterDate));

    return APIResponseHandler.success(res, followUpEncounters);
  } catch (error) {
    console.error("Error fetching follow-up encounters:", error);
    return APIResponseHandler.error(res, "ENCOUNTER_ERROR", "Failed to fetch follow-up encounters");
  }
});

/**
 * GET /api/lab-workflow/auto-orders/:patientId
 * Get automatically generated lab orders for a patient
 */
router.get("/auto-orders/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Valid patient ID is required");
    }

    const autoOrders = await db
      .select({
        id: labOrders.id,
        testCode: labOrders.testCode,
        testName: labOrders.testName,
        priority: labOrders.priority,
        clinicalIndication: labOrders.clinicalIndication,
        orderStatus: labOrders.orderStatus,
        orderedAt: labOrders.orderedAt,
        orderedBy: labOrders.orderedBy
      })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.patientId, patientId),
          eq(labOrders.orderedBy, 2) // System/AI generated orders
        )
      )
      .orderBy(desc(labOrders.orderedAt));

    return APIResponseHandler.success(res, autoOrders);
  } catch (error) {
    console.error("Error fetching auto-generated orders:", error);
    return APIResponseHandler.error(res, "AUTO_ORDER_ERROR", "Failed to fetch auto-generated orders");
  }
});

/**
 * POST /api/lab-workflow/approve-auto-order/:orderId
 * Approve an automatically generated lab order
 */
router.post("/approve-auto-order/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    if (!orderId) {
      return APIResponseHandler.badRequest(res, "Valid order ID is required");
    }

    // Update order status and assign to requesting provider
    const [updatedOrder] = await db
      .update(labOrders)
      .set({
        orderStatus: 'approved',
        orderedBy: req.user.id, // Assign to current provider
        updatedAt: new Date()
      })
      .where(eq(labOrders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return APIResponseHandler.notFound(res, "Lab order not found");
    }

    return APIResponseHandler.success(res, updatedOrder);
  } catch (error) {
    console.error("Error approving auto-generated order:", error);
    return APIResponseHandler.error(res, "APPROVAL_ERROR", "Failed to approve auto-generated order");
  }
});

export default router;