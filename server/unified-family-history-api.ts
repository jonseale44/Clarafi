import { Router } from "express";
import { APIResponseHandler } from "./api-response-handler.js";
import { unifiedFamilyHistoryParser } from "./unified-family-history-parser.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * GET /api/family-history/:patientId
 * Get all family history for a patient
 */
router.get("/family-history/:patientId", APIResponseHandler.asyncHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  
  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Getting family history for patient ${patientId}`);
  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Request parameters:`, req.params);
  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Parsed patientId:`, patientId);
  
  try {
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Calling storage.getPatientFamilyHistory(${patientId})`);
    const familyHistoryRecords = await storage.getPatientFamilyHistory(patientId);
    
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Retrieved ${familyHistoryRecords.length} family history entries for patient ${patientId}`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Family history data:`, JSON.stringify(familyHistoryRecords, null, 2));
    
    res.json(familyHistoryRecords);
  } catch (error) {
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error retrieving family history for patient ${patientId}:`, error);
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}));

/**
 * POST /api/family-history/process-unified
 * Process family history from SOAP note and/or attachment content
 */
router.post("/family-history/process-unified", APIResponseHandler.asyncHandler(async (req, res) => {
  const { 
    patientId, 
    encounterId, 
    soapNote, 
    attachmentContent, 
    triggerType = "manual_processing",
    attachmentId 
  } = req.body;

  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Processing unified family history for patient ${patientId}`);
  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Trigger: ${triggerType}, Encounter: ${encounterId}, Attachment: ${attachmentId}`);

  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    const result = await unifiedFamilyHistoryParser.processUnified(
      patientId,
      encounterId || null,
      soapNote || null,
      attachmentContent || null,
      triggerType,
      attachmentId
    );

    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Processing complete: ${result.familyHistoryAffected} family history entries affected`);

    res.json({
      success: result.success,
      familyHistoryAffected: result.familyHistoryAffected,
      encounterFamilyHistory: result.encounterFamilyHistory,
      attachmentFamilyHistory: result.attachmentFamilyHistory,
      changes: result.changes
    });
  } catch (error) {
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error processing family history:`, error);
    res.status(500).json({ 
      error: "Failed to process family history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));

/**
 * POST /api/family-history/:patientId
 * Create new family history entry
 */
router.post("/family-history/:patientId", APIResponseHandler.asyncHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  const { familyMember, medicalHistory, sourceType = "manual_entry", sourceNotes } = req.body;

  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Creating family history for patient ${patientId}: ${familyMember}`);

  if (!familyMember || !medicalHistory) {
    return res.status(400).json({ error: "Family member and medical history are required" });
  }

  try {
    const familyHistoryData = {
      patientId,
      familyMember: familyMember.toLowerCase().trim(),
      medicalHistory: medicalHistory.trim(),
      sourceType,
      sourceNotes,
      sourceConfidence: "1.00",
      enteredBy: req.user?.id,
      visitHistory: [{
        date: new Date().toISOString().split('T')[0],
        notes: `Manually entered family history: ${familyMember} - ${medicalHistory}`,
        source: "manual" as const,
        providerId: req.user?.id,
        providerName: req.user?.username,
        changesMade: ["Created new family history entry"],
        confidence: 1.0
      }]
    };

    const created = await storage.createFamilyHistory(familyHistoryData);
    
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] ✅ Created family history entry ${created.id} for ${familyMember}`);
    
    res.json(created);
  } catch (error) {
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error creating family history:`, error);
    res.status(500).json({ 
      error: "Failed to create family history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));

/**
 * PUT /api/family-history/:id
 * Update existing family history entry
 */
router.put("/family-history/:id", APIResponseHandler.asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { familyMember, medicalHistory, sourceNotes } = req.body;

  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Updating family history entry ${id}`);

  try {
    // Get existing record to preserve visit history
    const existingRecords = await storage.getPatientFamilyHistory(req.body.patientId || 0);
    const existing = existingRecords.find(fh => fh.id === id);
    
    if (!existing) {
      return res.status(404).json({ error: "Family history entry not found" });
    }

    const updateData: any = {};
    
    if (familyMember) {
      updateData.familyMember = familyMember.toLowerCase().trim();
    }
    
    if (medicalHistory) {
      updateData.medicalHistory = medicalHistory.trim();
    }
    
    if (sourceNotes) {
      updateData.sourceNotes = sourceNotes;
    }

    // Add visit history entry for the update
    const visitEntry = {
      date: new Date().toISOString().split('T')[0],
      notes: `Manual update: ${familyMember || existing.familyMember} - ${medicalHistory || existing.medicalHistory}`,
      source: "manual" as const,
      providerId: req.user?.id,
      providerName: req.user?.username,
      changesMade: Object.keys(updateData),
      confidence: 1.0
    };

    const currentVisitHistory = existing.visitHistory || [];
    updateData.visitHistory = [...currentVisitHistory, visitEntry];

    const updated = await storage.updateFamilyHistory(id, updateData);
    
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] ✅ Updated family history entry ${id}`);
    
    res.json(updated);
  } catch (error) {
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error updating family history:`, error);
    res.status(500).json({ 
      error: "Failed to update family history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));

/**
 * DELETE /api/family-history/:id
 * Delete family history entry
 */
router.delete("/family-history/:id", APIResponseHandler.asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Deleting family history entry ${id}`);

  try {
    await storage.deleteFamilyHistory(id);
    
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] ✅ Deleted family history entry ${id}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`👨‍👩‍👧‍👦 [FamilyHistoryAPI] Error deleting family history:`, error);
    res.status(500).json({ 
      error: "Failed to delete family history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));

export { router as unifiedFamilyHistoryRoutes };