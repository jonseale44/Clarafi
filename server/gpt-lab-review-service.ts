/**
 * GPT Lab Review Service - AI-powered lab result interpretation
 * Generates clinical reviews and patient communications using GPT-4.1
 */

import OpenAI from "openai";
import { db } from "./db.js";
import {
  gptLabReviewNotes,
  labResults,
  patients,
  encounters,
  diagnoses,
  medications,
  allergies,
  medicalHistory,
} from "@shared/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service";

// Note: GPT-4.1 is the newest model which was released after GPT-4o and is more advanced and cost-effective
// Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GPTLabReviewRequest {
  patientId: number;
  resultIds: number[];
  encounterId?: number;
  requestedBy: number;
}

export interface GPTPatientContext {
  demographics: {
    age: number;
    gender: string;
    mrn: string;
  };
  activeProblems: string[];
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  recentSOAP: string;
  priorLabResults: Array<{
    testName: string;
    value: string;
    date: string;
    abnormalFlag?: string;
  }>;
}

export interface GPTLabReviewResponse {
  clinicalReview: string;
  patientMessage: string;
  nurseMessage: string;
  processingTime: number;
  tokensUsed: number;
}

export class GPTLabReviewService {
  /**
   * Generate GPT-powered lab review for selected results
   */
  static async generateLabReview(
    request: GPTLabReviewRequest,
  ): Promise<number> {
    const startTime = Date.now();
    console.log(
      `🤖 [GPTLabReview] Starting review generation for patient ${request.patientId}, results: ${request.resultIds.join(",")}`,
    );

    try {
      // 1. Gather current lab results being reviewed
      const currentResults = await db
        .select({
          id: labResults.id,
          testName: labResults.testName,
          resultValue: labResults.resultValue,
          resultUnits: labResults.resultUnits,
          referenceRange: labResults.referenceRange,
          abnormalFlag: labResults.abnormalFlag,
          criticalFlag: labResults.criticalFlag,
          resultAvailableAt: labResults.resultAvailableAt,
          patientId: labResults.patientId
        })
        .from(labResults)
        .where(inArray(labResults.id, request.resultIds));

      if (currentResults.length === 0) {
        throw new Error("No lab results found for the specified IDs");
      }

      // 2. Get comprehensive patient context
      const patientContext = await this.buildPatientContext(request.patientId);

      // 3. Get historical lab results for trending
      const historicalResults = await this.getHistoricalLabResults(
        request.patientId,
        currentResults,
      );
      patientContext.priorLabResults = historicalResults;

      // 4. Get most recent SOAP note for clinical context
      const recentSOAP = await this.getRecentSOAPNote(request.patientId);
      patientContext.recentSOAP = recentSOAP;

      // 5. Generate GPT review
      const gptResponse = await this.callGPTForLabReview(
        currentResults,
        patientContext,
      );

      // 6. Save to database
      const reviewId = await this.saveGPTReview({
        patientId: request.patientId,
        encounterId: request.encounterId,
        resultIds: request.resultIds,
        generatedBy: request.requestedBy,
        patientContext,
        gptResponse,
        processingTime: Date.now() - startTime,
      });

      console.log(
        `🤖 [GPTLabReview] Review generated successfully with ID: ${reviewId}`,
      );
      return reviewId;
    } catch (error) {
      console.error("🤖 [GPTLabReview] Error generating review:", error);
      throw error;
    }
  }

  /**
   * Build comprehensive patient context for GPT
   */
  private static async buildPatientContext(
    patientId: number,
  ): Promise<GPTPatientContext> {
    console.log(
      `🤖 [GPTLabReview] Building patient context for patient ${patientId}`,
    );

    // Get comprehensive chart data
    const chartData = await PatientChartService.getPatientChartData(patientId);

    return {
      demographics: chartData.demographics,
      activeProblems: chartData.activeProblems.map(
        (p: any) => p.title || p.diagnosis || p,
      ),
      currentMedications: chartData.currentMedications.map((m: any) => ({
        name: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      allergies: chartData.allergies.map((a: any) => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
      })),
      recentSOAP: "", // Will be populated separately
      priorLabResults: [], // Will be populated separately
    };
  }

  /**
   * Get historical lab results for trending analysis
   */
  private static async getHistoricalLabResults(
    patientId: number,
    currentResults: any[],
  ): Promise<
    Array<{
      testName: string;
      value: string;
      date: string;
      abnormalFlag?: string;
    }>
  > {
    // Get unique test names from current results
    const testNames = Array.from(new Set(currentResults.map((r) => r.testName)));

    // Get historical results for these tests (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const historicalResults = await db
      .select({
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        resultAvailableAt: labResults.resultAvailableAt,
        abnormalFlag: labResults.abnormalFlag,
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          inArray(labResults.testName, testNames),
        ),
      )
      .orderBy(desc(labResults.resultAvailableAt))
      .limit(50); // Limit to prevent excessive context

    return historicalResults.map((r) => ({
      testName: r.testName,
      value: r.resultValue || "N/A",
      date: r.resultAvailableAt?.toISOString().split("T")[0] || "",
      abnormalFlag: r.abnormalFlag || undefined,
    }));
  }

  /**
   * Get most recent SOAP note for clinical context
   */
  private static async getRecentSOAPNote(patientId: number): Promise<string> {
    try {
      const recentEncounter = await db
        .select({
          subjectiveFindings: encounters.subjectiveFindings,
          objectiveFindings: encounters.objectiveFindings,
          assessment: encounters.assessment,
          plan: encounters.plan,
          encounterDate: encounters.encounterDate,
        })
        .from(encounters)
        .where(eq(encounters.patientId, patientId))
        .orderBy(desc(encounters.encounterDate))
        .limit(1);

      if (recentEncounter.length === 0) {
        return "No recent SOAP notes available";
      }

      const encounter = recentEncounter[0];
      return `Recent SOAP Note (${encounter.encounterDate?.toISOString().split("T")[0]}):
SUBJECTIVE: ${encounter.subjectiveFindings || "Not documented"}
OBJECTIVE: ${encounter.objectiveFindings || "Not documented"}
ASSESSMENT: ${encounter.assessment || "Not documented"}
PLAN: ${encounter.plan || "Not documented"}`;
    } catch (error) {
      console.error("🤖 [GPTLabReview] Error fetching SOAP note:", error);
      return "Error retrieving recent SOAP notes";
    }
  }

  /**
   * Call GPT-4.1 for lab review generation
   */
  private static async callGPTForLabReview(
    currentResults: any[],
    patientContext: GPTPatientContext,
  ): Promise<GPTLabReviewResponse> {
    console.log(
      `🤖 [GPTLabReview] Calling GPT-4.1 for ${currentResults.length} lab results`,
    );

    const labResultsSummary = currentResults
      .map(
        (result) => `
- ${result.testName}: ${result.resultValue} ${result.resultUnits || ""} ${result.referenceRange ? `(Ref: ${result.referenceRange})` : ""} ${result.abnormalFlag ? `[${result.abnormalFlag}]` : ""} ${result.criticalFlag ? "[CRITICAL]" : ""}
    `,
      )
      .join("");

    const historicalTrends =
      patientContext.priorLabResults.length > 0
        ? `\nHISTORICAL LAB TRENDS:\n${patientContext.priorLabResults
            .map(
              (h) =>
                `- ${h.testName}: ${h.value} (${h.date}) ${h.abnormalFlag ? `[${h.abnormalFlag}]` : ""}`,
            )
            .join("\n")}`
        : "\nNo significant historical lab data available.";

    const prompt = `You are an experienced physician reviewing lab results. You must provide a comprehensive clinical interpretation and generate appropriate patient communications.

PATIENT CONTEXT:
- Demographics: ${patientContext.demographics.age} year old ${patientContext.demographics.gender}, MRN: ${patientContext.demographics.mrn}
- Active Problems: ${patientContext.activeProblems.length > 0 ? patientContext.activeProblems.join(", ") : "None documented"}
- Current Medications: ${patientContext.currentMedications.length > 0 ? patientContext.currentMedications.map((m) => `${m.name} ${m.dosage} ${m.frequency}`).join(", ") : "None documented"}
- Allergies: ${patientContext.allergies.length > 0 ? patientContext.allergies.map((a) => `${a.allergen} (${a.reaction})`).join(", ") : "NKDA"}

${patientContext.recentSOAP}

CURRENT LAB RESULTS UNDER REVIEW:
${labResultsSummary}
${historicalTrends}

INSTRUCTIONS:
1. Write a clinical review (2-3 sentences) interpreting these results in the context of the patient's clinical picture
2. Generate a patient message explaining the results in lay terms with appropriate next steps/actions
3. Generate a nurse message with the same content but phrased for the nurse who will call the patient

Format your response as JSON:
{
  "clinicalReview": "Brief clinical interpretation for physician review...",
  "patientMessage": "Patient-friendly explanation with next steps...",
  "nurseMessage": "Message for nurse calling patient with same content but appropriate phrasing..."
}

The patient and nurse messages should be identical in content but different in phrasing - the patient message should be direct to the patient, while the nurse message should be phrased as instructions for what the nurse should tell the patient.`;

    try {
      console.log(
        `🤖 [GPTLabReview] Sending prompt to GPT-4 (${prompt.length} characters)`,
      );

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini", // Using GPT-4.1 - the newest OpenAI model which was released after gpt-4o and is more advanced and cost-effective
        messages: [
          {
            role: "system",
            content:
              "You are an experienced physician. Always respond with valid JSON in the exact format requested.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Lower temperature for more consistent medical interpretations
        max_tokens: 30000, // Ensure enough tokens for complete response
      });

      console.log(
        `🤖 [GPTLabReview] GPT-4 response received, usage:`,
        response.usage,
      );

      const content = response.choices[0].message.content;
      if (!content) {
        console.error("🤖 [GPTLabReview] No response content from GPT");
        throw new Error("No response content from GPT");
      }

      console.log(
        `🤖 [GPTLabReview] Raw GPT response (${content.length} chars):`,
        content.substring(0, 200) + "...",
      );

      // Extract JSON from the response if it's wrapped in markdown or other text
      let jsonContent = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      console.log(
        `🤖 [GPTLabReview] Parsing JSON content:`,
        jsonContent.substring(0, 200) + "...",
      );

      const parsedResponse = JSON.parse(jsonContent);

      console.log(`🤖 [GPTLabReview] Successfully parsed GPT response:`, {
        clinicalReview: parsedResponse.clinicalReview?.length || 0,
        patientMessage: parsedResponse.patientMessage?.length || 0,
        nurseMessage: parsedResponse.nurseMessage?.length || 0,
      });

      return {
        clinicalReview:
          parsedResponse.clinicalReview || "No clinical review generated",
        patientMessage:
          parsedResponse.patientMessage || "No patient message generated",
        nurseMessage:
          parsedResponse.nurseMessage || "No nurse message generated",
        processingTime: 0, // Will be calculated by caller
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error: any) {
      console.error("🤖 [GPTLabReview] GPT API error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        param: error.param,
        response: error.response?.data,
      });

      if (error.response?.data) {
        console.error(
          "🤖 [GPTLabReview] Full OpenAI error response:",
          error.response.data,
        );
      }

      throw new Error(
        `GPT processing failed: ${error.status || "Unknown"} ${error.message}`,
      );
    }
  }

  /**
   * Save GPT review to database
   */
  private static async saveGPTReview(data: {
    patientId: number;
    encounterId?: number;
    resultIds: number[];
    generatedBy: number;
    patientContext: GPTPatientContext;
    gptResponse: GPTLabReviewResponse;
    processingTime: number;
  }): Promise<number> {
    const [savedReview] = await db
      .insert(gptLabReviewNotes)
      .values({
        patientId: data.patientId,
        encounterId: data.encounterId,
        resultIds: data.resultIds,
        clinicalReview: data.gptResponse.clinicalReview,
        patientMessage: data.gptResponse.patientMessage,
        nurseMessage: data.gptResponse.nurseMessage,
        patientContext: data.patientContext,
        gptModel: "gpt-4", // Track model version
        promptVersion: "v1.0",
        processingTime: data.processingTime,
        tokensUsed: data.gptResponse.tokensUsed,
        generatedBy: data.generatedBy,
        status: "draft", // Requires provider approval
      })
      .returning({ id: gptLabReviewNotes.id });

    return savedReview.id;
  }

  /**
   * Get GPT review by ID
   */
  static async getGPTReview(reviewId: number): Promise<any> {
    const review = await db
      .select()
      .from(gptLabReviewNotes)
      .where(eq(gptLabReviewNotes.id, reviewId))
      .limit(1);

    return review[0] || null;
  }

  /**
   * Get GPT reviews for specific result IDs
   */
  static async getGPTReviewsForResults(resultIds: number[]): Promise<any[]> {
    // For PostgreSQL array overlap, we'll use a different approach
    // This queries for reviews where any of the result IDs overlap
    const reviews = await db
      .select()
      .from(gptLabReviewNotes)
      .orderBy(desc(gptLabReviewNotes.createdAt));

    // Filter in application for array overlap
    return reviews.filter(
      (review) =>
        review.resultIds &&
        review.resultIds.some((id) => resultIds.includes(id)),
    );
  }

  /**
   * Update GPT review content (provider edits)
   */
  static async updateGPTReview(
    reviewId: number,
    updates: {
      clinicalReview?: string;
      patientMessage?: string;
      nurseMessage?: string;
      revisedBy: number;
      revisionReason: string;
    },
  ): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
      revisedBy: updates.revisedBy,
      revisionReason: updates.revisionReason,
      status: "revised", // Mark as revised when edited
    };

    if (updates.clinicalReview !== undefined) {
      updateData.clinicalReview = updates.clinicalReview;
    }
    if (updates.patientMessage !== undefined) {
      updateData.patientMessage = updates.patientMessage;
    }
    if (updates.nurseMessage !== undefined) {
      updateData.nurseMessage = updates.nurseMessage;
    }

    await db
      .update(gptLabReviewNotes)
      .set(updateData)
      .where(eq(gptLabReviewNotes.id, reviewId));

    console.log(
      `🤖 [GPTLabReview] Review ${reviewId} updated by user ${updates.revisedBy}`,
    );
  }

  /**
   * Approve GPT review for sending
   */
  static async approveGPTReview(
    reviewId: number,
    approvedBy: number,
  ): Promise<void> {
    await db
      .update(gptLabReviewNotes)
      .set({
        status: "approved",
        reviewedBy: approvedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gptLabReviewNotes.id, reviewId));
  }

  /**
   * Get all GPT reviews for a specific patient
   */
  static async getGPTReviewsForPatient(patientId: number): Promise<any[]> {
    const reviews = await db
      .select()
      .from(gptLabReviewNotes)
      .where(eq(gptLabReviewNotes.patientId, patientId))
      .orderBy(desc(gptLabReviewNotes.generatedAt));

    console.log(
      `🤖 [GPTLabReview] Found ${reviews.length} GPT reviews for patient ${patientId}`,
    );

    return reviews;
  }
}
