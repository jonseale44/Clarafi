import { Request, Response } from "express";
import { VitalsParserService } from "./vitals-parser-service.js";
import { APIResponseHandler } from "./api-response-handler.js";
import { db } from "./db.js";
import { patients } from "../shared/schema.js";
import { eq } from "drizzle-orm";

/**
 * Parse-only vitals endpoint for Quick Parse functionality
 * Returns parsed data without saving to database
 */
export async function parseVitalsOnly(req: Request, res: Response) {
  try {
    if (!req.user) {
      return APIResponseHandler.unauthorized(res, "Authentication required");
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return APIResponseHandler.badRequest(res, "Text is required");
    }

    console.log("🩺 [ParseOnly] Processing parse-only request");
    console.log("🩺 [ParseOnly] Text length:", text.length);

    // Get patient context if provided
    let patientContext = undefined;
    if (req.body.patientId) {
      try {
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.id, req.body.patientId))
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
        console.warn("⚠️ [ParseOnly] Could not fetch patient context:", error);
      }
    }

    // Parse the vitals text using the service
    const vitalsParser = new VitalsParserService();
    const parseResult = await vitalsParser.parseVitalsText(text, patientContext);

    if (!parseResult.success) {
      return APIResponseHandler.badRequest(res, "Failed to parse vitals", {
        errors: parseResult.errors
      });
    }

    // Return the first parsed vitals set for form population
    const firstVitalsSet = parseResult.data?.[0];
    if (!firstVitalsSet) {
      return APIResponseHandler.badRequest(res, "No vitals found in text");
    }

    console.log("✅ [ParseOnly] Successfully parsed vitals for form population");

    return APIResponseHandler.success(res, {
      success: true,
      vitals: firstVitalsSet,
      confidence: parseResult.confidence,
      totalSetsFound: parseResult.data?.length || 0
    });

  } catch (error) {
    console.error("❌ [ParseOnly] Error:", error);
    return APIResponseHandler.internalError(res, "Failed to parse vitals");
  }
}