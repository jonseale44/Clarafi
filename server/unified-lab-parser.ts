import OpenAI from "openai";
import { db } from "./db.js";
import {
  labResults,
  labOrders,
  externalLabs,
  patientAttachments,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface ParsedLabResult {
  testName: string;
  testCode?: string;
  loincCode?: string;
  resultValue: string;
  resultNumeric?: number;
  resultUnits?: string;
  referenceRange?: string;
  abnormalFlag?: string; // 'H', 'L', 'HH', 'LL', 'A', 'AA'
  criticalFlag?: boolean;
  testCategory?: string; // 'chemistry', 'hematology', 'microbiology', 'molecular'
  specimenCollectedAt?: string; // ISO date string
  resultAvailableAt?: string; // ISO date string
  resultStatus?: string; // 'preliminary', 'final', 'corrected'
  consolidationReasoning?: string;
  confidence?: number;
  warnings?: string[];
  extractedDate?: string;
  timeContext?: string;
}

interface LabParsingResult {
  success: boolean;
  data?: ParsedLabResult[];
  errors?: string[];
  confidence: number;
  originalText: string;
  totalResultsFound?: number;
  consolidatedCount?: number;
}

export class UnifiedLabParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseLabText(
    labText: string,
    patientId: number,
    patientContext?: { age?: number; gender?: string; existingResults?: any[] },
  ): Promise<LabParsingResult> {
    if (!labText || labText.trim().length === 0) {
      return {
        success: false,
        errors: ["No lab text provided"],
        confidence: 0,
        originalText: labText || "",
      };
    }

    console.log(
      "🧪 [LAB PARSING] ============= STARTING GPT-4.1 LAB RESULTS PARSING =============",
    );
    console.log(
      "⚗️ [LabParser] Input text length:",
      labText.length,
      "characters",
    );
    console.log("⚗️ [LabParser] Patient context:", patientContext);
    console.log(
      "⚗️ [LabParser] Parsing lab text preview:",
      labText.substring(0, 200) + (labText.length > 200 ? "..." : ""),
    );

    try {
      // Get existing lab results for consolidation
      const existingResults = await this.getExistingLabResults(patientId);
      console.log(
        "⚗️ [LabParser] Found",
        existingResults.length,
        "existing lab results for consolidation analysis",
      );

      // Enhanced GPT prompt for comprehensive lab results extraction
      const prompt = `You are an expert clinical laboratory technologist with 20+ years of experience analyzing lab reports and integrating results into EMR systems.

Analyze this clinical document and extract ALL laboratory results, including historical data from multiple dates/timepoints.

EXISTING PATIENT LAB RESULTS FOR CONSOLIDATION:
${this.formatExistingResults(existingResults)}

Return ONLY a valid JSON array with this structure:
[
  {
    "testName": "standardized test name",
    "testCode": "lab-specific code or null",
    "loincCode": "LOINC code if identifiable or null",
    "resultValue": "exact result as reported",
    "resultNumeric": number or null (for trending),
    "resultUnits": "units (mg/dL, mmol/L, etc.) or null",
    "referenceRange": "normal range as reported or null",
    "abnormalFlag": "H/L/HH/LL/A/AA or null",
    "criticalFlag": boolean (life-threatening values),
    "testCategory": "chemistry/hematology/microbiology/molecular/immunology or null",
    "specimenCollectedAt": "YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss if time available",
    "resultAvailableAt": "YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss if available",
    "resultStatus": "preliminary/final/corrected or final if not specified",
    "consolidationReasoning": "why this result should/shouldn't be consolidated with existing",
    "confidence": number (0-100, confidence in extraction accuracy),
    "warnings": ["array of critical value or interpretation warnings"],
    "extractedDate": "YYYY-MM-DD primary date for this result",
    "timeContext": "admission/day1/outpatient/followup/etc or null"
  }
]

CRITICAL LABORATORY INTELLIGENCE RULES:
- EXCLUDE ALL VITAL SIGNS - DO NOT extract: blood pressure, heart rate, respiratory rate, temperature, oxygen saturation, weight, height, BMI, pain scale
- ONLY extract true laboratory tests: blood tests, urine tests, cultures, pathology, molecular tests, etc.
- Standardize test names (CBC with Differential → Complete Blood Count, BMP → Basic Metabolic Panel)
- Extract ALL individual components from panels (CBC → WBC, RBC, Hemoglobin, Hematocrit, Platelets, etc.)
- Consolidate duplicate tests from same date/specimen with confidence reasoning
- Flag critical values (glucose <50 or >400, creatinine >3.0, WBC <2.0 or >20.0, etc.)
- Convert units to standard format (mg/dL preferred for US labs)
- Assign LOINC codes when clearly identifiable from context
- Determine test category from result type and reference ranges (chemistry/hematology/microbiology/molecular - NEVER "vital signs")
- Extract temporal context even without explicit dates
- Preserve exact result values with appropriate precision
- Use consolidation reasoning to explain merge/separate decisions
- Return empty array if no lab results found
- No explanatory text, ONLY the JSON array

CONSOLIDATION LOGIC:
- Same test + same date = consolidate (choose most complete/recent entry)
- Same test + different dates = separate entries
- Panel components = separate individual test entries
- Consider existing patient results to avoid unnecessary duplication

Input: "${labText}"`;

      console.log("⚗️ [LabParser] 🤖 Calling OpenAI GPT-4.1...");
      console.log(
        "⚗️ [LabParser] 🤖 Model: gpt-4.1, Temperature: 0.1, Max tokens: 30000",
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 30000,
      });

      const aiResponseText = response.choices[0]?.message?.content?.trim();
      console.log(
        "⚗️ [LabParser] 🤖 GPT Response length:",
        aiResponseText?.length || 0,
        "characters",
      );
      console.log(
        "⚗️ [LabParser] 🤖 GPT Response preview:",
        aiResponseText?.substring(0, 300) +
          (aiResponseText && aiResponseText.length > 300 ? "..." : ""),
      );

      if (!aiResponseText) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response - strip markdown formatting if present
      let parsedResults: ParsedLabResult[];
      try {
        // Strip markdown code blocks if present
        let cleanedResponse = aiResponseText.trim();
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "");
        } else if (cleanedResponse.startsWith("```")) {
          cleanedResponse = cleanedResponse
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        parsedResults = JSON.parse(cleanedResponse);
        if (!Array.isArray(parsedResults)) {
          throw new Error("Response is not an array");
        }
        console.log(
          "⚗️ [LabParser] ✅ Successfully parsed",
          parsedResults.length,
          "lab results from GPT response",
        );
      } catch (parseError) {
        console.error(
          "⚗️ [LabParser] ❌ Failed to parse GPT response as JSON:",
          parseError,
        );
        console.error("⚗️ [LabParser] ❌ Raw response:", aiResponseText);
        throw new Error(`Invalid JSON response from AI: ${parseError}`);
      }

      // Validate and enhance results
      const validatedResults = this.validateAndEnhanceResults(parsedResults);
      console.log(
        "⚗️ [LabParser] ✅ Validated",
        validatedResults.length,
        "lab results",
      );

      // Calculate overall confidence
      const avgConfidence =
        validatedResults.length > 0
          ? validatedResults.reduce(
              (sum, result) => sum + (result.confidence || 0),
              0,
            ) / validatedResults.length
          : 0;

      console.log(
        "⚗️ [LabParser] ✅ PARSING COMPLETE - Average confidence:",
        avgConfidence.toFixed(1) + "%",
      );
      console.log(
        "⚗️ [LabParser] ✅ Total results extracted:",
        validatedResults.length,
      );

      return {
        success: true,
        data: validatedResults,
        confidence: Math.round(avgConfidence),
        originalText: labText,
        totalResultsFound: validatedResults.length,
        consolidatedCount: validatedResults.filter((r) =>
          r.consolidationReasoning?.includes("consolidat"),
        ).length,
      };
    } catch (error) {
      console.error("⚗️ [LabParser] ❌ Error during lab parsing:", error);
      return {
        success: false,
        errors: [
          error instanceof Error ? error.message : "Unknown parsing error",
        ],
        confidence: 0,
        originalText: labText,
      };
    }
  }

  private async getExistingLabResults(patientId: number): Promise<any[]> {
    try {
      const results = await db
        .select({
          testName: labResults.testName,
          resultValue: labResults.resultValue,
          resultUnits: labResults.resultUnits,
          specimenCollectedAt: labResults.specimenCollectedAt,
          resultAvailableAt: labResults.resultAvailableAt,
          testCategory: labResults.testCategory,
        })
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.specimenCollectedAt))
        .limit(20); // Recent results for context

      return results;
    } catch (error) {
      console.error("⚗️ [LabParser] Error fetching existing results:", error);
      return [];
    }
  }

  private formatExistingResults(results: any[]): string {
    if (results.length === 0) {
      return "No existing lab results found.";
    }

    return results
      .map(
        (result) =>
          `${result.testName}: ${result.resultValue} ${result.resultUnits || ""} (${result.specimenCollectedAt || "Unknown date"})`,
      )
      .join("\n");
  }

  private validateAndEnhanceResults(
    results: ParsedLabResult[],
  ): ParsedLabResult[] {
    // List of vital sign test names to exclude
    const vitalSignTests = [
      'blood pressure', 'bp', 'systolic', 'diastolic',
      'heart rate', 'pulse', 'hr',
      'respiratory rate', 'rr', 'respiration',
      'temperature', 'temp',
      'oxygen saturation', 'o2 sat', 'spo2', 'pulse ox',
      'weight', 'body weight',
      'height', 'body height',
      'bmi', 'body mass index',
      'pain scale', 'pain score', 'pain level'
    ];

    return results
      .filter((result) => {
        // Must have basic data
        if (!result.testName || !result.resultValue) return false;
        
        // Exclude vital signs
        const testNameLower = result.testName.toLowerCase();
        const isVitalSign = vitalSignTests.some(vital => testNameLower.includes(vital.toLowerCase()));
        if (isVitalSign) {
          console.log(`⚗️ [LabParser] ⚠️ Filtering out vital sign: ${result.testName}`);
          return false;
        }
        
        // Exclude if test category is explicitly "vital signs"
        if (result.testCategory?.toLowerCase() === 'vital signs') {
          console.log(`⚗️ [LabParser] ⚠️ Filtering out test with vital signs category: ${result.testName}`);
          return false;
        }
        
        return true;
      })
      .map((result) => ({
        ...result,
        confidence: Math.min(100, Math.max(0, result.confidence || 75)), // Ensure 0-100 range
        criticalFlag: result.criticalFlag || false,
        resultStatus: result.resultStatus || "final",
        testCategory: result.testCategory || "chemistry",
        warnings: result.warnings || [],
      }));
  }

  // Main processing method for attachment integration
  async processLabResults(
    extractedText: string,
    patientId: number,
    attachmentId: number,
    sourceType: "attachment" = "attachment",
  ): Promise<{ resultsCount: number; confidence: number }> {
    console.log(
      "⚗️ [LabParser] Processing lab results for patient",
      patientId,
      "from attachment",
      attachmentId,
    );

    const parseResult = await this.parseLabText(extractedText, patientId);

    if (
      !parseResult.success ||
      !parseResult.data ||
      parseResult.data.length === 0
    ) {
      console.log("⚗️ [LabParser] No lab results found in attachment");
      return { resultsCount: 0, confidence: 0 };
    }

    let savedCount = 0;

    // Save each lab result to database
    for (const labResult of parseResult.data) {
      try {
        console.log(`⚗️ [LabParser] 🔍 Processing lab result for database insertion:`, {
          testName: labResult.testName,
          resultValue: labResult.resultValue,
          resultNumeric: labResult.resultNumeric,
          resultNumericType: typeof labResult.resultNumeric,
          sourceConfidence: parseResult.confidence,
          maxConfidenceAllowed: 9.99
        });

        // Ensure confidence doesn't exceed database precision limits (3,2 = max 9.99)
        const safeConfidence = Math.min(parseResult.confidence || 0, 9.99);
        
        // Safely handle resultNumeric to prevent overflow
        let safeResultNumeric = null;
        if (labResult.resultNumeric !== null && labResult.resultNumeric !== undefined) {
          // Convert to number and check bounds
          const numericValue = Number(labResult.resultNumeric);
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            // Database precision: decimal(15, 6) means max 999999999.999999
            if (Math.abs(numericValue) < 999999999.999999) {
              safeResultNumeric = numericValue.toString();
            } else {
              console.warn(`⚗️ [LabParser] ⚠️ Numeric value too large for database, skipping: ${numericValue}`);
            }
          } else {
            console.warn(`⚗️ [LabParser] ⚠️ Invalid numeric value, skipping: ${labResult.resultNumeric}`);
          }
        }
        
        console.log(`⚗️ [LabParser] 🛡️ Safe values for insertion:`, {
          testName: labResult.testName,
          safeConfidence,
          safeResultNumeric,
          originalResultNumeric: labResult.resultNumeric
        });
        
        await db.insert(labResults).values({
          patientId: patientId,
          labOrderId: null, // Attachment results don't have associated orders
          loincCode:
            labResult.loincCode || `EXTRACT_${labResult.testCode || "UNKNOWN"}`,
          testCode:
            labResult.testCode ||
            `EXT_${labResult.testName.replace(/\s+/g, "_").toUpperCase()}`,
          testName: labResult.testName,
          testCategory: labResult.testCategory || "chemistry",
          resultValue: labResult.resultValue,
          resultNumeric: safeResultNumeric,
          resultUnits: labResult.resultUnits,
          referenceRange: labResult.referenceRange,
          abnormalFlag: labResult.abnormalFlag,
          criticalFlag: labResult.criticalFlag || false,
          resultStatus: labResult.resultStatus || "final",
          verificationStatus: "verified",
          specimenCollectedAt: labResult.specimenCollectedAt
            ? new Date(labResult.specimenCollectedAt)
            : null,
          resultAvailableAt: labResult.resultAvailableAt
            ? new Date(labResult.resultAvailableAt)
            : new Date(),
          resultFinalizedAt: new Date(),
          receivedAt: new Date(),
          externalLabId: "3", // Hospital Lab for attachment results
          externalResultId: `ATT_${attachmentId}_${savedCount + 1}`,
          sourceType: sourceType,
          sourceConfidence: safeConfidence,
          extractedFromAttachmentId: attachmentId,
          needsReview: labResult.criticalFlag || false,
          reviewStatus: labResult.criticalFlag ? "pending" : "reviewed",
        });

        savedCount++;
        console.log(
          `⚗️ [LabParser] Saved lab result: ${labResult.testName} = ${labResult.resultValue} ${labResult.resultUnits || ""}`,
        );
      } catch (error) {
        console.error(
          `⚗️ [LabParser] Error saving lab result ${labResult.testName}:`,
          error,
        );
      }
    }

    console.log(
      `⚗️ [LabParser] Successfully saved ${savedCount}/${parseResult.data.length} lab results`,
    );

    return {
      resultsCount: savedCount,
      confidence: parseResult.confidence,
    };
  }
}

export const unifiedLabParser = new UnifiedLabParser();
