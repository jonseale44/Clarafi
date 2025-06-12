import { Router, Request, Response } from "express";
import { encounterValidation } from "./encounter-validation-service.js";
import { medicalProblemsDelta } from "./medical-problems-delta-service.js";

const router = Router();

/**
 * GET /api/encounters/:encounterId/validation
 * Check if encounter is ready for signature
 */
router.get("/encounters/:encounterId/validation", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const validation = await encounterValidation.validateEncounterForSignature(encounterId);

    res.json(validation);
  } catch (error) {
    console.error("Error validating encounter:", error);
    res.status(500).json({ error: "Failed to validate encounter" });
  }
});

/**
 * POST /api/encounters/:encounterId/sign
 * Sign encounter after validation
 */
router.post("/encounters/:encounterId/sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;
    const { signatureNote, forceSign = false } = req.body;

    // Validate encounter first
    const validation = await encounterValidation.validateEncounterForSignature(encounterId);

    if (!validation.canSign && !forceSign) {
      return res.status(400).json({
        error: "Encounter validation failed",
        validation,
        canForceSign: true
      });
    }

    // Sign the encounter
    const signedEncounter = await encounterValidation.signEncounter(encounterId, userId, signatureNote);

    // Sign medical problems if they exist
    await medicalProblemsDelta.signEncounter(encounterId, userId);

    res.json({
      success: true,
      encounter: signedEncounter,
      validation,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error signing encounter:", error);
    res.status(500).json({ error: "Failed to sign encounter" });
  }
});

/**
 * POST /api/orders/:orderId/sign
 * Sign individual order
 */
router.post("/orders/:orderId/sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;
    const { signatureNote } = req.body;

    const signedOrder = await encounterValidation.signOrder(orderId, userId, signatureNote);

    res.json({
      success: true,
      order: signedOrder,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error signing order:", error);
    res.status(500).json({ error: "Failed to sign order" });
  }
});

export default router;