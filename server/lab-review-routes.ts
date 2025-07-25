/**
 * Lab Review API Routes
 * 
 * Professional EMR-grade endpoints for lab result review workflows
 * Follows HL7 FHIR standards and healthcare industry best practices
 */

import { Router, Request, Response } from "express";
import { APIResponseHandler } from "./api-response-handler";
import { labReviewService } from "./lab-review-service";
import { z } from "zod";

const router = Router();

// Validation schemas
const DateBasedReviewSchema = z.object({
  patientId: z.number(),
  selectedDate: z.string().datetime(),
  reviewNote: z.string().max(1000).default("Provider reviewed - no additional notes"),
  reviewType: z.literal('encounter')
});

const PanelBasedReviewSchema = z.object({
  patientId: z.number(),
  panelNames: z.array(z.string()),
  reviewNote: z.string().max(1000).default("Provider reviewed - no additional notes"),
  reviewType: z.literal('panel')
});

const BatchReviewSchema = z.object({
  resultIds: z.array(z.number()).min(1),
  reviewNote: z.string().max(1000).default("Provider reviewed - no additional notes"),
  reviewType: z.enum(['individual', 'encounter', 'panel', 'batch'])
});

/**
 * POST /api/lab-review/by-date
 * Review all lab results for a specific date
 */
router.post("/by-date", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = DateBasedReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { patientId, selectedDate, reviewNote } = validation.data;
    
    console.log('🏥 [LabReviewRoutes] Parsed validation data:', {
      patientId,
      selectedDate,
      reviewNote: reviewNote || "(empty - will use default)",
      originalReviewNote: req.body.reviewNote
    });
    const reviewedBy = (req as any).user.id;

    console.log('🏥 [LabReviewRoutes] Processing date-based review:', { 
      patientId, 
      selectedDate, 
      reviewedBy,
      reviewNote: reviewNote.substring(0, 100) + (reviewNote.length > 100 ? '...' : '')
    });

    // Get lab results for the specified date
    const dateResults = await labReviewService.getLabResultsByDate(patientId, selectedDate);
    
    console.log('🏥 [LabReviewRoutes] Date results retrieved:', {
      resultCount: dateResults.resultCount,
      resultIds: dateResults.resultIds,
      criticalCount: dateResults.criticalCount
    });
    
    if (dateResults.resultCount === 0) {
      return APIResponseHandler.success(res, {
        message: "No lab results found for the specified date",
        resultCount: 0,
        reviewedResults: []
      });
    }

    // Perform batch review
    const reviewResult = await labReviewService.performBatchReview({
      resultIds: dateResults.resultIds,
      reviewNote,
      reviewedBy,
      reviewedAt: new Date(),
      reviewType: 'encounter',
      clinicalContext: `Date-based review for ${selectedDate}`
    });

    return APIResponseHandler.success(res, {
      message: `Successfully reviewed ${reviewResult.successCount} lab results`,
      resultCount: reviewResult.successCount,
      reviewedResults: reviewResult.processedResultIds,
      auditTrail: reviewResult.auditTrail,
      errors: reviewResult.errors
    });

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Date-based review error:', error);
    return APIResponseHandler.error(res, "LAB_REVIEW_FAILED", "Failed to process lab review", 500);
  }
});

/**
 * POST /api/lab-review/by-panel
 * Review lab results for specific panels
 */
router.post("/by-panel", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = PanelBasedReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { patientId, panelNames, reviewNote } = validation.data;
    const reviewedBy = (req as any).user.id;

    console.log('🏥 [LabReviewRoutes] Processing panel-based review:', { patientId, panelNames, reviewedBy });

    // Get lab results for the specified panels
    const panelResults = await labReviewService.getLabResultsByPanel(patientId, panelNames);
    
    if (panelResults.length === 0) {
      return APIResponseHandler.success(res, {
        message: "No unreviewed lab results found for the specified panels",
        resultCount: 0,
        reviewedResults: []
      });
    }

    // Perform batch review
    const reviewResult = await labReviewService.performBatchReview({
      resultIds: panelResults.map(r => r.id),
      reviewNote,
      reviewedBy,
      reviewedAt: new Date(),
      reviewType: 'panel',
      clinicalContext: `Panel-based review for: ${panelNames.join(', ')}`
    });

    return APIResponseHandler.success(res, {
      message: `Successfully reviewed ${reviewResult.successCount} lab results`,
      resultCount: reviewResult.successCount,
      reviewedResults: reviewResult.processedResultIds,
      auditTrail: reviewResult.auditTrail,
      errors: reviewResult.errors
    });

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Panel-based review error:', error);
    return APIResponseHandler.error(res, "LAB_REVIEW_FAILED", "Failed to process lab review", 500);
  }
});

/**
 * POST /api/lab-review/batch
 * Review specific lab result IDs
 */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    console.log('🏥 [LabReviewRoutes] Raw request body:', req.body);
    
    const validation = BatchReviewSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('🏥 [LabReviewRoutes] Validation failed:', validation.error.errors);
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { resultIds, reviewNote, reviewType } = validation.data;
    const reviewedBy = (req as any).user.id;

    console.log('🏥 [LabReviewRoutes] Processing batch review:', { resultIds, reviewType, reviewedBy });

    // Perform batch review
    const reviewResult = await labReviewService.performBatchReview({
      resultIds,
      reviewNote,
      reviewedBy,
      reviewedAt: new Date(),
      reviewType,
      clinicalContext: `Batch review of ${resultIds.length} results`
    });

    return APIResponseHandler.success(res, {
      message: `Successfully reviewed ${reviewResult.successCount} lab results`,
      resultCount: reviewResult.successCount,
      reviewedResults: reviewResult.processedResultIds,
      auditTrail: reviewResult.auditTrail,
      errors: reviewResult.errors
    });

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Batch review error:', error);
    return APIResponseHandler.error(res, "LAB_REVIEW_FAILED", "Failed to process lab review", 500);
  }
});

/**
 * GET /api/lab-review/date-results/:patientId/:selectedDate
 * Get lab results for a specific date (for preview before review)
 */
router.get("/date-results/:patientId/:selectedDate", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    const selectedDate = req.params.selectedDate;

    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    console.log('🏥 [LabReviewRoutes] Fetching date results:', { patientId, selectedDate });

    const dateResults = await labReviewService.getLabResultsByDate(patientId, selectedDate);

    return APIResponseHandler.success(res, dateResults);

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Date results fetch error:', error);
    return APIResponseHandler.error(res, "FETCH_FAILED", "Failed to fetch lab results", 500);
  }
});

/**
 * GET /api/lab-review/summary/:patientId
 * Get review summary for a patient
 */
router.get("/summary/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);

    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    const summary = await labReviewService.getReviewSummary(patientId);

    return APIResponseHandler.success(res, summary);

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Summary fetch error:', error);
    return APIResponseHandler.error(res, "FETCH_FAILED", "Failed to fetch review summary", 500);
  }
});

/**
 * POST /api/lab-review/unreview/:resultId
 * Remove review status from a single lab result (for workflow corrections)
 */
router.post("/unreview/:resultId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const resultId = parseInt(req.params.resultId);
    const { unreviewReason } = req.body;

    if (isNaN(resultId)) {
      return APIResponseHandler.badRequest(res, "Invalid result ID");
    }

    if (!unreviewReason || typeof unreviewReason !== 'string') {
      return APIResponseHandler.badRequest(res, "Unreview reason is required");
    }

    const unreviewedBy = (req as any).user.id;

    console.log('🏥 [LabReviewRoutes] Processing single result unreview:', { 
      resultId, 
      unreviewReason: unreviewReason.substring(0, 100),
      unreviewedBy
    });

    // Perform unreview operation for single result
    const unreviewResult = await labReviewService.performUnreview({
      resultIds: [resultId],
      unreviewReason,
      unreviewedBy,
      unreviewedAt: new Date(),
      reviewType: 'individual',
      clinicalContext: `Single result unreview: ${unreviewReason}`
    });

    return APIResponseHandler.success(res, {
      message: `Successfully unreviewed lab result`,
      resultId,
      auditTrail: unreviewResult.auditTrail
    });

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Single result unreview error:', error);
    return APIResponseHandler.error(res, "UNREVIEW_FAILED", "Failed to unreview lab result", 500);
  }
});

/**
 * POST /api/lab-review/unreview
 * Remove review status from lab results (for workflow corrections)
 */
router.post("/unreview", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = BatchReviewSchema.omit({ reviewNote: true }).extend({
      unreviewReason: z.string().min(1).max(500),
      reviewType: z.enum(['individual', 'encounter', 'panel', 'batch', 'correction'])
    }).safeParse(req.body);

    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { resultIds, unreviewReason, reviewType } = validation.data;
    const unreviewedBy = (req as any).user.id;

    console.log('🏥 [LabReviewRoutes] Processing unreview request:', { 
      resultIds, 
      unreviewReason: unreviewReason.substring(0, 100) + (unreviewReason.length > 100 ? '...' : ''),
      unreviewedBy,
      reviewType 
    });

    // Perform unreview operation
    const unreviewResult = await labReviewService.performUnreview({
      resultIds,
      unreviewReason,
      unreviewedBy,
      unreviewedAt: new Date(),
      reviewType,
      clinicalContext: `Unreview operation: ${unreviewReason}`
    });

    return APIResponseHandler.success(res, {
      message: `Successfully unreviewed ${unreviewResult.successCount} lab results`,
      resultCount: unreviewResult.successCount,
      unreviewedResults: unreviewResult.processedResultIds,
      auditTrail: unreviewResult.auditTrail,
      errors: unreviewResult.errors
    });

  } catch (error) {
    console.error('🏥 [LabReviewRoutes] Unreview error:', error);
    return APIResponseHandler.error(res, "UNREVIEW_FAILED", "Failed to unreview lab results", 500);
  }
});

export default router;