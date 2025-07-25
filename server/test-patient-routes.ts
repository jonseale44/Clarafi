import { Router } from "express";
import { z } from "zod";
import { tenantIsolation } from "./tenant-isolation-middleware";
import { TestPatientGenerator, TestPatientConfig } from "./test-patient-generator";
import { storage } from "./storage";

export const testPatientRoutes = Router();

// Schema for test patient generation request
const generateTestPatientSchema = z.object({
  healthSystemId: z.number(),
  providerId: z.number(),
  locationId: z.number(),
  patientComplexity: z.enum(["low", "medium", "high", "extreme"]),
  numberOfMedicalProblems: z.number().min(0).max(20),
  numberOfMedications: z.number().min(0).max(30),
  numberOfAllergies: z.number().min(0).max(10),
  numberOfPriorEncounters: z.number().min(0).max(50),
  numberOfFutureAppointments: z.number().min(0).max(10),
  includeLabResults: z.boolean(),
  includeImagingResults: z.boolean(),
  includeVitals: z.boolean(),
  includeFamilyHistory: z.boolean(),
  includeSocialHistory: z.boolean(),
  includeSurgicalHistory: z.boolean(),
  noShowRate: z.number().min(0).max(100),
  avgArrivalDelta: z.number().min(-30).max(60), // -30 (early) to +60 (late)
  avgVisitDuration: z.number().min(10).max(60), // 10 to 60 minutes
  customFirstName: z.string().optional(),
  customLastName: z.string().optional(),
});

// System admin check middleware
const requireSystemAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Check if user is system admin (admin role AND system health system ID)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "This feature is only available to system administrators" });
  }

  // Optional: Check for specific system admin health system ID
  // For now, any admin can access this feature
  
  next();
};

// Get available health systems for test patient generation
testPatientRoutes.get('/api/test-patients/health-systems', requireSystemAdmin, async (req, res) => {
  try {
    const healthSystems = await storage.getAllHealthSystems();
    res.json(healthSystems);
  } catch (error) {
    console.error('Error fetching health systems:', error);
    res.status(500).json({ error: 'Failed to fetch health systems' });
  }
});

// Get providers for a specific health system
testPatientRoutes.get('/api/test-patients/providers/:healthSystemId', requireSystemAdmin, async (req, res) => {
  try {
    const healthSystemId = parseInt(req.params.healthSystemId);
    const providers = await storage.getProvidersByHealthSystem(healthSystemId);
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Get locations for a specific health system
testPatientRoutes.get('/api/test-patients/locations/:healthSystemId', requireSystemAdmin, async (req, res) => {
  try {
    const healthSystemId = parseInt(req.params.healthSystemId);
    const locations = await storage.getLocationsByHealthSystem(healthSystemId);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Generate a test patient
testPatientRoutes.post('/api/test-patients/generate', requireSystemAdmin, async (req, res) => {
  try {
    // Validate request body
    const config = generateTestPatientSchema.parse(req.body);
    
    // Verify that the selected health system, provider, and location are valid
    const healthSystem = await storage.getHealthSystem(config.healthSystemId);
    if (!healthSystem) {
      return res.status(400).json({ error: 'Invalid health system ID' });
    }
    
    const provider = await storage.getUser(config.providerId);
    if (!provider || provider.healthSystemId !== config.healthSystemId) {
      return res.status(400).json({ error: 'Invalid provider ID or provider not in selected health system' });
    }
    
    const location = await storage.getLocation(config.locationId);
    if (!location || location.healthSystemId !== config.healthSystemId) {
      return res.status(400).json({ error: 'Invalid location ID or location not in selected health system' });
    }
    
    // Generate the test patient
    const generator = new TestPatientGenerator();
    const result = await generator.generateTestPatient(config as TestPatientConfig);
    
    // Log the test patient generation for audit purposes
    console.log(`[TEST PATIENT] Generated by user ${req.user.id} (${req.user.email}):`, {
      patientId: result.patientId,
      healthSystemId: config.healthSystemId,
      complexity: config.patientComplexity,
      timestamp: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error generating test patient:', error);
    console.error('Error stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate test patient',
      details: errorMessage,
      debugInfo: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Get all test patients for a health system
testPatientRoutes.get('/api/test-patients/:healthSystemId', requireSystemAdmin, async (req, res) => {
  try {
    const healthSystemId = parseInt(req.params.healthSystemId);
    const testPatients = await storage.getTestPatients(healthSystemId);
    res.json(testPatients);
  } catch (error) {
    console.error('Error fetching test patients:', error);
    res.status(500).json({ error: 'Failed to fetch test patients' });
  }
});

// Delete a test patient and all associated data
testPatientRoutes.delete('/api/test-patients/:patientId', requireSystemAdmin, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    // Verify this is actually a test patient (starts with ZTEST)
    // Note: getPatient requires healthSystemId for tenant isolation
    const patients = await storage.getAllPatients(req.user.healthSystemId);
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mrn.startsWith('ZTEST')) {
      return res.status(400).json({ error: 'Can only delete test patients (MRN must start with ZTEST)' });
    }
    
    // Delete the patient and all associated data
    await storage.deletePatientAndAllData(patientId);
    
    console.log(`[TEST PATIENT] Deleted by user ${req.user.id} (${req.user.email}):`, {
      patientId,
      mrn: patient.mrn,
      timestamp: new Date().toISOString(),
    });
    
    res.json({ success: true, message: 'Test patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting test patient:', error);
    res.status(500).json({ error: 'Failed to delete test patient' });
  }
});