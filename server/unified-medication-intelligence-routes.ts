/**
 * Unified Medication Intelligence API Routes
 * Single source of truth for medication intelligence data
 */

import { Router } from "express";
import { MedicationIntelligenceService } from "./medication-intelligence-service";
import { APIResponseHandler } from "./api-response-handler";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/medication-intelligence/:medicationName
 * Get comprehensive medication intelligence for a specific medication
 */
router.get("/medication-intelligence/:medicationName", APIResponseHandler.asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { medicationName } = req.params;
    console.log(`🧠 [MedicationIntelligence] Getting intelligence for: ${medicationName}`);
    
    const intelligence = MedicationIntelligenceService.getMedicationIntelligence(medicationName);
    
    if (!intelligence) {
      console.log(`🧠 [MedicationIntelligence] No intelligence data found for: ${medicationName}`);
      return APIResponseHandler.notFound(res, `Medication intelligence for '${medicationName}'`);
    }
    
    console.log(`🧠 [MedicationIntelligence] Intelligence found for: ${medicationName}`);
    return APIResponseHandler.success(res, intelligence);
  }
));

/**
 * POST /api/medication-intelligence/generate-sig
 * Generate appropriate sig based on medication components
 */
router.post("/medication-intelligence/generate-sig", APIResponseHandler.asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { medicationName, strength, form, route, frequency } = req.body;
    
    if (!medicationName || !strength || !form || !route) {
      return APIResponseHandler.badRequest(res, "Missing required fields: medicationName, strength, form, route");
    }
    
    console.log(`🧠 [SigGeneration] Generating sig for: ${medicationName} ${strength} ${form} ${route}`);
    
    const sig = MedicationIntelligenceService.generateSigFromComponents(
      medicationName,
      strength,
      form,
      route,
      frequency
    );
    
    console.log(`🧠 [SigGeneration] Generated sig: ${sig}`);
    
    return APIResponseHandler.success(res, { sig });
  }
));

/**
 * POST /api/medication-intelligence/validate
 * Validate medication combination and provide suggestions
 */
router.post("/medication-intelligence/validate", APIResponseHandler.asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { medicationName, strength, form, route } = req.body;
    
    if (!medicationName || !strength || !form || !route) {
      return APIResponseHandler.badRequest(res, "Missing required fields: medicationName, strength, form, route");
    }
    
    console.log(`🧠 [MedValidation] Validating: ${medicationName} ${strength} ${form} ${route}`);
    
    const validation = MedicationIntelligenceService.validateMedicationCombination(
      medicationName,
      strength,
      form,
      route
    );
    
    console.log(`🧠 [MedValidation] Validation result:`, validation);
    
    return APIResponseHandler.success(res, validation);
  }
));

export default router;