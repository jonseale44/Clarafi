/**
 * GPT Lab Review Routes - API endpoints for AI-powered lab review system
 */

import { Router, Request, Response } from "express";
import { APIResponseHandler } from "./api-response-handler";
import { GPTLabReviewService } from "./gpt-lab-review-service";
import { z } from "zod";

const router = Router();

// Validation schemas
const GenerateReviewSchema = z.object({
  patientId: z.number(),
  resultIds: z.array(z.number()).min(1),
  encounterId: z.number().optional()
});

const ApproveReviewSchema = z.object({
  reviewId: z.number()
});

const UpdateReviewSchema = z.object({
  reviewId: z.number(),
  clinicalReview: z.string().optional(),
  patientMessage: z.string().optional(),
  nurseMessage: z.string().optional(),
  revisionReason: z.string()
});

/**
 * POST /api/gpt-lab-review/generate
 * Generate GPT-powered lab review for selected results
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = GenerateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { patientId, resultIds, encounterId } = validation.data;
    const requestedBy = (req as any).user.id;

    console.log(`🤖 [GPTLabReviewRoutes] Generating review for patient ${patientId}, results: ${resultIds.join(',')}`);

    // Generate GPT review
    const reviewId = await GPTLabReviewService.generateLabReview({
      patientId,
      resultIds,
      encounterId,
      requestedBy
    });

    // Get the generated review to return
    const generatedReview = await GPTLabReviewService.getGPTReview(reviewId);

    return APIResponseHandler.success(res, {
      message: "GPT lab review generated successfully",
      reviewId,
      review: {
        id: generatedReview.id,
        clinicalReview: generatedReview.clinicalReview,
        patientMessage: generatedReview.patientMessage,
        nurseMessage: generatedReview.nurseMessage,
        status: generatedReview.status,
        processingTime: generatedReview.processingTime,
        tokensUsed: generatedReview.tokensUsed,
        generatedAt: generatedReview.generatedAt
      }
    });

  } catch (error) {
    console.error('🤖 [GPTLabReviewRoutes] Generate review error:', error);
    return APIResponseHandler.error(res, "GPT_REVIEW_FAILED", error.message || "Failed to generate GPT lab review", 500);
  }
});

/**
 * GET /api/gpt-lab-review/:reviewId
 * Get specific GPT review
 */
router.get("/:reviewId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const reviewId = parseInt(req.params.reviewId);
    if (isNaN(reviewId)) {
      return APIResponseHandler.badRequest(res, "Invalid review ID");
    }

    const review = await GPTLabReviewService.getGPTReview(reviewId);
    if (!review) {
      return APIResponseHandler.notFound(res, "GPT review not found");
    }

    return APIResponseHandler.success(res, review);

  } catch (error) {
    console.error('🤖 [GPTLabReviewRoutes] Get review error:', error);
    return APIResponseHandler.error(res, "FETCH_FAILED", "Failed to fetch GPT review", 500);
  }
});

/**
 * POST /api/gpt-lab-review/approve
 * Approve GPT review for sending to patient/nurse
 */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = ApproveReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { reviewId } = validation.data;
    const approvedBy = (req as any).user.id;

    console.log(`🤖 [GPTLabReviewRoutes] Approving review ${reviewId} by user ${approvedBy}`);

    await GPTLabReviewService.approveGPTReview(reviewId, approvedBy);

    return APIResponseHandler.success(res, {
      message: "GPT lab review approved successfully",
      reviewId,
      approvedBy,
      approvedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('🤖 [GPTLabReviewRoutes] Approve review error:', error);
    return APIResponseHandler.error(res, "APPROVAL_FAILED", "Failed to approve GPT review", 500);
  }
});

/**
 * PUT /api/gpt-lab-review/update
 * Update GPT review content (provider edits)
 */
router.put("/update", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const validation = UpdateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const { reviewId, clinicalReview, patientMessage, nurseMessage, revisionReason } = validation.data;
    const revisedBy = (req as any).user.id;

    console.log(`🤖 [GPTLabReviewRoutes] Updating review ${reviewId} by user ${revisedBy}`);

    await GPTLabReviewService.updateGPTReview(reviewId, {
      clinicalReview,
      patientMessage,
      nurseMessage,
      revisedBy,
      revisionReason
    });

    // Get updated review
    const updatedReview = await GPTLabReviewService.getGPTReview(reviewId);

    return APIResponseHandler.success(res, {
      message: "GPT lab review updated successfully",
      reviewId,
      review: updatedReview
    });

  } catch (error) {
    console.error('🤖 [GPTLabReviewRoutes] Update review error:', error);
    return APIResponseHandler.error(res, "UPDATE_FAILED", error.message || "Failed to update GPT review", 500);
  }
});

/**
 * GET /api/gpt-lab-review/results/:resultIds
 * Get GPT reviews for specific result IDs (comma-separated)
 */
router.get("/results/:resultIds", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const resultIdsParam = req.params.resultIds;
    const resultIds = resultIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (resultIds.length === 0) {
      return APIResponseHandler.badRequest(res, "Invalid result IDs");
    }

    const reviews = await GPTLabReviewService.getGPTReviewsForResults(resultIds);

    return APIResponseHandler.success(res, {
      reviews,
      resultIds,
      count: reviews.length
    });

  } catch (error) {
    console.error('🤖 [GPTLabReviewRoutes] Get reviews for results error:', error);
    return APIResponseHandler.error(res, "FETCH_FAILED", "Failed to fetch GPT reviews", 500);
  }
});

export default router;