import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertEncounterSchema, insertVitalsSchema } from "@shared/schema";
import { processVoiceRecording, processVoiceRecordingEnhanced, AIAssistantParams } from "./openai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { q } = req.query;
      if (!q) return res.json([]);
      
      const patients = await storage.searchPatients(q as string);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Patient chart data routes
  app.get("/api/patients/:id/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const encounters = await storage.getPatientEncounters(patientId);
      res.json(encounters);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const vitals = await storage.getPatientVitals(patientId);
      res.json(vitals);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/vitals/latest", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const vitals = await storage.getLatestVitals(patientId);
      res.json(vitals || {});
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/allergies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const allergies = await storage.getPatientAllergies(patientId);
      res.json(allergies);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/medications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const medications = await storage.getPatientMedications(patientId);
      res.json(medications);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/diagnoses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const diagnoses = await storage.getPatientDiagnoses(patientId);
      res.json(diagnoses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/family-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const familyHistory = await storage.getPatientFamilyHistory(patientId);
      res.json(familyHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/medical-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const medicalHistory = await storage.getPatientMedicalHistory(patientId);
      res.json(medicalHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/social-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const socialHistory = await storage.getPatientSocialHistory(patientId);
      res.json(socialHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/lab-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const labOrders = await storage.getPatientLabOrders(patientId);
      res.json(labOrders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/lab-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const labResults = await storage.getPatientLabResults(patientId);
      res.json(labResults);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/imaging-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const imagingOrders = await storage.getPatientImagingOrders(patientId);
      res.json(imagingOrders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id/imaging-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const imagingResults = await storage.getPatientImagingResults(patientId);
      res.json(imagingResults);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Encounter routes
  app.post("/api/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertEncounterSchema.parse(req.body);
      const encounter = await storage.createEncounter(validatedData);
      res.status(201).json(encounter);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const encounter = await storage.getEncounter(encounterId);
      
      if (!encounter) {
        return res.status(404).json({ message: "Encounter not found" });
      }
      
      res.json(encounter);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const encounter = await storage.updateEncounter(encounterId, req.body);
      res.json(encounter);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vitals routes
  app.post("/api/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertVitalsSchema.parse(req.body);
      const vitals = await storage.createVitals(validatedData);
      res.status(201).json(vitals);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Voice recording routes
  app.post("/api/voice/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const { patientId, userRole = "provider" } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      // Get patient context for AI assistance
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Get additional context data
      const allergies = await storage.getPatientAllergies(patient.id);
      const medications = await storage.getPatientMedications(patient.id);
      const medicalHistory = await storage.getPatientMedicalHistory(patient.id);

      // Calculate age from date of birth
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

      const assistantParams: AIAssistantParams = {
        userRole: userRole as "nurse" | "provider",
        patientContext: {
          age,
          gender: patient.gender,
          medicalHistory: medicalHistory.map(h => h.historyText),
          currentMedications: medications.filter(m => m.status === "active").map(m => `${m.medicationName} ${m.dosage}`),
          allergies: allergies.map(a => a.allergen),
          chiefComplaint: req.body.chiefComplaint || undefined,
        },
        transcription: "", // Will be filled by processVoiceRecording
      };

      const result = await processVoiceRecording(req.file.buffer, assistantParams);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced voice processing with OpenAI Assistants
  app.post("/api/voice/transcribe-enhanced", upload.single("audio"), async (req, res) => {
    console.log('🎯 [Routes] Enhanced voice transcribe request received');
    console.log('🎯 [Routes] Request details:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      patientId: req.body.patientId,
      userRole: req.body.userRole,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    try {
      if (!req.file) {
        console.error('❌ [Routes] No audio file provided');
        return res.status(400).json({ message: "No audio file provided" });
      }

      const patientId = parseInt(req.body.patientId);
      const userRole = req.body.userRole;

      if (!patientId || !userRole) {
        console.error('❌ [Routes] Missing required parameters:', { patientId, userRole });
        return res.status(400).json({ message: "Missing patientId or userRole" });
      }

      console.log('👤 [Routes] Getting patient data...');
      // Get patient data for context
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        console.error('❌ [Routes] Patient not found:', patientId);
        return res.status(404).json({ message: "Patient not found" });
      }
      console.log('👤 [Routes] ✅ Patient found:', patient.firstName, patient.lastName);

      console.log('📝 [Routes] Creating new encounter...');
      // Create a new encounter for this voice recording
      const encounter = await storage.createEncounter({
        patientId,
        providerId: req.user?.id || 1,
        encounterType: "voice_note",
        chiefComplaint: "Voice-generated documentation"
      });
      console.log('📝 [Routes] ✅ Encounter created:', encounter.id);

      console.log('🚀 [Routes] Starting enhanced voice processing...');
      // Process with enhanced OpenAI Assistants workflow
      const result = await processVoiceRecordingEnhanced(
        req.file.buffer,
        patientId,
        encounter.id,
        userRole
      );
      console.log('🚀 [Routes] ✅ Enhanced processing completed');

      const response = {
        transcription: result.transcription,
        aiSuggestions: result.aiResponse.suggestions,
        soapNote: result.aiResponse.soapNote,
        draftOrders: result.aiResponse.draftOrders,
        cptCodes: result.aiResponse.cptCodes,
        encounterId: encounter.id
      };

      console.log('📤 [Routes] Sending response:', {
        hasTranscription: !!response.transcription,
        transcriptionLength: response.transcription?.length,
        hasSuggestions: !!response.aiSuggestions,
        hasSoapNote: !!response.soapNote,
        draftOrdersCount: response.draftOrders?.length || 0,
        cptCodesCount: response.cptCodes?.length || 0
      });

      res.json(response);
    } catch (error) {
      console.error('❌ [Routes] Enhanced voice processing failed:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
