import { Router } from "express";
import { VitalsParserService } from "./vitals-parser-service.js";
import { APIResponseHandler } from "./api-response-handler.js";
import { db } from "./db.js";
import { patients, vitals } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
const vitalsParser = new VitalsParserService();

/**
 * POST /api/vitals/parse-text
 * Unified endpoint for immediate vitals parsing from text input
 * Used by: Quick Parse Vitals, Nursing Templates, Manual Entry
 */
router.post("/parse-text", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { text, patientId, encounterId } = req.body;

    if (!text || typeof text !== 'string') {
      return APIResponseHandler.badRequest(res, "Text is required");
    }

    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Patient ID is required");
    }

    console.log("🔥 [UNIFIED VITALS] ============= IMMEDIATE TEXT PARSING =============");
    console.log("🩺 [UnifiedVitals] Processing immediate vitals parsing request");
    console.log("🩺 [UnifiedVitals] Text length:", text.length);
    console.log("🩺 [UnifiedVitals] Patient ID:", patientId);
    console.log("🩺 [UnifiedVitals] Encounter ID:", encounterId || 'None');

    // Get patient context for better parsing
    let patientContext = undefined;
    try {
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);
        
      if (patient) {
        const birthDate = new Date(patient.dateOfBirth);
        const today = new Date();
        const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        patientContext = {
          age: age,
          gender: patient.gender
        };
      }
    } catch (error) {
      console.warn("⚠️ [UnifiedVitals] Could not fetch patient context:", error);
    }

    // Parse vitals using the unified service
    const parseResult = await vitalsParser.parseVitalsText(text, patientContext);

    if (!parseResult.success) {
      console.log("❌ [UnifiedVitals] Parsing failed:", parseResult.errors);
      return APIResponseHandler.error(res, "PARSE_FAILED", parseResult.errors?.join(", ") || "Failed to parse vitals");
    }

    console.log("✅ [UnifiedVitals] Successfully parsed", parseResult.data?.length || 0, "vitals sets");

    // Save each vitals set to the database
    let savedCount = 0;
    if (parseResult.data && parseResult.data.length > 0) {
      for (const vitalSet of parseResult.data) {
        try {
          const vitalsEntry = {
            patientId: Number(patientId),
            encounterId: encounterId ? Number(encounterId) : null,
            entryType: "routine" as const,
            recordedAt: vitalSet.extractedDate ? new Date(vitalSet.extractedDate + 'T00:00:00.000Z') : new Date(),
            parsedFromText: true,
            originalText: text,
            systolicBp: vitalSet.systolicBp || null,
            diastolicBp: vitalSet.diastolicBp || null,
            heartRate: vitalSet.heartRate || null,
            temperature: vitalSet.temperature || null,
            respiratoryRate: vitalSet.respiratoryRate || null,
            oxygenSaturation: vitalSet.oxygenSaturation || null,
            weight: vitalSet.weight || null,
            height: vitalSet.height || null,
            bmi: vitalSet.bmi || null,
            painScale: vitalSet.painScale !== null && vitalSet.painScale !== undefined ? vitalSet.painScale : null,
            notes: vitalSet.parsedText || "",
            alerts: vitalSet.warnings || [],
            recordedBy: "Quick Parse System",
            sourceType: "manual_entry",
            sourceConfidence: (parseResult.confidence || 0) / 100,
            sourceNotes: `Quick Parse: ${vitalSet.parsedText || 'Manual text entry'}`
          };

          const [savedEntry] = await db
            .insert(vitals)
            .values(vitalsEntry)
            .returning();

          console.log("✅ [UnifiedVitals] Saved vitals entry:", savedEntry.id);
          savedCount++;
        } catch (error) {
          console.error("❌ [UnifiedVitals] Failed to save vitals entry:", error);
        }
      }
    }

    console.log("🔥 [UNIFIED VITALS] ============= IMMEDIATE PARSING COMPLETE =============");

    return APIResponseHandler.success(res, {
      success: true,
      vitalsCount: savedCount,
      confidence: parseResult.confidence,
      message: `Successfully parsed and saved ${savedCount} vitals set(s)`
    });
    
  } catch (error) {
    console.error("❌ [UnifiedVitals] Error:", error);
    return APIResponseHandler.error(res, "VITALS_PARSE_ERROR", "Failed to parse vitals", 500);
  }
});

/**
 * Legacy compatibility endpoint
 * Redirects to the unified endpoint
 */
router.post("/parse", async (req, res) => {
  console.log("⚠️ [UnifiedVitals] Legacy /parse endpoint called, redirecting to unified system");
  
  // Transform legacy request to unified format
  const { vitalsText, patientId, encounterId } = req.body;
  req.body = {
    text: vitalsText,
    patientId,
    encounterId
  };
  
  // Forward to unified endpoint
  return router.handle(
    { ...req, url: '/parse-text', method: 'POST' } as any,
    res,
    () => {}
  );
});

export default router;