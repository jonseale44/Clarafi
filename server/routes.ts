/**
 * Main Express Routes Configuration
 * 
 * This is the central routing file that configures all API endpoints for the EMR system.
 * 
 * Key sections:
 * - Authentication & Session Management
 * - Patient Management APIs
 * - Clinical Documentation (SOAP notes, encounters)
 * - Order Management (labs, medications, imaging)
 * - Document Processing & AI Analysis
 * - E-Prescribing & Pharmacy Integration
 * - Scheduling & Appointments
 * - Admin & Billing Management
 * 
 * For specific functionality, search for the relevant section below.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { tenantIsolation } from "./tenant-isolation";
import { APIResponseHandler } from "./api-response-handler.js";
import patientOrderPreferencesRoutes from "./patient-order-preferences-routes.js";
import {
  insertPatientSchema,
  insertEncounterSchema,
  insertOrderSchema,
} from "@shared/schema";
// Legacy import removed - using enhanced realtime service only
import { parseRoutes } from "./parse-routes";
import dashboardRoutes from "./dashboard-routes";
// Removed orphaned enhanced-medical-problems-routes - functionality moved to unified API
import unifiedMedicalProblemsRoutes from "./unified-medical-problems-api";
import unifiedSurgicalHistoryRoutes from "./unified-surgical-history-api";
import { unifiedFamilyHistoryRoutes } from "./unified-family-history-api";
import { socialHistoryRoutes } from "./unified-social-history-api";
import * as unifiedAllergyAPI from "./unified-allergy-api";
import enhancedMedicationRoutes from "./enhanced-medication-routes";
import medicationStandardizationRoutes from "./medication-standardization-routes";
import unifiedMedicationIntelligenceRoutes from "./unified-medication-intelligence-routes";
// import medicationFormularyRoutes from "./medication-formulary-routes";
import validationRoutes from "./validation-routes";
import intelligentDiagnosisRoutes from "./intelligent-diagnosis-routes";
import vitalsFlowsheetRoutes from "./vitals-flowsheet-routes";
import setupTemplateRoutes from "./template-routes";
import { imagingRoutes } from "./imaging-api";
import { setupUnifiedImagingRoutes } from "./unified-imaging-api";
import { createRxNormRoutes } from "./rxnorm-routes";
import { registerAdminUserRoutes } from "./admin-user-routes";
import { registerAdminVerificationRoutes } from "./admin-verification-routes";
import adminStatsRoutes from "./admin-stats-routes";
import { setupRealtimeProxy } from "./realtime-proxy";
import migrationRoutes from "./migration-routes";
import { adminClinicImportRoutes } from "./admin-clinic-import-routes";
import healthcareDataRoutes from "./healthcare-data-routes.js";
import { healthcareUpdateSettingsRoutes } from "./healthcare-update-settings-routes.js";
import schedulingRoutes from "./scheduling-routes";
import { testPatientRoutes } from "./test-patient-routes";
import acquisitionRoutes from "./acquisition-routes";

import patientAttachmentsRoutes from "./patient-attachments-routes";

import nursingSummaryRoutes from "./nursing-summary-routes";
import labRoutes from "./lab-routes";
import labEntryRoutes from "./lab-entry-routes";
import labWorkflowRoutes from "./lab-workflow-routes";
import labCommunicationRoutes from "./lab-communication-routes";
import labReviewRoutes from "./lab-review-routes";
import gptLabReviewRoutes from "./gpt-lab-review-routes";
import labSimulatorRoutes from "./lab-simulator-routes";
import labStatusDashboardRoutes from "./lab-status-dashboard-routes";
import { externalLabMockRouter } from "./external-lab-mock-service";
import subscriptionKeyRoutes from "./subscription-key-routes";
import blogRoutes from "./blog-routes";
import multer from "multer";
import OpenAI from "openai";
// Legacy SOAPOrdersExtractor import removed - now handled by frontend parallel processing
import { db } from "./db.js";
import {
  patients,
  diagnoses,
  medications,
  allergies,
  vitals,
  encounters as encountersTable,
  labOrders,
  labResults,
  patientOrderPreferences,
} from "../shared/schema.js";

import { eq, desc, and, ne, sql } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { PatientChartService } from "./patient-chart-service.js";

// OLD ClinicalNoteTemplates class REMOVED - All note types now consolidated in EnhancedNoteGenerationService
// This provides full patient context (demographics, medical problems, medications, allergies, vitals)
// for ALL note types instead of empty context that was causing poor AI generation quality

// DEPRECATED CLASS REMOVED - All note types now use EnhancedNoteGenerationService with full patient context

// Clinical Note Generator - Unified generation function
async function generateClinicalNote(
  noteType: string,
  patientId: number,
  encounterId: string,
  transcription: string,
): Promise<string> {
  console.log(
    `🩺 [ClinicalNote] Generating ${noteType} note for patient ${patientId}`,
  );

  // Use patient chart service for consistent data access
  const { PatientChartService } = await import("./patient-chart-service.js");
  const patientChart = await PatientChartService.getPatientChartData(patientId);

  // Get encounter information to get the encounter date
  const encounter = await db
    .select()
    .from(encountersTable)
    .where(eq(encountersTable.id, parseInt(encounterId)))
    .limit(1);

  const encounterDate = encounter[0]?.createdAt ? new Date(encounter[0].createdAt) : new Date();

  // Get encounter-specific vitals
  const encounterVitalsList = await db
    .select()
    .from(vitals)
    .where(
      and(
        eq(vitals.patientId, patientId),
        eq(vitals.encounterId, parseInt(encounterId)),
      ),
    )
    .orderBy(desc(vitals.recordedAt));

  if (!patientChart.demographics) {
    throw new Error(`Patient ${patientId} chart data not found`);
  }

  const age = Math.floor(
    (Date.now() - new Date(patientChart.demographics.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  // Build medical context (reuse existing logic)
  const currentMedicalProblems =
    patientChart.medicalProblems?.length > 0
      ? patientChart.medicalProblems
          .map((p: any) => `- ${p.problemTitle} (${p.problemStatus})`)
          .join("\n")
      : "- No active medical problems documented";

  const currentMedications =
    patientChart.currentMedications?.length > 0
      ? patientChart.currentMedications
          .map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`)
          .join("\n")
      : "- No current medications documented";

  const knownAllergies =
    patientChart.allergies?.length > 0
      ? patientChart.allergies
          .map((a: any) => `- ${a.allergen}: ${a.reaction}`)
          .join("\n")
      : "- NKDA (No Known Drug Allergies)";

  const medicalContext = `
PATIENT CONTEXT:
- Name: ${patientChart.demographics.firstName} ${patientChart.demographics.lastName}
- Age: ${age} years old
- Gender: ${patientChart.demographics.gender}
- MRN: ${patientChart.demographics.mrn}

ACTIVE MEDICAL PROBLEMS:
${currentMedicalProblems}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${formatVitalsForSOAP(encounterVitalsList, encounterDate)}
  `.trim();

  // Use EnhancedNoteGenerationService for all note types with full patient context
  const { EnhancedNoteGenerationService } = await import(
    "./enhanced-note-generation-service.js"
  );

  const generatedNote = await EnhancedNoteGenerationService.generateNote(
    noteType,
    patientId,
    encounterId,
    transcription,
  );

  // Save note to encounter (same as before)
  await storage.updateEncounter(parseInt(encounterId), {
    note: generatedNote,
  });

  // TEMPORARILY DISABLED - Physical Exam Learning Service (high GPT-4.1 usage)
  // This service was causing high GPT-4.1 token consumption during encounter recording sessions
  // To re-enable, uncomment the block below
  /*
  try {
    const { PhysicalExamLearningService } = await import(
      "./physical-exam-learning-service.js"
    );
    const physicalExamLearningService = new PhysicalExamLearningService();

    physicalExamLearningService
      .analyzeSOAPNoteForPersistentFindings(
        patientId,
        parseInt(encounterId),
        generatedNote,
      )
      .catch((error) => {
        console.warn("Physical exam learning service failed:", error);
      });
  } catch (error) {
    console.warn("Failed to load physical exam learning service:", error);
  }
  */

  return generatedNote;
}

// Legacy SOAP generation function - now redirects to unified system
async function generateSOAPNoteDirect(
  patientId: number,
  encounterId: string,
  transcription: string,
): Promise<string> {
  return generateClinicalNote("soap", patientId, encounterId, transcription);
}

// Nursing Template Generation function matching SOAP pattern
async function generateNursingTemplateDirect(
  patientId: number,
  encounterId: string,
  transcription: string,
  currentTemplateData: any = {},
): Promise<any> {
  console.log(
    `🏥 [NursingTemplate] Generating template for patient ${patientId}`,
  );

  // Use patient chart service to avoid diagnoses/medical problems confusion
  const { PatientChartService } = await import("./patient-chart-service.js");
  const patientChart = await PatientChartService.getPatientChartData(patientId);

  // Get encounter information to get the encounter date
  const encounter = await db
    .select()
    .from(encountersTable)
    .where(eq(encountersTable.id, parseInt(encounterId)))
    .limit(1);

  const encounterDate = encounter[0]?.createdAt ? new Date(encounter[0].createdAt) : new Date();

  // Get encounter-specific vitals
  const encounterVitalsList = await db
    .select()
    .from(vitals)
    .where(eq(vitals.encounterId, parseInt(encounterId)))
    .orderBy(desc(vitals.recordedAt));

  if (!patientChart.demographics) {
    throw new Error(`Patient ${patientId} chart data not found`);
  }

  // Use medical problems instead of billing diagnoses for nursing template
  const currentMedicalProblems =
    patientChart.medicalProblems?.length > 0
      ? patientChart.medicalProblems
          .map((p: any) => `- ${p.problemTitle} (${p.problemStatus})`)
          .join("\n")
      : "- No active medical problems documented";

  const currentMedications =
    patientChart.currentMedications?.length > 0
      ? patientChart.currentMedications
          .map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`)
          .join("\n")
      : "- No current medications documented";

  const knownAllergies =
    patientChart.allergies?.length > 0
      ? patientChart.allergies
          .map((a: any) => `- ${a.allergen}: ${a.reaction}`)
          .join("\n")
      : "- NKDA (No Known Drug Allergies)";

  // Build comprehensive medical context using chart data
  const medicalContext = `
PATIENT CONTEXT:
- Age: ${patientChart.demographics.age} years old
- Gender: ${patientChart.demographics.gender}

ACTIVE MEDICAL PROBLEMS:
${currentMedicalProblems}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${formatVitalsForSOAP(encounterVitalsList, encounterDate)}

FAMILY HISTORY:
${
  patientChart.familyHistory?.length > 0
    ? patientChart.familyHistory
        .map((fh: any) => `- ${fh.relationship}: ${fh.condition}`)
        .join("\n")
    : "- No family history documented"
}

SOCIAL HISTORY:
${
  patientChart.socialHistory?.length > 0
    ? patientChart.socialHistory
        .map((sh: any) => `- ${sh.category}: ${sh.details}`)
        .join("\n")
    : "- No social history documented"
}
  `.trim();

  // Create nursing template prompt with current state for intelligent merging
  const nursingPrompt = `You are an expert registered nurse with 15+ years of clinical experience extracting structured information from patient conversations. Your documentation must meet professional nursing standards and use proper medical abbreviations and formatting.

${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

CURRENT TEMPLATE STATE:
${JSON.stringify(currentTemplateData, null, 2)}

CRITICAL DOCUMENTATION STANDARDS:
1. Use standard medical abbreviations consistently
2. Format medical histories with bullet points using hyphens (-)
3. Convert long-form medical conditions to proper abbreviations
4. Use professional nursing terminology throughout
5. Include specific measurements and observations
6. Only document information explicitly mentioned in conversation
7. INTELLIGENTLY UPDATE EXISTING DATA: Add new information, correct inaccurate information, and remove information that the patient explicitly contradicts or corrects
8. SPECIAL VITALS HANDLING: For vitals field, APPEND new vital signs with timestamps instead of replacing existing ones. Format multiple vitals chronologically with separators (e.g., "Time 1: BP: 140/90 | HR: 88 | T: 98.6°F | RR: 18 | O2 Sat: 98% on RA\nTime 2: BP: 160/100 | HR: 92 | T: 99.1°F | RR: 20 | O2 Sat: 96% on RA")

MANDATORY MEDICAL ABBREVIATIONS TO USE:
- Hypertension → HTN
- Diabetes Type 2 → DM2, Diabetes Type 1 → DM1
- Coronary Artery Disease → CAD
- Congestive Heart Failure → CHF
- Chronic Obstructive Pulmonary Disease → COPD
- Gastroesophageal Reflux Disease → GERD
- Chronic Kidney Disease → CKD
- Atrial Fibrillation → AFib
- Myocardial Infarction → MI
- Cerebrovascular Accident → CVA
- Deep Vein Thrombosis → DVT
- Pulmonary Embolism → PE
- Hyperlipidemia → HLD
- Hypothyroidism → Hypothyroid
- Osteoarthritis → OA
- Rheumatoid Arthritis → RA
- Urinary Tract Infection → UTI
- Upper Respiratory Infection → URI
- Benign Prostatic Hyperplasia → BPH
- Activities of Daily Living → ADLs
- Range of Motion → ROM
- Shortness of Breath → SOB
- Chest Pain → CP
- Nausea and Vomiting → N/V
- Blood Pressure → BP
- Heart Rate → HR
- Respiratory Rate → RR
- Temperature → T
- Oxygen Saturation → O2 Sat
- Room Air → RA
- Pain Scale → 0-10 scale
- Twice Daily → BID
- Once Daily → QD
- As Needed → PRN
- By Mouth → PO
- Intravenous → IV

TEMPLATE FIELDS FORMATTING REQUIREMENTS:

cc: Chief Complaint
- Brief, clear statement using proper medical terminology
- Example: "CP rated 7/10, substernal"

hpi: History of Present Illness  
- Use bullet points with hyphens (-) for each symptom/timeline element
- Include duration, quality, severity, aggravating/alleviating factors
- Example: "- CP onset 2 hours ago, crushing quality\\n- Radiates to left arm\\n- Relieved partially with rest"

pmh: Past Medical History
- Convert ALL conditions to standard abbreviations
- Use bullet points with hyphens (-) for each condition
- Example: "- HTN\\n- DM2\\n- CAD\\n- GERD"

meds: Current Medications
- Use generic names with proper capitalization
- Include strength, frequency, and route
- Use standard abbreviations for dosing
- Example: "- Lisinopril 10mg QD PO\\n- Metformin 1000mg BID PO\\n- Atorvastatin 40mg QHS PO"

allergies: Known Allergies
- Use "NKDA" if no known allergies
- Format as "Allergen: Reaction type"
- Example: "- Penicillin: Rash\\n- Shellfish: Anaphylaxis" or "- NKDA"

famHx: Family History
- Use bullet points with hyphens (-) for each condition
- Include relationship and condition with abbreviations
- Example: "- Father: MI at age 65\\n- Mother: HTN, DM2"

soHx: Social History
- Include relevant social factors affecting health
- Use bullet points for multiple items
- Example: "- Tobacco: 1 PPD x 20 years\\n- Alcohol: Social use\\n- Exercise: Sedentary"

psh: Past Surgical History
- List surgeries chronologically with dates/years
- Use bullet points with hyphens (-)
- Example: "- 2019: Cholecystectomy\\n- 2015: Appendectomy"

ros: Review of Systems
- Organize by system with pertinent positives and negatives
- Use abbreviations and bullet points
- Example: "CV: Denies CP, palpitations\\nResp: Admits to SOB on exertion\\nGI: Denies N/V, abdominal pain"

vitals: Current Vital Signs
- Format as single line with standard abbreviations
- Example: "BP: 140/90 | HR: 88 | T: 98.6°F | RR: 18 | O2 Sat: 98% on RA"

Return ONLY a JSON object with these exact field names containing the extracted and properly formatted information. 

INTELLIGENT DATA MERGING RULES:
- ADD new information that wasn't previously documented
- CORRECT any existing information that the patient contradicts or clarifies (e.g., "I don't actually have that allergy", "That medication was discontinued")
- REMOVE information that the patient explicitly says is incorrect
- PRESERVE existing accurate information that isn't contradicted
- When patient corrects allergies from specific allergies back to "no allergies", use "NKDA"
- When patient corrects medications, remove discontinued ones and add new ones
- Trust the patient's current statements over previously documented information

Example output format:
{
  "cc": "SOB and fatigue x 3 days",
  "hpi": "- SOB onset 3 days ago, progressive\\n- Worsens with exertion\\n- Associated with fatigue",
  "pmh": "- HTN\\n- DM2\\n- CAD",
  "meds": "- Lisinopril 10mg QD PO\\n- Metformin 1000mg BID PO",
  "allergies": "- NKDA",
  "famHx": "- Father: CAD\\n- Mother: DM2",
  "soHx": "- Tobacco: Former smoker, quit 5 years ago\\n- Alcohol: Social use",
  "psh": "- 2018: CABG",
  "ros": "CV: Admits to chest tightness\\nResp: Admits to SOB\\nGI: Denies N/V",
  "vitals": "BP: 150/95 | HR: 92 | T: 98.4°F | RR: 20 | O2 Sat: 96% on RA"
}`;

  // Generate nursing template using GPT-4.1-mini for structured data extraction
  // Purpose: Fast, cost-effective model for parsing transcriptions into standardized nursing documentation fields
  // Uses low temperature (0.3) for consistent formatting and medical abbreviation compliance
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: nursingPrompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error("No nursing template generated from OpenAI");
  }

  console.log("🏥 [NursingTemplateDirect] Raw OpenAI response:", response);
  console.log(
    "🏥 [NursingTemplateDirect] Response length:",
    response?.length || 0,
  );

  // Parse JSON response
  let templateData;
  try {
    // Clean response - sometimes OpenAI adds markdown formatting
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    console.log(
      "🏥 [NursingTemplateDirect] Cleaned response for parsing:",
      cleanResponse,
    );
    templateData = JSON.parse(cleanResponse);
    console.log(
      "✅ [NursingTemplateDirect] Successfully parsed JSON:",
      templateData,
    );
  } catch (parseError) {
    console.error("❌ [NursingTemplateDirect] JSON Parse Error Details:");
    console.error("❌ [NursingTemplateDirect] Parse error:", parseError);
    console.error("❌ [NursingTemplateDirect] Raw response:", response);
    console.error("❌ [NursingTemplateDirect] Response type:", typeof response);
    throw new Error(
      `Invalid JSON response from OpenAI: ${(parseError as Error).message}`,
    );
  }

  console.log(
    `✅ [NursingTemplateDirect] Generated template with ${Object.keys(templateData).length} fields`,
  );
  console.log(
    "🏥 [NursingTemplateDirect] Template field keys:",
    Object.keys(templateData),
  );
  return templateData;
}

// Helper function to format vitals consistently
function formatVitalsForSOAP(vitals: any[], encounterDate?: Date): string {
  // Filter vitals to only include those from the same day as the encounter
  let filteredVitals = vitals;
  
  if (encounterDate) {
    // Get the date components of the encounter date
    const encounterDateOnly = new Date(encounterDate);
    encounterDateOnly.setHours(0, 0, 0, 0);
    const encounterDateEnd = new Date(encounterDate);
    encounterDateEnd.setHours(23, 59, 59, 999);
    
    // Filter vitals to only include those from the same day
    filteredVitals = vitals.filter((v: any) => {
      const vitalDate = new Date(v.recordedAt);
      return vitalDate >= encounterDateOnly && vitalDate <= encounterDateEnd;
    });
    
    console.log(`[formatVitalsForSOAP] Filtered ${vitals.length} vitals to ${filteredVitals.length} for encounter date ${encounterDate.toLocaleDateString()}`);
  }
  
  if (filteredVitals.length === 0) {
    return "- No vitals recorded for this encounter date";
  }

  return filteredVitals
    .map((v: any) => {
      const parts = [];
      const date = new Date(v.recordedAt).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
      });

      if (v.systolicBp && v.diastolicBp) {
        parts.push(`BP: ${v.systolicBp}/${v.diastolicBp}`);
      }
      if (v.heartRate) {
        parts.push(`HR: ${v.heartRate}`);
      }
      if (v.temperature) {
        parts.push(`Temp: ${v.temperature}°F`);
      }
      if (v.respiratoryRate) {
        parts.push(`RR: ${v.respiratoryRate}`);
      }
      if (v.oxygenSaturation) {
        parts.push(`SpO2: ${v.oxygenSaturation}%`);
      }

      return `${date}: ${parts.join(", ")}`;
    })
    .join("\n");
}

// Fast medical routes removed - functionality moved to frontend WebSocket

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);
  
  // Serve static files from uploads directory with proper MIME types
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      // Set proper MIME types based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
      };
      
      const mimeType = mimeTypes[ext];
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
      }
    }
  }));
  
  // Set up HIPAA audit logging middleware for all routes
  const { auditPHIAccess } = await import("./audit-logging.js");
  app.use(auditPHIAccess);

  // Location management routes
  const { setupLocationRoutes } = await import("./location-routes.js");
  setupLocationRoutes(app);

  // Add logging middleware for ALL requests to debug
  app.use((req, res, next) => {
    if (req.url.includes('/api/auth/webauthn')) {
      console.log('🔍 [WebAuthn Global Middleware] Request:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        contentType: req.get('content-type'),
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
        hasSession: !!(req as any).session,
        isAuthenticated: (req as any).isAuthenticated ? (req as any).isAuthenticated() : 'no auth method'
      });
    }
    next();
  });

  // Add error catching middleware for WebAuthn
  app.use("/api/auth/webauthn", (err: any, req: Request, res: Response, next: any) => {
    console.error('❌ [WebAuthn Error Middleware] Error caught:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    });
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // Add specific POST handler to debug the exact failing route
  app.post("/api/auth/webauthn/register/verify", (req, res, next) => {
    console.log('🎯 [DIRECT HIT] POST /api/auth/webauthn/register/verify intercepted!');
    console.log('Request details:', {
      body: req.body,
      headers: req.headers,
      isAuthenticated: (req as any).isAuthenticated(),
      user: (req as any).user
    });
    next(); // Pass to actual handler
  });

  // WebAuthn/Passkey routes
  const webauthnRoutes = (await import("./webauthn-routes.js")).default;
  app.use("/api/auth", webauthnRoutes);

  // Dashboard routes
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/patients", patientOrderPreferencesRoutes);

  // Signed orders routes
  const signedOrdersRoutes = (await import("./signed-orders-routes.js"))
    .default;
  app.use("/api/patients", signedOrdersRoutes);
  app.use("/api/signed-orders", signedOrdersRoutes);

  // PDF download endpoint
  app.get("/api/orders/download-pdf/:filename", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const filename = req.params.filename;
      console.log(`📄 [PDF Download] Request for file: ${filename}`);

      // For security, validate filename format
      if (
        !/^(prescription|lab_requisition|imaging_requisition)_\d+_\d+\.pdf$/.test(
          filename,
        )
      ) {
        return res.status(400).json({ error: "Invalid filename format" });
      }

      // In production, you'd store PDFs and serve them from file system or cloud storage
      // For now, we'll regenerate the PDF on demand based on the filename pattern
      res.status(501).json({
        error:
          "PDF download not yet implemented - PDFs are generated inline during signing",
        message:
          "PDFs are currently generated and displayed directly when orders are signed",
      });
    } catch (error: any) {
      console.error("❌ [PDF Download] Error:", error);
      res.status(500).json({ error: "Failed to download PDF" });
    }
  });

  // Magic link routes for modern authentication
  const magicLinkRoutes = (await import("./magic-link-routes.js")).default;
  app.use(magicLinkRoutes);

  // Unified medical problems routes (handles both SOAP and attachment processing)
  // NOTE: Must be registered BEFORE enhanced routes to avoid route conflicts
  app.use("/api", unifiedMedicalProblemsRoutes);
  
  // Add compatibility route for frontend that expects different path
  app.get("/api/patients/:id/medical-problems", async (req, res) => {
    // Forward to unified medical problems API
    req.url = `/medical-problems/${req.params.id}`;
    req.originalUrl = `/api/medical-problems/${req.params.id}`;
    unifiedMedicalProblemsRoutes.handle(req, res, (err) => {
      if (err) {
        console.error("Error forwarding medical problems request:", err);
        res.status(500).json({ error: "Failed to fetch medical problems" });
      }
    });
  });
  app.use("/api", unifiedSurgicalHistoryRoutes);
  app.use("/api", unifiedFamilyHistoryRoutes);
  app.use("/api", socialHistoryRoutes);

  // Unified Imaging Routes (8th parallel processing service)
  setupUnifiedImagingRoutes(app);

  // Unified Allergy Routes
  app.get(
    "/api/allergies/:patientId",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.getAllergies),
  );
  app.post(
    "/api/allergies",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.createAllergy),
  );
  app.put(
    "/api/allergies/:allergyId",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.updateAllergy),
  );
  app.delete(
    "/api/allergies/:allergyId",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.deleteAllergy),
  );
  app.post(
    "/api/allergies/process-unified",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.processUnifiedAllergies),
  );
  app.post(
    "/api/allergies/:allergyId/visit-history",
    APIResponseHandler.asyncHandler(unifiedAllergyAPI.addAllergyVisitHistory),
  );

  // Removed orphaned enhanced medical problems routes - functionality consolidated into unified API

  // Enhanced medications routes (GPT-powered standardization and grouping)
  app.use("/api", enhancedMedicationRoutes);

  // Medication standardization routes
  app.use("/api/medications", medicationStandardizationRoutes);

  // Migration routes for provider practice transitions
  app.use(migrationRoutes);

  // Admin clinic import routes
  app.use("/api/admin/clinic-import", adminClinicImportRoutes);
  app.use(healthcareDataRoutes);
  app.use(healthcareUpdateSettingsRoutes);
  app.use("/api/admin", adminStatsRoutes);
  
  // Admin verification routes (PUBLIC - for creating new admin accounts)
  registerAdminVerificationRoutes(app);

  // Clinic admin routes (for health system administrators)
  const { registerClinicAdminRoutes } = await import('./clinic-admin-routes');
  registerClinicAdminRoutes(app);

  // Test patient generation routes (system admins only)
  app.use(testPatientRoutes);

  // Acquisition tracking routes
  app.use(acquisitionRoutes);

  // Intelligent diagnosis routes (GPT-powered autocompletion)
  app.use("/api/intelligent-diagnosis", intelligentDiagnosisRoutes);

  // Unified medication intelligence routes
  app.use("/api", unifiedMedicationIntelligenceRoutes);

  // Medication formulary routes (500-medication database)
  // app.use("/api/formulary", medicationFormularyRoutes);

  // RxNorm medication database routes (200,000+ medications)
  const rxnormRoutes = createRxNormRoutes();
  app.use("/api/rxnorm", rxnormRoutes);

  // Encounter validation and signing routes
  app.use("/api", validationRoutes);

  // Scheduling routes
  app.use(schedulingRoutes);
  
  // Blog routes (public and admin)
  app.use(blogRoutes);

  // Unified vitals processing (handles both immediate parsing and attachment extraction)
  const unifiedVitalsAPI = (await import("./unified-vitals-api.js")).default;
  app.use("/api/vitals", unifiedVitalsAPI);

  // Database health check endpoint for deployment verification
  app.get("/api/health/db", async (req, res) => {
    try {
      const { db } = await import("./db.js");
      const tables = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const requiredTables = [
        'marketing_automations',
        'marketing_campaigns', 
        'marketing_insights',
        'marketing_metrics',
        'conversion_events',
        'user_acquisition'
      ];
      
      const existingTables = tables.rows.map((row: any) => row.table_name);
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      // Also check for critical user columns
      const userColumns = await db.execute(`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'users' 
        AND column_name IN ('baa_accepted', 'baa_accepted_at', 'baa_version')
      `);
      
      const requiredUserColumns = ['baa_accepted', 'baa_accepted_at', 'baa_version'];
      const existingUserColumns = userColumns.rows.map((col: any) => col.column_name);
      const missingUserColumns = requiredUserColumns.filter(c => !existingUserColumns.includes(c));
      
      res.json({
        status: missingTables.length === 0 && missingUserColumns.length === 0 ? 'healthy' : 'unhealthy',
        totalTables: existingTables.length,
        missingTables,
        missingUserColumns,
        databaseUrl: process.env.DATABASE_URL?.split('@')[1] // Show host only for security
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // Parse-only endpoint for Quick Parse form population (returns data without saving)
  app.post("/api/vitals/parse-only", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { text, patientId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      // Get patient context if provided
      let patientContext = undefined;
      if (patientId) {
        try {
          const { db } = await import("./db.js");
          const { patients } = await import("../shared/schema.js");
          const { eq } = await import("drizzle-orm");

          const [patient] = await db
            .select()
            .from(patients)
            .where(eq(patients.id, patientId))
            .limit(1);

          if (patient) {
            const birthDate = new Date(patient.dateOfBirth);
            const today = new Date();
            const age = Math.floor(
              (today.getTime() - birthDate.getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            );

            patientContext = {
              age: age,
              gender: patient.gender,
            };
          }
        } catch (error) {
          console.warn("Could not fetch patient context:", error);
        }
      }

      const { VitalsParserService } = await import(
        "./vitals-parser-service.js"
      );
      const vitalsParser = new VitalsParserService();

      const parseResult = await vitalsParser.parseVitalsText(
        text,
        patientContext,
      );

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          errors: parseResult.errors || ["Failed to parse vitals"],
        });
      }

      // Return first vitals set for quick parse functionality
      const firstVitalsSet = parseResult.data?.[0];
      
      // If no vitals found, return a successful response with empty vitals
      if (!firstVitalsSet) {
        return res.json({
          success: true,
          vitals: null,
          confidence: 0,
          totalSetsFound: 0,
          message: "No vitals detected in the text. Please enter vitals in a recognized format (e.g., 'BP 120/80, HR 72, Temp 98.6')."
        });
      }

      res.json({
        success: true,
        vitals: firstVitalsSet,
        confidence: parseResult.confidence,
        totalSetsFound: parseResult.data?.length || 0,
      });
    } catch (error: any) {
      console.error("Parse-only vitals error:", error);
      res.status(500).json({ error: "Failed to parse vitals" });
    }
  });

  // Debug endpoint for testing multiple vitals extraction
  app.post("/api/debug/test-vitals", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text required" });

      const { VitalsParserService } = await import(
        "./vitals-parser-service.js"
      );
      const parser = new VitalsParserService();

      const result = await parser.parseVitalsText(text);
      res.json(result);
    } catch (error: any) {
      console.error("Debug vitals test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to manually trigger chart processing
  app.post(
    "/api/debug/trigger-chart-processing/:attachmentId",
    async (req, res) => {
      try {
        const attachmentId = parseInt(req.params.attachmentId);
        if (!attachmentId)
          return res.status(400).json({ error: "Invalid attachment ID" });

        const { attachmentChartProcessor } = await import(
          "./attachment-chart-processor.js"
        );
        await attachmentChartProcessor.processCompletedAttachment(attachmentId);

        res.json({
          success: true,
          message: `Chart processing triggered for attachment ${attachmentId}`,
        });
      } catch (error: any) {
        console.error("Debug chart processing error:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Vitals flowsheet routes (enhanced vitals management)
  app.use("/api/vitals", vitalsFlowsheetRoutes);

  // Template management routes (custom user templates)
  setupTemplateRoutes(app);

  // Surgical history routes (unified processing and management)
  app.use("/api/surgical-history", unifiedSurgicalHistoryRoutes);

  // NOTE: User preferences routes now handled by auth.ts to avoid duplication

  // Patient attachments routes
  app.use("/api/patients", patientAttachmentsRoutes);

  // Nursing summary routes
  app.use("/api/encounters", nursingSummaryRoutes);

  // Lab management routes

  // Removed duplicate - using main lab results endpoint below

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

  // Patient routes - with tenant isolation
  app.get("/api/patients", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const healthSystemId = req.userHealthSystemId!;
      const patients = await storage.getAllPatients(healthSystemId);
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/search", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { q } = req.query;
      if (!q) return res.json([]);

      const healthSystemId = req.userHealthSystemId!;
      const patients = await storage.searchPatients(
        q as string,
        healthSystemId,
      );
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const healthSystemId = req.userHealthSystemId!;
      const patient = await storage.getPatient(
        parseInt(req.params.id),
        healthSystemId,
      );
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });

      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      // Utility function to normalize name capitalization
      const normalizeNameCapitalization = (name: string): string => {
        if (!name) return name;

        return name
          .split(" ")
          .map((word) => {
            if (!word) return word;
            // Handle special cases like O'Connor, McDonald, etc.
            if (word.includes("'")) {
              return word
                .split("'")
                .map(
                  (part) =>
                    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
                )
                .join("'");
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(" ");
      };

      // Add the healthSystemId from the user's context to the request body
      const healthSystemId = req.userHealthSystemId!;
      const userId = (req.user as any).id;

      // Get user session location to determine creation context
      const sessionLocation = await storage.getUserSessionLocation(userId);
      const locationData = sessionLocation?.locationId
        ? await storage.getLocation(sessionLocation.locationId)
        : null;

      // Determine creation context based on location type
      let creationContext = "private_practice";
      if (locationData) {
        if (locationData.locationType === "hospital") {
          creationContext = "hospital_rounds";
        } else if (
          locationData.locationType === "clinic" ||
          locationData.locationType === "outpatient"
        ) {
          creationContext = "clinic_hours";
        }
      }

      // Convert empty strings to null for proper database handling
      const cleanedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      const patientDataWithHealthSystem = {
        ...cleanedBody,
        healthSystemId,
        createdByProviderId: userId,
        dataOriginType: "emr_direct",
        creationContext,
        originalFacilityId: healthSystemId, // Current facility where patient was created
      };

      // Parse with the complete data including healthSystemId
      const validatedData = insertPatientSchema.parse(
        patientDataWithHealthSystem,
      );

      // Normalize name capitalization if firstName and lastName are provided
      if (validatedData.firstName) {
        validatedData.firstName = normalizeNameCapitalization(
          validatedData.firstName,
        );
      }
      if (validatedData.lastName) {
        validatedData.lastName = normalizeNameCapitalization(
          validatedData.lastName,
        );
      }

      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/patients/:id", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.id);
      if (!patientId) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      const healthSystemId = req.userHealthSystemId!;

      // Check if patient exists before deletion
      const patient = await storage.getPatient(patientId, healthSystemId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      await storage.deletePatient(patientId, healthSystemId);
      res.status(200).json({ message: "Patient deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Removed duplicate - using main lab results endpoint

  // Lab orders endpoint for compatibility
  // REMOVED DUPLICATE - main lab-orders endpoint below

  // Encounter routes
  app.get("/api/patients/:patientId/encounters", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.patientId);
      const encounters = await storage.getPatientEncounters(patientId);
      res.json(encounters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/encounters/:id", tenantIsolation, async (req, res) => {
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

  app.post("/api/encounters", tenantIsolation, async (req, res) => {
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
    tenantIsolation,
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

  app.patch("/api/encounters/:id", tenantIsolation, async (req, res) => {
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
  app.get("/api/patients/:patientId/vitals", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getPatientVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/vitals/latest", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.patientId);
      const vitals = await storage.getLatestVitals(patientId);
      res.json(vitals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vitals routes are now handled by vitals-flowsheet-routes.ts
  // Old POST /api/vitals route removed to prevent routing conflicts

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
      // Temporarily bypass auth for lab orders debugging (like lab results endpoint)
      // if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.patientId);

      // Get lab orders directly from lab_orders table for proper status tracking
      const labOrdersData = await db
        .select({
          id: labOrders.id,
          testName: labOrders.testName,
          orderStatus: labOrders.orderStatus,
          priority: labOrders.priority,
          orderedAt: labOrders.orderedAt,
          acknowledgedAt: labOrders.acknowledgedAt,
          externalOrderId: labOrders.externalOrderId,
          requisitionNumber: labOrders.requisitionNumber,
        })
        .from(labOrders)
        .where(eq(labOrders.patientId, patientId))
        .orderBy(desc(labOrders.orderedAt));

      // Check for results and format response
      const ordersWithStatus = labOrdersData.map((order: any) => ({
        id: order.id,
        testName: order.testName,
        orderStatus:
          order.orderStatus === "transmitted" ? "pending" : order.orderStatus,
        priority: order.priority || "Routine",
        orderedAt: order.orderedAt,
        orderDate: order.orderedAt,
        collectionDate: order.acknowledgedAt,
        externalOrderId: order.externalOrderId,
        requisitionNumber: order.requisitionNumber,
      }));

      res.json(ordersWithStatus);
    } catch (error: any) {
      console.error("Lab orders API error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/lab-results", async (req, res) => {
    try {
      // Temporarily bypass auth for lab results debugging
      // if (!req.isAuthenticated()) return res.sendStatus(401);

      const patientId = parseInt(req.params.patientId);
      console.log(
        `🧪 [LabResults] Fetching lab results for patient ${patientId}`,
      );

      const labResults = await storage.getPatientLabResults(patientId);
      console.log(`🧪 [LabResults] Found ${labResults.length} lab results`);

      res.json(labResults);
    } catch (error: any) {
      console.error("❌ [LabResults] Error:", error);
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

  // REST API Live AI Suggestions - Cost-optimized alternative to WebSocket
  app.post("/api/voice/live-suggestions", tenantIsolation, async (req, res) => {
    try {
      const { patientId, userRole, transcription } = req.body;

      if (!patientId || !userRole || !transcription) {
        return res.status(400).json({
          error: "Missing required fields: patientId, userRole, transcription",
        });
      }

      const patientIdNum = parseInt(patientId);
      const healthSystemId = req.userHealthSystemId!;
      const patient = await storage.getPatient(patientIdNum, healthSystemId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get comprehensive patient chart data using same service as WebSocket
      const patientChart =
        await PatientChartService.getPatientChartData(patientIdNum);

      // Build patient context identical to WebSocket system
      const formatPatientContext = (chart: any, basicData: any): string => {
        return `Patient: ${basicData.firstName} ${basicData.lastName}
Age: ${basicData.age || "Unknown"} 
Gender: ${basicData.gender || "Unknown"}
MRN: ${basicData.mrn || "Unknown"}

MEDICAL PROBLEMS:
${
  chart.medicalProblems?.length > 0
    ? chart.medicalProblems
        .map((p: any) => `- ${p.problemTitle} (${p.problemStatus})`)
        .join("\n")
    : "- No active medical problems documented"
}

CURRENT MEDICATIONS:
${
  chart.currentMedications?.length > 0
    ? chart.currentMedications
        .map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`)
        .join("\n")
    : "- No current medications documented"
}

ALLERGIES:
${
  chart.allergies?.length > 0
    ? chart.allergies
        .map((a: any) => `- ${a.allergen}: ${a.reaction} (${a.severity})`)
        .join("\n")
    : "- NKDA (No Known Drug Allergies)"
}

RECENT VITALS:
${
  chart.vitals?.length > 0
    ? `- BP: ${chart.vitals[0].systolicBp}/${chart.vitals[0].diastolicBp} mmHg
- HR: ${chart.vitals[0].heartRate} bpm
- Temp: ${chart.vitals[0].temperature}°F
- RR: ${chart.vitals[0].respiratoryRate || "Not recorded"}
- O2 Sat: ${chart.vitals[0].oxygenSaturation || "Not recorded"}%`
    : "- No recent vitals available"
}`;
      };

      const patientContext = formatPatientContext(patientChart, patient);

      // Use exact same prompts as working WebSocket system
      const isProvider = userRole === "provider";
      const instructions = isProvider
        ? `

SYSTEM PROMPT — "CLARAFI" PHYSICIAN POINT-OF-CARE ASSISTANT

You are "Clarafi," an assistant for physicians at the point-of-care.

Your primary job is to instantly surface concise, specific, evidence-based medical facts and patient-chart details.

You never tell the clinician what to do—only surface the details, figures, dosing, red flags, and cross-interaction risks (not EMR trivial alerts, only major ones) they might forget.

LANGUAGE

Respond in English only.
RESPONSE STYLE

Insights must be brief, phrase-based; never full sentences.
Each line is its own bullet ("•") and self-contained insight.
No pleasantries, explanations, or generic knowledge a physician already knows.
Return only the relevant insight(s). Maximum of 5. Never pad with less-relevant information. 
DO NOT fill extra lines if fewer than 5 insights are present. 
If only 1-2 insights are relevant, return only those. 
Conciseness is ideal. Only include an insight if it is evidence-based, non-redundant, and relevant to the transcription. 
No repeats during a session.
If no new info, reply: • No new insights
CONTENT FOCUS AND PRIORITIZATION

If asked, always answer with specific, factual, data-driven content from the context/chart.
Never give generic statements (“Assess…”, “Consider reviewing…”) if concrete data is present.
Never refer to guidelines in the abstract (“Guidelines recommend…”); instead, state the actual dose, titration, interval, etc., valid for the charted comorbidities/labs/vitals.
All responses must be EBM-aligned and patient-tailored.
If you see conflicting or ambiguous data (e.g., two lab results), show both and explain the discrepancy: e.g.,
• Creatinine 1.8 (1/20), also 1.2 (1/18) — discrepancy in charted dates
Never state that more detail is needed—give what is present, and be transparent about ambiguity.
EMPHASIZE IN RESPONSE

Precise medication details: starting dose, titration/max, adjustment for kidney/liver, major interaction warnings only (ignore trivial/EMR-style alerts; see below for real-world significance).
Direct, context-driven labs/vitals/imaging/numbers. Can return trends/deltas if that’s what’s asked.
When responding to direct "Clarafi" queries, prioritize mechanistic minutiae, obscure differentials ("zebras"), rare but serious flags, and hard-to-recall dosing/monitoring facts.
When listing differentials or "zebra" diagnoses, err on the side of including a couple of less-common but plausible options relevant to the symptom/setting.
Always prioritize information that is evidence-based (best guidelines, actual surveillance recommendations) as much as possible.
DRUG-DRUG INTERACTIONS

Only report interactions with real clinical significance (ignore EMR alert fatigue traps).
For example, DO NOT alert on:
ACEi + potassium-rich foods (unless severe renal dz or high-dose)
SSRIs + NSAIDs (unless major risk factors/coagulopathy/volume depletion)
Statins + grapefruit juice (only flag for simvastatin/lovastatin; ignore for pravastatin/rosuvastatin)
Metformin + PPI (only flag if advanced CKD/liver dysfunction)
Penicillin + OCP
DO alert on:
Warfarin + amiodarone, Bactrim, metronidazole, macrolide, quinolones
ACEi/ARB + potassium-sparing diuretic (esp. in CKD/elderly)
Macrolides (esp. clarithromycin) + statins (simvastatin, atorvastatin, lovastatin) — risk rhabdo
Nitrates + PDE-5 inhibitors (sildenafil/tadalafil)
SSRIs + MAO-I
Any other high-risk, guideline-acknowledged DDI where the outcome is severe (bleeding, serotonin syndrome, life-threatening hypo/HTN, etc.)
For interactions: show the actual med combos involved, mechanism (brief/phrase), and specific recommendation only if contextually present.
SESSION CONTEXT/MEMORY

Always recall prior responses in this session; do not repeat insight already given.
Track serial numerics (labs, vitals, dose changes) in this encounter, and provide deltas/trends if asked. If a vitals or labs trend is requested, show up to last 3 values.
QUERY HANDLING

For direct "Clarafi" queries (e.g., “Clarafi, [question]”), reply as above but maximum 1 insight. Especially prioritize:
Mechanistic dosing/titration/minutiae
obscure adverse effects
workup intervals (e.g., "INR every week x2 then monthly if stable" with actual patient data)
rare but plausible differentials
monitoring schedules/deltas for drugs like warfarin, methotrexate, amiodarone, lithium, etc.
WHEN ANSWERING SYMPTOM WORKUP/DECISION SECTIONS

Use this 4-line, phrase-only format for clinical problem queries:
RED FLAGS: (evidence-based, symptom/context-specific, including less common but dangerous findings)
DIFF DX: (highest yield + at least 1–2 “zebra” differentials where relevant)
WORKUP: (next specific step(s) by name; if already done, give actual results; e.g., “ECG: NSR, troponin 0.01, last 4/1/24”)
TREATMENT: (medication name, actual starting dose, titration/max, dose reduction for renal/hepatic impairment, or specific alternatives if necessary/lab-abnormal/contra)
Never use sentences—just phrase-per-line, bullet style.
Each relevant phrase is maximally tailored to patient context.
IF NO NEW DATA OR INSIGHT AVAILABLE

Respond: • No new insights
EXAMPLES FOR CLARIFICATION

Does patient have medical problems?

• Medical problems: HTN, DM2, CKD stage 3, AFib, CHF with reduced EF

What are current medications?

• Lisinopril 10mg daily, Metformin 500mg BID, Warfarin 5mg daily

"Clarafi, starting dose for methotrexate given GFR 32"

• Methotrexate starting dose: 7.5mg weekly; reduce to 5mg weekly if GFR ≤30

• Folic acid 1mg daily adjunct recommended

"Clarafi, how to increase sertraline"

• Sertraline titration: increase by 50mg every 2–4 weeks; max 200mg daily

"Clarafi, what are real interactions for this patient's current meds?"

• Warfarin + amiodarone: ↑ bleeding risk; monitor INR, adjust warfarin dose

• Lisinopril + spironolactone: risk hyperkalemia; monitor K+, renal function

• Simvastatin + clarithromycin: ↑ risk rhabdo; hold simvastatin during macrolide therapy

Recent labs/trends?

• A1c 7.2% (2/2024), 7.5% (11/2023)

• Creatinine 1.2 (2/1/24), 1.0 (11/1/23)

• Potassium 5.6 (today), was 4.2 (last month)

Vitals trend?

• BP: 155/90, 144/82, 130/78 last 3 visits

• HR: 110, 98, 96

• Temp: 101.1, 101.6, 102.4 F

Symptom workup example:

Pt with chest pain, CAD, on aspirin/statin, normal renal fn:

• RED FLAGS: exertional pain, radiation jaw/arm, diaphoresis, syncope, hypotension

• DIFF DX: ACS, PE, aortic dissection, pericarditis, Prinzmetal angina, esophageal rupture

• WORKUP: ECG: NSR, troponin 0.02 (today), last 4/1/24, CXR unremarkable

• TREATMENT: Atorvastatin 80mg daily; add metoprolol tartrate 25mg BID (titrate to 100mg BID); aspirin 81mg daily

Conflicting labs?

• Creatinine 2.1 (3/10), also 1.3 (3/12) — discrepancy; interpret with caution

ADDITIONAL EXAMPLES
("Clarafi, cross-taper instructions for switching SSRI to MAOI")

• SSRIs must be stopped ≥2 weeks before starting MAOI

• Fluoxetine washout ≥5 weeks due to long half-life

("Clarafi, monitoring for amiodarone")

• Baseline: TSH, LFTs, CXR, EKG

• Q6 months: TSH, LFTs

• Annual: CXR, EKG, ophthalmology

("Clarafi, list 'zebra' differential for back pain in patient with cancer")

• DIFF DX: epidural metastasis, vertebral compression fracture, osteomyelitis, spinal cord abscess, retroperitoneal bleed

INSTRUCTION SUMMARY

Only up to 5 bullet points/lines per response.
Every recommendation/dose tailored to patient chart, comorbidities, actual labs/vitals, allergies, and context.
No fluff, no generic statements, no repetition, no forbidden alerts.
If nothing new - • No new insights`
        : `
SYSTEM PROMPT — "CLARAFI" NURSING POINT-OF-CARE ASSISTANT

You are "Clarafi," an assistant for nurses at the point-of-care.

Your primary job is to instantly surface concise, specific, evidence-based nursing facts and patient-chart details.

You help nurses with medication administration, vitals monitoring, patient assessment, and care coordination.

LANGUAGE

Respond in English only.

RESPONSE STYLE

Insights must be brief, phrase-based; never full sentences.
Each line is its own bullet ("•") and self-contained insight.
No pleasantries, explanations, or generic knowledge a nurse already knows.
Never exceed 5 insights/lines per response.
No repeats during a session.
If no new info, reply: • No new insights

CONTENT FOCUS

If asked, always answer with specific, factual data from the context/chart.
Focus on nursing-relevant information: medication administration times, vital sign trends, assessment findings.
Include important nursing considerations: NPO status, fall risk, isolation precautions.
All responses must be evidence-based and patient-tailored.

EMPHASIZE IN RESPONSE

Medication administration details: times, routes, special instructions
Vital sign trends and concerning changes
Relevant nursing assessments and interventions
Safety considerations and precautions
Important orders or care plan changes

If nothing new - • No new insights`;

      // Create GPT message with patient context and current transcription
      const contextWithTranscription = `${patientContext}

CURRENT LIVE CONVERSATION:
${transcription}

CRITICAL: If the ${isProvider ? "provider" : "nurse"} is asking direct questions about patient chart information, provide SPECIFIC facts from the chart data above, NOT generic suggestions.

Examples:
- Question: "Does the patient have medical problems?" → Answer: "Medical problems: HTN, DM2, CKD stage 3, AFib, CHF"
- Question: "What medications?" → Answer: "Current medications: Lisinopril 10mg daily, Metformin 500mg BID"
- Question: "Any allergies?" → Answer: "NKDA (No Known Drug Allergies)"

DO NOT say "Assess" or "Evaluate" - give the actual chart facts directly.

Please provide medical suggestions based on what the ${isProvider ? "provider" : "nurse"} is saying in this current conversation.`;

      // Call OpenAI with same model and settings
      console.log(
        `🧠 [RestAPI] Making GPT-4.1-mini call for ${userRole} suggestions`,
      );
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: instructions,
          },
          {
            role: "user",
            content: contextWithTranscription,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      console.log(`🧠 [RestAPI] GPT response received, usage:`, response.usage);

      const suggestions = response.choices[0].message.content;
      if (!suggestions) {
        throw new Error("No suggestions generated from GPT");
      }

      // Format response with bullet points like WebSocket system
      const formattedSuggestions = suggestions
        .split("\n")
        .filter((s) => s.trim())
        .map((suggestion) => {
          const trimmed = suggestion.trim();
          // Ensure bullet point formatting like WebSocket
          if (
            trimmed &&
            !trimmed.startsWith("•") &&
            !trimmed.startsWith("-") &&
            !trimmed.match(/^\d+\./)
          ) {
            return `• ${trimmed}`;
          }
          return trimmed;
        })
        .filter((s) => s.length > 0);

      res.json({
        aiSuggestions: {
          realTimePrompts: formattedSuggestions,
        },
        usage: response.usage,
        model: "gpt-4.1-mini",
        costOptimized: true,
      });
    } catch (error: any) {
      console.error("❌ [RestAPI] Live suggestions error:", error);
      res.status(500).json({
        error: "Failed to generate AI suggestions",
        details: error.message,
      });
    }
  });

  // ⚠️ LEGACY ROUTE - Enhanced voice processing (PARTIALLY DEPRECATED)
  // This route uses legacy realtime medical context service - Enhanced Realtime Service is primary
  app.post(
    "/api/voice/transcribe-enhanced",
    tenantIsolation,
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

        const healthSystemId = req.userHealthSystemId!;
        const patient = await storage.getPatient(patientIdNum, healthSystemId);
        if (!patient) {
          return res.status(404).json({ error: "Patient not found" });
        }

        if (isLive) {
          // Live processing moved to frontend WebSocket implementation
          res.json({
            transcription: "Live processing now handled by frontend WebSocket",
            suggestions: {
              suggestions: [
                "Use real-time WebSocket transcription for better performance",
              ],
              clinicalFlags: [],
            },
            performance: {
              responseTime: 0,
              tokenCount: 0,
              system: "deprecated",
            },
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
            providerPrompts: [
              "Use WebSocket transcription for better performance",
            ],
            nursePrompts: ["Switch to real-time WebSocket transcription"],
            draftOrders: [],
            draftDiagnoses: [],
            clinicalNotes: "This endpoint is deprecated",
          },
          performance: {
            responseTime: 0,
            tokenCount: 0,
            system: "deprecated",
          },
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },
  );

  // ⚠️ LEGACY ROUTE - Get assistant configuration for a patient (DEPRECATED)
  // This route uses the legacy Assistants API - current AI suggestions use Enhanced Realtime Service
  app.get("/api/patients/:id/assistant", tenantIsolation, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const healthSystemId = req.userHealthSystemId!;
      const patient = await storage.getPatient(patientId, healthSystemId);

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
  app.get(
    "/api/patients/:id/assistant/messages",
    tenantIsolation,
    async (req, res) => {
      try {
        const patientId = parseInt(req.params.id);
        const healthSystemId = req.userHealthSystemId!;
        const patient = await storage.getPatient(patientId, healthSystemId);

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
    },
  );

  // Legacy endpoints removed - now using new custom template system

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
        const soapNote = await generateSOAPNoteDirect(
          patientId,
          encounterId.toString(),
          transcription,
        );

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

  // Nursing Template Generation endpoint - REST API replacement for realtime
  app.post("/api/nursing-template/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { patientId, encounterId, transcription, currentTemplateData } =
        req.body;

      if (!patientId || !encounterId || !transcription) {
        return res.status(400).json({
          message:
            "Missing required fields: patientId, encounterId, transcription",
        });
      }

      // Generate nursing template using same approach as SOAP generation
      const templateData = await generateNursingTemplateDirect(
        parseInt(patientId),
        encounterId,
        transcription,
        currentTemplateData || {},
      );

      // Return the complete template data as JSON
      const responseData = {
        templateData,
        patientId: parseInt(patientId),
        encounterId,
        generatedAt: new Date().toISOString(),
      };

      res.json(responseData);
    } catch (error: any) {
      console.error("❌ [NursingTemplateAPI] ERROR:", error.message);

      res.status(500).json({
        message: "Failed to generate nursing template",
        error: error.message,
      });
    }
  });

  // Enhanced Clinical Note Generation endpoint (supports custom templates)
  app.post("/api/clinical-notes/generate", async (req, res) => {
    const requestStart = Date.now();
    try {
      if (!req.isAuthenticated()) {
        console.log(`🔒 [ClinicalNotes] Unauthorized request`);
        return res.sendStatus(401);
      }

      const {
        noteType = "soap",
        patientId,
        encounterId,
        transcription,
        templateId,
      } = req.body;
      const userId = (req as any).user.id;

      console.log(`🎯 [ClinicalNotes] Request received:`, {
        noteType,
        patientId,
        encounterId,
        userId,
        templateId,
        transcriptionLength: transcription?.length || 0,
        hasTranscription: !!transcription,
        requestTimestamp: new Date().toISOString(),
      });

      if (!patientId || !encounterId || !transcription) {
        console.error(`❌ [ClinicalNotes] Missing required fields:`, {
          hasPatientId: !!patientId,
          hasEncounterId: !!encounterId,
          hasTranscription: !!transcription,
        });
        return res.status(400).json({
          message:
            "Missing required fields: patientId, encounterId, transcription",
        });
      }

      console.log(
        `🩺 [ClinicalNotes] Generating ${noteType} note for patient ${patientId}, encounter ${encounterId}`,
      );

      // Use enhanced note generation service
      const { EnhancedNoteGenerationService } = await import(
        "./enhanced-note-generation-service.js"
      );
      const clinicalNote = await EnhancedNoteGenerationService.generateNote(
        noteType,
        parseInt(patientId),
        encounterId,
        transcription,
        userId,
        templateId ? parseInt(templateId) : undefined,
      );

      const requestDuration = Date.now() - requestStart;
      console.log(
        `✅ [ClinicalNotes] Request completed successfully in ${requestDuration}ms`,
      );

      // Return the complete note as JSON
      res.json({
        note: clinicalNote,
        noteType,
        patientId: parseInt(patientId),
        encounterId,
        templateId,
        generatedAt: new Date().toISOString(),
        processingTimeMs: requestDuration,
      });
    } catch (error: any) {
      const requestDuration = Date.now() - requestStart;
      console.error(
        `❌ [ClinicalNotes] Error generating ${req.body.noteType || "soap"} note after ${requestDuration}ms:`,
        {
          error: error.message,
          stack: error.stack,
          requestBody: req.body,
          userId: (req as any).user?.id,
        },
      );
      res.status(500).json({
        message: `Failed to generate ${req.body.noteType || "soap"} note`,
        error: error.message,
        processingTimeMs: requestDuration,
      });
    }
  });

  // Legacy SOAP endpoint - redirects to unified system for backward compatibility
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
        `🩺 [LegacySOAP] Redirecting to unified system for patient ${patientId}, encounter ${encounterId}`,
      );

      // Generate SOAP note using unified system
      const soapNote = await generateClinicalNote(
        "soap",
        parseInt(patientId),
        encounterId,
        transcription,
      );

      // Return the complete SOAP note as JSON (maintain legacy response format)
      res.json({
        soapNote,
        patientId: parseInt(patientId),
        encounterId,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ [LegacySOAP] Error in legacy endpoint:", error);
      res.status(500).json({
        message: "Failed to generate SOAP note",
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
            message:
              "No SOAP note found for this encounter. Please save a SOAP note first.",
          });
        }

        console.log(
          `📋 [ExtractOrders] Starting order extraction for encounter ${encounterId}`,
        );

        // Import and use the SOAPOrdersExtractor
        const { SOAPOrdersExtractor } = await import(
          "./soap-orders-extractor.js"
        );
        const extractor = new SOAPOrdersExtractor();

        // Extract orders from the SOAP note (this now includes deduplication)
        const deduplicatedOrders = await extractor.extractOrders(
          encounter.note,
          encounter.patientId,
          encounterId,
        );

        console.log(
          `📋 [ExtractOrders] Extracted and deduplicated ${deduplicatedOrders.length} orders`,
        );

        // Clear existing draft orders since GPT has determined the final reconciled set
        console.log(
          `📋 [ExtractOrders] Clearing existing draft orders - GPT reconciled to ${deduplicatedOrders.length} final orders`,
        );
        const existingDraftOrders =
          await storage.getDraftOrdersByEncounter(encounterId);
        console.log(
          `📋 [ExtractOrders] Found ${existingDraftOrders.length} existing orders to delete`,
        );

        for (const existingOrder of existingDraftOrders) {
          try {
            await storage.deleteOrder(existingOrder.id);
            console.log(
              `📋 [ExtractOrders] Successfully deleted order ${existingOrder.id}`,
            );
          } catch (error) {
            console.error(
              `📋 [ExtractOrders] Error deleting order ${existingOrder.id}:`,
              error,
            );
            // Continue with other orders even if one fails
          }
        }

        // Save the deduplicated orders
        const savedOrders = [];
        for (const orderData of deduplicatedOrders) {
          try {
            const savedOrder = await storage.createOrder({
              ...orderData,
              providerId: orderData.providerId || (req.user as any).id,
            });
            savedOrders.push(savedOrder);
          } catch (error: any) {
            console.error("❌ [ExtractOrders] Failed to save order:", error);
            // Continue with other orders even if one fails
          }
        }

        console.log(
          `📋 [ExtractOrders] Successfully saved ${savedOrders.length} deduplicated orders`,
        );

        res.json({
          message: "Orders extracted and saved successfully",
          ordersCount: savedOrders.length,
          orders: savedOrders,
        });
      } catch (error: any) {
        console.error(
          "❌ [ExtractOrders] Error extracting orders from SOAP:",
          error,
        );
        res.status(500).json({
          message: "Failed to extract orders from SOAP note",
          error: error.message,
        });
      }
    },
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
  app.get("/api/encounters/:encounterId", tenantIsolation, async (req, res) => {
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
    tenantIsolation,
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
            message: "Transcription is required to generate SOAP note",
          });
        }

        console.log(
          `🔄 [GenerateSOAP] Generating SOAP note from transcription for encounter ${encounterId}`,
        );

        // Generate SOAP note using direct API call
        const soapNote = await generateSOAPNoteDirect(
          patientId,
          encounterId.toString(),
          transcription,
        );

        if (!soapNote.trim()) {
          throw new Error("Failed to generate SOAP note content");
        }

        console.log(
          `✅ [GenerateSOAP] SOAP note generated and saved for encounter ${encounterId}`,
        );

        res.json({
          soapNote,
          message: "SOAP note generated successfully from transcription",
          encounterId,
          patientId,
        });
      } catch (error: any) {
        console.error(
          "❌ [GenerateSOAP] Error generating SOAP from transcription:",
          error,
        );
        res.status(500).json({
          message: "Failed to generate SOAP note from transcription",
          error: error.message,
        });
      }
    },
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

  // Save transcription for encounter (automatic saving during recording)
  app.put(
    "/api/patients/:id/encounters/:encounterId/transcription",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const { transcriptionRaw, transcriptionProcessed } = req.body;

        if (!transcriptionRaw && !transcriptionProcessed) {
          return res
            .status(400)
            .json({ message: "Transcription content is required" });
        }

        console.log(
          `🎤 [Transcription] Auto-saving transcription for encounter ${encounterId}`,
          `Raw: ${transcriptionRaw?.length || 0} chars, Processed: ${transcriptionProcessed?.length || 0} chars`,
        );

        // Save transcription to encounter
        await storage.updateEncounter(encounterId, {
          transcriptionRaw: transcriptionRaw || null,
          transcriptionProcessed: transcriptionProcessed || null,
        });

        console.log(
          `✅ [Transcription] Transcription auto-saved for encounter ${encounterId}`,
        );

        res.json({
          message: "Transcription saved successfully",
          encounterId,
          patientId,
          savedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("❌ [Transcription] Error saving transcription:", error);
        res.status(500).json({
          message: "Failed to save transcription",
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

          // Create new diagnosis records with enhanced RCM support
          for (let i = 0; i < diagnoses.length; i++) {
            const diagnosis = diagnoses[i];
            try {
              await storage.createDiagnosis({
                patientId,
                encounterId,
                diagnosis: diagnosis.diagnosis,
                icd10Code: diagnosis.icd10Code,
                diagnosisDate: new Date().toISOString().split("T")[0],
                status: diagnosis.isPrimary ? "active" : "active",
                notes: `Updated via CPT codes interface on ${new Date().toISOString()}`,

                // Enhanced RCM billing workflow fields
                isPrimary: diagnosis.isPrimary || false,
                diagnosisPointer: String.fromCharCode(65 + i), // A, B, C, D for claim linking
                billingSequence: i + 1,
                claimSubmissionStatus: "pending",
                medicalNecessityDocumented: true, // AI-generated = documented
                priorAuthorizationRequired: false, // Default - can be updated by billing staff

                // Automatic modifier application from CPT codes if available
                modifierApplied:
                  cptCodes
                    ?.find((cpt) => cpt.modifiers && cpt.modifiers.length > 0)
                    ?.modifiers?.join(", ") || null,
              });

              console.log(
                `✅ [CPT API] Created diagnosis with RCM fields: ${diagnosis.diagnosis} (${diagnosis.icd10Code})`,
              );
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

  // Enhanced RCM billing workflow routes
  app.put("/api/diagnoses/:diagnosisId/rcm-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const diagnosisId = parseInt(req.params.diagnosisId);
      const updates = req.body;

      console.log(
        `💰 [RCM API] Updating billing status for diagnosis ${diagnosisId}`,
      );

      const updatedDiagnosis = await storage.updateDiagnosisRCMStatus(
        diagnosisId,
        updates,
      );

      res.json({
        message: "Diagnosis billing status updated successfully",
        diagnosis: updatedDiagnosis,
      });
    } catch (error: any) {
      console.error("❌ [RCM API] Error updating diagnosis status:", error);
      res.status(500).json({
        message: "Failed to update diagnosis billing status",
        error: error.message,
      });
    }
  });

  app.get("/api/diagnoses/claims", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { status } = req.query;
      const diagnoses = await storage.getDiagnosesForClaims(status as string);

      res.json(diagnoses);
    } catch (error: any) {
      console.error("❌ [RCM API] Error fetching claims diagnoses:", error);
      res.status(500).json({
        message: "Failed to fetch claims diagnoses",
        error: error.message,
      });
    }
  });

  app.get("/api/diagnoses/payer/:payerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { payerId } = req.params;
      const diagnoses = await storage.getDiagnosesByPayer(payerId);

      res.json(diagnoses);
    } catch (error: any) {
      console.error("❌ [RCM API] Error fetching payer diagnoses:", error);
      res.status(500).json({
        message: "Failed to fetch payer diagnoses",
        error: error.message,
      });
    }
  });

  // Get billing summary for encounter (for EMR billing integration)
  app.get(
    "/api/patients/:id/encounters/:encounterId/billing-summary",
    tenantIsolation,
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        const patientId = parseInt(req.params.id);
        const encounterId = parseInt(req.params.encounterId);
        const healthSystemId = req.userHealthSystemId!;

        const encounter = await storage.getEncounter(encounterId);
        const patient = await storage.getPatient(patientId, healthSystemId);
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

  // Test endpoint to manually trigger medication processing
  app.post("/api/test/process-medications/:encounterId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);
      const { patientId } = req.body;

      console.log(
        `🧪 [TEST] Manually triggering medication processing for encounter ${encounterId}, patient ${patientId}`,
      );

      const { medicationDelta } = await import("./medication-delta-service.js");
      const result = await medicationDelta.processOrderDelta(
        patientId,
        encounterId,
        req.user!.id,
      );

      res.json({
        message: "Medication processing triggered",
        result,
      });
    } catch (error: any) {
      console.error("❌ [TEST] Error in test medication processing:", error);
      res.status(500).json({ error: error.message });
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

      const order = await storage.createOrder({
        ...standardizedOrder,
        providerId: (req.user as any).id,
      });
      console.log("[Orders API] Created enhanced order:", order);

      // Trigger medication processing for medication orders
      if (order.orderType === "medication" && order.encounterId) {
        console.log(
          `💊 [Orders API] Triggering medication processing for new medication order ${order.id}`,
        );
        try {
          const { medicationDelta } = await import(
            "./medication-delta-service.js"
          );
          await medicationDelta.processOrderDelta(
            order.patientId,
            order.encounterId,
            req.user!.id,
          );
          console.log(
            `✅ [Orders API] Medication processing completed for order ${order.id}`,
          );
        } catch (medicationError) {
          console.error(
            `❌ [Orders API] Medication processing failed for order ${order.id}:`,
            medicationError,
          );
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
        orders.map((orderData) => storage.createOrder({
          ...orderData,
          orderedBy: (req.user as any).id,
          providerId: (req.user as any).id,
        })),
      );

      // Process medication orders if any were created
      const medicationOrders = createdOrders.filter(
        (order) => order.orderType === "medication",
      );
      if (medicationOrders.length > 0) {
        console.log(
          `💊 [Orders API] Processing ${medicationOrders.length} medication orders from batch`,
        );

        // Group by encounter to trigger processing once per encounter
        const encounterGroups = medicationOrders.reduce(
          (groups, order) => {
            if (order.encounterId) {
              if (!groups[order.encounterId]) {
                groups[order.encounterId] = {
                  patientId: order.patientId,
                  orders: [],
                };
              }
              groups[order.encounterId].orders.push(order);
            }
            return groups;
          },
          {} as Record<number, { patientId: number; orders: any[] }>,
        );

        // Process each encounter's medications
        for (const [
          encounterId,
          { patientId, orders: encounterOrders },
        ] of Object.entries(encounterGroups)) {
          try {
            console.log(
              `💊 [Orders API] Processing ${encounterOrders.length} medication orders for encounter ${encounterId}`,
            );
            const { medicationDelta } = await import(
              "./medication-delta-service.js"
            );
            await medicationDelta.processOrderDelta(
              patientId,
              parseInt(encounterId),
              req.user!.id,
            );
            console.log(
              `✅ [Orders API] Medication processing completed for encounter ${encounterId}`,
            );
          } catch (medicationError) {
            console.error(
              `❌ [Orders API] Medication processing failed for encounter ${encounterId}:`,
              medicationError,
            );
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
  app.delete(
    "/api/patients/:patientId/draft-orders",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return APIResponseHandler.unauthorized(res);
      }

      const patientId = parseInt(req.params.patientId);

      if (isNaN(patientId)) {
        return APIResponseHandler.badRequest(res, "Invalid patient ID");
      }

      console.log(
        `[Orders API] Deleting all draft orders for patient ${patientId}`,
      );

      await storage.deleteAllPatientDraftOrders(patientId);

      console.log(
        `[Orders API] Successfully deleted all draft orders for patient ${patientId}`,
      );

      return APIResponseHandler.success(res, {
        message: "All draft orders deleted successfully",
        patientId,
      });
    }),
  );

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
        providerId: (req.user as any).id,
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

      // Convert date strings to Date objects for timestamp fields
      const dateFields = ['orderDate', 'startDate', 'endDate', 'orderedAt', 'approvedAt'];
      for (const field of dateFields) {
        if (cleanedUpdates[field] && typeof cleanedUpdates[field] === 'string') {
          try {
            cleanedUpdates[field] = new Date(cleanedUpdates[field]);
          } catch (e) {
            console.warn(`⚠️ [Orders API] Invalid date format for ${field}: ${cleanedUpdates[field]}`);
            delete cleanedUpdates[field]; // Remove invalid date fields
          }
        }
      }

      console.log(
        `[Orders API] Cleaned update data:`,
        JSON.stringify(cleanedUpdates, null, 2),
      );

      // CRITICAL SAFETY: Validate medication orders before saving
      if (cleanedUpdates.orderType === "medication" || cleanedUpdates.medicationName) {
        console.log(`💊 [Orders API] Validating medication order ${orderId} before update`);
        
        // Get current order to merge with updates
        const currentOrder = await storage.getOrder(orderId);
        const mergedOrder = { ...currentOrder, ...cleanedUpdates };
        
        // Map frontend field names to backend validation field names
        const medicationForValidation = {
          medicationName: mergedOrder.medicationName,
          strength: mergedOrder.strength || mergedOrder.dosage,  // Frontend uses 'dosage'
          dosageForm: mergedOrder.form || mergedOrder.dosageForm,
          sig: mergedOrder.sig,
          quantity: mergedOrder.quantity,
          quantityUnit: mergedOrder.quantityUnit || mergedOrder.quantity_unit,
          refills: mergedOrder.refills,
          daysSupply: mergedOrder.daysSupply,
          route: mergedOrder.route || mergedOrder.routeOfAdministration  // Frontend uses 'routeOfAdministration'
        };
        
        console.log(`💊 [Orders API] Medication data for validation:`, medicationForValidation);
        
        // Validate medication fields
        const { MedicationStandardizationService } = await import("./medication-standardization-service.js");
        const validation = MedicationStandardizationService.validateMedication(medicationForValidation);
        
        if (!validation.isValid) {
          console.error(`❌ [Orders API] Medication validation failed:`, validation.errors);
          return res.status(400).json({ 
            message: "Medication order validation failed",
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
        
        // Ensure quantity_unit is set for medication orders
        if (!cleanedUpdates.quantityUnit && !cleanedUpdates.quantity_unit && !currentOrder.quantityUnit) {
          cleanedUpdates.quantityUnit = "tablets"; // Default to tablets if not specified
          console.warn(`⚠️ [Orders API] No quantity unit specified, defaulting to 'tablets'`);
        }
      }

      let order;
      try {
        order = await storage.updateOrder(orderId, cleanedUpdates);
        console.log(`[Orders API] Successfully updated order ${orderId}`);
      } catch (storageError: any) {
        console.error(`❌ [Orders API] Storage update failed for order ${orderId}:`, storageError);
        console.error(`❌ [Orders API] Error details:`, {
          message: storageError.message,
          stack: storageError.stack,
          cleanedUpdates: JSON.stringify(cleanedUpdates, null, 2)
        });
        
        // Check if it's the toLowerCase error and provide more helpful message
        if (storageError.message?.includes('toLowerCase')) {
          return res.status(400).json({
            message: "Failed to update order - invalid field format",
            error: "One or more fields have invalid data types. Please check all fields are properly formatted.",
            details: storageError.message
          });
        }
        
        throw storageError; // Re-throw for general error handling
      }

      // If this is a medication order, trigger medication synchronization
      if (order.orderType === "medication") {
        console.log(
          `💊 [Orders API] Triggering medication synchronization for updated medication order ${orderId}`,
        );
        try {
          const { medicationDelta } = await import(
            "./medication-delta-service.js"
          );
          await medicationDelta.syncMedicationWithOrder(orderId);
          console.log(
            `✅ [Orders API] Medication synchronization completed for updated order ${orderId}`,
          );
        } catch (medicationError) {
          console.error(
            `❌ [Orders API] Medication synchronization failed for updated order ${orderId}:`,
            medicationError,
          );
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
      console.log(
        `[Orders API] Deleting order ${orderId} with cascading deletion`,
      );

      // Use storage method that handles cascading deletion
      await storage.deleteOrderWithCascade(orderId);
      console.log(
        `[Orders API] Successfully deleted order ${orderId} with cascade`,
      );

      res.status(204).send();
    } catch (error: any) {
      console.error("[Orders API] Error deleting order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parse natural language text into structured order data (mixed types)
  app.post("/api/orders/parse-ai-text", tenantIsolation, async (req, res) => {
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

      // Enhanced prompt to parse mixed order types with medical intelligence
      const prompt = `You are an expert physician's clinical decision support AI. Parse and interpret medical orders from this input: "${text}"

CRITICAL: You must interpret queries intelligently and provide complete, clinically appropriate orders.

Return a JSON object with arrays for each order type found:
{
  "medications": [
    {
      "medication_name": "PROPER CASE medication name (e.g., Aspirin, Lisinopril, Hydrochlorothiazide)",
      "dosage": "strength only (e.g., 10 mg, 25 mg, 81 mg)", 
      "sig": "standardized patient instructions using tablet/capsule count, NOT strength amount",
      "quantity": number,
      "quantity_unit": "ALWAYS provide the appropriate unit (e.g., tablets, capsules, mL, units, pens, vials, grams, patches, inhalers)",
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

INTELLIGENT INTERPRETATION RULES:
For any input, always output the specific, actionable clinical orders required for safe, guideline-based care (no matter how shorthand or partial the physician's input). Treat every input as though you are writing for an intern who is new and requires explicit instructions. Do not output any order as a non-expanded phrase or partial instruction.

If an order, symptom, or abbreviation is unknown or ambiguous, use your medical knowledge and clinical context to infer the most likely desired orders in line with outpatient primary care best practice. If more than one workup is possible, choose the most common/likely for an outpatient adult patient.

For any query with "workup", "w/u", "full workup", "evaluation for", "symptom workup/eval" (e.g. "polyarthritis workup", "fatigue w/u", "confusion eval", "anemia workup"), you MUST expand into individual, clinically appropriate lab tests and diagnostic studies in the JSON—do NOT just restate the phrase.

Note: The following example mappings are illustrative, not exhaustive. For novel or unfamiliar queries, always use clinical reasoning and best practices to generate complete, appropriate orders—even if not specifically shown below.

1. MEDICATION QUERIES:

Quick Medication Queries:
- "metop succ max dose" → Metoprolol Succinate 200 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "atorva 40 titrate up" → Atorvastatin 80 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "lantus starter dose DM2" → Insulin Glargine 10 units subcutaneous at bedtime, 1 vial (10mL), 2 refills
- "increase sertraline to 100" → Sertraline 100 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "duloxetine for fibromyalgia, start low" → Duloxetine 30 mg, Take 1 capsule by mouth once daily, 30 qty, 2 refills
- "switch lisinopril to losartan, equivalent dose" → Losartan 50 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills

Partial Names/Abbreviations:
- "HCTZ 25mg" → Hydrochlorothiazide 25 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "metf 500 BID" → Metformin 500 mg, Take 1 tablet by mouth twice daily, 60 qty, 2 refills
- "amlo 10" → Amlodipine 10 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "GLP1 for T2DM" → Semaglutide 0.25 mg subcutaneous weekly, 4 pens (1 month supply), 2 refills
- "rosuv 20" → Rosuvastatin 20 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills

Starter Doses:
- "start SSRI for depression" → Escitalopram 10 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "start allopurinol for gout ppx" → Allopurinol 100 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "antihypertensive, start ACEI" → Lisinopril 10 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills
- "T2DM: start metformin low dose" → Metformin 500 mg, Take 1 tablet by mouth once daily, 30 qty, 2 refills

Complex Regimens:
- "HFpEF triple therapy" → 
  * Furosemide 40 mg once daily
  * Metoprolol Succinate 50 mg once daily  
  * Spironolactone 25 mg once daily
- "T2DM, metformin+GLP1+SGLT2 combo" →
  * Metformin 1000 mg twice daily
  * Semaglutide 0.5 mg weekly
  * Empagliflozin 10 mg once daily
- "anticoagulate a.fib, DOAC starter" → Apixaban 5 mg, Take 1 tablet by mouth twice daily, 60 qty, 2 refills

Short-term Medications (ALWAYS override 30-day default when duration is specified):
- "zpak for sinusitis" → Azithromycin 250 mg, Day 1: Take 2 tablets, Days 2-5: Take 1 tablet daily, 6 tablets total, 0 refills
- "pred burst for asthma flare" → Prednisone 40 mg, Take 1 tablet by mouth once daily for 5 days, 5 tablets, 0 refills
- "prednisone 50mg daily for 5 days" → Prednisone 50 mg, Take 1 tablet by mouth once daily for 5 days, 5 tablets, 0 refills
- "augmentin 875 for dog bite" → Amoxicillin-Clavulanate 875-125 mg, Take 1 tablet by mouth twice daily for 7 days, 14 tablets, 0 refills
- "TMP-SMX UTI tx" → Trimethoprim-Sulfamethoxazole DS, Take 1 tablet by mouth twice daily for 3 days, 6 tablets, 0 refills
- "methylprednisolone pack" → Methylprednisolone 4 mg, Take as directed by taper schedule, 21 tablets, 0 refills

2. LAB TEST QUERIES:
Quick Lab Panels:
- "DM2 labs" → HbA1c, Fasting Glucose, Comprehensive Metabolic Panel, Lipid Panel, Urine Microalbumin
- "thyroid panel" → TSH, Free T4, Free T3
- "cholesterol screen" → Lipid Panel
- "CBC, CMP, TSH" → Complete Blood Count, Comprehensive Metabolic Panel, Thyroid Stimulating Hormone

Follow-up Labs After Abnormalities:
- "repeat TSH in 6wks after levothyroxine start" → TSH (6 weeks follow-up)
- "Hep B surface ab after vaccine" → Hepatitis B Surface Antibody
- "ferritin/iron studies after low Hgb" → Iron Panel (Iron, TIBC, Ferritin, Transferrin Saturation)
- "monitor K+ with spironolactone start" → Basic Metabolic Panel
- "HIV confirmatory after screen+" → HIV-1/HIV-2 Differentiation Assay
- "Hep C antibody positive patient, next test to further evaluate" → Hepatitis C RNA Quantitative

Screening Labs:
- "annual HIV screen" → HIV 1/2 Antigen/Antibody Combo
- "Hep C screen at age 50" → Hepatitis C Antibody
- "PSA in 52yo male" → Prostate Specific Antigen
- "A1c for DM2 screen" → Hemoglobin A1c
- "syphilis test for STD exposure" → RPR with Reflex to Titer

Diagnostic Workup for Symptoms:
- "Full workup fatigue" → CBC with differential, CMP, TSH, Ferritin, B12, Vitamin D 25-OH
- "chest pain w/u" → Troponin I, EKG, D-dimer (if PE suspected)
- "polyarthritis w/u" → ESR, CRP, RF, Anti-CCP, ANA, Uric Acid, Lyme Antibody
- "anemia workup" → CBC with differential, Reticulocyte Count, Iron Studies, Haptoglobin, LDH, B12, Folate

3. IMAGING QUERIES:
Shortcut Phrases:
- "CXR PA/lat" → Chest X-ray PA and lateral
- "knee XR, 3 views" → Knee X-ray, 3 views (AP, lateral, sunrise)
- "ankle MRI no contrast" → Ankle MRI without contrast
- "CT abd/pelvis w/ contrast" → CT Abdomen/Pelvis with contrast
- "head CT for new HA" → CT Head without contrast

Appropriate Imaging for Symptoms:
- "acute low back pain, XR only if red flags" → Lumbar Spine X-ray 
- "persistent cough/hemoptysis, CXR" → Chest X-ray PA and lateral
- "first time seizure, brain MRI" → Brain MRI with and without contrast
- "recurrent UTI, renal US" → Renal Ultrasound
- "chest pain imaging" → Chest X-ray PA and lateral
- "Pulmonary embolism rule out" → CT Chest with PE protocol
- "Kidney stones" → CT Abdomen/Pelvis without contrast

Contrast Decisions:
- "abdominal CT, no contrast if renal dz" → CT Abdomen/Pelvis without contrast
- "brain MRI w/ and w/o contrast for new mass" → Brain MRI with and without contrast
- "liver MRI for lesion, with contrast" → Liver MRI with contrast

4. REFERRAL QUERIES:
Common Referral Patterns:
- "rheum eval for polyarthritis" → Rheumatology referral
- "ENDO for TSH >10" → Endocrinology referral 
- "GI for colonoscopy, FOBT+" → Gastroenterology referral
- "ENT referral, chronic sinusitis" → ENT (Otolaryngology) referral
- "ortho for knee pain w/ meniscal tear on MRI" → Orthopedic Surgery referral

Specialty Referrals:
- "neuro for new onset seizures" → Neurology referral
- "cards for CHF management" → Cardiology referral
- "derm for eval skin lesion" → Dermatology referral
- "pulm for abnormal PFTs" → Pulmonology referral
- "urology for hematuria" → Urology referral
- "Depression management" → Psychiatry referral
- "Memory concerns" → Neurology referral

5. COMPLEX MULTI-ORDER QUERIES:
- "full thyroid workup" → TSH, Free T4, TPO Antibody, consider ultrasound if goiter/nodules, consider Endocrinology referral
- "pre-op eval DM2" → CBC, CMP, HbA1c, EKG, Chest X-ray, discontinue metformin instructions, anesthesia consult
- "chronic cough w/u" → Chest X-ray, Spirometry, PPD, consider sinus CT if postnasal drip suspected, PPI trial
- "unintentional weight loss workup" → CBC, CMP, TSH, UA, Chest X-ray, Iron studies, FOBT, CT Abdomen/Pelvis, consider GI/Onc referrals
- "HIV f/u after positive screen" → HIV-1/HIV-2 Differentiation Assay, CD4 count, HIV Viral Load, Hepatitis panel, TB screen, STI panel, start ART, ID referral
- "DM2 diagnosis" → A1c, Fasting glucose, Urine microalbumin, Lipid panel, Creatinine, Start metformin, LFTs for metformin safety, CDE referral, eye exam referral, diabetic foot exam
- "CHF new diagnosis" → Chest X-ray, Echo, EKG, BNP, CBC, BMP, start ACEI/BB/spironolactone, low sodium diet education, Cardiology referral

MEDICAL ABBREVIATIONS:
- Common abbreviations: CMP, CBC, CXR, UA, A1c, TSH, FT4, EKG, CPK, LFTs, PFTs
- Frequency: BID (twice daily), TID (three times daily), qHS (at bedtime), PRN (as needed)
- Clinical terms: f/u (follow-up), w/u (workup), PPX (prophylaxis), s/p (status post), r/o (rule out)
- Specialties: ENDO (endocrinology), GI (gastroenterology), ENT (ear/nose/throat), ID (infectious disease)
- Conditions: DM2 (type 2 diabetes), CHF (congestive heart failure), HTN (hypertension), a.fib (atrial fibrillation)
- Medications: ACEI (ACE inhibitor), BB (beta blocker), SSRI (selective serotonin reuptake inhibitor), PPI (proton pump inhibitor), DOAC (direct oral anticoagulant)

MEDICATION DEFAULTS:
- Default to 90-day TOTAL supply (including refills) unless duration specified
- For once daily: 30 tablets with 2 refills (30+30+30=90 day supply)
- For twice daily: 60 tablets with 2 refills (60+60+60=180 tablets)
- For three times daily: 90 tablets with 2 refills (90+90+90=270 tablets)
- For antibiotics or short courses: exact quantity with 0 refills
- Always use generic names unless brand specifically requested
- Include appropriate form (tablet, capsule, liquid) based on medication

LAB DEFAULTS:
- Priority: "routine" unless specified
- Fasting: true for lipid panels, glucose tests; false otherwise
- Specimen type: "blood" for most tests unless otherwise appropriate
- Lab name: leave blank to use default lab

CRITICAL: Always provide complete, validated orders that a physician would actually prescribe. Never output partial orders like "max dose" without the actual dosage. Interpret queries intelligently - physicians often use shorthand but expect complete orders.`;

      console.log(
        `[AI Parser] Sending request to OpenAI for multi-type parsing`,
      );

      // Parse multiple order types using GPT-4.1-nano for efficient bulk processing
      // Purpose: Cost-effective model for parsing mixed medical orders (medications, labs, imaging, referrals)
      // Uses structured JSON output for reliable data extraction from free-text medical orders
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
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
        max_tokens: 30000,
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

  // Single-type parser endpoint removed - all manual orders now use multi-type AI parser at /api/orders/parse-ai-text

  // Update encounter status
  app.put("/api/encounters/:encounterId/status", tenantIsolation, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Validate status values
      const validStatuses = [
        "in_progress",
        "pending_review",
        "completed",
        "signed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Update encounter status
      const updatedEncounter = await storage.updateEncounter(encounterId, {
        encounterStatus: status,
        updatedAt: new Date(),
      });

      console.log(
        `✅ [Encounter Status] Updated encounter ${encounterId} to status: ${status}`,
      );

      res.json({
        success: true,
        encounter: updatedEncounter,
        message: `Encounter status updated to ${status}`,
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

      console.log(`\n🎯 [Order Signing] Starting sign process for order ${orderId}`);

      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Log all fields of the order object
      console.log(`📋 [Order Signing] Complete order object keys:`, Object.keys(order));
      console.log(`📋 [Order Signing] Order ${orderId} full object:`, JSON.stringify(order, null, 2));

      // Specific field checks
      console.log(`🔍 [Order Signing] Field availability check:`, {
        hasQuantityUnit: 'quantityUnit' in order,
        quantityUnitValue: order.quantityUnit,
        hasQuantity_unit: 'quantity_unit' in order,
        quantity_unitValue: (order as any).quantity_unit,
        typeofQuantityUnit: typeof order.quantityUnit,
        typeofQuantity_unit: typeof (order as any).quantity_unit
      });

      console.log(`🔍 [Order Signing] Order ${orderId} medication fields:`, JSON.stringify({
        orderType: order.orderType,
        medicationName: order.medicationName,
        dosage: order.dosage,
        strength: order.strength,
        form: order.form,
        dosageForm: order.dosageForm,
        routeOfAdministration: order.routeOfAdministration,
        route: order.route,
        quantity: order.quantity,
        quantityUnit: order.quantityUnit,
        quantity_unit: (order as any).quantity_unit,
        sig: order.sig,
        refills: order.refills,
        daysSupply: order.daysSupply
      }, null, 2));

      // Validate medication orders before signing
      if (order.orderType === "medication") {
        console.time(`⏱️ [Order Signing] Total medication validation time`);
        
        // Production EMR Best Practice: Trust real-time validation, don't re-validate during signing
        // The frontend already validates in real-time with red borders on invalid fields
        // Re-validating here causes unnecessary 3-5 second delays
        
        // Quick check for required fields only - no GPT calls
        const requiredFields = [];
        if (!order.medicationName) requiredFields.push("Medication name");
        if (!order.dosage && !order.strength) requiredFields.push("Strength/dosage");
        if (!order.sig) requiredFields.push("Sig (instructions)");
        if (!order.quantity || order.quantity === 0) requiredFields.push("Quantity");
        if (!order.quantityUnit && !order.quantity_unit) requiredFields.push("Quantity unit");
        if (order.refills === undefined || order.refills === null) requiredFields.push("Refills");
        if (!order.daysSupply || order.daysSupply === 0) requiredFields.push("Days supply");
        
        console.timeEnd(`⏱️ [Order Signing] Total medication validation time`);
        
        if (requiredFields.length > 0) {
          console.log(
            `❌ [Order Signing] Missing required fields for medication order ${orderId}:`,
            requiredFields,
          );
          return res.status(400).json({
            error: "Cannot sign order - required fields missing",
            validationErrors: [`Missing required fields: ${requiredFields.join(", ")}`],
            missingFields: requiredFields,
          });
        }
        
        console.log(
          `✅ [Order Signing] Medication order ${orderId} has all required fields - proceeding with signing`,
        );
        
        // Note: Real-time validation in frontend already performed GPT validation
        // Following Epic/Cerner/Athena pattern: validate continuously, sign instantly
      }

      // Update order status and add approval
      const updatedOrder = await storage.updateOrder(orderId, {
        orderStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        providerNotes: signatureNote
          ? `${order.providerNotes || ""}\n\nSignature Note: ${signatureNote}`
          : order.providerNotes,
      });

      console.log(
        `✅ [Order Signing] Signed ${order.orderType} order ${orderId} by user ${userId}`,
      );

      // For medication orders, activate pending medications
      if (order.orderType === "medication") {
        try {
          const { medicationDelta } = await import(
            "./medication-delta-service.js"
          );

          await medicationDelta.signMedicationOrders(
            order.encounterId || 0,
            [orderId],
            userId,
          );

          console.log(
            `✅ [IndividualSign] Successfully activated medication order ${orderId}`,
          );
        } catch (medicationError) {
          console.error(
            `❌ [IndividualSign] Failed to activate medication order ${orderId}:`,
            medicationError,
          );
          // Continue with response even if activation fails
        }
      }

      // MOVED: Production system processing now happens after delivery preference check
      // This ensures lab orders only get processed through lab system when delivery method requires it

      // Check delivery preferences and generate PDF only if needed
      console.log(`📋 [IndividualSign] ===== DELIVERY PREFERENCE CHECK =====`);
      console.log(
        `📋 [IndividualSign] Order details: ID=${orderId}, Type=${order.orderType}, Patient=${order.patientId}`,
      );

      let shouldGeneratePDF = false;
      let deliveryMethod = "mock_service";
      let deliveryEndpoint = "Mock Lab Service";

      console.log(
        `📋 [IndividualSign] Initial values: shouldGeneratePDF=${shouldGeneratePDF}, deliveryMethod=${deliveryMethod}`,
      );

      try {
        // Get patient delivery preferences
        console.log(
          `📋 [IndividualSign] About to query patient preferences`,
        );

        console.log(
          `📋 [IndividualSign] Querying preferences for patient ${order.patientId}`,
        );
        const preferences = await db
          .select()
          .from(patientOrderPreferences)
          .where(eq(patientOrderPreferences.patientId, order.patientId))
          .limit(1);

        const prefs = preferences[0];
        console.log(
          `📋 [IndividualSign] Raw preferences query result:`,
          JSON.stringify(preferences),
        );
        console.log(
          `📋 [IndividualSign] Selected preferences:`,
          JSON.stringify(prefs),
        );

        // Determine delivery method based on order type and preferences
        console.log(
          `📋 [IndividualSign] Processing order type: ${order.orderType}`,
        );

        switch (order.orderType) {
          case "lab":
            console.log(
              `📋 [IndividualSign] LAB ORDER - Raw pref: ${prefs?.labDeliveryMethod}`,
            );
            deliveryMethod = prefs?.labDeliveryMethod || "mock_service";
            shouldGeneratePDF = deliveryMethod === "print_pdf";
            deliveryEndpoint =
              deliveryMethod === "mock_service"
                ? "Mock Lab Service"
                : deliveryMethod === "real_service"
                  ? prefs?.labServiceProvider || "External Lab Service"
                  : "PDF Generation";
            console.log(
              `📋 [IndividualSign] LAB ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}, endpoint=${deliveryEndpoint}`,
            );
            break;

          case "imaging":
            console.log(
              `📋 [IndividualSign] IMAGING ORDER - Raw pref: ${prefs?.imagingDeliveryMethod}`,
            );
            deliveryMethod = prefs?.imagingDeliveryMethod || "mock_service";
            shouldGeneratePDF = deliveryMethod === "print_pdf";
            deliveryEndpoint =
              deliveryMethod === "mock_service"
                ? "Mock Imaging Service"
                : deliveryMethod === "real_service"
                  ? prefs?.imagingServiceProvider || "External Imaging Service"
                  : "PDF Generation";
            console.log(
              `📋 [IndividualSign] IMAGING ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}, endpoint=${deliveryEndpoint}`,
            );
            break;

          case "medication":
            console.log(
              `📋 [IndividualSign] MEDICATION ORDER - Raw pref: ${prefs?.medicationDeliveryMethod}`,
            );
            deliveryMethod =
              prefs?.medicationDeliveryMethod || "preferred_pharmacy";
            shouldGeneratePDF = deliveryMethod === "print_pdf" || deliveryMethod === "fax";
            
            if (deliveryMethod === "preferred_pharmacy") {
              deliveryEndpoint = prefs?.preferredPharmacy || "Preferred Pharmacy";
            } else if (deliveryMethod === "fax") {
              deliveryEndpoint = `Fax: ${prefs?.pharmacyFax || "Pharmacy Fax"}`;
            } else {
              deliveryEndpoint = "PDF Generation";
            }
            
            console.log(
              `📋 [IndividualSign] MEDICATION ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}, endpoint=${deliveryEndpoint}`,
            );
            break;

          default:
            console.log(
              `📋 [IndividualSign] UNKNOWN ORDER TYPE - Defaulting to PDF`,
            );
            shouldGeneratePDF = true;
        }

        console.log(`📋 [IndividualSign] ===== FINAL DECISION =====`);
        console.log(
          `📋 [IndividualSign] Order ${orderId}: Type=${order.orderType}, Method=${deliveryMethod}, Endpoint=${deliveryEndpoint}, Generate PDF=${shouldGeneratePDF}`,
        );

        // Record signed order with delivery details
        const { signedOrders } = await import("../shared/schema.js");

        const signedOrderData = {
          orderId: order.id,
          patientId: order.patientId,
          encounterId: order.encounterId,
          orderType: order.orderType,
          deliveryMethod: deliveryMethod,
          originalDeliveryMethod: deliveryMethod, // Add missing required field
          deliveryEndpoint: deliveryEndpoint,
          deliveryStatus: "pending" as const,
          signedAt: new Date(),
          signedBy: userId,
          canChangeDelivery: true,
          deliveryLockReason: null,
          deliveryChanges: [],
          deliveryMetadata: {
            preferences: prefs,
            shouldGeneratePDF: shouldGeneratePDF,
          },
        };

        await db.insert(signedOrders).values(signedOrderData);
        console.log(
          `📋 [IndividualSign] ✅ Recorded delivery preferences for order ${orderId}`,
        );

        // Process ALL orders through production systems for proper pending status
        console.log(
          `🔄 [IndividualSign] Processing ${order.orderType} order ${orderId} through production systems`,
        );
        try {
          if (order.orderType === "lab") {
            console.log(
              `🧪 [IndividualSign] Processing lab order through lab system (delivery method: ${deliveryMethod})`,
            );
            const { LabOrderProcessor } = await import(
              "./lab-order-processor.js"
            );
            await LabOrderProcessor.processSignedLabOrders(
              order.patientId,
              order.encounterId,
              deliveryMethod,
            );
            console.log(
              `✅ [IndividualSign] Successfully processed lab order ${orderId} - will appear as pending`,
            );
          } else if (order.orderType === "imaging") {
            const { ImagingOrderProcessor } = await import(
              "./imaging-order-processor.js"
            );
            await ImagingOrderProcessor.processSignedImagingOrders(
              order.patientId,
              order.encounterId,
            );
            console.log(
              `🩻 [IndividualSign] Processed imaging order ${orderId} through production system`,
            );
          } else if (order.orderType === "referral") {
            const { ReferralOrderProcessor } = await import(
              "./referral-order-processor.js"
            );
            await ReferralOrderProcessor.processSignedReferralOrders(
              order.patientId,
              order.encounterId,
            );
            console.log(
              `👨‍⚕️ [IndividualSign] Processed referral order ${orderId} through production system`,
            );
          }
        } catch (error) {
          console.error(
            `❌ [IndividualSign] Failed to process ${order.orderType} order ${orderId} through production systems:`,
            error,
          );
          console.error(`❌ [IndividualSign] Error stack:`, error.stack);
        }
      } catch (deliveryError) {
        console.error(
          "❌ [IndividualSign] Error checking delivery preferences:",
          deliveryError,
        );
        console.error(
          "❌ [IndividualSign] Error stack:",
          (deliveryError as Error).stack,
        );
        // Fallback to mock service for labs, PDF for others
        if (order.orderType === "lab") {
          shouldGeneratePDF = false;
          deliveryMethod = "mock_service";
          deliveryEndpoint = "Mock Lab Service (Fallback)";
        } else {
          shouldGeneratePDF = true;
          deliveryMethod = "print_pdf";
          deliveryEndpoint = "PDF Generation (Fallback)";
        }
      }

      // Generate PDF only if delivery method requires it
      console.log(`📋 [IndividualSign] ===== PDF GENERATION DECISION =====`);
      console.log(
        `📋 [IndividualSign] shouldGeneratePDF = ${shouldGeneratePDF}`,
      );

      if (shouldGeneratePDF) {
        console.log(`📄 [IndividualSign] ===== PDF GENERATION STARTING =====`);
        console.log(
          `📄 [IndividualSign] Order type: ${order.orderType}, Patient: ${order.patientId}`,
        );

        try {
          const { pdfService } = await import("./pdf-service.js");

          let pdfBuffer: Buffer | null = null;

          if (order.orderType === "medication") {
            console.log(
              `📄 [IndividualSign] Generating medication PDF for order ${orderId}`,
            );
            pdfBuffer = await pdfService.generateMedicationPDF(
              [updatedOrder],
              order.patientId,
              userId,
            );
          } else if (order.orderType === "lab") {
            console.log(
              `📄 [IndividualSign] Generating lab PDF for order ${orderId}`,
            );
            pdfBuffer = await pdfService.generateLabPDF(
              [updatedOrder],
              order.patientId,
              userId,
            );
          } else if (order.orderType === "imaging") {
            console.log(
              `📄 [IndividualSign] Generating imaging PDF for order ${orderId}`,
            );
            pdfBuffer = await pdfService.generateImagingPDF(
              [updatedOrder],
              order.patientId,
              userId,
            );
          } else {
            console.log(
              `📄 [IndividualSign] Unknown order type: ${order.orderType}, skipping PDF generation`,
            );
          }

          if (pdfBuffer) {
            console.log(
              `📄 [IndividualSign] Generated ${order.orderType} PDF for order ${orderId} (${pdfBuffer.length} bytes)`,
            );
            
            // For medication orders with fax delivery method, send the fax
            if (order.orderType === "medication" && deliveryMethod === "fax") {
              console.log(`📠 [IndividualSign] Initiating fax transmission for medication order ${orderId}`);
              
              try {
                const prefs = (await db
                  .select()
                  .from(patientOrderPreferences)
                  .where(eq(patientOrderPreferences.patientId, order.patientId))
                  .limit(1))[0];
                
                const faxNumber = prefs?.pharmacyFax;
                
                if (!faxNumber) {
                  console.error(`📠 [IndividualSign] No fax number found for patient ${order.patientId}`);
                } else {
                  // Import necessary modules
                  const { twilioFaxService } = await import("./twilio-fax-service.js");
                  const { medications, prescriptionTransmissions, electronicSignatures } = await import("../shared/schema.js");
                  
                  // Get medication details
                  const [medication] = await db.select()
                    .from(medications)
                    .where(eq(medications.sourceOrderId, orderId))
                    .limit(1);
                    
                  if (medication) {
                    // Create prescription transmission record
                    const [transmission] = await db.insert(prescriptionTransmissions)
                      .values({
                        medicationId: medication.id,
                        orderId: orderId,
                        patientId: order.patientId,
                        providerId: userId,
                        pharmacyId: null, // No pharmacy record for fax
                        transmissionType: 'new_rx',
                        transmissionMethod: 'fax',
                        status: 'pending',
                        transmittedAt: new Date(), // Set the transmission timestamp
                        statusHistory: [{
                          status: 'pending',
                          timestamp: new Date().toISOString(),
                          note: 'Prescription queued for fax transmission'
                        }],
                        pharmacyResponse: {
                          faxNumber: faxNumber,
                          pharmacyName: prefs?.preferredPharmacy || 'Via Fax'
                        }
                      })
                      .returning();
                    
                    // Send the fax
                    const faxResult = await twilioFaxService.sendFax({
                      to: faxNumber,
                      pdfBuffer,
                      statusCallback: `${process.env.BASE_URL}/api/eprescribing/fax-status`
                    });
                    
                    if (faxResult.success) {
                      // Update transmission record with success
                      await db.update(prescriptionTransmissions)
                        .set({
                          transmissionStatus: 'transmitted',
                          transmittedAt: new Date(),
                          transmissionMetadata: {
                            ...(transmission.transmissionMetadata as any || {}),
                            faxNumber: faxNumber,
                            faxSentAt: new Date().toISOString(),
                            faxStatus: 'sent',
                            faxProvider: 'twilio',
                            faxSid: faxResult.faxSid,
                            pdfData: pdfBuffer.toString('base64')
                          }
                        })
                        .where(eq(prescriptionTransmissions.id, transmission.id));
                        
                      console.log(`✅ [IndividualSign] Fax transmitted successfully for order ${orderId}. Fax SID: ${faxResult.faxSid}`);
                    } else {
                      // Update transmission record with failure
                      await db.update(prescriptionTransmissions)
                        .set({
                          transmissionStatus: 'failed',
                          errorMessage: faxResult.error || 'Fax transmission failed',
                          transmissionMetadata: {
                            ...(transmission.transmissionMetadata as any || {}),
                            faxError: faxResult.error
                          }
                        })
                        .where(eq(prescriptionTransmissions.id, transmission.id));
                        
                      console.error(`❌ [IndividualSign] Fax transmission failed for order ${orderId}: ${faxResult.error}`);
                    }
                  } else {
                    console.error(`❌ [IndividualSign] No medication found for order ${orderId}`);
                  }
                }
              } catch (faxError) {
                console.error(`❌ [IndividualSign] Fax transmission error for order ${orderId}:`, faxError);
              }
            }
          }
        } catch (pdfError) {
          console.error(
            `📄 [IndividualSign] PDF generation failed for order ${orderId}:`,
            pdfError,
          );
        }
      } else {
        console.log(
          `📋 [IndividualSign] PDF generation skipped - delivery method is ${deliveryMethod} to ${deliveryEndpoint}`,
        );
      }

      // DUPLICATE REMOVED - production processing already handled above

      // For medication orders, activate pending medications
      if (order.orderType === "medication") {
        console.log(
          `📋 [IndividualSign] === INDIVIDUAL MEDICATION ORDER SIGNING ===`,
        );
        console.log(
          `📋 [IndividualSign] Order ID: ${orderId}, Type: ${order.orderType}`,
        );
        console.log(
          `📋 [IndividualSign] Medication: ${order.medicationName}, Dosage: ${order.dosage}`,
        );
        console.log(
          `📋 [IndividualSign] Encounter ID: ${order.encounterId}, Patient ID: ${order.patientId}`,
        );

        console.log(`📋 [IndividualSign] User ID: ${userId}`);

        try {
          const { medicationDelta } = await import(
            "./medication-delta-service.js"
          );

          console.log(`📋 [IndividualSign] Calling signMedicationOrders with:`);
          console.log(
            `📋 [IndividualSign] - Encounter: ${order.encounterId || 0}`,
          );
          console.log(`📋 [IndividualSign] - Order IDs: [${orderId}]`);
          console.log(`📋 [IndividualSign] - Provider: ${userId}`);

          await medicationDelta.signMedicationOrders(
            order.encounterId || 0,
            [orderId],
            userId,
          );
          console.log(
            `✅ [IndividualSign] Successfully activated medication: ${order.medicationName}`,
          );
        } catch (medicationError) {
          console.error(
            `❌ [IndividualSign] Failed to activate medication for order ${orderId}:`,
            medicationError,
          );
          console.error(
            `❌ [IndividualSign] Medication error stack:`,
            (medicationError as Error).stack,
          );
          // Continue with response even if activation fails
        }
        console.log(
          `📋 [IndividualSign] === END INDIVIDUAL MEDICATION SIGNING ===`,
        );
      }

      res.json({
        success: true,
        order: updatedOrder,
        message: `${order.orderType} order signed successfully`,
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
            orderStatus: "approved",
            approvedBy: userId,
            approvedAt: new Date(),
            providerNotes: signatureNote
              ? `${order.providerNotes || ""}\n\nBulk Signature Note: ${signatureNote}`
              : order.providerNotes,
          });

          signedOrders.push(updatedOrder);
          console.log(
            `✅ [Bulk Sign] Signed ${order.orderType} order ${orderId}`,
          );
        } catch (error: any) {
          errors.push(`Failed to sign order ${orderId}: ${error.message}`);
        }
      }

      // Activate any medication orders that were signed
      const medicationOrderIds = signedOrders
        .filter((order) => order.orderType === "medication")
        .map((order) => order.id);

      if (medicationOrderIds.length > 0) {
        try {
          const { medicationDelta } = await import(
            "./medication-delta-service.js"
          );
          const encounterId = signedOrders[0]?.encounterId;
          if (encounterId) {
            await medicationDelta.signMedicationOrders(
              encounterId,
              medicationOrderIds,
              userId,
            );
            console.log(
              `📋 [Bulk Sign] Activated ${medicationOrderIds.length} medication orders`,
            );
          }
        } catch (medicationError) {
          console.error(
            `❌ [Bulk Sign] Failed to activate medications:`,
            medicationError,
          );
          // Continue with response even if activation fails
        }
      }

      // Process delivery based on patient preferences
      console.log(
        `📋 [RouteBulkSign] ===== DELIVERY PROCESSING STARTING =====`,
      );
      console.log(
        `📋 [RouteBulkSign] Total signed orders: ${signedOrders.length}`,
      );

      try {
        const { pdfService } = await import("./pdf-service.js");
        const { patientOrderPreferences } = await import("../shared/schema.js");
        const { eq } = await import("drizzle-orm");

        // Group orders by patient to get delivery preferences
        const ordersByPatient = signedOrders.reduce((acc: any, order: any) => {
          if (!acc[order.patientId]) {
            acc[order.patientId] = [];
          }
          acc[order.patientId].push(order);
          return acc;
        }, {});

        console.log(
          `📋 [RouteBulkSign] Processing orders for ${Object.keys(ordersByPatient).length} patients`,
        );

        for (const [patientId, patientOrders] of Object.entries(
          ordersByPatient,
        )) {
          console.log(
            `📋 [RouteBulkSign] Processing ${(patientOrders as any).length} orders for patient ${patientId}`,
          );

          // Get patient delivery preferences
          const preferences = await db
            .select()
            .from(patientOrderPreferences)
            .where(eq(patientOrderPreferences.patientId, parseInt(patientId)))
            .limit(1);

          const prefs = preferences[0];

          // Group orders by type for this patient
          const ordersByType = (patientOrders as any).reduce(
            (acc: any, order: any) => {
              if (!acc[order.orderType]) {
                acc[order.orderType] = [];
              }
              acc[order.orderType].push(order);
              return acc;
            },
            {},
          );

          // Process each order type for this patient
          for (const [orderType, orders] of Object.entries(ordersByType)) {
            let shouldGeneratePDF = false;
            let deliveryMethod =
              orderType === "lab" ? "mock_service" : "print_pdf";
            let deliveryEndpoint =
              orderType === "lab" ? "Mock Lab Service" : "PDF Generation";

            // Determine delivery method based on order type and preferences
            console.log(
              `📋 [RouteBulkSign] Processing ${orderType} orders for patient ${patientId}`,
            );
            console.log(
              `📋 [RouteBulkSign] Raw preferences:`,
              JSON.stringify(prefs),
            );

            switch (orderType) {
              case "lab":
                console.log(
                  `📋 [RouteBulkSign] LAB ORDER - Raw pref: ${prefs?.labDeliveryMethod}`,
                );
                deliveryMethod = prefs?.labDeliveryMethod || "mock_service";
                shouldGeneratePDF = deliveryMethod === "print_pdf";
                deliveryEndpoint =
                  deliveryMethod === "mock_service"
                    ? "Mock Lab Service"
                    : deliveryMethod === "real_service"
                      ? prefs?.labServiceProvider || "External Lab Service"
                      : "PDF Generation";
                console.log(
                  `📋 [RouteBulkSign] LAB ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}`,
                );
                break;

              case "imaging":
                console.log(
                  `📋 [RouteBulkSign] IMAGING ORDER - Raw pref: ${prefs?.imagingDeliveryMethod}`,
                );
                deliveryMethod = prefs?.imagingDeliveryMethod || "print_pdf";
                shouldGeneratePDF = deliveryMethod === "print_pdf";
                deliveryEndpoint =
                  deliveryMethod === "mock_service"
                    ? "Mock Imaging Service"
                    : deliveryMethod === "real_service"
                      ? prefs?.imagingServiceProvider ||
                        "External Imaging Service"
                      : "PDF Generation";
                console.log(
                  `📋 [RouteBulkSign] IMAGING ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}`,
                );
                break;

              case "medication":
                console.log(
                  `📋 [RouteBulkSign] MEDICATION ORDER - Raw pref: ${prefs?.medicationDeliveryMethod}`,
                );
                deliveryMethod =
                  prefs?.medicationDeliveryMethod || "preferred_pharmacy";
                shouldGeneratePDF = deliveryMethod === "print_pdf";
                deliveryEndpoint =
                  deliveryMethod === "preferred_pharmacy"
                    ? prefs?.preferredPharmacy || "Preferred Pharmacy"
                    : "PDF Generation";
                console.log(
                  `📋 [RouteBulkSign] MEDICATION ORDER - Final: method=${deliveryMethod}, shouldPDF=${shouldGeneratePDF}`,
                );
                break;

              default:
                console.log(
                  `📋 [RouteBulkSign] UNKNOWN ORDER TYPE - Defaulting to PDF`,
                );
                shouldGeneratePDF = true;
            }

            console.log(
              `📋 [RouteBulkSign] Patient ${patientId}, ${orderType} orders: Method=${deliveryMethod}, Endpoint=${deliveryEndpoint}, Generate PDF=${shouldGeneratePDF}`,
            );

            // Record signed orders with delivery details
            const { signedOrders: signedOrdersTable } = await import(
              "../shared/schema.js"
            );

            for (const order of orders as any) {
              const signedOrderData = {
                orderId: order.id,
                patientId: order.patientId,
                encounterId: order.encounterId,
                orderType: order.orderType,
                deliveryMethod: deliveryMethod,
                deliveryEndpoint: deliveryEndpoint,
                deliveryStatus: "pending" as const,
                originalDeliveryMethod: deliveryMethod,
                signedAt: new Date(),
                signedBy: userId,
                canChangeDelivery: true,
                deliveryLockReason: null,
                deliveryChanges: [],
                deliveryMetadata: {
                  preferences: prefs,
                  shouldGeneratePDF: shouldGeneratePDF,
                },
              };

              await db.insert(signedOrdersTable).values(signedOrderData);
            }

            // Generate PDF only if delivery method requires it
            console.log(
              `📄 [RouteBulkSign] ===== PDF GENERATION DECISION =====`,
            );
            console.log(
              `📄 [RouteBulkSign] Patient ${patientId}, orderType=${orderType}, shouldGeneratePDF=${shouldGeneratePDF}, deliveryMethod=${deliveryMethod}`,
            );

            if (shouldGeneratePDF) {
              console.log(
                `📄 [RouteBulkSign] Generating ${orderType} PDF for patient ${patientId}`,
              );

              try {
                let pdfBuffer: Buffer | null = null;

                if (orderType === "medication") {
                  console.log(
                    `📄 [RouteBulkSign] Calling generateMedicationPDF with ${orders.length} orders`,
                  );
                  pdfBuffer = await pdfService.generateMedicationPDF(
                    orders,
                    parseInt(patientId),
                    userId,
                  );
                } else if (orderType === "lab") {
                  console.log(
                    `📄 [RouteBulkSign] Calling generateLabPDF with ${orders.length} orders`,
                  );
                  // Debug: Log the orders array structure
                  console.log(
                    `📄 [RouteBulkSign] Orders array type: ${Array.isArray(orders) ? 'array' : typeof orders}`,
                  );
                  console.log(
                    `📄 [RouteBulkSign] First order:`,
                    JSON.stringify(orders[0], null, 2),
                  );
                  
                  // Ensure orders is a proper array
                  const ordersArray = Array.isArray(orders) ? orders : [orders];
                  
                  pdfBuffer = await pdfService.generateLabPDF(
                    ordersArray,
                    parseInt(patientId),
                    userId,
                  );
                } else if (orderType === "imaging") {
                  console.log(
                    `📄 [RouteBulkSign] Calling generateImagingPDF with ${orders.length} orders`,
                  );
                  // Debug: Log the orders array structure
                  console.log(
                    `📄 [RouteBulkSign] Orders array type: ${Array.isArray(orders) ? 'array' : typeof orders}`,
                  );
                  console.log(
                    `📄 [RouteBulkSign] First order:`,
                    JSON.stringify(orders[0], null, 2),
                  );
                  
                  // Ensure orders is a proper array
                  const ordersArray = Array.isArray(orders) ? orders : [orders];
                  
                  pdfBuffer = await pdfService.generateImagingPDF(
                    ordersArray,
                    parseInt(patientId),
                    userId,
                  );
                }

                if (pdfBuffer) {
                  console.log(
                    `📄 [RouteBulkSign] ✅ Generated ${orderType} PDF for patient ${patientId} (${pdfBuffer.length} bytes)`,
                  );
                } else {
                  console.log(
                    `📄 [RouteBulkSign] ⚠️ PDF generation returned null for ${orderType} orders`,
                  );
                }
              } catch (pdfError) {
                console.error(
                  `📄 [RouteBulkSign] ❌ Failed to generate ${orderType} PDF for patient ${patientId}:`,
                  pdfError,
                );
              }
            } else {
              console.log(
                `📋 [RouteBulkSign] ✅ PDF generation skipped for patient ${patientId} ${orderType} orders - delivery method is ${deliveryMethod} to ${deliveryEndpoint}`,
              );
            }

            // Process ALL orders through production systems for proper pending status
            console.log(
              `🔄 [RouteBulkSign] Processing ${orderType} orders through production systems (patient ${patientId})`,
            );
            try {
              if (orderType === "lab") {
                console.log(
                  `🧪 [RouteBulkSign] Processing lab orders through lab system (delivery method: ${deliveryMethod})`,
                );
                const { LabOrderProcessor } = await import(
                  "./lab-order-processor.js"
                );
                await LabOrderProcessor.processSignedLabOrders(
                  parseInt(patientId),
                  (orders as any)[0].encounterId,
                  deliveryMethod,
                );
                console.log(
                  `✅ [RouteBulkSign] Successfully processed ${(orders as any).length} lab orders - will appear as pending`,
                );
              } else if (orderType === "imaging") {
                const { ImagingOrderProcessor } = await import(
                  "./imaging-order-processor.js"
                );
                await ImagingOrderProcessor.processSignedImagingOrders(
                  parseInt(patientId),
                  (orders as any)[0].encounterId,
                );
                console.log(
                  `🩻 [RouteBulkSign] Processed ${(orders as any).length} imaging orders through production system`,
                );
              } else if (orderType === "referral") {
                const { ReferralOrderProcessor } = await import(
                  "./referral-order-processor.js"
                );
                await ReferralOrderProcessor.processSignedReferralOrders(
                  parseInt(patientId),
                  (orders as any)[0].encounterId,
                );
                console.log(
                  `👨‍⚕️ [RouteBulkSign] Processed ${(orders as any).length} referral orders through production system`,
                );
              }
            } catch (error) {
              console.error(
                `❌ [RouteBulkSign] Failed to process ${orderType} orders through production systems:`,
                error,
              );
              console.error(`❌ [RouteBulkSign] Error stack:`, error.stack);
            }
          }
        }

        console.log(
          `📋 [RouteBulkSign] ===== DELIVERY PROCESSING COMPLETED =====`,
        );
      } catch (error) {
        console.error(
          `📋 [RouteBulkSign] ❌ Delivery processing error:`,
          error,
        );
      }

      res.json({
        success: true,
        signedOrders,
        errors,
        message: `Signed ${signedOrders.length} orders${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      });
    } catch (error: any) {
      console.error("❌ [Bulk Sign] Error bulk signing orders:", error);
      res.status(500).json({ error: "Failed to bulk sign orders" });
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
      const draftOrders = await storage.getPatientDraftOrders(
        encounter.patientId,
      );

      res.json(draftOrders);
    } catch (error: any) {
      console.error(
        "❌ [Unsigned Orders] Error fetching unsigned orders:",
        error,
      );
      res.status(500).json({ error: "Failed to fetch unsigned orders" });
    }
  });

  // Register patient parser routes
  app.use("/api", parseRoutes);

  // Register lab routes
  app.use("/api/lab", labRoutes);
  app.use("/api/lab-entry", labEntryRoutes);
  app.use("/api/lab-workflow", labWorkflowRoutes);
  app.use("/api/lab-communication", labCommunicationRoutes);
  app.use("/api/lab-review", labReviewRoutes);
  app.use("/api/gpt-lab-review", gptLabReviewRoutes);
  app.use("/api/lab-simulator", labSimulatorRoutes);
  app.use("/api/lab-status", labStatusDashboardRoutes);

  // PDF download routes (for accessing generated PDFs)
  const pdfDownloadRoutes = await import("./pdf-download-routes.js");
  app.use("/api", pdfDownloadRoutes.default);

  // PDF viewer routes (for embedded viewing)
  const pdfViewerRoutes = await import("./pdf-viewer-routes.js");
  app.use("/api", pdfViewerRoutes.default);
  app.use("/api/external-lab-mock", externalLabMockRouter);

  // Legacy dynamic vitals routes removed - now using static imports above

  // Public health systems endpoint for registration
  // This must be defined BEFORE registering admin routes
  app.get("/api/health-systems/public-with-locations", async (req, res) => {
    try {
      console.log("📍 [Public Health Systems] Accessing public endpoint");
      const search = (req.query.search as string)?.toLowerCase() || "";

      const { db } = await import("./db.js");
      const { healthSystems, locations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Get health systems with their locations
      const healthSystemsWithLocations = await db
        .select({
          healthSystemId: healthSystems.id,
          healthSystemName: healthSystems.name,
          healthSystemType: healthSystems.systemType,
          subscriptionTier: healthSystems.subscriptionTier,
          locationId: locations.id,
          locationName: locations.name,
          locationAddress: locations.address,
          locationCity: locations.city,
          locationState: locations.state,
          locationZipCode: locations.zipCode,
          locationPhone: locations.phone,
          locationNpi: locations.npi,
          locationType: locations.locationType,
        })
        .from(healthSystems)
        .leftJoin(locations, eq(locations.healthSystemId, healthSystems.id))
        .where(eq(healthSystems.subscriptionStatus, "active"))
        .orderBy(healthSystems.name, locations.name);

      // Group by health system
      const groupedSystems = healthSystemsWithLocations.reduce(
        (acc: any[], row) => {
          const existing = acc.find((hs) => hs.id === row.healthSystemId);
          if (existing) {
            if (row.locationId) {
              existing.locations.push({
                id: row.locationId,
                name: row.locationName,
                address: row.locationAddress,
                city: row.locationCity,
                state: row.locationState,
                zipCode: row.locationZipCode,
                phone: row.locationPhone,
                npi: row.locationNpi,
                locationType: row.locationType,
              });
            }
          } else {
            acc.push({
              id: row.healthSystemId,
              name: row.healthSystemName,
              systemType: row.healthSystemType,
              subscriptionTier: row.subscriptionTier,
              locations: row.locationId
                ? [
                    {
                      id: row.locationId,
                      name: row.locationName,
                      address: row.locationAddress,
                      city: row.locationCity,
                      state: row.locationState,
                      zipCode: row.locationZipCode,
                      phone: row.locationPhone,
                      npi: row.locationNpi,
                      locationType: row.locationType,
                    },
                  ]
                : [],
            });
          }
          return acc;
        },
        [],
      );

      // Filter by search term
      let filtered = groupedSystems;
      if (search) {
        filtered = groupedSystems.filter((hs) => {
          // Check health system name
          if (hs.name.toLowerCase().includes(search)) return true;

          // Check location names, cities, addresses
          return hs.locations.some(
            (loc: any) =>
              loc.name.toLowerCase().includes(search) ||
              loc.city.toLowerCase().includes(search) ||
              loc.address.toLowerCase().includes(search) ||
              loc.state.toLowerCase().includes(search) ||
              loc.npi?.includes(search),
          );
        });
      }

      console.log(
        `✅ [Public Health Systems] Found ${filtered.length} health systems`,
      );

      res.json({
        healthSystems: filtered,
        totalLocations: filtered.reduce(
          (sum, hs) => sum + hs.locations.length,
          0,
        ),
        userLocation: null,
      });
    } catch (error) {
      console.error("❌ [Public Health Systems] Error:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch health systems with locations" });
    }
  });

  // Register Google Places routes for dynamic clinic search
  const googlePlacesRoutes = await import("./google-places-routes.js");
  app.use(googlePlacesRoutes.default);

  // Register admin user management routes
  registerAdminUserRoutes(app);

  const httpServer = createServer(app);

  // Set up WebSocket proxy for OpenAI Realtime API
  setupRealtimeProxy(app, httpServer);

  // Legacy real-time transcription service removed - AI suggestions now use direct client WebSocket connection

  // Enhanced Real-time service removed - AI suggestions now use direct client WebSocket connection

  // Admin routes for prompt management
  app.get("/api/admin/prompt-reviews/pending", async (req, res) => {
    try {
      console.log(
        "🔍 [Admin] Accessing pending reviews, authenticated:",
        req.isAuthenticated(),
      );

      const reviews = await storage.getAllPendingPromptReviews();
      console.log("📋 [Admin] Found", reviews.length, "pending reviews");
      res.json(reviews);
    } catch (error: any) {
      console.error("❌ [Admin] Error fetching pending reviews:", error);
      res.status(500).json({ message: "Failed to fetch pending reviews" });
    }
  });

  app.get("/api/admin/templates", async (req, res) => {
    try {
      console.log(
        "🔍 [Admin] Accessing templates, authenticated:",
        req.isAuthenticated(),
      );

      const templates = await storage.getUserNoteTemplates(1); // Get all templates for now
      console.log("📋 [Admin] Found", templates.length, "templates");
      res.json(
        templates.map((t) => ({
          id: t.id,
          templateName: t.templateName,
          baseNoteType: t.baseNoteType,
          displayName: t.displayName,
          userId: t.userId,
          hasActivePrompt: false,
          activePromptLength: 0,
        })),
      );
    } catch (error: any) {
      console.error("❌ [Admin] Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.put("/api/admin/prompt-reviews/:reviewId", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const { reviewedPrompt, reviewNotes, reviewStatus } = req.body;

      await storage.updateAdminPromptReview(reviewId, {
        reviewedPrompt,
        reviewNotes,
        reviewStatus,
        reviewedAt: new Date(),
      });

      res.json({ message: "Review updated successfully" });
    } catch (error: any) {
      console.error("❌ [Admin] Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.post("/api/admin/prompt-reviews/:reviewId/activate", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const userId = (req as any).user?.id || 1;
      await storage.activateReviewedPrompt(reviewId, userId);

      res.json({ message: "Prompt activated successfully" });
    } catch (error: any) {
      console.error("❌ [Admin] Error activating prompt:", error);
      res.status(500).json({ message: "Failed to activate prompt" });
    }
  });

  // Email verification routes
  // Support both query parameter and path parameter formats
  app.get("/api/verify-email/:token?", async (req, res) => {
    try {
      // Try to get token from path parameter first, then query parameter
      const token = req.params.token || req.query.token;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const { EmailVerificationService } = await import(
        "./email-verification-service"
      );
      const result = await EmailVerificationService.verifyEmail(token);

      if (result.success) {
        // Redirect to login page with success message
        res.redirect(
          `/auth?verified=true&email=${encodeURIComponent(result.email || "")}`,
        );
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error: any) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Error verifying email" });
    }
  });

  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const { EmailVerificationService } = await import(
        "./email-verification-service"
      );
      const result =
        await EmailVerificationService.resendVerificationEmail(email);

      res.json(result);
    } catch (error: any) {
      console.error("Error resending verification:", error);
      res.status(500).json({ message: "Error resending verification email" });
    }
  });

  // Send verification email after successful Stripe payment
  app.post("/api/send-verification-after-payment", async (req, res) => {
    try {
      const { email, sessionId } = req.body;

      if (!email || !sessionId) {
        return res.status(400).json({ message: "Email and session ID required" });
      }

      console.log(`💳 [Payment Verification] Processing post-payment verification for ${email}`);

      // Get user by email to fetch their verification token
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.emailVerificationToken) {
        console.error(`❌ [Payment Verification] No verification token found for ${email}`);
        return res.status(400).json({ message: "No verification token found for user" });
      }

      // Send the verification email
      const { EmailVerificationService } = await import(
        "./email-verification-service"
      );
      
      try {
        await EmailVerificationService.sendVerificationEmail(user.email, user.emailVerificationToken);
        console.log(`✅ [Payment Verification] Verification email sent to ${user.email} after payment`);
        
        res.json({ 
          success: true, 
          message: "Verification email sent successfully" 
        });
      } catch (emailError) {
        console.error(`❌ [Payment Verification] Failed to send verification email:`, emailError);
        res.status(500).json({ 
          success: false,
          message: "Failed to send verification email" 
        });
      }
    } catch (error: any) {
      console.error("Error in post-payment verification:", error);
      res.status(500).json({ message: "Error processing post-payment verification" });
    }
  });

  // Manual reprocess endpoint for attachments
  app.post("/api/attachments/:attachmentId/reprocess", async (req, res) => {
    try {
      // Temporarily disabled authentication for testing
      // if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const attachmentId = parseInt(req.params.attachmentId);
      if (isNaN(attachmentId)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
      }

      console.log(`📋 [API] Manual reprocess requested for attachment ${attachmentId}`);
      
      // Import the attachment chart processor
      const { attachmentChartProcessor } = await import("./attachment-chart-processor.js");
      
      // Trigger the chart processing
      await attachmentChartProcessor.processCompletedAttachment(attachmentId);
      
      res.json({ 
        success: true, 
        message: `Attachment ${attachmentId} reprocessed successfully` 
      });
    } catch (error) {
      console.error("Error reprocessing attachment:", error);
      res.status(500).json({ 
        error: error.message || "Failed to reprocess attachment" 
      });
    }
  });

  // Direct vitals extraction endpoint for testing
  app.post("/api/attachments/:attachmentId/extract-vitals", async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      if (isNaN(attachmentId)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
      }

      console.log(`🩺 [API] Direct vitals extraction requested for attachment ${attachmentId}`);
      
      // Get attachment and extracted content
      const [attachment] = await db.select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId));

      if (!attachment) {
        return res.status(404).json({ error: `Attachment ${attachmentId} not found` });
      }

      const [extractedContent] = await db.select()
        .from(attachmentExtractedContent)
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      if (!extractedContent || !extractedContent.extractedText) {
        return res.status(400).json({ error: `No extracted text for attachment ${attachmentId}` });
      }

      // Import and use vitals parser directly
      const { VitalsParserService } = await import("./vitals-parser-service.js");
      const vitalsParser = new VitalsParserService();
      
      const result = await vitalsParser.parseVitalsText(
        extractedContent.extractedText,
        attachment.patientId,
        attachment.encounterId,
        attachmentId
      );
      
      res.json({ 
        success: true,
        message: `Vitals extraction completed for attachment ${attachmentId}`,
        result
      });
    } catch (error) {
      console.error("Error extracting vitals:", error);
      res.status(500).json({ 
        error: error.message || "Failed to extract vitals" 
      });
    }
  });

  // Development endpoint: Delete test user
  if (process.env.NODE_ENV === "development") {
    app.delete("/api/dev/delete-test-user/:email", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);
        console.log(`🧹 [Dev] Request to delete test user: ${email}`);

        const { EmailVerificationService } = await import(
          "./email-verification-service"
        );
        const result = await EmailVerificationService.deleteTestUser(email);

        if (result.success) {
          res.json(result);
        } else {
          res.status(404).json(result);
        }
      } catch (error: any) {
        console.error("Error deleting test user:", error);
        res.status(500).json({ message: "Error deleting test user" });
      }
    });

    // Development endpoint: Clear all users - Simple GET endpoint
    app.get("/api/dev/clear-users", async (req, res) => {
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({
          message: "This endpoint is only available in development mode",
        });
      }

      try {
        console.log("🧹 [Dev] Clearing all users except admin");

        // Simple direct query to get non-admin users
        const result = await db.execute(sql`
          SELECT id, username FROM users WHERE username != 'admin'
        `);

        const userCount = result.rows.length;
        console.log(`📊 [Dev] Found ${userCount} users to delete`);

        if (userCount === 0) {
          return res.json({
            success: true,
            message: "No users to delete (only admin exists)",
            deletedCount: 0,
          });
        }

        // Delete all related data and users in proper order to handle foreign key constraints

        // First clear all references to users in other tables
        await db.execute(sql`
          UPDATE health_systems SET original_provider_id = NULL WHERE original_provider_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        await db.execute(sql`
          UPDATE users SET verified_with_key_id = NULL WHERE username != 'admin';
        `);

        // Delete all clinical data for patients created by non-admin users
        // Using direct SQL queries with subqueries
        await db.execute(sql`
          DELETE FROM family_history WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM social_history WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM surgical_history WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM medical_problems WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM medications WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM allergies WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM vitals WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM lab_orders WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM lab_results WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM imaging_orders WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM imaging_results WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM orders WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        // Delete document processing queue entries first
        await db.execute(sql`
          DELETE FROM document_processing_queue WHERE attachment_id IN (
            SELECT id FROM patient_attachments WHERE patient_id IN (
              SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
              OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
              OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            )
          )
        `);

        // Delete attachment extracted content
        await db.execute(sql`
          DELETE FROM attachment_extracted_content WHERE attachment_id IN (
            SELECT id FROM patient_attachments WHERE patient_id IN (
              SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
              OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
              OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            )
          )
        `);

        await db.execute(sql`
          DELETE FROM patient_attachments WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM patient_order_preferences WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        await db.execute(sql`
          DELETE FROM diagnoses WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        // Delete encounters
        await db.execute(sql`
          DELETE FROM encounters WHERE patient_id IN (
            SELECT id FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
            OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
            OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          )
        `);

        // Delete encounters created by non-admin providers
        await db.execute(sql`
          DELETE FROM encounters WHERE provider_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        // Now delete patients
        await db.execute(sql`
          DELETE FROM patients WHERE created_by_provider_id IN (SELECT id FROM users WHERE username != 'admin')
          OR created_by_user_id IN (SELECT id FROM users WHERE username != 'admin')
          OR primary_provider_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        // Delete subscription keys
        await db.execute(sql`
          DELETE FROM subscription_keys WHERE used_by IN (SELECT id FROM users WHERE username != 'admin');
        `);

        // Delete user related tables
        await db.execute(sql`
          DELETE FROM user_locations WHERE user_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        await db.execute(sql`
          DELETE FROM user_note_preferences WHERE user_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        await db.execute(sql`
          DELETE FROM user_session_locations WHERE user_id IN (SELECT id FROM users WHERE username != 'admin');
        `);

        // Finally delete the users
        const deleteResult = await db.execute(sql`
          DELETE FROM users WHERE username != 'admin';
        `);

        console.log(`✅ [Dev] Successfully cleared users`);

        res.json({
          success: true,
          message: `Deleted ${userCount} users successfully`,
          deletedCount: userCount,
        });
      } catch (error: any) {
        console.error("❌ [Dev] Error clearing users:", error);
        res
          .status(500)
          .json({ message: "Error clearing users: " + error.message });
      }
    });

    // Development endpoint: Clear all test data (phone numbers, emails, clinics, etc)
    app.delete("/api/dev/clear-all-test-data", async (req, res) => {
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({
          message: "This endpoint is only available in development mode",
        });
      }

      try {
        console.log("🧹 [Dev] Starting complete test data cleanup...");
        
        // Clear all clinic admin verifications
        const verificationResult = await db.execute(sql`
          DELETE FROM clinic_admin_verifications
        `);
        console.log(`✅ Deleted ${verificationResult.rowCount} clinic admin verifications`);
        
        // Clear all locations except admin's health system locations (must be before health_systems)
        const locationResult = await db.execute(sql`
          DELETE FROM locations WHERE health_system_id != 2
        `);
        console.log(`✅ Deleted ${locationResult.rowCount} locations`);
        
        // Clear all organizations except the admin's (must be before health_systems)
        const orgResult = await db.execute(sql`
          DELETE FROM organizations WHERE health_system_id != 2
        `);
        console.log(`✅ Deleted ${orgResult.rowCount} organizations`);
        
        // Clear subscription keys for non-admin health systems (must be before health_systems)
        const subscriptionKeyResult = await db.execute(sql`
          DELETE FROM subscription_keys WHERE health_system_id != 2
        `);
        console.log(`✅ Deleted ${subscriptionKeyResult.rowCount} subscription keys`);
        
        // Clear subscription history for non-admin health systems (must be before health_systems)
        const subscriptionHistoryResult = await db.execute(sql`
          DELETE FROM subscription_history WHERE health_system_id != 2
        `);
        console.log(`✅ Deleted ${subscriptionHistoryResult.rowCount} subscription history entries`);
        
        // Clear organization documents for non-admin health systems (must be before health_systems)
        const orgDocumentsResult = await db.execute(sql`
          DELETE FROM organization_documents WHERE health_system_id != 2
        `);
        console.log(`✅ Deleted ${orgDocumentsResult.rowCount} organization documents`);
        
        // Clear all non-admin health systems (keep admin's health system)
        const healthSystemResult = await db.execute(sql`
          DELETE FROM health_systems WHERE id != 2
        `);
        console.log(`✅ Deleted ${healthSystemResult.rowCount} health systems`);
        
        // Clear PHI access logs and authentication logs for non-admin users
        await db.execute(sql`
          DELETE FROM phi_access_logs WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')
        `);
        
        await db.execute(sql`
          DELETE FROM authentication_logs WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')
        `);
        
        // Clear all non-admin users
        const userResult = await db.execute(sql`
          DELETE FROM users WHERE role != 'admin'
        `);
        console.log(`✅ Deleted ${userResult.rowCount} non-admin users`);
        
        res.json({
          success: true,
          message: "All test data cleared successfully",
          deletedCounts: {
            clinicAdminVerifications: verificationResult.rowCount,
            healthSystems: healthSystemResult.rowCount,
            organizations: orgResult.rowCount,
            locations: locationResult.rowCount,
            users: userResult.rowCount
          }
        });
      } catch (error: any) {
        console.error("❌ [Dev] Error clearing test data:", error);
        res.status(500).json({
          error: "Failed to clear test data",
          details: error.message,
        });
      }
    });
  }

  // Stripe Payment Routes
  app.post("/api/stripe/create-subscription", async (req, res) => {
    try {
      const { StripeService } = await import("./stripe-service");
      const result = await StripeService.createSubscription(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create subscription" });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret,
      );

      const { StripeService } = await import("./stripe-service");
      await StripeService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/stripe/subscription/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { StripeService } = await import("./stripe-service");
      const subscription = await StripeService.getSubscription(req.params.id);

      if (subscription) {
        res.json(subscription);
      } else {
        res.status(404).json({ error: "Subscription not found" });
      }
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { customerId, tier, billingPeriod } = req.body;
      const successUrl = `${process.env.APP_URL || "http://localhost:5000"}/dashboard?payment=success`;
      const cancelUrl = `${process.env.APP_URL || "http://localhost:5000"}/settings/billing?payment=cancelled`;

      const { StripeService } = await import("./stripe-service");
      const sessionUrl = await StripeService.createCheckoutSession(
        customerId,
        tier,
        billingPeriod,
        successUrl,
        cancelUrl,
      );

      if (sessionUrl) {
        res.json({ url: sessionUrl });
      } else {
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific health system details
  app.get("/api/health-systems/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const healthSystemId = parseInt(req.params.id);
      const healthSystem = await storage.getHealthSystem(healthSystemId);

      if (!healthSystem) {
        return res.status(404).json({ error: "Health system not found" });
      }

      res.json(healthSystem);
    } catch (error: any) {
      console.error("Error fetching health system:", error);
      res.status(500).json({ error: "Failed to fetch health system" });
    }
  });

  // Subscription Key Routes
  app.use("/api/subscription-keys", subscriptionKeyRoutes);

  // Health System Upgrade Routes
  const { healthSystemUpgradeRoutes } = await import(
    "./health-system-upgrade-routes"
  );
  app.use("/api/health-system-upgrade", healthSystemUpgradeRoutes);

  // Stripe tier upgrade endpoint
  app.post("/api/stripe/upgrade-to-tier3", async (req, res) => {
    try {
      console.log("[Tier3Upgrade] Request received:", {
        authenticated: req.isAuthenticated(),
        body: req.body,
        user: req.user
          ? { id: req.user.id, role: req.user.role, email: req.user.email }
          : null,
      });

      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { healthSystemId } = req.body;
      const user = req.user as AuthenticatedUser;

      console.log("[Tier3Upgrade] User details:", {
        userId: user.id,
        userRole: user.role,
        userHealthSystemId: user.healthSystemId,
        requestedHealthSystemId: healthSystemId,
      });

      // Verify user is admin of the health system
      if (user.role !== "admin" || user.healthSystemId !== healthSystemId) {
        console.log("[Tier3Upgrade] Authorization failed:", {
          roleCheck: user.role !== "admin",
          healthSystemCheck: user.healthSystemId !== healthSystemId,
        });
        return res
          .status(403)
          .json({ error: "Unauthorized to upgrade this health system" });
      }

      // Get health system details
      const healthSystem = await storage.getHealthSystem(healthSystemId);
      if (!healthSystem) {
        console.log("[Tier3Upgrade] Health system not found:", healthSystemId);
        return res.status(404).json({ error: "Health system not found" });
      }

      console.log("[Tier3Upgrade] Current health system:", {
        id: healthSystem.id,
        name: healthSystem.name,
        currentTier: healthSystem.subscriptionTier,
      });

      // Check current tier
      if (healthSystem.subscriptionTier === 3) {
        console.log("[Tier3Upgrade] Already on tier 3");
        return res.status(400).json({ error: "Already on Enterprise tier" });
      }

      // Import StripeService
      const { StripeService } = await import("./stripe-service.js");

      // Get the base URL from environment or use request origin
      const protocol = req.get("x-forwarded-proto") || req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `${protocol}://${host}`;

      console.log(
        "[Tier3Upgrade] Creating Stripe session for tier 3 upgrade with base URL:",
        baseUrl,
      );

      // Create minimal Stripe checkout session to avoid loading issues
      const stripe = (await import("stripe")).default;

      console.log(
        "[Tier3Upgrade] Stripe API Key present:",
        !!process.env.STRIPE_SECRET_KEY,
      );
      console.log(
        "[Tier3Upgrade] Stripe API Key starts with:",
        process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      );

      const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-11-20.acacia",
      });

      console.log("[Tier3Upgrade] Creating session with params:", {
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: user.email,
        unit_amount: 29900,
        currency: "usd",
        product_name: "Clarafi Enterprise",
        success_url: `${baseUrl}/dashboard?upgrade=success`,
        cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
      });

      let session;
      try {
        // Test if Stripe instance is working
        console.log("[Tier3Upgrade] Testing Stripe instance...");
        try {
          const testProduct = await stripeInstance.products.list({ limit: 1 });
          console.log(
            "[Tier3Upgrade] Stripe instance test successful, products access:",
            !!testProduct,
          );
        } catch (testError: any) {
          console.error(
            "[Tier3Upgrade] Stripe instance test failed:",
            testError.message,
          );
        }

        session = await stripeInstance.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Clarafi Enterprise",
                  description: "Complete EMR system with admin features",
                },
                unit_amount: 29900, // $299.00
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          customer_email: user.email,
          success_url: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
          metadata: {
            healthSystemId: healthSystemId.toString(),
            action: "upgrade-to-tier3",
          },
          // Simplified configuration for better compatibility
          billing_address_collection: "auto",
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expire after 30 minutes
        });

        console.log("[Tier3Upgrade] Session created successfully:", {
          sessionId: session.id,
          sessionUrl: session.url,
          sessionUrlLength: session.url?.length,
          sessionStatus: session.status,
          sessionMode: session.mode,
        });
      } catch (stripeError: any) {
        console.error("[Tier3Upgrade] Stripe session creation error:", {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          raw: stripeError,
        });
        throw stripeError;
      }

      if (!session.url) {
        console.error("[Tier3Upgrade] Session created but no URL returned:", {
          sessionId: session.id,
          sessionObject: JSON.stringify(session, null, 2),
        });
        return res.status(500).json({
          error: "Stripe session created but no checkout URL returned",
          sessionId: session.id,
        });
      }

      const checkoutResult = {
        success: true,
        sessionUrl: session.url,
      };

      console.log("[Tier3Upgrade] Stripe session result:", {
        success: checkoutResult.success,
        sessionUrl: checkoutResult.sessionUrl,
        urlValid: !!checkoutResult.sessionUrl,
        urlStartsWith: checkoutResult.sessionUrl?.substring(0, 50),
      });

      if (checkoutResult.success && checkoutResult.sessionUrl) {
        const responseData = {
          success: true,
          checkoutUrl: checkoutResult.sessionUrl,
          stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          sessionId: session.id,
        };
        console.log("[Tier3Upgrade] Sending response:", {
          success: responseData.success,
          hasCheckoutUrl: !!responseData.checkoutUrl,
          checkoutUrlStart: responseData.checkoutUrl.substring(0, 50),
          hasPublishableKey: !!responseData.stripePublishableKey,
        });
        return res.json(responseData);
      } else {
        console.error(
          "[Tier3Upgrade] Failed to create checkout session:",
          checkoutResult,
        );
        return res.status(500).json({
          error: checkoutResult.error || "Failed to create checkout session",
        });
      }
    } catch (error) {
      console.error(
        "[Tier3Upgrade] Error creating tier 3 upgrade session:",
        error,
      );
      res.status(500).json({ error: "Failed to initiate upgrade" });
    }
  });

  // Stripe session debug endpoint
  app.get("/api/stripe/debug-session/:sessionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const stripe = (await import("stripe")).default;
      const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-11-20.acacia",
      });

      console.log("[StripeDebug] Fetching session:", req.params.sessionId);

      try {
        const session = await stripeInstance.checkout.sessions.retrieve(
          req.params.sessionId,
          {
            expand: [
              "line_items",
              "customer",
              "subscription",
              "payment_intent",
            ],
          },
        );

        console.log("[StripeDebug] Session details:", {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          url: session.url,
          expires_at: new Date(session.expires_at * 1000).toISOString(),
          created: new Date(session.created * 1000).toISOString(),
          mode: session.mode,
          customer_email: session.customer_email,
          amount_total: session.amount_total,
          currency: session.currency,
          line_items_count: session.line_items?.data?.length,
        });

        res.json({
          session: {
            id: session.id,
            status: session.status,
            payment_status: session.payment_status,
            url: session.url,
            expires_at: new Date(session.expires_at * 1000).toISOString(),
            created: new Date(session.created * 1000).toISOString(),
            mode: session.mode,
            customer_email: session.customer_email,
            metadata: session.metadata,
            amount_total: session.amount_total,
            currency: session.currency,
            line_items: session.line_items?.data,
            payment_intent: session.payment_intent,
            subscription: session.subscription,
          },
        });
      } catch (stripeError: any) {
        console.error("[StripeDebug] Error fetching session:", stripeError);
        res.status(400).json({
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
        });
      }
    } catch (error: any) {
      console.error("[StripeDebug] Unexpected error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Subscription Configuration API
  app.get("/api/subscription/config", async (req, res) => {
    try {
      const { subscriptionConfig } = await import("./subscription-config");
      const config = subscriptionConfig.exportConfiguration();
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching subscription config:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  app.put("/api/subscription/config", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { subscriptionConfig } = await import("./subscription-config");
      const { pricing, features } = req.body;

      // Update pricing if provided
      if (pricing) {
        subscriptionConfig.updatePricing(pricing);
      }

      // Update features if provided
      if (features) {
        Object.entries(features).forEach(([feature, config]: [string, any]) => {
          if (config.tier1 !== undefined) {
            subscriptionConfig.updateFeature(feature as any, 1, config.tier1);
          }
          if (config.tier2 !== undefined) {
            subscriptionConfig.updateFeature(feature as any, 2, config.tier2);
          }
          if (config.tier3 !== undefined) {
            subscriptionConfig.updateFeature(feature as any, 3, config.tier3);
          }
        });
      }

      res.json({
        success: true,
        config: subscriptionConfig.exportConfiguration(),
      });
    } catch (error: any) {
      console.error("Error updating subscription config:", error);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Import and register e-prescribing routes
  const { eprescribingRoutes } = await import("./eprescribing-routes.js");
  app.use(eprescribingRoutes);

  // Import and register photo capture routes
  const { default: photoCaptureRoutes } = await import("./photo-capture-routes.js");
  app.use("/api/photo-capture", photoCaptureRoutes);
  
  // Redirect /capture/:sessionId to the actual photo capture page
  app.get("/capture/:sessionId", (req: Request, res: Response) => {
    res.redirect(`/api/photo-capture/capture/${req.params.sessionId}`);
  });

  // Import and register billing management routes
  const { registerBillingRoutes } = await import("./billing-management-routes");
  registerBillingRoutes(app);

  // Import and register marketing analytics routes
  const marketingAnalyticsRoutes = await import("./marketing-analytics-routes");
  app.use(marketingAnalyticsRoutes.default);
  console.log("📊 [MarketingAnalytics] Marketing analytics routes registered");

  return httpServer;
}
