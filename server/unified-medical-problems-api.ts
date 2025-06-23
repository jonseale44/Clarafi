/**
 * Unified Medical Problems API Routes
 * Provides endpoints for processing medical problems from both SOAP notes and attachments
 */

import { Router } from "express";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";

const router = Router();

/**
 * POST /api/medical-problems/process-unified
 * Unified endpoint for processing medical problems from any source
 */
router.post("/medical-problems/process-unified", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { 
      patientId, 
      encounterId, 
      soapNote, 
      attachmentContent, 
      attachmentId, 
      triggerType 
    } = req.body;
    const providerId = req.user!.id;

    console.log(`🔄 [UnifiedMedicalProblemsAPI] Unified processing request received`);
    console.log(`🔄 [UnifiedMedicalProblemsAPI] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`);
    console.log(`🔄 [UnifiedMedicalProblemsAPI] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`);

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    if (!soapNote && !attachmentContent) {
      return res.status(400).json({ error: "Either SOAP note or attachment content is required" });
    }

    const startTime = Date.now();
    
    // Process using unified parser
    const result = await unifiedMedicalProblemsParser.processUnified(
      patientId,
      encounterId || null,
      soapNote || null,
      attachmentContent || null,
      attachmentId || null,
      providerId,
      triggerType || "manual_edit"
    );

    const response = {
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      problemsAffected: result.total_problems_affected,
      sourceSummary: result.source_summary
    };
    
    console.log(`✅ [UnifiedMedicalProblemsAPI] Processing completed in ${Date.now() - startTime}ms`);
    res.json(response);

  } catch (error) {
    console.error(`❌ [UnifiedMedicalProblemsAPI] Error processing unified request:`, error);
    res.status(500).json({ 
      error: "Failed to process medical problems",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/medical-problems/process-attachment-only
 * Endpoint specifically for attachment-only processing
 */
router.post("/medical-problems/process-attachment-only", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { patientId, attachmentContent, attachmentId } = req.body;
    const providerId = req.user!.id;

    console.log(`🏥 [AttachmentOnlyAPI] Attachment-only processing request received`);
    console.log(`🏥 [AttachmentOnlyAPI] Patient: ${patientId}, Attachment: ${attachmentId}`);
    console.log(`🏥 [AttachmentOnlyAPI] Content length: ${attachmentContent?.length || 0} characters`);

    if (!patientId || !attachmentContent || !attachmentId) {
      return res.status(400).json({ error: "Patient ID, attachment content, and attachment ID are required" });
    }

    const startTime = Date.now();
    
    // Process attachment only
    const result = await unifiedMedicalProblemsParser.processUnified(
      patientId,
      null, // No encounter
      null, // No SOAP note
      attachmentContent,
      attachmentId,
      providerId,
      "attachment_processed"
    );

    const response = {
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      problemsAffected: result.total_problems_affected,
      sourceSummary: result.source_summary
    };
    
    console.log(`✅ [AttachmentOnlyAPI] Processing completed in ${Date.now() - startTime}ms`);
    res.json(response);

  } catch (error) {
    console.error(`❌ [AttachmentOnlyAPI] Error processing attachment:`, error);
    res.status(500).json({ 
      error: "Failed to process attachment medical problems",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/medical-problems/processing-status/:patientId
 * Get processing status and statistics for a patient's medical problems
 */
router.get("/medical-problems/processing-status/:patientId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    
    // This would typically query the database for processing statistics
    // For now, return a placeholder response
    const status = {
      patientId,
      totalProblems: 0, // TODO: Query actual count
      encounterSources: 0, // TODO: Count problems from encounters
      attachmentSources: 0, // TODO: Count problems from attachments
      lastProcessed: null, // TODO: Get last processing timestamp
      pendingProcessing: [] // TODO: List any pending processing tasks
    };

    res.json(status);

  } catch (error) {
    console.error(`❌ [ProcessingStatusAPI] Error getting processing status:`, error);
    res.status(500).json({ 
      error: "Failed to get processing status",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;