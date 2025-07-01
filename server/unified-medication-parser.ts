/**
 * Unified Medication Parser Service
 *
 * Processes medications from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and conflict resolution
 * - Source attribution and confidence scoring
 * - Visit history tracking during medication changes
 * - Intelligent status classification (active vs historical)
 * - Parallel processing architecture for attachment chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { medications as medicationsTable, encounters, patients } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service.js";

export interface UnifiedMedicationVisitHistoryEntry {
  date: string; // Authoritative medication event date
  notes: string;
  source: "encounter" | "attachment" | "manual" | "order_conversion";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  changesMade?: string[];
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
  sourceConfidence?: number;
  sourceNotes?: string;
}

export interface UnifiedMedicationChange {
  action: "CREATE" | "UPDATE" | "CONSOLIDATE" | "DISCONTINUE" | "REACTIVATE";
  medication_id?: number; // For updates/consolidates
  medication_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string;
  route?: string;
  frequency?: string;
  sig?: string;
  clinical_indication?: string;
  status: "active" | "discontinued" | "held" | "historical" | "pending";
  start_date?: string;
  end_date?: string;
  visit_notes?: string;
  source_type: "encounter" | "attachment";
  consolidation_reasoning?: string;
  confidence?: number;
  transfer_visit_history_from?: number; // For medication consolidation
  extracted_date?: string; // From attachment content
}

export interface UnifiedMedicationResult {
  changes: UnifiedMedicationChange[];
  total_medications_affected: number;
  processing_time_ms: number;
  source_summary: string;
}

export class UnifiedMedicationParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process medications from both SOAP notes and attachments
   */
  async processUnified(
    patientId: number,
    encounterId: number | null,
    soapNoteText: string | null,
    attachmentContent: string | null,
    attachmentId: number | null,
    providerId: number,
    triggerType: string
  ): Promise<UnifiedMedicationResult> {
    const startTime = Date.now();

    console.log(`💊 [UnifiedMedicationParser] === STARTING UNIFIED PROCESSING ===`);
    console.log(`💊 [UnifiedMedicationParser] Patient: ${patientId}, Trigger: ${triggerType}`);
    console.log(`💊 [UnifiedMedicationParser] SOAP content: ${soapNoteText ? 'YES' : 'NO'}, Attachment content: ${attachmentContent ? 'YES' : 'NO'}`);

    try {
      // Get existing medications for context and consolidation
      const existingMedications = await this.getExistingMedications(patientId);
      console.log(`💊 [UnifiedMedicationParser] Found ${existingMedications.length} existing medications for patient ${patientId}`);

      // Get comprehensive patient chart data for clinical context
      const patientChart = await PatientChartService.getPatientChartData(patientId);
      console.log(`💊 [UnifiedMedicationParser] Retrieved patient chart data: ${patientChart.currentMedications?.length || 0} meds, ${patientChart.medicalProblems?.length || 0} problems, ${patientChart.vitals?.length || 0} vitals`);

      // Parse medications using GPT with full clinical context
      const medicationChanges = await this.parseWithGPT(
        soapNoteText,
        attachmentContent,
        existingMedications,
        patientChart,
        triggerType
      );

      console.log(`💊 [UnifiedMedicationParser] GPT identified ${medicationChanges.length} medication changes`);

      // Apply changes to database
      await this.applyChangesToDatabase(
        medicationChanges,
        patientId,
        encounterId,
        attachmentId,
        providerId
      );

      const processingTime = Date.now() - startTime;
      console.log(`💊 [UnifiedMedicationParser] === PROCESSING COMPLETE ===`);
      console.log(`💊 [UnifiedMedicationParser] Total time: ${processingTime}ms, Medications affected: ${medicationChanges.length}`);

      return {
        changes: medicationChanges,
        total_medications_affected: medicationChanges.length,
        processing_time_ms: processingTime,
        source_summary: this.generateSourceSummary(medicationChanges, triggerType)
      };

    } catch (error) {
      console.error(`❌ [UnifiedMedicationParser] Error in processUnified:`, error);
      throw error;
    }
  }

  /**
   * Get existing medications for patient for consolidation context
   */
  private async getExistingMedications(patientId: number): Promise<any[]> {
    try {
      const existingMeds = await db.select()
        .from(medicationsTable)
        .where(eq(medicationsTable.patientId, patientId));
      
      return existingMeds;
    } catch (error) {
      console.error(`❌ [UnifiedMedicationParser] Error fetching existing medications:`, error);
      return [];
    }
  }

  /**
   * Parse medications using GPT with comprehensive clinical context
   */
  private async parseWithGPT(
    soapNoteText: string | null,
    attachmentContent: string | null,
    existingMedications: any[],
    patientChart: any,
    triggerType: string
  ): Promise<UnifiedMedicationChange[]> {
    const content = soapNoteText || attachmentContent;
    if (!content) {
      console.log(`💊 [UnifiedMedicationParser] No content to process`);
      return [];
    }

    // Format existing medications for GPT context
    const existingMedsContext = existingMedications.length > 0 
      ? existingMedications.map(med => 
          `ID ${med.id}: ${med.medicationName} ${med.strength || med.dosage} ${med.frequency} (Status: ${med.status})`
        ).join('\n')
      : '- No existing medications';

    // Format patient chart data for clinical context
    const patientChartContext = this.formatPatientChartForGPT(patientChart);

    const prompt = `You are an expert clinical pharmacist with 20+ years of experience in medication reconciliation and management. Your task is to extract and process medications from clinical content, making intelligent decisions about medication status and consolidation.

CLINICAL CONTEXT:
${patientChartContext}

EXISTING MEDICATIONS:
${existingMedsContext}

CONTENT TO PROCESS (${triggerType}):
${content}

MEDICATION STATUS CLASSIFICATION RULES:
Based on document analysis, clinical context, and your pharmaceutical expertise, classify each medication as:

1. **ACTIVE**: Recent prescriptions, current medications lists, active refills, medications with recent dosing changes
2. **HISTORICAL**: Old medication lists, discontinued medications, past prescriptions clearly not current
3. **PENDING**: Uncertain status requiring provider review (use sparingly for borderline cases)
4. **DISCONTINUED**: Explicitly stopped, discontinued, or replaced medications

STATUS DECISION FACTORS:
- Document date vs today's date (${new Date().toISOString().split('T')[0]})
- Language: "current medications", "taking", "prescribed" vs "history of", "past", "previously"
- Prescription dates, refill information, dosing changes
- Clinical context from patient's medical problems
- Provider notes about medication changes

CONSOLIDATION RULES:
- SAME medication, SAME strength, SAME frequency = CONSOLIDATE (update visit history)
- SAME medication, DIFFERENT strength = CONSOLIDATE with dose change visit history
- SAME medication class, DIFFERENT drug = CREATE separate entries
- Brand/Generic equivalents = CONSOLIDATE (prefer generic name)

VISIT HISTORY CREATION RULE:
ONLY create visit history entries when medications were ACTUALLY discussed, prescribed, changed, or reviewed in this content.

PERFECT VISIT HISTORY EXAMPLES:
- "Started lisinopril 10mg daily for hypertension"
- "Increased metformin from 500mg to 1000mg BID"
- "Discontinued atorvastatin due to muscle aches"
- "Patient reports good tolerance to current regimen"
- "Refilled hydrochlorothiazide 25mg daily x90 days"
- "Switched from brand Lipitor to generic atorvastatin"
- "Added omeprazole 20mg daily for GERD symptoms"
- "Patient adherent to diabetes medications"

Return a JSON array of medication changes. Each change must include:
- action: CREATE/UPDATE/CONSOLIDATE/DISCONTINUE
- medication_name: Generic name preferred
- status: active/historical/discontinued/pending
- visit_notes: Only if medication was actively managed
- confidence: 0.0-1.0 based on clarity of information
- consolidation_reasoning: Why you made this decision

Example response:
[
  {
    "action": "CREATE",
    "medication_name": "lisinopril",
    "strength": "10mg",
    "frequency": "once daily",
    "route": "oral",
    "dosage_form": "tablet",
    "clinical_indication": "hypertension",
    "status": "active",
    "start_date": "2025-07-01",
    "visit_notes": "Started lisinopril 10mg daily for newly diagnosed hypertension",
    "source_type": "${soapNoteText ? 'encounter' : 'attachment'}",
    "confidence": 0.95,
    "consolidation_reasoning": "New prescription documented in current encounter"
  }
]`;

    try {
      console.log(`💊 [UnifiedMedicationParser] Sending request to GPT-4.1 for medication parsing`);
      console.log(`💊 [UnifiedMedicationParser] Content length: ${content.length} characters`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical pharmacist specializing in medication reconciliation and EMR systems."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.log(`💊 [UnifiedMedicationParser] No response from GPT`);
        return [];
      }

      console.log(`💊 [UnifiedMedicationParser] GPT response length: ${responseContent.length} characters`);
      console.log(`💊 [UnifiedMedicationParser] GPT response preview: ${responseContent.substring(0, 300)}...`);

      // Parse JSON response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(`💊 [UnifiedMedicationParser] No valid JSON found in GPT response`);
        return [];
      }

      const medicationChanges = JSON.parse(jsonMatch[0]);
      console.log(`💊 [UnifiedMedicationParser] Parsed ${medicationChanges.length} medication changes from GPT`);
      
      return medicationChanges;

    } catch (error) {
      console.error(`❌ [UnifiedMedicationParser] Error in GPT parsing:`, error);
      return [];
    }
  }

  /**
   * Format patient chart data for GPT clinical context
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current medications for context
    if (patientChart.medications?.length > 0) {
      sections.push(`
CURRENT MEDICATIONS (for clinical correlation):
${patientChart.medications
  .map((med: any) => 
    `- ${med.medicationName} ${med.dosage} ${med.frequency} (${med.status})`
  )
  .join("\n")}`);
    }

    // Medical problems for indication context
    if (patientChart.medicalProblems?.length > 0) {
      sections.push(`
MEDICAL PROBLEMS (for indication context):
${patientChart.medicalProblems
  .map((problem: any) => `- ${problem.problemTitle} (${problem.problemStatus})`)
  .join("\n")}`);
    }

    // Recent vitals for medication monitoring context
    if (patientChart.vitals?.length > 0) {
      const recentVitals = patientChart.vitals.slice(0, 3);
      sections.push(`
RECENT VITALS (for medication monitoring):
${recentVitals
  .map((vital: any) => 
    `- ${vital.vitalDate}: BP ${vital.systolicBP}/${vital.diastolicBP}, HR ${vital.heartRate}`
  )
  .join("\n")}`);
    }

    // Allergies for medication safety
    if (patientChart.allergies?.length > 0) {
      sections.push(`
ALLERGIES (for medication safety):
${patientChart.allergies
  .map((allergy: any) => 
    `- ${allergy.allergen}: ${allergy.reaction} (${allergy.severity})`
  )
  .join("\n")}`);
    }

    return sections.length > 0
      ? sections.join("\n")
      : "- No additional clinical data available for medication context";
  }

  /**
   * Apply medication changes to database
   */
  private async applyChangesToDatabase(
    changes: UnifiedMedicationChange[],
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    console.log(`💊 [UnifiedMedicationParser] Applying ${changes.length} changes to database`);

    for (const change of changes) {
      try {
        switch (change.action) {
          case "CREATE":
            await this.createMedication(change, patientId, encounterId, attachmentId, providerId);
            break;
          case "UPDATE":
            await this.updateMedication(change, patientId, encounterId, attachmentId, providerId);
            break;
          case "CONSOLIDATE":
            await this.consolidateMedication(change, patientId, encounterId, attachmentId, providerId);
            break;
          case "DISCONTINUE":
            await this.discontinueMedication(change, patientId, encounterId, attachmentId, providerId);
            break;
          case "REACTIVATE":
            await this.reactivateMedication(change, patientId, encounterId, attachmentId, providerId);
            break;
        }
      } catch (error) {
        console.error(`❌ [UnifiedMedicationParser] Error applying change ${change.action} for ${change.medication_name}:`, error);
      }
    }
  }

  /**
   * Create new medication entry
   */
  private async createMedication(
    change: UnifiedMedicationChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    console.log(`💊 [UnifiedMedicationParser] Creating new medication: ${change.medication_name}`);

    const visitHistory = change.visit_notes ? [{
      date: change.extracted_date || new Date().toISOString().split('T')[0],
      notes: change.visit_notes,
      source: change.source_type,
      encounterId: encounterId,
      attachmentId: attachmentId,
      providerId: providerId,
      confidence: change.confidence || 0.85,
      changesMade: [`Created medication: ${change.medication_name}`]
    }] : [];

    await db.insert(medications).values({
      patientId,
      encounterId: encounterId || null,
      medicationName: change.medication_name,
      genericName: change.generic_name || null,
      brandName: change.brand_name || null,
      dosage: change.strength || '',
      strength: change.strength || null,
      dosageForm: change.dosage_form || null,
      route: change.route || 'oral',
      frequency: change.frequency || '',
      sig: change.sig || null,
      clinicalIndication: change.clinical_indication || null,
      startDate: change.start_date || new Date().toISOString().split('T')[0],
      endDate: change.end_date || null,
      status: change.status,
      prescriber: 'Extracted from Document',
      prescriberId: providerId,
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      visitHistory: visitHistory,
      sourceType: change.source_type,
      sourceConfidence: change.confidence || 0.85,
      sourceNotes: change.consolidation_reasoning || null,
      extractedFromAttachmentId: attachmentId,
      enteredBy: providerId
    });

    console.log(`✅ [UnifiedMedicationParser] Created medication: ${change.medication_name}`);
  }

  /**
   * Update existing medication
   */
  private async updateMedication(
    change: UnifiedMedicationChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    if (!change.medication_id) {
      console.error(`❌ [UnifiedMedicationParser] No medication ID provided for update`);
      return;
    }

    console.log(`💊 [UnifiedMedicationParser] Updating medication ID ${change.medication_id}: ${change.medication_name}`);

    // Get existing medication for visit history
    const [existingMed] = await db.select()
      .from(medications)
      .where(eq(medications.id, change.medication_id));

    if (!existingMed) {
      console.error(`❌ [UnifiedMedicationParser] Medication ${change.medication_id} not found for update`);
      return;
    }

    // Prepare visit history entry
    const newVisitEntry = change.visit_notes ? {
      date: change.extracted_date || new Date().toISOString().split('T')[0],
      notes: change.visit_notes,
      source: change.source_type,
      encounterId: encounterId,
      attachmentId: attachmentId,
      providerId: providerId,
      confidence: change.confidence || 0.85,
      changesMade: [`Updated medication: ${change.medication_name}`]
    } : null;

    // Update existing visit history
    const updatedVisitHistory = existingMed.visitHistory ? [...existingMed.visitHistory] : [];
    if (newVisitEntry) {
      updatedVisitHistory.push(newVisitEntry);
    }

    // Update medication
    await db.update(medications)
      .set({
        status: change.status,
        endDate: change.end_date || null,
        lastUpdatedEncounterId: encounterId,
        visitHistory: updatedVisitHistory,
        sourceConfidence: change.confidence || 0.85,
        updatedAt: new Date()
      })
      .where(eq(medications.id, change.medication_id));

    console.log(`✅ [UnifiedMedicationParser] Updated medication ID ${change.medication_id}`);
  }

  /**
   * Consolidate medication with existing entry
   */
  private async consolidateMedication(
    change: UnifiedMedicationChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    console.log(`💊 [UnifiedMedicationParser] Consolidating medication: ${change.medication_name}`);
    
    // For now, treat consolidation as an update
    // In future iterations, this could include more sophisticated merging logic
    await this.updateMedication(change, patientId, encounterId, attachmentId, providerId);
  }

  /**
   * Discontinue medication
   */
  private async discontinueMedication(
    change: UnifiedMedicationChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    if (!change.medication_id) {
      console.error(`❌ [UnifiedMedicationParser] No medication ID provided for discontinuation`);
      return;
    }

    console.log(`💊 [UnifiedMedicationParser] Discontinuing medication ID ${change.medication_id}: ${change.medication_name}`);

    const discontinueDate = change.extracted_date || new Date().toISOString().split('T')[0];
    
    // Get existing medication for visit history
    const [existingMed] = await db.select()
      .from(medications)
      .where(eq(medications.id, change.medication_id));

    if (!existingMed) {
      console.error(`❌ [UnifiedMedicationParser] Medication ${change.medication_id} not found for discontinuation`);
      return;
    }

    // Add discontinuation visit history entry
    const newVisitEntry = {
      date: discontinueDate,
      notes: change.visit_notes || `Discontinued ${change.medication_name}`,
      source: change.source_type,
      encounterId: encounterId,
      attachmentId: attachmentId,
      providerId: providerId,
      confidence: change.confidence || 0.85,
      changesMade: [`Discontinued medication: ${change.medication_name}`]
    };

    const updatedVisitHistory = existingMed.visitHistory ? [...existingMed.visitHistory] : [];
    updatedVisitHistory.push(newVisitEntry);

    await db.update(medications)
      .set({
        status: 'discontinued',
        endDate: discontinueDate,
        discontinuedDate: discontinueDate,
        lastUpdatedEncounterId: encounterId,
        visitHistory: updatedVisitHistory,
        updatedAt: new Date()
      })
      .where(eq(medications.id, change.medication_id));

    console.log(`✅ [UnifiedMedicationParser] Discontinued medication ID ${change.medication_id}`);
  }

  /**
   * Reactivate previously discontinued medication
   */
  private async reactivateMedication(
    change: UnifiedMedicationChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
    providerId: number
  ): Promise<void> {
    console.log(`💊 [UnifiedMedicationParser] Reactivating medication: ${change.medication_name}`);
    
    // For now, treat reactivation as an update to active status
    const reactivationChange = {
      ...change,
      status: 'active' as const,
      end_date: null
    };
    
    await this.updateMedication(reactivationChange, patientId, encounterId, attachmentId, providerId);
  }

  /**
   * Generate source summary for processing result
   */
  private generateSourceSummary(changes: UnifiedMedicationChange[], triggerType: string): string {
    const totalChanges = changes.length;
    const creates = changes.filter(c => c.action === 'CREATE').length;
    const updates = changes.filter(c => c.action === 'UPDATE').length;
    const consolidates = changes.filter(c => c.action === 'CONSOLIDATE').length;
    const discontinues = changes.filter(c => c.action === 'DISCONTINUE').length;

    return `${triggerType}: ${totalChanges} total (${creates} created, ${updates} updated, ${consolidates} consolidated, ${discontinues} discontinued)`;
  }
}

// Export singleton instance
export const unifiedMedicationParser = new UnifiedMedicationParser();