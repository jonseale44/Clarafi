import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertEncounterSchema, insertVitalsSchema, insertOrderSchema } from "@shared/schema";
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

  // User SOAP Template endpoints
  app.get("/api/user/soap-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      
      // For now, return a default template since database isn't fully set up
      const defaultTemplate = {
        id: 1,
        userId,
        templateName: "Standard Clinical Template",
        isDefault: true,
        subjectiveTemplate: "Patient presents with [chief complaint].\n\n[History of present illness including onset, duration, character, precipitating factors, alleviating factors, and associated symptoms]\n\n[Review of systems as relevant]",
        objectiveTemplate: "Vitals: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]\n\nPhysical Exam:\nGen: [general appearance]\nHEENT: [head, eyes, ears, nose, throat]\nCV: [cardiovascular]\nLungs: [pulmonary]\nAbd: [abdominal]\nExt: [extremities]\nSkin: [skin]\nNeuro: [neurological if relevant]\n\nLabs: [laboratory results if available]",
        assessmentTemplate: "1. [Primary diagnosis] - [clinical reasoning]\n2. [Secondary diagnosis] - [clinical reasoning]\n3. [Additional diagnoses as applicable]",
        planTemplate: "1. [Primary diagnosis management]\n   - [Medications with dosing]\n   - [Procedures/interventions]\n   - [Monitoring]\n\n2. [Secondary diagnosis management]\n   - [Specific treatments]\n\n3. Follow-up:\n   - [Timeline and instructions]\n   - [Patient education]\n   - [Return precautions]",
        formatPreferences: {
          useBulletPoints: true,
          boldDiagnoses: true,
          separateAssessmentPlan: true,
          vitalSignsFormat: 'inline',
          physicalExamFormat: 'structured',
          abbreviationStyle: 'standard',
          sectionSpacing: 4,
        },
        enableAiLearning: true,
        learningConfidence: 0.75,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.json([defaultTemplate]);
    } catch (error: any) {
      console.error('Error fetching user templates:', error);
      res.status(500).json({ message: "Failed to fetch templates", error: error.message });
    }
  });

  app.post("/api/user/soap-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const templateData = req.body;
      
      console.log(`[UserTemplates] Saving template for user ${userId}:`, templateData.templateName);
      
      // For now, return the template with an ID since database isn't fully set up
      const savedTemplate = {
        id: Date.now(),
        userId,
        ...templateData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`✅ [UserTemplates] Template saved successfully`);
      res.json(savedTemplate);
    } catch (error: any) {
      console.error('Error saving user template:', error);
      res.status(500).json({ message: "Failed to save template", error: error.message });
    }
  });

  // Enhanced SOAP generation with user preferences
  app.post("/api/patients/:id/encounters/:encounterId/generate-soap-personalized", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      const encounterId = parseInt(req.params.encounterId);
      const userId = req.user.id;
      const { transcription, usePersonalization = true } = req.body;
      
      if (!transcription || !transcription.trim()) {
        return res.status(400).json({ message: "Transcription is required" });
      }

      console.log(`[PersonalizedSOAP] Generating for user ${userId}, patient ${patientId}, encounter ${encounterId}`);

      if (usePersonalization) {
        // Use personalized SOAP generation with user preferences
        const { UserSOAPPreferenceService } = await import('./user-soap-preference-service.js');
        const preferenceService = new UserSOAPPreferenceService();
        
        // Get patient context
        const patient = await storage.getPatient(patientId);
        if (!patient) {
          return res.status(404).json({ message: "Patient not found" });
        }

        const soapNote = await preferenceService.generatePersonalizedSOAP(
          userId,
          patientId,
          transcription,
          { patient }
        );

        console.log(`✅ [PersonalizedSOAP] Generated personalized SOAP (${soapNote.length} characters)`);
        
        res.json({ 
          soapNote,
          patientId,
          encounterId,
          userId,
          personalized: true,
          generatedAt: new Date().toISOString()
        });
      } else {
        // Fall back to standard generation
        const { HybridSOAPService } = await import('./hybrid-soap-service.js');
        const hybridSoapService = new HybridSOAPService();
        
        const soapNote = await hybridSoapService.generateSOAPNote(
          patientId,
          encounterId.toString(),
          transcription
        );

        res.json({ 
          soapNote,
          patientId,
          encounterId,
          personalized: false,
          generatedAt: new Date().toISOString()
        });
      }

    } catch (error: any) {
      console.error('❌ [PersonalizedSOAP] Error:', error);
      res.status(500).json({ 
        message: "Failed to generate personalized SOAP note", 
        error: error.message 
      });
    }
  });

  // Analyze user edits for learning
  app.post("/api/user/analyze-edit", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user.id;
      const { originalText, editedText, sectionType, patientId, encounterId } = req.body;
      
      console.log(`[EditAnalysis] Analyzing edit for user ${userId} in ${sectionType} section`);
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "OpenAI API key required for edit analysis",
          requiresSetup: true 
        });
      }

      const { UserSOAPPreferenceService } = await import('./user-soap-preference-service.js');
      const preferenceService = new UserSOAPPreferenceService();
      
      const analysis = await preferenceService.analyzeUserEdit(
        userId,
        originalText,
        editedText,
        sectionType
      );

      if (analysis) {
        console.log(`✅ [EditAnalysis] Pattern detected: ${analysis.rule}`);
        res.json({ 
          analysis,
          learned: true 
        });
      } else {
        res.json({ 
          analysis: null,
          learned: false 
        });
      }

    } catch (error: any) {
      console.error('❌ [EditAnalysis] Error:', error);
      res.status(500).json({ 
        message: "Failed to analyze edit", 
        error: error.message 
      });
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
      
      // Automatically extract and create draft orders from SOAP note
      try {
        console.log(`🧬 [SOAP] ========== STARTING DRAFT ORDERS EXTRACTION ==========`);
        console.log(`🧬 [SOAP] Patient ID: ${patientId}, Encounter ID: ${encounterId}`);
        console.log(`🧬 [SOAP] SOAP Note (${soapNote.length} chars):`);
        console.log(`🧬 [SOAP] SOAP Note Content:\n${soapNote}`);
        console.log(`🧬 [SOAP] ========== IMPORTING EXTRACTOR ==========`);
        
        const { SOAPOrdersExtractor } = await import('./soap-orders-extractor.js');
        const extractor = new SOAPOrdersExtractor();
        console.log(`🧬 [SOAP] Extractor imported successfully`);
        
        // Extract orders from SOAP note content
        console.log(`🧬 [SOAP] Calling extractOrders...`);
        const extractedOrders = await extractor.extractOrders(soapNote, patientId, encounterId);
        console.log(`🧬 [SOAP] Extraction completed. Result:`, extractedOrders);
        
        if (extractedOrders && extractedOrders.length > 0) {
          console.log(`🧬 [SOAP] Found ${extractedOrders.length} draft orders to create`);
          console.log(`🧬 [SOAP] Orders to create:`, JSON.stringify(extractedOrders, null, 2));
          
          // Create draft orders in the database
          console.log(`🧬 [SOAP] Creating orders in database...`);
          const createdOrders = await Promise.all(
            extractedOrders.map((orderData: any, index: number) => {
              console.log(`🧬 [SOAP] Creating order ${index + 1}:`, orderData);
              return storage.createOrder(orderData);
            })
          );
          
          console.log(`✅ [SOAP] Created ${createdOrders.length} draft orders automatically`);
          console.log(`✅ [SOAP] Created orders:`, JSON.stringify(createdOrders, null, 2));
        } else {
          console.log(`ℹ️ [SOAP] No draft orders found in SOAP note content`);
          console.log(`ℹ️ [SOAP] Extracted orders object:`, extractedOrders);
        }
      } catch (orderError: any) {
        console.error('❌ [SOAP] Error auto-extracting draft orders:', orderError);
        console.error('❌ [SOAP] Error stack:', orderError.stack);
        console.error('❌ [SOAP] Error details:', {
          name: orderError.name,
          message: orderError.message,
          cause: orderError.cause
        });
        // Don't fail the SOAP generation if order extraction fails
      }
      
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

  // Get draft orders for a patient
  app.get("/api/patients/:patientId/draft-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      const draftOrders = await storage.getPatientDraftOrders(patientId);
      res.json(draftOrders);
    } catch (error: any) {
      console.error("[Orders API] Error fetching patient draft orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete all draft orders for a patient
  app.delete("/api/patients/:patientId/draft-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.patientId);
      console.log(`[Orders API] Deleting all draft orders for patient ${patientId}`);
      
      await storage.deleteAllPatientDraftOrders(patientId);
      console.log(`[Orders API] Successfully deleted all draft orders for patient ${patientId}`);
      
      res.json({ message: "All draft orders deleted successfully" });
    } catch (error: any) {
      console.error("[Orders API] Error deleting all patient draft orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new order
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderData = req.body;
      console.log(`[Orders API] Creating new order with data:`, JSON.stringify(orderData, null, 2));
      
      const orderWithUser = {
        ...orderData,
        orderedBy: (req.user as any).id,
      };
      
      console.log(`[Orders API] Final order data for database:`, JSON.stringify(orderWithUser, null, 2));
      
      const order = await storage.createOrder(orderWithUser);
      console.log(`[Orders API] Successfully created order with ID: ${order.id}`);
      
      res.status(201).json(order);
    } catch (error: any) {
      console.error("[Orders API] Error creating order:", error);
      console.error("[Orders API] Error stack:", error.stack);
      console.error("[Orders API] Order data that caused error:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: error.message });
    }
  });

  // Update an order
  app.put("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      
      console.log(`[Orders API] Updating order ${orderId} with data:`, JSON.stringify(updates, null, 2));
      
      // Clean up any invalid timestamp fields and other problematic fields
      const cleanedUpdates = { ...updates };
      
      // Remove all timestamp fields as they are auto-managed by the database
      delete cleanedUpdates.createdAt;
      delete cleanedUpdates.updatedAt;
      delete cleanedUpdates.orderedAt;
      delete cleanedUpdates.approvedAt;
      
      // Remove any other auto-generated or problematic fields
      delete cleanedUpdates.id;
      
      // Convert string numbers to proper numbers
      if (cleanedUpdates.quantity && typeof cleanedUpdates.quantity === 'string') {
        cleanedUpdates.quantity = parseInt(cleanedUpdates.quantity, 10);
      }
      if (cleanedUpdates.refills && typeof cleanedUpdates.refills === 'string') {
        cleanedUpdates.refills = parseInt(cleanedUpdates.refills, 10);
      }
      if (cleanedUpdates.daysSupply && typeof cleanedUpdates.daysSupply === 'string') {
        cleanedUpdates.daysSupply = parseInt(cleanedUpdates.daysSupply, 10);
      }
      
      // Convert boolean strings to proper booleans
      if (cleanedUpdates.requiresPriorAuth && typeof cleanedUpdates.requiresPriorAuth === 'string') {
        cleanedUpdates.requiresPriorAuth = cleanedUpdates.requiresPriorAuth === 'true';
      }
      if (cleanedUpdates.fastingRequired && typeof cleanedUpdates.fastingRequired === 'string') {
        cleanedUpdates.fastingRequired = cleanedUpdates.fastingRequired === 'true';
      }
      if (cleanedUpdates.contrastNeeded && typeof cleanedUpdates.contrastNeeded === 'string') {
        cleanedUpdates.contrastNeeded = cleanedUpdates.contrastNeeded === 'true';
      }
      
      console.log(`[Orders API] Cleaned update data:`, JSON.stringify(cleanedUpdates, null, 2));
      
      const order = await storage.updateOrder(orderId, cleanedUpdates);
      console.log(`[Orders API] Successfully updated order ${orderId}`);
      res.json(order);
    } catch (error: any) {
      console.error("[Orders API] Error updating order:", error);
      console.error("[Orders API] Error stack:", error.stack);
      console.error("[Orders API] Update data that caused error:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: error.message });
    }
  });

  // Delete an order
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const orderId = parseInt(req.params.id);
      await storage.deleteOrder(orderId);
      res.status(204).send();
    } catch (error: any) {
      console.error("[Orders API] Error deleting order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parse natural language text into structured order data (mixed types)
  app.post("/api/orders/parse-ai-text", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { text, orderType } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log(`[AI Parser] Parsing orders from text: "${text}"`);
      console.log(`[AI Parser] Suggested order type: ${orderType || 'auto-detect'}`);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Enhanced prompt to parse mixed order types
      const prompt = `Parse all medical orders from this text and categorize them automatically: "${text}"

Return a JSON object with arrays for each order type found:
{
  "medications": [
    {
      "medication_name": "string",
      "dosage": "string", 
      "sig": "string",
      "quantity": number,
      "refills": number,
      "form": "string",
      "route_of_administration": "string",
      "days_supply": number
    }
  ],
  "labs": [
    {
      "test_name": "string",
      "lab_name": "string", 
      "specimen_type": "string",
      "fasting_required": boolean,
      "priority": "string"
    }
  ],
  "imaging": [
    {
      "study_type": "string",
      "region": "string",
      "laterality": "string or null",
      "contrast_needed": boolean,
      "priority": "string"
    }
  ],
  "referrals": [
    {
      "specialty_type": "string",
      "provider_name": "string or null", 
      "urgency": "string"
    }
  ]
}

Instructions:
- Extract ALL orders mentioned, even if there are multiple of the same type
- For medications: 
  * Include generic and brand names, dosages, frequencies, quantities
  * Default to 90-day supply unless duration is specified
  * For once daily: 90 tablets with 2 refills
  * For twice daily: 180 tablets with 2 refills  
  * For three times daily: 270 tablets with 2 refills
  * If specific duration mentioned (e.g., "for 5 days", "7 day course"), calculate exact quantity with 0 refills
  * If user specifies exact quantity/refills, use those values instead of defaults
- For labs: Recognize common abbreviations (CMP = Comprehensive Metabolic Panel, CBC = Complete Blood Count, etc.)
- For imaging: Recognize abbreviations (CXR = Chest X-ray, CT = Computed Tomography, etc.)
- For referrals: Extract specialty consultations mentioned
- Set appropriate defaults for missing information
- Only include arrays for order types that are actually found in the text
- Return only valid JSON without markdown formatting`;

      console.log(`[AI Parser] Sending request to OpenAI for multi-type parsing`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical AI that parses natural language into structured medical orders. Always return valid JSON with arrays for each order type found."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No response from GPT');
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith('```json')) {
        cleanedContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        cleanedContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedData = JSON.parse(cleanedContent);
      console.log(`[AI Parser] Successfully parsed mixed orders:`, JSON.stringify(parsedData, null, 2));
      
      res.json(parsedData);

    } catch (error: any) {
      console.error("[AI Parser] Error parsing order text:", error);
      res.status(500).json({ message: "Failed to parse order text" });
    }
  });

  // Legacy single-type parser (keeping for backward compatibility)
  app.post("/api/orders/parse-ai-text-single", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { text, orderType } = req.body;
      
      if (!text || !orderType) {
        return res.status(400).json({ message: "Text and orderType are required" });
      }

      console.log(`[AI Parser] Parsing ${orderType} order from text: "${text}"`);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      let prompt = "";
      let responseSchema = "";

      switch (orderType) {
        case "medication":
          prompt = `Parse this medication order into structured data: "${text}"
          
Extract the following information and return as JSON:
- medication_name: The name of the medication
- dosage: The strength/dose (e.g., "10mg", "500mg")
- sig: Patient instructions (e.g., "Take twice daily with food")
- quantity: Number of units to dispense (default to 90-day supply: once daily=90 tablets, twice daily=180 tablets, etc.)
- refills: Number of refills (default 2 for maintenance medications, 0 for short courses)
- form: Medication form (tablet, capsule, liquid, etc. - default "tablet")
- route_of_administration: How to take (oral, topical, injection, etc. - default "oral")
- days_supply: Days supply (90 for maintenance, exact for short courses)

Special rules:
- If specific duration mentioned (e.g., "for 5 days", "7 day course"), calculate exact quantity with 0 refills
- If user specifies exact quantity/refills, use those values instead of defaults
- For maintenance medications without specified duration, default to 90-day supply with 2 refills

Return only valid JSON without markdown formatting.`;
          
          responseSchema = `{
  "medication_name": "string",
  "dosage": "string", 
  "sig": "string",
  "quantity": number,
  "refills": number,
  "form": "string",
  "route_of_administration": "string",
  "days_supply": number
}`;
          break;

        case "lab":
          prompt = `Parse this lab order into structured data: "${text}"
          
Extract the following information and return as JSON:
- test_name: The specific test name
- lab_name: The lab panel or grouping name
- specimen_type: Type of specimen (blood, urine, etc. - default "blood")
- fasting_required: Whether fasting is required (boolean)
- priority: Priority level (routine, urgent, stat - default "routine")

Return only valid JSON without markdown formatting.`;
          
          responseSchema = `{
  "test_name": "string",
  "lab_name": "string",
  "specimen_type": "string",
  "fasting_required": boolean,
  "priority": "string"
}`;
          break;

        case "imaging":
          prompt = `Parse this imaging order into structured data: "${text}"
          
Extract the following information and return as JSON:
- study_type: Type of imaging study (X-ray, CT, MRI, Ultrasound, etc.)
- region: Body part or region to be imaged
- laterality: Side specification (left, right, bilateral, or null)
- contrast_needed: Whether contrast is needed (boolean)
- priority: Priority level (routine, urgent, stat - default "routine")

Return only valid JSON without markdown formatting.`;
          
          responseSchema = `{
  "study_type": "string",
  "region": "string",
  "laterality": "string or null",
  "contrast_needed": boolean,
  "priority": "string"
}`;
          break;

        case "referral":
          prompt = `Parse this referral order into structured data: "${text}"
          
Extract the following information and return as JSON:
- specialty_type: The medical specialty (cardiology, orthopedics, etc.)
- provider_name: Specific provider name if mentioned (or null)
- urgency: Urgency level (routine, urgent - default "routine")

Return only valid JSON without markdown formatting.`;
          
          responseSchema = `{
  "specialty_type": "string",
  "provider_name": "string or null",
  "urgency": "string"
}`;
          break;

        default:
          return res.status(400).json({ message: "Unsupported order type" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical AI that parses natural language orders into structured data. Always return valid JSON matching this schema: ${responseSchema}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No response from GPT');
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith('```json')) {
        cleanedContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        cleanedContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedData = JSON.parse(cleanedContent);
      console.log(`[AI Parser] Successfully parsed ${orderType} order:`, parsedData);
      
      res.json(parsedData);

    } catch (error: any) {
      console.error("[AI Parser] Error parsing order text:", error);
      res.status(500).json({ message: "Failed to parse order text" });
    }
  });

  // Register patient parser routes
  app.use("/api", parseRoutes);

  const httpServer = createServer(app);
  
  return httpServer;
}