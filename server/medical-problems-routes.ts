import { Router } from "express";
import { db } from "./db.js";
import { diagnoses, encounters } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { insertDiagnosisSchema } from "../shared/schema.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * GET /api/patients/:patientId/medical-problems
 * Get all medical problems (diagnoses) for a patient
 */
router.get("/patients/:patientId/medical-problems", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [MedicalProblems] Fetching problems for patient ID: ${patientId}`);
    
    // Fetch from enhanced medical_problems table
    const medicalProblems = await storage.getPatientMedicalProblems(patientId);
    console.log(`🔍 [MedicalProblems] Found ${medicalProblems.length} problems`);
    
    // Visit history data is now correctly flowing through the system
    
    // Format with full visit history preserved
    const formattedProblems = medicalProblems.map(problem => ({
      id: problem.id,
      diagnosis: problem.problemTitle,
      icd10Code: problem.currentIcd10Code,
      diagnosisDate: problem.firstDiagnosedDate,
      status: problem.problemStatus,
      notes: (Array.isArray(problem.visitHistory) ? problem.visitHistory[0]?.notes : '') || '',
      encounterId: problem.firstEncounterId,
      createdAt: problem.createdAt,
      // Preserve rich visit history data
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
 * POST /api/patients/:patientId/medical-problems
 * Add a new medical problem for a patient
 */
router.post("/patients/:patientId/medical-problems", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    console.log('🔍 [MedicalProblems] Creating new problem for patient:', patientId);
    console.log('🔍 [MedicalProblems] Request body:', req.body);
    
    // Map frontend fields to backend schema
    const problemData = {
      patientId,
      problemTitle: req.body.diagnosis,
      currentIcd10Code: req.body.icd10Code || null,
      problemStatus: req.body.status || 'active',
      firstDiagnosedDate: req.body.diagnosisDate,
      firstEncounterId: req.body.encounterId || null,
      lastUpdatedEncounterId: req.body.encounterId || null,
      visitHistory: req.body.notes ? [{
        date: new Date().toISOString(),
        notes: req.body.notes,
        provider: 'Manual Entry',
        encounter_id: req.body.encounterId || null
      }] : [],
      changeLog: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        details: 'Problem manually added'
      }]
    };

    console.log('🔍 [MedicalProblems] Mapped problem data:', problemData);
    
    const newProblem = await storage.createMedicalProblem(problemData);
    console.log('✅ [MedicalProblems] Created problem:', newProblem);

    res.status(201).json(newProblem);
  } catch (error) {
    console.error("❌ [MedicalProblems] Error creating medical problem:", error);
    res.status(500).json({ error: "Failed to create medical problem" });
  }
});

/**
 * PUT /api/patients/:patientId/medical-problems/:problemId
 * Update an existing medical problem
 */
router.put("/patients/:patientId/medical-problems/:problemId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const problemId = parseInt(req.params.problemId);
    console.log('🔍 [MedicalProblems] Updating problem:', problemId, 'for patient:', patientId);
    
    // Get existing problem to preserve visit history
    const existingProblem = await storage.getMedicalProblem(problemId);
    if (!existingProblem || existingProblem.patientId !== patientId) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    // Map frontend fields to backend schema
    const updateData = {
      problemTitle: req.body.diagnosis,
      currentIcd10Code: req.body.icd10Code || null,
      problemStatus: req.body.status,
      firstDiagnosedDate: req.body.diagnosisDate,
      // Add update to change log
      changeLog: [
        ...(Array.isArray(existingProblem.changeLog) ? existingProblem.changeLog : []),
        {
          timestamp: new Date().toISOString(),
          action: 'updated',
          details: 'Problem manually updated'
        }
      ]
    };

    const updatedProblem = await storage.updateMedicalProblem(problemId, updateData);
    console.log('✅ [MedicalProblems] Updated problem:', updatedProblem);

    res.json(updatedProblem);
  } catch (error) {
    console.error("❌ [MedicalProblems] Error updating medical problem:", error);
    res.status(500).json({ error: "Failed to update medical problem" });
  }
});

/**
 * DELETE /api/patients/:patientId/medical-problems/:problemId
 * Delete a medical problem
 */
router.delete("/patients/:patientId/medical-problems/:problemId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const problemId = parseInt(req.params.problemId);
    console.log('🔍 [MedicalProblems] Deleting problem:', problemId, 'for patient:', patientId);

    // Verify problem exists and belongs to patient
    const existingProblem = await storage.getMedicalProblem(problemId);
    if (!existingProblem || existingProblem.patientId !== patientId) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    await storage.deleteMedicalProblem(problemId);
    console.log('✅ [MedicalProblems] Deleted problem:', problemId);

    res.json({ message: "Medical problem deleted successfully" });
  } catch (error) {
    console.error("❌ [MedicalProblems] Error deleting medical problem:", error);
    res.status(500).json({ error: "Failed to delete medical problem" });
  }
});

/**
 * GET /api/patients/:patientId/encounters
 * Get encounters for dropdown selection when adding medical problems
 */
router.get("/patients/:patientId/encounters", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    const patientEncounters = await db
      .select({
        id: encounters.id,
        encounterType: encounters.encounterType,
        startTime: encounters.startTime,
        encounterStatus: encounters.encounterStatus,
      })
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.startTime))
      .limit(20);

    res.json(patientEncounters);
  } catch (error) {
    console.error("Error fetching patient encounters:", error);
    res.status(500).json({ error: "Failed to fetch patient encounters" });
  }
});

export default router;