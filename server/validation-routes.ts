import { Router, Request, Response } from "express";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { db } from "./db.js";
import { encounters, orders } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

const router = Router();

/**
 * GET /api/encounters/:encounterId/validation
 * Check if encounter is ready for signature
 */
router.get("/encounters/:encounterId/validation", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    
    // Basic validation logic moved here from deleted service
    const result = {
      canSign: true,
      errors: [],
      warnings: [],
      requirements: {
        hasSOAPNote: false,
        hasCPTCodes: false,
        hasDiagnoses: false,
        hasSignedOrders: false,
        hasCriticalResultsReviewed: true
      }
    };

    // Get encounter details
    const encounter = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId))
      .limit(1);

    if (encounter.length === 0) {
      result.errors.push('Encounter not found');
      result.canSign = false;
      return res.json(result);
    }

    const enc = encounter[0];
    console.log(`🔍 [Validation] Validating encounter ${encounterId}`);
    console.log(`🔍 [Validation] SOAP note length: ${enc.note?.length || 0}`);
    console.log(`🔍 [Validation] CPT codes count: ${Array.isArray(enc.cptCodes) ? enc.cptCodes.length : 0}`);
    console.log(`🔍 [Validation] Diagnoses count: ${Array.isArray(enc.draftDiagnoses) ? enc.draftDiagnoses.length : 0}`);

    // Check SOAP note
    if (!enc.note || enc.note.trim().length < 50) {
      result.errors.push('SOAP note is required');
      result.canSign = false;
    } else {
      result.requirements.hasSOAPNote = true;
      console.log(`✅ [Validation] SOAP note requirement met`);
    }

    // Check CPT codes
    const cptCodes = Array.isArray(enc.cptCodes) ? enc.cptCodes : [];
    if (cptCodes.length === 0) {
      result.errors.push('At least one CPT code is required');
      result.canSign = false;
    } else {
      result.requirements.hasCPTCodes = true;
      console.log(`✅ [Validation] CPT codes requirement met: ${cptCodes.length} codes`);
    }

    // Check diagnoses
    const diagnoses = Array.isArray(enc.draftDiagnoses) ? enc.draftDiagnoses : [];
    if (diagnoses.length === 0) {
      result.errors.push('At least one diagnosis is required');
      result.canSign = false;
    } else {
      result.requirements.hasDiagnoses = true;
      console.log(`✅ [Validation] Diagnoses requirement met: ${diagnoses.length} diagnoses`);
      
      // Check for primary diagnosis
      const hasPrimary = diagnoses.some((d: any) => d.isPrimary === true);
      if (!hasPrimary) {
        result.errors.push('A primary diagnosis must be designated');
        result.canSign = false;
      } else {
        console.log(`✅ [Validation] Primary diagnosis requirement met`);
      }
    }

    // Check orders
    const draftOrdersList = await db.select()
      .from(orders)
      .where(and(
        eq(orders.patientId, enc.patientId),
        eq(orders.orderStatus, 'draft')
      ));

    console.log(`🔍 [Validation] Found ${draftOrdersList.length} draft orders requiring signature`);
    
    if (draftOrdersList.length > 0) {
      result.errors.push(`${draftOrdersList.length} orders require provider signature before encounter can be signed`);
      result.canSign = false;
    } else {
      result.requirements.hasSignedOrders = true;
      console.log(`✅ [Validation] All orders signed or no orders present`);
    }

    // Warnings
    if (enc.note && enc.note.length < 100) {
      result.warnings.push('Documentation appears brief');
    }

    result.canSign = result.errors.length === 0;

    res.json(result);
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

    // Basic validation (simplified from deleted service)
    const encounter = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId))
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const enc = encounter[0];
    const validationErrors = [];

    // Basic validation checks
    if (!enc.note || enc.note.trim().length < 50) {
      validationErrors.push('SOAP note is required');
    }

    const cptCodes = Array.isArray(enc.cptCodes) ? enc.cptCodes : [];
    if (cptCodes.length === 0) {
      validationErrors.push('At least one CPT code is required');
    }

    const diagnoses = Array.isArray(enc.draftDiagnoses) ? enc.draftDiagnoses : [];
    if (diagnoses.length === 0) {
      validationErrors.push('At least one diagnosis is required');
    }

    if (validationErrors.length > 0 && !forceSign) {
      return res.status(400).json({
        error: "Encounter validation failed",
        validation: { canSign: false, errors: validationErrors },
        canForceSign: true
      });
    }

    // Sign the encounter
    const [signedEncounter] = await db
      .update(encounters)
      .set({
        encounterStatus: "signed",
        endTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(encounters.id, encounterId))
      .returning();

    // Sign medical problems if they exist
    // Mark encounter as signed (unified parser handles this internally)
    console.log(`✅ [ValidationRoutes] Encounter ${encounterId} signed by user ${userId}`);

    res.json({
      success: true,
      encounter: signedEncounter,
      validation: { canSign: true, errors: [], warnings: [] },
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error signing encounter:", error);
    res.status(500).json({ error: "Failed to sign encounter" });
  }
});

// Individual order signing removed - handled by main routes.ts

export default router;