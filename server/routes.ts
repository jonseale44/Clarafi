import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertEncounterSchema, insertVitalsSchema } from "@shared/schema";
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

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const patientId = parseInt(req.params.id);
      await storage.deletePatient(patientId);
      res.json({ message: "Patient deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
  
  // Live AI suggestions endpoint for real-time transcription
  app.post("/api/voice/live-suggestions", async (req, res) => {
    console.log('🧠 [Routes] Live suggestions endpoint hit!', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyKeys: Object.keys(req.body || {}),
      isAuthenticated: req.isAuthenticated?.()
    });
    
    try {
      if (!req.isAuthenticated()) {
        console.log('❌ [Routes] Live suggestions: User not authenticated');
        return res.sendStatus(401);
      }
      
      const { patientId, userRole = "provider", transcription } = req.body;
      
      console.log('🧠 [Routes] Live suggestions parsed body:', {
        patientId,
        userRole,
        hasTranscription: !!transcription,
        transcriptionLength: transcription?.length || 0
      });
      
      if (!patientId || !transcription) {
        console.log('❌ [Routes] Live suggestions: Missing required fields');
        return res.status(400).json({ message: "Patient ID and transcription are required" });
      }

      console.log('🧠 [Routes] Live suggestions request:', {
        patientId,
        userRole,
        transcriptionLength: transcription.length,
        transcriptionPreview: transcription.substring(0, 100) + '...'
      });

      // Get patient context
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      try {
        const { AssistantContextService } = await import('./assistant-context-service.js');
        const assistantService = new AssistantContextService();
        
        // Get or create persistent thread for this patient
        const threadId = await assistantService.getOrCreateThread(parseInt(patientId));
        console.log('🧵 [Routes] Live suggestions using persistent thread:', threadId);
        
        // Get live suggestions based on transcription
        const suggestions = await assistantService.getRealtimeSuggestions(
          threadId,
          transcription,
          userRole as "nurse" | "provider",
          parseInt(patientId)
        );

        console.log('🧠 [Routes] Raw suggestions from assistant:', suggestions);
        
        // Format suggestions for the UI
        const formattedSuggestions = {
          realTimePrompts: suggestions.suggestions || suggestions.realTimePrompts || [],
          clinicalGuidance: suggestions.clinicalGuidance || suggestions.guidance || suggestions.summary || "AI analysis in progress...",
          clinicalFlags: suggestions.clinicalFlags || []
        };
        
        console.log('🧠 [Routes] Formatted suggestions for UI:', formattedSuggestions);

        const response = {
          aiSuggestions: formattedSuggestions,
          isLive: true
        };

        res.json(response);
      } catch (error) {
        console.error('❌ [Routes] Live suggestions failed:', error);
        res.status(500).json({ 
          message: "Failed to generate live suggestions",
          aiSuggestions: {
            realTimePrompts: ["Continue recording..."],
            clinicalGuidance: "Live suggestions temporarily unavailable"
          }
        });
      }
    } catch (error) {
      console.error('❌ [Routes] Live suggestions endpoint error:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

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

      // Use simplified voice processing
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: new File([req.file.buffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
      });
      
      const result = {
        transcription: transcriptionResponse.text,
        patientId: parseInt(req.params.patientId),
        encounterId: parseInt(req.params.encounterId)
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced voice processing with OpenAI Assistants
  app.post("/api/voice/transcribe-enhanced", upload.single("audio"), async (req, res) => {
    try {
      const { patientId, userRole, isLiveChunk } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const patientIdNum = parseInt(patientId);
      const userRoleStr = userRole || "provider";
      const isLive = isLiveChunk === "true";

      console.log(`🎯 [Routes] ${isLive ? 'LIVE CHUNK' : 'FINAL'} transcription request received`);
      console.log('🎯 [Routes] Request details:', {
        hasFile: !!req.file,
        fileSize: req.file.buffer.length,
        patientId,
        userRole: userRoleStr,
        isLiveChunk: isLive,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });

      // Get patient info for context
      console.log('👤 [Routes] Getting patient data...');
      const patient = await storage.getPatient(patientIdNum);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      console.log('👤 [Routes] ✅ Patient found:', patient.firstName, patient.lastName);

      if (isLive) {
        // For live chunks, use our robust realtime service
        console.log('⚡ [Routes] Processing LIVE audio chunk...');
        
        try {
          const { SimpleRealtimeService } = await import('./simple-realtime-service.js');
          const realtimeService = new SimpleRealtimeService();
          
          const result = await realtimeService.processLiveAudioChunk(
            req.file.buffer,
            patientIdNum,
            userRoleStr
          );
          
          console.log('📝 [Routes] Live transcription result:', {
            hasTranscription: !!result.transcription,
            transcriptionLength: result.transcription?.length || 0,
            hasSuggestions: !!result.suggestions
          });

          const liveResponse = {
            transcription: result.transcription,
            aiSuggestions: result.suggestions,
            isLiveChunk: true
          };

          console.log('📡 [Routes] Sending live response');
          return res.json(liveResponse);
        } catch (liveError) {
          console.error('❌ [Routes] Live processing failed:', liveError);
          
          // Fallback response to keep the UI working
          return res.json({
            transcription: '',
            aiSuggestions: {
              suggestions: ['🎤 Continue speaking...'],
              clinicalFlags: []
            },
            isLiveChunk: true
          });
        }
      }

      // For final processing, create encounter and do full analysis
      console.log('📝 [Routes] Creating new encounter for final processing...');
      const encounter = await storage.createEncounter({
        patientId,
        providerId: req.user?.id || 1,
        encounterType: "voice_note",
        chiefComplaint: "Voice-generated documentation"
      });
      console.log('📝 [Routes] ✅ Encounter created:', encounter.id);

      console.log('🚀 [Routes] Using fast SOAP service for voice processing...');
      
      // Use OpenAI Whisper for transcription
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: new File([req.file.buffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
      });
      
      const transcription = transcriptionResponse.text;
      console.log('📝 [Routes] ✅ Transcription completed');
      
      // Generate SOAP note and orders using fast service
      const { FastSOAPService } = await import('./fast-soap-service.js');
      const fastSoapService = new FastSOAPService();
      
      const { soapNote, extractedOrders } = await fastSoapService.generateSOAPNoteAndOrdersFast(
        patientId,
        encounter.id.toString(),
        transcription
      );
      
      console.log('🚀 [Routes] ✅ Fast processing completed');

      const response = {
        transcription,
        soapNote,
        draftOrders: extractedOrders,
        encounterId: encounter.id,
        isLiveChunk: false
      };

      console.log('📤 [Routes] Sending final response:', {
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

  // NEW: Hybrid Realtime + Assistant voice processing endpoint
  app.post("/api/voice/hybrid-session", async (req, res) => {
    try {
      const { patientId, userRole } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }

      console.log('🔥 [Routes] Initializing hybrid voice session:', { patientId, userRole });
      
      // Create session ID for tracking
      const sessionId = `${patientId}_${Date.now()}`;
      
      console.log('🔥 [Routes] ✅ Hybrid session created successfully:', sessionId);
      
      res.json({ 
        status: "success", 
        message: "Hybrid Realtime + Assistant session ready",
        sessionId,
        patientId,
        userRole: userRole || "provider"
      });
    } catch (error: any) {
      console.error('❌ [Routes] Error initializing hybrid session:', error);
      res.status(500).json({ error: "Failed to initialize session", details: error.message });
    }
  });

  // Real-time provider suggestions during recording
  app.post("/api/voice/realtime-suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { transcriptionText, patientId } = req.body;
      
      if (!transcriptionText || !patientId) {
        return res.status(400).json({ message: "Transcription text and patient ID are required" });
      }

      console.log('🧠 [Routes] Getting real-time provider suggestions...', {
        transcriptionLength: transcriptionText.length,
        patientId
      });

      // Import and use the AssistantContextService
      const { AssistantContextService } = await import('./assistant-context-service.js');
      const assistantService = new AssistantContextService();
      
      // Initialize assistant and get thread
      await assistantService.initializeAssistant();
      const threadId = await assistantService.getOrCreateThread(parseInt(patientId));
      
      // Get intelligent suggestions with patient context
      const suggestions = await assistantService.getRealtimeSuggestions(
        threadId,
        transcriptionText,
        "provider", // Always provider for this endpoint
        parseInt(patientId)
      );

      console.log('🧠 [Routes] ✅ Real-time suggestions generated:', {
        suggestionsCount: suggestions.suggestions?.length || 0,
        clinicalFlagsCount: suggestions.clinicalFlags?.length || 0,
        hasContextualReminders: !!suggestions.contextualReminders?.length
      });

      res.json({
        suggestions: suggestions.suggestions || [],
        clinicalFlags: suggestions.clinicalFlags || [],
        contextualReminders: suggestions.contextualReminders || [],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [Routes] Real-time suggestions failed:', error);
      res.status(500).json({ 
        message: "Failed to generate suggestions",
        suggestions: [],
        clinicalFlags: [],
        contextualReminders: []
      });
    }
  });

  // NEW: Enhanced voice processing with real-time transcription and AI suggestions  
  app.post("/api/voice/process-realtime", upload.single("audio"), async (req, res) => {
    try {
      const { patientId, userRole, sessionId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      console.log('🎯 [Routes] Processing realtime voice with hybrid approach:', {
        patientId,
        userRole,
        sessionId,
        audioSize: req.file.buffer.length
      });

      // Get the voice service instance
      const voiceService = (global as any).voiceSessions?.get(sessionId);
      if (!voiceService) {
        return res.status(400).json({ error: "Session not found. Please initialize session first." });
      }

      // This endpoint will be called to send audio chunks to the realtime service
      // The actual transcription and suggestions will come through WebSocket events
      
      res.json({
        status: "processing",
        message: "Audio chunk received and being processed"
      });
      
    } catch (error: any) {
      console.error('❌ [Routes] Realtime voice processing failed:', error);
      res.status(500).json({ error: "Failed to process voice recording" });
    }
  });

  const httpServer = createServer(app);
  
  // Real-time transcription service initialization commented out for now
  console.log('🔧 [Routes] Real-time transcription service will be client-side only');
  
  return httpServer;
}
