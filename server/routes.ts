import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { APIResponseHandler } from "./api-response-handler.js";
import {
  insertPatientSchema,
  insertEncounterSchema,
  insertVitalsSchema,
  insertOrderSchema,
} from "@shared/schema";
// Legacy import removed - using enhanced realtime service only
import { parseRoutes } from "./parse-routes";
import dashboardRoutes from "./dashboard-routes";
import medicalProblemsRoutes from "./medical-problems-routes";
import enhancedMedicalProblemsRoutes from "./enhanced-medical-problems-routes";
import enhancedMedicationRoutes from "./enhanced-medication-routes";
import medicationStandardizationRoutes from "./medication-standardization-routes";
import unifiedMedicationIntelligenceRoutes from "./unified-medication-intelligence-routes";
import medicationFormularyRoutes from "./medication-formulary-routes";
import validationRoutes from "./validation-routes";
import intelligentDiagnosisRoutes from "./intelligent-diagnosis-routes";
import nursingContentRoutes from "./nursing-content-routes";
import nursingSummaryRoutes from "./nursing-summary-routes";
import { TokenUsageDashboard } from "./token-usage-dashboard.js";
import multer from "multer";
import OpenAI from "openai";
// Legacy SOAPOrdersExtractor import removed - now handled by frontend parallel processing
import { db } from "./db.js";
import { patients, diagnoses, medications, allergies, vitals, encounters as encountersTable } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Direct SOAP note generation function (replaces realtime-soap-streaming.ts)
async function generateSOAPNoteDirect(patientId: number, encounterId: string, transcription: string): Promise<string> {
  console.log(`🩺 [DirectSOAP] Generating SOAP note for patient ${patientId}`);
  
  // Get patient context
  const [patient, diagnosisList, meds, allergiesList, vitalsList, recentEncounters] = await Promise.all([
    db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
    db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)),
    db.select().from(medications).where(eq(medications.patientId, patientId)),
    db.select().from(allergies).where(eq(allergies.patientId, patientId)),
    db.select().from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.createdAt)).limit(5),
    db.select().from(encountersTable).where(eq(encountersTable.patientId, patientId)).orderBy(desc(encountersTable.createdAt)).limit(3),
  ]);

  const patientData = patient[0];
  if (!patientData) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const age = Math.floor((Date.now() - new Date(patientData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Build medical context
  const currentDiagnoses = diagnosisList.length > 0 
    ? diagnosisList.map((d: any) => `- ${d.diagnosis} (${d.icd10Code || "unspecified"})`).join("\n")
    : "- No active diagnoses on file";

  const currentMedications = meds.length > 0
    ? meds.map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join("\n")
    : "- No current medications on file";

  const knownAllergies = allergiesList.length > 0
    ? allergiesList.map((a: any) => `- ${a.allergen}: ${a.reaction}`).join("\n")
    : "- NKDA (No Known Drug Allergies)";

  const recentVitals = vitalsList.length > 0
    ? vitalsList.map((v: any) => `${v.createdAt.toLocaleDateString()}: BP ${v.systolicBp}/${v.diastolicBp}, HR ${v.heartRate}, Temp ${v.temperature}°F`).join("\n")
    : "- No recent vitals on file";

  // Build comprehensive medical context
  const medicalContext = `
PATIENT CONTEXT:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${age} years old
- Gender: ${patientData.gender}
- MRN: ${patientData.mrn}

ACTIVE MEDICAL PROBLEMS:
${currentDiagnoses}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${recentVitals}
  `.trim();

  // Create sophisticated SOAP prompt with your finely-tuned specifications
  const soapPrompt = `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely normal, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded

Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.

Use concise, structured phrases. Avoid full sentences and narrative explanations.

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

**ASSESSMENT/PLAN:**

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]
Example:

Chest Tightness, Suspected Airway Constriction (R06.4):

Trial low-dose inhaler therapy to address potential airway constriction.
Monitor response to inhaler and reassess in 2 weeks.
Patient education on environmental triggers (e.g., dust exposure).
Fatigue, Work-Related Stress (Z73.0):

Counsel patient on stress management and lifestyle modifications.
Encourage gradual increase in physical activity.
Family History of Cardiovascular Disease (Z82.49):

Document family history and assess cardiovascular risk factors as part of ongoing care.
(preceded by FOUR blank lines)**ORDERS:** 

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY. Be concise (e.g., "CBC, BMP, TSH"). Do not include reasons or justification for labs. 

Imaging: Specify the modality and purpose in clear terms (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose of the referral (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;

  // Generate SOAP note
  const soapCompletion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "user", content: soapPrompt }],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const soapNote = soapCompletion.choices[0]?.message?.content;
  if (!soapNote) {
    throw new Error("No SOAP note generated from OpenAI");
  }

  // Save SOAP note to encounter
  await storage.updateEncounter(parseInt(encounterId), {
    note: soapNote,
  });

  // Legacy automatic processing removed - now handled by frontend parallel processing
  // Physical exam learning service still runs for persistent findings analysis
  try {
    const { PhysicalExamLearningService } = await import("./physical-exam-learning-service.js");
    const physicalExamLearningService = new PhysicalExamLearningService();
    
    // Run in background (don't await)
    physicalExamLearningService.analyzeSOAPNoteForPersistentFindings(patientId, parseInt(encounterId), soapNote)
      .catch(error => {
        console.warn("Physical exam learning service failed:", error);
      });
  } catch (error) {
    console.warn("Failed to load physical exam learning service:", error);
  }

  return soapNote;
}

// Fast medical routes removed - functionality moved to frontend WebSocket

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Dashboard routes
  app.use("/api/dashboard", dashboardRoutes);

  // Medical problems routes
  app.use("/api", medicalProblemsRoutes);

  // Enhanced medical problems routes (JSONB visit history)
  app.use("/api", enhancedMedicalProblemsRoutes);

  // Enhanced medications routes (GPT-powered standardization and grouping)
  app.use("/api", enhancedMedicationRoutes);

  // Medication standardization routes
  app.use("/api/medications", medicationStandardizationRoutes);

  // Intelligent diagnosis routes (GPT-powered autocompletion)
  app.use("/api/intelligent-diagnosis", intelligentDiagnosisRoutes);

  // Unified medication intelligence routes
  app.use("/api", unifiedMedicationIntelligenceRoutes);

  // Medication formulary routes (500-medication database)
  app.use("/api/formulary", medicationFormularyRoutes);

  // Encounter validation and signing routes
  app.use("/api", validationRoutes);

  // Nursing content generation routes
  app.use("/api", nursingContentRoutes);

  // Nursing summary routes
  app.use("/api/encounters", nursingSummaryRoutes);

  // Fast medical context routes removed - functionality moved to frontend WebSocket

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

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
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });

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

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.id);
      if (!patientId) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      // Check if patient exists before deletion
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      await storage.deletePatient(patientId);
      res.status(200).json({ message: "Patient deleted successfully" });
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
      if (!encounter)
        return res.status(404).json({ message: "Encounter not found" });

      res.json(encounter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/encounters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      console.log("🔥 [Encounters] POST request received:", req.body);
      console.log("🔥 [Encounters] User:", req.user);

      // Ensure providerId is set from authenticated user
      const encounterData = {
        ...req.body,
        providerId: req.user.id, // Override with authenticated user ID
      };

      console.log("🔥 [Encounters] Processing encounter data:", encounterData);

      const validatedData = insertEncounterSchema.parse(encounterData);
      console.log("🔥 [Encounters] Validation successful:", validatedData);

      const encounter = await storage.createEncounter(validatedData);
      console.log("🔥 [Encounters] Encounter created successfully:", encounter);

      res.status(201).json(encounter);
    } catch (error: any) {
      console.error("🔥 [Encounters] Error creating encounter:", error);
      if (error.issues) {
        console.error(
          "🔥 [Encounters] Validation issues:",
          JSON.stringify(error.issues, null, 2),
        );
      }
      res.status(500).json({
        message: error.message,
        details: error.issues || error,
      });
    }
  });

  app.get(
    "/api/patients/:patientId/encounters/:encounterId",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const encounterId = parseInt(req.params.encounterId);
        const patientId = parseInt(req.params.patientId);
        console.log(
          "🔍 [Encounters] GET request for patient:",
          patientId,
          "encounter:",
          encounterId,
        );

        const encounter = await storage.getEncounter(encounterId);
        console.log("🔍 [Encounters] Retrieved encounter:", encounter);

        if (!encounter) {
          console.error(
            "❌ [Encounters] Encounter not found in database for ID:",
            encounterId,
          );
          return res.status(404).json({ message: "Encounter not found" });
        }

        // Verify the encounter belongs to the specified patient
        if (encounter.patientId !== patientId) {
          console.error(
            "❌ [Encounters] Encounter patient mismatch:",
            encounter.patientId,
            "vs",
            patientId,
          );
          return res.status(404).json({ message: "Encounter not found" });
        }

        const cptCodesCount =
          encounter.cptCodes && Array.isArray(encounter.cptCodes)
            ? encounter.cptCodes.length
            : 0;
        console.log(
          "✅ [Encounters] Successfully returning encounter with CPT codes:",
          cptCodesCount,
        );
        res.json({ encounter });
      } catch (error: any) {
        console.error("💥 [Encounters] Error retrieving encounter:", error);
        res.status(500).json({ message: error.message });
      }
    },
  );

  app.get("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.id);
      console.log("🔍 [Encounters] GET request for encounter ID:", encounterId);
      console.log("🔍 [Encounters] Raw param:", req.params.id);

      const encounter = await storage.getEncounter(encounterId);
      console.log("🔍 [Encounters] Retrieved encounter:", encounter);

      if (!encounter) {
        console.error(
          "❌ [Encounters] Encounter not found in database for ID:",
          encounterId,
        );
        return res.status(404).json({ message: "Encounter not found" });
      }

      console.log(
        "✅ [Encounters] Successfully returning encounter:",
        encounter.id,
      );
      res.json(encounter);
    } catch (error: any) {
      console.error("💥 [Encounters] Error retrieving encounter:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/encounters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.id);
      const updates = req.body;

      const updatedEncounter = await storage.updateEncounter(
        encounterId,
        updates,
      );
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

  // Live AI suggestions now handled directly by frontend WebSocket connection to OpenAI

  // ⚠️ LEGACY ROUTE - Enhanced voice processing (PARTIALLY DEPRECATED)
  // This route uses legacy realtime medical context service - Enhanced Realtime Service is primary
  app.post(
    "/api/voice/transcribe-enhanced",
    upload.single("audio"),
    async (req, res) => {
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
          // Live processing moved to frontend WebSocket implementation
          res.json({
            transcription: "Live processing now handled by frontend WebSocket",
            suggestions: {
              suggestions: ["Use real-time WebSocket transcription for better performance"],
              clinicalFlags: []
            },
            performance: {
              responseTime: 0,
              tokenCount: 0,
              system: "deprecated"
            }
          });
          return;
        }

        // Check for existing in-progress encounter before creating a new one
        const existingEncounters =
          await storage.getPatientEncounters(patientIdNum);
        let targetEncounter = existingEncounters.find(
          (enc) =>
            enc.encounterStatus === "in_progress" ||
            enc.encounterStatus === "scheduled",
        );

        // Only create a new encounter if no active encounter exists
        if (!targetEncounter) {
          targetEncounter = await storage.createEncounter({
            patientId: patientIdNum,
            providerId: req.user?.id || 1,
            encounterType: "office_visit",
            chiefComplaint: "Voice-generated documentation",
          });
        }

        // Voice processing moved to frontend WebSocket implementation
        res.json({
          transcription: "Voice processing now handled by frontend WebSocket",
          aiSuggestions: {
            providerPrompts: ["Use WebSocket transcription for better performance"],
            nursePrompts: ["Switch to real-time WebSocket transcription"],
            draftOrders: [],
            draftDiagnoses: [],
            clinicalNotes: "This endpoint is deprecated"
          },
          performance: {
            responseTime: 0,
            tokenCount: 0,
            system: "deprecated"
          }
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },
  );

  // ⚠️ LEGACY ROUTE - Get assistant configuration for a patient (DEPRECATED)
  // This route uses the legacy Assistants API - current AI suggestions use Enhanced Realtime Service
  app.get("/api/patients/:id/assistant", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!patient.assistantId) {
        return res
          .status(404)
          .json({ message: "No assistant found for this patient" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      try {
        // Retrieve the assistant configuration from OpenAI
        const assistant = await openai.beta.assistants.retrieve(
          patient.assistantId,
        );

        const assistantInfo = {
          id: assistant.id,
          name: assistant.name,
          description: assistant.description,
          instructions: assistant.instructions,
          model: assistant.model,
          tools: assistant.tools,
          metadata: assistant.metadata,
          created_at: assistant.created_at,
          thread_id: patient.assistantThreadId,
        };

        res.json(assistantInfo);
      } catch (openaiError: any) {
        console.error(
          "❌ Failed to retrieve assistant from OpenAI:",
          openaiError,
        );
        res.status(500).json({
          message: "Failed to retrieve assistant configuration",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      console.error("❌ Error in assistant retrieval:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ⚠️ LEGACY ROUTE - Get assistant thread messages for a patient (DEPRECATED)
  // This route uses the legacy Assistants API - current AI suggestions use Enhanced Realtime Service
  app.get("/api/patients/:id/assistant/messages", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!patient.assistantThreadId) {
        return res
          .status(404)
          .json({ message: "No conversation thread found for this patient" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      try {
        // Retrieve the thread messages from OpenAI
        const messages = await openai.beta.threads.messages.list(
          patient.assistantThreadId,
          {
            limit: 20,
            order: "desc",
          },
        );

        const formattedMessages = messages.data.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content:
            msg.content[0] && msg.content[0].type === "text"
              ? msg.content[0].text.value
              : "No text content",
          created_at: msg.created_at,
        }));

        res.json(formattedMessages);
      } catch (openaiError: any) {
        console.error(
          "❌ Failed to retrieve thread messages from OpenAI:",
          openaiError,
        );
        res.status(500).json({
          message: "Failed to retrieve conversation history",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      console.error("❌ Error in thread messages retrieval:", error);
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
        subjectiveTemplate:
          "Patient presents with [chief complaint].\n\n[History of present illness including onset, duration, character, precipitating factors, alleviating factors, and associated symptoms]\n\n[Review of systems as relevant]",
        objectiveTemplate:
          "Vitals: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]\n\nPhysical Exam:\nGen: [general appearance]\nHEENT: [head, eyes, ears, nose, throat]\nCV: [cardiovascular]\nLungs: [pulmonary]\nAbd: [abdominal]\nExt: [extremities]\nSkin: [skin]\nNeuro: [neurological if relevant]\n\nLabs: [laboratory results if available]",
        assessmentTemplate:
          "1. [Primary diagnosis] - [clinical reasoning]\n2. [Secondary diagnosis] - [clinical reasoning]\n3. [Additional diagnoses as applicable]",
        planTemplate:
          "1. [Primary diagnosis management]\n   - [Medications with dosing]\n   - [Procedures/interventions]\n   - [Monitoring]\n\n2. [Secondary diagnosis management]\n   - [Specific treatments]\n\n3. Follow-up:\n   - [Timeline and instructions]\n   - [Patient education]\n   - [Return precautions]",
        formatPreferences: {
          useBulletPoints: true,
          boldDiagnoses: true,
          separateAssessmentPlan: true,
          vitalSignsFormat: "inline",
          physicalExamFormat: "structured",
          abbreviationStyle: "standard",
          sectionSpacing: 4,
        },
        enableAiLearning: true,
        learningConfidence: 0.75,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json([defaultTemplate]);
    } catch (error: any) {
      console.error("Error fetching user templates:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch templates", error: error.message });
    }
  });

  app.post("/api/user/soap-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userId = req.user.id;
      const templateData = req.body;

      console.log(
        `[UserTemplates] Saving template for user ${userId}:`,
        templateData.templateName,
      );

      // For now, return the template with an ID since database isn't fully set up
      const savedTemplate = {
        id: Date.now(),
        userId,
        ...templateData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`✅ [UserTemplates] Template saved successfully`);
      res.json(savedTemplate);
    } catch (error: any) {
      console.error("Error saving user template:", error);
      res
        .status(500)
        .json({ message: "Failed to save template", error: error.message });
    }
  });

  // Enhanced SOAP generation with user preferences
  app.post(
    "/api/patients/:id/encounters/:encounterId/generate-soap-personalized",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const userId = req.user.id;
        const { transcription, usePersonalization = true } = req.body;

        if (!transcription || !transcription.trim()) {
          return res.status(400).json({ message: "Transcription is required" });
        }

        console.log(
          `[PersonalizedSOAP] Generating for user ${userId}, patient ${patientId}, encounter ${encounterId}`,
        );

        // Always use direct SOAP generation with standardized formatting
        const soapNote = await generateSOAPNoteDirect(patientId, encounterId.toString(), transcription);
        
        res.json({
          soapNote,
          patientId,
          encounterId,
          personalized: false,
          generatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("❌ [PersonalizedSOAP] Error:", error);
        res.status(500).json({
          message: "Failed to generate personalized SOAP note",
          error: error.message,
        });
      }
    },
  );

  // Analyze user edits for learning
  app.post("/api/user/analyze-edit", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userId = req.user.id;
      const { originalText, editedText, sectionType, patientId, encounterId } =
        req.body;

      console.log(
        `[EditAnalysis] Analyzing edit for user ${userId} in ${sectionType} section`,
      );

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          message: "OpenAI API key required for edit analysis",
          requiresSetup: true,
        });
      }

      // Edit analysis functionality disabled - no phantom functions
      res.json({
        analysis: null,
        learned: false,
      });
    } catch (error: any) {
      console.error("❌ [EditAnalysis] Error:", error);
      res.status(500).json({
        message: "Failed to analyze edit",
        error: error.message,
      });
    }
  });

  // LEGACY: OptimizedSOAPService route removed - now handled by realtime-soap/stream endpoint

  // Real-time SOAP streaming endpoint
  app.post("/api/realtime-soap/stream", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { patientId, encounterId, transcription } = req.body;

      if (!patientId || !encounterId || !transcription) {
        return res.status(400).json({
          message:
            "Missing required fields: patientId, encounterId, transcription",
        });
      }

      console.log(
        `🩺 [RealtimeSOAP] Starting streaming SOAP generation for patient ${patientId}, encounter ${encounterId}`,
      );

      // Generate SOAP note directly using OpenAI API
      const soapNote = await generateSOAPNoteDirect(parseInt(patientId), encounterId, transcription);

      // Return the complete SOAP note as JSON
      res.json({
        soapNote,
        patientId: parseInt(patientId),
        encounterId,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ [RealtimeSOAP] Error in streaming endpoint:", error);
      res.status(500).json({
        message: "Failed to generate streaming SOAP note",
        error: error.message,
      });
    }
  });





  // CPT Codes and Diagnoses API endpoints for billing integration

  // Extract orders from SOAP note
  app.post(
    "/api/encounters/:encounterId/extract-orders-from-soap",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const encounterId = parseInt(req.params.encounterId);
        
        // Get the encounter and SOAP note
        const encounter = await storage.getEncounter(encounterId);
        if (!encounter) {
          return res.status(404).json({ message: "Encounter not found" });
        }

        if (!encounter.note || !encounter.note.trim()) {
          return res.status(400).json({ 
            message: "No SOAP note found for this encounter. Please save a SOAP note first." 
          });
        }

        console.log(`📋 [ExtractOrders] Starting order extraction for encounter ${encounterId}`);

        // Import and use the SOAPOrdersExtractor
        const { SOAPOrdersExtractor } = await import("./soap-orders-extractor.js");
        const extractor = new SOAPOrdersExtractor();

        // Extract orders from the SOAP note
        const extractedOrders = await extractor.extractOrders(
          encounter.note,
          encounter.patientId,
          encounterId
        );

        console.log(`📋 [ExtractOrders] Extracted ${extractedOrders.length} orders`);

        // Save the extracted orders
        const savedOrders = [];
        for (const orderData of extractedOrders) {
          try {
            const savedOrder = await storage.createOrder(orderData);
            savedOrders.push(savedOrder);
          } catch (error: any) {
            console.error("❌ [ExtractOrders] Failed to save order:", error);
            // Continue with other orders even if one fails
          }
        }

        console.log(`📋 [ExtractOrders] Successfully saved ${savedOrders.length} orders`);

        res.json({
          message: "Orders extracted and saved successfully",
          ordersCount: savedOrders.length,
          orders: savedOrders
        });

      } catch (error: any) {
        console.error("❌ [ExtractOrders] Error extracting orders from SOAP:", error);
        res.status(500).json({
          message: "Failed to extract orders from SOAP note",
          error: error.message,
        });
      }
    }
  );

  // Extract CPT codes from SOAP note
  app.post(
    "/api/patients/:id/encounters/:encounterId/extract-cpt",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const { soapNote } = req.body;

        if (!soapNote || !soapNote.trim()) {
          return res
            .status(400)
            .json({ message: "SOAP note content is required" });
        }

        console.log(
          `🏥 [CPT API] Extracting CPT codes for patient ${patientId}, encounter ${encounterId}`,
        );

        // Get patient context for proper new vs established patient coding
        const patientEncounters = await storage.getPatientEncounters(patientId);
        const diagnosisList = await storage.getPatientDiagnoses(patientId);

        const patientContext = {
          isNewPatient: patientEncounters.length <= 1,
          previousEncounterCount: patientEncounters.length,
          medicalHistory: diagnosisList.map((d) => d.diagnosis),
          currentProblems: diagnosisList
            .filter((d) => d.status === "active")
            .map((d) => d.diagnosis),
        };

        console.log(
          `🏥 [CPT API] Patient context: ${patientContext.isNewPatient ? "NEW" : "ESTABLISHED"} patient with ${patientContext.previousEncounterCount} encounters`,
        );
        console.log(
          `📄 [CPT API] SOAP note being sent to extractor (${soapNote.length} chars):`,
        );
        console.log(
          `📋 [CPT API] SOAP note content preview:`,
          soapNote.substring(0, 1000),
        );

        const { CPTExtractor } = await import("./cpt-extractor.js");
        const cptExtractor = new CPTExtractor();

        const extractedData = await cptExtractor.extractCPTCodesAndDiagnoses(
          soapNote,
          patientContext,
        );

        console.log(
          `📊 [CPT API] FINAL EXTRACTED DATA:`,
          JSON.stringify(extractedData, null, 2),
        );

        console.log(
          `✅ [CPT API] Extracted ${extractedData.cptCodes?.length || 0} CPT codes and ${extractedData.diagnoses?.length || 0} diagnoses`,
        );

        res.json(extractedData);
      } catch (error: any) {
        console.error("❌ [CPT API] Error extracting CPT codes:", error);
        res.status(500).json({
          message: "Failed to extract CPT codes",
          error: error.message,
        });
      }
    },
  );

  // Get encounter by ID (for frontend encounter view)
  app.get("/api/encounters/:encounterId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);
      const encounter = await storage.getEncounter(encounterId);

      if (!encounter) {
        return res.status(404).json({ message: "Encounter not found" });
      }

      res.json(encounter);
    } catch (error: any) {
      console.error("❌ [Encounter API] Error getting encounter:", error);
      res.status(500).json({
        message: "Failed to get encounter",
        error: error.message,
      });
    }
  });

  // Get SOAP note for an encounter
  app.get(
    "/api/patients/:id/encounters/:encounterId/soap-note",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const encounterId = parseInt(req.params.encounterId);
        const encounter = await storage.getEncounter(encounterId);

        if (!encounter) {
          return res.status(404).json({ message: "Encounter not found" });
        }

        // Return the complete SOAP note
        res.json({ soapNote: encounter.note || "" });
      } catch (error: any) {
        console.error("❌ [SOAP API] Error getting SOAP note:", error);
        res.status(500).json({
          message: "Failed to get SOAP note",
          error: error.message,
        });
      }
    },
  );

  // Generate SOAP note from transcription
  app.post(
    "/api/patients/:id/encounters/:encounterId/generate-soap-from-transcription",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const { transcription } = req.body;

        if (!transcription || !transcription.trim()) {
          return res.status(400).json({ 
            message: "Transcription is required to generate SOAP note" 
          });
        }

        console.log(`🔄 [GenerateSOAP] Generating SOAP note from transcription for encounter ${encounterId}`);

        // Generate SOAP note using direct API call
        const soapNote = await generateSOAPNoteDirect(patientId, encounterId.toString(), transcription);

        if (!soapNote.trim()) {
          throw new Error("Failed to generate SOAP note content");
        }

        console.log(`✅ [GenerateSOAP] SOAP note generated and saved for encounter ${encounterId}`);

        res.json({
          soapNote,
          message: "SOAP note generated successfully from transcription",
          encounterId,
          patientId
        });

      } catch (error: any) {
        console.error("❌ [GenerateSOAP] Error generating SOAP from transcription:", error);
        res.status(500).json({
          message: "Failed to generate SOAP note from transcription",
          error: error.message,
        });
      }
    }
  );

  // Save manually edited SOAP note (with physical exam learning analysis)
  app.put(
    "/api/patients/:id/encounters/:encounterId/soap-note",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const { soapNote } = req.body;

        if (!soapNote || !soapNote.trim()) {
          return res
            .status(400)
            .json({ message: "SOAP note content is required" });
        }

        console.log(
          `📝 [SOAP Update] Saving manually edited SOAP note for encounter ${encounterId}`,
        );

        // Save the complete SOAP note to encounter
        await storage.updateEncounter(encounterId, {
          note: soapNote,
        });

        // Analyze manually edited SOAP note for persistent physical findings
        try {
          console.log(
            `🧠 [PhysicalExamLearning] Analyzing manually edited SOAP note for persistent findings...`,
          );
          const { PhysicalExamLearningService } = await import(
            "./physical-exam-learning-service.js"
          );
          const learningService = new PhysicalExamLearningService();

          await learningService.analyzeSOAPNoteForPersistentFindings(
            patientId,
            encounterId,
            soapNote,
          );
          console.log(
            `✅ [PhysicalExamLearning] Analysis completed for manually edited encounter ${encounterId}`,
          );
        } catch (learningError: any) {
          console.error(
            "❌ [PhysicalExamLearning] Error analyzing manually edited SOAP note:",
            learningError,
          );
          // Don't fail SOAP save if learning analysis fails
        }

        console.log(
          `✅ [SOAP Update] Manually edited SOAP note saved for encounter ${encounterId}`,
        );

        res.json({
          message: "SOAP note saved successfully",
          encounterId,
          patientId,
          savedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("❌ [SOAP Update] Error saving SOAP note:", error);
        res.status(500).json({
          message: "Failed to save SOAP note",
          error: error.message,
        });
      }
    },
  );

  // Save/Update CPT codes and diagnoses for an encounter
  app.put(
    "/api/patients/:id/encounters/:encounterId/cpt-codes",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const { cptCodes, diagnoses, mappings } = req.body;

        console.log(
          `🏥 [CPT API] Saving CPT codes for encounter ${encounterId}`,
        );

        // Update encounter with CPT codes and diagnoses
        await storage.updateEncounter(encounterId, {
          cptCodes: cptCodes || [],
          draftDiagnoses: diagnoses || [],
        });

        // Update diagnoses in diagnoses table for billing system integration
        if (diagnoses && diagnoses.length > 0) {
          // First, remove existing diagnoses for this encounter
          const existingDiagnoses =
            await storage.getPatientDiagnoses(patientId);
          const encounterDiagnoses = existingDiagnoses.filter(
            (d) => d.encounterId === encounterId,
          );

          // Create new diagnosis records
          for (const diagnosis of diagnoses) {
            try {
              await storage.createDiagnosis({
                patientId,
                encounterId,
                diagnosis: diagnosis.diagnosis,
                icd10Code: diagnosis.icd10Code,
                diagnosisDate: new Date().toISOString().split("T")[0],
                status: diagnosis.isPrimary ? "active" : "active",
                notes: `Updated via CPT codes interface on ${new Date().toISOString()}`,
              });
            } catch (diagnosisError) {
              console.error(
                `❌ [CPT API] Error creating diagnosis:`,
                diagnosisError,
              );
            }
          }
        }

        console.log(
          `✅ [CPT API] Saved ${cptCodes?.length || 0} CPT codes and ${diagnoses?.length || 0} diagnoses`,
        );

        res.json({
          message: "CPT codes and diagnoses saved successfully",
          cptCodesCount: cptCodes?.length || 0,
          diagnosesCount: diagnoses?.length || 0,
        });
      } catch (error: any) {
        console.error("❌ [CPT API] Error saving CPT codes:", error);
        res.status(500).json({
          message: "Failed to save CPT codes",
          error: error.message,
        });
      }
    },
  );

  // Get billing summary for encounter (for EMR billing integration)
  app.get(
    "/api/patients/:id/encounters/:encounterId/billing-summary",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);

        const encounter = await storage.getEncounter(encounterId);
        const patient = await storage.getPatient(patientId);
        const diagnoses = await storage.getPatientDiagnoses(patientId);

        if (!encounter || !patient) {
          return res
            .status(404)
            .json({ message: "Encounter or patient not found" });
        }

        const encounterDiagnoses = diagnoses.filter(
          (d) => d.encounterId === encounterId,
        );

        // Format for billing system integration
        const billingSummary = {
          patient: {
            mrn: patient.mrn,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
          },
          encounter: {
            id: encounter.id,
            encounterType: encounter.encounterType,
            startTime: encounter.startTime,
            endTime: encounter.endTime,
            providerId: encounter.providerId,
          },
          billing: {
            cptCodes: encounter.cptCodes || [],
            diagnoses: encounterDiagnoses.map((d) => ({
              diagnosis: d.diagnosis,
              icd10Code: d.icd10Code,
              isPrimary: d.status === "active",
              diagnosisDate: d.diagnosisDate,
            })),
            serviceDate: encounter.startTime,
            facilityCode: encounter.location || "CLINIC_001",
          },
        };

        res.json(billingSummary);
      } catch (error: any) {
        console.error("❌ [Billing API] Error getting billing summary:", error);
        res.status(500).json({
          message: "Failed to get billing summary",
          error: error.message,
        });
      }
    },
  );

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

      // Import standardization service dynamically
      const { OrderStandardizationService } = await import(
        "./order-standardization-service.js"
      );
      const { GPTClinicalEnhancer } = await import(
        "./gpt-clinical-enhancer.js"
      );

      const orderData = req.body;
      console.log("[Orders API] Raw order data received:", orderData);

      // Apply standardization to ensure all required fields are present
      let standardizedOrder =
        OrderStandardizationService.standardizeOrder(orderData);
      console.log("[Orders API] Standardized order data:", standardizedOrder);

      // Use GPT to enhance medication orders with missing clinical data
      if (standardizedOrder.orderType === "medication") {
        // Import patient chart service to get clinical context
        const { PatientChartService } = await import(
          "./patient-chart-service.js"
        );

        // Fetch patient's medical history and current conditions
        const patientChartData = await PatientChartService.getPatientChartData(
          standardizedOrder.patientId,
        );

        // Enhance order using GPT with full clinical context
        const enhancer = new GPTClinicalEnhancer();
        standardizedOrder = await enhancer.enhanceMedicationOrder(
          standardizedOrder,
          patientChartData,
        );
        console.log("[Orders API] GPT-enhanced order data:", standardizedOrder);
      }

      // Validate the enhanced order
      const validationErrors =
        OrderStandardizationService.validateOrderForIntegration(
          standardizedOrder,
        );
      if (validationErrors.length > 0) {
        console.warn(
          "[Orders API] Order validation warnings:",
          validationErrors,
        );
        // Log warnings but continue - some fields may be populated later
      }

      const order = await storage.createOrder(standardizedOrder);
      console.log("[Orders API] Created enhanced order:", order);
      
      // Trigger medication processing for medication orders
      if (order.orderType === "medication" && order.encounterId) {
        console.log(`💊 [Orders API] Triggering medication processing for new medication order ${order.id}`);
        try {
          const { medicationDelta } = await import("./medication-delta-service.js");
          await medicationDelta.processOrderDelta(
            order.patientId,
            order.encounterId,
            req.user!.id
          );
          console.log(`✅ [Orders API] Medication processing completed for order ${order.id}`);
        } catch (medicationError) {
          console.error(`❌ [Orders API] Medication processing failed for order ${order.id}:`, medicationError);
          // Don't fail the order creation if medication processing fails
        }
      }
      
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
        orders.map((orderData) => storage.createOrder(orderData)),
      );

      // Process medication orders if any were created
      const medicationOrders = createdOrders.filter(order => order.orderType === 'medication');
      if (medicationOrders.length > 0) {
        console.log(`💊 [Orders API] Processing ${medicationOrders.length} medication orders from batch`);
        
        // Group by encounter to trigger processing once per encounter
        const encounterGroups = medicationOrders.reduce((groups, order) => {
          if (order.encounterId) {
            if (!groups[order.encounterId]) {
              groups[order.encounterId] = { patientId: order.patientId, orders: [] };
            }
            groups[order.encounterId].orders.push(order);
          }
          return groups;
        }, {} as Record<number, { patientId: number, orders: any[] }>);

        // Process each encounter's medications
        for (const [encounterId, { patientId, orders: encounterOrders }] of Object.entries(encounterGroups)) {
          try {
            console.log(`💊 [Orders API] Processing ${encounterOrders.length} medication orders for encounter ${encounterId}`);
            const { medicationDelta } = await import("./medication-delta-service.js");
            await medicationDelta.processOrderDelta(
              patientId,
              parseInt(encounterId),
              req.user!.id
            );
            console.log(`✅ [Orders API] Medication processing completed for encounter ${encounterId}`);
          } catch (medicationError) {
            console.error(`❌ [Orders API] Medication processing failed for encounter ${encounterId}:`, medicationError);
            // Don't fail the batch operation if medication processing fails
          }
        }
      }

      res.status(201).json(createdOrders);
    } catch (error: any) {
      console.error("[Orders API] Error creating batch orders:", error);
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
  app.delete("/api/patients/:patientId/draft-orders", APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    console.log(`[Orders API] Deleting all draft orders for patient ${patientId}`);

    await storage.deleteAllPatientDraftOrders(patientId);
    
    console.log(`[Orders API] Successfully deleted all draft orders for patient ${patientId}`);

    return APIResponseHandler.success(res, { 
      message: "All draft orders deleted successfully",
      patientId 
    });
  }));

  // Create a new order
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const orderData = req.body;
      console.log(
        `[Orders API] Creating new order with data:`,
        JSON.stringify(orderData, null, 2),
      );

      const orderWithUser = {
        ...orderData,
        orderedBy: (req.user as any).id,
      };

      console.log(
        `[Orders API] Final order data for database:`,
        JSON.stringify(orderWithUser, null, 2),
      );

      const order = await storage.createOrder(orderWithUser);
      console.log(
        `[Orders API] Successfully created order with ID: ${order.id}`,
      );

      res.status(201).json(order);
    } catch (error: any) {
      console.error("[Orders API] Error creating order:", error);
      console.error("[Orders API] Error stack:", error.stack);
      console.error(
        "[Orders API] Order data that caused error:",
        JSON.stringify(req.body, null, 2),
      );
      res.status(500).json({ message: error.message });
    }
  });

  // Update an order
  app.put("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const orderId = parseInt(req.params.id);
      const updates = req.body;

      console.log(
        `[Orders API] Updating order ${orderId} with data:`,
        JSON.stringify(updates, null, 2),
      );

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
      if (
        cleanedUpdates.quantity &&
        typeof cleanedUpdates.quantity === "string"
      ) {
        cleanedUpdates.quantity = parseInt(cleanedUpdates.quantity, 10);
      }
      if (
        cleanedUpdates.refills &&
        typeof cleanedUpdates.refills === "string"
      ) {
        cleanedUpdates.refills = parseInt(cleanedUpdates.refills, 10);
      }
      if (
        cleanedUpdates.daysSupply &&
        typeof cleanedUpdates.daysSupply === "string"
      ) {
        cleanedUpdates.daysSupply = parseInt(cleanedUpdates.daysSupply, 10);
      }

      // Convert boolean strings to proper booleans
      if (
        cleanedUpdates.requiresPriorAuth &&
        typeof cleanedUpdates.requiresPriorAuth === "string"
      ) {
        cleanedUpdates.requiresPriorAuth =
          cleanedUpdates.requiresPriorAuth === "true";
      }
      if (
        cleanedUpdates.fastingRequired &&
        typeof cleanedUpdates.fastingRequired === "string"
      ) {
        cleanedUpdates.fastingRequired =
          cleanedUpdates.fastingRequired === "true";
      }
      if (
        cleanedUpdates.contrastNeeded &&
        typeof cleanedUpdates.contrastNeeded === "string"
      ) {
        cleanedUpdates.contrastNeeded =
          cleanedUpdates.contrastNeeded === "true";
      }

      console.log(
        `[Orders API] Cleaned update data:`,
        JSON.stringify(cleanedUpdates, null, 2),
      );

      const order = await storage.updateOrder(orderId, cleanedUpdates);
      console.log(`[Orders API] Successfully updated order ${orderId}`);
      
      // If this is a medication order, trigger medication synchronization
      if (order.orderType === 'medication') {
        console.log(`💊 [Orders API] Triggering medication synchronization for updated medication order ${orderId}`);
        try {
          const { medicationDelta } = await import("./medication-delta-service.js");
          await medicationDelta.syncMedicationWithOrder(orderId);
          console.log(`✅ [Orders API] Medication synchronization completed for updated order ${orderId}`);
        } catch (medicationError) {
          console.error(`❌ [Orders API] Medication synchronization failed for updated order ${orderId}:`, medicationError);
          // Continue with response even if sync fails
        }
      }
      
      res.json(order);
    } catch (error: any) {
      console.error("[Orders API] Error updating order:", error);
      console.error("[Orders API] Error stack:", error.stack);
      console.error(
        "[Orders API] Update data that caused error:",
        JSON.stringify(req.body, null, 2),
      );
      res.status(500).json({ message: error.message });
    }
  });

  // Delete an order
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const orderId = parseInt(req.params.id);
      console.log(`[Orders API] Deleting order ${orderId} with cascading deletion`);
      
      // Use storage method that handles cascading deletion
      await storage.deleteOrderWithCascade(orderId);
      console.log(`[Orders API] Successfully deleted order ${orderId} with cascade`);
      
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
      console.log(
        `[AI Parser] Suggested order type: ${orderType || "auto-detect"}`,
      );

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Enhanced prompt to parse mixed order types
      const prompt = `Parse all medical orders from this text and categorize them automatically: "${text}"

Return a JSON object with arrays for each order type found:
{
  "medications": [
    {
      "medication_name": "PROPER CASE medication name (e.g., Aspirin, Lisinopril, Hydrochlorothiazide)",
      "dosage": "strength only (e.g., 10 mg, 25 mg, 81 mg)", 
      "sig": "standardized patient instructions using tablet/capsule count, NOT strength amount",
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

CRITICAL MEDICATION RULES:
- ALWAYS use proper case medication names (Aspirin, Lisinopril, Hydrochlorothiazide, NOT aspirin, lisinopril, hctz)
- ALWAYS generate sig instructions based on dosage form count, NOT strength amount
- Examples of CORRECT sig instructions:
  * "Take 1 tablet by mouth once daily" (NOT "Take 81 mg by mouth once daily")
  * "Take 2 capsules by mouth twice daily" (NOT "Take 40 mg by mouth twice daily")
  * "Apply 1 patch topically once daily" (NOT "Apply 25 mg topically once daily")
- Always expand common abbreviations to full generic names:
  * HCTZ → Hydrochlorothiazide
  * ASA → Aspirin
  * APAP → Acetaminophen

Instructions:
- Extract ALL orders mentioned, even if there are multiple of the same type
- For medications: 
  * Include generic and brand names, dosages, frequencies, quantities
  * Default to 90-day TOTAL supply (including refills) unless duration is specified
  * For once daily: 30 tablets with 2 refills (30+30+30=90 day supply)
  * For twice daily: 60 tablets with 2 refills (60+60+60=180 tablets for 90 days)
  * For three times daily: 90 tablets with 2 refills (90+90+90=270 tablets for 90 days)
  * If specific duration mentioned (e.g., "for 5 days", "7 day course"), calculate exact quantity with 0 refills
  * If user specifies exact quantity/refills, use those values instead of defaults
- For labs: Recognize common abbreviations (CMP = Comprehensive Metabolic Panel, CBC = Complete Blood Count, etc.)
- For imaging: Recognize abbreviations (CXR = Chest X-ray, CT = Computed Tomography, etc.)
- For referrals: Extract specialty consultations mentioned
- Set appropriate defaults for missing information
- Only include arrays for order types that are actually found in the text
- Return only valid JSON without markdown formatting`;

      console.log(
        `[AI Parser] Sending request to OpenAI for multi-type parsing`,
      );

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are a medical AI that parses natural language into structured medical orders. Always return valid JSON with arrays for each order type found.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response from GPT");
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith("```json")) {
        cleanedContent = content
          .replace(/```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (content.startsWith("```")) {
        cleanedContent = content.replace(/```\s*/, "").replace(/\s*```$/, "");
      }

      const parsedData = JSON.parse(cleanedContent);
      console.log(
        `[AI Parser] Successfully parsed mixed orders:`,
        JSON.stringify(parsedData, null, 2),
      );

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
        return res
          .status(400)
          .json({ message: "Text and orderType are required" });
      }

      console.log(
        `[AI Parser] Parsing ${orderType} order from text: "${text}"`,
      );

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
- quantity: Number of units to dispense (default to 90-day TOTAL supply: once daily=30 tablets, twice daily=60 tablets, etc.)
- refills: Number of refills (default 2 for maintenance medications, 0 for short courses)
- form: Medication form (tablet, capsule, liquid, etc. - default "tablet")
- route_of_administration: How to take (oral, topical, injection, etc. - default "oral")
- days_supply: Days supply (30 for initial fill, 90 total with refills for maintenance)

Special rules:
- If specific duration mentioned (e.g., "for 5 days", "7 day course"), calculate exact quantity with 0 refills
- If user specifies exact quantity/refills, use those values instead of defaults
- For maintenance medications: 30-day initial quantity with 2 refills (total 90-day supply)
- For twice daily: 60-day initial quantity with 2 refills
- For three times daily: 90-day initial quantity with 2 refills

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
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `You are a medical AI that parses natural language orders into structured data. Always return valid JSON matching this schema: ${responseSchema}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response from GPT");
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith("```json")) {
        cleanedContent = content
          .replace(/```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (content.startsWith("```")) {
        cleanedContent = content.replace(/```\s*/, "").replace(/\s*```$/, "");
      }

      const parsedData = JSON.parse(cleanedContent);
      console.log(
        `[AI Parser] Successfully parsed ${orderType} order:`,
        parsedData,
      );

      res.json(parsedData);
    } catch (error: any) {
      console.error("[AI Parser] Error parsing order text:", error);
      res.status(500).json({ message: "Failed to parse order text" });
    }
  });

  // Update encounter status
  app.put("/api/encounters/:encounterId/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Validate status values
      const validStatuses = ['in_progress', 'pending_review', 'completed', 'signed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Update encounter status
      const updatedEncounter = await storage.updateEncounter(encounterId, {
        encounterStatus: status,
        updatedAt: new Date()
      });

      console.log(`✅ [Encounter Status] Updated encounter ${encounterId} to status: ${status}`);

      res.json({
        success: true,
        encounter: updatedEncounter,
        message: `Encounter status updated to ${status}`
      });

    } catch (error: any) {
      console.error("❌ [Encounter Status] Error updating status:", error);
      res.status(500).json({ error: "Failed to update encounter status" });
    }
  });

  // Sign individual order
  app.post("/api/orders/:orderId/sign", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const orderId = parseInt(req.params.orderId);
      const userId = (req.user as any).id;
      const { signatureNote } = req.body;

      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order status and add approval
      const updatedOrder = await storage.updateOrder(orderId, {
        orderStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        providerNotes: signatureNote ? `${order.providerNotes || ''}\n\nSignature Note: ${signatureNote}` : order.providerNotes
      });

      console.log(`✅ [Order Signing] Signed ${order.orderType} order ${orderId} by user ${userId}`);

      // For medication orders, activate pending medications
      if (order.orderType === 'medication') {
        console.log(`📋 [IndividualSign] === INDIVIDUAL MEDICATION ORDER SIGNING ===`);
        console.log(`📋 [IndividualSign] Order ID: ${orderId}, Type: ${order.orderType}`);
        console.log(`📋 [IndividualSign] Medication: ${order.medicationName}, Dosage: ${order.dosage}`);
        console.log(`📋 [IndividualSign] Encounter ID: ${order.encounterId}, Patient ID: ${order.patientId}`);
        console.log(`📋 [IndividualSign] User ID: ${userId}`);
        
        try {
          const { medicationDelta } = await import("./medication-delta-service.js");
          
          console.log(`📋 [IndividualSign] Calling signMedicationOrders with:`);
          console.log(`📋 [IndividualSign] - Encounter: ${order.encounterId || 0}`);
          console.log(`📋 [IndividualSign] - Order IDs: [${orderId}]`);
          console.log(`📋 [IndividualSign] - Provider: ${userId}`);
          
          await medicationDelta.signMedicationOrders(order.encounterId || 0, [orderId], userId);
          console.log(`✅ [IndividualSign] Successfully activated medication: ${order.medicationName}`);
        } catch (medicationError) {
          console.error(`❌ [IndividualSign] Failed to activate medication for order ${orderId}:`, medicationError);
          console.error(`❌ [IndividualSign] Medication error stack:`, (medicationError as Error).stack);
          // Continue with response even if activation fails
        }
        console.log(`📋 [IndividualSign] === END INDIVIDUAL MEDICATION SIGNING ===`);
      }

      // For lab orders, send to laboratory
      if (order.orderType === 'lab') {
        // Here you would send to lab interface (HL7, etc.)
        console.log(`🧪 [Lab] Signed lab order: ${order.testName}`);
      }

      res.json({
        success: true,
        order: updatedOrder,
        message: `${order.orderType} order signed successfully`
      });

    } catch (error: any) {
      console.error("❌ [Order Signing] Error signing order:", error);
      res.status(500).json({ error: "Failed to sign order" });
    }
  });

  // Bulk sign orders
  app.post("/api/orders/bulk-sign", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { orderIds, signatureNote } = req.body;
      const userId = (req.user as any).id;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: "Order IDs array is required" });
      }

      const signedOrders = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const order = await storage.getOrder(orderId);
          if (!order) {
            errors.push(`Order ${orderId} not found`);
            continue;
          }

          const updatedOrder = await storage.updateOrder(orderId, {
            orderStatus: 'approved',
            approvedBy: userId,
            approvedAt: new Date(),
            providerNotes: signatureNote ? `${order.providerNotes || ''}\n\nBulk Signature Note: ${signatureNote}` : order.providerNotes
          });

          signedOrders.push(updatedOrder);
          console.log(`✅ [Bulk Sign] Signed ${order.orderType} order ${orderId}`);

        } catch (error: any) {
          errors.push(`Failed to sign order ${orderId}: ${error.message}`);
        }
      }

      // Activate any medication orders that were signed
      const medicationOrderIds = signedOrders
        .filter(order => order.orderType === 'medication')
        .map(order => order.id);

      if (medicationOrderIds.length > 0) {
        try {
          const { medicationDelta } = await import("./medication-delta-service.js");
          const encounterId = signedOrders[0]?.encounterId;
          if (encounterId) {
            await medicationDelta.signMedicationOrders(encounterId, medicationOrderIds, userId);
            console.log(`📋 [Bulk Sign] Activated ${medicationOrderIds.length} medication orders`);
          }
        } catch (medicationError) {
          console.error(`❌ [Bulk Sign] Failed to activate medications:`, medicationError);
          // Continue with response even if activation fails
        }
      }

      res.json({
        success: true,
        signedOrders,
        errors,
        message: `Signed ${signedOrders.length} orders${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      });

    } catch (error: any) {
      console.error("❌ [Bulk Sign] Error bulk signing orders:", error);
      res.status(500).json({ error: "Failed to bulk sign orders" });
    }
  });

  // Test medication activation (debug route)
  app.post("/api/debug/activate-medication", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { encounterId, orderIds, providerId } = req.body;
      console.log(`🧪 [Debug] Manual medication activation test`);
      console.log(`🧪 [Debug] Encounter: ${encounterId}, Orders: [${orderIds.join(', ')}], Provider: ${providerId}`);
      
      const { medicationDelta } = await import("./medication-delta-service.js");
      await medicationDelta.signMedicationOrders(encounterId, orderIds, providerId);
      
      res.json({ success: true, message: "Medication activation test completed" });
    } catch (error: any) {
      console.error("🧪 [Debug] Test activation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get unsigned orders for encounter
  app.get("/api/encounters/:encounterId/unsigned-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);

      // Get encounter to find patient ID
      const encounter = await storage.getEncounter(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: "Encounter not found" });
      }

      // Get all draft orders for this patient
      const draftOrders = await storage.getPatientDraftOrders(encounter.patientId);

      res.json(draftOrders);

    } catch (error: any) {
      console.error("❌ [Unsigned Orders] Error fetching unsigned orders:", error);
      res.status(500).json({ error: "Failed to fetch unsigned orders" });
    }
  });

  // Register patient parser routes
  app.use("/api", parseRoutes);

  const httpServer = createServer(app);

  // Legacy real-time transcription service removed - AI suggestions now use direct client WebSocket connection

  // Enhanced Real-time service removed - AI suggestions now use direct client WebSocket connection

  return httpServer;
}
