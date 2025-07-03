import { Router } from "express";
import { APIResponseHandler } from "./api-response-handler.js";
import { unifiedSocialHistoryParser } from "./unified-social-history-parser.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * GET /api/social-history/:patientId
 * Get all social history for a patient
 */
router.get("/social-history/:patientId", APIResponseHandler.asyncHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  
  console.log(`🚬 [SocialHistoryAPI] Fetching social history for patient ${patientId}`);
  
  if (!patientId) {
    return res.status(400).json({ error: "Invalid patient ID" });
  }

  try {
    const socialHistoryData = await storage.getSocialHistory(patientId);
    console.log(`🚬 [SocialHistoryAPI] Retrieved ${socialHistoryData.length} social history entries`);
    
    // Sort visit history by creation order (most recent first) for each entry
    const sortedData = socialHistoryData.map(entry => ({
      ...entry,
      visitHistory: entry.visitHistory ? 
        (typeof entry.visitHistory === 'string' ? JSON.parse(entry.visitHistory) : entry.visitHistory)
          .sort((a: any, b: any) => {
            // Primary sort: date descending
            const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateComparison !== 0) return dateComparison;
            
            // Secondary sort: attachment/encounter ID descending (higher ID = more recent)
            const aId = a.attachmentId || a.encounterId || 0;
            const bId = b.attachmentId || b.encounterId || 0;
            return bId - aId;
          })
        : []
    }));
    
    res.json(sortedData);
  } catch (error: any) {
    console.error(`🚬 [SocialHistoryAPI] Error fetching social history:`, error);
    console.error(`🚬 [SocialHistoryAPI] Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}));

/**
 * POST /api/social-history/process-unified
 * Process social history from SOAP note and/or attachment content
 */
router.post("/social-history/process-unified", APIResponseHandler.asyncHandler(async (req, res) => {
  const { 
    patientId, 
    encounterId, 
    soapNote, 
    attachmentContent, 
    triggerType = "manual_processing",
    attachmentId 
  } = req.body;

  console.log(`🚬 [SocialHistoryAPI] Processing unified social history for patient ${patientId}`);
  console.log(`🚬 [SocialHistoryAPI] Trigger: ${triggerType}, Encounter: ${encounterId}, Attachment: ${attachmentId}`);

  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    const result = await unifiedSocialHistoryParser.processUnified(
      patientId,
      encounterId || null,
      soapNote || null,
      attachmentContent || null,
      attachmentId || null,
      2, // Default provider ID (Jonathan Seale)
      triggerType
    );

    console.log(`🚬 [SocialHistoryAPI] Processing complete: ${result.changes.length} changes, ${result.socialHistoryAffected} entries affected`);

    res.json({
      success: true,
      socialHistoryAffected: result.socialHistoryAffected,
      changes: result.changes,
      encounterSocialHistory: result.encounterSocialHistory,
      attachmentSocialHistory: result.attachmentSocialHistory,
    });

  } catch (error: any) {
    console.error(`🚬 [SocialHistoryAPI] Error processing social history:`, error);
    res.status(500).json({ 
      error: "Failed to process social history",
      details: error.message 
    });
  }
}));

/**
 * PUT /api/social-history/:socialHistoryId
 * Update a specific social history entry
 */
router.put("/social-history/:socialHistoryId", APIResponseHandler.asyncHandler(async (req, res) => {
  const socialHistoryId = parseInt(req.params.socialHistoryId);
  const updateData = req.body;

  console.log(`🚬 [SocialHistoryAPI] Updating social history ${socialHistoryId}`);

  if (!socialHistoryId) {
    return res.status(400).json({ error: "Invalid social history ID" });
  }

  try {
    const result = await storage.updateSocialHistory(socialHistoryId, updateData);
    console.log(`🚬 [SocialHistoryAPI] Social history ${socialHistoryId} updated successfully`);
    
    res.json({
      success: true,
      socialHistory: result
    });

  } catch (error: any) {
    console.error(`🚬 [SocialHistoryAPI] Error updating social history:`, error);
    res.status(500).json({ 
      error: "Failed to update social history",
      details: error.message 
    });
  }
}));

/**
 * DELETE /api/social-history/:socialHistoryId
 * Delete a specific social history entry
 */
router.delete("/social-history/:socialHistoryId", APIResponseHandler.asyncHandler(async (req, res) => {
  const socialHistoryId = parseInt(req.params.socialHistoryId);

  console.log(`🚬 [SocialHistoryAPI] Deleting social history ${socialHistoryId}`);

  if (!socialHistoryId) {
    return res.status(400).json({ error: "Invalid social history ID" });
  }

  try {
    await storage.deleteSocialHistory(socialHistoryId);
    console.log(`🚬 [SocialHistoryAPI] Social history ${socialHistoryId} deleted successfully`);
    
    res.json({
      success: true,
      message: "Social history deleted successfully"
    });

  } catch (error: any) {
    console.error(`🚬 [SocialHistoryAPI] Error deleting social history:`, error);
    res.status(500).json({ 
      error: "Failed to delete social history",
      details: error.message 
    });
  }
}));

/**
 * POST /api/social-history/:patientId
 * Create a new social history entry manually
 */
router.post("/social-history/:patientId", APIResponseHandler.asyncHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  const socialHistoryData = req.body;

  console.log(`🚬 [SocialHistoryAPI] Creating new social history for patient ${patientId}`);

  if (!patientId) {
    return res.status(400).json({ error: "Invalid patient ID" });
  }

  try {
    const result = await storage.createSocialHistory({
      ...socialHistoryData,
      patientId,
      sourceType: "manual_entry",
      sourceConfidence: "1.00",
      enteredBy: 1, // Using existing user ID (jonseale) - TODO: make configurable
      visitHistory: socialHistoryData.visitHistory || [],
    });

    console.log(`🚬 [SocialHistoryAPI] Social history created successfully: ${result.id}`);
    
    res.json({
      success: true,
      socialHistory: result
    });

  } catch (error: any) {
    console.error(`🚬 [SocialHistoryAPI] Error creating social history:`, error);
    res.status(500).json({ 
      error: "Failed to create social history",
      details: error.message 
    });
  }
}));

export { router as socialHistoryRoutes };