import { Router } from "express";
import { db } from "./db.js";
import { diagnoses, encounters } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { insertDiagnosisSchema } from "../shared/schema.js";

const router = Router();

/**
 * GET /api/patients/:patientId/medical-problems
 * Get all medical problems (diagnoses) for a patient
 */
router.get("/patients/:patientId/medical-problems", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    const medicalProblems = await db
      .select({
        id: diagnoses.id,
        diagnosis: diagnoses.diagnosis,
        icd10Code: diagnoses.icd10Code,
        diagnosisDate: diagnoses.diagnosisDate,
        status: diagnoses.status,
        notes: diagnoses.notes,
        encounterId: diagnoses.encounterId,
        createdAt: diagnoses.createdAt,
      })
      .from(diagnoses)
      .where(eq(diagnoses.patientId, patientId))
      .orderBy(desc(diagnoses.createdAt));

    res.json(medicalProblems);
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
    
    // Validate request body
    const validatedData = insertDiagnosisSchema.parse({
      ...req.body,
      patientId,
    });

    const [newProblem] = await db
      .insert(diagnoses)
      .values(validatedData)
      .returning();

    res.status(201).json(newProblem);
  } catch (error) {
    console.error("Error creating medical problem:", error);
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
    
    // Validate request body (exclude patientId and encounterId from updates)
    const updateData = {
      diagnosis: req.body.diagnosis,
      icd10Code: req.body.icd10Code,
      diagnosisDate: req.body.diagnosisDate,
      status: req.body.status,
      notes: req.body.notes,
    };

    const [updatedProblem] = await db
      .update(diagnoses)
      .set(updateData)
      .where(and(
        eq(diagnoses.id, problemId),
        eq(diagnoses.patientId, patientId)
      ))
      .returning();

    if (!updatedProblem) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    res.json(updatedProblem);
  } catch (error) {
    console.error("Error updating medical problem:", error);
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

    const [deletedProblem] = await db
      .delete(diagnoses)
      .where(and(
        eq(diagnoses.id, problemId),
        eq(diagnoses.patientId, patientId)
      ))
      .returning();

    if (!deletedProblem) {
      return res.status(404).json({ error: "Medical problem not found" });
    }

    res.json({ message: "Medical problem deleted successfully" });
  } catch (error) {
    console.error("Error deleting medical problem:", error);
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