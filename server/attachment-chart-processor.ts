import { db } from "./db.js";
import { VitalsParserService } from "./vitals-parser-service.js";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { UnifiedSurgicalHistoryParser } from "./unified-surgical-history-parser.js";
import { 
  attachmentExtractedContent, 
  patientAttachments, 
  vitals, 
  patients 
} from "../shared/schema.js";
import { eq } from "drizzle-orm";

/**
 * Attachment Chart Processor
 * Processes completed document extractions and populates chart sections
 * Uses unified parsers for vitals and medical problems processing
 */
export class AttachmentChartProcessor {
  private vitalsParser: VitalsParserService;
  private surgicalHistoryParser: UnifiedSurgicalHistoryParser;

  constructor() {
    this.vitalsParser = new VitalsParserService();
    this.surgicalHistoryParser = new UnifiedSurgicalHistoryParser();
  }

  /**
   * Process completed attachment for chart data extraction
   */
  async processCompletedAttachment(attachmentId: number): Promise<void> {
    console.log(`🔥 [CHART WORKFLOW] ============= STARTING CHART PROCESSING =============`);
    console.log(`📋 [AttachmentChartProcessor] 🚀 Processing completed attachment ${attachmentId}`);
    console.log(`📋 [AttachmentChartProcessor] 📊 This will extract vitals AND medical problems from document`);

    try {
      // Get attachment and extracted content
      console.log(`📋 [AttachmentChartProcessor] 🔍 Step 1: Fetching attachment data from database`);
      const [attachment] = await db.select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId));

      if (!attachment) {
        console.error(`📋 [AttachmentChartProcessor] ❌ CRITICAL: Attachment ${attachmentId} not found in database`);
        throw new Error(`Attachment ${attachmentId} not found`);
      }
      console.log(`📋 [AttachmentChartProcessor] ✅ Step 1 Complete: Found attachment "${attachment.originalFileName}" for Patient ${attachment.patientId}`);

      console.log(`📋 [AttachmentChartProcessor] 🔍 Step 2: Fetching extracted content from database`);
      const [extractedContent] = await db.select()
        .from(attachmentExtractedContent)
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      if (!extractedContent) {
        console.error(`📋 [AttachmentChartProcessor] ❌ CRITICAL: No extracted content found for attachment ${attachmentId}`);
        throw new Error(`No extracted content found for attachment ${attachmentId}`);
      }

      if (extractedContent.processingStatus !== 'completed') {
        console.error(`📋 [AttachmentChartProcessor] ❌ CRITICAL: Attachment ${attachmentId} processing status is "${extractedContent.processingStatus}", expected "completed"`);
        throw new Error(`Attachment ${attachmentId} not ready for processing - status: ${extractedContent.processingStatus}`);
      }
      
      console.log(`📋 [AttachmentChartProcessor] ✅ Step 2 Complete: Extracted content ready`);
      console.log(`📋 [AttachmentChartProcessor] 📄 Content details: ${extractedContent.extractedText?.length || 0} characters, Document type: ${extractedContent.documentType}`);
      console.log(`📋 [AttachmentChartProcessor] 📄 Content preview (first 200 chars): "${extractedContent.extractedText?.substring(0, 200)}..."`);

      // Validate extracted text exists and is meaningful
      if (!extractedContent.extractedText || extractedContent.extractedText.length < 50) {
        console.error(`📋 [AttachmentChartProcessor] ❌ CRITICAL: Extracted text too short or missing for attachment ${attachmentId}`);
        throw new Error(`Insufficient extracted text for processing (${extractedContent.extractedText?.length || 0} characters)`);
      }

      console.log(`📋 [AttachmentChartProcessor] 🔄 Processing ${extractedContent.documentType} document for chart data`);

      // Process ALL documents for vitals extraction (not just H&P)
      console.log(`📋 [AttachmentChartProcessor] 🩺 Starting universal vitals extraction from document type: ${extractedContent.documentType || 'unknown'}`);
      
      // Process vitals, medical problems, and surgical history in parallel for efficiency
      console.log(`📋 [AttachmentChartProcessor] 🔄 Starting parallel processing: vitals + medical problems + surgical history`);
      const parallelStartTime = Date.now();
      
      // Process all three chart sections in parallel for efficiency
      try {
        const [vitalsResult, medicalProblemsResult, surgicalHistoryResult] = await Promise.allSettled([
          this.processDocumentForVitals(attachment, extractedContent),
          this.processDocumentForMedicalProblems(attachment, extractedContent),
          this.processDocumentForSurgicalHistory(attachment, extractedContent)
        ]);
        
        // Check results and log any failures
        if (vitalsResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] Vitals processing failed:`, vitalsResult.reason);
        } else {
          console.log(`✅ [AttachmentChartProcessor] Vitals processing completed successfully`);
        }
        
        if (medicalProblemsResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] Medical problems processing failed:`, medicalProblemsResult.reason);
        } else {
          console.log(`✅ [AttachmentChartProcessor] Medical problems processing completed successfully`);
        }
        
        if (surgicalHistoryResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] Surgical history processing failed:`, surgicalHistoryResult.reason);
        } else {
          console.log(`✅ [AttachmentChartProcessor] Surgical history processing completed successfully`);
        }
        
      } catch (error) {
        console.error(`❌ [AttachmentChartProcessor] Parallel processing failed:`, error);
      }
      
      const parallelTime = Date.now() - parallelStartTime;
      console.log(`📋 [AttachmentChartProcessor] ✅ Parallel processing completed in ${parallelTime}ms`);
      
      // Process specific document types for additional data
      switch (extractedContent.documentType) {
        case 'lab_results':
          // Future: process lab results for specific lab values
          console.log(`📋 [AttachmentChartProcessor] Lab results processing not yet implemented`);
          break;
        case 'discharge_summary':
          // Future: process discharge summaries for medications/diagnoses
          console.log(`📋 [AttachmentChartProcessor] Discharge summary processing not yet implemented`);
          break;
        default:
          console.log(`📋 [AttachmentChartProcessor] Generic document processing completed`);
      }

    } catch (error) {
      console.error(`📋 [AttachmentChartProcessor] ❌ CRITICAL ERROR: Failed to process attachment ${attachmentId}`, error);
      console.error(`📋 [AttachmentChartProcessor] ❌ Error stack:`, error.stack);
      console.log(`🔥 [CHART WORKFLOW] ============= CHART PROCESSING FAILED =============`);
      throw error; // Re-throw to be handled by DocumentAnalysisService
    }
    
    console.log(`📋 [AttachmentChartProcessor] ✅ Successfully completed chart processing for attachment ${attachmentId}`);
    console.log(`🔥 [CHART WORKFLOW] ============= CHART PROCESSING COMPLETE =============`);
  }

  /**
   * Process any medical document for vitals extraction
   */
  private async processDocumentForVitals(attachment: any, extractedContent: any): Promise<void> {
    console.log(`🩺 [VitalsExtraction] Extracting vitals from medical document (${extractedContent.documentType || 'unknown type'})`);
    console.log(`🩺 [VitalsExtraction] Document text length: ${extractedContent.extractedText?.length || 0} characters`);

    if (!extractedContent.extractedText) {
      console.log(`🩺 [VitalsExtraction] ❌ No extracted text available for vitals parsing`);
      return;
    }

    try {
      // Get patient context for better parsing
      console.log(`🩺 [VitalsExtraction] 🔍 Fetching patient context for patient ${attachment.patientId}`);
      const [patient] = await db.select()
        .from(patients)
        .where(eq(patients.id, attachment.patientId));

      let patientContext = undefined;
      if (patient) {
        const birthDate = new Date(patient.dateOfBirth);
        const today = new Date();
        const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        patientContext = {
          age: age,
          gender: patient.gender
        };
      }

      // Use enhanced vitals parser for any medical document (supports multiple vitals sets)
      const vitalsResult = await this.vitalsParser.parseVitalsText(
        extractedContent.extractedText, 
        patientContext
      );

      if (vitalsResult.success && vitalsResult.data && vitalsResult.data.length > 0) {
        console.log(`🩺 [AttachmentChartProcessor] Successfully parsed ${vitalsResult.data.length} vitals sets with ${vitalsResult.confidence}% confidence`);

        // Save each vitals set to database with source tracking
        for (let i = 0; i < vitalsResult.data.length; i++) {
          const vitalSet = vitalsResult.data[i];
          console.log(`🩺 [AttachmentChartProcessor] Saving vitals set ${i + 1}/${vitalsResult.data.length}`);
          
          await this.saveExtractedVitalSet(
            attachment.patientId,
            attachment.encounterId,
            vitalSet,
            attachment.id,
            vitalsResult.confidence,
            extractedContent.documentType,
            i + 1,
            vitalsResult.data.length
          );
        }

        console.log(`✅ [AttachmentChartProcessor] All ${vitalsResult.data.length} vitals sets saved to database for patient ${attachment.patientId}`);
      console.log(`🔥 [VITALS WORKFLOW] ============= VITALS EXTRACTION COMPLETE =============`);
      console.log(`🔥 [WORKFLOW COMPLETE] ============= ATTACHMENT TO VITALS EXTRACTION COMPLETE =============`);
      } else {
        console.log(`📋 [AttachmentChartProcessor] No vitals found in document or parsing failed`);
        if (vitalsResult.errors) {
          console.log(`📋 [AttachmentChartProcessor] Parsing errors:`, vitalsResult.errors);
        }
        console.log(`🔥 [VITALS WORKFLOW] ============= VITALS EXTRACTION FAILED =============`);
      }

    } catch (error) {
      console.error(`📋 [AttachmentChartProcessor] Error extracting vitals from document:`, error);
    }
  }

  /**
   * Process any medical document for medical problems extraction
   * Uses unified medical problems parser for consistent processing
   */
  private async processDocumentForMedicalProblems(attachment: any, extractedContent: any): Promise<void> {
    console.log(`🔥 [MEDICAL PROBLEMS WORKFLOW] ============= STARTING MEDICAL PROBLEMS EXTRACTION =============`);
    console.log(`🏥 [MedicalProblemsExtraction] 🚀 Processing attachment ${attachment.id} for patient ${attachment.patientId}`);
    console.log(`🏥 [MedicalProblemsExtraction] 📄 Document type: ${extractedContent.documentType || 'unknown type'}`);
    console.log(`🏥 [MedicalProblemsExtraction] 📄 Document text length: ${extractedContent.extractedText?.length || 0} characters`);
    console.log(`🏥 [MedicalProblemsExtraction] 📄 Original filename: ${attachment.originalFileName}`);
    console.log(`🏥 [MedicalProblemsExtraction] 📄 Text preview: "${extractedContent.extractedText?.substring(0, 300)}..."`);

    // Validation checks with detailed error messages
    if (!extractedContent.extractedText) {
      const errorMsg = `No extracted text available for medical problems parsing - attachment ${attachment.id}`;
      console.error(`🏥 [MedicalProblemsExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [MEDICAL PROBLEMS WORKFLOW] ============= MEDICAL PROBLEMS EXTRACTION FAILED - NO TEXT =============`);
      throw new Error(errorMsg);
    }

    if (extractedContent.extractedText.length < 50) {
      const errorMsg = `Document text too short (${extractedContent.extractedText.length} chars) for meaningful medical problems extraction - attachment ${attachment.id}`;
      console.error(`🏥 [MedicalProblemsExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [MEDICAL PROBLEMS WORKFLOW] ============= MEDICAL PROBLEMS EXTRACTION FAILED - TEXT TOO SHORT =============`);
      throw new Error(errorMsg);
    }

    try {
      console.log(`🏥 [MedicalProblemsExtraction] 🔍 Starting unified medical problems extraction for patient ${attachment.patientId}`);
      console.log(`🏥 [MedicalProblemsExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified medical problems parser for attachment processing
      const result = await unifiedMedicalProblemsParser.processUnified(
        attachment.patientId,
        null, // No specific encounter ID for attachment
        null, // No SOAP note text
        extractedContent.extractedText, // Attachment content
        attachment.id, // Attachment ID for source tracking
        2, // Default provider ID (Jonathan Seale) - could be made configurable
        "attachment_processed"
      );

      const processingTime = Date.now() - startTime;

      console.log(`🏥 [MedicalProblemsExtraction] ✅ Successfully processed medical problems in ${processingTime}ms`);
      console.log(`🏥 [MedicalProblemsExtraction] ✅ Problems affected: ${result.total_problems_affected}`);
      console.log(`🏥 [MedicalProblemsExtraction] ✅ Processing time: ${result.processing_time_ms}ms`);
      console.log(`🏥 [MedicalProblemsExtraction] ✅ Source summary:`, result.source_summary);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`🏥 [MedicalProblemsExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change, index) => {
          console.log(`🏥 [MedicalProblemsExtraction]   ${index + 1}. ${change.action}: ${change.problem_title || 'existing problem'} (${change.change_type || 'unknown'})`);
          if (change.confidence) {
            console.log(`🏥 [MedicalProblemsExtraction]      Confidence: ${change.confidence}`);
          }
        });
      } else {
        console.log(`🏥 [MedicalProblemsExtraction] ⚠️ No changes made - no medical problems detected or updated`);
      }

      console.log(`🔥 [MEDICAL PROBLEMS WORKFLOW] ============= ATTACHMENT TO MEDICAL PROBLEMS EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [MedicalProblemsExtraction] Error processing medical problems from attachment ${attachment.id}:`, error);
      console.error(`❌ [MedicalProblemsExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [MEDICAL PROBLEMS WORKFLOW] ============= MEDICAL PROBLEMS EXTRACTION FAILED =============`);
    }
  }

  /**
   * Process any medical document for surgical history extraction
   * Uses unified surgical history parser for consistent processing
   */
  private async processDocumentForSurgicalHistory(attachment: any, extractedContent: any): Promise<void> {
    console.log(`🔥 [SURGICAL HISTORY WORKFLOW] ============= STARTING SURGICAL HISTORY EXTRACTION =============`);
    console.log(`🏥 [SurgicalHistoryExtraction] 🚀 Processing attachment ${attachment.id} for patient ${attachment.patientId}`);
    console.log(`🏥 [SurgicalHistoryExtraction] 📄 Document type: ${extractedContent.documentType || 'unknown type'}`);
    console.log(`🏥 [SurgicalHistoryExtraction] 📄 Document text length: ${extractedContent.extractedText?.length || 0} characters`);
    console.log(`🏥 [SurgicalHistoryExtraction] 📄 Original filename: ${attachment.originalFileName}`);
    console.log(`🏥 [SurgicalHistoryExtraction] 📄 Text preview: "${extractedContent.extractedText?.substring(0, 300)}..."`);

    // Validation checks with detailed error messages
    if (!extractedContent.extractedText) {
      const errorMsg = `No extracted text available for surgical history parsing - attachment ${attachment.id}`;
      console.error(`🏥 [SurgicalHistoryExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [SURGICAL HISTORY WORKFLOW] ============= SURGICAL HISTORY EXTRACTION FAILED - NO TEXT =============`);
      throw new Error(errorMsg);
    }

    if (extractedContent.extractedText.length < 50) {
      const errorMsg = `Document text too short (${extractedContent.extractedText.length} chars) for meaningful surgical history extraction - attachment ${attachment.id}`;
      console.error(`🏥 [SurgicalHistoryExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [SURGICAL HISTORY WORKFLOW] ============= SURGICAL HISTORY EXTRACTION FAILED - TEXT TOO SHORT =============`);
      throw new Error(errorMsg);
    }

    try {
      console.log(`🏥 [SurgicalHistoryExtraction] 🔍 Starting unified surgical history extraction for patient ${attachment.patientId}`);
      console.log(`🏥 [SurgicalHistoryExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified surgical history parser for attachment processing
      const result = await this.surgicalHistoryParser.processUnified(
        attachment.patientId,
        null, // No specific encounter ID for attachment
        null, // No SOAP note text
        extractedContent.extractedText, // Attachment content
        attachment.id, // Attachment ID for source tracking
        2, // Default provider ID (Jonathan Seale) - could be made configurable
        "attachment_processed"
      );

      const processingTime = Date.now() - startTime;

      console.log(`🏥 [SurgicalHistoryExtraction] ✅ Successfully processed surgical history in ${processingTime}ms`);
      console.log(`🏥 [SurgicalHistoryExtraction] ✅ Surgeries affected: ${result.total_surgeries_affected}`);
      console.log(`🏥 [SurgicalHistoryExtraction] ✅ Processing time: ${result.processing_time_ms}ms`);
      console.log(`🏥 [SurgicalHistoryExtraction] ✅ Source summary:`, result.source_summary);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`🏥 [SurgicalHistoryExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change, index) => {
          console.log(`🏥 [SurgicalHistoryExtraction]   ${index + 1}. ${change.action}: ${change.procedure_name || 'existing procedure'}`);
          if (change.procedure_date) {
            console.log(`🏥 [SurgicalHistoryExtraction]      Date: ${change.procedure_date}`);
          }
        });
      } else {
        console.log(`🏥 [SurgicalHistoryExtraction] ℹ️ No surgical history changes made - may be no surgical content or all procedures already documented`);
      }

      console.log(`🔥 [SURGICAL HISTORY WORKFLOW] ============= SURGICAL HISTORY EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [SurgicalHistoryExtraction] Error processing surgical history from attachment ${attachment.id}:`, error);
      console.error(`❌ [SurgicalHistoryExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [SURGICAL HISTORY WORKFLOW] ============= SURGICAL HISTORY EXTRACTION FAILED =============`);
    }
  }

  /**
   * Save individual vitals set to database with full source attribution
   */
  private async saveExtractedVitalSet(
    patientId: number,
    encounterId: number | null,
    vitalSet: any,
    attachmentId: number,
    overallConfidence: number,
    documentType?: string,
    setNumber?: number,
    totalSets?: number
  ): Promise<void> {
    const setLabel = setNumber && totalSets ? `${setNumber}/${totalSets}` : 'single';
    console.log(`💾 [AttachmentChartProcessor] Saving vitals set ${setLabel} for patient ${patientId}`);

    try {
      // Determine recorded date - use GPT-extracted date or current date
      let recordedAt = new Date();
      if (vitalSet.extractedDate) {
        try {
          recordedAt = new Date(vitalSet.extractedDate);
          console.log(`📅 [AttachmentChartProcessor] Using GPT-extracted date: ${vitalSet.extractedDate}`);
        } catch (dateError) {
          console.log(`⚠️ [AttachmentChartProcessor] Invalid GPT-extracted date, using current date`);
        }
      }

      // Build source notes with context information
      const docType = documentType || 'medical document';
      let sourceNotes = `Extracted from ${docType} (Confidence: ${overallConfidence}%)`;
      if (vitalSet.timeContext) {
        sourceNotes += ` - Context: ${vitalSet.timeContext}`;
      }
      if (setNumber && totalSets && totalSets > 1) {
        sourceNotes += ` - Set ${setNumber} of ${totalSets}`;
      }
      
      const vitalsEntry = {
        patientId: patientId,
        encounterId: encounterId || undefined,
        recordedAt: recordedAt,
        recordedBy: "System Extract",
        entryType: "routine" as const,
        
        // Vital signs data from individual set
        systolicBp: vitalSet.systolicBp || undefined,
        diastolicBp: vitalSet.diastolicBp || undefined,
        heartRate: vitalSet.heartRate || undefined,
        temperature: vitalSet.temperature ? vitalSet.temperature.toString() : undefined,
        weight: vitalSet.weight ? vitalSet.weight.toString() : undefined,
        height: vitalSet.height ? vitalSet.height.toString() : undefined,
        bmi: vitalSet.bmi ? vitalSet.bmi.toString() : undefined,
        oxygenSaturation: vitalSet.oxygenSaturation ? vitalSet.oxygenSaturation.toString() : undefined,
        respiratoryRate: vitalSet.respiratoryRate || undefined,
        painScale: vitalSet.painScale || undefined,
        
        // Source tracking
        sourceType: "attachment_extracted" as const,
        sourceConfidence: (overallConfidence / 100).toFixed(2),
        sourceNotes: sourceNotes,
        extractedFromAttachmentId: attachmentId,
        enteredBy: 2, // System user - could be made configurable
        
        // Additional metadata
        parsedFromText: true,
        originalText: vitalSet.parsedText || `Vitals set ${setLabel}`,
        alerts: vitalSet.warnings || undefined,
      };

      console.log(`💾 [AttachmentChartProcessor] Inserting vitals set ${setLabel}:`, {
        patientId: vitalsEntry.patientId,
        sourceType: vitalsEntry.sourceType,
        confidence: vitalsEntry.sourceConfidence,
        recordedAt: vitalsEntry.recordedAt,
        timeContext: vitalSet.timeContext,
        hasVitals: !!(vitalsEntry.systolicBp || vitalsEntry.heartRate)
      });

      const [savedEntry] = await db.insert(vitals).values(vitalsEntry).returning();
      
      console.log(`🔥 [DATABASE WORKFLOW] ============= SAVING VITALS SET ${setLabel} =============`);
      console.log(`💾 [VitalsSave] ✅ Vitals set ${setLabel} saved with ID: ${savedEntry.id}`);
      if (vitalSet.extractedDate) {
        console.log(`💾 [VitalsSave] ✅ GPT-Extracted Date: ${vitalSet.extractedDate}`);
      }
      if (vitalSet.timeContext) {
        console.log(`💾 [VitalsSave] ✅ Time Context: ${vitalSet.timeContext}`);
      }
      if (vitalsEntry.systolicBp && vitalsEntry.diastolicBp) {
        console.log(`💾 [VitalsSave] ✅ Blood Pressure: ${vitalsEntry.systolicBp}/${vitalsEntry.diastolicBp}`);
      }
      if (vitalsEntry.heartRate) {
        console.log(`💾 [VitalsSave] ✅ Heart Rate: ${vitalsEntry.heartRate} bpm`);
      }
      if (vitalsEntry.temperature) {
        console.log(`💾 [VitalsSave] ✅ Temperature: ${vitalsEntry.temperature}°F`);
      }
      console.log(`💾 [VitalsSave] ✅ Source Confidence: ${vitalsEntry.sourceConfidence}`);
      console.log(`💾 [VitalsSave] ✅ Attachment ID: ${attachmentId}`);
      console.log(`🔥 [DATABASE WORKFLOW] ============= VITALS SET ${setLabel} SAVED SUCCESSFULLY =============`);

    } catch (error) {
      console.error(`❌ [AttachmentChartProcessor] Error saving vitals:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const attachmentChartProcessor = new AttachmentChartProcessor();