import { db } from "./db.js";
import { VitalsParserService } from "./vitals-parser-service.js";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { UnifiedSurgicalHistoryParser } from "./unified-surgical-history-parser.js";
import { unifiedFamilyHistoryParser } from "./unified-family-history-parser.js";
import { unifiedSocialHistoryParser } from "./unified-social-history-parser.js";
import { UnifiedAllergyParser } from "./unified-allergy-parser.js";
import { MedicationDeltaService } from "./medication-delta-service.js";
import { UnifiedImagingParser } from "./unified-imaging-parser.js";
import { UnifiedLabParser } from "./unified-lab-parser.js";
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
  private allergyParser: UnifiedAllergyParser;
  private medicationDeltaService: MedicationDeltaService;
  private imagingParser: UnifiedImagingParser;

  constructor() {
    console.log(`🔥 [IMAGING WORKFLOW DEBUG] AttachmentChartProcessor constructor - initializing all parsers including imaging`);
    this.vitalsParser = new VitalsParserService();
    this.surgicalHistoryParser = new UnifiedSurgicalHistoryParser();
    this.allergyParser = new UnifiedAllergyParser();
    this.medicationDeltaService = new MedicationDeltaService();
    this.imagingParser = new UnifiedImagingParser();
    console.log(`🔥 [IMAGING WORKFLOW DEBUG] All 8 chart processors initialized successfully: vitals, medical problems, surgical history, family history, social history, allergies, medications, imaging`);
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
      
      // Process vitals, medical problems, surgical history, family history, social history, allergies, medications, and imaging in parallel for efficiency
      console.log(`📋 [AttachmentChartProcessor] 🔄 Starting parallel processing: vitals + medical problems + surgical history + family history + social history + allergies + medications + imaging`);
      const parallelStartTime = Date.now();
      
      // Process all eight chart sections in parallel for efficiency
      try {
        const [vitalsResult, medicalProblemsResult, surgicalHistoryResult, familyHistoryResult, socialHistoryResult, allergiesResult, medicationsResult, imagingResult] = await Promise.allSettled([
          this.processDocumentForVitals(attachment, extractedContent),
          this.processDocumentForMedicalProblems(attachment, extractedContent),
          this.processDocumentForSurgicalHistory(attachment, extractedContent),
          this.processDocumentForFamilyHistory(attachment, extractedContent),
          this.processDocumentForSocialHistory(attachment, extractedContent),
          this.processDocumentForAllergies(attachment, extractedContent),
          this.processDocumentForMedications(attachment, extractedContent),
          this.processDocumentForImaging(attachment, extractedContent)
        ]);
        
        // Check results and log any failures
        if (vitalsResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] VITALS PROCESSING FAILED:`, vitalsResult.reason);
          if (vitalsResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN VITALS - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Vitals error details:`, JSON.stringify(vitalsResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Vitals processing completed successfully`);
        }
        
        if (medicalProblemsResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] MEDICAL PROBLEMS PROCESSING FAILED:`, medicalProblemsResult.reason);
          if (medicalProblemsResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN MEDICAL PROBLEMS - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Medical problems error details:`, JSON.stringify(medicalProblemsResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Medical problems processing completed successfully`);
        }
        
        if (surgicalHistoryResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] SURGICAL HISTORY PROCESSING FAILED:`, surgicalHistoryResult.reason);
          if (surgicalHistoryResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN SURGICAL HISTORY - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Surgical history error details:`, JSON.stringify(surgicalHistoryResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Surgical history processing completed successfully`);
        }
        
        if (familyHistoryResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] FAMILY HISTORY PROCESSING FAILED:`, familyHistoryResult.reason);
          if (familyHistoryResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN FAMILY HISTORY - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Family history error details:`, JSON.stringify(familyHistoryResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Family history processing completed successfully`);
        }
        
        if (socialHistoryResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] SOCIAL HISTORY PROCESSING FAILED:`, socialHistoryResult.reason);
          if (socialHistoryResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN SOCIAL HISTORY - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Social history error details:`, JSON.stringify(socialHistoryResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Social history processing completed successfully`);
        }

        if (allergiesResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] ALLERGIES PROCESSING FAILED:`, allergiesResult.reason);
          if (allergiesResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN ALLERGIES - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Allergies error details:`, JSON.stringify(allergiesResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Allergies processing completed successfully`);
        }

        if (medicationsResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] MEDICATIONS PROCESSING FAILED:`, medicationsResult.reason);
          if (medicationsResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN MEDICATIONS - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Medications error details:`, JSON.stringify(medicationsResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Medications processing completed successfully`);
        }

        if (imagingResult.status === 'rejected') {
          console.error(`❌ [AttachmentChartProcessor] IMAGING PROCESSING FAILED:`, imagingResult.reason);
          if (imagingResult.reason?.code === '22003') {
            console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR IN IMAGING - Field with precision 3, scale 2 exceeded limit`);
            console.error(`🔢 [AttachmentChartProcessor] Imaging error details:`, JSON.stringify(imagingResult.reason, null, 2));
          }
        } else {
          console.log(`✅ [AttachmentChartProcessor] Imaging processing completed successfully`);
          console.log(`🏥 [IMAGING WORKFLOW DEBUG] IMAGING RESULT VALUE:`, imagingResult.value);
          console.log(`🏥 [IMAGING WORKFLOW DEBUG] IMAGING EXTRACTION COUNT:`, imagingResult.value?.imagingCount || 0);
          console.log(`🏥 [IMAGING WORKFLOW DEBUG] IMAGING RESULTS CREATED:`, imagingResult.value?.results?.length || 0);
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
   * Process document for family history extraction
   */
  private async processDocumentForFamilyHistory(attachment: any, extractedContent: any): Promise<void> {
    console.log(`🔥 [FAMILY HISTORY WORKFLOW] ============= STARTING FAMILY HISTORY EXTRACTION =============`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 🚀 Processing attachment ${attachment.id} for patient ${attachment.patientId}`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 📄 Document type: ${extractedContent.documentType || 'unknown type'}`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 📄 Document text length: ${extractedContent.extractedText?.length || 0} characters`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 📄 Original filename: ${attachment.originalFileName}`);
    console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 📄 Text preview: "${extractedContent.extractedText?.substring(0, 300)}..."`);

    // Validation checks with detailed error messages
    if (!extractedContent.extractedText) {
      const errorMsg = `No extracted text available for family history parsing - attachment ${attachment.id}`;
      console.error(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [FAMILY HISTORY WORKFLOW] ============= FAMILY HISTORY EXTRACTION FAILED - NO TEXT =============`);
      throw new Error(errorMsg);
    }

    if (extractedContent.extractedText.length < 50) {
      const errorMsg = `Document text too short (${extractedContent.extractedText.length} chars) for meaningful family history extraction - attachment ${attachment.id}`;
      console.error(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ❌ CRITICAL: ${errorMsg}`);
      console.log(`🔥 [FAMILY HISTORY WORKFLOW] ============= FAMILY HISTORY EXTRACTION FAILED - TEXT TOO SHORT =============`);
      throw new Error(errorMsg);
    }

    try {
      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 🔍 Starting unified family history extraction for patient ${attachment.patientId}`);
      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified family history parser for attachment processing
      const result = await unifiedFamilyHistoryParser.processUnified(
        attachment.patientId,
        null, // No specific encounter ID for attachment
        null, // No SOAP note text
        extractedContent.extractedText, // Attachment content
        "attachment_processing", // Trigger type
        attachment.id // Attachment ID for source tracking
      );

      const processingTime = Date.now() - startTime;

      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ✅ Successfully processed family history in ${processingTime}ms`);
      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ✅ Family history entries affected: ${result.familyHistoryAffected}`);
      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ✅ Encounter family history: ${result.encounterFamilyHistory}`);
      console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ✅ Attachment family history: ${result.attachmentFamilyHistory}`);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change, index) => {
          console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction]   ${index + 1}. ${change.action}: ${change.familyMember} - ${change.medicalHistory}`);
          console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction]      Confidence: ${change.confidence}`);
          if (change.consolidationReason) {
            console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction]      Consolidation: ${change.consolidationReason}`);
          }
        });
      } else {
        console.log(`👨‍👩‍👧‍👦 [FamilyHistoryExtraction] ℹ️ No family history changes made - may be no family history content or all information already documented`);
      }

      console.log(`🔥 [FAMILY HISTORY WORKFLOW] ============= FAMILY HISTORY EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [FamilyHistoryExtraction] Error processing family history from attachment ${attachment.id}:`, error);
      console.error(`❌ [FamilyHistoryExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [FAMILY HISTORY WORKFLOW] ============= FAMILY HISTORY EXTRACTION FAILED =============`);
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
        sourceConfidence: Math.min(0.99, overallConfidence / 100).toFixed(2), // Cap at 0.99 for precision 3,2
        sourceNotes: sourceNotes,
        extractedFromAttachmentId: attachmentId,
        enteredBy: 1, // Using existing user ID (jonseale) - TODO: make configurable
        
        // Additional metadata
        parsedFromText: true,
        originalText: vitalSet.parsedText || `Vitals set ${setLabel}`,
        alerts: vitalSet.warnings || undefined,
      };

      // DETAILED VALUE LOGGING FOR DEBUGGING NUMERIC PRECISION ERRORS
      console.log(`💾 [AttachmentChartProcessor] ===== DETAILED VALUES DEBUG =====`);
      console.log(`💾 [AttachmentChartProcessor] overallConfidence (raw): ${overallConfidence}`);
      console.log(`💾 [AttachmentChartProcessor] sourceConfidence (calculated): ${vitalsEntry.sourceConfidence}`);
      console.log(`💾 [AttachmentChartProcessor] sourceConfidence type: ${typeof vitalsEntry.sourceConfidence}`);
      console.log(`💾 [AttachmentChartProcessor] All numeric fields:`);
      console.log(`💾 [AttachmentChartProcessor]   - systolicBp: ${vitalsEntry.systolicBp} (${typeof vitalsEntry.systolicBp})`);
      console.log(`💾 [AttachmentChartProcessor]   - diastolicBp: ${vitalsEntry.diastolicBp} (${typeof vitalsEntry.diastolicBp})`);
      console.log(`💾 [AttachmentChartProcessor]   - heartRate: ${vitalsEntry.heartRate} (${typeof vitalsEntry.heartRate})`);
      console.log(`💾 [AttachmentChartProcessor]   - temperature: ${vitalsEntry.temperature} (${typeof vitalsEntry.temperature})`);
      console.log(`💾 [AttachmentChartProcessor]   - weight: ${vitalsEntry.weight} (${typeof vitalsEntry.weight})`);
      console.log(`💾 [AttachmentChartProcessor]   - height: ${vitalsEntry.height} (${typeof vitalsEntry.height})`);
      console.log(`💾 [AttachmentChartProcessor]   - bmi: ${vitalsEntry.bmi} (${typeof vitalsEntry.bmi})`);
      console.log(`💾 [AttachmentChartProcessor]   - oxygenSaturation: ${vitalsEntry.oxygenSaturation} (${typeof vitalsEntry.oxygenSaturation})`);
      console.log(`💾 [AttachmentChartProcessor]   - respiratoryRate: ${vitalsEntry.respiratoryRate} (${typeof vitalsEntry.respiratoryRate})`);
      console.log(`💾 [AttachmentChartProcessor]   - painScale: ${vitalsEntry.painScale} (${typeof vitalsEntry.painScale})`);
      console.log(`💾 [AttachmentChartProcessor] ===== END VALUES DEBUG =====`);

      console.log(`💾 [AttachmentChartProcessor] Inserting vitals set ${setLabel}:`, {
        patientId: vitalsEntry.patientId,
        sourceType: vitalsEntry.sourceType,
        confidence: vitalsEntry.sourceConfidence,
        recordedAt: vitalsEntry.recordedAt,
        timeContext: vitalSet.timeContext,
        hasVitals: !!(vitalsEntry.systolicBp || vitalsEntry.heartRate)
      });

      // Validate patient ID exists before insertion
      console.log(`💾 [AttachmentChartProcessor] 🔍 VALIDATING patient ID ${vitalsEntry.patientId} exists in database`);
      try {
        const { patients } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const patientCheck = await db.select().from(patients).where(
          eq(patients.id, vitalsEntry.patientId)
        ).limit(1);
        
        if (patientCheck.length === 0) {
          console.error(`❌ [AttachmentChartProcessor] PATIENT NOT FOUND: Patient ID ${vitalsEntry.patientId} does not exist in patients table`);
          throw new Error(`Patient ID ${vitalsEntry.patientId} not found in database`);
        }
        
        console.log(`✅ [AttachmentChartProcessor] Patient ID ${vitalsEntry.patientId} validated successfully`);
      } catch (validationError: any) {
        console.error(`❌ [AttachmentChartProcessor] PATIENT VALIDATION ERROR:`, validationError);
        throw validationError;
      }

      // Validate encounter ID exists if provided
      if (vitalsEntry.encounterId) {
        console.log(`💾 [AttachmentChartProcessor] 🔍 VALIDATING encounter ID ${vitalsEntry.encounterId} exists in database`);
        try {
          const { encounters } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          const encounterCheck = await db.select().from(encounters).where(
            eq(encounters.id, vitalsEntry.encounterId)
          ).limit(1);
          
          if (encounterCheck.length === 0) {
            console.error(`❌ [AttachmentChartProcessor] ENCOUNTER NOT FOUND: Encounter ID ${vitalsEntry.encounterId} does not exist in encounters table`);
            throw new Error(`Encounter ID ${vitalsEntry.encounterId} not found in database`);
          }
          
          console.log(`✅ [AttachmentChartProcessor] Encounter ID ${vitalsEntry.encounterId} validated successfully`);
        } catch (encounterValidationError: any) {
          console.error(`❌ [AttachmentChartProcessor] ENCOUNTER VALIDATION ERROR:`, encounterValidationError);
          throw encounterValidationError;
        }
      } else {
        console.log(`💾 [AttachmentChartProcessor] ℹ️ No encounter ID provided - skipping encounter validation`);
      }

      try {
        console.log(`💾 [AttachmentChartProcessor] 🔄 ATTEMPTING DATABASE INSERT for vitals set ${setLabel}`);
        console.log(`💾 [AttachmentChartProcessor] 🔄 Full vitalsEntry object being inserted:`, JSON.stringify(vitalsEntry, null, 2));
        
        const [savedEntry] = await db.insert(vitals).values([vitalsEntry]).returning();
        console.log(`💾 [AttachmentChartProcessor] ✅ Database insert successful for vitals set ${setLabel}`);
        
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
      } catch (dbError: any) {
        console.error(`❌ [AttachmentChartProcessor] DATABASE ERROR for vitals set ${setLabel}:`, dbError);
        console.error(`❌ [AttachmentChartProcessor] Error code: ${dbError.code}`);
        console.error(`❌ [AttachmentChartProcessor] Error message: ${dbError.message}`);
        console.error(`❌ [AttachmentChartProcessor] Error detail: ${dbError.detail || 'No detail available'}`);
        console.error(`❌ [AttachmentChartProcessor] Error constraint: ${dbError.constraint || 'No constraint available'}`);
        console.error(`❌ [AttachmentChartProcessor] Error table: ${dbError.table || 'No table available'}`);
        console.error(`❌ [AttachmentChartProcessor] Error column: ${dbError.column || 'No column available'}`);
        console.error(`❌ [AttachmentChartProcessor] Error schema: ${dbError.schema || 'No schema available'}`);
        console.error(`❌ [AttachmentChartProcessor] Full error object:`, JSON.stringify(dbError, null, 2));
        console.error(`❌ [AttachmentChartProcessor] Values being inserted:`, JSON.stringify(vitalsEntry, null, 2));
        
        if (dbError.code === '22003') {
          console.error(`🔢 [AttachmentChartProcessor] NUMERIC PRECISION ERROR - Field with precision 3, scale 2 received invalid value`);
        } else if (dbError.code === '23503') {
          console.error(`🔗 [AttachmentChartProcessor] FOREIGN KEY CONSTRAINT VIOLATION`);
        } else if (dbError.code === '23505') {
          console.error(`🔑 [AttachmentChartProcessor] UNIQUE CONSTRAINT VIOLATION`);
        } else if (dbError.code === '23502') {
          console.error(`❗ [AttachmentChartProcessor] NOT NULL CONSTRAINT VIOLATION`);
        }
        
        throw dbError;
      }

    } catch (error) {
      console.error(`❌ [AttachmentChartProcessor] Error saving vitals:`, error);
      throw error;
    }
  }

  /**
   * Process document for social history extraction and consolidation
   */
  private async processDocumentForSocialHistory(
    attachment: any,
    extractedContent: any
  ): Promise<void> {
    console.log(`🔥 [SOCIAL HISTORY WORKFLOW] ============= SOCIAL HISTORY EXTRACTION =============`);
    console.log(`🚭 [SocialHistoryExtraction] Starting social history analysis for attachment ${attachment.id}`);
    console.log(`🚭 [SocialHistoryExtraction] Processing content for patient ${attachment.patientId}`);

    if (!extractedContent.extractedText || extractedContent.extractedText.length < 50) {
      console.log(`🚭 [SocialHistoryExtraction] ℹ️ Insufficient text content for social history analysis, skipping`);
      return;
    }

    try {
      console.log(`🚭 [SocialHistoryExtraction] 🔍 Starting unified social history extraction for patient ${attachment.patientId}`);
      console.log(`🚭 [SocialHistoryExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified social history parser for attachment processing
      console.log(`🚭 [SocialHistoryExtraction] 🔧 Using provider ID: 1 (was hardcoded to 2, now fixed)`);
      const result = await unifiedSocialHistoryParser.processUnified(
        attachment.patientId,
        null, // No specific encounter ID for attachment
        null, // No SOAP note text
        extractedContent.extractedText, // Attachment content
        attachment.id, // Attachment ID for source tracking
        1, // Provider ID (Jonathan Seale) - FIXED: was 2, now 1
        "attachment_processing" // Trigger type
      );

      const processingTime = Date.now() - startTime;

      console.log(`🚭 [SocialHistoryExtraction] ✅ Successfully processed social history in ${processingTime}ms`);
      console.log(`🚭 [SocialHistoryExtraction] ✅ Social history entries affected: ${result.socialHistoryAffected}`);
      console.log(`🚭 [SocialHistoryExtraction] ✅ Encounter social history: ${result.encounterSocialHistory}`);
      console.log(`🚭 [SocialHistoryExtraction] ✅ Attachment social history: ${result.attachmentSocialHistory}`);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`🚭 [SocialHistoryExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change, index) => {
          console.log(`🚭 [SocialHistoryExtraction]   ${index + 1}. ${change.action}: ${change.category} - ${change.currentStatus}`);
          console.log(`🚭 [SocialHistoryExtraction]      Confidence: ${change.confidence}`);
          if (change.consolidationReason) {
            console.log(`🚭 [SocialHistoryExtraction]      Consolidation: ${change.consolidationReason}`);
          }
        });
      } else {
        console.log(`🚭 [SocialHistoryExtraction] ℹ️ No social history changes made - may be no social history content or all information already documented`);
      }

      console.log(`🔥 [SOCIAL HISTORY WORKFLOW] ============= SOCIAL HISTORY EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [SocialHistoryExtraction] Error processing social history from attachment ${attachment.id}:`, error);
      console.error(`❌ [SocialHistoryExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [SOCIAL HISTORY WORKFLOW] ============= SOCIAL HISTORY EXTRACTION FAILED =============`);
    }
  }

  /**
   * Process document for allergy extraction and consolidation
   */
  private async processDocumentForAllergies(
    attachment: any,
    extractedContent: any
  ): Promise<void> {
    console.log(`🔥 [ALLERGY WORKFLOW] ============= ALLERGY EXTRACTION =============`);
    console.log(`🚨 [AllergyExtraction] Starting allergy analysis for attachment ${attachment.id}`);
    console.log(`🚨 [AllergyExtraction] Processing content for patient ${attachment.patientId}`);
    console.log(`🚨 [AllergyExtraction] ✅ REACHED processDocumentForAllergies method successfully`);
    console.log(`🚨 [AllergyExtraction] Attachment object keys: ${Object.keys(attachment)}`);
    console.log(`🚨 [AllergyExtraction] ExtractedContent object keys: ${Object.keys(extractedContent)}`);
    console.log(`🚨 [AllergyExtraction] UnifiedAllergyParser instantiated: ${!!this.allergyParser}`);

    if (!extractedContent.extractedText || extractedContent.extractedText.length < 50) {
      console.log(`🚨 [AllergyExtraction] ℹ️ Insufficient text content for allergy analysis, skipping`);
      return;
    }

    try {
      console.log(`🚨 [AllergyExtraction] 🔍 Starting unified allergy extraction for patient ${attachment.patientId}`);
      console.log(`🚨 [AllergyExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified allergy parser for attachment processing
      console.log(`🚨 [AllergyExtraction] 🔧 Using provider ID: 1 (hardcoded to match user)`);
      const result = await this.allergyParser.processUnifiedAllergies(
        attachment.patientId,
        {
          attachmentContent: extractedContent.extractedText, // Attachment content
          attachmentId: attachment.id, // Attachment ID for source tracking
          triggerType: "attachment_processing" // Trigger type
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(`🚨 [AllergyExtraction] ✅ Successfully processed allergies in ${processingTime}ms`);
      console.log(`🚨 [AllergyExtraction] ✅ Allergy entries affected: ${result.allergiesAffected}`);
      console.log(`🚨 [AllergyExtraction] ✅ Encounter allergies: ${result.encounterAllergies}`);
      console.log(`🚨 [AllergyExtraction] ✅ Attachment allergies: ${result.attachmentAllergies}`);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`🚨 [AllergyExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change: any, index: number) => {
          console.log(`🚨 [AllergyExtraction]   ${index + 1}. ${change.action}: ${change.allergen} - ${change.reaction || 'unknown reaction'}`);
          console.log(`🚨 [AllergyExtraction]      Severity: ${change.severity || 'unknown'}`);
          console.log(`🚨 [AllergyExtraction]      Confidence: ${change.confidence}`);
          if (change.consolidationReason) {
            console.log(`🚨 [AllergyExtraction]      Consolidation: ${change.consolidationReason}`);
          }
        });
      } else {
        console.log(`🚨 [AllergyExtraction] ℹ️ No allergy changes made - may be no allergy content or all information already documented`);
      }

      console.log(`🔥 [ALLERGY WORKFLOW] ============= ALLERGY EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [AllergyExtraction] Error processing allergies from attachment ${attachment.id}:`, error);
      console.error(`❌ [AllergyExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [ALLERGY WORKFLOW] ============= ALLERGY EXTRACTION FAILED =============`);
    }
  }

  /**
   * Process document for medication extraction and consolidation
   */
  private async processDocumentForMedications(
    attachment: any,
    extractedContent: any
  ): Promise<void> {
    try {
      console.log(`💊 [MedicationExtraction] 🔥 ============= ATTACHMENT MEDICATION EXTRACTION START =============`);
      console.log(`💊 [MedicationExtraction] 🔍 Starting medication extraction for patient ${attachment.patientId}`);
      console.log(`💊 [MedicationExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the medication delta service for attachment processing
      console.log(`💊 [MedicationExtraction] 🔧 Using provider ID: 1 (hardcoded to match user)`);
      const result = await this.medicationDeltaService.processAttachmentMedications(
        attachment.id,
        attachment.patientId,
        attachment.encounterId,
        extractedContent.extractedText,
        1 // Provider ID hardcoded to match existing user
      );

      const processingTime = Date.now() - startTime;

      console.log(`💊 [MedicationExtraction] ✅ Successfully processed medications in ${processingTime}ms`);
      console.log(`💊 [MedicationExtraction] ✅ Medications processed: ${result.medicationsProcessed}`);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`💊 [MedicationExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change: any, index: number) => {
          console.log(`💊 [MedicationExtraction]   ${index + 1}. ${change.action}: ${change.medicationName}`);
          if (change.sourceType) {
            console.log(`💊 [MedicationExtraction]      Source: ${change.sourceType}`);
          }
          if (change.attachmentId) {
            console.log(`💊 [MedicationExtraction]      Attachment ID: ${change.attachmentId}`);
          }
          if (change.visitEntry) {
            console.log(`💊 [MedicationExtraction]      Visit Entry: ${change.visitEntry.notes}`);
          }
        });
      } else {
        console.log(`💊 [MedicationExtraction] ℹ️ No medication changes made - may be no medication content or all information already documented`);
      }

      console.log(`🔥 [MEDICATION WORKFLOW] ============= MEDICATION EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [MedicationExtraction] Error processing medications from attachment ${attachment.id}:`, error);
      console.error(`❌ [MedicationExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [MEDICATION WORKFLOW] ============= MEDICATION EXTRACTION FAILED =============`);
    }
  }

  /**
   * Process document for imaging extraction and consolidation
   */
  private async processDocumentForImaging(
    attachment: any,
    extractedContent: any
  ): Promise<void> {
    console.log(`🔥 [IMAGING WORKFLOW] ============= IMAGING EXTRACTION =============`);
    console.log(`📸 [ImagingExtraction] Starting imaging analysis for attachment ${attachment.id}`);
    console.log(`📸 [ImagingExtraction] Processing content for patient ${attachment.patientId}`);

    if (!extractedContent.extractedText || extractedContent.extractedText.length < 50) {
      console.log(`📸 [ImagingExtraction] ℹ️ Insufficient text content for imaging analysis, skipping`);
      return;
    }

    try {
      console.log(`📸 [ImagingExtraction] 🔍 Starting unified imaging extraction for patient ${attachment.patientId}`);
      console.log(`📸 [ImagingExtraction] 🔍 Text preview (first 200 chars): "${extractedContent.extractedText.substring(0, 200)}..."`);

      const startTime = Date.now();

      // Use the unified imaging parser for attachment processing
      console.log(`📸 [ImagingExtraction] 🔧 Using provider ID: 1 (Jonathan Seale)`);
      console.log(`📸 [ImagingExtraction] 🔧 Document type: ${extractedContent.documentType || 'unknown'}`);
      console.log(`📸 [ImagingExtraction] 🔧 Calling processAttachmentImagingData with attachmentId=${attachment.id}, text length=${extractedContent.extractedText.length}, docType=${extractedContent.documentType}`);
      const result = await this.imagingParser.processAttachmentImagingData(
        attachment.id, // Attachment ID for source tracking
        extractedContent.extractedText, // Attachment content
        extractedContent.documentType || 'unknown' // Document type
      );

      const processingTime = Date.now() - startTime;

      console.log(`📸 [ImagingExtraction] ✅ Successfully processed imaging in ${processingTime}ms`);
      console.log(`📸 [ImagingExtraction] ✅ Total imaging results affected: ${result.total_imaging_affected}`);
      console.log(`📸 [ImagingExtraction] ✅ Extraction confidence: ${result.extraction_confidence}`);
      console.log(`📸 [ImagingExtraction] ✅ Processing notes: ${result.processing_notes}`);

      // Log individual changes for debugging
      if (result.changes && result.changes.length > 0) {
        console.log(`📸 [ImagingExtraction] ✅ Changes made (${result.changes.length} total):`);
        result.changes.forEach((change, index) => {
          console.log(`📸 [ImagingExtraction]   ${index + 1}. ${change.action}: ${change.modality} ${change.body_part}`);
          console.log(`📸 [ImagingExtraction]      Confidence: ${change.confidence}`);
          if (change.clinical_summary) {
            console.log(`📸 [ImagingExtraction]      Summary: ${change.clinical_summary}`);
          }
        });
      } else {
        console.log(`📸 [ImagingExtraction] ℹ️ No imaging changes made - may be no imaging content or all information already documented`);
      }

      console.log(`🔥 [IMAGING WORKFLOW] ============= IMAGING EXTRACTION COMPLETE =============`);

    } catch (error) {
      console.error(`❌ [ImagingExtraction] Error processing imaging from attachment ${attachment.id}:`, error);
      console.error(`❌ [ImagingExtraction] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔥 [IMAGING WORKFLOW] ============= IMAGING EXTRACTION FAILED =============`);
    }
  }
}

// Export singleton instance
export const attachmentChartProcessor = new AttachmentChartProcessor();