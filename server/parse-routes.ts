import { Request, Response, Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { PatientParserService } from "./patient-parser-service";
import { db } from "./db";
import { patients, insertPatientSchema } from "../shared/schema";

const router = Router();

// Request schema for patient parsing
const parseRequestSchema = z.object({
  imageData: z.string().optional(),
  textContent: z.string().optional(),
  isTextContent: z.boolean().default(false),
});

// Initialize the parser service
const parserService = new PatientParserService();

/**
 * POST /api/parse-patient-info
 * Parses patient information from uploaded documents or text using GPT-4o Vision
 */
router.post("/parse-patient-info", async (req: Request, res: Response) => {
  try {
    console.log("🔍 [PatientParser] Parsing patient information...");
    
    // Validate request body
    const validationResult = parseRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        details: validationResult.error.errors
      });
    }

    const { imageData, textContent, isTextContent } = validationResult.data;

    // Ensure we have either image or text content
    if (!imageData && !textContent) {
      return res.status(400).json({
        success: false,
        error: "Either imageData or textContent must be provided"
      });
    }

    // Parse the patient information
    const parseResult = await parserService.parsePatientInfo(
      imageData,
      textContent,
      isTextContent
    );

    if (!parseResult.success) {
      console.error("❌ [PatientParser] Parsing failed:", parseResult.error);
      return res.status(400).json(parseResult);
    }

    console.log("✅ [PatientParser] Successfully parsed patient data");
    console.log(`📊 [PatientParser] Confidence: ${parseResult.confidence}%`);

    res.json(parseResult);

  } catch (error) {
    console.error("❌ [PatientParser] Server error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during patient parsing"
    });
  }
});

/**
 * POST /api/parse-and-create-patient
 * Parses patient information and creates a new patient record
 */
router.post("/parse-and-create-patient", async (req: Request, res: Response) => {
  try {
    console.log("🔍 [PatientParser] Parsing and creating patient...");
    
    // Validate request body
    const validationResult = parseRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        details: validationResult.error.errors
      });
    }

    const { imageData, textContent, isTextContent } = validationResult.data;

    // Parse the patient information
    const parseResult = await parserService.parsePatientInfo(
      imageData,
      textContent,
      isTextContent
    );

    if (!parseResult.success || !parseResult.data) {
      console.error("❌ [PatientParser] Parsing failed:", parseResult.error);
      return res.status(400).json(parseResult);
    }

    // Validate required fields for patient creation
    const validation = parserService.validateRequiredFields(parseResult.data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Missing required patient information",
        missingFields: validation.missingFields,
        extractedData: parseResult.data
      });
    }

    // Format data for patient creation
    const patientData = parserService.formatForPatientCreation(parseResult.data);
    
    // Validate against schema
    const schemaValidation = insertPatientSchema.safeParse(patientData);
    if (!schemaValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Patient data validation failed",
        details: schemaValidation.error.errors
      });
    }

    // Check if patient already exists (by name and DOB)
    const existingPatient = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.firstName, patientData.firstName),
          eq(patients.lastName, patientData.lastName),
          eq(patients.dateOfBirth, patientData.dateOfBirth)
        )
      )
      .limit(1);

    if (existingPatient.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Patient with this name and date of birth already exists",
        existingPatient: existingPatient[0]
      });
    }

    // Create the patient
    const [newPatient] = await db
      .insert(patients)
      .values(patientData)
      .returning();

    console.log("✅ [PatientParser] Successfully created patient:", newPatient.id);

    res.status(201).json({
      success: true,
      patient: newPatient,
      parseConfidence: parseResult.confidence,
      extractedData: parseResult.data
    });

  } catch (error) {
    console.error("❌ [PatientParser] Server error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during patient creation"
    });
  }
});

/**
 * POST /api/validate-parsed-data
 * Validates parsed patient data without creating a patient record
 */
router.post("/validate-parsed-data", async (req: Request, res: Response) => {
  try {
    const { extractedData } = req.body;
    
    if (!extractedData) {
      return res.status(400).json({
        success: false,
        error: "extractedData is required"
      });
    }

    // Validate the extracted data
    const validation = parserService.validateRequiredFields(extractedData);
    
    // Format for patient creation to test schema validation
    const patientData = parserService.formatForPatientCreation(extractedData);
    const schemaValidation = insertPatientSchema.safeParse(patientData);

    // Check for existing patient
    const existingCheck = await db
      .select()
      .from(patients)
      .where(
        (patient) => 
          patient.firstName.eq(patientData.firstName) &&
          patient.lastName.eq(patientData.lastName) &&
          patient.dateOfBirth.eq(patientData.dateOfBirth)
      )
      .limit(1);

    res.json({
      success: true,
      validation: {
        hasRequiredFields: validation.valid,
        missingFields: validation.missingFields,
        schemaValid: schemaValidation.success,
        schemaErrors: schemaValidation.success ? [] : schemaValidation.error.errors,
        patientExists: existingCheck.length > 0,
        existingPatient: existingCheck[0] || null
      },
      formattedData: patientData
    });

  } catch (error) {
    console.error("❌ [PatientParser] Validation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during validation"
    });
  }
});

export { router as parseRoutes };