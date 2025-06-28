/**
 * Unified Medical Problems API Routes
 * Provides endpoints for processing medical problems from both SOAP notes and attachments
 */

import { Router } from "express";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { db } from "./db.js";
import { medicalProblems } from "../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "./storage.js";
import { calculateBatchRankings, RANKING_CONFIG, type RankingWeights } from "../shared/ranking-calculation-service.js";

const router = Router();

/**
 * GET /api/medical-problems/:patientId
 * Get medical problems for a patient with ranking information
 */
router.get("/medical-problems/:patientId", async (req, res) => {
  try {
    console.log(`🚀🚀🚀 [MedicalProblemsAPI] UNIFIED ROUTE HIT - ENDPOINT CALLED FOR PATIENT ${req.params.patientId} 🚀🚀🚀`);
    console.log(`🔍 [MedicalProblemsAPI] Full request URL: ${req.originalUrl}`);
    console.log(`🔍 [MedicalProblemsAPI] Request method: ${req.method}`);
    console.log(`🔍 [MedicalProblemsAPI] GET request for patient ${req.params.patientId}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [MedicalProblemsAPI] Authentication failed`);
      console.log(`❌ [MedicalProblemsAPI] User object:`, req.user || 'NO USER OBJECT');
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`✅ [MedicalProblemsAPI] User authenticated:`, req.user ? `User ID ${req.user.id}` : 'AUTH SUCCESS BUT NO USER OBJECT');

    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [MedicalProblemsAPI] Raw patientId param: "${req.params.patientId}"`);
    console.log(`🔍 [MedicalProblemsAPI] Parsed patientId: ${patientId}`);
    console.log(`🔍 [MedicalProblemsAPI] Fetching problems for patient ID: ${patientId}`);
    
    if (isNaN(patientId)) {
      console.log(`❌ [MedicalProblemsAPI] Invalid patient ID: ${req.params.patientId}`);
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    // Get medical problems using storage service
    console.log(`🔍 [MedicalProblemsAPI] About to call storage.getPatientMedicalProblems(${patientId})`);
    const problems = await storage.getPatientMedicalProblems(patientId);
    console.log(`🔍 [MedicalProblemsAPI] storage.getPatientMedicalProblems() returned ${problems.length} problems for patient ${patientId}`);

    // Format for frontend display with ranking information
    const formattedProblems = problems.map(problem => ({
      id: problem.id,
      problemTitle: problem.problemTitle,
      currentIcd10Code: problem.currentIcd10Code,
      problemStatus: problem.problemStatus,
      firstDiagnosedDate: problem.firstDiagnosedDate,
      visitHistory: problem.visitHistory || [],
      changeLog: problem.changeLog || [],
      lastUpdated: problem.updatedAt,
      // Include ranking information
      rankScore: problem.rankScore ? parseFloat(problem.rankScore.toString()) : undefined,
      lastRankedEncounterId: problem.lastRankedEncounterId,
      rankingReason: problem.rankingReason,
      // Include ranking factors for frontend real-time calculation
      rankingFactors: problem.rankingFactors ? (typeof problem.rankingFactors === 'string' ? JSON.parse(problem.rankingFactors) : problem.rankingFactors) : null
    }));

    console.log(`✅ [MedicalProblemsAPI] Returning ${formattedProblems.length} formatted problems`);
    console.log(`🔍 [MedicalProblemsAPI] Problems with ranking:`, formattedProblems.map(p => ({ 
      id: p.id, 
      title: p.problemTitle, 
      rank: p.rankScore,
      status: p.problemStatus
    })));

    res.json(formattedProblems);
  } catch (error) {
    console.error(`❌ [MedicalProblemsAPI] Error fetching medical problems for patient ${req.params.patientId}:`, error);
    res.status(500).json({ error: "Failed to fetch medical problems" });
  }
});

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
    
    // Get actual processing status and statistics
    const totalProblems = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicalProblems)
      .where(eq(medicalProblems.patientId, patientId));

    const encounterSources = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicalProblems)
      .where(
        and(
          eq(medicalProblems.patientId, patientId),
          sql`visit_history::text LIKE '%"source":"encounter"%'`
        )
      );

    const attachmentSources = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicalProblems)
      .where(
        and(
          eq(medicalProblems.patientId, patientId),
          sql`visit_history::text LIKE '%"source":"attachment"%'`
        )
      );

    const lastProcessedResult = await db
      .select({ lastUpdated: medicalProblems.updatedAt })
      .from(medicalProblems)
      .where(eq(medicalProblems.patientId, patientId))
      .orderBy(desc(medicalProblems.updatedAt))
      .limit(1);

    const status = {
      patientId,
      totalProblems: totalProblems[0]?.count || 0,
      encounterSources: encounterSources[0]?.count || 0,
      attachmentSources: attachmentSources[0]?.count || 0,
      lastProcessed: lastProcessedResult[0]?.lastUpdated || null,
      pendingProcessing: [] // No queue system currently implemented
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

/**
 * DELETE /api/medical-problems/:problemId
 * Delete a specific medical problem
 */
router.delete("/medical-problems/:problemId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const problemId = parseInt(req.params.problemId);
    console.log(`🗑️ [UnifiedMedicalProblemsAPI] Delete request for problem ${problemId}`);
    
    if (isNaN(problemId)) {
      return res.status(400).json({ error: "Invalid problem ID" });
    }

    // Delete the medical problem using storage service
    await storage.deleteMedicalProblem(problemId);

    console.log(`✅ [UnifiedMedicalProblemsAPI] Problem ${problemId} deleted successfully`);
    res.json({ success: true, message: "Medical problem deleted successfully" });

  } catch (error) {
    console.error(`❌ [UnifiedMedicalProblemsAPI] Error deleting problem ${req.params.problemId}:`, error);
    res.status(500).json({ error: "Failed to delete medical problem" });
  }
});

/**
 * PUT /api/medical-problems/:problemId/resolve
 * Mark a medical problem as resolved
 */
router.put("/medical-problems/:problemId/resolve", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const problemId = parseInt(req.params.problemId);
    console.log(`🔄 [UnifiedMedicalProblemsAPI] Resolve request for problem ${problemId}`);
    
    if (isNaN(problemId)) {
      return res.status(400).json({ error: "Invalid problem ID" });
    }

    // Update the problem status to resolved
    await storage.updateMedicalProblemStatus(problemId, "resolved");

    console.log(`✅ [UnifiedMedicalProblemsAPI] Problem ${problemId} marked as resolved`);
    res.json({ success: true, message: "Medical problem marked as resolved" });

  } catch (error) {
    console.error(`❌ [UnifiedMedicalProblemsAPI] Error resolving problem ${req.params.problemId}:`, error);
    res.status(500).json({ error: "Failed to resolve medical problem" });
  }
});

/**
 * POST /api/medical-problems/manual-create
 * Manually create a new medical problem with AI-powered standardization
 */
router.post("/medical-problems/manual-create", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    console.log(`🔍 [ManualCreate] FULL REQUEST BODY:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [ManualCreate] REQUEST HEADERS:`, JSON.stringify(req.headers, null, 2));

    const { 
      patientId, 
      problemTitle, 
      diagnosis, 
      currentIcd10Code,
      icd10Code, 
      problemStatus,
      status, 
      firstDiagnosedDate, 
      visitHistory 
    } = req.body;

    const title = problemTitle || diagnosis;
    console.log(`🔨 [ManualCreate] Extracted values:`);
    console.log(`  - patientId: ${patientId} (type: ${typeof patientId})`);
    console.log(`  - problemTitle: ${problemTitle}`);
    console.log(`  - diagnosis: ${diagnosis}`);
    console.log(`  - title: ${title}`);
    console.log(`  - currentIcd10Code: ${currentIcd10Code}`);
    console.log(`  - icd10Code: ${icd10Code}`);
    console.log(`  - problemStatus: ${problemStatus}`);
    console.log(`  - status: ${status}`);
    
    if (!patientId || !title) {
      return res.status(400).json({ error: "Patient ID and diagnosis are required" });
    }

    // Create the medical problem using storage service
    const newProblem = await storage.createMedicalProblem({
      patientId: parseInt(patientId),
      problemTitle: title,
      currentIcd10Code: currentIcd10Code || icd10Code || null,
      problemStatus: problemStatus || status || 'active',
      firstDiagnosedDate: firstDiagnosedDate || null,
      visitHistory: visitHistory || [],
      rankScore: null, // Will be calculated later
      rankingReason: 'Manually created - ranking pending',
      lastRankedEncounterId: null
    });

    console.log(`✅ [ManualCreate] Created medical problem ${newProblem.id}: ${title}`);
    res.json({ 
      success: true, 
      problem: newProblem,
      message: "Medical problem created successfully" 
    });

  } catch (error) {
    console.error(`❌ [ManualCreate] Error creating medical problem:`, error);
    res.status(500).json({ error: "Failed to create medical problem" });
  }
});

/**
 * PUT /api/medical-problems/:problemId
 * Update an existing medical problem
 */
router.put("/medical-problems/:problemId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const problemId = parseInt(req.params.problemId);
    const { 
      problemTitle,
      diagnosis, 
      currentIcd10Code,
      icd10Code, 
      problemStatus,
      status, 
      firstDiagnosedDate, 
      visitHistory 
    } = req.body;

    const title = problemTitle || diagnosis;
    console.log(`🔨 [ManualUpdate] Updating medical problem ${problemId}:`, title);
    
    if (isNaN(problemId)) {
      return res.status(400).json({ error: "Invalid problem ID" });
    }

    // Update the medical problem using storage service
    const updated = await storage.updateMedicalProblem(problemId, {
      problemTitle: title,
      currentIcd10Code: currentIcd10Code || icd10Code,
      problemStatus: problemStatus || status,
      firstDiagnosedDate: firstDiagnosedDate,
      visitHistory: visitHistory
    });

    console.log(`✅ [ManualUpdate] Updated medical problem ${problemId}: ${title}`);
    res.json({ 
      success: true, 
      message: "Medical problem updated successfully" 
    });

  } catch (error) {
    console.error(`❌ [ManualUpdate] Error updating medical problem:`, error);
    res.status(500).json({ error: "Failed to update medical problem" });
  }
});

/**
 * POST /api/medical-problems/refresh-rankings/:patientId
 * Refresh medical problem rankings using unified parser with consolidation and AI intelligence
 */
router.post("/medical-problems/refresh-rankings/:patientId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    console.log(`🔄 [RankingRefresh] Refresh rankings request for patient ${patientId} - using unified parser`);
    
    if (isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    // Use unified medical problems parser for intelligent ranking and consolidation
    const processingResult = await unifiedMedicalProblemsParser.processUnified(
      patientId,
      null, // No specific encounter for manual refresh
      '', // Empty SOAP content - processing existing problems 
      null, // No attachment content
      null, // No attachment ID
      req.user.id, // Provider ID
      "manual_ranking_refresh" // Trigger type
    );

    console.log(`✅ [RankingRefresh] Unified parser completed:`, {
      problemsProcessed: processingResult.summary.total_problems_affected,
      consolidationsPerformed: processingResult.summary.consolidations_performed || 0,
      newProblemsCreated: processingResult.summary.new_problems_created || 0
    });

    res.json({ 
      success: true, 
      message: `Rankings refreshed using AI intelligence`,
      refreshedCount: processingResult.summary.total_problems_affected,
      consolidationsPerformed: processingResult.summary.consolidations_performed || 0,
      processingResult
    });

  } catch (error) {
    console.error(`❌ [RankingRefresh] Error refreshing rankings with unified parser for patient ${req.params.patientId}:`, error);
    res.status(500).json({ error: "Failed to refresh rankings using AI" });
  }
});

export default router;