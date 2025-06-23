import { Router, Request, Response } from "express";
import { encounterSignatureValidator } from "./encounter-signature-validation.js";
import { db } from "./db.js";
import { encounters, orders, medicalProblems } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { medicationDelta } from "./medication-delta-service.js";
import { storage } from "./storage.js";

const router = Router();

/**
 * GET /api/encounters/:encounterId/validation
 * Validate encounter readiness for signature
 */
router.get("/encounters/:encounterId/validation", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;

    // Verify user has access to this encounter
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    const validationResult = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    res.json(validationResult);

  } catch (error) {
    console.error("Error validating encounter:", error);
    res.status(500).json({ error: "Failed to validate encounter" });
  }
});

/**
 * POST /api/encounters/:encounterId/validate-and-sign
 * Validate encounter and sign if all requirements are met
 */
router.post("/encounters/:encounterId/validate-and-sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;
    const { signatureNote, forceSign = false } = req.body;

    // Verify user has access to this encounter
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    // Validate encounter
    const validationResult = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    // If validation fails and not forcing, return validation errors
    if (!validationResult.canSign && !forceSign) {
      return res.status(400).json({
        error: "Encounter validation failed",
        validation: validationResult,
        canForceSign: validationResult.errors.every(e => e.category !== 'legal')
      });
    }

    // Sign the encounter
    const signedEncounter = await signEncounter(encounterId, userId, signatureNote);

    // Sign medical problems if they exist
    // Mark encounter as signed (unified parser handles this internally)
    console.log(`✅ [EncounterValidation] Encounter ${encounterId} signed by user ${userId}`);
    
    // Process medication orders through delta service (handles pending->active workflow)
    try {
      await medicationDelta.processOrderDelta(encounter[0].patientId, encounterId, userId);
    } catch (medicationError) {
      console.error(`❌ [EncounterSign] Failed to process medications:`, medicationError);
      // Continue with signing even if medication processing fails
    }

    res.json({
      success: true,
      encounter: signedEncounter,
      validation: validationResult,
      signedAt: new Date()
    });

  } catch (error) {
    console.error("Error validating and signing encounter:", error);
    res.status(500).json({ error: "Failed to validate and sign encounter" });
  }
});

// Individual order signing removed - handled by main routes.ts

// Bulk order signing removed - handled by main routes.ts

/**
 * GET /api/encounters/:encounterId/signature-requirements
 * Get summary of what needs to be completed before signing
 */
router.get("/encounters/:encounterId/signature-requirements", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const userId = req.user!.id;

    // Verify access
    const encounter = await db.select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or access denied" });
    }

    // Get validation result
    const validation = await encounterSignatureValidator.validateEncounterForSignature(encounterId);

    // Get unsigned orders count
    const unsignedOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.encounterId, encounterId),
          eq(orders.orderStatus, "draft")
        )
      );

    // Build requirements summary
    const requirements = {
      canSign: validation.canSign,
      totalErrors: validation.errors.length,
      totalWarnings: validation.warnings.length,
      requirements: {
        documentation: {
          soapNote: !validation.errors.some(e => e.code === 'MISSING_SOAP_NOTE'),
          chiefComplaint: !validation.errors.some(e => e.code === 'MISSING_CHIEF_COMPLAINT'),
          soapStructure: !validation.errors.some(e => ['MISSING_SUBJECTIVE', 'MISSING_OBJECTIVE', 'MISSING_ASSESSMENT', 'MISSING_PLAN'].includes(e.code))
        },
        coding: {
          cptCodes: !validation.errors.some(e => e.code === 'MISSING_CPT_CODE'),
          diagnoses: !validation.errors.some(e => e.code === 'MISSING_DIAGNOSIS'),
          primaryDiagnosis: !validation.errors.some(e => e.code === 'MISSING_PRIMARY_DIAGNOSIS')
        },
        orders: {
          allOrdersSigned: unsignedOrders.length === 0,
          unsignedCount: unsignedOrders.length,
          unsignedOrderIds: unsignedOrders.map(o => o.id)
        },
        results: {
          criticalResultsAcknowledged: !validation.errors.some(e => e.code === 'UNACKNOWLEDGED_CRITICAL_RESULTS'),
          medicalProblemsSigned: !validation.errors.some(e => e.code === 'UNSIGNED_MEDICAL_PROBLEMS')
        }
      },
      errors: validation.errors,
      warnings: validation.warnings
    };

    res.json(requirements);

  } catch (error) {
    console.error("Error getting signature requirements:", error);
    res.status(500).json({ error: "Failed to get signature requirements" });
  }
});

/**
 * Helper method to sign encounter
 */
async function signEncounter(encounterId: number, userId: number, signatureNote?: string) {
  const [signedEncounter] = await db
    .update(encounters)
    .set({
      encounterStatus: "signed",
      endTime: new Date(),
      updatedAt: new Date()
      // Note: signedBy, signedAt, signatureNote fields would need to be added to schema
    })
    .where(eq(encounters.id, encounterId))
    .returning();

  return signedEncounter;
}

/**
 * Helper method to validate individual order
 */
async function validateOrder(order: any) {
  const validation = {
    isValid: true,
    errors: []
  };

  switch (order.orderType) {
    case 'medication':
      if (!order.medicationName) validation.errors.push('Medication name is required');
      if (!order.dosage) validation.errors.push('Dosage is required');
      if (!order.sig) validation.errors.push('Patient instructions (Sig) are required');
      if (!order.quantity || order.quantity <= 0) validation.errors.push('Valid quantity is required');
      if (!order.routeOfAdministration) validation.errors.push('Route of administration is required');
      break;

    case 'lab':
      if (!order.testName) validation.errors.push('Test name is required');
      if (!order.clinicalIndication) validation.errors.push('Clinical indication is required');
      break;

    case 'imaging':
      if (!order.studyType) validation.errors.push('Study type is required');
      if (!order.region) validation.errors.push('Body region is required');
      if (!order.clinicalIndication) validation.errors.push('Clinical indication is required');
      break;

    case 'referral':
      if (!order.specialtyType) validation.errors.push('Specialty type is required');
      if (!order.urgency) validation.errors.push('Urgency level is required');
      if (!order.clinicalIndication) validation.errors.push('Referral reason is required');
      break;
  }

  validation.isValid = validation.errors.length === 0;
  return validation;
}

export default router;