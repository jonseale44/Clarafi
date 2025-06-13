/**
 * Medication Delta Processing Service
 * Implements incremental medication history building with GPT-driven medication evolution
 * Mirrors the medical problems delta service architecture
 */

import OpenAI from "openai";
import { db } from "./db";
import { medications, encounters, patients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";

export interface MedicationHistoryEntry {
  date: string; // Authoritative medical event date (encounter date)
  action: "started" | "continued" | "modified" | "discontinued" | "held" | "resumed";
  notes: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  source: "encounter" | "manual" | "imported_record";
  encounterId?: number;
  providerId?: number;
  providerName?: string;
  changesMade?: string[];
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
}

export interface MedicationChangeLogEntry {
  encounter_id: number;
  timestamp: string;
  change_type: "medication_started" | "medication_modified" | "medication_discontinued" | "dosage_changed" | "frequency_changed";
  old_dosage?: string;
  new_dosage?: string;
  old_frequency?: string;
  new_frequency?: string;
  processing_time_ms: number;
}

export interface MedicationChange {
  medication_id?: number; // null if new medication
  action: "ADD_HISTORY" | "UPDATE_DOSAGE" | "NEW_MEDICATION" | "DISCONTINUE" | "MODIFY_FREQUENCY" | "CHANGE_INDICATION";
  medication_name?: string;
  history_notes?: string;
  dosage_change?: { from: string; to: string };
  frequency_change?: { from: string; to: string };
  indication_change?: { from: string; to: string };
  confidence: number;
  reasoning?: string;
}

export interface MedicationDeltaResult {
  changes: MedicationChange[];
  processing_time_ms: number;
  total_medications_affected: number;
}

export class MedicationDeltaService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main delta processing method - mirrors medical problems approach
   */
  async processSOAPDelta(
    patientId: number,
    encounterId: number,
    soapNote: string,
    providerId: number
  ): Promise<MedicationDeltaResult> {
    const startTime = Date.now();
    console.log(`💊 [MedicationDelta] === DELTA PROCESSING START ===`);
    console.log(`💊 [MedicationDelta] Patient ID: ${patientId}, Encounter ID: ${encounterId}, Provider ID: ${providerId}`);
    console.log(`💊 [MedicationDelta] SOAP Note length: ${soapNote.length} characters`);

    try {
      // Get existing medications for context
      console.log(`💊 [MedicationDelta] Fetching existing medications...`);
      const existingMedications = await this.getExistingMedications(patientId);
      console.log(`💊 [MedicationDelta] Found ${existingMedications.length} existing medications`);
      
      // Get encounter and patient info
      console.log(`💊 [MedicationDelta] Fetching encounter and patient info...`);
      const [encounter, patient] = await Promise.all([
        this.getEncounterInfo(encounterId),
        this.getPatientInfo(patientId)
      ]);
      console.log(`💊 [MedicationDelta] Patient: ${patient.firstName} ${patient.lastName}, Age: ${this.calculateAge(patient.dateOfBirth)}`);
      console.log(`💊 [MedicationDelta] Encounter: ${encounter.encounterType}, Status: ${encounter.encounterStatus}`);

      // Generate delta changes using GPT
      console.log(`💊 [MedicationDelta] Starting GPT delta analysis...`);
      const changes = await this.generateDeltaChanges(
        existingMedications,
        soapNote,
        encounter,
        patient,
        providerId
      );
      console.log(`💊 [MedicationDelta] GPT analysis completed. Generated ${changes.length} changes:`);
      changes.forEach((change, index) => {
        console.log(`💊 [MedicationDelta] Change ${index + 1}: ${change.action} - ${change.medication_name || 'existing medication'} (confidence: ${change.confidence})`);
      });

      // Apply changes optimistically to database
      console.log(`💊 [MedicationDelta] Applying ${changes.length} changes to database...`);
      await this.applyChangesToDatabase(changes, patientId, encounterId, providerId);
      console.log(`💊 [MedicationDelta] Database changes applied successfully`);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MedicationDelta] === DELTA PROCESSING COMPLETE ===`);
      console.log(`✅ [MedicationDelta] Total time: ${processingTime}ms, Medications affected: ${changes.length}`);

      return {
        changes,
        processing_time_ms: processingTime,
        total_medications_affected: changes.length
      };

    } catch (error) {
      console.error(`❌ [MedicationDelta] Error in processSOAPDelta:`, error);
      console.error(`❌ [MedicationDelta] Stack trace:`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Generate medication delta changes using GPT analysis
   */
  private async generateDeltaChanges(
    existingMedications: any[],
    soapNote: string,
    encounter: any,
    patient: any,
    providerId: number
  ): Promise<MedicationChange[]> {
    const gptStartTime = Date.now();
    console.log(`💊 [GPT] === MEDICATION GPT ANALYSIS START ===`);
    console.log(`💊 [GPT] Timestamp: ${new Date().toISOString()}`);
    console.log(`💊 [GPT] Provider ID: ${providerId}`);
    console.log(`💊 [GPT] Patient: ${patient?.firstName} ${patient?.lastName} (Age: ${this.calculateAge(patient?.dateOfBirth)})`);
    console.log(`💊 [GPT] Existing medications count: ${existingMedications.length}`);
    
    // Log existing medications for context
    existingMedications.forEach((med, index) => {
      console.log(`💊 [GPT] Existing Med ${index + 1}: ${med.medicationName} - ${med.dosage || 'no dosage'} - Status: ${med.status} - Last updated: ${med.lastUpdatedEncounterId || 'never'}`);
    });

    const systemPrompt = this.buildMedicationDeltaPrompt();
    const userPrompt = this.buildUserPrompt(existingMedications, soapNote, encounter, patient);

    console.log(`💊 [GPT] System prompt length: ${systemPrompt.length} characters`);
    console.log(`💊 [GPT] User prompt length: ${userPrompt.length} characters`);
    console.log(`💊 [GPT] SOAP note segment for analysis: "${soapNote.substring(0, 200)}..."`);

    try {
      console.log(`💊 [GPT] Calling OpenAI GPT-4o model...`);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const gptCallTime = Date.now() - gptStartTime;
      console.log(`💊 [GPT] OpenAI API call completed in ${gptCallTime}ms`);

      const response = completion.choices[0].message.content;
      console.log(`💊 [GPT] Raw response length: ${response?.length || 0} characters`);
      console.log(`💊 [GPT] Raw GPT response: ${response?.substring(0, 500)}...`);

      const parsedResponse = JSON.parse(response || "{}");
      
      console.log(`💊 [GPT] Response parsed successfully`);
      console.log(`💊 [GPT] Changes identified: ${parsedResponse.changes?.length || 0}`);
      
      // Log each identified change in detail
      if (parsedResponse.changes) {
        parsedResponse.changes.forEach((change: MedicationChange, index: number) => {
          console.log(`💊 [GPT] Change ${index + 1}:`);
          console.log(`💊 [GPT]   - Action: ${change.action}`);
          console.log(`💊 [GPT]   - Medication: ${change.medication_name || 'N/A'}`);
          console.log(`💊 [GPT]   - Medication ID: ${change.medication_id || 'NEW'}`);
          console.log(`💊 [GPT]   - Confidence: ${change.confidence}`);
          console.log(`💊 [GPT]   - Reasoning: ${change.reasoning || 'No reasoning provided'}`);
          console.log(`💊 [GPT]   - History Notes: ${change.history_notes || 'No notes'}`);
          if (change.dosage_change) {
            console.log(`💊 [GPT]   - Dosage Change: ${change.dosage_change.from} → ${change.dosage_change.to}`);
          }
          if (change.frequency_change) {
            console.log(`💊 [GPT]   - Frequency Change: ${change.frequency_change.from} → ${change.frequency_change.to}`);
          }
          if (change.indication_change) {
            console.log(`💊 [GPT]   - Indication Change: ${change.indication_change.from} → ${change.indication_change.to}`);
          }
        });
      }

      const totalGptTime = Date.now() - gptStartTime;
      console.log(`💊 [GPT] === MEDICATION GPT ANALYSIS COMPLETE ===`);
      console.log(`💊 [GPT] Total GPT processing time: ${totalGptTime}ms`);

      return parsedResponse.changes || [];

    } catch (error) {
      const errorTime = Date.now() - gptStartTime;
      console.error(`❌ [GPT] Error in GPT analysis after ${errorTime}ms:`, error);
      console.error(`❌ [GPT] Error stack trace:`, (error as Error).stack);
      console.error(`❌ [GPT] System prompt preview:`, systemPrompt.substring(0, 200));
      console.error(`❌ [GPT] User prompt preview:`, userPrompt.substring(0, 200));
      return [];
    }
  }

  /**
   * Build comprehensive system prompt for medication delta analysis
   */
  private buildMedicationDeltaPrompt(): string {
    return `You are an expert clinical pharmacist analyzing medication changes in SOAP notes.

Your task is to perform DELTA ANALYSIS - identify what medication changes occurred during this encounter by comparing the SOAP note against the patient's existing medication list.

CORE PRINCIPLES:
1. Only identify changes that are explicitly mentioned or clearly implied in the SOAP note
2. Do not assume medication continuation unless explicitly stated
3. Focus on NEW information, modifications, or discontinuations mentioned in this encounter
4. Maintain medication history continuity - each change builds on the previous state

CHANGE TYPES YOU CAN IDENTIFY:
- ADD_HISTORY: Medication mentioned as continuing, with notes about compliance, effectiveness, or side effects
- UPDATE_DOSAGE: Explicit dosage changes mentioned
- NEW_MEDICATION: New medications started or prescribed
- DISCONTINUE: Medications explicitly stopped or discontinued
- MODIFY_FREQUENCY: Changes in how often medication is taken
- CHANGE_INDICATION: Changes in why medication is prescribed

MEDICATION MATCHING INTELLIGENCE:
- Match medications by generic/brand names (e.g., "lisinopril" matches "Prinivil")
- Account for dosage forms (e.g., "metformin XR" vs "metformin")
- Consider combination medications (e.g., "Norvasc" contains amlodipine)
- Recognize when multiple names refer to same medication

CONFIDENCE SCORING:
- 0.9+: Explicit medication changes clearly stated
- 0.7-0.8: Strong clinical inference from context
- 0.5-0.6: Moderate inference, may need clarification
- <0.5: Weak inference, should be reviewed

CRITICAL SAFETY RULES:
- Never recommend discontinuing medications without explicit mention
- Always preserve medication history and context
- Flag potential drug interactions or contraindications
- Consider patient age, comorbidities, and contraindications

You must return a JSON object with this structure:
{
  "changes": [
    {
      "medication_id": number | null,
      "action": "ADD_HISTORY" | "UPDATE_DOSAGE" | "NEW_MEDICATION" | "DISCONTINUE" | "MODIFY_FREQUENCY" | "CHANGE_INDICATION",
      "medication_name": "string",
      "history_notes": "string",
      "dosage_change": {"from": "string", "to": "string"} | null,
      "frequency_change": {"from": "string", "to": "string"} | null,
      "indication_change": {"from": "string", "to": "string"} | null,
      "confidence": number,
      "reasoning": "string"
    }
  ]
}`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    existingMedications: any[],
    soapNote: string,
    encounter: any,
    patient: any
  ): string {
    const patientAge = this.calculateAge(patient.dateOfBirth);
    
    const medicationsList = existingMedications.map(med => 
      `- ID: ${med.id}, Name: ${med.medicationName}, Dosage: ${med.dosage || 'not specified'}, Frequency: ${med.frequency || 'not specified'}, Status: ${med.status}, Indication: ${med.clinicalIndication || 'not specified'}`
    ).join('\n');

    return `PATIENT CONTEXT:
- Age: ${patientAge} years
- Gender: ${patient.gender}
- Encounter Type: ${encounter.encounterType}
- Encounter Date: ${encounter.startTime}

CURRENT MEDICATIONS:
${medicationsList || 'No current medications on file'}

SOAP NOTE TO ANALYZE:
${soapNote}

Please analyze this SOAP note and identify medication changes that occurred during this encounter. Focus only on explicit changes, additions, or discontinuations mentioned in the note.`;
  }

  /**
   * Apply generated changes to database
   */
  private async applyChangesToDatabase(
    changes: MedicationChange[],
    patientId: number,
    encounterId: number,
    providerId: number
  ): Promise<void> {
    console.log(`💊 [DB] === DATABASE CHANGES APPLICATION START ===`);
    console.log(`💊 [DB] Total changes to apply: ${changes.length}`);
    console.log(`💊 [DB] Patient ID: ${patientId}, Encounter ID: ${encounterId}, Provider ID: ${providerId}`);
    
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const changeStartTime = Date.now();
      
      console.log(`💊 [DB] --- Processing Change ${i + 1}/${changes.length} ---`);
      console.log(`💊 [DB] Change action: ${change.action}`);
      console.log(`💊 [DB] Medication name: ${change.medication_name || 'N/A'}`);
      console.log(`💊 [DB] Medication ID: ${change.medication_id || 'NEW'}`);
      console.log(`💊 [DB] Confidence level: ${change.confidence}`);
      
      try {
        await this.applyIndividualChange(change, patientId, encounterId, providerId);
        
        const changeTime = Date.now() - changeStartTime;
        console.log(`✅ [DB] Successfully applied change ${i + 1} in ${changeTime}ms`);
        console.log(`✅ [DB] Change details: ${change.action} for ${change.medication_name}`);
        
      } catch (error) {
        const changeTime = Date.now() - changeStartTime;
        console.error(`❌ [DB] Failed to apply change ${i + 1} after ${changeTime}ms`);
        console.error(`❌ [DB] Failed change: ${change.action} for ${change.medication_name}`);
        console.error(`❌ [DB] Error details:`, error);
        console.error(`❌ [DB] Error stack:`, (error as Error).stack);
        
        // Continue with other changes even if one fails
      }
    }
    
    console.log(`💊 [DB] === DATABASE CHANGES APPLICATION COMPLETE ===`);
  }

  /**
   * Apply individual medication change
   */
  private async applyIndividualChange(
    change: MedicationChange,
    patientId: number,
    encounterId: number,
    providerId: number
  ): Promise<void> {
    const encounter = await this.getEncounterInfo(encounterId);
    const encounterDate = encounter?.startTime;
    const historyEntry: MedicationHistoryEntry = {
      date: typeof encounterDate === 'string' ? encounterDate : new Date().toISOString(),
      action: this.mapActionToHistoryAction(change.action),
      notes: change.history_notes || change.reasoning || `${change.action} - ${change.medication_name}`,
      encounterId,
      providerId,
      source: "encounter",
      confidence: change.confidence,
      isSigned: false
    };

    if (change.dosage_change) {
      historyEntry.dosage = change.dosage_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(`Dosage changed from ${change.dosage_change.from} to ${change.dosage_change.to}`);
    }

    if (change.frequency_change) {
      historyEntry.frequency = change.frequency_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(`Frequency changed from ${change.frequency_change.from} to ${change.frequency_change.to}`);
    }

    if (change.indication_change) {
      historyEntry.indication = change.indication_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(`Indication changed from ${change.indication_change.from} to ${change.indication_change.to}`);
    }

    switch (change.action) {
      case "NEW_MEDICATION":
        await this.createNewMedication(change, patientId, encounterId, historyEntry);
        break;
      
      case "ADD_HISTORY":
      case "UPDATE_DOSAGE":
      case "MODIFY_FREQUENCY":
      case "CHANGE_INDICATION":
        await this.updateExistingMedication(change, historyEntry);
        break;
      
      case "DISCONTINUE":
        await this.discontinueMedication(change, historyEntry);
        break;
    }
  }

  /**
   * Create new medication record
   */
  private async createNewMedication(
    change: MedicationChange,
    patientId: number,
    encounterId: number,
    historyEntry: MedicationHistoryEntry
  ): Promise<void> {
    const createStartTime = Date.now();
    console.log(`💊 [CreateMedication] === CREATING NEW MEDICATION ===`);
    console.log(`💊 [CreateMedication] Medication name: ${change.medication_name}`);
    console.log(`💊 [CreateMedication] Patient ID: ${patientId}, Encounter ID: ${encounterId}`);
    console.log(`💊 [CreateMedication] Dosage: ${change.dosage_change?.to || 'As directed'}`);
    console.log(`💊 [CreateMedication] Frequency: ${change.frequency_change?.to || 'daily'}`);
    console.log(`💊 [CreateMedication] Indication: ${change.indication_change?.to || 'Not specified'}`);
    console.log(`💊 [CreateMedication] Confidence: ${change.confidence}`);
    console.log(`💊 [CreateMedication] Reasoning: ${change.reasoning || 'Not provided'}`);

    const medicationData = {
      patientId,
      encounterId,
      medicationName: change.medication_name!,
      genericName: null,
      brandName: null,
      dosage: change.dosage_change?.to || "As directed",
      route: "oral",
      frequency: change.frequency_change?.to || "daily",
      rxNormCode: null,
      ndcCode: null,
      clinicalIndication: change.indication_change?.to || null,
      startDate: new Date().toISOString().split('T')[0],
      status: "active",
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      medicationHistory: [historyEntry],
      changeLog: [{
        encounter_id: encounterId,
        timestamp: new Date().toISOString(),
        change_type: "medication_started",
        processing_time_ms: 0
      }],
      groupingStrategy: "medical_problem",
      relatedMedications: [],
      drugInteractions: []
    };

    console.log(`💊 [CreateMedication] Medication data prepared:`);
    console.log(`💊 [CreateMedication]   - Name: ${medicationData.medicationName}`);
    console.log(`💊 [CreateMedication]   - Status: ${medicationData.status}`);
    console.log(`💊 [CreateMedication]   - Start Date: ${medicationData.startDate}`);
    console.log(`💊 [CreateMedication]   - Route: ${medicationData.route}`);
    console.log(`💊 [CreateMedication]   - History entries: ${medicationData.medicationHistory.length}`);
    console.log(`💊 [CreateMedication]   - Change log entries: ${medicationData.changeLog.length}`);

    try {
      console.log(`💊 [CreateMedication] Calling storage.createMedication()...`);
      await storage.createMedication(medicationData);
      
      const createTime = Date.now() - createStartTime;
      console.log(`💊 [CreateMedication] ✅ Medication created successfully in ${createTime}ms`);
      console.log(`💊 [CreateMedication] ✅ New medication "${change.medication_name}" added to patient ${patientId}`);
      
    } catch (error) {
      const errorTime = Date.now() - createStartTime;
      console.error(`💊 [CreateMedication] ❌ Failed to create medication after ${errorTime}ms`);
      console.error(`💊 [CreateMedication] ❌ Error details:`, error);
      console.error(`💊 [CreateMedication] ❌ Medication data that failed:`, JSON.stringify(medicationData, null, 2));
      throw error;
    }
  }

  /**
   * Update existing medication with new history entry
   */
  private async updateExistingMedication(
    change: MedicationChange,
    historyEntry: MedicationHistoryEntry
  ): Promise<void> {
    if (!change.medication_id) return;

    const medication = await storage.getMedicationById(change.medication_id);
    if (!medication) return;

    const existingHistory = medication.medicationHistory as any[] || [];
    const existingChangeLog = medication.changeLog as any[] || [];
    
    const updatedHistory = [...existingHistory, historyEntry];
    const updatedChangeLog = [...existingChangeLog, {
      encounter_id: historyEntry.encounterId!,
      timestamp: new Date().toISOString(),
      change_type: this.mapActionToChangeType(change.action),
      old_dosage: change.dosage_change?.from,
      new_dosage: change.dosage_change?.to,
      old_frequency: change.frequency_change?.from,
      new_frequency: change.frequency_change?.to,
      processing_time_ms: 0
    }];

    const updateData: any = {
      medicationHistory: updatedHistory,
      changeLog: updatedChangeLog,
      lastUpdatedEncounterId: historyEntry.encounterId
    };

    if (change.dosage_change) {
      updateData.dosage = change.dosage_change.to;
    }

    if (change.frequency_change) {
      updateData.frequency = change.frequency_change.to;
    }

    if (change.indication_change) {
      updateData.clinicalIndication = change.indication_change.to;
    }

    await storage.updateMedication(change.medication_id, updateData);
  }

  /**
   * Discontinue medication
   */
  private async discontinueMedication(
    change: MedicationChange,
    historyEntry: MedicationHistoryEntry
  ): Promise<void> {
    if (!change.medication_id) return;

    const medication = await storage.getMedicationById(change.medication_id);
    if (!medication) return;

    const existingHistory = medication.medicationHistory as any[] || [];
    const existingChangeLog = medication.changeLog as any[] || [];

    const updatedHistory = [...existingHistory, historyEntry];
    const updatedChangeLog = [...existingChangeLog, {
      encounter_id: historyEntry.encounterId!,
      timestamp: new Date().toISOString(),
      change_type: "medication_discontinued",
      processing_time_ms: 0
    }];

    await storage.updateMedication(change.medication_id, {
      status: "discontinued",
      endDate: new Date().toISOString().split('T')[0],
      medicationHistory: updatedHistory,
      changeLog: updatedChangeLog,
      lastUpdatedEncounterId: historyEntry.encounterId
    });
  }

  /**
   * Helper methods
   */
  private async getExistingMedications(patientId: number) {
    return await storage.getPatientMedications(patientId);
  }

  private async getEncounterInfo(encounterId: number) {
    const [encounter] = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId));
    return encounter;
  }

  private async getPatientInfo(patientId: number) {
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId));
    return patient;
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private mapActionToHistoryAction(action: string): MedicationHistoryEntry["action"] {
    switch (action) {
      case "NEW_MEDICATION": return "started";
      case "DISCONTINUE": return "discontinued";
      case "UPDATE_DOSAGE":
      case "MODIFY_FREQUENCY": 
      case "CHANGE_INDICATION": return "modified";
      default: return "continued";
    }
  }

  private mapActionToChangeType(action: string): MedicationChangeLogEntry["change_type"] {
    switch (action) {
      case "UPDATE_DOSAGE": return "dosage_changed";
      case "MODIFY_FREQUENCY": return "frequency_changed";
      case "DISCONTINUE": return "medication_discontinued";
      default: return "medication_modified";
    }
  }

  /**
   * Sign encounter - finalize all medication visit entries
   */
  async signEncounter(encounterId: number, providerId: number): Promise<void> {
    console.log(`🔏 [MedicationDelta] Signing medications for encounter ${encounterId}`);
    
    try {
      const medications = await storage.getPatientMedicationsByEncounter(encounterId);
      
      for (const medication of medications) {
        const existingHistory = medication.medicationHistory as any[] || [];
        const updatedHistory = existingHistory.map((entry: MedicationHistoryEntry) => {
          if (entry.encounterId === encounterId && !entry.isSigned) {
            return {
              ...entry,
              isSigned: true,
              signedAt: new Date().toISOString()
            };
          }
          return entry;
        });

        await storage.updateMedication(medication.id, {
          medicationHistory: updatedHistory
        });
      }

      console.log(`✅ [MedicationDelta] Signed ${medications.length} medications for encounter ${encounterId}`);
    } catch (error) {
      console.error(`❌ [MedicationDelta] Error signing encounter:`, error);
      throw error;
    }
  }
}

export const medicationDelta = new MedicationDeltaService();