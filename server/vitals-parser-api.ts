import { Router } from "express";
import { VitalsParserService } from "./vitals-parser-service";
import { APIResponseHandler } from "./api-response-handler";
import { db } from "./db";
import { patients } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
const vitalsParser = new VitalsParserService();

/**
 * POST /api/vitals/parse
 * Parse freeform vitals text using GPT-4.1-mini via VitalsParserService
 * This is the single source of truth for vitals parsing
 */
router.post("/parse", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { vitalsText, patientId } = req.body;

    if (!vitalsText || typeof vitalsText !== 'string') {
      return APIResponseHandler.badRequest(res, "Vitals text is required");
    }

    // Get patient context for better parsing
    let patientContext = undefined;
    if (patientId) {
      try {
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.id, patientId))
          .limit(1);
          
        if (patient) {
          // Calculate age from dateOfBirth
          const birthDate = new Date(patient.dateOfBirth);
          const today = new Date();
          const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          patientContext = {
            age: age,
            gender: patient.gender
          };
        }
      } catch (error) {
        console.warn("⚠️ [VitalsParser] Could not fetch patient context:", error);
      }
    }

    console.log("🔥 [LEGACY VITALS API] ============= STANDALONE VITALS PARSING =============");
    console.log("🩺 [VitalsParserAPI] ⚠️  LEGACY ROUTE - Manual vitals parsing (not from attachments)");
    console.log("🩺 [VitalsParserAPI] Input text:", vitalsText.substring(0, 100) + (vitalsText.length > 100 ? '...' : ''));
    console.log("🩺 [VitalsParserAPI] Patient ID:", patientId || 'None provided');
    console.log("🩺 [VitalsParserAPI] Using VitalsParserService for processing...");
    
    // Use the single source of truth: VitalsParserService
    const result = await vitalsParser.parseVitalsText(vitalsText, patientContext);
    
    console.log("🔥 [LEGACY VITALS API] ============= STANDALONE PARSING COMPLETE =============");
    console.log("🩺 [VitalsParserAPI] ⚠️  Note: This creates vitals without attachment source attribution");

    return APIResponseHandler.success(res, result);
    
  } catch (error) {
    console.error("❌ [VitalsParserAPI] Error parsing vitals:", error);
    return APIResponseHandler.error(
      res, 
      "VITALS_PARSE_ERROR", 
      "Failed to parse vitals",
      500
    );
  }
});

export default router;