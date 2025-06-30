import { Router } from "express";
import { APIResponseHandler } from "./api-response-handler.js";
import { unifiedSurgicalHistoryParser } from "./unified-surgical-history-parser.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * Unified Surgical History API
 * 
 * Handles automatic extraction from SOAP notes and attachments
 * Uses GPT-4.1 for intelligent surgical procedure recognition and consolidation
 * Follows same architecture as UnifiedMedicalProblemsAPI
 */

/**
 * GET /api/surgical-history/:patientId
 * Retrieve surgical history for a patient
 */
router.get("/surgical-history/:patientId", 
  APIResponseHandler.asyncHandler(async (req, res) => {
    const patientId = parseInt(req.params.patientId);
    
    if (!patientId) {
      return res.status(400).json({ error: "Valid patient ID required" });
    }

    console.log(`🏥 [SurgicalHistoryAPI] Getting surgical history for patient ${patientId}`);

    try {
      const surgicalHistory = await storage.getPatientSurgicalHistory(patientId);
      
      console.log(`🏥 [SurgicalHistoryAPI] Retrieved ${surgicalHistory.length} surgical procedures for patient ${patientId}`);
      
      res.json(surgicalHistory);
    } catch (error) {
      console.error(`🏥 [SurgicalHistoryAPI] Error retrieving surgical history:`, error);
      res.status(500).json({ error: "Failed to retrieve surgical history" });
    }
  })
);

/**
 * POST /api/surgical-history/process-unified
 * Process surgical history from SOAP notes and/or attachments
 * This endpoint handles both encounter-based and attachment-based processing
 */
router.post("/surgical-history/process-unified",
  APIResponseHandler.asyncHandler(async (req, res) => {
    const {
      patientId,
      encounterId,
      soapNote,
      attachmentContent,
      attachmentId,
      providerId,
      triggerType = "manual_edit"
    } = req.body;

    console.log(`🏥 [SurgicalHistoryAPI] === UNIFIED PROCESSING REQUEST ===`);
    console.log(`🏥 [SurgicalHistoryAPI] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`);
    console.log(`🏥 [SurgicalHistoryAPI] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`);
    console.log(`🏥 [SurgicalHistoryAPI] Trigger: ${triggerType}`);

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    if (!soapNote && !attachmentContent) {
      return res.status(400).json({ error: "Either SOAP note or attachment content is required" });
    }

    try {
      const result = await unifiedSurgicalHistoryParser.processUnified(
        patientId,
        encounterId || null,
        soapNote || null,
        attachmentContent || null,
        attachmentId || null,
        providerId || 1, // Default to admin user if not provided
        triggerType
      );

      console.log(`🏥 [SurgicalHistoryAPI] === PROCESSING COMPLETE ===`);
      console.log(`🏥 [SurgicalHistoryAPI] Success: ${result.success}, Surgeries affected: ${result.total_surgeries_affected}`);
      console.log(`🏥 [SurgicalHistoryAPI] Processing time: ${result.processing_time_ms}ms`);

      res.json(result);
    } catch (error) {
      console.error(`🏥 [SurgicalHistoryAPI] ❌ Error in unified processing:`, error);
      res.status(500).json({ 
        error: "Failed to process surgical history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * PUT /api/surgical-history/:surgeryId
 * Update an existing surgical history entry
 */
router.put("/surgical-history/:surgeryId",
  APIResponseHandler.asyncHandler(async (req, res) => {
    const surgeryId = parseInt(req.params.surgeryId);
    const updates = req.body;

    if (!surgeryId) {
      return res.status(400).json({ error: "Valid surgery ID required" });
    }

    console.log(`🏥 [SurgicalHistoryAPI] Updating surgery ${surgeryId}`);

    try {
      // Add timestamp to updates
      updates.updatedAt = new Date();

      // Update using direct database query since this is manual editing
      const { db } = await import("./db.js");
      const { surgicalHistory } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");

      const result = await db
        .update(surgicalHistory)
        .set(updates)
        .where(eq(surgicalHistory.id, surgeryId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Surgical history entry not found" });
      }

      console.log(`🏥 [SurgicalHistoryAPI] ✅ Updated surgery ${surgeryId}`);
      res.json(result[0]);
    } catch (error) {
      console.error(`🏥 [SurgicalHistoryAPI] Error updating surgical history:`, error);
      res.status(500).json({ error: "Failed to update surgical history" });
    }
  })
);

/**
 * DELETE /api/surgical-history/:surgeryId
 * Delete a surgical history entry
 */
router.delete("/surgical-history/:surgeryId",
  APIResponseHandler.asyncHandler(async (req, res) => {
    const surgeryId = parseInt(req.params.surgeryId);

    if (!surgeryId) {
      return res.status(400).json({ error: "Valid surgery ID required" });
    }

    console.log(`🏥 [SurgicalHistoryAPI] Deleting surgery ${surgeryId}`);

    try {
      const { db } = await import("./db.js");
      const { surgicalHistory } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");

      const result = await db
        .delete(surgicalHistory)
        .where(eq(surgicalHistory.id, surgeryId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Surgical history entry not found" });
      }

      console.log(`🏥 [SurgicalHistoryAPI] ✅ Deleted surgery ${surgeryId}`);
      res.json({ success: true, deleted: result[0] });
    } catch (error) {
      console.error(`🏥 [SurgicalHistoryAPI] Error deleting surgical history:`, error);
      res.status(500).json({ error: "Failed to delete surgical history" });
    }
  })
);

/**
 * POST /api/surgical-history
 * Create a new surgical history entry manually
 */
router.post("/surgical-history",
  APIResponseHandler.asyncHandler(async (req, res) => {
    const surgeryData = req.body;

    console.log(`🏥 [SurgicalHistoryAPI] Creating new surgery manually`);

    if (!surgeryData.patientId || !surgeryData.procedureName) {
      return res.status(400).json({ error: "Patient ID and procedure name are required" });
    }

    try {
      const { db } = await import("./db.js");
      const { surgicalHistory } = await import("../shared/schema.js");

      // Set metadata for manual entry
      surgeryData.sourceType = "manual_entry";
      surgeryData.sourceConfidence = 1.0;
      surgeryData.enteredBy = req.user?.id || 1;
      surgeryData.createdAt = new Date();
      surgeryData.updatedAt = new Date();

      const result = await db
        .insert(surgicalHistory)
        .values([surgeryData])
        .returning();

      console.log(`🏥 [SurgicalHistoryAPI] ✅ Created surgery ${result[0].id}`);
      res.json(result[0]);
    } catch (error) {
      console.error(`🏥 [SurgicalHistoryAPI] Error creating surgical history:`, error);
      res.status(500).json({ error: "Failed to create surgical history" });
    }
  })
);

export default router;