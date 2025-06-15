import express from "express";
import { nursingSummaryGenerator } from "./nursing-summary-generator.js";
import { APIResponseHandler } from "./api-response-handler.js";

const router = express.Router();

/**
 * POST /api/encounters/:encounterId/generate-nursing-summary
 * Generate nursing summary from template data and transcription
 */
router.post("/:encounterId/generate-nursing-summary", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { templateData, transcription, patientId } = req.body;

    if (!templateData || !patientId) {
      return APIResponseHandler.badRequest(res, "Template data and patient ID are required");
    }

    console.log(`🏥 [NursingSummaryAPI] Generating summary for encounter ${encounterId}`);

    const nursingSummary = await nursingSummaryGenerator.generateNursingSummary(
      templateData,
      transcription || "",
      parseInt(patientId),
      encounterId
    );

    return APIResponseHandler.success(res, { 
      nursingSummary,
      message: "Nursing summary generated successfully" 
    });

  } catch (error) {
    console.error("❌ [NursingSummaryAPI] Error generating summary:", error);
    return APIResponseHandler.error(res, "SUMMARY_GENERATION_FAILED", "Failed to generate nursing summary");
  }
});

/**
 * GET /api/encounters/:encounterId/nursing-summary
 * Get existing nursing summary for an encounter
 */
router.get("/:encounterId/nursing-summary", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const encounterId = parseInt(req.params.encounterId);
    const nursingSummary = await nursingSummaryGenerator.getNursingSummary(encounterId);

    return APIResponseHandler.success(res, { nursingSummary });

  } catch (error) {
    console.error("❌ [NursingSummaryAPI] Error retrieving summary:", error);
    return APIResponseHandler.error(res, "SUMMARY_RETRIEVAL_FAILED", "Failed to retrieve nursing summary");
  }
});

/**
 * PUT /api/encounters/:encounterId/nursing-summary
 * Update nursing summary (nurse editing)
 */
router.put("/:encounterId/nursing-summary", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { nursingSummary } = req.body;

    if (!nursingSummary) {
      return APIResponseHandler.badRequest(res, "Nursing summary content is required");
    }

    // Import db and encounters here to avoid circular dependencies
    const { db } = await import("./db.js");
    const { encounters } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(encounters)
      .set({ 
        nurseNotes: nursingSummary,
        updatedAt: new Date()
      })
      .where(eq(encounters.id, encounterId));

    console.log(`💾 [NursingSummaryAPI] Updated summary for encounter ${encounterId}`);

    return APIResponseHandler.success(res, { 
      message: "Nursing summary updated successfully" 
    });

  } catch (error) {
    console.error("❌ [NursingSummaryAPI] Error updating summary:", error);
    return APIResponseHandler.error(res, "SUMMARY_UPDATE_FAILED", "Failed to update nursing summary");
  }
});

export default router;