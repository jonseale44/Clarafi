import { Router } from "express";
import { storage } from "./storage";
import { medicalProblemsDelta } from "./medical-problems-delta-service";
import { insertMedicalProblemSchema } from "@shared/schema";

const router = Router();

/**
 * GET /api/patients/:patientId/medical-problems
 * Get all medical problems for a patient (backward compatible format)
 */
router.get("/patients/:patientId/medical-problems", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [MedicalProblems] Fetching problems for patient ID: ${patientId}`);
    
    const medicalProblems = await storage.getPatientMedicalProblems(patientId);
    console.log(`🔍 [MedicalProblems] Found ${medicalProblems.length} problems`);
    
    // Format for backward compatibility with existing UI components
    const formattedProblems = medicalProblems.map(problem => ({
      id: problem.id,
      diagnosis: problem.problemTitle,
      icd10Code: problem.currentIcd10Code,
      diagnosisDate: problem.firstDiagnosedDate,
      status: problem.problemStatus,
      notes: (Array.isArray(problem.visitHistory) ? problem.visitHistory[0]?.notes : '') || '',
      encounterId: problem.firstEncounterId,
      createdAt: problem.createdAt,
      // Include rich visit history data for enhanced components
      visitHistory: problem.visitHistory || [],
      changeLog: problem.changeLog || [],
    }));

    console.log(`🔍 [MedicalProblems] Returning formatted problems:`, formattedProblems);
    res.json(formattedProblems);
  } catch (error) {
    console.error("Error fetching medical problems:", error);
    res.status(500).json({ error: "Failed to fetch medical problems" });
  }
});

/**
 * GET /api/patients/:patientId/medical-problems-enhanced
 * Get enhanced medical problems with visit history for a patient
 */
router.get("/patients/:patientId/medical-problems-enhanced", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [EnhancedMedicalProblems] Fetching problems for patient ID: ${patientId}`);
    
    const problems = await storage.getPatientMedicalProblems(patientId);
    console.log(`🔍 [EnhancedMedicalProblems] Found ${problems.length} problems`);

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
    console.log(`🏥 [MedicalProblemsAPI] User authenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [MedicalProblemsAPI] User not authenticated`);
      return res.sendStatus(401);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { soapNote, patientId } = req.body;
    const providerId = req.user!.id;

    console.log(`🏥 [MedicalProblemsAPI] Parsed encounter ID: ${encounterId}`);
    console.log(`🏥 [MedicalProblemsAPI] Patient ID: ${patientId}`);
    console.log(`🏥 [MedicalProblemsAPI] Provider ID: ${providerId}`);
    console.log(`🏥 [MedicalProblemsAPI] SOAP note length: ${soapNote?.length || 0} characters`);

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
      providerId
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MedicalProblemsAPI] Delta processing completed in ${totalTime}ms`);

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

    res.json({ success: true });
  } catch (error) {
    console.error("Error signing encounter:", error);
    res.status(500).json({ error: "Failed to sign encounter" });
  }
});

/**
 * POST /api/patients/:patientId/medical-problems
 * Create new medical problem manually
 */
router.post("/patients/:patientId/medical-problems", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const data = insertMedicalProblemSchema.parse({
      ...req.body,
      patientId
    });

    const newProblem = await storage.createMedicalProblem(data);
    res.json(newProblem);
  } catch (error) {
    console.error("Error creating medical problem:", error);
    res.status(500).json({ error: "Failed to create medical problem" });
  }
});

/**
 * PUT /api/medical-problems/:problemId
 * Update medical problem
 */
router.put("/medical-problems/:problemId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const problemId = parseInt(req.params.problemId);
    const updates = req.body;

    const updatedProblem = await storage.updateMedicalProblem(problemId, updates);
    res.json(updatedProblem);
  } catch (error) {
    console.error("Error updating medical problem:", error);
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

/**
 * GET /api/patients/:patientId/encounters
 * Get encounters for dropdown selection when adding medical problems
 */
router.get("/patients/:patientId/encounters", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const encounters = await storage.getPatientEncounters(patientId);

    res.json(encounters);
  } catch (error) {
    console.error("Error fetching patient encounters:", error);
    res.status(500).json({ error: "Failed to fetch encounters" });
  }
});

export default router;