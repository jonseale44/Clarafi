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
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const problems = await storage.getPatientMedicalProblems(patientId);

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
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const { soapNote, patientId } = req.body;
    const providerId = req.user!.id;

    if (!soapNote || !patientId) {
      return res.status(400).json({ error: "SOAP note and patient ID are required" });
    }

    // Process medical problems incrementally
    const result = await medicalProblemsDelta.processSOAPDelta(
      patientId,
      encounterId,
      soapNote,
      providerId
    );

    res.json({
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      problemsAffected: result.total_problems_affected
    });

  } catch (error) {
    console.error("Error processing medical problems:", error);
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
 * Create new medical problem manually
 */
router.post("/patients/:patientId/medical-problems-enhanced", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const validatedData = insertMedicalProblemSchema.parse({
      ...req.body,
      patientId
    });

    const problem = await storage.createMedicalProblem(validatedData);
    res.status(201).json(problem);

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

export default router;