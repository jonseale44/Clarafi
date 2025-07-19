import { Router, Request, Response, NextFunction } from 'express';
import { tenantIsolation } from './tenant-isolation.js';
import { ElectronicSignatureService } from './electronic-signature-service.js';
import { PharmacyIntelligenceService } from './pharmacy-intelligence-service.js';
import { PrescriptionTransmissionService } from './prescription-transmission-service.js';
import { db } from './db.js';
import { medications, orders, pharmacies, prescriptionTransmissions, electronicSignatures, patients } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// Middleware to ensure user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();
const signatureService = new ElectronicSignatureService();
const pharmacyService = new PharmacyIntelligenceService();
const transmissionService = new PrescriptionTransmissionService();

// Create electronic signature
router.post('/api/eprescribing/signature', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('📝 [EPrescribing] Creating electronic signature');
    
    const {
      encounterId,
      signatureType,
      signatureData,
      authenticationMethod,
      twoFactorUsed,
      medicationIds,
      deaSignature
    } = req.body;

    // Validate required fields
    if (!signatureType || !signatureData || !authenticationMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: signatureType, signatureData, authenticationMethod' 
      });
    }

    // Create signature
    const signature = await signatureService.createSignature({
      userId: req.user!.id,
      encounterId,
      signatureType,
      signatureData,
      authenticationMethod,
      twoFactorUsed,
      deaSignature,
      medicationIds,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, signatureId: signature.id });
  } catch (error) {
    console.error('❌ [EPrescribing] Error creating signature:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create signature' 
    });
  }
});

// Get recent valid signature
router.get('/api/eprescribing/signature/recent', requireAuth, async (req, res) => {
  try {
    const deaRequired = req.query.dea === 'true';
    
    const signature = await signatureService.getRecentSignature(
      req.user!.id,
      deaRequired
    );

    if (!signature) {
      return res.status(404).json({ error: 'No valid signature found' });
    }

    res.json(signature);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting recent signature:', error);
    res.status(500).json({ error: 'Failed to get signature' });
  }
});

// Select best pharmacy for prescription
router.post('/api/eprescribing/pharmacy/select', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('🏥 [EPrescribing] Selecting best pharmacy');
    
    const {
      patientId,
      medicationIds,
      preferredPharmacyId,
      requiresCompounding,
      isControlled,
      urgency,
      patientLocation
    } = req.body;

    // Validate patient belongs to health system
    const [patient] = await db.select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Select pharmacy
    const selection = await pharmacyService.selectBestPharmacy({
      patientId,
      medicationIds,
      preferredPharmacyId,
      requiresCompounding,
      isControlled,
      urgency,
      patientLocation
    });

    res.json({
      pharmacy: selection.pharmacy,
      reasoning: selection.reasoning,
      confidence: selection.confidence,
      alternatives: selection.alternatives
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error selecting pharmacy:', error);
    res.status(500).json({ error: 'Failed to select pharmacy' });
  }
});

// Validate pharmacy capability
router.post('/api/eprescribing/pharmacy/validate', requireAuth, async (req, res) => {
  try {
    const { pharmacyId, requirements } = req.body;

    const validation = await pharmacyService.validatePharmacyCapability(
      pharmacyId,
      requirements
    );

    res.json(validation);
  } catch (error) {
    console.error('❌ [EPrescribing] Error validating pharmacy:', error);
    res.status(500).json({ error: 'Failed to validate pharmacy' });
  }
});

// Search pharmacies
router.get('/api/eprescribing/pharmacy/search', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { query = '', city, state } = req.query;

    let pharmacyQuery = db.select()
      .from(pharmacies)
      .where(eq(pharmacies.active, true))
      .limit(20);

    // Add filters if provided
    if (query) {
      pharmacyQuery = pharmacyQuery.where(
        pharmacies.name as any,
        'ilike',
        `%${query}%`
      );
    }

    const results = await pharmacyQuery;
    res.json(results);
  } catch (error) {
    console.error('❌ [EPrescribing] Error searching pharmacies:', error);
    res.status(500).json({ error: 'Failed to search pharmacies' });
  }
});

// Transmit prescription
router.post('/api/eprescribing/transmit', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('📤 [EPrescribing] Transmitting prescription');
    
    const {
      medicationId,
      orderId,
      pharmacyId,
      transmissionMethod,
      electronicSignatureId,
      urgency
    } = req.body;

    // Validate medication and order belong to health system
    const [medication] = await db.select()
      .from(medications)
      .innerJoin(orders, eq(medications.orderId, orders.id))
      .innerJoin(patients, eq(orders.patientId, patients.id))
      .where(and(
        eq(medications.id, medicationId),
        eq(orders.id, orderId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!medication) {
      return res.status(404).json({ error: 'Medication or order not found' });
    }

    // Transmit prescription
    const transmission = await transmissionService.transmitPrescription({
      medicationId,
      orderId,
      providerId: req.user!.id,
      pharmacyId,
      transmissionMethod,
      electronicSignatureId,
      urgency
    });

    res.json({
      success: true,
      transmissionId: transmission.id,
      status: transmission.transmissionStatus
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error transmitting prescription:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to transmit prescription' 
    });
  }
});

// Get transmission history
router.get('/api/eprescribing/transmissions/:patientId', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);

    // Validate patient belongs to health system
    const [patient] = await db.select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const history = await transmissionService.getTransmissionHistory(patientId);
    res.json(history);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting transmission history:', error);
    res.status(500).json({ error: 'Failed to get transmission history' });
  }
});

// Get transmission status
router.get('/api/eprescribing/transmission/:id/status', requireAuth, async (req, res) => {
  try {
    const transmissionId = parseInt(req.params.id);

    const [transmission] = await db.select()
      .from(prescriptionTransmissions)
      .where(eq(prescriptionTransmissions.id, transmissionId));

    if (!transmission) {
      return res.status(404).json({ error: 'Transmission not found' });
    }

    res.json({
      id: transmission.id,
      status: transmission.transmissionStatus,
      method: transmission.transmissionMethod,
      transmittedAt: transmission.transmittedAt,
      errorMessage: transmission.errorMessage
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting transmission status:', error);
    res.status(500).json({ error: 'Failed to get transmission status' });
  }
});

// Process refill request
router.post('/api/eprescribing/refill', requireAuth, async (req, res) => {
  try {
    console.log('💊 [EPrescribing] Processing refill request');
    
    const {
      originalTransmissionId,
      pharmacyId,
      refillRequestData
    } = req.body;

    const result = await transmissionService.processRefillRequest({
      originalTransmissionId,
      pharmacyId,
      refillRequestData
    });

    res.json(result);
  } catch (error) {
    console.error('❌ [EPrescribing] Error processing refill:', error);
    res.status(500).json({ error: 'Failed to process refill request' });
  }
});

// Get pharmacies for dropdown
router.get('/api/eprescribing/pharmacies', requireAuth, tenantIsolation, async (req, res) => {
  try {
    // Get all active pharmacies - in production, this would be filtered by location
    const activePharmacies = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.active, true))
      .orderBy(pharmacies.name)
      .limit(50);

    res.json(activePharmacies);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting pharmacies:', error);
    res.status(500).json({ error: 'Failed to get pharmacies' });
  }
});

export { router as eprescribingRoutes };