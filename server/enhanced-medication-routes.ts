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
    // Authentication check
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientIdParam = req.params.patientId;
    if (!patientIdParam || isNaN(parseInt(patientIdParam))) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    const patientId = parseInt(patientIdParam);
    const medications = await storage.getPatientMedications(patientId);

    // Group medications by status for EMR-standard display
    const groupedMedications = {
      active: medications.filter(m => m.status === 'active'),
      pending: medications.filter(m => m.status === 'pending'),
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

    // Return formatted medications
    res.json({
      medications: formattedMedications,
      groupedByStatus: groupedMedications,
      summary: {
        total: medications.length,
        active: groupedMedications.active.length,
        pending: groupedMedications.pending.length,
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
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const encounterId = parseInt(req.params.encounterId);
    const { patientId } = req.body;
    const providerId = req.user!.id;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }
    const startTime = Date.now();
    
    console.log(`🔄 [MedicationAPI] Manually triggering medication processing for encounter ${encounterId}, patient ${patientId}`);
    
    // Process medications based on orders using new order-driven approach
    const result = await medicationDelta.processOrderDelta(
      patientId,
      encounterId,
      providerId
    );

    const response = {
      success: true,
      changes: result.changes,
      processingTimeMs: result.processing_time_ms,
      medicationsAffected: result.total_medications_affected
    };
    
    console.log(`✅ [MedicationAPI] Manual medication processing completed:`, response);
    
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

    // Map frontend field names to database schema field names
    const updateData = {
      ...req.body,
      // Map refills to refillsRemaining (database schema field)
      refillsRemaining: req.body.refills,
      changeLog: [
        ...(req.body.changeLog || []),
        changeLogEntry
      ],
      updatedAt: new Date()
    };
    
    // Remove the frontend refills field to avoid confusion
    delete updateData.refills;

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

/**
 * POST /api/patients/:patientId/chart-medications
 * Add medication directly to chart with GPT-powered duplicate detection
 */
router.post("/patients/:patientId/chart-medications", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.patientId);
    const medicationData = {
      ...req.body,
      patientId,
      prescriberId: (req as any).user?.id
    };

    console.log(`💊 [ChartMedications] Adding medication to chart for patient ${patientId}`);
    console.log(`💊 [ChartMedications] Medication: ${medicationData.medicationName}`);

    const result = await medicationDelta.addChartMedication(medicationData);

    if (!result.success) {
      console.log(`⚠️ [ChartMedications] Duplicate detected: ${result.duplicateReasoning}`);
      return res.status(409).json({
        error: "Duplicate medication detected",
        duplicateDetected: true,
        reasoning: result.duplicateReasoning,
        conflictingMedications: result.conflictingMedications,
        recommendations: result.recommendations
      });
    }

    console.log(`✅ [ChartMedications] Successfully added medication ${result.medication.id}`);
    res.json({
      success: true,
      medication: result.medication,
      gptAnalysis: result.gptAnalysis
    });

  } catch (error) {
    console.error("❌ [ChartMedications] Error adding chart medication:", error);
    res.status(500).json({ error: "Failed to add medication to chart" });
  }
});

/**
 * POST /api/medications/:medicationId/move-to-orders
 * Move existing medication to orders for refill
 */
router.post("/medications/:medicationId/move-to-orders", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const medicationId = parseInt(req.params.medicationId);
    const moveData = {
      ...req.body,
      medicationId,
      requestedBy: (req as any).user?.id
    };

    console.log(`🔄 [MoveToOrders] Converting medication ${medicationId} to order`);

    const result = await medicationDelta.moveToOrders(moveData);

    console.log(`✅ [MoveToOrders] Created order ${result.draftOrder.id} for medication refill`);
    res.json({
      success: true,
      draftOrder: result.draftOrder,
      refillData: result.refillData,
      originalMedication: result.originalMedication
    });

  } catch (error) {
    console.error("❌ [MoveToOrders] Error moving medication to orders:", error);
    res.status(500).json({ error: "Failed to move medication to orders" });
  }
});

/**
 * GET /api/medications/formulary/search
 * Search medication formulary for intelligent suggestions
 */
router.get("/medications/formulary/search", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ error: "Search query required" });
    }

    console.log(`🔍 [FormularySearch] Searching for: "${query}"`);

    const results = await medicationDelta.searchFormulary(query, limit);

    console.log(`✅ [FormularySearch] Found ${results.length} matches`);
    res.json({
      query,
      results,
      count: results.length
    });

  } catch (error) {
    console.error("❌ [FormularySearch] Error searching formulary:", error);
    res.status(500).json({ error: "Failed to search formulary" });
  }
});

/**
 * POST /api/medications/validate-order
 * Validate medication order for pharmacy compliance
 */
router.post("/medications/validate-order", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { pharmacyValidation } = await import("./pharmacy-validation-service.js");
    
    console.log(`💊 [ValidateOrder] Validating medication order for pharmacy compliance`);
    
    // Get patient context for validation
    const patientId = req.body.patientId;
    let patientContext = {};
    
    if (patientId) {
      try {
        const patient = await storage.getPatient(patientId);
        const allergies = await storage.getPatientAllergies(patientId);
        const medications = await storage.getPatientMedications(patientId);
        
        patientContext = {
          patientAge: patient ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : undefined,
          allergies: allergies.map(a => a.allergen),
          currentMedications: medications.filter(m => m.status === 'active').map(m => m.medicationName)
        };
      } catch (error) {
        console.warn(`⚠️ [ValidateOrder] Could not fetch patient context:`, error);
      }
    }

    const validationResult = await pharmacyValidation.validateMedicationOrder({
      ...req.body,
      ...patientContext
    });

    console.log(`✅ [ValidateOrder] Validation complete: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
    
    res.json(validationResult);

  } catch (error) {
    console.error("❌ [ValidateOrder] Error validating medication order:", error);
    res.status(500).json({ error: "Failed to validate medication order" });
  }
});

/**
 * POST /api/medications/calculate-days-supply
 * Calculate days supply from sig and quantity
 */
router.post("/medications/calculate-days-supply", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { sig, quantity, dosageForm } = req.body;

    if (!sig || !quantity || !dosageForm) {
      return res.status(400).json({ error: "sig, quantity, and dosageForm are required" });
    }

    const { pharmacyValidation } = await import("./pharmacy-validation-service.js");
    
    const daysSupply = await pharmacyValidation.calculateDaysSupply(sig, quantity, dosageForm);
    
    res.json({ daysSupply });

  } catch (error) {
    console.error("❌ [CalculateDaysSupply] Error calculating days supply:", error);
    res.status(500).json({ error: "Failed to calculate days supply" });
  }
});

/**
 * POST /api/medication-fix/process-existing-order/:orderId
 * Manual endpoint to process an existing medication order that failed automatic processing
 */
router.post("/medication-fix/process-existing-order/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const orderId = parseInt(req.params.orderId);
    console.log(`🔧 [MedicationFix] Processing existing medication order ${orderId}`);

    // Get the order details
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.orderType !== "medication") {
      return res.status(400).json({ error: "Order is not a medication order" });
    }

    console.log(`🔧 [MedicationFix] Found order: ${order.medicationName} for patient ${order.patientId}, encounter ${order.encounterId}`);

    // Check if medication already exists
    const existingMedications = await storage.getPatientMedications(order.patientId);
    const existingMedication = existingMedications.find(
      med => med.medicationName?.toLowerCase() === order.medicationName?.toLowerCase()
    );

    if (existingMedication) {
      console.log(`⚠️ [MedicationFix] Medication ${order.medicationName} already exists for patient`);
      return res.json({
        success: false,
        message: "Medication already exists",
        medication: existingMedication
      });
    }

    // Process the order to create medication
    const result = await medicationDelta.processOrderDelta(
      order.patientId,
      order.encounterId || 0,
      req.user!.id
    );

    console.log(`✅ [MedicationFix] Successfully processed order ${orderId}, created ${result.total_medications_affected} medications`);

    res.json({
      success: true,
      orderId: orderId,
      medicationsCreated: result.total_medications_affected,
      changes: result.changes
    });

  } catch (error) {
    console.error(`❌ [MedicationFix] Error processing existing order:`, error);
    res.status(500).json({ error: "Failed to process existing order" });
  }
});

export default router;