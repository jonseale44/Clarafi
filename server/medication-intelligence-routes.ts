/**
 * Medication Intelligence API Routes
 * Provides intelligent medication suggestions and validations
 */

import { Router } from "express";
import { MedicationIntelligenceService } from "./medication-intelligence-service.js";

const router = Router();

/**
 * GET /api/medications/:medicationName/intelligence
 * Get comprehensive medication intelligence data
 */
router.get("/medications/:medicationName/intelligence", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName } = req.params;
    
    console.log(`🧠 [MedIntelligence] Getting intelligence for: ${medicationName}`);
    
    const intelligence = MedicationIntelligenceService.getMedicationIntelligence(medicationName);
    
    if (!intelligence) {
      return res.status(404).json({ 
        message: "Medication not found in intelligence database",
        suggestions: "Please verify medication name or contact clinical support"
      });
    }
    
    console.log(`🧠 [MedIntelligence] Found intelligence data for ${medicationName}`);
    res.json(intelligence);
    
  } catch (error) {
    console.error("❌ [MedIntelligence] Error getting medication intelligence:", error);
    res.status(500).json({ message: "Failed to get medication intelligence" });
  }
});

/**
 * POST /api/medications/generate-sig
 * Generate appropriate sig instruction based on components
 */
router.post("/medications/generate-sig", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { medicationName, strength, form, route, frequency } = req.body;
    
    console.log(`🧠 [SigGeneration] Generating sig for: ${medicationName} ${strength} ${form} ${route} ${frequency || 'once daily'}`);
    
    const generatedSig = MedicationIntelligenceService.generateSigFromComponents(
      medicationName,
      strength,
      form,
      route,
      frequency
    );
    
    console.log(`🧠 [SigGeneration] Generated sig: "${generatedSig}"`);
    
    res.json({ 
      sig: generatedSig,
      medicationName,
      strength,
      form,
      route,
      frequency: frequency || 'once daily'
    });
    
  } catch (error) {
    console.error("❌ [SigGeneration] Error generating sig:", error);
    res.status(500).json({ message: "Failed to generate sig instruction" });
  }
});

/**
 * POST /api/medications/extract-components
 * Extract medication components from sig instruction
 */
router.post("/medications/extract-components", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { sig } = req.body;
    
    console.log(`🧠 [ComponentExtraction] Extracting components from: "${sig}"`);
    
    const components = MedicationIntelligenceService.extractComponentsFromSig(sig);
    
    console.log(`🧠 [ComponentExtraction] Extracted components:`, components);
    
    res.json(components);
    
  } catch (error) {
    console.error("❌ [ComponentExtraction] Error extracting components:", error);
    res.status(500).json({ message: "Failed to extract components from sig" });
  }
});

/**
 * POST /api/medications/validate-combination
 * Validate if medication combination is clinically appropriate
 */
router.post("/medications/validate-combination", async (req, res) => {
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
    console.error("❌ [MedValidation] Error validating medication combination:", error);
    res.status(500).json({ message: "Failed to validate medication combination" });
  }
});

export default router;