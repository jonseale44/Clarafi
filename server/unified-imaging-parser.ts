/**
 * Unified Imaging Parser Service
 *
 * Processes imaging results from both SOAP notes and PDF attachments with:
 * - GPT-driven intelligent parsing and conflict resolution
 * - PDF-centric workflow with clean clinical summaries
 * - Source attribution and confidence scoring
 * - Visit history tracking for imaging interpretation changes
 * - Commercial EMR status management (preliminary/final/addendum)
 */

import OpenAI from "openai";
import { db } from "./db.js";
import {
  imagingResults,
  encounters,
  patients,
  patientAttachments,
} from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedImagingVisitHistoryEntry {
  date: string; // YYYY-MM-DD format
  notes: string; // Clinical notes about imaging discussion/interpretation
  source: "encounter" | "attachment"; // Source of this visit entry
  encounterId?: number; // Reference to encounter if source is encounter
  attachmentId?: number; // Reference to attachment if source is attachment
  changesMade?: string[]; // Array of changes made (e.g., 'interpretation_updated', 'status_changed', 'addendum_added')
  confidence?: number; // AI confidence in extraction (0.0-1.0)
  isSigned?: boolean; // Provider signature status
  sourceNotes?: string; // Additional context from extraction source
}

export interface UnifiedImagingChange {
  imaging_id?: number; // null if new imaging result
  action:
    | "ADD_VISIT"
    | "UPDATE_INTERPRETATION"
    | "NEW_IMAGING"
    | "STATUS_CHANGE"
    | "ADDENDUM";
  clinical_summary?: string; // Clean 1-2 sentence summary for chart display
  modality?: string; // XR, CT, MR, US, Echo, PET
  body_part?: string;
  study_date?: string;
  visit_notes?: string;
  status_change?: { from: string; to: string }; // preliminary → final
  confidence: number;
  source_type: "encounter" | "attachment";
  transfer_visit_history_from?: number; // imaging_id to transfer history from
  extracted_date?: string; // ISO date string extracted from content
  consolidation_reasoning?: string; // GPT's reasoning for consolidation decisions
}

export interface UnifiedImagingProcessingResult {
  changes: UnifiedImagingChange[];
  total_imaging_affected: number;
  extraction_confidence: number;
  processing_notes: string;
}

export class UnifiedImagingParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process imaging data from SOAP notes with comprehensive patient context
   */
  async processSoapImagingData(
    patientId: number,
    encounterId: number,
    soapNote: string,
    triggerType: "stop_recording" | "manual_edit" = "stop_recording",
  ): Promise<UnifiedImagingProcessingResult> {
    console.log(`🏥 [UnifiedImagingParser] === SOAP PROCESSING START ===`);
    console.log(
      `🏥 [UnifiedImagingParser] Patient ID: ${patientId}, Encounter ID: ${encounterId}`,
    );
    console.log(
      `🏥 [UnifiedImagingParser] Trigger: ${triggerType}, SOAP Length: ${soapNote?.length || 0} chars`,
    );

    try {
      // Get comprehensive patient chart data for context
      const patientChartData =
        await PatientChartService.getPatientChartData(patientId);
      console.log(
        `🏥 [UnifiedImagingParser] Patient context loaded - Imaging count: ${patientChartData.imagingResults?.length || 0}`,
      );

      // Get existing imaging results for this patient
      const existingImaging = await this.getExistingImaging(patientId);
      console.log(
        `🏥 [UnifiedImagingParser] Found ${existingImaging.length} existing imaging studies`,
      );

      // Process with GPT intelligence
      const result = await this.processWithGPT(
        soapNote,
        existingImaging,
        patientChartData,
        triggerType,
        { encounterId, patientId },
      );

      console.log(
        `🏥 [UnifiedImagingParser] GPT processing complete - ${result.changes.length} changes identified`,
      );

      // Apply changes to database
      const finalResult = await this.applyChangesToDatabase(
        result,
        patientId,
        encounterId,
        "encounter",
      );

      console.log(`🏥 [UnifiedImagingParser] === SOAP PROCESSING COMPLETE ===`);
      return finalResult;
    } catch (error) {
      console.error(`❌ [UnifiedImagingParser] SOAP processing failed:`, error);
      return {
        changes: [],
        total_imaging_affected: 0,
        extraction_confidence: 0,
        processing_notes: `Processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Process imaging data from PDF attachments
   */
  async processAttachmentImagingData(
    attachmentId: number,
    extractedText: string,
    documentType: string,
  ): Promise<UnifiedImagingProcessingResult> {
    console.log(
      `📄 [UnifiedImagingParser] === ATTACHMENT PROCESSING START ===`,
    );
    console.log(
      `📄 [UnifiedImagingParser] Attachment ID: ${attachmentId}, Doc Type: ${documentType}`,
    );
    console.log(
      `📄 [UnifiedImagingParser] Text Length: ${extractedText?.length || 0} chars`,
    );

    try {
      // Get attachment details and patient info
      const attachment = await db
        .select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId))
        .limit(1);
      if (!attachment.length) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      const patientId = attachment[0].patientId;
      console.log(`📄 [UnifiedImagingParser] Patient ID: ${patientId}`);

      // Get comprehensive patient chart data for context
      const patientChartData =
        await PatientChartService.getPatientChartData(patientId);
      console.log(
        `📄 [UnifiedImagingParser] Patient context loaded - Imaging count: ${patientChartData.imagingResults?.length || 0}`,
      );

      // Get existing imaging results for this patient
      const existingImaging = await this.getExistingImaging(patientId);
      console.log(
        `📄 [UnifiedImagingParser] Found ${existingImaging.length} existing imaging studies`,
      );

      // Process with GPT intelligence
      console.log(`🏥 [IMAGING WORKFLOW DEBUG] Starting GPT processing with ${extractedText.length} chars of text`);
      console.log(`🏥 [IMAGING WORKFLOW DEBUG] Document content preview:`, extractedText.substring(0, 800));
      
      const result = await this.processWithGPT(
        extractedText,
        existingImaging,
        patientChartData,
        "attachment_processing",
        { attachmentId, patientId },
      );

      console.log(
        `📄 [UnifiedImagingParser] GPT processing complete - ${result.changes.length} changes identified`,
      );
      console.log(`🏥 [IMAGING WORKFLOW DEBUG] GPT RESULT CHANGES:`, JSON.stringify(result.changes, null, 2));

      // Apply changes to database
      const finalResult = await this.applyChangesToDatabase(
        result,
        patientId,
        null,
        "attachment",
        attachmentId,
      );

      console.log(
        `📄 [UnifiedImagingParser] === ATTACHMENT PROCESSING COMPLETE ===`,
      );
      return finalResult;
    } catch (error) {
      console.error(
        `❌ [UnifiedImagingParser] Attachment processing failed:`,
        error,
      );
      return {
        changes: [],
        total_imaging_affected: 0,
        extraction_confidence: 0,
        processing_notes: `Processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Get existing imaging results for patient to provide GPT context
   */
  private async getExistingImaging(patientId: number) {
    return await db
      .select()
      .from(imagingResults)
      .where(eq(imagingResults.patientId, patientId))
      .orderBy(desc(imagingResults.studyDate));
  }

  /**
   * Process content with GPT-4.1 intelligence for imaging extraction and consolidation
   */
  private async processWithGPT(
    content: string,
    existingImaging: any[],
    patientChartData: any,
    triggerType: string,
    context: { encounterId?: number; attachmentId?: number; patientId: number },
  ): Promise<UnifiedImagingProcessingResult> {
    const prompt = `You are an expert radiologist and EMR specialist with 20+ years of experience in imaging interpretation and medical record documentation. You excel at extracting structured imaging data from clinical notes and radiology reports while maintaining clinical accuracy and proper consolidation logic.

PATIENT CONTEXT:
${this.formatPatientChartForGPT(patientChartData)}

EXISTING IMAGING HISTORY:
${this.formatExistingImagingForGPT(existingImaging)}

PROCESSING CONTEXT:
- Trigger: ${triggerType}
- Content Source: ${context.encounterId ? "SOAP Note" : "PDF Attachment"}
- Patient ID: ${context.patientId}

CRITICAL INSTRUCTIONS:

1. **PDF-CENTRIC WORKFLOW**: Focus on extracting clean, clinical summaries from radiology reports. Generate concise 1-2 sentence summaries like "Normal heart and lungs" or "Small RUL nodule, stable from prior".

2. **HISTORICAL IMAGING ONLY**: Extract only completed imaging studies with results. Do NOT extract future recommendations, planned studies, or "patient should get MRI" type content.

3. **MANDATORY CONSOLIDATION FIRST**: 
   - BEFORE creating any new imaging study, systematically check existing studies
   - Match by: modality + body part + study date (±7 days tolerance)
   - Consolidate when confidence ≥70% that studies are the same
   - For exact matches (same date/modality/body part): ALWAYS consolidate unless findings dramatically different
   - Use action "ADD_VISIT" to add new interpretations to existing studies
   - Only use "NEW_IMAGING" when no reasonable match exists
   - Apply clinical intelligence: "CXR" = "Chest X-ray" = "chest radiograph"

4. **COMMERCIAL EMR STATUS WORKFLOW**:
   - "preliminary" = preliminary read by resident/AI
   - "final" = attending radiologist final read  
   - "addendum" = additional findings or corrections
   - "corrected" = error corrections

5. **CLEAN CLINICAL SUMMARIES**: Generate professional, concise summaries:
   - "Normal heart and lungs"
   - "Small pleural effusion, improved"
   - "Mild degenerative changes L4-L5"
   - "No acute intracranial abnormality"

6. **VISIT HISTORY TRACKING**: For consolidations, create visit entries documenting:
   - Interpretation changes
   - Status updates (preliminary → final)
   - Addendums or corrections
   - New findings on repeat studies

CONTENT TO ANALYZE:
${content}

MANDATORY CONSOLIDATION EXAMPLES:

1. **EXACT MATCH - ALWAYS CONSOLIDATE**:
   Existing: XR chest 2010-06-12 "Cardiomegaly with pulmonary congestion"
   New Content: "Chest X-ray 6/12/2010 shows cardiomegaly, bilateral pulmonary congestion, mild pleural effusions"
   Action: {"action": "ADD_VISIT", "imaging_id": 8, "consolidation_reasoning": "Exact match - same modality, body part, and date. Adding new interpretation to existing study."}

2. **NEAR-MATCH - CONSOLIDATE WITH TOLERANCE**:
   Existing: CT head 2023-01-15 
   New Content: "Head CT from January 16, 2023"
   Action: {"action": "ADD_VISIT", "imaging_id": 12, "consolidation_reasoning": "Same study within ±7 day tolerance, likely same CT with different documentation dates"}

3. **DIFFERENT FINDINGS - STILL CONSOLIDATE SAME STUDY**:
   Existing: XR chest 2010-06-12 "Normal"
   New Content: "Chest radiograph 6/12/2010 cardiomegaly and congestion"
   Action: {"action": "ADD_VISIT", "imaging_id": 8, "consolidation_reasoning": "Same study date/modality - likely re-read or addendum with new findings"}

4. **CREATE NEW ONLY WHEN CLEARLY DIFFERENT**:
   Existing: XR chest 2010-06-12
   New Content: "Chest X-ray 2010-06-20" 
   Action: {"action": "NEW_IMAGING", "consolidation_reasoning": "Different study date (8 days apart) suggests follow-up study, not same exam"}

Return a JSON object with this exact structure:
{
  "changes": [
    {
      "imaging_id": null | number,
      "action": "NEW_IMAGING" | "UPDATE_INTERPRETATION" | "STATUS_CHANGE" | "ADDENDUM" | "ADD_VISIT",
      "clinical_summary": "string",
      "modality": "XR" | "CT" | "MR" | "US" | "Echo" | "PET",
      "body_part": "string",
      "study_date": "YYYY-MM-DD",
      "laterality": "left" | "right" | "bilateral" | null,
      "findings": "full findings text",
      "impression": "radiologist impression",
      "radiologist_name": "string or null",
      "facility_name": "string or null",
      "result_status": "preliminary" | "final" | "addendum" | "corrected",
      "visit_notes": "string for visit history",
      "confidence": 0.0-1.0,
      "source_type": "encounter" | "attachment",
      "consolidation_reasoning": "string explaining consolidation decision"
    }
  ],
  "total_imaging_affected": number,
  "extraction_confidence": 0.0-1.0,
  "processing_notes": "string describing what was processed"
}

**IMPORTANT**: Only extract actual imaging RESULTS, not orders or recommendations. Focus on clean clinical summaries suitable for provider chart review.`;

    try {
      console.log(`🤖 [IMAGING WORKFLOW] ======== STARTING GPT PROCESSING ========`);
      console.log(`🤖 [IMAGING WORKFLOW] Model: gpt-4.1-nano`);
      console.log(`🤖 [IMAGING WORKFLOW] Content length: ${content.length} characters`);
      console.log(`🤖 [IMAGING WORKFLOW] Existing imaging count: ${existingImaging.length}`);
      console.log(`🤖 [IMAGING WORKFLOW] Trigger type: ${triggerType}`);
      console.log(`🤖 [IMAGING WORKFLOW] Context: ${JSON.stringify(context)}`);
      console.log(`🤖 [IMAGING WORKFLOW] Content preview: "${content.substring(0, 500)}..."`);
      console.log(`🤖 [IMAGING WORKFLOW] Prompt length: ${prompt.length} characters`);
      console.log(`🤖 [IMAGING WORKFLOW] Sending request to GPT-4.1-nano...`);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 30000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from GPT");
      }

      console.log(`🤖 [IMAGING WORKFLOW] ======== GPT RESPONSE RECEIVED ========`);
      console.log(`🤖 [IMAGING WORKFLOW] Response length: ${response.length} characters`);
      console.log(`🤖 [IMAGING WORKFLOW] Response preview: "${response.substring(0, 1000)}..."`);
      console.log(`🤖 [IMAGING WORKFLOW] Parsing JSON response...`);
      
      const result = JSON.parse(response);
      
      console.log(`🤖 [IMAGING WORKFLOW] ======== JSON PARSED SUCCESSFULLY ========`);
      console.log(`🤖 [IMAGING WORKFLOW] Changes found: ${result.changes?.length || 0}`);
      console.log(`🤖 [IMAGING WORKFLOW] Total affected: ${result.total_imaging_affected || 0}`);
      console.log(`🤖 [IMAGING WORKFLOW] Extraction confidence: ${result.extraction_confidence || 0}%`);
      console.log(`🤖 [IMAGING WORKFLOW] Processing notes: "${result.processing_notes || 'None'}"`);
      
      if (result.changes?.length > 0) {
        result.changes.forEach((change, index) => {
          console.log(`🤖 [IMAGING WORKFLOW] Change #${index + 1}:`);
          console.log(`🤖 [IMAGING WORKFLOW] - Action: ${change.action}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Modality: ${change.modality}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Body Part: ${change.body_part}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Clinical Summary: ${change.clinical_summary}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Study Date: ${change.study_date}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Confidence: ${change.confidence}`);
          console.log(`🤖 [IMAGING WORKFLOW] - Source Type: ${change.source_type}`);
        });
      } else {
        console.log(`🤖 [IMAGING WORKFLOW] No changes detected by GPT`);
      }
      
      console.log(`🤖 [IMAGING WORKFLOW] ======== GPT PROCESSING COMPLETE ========`);
      return result;
    } catch (error) {
      console.error(`❌ [UnifiedImagingParser] GPT processing failed:`, error);
      throw new Error(`GPT processing failed: ${error.message}`);
    }
  }

  /**
   * Format patient chart data for GPT context
   */
  private formatPatientChartForGPT(chartData: any): string {
    const sections = [];

    sections.push(
      `Patient: ${chartData.patient?.firstName} ${chartData.patient?.lastName}, Age: ${chartData.patient?.age || "Unknown"}`,
    );

    if (chartData.medicalProblems?.length) {
      sections.push(
        `Medical Problems: ${chartData.medicalProblems.map((p) => p.condition).join(", ")}`,
      );
    }

    if (chartData.medications?.length) {
      sections.push(
        `Current Medications: ${chartData.medications
          .slice(0, 5)
          .map((m) => m.medicationName)
          .join(", ")}`,
      );
    }

    if (chartData.allergies?.length) {
      sections.push(
        `Allergies: ${chartData.allergies.map((a) => a.allergen).join(", ")}`,
      );
    }

    return sections.join("\n");
  }

  /**
   * Format existing imaging for GPT context
   */
  private formatExistingImagingForGPT(imaging: any[]): string {
    if (!imaging.length) {
      return "No previous imaging studies on record.";
    }

    return imaging
      .slice(0, 10)
      .map((study) => {
        const date = new Date(study.studyDate).toLocaleDateString();
        return `${date}: ${study.modality} ${study.bodyPart} - ${study.clinicalSummary || study.impression || "No summary"}`;
      })
      .join("\n");
  }

  /**
   * Apply GPT-generated changes to database
   */
  private async applyChangesToDatabase(
    result: UnifiedImagingProcessingResult,
    patientId: number,
    encounterId: number | null,
    sourceType: "encounter" | "attachment",
    attachmentId?: number,
  ): Promise<UnifiedImagingProcessingResult> {
    let totalAffected = 0;

    for (const change of result.changes) {
      try {
        console.log(
          `💾 [UnifiedImagingParser] Processing change: ${change.action} for ${change.modality} ${change.body_part}`,
        );

        if (change.action === "NEW_IMAGING") {
          // Create new imaging result
          const visitHistoryEntry: UnifiedImagingVisitHistoryEntry = {
            date: new Date().toISOString().split("T")[0],
            notes:
              change.visit_notes ||
              `Initial ${change.modality} ${change.body_part} study`,
            source: sourceType,
            encounterId: encounterId || undefined,
            attachmentId: attachmentId || undefined,
            confidence: change.confidence,
          };

          await db.insert(imagingResults).values({
            patientId,
            imagingOrderId: null, // Historical findings may not have orders
            studyDate: new Date(change.study_date!),
            modality: change.modality!,
            bodyPart: change.body_part!,
            laterality: change.laterality || null,
            clinicalSummary: change.clinical_summary!,
            findings: change.findings || null,
            impression: change.impression || null,
            radiologistName: change.radiologist_name || null,
            facilityName: change.facility_name || null,
            resultStatus: change.result_status || "final",
            sourceType:
              sourceType === "encounter" ? "encounter_note" : "pdf_extract",
            sourceConfidence: change.confidence.toString(),
            extractedFromAttachmentId: attachmentId || null,
            enteredBy: 1, // jonseale user ID
            visitHistory: [visitHistoryEntry],
          });

          totalAffected++;
          console.log(
            `✅ [UnifiedImagingParser] Created new imaging result: ${change.modality} ${change.body_part}`,
          );
        } else if (change.action === "ADD_VISIT" && change.imaging_id) {
          // Add visit history to existing imaging
          const existing = await db
            .select()
            .from(imagingResults)
            .where(eq(imagingResults.id, change.imaging_id))
            .limit(1);

          if (existing.length) {
            const currentHistory = existing[0].visitHistory || [];
            const newVisit: UnifiedImagingVisitHistoryEntry = {
              date: new Date().toISOString().split("T")[0],
              notes: change.visit_notes || "Study reviewed",
              source: sourceType,
              encounterId: encounterId || undefined,
              attachmentId: attachmentId || undefined,
              confidence: change.confidence,
            };

            await db
              .update(imagingResults)
              .set({
                visitHistory: [...currentHistory, newVisit],
                updatedAt: new Date(),
              })
              .where(eq(imagingResults.id, change.imaging_id));

            totalAffected++;
            console.log(
              `✅ [UnifiedImagingParser] Added visit history to imaging ID: ${change.imaging_id}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ [UnifiedImagingParser] Failed to apply change:`,
          error,
        );
      }
    }

    return {
      ...result,
      total_imaging_affected: totalAffected,
    };
  }
}
