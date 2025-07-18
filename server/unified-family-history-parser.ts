/**
 * Unified Family History Parser Service
 *
 * Processes family history from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and consolidation
 * - Source attribution and confidence scoring
 * - Visit history tracking for family history updates over time
 * - Parallel processing architecture for multiple chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { familyHistory, encounters, patients } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedFamilyHistoryVisitEntry {
  date: string; // Medical event date
  notes: string; // Visit notes about family history changes
  source: "encounter" | "attachment" | "manual" | "imported_record";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  changesMade?: string[]; // What was updated in this visit
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
  sourceConfidence?: number;
  sourceNotes?: string;
}

export interface UnifiedFamilyHistoryChange {
  action: "create" | "update" | "consolidate";
  familyMember: string;
  condition: string; // Changed from medicalHistory to match database
  consolidationReason?: string;
  confidence: number;
  visitEntry: UnifiedFamilyHistoryVisitEntry;
  existingRecordId?: number;
  negativeHistory?: boolean; // Track explicit denials
}

export class UnifiedFamilyHistoryParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main processing function - handles both SOAP notes and attachments
   */
  async processUnified(
    patientId: number,
    encounterId: number | null,
    soapNote: string | null,
    attachmentContent: string | null,
    triggerType:
      | "stop_recording"
      | "manual_processing"
      | "attachment_processing" = "manual_processing",
    attachmentId?: number,
  ): Promise<{
    success: boolean;
    changes: UnifiedFamilyHistoryChange[];
    familyHistoryAffected: number;
    encounterFamilyHistory: number;
    attachmentFamilyHistory: number;
  }> {
    console.log(
      `🔥 [UNIFIED FAMILY HISTORY] ============= PROCESSING INITIATED =============`,
    );
    console.log(
      `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Processing family history for patient ${patientId}`,
    );
    console.log(
      `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Trigger: ${triggerType}, Encounter: ${encounterId}, Attachment: ${attachmentId}`,
    );
    console.log(
      `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] SOAP note length: ${soapNote?.length || 0} characters`,
    );
    console.log(
      `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Attachment content length: ${attachmentContent?.length || 0} characters`,
    );

    if (soapNote) {
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] SOAP note preview: "${soapNote.substring(0, 200)}..."`,
      );
    }
    if (attachmentContent) {
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Attachment content preview: "${attachmentContent.substring(0, 200)}..."`,
      );
    }

    if (!soapNote && !attachmentContent) {
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] ⚠️ No content to process - skipping`,
      );
      return {
        success: true,
        changes: [],
        familyHistoryAffected: 0,
        encounterFamilyHistory: 0,
        attachmentFamilyHistory: 0,
      };
    }

    try {
      // Get existing family history for consolidation
      const existingFamilyHistory =
        await this.getExistingFamilyHistory(patientId);
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Found ${existingFamilyHistory.length} existing family history entries for patient ${patientId}`,
      );

      // Get patient chart context for intelligent extraction
      const patientChart =
        await PatientChartService.getPatientChartData(patientId);
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`,
      );

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(
        soapNote,
        attachmentContent,
      );
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for family history extraction
      const gptResponse = await this.callGPTForFamilyHistoryAnalysis(
        combinedContent,
        existingFamilyHistory,
        patientContextForGPT,
        triggerType,
        attachmentId,
      );

      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] GPT processing complete, ${gptResponse.length} family history changes identified`,
      );

      // Apply each change from GPT response
      const changes: UnifiedFamilyHistoryChange[] = [];
      let familyHistoryAffected = 0;
      let encounterFamilyHistory = 0;
      let attachmentFamilyHistory = 0;

      for (const change of gptResponse) {
        try {
          const result = await this.applyFamilyHistoryChange(
            change,
            patientId,
            encounterId,
            attachmentId,
          );
          if (result.success) {
            changes.push(change);
            familyHistoryAffected++;

            if (change.visitEntry.source === "encounter") {
              encounterFamilyHistory++;
            } else if (change.visitEntry.source === "attachment") {
              attachmentFamilyHistory++;
            }
          }
        } catch (error) {
          console.error(
            `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Error applying change for ${change.familyMember}:`,
            error,
          );
        }
      }

      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] 📊 Processing complete: ${familyHistoryAffected} family history entries affected`,
      );
      console.log(
        `🔥 [UNIFIED FAMILY HISTORY] ============= PROCESSING COMPLETE =============`,
      );

      return {
        success: true,
        changes,
        familyHistoryAffected,
        encounterFamilyHistory,
        attachmentFamilyHistory,
      };
    } catch (error) {
      console.error(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Error in processUnified:`,
        error,
      );
      return {
        success: false,
        changes: [],
        familyHistoryAffected: 0,
        encounterFamilyHistory: 0,
        attachmentFamilyHistory: 0,
      };
    }
  }

  /**
   * Get existing family history for consolidation logic
   */
  private async getExistingFamilyHistory(patientId: number): Promise<any[]> {
    return await db
      .select()
      .from(familyHistory)
      .where(eq(familyHistory.patientId, patientId));
  }

  /**
   * Prepare combined content from SOAP note and attachment
   */
  private prepareCombinedContent(
    soapNote: string | null,
    attachmentContent: string | null,
  ): string {
    const sections = [];

    if (soapNote) {
      sections.push(`CURRENT ENCOUNTER NOTES:\n${soapNote}`);
    }

    if (attachmentContent) {
      sections.push(`ATTACHMENT CONTENT:\n${attachmentContent}`);
    }

    return sections.join("\n\n");
  }

  /**
   * Format patient chart data for GPT consumption
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current Medical Problems (for genetic predisposition context)
    if (patientChart.medicalProblems?.length > 0) {
      sections.push(`
CURRENT MEDICAL PROBLEMS (Use for genetic/hereditary correlations):
${patientChart.medicalProblems
  .map((mp: any) => `- ${mp.problemTitle} (${mp.problemStatus})`)
  .join("\n")}`);
    }

    // Current Medications (for medication-related family history context)
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`
CURRENT MEDICATIONS (Use for hereditary condition context):
${patientChart.currentMedications
  .map((med: any) => `- ${med.medicationName} ${med.dosage} ${med.frequency}`)
  .join("\n")}`);
    }

    // Existing Family History (for consolidation reference)
    if (patientChart.familyHistory?.length > 0) {
      sections.push(`
EXISTING FAMILY HISTORY (Use for consolidation decisions):
${patientChart.familyHistory
  .map((fh: any) => `- ${fh.relationship}: ${fh.condition}`)
  .join("\n")}`);
    }

    return sections.length > 0
      ? sections.join("\n")
      : "- No additional clinical data available for family history correlation";
  }

  /**
   * Call GPT-4.1 for intelligent family history analysis
   */
  private async callGPTForFamilyHistoryAnalysis(
    content: string,
    existingFamilyHistory: any[],
    patientContext: string,
    triggerType: string,
    attachmentId?: number,
  ): Promise<UnifiedFamilyHistoryChange[]> {
    const prompt = `You are an expert family history specialist with 20+ years experience in genetic medicine and hereditary disease patterns. Analyze the provided clinical content and extract/update family history information.

PATIENT CONTEXT:
${patientContext}

EXISTING FAMILY HISTORY RECORDS:
${
  existingFamilyHistory.length > 0
    ? existingFamilyHistory
        .map(
          (fh) =>
            `ID: ${fh.id} | ${fh.familyMember}: ${fh.medicalHistory} (Source: ${fh.sourceType}, Confidence: ${fh.sourceConfidence})`,
        )
        .join("\n")
    : "- No existing family history records"
}

CLINICAL CONTENT TO ANALYZE:
${content}

FAMILY HISTORY EXTRACTION RULES:

1. RELATIONSHIP CATEGORIES (Use simple relationships):
   - Immediate family: father, mother, brother, sister, son, daughter
   - Extended family: grandmother, grandfather, aunt, uncle, cousin
   - Use exact lowercase terms only

2. CONSOLIDATION INTELLIGENCE:
   - ALWAYS consolidate by family member (one record per relationship)
   - Father with "HTN" + Father with "died age 70" = Father: "HTN, died age 70"
   - Update existing records rather than creating duplicates
   - Preserve patient language while ensuring medical accuracy

3. MEDICAL HISTORY FORMAT:
   - Combine all conditions for same family member
   - Include ages, outcomes, and vital status
   - Examples: "DM2, HTN, died MI age 83", "Breast cancer age 45, currently alive"
   - Preserve patient's exact language when possible

4. NEGATIVE FAMILY HISTORY:
   - Track explicit denials: "No family history of heart disease"
   - Use negativeHistory: true for explicit denials
   - Don't create records for assumed negatives

5. VISIT HISTORY REQUIREMENTS:
   - Create visit history entry for each change
   - Track what was updated in changesMade array
   - Include source attribution and confidence
   - Format: "Added father's heart disease history from medical records"

6. CONFIDENCE SCORING METHODOLOGY - CRITICAL:
   Confidence represents YOUR self-assessment of extraction/inference accuracy from the source document.
   This is NOT about clinical validity of the family history itself.
   Purpose: Helps users decide whether to review source documents for verification.
   
   CONFIDENCE SCORING FRAMEWORK:
   - 0.95-1.00 = Explicit statements ("mother has breast cancer", "father died of MI at 65")
   - 0.85-0.94 = Clear clinical documentation ("family history significant for DM in multiple members")
   - 0.70-0.84 = Strong implications ("runs in the family", "multiple relatives with heart disease")
   - 0.50-0.69 = Reasonable inferences ("thinks grandmother had diabetes", "possibly hereditary")
   - 0.30-0.49 = Weak evidence ("some relative had cancer", "family member with health issues")
   - 0.10-0.29 = Minimal/vague references ("bad family history")
   - 0.01-0.09 = Contradictory or parsing errors
   
   KEY PRINCIPLES:
   - Words like "thinks", "might", "possibly", "maybe" significantly lower confidence
   - Vague relationships ("some relative", "family member") = lower confidence
   - Clear relationships + specific conditions = high confidence
   - Patient uncertainty or secondhand reports = lower confidence

RESPONSE FORMAT (JSON Array):
[
  {
    "action": "create|update|consolidate",
    "familyMember": "father",
    "medicalHistory": "HTN, DM2, died MI age 83",
    "consolidationReason": "Combined existing HTN history with new death information",
    "confidence": 0.95,
    "visitEntry": {
      "date": "${new Date().toLocaleDateString("en-CA")}",
      "notes": "Added father's death from MI at age 83, consolidated with existing HTN history",
      "source": "${triggerType === "attachment_processing" ? "attachment" : "encounter"}",
      ${attachmentId ? `"attachmentId": ${attachmentId},` : ""}
      "changesMade": ["Added death information", "Consolidated medical history"],
      "confidence": 0.95
    },
    "negativeHistory": false
  }
]

Only extract family history information that is explicitly mentioned. Do not infer or assume family history. Focus on genetic and hereditary conditions relevant to patient care.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 30000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.log(`👨‍👩‍👧‍👦 [UnifiedFamilyHistory] No GPT response content`);
        return [];
      }

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(
          `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] No JSON array found in GPT response`,
        );
        return [];
      }

      const changes = JSON.parse(jsonMatch[0]);
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] GPT extracted ${changes.length} family history changes`,
      );

      return changes;
    } catch (error) {
      console.error(`👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Error calling GPT:`, error);
      return [];
    }
  }

  /**
   * Filter duplicate visit entries using surgical history pattern
   * Prevents duplicate visits for same encounter/attachment
   */
  private filterDuplicateVisitEntries(
    existingVisits: UnifiedFamilyHistoryVisitEntry[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment",
  ): UnifiedFamilyHistoryVisitEntry[] {
    return existingVisits.filter((visit) => {
      // Allow both attachment and encounter entries for the same encounter ID
      if (encounterId && visit.encounterId === encounterId) {
        return visit.source !== sourceType; // Keep if different source type
      }

      // Prevent duplicate attachment entries
      if (attachmentId && visit.attachmentId === attachmentId) {
        return false; // Remove duplicate attachment
      }

      return true; // Keep all other entries
    });
  }

  /**
   * Apply a single family history change to the database
   */
  private async applyFamilyHistoryChange(
    change: UnifiedFamilyHistoryChange,
    patientId: number,
    encounterId: number | null,
    attachmentId?: number,
  ): Promise<{ success: boolean }> {
    try {
      console.log(
        `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Applying ${change.action} for ${change.familyMember}: ${change.medicalHistory}`,
      );

      // Check if family member already exists
      const existing = await db
        .select()
        .from(familyHistory)
        .where(
          and(
            eq(familyHistory.patientId, patientId),
            eq(familyHistory.familyMember, change.familyMember),
          ),
        )
        .limit(1);

      if (
        existing.length > 0 &&
        (change.action === "update" || change.action === "consolidate")
      ) {
        // Update existing record
        const existingRecord = existing[0];
        const currentVisitHistory = existingRecord.visitHistory || [];

        // Filter out duplicate visits using surgical history pattern
        const filteredVisitHistory = this.filterDuplicateVisitEntries(
          currentVisitHistory,
          encounterId,
          attachmentId,
          change.visitEntry.source
        );

        // Add new visit history entry with timezone-corrected date
        const visitEntryWithLocalDate = {
          ...change.visitEntry,
          date: new Date(change.visitEntry.date + "T12:00:00")
            .toISOString()
            .split("T")[0], // Convert to local date at noon to avoid timezone shifts
        };
        const newVisitHistory = [
          ...filteredVisitHistory,
          visitEntryWithLocalDate,
        ];

        await db
          .update(familyHistory)
          .set({
            medicalHistory: change.medicalHistory,
            visitHistory: newVisitHistory,
            lastUpdatedEncounter: encounterId,
            sourceType: change.visitEntry.source,
            sourceConfidence: (change.confidence / 100).toFixed(2),
            extractedFromAttachmentId: attachmentId,
            updatedAt: new Date(),
          })
          .where(eq(familyHistory.id, existingRecord.id));

        console.log(
          `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] ✅ Updated existing record for ${change.familyMember}`,
        );
      } else {
        // Create new record with timezone-corrected date
        const visitEntryWithLocalDate = {
          ...change.visitEntry,
          date: new Date(change.visitEntry.date + "T12:00:00")
            .toISOString()
            .split("T")[0], // Convert to local date at noon to avoid timezone shifts
        };

        await db.insert(familyHistory).values({
          patientId,
          familyMember: change.familyMember,
          medicalHistory: change.medicalHistory,
          visitHistory: [visitEntryWithLocalDate],
          lastUpdatedEncounter: encounterId,
          sourceType: change.visitEntry.source,
          sourceConfidence: (change.confidence / 100).toFixed(2),
          extractedFromAttachmentId: attachmentId,
        });

        console.log(
          `👨‍👩‍👧‍👦 [UnifiedFamilyHistory] ✅ Created new record for ${change.familyMember}`,
        );
      }

      return { success: true };
    } catch (error) {
      console.error(`👨‍👩‍👧‍👦 [UnifiedFamilyHistory] Error applying change:`, error);
      return { success: false };
    }
  }
}

// Export singleton instance
export const unifiedFamilyHistoryParser = new UnifiedFamilyHistoryParser();
