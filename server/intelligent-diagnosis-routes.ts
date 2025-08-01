/**
 * Intelligent Diagnosis API Routes
 * GPT-powered medical problem autocompletion and standardization
 */

import { Router } from "express";
import { intelligentDiagnosis } from "./intelligent-diagnosis-service.js";

const router = Router();

/**
 * GET /api/intelligent-diagnosis/suggestions
 * Get real-time diagnosis suggestions as user types
 */
router.get("/suggestions", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { input, patientId, limit = "5" } = req.query;

    if (!input || !patientId) {
      return res.status(400).json({ 
        error: "Input text and patient ID are required" 
      });
    }

    const suggestions = await intelligentDiagnosis.getIntelligentSuggestions(
      input as string,
      parseInt(patientId as string),
      parseInt(limit as string)
    );

    res.json({ suggestions });
  } catch (error) {
    console.error("Error getting diagnosis suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

/**
 * POST /api/intelligent-diagnosis/standardize
 * Standardize user input to proper medical terminology with ICD-10
 */
router.post("/standardize", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { input, patientId } = req.body;

    if (!input || !patientId) {
      return res.status(400).json({ 
        error: "Input text and patient ID are required" 
      });
    }

    const standardized = await intelligentDiagnosis.standardizeDiagnosis(
      input,
      patientId
    );

    res.json({ standardized });
  } catch (error) {
    console.error("Error standardizing diagnosis:", error);
    res.status(500).json({ error: "Failed to standardize diagnosis" });
  }
});

/**
 * POST /api/intelligent-diagnosis/validate
 * Validate diagnosis input and provide feedback
 */
router.post("/validate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { input, patientId } = req.body;

    if (!input || !patientId) {
      return res.status(400).json({ 
        error: "Input text and patient ID are required" 
      });
    }

    // Get standardized version to compare
    const standardized = await intelligentDiagnosis.standardizeDiagnosis(
      input,
      patientId
    );

    // Determine if input needs improvement
    const inputLower = input.toLowerCase().trim();
    const standardLower = standardized.standardTitle.toLowerCase();
    
    const needsImprovement = 
      inputLower.length < 3 ||
      inputLower !== standardLower ||
      !standardized.icd10Code ||
      standardized.confidence < 0.8;

    const validation = {
      isValid: !needsImprovement,
      confidence: standardized.confidence,
      suggestions: needsImprovement ? [standardized] : [],
      feedback: needsImprovement ? 
        `Consider using: "${standardized.standardTitle}" for better specificity` : 
        "Diagnosis appears well-formatted"
    };

    res.json({ validation });
  } catch (error) {
    console.error("Error validating diagnosis:", error);
    res.status(500).json({ error: "Failed to validate diagnosis" });
  }
});

export default router;