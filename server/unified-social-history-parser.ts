/**
 * Unified Social History Parser Service
 *
 * Processes social history from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and consolidation
 * - Source attribution and confidence scoring
 * - Visit history tracking for social history updates over time
 * - Parallel processing architecture for multiple chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { socialHistory, encounters, patients } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedSocialHistoryVisitEntry {
  date: string; // Medical event date
  notes: string; // Visit notes about social history changes
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

export interface UnifiedSocialHistoryChange {
  action: "NEW_ENTRY" | "ADD_VISIT" | "UPDATE_STATUS";
  social_history_id: number | null;
  category:
    | "tobacco2"
    | "alcohol"
    | "drugs"
    | "occupation"
    | "living_situation"
    | "activity"
    | "diet";
  currentStatus: string; // Current status description
  visit_notes: string;
  consolidation_reasoning?: string;
  confidence: number;
  source_type: "encounter" | "attachment";
  extracted_date?: string | null; // Date extracted from document content
}

export class UnifiedSocialHistoryParser {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main processing function for unified social history extraction
   * Simplified 7-category system: Tobacco, Alcohol, Drugs, Occupation, Living situation, Activity, Diet
   */
  async processUnified(
    patientId: number,
    encounterId: number | null = null,
    soapNote: string | null = null,
    attachmentContent: string | null = null,
    attachmentId: number | null = null,
    providerId: number = 1, // Using existing user ID (jonseale) - TODO: make configurable
    triggerType: string = "manual_processing",
  ) {
    console.log(
      `🚬 [UnifiedSocialHistory] ============= STARTING UNIFIED SOCIAL HISTORY PROCESSING =============`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] Patient: ${patientId}, Encounter: ${encounterId}, Provider: ${providerId}`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] Trigger: ${triggerType}, Attachment: ${attachmentId}`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] Content sources: SOAP=${!!soapNote}, Attachment=${!!attachmentContent}`,
    );

    if (soapNote) {
      console.log(
        `🚬 [UnifiedSocialHistory] SOAP content preview: "${soapNote.substring(0, 200)}..."`,
      );
    }

    if (attachmentContent) {
      console.log(
        `🚬 [UnifiedSocialHistory] Attachment content preview: "${attachmentContent.substring(0, 200)}..."`,
      );
    }

    if (!soapNote && !attachmentContent) {
      console.log(
        `🚬 [UnifiedSocialHistory] ⚠️ No content to process - skipping`,
      );
      return {
        success: true,
        changes: [],
        socialHistoryAffected: 0,
        encounterSocialHistory: 0,
        attachmentSocialHistory: 0,
      };
    }

    try {
      // Get existing social history for consolidation
      const existingSocialHistory =
        await this.getExistingSocialHistory(patientId);
      console.log(
        `🚬 [UnifiedSocialHistory] Found ${existingSocialHistory.length} existing social history entries for patient ${patientId}`,
      );

      // Get patient chart context for intelligent extraction
      const patientChart =
        await PatientChartService.getPatientChartData(patientId);
      console.log(
        `🚬 [UnifiedSocialHistory] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`,
      );

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(
        soapNote,
        attachmentContent,
      );
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for social history extraction
      const gptResponse = await this.processSocialHistoryWithGPT(
        combinedContent,
        existingSocialHistory,
        patientContextForGPT,
        triggerType,
      );

      console.log(
        `🚬 [UnifiedSocialHistory] GPT processing complete. Changes: ${gptResponse.changes?.length || 0}`,
      );

      // Apply changes to database
      const result = await this.applyChangesToDatabase(
        gptResponse.changes || [],
        patientId,
        encounterId,
        attachmentId,
        providerId,
        triggerType,
      );

      console.log(
        `🚬 [UnifiedSocialHistory] ============= UNIFIED SOCIAL HISTORY PROCESSING COMPLETE =============`,
      );
      console.log(
        `🚬 [UnifiedSocialHistory] Total changes applied: ${result.changes.length}`,
      );
      console.log(
        `🚬 [UnifiedSocialHistory] Social history entries affected: ${result.socialHistoryAffected}`,
      );

      return result;
    } catch (error) {
      console.error(
        `🚬 [UnifiedSocialHistory] ❌ Error in unified processing:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get existing social history for patient
   */
  private async getExistingSocialHistory(patientId: number) {
    try {
      const existing = await db
        .select()
        .from(socialHistory)
        .where(eq(socialHistory.patientId, patientId));

      console.log(
        `🚬 [UnifiedSocialHistory] Retrieved ${existing.length} existing social history entries`,
      );
      return existing;
    } catch (error) {
      console.error(
        `🚬 [UnifiedSocialHistory] Error fetching existing social history:`,
        error,
      );
      return [];
    }
  }

  /**
   * Prepare combined content for GPT processing
   */
  private prepareCombinedContent(
    soapNote: string | null,
    attachmentContent: string | null,
  ): string {
    const parts = [];

    if (soapNote?.trim()) {
      parts.push(`ENCOUNTER NOTES:\n${soapNote.trim()}`);
    }

    if (attachmentContent?.trim()) {
      parts.push(`ATTACHMENT CONTENT:\n${attachmentContent.trim()}`);
    }

    return parts.join("\n\n");
  }

  /**
   * Format patient chart data for GPT context
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current medical problems for context
    if (patientChart.medicalProblems?.length > 0) {
      sections.push(`CURRENT MEDICAL PROBLEMS:
${patientChart.medicalProblems
  .map(
    (problem: any) =>
      `- ${problem.problemName} (${problem.status || "active"})`,
  )
  .join("\n")}`);
    }

    // Current medications for context
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`CURRENT MEDICATIONS:
${patientChart.currentMedications
  .map(
    (med: any) =>
      `- ${med.medicationName} ${med.dosage || ""} ${med.frequency || ""}`,
  )
  .join("\n")}`);
    }

    // Allergies for context
    if (patientChart.allergies?.length > 0) {
      sections.push(`ALLERGIES:
${patientChart.allergies
  .map(
    (allergy: any) =>
      `- ${allergy.allergen}: ${allergy.reaction} (${allergy.severity})`,
  )
  .join("\n")}`);
    }

    return sections.length > 0
      ? sections.join("\n\n")
      : "- No additional clinical data available for context";
  }

  /**
   * Process social history extraction with GPT-4.1
   */
  private async processSocialHistoryWithGPT(
    content: string,
    existingSocialHistory: any[],
    patientContext: string,
    triggerType: string,
  ) {
    console.log(
      `🚬 [UnifiedSocialHistory] 🤖 Starting GPT-4.1 social history extraction`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] Content length: ${content.length} characters`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] Existing entries: ${existingSocialHistory.length}`,
    );

    const systemPrompt = `You are an expert clinical social worker and EMR data analyst with 15+ years of experience extracting and consolidating social history from medical documents.

SIMPLIFIED 7-CATEGORY SOCIAL HISTORY SYSTEM:
You MUST use EXACTLY these 7 categories (in this order):
1. "tobacco" - Any smoking, chewing, vaping, cigarettes, cigars, nicotine
2. "alcohol" - Any alcohol consumption, drinking, ETOH, beer, wine, liquor  
3. "drugs" - Recreational drugs, illicit substances, marijuana, cocaine, opioids, substance abuse
4. "occupation" - Employment, job, work, profession, retired, unemployed, student
5. "living_situation" - Housing, lives alone, lives with family, married, single, homeless
6. "activity" - Exercise, physical activity, sedentary, athletic, fitness, sports
7. "diet" - Nutrition, eating habits, dietary restrictions, weight management

CRITICAL CONSOLIDATION RULES:
- ONLY create entries for categories that have actual information in the content
- NO blank entries ever - if diet is never mentioned, don't include it
- CONSOLIDATE intelligently using the exact categories above
- Use "UPDATE_STATUS" when new information differs from existing status
- Use "ADD_VISIT" when information is identical (no change needed)
- Use "NEW_ENTRY" only when category doesn't exist yet

EXISTING SOCIAL HISTORY DATA:
${
  existingSocialHistory
    .map((entry) => {
      let lastVisitDate = "None";
      try {
        if (entry.visitHistory) {
          const visitHistory =
            typeof entry.visitHistory === "string"
              ? JSON.parse(entry.visitHistory)
              : entry.visitHistory;
          lastVisitDate = visitHistory[0]?.date || "None";
        }
      } catch (e) {
        console.warn(
          `🚬 [UnifiedSocialHistory] Error parsing visit history for entry ${entry.id}:`,
          e,
        );
        lastVisitDate = "Parse Error";
      }
      return `ID: ${entry.id} | Category: ${entry.category} | Status: ${entry.currentStatus} | Last Visit: ${lastVisitDate}`;
    })
    .join("\n") || "No existing social history entries"
}

PATIENT CONTEXT:
${patientContext}

CONTENT TO ANALYZE:
${content}

SMART CATEGORY MAPPING:
- Any tobacco/smoking/cigarettes/vaping → "tobacco"
- Any alcohol/drinking/ETOH/beer/wine → "alcohol" 
- Any drugs/cocaine/marijuana/substances → "drugs"
- Any job/work/employment/career → "occupation"
- Any housing/lives with/married/single → "living_situation"
- Any exercise/activity/fitness/sports → "activity"
- Any diet/nutrition/eating/food → "diet"

CONSOLIDATION EXAMPLES:
- "smoking cocaine daily" + existing "drugs: denies illicit drugs" = UPDATE_STATUS (contradiction found)
- "drinks liquor daily" + existing "alcohol: occasional social drinking" = UPDATE_STATUS (escalation)
- "retired teacher" + existing "occupation: teacher" = UPDATE_STATUS (status change)
- "former smoker, quit 2020" + existing "tobacco: current smoker" = UPDATE_STATUS (quit smoking)

DATE EXTRACTION INTELLIGENCE:
Extract accurate dates from document content for proper timeline tracking:
- FIRST PRIORITY: Look for explicit document dates in headers/footers
  • "Date of Service: MM/DD/YYYY"
  • "Date: MM/DD/YYYY"
  • "Visit Date: MM/DD/YYYY"
- SECOND PRIORITY: Look for dates near provider signatures
  • "John Smith, MD - MM/DD/YYYY"
  • "Electronically signed on MM/DD/YYYY"
- THIRD PRIORITY: Look for dated sections
  • "Progress Note - MM/DD/YYYY"
  • "History & Physical - MM/DD/YYYY"
- CRITICAL: Use the SAME document date for ALL social history entries from this document
- If multiple dates exist, use the most recent that represents when the social history was documented

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "changes": [
    {
      "action": "NEW_ENTRY" | "ADD_VISIT" | "UPDATE_STATUS",
      "social_history_id": number | null,
      "category": "tobacco" | "alcohol" | "drugs" | "occupation" | "living_situation" | "activity" | "diet",
      "currentStatus": "Specific current status with details",
      "visit_notes": "What was discussed or found in this encounter/document",
      "consolidation_reasoning": "Why this action was taken",
      "confidence": 0.90,
      "source_type": "encounter" | "attachment",
      "extracted_date": "YYYY-MM-DD" | null
    }
  ]
}

IMPORTANT: Only return entries for categories that have actual information. Do NOT create blank entries.`;

    try {
      // Log the full prompt being sent to GPT for debugging
      console.log(
        `🚬 [UnifiedSocialHistory] ============= GPT PROMPT DEBUG =============`,
      );
      console.log(`🚬 [UnifiedSocialHistory] SYSTEM PROMPT (first 500 chars):`);
      console.log(systemPrompt.substring(0, 500) + "...");
      console.log(`🚬 [UnifiedSocialHistory] USER CONTENT (first 1000 chars):`);
      console.log(content.substring(0, 1000) + "...");
      console.log(`🚬 [UnifiedSocialHistory] EXISTING SOCIAL HISTORY ENTRIES:`);
      existingSocialHistory.forEach((entry, index) => {
        console.log(
          `🚬 [UnifiedSocialHistory]   ${index + 1}. ${entry.category}: "${entry.currentStatus}"`,
        );
      });
      console.log(
        `🚬 [UnifiedSocialHistory] ============= END PROMPT DEBUG =============`,
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content },
        ],
        temperature: 0.1,
        max_tokens: 30000,
      });

      const gptContent = response.choices[0]?.message?.content?.trim();
      console.log(
        `🚬 [UnifiedSocialHistory] ============= GPT RESPONSE DEBUG =============`,
      );
      console.log(
        `🚬 [UnifiedSocialHistory] GPT response length: ${gptContent?.length || 0} characters`,
      );
      console.log(`🚬 [UnifiedSocialHistory] FULL GPT RESPONSE:`);
      console.log(gptContent);
      console.log(
        `🚬 [UnifiedSocialHistory] ============= END RESPONSE DEBUG =============`,
      );

      if (!gptContent) {
        console.log(`🚬 [UnifiedSocialHistory] No GPT response received`);
        return { changes: [] };
      }

      // Parse JSON response
      const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`🚬 [UnifiedSocialHistory] No JSON found in GPT response`);
        return { changes: [] };
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      console.log(
        `🚬 [UnifiedSocialHistory] Successfully parsed ${parsedResponse.changes?.length || 0} social history changes`,
      );
      console.log(`🚬 [UnifiedSocialHistory] PARSED CHANGES:`);
      parsedResponse.changes?.forEach((change: any, index: number) => {
        console.log(
          `🚬 [UnifiedSocialHistory]   ${index + 1}. ${change.action} ${change.category}: "${change.currentStatus}"`,
        );
        console.log(
          `🚬 [UnifiedSocialHistory]      Confidence: ${change.confidence}, Reason: ${change.consolidation_reasoning || "N/A"}`,
        );
      });

      return parsedResponse;
    } catch (error) {
      console.error(
        `🚬 [UnifiedSocialHistory] Error in GPT processing:`,
        error,
      );
      return { changes: [] };
    }
  }

  /**
   * Filter duplicate visit entries using surgical history pattern
   * Prevents duplicate visits for same encounter/attachment
   */
  private filterDuplicateVisitEntries(
    existingVisits: UnifiedSocialHistoryVisitEntry[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment",
  ): UnifiedSocialHistoryVisitEntry[] {
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
   * Apply changes to database
   */
  private async applyChangesToDatabase(
    changes: UnifiedSocialHistoryChange[],
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number,
    triggerType: string,
  ) {
    console.log(
      `🚬 [UnifiedSocialHistory] 💾 Applying ${changes.length} changes to database`,
    );
    console.log(`🚬 [UnifiedSocialHistory] 🔧 Database operation parameters:`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - patientId: ${patientId}`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - encounterId: ${encounterId}`);
    console.log(
      `🚬 [UnifiedSocialHistory] 🔧   - attachmentId: ${attachmentId}`,
    );
    console.log(
      `🚬 [UnifiedSocialHistory] 🔧   - providerId: ${providerId} (THIS SHOULD BE 1, NOT 2)`,
    );
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - triggerType: ${triggerType}`);

    const appliedChanges = [];
    let socialHistoryAffected = 0;

    for (const change of changes) {
      try {
        console.log(
          `🚬 [UnifiedSocialHistory] Processing change: ${change.action} for category ${change.category}`,
        );

        // Determine appropriate date for visit history
        let visitDate: string;
        if (change.extracted_date) {
          // Use extracted date from attachment content
          visitDate = change.extracted_date;
          console.log(
            `🚬 [UnifiedSocialHistory] ✅ Using extracted date from document: ${visitDate}`,
          );
        } else if (encounterId) {
          // If no extracted date but we have an encounter, use encounter date
          const [encounter] = await db
            .select()
            .from(encounters)
            .where(eq(encounters.id, encounterId));
          
          if (encounter?.startTime) {
            visitDate = encounter.startTime.toISOString().split("T")[0];
            console.log(
              `🚬 [UnifiedSocialHistory] 📅 Using encounter date: ${visitDate}`,
            );
          } else {
            visitDate = new Date().toISOString().split("T")[0];
            console.log(
              `🚬 [UnifiedSocialHistory] ⚠️ No encounter date found - using current date: ${visitDate}`,
            );
          }
        } else {
          // Last resort: use current date
          visitDate = new Date().toISOString().split("T")[0];
          console.log(
            `🚬 [UnifiedSocialHistory] ⚠️ No extracted date or encounter - using current date: ${visitDate}`,
          );
        }

        const visitEntry = {
          date: visitDate,
          notes: change.visit_notes,
          source:
            change.source_type === "encounter"
              ? ("encounter" as const)
              : ("attachment" as const),
          encounterId: encounterId || undefined,
          attachmentId: attachmentId || undefined,
          providerId,
          providerName: "Dr. Jonathan Seale",
          changesMade: ["status_updated"],
          confidence: change.confidence,
          isSigned: false,
        };

        if (change.action === "NEW_ENTRY") {
          // Create new social history entry
          console.log(
            `🚬 [UnifiedSocialHistory] Creating new entry for category: ${change.category}`,
          );

          const newEntry = await db
            .insert(socialHistory)
            .values({
              patientId,
              category: change.category,
              currentStatus: change.currentStatus,
              lastUpdatedEncounter: encounterId,
              sourceType: attachmentId ? "attachment" : "encounter",
              sourceConfidence: Math.min(change.confidence, 9.99).toString(),
              extractedFromAttachmentId:
                attachmentId && triggerType !== "test_7_categories"
                  ? attachmentId
                  : null,
              enteredBy: providerId,
              consolidationReasoning: change.consolidation_reasoning,
              extractionNotes: `Extracted via ${triggerType}`,
              visitHistory: [visitEntry],
            })
            .returning();

          console.log(
            `🚬 [UnifiedSocialHistory] ✅ Created: ${change.category}`,
          );
          appliedChanges.push(change);
          socialHistoryAffected++;
        } else if (change.action === "UPDATE_STATUS") {
          // Find existing entry by category (not ID)
          const existingEntry = await db
            .select()
            .from(socialHistory)
            .where(
              and(
                eq(socialHistory.patientId, patientId),
                eq(socialHistory.category, change.category),
              ),
            );

          if (existingEntry.length > 0) {
            const current = existingEntry[0];
            const currentVisitHistory = current.visitHistory || [];

            // Filter out duplicate visits using surgical history pattern
            const filteredVisitHistory = this.filterDuplicateVisitEntries(
              currentVisitHistory,
              encounterId,
              attachmentId,
              change.source_type
            );

            // Only add visit history if status actually changed
            const shouldAddVisit =
              current.currentStatus !== change.currentStatus;

            if (shouldAddVisit) {
              const updatedVisitHistory = [...filteredVisitHistory, visitEntry];

              await db
                .update(socialHistory)
                .set({
                  currentStatus: change.currentStatus,
                  lastUpdatedEncounter:
                    encounterId || current.lastUpdatedEncounter,
                  sourceType: attachmentId ? "attachment" : "encounter",
                  sourceConfidence: Math.min(
                    change.confidence,
                    9.99,
                  ).toString(),
                  consolidationReasoning: change.consolidation_reasoning,
                  visitHistory: updatedVisitHistory,
                  updatedAt: new Date(),
                })
                .where(eq(socialHistory.id, current.id));

              console.log(
                `🚬 [UnifiedSocialHistory] ✅ Updated: ${change.category} (status changed)`,
              );
              appliedChanges.push(change);
              socialHistoryAffected++;
            } else {
              console.log(
                `🚬 [UnifiedSocialHistory] ⏭️ Skipped: ${change.category} (no change)`,
              );
            }
          }
        } else if (change.action === "ADD_VISIT") {
          // Add visit history without changing status
          const existingEntry = await db
            .select()
            .from(socialHistory)
            .where(
              and(
                eq(socialHistory.patientId, patientId),
                eq(socialHistory.category, change.category),
              ),
            );

          if (existingEntry.length > 0) {
            const current = existingEntry[0];
            const currentVisitHistory = current.visitHistory || [];
            
            // Filter out duplicate visits using surgical history pattern
            const filteredVisitHistory = this.filterDuplicateVisitEntries(
              currentVisitHistory,
              encounterId,
              attachmentId,
              change.source_type
            );
            
            const updatedVisitHistory = [...filteredVisitHistory, visitEntry];

            await db
              .update(socialHistory)
              .set({
                visitHistory: updatedVisitHistory,
                updatedAt: new Date(),
              })
              .where(eq(socialHistory.id, current.id));

            console.log(
              `🚬 [UnifiedSocialHistory] ✅ Added visit: ${change.category}`,
            );
            appliedChanges.push(change);
            socialHistoryAffected++;
          }
        }
      } catch (error) {
        console.error(
          `🚬 [UnifiedSocialHistory] Error applying change for ${change.category}:`,
          error,
        );
      }
    }

    console.log(
      `🚬 [UnifiedSocialHistory] 💾 Database operations complete. ${socialHistoryAffected} entries affected`,
    );

    return {
      success: true,
      changes: appliedChanges,
      socialHistoryAffected,
      encounterSocialHistory: encounterId ? appliedChanges.length : 0,
      attachmentSocialHistory: attachmentId ? appliedChanges.length : 0,
    };
  }
}

// Export singleton instance
export const unifiedSocialHistoryParser = new UnifiedSocialHistoryParser();
