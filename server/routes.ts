import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertEncounterSchema, insertVitalsSchema } from "@shared/schema";
import { processVoiceRecordingEnhanced, AIAssistantParams } from "./openai";
import { parseRoutes } from "./parse-routes";
import multer from "multer";
import OpenAI from "openai";

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
    } catch (error: any) {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patient = await storage.getPatient(parseInt(req.params.id));
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      
      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Encounter routes
  app.get("/api/patients/:patientId/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const encounters = await storage.getPatientEncounters(patientId);
      res.json(encounters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounter = await storage.getEncounter(parseInt(req.params.id));
      if (!encounter) return res.status(404).json({ message: "Encounter not found" });
      
      res.json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertEncounterSchema.parse(req.body);
      const encounter = await storage.createEncounter(validatedData);
      res.status(201).json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const encounterId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedEncounter = await storage.updateEncounter(encounterId, updates);
      res.json(updatedEncounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vitals routes
  app.get("/api/patients/:patientId/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getPatientVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/vitals/latest", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getLatestVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vitals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertVitalsSchema.parse(req.body);
      const vitals = await storage.createVitals(validatedData);
      res.status(201).json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient chart data routes
  app.get("/api/patients/:patientId/allergies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const allergies = await storage.getPatientAllergies(patientId);
      res.json(allergies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/medications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const medications = await storage.getPatientMedications(patientId);
      res.json(medications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/diagnoses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const diagnoses = await storage.getPatientDiagnoses(patientId);
      res.json(diagnoses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/family-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const familyHistory = await storage.getPatientFamilyHistory(patientId);
      res.json(familyHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/medical-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const medicalHistory = await storage.getPatientMedicalHistory(patientId);
      res.json(medicalHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/social-history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const socialHistory = await storage.getPatientSocialHistory(patientId);
      res.json(socialHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/lab-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const labOrders = await storage.getPatientLabOrders(patientId);
      res.json(labOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/lab-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const labResults = await storage.getPatientLabResults(patientId);
      res.json(labResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/imaging-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const imagingOrders = await storage.getPatientImagingOrders(patientId);
      res.json(imagingOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/imaging-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const imagingResults = await storage.getPatientImagingResults(patientId);
      res.json(imagingResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Live AI suggestions endpoint for real-time transcription (used by encounter recording)
  app.post("/api/voice/live-suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { patientId, userRole = "provider", transcription } = req.body;
      
      if (!patientId || !transcription) {
        return res.status(400).json({ message: "Patient ID and transcription are required" });
      }

      // Get patient context
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      try {
        console.log('🧠 [Routes] Attempting to get live suggestions...');
        const { HybridSOAPService } = await import('./hybrid-soap-service.js');
        
        const hybridService = new HybridSOAPService();
        console.log('🧠 [Routes] HybridSOAPService created');
        
        const suggestions = await hybridService.getEnhancedSuggestions(
          parseInt(patientId),
          transcription
        );
        console.log('🧠 [Routes] Suggestions received:', suggestions);

        const formattedSuggestions = {
          realTimePrompts: suggestions.suggestions || [],
          clinicalGuidance: "AI analysis in progress...",
          clinicalFlags: suggestions.clinicalFlags || []
        };

        const response = {
          aiSuggestions: formattedSuggestions,
          isLive: true
        };

        res.json(response);
      } catch (error: any) {
        console.error('❌ [Routes] Live suggestions error:', error);
        res.status(500).json({ 
          message: "Failed to generate live suggestions",
          error: error?.message || 'Unknown error',
          aiSuggestions: {
            realTimePrompts: ["Continue recording..."],
            clinicalGuidance: "Live suggestions temporarily unavailable"
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced voice processing for encounter recording
  app.post("/api/voice/transcribe-enhanced", upload.single("audio"), async (req, res) => {
    try {
      const { patientId, userRole, isLiveChunk } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const patientIdNum = parseInt(patientId);
      const userRoleStr = userRole || "provider";
      const isLive = isLiveChunk === "true";

      const patient = await storage.getPatient(patientIdNum);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      if (isLive) {
        try {
          const { SimpleRealtimeService } = await import('./simple-realtime-service.js');
          const realtimeService = new SimpleRealtimeService();
          
          const result = await realtimeService.processLiveAudioChunk(
            req.file.buffer,
            patientIdNum,
            userRoleStr
          );
          
          res.json(result);
          return;
        } catch (liveError) {
          console.error('Live processing failed, falling back to enhanced:', liveError);
        }
      }

      // Create a new encounter for voice documentation
      const newEncounter = await storage.createEncounter({
        patientId: patientIdNum,
        providerId: req.user?.id || 1,
        encounterType: "voice_note",
        chiefComplaint: "Voice-generated documentation"
      });

      const result = await processVoiceRecordingEnhanced(
        req.file.buffer,
        {
          userRole: userRoleStr as "nurse" | "provider", 
          patientId: patientIdNum,
          encounterId: newEncounter.id,
          patientContext: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            age: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
            gender: patient.gender,
            mrn: patient.mrn
          }
        }
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get assistant configuration for a patient
  app.get("/api/patients/:id/assistant", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!patient.assistantId) {
        return res.status(404).json({ message: "No assistant found for this patient" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      try {
        // Retrieve the assistant configuration from OpenAI
        const assistant = await openai.beta.assistants.retrieve(patient.assistantId);
        
        const assistantInfo = {
          id: assistant.id,
          name: assistant.name,
          description: assistant.description,
          instructions: assistant.instructions,
          model: assistant.model,
          tools: assistant.tools,
          metadata: assistant.metadata,
          created_at: assistant.created_at,
          thread_id: patient.assistantThreadId
        };

        res.json(assistantInfo);
      } catch (openaiError: any) {
        console.error('❌ Failed to retrieve assistant from OpenAI:', openaiError);
        res.status(500).json({ 
          message: "Failed to retrieve assistant configuration",
          error: openaiError.message 
        });
      }
    } catch (error: any) {
      console.error('❌ Error in assistant retrieval:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get assistant thread messages for a patient
  app.get("/api/patients/:id/assistant/messages", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!patient.assistantThreadId) {
        return res.status(404).json({ message: "No conversation thread found for this patient" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      try {
        // Retrieve the thread messages from OpenAI
        const messages = await openai.beta.threads.messages.list(patient.assistantThreadId, {
          limit: 20,
          order: 'desc'
        });
        
        const formattedMessages = messages.data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content[0]?.text?.value || 'No text content',
          created_at: msg.created_at
        }));

        res.json(formattedMessages);
      } catch (openaiError: any) {
        console.error('❌ Failed to retrieve thread messages from OpenAI:', openaiError);
        res.status(500).json({ 
          message: "Failed to retrieve conversation history",
          error: openaiError.message 
        });
      }
    } catch (error: any) {
      console.error('❌ Error in thread messages retrieval:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // SOAP Note Generation endpoint
  app.post("/api/patients/:id/encounters/:encounterId/generate-soap", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const encounterId = parseInt(req.params.encounterId);
      const { transcription, userRole = "provider" } = req.body;
      
      if (!transcription || !transcription.trim()) {
        return res.status(400).json({ message: "Transcription is required" });
      }

      console.log(`🩺 [SOAP] Generating SOAP note for patient ${patientId}, encounter ${encounterId}`);

      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Use hybrid SOAP generation service
      const { HybridSOAPService } = await import('./hybrid-soap-service.js');
      const hybridSoapService = new HybridSOAPService();
      
      // Generate SOAP note with fast response + background learning
      const soapNote = await hybridSoapService.generateSOAPNote(
        patientId,
        encounterId.toString(),
        transcription
      );

      console.log(`✅ [SOAP] Generated SOAP note (${soapNote.length} characters)`);
      
      res.json({ 
        soapNote,
        patientId,
        encounterId,
        generatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ [SOAP] Error generating SOAP note:', error);
      res.status(500).json({ 
        message: "Failed to generate SOAP note", 
        error: error.message 
      });
    }
  });

  // Unified Orders API routes for draft orders processing system
  app.get("/api/patients/:patientId/orders/draft", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const draftOrders = await storage.getPatientDraftOrders(patientId);
      res.json(draftOrders);
    } catch (error: any) {
      console.error("[Orders API] Error fetching draft orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderData = req.body;
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error: any) {
      console.error("[Orders API] Error creating order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders/draft/batch", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { orders } = req.body;
      if (!Array.isArray(orders)) {
        return res.status(400).json({ message: "Orders must be an array" });
      }

      const createdOrders = await Promise.all(
        orders.map(orderData => storage.createOrder(orderData))
      );
      
      res.status(201).json(createdOrders);
    } catch (error: any) {
      console.error("[Orders API] Error creating batch orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedOrder = await storage.updateOrder(orderId, updateData);
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("[Orders API] Error updating order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderId = parseInt(req.params.id);
      await storage.deleteOrder(orderId);
      res.json({ message: "Order deleted successfully" });
    } catch (error: any) {
      console.error("[Orders API] Error deleting order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });
      
      res.json(order);
    } catch (error: any) {
      console.error("[Orders API] Error fetching order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const orders = await storage.getPatientOrders(patientId);
      res.json(orders);
    } catch (error: any) {
      console.error("[Orders API] Error fetching patient orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Register patient parser routes
  app.use("/api", parseRoutes);

  const httpServer = createServer(app);
  
  return httpServer;
}