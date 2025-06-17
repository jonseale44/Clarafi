import { Router } from "express";
import { storage } from "./storage";
import { medicalProblemsDelta } from "./medical-problems-delta-service";
import { insertMedicalProblemSchema } from "@shared/schema";

const router = Router();

/**
 * GET /api/patients/:patientId/medical-problems-enhanced
 * Get enhanced medical problems with visit history for a patient
 */
router.get("/patients/:patientId/medical-problems-enhanced", async (req, res) => {
  try {
    console.log(`🔍 [EnhancedMedicalProblems] GET request for patient ${req.params.patientId}`);
    console.log(`🔍 [EnhancedMedicalProblems] User authenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [EnhancedMedicalProblems] Authentication failed`);
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [EnhancedMedicalProblems] Fetching problems for patient ID: ${patientId}`);
    
    const problems = await storage.getPatientMedicalProblems(patientId);
    console.log(`🔍 [EnhancedMedicalProblems] Found ${problems.length} problems`);
    problems.forEach((problem, index) => {
      console.log(`🔍 [EnhancedMedicalProblems] Problem ${index + 1}: ${problem.problemTitle} (${problem.currentIcd10Code})`);
    });

    // Format for frontend display with visit history
    const formattedProblems = problems.map(problem => ({
      id: problem.id,
      problemTitle: problem.problemTitle,
      currentIcd10Code: problem.currentIcd10Code,
      problemStatus: problem.problemStatus,
      firstDiagnosedDate: problem.firstDiagnosedDate,
      visitHistory: problem.visitHistory || [],
      changeLog: problem.changeLog || [],
      lastUpdated: problem.updatedAt
    }));

    res.json(formattedProblems);
  } catch (error) {
    console.error("Error fetching enhanced medical problems:", error);
    res.status(500).json({ error: "Failed to fetch medical problems" });
  }
});

/**
 * GET /api/medical-problems/:problemId/visit-history
 * Get detailed visit history for a specific medical problem
 */
router.get("/medical-problems/:problemId/visit-history", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const problemId = parseInt(req.params.problemId);
    const visitHistory = await storage.getMedicalProblemVisitHistory(problemId);

    // Sort by date descending (newest first)
    const sortedHistory = visitHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(sortedHistory);
  } catch (error) {
    console.error("Error fetching visit history:", error);
    res.status(500).json({ error: "Failed to fetch visit history" });
  }
});

/**
 * POST /api/encounters/:encounterId/process-medical-problems
 * Process SOAP note for medical problems using delta approach
 */
router.post("/encounters/:encounterId/process-medical-problems", async (req, res) => {
  try {
    console.log(`🏥 [MedicalProblemsAPI] === PROCESSING REQUEST START ===`);
    console.log(`🏥 [MedicalProblemsAPI] Encounter ID: ${req.params.encounterId}`);
    console.log(`🏥 [MedicalProblemsAPI] Request body keys: ${Object.keys(req.body)}`);
    console.log(`🏥 [MedicalProblemsAPI] User authenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [MedicalProblemsAPI] User not authenticated`);
      return res.sendStatus(401);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { soapNote, patientId, triggerType } = req.body;
    const providerId = req.user!.id;

    console.log(`🏥 [MedicalProblemsAPI] Parsed encounter ID: ${encounterId}`);
    console.log(`🏥 [MedicalProblemsAPI] Patient ID: ${patientId}`);
    console.log(`🏥 [MedicalProblemsAPI] Provider ID: ${providerId}`);
    console.log(`🏥 [MedicalProblemsAPI] Trigger type: ${triggerType || 'recording_completion'}`);
    console.log(`🏥 [MedicalProblemsAPI] SOAP note length: ${soapNote?.length || 0} characters`);
    console.log(`🏥 [MedicalProblemsAPI] SOAP note preview: ${soapNote?.substring(0, 100) || 'empty'}...`);

    if (!soapNote || !patientId) {
      console.log(`❌ [MedicalProblemsAPI] Missing required fields - soapNote: ${!!soapNote}, patientId: ${!!patientId}`);
      return res.status(400).json({ error: "SOAP note and patient ID are required" });
    }

    console.log(`🏥 [MedicalProblemsAPI] Calling delta processing service...`);
    const startTime = Date.now();
    
    // Process medical problems incrementally
    const result = await medicalProblemsDelta.processSOAPDelta(
      patientId,
      encounterId,
      soapNote,
      providerId,
      triggerType || 'recording_complete'
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MedicalProblemsAPI] Delta processing completed in ${totalTime}ms`);
    console.log(`✅ [MedicalProblemsAPI] Result:`, result);

    const response = {
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      problemsAffected: result.total_problems_affected
    };
    
    console.log(`✅ [MedicalProblemsAPI] Sending response:`, response);
    console.log(`🏥 [MedicalProblemsAPI] === PROCESSING REQUEST END ===`);
    
    res.json(response);

  } catch (error) {
    console.error(`❌ [MedicalProblemsAPI] Error processing medical problems:`, error);
    console.error(`❌ [MedicalProblemsAPI] Stack trace:`, (error as Error).stack);
    res.status(500).json({ error: "Failed to process medical problems" });
  }
});

/**
 * POST /api/encounters/:encounterId/sign-medical-problems
 * Sign encounter - finalize all medical problem visit entries
 */
router.post("/encounters/:encounterId/sign-medical-problems", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const providerId = req.user!.id;

    await medicalProblemsDelta.signEncounter(encounterId, providerId);

    res.json({ success: true, message: "Medical problems signed for encounter" });

  } catch (error) {
    console.error("Error signing medical problems:", error);
    res.status(500).json({ error: "Failed to sign medical problems" });
  }
});

/**
 * POST /api/patients/:patientId/medical-problems-enhanced
 * Create new medical problem manually with visit history
 */
router.post("/patients/:patientId/medical-problems-enhanced", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const { problemTitle, currentIcd10Code, problemStatus, firstDiagnosedDate, visitHistory = [] } = req.body;
    const providerId = req.user!.id;

    console.log(`🔍 [EnhancedMedicalProblems] Creating new problem for patient ${patientId}`);
    console.log(`🔍 [EnhancedMedicalProblems] Problem data:`, { problemTitle, currentIcd10Code, problemStatus, firstDiagnosedDate });
    console.log(`🔍 [EnhancedMedicalProblems] Visit history entries:`, visitHistory.length);

    // Process visit history to ensure proper DP date handling
    const processedVisitHistory = visitHistory.map((visit: any) => ({
      date: visit.date, // DP - authoritative date
      notes: visit.notes,
      source: visit.source || "manual",
      encounterId: visit.encounterId || null,
      providerId: visit.providerId || providerId,
      providerName: visit.providerName || req.user!.firstName + " " + req.user!.lastName,
    }));

    // Sort by date descending for consistent display
    processedVisitHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const changeLog = [{
      action: "created",
      details: "Problem manually created with enhanced visit history",
      timestamp: new Date().toISOString(),
      providerId: providerId
    }];

    const problemData = {
      patientId,
      problemTitle,
      currentIcd10Code: currentIcd10Code || null,
      problemStatus: problemStatus || "active",
      firstDiagnosedDate: firstDiagnosedDate || null,
      visitHistory: processedVisitHistory,
      changeLog: changeLog
    };

    const problem = await storage.createMedicalProblem(problemData);
    console.log(`✅ [EnhancedMedicalProblems] Created problem with ID: ${problem.id}`);
    
    res.status(201).json(problem);

  } catch (error) {
    console.error("Error creating enhanced medical problem:", error);
    res.status(500).json({ error: "Failed to create medical problem" });
  }
});

/**
 * PUT /api/medical-problems/:problemId
 * Update medical problem with enhanced visit history
 */
router.put("/medical-problems/:problemId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const problemId = parseInt(req.params.problemId);
    const { problemTitle, currentIcd10Code, problemStatus, firstDiagnosedDate, visitHistory = [] } = req.body;
    const providerId = req.user!.id;

    console.log(`🔍 [EnhancedMedicalProblems] Updating problem ${problemId}`);
    console.log(`🔍 [EnhancedMedicalProblems] New visit history entries:`, visitHistory.length);

    // Get existing problem to preserve change log
    const existingProblem = await storage.getMedicalProblem(problemId);
    if (!existingProblem) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    // Process visit history with DP date handling
    const processedVisitHistory = visitHistory.map((visit: any) => ({
      date: visit.date, // DP - authoritative date
      notes: visit.notes,
      source: visit.source || "manual",
      encounterId: visit.encounterId || null,
      providerId: visit.providerId || providerId,
      providerName: visit.providerName || req.user!.firstName + " " + req.user!.lastName,
    }));

    // Sort by date descending
    processedVisitHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Add to change log
    const updatedChangeLog = [
      ...(existingProblem.changeLog as any[] || []),
      {
        action: "updated",
        details: "Problem manually updated with enhanced visit history",
        timestamp: new Date().toISOString(),
        providerId: providerId
      }
    ];

    const updates = {
      problemTitle,
      currentIcd10Code: currentIcd10Code || null,
      problemStatus: problemStatus || "active",
      firstDiagnosedDate: firstDiagnosedDate || null,
      visitHistory: processedVisitHistory,
      changeLog: updatedChangeLog,
      updatedAt: new Date()
    };

    const updatedProblem = await storage.updateMedicalProblem(problemId, updates);
    console.log(`✅ [EnhancedMedicalProblems] Updated problem ${problemId}`);
    
    res.json(updatedProblem);

  } catch (error) {
    console.error("Error updating enhanced medical problem:", error);
    res.status(500).json({ error: "Failed to update medical problem" });
  }
});

/**
 * GET /api/medical-problems/:problemId
 * Get single medical problem with full details
 */
router.get("/medical-problems/:problemId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const problemId = parseInt(req.params.problemId);
    const problem = await storage.getMedicalProblem(problemId);

    if (!problem) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    res.json(problem);

  } catch (error) {
    console.error("Error fetching medical problem:", error);
    res.status(500).json({ error: "Failed to fetch medical problem" });
  }
});

export default router;