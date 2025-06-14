/**
 * Unified Medication Intelligence API Routes
 * Single source of truth for medication intelligence data
 */

import { Router } from "express";
import { MedicationIntelligenceService } from "./medication-intelligence-service";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/medication-intelligence/:medicationName
 * Get comprehensive medication intelligence for a specific medication
 */
router.get("/medication-intelligence/:medicationName", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName } = req.params;
    console.log(`🧠 [MedicationIntelligence] Getting intelligence for: ${medicationName}`);
    
    const intelligence = MedicationIntelligenceService.getMedicationIntelligence(medicationName);
    
    if (!intelligence) {
      console.log(`🧠 [MedicationIntelligence] No intelligence data found for: ${medicationName}`);
      return res.status(404).json({ 
        error: "No intelligence data available",
        medicationName 
      });
    }
    
    console.log(`🧠 [MedicationIntelligence] Intelligence found for: ${medicationName}`);
    res.json(intelligence);
    
  } catch (error) {
    console.error("❌ [MedicationIntelligence] Error getting intelligence:", error);
    res.status(500).json({ message: "Failed to get medication intelligence" });
  }
});

/**
 * POST /api/medication-intelligence/generate-sig
 * Generate appropriate sig based on medication components
 */
router.post("/medication-intelligence/generate-sig", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName, strength, form, route, frequency } = req.body;
    
    console.log(`🧠 [SigGeneration] Generating sig for: ${medicationName} ${strength} ${form} ${route}`);
    
    const sig = MedicationIntelligenceService.generateSigFromComponents(
      medicationName,
      strength,
      form,
      route,
      frequency
    );
    
    console.log(`🧠 [SigGeneration] Generated sig: ${sig}`);
    
    res.json({ sig });
    
  } catch (error) {
    console.error("❌ [SigGeneration] Error generating sig:", error);
    res.status(500).json({ message: "Failed to generate sig" });
  }
});

/**
 * POST /api/medication-intelligence/validate
 * Validate medication combination and provide suggestions
 */
router.post("/medication-intelligence/validate", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName, strength, form, route } = req.body;
    
    console.log(`🧠 [MedValidation] Validating: ${medicationName} ${strength} ${form} ${route}`);
    
    const validation = MedicationIntelligenceService.validateMedicationCombination(
      medicationName,
      strength,
      form,
      route
    );
    
    console.log(`🧠 [MedValidation] Validation result:`, validation);
    
    res.json(validation);
    
  } catch (error) {
    console.error("❌ [MedValidation] Error validating medication:", error);
    res.status(500).json({ message: "Failed to validate medication" });
  }
});

export default router;