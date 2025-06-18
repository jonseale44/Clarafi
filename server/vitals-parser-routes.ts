import { Router } from "express";
import { gptVitalsParser } from "./gpt-vitals-parser";
import { APIResponseHandler } from "./api-response-handler";
import { db } from "./db";
import { patients } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * POST /api/vitals/parse
 * Parse freeform vitals text using GPT
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
          .where(eq(patients.id, parseInt(patientId)))
          .limit(1);

        if (patient) {
          const age = patient.dateOfBirth 
            ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
            : undefined;
          
          patientContext = {
            age,
            gender: patient.gender
          };
        }
      } catch (error) {
        console.warn("⚠️ [VitalsParser] Could not fetch patient context:", error);
      }
    }

    console.log(`🔍 [VitalsParser] Parsing vitals text: "${vitalsText.substring(0, 100)}..."`);
    
    const result = await gptVitalsParser.parseVitalsText(vitalsText, patientContext);

    if (!result.success) {
      return APIResponseHandler.error(res, new Error(result.errors?.join(", ") || "Parsing failed"), 400, "PARSING_FAILED");
    }

    console.log(`✅ [VitalsParser] Successfully parsed vitals (confidence: ${result.confidence}%)`);

    return APIResponseHandler.success(res, {
      parsedData: result.data,
      confidence: result.confidence,
      originalText: result.originalText,
      warnings: result.data?.warnings || []
    });

  } catch (error) {
    console.error("❌ [VitalsParser] Error in parse route:", error);
    return APIResponseHandler.error(res, error as Error, 500, "VITALS_PARSE_ERROR");
  }
});

/**
 * POST /api/vitals/parse-and-save
 * Parse vitals text and save to database
 */
router.post("/parse-and-save", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { vitalsText, patientId, encounterId, recordedBy } = req.body;

    if (!vitalsText || !patientId || !encounterId) {
      return APIResponseHandler.badRequest(res, "Vitals text, patient ID, and encounter ID are required");
    }

    // Get patient context
    let patientContext = undefined;
    try {
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, parseInt(patientId)))
        .limit(1);

      if (patient) {
        const age = patient.dateOfBirth 
          ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
          : undefined;
        
        patientContext = {
          age,
          gender: patient.gender
        };
      }
    } catch (error) {
      console.warn("⚠️ [VitalsParser] Could not fetch patient context:", error);
    }

    console.log(`🔍 [VitalsParser] Parsing and saving vitals for encounter ${encounterId}`);
    
    const parseResult = await gptVitalsParser.parseVitalsText(vitalsText, patientContext);

    if (!parseResult.success || !parseResult.data) {
      return APIResponseHandler.error(res, new Error(parseResult.errors?.join(", ") || "Parsing failed"), 400, "PARSING_FAILED");
    }

    // Create vitals record
    const vitalsRecord = gptVitalsParser.createVitalsRecord(
      parseResult.data,
      parseInt(patientId),
      parseInt(encounterId),
      recordedBy || `${req.user?.firstName} ${req.user?.lastName}` || "Unknown User"
    );

    // Save to database
    const { storage } = await import("./storage");
    const savedVitals = await storage.createVitals(vitalsRecord);

    console.log(`✅ [VitalsParser] Vitals saved successfully (ID: ${savedVitals.id})`);

    return APIResponseHandler.success(res, {
      vitals: savedVitals,
      parseResult: {
        confidence: parseResult.confidence,
        originalText: parseResult.originalText,
        warnings: parseResult.data.warnings || []
      }
    }, 201);

  } catch (error) {
    console.error("❌ [VitalsParser] Error in parse-and-save route:", error);
    return APIResponseHandler.error(res, error as Error, 500, "VITALS_SAVE_ERROR");
  }
});

/**
 * GET /api/vitals/test-parser
 * Test endpoint for vitals parser (development only)
 */
router.get("/test-parser", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const testCases = [
      "120/80, P 80, RR 23, 98% on room air",
      "BP 160/90, HR 95, T 101.2F, O2 95%, pain 7/10",
      "Blood pressure 140 over 85, pulse 72, temp 38.5 celsius, weight 70 kg",
      "vitals stable: 118/76, HR 68, RR 16, afebrile, sat 99% RA",
      "Hypertensive: 185/95, tachycardic 110, febrile 102.1F"
    ];

    const results = [];
    
    for (const testCase of testCases) {
      const result = await gptVitalsParser.parseVitalsText(testCase);
      results.push({
        input: testCase,
        output: result
      });
    }

    return APIResponseHandler.success(res, { testResults: results });

  } catch (error) {
    console.error("❌ [VitalsParser] Error in test route:", error);
    return APIResponseHandler.error(res, error as Error, 500, "TEST_ERROR");
  }
});

export default router;