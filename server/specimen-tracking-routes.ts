/**
 * Specimen Tracking API Routes
 * 
 * Production-ready endpoints for specimen management,
 * barcode generation, and chain of custody tracking
 */

import { Router, Request, Response } from "express";
import { specimenTrackingService } from "./specimen-tracking-service";
import { APIResponseHandler } from "./api-response-handler";
import { z } from "zod";

const router = Router();

// Validation schemas
const collectSpecimenSchema = z.object({
  collectedAt: z.string().transform(str => new Date(str)),
  collectorId: z.number(),
  specimenType: z.string(),
  containerType: z.string(),
  volume: z.string().optional(),
  temperature: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['pending_collection', 'collected', 'in_transit', 'received', 'processing', 'completed', 'rejected']),
  performedBy: z.number(),
  performedByName: z.string(),
  location: z.string(),
  notes: z.string().optional(),
  temperature: z.string().optional()
});

/**
 * POST /api/specimen-tracking/:orderId/generate-label
 * Generate specimen label with barcode
 */
router.post("/:orderId/generate-label", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    const label = await specimenTrackingService.generateSpecimenLabel(orderId);
    
    return APIResponseHandler.success(res, label);
  } catch (error: any) {
    console.error("Error generating specimen label:", error);
    return APIResponseHandler.error(res, "LABEL_ERROR", error.message);
  }
});

/**
 * POST /api/specimen-tracking/batch-labels
 * Generate multiple specimen labels
 */
router.post("/batch-labels", async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return APIResponseHandler.error(res, "INVALID_REQUEST", "orderIds must be a non-empty array");
    }
    
    const labels = await specimenTrackingService.generateBatchLabels(orderIds);
    
    return APIResponseHandler.success(res, labels);
  } catch (error: any) {
    console.error("Error generating batch labels:", error);
    return APIResponseHandler.error(res, "BATCH_ERROR", error.message);
  }
});

/**
 * POST /api/specimen-tracking/:orderId/collect
 * Record specimen collection with validation
 */
router.post("/:orderId/collect", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const validatedData = collectSpecimenSchema.parse(req.body);
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    // Validate collection
    const validation = await specimenTrackingService.validateCollection(orderId, validatedData);
    
    if (!validation.isValid) {
      return APIResponseHandler.error(res, "VALIDATION_ERROR", validation.errors.join("; "));
    }
    
    // Update status to collected
    await specimenTrackingService.updateSpecimenStatus(orderId, 'collected', {
      performedBy: validatedData.collectorId,
      performedByName: (req as any).user?.firstName + " " + (req as any).user?.lastName,
      location: "Collection Point",
      notes: `Volume: ${validatedData.volume || 'N/A'}`,
      temperature: validatedData.temperature
    });
    
    return APIResponseHandler.success(res, {
      message: "Specimen collected successfully",
      warnings: validation.warnings
    });
  } catch (error: any) {
    console.error("Error collecting specimen:", error);
    return APIResponseHandler.error(res, "COLLECTION_ERROR", error.message);
  }
});

/**
 * POST /api/specimen-tracking/:orderId/update-status
 * Update specimen status and chain of custody
 */
router.post("/:orderId/update-status", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const validatedData = updateStatusSchema.parse(req.body);
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    await specimenTrackingService.updateSpecimenStatus(orderId, validatedData.status, validatedData);
    
    return APIResponseHandler.success(res, {
      message: `Specimen status updated to ${validatedData.status}`
    });
  } catch (error: any) {
    console.error("Error updating specimen status:", error);
    return APIResponseHandler.error(res, "STATUS_ERROR", error.message);
  }
});

/**
 * GET /api/specimen-tracking/:orderId/history
 * Get specimen tracking history and chain of custody
 */
router.get("/:orderId/history", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    const history = await specimenTrackingService.getSpecimenHistory(orderId);
    
    return APIResponseHandler.success(res, history);
  } catch (error: any) {
    console.error("Error fetching specimen history:", error);
    return APIResponseHandler.error(res, "HISTORY_ERROR", error.message);
  }
});

/**
 * GET /api/specimen-tracking/:orderId/check-stability
 * Check specimen stability based on time and temperature
 */
router.get("/:orderId/check-stability", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    const stability = await specimenTrackingService.checkSpecimenStability(orderId);
    
    return APIResponseHandler.success(res, stability);
  } catch (error: any) {
    console.error("Error checking specimen stability:", error);
    return APIResponseHandler.error(res, "STABILITY_ERROR", error.message);
  }
});

/**
 * POST /api/specimen-tracking/:orderId/reject
 * Reject a specimen with reason
 */
router.post("/:orderId/reject", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { reason, rejectedBy, rejectedByName, location } = req.body;
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }
    
    if (!reason) {
      return APIResponseHandler.error(res, "INVALID_REQUEST", "Rejection reason is required");
    }
    
    await specimenTrackingService.updateSpecimenStatus(orderId, 'rejected', {
      performedBy: rejectedBy || (req as any).user?.id,
      performedByName: rejectedByName || ((req as any).user?.firstName + " " + (req as any).user?.lastName),
      location: location || "Lab",
      notes: `Rejected: ${reason}`
    });
    
    return APIResponseHandler.success(res, {
      message: "Specimen rejected successfully"
    });
  } catch (error: any) {
    console.error("Error rejecting specimen:", error);
    return APIResponseHandler.error(res, "REJECTION_ERROR", error.message);
  }
});

export default router;