import OpenAI from "openai";
import { db } from "./db.js";
import { VitalsParserService } from "./vitals-parser-service.js";
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
 * Starting with vitals extraction from H&P documents as proof of concept
 */
export class AttachmentChartProcessor {
  private vitalsParser: VitalsParserService;
  private openai: OpenAI;

  constructor() {
    this.vitalsParser = new VitalsParserService();
    // Initialize OpenAI for enhanced H&P processing
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process completed attachment for chart data extraction
   */
  async processCompletedAttachment(attachmentId: number): Promise<void> {
    console.log(`🔥 [VITALS WORKFLOW] ============= STARTING VITALS EXTRACTION =============`);
    console.log(`📋 [AttachmentChartProcessor] Processing completed attachment ${attachmentId}`);

    try {
      // Get attachment and extracted content
      console.log(`📋 [AttachmentChartProcessor] 🔍 Fetching attachment data from database`);
      const [attachment] = await db.select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId));

      if (!attachment) {
        console.error(`📋 [AttachmentChartProcessor] ❌ Attachment ${attachmentId} not found`);
        return;
      }
      console.log(`📋 [AttachmentChartProcessor] ✅ Found attachment: ${attachment.originalFileName} (Patient: ${attachment.patientId})`);

      console.log(`📋 [AttachmentChartProcessor] 🔍 Fetching extracted content from database`);
      const [extractedContent] = await db.select()
        .from(attachmentExtractedContent)
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      if (!extractedContent || extractedContent.processingStatus !== 'completed') {
        console.log(`📋 [AttachmentChartProcessor] ❌ Attachment ${attachmentId} not ready for processing`);
        return;
      }
      console.log(`📋 [AttachmentChartProcessor] ✅ Extracted content ready: ${extractedContent.extractedText?.length || 0} characters`);

      console.log(`📋 [AttachmentChartProcessor] 🔄 Processing ${extractedContent.documentType} document for chart data`);

      // Process ALL documents for vitals extraction (not just H&P)
      console.log(`📋 [AttachmentChartProcessor] 🩺 Starting universal vitals extraction from document type: ${extractedContent.documentType || 'unknown'}`);
      
      // Try to extract vitals from any medical document
      await this.processDocumentForVitals(attachment, extractedContent);
      
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
      console.error(`📋 [AttachmentChartProcessor] Error processing attachment ${attachmentId}:`, error);
    }
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

      // Use enhanced vitals parser for any medical document
      const vitalsResult = await this.parseVitalsFromMedicalText(
        extractedContent.extractedText, 
        patientContext,
        extractedContent.documentType || 'unknown'
      );

      if (vitalsResult.success && vitalsResult.data) {
        console.log(`🩺 [AttachmentChartProcessor] Successfully parsed vitals with ${vitalsResult.confidence}% confidence`);

        // Save vitals to database with source tracking
        await this.saveExtractedVitals(
          attachment.patientId,
          attachment.encounterId,
          vitalsResult,
          attachment.id,
          vitalsResult.extractedDate,
          extractedContent.documentType
        );

        console.log(`✅ [AttachmentChartProcessor] Vitals saved to database for patient ${attachment.patientId}`);
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
   * Enhanced vitals parsing for any medical document
   * Extracts date context and handles full document text
   */
  private async parseVitalsFromMedicalText(
    fullText: string, 
    patientContext?: { age?: number; gender?: string },
    documentType?: string
  ): Promise<any> {
    console.log(`🩺 [AttachmentChartProcessor] Parsing vitals from ${documentType || 'medical'} document (${fullText.length} characters)`);

    // Enhanced prompt for any medical document processing
    const prompt = `You are a medical AI assistant that extracts vital signs from medical documents of any type.

Analyze this medical document text and extract vital signs along with their date context. Return ONLY a valid JSON object:

{
  "systolicBp": number or null,
  "diastolicBp": number or null,
  "heartRate": number or null,
  "temperature": "string with decimal" or null,
  "weight": "string with decimal" or null,
  "height": "string with decimal" or null,
  "bmi": "string with decimal" or null,
  "oxygenSaturation": "string with decimal" or null,
  "respiratoryRate": number or null,
  "painScale": number (0-10) or null,
  "extractedDate": "YYYY-MM-DD format or null if no clear date found",
  "dateConfidence": "high/medium/low based on how certain you are about the date",
  "vitalsSection": "extracted portion of text containing the vitals",
  "warnings": ["array of critical value warnings"]
}

CRITICAL RULES FOR MEDICAL DOCUMENTS:
- Look for vitals in ANY section: "Physical Exam", "Vital Signs", "Objective", "Assessment", "Nursing Notes", "Progress Notes", etc.
- Convert units: °C to °F, kg to lbs, cm to inches
- Extract visit date from document headers, encounter dates, or clinical context
- If multiple dates present, use the date most likely associated with the vital signs
- Blood pressure format: "143/82" means systolic=143, diastolic=82
- Weight, height, BMI, O2 sat, temperature as strings with decimals
- Heart rate, respiratory rate, pain scale as numbers
- Return null for any values not found
- Flag critical values in warnings array
- Use dateConfidence to indicate how certain you are about the extracted date
- EXTRACT VITALS FROM ANY TYPE OF MEDICAL DOCUMENT (H&P, Progress Notes, Nursing Notes, Discharge Summaries, etc.)

Patient context: ${patientContext ? `Age ${patientContext.age}, Gender ${patientContext.gender}` : 'Unknown'}
Document type: ${documentType || 'Unknown'}

Medical Document Text:
${fullText}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          errors: ["No response from OpenAI"],
          confidence: 0,
          originalText: fullText,
        };
      }

      console.log(`🩺 [AttachmentChartProcessor] Raw medical document vitals response:`, content);

      let parsedData;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        console.error(`❌ [AttachmentChartProcessor] JSON parse error:`, parseError);
        return {
          success: false,
          errors: [`Invalid JSON response: ${parseError}`],
          confidence: 0,
          originalText: fullText,
        };
      }

      // Calculate confidence based on extracted fields and date certainty
      const vitalFields = [
        parsedData.systolicBp,
        parsedData.diastolicBp,
        parsedData.heartRate,
        parsedData.temperature,
        parsedData.respiratoryRate,
        parsedData.oxygenSaturation,
      ];
      const extractedCount = vitalFields.filter(
        (field) => field !== null && field !== undefined,
      ).length;
      
      let baseConfidence = Math.round((extractedCount / vitalFields.length) * 100);
      
      // Adjust confidence for attachment source (lower than manual entry)
      let adjustedConfidence = Math.max(baseConfidence * 0.85, 50); // Minimum 50% for successful extraction
      
      // Further adjust based on date confidence
      if (parsedData.dateConfidence === 'low') {
        adjustedConfidence *= 0.9;
      } else if (parsedData.dateConfidence === 'medium') {
        adjustedConfidence *= 0.95;
      }

      adjustedConfidence = Math.round(adjustedConfidence);

      return {
        success: extractedCount > 0,
        data: parsedData,
        confidence: adjustedConfidence,
        originalText: fullText,
        extractedDate: parsedData.extractedDate
      };

    } catch (error) {
      console.error(`❌ [AttachmentChartProcessor] Medical document vitals parsing error:`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        confidence: 0,
        originalText: fullText,
      };
    }
  }

  /**
   * Save extracted vitals to database with proper source tracking
   */
  private async saveExtractedVitals(
    patientId: number,
    encounterId: number | null,
    vitalsResult: any,
    attachmentId: number,
    extractedDate?: string,
    documentType?: string
  ): Promise<void> {
    console.log(`💾 [AttachmentChartProcessor] Saving extracted vitals for patient ${patientId}`);

    try {
      // Determine recorded date - use extracted date or current date
      let recordedAt = new Date();
      if (extractedDate && vitalsResult.data.dateConfidence !== 'low') {
        try {
          recordedAt = new Date(extractedDate);
          console.log(`📅 [AttachmentChartProcessor] Using extracted date: ${extractedDate}`);
        } catch (dateError) {
          console.log(`⚠️ [AttachmentChartProcessor] Invalid extracted date, using current date`);
        }
      }

      // Build source notes
      const docType = documentType || 'medical document';
      const sourceNotes = `Extracted from ${docType} (Confidence: ${vitalsResult.confidence}%)`;
      
      const vitalsEntry = {
        patientId: patientId,
        encounterId: encounterId || undefined,
        recordedAt: recordedAt,
        recordedBy: "System Extract",
        entryType: "routine" as const,
        
        // Vital signs data
        systolicBp: vitalsResult.data.systolicBp || undefined,
        diastolicBp: vitalsResult.data.diastolicBp || undefined,
        heartRate: vitalsResult.data.heartRate || undefined,
        temperature: vitalsResult.data.temperature ? vitalsResult.data.temperature.toString() : undefined,
        weight: vitalsResult.data.weight ? vitalsResult.data.weight.toString() : undefined,
        height: vitalsResult.data.height ? vitalsResult.data.height.toString() : undefined,
        bmi: vitalsResult.data.bmi ? vitalsResult.data.bmi.toString() : undefined,
        oxygenSaturation: vitalsResult.data.oxygenSaturation ? vitalsResult.data.oxygenSaturation.toString() : undefined,
        respiratoryRate: vitalsResult.data.respiratoryRate || undefined,
        painScale: vitalsResult.data.painScale || undefined,
        
        // Source tracking
        sourceType: "attachment_extracted" as const,
        sourceConfidence: (vitalsResult.confidence / 100).toFixed(2),
        sourceNotes: sourceNotes,
        extractedFromAttachmentId: attachmentId,
        enteredBy: 2, // System user - could be made configurable
        
        // Additional metadata
        parsedFromText: true,
        originalText: vitalsResult.data.vitalsSection || vitalsResult.originalText?.substring(0, 500),
        alerts: vitalsResult.data.warnings || undefined,
      };

      console.log(`💾 [AttachmentChartProcessor] Inserting vitals entry:`, {
        patientId: vitalsEntry.patientId,
        sourceType: vitalsEntry.sourceType,
        confidence: vitalsEntry.sourceConfidence,
        hasVitals: !!(vitalsEntry.systolicBp || vitalsEntry.heartRate)
      });

      const [savedEntry] = await db.insert(vitals).values(vitalsEntry).returning();
      
      console.log(`🔥 [DATABASE WORKFLOW] ============= SAVING VITALS TO DATABASE =============`);
      console.log(`💾 [VitalsSave] ✅ Vitals entry saved with ID: ${savedEntry.id}`);
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
      console.log(`🔥 [DATABASE WORKFLOW] ============= VITALS SAVED SUCCESSFULLY =============`);

    } catch (error) {
      console.error(`❌ [AttachmentChartProcessor] Error saving vitals:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const attachmentChartProcessor = new AttachmentChartProcessor();