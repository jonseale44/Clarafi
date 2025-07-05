/**
 * Unified Allergy Parser Service
 *
 * Processes allergies from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and consolidation
 * - Source attribution and confidence scoring
 * - Visit history tracking for allergy updates over time
 * - NKDA conflict resolution with temporal awareness
 * - Drug safety cross-referencing
 * - Parallel processing architecture for multiple chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { allergies, encounters, patients } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedAllergyVisitEntry {
  date: string; // Medical event date
  notes: string; // Visit notes about allergy changes
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
  conflictResolution?: string; // How temporal conflicts (NKDA vs allergy) were resolved
}

export interface UnifiedAllergyChange {
  action:
    | "create"
    | "update"
    | "consolidate"
    | "resolve_conflict"
    | "document_nkda";
  allergen: string;
  reaction?: string;
  severity?: string;
  allergyType?: string;
  status?: string;
  consolidationReason?: string;
  confidence: number;
  visitEntry: UnifiedAllergyVisitEntry;
  existingRecordId?: number;
  temporalConflictResolution?: string; // How NKDA vs existing allergy conflicts were resolved
  drugClass?: string;
  crossReactivity?: string[];
}

export class UnifiedAllergyParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main entry point for unified allergy processing
   */
  async processUnifiedAllergies(
    patientId: number,
    options: {
      soapNote?: string;
      attachmentContent?: string;
      encounterId?: number;
      attachmentId?: number;
      triggerType: "stop_recording" | "attachment_processing" | "manual_save";
    },
  ) {
    const {
      soapNote,
      attachmentContent,
      encounterId,
      attachmentId,
      triggerType,
    } = options;

    console.log(
      `🚨 [UnifiedAllergy] Starting unified allergy processing for patient ${patientId}`,
    );
    console.log(
      `🚨 [UnifiedAllergy] Trigger: ${triggerType}, EncounterID: ${encounterId}, AttachmentID: ${attachmentId}`,
    );

    if (soapNote) {
      console.log(
        `🚨 [UnifiedAllergy] SOAP note content preview: "${soapNote.substring(0, 200)}..."`,
      );
    }
    if (attachmentContent) {
      console.log(
        `🚨 [UnifiedAllergy] Attachment content preview: "${attachmentContent.substring(0, 200)}..."`,
      );
    }

    if (!soapNote && !attachmentContent) {
      console.log(`🚨 [UnifiedAllergy] ⚠️ No content to process - skipping`);
      return {
        success: true,
        changes: [],
        allergiesAffected: 0,
        encounterAllergies: 0,
        attachmentAllergies: 0,
      };
    }

    try {
      // Get existing allergies for consolidation and conflict detection
      const existingAllergies = await this.getExistingAllergies(patientId);
      console.log(
        `🚨 [UnifiedAllergy] Found ${existingAllergies.length} existing allergy entries for patient ${patientId}`,
      );

      // Get patient chart context for intelligent extraction
      const patientChart =
        await PatientChartService.getPatientChartData(patientId);
      console.log(
        `🚨 [UnifiedAllergy] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`,
      );

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(
        soapNote,
        attachmentContent,
      );
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for allergy extraction
      const gptResponse = await this.processAllergiesWithGPT(
        combinedContent,
        patientContextForGPT,
        existingAllergies,
        triggerType,
        encounterId,
        attachmentId,
      );

      console.log(
        `🚨 [UnifiedAllergy] GPT processed ${gptResponse.length} allergy changes`,
      );
      
      // DETAILED GPT RESPONSE LOGGING
      console.log(`🔍 [UnifiedAllergy] ===== DETAILED GPT RESPONSE ANALYSIS =====`);
      gptResponse.forEach((change, index) => {
        console.log(`🔍 [UnifiedAllergy] Change ${index + 1}:`, {
          action: change.action,
          allergen: change.allergen,
          status: change.status,
          existingRecordId: change.existingRecordId,
          consolidationReason: change.consolidationReason,
          temporalConflictResolution: change.temporalConflictResolution,
          attachmentId: change.visitEntry?.attachmentId,
          encounterId: change.visitEntry?.encounterId
        });
      });
      console.log(`🔍 [UnifiedAllergy] ===== END GPT RESPONSE ANALYSIS =====`);

      // Apply changes to database
      const processedChanges = await this.applyAllergyChanges(
        gptResponse,
        patientId,
        encounterId,
      );

      const encounterAllergies = processedChanges.filter(
        (change) => change.visitEntry.source === "encounter",
      ).length;

      const attachmentAllergies = processedChanges.filter(
        (change) => change.visitEntry.source === "attachment",
      ).length;

      console.log(
        `🚨 [UnifiedAllergy] ✅ Processing complete: ${processedChanges.length} total changes, ${encounterAllergies} from encounter, ${attachmentAllergies} from attachment`,
      );

      return {
        success: true,
        changes: processedChanges,
        allergiesAffected: processedChanges.length,
        encounterAllergies,
        attachmentAllergies,
      };
    } catch (error) {
      console.error(
        "🚨 [UnifiedAllergy] ❌ Error processing allergies:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        changes: [],
        allergiesAffected: 0,
        encounterAllergies: 0,
        attachmentAllergies: 0,
      };
    }
  }

  /**
   * Process allergies using GPT-4.1 with clinical intelligence
   */
  private async processAllergiesWithGPT(
    combinedContent: string,
    patientContext: string,
    existingAllergies: any[],
    triggerType: string,
    encounterId?: number,
    attachmentId?: number,
  ): Promise<UnifiedAllergyChange[]> {
    const existingAllergiesContext =
      existingAllergies.length > 0
        ? existingAllergies
            .map(
              (allergy) =>
                `ID: ${allergy.id} | ${allergy.allergen}: ${allergy.reaction || "reaction not specified"} (${allergy.severity || "severity unknown"}) - Status: ${allergy.status}, Type: ${allergy.allergyType || "unknown"}`,
            )
            .join("\n")
        : "No existing allergies documented";

    const prompt = `You are an expert clinical allergist with 20+ years of experience in allergy documentation and drug safety. Process the following clinical content to extract and manage allergy information with sophisticated temporal awareness and conflict resolution.

EXISTING ALLERGIES:
${existingAllergiesContext}

PATIENT CONTEXT:
${patientContext}

CLINICAL CONTENT TO ANALYZE:
${combinedContent}

CORE ALLERGY PROCESSING INSTRUCTIONS:

1. ALLERGY EXTRACTION:
   - Extract all mentioned allergies (drug, food, environmental, contact, other)
   - Use GPT-preferred format: "allergen - reaction, symptoms (severity)"
   - Examples: "PCN - rash, hives (moderate)", "Shellfish - anaphylaxis (severe)", "Latex - contact dermatitis (mild)"
   - Allow free-text reactions but encourage standardized format

2. TEMPORAL CONFLICT RESOLUTION (CRITICAL):
   - If existing allergy + NKDA document: Use temporal intelligence
   - If NKDA document is OLDER → Keep existing allergy (patient developed allergy after NKDA)
   - If NKDA document is NEWER → Document NKDA and mark existing allergy as "resolved" or "refuted"
   
   - If existing NKDA + new allergy document: Replace NKDA with new allergy
   - NKDA means "No Known Drug Allergies" at that point in time
   - A newer document with specific allergies ALWAYS supersedes older NKDA
   - Mark NKDA record as "resolved" and create new allergy record
   
   - Always create visit history explaining temporal reasoning
   - Auto-resolve conflicts - do not flag for provider review

3. ALLERGY CONSOLIDATION:
   - Consolidate similar allergens (Penicillin + PCN + Amoxicillin = Penicillins class)
   - Update existing records rather than creating duplicates
   - Preserve most specific reaction information
   - Track drug classes and cross-reactivity

4. SEVERITY CLASSIFICATION:
   - life-threatening: Anaphylaxis, severe respiratory distress, cardiovascular collapse
   - severe: Significant symptoms requiring medical intervention
   - moderate: Notable symptoms but manageable
   - mild: Minor reactions, limited impact
   - unknown: Severity not specified

5. ALLERGY TYPES:
   - drug: Medications, including drug classes
   - food: Food allergies and intolerances
   - environmental: Pollen, dust, mold, animal dander
   - contact: Latex, metals, chemicals, topical substances
   - other: Miscellaneous allergies

6. STATUS MANAGEMENT:
   - active: Currently applicable allergy
   - inactive: Allergy that may not be current
   - resolved: Previously had allergy but no longer reactive
   - unconfirmed: Reported but not verified

7. DRUG SAFETY CROSS-REFERENCING:
   - Identify drug classes (penicillins, sulfonamides, NSAIDs, etc.)
   - Note cross-reactivity patterns
   - Flag potential medication conflicts

8. VISIT HISTORY REQUIREMENTS:
   - Create visit history entry for each change
   - Track what was updated in changesMade array
   - Include source attribution and confidence
   - Document temporal conflict resolution reasoning

9. CONFIDENCE SCORING:
   - 0.95+ = Explicit allergy documentation in medical records
   - 0.85-0.94 = Patient directly reports allergy with details
   - 0.70-0.84 = Inferred from context or partial information
   - 0.50-0.69 = Uncertain or conflicting information

RESPONSE FORMAT (JSON Array):
[
  {
    "action": "create|update|consolidate|resolve_conflict|document_nkda",
    "allergen": "Penicillin",
    "reaction": "rash, hives",
    "severity": "moderate",
    "allergyType": "drug",
    "status": "active",
    "consolidationReason": "Combined PCN and Amoxicillin into Penicillins class",
    "confidence": 0.95,
    "visitEntry": {
      "date": "${new Date().toLocaleDateString("en-CA")}",
      "notes": "Patient reports penicillin allergy causing rash and hives, moderate severity",
      "source": "${triggerType === "attachment_processing" ? "attachment" : "encounter"}",
      ${attachmentId ? `"attachmentId": ${attachmentId},` : ""}${encounterId ? `"encounterId": ${encounterId},` : ""}
      "changesMade": ["allergy_documented", "severity_specified", "reaction_detailed"],
      "confidence": 0.95,
      "conflictResolution": "No temporal conflicts - first documentation of this allergy"
    },
    "drugClass": "penicillins",
    "crossReactivity": ["amoxicillin", "ampicillin"],
    "temporalConflictResolution": "No conflicts detected"
  }
]

EXAMPLE SCENARIOS:

1. Existing: NKDA (ID: 25) from 6/1/24 → New document 7/1/24 states "PCN allergy"
   ACTION: Mark NKDA ID:25 as "resolved", create new PCN allergy
   REASON: Patient developed allergy after NKDA documentation

2. Existing: PCN allergy (ID: 30) from 5/1/24 → New document 7/1/24 states "NKDA"
   ACTION: Mark PCN allergy ID:30 as "resolved", document NKDA
   REASON: More recent assessment shows no allergies

3. Existing: NKDA (ID: 40) → New document states "Sulfa - rash"
   ACTION: Mark NKDA ID:40 as "resolved", create Sulfa allergy
   REASON: New allergy discovered, NKDA no longer accurate

Extract all allergy information that is explicitly mentioned. Handle NKDA scenarios with temporal intelligence. Auto-resolve conflicts using timeline analysis.`;

    console.log(`🔍 [UnifiedAllergy] ===== SENDING PROMPT TO GPT =====`);
    console.log(`🔍 [UnifiedAllergy] Existing allergies in prompt:`, existingAllergies.map(a => `ID:${a.id} ${a.allergen} (${a.status})`));
    console.log(`🔍 [UnifiedAllergy] Combined content preview:`, combinedContent.substring(0, 300));
    console.log(`🔍 [UnifiedAllergy] ===== END PROMPT CONTEXT =====`);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 30000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.log("🚨 [UnifiedAllergy] No content returned from GPT");
        return [];
      }

      console.log(`🔍 [UnifiedAllergy] ===== RAW GPT RESPONSE =====`);
      console.log(`🔍 [UnifiedAllergy] Full GPT response:`, content);
      console.log(`🔍 [UnifiedAllergy] ===== END RAW GPT RESPONSE =====`);

      // Parse GPT response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log("🚨 [UnifiedAllergy] No JSON array found in GPT response");
        console.log("🚨 [UnifiedAllergy] GPT Response:", content);
        return [];
      }

      const changes: UnifiedAllergyChange[] = JSON.parse(jsonMatch[0]);
      console.log(
        `🚨 [UnifiedAllergy] GPT extracted ${changes.length} allergy changes`,
      );
      console.log(`🎯 [UnifiedAllergy] === FULL GPT RESPONSE ===`);
      console.log(`🎯 [UnifiedAllergy] Raw response:`, content);
      console.log(`🎯 [UnifiedAllergy] Parsed changes:`, JSON.stringify(changes, null, 2));

      return changes;
    } catch (error) {
      console.error("🚨 [UnifiedAllergy] Error with GPT processing:", error);
      return [];
    }
  }

  /**
   * Apply allergy changes to database
   */
  private async applyAllergyChanges(
    changes: UnifiedAllergyChange[],
    patientId: number,
    encounterId?: number,
  ): Promise<UnifiedAllergyChange[]> {
    console.log(`🎯 [UnifiedAllergy] === APPLYING ALLERGY CHANGES ===`);
    console.log(`🎯 [UnifiedAllergy] Patient ID: ${patientId}`);
    console.log(`🎯 [UnifiedAllergy] Number of changes: ${changes.length}`);
    console.log(`🎯 [UnifiedAllergy] Changes to apply:`, JSON.stringify(changes, null, 2));
    
    const processedChanges: UnifiedAllergyChange[] = [];

    for (const change of changes) {
      console.log(`🎯 [UnifiedAllergy] Processing change:`, {
        action: change.action,
        allergen: change.allergen,
        existingRecordId: change.existingRecordId,
        confidence: change.confidence
      });
      
      try {
        let allergyId: number;

        if (change.action === "create" || change.action === "document_nkda") {
          // Create new allergy record
          const [newAllergy] = await db
            .insert(allergies)
            .values({
              patientId,
              allergen: change.allergen,
              reaction: change.reaction || null,
              severity: change.severity || null,
              allergyType: change.allergyType || null,
              status: change.status || "active",
              verificationStatus: "unconfirmed",
              drugClass: change.drugClass || null,
              crossReactivity: change.crossReactivity || null,
              sourceType:
                change.visitEntry.source === "attachment"
                  ? "attachment_extracted"
                  : "soap_derived",
              sourceConfidence: change.confidence.toString(),
              extractedFromAttachmentId: change.visitEntry.attachmentId || null,
              lastUpdatedEncounter: encounterId || null,
              enteredBy: 1, // Default user ID
              consolidationReasoning: change.consolidationReason || null,
              temporalConflictResolution:
                change.temporalConflictResolution || null,
              visitHistory: [change.visitEntry],
            })
            .returning();

          allergyId = newAllergy.id;
          console.log(
            `🚨 [UnifiedAllergy] Created new allergy record: ${change.allergen} (ID: ${allergyId})`,
          );
        } else if (
          change.action === "update" ||
          change.action === "consolidate" ||
          change.action === "resolve_conflict"
        ) {
          // Update existing allergy record
          const existingAllergyId = change.existingRecordId;
          if (!existingAllergyId) {
            console.error(
              `🚨 [UnifiedAllergy] No existing record ID for update action: ${change.allergen}`,
            );
            continue;
          }

          // Get current visit history
          const [existingRecord] = await db
            .select()
            .from(allergies)
            .where(eq(allergies.id, existingAllergyId));

          if (!existingRecord) {
            console.error(
              `🚨 [UnifiedAllergy] Existing allergy record not found: ${existingAllergyId}`,
            );
            continue;
          }

          const currentVisitHistory = Array.isArray(existingRecord.visitHistory)
            ? existingRecord.visitHistory
            : [];

          const updatedVisitHistory = [
            ...currentVisitHistory,
            change.visitEntry,
          ];

          // For resolve_conflict actions on NKDA, ensure it's marked as inactive/resolved
          console.log(`🎯 [UnifiedAllergy] Checking resolve_conflict logic:`, {
            action: change.action,
            isResolveConflict: change.action === "resolve_conflict",
            existingAllergen: existingRecord.allergen,
            hasNoKnown: existingRecord.allergen.toLowerCase().includes("no known"),
            currentStatus: existingRecord.status
          });
          
          const updateStatus = change.action === "resolve_conflict" && 
                             existingRecord.allergen.toLowerCase().includes("no known") 
                             ? "resolved" 
                             : (change.status || existingRecord.status);
                             
          console.log(`🎯 [UnifiedAllergy] Status decision:`, {
            originalStatus: existingRecord.status,
            newStatus: updateStatus,
            willResolve: updateStatus === "resolved"
          });

          // Update the record
          await db
            .update(allergies)
            .set({
              allergen: change.allergen,
              reaction: change.reaction || existingRecord.reaction,
              severity: change.severity || existingRecord.severity,
              allergyType: change.allergyType || existingRecord.allergyType,
              status: updateStatus,
              drugClass: change.drugClass || existingRecord.drugClass,
              crossReactivity:
                change.crossReactivity || existingRecord.crossReactivity,
              sourceConfidence: change.confidence.toString(),
              lastUpdatedEncounter:
                encounterId || existingRecord.lastUpdatedEncounter,
              consolidationReasoning:
                change.consolidationReason ||
                existingRecord.consolidationReasoning,
              temporalConflictResolution:
                change.temporalConflictResolution ||
                existingRecord.temporalConflictResolution,
              visitHistory: updatedVisitHistory,
              updatedAt: new Date(),
            })
            .where(eq(allergies.id, existingAllergyId));

          allergyId = existingAllergyId;
          console.log(
            `🚨 [UnifiedAllergy] Updated existing allergy record: ${change.allergen} (ID: ${allergyId})`,
          );
        }

        processedChanges.push(change);
      } catch (error) {
        console.error(
          `🚨 [UnifiedAllergy] Error processing change for ${change.allergen}:`,
          error,
        );
      }
    }

    return processedChanges;
  }

  /**
   * Get existing allergies for consolidation
   */
  private async getExistingAllergies(patientId: number) {
    return await db
      .select()
      .from(allergies)
      .where(eq(allergies.patientId, patientId));
  }

  /**
   * Prepare combined content from multiple sources
   */
  private prepareCombinedContent(
    soapNote?: string,
    attachmentContent?: string,
  ): string {
    const sections = [];

    if (soapNote?.trim()) {
      sections.push(`SOAP NOTE CONTENT:\n${soapNote}`);
    }

    if (attachmentContent?.trim()) {
      sections.push(`ATTACHMENT CONTENT:\n${attachmentContent}`);
    }

    return sections.join("\n\n");
  }

  /**
   * Format patient chart data for GPT consumption
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current Medical Problems (for allergy context)
    if (patientChart.medicalProblems?.length > 0) {
      sections.push(`
CURRENT MEDICAL PROBLEMS (Use for allergy context):
${patientChart.medicalProblems
  .map((mp: any) => `- ${mp.problemTitle} (${mp.problemStatus})`)
  .join("\n")}`);
    }

    // Current Medications (for drug allergy cross-referencing)
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`
CURRENT MEDICATIONS (Critical for drug allergy safety):
${patientChart.currentMedications
  .map((med: any) => `- ${med.medicationName} ${med.dosage} ${med.frequency}`)
  .join("\n")}`);
    }

    // Existing Allergies (for consolidation reference)
    if (patientChart.allergies?.length > 0) {
      sections.push(`
EXISTING ALLERGIES (Use for consolidation decisions):
${patientChart.allergies
  .map(
    (allergy: any) =>
      `- ${allergy.allergen}: ${allergy.reaction || "unknown reaction"} (${allergy.severity || "unknown severity"})`,
  )
  .join("\n")}`);
    }

    return sections.join("\n");
  }
}
