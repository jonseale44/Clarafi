import { Request, Response, Router } from "express";
import { z } from "zod";
import { VitalsParserService } from "./vitals-parser-service";
import { storage } from "./storage";

const router = Router();

// Request schema for vitals parsing
const parseRequestSchema = z.object({
  vitalsText: z.string().min(1, "Vitals text is required"),
  patientId: z.number().optional(),
  encounterId: z.number().optional(),
});

// Initialize the parser service
const parserService = new VitalsParserService();

/**
 * POST /api/vitals/parse
 * Parses vitals information from text using GPT - following patient parser pattern
 */
router.post("/parse", async (req: Request, res: Response) => {
  try {
    console.log("🩺 [VitalsParser] POST /api/vitals/parse - Starting request");
    console.log("🩺 [VitalsParser] Request body:", JSON.stringify(req.body, null, 2));
    
    // Validate request body - remove authentication requirement for testing
    const validationResult = parseRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log("❌ [VitalsParser] Invalid request format:", validationResult.error.errors);
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        details: validationResult.error.errors
      });
    }

    const { vitalsText } = validationResult.data;

    // Parse the vitals information
    const parseResult = await parserService.parseVitalsText(vitalsText);

    if (!parseResult.success) {
      console.error("❌ [VitalsParser] Parsing failed:", parseResult.error);
      return res.status(400).json(parseResult);
    }

    console.log("✅ [VitalsParser] Successfully parsed vitals data");
    console.log(`📊 [VitalsParser] Confidence: ${parseResult.confidence}%`);

    res.json({
      ...parseResult,
      originalText: vitalsText
    });

  } catch (error) {
    console.error("❌ [VitalsParser] Error in parse route:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error"
    });
  }
});

/**
 * POST /api/vitals/parse-and-create
 * Parse vitals text and create database record - following patient parser pattern
 */
router.post("/parse-and-create", async (req: Request, res: Response) => {
  try {
    console.log("🩺 [VitalsParser] POST /api/vitals/parse-and-create - Starting request");
    
    const validationResult = parseRequestSchema.extend({
      patientId: z.number(),
      encounterId: z.number(),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        details: validationResult.error.errors
      });
    }

    const { vitalsText, patientId, encounterId } = validationResult.data;

    console.log(`🩺 [VitalsParser] Parse and create for patient ${patientId}, encounter ${encounterId}`);

    // Parse the vitals information
    const parseResult = await parserService.parseVitalsText(vitalsText);
    
    if (!parseResult.success) {
      console.error("❌ [VitalsParser] Parsing failed:", parseResult.error);
      return res.status(400).json(parseResult);
    }

    // Transform parsed data to database format
    const vitalsData = {
      patientId,
      encounterId,
      recordedAt: new Date(),
      systolicBp: parseResult.data!.systolic_bp,
      diastolicBp: parseResult.data!.diastolic_bp,
      heartRate: parseResult.data!.heart_rate,
      temperature: parseResult.data!.temperature?.toString() || null,
      weight: parseResult.data!.weight?.toString() || null,
      height: parseResult.data!.height?.toString() || null,
      bmi: parseResult.data!.bmi?.toString() || null,
      oxygenSaturation: parseResult.data!.oxygen_saturation?.toString() || null,
      respiratoryRate: parseResult.data!.respiratory_rate,
      painScale: parseResult.data!.pain_scale,
      alerts: parseResult.data!.alerts || [],
      parsedFromText: true,
      originalText: vitalsText,
      recordedBy: "GPT Parser",
    };
    
    const savedVitals = await storage.createVitals(vitalsData);
    console.log(`✅ [VitalsParser] Saved vitals with ID: ${savedVitals.id}`);

    res.status(201).json({
      success: true,
      vitals: savedVitals,
      confidence: parseResult.confidence
    });

  } catch (error) {
    console.error("❌ [VitalsParser] Error in parse-and-create route:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse and save vitals"
    });
  }
});

/**
 * GET /api/vitals/test-parser
 * Test the vitals parser with sample data
 */
router.get("/test-parser", async (req: Request, res: Response) => {
  try {
    console.log("🧪 [VitalsParser] Running parser tests...");

    const testCases = [
      "120/80, P 80, RR 23, 98% on room air",
      "BP 160/90, HR 95, T 101.2F, O2 95%, pain 7/10",
      "Blood pressure 140 over 85, pulse 72, temp 38.5 celsius, weight 70 kg",
      "vitals stable: 118/76, HR 68, RR 16, afebrile, sat 99% RA",
      "Hypertensive: 185/95, tachycardic 110, febrile 102.1F"
    ];

    const results = [];
    
    for (const testCase of testCases) {
      console.log(`🧪 [VitalsParser] Testing: "${testCase}"`);
      const result = await parserService.parseVitalsText(testCase);
      results.push({
        input: testCase,
        output: result
      });
    }

    console.log("✅ [VitalsParser] All tests completed");
    res.json({
      success: true,
      testResults: results
    });

  } catch (error) {
    console.error("❌ [VitalsParser] Error in test route:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Test failed"
    });
  }
});

export default router;