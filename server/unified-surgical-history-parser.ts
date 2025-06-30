import { OpenAI } from "openai";
import { db } from "./db.js";
import { surgicalHistory, encounters, patientAttachments } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedSurgicalProcessingResult {
  success: boolean;
  changes: Array<{
    action: string;
    surgery_id?: number;
    procedure_name: string;
    procedure_date?: string;
    surgeon_name?: string;
    facility_name?: string;
    consolidation_reasoning?: string;
    source_type: string;
    extracted_date?: string;
  }>;
  total_surgeries_affected: number;
  processing_time_ms: number;
  source_summary: {
    soap_note_length: number;
    attachment_content_length: number;
    trigger_type: string;
  };
}

/**
 * Unified Surgical History Parser
 * 
 * Uses GPT-4.1 to intelligently extract and consolidate surgical history from:
 * - SOAP notes during encounter processing
 * - Attachment content (operative reports, discharge summaries, H&P documents)
 * - Manual encounter edits
 * 
 * Follows same architectural pattern as UnifiedMedicalProblemsParser but simplified for surgical procedures
 */
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

    console.log(`🏥 [UnifiedSurgicalHistory] === UNIFIED PROCESSING START ===`);
    console.log(
      `🏥 [UnifiedSurgicalHistory] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`,
    );
    console.log(
      `🏥 [UnifiedSurgicalHistory] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`,
    );
    console.log(`🏥 [UnifiedSurgicalHistory] Trigger: ${triggerType}`);

    if (!soapNote && !attachmentContent) {
      console.warn(`🏥 [UnifiedSurgicalHistory] ⚠️ No content provided for processing`);
      return {
        success: false,
        changes: [],
        total_surgeries_affected: 0,
        processing_time_ms: Date.now() - startTime,
        source_summary: {
          soap_note_length: 0,
          attachment_content_length: 0,
          trigger_type: triggerType,
        },
      };
    }

    try {
      // Get existing surgical history for consolidation
      const existingSurgeries = await this.getExistingSurgicalHistory(patientId);
      console.log(`🏥 [UnifiedSurgicalHistory] Found ${existingSurgeries.length} existing surgical procedures for patient ${patientId}`);

      // Get patient chart context for intelligent extraction
      const patientChart = await PatientChartService.getPatientChartData(patientId);
      console.log(`🏥 [UnifiedSurgicalHistory] Patient chart context: ${patientChart.medicalProblems?.length || 0} medical problems, ${patientChart.currentMedications?.length || 0} medications`);

      // Prepare combined content for GPT analysis
      const combinedContent = this.prepareCombinedContent(soapNote, attachmentContent);
      const patientContextForGPT = this.formatPatientChartForGPT(patientChart);

      // Process with GPT-4.1 for surgical history extraction
      const gptResponse = await this.extractSurgicalHistoryWithGPT(
        combinedContent,
        existingSurgeries,
        patientContextForGPT,
        triggerType,
        attachmentId
      );

      console.log(`🏥 [UnifiedSurgicalHistory] GPT processing complete, ${gptResponse.length} surgical procedures identified`);

      // Process each surgical procedure from GPT response
      const changes: any[] = [];
      let surgeriesAffected = 0;

      for (const surgery of gptResponse) {
        try {
          const result = await this.processSingleSurgery(
            surgery,
            patientId,
            encounterId,
            attachmentId,
            providerId,
            triggerType
          );
          
          if (result) {
            changes.push(result);
            surgeriesAffected++;
          }
        } catch (error) {
          console.error(`🏥 [UnifiedSurgicalHistory] Error processing surgery:`, error);
        }
      }

      console.log(`🏥 [UnifiedSurgicalHistory] === PROCESSING COMPLETE ===`);
      console.log(`🏥 [UnifiedSurgicalHistory] Surgeries affected: ${surgeriesAffected}`);

      return {
        success: true,
        changes,
        total_surgeries_affected: surgeriesAffected,
        processing_time_ms: Date.now() - startTime,
        source_summary: {
          soap_note_length: soapNote?.length || 0,
          attachment_content_length: attachmentContent?.length || 0,
          trigger_type: triggerType,
        },
      };

    } catch (error) {
      console.error(`🏥 [UnifiedSurgicalHistory] ❌ Error in unified processing:`, error);
      throw error;
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
   * Extract surgical history using GPT-4.1 with sophisticated consolidation logic
   */
  private async extractSurgicalHistoryWithGPT(
    combinedContent: string,
    existingSurgeries: any[],
    patientContext: string,
    triggerType: string,
    attachmentId: number | null
  ): Promise<any[]> {
    
    const sourceType = attachmentId ? "attachment_extracted" : "soap_derived";
    
    const prompt = `You are an expert surgical assistant with 20+ years experience in surgical documentation and medical record management. Your task is to extract and consolidate surgical history from medical documents with production EMR-level accuracy.

PATIENT CLINICAL CONTEXT:
${patientContext}

EXISTING SURGICAL HISTORY:
${existingSurgeries.length > 0 
  ? existingSurgeries.map(s => `- ${s.procedure_name} (${s.procedure_date}) at ${s.facility_name || 'Unknown facility'}, Surgeon: ${s.surgeon_name || 'Unknown'}`).join('\n')
  : "- No previous surgical history recorded"
}

DOCUMENT TO ANALYZE:
${combinedContent}

CONSOLIDATION INSTRUCTIONS:
1. **CONSOLIDATION FIRST**: Always check if mentioned procedures already exist in the surgical history before creating new entries
2. **SMART MATCHING**: Consider variations like "appendectomy" vs "laparoscopic appendectomy" as the SAME procedure unless truly different
3. **DATE COMPARISON**: If same procedure with different dates, they are likely different surgeries (revisions, complications, etc.)
4. **GPT INTELLIGENCE ONLY**: YOU make ALL consolidation decisions - no frontend logic will override your choices

SURGICAL HISTORY EXTRACTION GUIDELINES:
- Extract ALL surgical procedures, operations, and interventional procedures
- Include diagnostic procedures if significant (endoscopies, biopsies, catheterizations)
- Pay attention to operative reports, discharge summaries, and H&P surgical history sections
- Capture complications, outcomes, and recovery status when mentioned
- Include anatomical details and laterality (left/right) when specified

REQUIRED OUTPUT FORMAT (JSON array only):
[
  {
    "action": "NEW_SURGERY" | "UPDATE_EXISTING" | "CONSOLIDATE",
    "surgery_id": existing_id_if_updating_or_null,
    "procedure_name": "standardized procedure name",
    "procedure_date": "YYYY-MM-DD or null if not specified",
    "surgeon_name": "surgeon name or null",
    "facility_name": "hospital/facility name or null",
    "indication": "reason for surgery",
    "complications": "complications if any or null",
    "outcome": "successful/complicated/ongoing or null",
    "anesthesia_type": "general/local/regional/spinal/MAC or null",
    "anatomical_site": "specific body part/organ",
    "laterality": "left/right/bilateral/midline or null",
    "urgency_level": "elective/urgent/emergent or null",
    "length_of_stay": "outpatient/1 day/2 days etc or null",
    "cpt_code": "CPT code if mentioned or null",
    "source_type": "${sourceType}",
    "source_confidence": confidence_0_to_1,
    "consolidation_reasoning": "explanation of consolidation decision",
    "extraction_notes": "relevant extraction context"
  }
]

EXAMPLES:
1. Document mentions "Status post appendectomy 2019" + existing "Appendectomy 2019-06-15":
   {"action": "CONSOLIDATE", "surgery_id": 5, "consolidation_reasoning": "Same appendectomy procedure, consolidating with existing entry"}

2. Document mentions "Right knee arthroscopy 2020" + existing "Left knee arthroscopy 2020":
   {"action": "NEW_SURGERY", "procedure_name": "Right knee arthroscopy", "consolidation_reasoning": "Different anatomical site from existing left knee procedure"}

3. New operative report for "Laparoscopic cholecystectomy" with no existing gallbladder surgery:
   {"action": "NEW_SURGERY", "procedure_name": "Laparoscopic cholecystectomy", "consolidation_reasoning": "No existing gallbladder surgery found, creating new entry"}

Return only the JSON array with no additional text:`;

    try {
      console.log(`🏥 [UnifiedSurgicalHistory] 🤖 Sending request to GPT-4.1`);
      console.log(`🏥 [UnifiedSurgicalHistory] 🤖 Content length: ${combinedContent.length} characters`);
      console.log(`🏥 [UnifiedSurgicalHistory] 🤖 Existing surgeries: ${existingSurgeries.length}`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a surgical documentation expert. Extract surgical history accurately and return only valid JSON.",
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
        console.warn(`🏥 [UnifiedSurgicalHistory] ⚠️ Empty response from GPT`);
        return [];
      }

      console.log(`🏥 [UnifiedSurgicalHistory] 🤖 GPT Response: ${responseContent.substring(0, 500)}...`);

      // Parse JSON response
      let parsedResponse;
      try {
        // Clean response if it has markdown formatting
        const cleanResponse = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error(`🏥 [UnifiedSurgicalHistory] ❌ JSON parsing error:`, parseError);
        console.error(`🏥 [UnifiedSurgicalHistory] ❌ Raw response:`, responseContent);
        return [];
      }

      if (!Array.isArray(parsedResponse)) {
        console.error(`🏥 [UnifiedSurgicalHistory] ❌ Response is not an array:`, parsedResponse);
        return [];
      }

      console.log(`🏥 [UnifiedSurgicalHistory] ✅ Successfully parsed ${parsedResponse.length} surgical procedures from GPT`);
      return parsedResponse;

    } catch (error) {
      console.error(`🏥 [UnifiedSurgicalHistory] ❌ Error calling GPT:`, error);
      return [];
    }
  }

  /**
   * Process a single surgical procedure from GPT response
   */
  private async processSingleSurgery(
    surgery: any,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number,
    triggerType: string
  ): Promise<any | null> {
    
    try {
      const action = surgery.action;
      console.log(`🏥 [UnifiedSurgicalHistory] Processing ${action}: ${surgery.procedure_name}`);

      if (action === "NEW_SURGERY") {
        return await this.createNewSurgery(surgery, patientId, encounterId, attachmentId, providerId);
      } else if (action === "UPDATE_EXISTING" || action === "CONSOLIDATE") {
        return await this.updateExistingSurgery(surgery, patientId, encounterId, attachmentId, providerId);
      } else {
        console.warn(`🏥 [UnifiedSurgicalHistory] ⚠️ Unknown action: ${action}`);
        return null;
      }

    } catch (error) {
      console.error(`🏥 [UnifiedSurgicalHistory] ❌ Error processing surgery:`, error);
      return null;
    }
  }

  /**
   * Create new surgical history entry
   */
  private async createNewSurgery(
    surgery: any,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<any> {
    
    const surgeryData = {
      patientId,
      procedureName: surgery.procedure_name,
      procedureDate: surgery.procedure_date || null,
      surgeonName: surgery.surgeon_name || null,
      facilityName: surgery.facility_name || null,
      indication: surgery.indication || null,
      complications: surgery.complications || null,
      outcome: surgery.outcome || "successful",
      anesthesiaType: surgery.anesthesia_type || null,
      cptCode: surgery.cpt_code || null,
      anatomicalSite: surgery.anatomical_site || null,
      laterality: surgery.laterality || null,
      urgencyLevel: surgery.urgency_level || null,
      lengthOfStay: surgery.length_of_stay || null,
      sourceType: surgery.source_type || "soap_derived",
      sourceConfidence: surgery.source_confidence || 0.8,
      sourceNotes: surgery.extraction_notes || null,
      extractedFromAttachmentId: attachmentId,
      lastUpdatedEncounter: encounterId,
      enteredBy: providerId,
      consolidationReasoning: surgery.consolidation_reasoning || null,
      extractionNotes: surgery.extraction_notes || null,
    };

    console.log(`🏥 [UnifiedSurgicalHistory] 💾 Creating new surgery: ${surgery.procedure_name}`);
    
    const result = await db.insert(surgicalHistory).values([surgeryData]).returning();
    
    console.log(`🏥 [UnifiedSurgicalHistory] ✅ Created surgery ID: ${result[0].id}`);

    return {
      action: "NEW_SURGERY",
      surgery_id: result[0].id,
      procedure_name: surgery.procedure_name,
      procedure_date: surgery.procedure_date,
      surgeon_name: surgery.surgeon_name,
      facility_name: surgery.facility_name,
      consolidation_reasoning: surgery.consolidation_reasoning,
      source_type: surgery.source_type,
      extracted_date: surgery.procedure_date
    };
  }

  /**
   * Update existing surgical history entry
   */
  private async updateExistingSurgery(
    surgery: any,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<any> {
    
    if (!surgery.surgery_id) {
      console.error(`🏥 [UnifiedSurgicalHistory] ❌ No surgery_id provided for update`);
      return null;
    }

    const updateData: any = {
      lastUpdatedEncounter: encounterId,
      updatedAt: new Date(),
    };

    // Update fields that have new information
    if (surgery.procedure_date) updateData.procedureDate = new Date(surgery.procedure_date);
    if (surgery.surgeon_name) updateData.surgeonName = surgery.surgeon_name;
    if (surgery.facility_name) updateData.facilityName = surgery.facility_name;
    if (surgery.indication) updateData.indication = surgery.indication;
    if (surgery.complications) updateData.complications = surgery.complications;
    if (surgery.outcome) updateData.outcome = surgery.outcome;
    if (surgery.anesthesia_type) updateData.anesthesiaType = surgery.anesthesia_type;
    if (surgery.anatomical_site) updateData.anatomicalSite = surgery.anatomical_site;
    if (surgery.laterality) updateData.laterality = surgery.laterality;
    if (surgery.cpt_code) updateData.cptCode = surgery.cpt_code;
    
    // Update consolidation reasoning
    updateData.consolidationReasoning = surgery.consolidation_reasoning;
    if (surgery.extraction_notes) updateData.extractionNotes = surgery.extraction_notes;

    console.log(`🏥 [UnifiedSurgicalHistory] 💾 Updating surgery ID: ${surgery.surgery_id}`);
    
    await db
      .update(surgicalHistory)
      .set(updateData)
      .where(eq(surgicalHistory.id, surgery.surgery_id));

    console.log(`🏥 [UnifiedSurgicalHistory] ✅ Updated surgery ID: ${surgery.surgery_id}`);

    return {
      action: "UPDATE_EXISTING",
      surgery_id: surgery.surgery_id,
      procedure_name: surgery.procedure_name,
      procedure_date: surgery.procedure_date,
      surgeon_name: surgery.surgeon_name,
      facility_name: surgery.facility_name,
      consolidation_reasoning: surgery.consolidation_reasoning,
      source_type: surgery.source_type,
      extracted_date: surgery.procedure_date
    };
  }
}

// Export singleton instance
export const unifiedSurgicalHistoryParser = new UnifiedSurgicalHistoryParser();