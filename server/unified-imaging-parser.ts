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

3. **PRODUCTION-LEVEL PRE-INSERT VALIDATION**: 
   - **EPIC/ATHENA STANDARDS**: Use commercial EMR-grade deduplication logic
   - **MANDATORY CONSOLIDATION**: BEFORE creating any new imaging study, systematically check ALL existing studies
   - **INTELLIGENT MATCHING**: Apply clinical intelligence - "CXR" = "Chest X-ray" = "chest radiograph" = "PA/lateral chest"
   - **CONFIDENCE THRESHOLDS**: 
     * ≥95% confidence: MUST consolidate (exact matches)
     * ≥70% confidence: SHOULD consolidate (high probability same study)
     * <70% confidence: Evaluate additional context (dates, facility, ordering provider)
   - **EXACT MATCH RULE**: Same date + modality + body part = ALWAYS consolidate, no exceptions
   - **DATE TOLERANCE**: ±7 days for same study (documentation date variations)
   - **SYNONYM MATCHING**: Chest/thoracic, abdomen/abdominal, brain/head, spine/lumbar/cervical
   - **DEFAULT TO CONSOLIDATION**: When in doubt, consolidate rather than duplicate

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

PRODUCTION-LEVEL CONSOLIDATION EXAMPLES (EPIC/ATHENA STANDARDS):

1. **EXACT MATCH - MUST CONSOLIDATE (95%+ confidence)**:
   Existing: XR chest 2010-06-12 "Cardiomegaly with pulmonary congestion"
   New Content: "Chest X-ray 6/12/2010 shows cardiomegaly, bilateral pulmonary congestion, mild pleural effusions"
   Action: {"action": "ADD_VISIT", "imaging_id": 8, "confidence": 0.99, "consolidation_reasoning": "Exact match - same modality, body part, and date. Adding enhanced interpretation to existing study."}

2. **SYNONYM MATCHING - INTELLIGENT CONSOLIDATION**:
   Existing: CT abdomen/pelvis 2023-03-15 "Normal bowel, kidneys"
   New Content: "Abdominal CT with contrast 3/15/23 - no abnormalities identified"
   Action: {"action": "ADD_VISIT", "imaging_id": 15, "confidence": 0.96, "consolidation_reasoning": "Same study - abdomen/pelvis = abdominal CT. Different interpretation phrasing but same findings."}

3. **DATE TOLERANCE - DOCUMENTATION VARIATIONS**:
   Existing: MR brain 2023-01-15 "Small vessel disease"
   New Content: "Brain MRI performed January 16, 2023 - chronic microvascular changes"
   Action: {"action": "ADD_VISIT", "imaging_id": 12, "confidence": 0.92, "consolidation_reasoning": "Same study within ±7 day tolerance. Date variation likely due to read date vs. study date documentation."}

4. **STATUS PROGRESSION - PRELIMINARY TO FINAL**:
   Existing: CT chest 2023-06-10 "Preliminary: possible pneumonia" (status: preliminary)
   New Content: "Final read CT chest 6/10/23: confirmed RLL pneumonia with parapneumonic effusion"
   Action: {"action": "STATUS_CHANGE", "imaging_id": 20, "confidence": 0.98, "result_status": "final", "consolidation_reasoning": "Same study progressing from preliminary to final read with attending radiologist interpretation."}

5. **ADDENDUM WORKFLOW - ADDITIONAL FINDINGS**:
   Existing: XR chest 2023-08-20 "Normal heart and lungs"
   New Content: "Addendum to chest X-ray 8/20/23: small nodule noted in RUL on closer inspection"
   Action: {"action": "ADDENDUM", "imaging_id": 25, "confidence": 0.97, "consolidation_reasoning": "Addendum to existing study - additional findings identified on secondary review."}

6. **MODALITY PRECISION - AVOID FALSE MATCHES**:
   Existing: Echo 2023-05-10 "Normal ejection fraction"
   New Content: "EKG on 5/10/23 shows normal sinus rhythm"
   Action: {"action": "NEW_IMAGING", "confidence": 0.25, "consolidation_reasoning": "Different modalities - Echo (ultrasound) vs EKG (electrical study). Do not consolidate despite same date."}

7. **BODY PART SPECIFICITY - GRANULAR MATCHING**:
   Existing: MR lumbar spine 2023-04-01 "Degenerative changes L4-L5"
   New Content: "Cervical spine MRI 4/1/23: normal alignment"
   Action: {"action": "NEW_IMAGING", "confidence": 0.15, "consolidation_reasoning": "Different anatomical regions - lumbar vs cervical spine. Separate studies despite same modality and date."}

8. **FOLLOW-UP STUDIES - DO NOT CONSOLIDATE**:
   Existing: CT chest 2023-02-01 "Small pulmonary nodule RUL"
   New Content: "Follow-up chest CT 2/15/23: nodule unchanged in size"
   Action: {"action": "NEW_IMAGING", "confidence": 0.30, "consolidation_reasoning": "Follow-up study 14 days later. Different study despite similar findings - tracking nodule over time."}

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

**CRITICAL PRE-INSERT VALIDATION RULES**:

1. **CONFIDENCE THRESHOLD ENFORCEMENT**:
   - NEW_IMAGING: Minimum 70% confidence required
   - ADD_VISIT: Minimum 60% confidence for consolidation
   - Reject extractions below minimum thresholds
   - Log reasoning for all confidence decisions

2. **MANDATORY DUPLICATE PREVENTION**:
   - Check ALL existing imaging before any creation
   - Apply ±7 day date tolerance for same study
   - Use medical synonym intelligence (chest/thoracic, brain/head)
   - Default to consolidation when clinical match likely

3. **QUALITY GATES**:
   - Require meaningful clinical summaries (not "imaging performed")
   - Enforce modality standardization (XR, CT, MR, US, Echo, PET)
   - Validate study dates are realistic (not future dates)
   - Ensure body part specificity (chest vs lung vs heart)

4. **PRODUCTION-LEVEL LOGGING**:
   - Document all consolidation decisions with reasoning
   - Track confidence scores for quality monitoring
   - Log rejected extractions for audit trail
   - Maintain EMR-grade documentation standards

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
        return `ID: ${study.id}, ${date}: ${study.modality} ${study.bodyPart} - ${study.clinicalSummary || study.impression || "No summary"}`;
      })
      .join("\n");
  }

  /**
   * Filter duplicate visit entries using surgical history pattern
   * Prevents duplicate visits for same encounter/attachment
   */
  private filterDuplicateVisitEntries(
    existingVisits: UnifiedImagingVisitHistoryEntry[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment",
  ): UnifiedImagingVisitHistoryEntry[] {
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

    console.log(`💾 [UnifiedImagingParser] === DATABASE APPLICATION START ===`);
    console.log(`💾 [UnifiedImagingParser] Patient ID: ${patientId}`);
    console.log(`💾 [UnifiedImagingParser] Source Type: ${sourceType}`);
    console.log(`💾 [UnifiedImagingParser] Attachment ID: ${attachmentId}`);
    console.log(`💾 [UnifiedImagingParser] Total changes to apply: ${result.changes.length}`);
    console.log(`💾 [UnifiedImagingParser] Changes:`, JSON.stringify(result.changes, null, 2));

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
          console.log(`🔍 [UnifiedImagingParser] Looking for existing imaging result with ID: ${change.imaging_id}`);
          
          const existing = await db
            .select()
            .from(imagingResults)
            .where(eq(imagingResults.id, change.imaging_id))
            .limit(1);

          console.log(`🔍 [UnifiedImagingParser] Found ${existing.length} existing records for ID: ${change.imaging_id}`);

          if (existing.length) {
            const currentHistory = existing[0].visitHistory || [];
            
            // Filter out duplicate visits using surgical history pattern
            const filteredHistory = this.filterDuplicateVisitEntries(
              currentHistory,
              encounterId,
              attachmentId,
              sourceType
            );
            
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
                visitHistory: [...filteredHistory, newVisit],
                updatedAt: new Date(),
              })
              .where(eq(imagingResults.id, change.imaging_id));

            totalAffected++;
            console.log(
              `✅ [UnifiedImagingParser] Added visit history to imaging ID: ${change.imaging_id}`,
            );
          } else {
            console.error(`❌ [UnifiedImagingParser] CRITICAL: GPT referenced non-existent imaging_id: ${change.imaging_id}`);
            console.error(`❌ [UnifiedImagingParser] This means GPT consolidation logic failed - should create NEW_IMAGING instead`);
            console.error(`❌ [UnifiedImagingParser] Converting ADD_VISIT to NEW_IMAGING to recover from GPT error`);
            
            // Convert to NEW_IMAGING since the referenced ID doesn't exist
            const visitHistoryEntry: UnifiedImagingVisitHistoryEntry = {
              date: new Date().toISOString().split("T")[0],
              notes: change.visit_notes || `Initial ${change.modality} ${change.body_part} study`,
              source: sourceType,
              encounterId: encounterId || undefined,
              attachmentId: attachmentId || undefined,
              confidence: change.confidence,
            };

            await db.insert(imagingResults).values({
              patientId,
              imagingOrderId: null,
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
              sourceType: sourceType === "encounter" ? "encounter_note" : "pdf_extract",
              sourceConfidence: change.confidence.toString(),
              extractedFromAttachmentId: attachmentId || null,
              enteredBy: 1,
              visitHistory: [visitHistoryEntry],
            });

            totalAffected++;
            console.log(`✅ [UnifiedImagingParser] Created NEW imaging result (recovered from GPT error): ${change.modality} ${change.body_part}`);
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
