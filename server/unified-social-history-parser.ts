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
  action: "NEW_ENTRY" | "ADD_VISIT" | "UPDATE_STATUS" | "EVOLVE_CATEGORY" | "CONSOLIDATE";
  social_history_id: number | null;
  category: string; // smoking, alcohol, occupation, etc.
  currentStatus: string; // Current status description
  historyNotes?: string;
  visit_notes: string;
  consolidation_reasoning?: string;
  confidence: number;
  source_type: "encounter" | "attachment";
  transfer_visit_history_from?: number | null;
  extracted_date?: string | null;
  status_evolution?: {
    from: string;
    to: string;
  } | null;
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

    const systemPrompt = `You are an expert social worker and clinical data analyst with 15+ years of experience in extracting and consolidating social history information from medical documents and clinical encounters.

CRITICAL CONSOLIDATION INTELLIGENCE - COPY MEDICAL PROBLEMS LOGIC:
You must use sophisticated category-based matching and status evolution logic similar to medical problems consolidation.

EXISTING SOCIAL HISTORY DATA (Full Context for Intelligent Matching):
${existingSocialHistory.map(entry => 
  `ID: ${entry.id} | Category: ${entry.category} | Current Status: ${entry.currentStatus} | History: ${entry.historyNotes || 'None'} | Visits: ${entry.visitHistory?.length || 0} | Last Updated: ${entry.updatedAt}`
).join('\n\n') || 'No existing social history entries'}

PATIENT CLINICAL CONTEXT:
${patientContext}

CONTENT TO ANALYZE:
${content}

SOPHISTICATED CONSOLIDATION DECISION TREE:
1. EXACT CATEGORY MATCH (90%+ confidence): Same category (smoking=tobacco=cigarettes, alcohol=drinking=etoh)
2. SYNONYM ANALYSIS (70-89% confidence): Related terms (occupation=job=work, exercise=activity=fitness)  
3. STATUS EVOLUTION (60-89% confidence): Same category, status change (current smoker → former smoker, unemployed → employed)
4. QUANTITATIVE CHANGES (70%+ confidence): Same category, different quantities (1ppd → 2ppd, beer daily → wine weekly)
5. CREATE NEW (50%+ confidence): Genuinely new category not matching existing entries

MANDATORY CONSOLIDATION EXAMPLES:
- "smoking 1 pack per day" + existing "tobacco use: current smoker" = UPDATE_STATUS (quantify smoking)
- "former smoker, quit 2020" + existing "smoking: current smoker" = EVOLVE_CATEGORY (status evolution)
- "drinks wine socially" + existing "alcohol: denies" = UPDATE_STATUS (contradictory information)
- "unemployed since layoff" + existing "occupation: teacher" = EVOLVE_CATEGORY (job change)
- "exercises 3x/week" + existing "sedentary lifestyle" = UPDATE_STATUS (activity level change)

CATEGORY SYNONYM MATCHING INTELLIGENCE:
- SMOKING: tobacco, cigarettes, smoking, nicotine, vaping, e-cigarettes
- ALCOHOL: drinking, ETOH, beer, wine, liquor, substance use (alcohol)
- OCCUPATION: job, work, employment, career, profession, workplace
- EXERCISE: activity, fitness, sports, physical activity, recreation
- DIET: nutrition, eating, food, dietary habits, weight management
- SUBSTANCE_USE: drugs, illicit substances, marijuana, cocaine, opioids
- HOUSING: living situation, residence, homeless, housing stability
- TRANSPORTATION: mobility, vehicle, driving, public transport
- EDUCATION: schooling, degree, literacy, academic background
- INSURANCE: coverage, benefits, Medicaid, Medicare, uninsured

CONFIDENCE THRESHOLDS FOR CONSOLIDATION:
- 90%+ = EXACT MATCH (same category, update details)
- 70-89% = STRONG MATCH (synonyms, status evolution) 
- 50-69% = POSSIBLE MATCH (consider consolidation)
- <50% = CREATE NEW ENTRY

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "changes": [
    {
      "action": "NEW_ENTRY" | "ADD_VISIT" | "UPDATE_STATUS" | "EVOLVE_CATEGORY" | "CONSOLIDATE",
      "social_history_id": number | null,
      "category": "smoking|alcohol|occupation|exercise|diet|sexual_history|living_situation|recreational_drugs|sleep|social_support|substance_use|family_support|education|insurance|transportation|housing",
      "currentStatus": "Most current, clinically relevant status (be specific: '1 pack per day since age 18' not 'smoker')",
      "historyNotes": "Additional historical context and timeline details",
      "visit_notes": "Clinical note about this social history discussion or finding",
      "consolidation_reasoning": "WHY this was consolidated/updated with specific matching logic",
      "confidence": 0.85,
      "source_type": "encounter" | "attachment",
      "transfer_visit_history_from": number | null,
      "extracted_date": "2025-07-01" | null,
      "status_evolution": {"from": "current smoker", "to": "former smoker quit 2020"} | null
    }
  ]
}

UNIFIED PROCESSING INTELLIGENCE:
1. CONSOLIDATION LOGIC: Match categories when they are socially related (smoking=tobacco=cigarettes, alcohol=drinking=ETOH). DO NOT consolidate unrelated categories (smoking + exercise makes no sense)
2. SOURCE AWARENESS: Track which source contributed each piece of information  
3. CONFLICT RESOLUTION: If same category appears in both sources, prefer current encounter data for status, attachment data for historical context
4. VISIT HISTORY ENRICHMENT: Attachment data should add rich historical context to existing social history
5. STATUS EVOLUTION: Use "EVOLVE_CATEGORY" when status changes significantly (smoker→former smoker, employed→unemployed)
6. CREATE NEW ENTRIES: When categories don't match existing entries, create new ones without hesitation

Process the content and return ONLY the JSON response with social history findings.`;

    try {
      // Log the full prompt being sent to GPT for debugging
      console.log(`🚬 [UnifiedSocialHistory] ============= GPT PROMPT DEBUG =============`);
      console.log(`🚬 [UnifiedSocialHistory] SYSTEM PROMPT (first 500 chars):`);
      console.log(systemPrompt.substring(0, 500) + "...");
      console.log(`🚬 [UnifiedSocialHistory] USER CONTENT (first 1000 chars):`);
      console.log(content.substring(0, 1000) + "...");
      console.log(`🚬 [UnifiedSocialHistory] EXISTING SOCIAL HISTORY ENTRIES:`);
      existingSocialHistory.forEach((entry, index) => {
        console.log(`🚬 [UnifiedSocialHistory]   ${index + 1}. ${entry.category}: "${entry.currentStatus}"`);
      });
      console.log(`🚬 [UnifiedSocialHistory] ============= END PROMPT DEBUG =============`);

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
      console.log(`🚬 [UnifiedSocialHistory] ============= GPT RESPONSE DEBUG =============`);
      console.log(`🚬 [UnifiedSocialHistory] GPT response length: ${gptContent?.length || 0} characters`);
      console.log(`🚬 [UnifiedSocialHistory] FULL GPT RESPONSE:`);
      console.log(gptContent);
      console.log(`🚬 [UnifiedSocialHistory] ============= END RESPONSE DEBUG =============`);

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
      console.log(`🚬 [UnifiedSocialHistory] PARSED CHANGES:`);
      parsedResponse.changes?.forEach((change, index) => {
        console.log(`🚬 [UnifiedSocialHistory]   ${index + 1}. ${change.action} ${change.category}: "${change.currentStatus}"`);
        console.log(`🚬 [UnifiedSocialHistory]      Confidence: ${change.confidence}, Reason: ${change.consolidationReason || 'N/A'}`);
      });

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
          date: change.extracted_date || new Date().toISOString().split('T')[0],
          notes: change.visit_notes,
          source: change.source_type === "encounter" ? "encounter" as const : "attachment" as const,
          encounterId: encounterId || undefined,
          attachmentId: attachmentId || undefined,
          providerId,
          providerName: "Dr. Jonathan Seale", // Could be made dynamic
          changesMade: change.status_evolution ? [`Status evolution: ${change.status_evolution.from} → ${change.status_evolution.to}`] : ["status_updated"],
          confidence: change.confidence,
          isSigned: false
        };

        if (change.action === "NEW_ENTRY") {
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
            sourceType: attachmentId ? "attachment" : "encounter",
            sourceConfidence: (change.confidence / 100).toFixed(2),
            extractedFromAttachmentId: attachmentId,
            enteredBy: providerId,
            consolidationReasoning: change.consolidation_reasoning,
            extractionNotes: `Extracted via ${triggerType}`,
            visitHistory: [visitEntry],
          }).returning();

          console.log(`🚬 [UnifiedSocialHistory] ✅ Created new social history entry: ${change.category}`);
          appliedChanges.push(change);
          socialHistoryAffected++;

        } else if (change.action === "ADD_VISIT" || change.action === "UPDATE_STATUS" || change.action === "EVOLVE_CATEGORY" || change.action === "CONSOLIDATE") {
          // Update existing entry with sophisticated action handling
          const existingEntry = await db
            .select()
            .from(socialHistory)
            .where(
              and(
                eq(socialHistory.patientId, patientId),
                eq(socialHistory.id, change.social_history_id!)
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
                consolidationReasoning: change.consolidation_reasoning || current.consolidationReasoning,
                visitHistory: updatedVisitHistory,
                updatedAt: new Date(),
              })
              .where(eq(socialHistory.id, change.social_history_id!));

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