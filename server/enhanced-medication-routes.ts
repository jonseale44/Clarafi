/**
 * Enhanced Medication API Routes
 * Mirrors the medical problems routes architecture for consistency
 */

import { Router } from "express";
import { storage } from "./storage";
import { medicationDelta } from "./medication-delta-service";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/patients/:patientId/medications-enhanced
 * Get enhanced medications with groupings and history for a patient
 */
router.get("/patients/:patientId/medications-enhanced", async (req: Request, res: Response) => {
  try {
    console.log(`🔍 [EnhancedMedications] GET request for patient ${req.params.patientId}`);
    console.log(`🔍 [EnhancedMedications] User authenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [EnhancedMedications] Authentication failed`);
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    console.log(`🔍 [EnhancedMedications] Fetching medications for patient ID: ${patientId}`);
    
    const medications = await storage.getPatientMedicationsEnhanced(patientId);
    console.log(`🔍 [EnhancedMedications] Found ${medications.length} medications`);
    
    medications.forEach((medication, index) => {
      console.log(`🔍 [EnhancedMedications] Medication ${index + 1}: ${medication.medicationName} ${medication.dosage} (${medication.status})`);
    });

    // Group medications by status for EMR-standard display
    const groupedMedications = {
      active: medications.filter(m => m.status === 'active'),
      discontinued: medications.filter(m => m.status === 'discontinued'),
      held: medications.filter(m => m.status === 'held'),
      historical: medications.filter(m => m.status === 'historical')
    };

    // Format for frontend display with enhanced data
    const formattedMedications = medications.map(medication => ({
      id: medication.id,
      medicationName: medication.medicationName,
      genericName: medication.genericName,
      brandName: medication.brandName,
      dosage: medication.dosage,
      strength: medication.strength,
      dosageForm: medication.dosageForm,
      route: medication.route,
      frequency: medication.frequency,
      quantity: medication.quantity,
      daysSupply: medication.daysSupply,
      refillsRemaining: medication.refillsRemaining,
      sig: medication.sig,
      clinicalIndication: medication.clinicalIndication,
      problemMappings: medication.problemMappings || [],
      startDate: medication.startDate,
      endDate: medication.endDate,
      discontinuedDate: medication.discontinuedDate,
      status: medication.status,
      prescriber: medication.prescriber,
      rxNormCode: medication.rxNormCode,
      ndcCode: medication.ndcCode,
      medicationHistory: medication.medicationHistory || [],
      changeLog: medication.changeLog || [],
      groupingStrategy: medication.groupingStrategy,
      relatedMedications: medication.relatedMedications || [],
      drugInteractions: medication.drugInteractions || [],
      priorAuthRequired: medication.priorAuthRequired,
      insuranceAuthStatus: medication.insuranceAuthStatus,
      createdAt: medication.createdAt,
      updatedAt: medication.updatedAt
    }));

    console.log(`🔍 [EnhancedMedications] Returning ${formattedMedications.length} formatted medications`);
    res.json({
      medications: formattedMedications,
      groupedByStatus: groupedMedications,
      summary: {
        total: medications.length,
        active: groupedMedications.active.length,
        discontinued: groupedMedications.discontinued.length,
        held: groupedMedications.held.length,
        historical: groupedMedications.historical.length
      }
    });
  } catch (error) {
    console.error("❌ [EnhancedMedications] Error fetching medications:", error);
    res.status(500).json({ error: "Failed to fetch medications" });
  }
});

/**
 * GET /api/medications/:medicationId/history
 * Get detailed medication history for a specific medication
 */
router.get("/medications/:medicationId/history", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const medicationId = parseInt(req.params.medicationId);
    console.log(`🔍 [EnhancedMedications] Fetching history for medication ID: ${medicationId}`);
    
    const history = await storage.getMedicationHistory(medicationId);
    
    res.json({
      medicationId,
      history,
      count: history.length
    });
  } catch (error) {
    console.error("❌ [EnhancedMedications] Error fetching medication history:", error);
    res.status(500).json({ error: "Failed to fetch medication history" });
  }
});

/**
 * POST /api/encounters/:encounterId/process-medications
 * Process medication orders using order-driven delta analysis
 */
router.post("/encounters/:encounterId/process-medications", async (req: Request, res: Response) => {
  try {
    console.log(`💊 [MedicationAPI] === ORDER PROCESSING REQUEST START ===`);
    console.log(`💊 [MedicationAPI] Encounter ID: ${req.params.encounterId}`);
    console.log(`💊 [MedicationAPI] User authenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      console.log(`❌ [MedicationAPI] User not authenticated`);
      return res.sendStatus(401);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { patientId } = req.body;
    const providerId = req.user!.id;

    console.log(`💊 [MedicationAPI] Parsed encounter ID: ${encounterId}`);
    console.log(`💊 [MedicationAPI] Patient ID: ${patientId}`);
    console.log(`💊 [MedicationAPI] Provider ID: ${providerId}`);

    if (!patientId) {
      console.log(`❌ [MedicationAPI] Missing required field - patientId: ${!!patientId}`);
      return res.status(400).json({ error: "Patient ID is required" });
    }

    console.log(`💊 [MedicationAPI] Calling order-based delta processing...`);
    const startTime = Date.now();
    
    // Process medications based on orders using new order-driven approach
    const result = await medicationDelta.processOrderDelta(
      patientId,
      encounterId,
      providerId
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MedicationAPI] Order processing completed in ${totalTime}ms`);
    console.log(`✅ [MedicationAPI] Result:`, result);

    const response = {
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      medicationsAffected: result.total_medications_affected
    };
    
    console.log(`✅ [MedicationAPI] Sending response:`, response);
    console.log(`💊 [MedicationAPI] === ORDER PROCESSING REQUEST END ===`);
    
    res.json(response);

  } catch (error) {
    console.error(`❌ [MedicationAPI] Error processing medications:`, error);
    console.error(`❌ [MedicationAPI] Stack trace:`, (error as Error).stack);
    res.status(500).json({ error: "Failed to process medications" });
  }
});

/**
 * POST /api/encounters/:encounterId/sign-medications
 * Sign encounter - finalize all medication entries
 */
router.post("/encounters/:encounterId/sign-medications", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const encounterId = parseInt(req.params.encounterId);
    const providerId = req.user!.id;

    await medicationDelta.signEncounter(encounterId, providerId);

    res.json({ success: true, message: "Medications signed for encounter" });

  } catch (error) {
    console.error("Error signing medications:", error);
    res.status(500).json({ error: "Failed to sign medications" });
  }
});

/**
 * POST /api/patients/:patientId/medications-enhanced
 * Create new medication manually with enhanced fields
 */
router.post("/patients/:patientId/medications-enhanced", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    console.log('🔍 [EnhancedMedications] Creating new medication for patient:', patientId);
    console.log('🔍 [EnhancedMedications] Request body:', req.body);
    
    // Map frontend fields to enhanced backend schema
    const medicationData = {
      patientId,
      encounterId: req.body.encounterId || null,
      medicationName: req.body.medicationName,
      genericName: req.body.genericName || null,
      brandName: req.body.brandName || null,
      dosage: req.body.dosage,
      strength: req.body.strength || req.body.dosage,
      dosageForm: req.body.dosageForm || req.body.form,
      route: req.body.route || 'oral',
      frequency: req.body.frequency,
      quantity: req.body.quantity || null,
      daysSupply: req.body.daysSupply || null,
      refillsRemaining: req.body.refillsRemaining || req.body.refills || 0,
      totalRefills: req.body.totalRefills || req.body.refills || 0,
      sig: req.body.sig || req.body.instructions,
      rxNormCode: req.body.rxNormCode || null,
      ndcCode: req.body.ndcCode || null,
      clinicalIndication: req.body.clinicalIndication || req.body.indication,
      problemMappings: req.body.problemMappings || [],
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || null,
      status: req.body.status || 'active',
      prescriber: req.body.prescriber || 'Manual Entry',
      prescriberId: (req as any).user?.id || null,
      firstEncounterId: req.body.encounterId || null,
      lastUpdatedEncounterId: req.body.encounterId || null,
      medicationHistory: [{
        date: new Date().toISOString(),
        action: 'created',
        provider: 'Manual Entry',
        encounter_id: req.body.encounterId || null,
        notes: req.body.notes || 'Medication manually added'
      }],
      changeLog: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        details: 'Medication manually added',
        userId: (req as any).user?.id
      }],
      groupingStrategy: 'medical_problem',
      relatedMedications: [],
      drugInteractions: [],
      priorAuthRequired: req.body.priorAuthRequired || false,
      insuranceAuthStatus: req.body.insuranceAuthStatus || null
    };

    console.log('🔍 [EnhancedMedications] Processed medication data:', medicationData);

    const newMedication = await storage.createMedication(medicationData);
    
    console.log('✅ [EnhancedMedications] Created medication with ID:', newMedication.id);

    res.json(newMedication);
  } catch (error) {
    console.error("❌ [EnhancedMedications] Error creating medication:", error);
    res.status(500).json({ error: "Failed to create medication" });
  }
});

/**
 * PUT /api/medications/:medicationId
 * Update medication with enhanced fields
 */
router.put("/medications/:medicationId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const medicationId = parseInt(req.params.medicationId);
    console.log('🔍 [EnhancedMedications] Updating medication:', medicationId);
    console.log('🔍 [EnhancedMedications] Update data:', req.body);

    // Add change log entry for the update
    const changeLogEntry = {
      timestamp: new Date().toISOString(),
      action: 'updated',
      details: req.body.reasonForChange || 'Medication updated',
      userId: (req as any).user?.id,
      changes: req.body.changes || {}
    };

    const updateData = {
      ...req.body,
      changeLog: [
        ...(req.body.changeLog || []),
        changeLogEntry
      ],
      updatedAt: new Date()
    };

    const updatedMedication = await storage.updateMedication(medicationId, updateData);
    
    console.log('✅ [EnhancedMedications] Updated medication:', updatedMedication.medicationName);

    res.json(updatedMedication);
  } catch (error) {
    console.error("❌ [EnhancedMedications] Error updating medication:", error);
    res.status(500).json({ error: "Failed to update medication" });
  }
});

/**
 * GET /api/medications/:medicationId
 * Get single medication with full enhanced details
 */
router.get("/medications/:medicationId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const medicationId = parseInt(req.params.medicationId);
    console.log(`🔍 [EnhancedMedications] Fetching medication ID: ${medicationId}`);
    
    // This would need to be implemented in storage
    // For now, return error indicating not implemented
    res.status(501).json({ 
      error: "Single medication fetch not yet implemented",
      medicationId 
    });

  } catch (error) {
    console.error("❌ [EnhancedMedications] Error fetching medication:", error);
    res.status(500).json({ error: "Failed to fetch medication" });
  }
});

/**
 * DELETE /api/medications/:medicationId
 * Delete medication (or mark as discontinued)
 */
router.delete("/medications/:medicationId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const medicationId = parseInt(req.params.medicationId);
    const { reasonForDiscontinuation } = req.body;

    console.log(`🔍 [EnhancedMedications] Discontinuing medication ID: ${medicationId}`);
    console.log(`🔍 [EnhancedMedications] Reason: ${reasonForDiscontinuation}`);

    // Instead of deleting, mark as discontinued (EMR best practice)
    const updateData = {
      status: 'discontinued',
      discontinuedDate: new Date().toISOString().split('T')[0],
      reasonForChange: reasonForDiscontinuation || 'Medication discontinued',
      changeLog: [{
        timestamp: new Date().toISOString(),
        action: 'discontinued',
        details: reasonForDiscontinuation || 'Medication discontinued',
        userId: (req as any).user?.id
      }]
    };

    const updatedMedication = await storage.updateMedication(medicationId, updateData);
    
    console.log('✅ [EnhancedMedications] Discontinued medication:', updatedMedication.medicationName);

    res.json({
      success: true,
      medicationId,
      status: 'discontinued',
      discontinuedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [EnhancedMedications] Error discontinuing medication:", error);
    res.status(500).json({ error: "Failed to discontinue medication" });
  }
});

export default router;