/**
 * Unified Surgical History Parser Service
 *
 * Processes surgical history from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and conflict resolution
 * - Source attribution and confidence scoring
 * - Visit history transfer during surgery evolution
 * - Parallel processing architecture for multiple chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { surgicalHistory, encounters, patients } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedSurgicalVisitHistoryEntry {
  date: string; // YYYY-MM-DD format
  notes: string; // Clinical notes about surgery discussion/follow-up
  source: "encounter" | "attachment"; // Source of this visit entry - MUST match schema
  encounterId?: number; // Reference to encounter if source is encounter
  attachmentId?: number; // Reference to attachment if source is attachment
  changesMade?: string[]; // Array of changes made (e.g., 'date_corrected', 'surgeon_updated', 'complications_noted')
  confidence?: number; // AI confidence in extraction (0.0-1.0)
  isSigned?: boolean; // Provider signature status
  sourceNotes?: string; // Additional context from extraction source
}

export interface UnifiedSurgicalChange {
  surgery_id?: number; // null if new surgery
  action:
    | "ADD_VISIT"
    | "UPDATE_DETAILS"
    | "NEW_SURGERY"
    | "EVOLVE_SURGERY"
    | "CORRECT_DATE";
  procedure_name?: string;
  visit_notes?: string;
  date_change?: { from: string; to: string };
  surgeon_change?: { from: string; to: string };
  facility_change?: { from: string; to: string };
  confidence: number;
  source_type: "encounter" | "attachment";
  transfer_visit_history_from?: number; // surgery_id to transfer history from
  extracted_date?: string; // ISO date string extracted from attachment content
  consolidation_reasoning?: string; // GPT's reasoning for consolidation decisions
}

export interface UnifiedSurgicalProcessingResult {
  changes: UnifiedSurgicalChange[];
  processing_time_ms: number;
  total_surgeries_affected: number;
  source_summary: {
    encounter_surgeries: number;
    attachment_surgeries: number;
    conflicts_resolved: number;
  };
}

export class UnifiedSurgicalHistoryParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Unified processing method - handles both SOAP notes and attachment content
   */
  async processUnified(
    patientId: number,
    encounterId: number | null,
    soapNote: string | null,
    attachmentContent: string | null,
    attachmentId: number | null,
    providerId: number,
    triggerType:
      | "recording_complete"
      | "manual_edit"
      | "attachment_processed" = "recording_complete",
  ): Promise<UnifiedSurgicalProcessingResult> {
    const startTime = Date.now();

    console.log(`🔄 [UnifiedSurgicalHistory] === UNIFIED PROCESSING START ===`);
    console.log(
      `🔄 [UnifiedSurgicalHistory] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`,
    );
    console.log(
      `🔄 [UnifiedSurgicalHistory] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`,
    );
    console.log(`🔄 [UnifiedSurgicalHistory] Trigger: ${triggerType}`);

    if (!soapNote && !attachmentContent) {
      console.warn(`🔄 [UnifiedSurgicalHistory] ⚠️ No content provided for processing`);
      return {
        changes: [],
        processing_time_ms: Date.now() - startTime,
        total_surgeries_affected: 0,
        source_summary: {
          encounter_surgeries: 0,
          attachment_surgeries: 0,
          conflicts_resolved: 0,
        },
      };
    }

    try {
      // Get existing surgical history for consolidation
      const existingSurgeries = await this.getExistingSurgicalHistory(patientId);
      console.log(`🔄 [UnifiedSurgicalHistory] Found ${existingSurgeries.length} existing surgical procedures for patient ${patientId}`);

      // Get patient chart context for intelligent extraction
      const patientChart = await PatientChartService.getPatientChartData(patientId);
      console.log(`🔄 [UnifiedSurgicalHistory] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`);

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(soapNote, attachmentContent);
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for surgical history extraction
      const gptResponse = await this.callGPTForSurgicalAnalysis(
        combinedContent,
        existingSurgeries,
        patientContextForGPT,
        triggerType,
        attachmentId
      );

      console.log(`🔄 [UnifiedSurgicalHistory] GPT processing complete, ${gptResponse.length} surgical changes identified`);

      // Apply each change from GPT response
      const changes: UnifiedSurgicalChange[] = [];
      let surgeriesAffected = 0;
      let encounterSurgeries = 0;
      let attachmentSurgeries = 0;
      let conflictsResolved = 0;

      for (const change of gptResponse) {
        try {
          await this.applyUnifiedChange(change, patientId, encounterId, attachmentId);
          changes.push(change);
          surgeriesAffected++;

          // Track source statistics
          if (change.source_type === "encounter") {
            encounterSurgeries++;
          } else if (change.source_type === "attachment") {
            attachmentSurgeries++;
          }

          if (change.action === "EVOLVE_SURGERY" || change.consolidation_reasoning) {
            conflictsResolved++;
          }
        } catch (error) {
          console.error(`❌ [UnifiedSurgicalHistory] Error applying change:`, error);
        }
      }

      console.log(`🔄 [UnifiedSurgicalHistory] === PROCESSING COMPLETE ===`);
      console.log(`🔄 [UnifiedSurgicalHistory] Surgeries affected: ${surgeriesAffected}`);

      return {
        changes,
        processing_time_ms: Date.now() - startTime,
        total_surgeries_affected: surgeriesAffected,
        source_summary: {
          encounter_surgeries: encounterSurgeries,
          attachment_surgeries: attachmentSurgeries,
          conflicts_resolved: conflictsResolved,
        },
      };

    } catch (error) {
      console.error(`❌ [UnifiedSurgicalHistory] Error in unified processing:`, error);
      return {
        changes: [],
        processing_time_ms: Date.now() - startTime,
        total_surgeries_affected: 0,
        source_summary: {
          encounter_surgeries: 0,
          attachment_surgeries: 0,
          conflicts_resolved: 0,
        },
      };
    }
  }

  /**
   * Get existing surgical history for patient to enable GPT consolidation
   */
  private async getExistingSurgicalHistory(patientId: number): Promise<any[]> {
    try {
      const surgeries = await db
        .select()
        .from(surgicalHistory)
        .where(eq(surgicalHistory.patientId, patientId))
        .orderBy(desc(surgicalHistory.procedureDate));

      return surgeries.map(surgery => ({
        id: surgery.id,
        procedure_name: surgery.procedureName,
        procedure_date: surgery.procedureDate,
        surgeon_name: surgery.surgeonName,
        facility_name: surgery.facilityName,
        indication: surgery.indication,
        complications: surgery.complications,
        outcome: surgery.outcome,
        source_type: surgery.sourceType,
        source_confidence: surgery.sourceConfidence
      }));
    } catch (error) {
      console.error(`🏥 [UnifiedSurgicalHistory] Error fetching existing surgical history:`, error);
      return [];
    }
  }

  /**
   * Prepare combined content from SOAP note and attachment
   */
  private prepareCombinedContent(soapNote: string | null, attachmentContent: string | null): string {
    const sections = [];

    if (soapNote && soapNote.trim().length > 0) {
      sections.push(`=== CURRENT ENCOUNTER SOAP NOTE ===\n${soapNote.trim()}`);
    }

    if (attachmentContent && attachmentContent.trim().length > 0) {
      sections.push(`=== ATTACHED DOCUMENT CONTENT ===\n${attachmentContent.trim()}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Format patient chart data for GPT context
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current medical problems for surgical context
    if (patientChart.medicalProblems?.length > 0) {
      sections.push(`
CURRENT MEDICAL PROBLEMS (for surgical indication context):
${patientChart.medicalProblems
  .map((problem: any) => `- ${problem.problemDescription || problem.diagnosis}`)
  .join("\n")}`);
    }

    // Current medications for surgical risk context
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`
CURRENT MEDICATIONS (for surgical risk assessment):
${patientChart.currentMedications
  .map((med: any) => `- ${med.medicationName} ${med.dosage} ${med.frequency}`)
  .join("\n")}`);
    }

    return sections.length > 0 
      ? sections.join("\n") 
      : "- No additional clinical context available";
  }

  /**
   * Call GPT-4.1 for surgical analysis using medical problems parser architecture
   */
  private async callGPTForSurgicalAnalysis(
    combinedContent: string,
    existingSurgeries: any[],
    patientContext: string,
    triggerType: string,
    attachmentId: number | null
  ): Promise<UnifiedSurgicalChange[]> {
    
    const prompt = `You are an expert surgical assistant with 20+ years experience in surgical documentation and medical record management. Your task is to analyze surgical history mentions and provide unified changes that handle consolidation, evolution, and visit history transfer.

PATIENT CLINICAL CONTEXT:
${patientContext}

EXISTING SURGICAL HISTORY:
${existingSurgeries.length > 0 
  ? existingSurgeries.map(s => `ID: ${s.id} | ${s.procedure_name} (${s.procedure_date}) at ${s.facility_name || 'Unknown facility'}, Surgeon: ${s.surgeon_name || 'Unknown'}`).join('\n')
  : "- No previous surgical history recorded"
}

DOCUMENT TO ANALYZE:
${combinedContent}

UNIFIED CHANGE SYSTEM:
You must analyze the document and determine what changes need to be made to the surgical history. Return a JSON array of changes following this format:

CHANGE TYPES:
1. **NEW_SURGERY**: Create a completely new surgical procedure entry
2. **ADD_VISIT**: Add a visit history entry to existing surgery (when surgery is mentioned in context)
3. **EVOLVE_SURGERY**: Transform one surgery into another (e.g., "simple appendectomy" → "complicated appendectomy with abscess")
4. **CORRECT_DATE**: Fix an incorrect surgery date
5. **UPDATE_DETAILS**: Update surgeon, facility, or other details

CONSOLIDATION RULES:
- If a procedure already exists, prefer ADD_VISIT or UPDATE_DETAILS over NEW_SURGERY
- Use EVOLVE_SURGERY when complications or additional details change the nature of the procedure
- Always include consolidation_reasoning when making consolidation decisions

VISIT HISTORY TRANSFER:
- When using EVOLVE_SURGERY, specify transfer_visit_history_from: [surgery_id] to preserve history
- The old surgery will be updated and the new evolved surgery will inherit all visit history

DATE EXTRACTION:
- Extract accurate procedure dates from content
- For attachments, use extracted_date field for the date mentioned in the document
- Prefer specific dates over approximate ones

Response format (JSON array):
[
  {
    "surgery_id": 123, // ID of existing surgery to modify (null for NEW_SURGERY)
    "action": "ADD_VISIT" | "NEW_SURGERY" | "EVOLVE_SURGERY" | "CORRECT_DATE" | "UPDATE_DETAILS",
    "procedure_name": "Laparoscopic cholecystectomy",
    "visit_notes": "Post-op follow-up, no complications noted",
    "date_change": {"from": "2020-01-01", "to": "2020-01-15"}, // only for CORRECT_DATE
    "surgeon_change": {"from": "Dr. Smith", "to": "Dr. Johnson"}, // only for UPDATE_DETAILS
    "facility_change": {"from": "Hospital A", "to": "Hospital B"}, // only for UPDATE_DETAILS
    "confidence": 85,
    "source_type": "${attachmentId ? "attachment" : "encounter"}",
    "transfer_visit_history_from": 456, // surgery_id to transfer history from (EVOLVE_SURGERY only)
    "extracted_date": "2020-01-15", // ISO date from document content
    "consolidation_reasoning": "Patient mentions same cholecystectomy procedure, adding visit history rather than creating duplicate"
  }
]

CRITICAL RULES:
1. Only return surgical procedures explicitly mentioned in the document
2. DO NOT create entries for procedures only mentioned in existing surgical history
3. If no surgical procedures are mentioned, return empty array: []
4. Always include confidence score (0-100)
5. Include consolidation_reasoning for any consolidation decisions
6. Use specific medical terminology for procedure names
7. Extract accurate dates, facilities, and surgeon names when available

EXAMPLES:

Input: "Patient reports bilateral knee replacement in 2010"
Existing: [ID: 5, "Right total knee replacement (2015-03-10)"]
Response: [
  {
    "surgery_id": null,
    "action": "NEW_SURGERY", 
    "procedure_name": "Bilateral total knee replacement",
    "confidence": 90,
    "source_type": "${attachmentId ? "attachment" : "encounter"}",
    "extracted_date": "2010-01-01",
    "consolidation_reasoning": "Different procedure (bilateral vs unilateral right) and different year (2010 vs 2015)"
  }
]

Input: "Follow-up for cholecystectomy - healing well, no complications"
Existing: [ID: 8, "Laparoscopic cholecystectomy (2023-05-15)"]
Response: [
  {
    "surgery_id": 8,
    "action": "ADD_VISIT",
    "visit_notes": "Follow-up visit - healing well, no complications noted",
    "confidence": 95,
    "source_type": "${attachmentId ? "attachment" : "encounter"}"
  }
]

Input: "Appendectomy complicated by abscess formation requiring drainage"  
Existing: [ID: 3, "Appendectomy (2022-08-10)"]
Response: [
  {
    "surgery_id": null,
    "action": "EVOLVE_SURGERY",
    "procedure_name": "Complicated appendectomy with abscess drainage", 
    "confidence": 88,
    "source_type": "${attachmentId ? "attachment" : "encounter"}",
    "transfer_visit_history_from": 3,
    "consolidation_reasoning": "Surgery evolved from simple appendectomy to complicated procedure with abscess - preserving original visit history"
  }
]

Analyze the document and return appropriate surgical history changes:`;

    try {
      console.log(`🔄 [UnifiedSurgicalHistory] 🤖 Sending request to GPT-4.1`);
      console.log(`🔄 [UnifiedSurgicalHistory] 🤖 Content length: ${combinedContent.length} characters`);
      console.log(`🔄 [UnifiedSurgicalHistory] 🤖 Existing surgeries: ${existingSurgeries.length}`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a surgical documentation expert with 20+ years of experience. Extract surgical history accurately and return only valid JSON array of unified changes.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });

      const responseContent = response.choices[0]?.message?.content?.trim();
      
      if (!responseContent) {
        console.warn(`🔄 [UnifiedSurgicalHistory] ⚠️ Empty response from GPT`);
        return [];
      }

      console.log(`🔄 [UnifiedSurgicalHistory] 🤖 GPT Response: ${responseContent.substring(0, 500)}...`);

      // Parse JSON response
      let parsedResponse;
      try {
        // Clean response if it has markdown formatting
        const cleanResponse = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error(`🔄 [UnifiedSurgicalHistory] ❌ JSON parsing error:`, parseError);
        console.error(`🔄 [UnifiedSurgicalHistory] ❌ Raw response:`, responseContent);
        return [];
      }

      if (!Array.isArray(parsedResponse)) {
        console.error(`🔄 [UnifiedSurgicalHistory] ❌ Response is not an array:`, parsedResponse);
        return [];
      }

      console.log(`🔄 [UnifiedSurgicalHistory] ✅ Successfully parsed ${parsedResponse.length} surgical changes from GPT`);
      return parsedResponse;

    } catch (error) {
      console.error(`🔄 [UnifiedSurgicalHistory] ❌ Error calling GPT:`, error);
      return [];
    }
  }

  /**
   * Apply unified change to surgical history (matches medical problems architecture)
   */
  private async applyUnifiedChange(
    change: UnifiedSurgicalChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    console.log(`🔄 [UnifiedSurgicalHistory] Applying change: ${change.action} for ${change.procedure_name}`);

    switch (change.action) {
      case "NEW_SURGERY":
        await this.createNewSurgery(change, patientId, encounterId, attachmentId);
        break;
      case "ADD_VISIT":
        await this.addVisitToExistingSurgery(change, encounterId, attachmentId);
        break;
      case "EVOLVE_SURGERY":
        await this.evolveSurgeryWithHistoryTransfer(change, patientId, encounterId, attachmentId);
        break;
      case "CORRECT_DATE":
        await this.correctSurgeryDate(change, encounterId, attachmentId);
        break;
      case "UPDATE_DETAILS":
        await this.updateSurgeryDetails(change, encounterId, attachmentId);
        break;
      default:
        console.warn(`🔄 [UnifiedSurgicalHistory] Unknown action: ${change.action}`);
    }
  }

  /**
   * Create new surgical procedure
   */
  private async createNewSurgery(
    change: UnifiedSurgicalChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      // Use extracted date from attachment content
      visitDate = change.extracted_date;
    } else if (encounterId) {
      // Use encounter date for SOAP note content
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      // Fallback to current date
      visitDate = new Date().toISOString().split("T")[0];
    }

    // Create initial visit history entry
    const initialVisitEntry = {
      date: visitDate,
      notes: change.visit_notes || `Surgical procedure: ${change.procedure_name}`,
      source: change.source_type === "attachment" ? "attachment" as const : "encounter" as const,
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      confidence: change.confidence,
      isSigned: false,
      sourceNotes: change.consolidation_reasoning || "New surgical procedure entry",
    };

    // Convert percentage confidence (0-100) to decimal (0.00-1.00) for database storage
    const confidenceDecimal = change.confidence / 100;
    console.log(`🏥 [SurgicalHistory] Converting confidence ${change.confidence}% to decimal ${confidenceDecimal.toFixed(2)}`);
    
    await db.insert(surgicalHistory).values({
      patientId,
      procedureName: change.procedure_name!,
      procedureDate: change.extracted_date || null,
      sourceType: change.source_type,
      sourceConfidence: confidenceDecimal.toFixed(2),
      visitHistory: [initialVisitEntry],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ [UnifiedSurgicalHistory] Created surgery: ${change.procedure_name} (${change.source_type})`);
  }

  /**
   * Add visit history to existing surgery
   */
  private async addVisitToExistingSurgery(
    change: UnifiedSurgicalChange,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    if (!change.surgery_id) return;

    const [existingSurgery] = await db
      .select()
      .from(surgicalHistory)
      .where(eq(surgicalHistory.id, change.surgery_id));

    if (!existingSurgery) return;

    const visitHistory = Array.isArray(existingSurgery.visitHistory)
      ? (existingSurgery.visitHistory as UnifiedSurgicalVisitHistoryEntry[])
      : [];

    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      visitDate = change.extracted_date;
    } else if (encounterId) {
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      visitDate = new Date().toISOString().split("T")[0];
    }

    // Check for duplicate visits to prevent adding identical entries
    const filteredHistory = this.filterDuplicateVisitEntries(
      visitHistory,
      encounterId,
      attachmentId,
      change.source_type
    );

    const newVisitEntry = {
      date: visitDate,
      notes: change.visit_notes || `Surgery discussed: ${existingSurgery.procedureName}`,
      source: change.source_type === "attachment" ? "attachment" as const : "encounter" as const,
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      confidence: change.confidence,
      isSigned: false,
      sourceNotes: change.consolidation_reasoning || "Additional surgery visit",
    };

    filteredHistory.push(newVisitEntry);

    await db
      .update(surgicalHistory)
      .set({
        visitHistory: filteredHistory,
        updatedAt: new Date(),
      })
      .where(eq(surgicalHistory.id, change.surgery_id));

    console.log(`✅ [UnifiedSurgicalHistory] Added visit to surgery: ${existingSurgery.procedureName}`);
  }

  /**
   * Evolve surgery with visit history transfer (like medical problems evolution)
   */
  private async evolveSurgeryWithHistoryTransfer(
    change: UnifiedSurgicalChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    console.log(`🔄 [UnifiedSurgicalHistory] Evolving surgery with history transfer`);
    console.log(`🔄 [UnifiedSurgicalHistory] From surgery ID: ${change.transfer_visit_history_from}`);
    console.log(`🔄 [UnifiedSurgicalHistory] New procedure: ${change.procedure_name}`);

    if (!change.transfer_visit_history_from) {
      console.warn(`⚠️ [UnifiedSurgicalHistory] No source surgery ID provided for evolution`);
      return;
    }

    // Get the old surgery to transfer history from
    const [oldSurgery] = await db
      .select()
      .from(surgicalHistory)
      .where(eq(surgicalHistory.id, change.transfer_visit_history_from));

    if (!oldSurgery) {
      console.error(`❌ [UnifiedSurgicalHistory] Source surgery ${change.transfer_visit_history_from} not found`);
      return;
    }

    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      visitDate = change.extracted_date;
    } else if (encounterId) {
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      visitDate = new Date().toISOString().split("T")[0];
    }

    // Transfer existing visit history
    const transferredHistory = Array.isArray(oldSurgery.visitHistory)
      ? [...(oldSurgery.visitHistory as UnifiedSurgicalVisitHistoryEntry[])]
      : [];

    // Add new visit entry for this evolution
    const newVisitEntry: UnifiedSurgicalVisitHistoryEntry = {
      date: visitDate,
      notes: change.visit_notes || `Surgery evolved: ${oldSurgery.procedureName} → ${change.procedure_name}`,
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      changesMade: ["surgery_evolution", "visit_history_transferred"],
      confidence: change.confidence,
      isSigned: false,
      sourceNotes: `Evolved from surgery ID ${change.transfer_visit_history_from}`,
    };

    transferredHistory.push(newVisitEntry);

    // Create the new evolved surgery
    await db.insert(surgicalHistory).values({
      patientId,
      procedureName: change.procedure_name!,
      procedureDate: oldSurgery.procedureDate, // Preserve original surgery date
      sourceType: change.source_type,
      sourceConfidence: change.confidence.toString(),
      visitHistory: transferredHistory,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ [UnifiedSurgicalHistory] Evolved surgery: ${oldSurgery.procedureName} → ${change.procedure_name}`);
  }

  /**
   * Correct surgery date
   */
  private async correctSurgeryDate(
    change: UnifiedSurgicalChange,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    if (!change.surgery_id || !change.date_change) return;

    const [existingSurgery] = await db
      .select()
      .from(surgicalHistory)
      .where(eq(surgicalHistory.id, change.surgery_id));

    if (!existingSurgery) return;

    const visitHistory = Array.isArray(existingSurgery.visitHistory)
      ? (existingSurgery.visitHistory as UnifiedSurgicalVisitHistoryEntry[])
      : [];

    const visitDate = change.date_change.to;
    const newVisitEntry: UnifiedSurgicalVisitHistoryEntry = {
      date: visitDate,
      notes: change.visit_notes || `Date corrected: ${change.date_change.from} → ${change.date_change.to}`,
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      changesMade: ["date_correction"],
      confidence: change.confidence,
      isSigned: false,
    };

    visitHistory.push(newVisitEntry);

    await db
      .update(surgicalHistory)
      .set({
        procedureDate: change.date_change.to,
        visitHistory,
      })
      .where(eq(surgicalHistory.id, change.surgery_id));

    console.log(`✅ [UnifiedSurgicalHistory] Corrected surgery date: ${change.date_change.from} → ${change.date_change.to}`);
  }

  /**
   * Update surgery details
   */
  private async updateSurgeryDetails(
    change: UnifiedSurgicalChange,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    if (!change.surgery_id) return;

    const [existingSurgery] = await db
      .select()
      .from(surgicalHistory)
      .where(eq(surgicalHistory.id, change.surgery_id));

    if (!existingSurgery) return;

    const visitHistory = Array.isArray(existingSurgery.visitHistory)
      ? (existingSurgery.visitHistory as UnifiedSurgicalVisitHistoryEntry[])
      : [];

    const visitDate = change.extracted_date || new Date().toISOString().split("T")[0];
    const changesMade = [];

    if (change.surgeon_change) changesMade.push("surgeon_updated");
    if (change.facility_change) changesMade.push("facility_updated");

    const newVisitEntry: UnifiedSurgicalVisitHistoryEntry = {
      date: visitDate,
      notes: change.visit_notes || `Surgery details updated`,
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      changesMade,
      confidence: change.confidence,
      isSigned: false,
    };

    visitHistory.push(newVisitEntry);

    const updateData: any = {
      visitHistory,
      updatedAt: new Date(),
    };

    if (change.surgeon_change) {
      updateData.surgeonName = change.surgeon_change.to;
    }
    if (change.facility_change) {
      updateData.facilityName = change.facility_change.to;
    }

    await db
      .update(surgicalHistory)
      .set(updateData)
      .where(eq(surgicalHistory.id, change.surgery_id));

    console.log(`✅ [UnifiedSurgicalHistory] Updated surgery details for: ${existingSurgery.procedureName}`);
  }

  /**
   * Filter duplicate visit entries (matches medical problems logic)
   */
  private filterDuplicateVisitEntries(
    existingVisits: UnifiedSurgicalVisitHistoryEntry[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment"
  ): UnifiedSurgicalVisitHistoryEntry[] {
    return existingVisits.filter(visit => {
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
}

// Export singleton instance
export const unifiedSurgicalHistoryParser = new UnifiedSurgicalHistoryParser();