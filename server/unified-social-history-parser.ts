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
  action: "create" | "update" | "consolidate";
  category: string; // smoking, alcohol, occupation, etc.
  currentStatus: string; // Current status description
  historyNotes?: string;
  consolidationReason?: string;
  confidence: number;
  visitEntry: UnifiedSocialHistoryVisitEntry;
  existingRecordId?: number;
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
   */
  async processUnified(
    patientId: number,
    encounterId: number | null = null,
    soapNote: string | null = null,
    attachmentContent: string | null = null,
    attachmentId: number | null = null,
    providerId: number = 1, // Using existing user ID (jonseale) - TODO: make configurable
    triggerType: string = "manual_processing"
  ) {
    console.log(`🚬 [UnifiedSocialHistory] ============= STARTING UNIFIED SOCIAL HISTORY PROCESSING =============`);
    console.log(`🚬 [UnifiedSocialHistory] Patient: ${patientId}, Encounter: ${encounterId}, Provider: ${providerId}`);
    console.log(`🚬 [UnifiedSocialHistory] Trigger: ${triggerType}, Attachment: ${attachmentId}`);
    console.log(`🚬 [UnifiedSocialHistory] Content sources: SOAP=${!!soapNote}, Attachment=${!!attachmentContent}`);

    if (soapNote) {
      console.log(`🚬 [UnifiedSocialHistory] SOAP content preview: "${soapNote.substring(0, 200)}..."`);
    }

    if (attachmentContent) {
      console.log(`🚬 [UnifiedSocialHistory] Attachment content preview: "${attachmentContent.substring(0, 200)}..."`);
    }

    if (!soapNote && !attachmentContent) {
      console.log(`🚬 [UnifiedSocialHistory] ⚠️ No content to process - skipping`);
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
      const existingSocialHistory = await this.getExistingSocialHistory(patientId);
      console.log(`🚬 [UnifiedSocialHistory] Found ${existingSocialHistory.length} existing social history entries for patient ${patientId}`);

      // Get patient chart context for intelligent extraction
      const patientChart = await PatientChartService.getPatientChartData(patientId);
      console.log(`🚬 [UnifiedSocialHistory] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`);

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(soapNote, attachmentContent);
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for social history extraction
      const gptResponse = await this.processSocialHistoryWithGPT(
        combinedContent,
        existingSocialHistory,
        patientContextForGPT,
        triggerType
      );

      console.log(`🚬 [UnifiedSocialHistory] GPT processing complete. Changes: ${gptResponse.changes?.length || 0}`);

      // Apply changes to database
      const result = await this.applyChangesToDatabase(
        gptResponse.changes || [],
        patientId,
        encounterId,
        attachmentId,
        providerId,
        triggerType
      );

      console.log(`🚬 [UnifiedSocialHistory] ============= UNIFIED SOCIAL HISTORY PROCESSING COMPLETE =============`);
      console.log(`🚬 [UnifiedSocialHistory] Total changes applied: ${result.changes.length}`);
      console.log(`🚬 [UnifiedSocialHistory] Social history entries affected: ${result.socialHistoryAffected}`);

      return result;

    } catch (error) {
      console.error(`🚬 [UnifiedSocialHistory] ❌ Error in unified processing:`, error);
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

      console.log(`🚬 [UnifiedSocialHistory] Retrieved ${existing.length} existing social history entries`);
      return existing;
    } catch (error) {
      console.error(`🚬 [UnifiedSocialHistory] Error fetching existing social history:`, error);
      return [];
    }
  }

  /**
   * Prepare combined content for GPT processing
   */
  private prepareCombinedContent(soapNote: string | null, attachmentContent: string | null): string {
    const parts = [];
    
    if (soapNote?.trim()) {
      parts.push(`ENCOUNTER NOTES:\n${soapNote.trim()}`);
    }
    
    if (attachmentContent?.trim()) {
      parts.push(`ATTACHMENT CONTENT:\n${attachmentContent.trim()}`);
    }
    
    return parts.join('\n\n');
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
  .map((problem: any) => `- ${problem.problemName} (${problem.status || 'active'})`)
  .join("\n")}`);
    }

    // Current medications for context
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`CURRENT MEDICATIONS:
${patientChart.currentMedications
  .map((med: any) => `- ${med.medicationName} ${med.dosage || ''} ${med.frequency || ''}`)
  .join("\n")}`);
    }

    // Allergies for context
    if (patientChart.allergies?.length > 0) {
      sections.push(`ALLERGIES:
${patientChart.allergies
  .map((allergy: any) => `- ${allergy.allergen}: ${allergy.reaction} (${allergy.severity})`)
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
    triggerType: string
  ) {
    console.log(`🚬 [UnifiedSocialHistory] 🤖 Starting GPT-4.1 social history extraction`);
    console.log(`🚬 [UnifiedSocialHistory] Content length: ${content.length} characters`);
    console.log(`🚬 [UnifiedSocialHistory] Existing entries: ${existingSocialHistory.length}`);

    const systemPrompt = `You are an expert clinical social worker and medical data analyst with 20 years of experience in comprehensive social history documentation and analysis. Your expertise includes:

- Substance use assessment and risk stratification
- Occupational health and environmental exposure analysis  
- Social determinants of health evaluation
- Behavioral risk factor identification
- Longitudinal social history tracking and change detection

CORE RESPONSIBILITIES:
1. Extract ALL social history information from medical documents with clinical precision
2. Intelligently consolidate and update existing social history entries
3. Track meaningful changes over time with appropriate visit history documentation
4. Apply clinical judgment for risk assessment and quantification
5. Maintain comprehensive audit trail for social history evolution

SOCIAL HISTORY CATEGORIES TO EXTRACT:
- Tobacco use (cigarettes, cigars, pipes, smokeless, vaping) - Include pack-years calculation when possible
- Alcohol use (frequency, quantity, type, AUDIT screening if mentioned)
- Recreational drug use (type, frequency, route, historical vs current)
- Occupation and work exposures (industry, hazards, duration)
- Living situation (housing, social support, safety)
- Sexual history (when clinically relevant and documented)
- Exercise and physical activity patterns
- Diet and nutrition habits
- Sleep patterns (when mentioned as social factor)
- Social support systems and relationships

INTELLIGENT CONSOLIDATION RULES:
1. TEMPORAL EVOLUTION: When status changes (current smoker → former smoker), update currentStatus and preserve history
2. QUANTITATIVE UPDATES: When amounts change (1 PPD → 0.5 PPD), update with new quantity
3. RISK STRATIFICATION: Calculate derived values when possible (pack-years, drinks per week)
4. ANALOG ENTRIES: Accept any temporal description ("quit when venus aligned", "stopped yesterday")
5. CONTEXTUAL RELEVANCE: Consider medical problems when assessing risk significance

EXISTING SOCIAL HISTORY CONTEXT:
${existingSocialHistory.map(entry => 
  `Category: ${entry.category}
   Current Status: ${entry.currentStatus}
   History Notes: ${entry.historyNotes || 'None'}
   Last Updated: ${entry.lastUpdatedEncounter || 'Unknown'}
   Visit History Entries: ${entry.visitHistory?.length || 0}`
).join('\n\n') || 'No existing social history entries'}

PATIENT CLINICAL CONTEXT:
${patientContext}

CONTENT TO ANALYZE:
${content}

For each social history item found, return a JSON object with this structure:
{
  "changes": [
    {
      "action": "create|update|consolidate",
      "category": "smoking|alcohol|occupation|exercise|diet|sexual_history|living_situation|recreational_drugs|sleep|social_support",
      "currentStatus": "Most current, clinically relevant status description",
      "historyNotes": "Additional historical context and details",
      "consolidationReason": "Why this was consolidated or updated (if applicable)",
      "confidence": 0.85,
      "existingRecordId": 123,
      "visitEntry": {
        "date": "2025-07-01",
        "notes": "Brief clinical note about this social history discussion or finding",
        "source": "encounter|attachment",
        "changesMade": ["status_updated", "quantity_changed", "quit_date_added"],
        "confidence": 0.85
      }
    }
  ]
}

CRITICAL GUIDELINES:
- Use "update" for existing categories with status changes
- Use "consolidate" when combining information from multiple sources
- Use "create" only for entirely new categories
- Include quantification when possible (pack-years, drinks/week, years of exposure)
- Preserve important historical context in historyNotes
- Be specific about temporal changes in currentStatus
- Only create visit entries when social history is actually discussed or documented
- Use clinical terminology appropriate for EMR documentation
- Consider risk stratification and clinical significance

Process the content and return ONLY the JSON response with social history findings.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const gptContent = response.choices[0]?.message?.content?.trim();
      console.log(`🚬 [UnifiedSocialHistory] GPT response length: ${gptContent?.length || 0} characters`);

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
      console.log(`🚬 [UnifiedSocialHistory] Successfully parsed ${parsedResponse.changes?.length || 0} social history changes`);

      return parsedResponse;

    } catch (error) {
      console.error(`🚬 [UnifiedSocialHistory] Error in GPT processing:`, error);
      return { changes: [] };
    }
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
    triggerType: string
  ) {
    console.log(`🚬 [UnifiedSocialHistory] 💾 Applying ${changes.length} changes to database`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧 Database operation parameters:`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - patientId: ${patientId}`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - encounterId: ${encounterId}`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - attachmentId: ${attachmentId}`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - providerId: ${providerId} (THIS SHOULD BE 1, NOT 2)`);
    console.log(`🚬 [UnifiedSocialHistory] 🔧   - triggerType: ${triggerType}`);

    const appliedChanges = [];
    let socialHistoryAffected = 0;

    for (const change of changes) {
      try {
        console.log(`🚬 [UnifiedSocialHistory] Processing change: ${change.action} for category ${change.category}`);

        const visitEntry = {
          ...change.visitEntry,
          encounterId: encounterId || change.visitEntry.encounterId,
          attachmentId: attachmentId || change.visitEntry.attachmentId,
          providerId,
          providerName: "Dr. Jonathan Seale", // Could be made dynamic
        };

        if (change.action === "create") {
          // Create new social history entry
          console.log(`🚬 [UnifiedSocialHistory] 🔧 CREATE OPERATION - About to insert with enteredBy: ${providerId}`);
          console.log(`🚬 [UnifiedSocialHistory] 🔧 CREATE VALUES OBJECT:`, {
            patientId,
            category: change.category,
            currentStatus: change.currentStatus,
            historyNotes: change.historyNotes,
            lastUpdatedEncounter: encounterId,
            sourceType: attachmentId ? "attachment_extracted" : "soap_derived",
            sourceConfidence: (change.confidence / 100).toFixed(2),
            extractedFromAttachmentId: attachmentId,
            enteredBy: providerId,
          });
          const newEntry = await db.insert(socialHistory).values({
            patientId,
            category: change.category,
            currentStatus: change.currentStatus,
            historyNotes: change.historyNotes,
            lastUpdatedEncounter: encounterId,
            sourceType: attachmentId ? "attachment_extracted" : "soap_derived",
            sourceConfidence: (change.confidence / 100).toFixed(2),
            extractedFromAttachmentId: attachmentId,
            enteredBy: providerId,
            consolidationReasoning: change.consolidationReason,
            extractionNotes: `Extracted via ${triggerType}`,
            visitHistory: [visitEntry],
          }).returning();

          console.log(`🚬 [UnifiedSocialHistory] ✅ Created new social history entry: ${change.category}`);
          appliedChanges.push(change);
          socialHistoryAffected++;

        } else if (change.action === "update" || change.action === "consolidate") {
          // Update existing entry
          const existingEntry = await db
            .select()
            .from(socialHistory)
            .where(
              and(
                eq(socialHistory.patientId, patientId),
                eq(socialHistory.id, change.existingRecordId!)
              )
            );

          if (existingEntry.length > 0) {
            const current = existingEntry[0];
            const currentVisitHistory = current.visitHistory || [];
            
            // Add new visit entry
            const updatedVisitHistory = [...currentVisitHistory, visitEntry];

            await db
              .update(socialHistory)
              .set({
                currentStatus: change.currentStatus,
                historyNotes: change.historyNotes || current.historyNotes,
                lastUpdatedEncounter: encounterId || current.lastUpdatedEncounter,
                sourceType: attachmentId ? "attachment_extracted" : "soap_derived",
                sourceConfidence: (change.confidence / 100).toFixed(2),
                consolidationReasoning: change.consolidationReason || current.consolidationReasoning,
                visitHistory: updatedVisitHistory,
                updatedAt: new Date(),
              })
              .where(eq(socialHistory.id, change.existingRecordId!));

            console.log(`🚬 [UnifiedSocialHistory] ✅ Updated social history entry: ${change.category}`);
            appliedChanges.push(change);
            socialHistoryAffected++;
          }
        }

      } catch (error) {
        console.error(`🚬 [UnifiedSocialHistory] Error applying change for ${change.category}:`, error);
      }
    }

    console.log(`🚬 [UnifiedSocialHistory] 💾 Database operations complete. ${socialHistoryAffected} entries affected`);

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