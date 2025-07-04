/**
 * Enhanced Medication Delta Processing Service
 * Implements incremental medication history building with GPT-driven medication evolution
 * Enhanced with GPT-powered duplicate detection and chart medication management
 * Mirrors the medical problems delta service architecture
 */

import OpenAI from "openai";
import { db } from "./db";
import {
  medications,
  encounters,
  patients,
  medicationFormulary,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "./storage";
import { TokenCostAnalyzer } from "./token-cost-analyzer.js";
import { MedicationStandardizationService } from "./medication-standardization-service.js";

export interface MedicationHistoryEntry {
  date: string; // Authoritative medical event date (encounter date)
  action:
    | "started"
    | "continued"
    | "modified"
    | "discontinued"
    | "held"
    | "resumed";
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
  change_type:
    | "medication_started"
    | "medication_modified"
    | "medication_discontinued"
    | "dosage_changed"
    | "frequency_changed";
  old_dosage?: string;
  new_dosage?: string;
  old_frequency?: string;
  new_frequency?: string;
  processing_time_ms: number;
}

export interface MedicationChange {
  medication_id?: number; // null if new medication
  action:
    | "ADD_HISTORY"
    | "UPDATE_DOSAGE"
    | "NEW_MEDICATION"
    | "DISCONTINUE"
    | "MODIFY_FREQUENCY"
    | "CHANGE_INDICATION";
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
   * Main order processing method - processes medication orders to update patient medications
   */
  async processOrderDelta(
    patientId: number,
    encounterId: number,
    providerId: number,
  ): Promise<MedicationDeltaResult> {
    const startTime = Date.now();

    try {
      // Get medication orders for this encounter
      const medicationOrders = await this.getMedicationOrders(encounterId);

      // Get existing medications for context
      const existingMedications = await this.getExistingMedications(patientId);

      // Process each medication order
      const changes: MedicationChange[] = [];
      for (const order of medicationOrders) {
        const change = await this.processIndividualMedicationOrder(
          order,
          existingMedications,
          patientId,
          encounterId,
          providerId,
        );

        if (change) {
          changes.push(change);
        }
      }

      changes.forEach((change, index) => {});

      // Apply changes to database
      await this.applyChangesToDatabase(
        changes,
        patientId,
        encounterId,
        providerId,
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MedicationDelta] === ORDER PROCESSING COMPLETE ===`);
      console.log(
        `✅ [MedicationDelta] Total time: ${processingTime}ms, Medications affected: ${changes.length}`,
      );

      return {
        changes,
        processing_time_ms: processingTime,
        total_medications_affected: changes.length,
      };
    } catch (error) {
      console.error(`❌ [MedicationDelta] Error in processOrderDelta:`, error);
      console.error(
        `❌ [MedicationDelta] Stack trace:`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Synchronize existing medication records with updated order data
   * Called when orders are directly updated (not via SOAP processing)
   */
  async syncMedicationWithOrder(orderId: number): Promise<void> {
    console.log(
      `🔄 [MedicationSync] === SYNCING MEDICATION WITH ORDER ${orderId} ===`,
    );

    try {
      // Get the updated order
      const order = await storage.getOrder(orderId);
      if (!order || order.orderType !== "medication") {
        console.log(
          `🔄 [MedicationSync] Order ${orderId} not found or not a medication order - skipping sync`,
        );
        return;
      }

      // Find medication records linked to this order
      const linkedMedications = await storage.getMedicationsByOrderId(orderId);

      if (linkedMedications.length === 0) {
        console.log(
          `🔄 [MedicationSync] No medications linked to order ${orderId} - skipping sync`,
        );
        return;
      }

      // Update each linked medication with current order data
      for (const medication of linkedMedications) {
        console.log(
          `🔄 [MedicationSync] Updating medication ${medication.id} with order ${orderId} data`,
        );

        // Map order status to medication status
        const orderStatus = order.orderStatus || "pending";
        const medicationStatus =
          this.mapOrderStatusToMedicationStatus(orderStatus);
        console.log(
          `🔄 [MedicationSync] Order status: ${orderStatus} -> Medication status: ${medicationStatus}`,
        );

        const updatedMedicationData = {
          medicationName: order.medicationName || medication.medicationName,
          dosage: order.dosage || medication.dosage,
          sig: order.sig || medication.sig,
          quantity: order.quantity || medication.quantity,
          totalRefills: order.refills || medication.totalRefills,
          refillsRemaining: order.refills || medication.refillsRemaining,
          daysSupply: order.daysSupply || medication.daysSupply,
          dosageForm: order.form || medication.dosageForm,
          route: order.routeOfAdministration || medication.route,
          clinicalIndication:
            order.clinicalIndication || medication.clinicalIndication,
          status: medicationStatus,
          updatedAt: new Date(),
          lastUpdatedEncounterId: order.encounterId,
        };

        await storage.updateMedication(medication.id, updatedMedicationData);
        console.log(
          `✅ [MedicationSync] Updated medication ${medication.id} with current order data`,
        );
      }

      console.log(
        `✅ [MedicationSync] Completed sync for order ${orderId} - updated ${linkedMedications.length} medications`,
      );
    } catch (error) {
      console.error(
        `❌ [MedicationSync] Error syncing medication with order ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Legacy SOAP processing method - kept for backward compatibility
   * @deprecated Use processOrderDelta instead
   */
  async processSOAPDelta(
    patientId: number,
    encounterId: number,
    soapNote: string,
    providerId: number,
  ): Promise<MedicationDeltaResult> {
    return this.processOrderDelta(patientId, encounterId, providerId);
  }

  /**
   * Generate medication delta changes using GPT analysis
   */
  private async generateDeltaChanges(
    existingMedications: any[],
    soapNote: string,
    encounter: any,
    patient: any,
    providerId: number,
  ): Promise<MedicationChange[]> {
    const gptStartTime = Date.now();
    console.log(`💊 [GPT] === MEDICATION GPT ANALYSIS START ===`);
    console.log(`💊 [GPT] Timestamp: ${new Date().toISOString()}`);
    console.log(`💊 [GPT] Provider ID: ${providerId}`);
    console.log(
      `💊 [GPT] Patient: ${patient?.firstName} ${patient?.lastName} (Age: ${this.calculateAge(patient?.dateOfBirth)})`,
    );
    console.log(
      `💊 [GPT] Existing medications count: ${existingMedications.length}`,
    );

    // Log existing medications for context
    existingMedications.forEach((med, index) => {
      console.log(
        `💊 [GPT] Existing Med ${index + 1}: ${med.medicationName} - ${med.dosage || "no dosage"} - Status: ${med.status} - Last updated: ${med.lastUpdatedEncounterId || "never"}`,
      );
    });

    const systemPrompt = this.buildMedicationDeltaPrompt();
    const userPrompt = this.buildUserPrompt(
      existingMedications,
      soapNote,
      encounter,
      patient,
    );

    console.log(
      `💊 [GPT] System prompt length: ${systemPrompt.length} characters`,
    );
    console.log(`💊 [GPT] User prompt length: ${userPrompt.length} characters`);
    console.log(
      `💊 [GPT] SOAP note segment for analysis: "${soapNote.substring(0, 200)}..."`,
    );

    try {
      console.log(`💊 [GPT] Calling OpenAI GPT-4.1 model...`);
      // Analyze medication changes using GPT-4.1 for complex clinical reasoning
      // Purpose: Advanced model needed for sophisticated medication analysis including drug interactions, dosage changes, and clinical indications
      // Uses low temperature (0.1) and JSON format for precise medication delta tracking and clinical decision support
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 30000,
        response_format: { type: "json_object" },
      });

      const gptCallTime = Date.now() - gptStartTime;
      console.log(`💊 [GPT] OpenAI API call completed in ${gptCallTime}ms`);

      const response = completion.choices[0].message.content;
      console.log(
        `💊 [GPT] Raw response length: ${response?.length || 0} characters`,
      );
      console.log(
        `💊 [GPT] Raw GPT response: ${response?.substring(0, 500)}...`,
      );

      const parsedResponse = JSON.parse(response || "{}");

      console.log(`💊 [GPT] Response parsed successfully`);
      console.log(
        `💊 [GPT] Changes identified: ${parsedResponse.changes?.length || 0}`,
      );

      // Log each identified change in detail
      if (parsedResponse.changes) {
        parsedResponse.changes.forEach(
          (change: MedicationChange, index: number) => {
            console.log(`💊 [GPT] Change ${index + 1}:`);
            console.log(`💊 [GPT]   - Action: ${change.action}`);
            console.log(
              `💊 [GPT]   - Medication: ${change.medication_name || "N/A"}`,
            );
            console.log(
              `💊 [GPT]   - Medication ID: ${change.medication_id || "NEW"}`,
            );
            console.log(`💊 [GPT]   - Confidence: ${change.confidence}`);
            console.log(
              `💊 [GPT]   - Reasoning: ${change.reasoning || "No reasoning provided"}`,
            );
            console.log(
              `💊 [GPT]   - History Notes: ${change.history_notes || "No notes"}`,
            );
            if (change.dosage_change) {
              console.log(
                `💊 [GPT]   - Dosage Change: ${change.dosage_change.from} → ${change.dosage_change.to}`,
              );
            }
            if (change.frequency_change) {
              console.log(
                `💊 [GPT]   - Frequency Change: ${change.frequency_change.from} → ${change.frequency_change.to}`,
              );
            }
            if (change.indication_change) {
              console.log(
                `💊 [GPT]   - Indication Change: ${change.indication_change.from} → ${change.indication_change.to}`,
              );
            }
          },
        );
      }

      const totalGptTime = Date.now() - gptStartTime;
      console.log(`💊 [GPT] === MEDICATION GPT ANALYSIS COMPLETE ===`);
      console.log(`💊 [GPT] Total GPT processing time: ${totalGptTime}ms`);

      return parsedResponse.changes || [];
    } catch (error) {
      const errorTime = Date.now() - gptStartTime;
      console.error(
        `❌ [GPT] Error in GPT analysis after ${errorTime}ms:`,
        error,
      );
      console.error(`❌ [GPT] Error stack trace:`, (error as Error).stack);
      console.error(
        `❌ [GPT] System prompt preview:`,
        systemPrompt.substring(0, 200),
      );
      console.error(
        `❌ [GPT] User prompt preview:`,
        userPrompt.substring(0, 200),
      );
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
    patient: any,
  ): string {
    const patientAge = this.calculateAge(patient.dateOfBirth);

    const medicationsList = existingMedications
      .map(
        (med) =>
          `- ID: ${med.id}, Name: ${med.medicationName}, Dosage: ${med.dosage || "not specified"}, Frequency: ${med.frequency || "not specified"}, Status: ${med.status}, Indication: ${med.clinicalIndication || "not specified"}`,
      )
      .join("\n");

    return `PATIENT CONTEXT:
- Age: ${patientAge} years
- Gender: ${patient.gender}
- Encounter Type: ${encounter.encounterType}
- Encounter Date: ${encounter.startTime}

CURRENT MEDICATIONS:
${medicationsList || "No current medications on file"}

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
    providerId: number,
  ): Promise<void> {
    console.log(`💊 [DB] === DATABASE CHANGES APPLICATION START ===`);
    console.log(`💊 [DB] Total changes to apply: ${changes.length}`);
    console.log(
      `💊 [DB] Patient ID: ${patientId}, Encounter ID: ${encounterId}, Provider ID: ${providerId}`,
    );

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const changeStartTime = Date.now();

      console.log(
        `💊 [DB] --- Processing Change ${i + 1}/${changes.length} ---`,
      );
      console.log(`💊 [DB] Change action: ${change.action}`);
      console.log(
        `💊 [DB] Medication name: ${change.medication_name || "N/A"}`,
      );
      console.log(`💊 [DB] Medication ID: ${change.medication_id || "NEW"}`);
      console.log(`💊 [DB] Confidence level: ${change.confidence}`);

      try {
        await this.applyIndividualChange(
          change,
          patientId,
          encounterId,
          providerId,
        );

        const changeTime = Date.now() - changeStartTime;
        console.log(
          `✅ [DB] Successfully applied change ${i + 1} in ${changeTime}ms`,
        );
        console.log(
          `✅ [DB] Change details: ${change.action} for ${change.medication_name}`,
        );
      } catch (error) {
        const changeTime = Date.now() - changeStartTime;
        console.error(
          `❌ [DB] Failed to apply change ${i + 1} after ${changeTime}ms`,
        );
        console.error(
          `❌ [DB] Failed change: ${change.action} for ${change.medication_name}`,
        );
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
    providerId: number,
  ): Promise<void> {
    const encounter = await this.getEncounterInfo(encounterId);
    const encounterDate = encounter?.startTime;
    const historyEntry: MedicationHistoryEntry = {
      date:
        typeof encounterDate === "string"
          ? encounterDate
          : new Date().toISOString(),
      action: this.mapActionToHistoryAction(change.action),
      notes:
        change.history_notes ||
        change.reasoning ||
        `${change.action} - ${change.medication_name}`,
      encounterId,
      providerId,
      source: "encounter",
      confidence: change.confidence,
      isSigned: false,
    };

    if (change.dosage_change) {
      historyEntry.dosage = change.dosage_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(
        `Dosage changed from ${change.dosage_change.from} to ${change.dosage_change.to}`,
      );
    }

    if (change.frequency_change) {
      historyEntry.frequency = change.frequency_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(
        `Frequency changed from ${change.frequency_change.from} to ${change.frequency_change.to}`,
      );
    }

    if (change.indication_change) {
      historyEntry.indication = change.indication_change.to;
      historyEntry.changesMade = historyEntry.changesMade || [];
      historyEntry.changesMade.push(
        `Indication changed from ${change.indication_change.from} to ${change.indication_change.to}`,
      );
    }

    switch (change.action) {
      case "NEW_MEDICATION":
        await this.createNewMedication(
          change,
          patientId,
          encounterId,
          historyEntry,
        );
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
   * Create new medication record with complete prescription details from orders
   */
  private async createNewMedication(
    change: MedicationChange,
    patientId: number,
    encounterId: number,
    historyEntry: MedicationHistoryEntry,
  ): Promise<void> {
    const createStartTime = Date.now();
    console.log(`💊 [CreateMedication] === CREATING NEW MEDICATION ===`);
    console.log(
      `💊 [CreateMedication] Medication name: ${change.medication_name}`,
    );
    console.log(
      `💊 [CreateMedication] Patient ID: ${patientId}, Encounter ID: ${encounterId}`,
    );

    // Look for matching medication order to get complete prescription details
    const relatedOrder = await this.findMatchingMedicationOrder(
      change.medication_name!,
      encounterId,
    );

    if (relatedOrder) {
      console.log(
        `💊 [CreateMedication] ✅ Found matching order ID ${relatedOrder.id} with complete prescription details`,
      );
      console.log(
        `💊 [CreateMedication] Order details: ${relatedOrder.sig}, Qty: ${relatedOrder.quantity}, Refills: ${relatedOrder.refills}, Days: ${relatedOrder.daysSupply}`,
      );
    } else {
      console.log(
        `💊 [CreateMedication] ⚠️ No matching order found for ${change.medication_name} - using SOAP note data only`,
      );
    }

    // Build comprehensive medication data with prescription details
    const medicationData = {
      patientId,
      encounterId,
      medicationName: change.medication_name!,
      genericName: relatedOrder?.medicationName?.includes("(")
        ? relatedOrder.medicationName.split("(")[0].trim()
        : null,
      brandName: relatedOrder?.medicationName?.includes("(")
        ? relatedOrder.medicationName.match(/\(([^)]+)\)/)?.[1]
        : null,
      dosage: relatedOrder?.dosage || change.dosage_change?.to || "As directed",
      route: relatedOrder?.routeOfAdministration || "oral",
      frequency: change.frequency_change?.to || "daily",
      sig: relatedOrder?.sig || null,
      quantity: relatedOrder?.quantity || null,
      totalRefills: relatedOrder?.refills || null,
      refillsRemaining: relatedOrder?.refills || null,
      daysSupply: relatedOrder?.daysSupply || null,
      dosageForm: relatedOrder?.form || null,
      rxNormCode: null,
      ndcCode: null,
      clinicalIndication:
        relatedOrder?.clinicalIndication ||
        change.indication_change?.to ||
        null,
      startDate: new Date().toISOString().split("T")[0],
      status: "pending", // Start as pending until order is signed
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      sourceOrderId: relatedOrder?.id || null, // Link to source order
      medicationHistory: [historyEntry],
      changeLog: [
        {
          encounter_id: encounterId,
          timestamp: new Date().toISOString(),
          change_type: "medication_pending",
          processing_time_ms: 0,
        },
      ],
      groupingStrategy: "medical_problem",
      relatedMedications: [],
      drugInteractions: [],
    };

    console.log(`💊 [CreateMedication] Medication data prepared:`);
    console.log(
      `💊 [CreateMedication]   - Name: ${medicationData.medicationName}`,
    );
    console.log(`💊 [CreateMedication]   - Status: ${medicationData.status}`);
    console.log(
      `💊 [CreateMedication]   - Start Date: ${medicationData.startDate}`,
    );
    console.log(`💊 [CreateMedication]   - Route: ${medicationData.route}`);
    console.log(
      `💊 [CreateMedication]   - History entries: ${medicationData.medicationHistory.length}`,
    );
    console.log(
      `💊 [CreateMedication]   - Change log entries: ${medicationData.changeLog.length}`,
    );

    try {
      console.log(
        `💊 [CreateMedication] Calling storage.createMedication()...`,
      );
      await storage.createMedication(medicationData);

      const createTime = Date.now() - createStartTime;
      console.log(
        `💊 [CreateMedication] ✅ Medication created successfully in ${createTime}ms`,
      );
      console.log(
        `💊 [CreateMedication] ✅ New medication "${change.medication_name}" added to patient ${patientId}`,
      );
    } catch (error) {
      const errorTime = Date.now() - createStartTime;
      console.error(
        `💊 [CreateMedication] ❌ Failed to create medication after ${errorTime}ms`,
      );
      console.error(`💊 [CreateMedication] ❌ Error details:`, error);
      console.error(
        `💊 [CreateMedication] ❌ Medication data that failed:`,
        JSON.stringify(medicationData, null, 2),
      );
      throw error;
    }
  }

  /**
   * Update existing medication with new history entry
   */
  private async updateExistingMedication(
    change: MedicationChange,
    historyEntry: MedicationHistoryEntry,
  ): Promise<void> {
    if (!change.medication_id) return;

    const medication = await storage.getMedicationById(change.medication_id);
    if (!medication) return;

    const existingHistory = (medication.medicationHistory as any[]) || [];
    const existingChangeLog = (medication.changeLog as any[]) || [];

    const updatedHistory = [...existingHistory, historyEntry];
    const updatedChangeLog = [
      ...existingChangeLog,
      {
        encounter_id: historyEntry.encounterId!,
        timestamp: new Date().toISOString(),
        change_type: this.mapActionToChangeType(change.action),
        old_dosage: change.dosage_change?.from,
        new_dosage: change.dosage_change?.to,
        old_frequency: change.frequency_change?.from,
        new_frequency: change.frequency_change?.to,
        processing_time_ms: 0,
      },
    ];

    const updateData: any = {
      medicationHistory: updatedHistory,
      changeLog: updatedChangeLog,
      lastUpdatedEncounterId: historyEntry.encounterId,
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
    historyEntry: MedicationHistoryEntry,
  ): Promise<void> {
    if (!change.medication_id) return;

    const medication = await storage.getMedicationById(change.medication_id);
    if (!medication) return;

    const existingHistory = (medication.medicationHistory as any[]) || [];
    const existingChangeLog = (medication.changeLog as any[]) || [];

    const updatedHistory = [...existingHistory, historyEntry];
    const updatedChangeLog = [
      ...existingChangeLog,
      {
        encounter_id: historyEntry.encounterId!,
        timestamp: new Date().toISOString(),
        change_type: "medication_discontinued",
        processing_time_ms: 0,
      },
    ];

    await storage.updateMedication(change.medication_id, {
      status: "discontinued",
      endDate: new Date().toISOString().split("T")[0],
      medicationHistory: updatedHistory,
      changeLog: updatedChangeLog,
      lastUpdatedEncounterId: historyEntry.encounterId,
    });
  }

  /**
   * Find matching medication order to get complete prescription details
   */
  private async findMatchingMedicationOrder(
    medicationName: string,
    encounterId: number,
  ): Promise<any | null> {
    try {
      // Get all medication orders for this encounter
      const orders = await storage.getDraftOrdersByEncounter(encounterId);
      const medicationOrders = orders.filter(
        (order: any) => order.orderType === "medication",
      );

      if (medicationOrders.length === 0) {
        return null;
      }

      // Smart matching - look for exact matches, partial matches, generic/brand equivalents
      for (const order of medicationOrders) {
        const orderMedName = (order as any).medicationName?.toLowerCase() || "";
        const targetMedName = medicationName.toLowerCase();

        // Exact match
        if (orderMedName === targetMedName) {
          return order;
        }

        // Partial match (contains)
        if (
          orderMedName.includes(targetMedName) ||
          targetMedName.includes(orderMedName)
        ) {
          return order;
        }

        // Remove common suffixes/prefixes for better matching
        const cleanOrderName = orderMedName
          .replace(
            /\s+(tablet|capsule|mg|mcg|sulfate|hydrochloride|sodium)\b/gi,
            "",
          )
          .trim();
        const cleanTargetName = targetMedName
          .replace(
            /\s+(tablet|capsule|mg|mcg|sulfate|hydrochloride|sodium)\b/gi,
            "",
          )
          .trim();

        if (cleanOrderName === cleanTargetName) {
          return order;
        }
      }

      return null;
    } catch (error) {
      console.error(`💊 [OrderMatch] Error finding matching order:`, error);
      return null;
    }
  }

  /**
   * Get medication orders for an encounter
   */
  private async getMedicationOrders(encounterId: number) {
    console.log(`💊 [GetOrders] === FETCHING MEDICATION ORDERS ===`);
    console.log(`💊 [GetOrders] Encounter ID: ${encounterId}`);

    // Get ALL orders for the encounter (not just draft)
    const allOrders = await storage.getOrdersByEncounter(encounterId);
    console.log(`💊 [GetOrders] Total orders found: ${allOrders.length}`);
    console.log(
      `💊 [GetOrders] All orders:`,
      allOrders.map(
        (o) =>
          `${o.id}: ${o.orderType} - ${o.medicationName || o.labName || o.studyType} (${o.orderStatus})`,
      ),
    );

    // Filter for medication orders regardless of status
    const medicationOrders = allOrders.filter(
      (order: any) => order.orderType === "medication",
    );
    console.log(
      `💊 [GetOrders] Medication orders found: ${medicationOrders.length}`,
    );
    medicationOrders.forEach((order, index) => {
      console.log(
        `💊 [GetOrders] Medication ${index + 1}: ID ${order.id}, Name: ${order.medicationName}, Status: ${order.orderStatus}`,
      );
    });

    return medicationOrders;
  }

  /**
   * Process individual medication order to determine what action to take
   */
  private async processIndividualMedicationOrder(
    order: any,
    existingMedications: any[],
    patientId: number,
    encounterId: number,
    providerId: number,
  ): Promise<MedicationChange | null> {
    console.log(
      `💊 [ProcessOrder] Processing order ${order.id}: ${order.medicationName}`,
    );

    // Find existing medication that matches this order
    const existingMedication = this.findMatchingExistingMedication(
      order,
      existingMedications,
    );

    if (existingMedication) {
      console.log(
        `💊 [ProcessOrder] Found existing medication ID ${existingMedication.id}`,
      );

      // Check if this is an update to existing medication
      if (this.hasSignificantChanges(order, existingMedication)) {
        return this.createUpdateChange(order, existingMedication);
      } else {
        return this.createHistoryChange(order, existingMedication);
      }
    } else {
      console.log(`💊 [ProcessOrder] Creating new medication from order`);
      return this.createNewMedicationChange(order);
    }
  }

  /**
   * Find existing medication that matches the order
   */
  private findMatchingExistingMedication(
    order: any,
    existingMedications: any[],
  ) {
    const orderMedName = order.medicationName?.toLowerCase() || "";

    // First, check for exact order ID match to prevent duplicates
    const exactOrderMatch = existingMedications.find(
      (med) => med.sourceOrderId === order.id,
    );
    if (exactOrderMatch) {
      console.log(
        `💊 [FindMatch] Found exact order ID match: medication ${exactOrderMatch.id} for order ${order.id}`,
      );
      return exactOrderMatch;
    }

    // Then check for medication name matches
    return existingMedications.find((med) => {
      const medName = med.medicationName?.toLowerCase() || "";

      // Exact match
      if (medName === orderMedName) return true;

      // Partial match
      if (medName.includes(orderMedName) || orderMedName.includes(medName))
        return true;

      // Clean name match (remove common suffixes)
      const cleanMedName = medName
        .replace(
          /\s+(tablet|capsule|mg|mcg|sulfate|hydrochloride|sodium)\b/gi,
          "",
        )
        .trim();
      const cleanOrderName = orderMedName
        .replace(
          /\s+(tablet|capsule|mg|mcg|sulfate|hydrochloride|sodium)\b/gi,
          "",
        )
        .trim();

      return cleanMedName === cleanOrderName;
    });
  }

  /**
   * Check if order has significant changes compared to existing medication
   */
  private hasSignificantChanges(order: any, existingMedication: any): boolean {
    // Check dosage changes
    if (order.dosage && order.dosage !== existingMedication.dosage) {
      return true;
    }

    // Check frequency changes (if available)
    if (order.frequency && order.frequency !== existingMedication.frequency) {
      return true;
    }

    // Check clinical indication changes
    if (
      order.clinicalIndication &&
      order.clinicalIndication !== existingMedication.clinicalIndication
    ) {
      return true;
    }

    return false;
  }

  /**
   * Create update change for existing medication
   */
  private createUpdateChange(
    order: any,
    existingMedication: any,
  ): MedicationChange {
    const change: MedicationChange = {
      medication_id: existingMedication.id,
      action: "UPDATE_DOSAGE",
      medication_name: order.medicationName,
      confidence: 0.95,
      reasoning: `Order ${order.id} updates existing medication`,
    };

    if (order.dosage !== existingMedication.dosage) {
      change.dosage_change = {
        from: existingMedication.dosage || "unknown",
        to: order.dosage,
      };
    }

    if (order.frequency && order.frequency !== existingMedication.frequency) {
      change.action = "MODIFY_FREQUENCY";
      change.frequency_change = {
        from: existingMedication.frequency || "unknown",
        to: order.frequency,
      };
    }

    if (order.clinicalIndication !== existingMedication.clinicalIndication) {
      change.action = "CHANGE_INDICATION";
      change.indication_change = {
        from: existingMedication.clinicalIndication || "unknown",
        to: order.clinicalIndication,
      };
    }

    return change;
  }

  /**
   * Create history entry for continuing medication
   */
  private createHistoryChange(
    order: any,
    existingMedication: any,
  ): MedicationChange {
    return {
      medication_id: existingMedication.id,
      action: "ADD_HISTORY",
      medication_name: order.medicationName,
      history_notes: `Order ${order.id} continues existing medication`,
      confidence: 0.9,
      reasoning: "Medication continues from previous encounters",
    };
  }

  /**
   * Create new medication change
   */
  private createNewMedicationChange(order: any): MedicationChange {
    return {
      medication_id: undefined,
      action: "NEW_MEDICATION",
      medication_name: order.medicationName,
      history_notes: `New medication prescribed via order ${order.id}`,
      confidence: 0.95,
      reasoning: "New medication order",
    };
  }

  /**
   * Sign orders and activate pending medications
   */
  async signMedicationOrders(
    encounterId: number,
    orderIds: number[],
    providerId: number,
  ): Promise<void> {
    console.log(`💊 [SignOrders] === MEDICATION ACTIVATION STARTING ===`);
    console.log(`💊 [SignOrders] Encounter ID: ${encounterId}`);
    console.log(`💊 [SignOrders] Order IDs to sign: [${orderIds.join(", ")}]`);
    console.log(`💊 [SignOrders] Provider ID: ${providerId}`);

    try {
      // Get medications that are linked to these orders
      const medications =
        await storage.getPatientMedicationsByEncounter(encounterId);
      console.log(
        `💊 [SignOrders] Found ${medications.length} medications for encounter ${encounterId}`,
      );

      for (const medication of medications) {
        console.log(`💊 [SignOrders] Checking medication ${medication.id}:`);
        console.log(`💊 [SignOrders] - Name: ${medication.medicationName}`);
        console.log(`💊 [SignOrders] - Status: ${medication.status}`);
        console.log(
          `💊 [SignOrders] - Source Order ID: ${medication.sourceOrderId}`,
        );
        console.log(
          `💊 [SignOrders] - Order IDs to activate: [${orderIds.join(", ")}]`,
        );

        if (
          medication.status === "pending" &&
          medication.sourceOrderId &&
          orderIds.includes(medication.sourceOrderId)
        ) {
          console.log(
            `💊 [SignOrders] ✅ ACTIVATING medication ${medication.id}: ${medication.medicationName}`,
          );

          // Update medication to active status
          const existingHistory = (medication.medicationHistory as any[]) || [];
          const updatedHistory = existingHistory.map((entry: any) => {
            if (entry.encounterId === encounterId && !entry.isSigned) {
              return {
                ...entry,
                isSigned: true,
                signedAt: new Date().toISOString(),
                signedBy: providerId,
              };
            }
            return entry;
          });

          await storage.updateMedication(medication.id, {
            status: "active",
            medicationHistory: updatedHistory,
          });

          console.log(
            `💊 [SignOrders] ✅ Successfully activated medication ${medication.id}`,
          );
        } else {
          console.log(
            `💊 [SignOrders] ❌ Skipping medication ${medication.id} - not eligible for activation`,
          );
          if (medication.status !== "pending") {
            console.log(
              `💊 [SignOrders] - Reason: Status is '${medication.status}', not 'pending'`,
            );
          }
          if (!medication.sourceOrderId) {
            console.log(`💊 [SignOrders] - Reason: No source order ID`);
          }
          if (
            medication.sourceOrderId &&
            !orderIds.includes(medication.sourceOrderId)
          ) {
            console.log(
              `💊 [SignOrders] - Reason: Source order ${medication.sourceOrderId} not in sign list`,
            );
          }
        }
      }

      console.log(
        `✅ [SignOrders] Successfully activated medications for signed orders`,
      );
    } catch (error) {
      console.error(`❌ [SignOrders] Error activating medications:`, error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getExistingMedications(patientId: number) {
    return await storage.getPatientMedications(patientId);
  }

  private async getEncounterInfo(encounterId: number) {
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, encounterId));
    return encounter;
  }

  private async getPatientInfo(patientId: number) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));
    return patient;
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  private mapActionToHistoryAction(
    action: string,
  ): MedicationHistoryEntry["action"] {
    switch (action) {
      case "NEW_MEDICATION":
        return "started";
      case "DISCONTINUE":
        return "discontinued";
      case "UPDATE_DOSAGE":
      case "MODIFY_FREQUENCY":
      case "CHANGE_INDICATION":
        return "modified";
      default:
        return "continued";
    }
  }

  private mapActionToChangeType(
    action: string,
  ): MedicationChangeLogEntry["change_type"] {
    switch (action) {
      case "UPDATE_DOSAGE":
        return "dosage_changed";
      case "MODIFY_FREQUENCY":
        return "frequency_changed";
      case "DISCONTINUE":
        return "medication_discontinued";
      default:
        return "medication_modified";
    }
  }

  /**
   * Process medications from attachment document (unified parser integration)
   * Follows same pattern as medical problems, surgical history, etc.
   */
  async processAttachmentMedications(
    attachmentId: number,
    patientId: number,
    encounterId: number,
    extractedText: string,
    providerId: number,
  ): Promise<{ medicationsProcessed: number; changes: any[] }> {
    console.log(
      `💊 [AttachmentMedications] === PROCESSING MEDICATIONS FROM ATTACHMENT ${attachmentId} ===`,
    );
    console.log(
      `💊 [AttachmentMedications] Patient ID: ${patientId}, Text length: ${extractedText.length} characters`,
    );

    try {
      // Get existing medications for consolidation analysis
      const existingMedications = await this.getExistingMedications(patientId);
      console.log(
        `💊 [AttachmentMedications] Found ${existingMedications.length} existing medications for consolidation`,
      );

      // Get patient context for intelligent processing
      const patient = await this.getPatientInfo(patientId);
      const encounter = await this.getEncounterInfo(encounterId);

      // Build comprehensive patient context
      const patientContext = await this.buildPatientContext(patientId);

      // Process medications using GPT with consolidation intelligence
      const gptResponse = await this.callMedicationExtractionGPT(
        extractedText,
        existingMedications,
        patientContext,
        attachmentId,
      );

      console.log(
        `💊 [AttachmentMedications] GPT extracted ${gptResponse.medications?.length || 0} medications`,
      );

      // Apply changes with attachment source attribution
      const changes = [];
      if (gptResponse.medications && gptResponse.medications.length > 0) {
        for (const medicationData of gptResponse.medications) {
          const change = await this.processAttachmentMedication(
            medicationData,
            patientId,
            encounterId,
            attachmentId,
            providerId,
            existingMedications,
          );
          if (change) {
            changes.push(change);
          }
        }
      }

      console.log(
        `💊 [AttachmentMedications] ✅ Successfully processed ${changes.length} medication changes from attachment`,
      );

      return {
        medicationsProcessed: changes.length,
        changes: changes,
      };
    } catch (error) {
      console.error(
        `💊 [AttachmentMedications] ❌ Error processing attachment medications:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process individual medication from attachment
   */
  private async processAttachmentMedication(
    medicationData: any,
    patientId: number,
    encounterId: number,
    attachmentId: number,
    providerId: number,
    existingMedications: any[],
  ): Promise<any> {
    console.log(
      `💊 [AttachmentMed] Processing medication: ${medicationData.medication_name}`,
    );

    // Check for existing medication to consolidate with
    const existingMedication = this.findMatchingMedicationForAttachment(
      medicationData,
      existingMedications,
    );

    if (existingMedication && medicationData.should_consolidate) {
      console.log(
        `💊 [AttachmentMed] Consolidating with existing medication ID ${existingMedication.id}`,
      );
      return this.addAttachmentVisitHistory(
        existingMedication,
        medicationData,
        attachmentId,
        encounterId,
      );
    } else {
      console.log(`💊 [AttachmentMed] Creating new medication from attachment`);
      return this.createMedicationFromAttachment(
        medicationData,
        patientId,
        encounterId,
        attachmentId,
        providerId,
      );
    }
  }

  /**
   * Find matching medication for attachment consolidation
   */
  private findMatchingMedicationForAttachment(
    medicationData: any,
    existingMedications: any[],
  ): any {
    const medName = medicationData.medication_name?.toLowerCase() || "";

    return existingMedications.find((med) => {
      const existingName = med.medicationName?.toLowerCase() || "";

      // Check for exact match or close variations
      if (existingName === medName) return true;
      if (existingName.includes(medName) || medName.includes(existingName))
        return true;

      // Check brand/generic name matches
      if (
        med.brandName?.toLowerCase().includes(medName) ||
        med.genericName?.toLowerCase().includes(medName)
      )
        return true;

      return false;
    });
  }

  /**
   * Add visit history entry from attachment to existing medication
   */
  private async addAttachmentVisitHistory(
    existingMedication: any,
    medicationData: any,
    attachmentId: number,
    encounterId: number,
  ): Promise<any> {
    console.log(
      `💊 [AttachmentVisitHistory] Adding visit history to medication ${existingMedication.id}`,
    );

    const visitEntry = {
      encounterDate: new Date().toISOString().split("T")[0],
      changes: medicationData.changes || [],
      notes: medicationData.notes || `Referenced in document`,
      source: "attachment",
      sourceId: attachmentId,
      encounterId: encounterId,
      confidence: medicationData.confidence || 0.85,
      extractedData: {
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        indication: medicationData.indication,
        status: medicationData.status,
      },
    };

    // Get current visit history and add new entry
    const currentVisitHistory =
      (existingMedication.visitHistory as any[]) || [];
    const updatedVisitHistory = [...currentVisitHistory, visitEntry];

    // Update medication with new visit history
    await storage.updateMedication(existingMedication.id, {
      visitHistory: updatedVisitHistory,
      lastUpdatedEncounterId: encounterId,
    });

    return {
      action: "VISIT_HISTORY_ADDED",
      medicationId: existingMedication.id,
      medicationName: existingMedication.medicationName,
      visitEntry: visitEntry,
    };
  }

  /**
   * Create new medication from attachment
   */
  private async createMedicationFromAttachment(
    medicationData: any,
    patientId: number,
    encounterId: number,
    attachmentId: number,
    providerId: number,
  ): Promise<any> {
    console.log(
      `💊 [AttachmentCreate] Creating new medication: ${medicationData.medication_name}`,
    );

    // Standardize medication data
    const standardized =
      MedicationStandardizationService.standardizeMedicationFromAI(
        medicationData.medication_name,
        medicationData.dosage,
        medicationData.form,
        medicationData.route,
      );

    // Create initial visit history entry
    const initialVisitHistory = [
      {
        encounterDate: new Date().toISOString().split("T")[0],
        changes: ["Extracted from document"],
        notes:
          medicationData.notes || `Medication extracted from uploaded document`,
        source: "attachment",
        sourceId: attachmentId,
        encounterId: encounterId,
        confidence: medicationData.confidence || 0.85,
        extractedData: {
          dosage: medicationData.dosage,
          frequency: medicationData.frequency,
          indication: medicationData.indication,
          status: medicationData.status,
        },
      },
    ];

    // Create medication record with attachment source attribution
    const medicationRecord = {
      patientId,
      encounterId,
      medicationName:
        standardized.medicationName || medicationData.medication_name,
      brandName: standardized.brandName,
      genericName: standardized.genericName,
      dosage: standardized.strength || medicationData.dosage || "As directed",
      strength: standardized.strength,
      dosageForm: standardized.dosageForm,
      route: standardized.route || medicationData.route || "oral",
      frequency: medicationData.frequency || "daily",
      sig: medicationData.sig || null,
      clinicalIndication: medicationData.indication,
      startDate: new Date().toISOString().split("T")[0],
      status:
        medicationData.status === "discontinued" ? "historical" : "active",
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      enteredBy: providerId,
      // Attachment source attribution
      sourceType: "attachment",
      sourceConfidence: medicationData.confidence || 0.85,
      extractedFromAttachmentId: attachmentId,
      sourceNotes: `Extracted from uploaded document`,
      visitHistory: initialVisitHistory,
      medicationHistory: initialVisitHistory,
      changeLog: [
        {
          timestamp: new Date().toISOString(),
          change_type: "medication_started",
          encounter_id: encounterId,
          processing_time_ms: 0,
        },
      ],
    };

    const [newMedication] = await db
      .insert(medications)
      .values(medicationRecord)
      .returning();

    console.log(
      `💊 [AttachmentCreate] ✅ Created medication ${newMedication.id}: ${medicationRecord.medicationName}`,
    );

    return {
      action: "NEW_MEDICATION_FROM_ATTACHMENT",
      medicationId: newMedication.id,
      medicationName: medicationRecord.medicationName,
      sourceType: "attachment",
      attachmentId: attachmentId,
    };
  }

  /**
   * Call GPT for medication extraction from document with enhanced date intelligence
   */
  private async callMedicationExtractionGPT(
    extractedText: string,
    existingMedications: any[],
    patientContext: any,
    attachmentId: number,
  ): Promise<any> {
    console.log(
      `💊 [GPT] Calling GPT for medication extraction (attachment ${attachmentId})`,
    );
    console.log(
      `💊 [GPT] ===== MEDICATION PROCESSING DEBUG INFO =====`,
    );
    console.log(
      `💊 [GPT] Extracted text length: ${extractedText.length} characters`,
    );
    console.log(
      `💊 [GPT] Existing medications count: ${existingMedications.length}`,
    );
    console.log(
      `💊 [GPT] Patient context: Age ${patientContext.age}, Gender ${patientContext.gender}`,
    );
    console.log(
      `💊 [GPT] Text preview (first 500 chars): ${extractedText.substring(0, 500)}...`,
    );
    console.log(
      `💊 [GPT] Text ending (last 500 chars): ...${extractedText.substring(Math.max(0, extractedText.length - 500))}`,
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an expert clinical pharmacist with 20+ years of experience extracting medication information from medical documents. Your task is to identify and consolidate medication data with existing patient medications with sophisticated date intelligence.

CRITICAL DATE EXTRACTION INTELLIGENCE:
- MANDATORY: Extract the PRIMARY document date for ALL medications from this attachment
- Look for "Date of Service:", "Date:", "Date/Time:", signature dates, or document headers
- ALL medications from this single attachment should use the SAME extracted document date
- If no specific date found, use null (system will default to current date)
- Extract medication date ranges when documented (e.g., "started 2/20/24, increased 5/15/24")

CONSOLIDATION RULES:
- AGGRESSIVE CONSOLIDATION: Same medication = same drug name, even if dosage/frequency differs
- Always consolidate if medication names match (Lisinopril = lisinopril = LISINOPRIL)
- Brand/Generic matching: Synthroid should consolidate with levothyroxine
- Combination drugs: List active ingredients separately if documented as separate medications
- DO NOT create duplicate medications for the same drug
- CONSOLIDATE dose changes over time for same medication

EXTRACTION RULES:
- Extract ALL medications mentioned (current, historical, discontinued)
- Include dosage, frequency, route, indication, status
- Mark discontinued medications appropriately
- Extract start dates and dose change dates if mentioned
- Include any medication changes documented with dates
- Create ultra-concise visit history entries for dose changes

VISIT HISTORY INTELLIGENCE:
For medications with documented changes, create ultra-concise visit entries:
- "Started 10mg daily" (initial dose)
- "Increased to 20mg" (dose increase)
- "Decreased to 5mg" (dose decrease) 
- "Discontinued - side effects" (discontinuation)
- "Resumed 15mg daily" (restart)
- Use up/down arrows for dose changes when appropriate

CONFIDENCE SCORING:
- High confidence (0.90+): Explicitly listed in medication list/table
- Medium confidence (0.70-0.89): Mentioned in narrative with clear details
- Lower confidence (0.50-0.69): Inferred from clinical context

RESPONSE FORMAT:
Return JSON with:
{
  "extracted_date": "2024-07-03" | null,
  "medications": [
    {
      "medication_name": "standardized name",
      "dosage": "current strength and amount",
      "frequency": "current frequency",
      "route": "route of administration", 
      "indication": "reason for use",
      "status": "active/discontinued/historical",
      "confidence": 0.85,
      "should_consolidate": true/false,
      "consolidation_reasoning": "why consolidate or create new",
      "notes": "additional context",
      "changes": ["dose/frequency changes with dates"],
      "visit_history": [
        {
          "date": "2024-02-20",
          "notes": "Started 10mg daily",
          "change_type": "started"
        },
        {
          "date": "2024-05-15", 
          "notes": "Increased ↑ to 20mg",
          "change_type": "increased"
        }
      ]
    }
  ]
}`;

    const userPrompt = `PATIENT CONTEXT:
Age: ${patientContext.age} years
Gender: ${patientContext.gender}

EXISTING MEDICATIONS (${existingMedications.length}):
${existingMedications.map((med) => `- ${med.medicationName} ${med.dosage} ${med.frequency} (${med.status})`).join("\n")}

DOCUMENT TO ANALYZE:
${extractedText}

Extract all medications from this document. For each medication, determine if it should consolidate with existing medications or be created as new entry.`;

    try {
      const startTime = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 30000,
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.choices[0]?.message?.content || "{}";

      console.log(`💊 [GPT] Response received in ${processingTime}ms`);
      console.log(
        `💊 [GPT] Response text length: ${responseText.length} characters`,
      );
      console.log(
        `💊 [GPT] Raw response preview: ${responseText.substring(0, 500)}...`,
      );
      console.log(
        `💊 [GPT] Response ending: ...${responseText.substring(Math.max(0, responseText.length - 500))}`,
      );
      console.log(
        `💊 [GPT] Token usage: prompt=${response.usage?.prompt_tokens}, completion=${response.usage?.completion_tokens}, total=${response.usage?.total_tokens}`,
      );

      // Parse JSON response
      console.log(`💊 [GPT] Attempting to parse JSON response...`);
      
      let gptResponse;
      try {
        gptResponse = JSON.parse(responseText);
        console.log(`💊 [GPT] JSON parsing successful`);
        console.log(`💊 [GPT] Medications found in response: ${gptResponse.medications?.length || 0}`);
        console.log(`💊 [GPT] Extracted document date: ${gptResponse.extracted_date || 'none'}`);
      } catch (parseError) {
        console.error(`💊 [GPT] JSON parsing failed:`, parseError);
        console.error(`💊 [GPT] Raw response text that failed to parse:`, responseText);
        throw new Error(`Failed to parse GPT response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      return gptResponse;
    } catch (error) {
      console.error(`💊 [GPT] Error calling GPT:`, error);
      throw error;
    }
  }

  /**
   * Build patient context for GPT processing
   */
  private async buildPatientContext(patientId: number): Promise<any> {
    const patient = await this.getPatientInfo(patientId);

    return {
      age: patient?.dateOfBirth
        ? this.calculateAge(patient.dateOfBirth)
        : "Unknown",
      gender: patient?.gender || "Unknown",
      mrn: patient?.mrn || "Unknown",
    };
  }

  /**
   * Sign encounter - finalize all medication visit entries
   */
  async signEncounter(encounterId: number, providerId: number): Promise<void> {
    console.log(
      `🔏 [MedicationDelta] Signing medications for encounter ${encounterId}`,
    );

    try {
      const medications =
        await storage.getPatientMedicationsByEncounter(encounterId);

      for (const medication of medications) {
        const existingHistory = (medication.medicationHistory as any[]) || [];
        const updatedHistory = existingHistory.map(
          (entry: MedicationHistoryEntry) => {
            if (entry.encounterId === encounterId && !entry.isSigned) {
              return {
                ...entry,
                isSigned: true,
                signedAt: new Date().toISOString(),
              };
            }
            return entry;
          },
        );

        await storage.updateMedication(medication.id, {
          medicationHistory: updatedHistory,
        });
      }

      console.log(
        `✅ [MedicationDelta] Signed ${medications.length} medications for encounter ${encounterId}`,
      );
    } catch (error) {
      console.error(`❌ [MedicationDelta] Error signing encounter:`, error);
      throw error;
    }
  }

  /**
   * Map order status to medication status
   */
  private mapOrderStatusToMedicationStatus(orderStatus: string): string {
    switch (orderStatus?.toLowerCase()) {
      case "draft":
      case "pending":
        return "pending";
      case "approved":
      case "signed":
      case "active":
        return "active";
      case "discontinued":
      case "cancelled":
      case "canceled":
        return "discontinued";
      case "on_hold":
      case "paused":
        return "on_hold";
      default:
        console.log(
          `🔄 [MedicationSync] Unknown order status: ${orderStatus}, defaulting to pending`,
        );
        return "pending";
    }
  }

  // ===== CHART MEDICATION MANAGEMENT WITH GPT INTELLIGENCE =====

  /**
   * Add medication directly to patient chart with GPT-powered duplicate detection
   */
  async addChartMedication(input: {
    patientId: number;
    medicationName: string;
    dosage: string;
    frequency: string;
    route?: string;
    quantity?: number;
    daysSupply?: number;
    refills?: number;
    sig?: string;
    clinicalIndication?: string;
    startDate: string;
    prescriberId: number;
    strength?: string;
    dosageForm?: string;
  }): Promise<any> {
    console.log(
      `💊 [ChartMedication] Adding medication directly to chart for patient ${input.patientId}`,
    );
    console.log(
      `💊 [ChartMedication] Medication: ${input.medicationName} ${input.dosage} ${input.frequency}`,
    );

    try {
      // Validate patient exists
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1);

      if (!patient) {
        throw new Error(`Patient ${input.patientId} not found`);
      }

      // Create virtual encounter for chart-based medication
      const chartEncounter = await this.getOrCreateChartEncounter(
        input.patientId,
        input.prescriberId,
      );

      // Standardize medication using existing service
      const standardizedMedication =
        MedicationStandardizationService.standardizeMedicationFromAI(
          input.medicationName,
          input.dosage,
          input.dosageForm,
          input.route,
        );

      // Get all existing active medications for GPT analysis
      const existingMedications = await this.getAllActiveMedications(
        input.patientId,
      );

      // Use GPT to intelligently detect duplicates vs. different dosages
      const duplicateAnalysis = await this.analyzeForDuplicatesWithGPT(
        {
          medicationName:
            standardizedMedication.medicationName || input.medicationName,
          dosage: input.dosage,
          frequency: input.frequency,
          route: input.route || "oral",
          clinicalIndication: input.clinicalIndication,
        },
        existingMedications,
      );

      if (duplicateAnalysis.isDuplicate) {
        console.log(
          `⚠️ [ChartMedication] GPT detected true duplicate:`,
          duplicateAnalysis.reasoning,
        );
        return {
          success: false,
          duplicateDetected: true,
          duplicateReasoning: duplicateAnalysis.reasoning,
          conflictingMedications: duplicateAnalysis.conflictingMedications,
          recommendations: duplicateAnalysis.recommendations,
        };
      }

      // Insert medication with chart source attribution
      const [newMedication] = await db
        .insert(medications)
        .values({
          patientId: input.patientId,
          encounterId: chartEncounter.id,
          medicationName:
            standardizedMedication.medicationName || input.medicationName,
          genericName: standardizedMedication.genericName,
          brandName: standardizedMedication.brandName,
          dosage: input.dosage,
          strength: standardizedMedication.strength || input.strength,
          dosageForm: standardizedMedication.dosageForm || input.dosageForm,
          route: standardizedMedication.route || input.route || "oral",
          frequency: input.frequency,
          quantity: input.quantity,
          daysSupply: input.daysSupply,
          refillsRemaining: input.refills || 0,
          totalRefills: input.refills || 0,
          sig: input.sig || standardizedMedication.sig,
          clinicalIndication: input.clinicalIndication,
          startDate: input.startDate,
          status: "active",
          prescriber: "Chart Entry",
          prescriberId: input.prescriberId,
          firstEncounterId: chartEncounter.id,
          lastUpdatedEncounterId: chartEncounter.id,
          rxNormCode: standardizedMedication.rxNormCode,
          ndcCode: standardizedMedication.ndcCode,
          reasonForChange: "Direct chart entry",
          changeLog: [
            {
              action: "chart_added",
              timestamp: new Date().toISOString(),
              userId: input.prescriberId,
              details: "Added directly to patient chart",
            },
          ],
        })
        .returning();

      console.log(
        `✅ [ChartMedication] Successfully added medication ${newMedication.id} to chart`,
      );
      console.log(
        `✅ [ChartMedication] GPT Analysis: ${duplicateAnalysis.reasoning}`,
      );

      return {
        success: true,
        medication: newMedication,
        standardizedData: standardizedMedication,
        gptAnalysis: duplicateAnalysis,
      };
    } catch (error) {
      console.error(
        `❌ [ChartMedication] Error adding medication to chart:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Move existing medication to orders for refill
   */
  async moveToOrders(input: {
    medicationId: number;
    encounterId: number;
    quantity?: number;
    daysSupply?: number;
    refills?: number;
    clinicalIndication?: string;
    requestedBy: number;
  }): Promise<any> {
    console.log(
      `🔄 [MoveToOrders] Converting medication ${input.medicationId} to refill order`,
    );

    try {
      // Get existing medication
      const [existingMedication] = await db
        .select()
        .from(medications)
        .where(eq(medications.id, input.medicationId))
        .limit(1);

      if (!existingMedication) {
        throw new Error(`Medication ${input.medicationId} not found`);
      }

      // Calculate intelligent refill quantities
      const refillData = this.calculateRefillQuantities(
        existingMedication,
        input,
      );

      // Create draft order
      const { orders } = await import("../shared/schema.js");

      const [draftOrder] = await db
        .insert(orders)
        .values({
          patientId: existingMedication.patientId,
          encounterId: input.encounterId,
          orderType: "medication",
          orderStatus: "draft",
          medicationName: existingMedication.medicationName,
          dosage: existingMedication.dosage,
          quantity: refillData.quantity,
          sig: existingMedication.sig,
          refills: refillData.refills,
          form: existingMedication.dosageForm,
          routeOfAdministration: existingMedication.route,
          daysSupply: refillData.daysSupply,
          clinicalIndication:
            input.clinicalIndication || existingMedication.clinicalIndication,
          priority: "routine",
          orderedBy: input.requestedBy,
          providerNotes: `Refill for existing medication ID ${input.medicationId}`,
        })
        .returning();

      // Update medication with refill reference
      await db
        .update(medications)
        .set({
          changeLog: sql`COALESCE(change_log, '[]'::jsonb) || ${JSON.stringify([
            {
              action: "moved_to_orders",
              timestamp: new Date().toISOString(),
              userId: input.requestedBy,
              orderId: draftOrder.id,
              details: "Converted to refill order",
            },
          ])}`,
        })
        .where(eq(medications.id, input.medicationId));

      console.log(
        `✅ [MoveToOrders] Created draft order ${draftOrder.id} for medication refill`,
      );

      return {
        success: true,
        draftOrder,
        refillData,
        originalMedication: existingMedication,
      };
    } catch (error) {
      console.error(
        `❌ [MoveToOrders] Error converting medication to order:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search medication formulary for intelligent suggestions
   */
  async searchFormulary(query: string, limit: number = 10): Promise<any[]> {
    console.log(`🔍 [Formulary] Searching for: "${query}"`);

    try {
      const results = await db
        .select()
        .from(medicationFormulary)
        .where(
          sql`
          LOWER(${medicationFormulary.genericName}) LIKE ${`%${query.toLowerCase()}%`} OR
          EXISTS (
            SELECT 1 FROM unnest(${medicationFormulary.brandNames}) AS brand_name
            WHERE LOWER(brand_name) LIKE ${`%${query.toLowerCase()}%`}
          ) OR
          EXISTS (
            SELECT 1 FROM unnest(${medicationFormulary.commonNames}) AS common_name
            WHERE LOWER(common_name) LIKE ${`%${query.toLowerCase()}%`}
          )
        `,
        )
        .orderBy(medicationFormulary.popularityRank)
        .limit(limit);

      console.log(`✅ [Formulary] Found ${results.length} matches`);
      return results;
    } catch (error) {
      console.error(`❌ [Formulary] Search error:`, error);
      return [];
    }
  }

  /**
   * Get all active medications for GPT analysis
   */
  private async getAllActiveMedications(patientId: number): Promise<any[]> {
    return db
      .select()
      .from(medications)
      .where(
        and(
          eq(medications.patientId, patientId),
          eq(medications.status, "active"),
        ),
      )
      .orderBy(medications.medicationName);
  }

  /**
   * GPT-powered intelligent duplicate detection
   * Handles complex scenarios like different dosages of same medication
   */
  private async analyzeForDuplicatesWithGPT(
    proposedMedication: {
      medicationName: string;
      dosage: string;
      frequency: string;
      route: string;
      clinicalIndication?: string;
    },
    existingMedications: any[],
  ): Promise<{
    isDuplicate: boolean;
    reasoning: string;
    conflictingMedications?: any[];
    recommendations?: string[];
  }> {
    if (existingMedications.length === 0) {
      return {
        isDuplicate: false,
        reasoning: "No existing medications to compare against",
      };
    }

    console.log(
      `🤖 [GPT-DuplicateAnalysis] Analyzing ${proposedMedication.medicationName} against ${existingMedications.length} existing medications`,
    );

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert clinical pharmacist with 20 years of experience in medication management and drug interactions. Your task is to analyze whether a proposed medication represents a true duplicate that should be prevented, or a legitimate different prescription (like different dosages of the same drug).

CRITICAL DISTINCTIONS:
- LEGITIMATE SCENARIOS (NOT duplicates):
  * Same medication, different dosages (e.g., Glyburide 5mg + Glyburide 10mg for complex diabetes management)
  * Same medication, different formulations (e.g., Metformin XR + Metformin immediate release)
  * Same medication, different routes (e.g., oral vs topical preparation)
  * Same medication for different indications (e.g., Aspirin 81mg for cardioprotection + Aspirin 325mg PRN pain)

- TRUE DUPLICATES (should be prevented):
  * Identical medication, dosage, frequency, and route
  * Same generic drug under different brand names with same dosage
  * Therapeutically equivalent medications that would cause overdose

ANALYSIS REQUIREMENTS:
1. Compare proposed medication against each existing medication
2. Consider clinical appropriateness of multiple formulations/dosages
3. Identify potential therapeutic duplication vs. legitimate polypharmacy
4. Provide clear clinical reasoning for your decision

Respond with a JSON object containing:
{
  "isDuplicate": boolean,
  "reasoning": "Detailed clinical explanation of your decision",
  "conflictingMedications": [array of medication IDs that conflict],
  "recommendations": [array of clinical recommendations if applicable]
}`,
          },
          {
            role: "user",
            content: `PROPOSED MEDICATION:
Name: ${proposedMedication.medicationName}
Dosage: ${proposedMedication.dosage}
Frequency: ${proposedMedication.frequency}
Route: ${proposedMedication.route}
Clinical Indication: ${proposedMedication.clinicalIndication || "Not specified"}

EXISTING MEDICATIONS:
${existingMedications
  .map(
    (med, index) => `
${index + 1}. ID: ${med.id}
   Name: ${med.medicationName} (Generic: ${med.genericName || "Not specified"})
   Dosage: ${med.dosage}
   Strength: ${med.strength || "Not specified"}
   Form: ${med.dosageForm || "Not specified"}
   Route: ${med.route || "Not specified"}
   Frequency: ${med.frequency}
   Indication: ${med.clinicalIndication || "Not specified"}
   Status: ${med.status}
`,
  )
  .join("")}

Please analyze whether this proposed medication represents a true duplicate that should be prevented.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from GPT");
      }

      // Parse GPT response
      const analysis = JSON.parse(response);

      console.log(
        `✅ [GPT-DuplicateAnalysis] Decision: ${analysis.isDuplicate ? "DUPLICATE DETECTED" : "NO DUPLICATE"}`,
      );
      console.log(
        `✅ [GPT-DuplicateAnalysis] Reasoning: ${analysis.reasoning}`,
      );

      return analysis;
    } catch (error) {
      console.error(`❌ [GPT-DuplicateAnalysis] Error:`, error);

      // Fallback to conservative approach if GPT fails
      const simpleNameMatch = existingMedications.find(
        (med) =>
          med.medicationName
            ?.toLowerCase()
            .includes(proposedMedication.medicationName.toLowerCase()) ||
          proposedMedication.medicationName
            .toLowerCase()
            .includes(med.medicationName?.toLowerCase() || ""),
      );

      return {
        isDuplicate: !!simpleNameMatch,
        reasoning: simpleNameMatch
          ? `GPT analysis failed, but found potential name match with existing medication: ${simpleNameMatch.medicationName}. Manual review recommended.`
          : "GPT analysis failed, no obvious name matches found. Manual review recommended.",
        conflictingMedications: simpleNameMatch ? [simpleNameMatch] : [],
      };
    }
  }

  /**
   * Get or create a virtual "Chart Management" encounter for direct medication management
   */
  private async getOrCreateChartEncounter(
    patientId: number,
    providerId: number,
  ): Promise<any> {
    // Look for existing chart management encounter
    const existingChartEncounter = await db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.patientId, patientId),
          eq(encounters.encounterType, "Chart Management"),
        ),
      )
      .limit(1);

    if (existingChartEncounter.length > 0) {
      return existingChartEncounter[0];
    }

    // Create new chart management encounter
    const [chartEncounter] = await db
      .insert(encounters)
      .values({
        patientId,
        providerId,
        encounterType: "Chart Management",
        encounterSubtype: "Direct Chart Entry",
        startTime: new Date(),
        encounterStatus: "active",
        chiefComplaint: "Chart medication management",
        note: "Virtual encounter for direct chart medication management",
      })
      .returning();

    console.log(
      `📋 [ChartEncounter] Created chart management encounter ${chartEncounter.id}`,
    );
    return chartEncounter;
  }

  /**
   * Calculate intelligent refill quantities based on existing medication
   */
  private calculateRefillQuantities(medication: any, input: any) {
    // Use provided values or intelligent defaults
    const quantity =
      input.quantity ||
      medication.quantity ||
      this.calculateDefaultQuantity(medication);
    const daysSupply = input.daysSupply || medication.daysSupply || 30; // Default 30-day supply
    const refills =
      input.refills !== undefined
        ? input.refills
        : medication.refillsRemaining > 0
          ? medication.refillsRemaining
          : 5; // Default 5 refills

    return { quantity, daysSupply, refills };
  }

  /**
   * Calculate default quantity based on frequency and days supply
   */
  private calculateDefaultQuantity(medication: any): number {
    const daysSupply = medication.daysSupply || 30;
    const frequency = medication.frequency?.toLowerCase() || "";

    // Parse frequency to daily count
    let dailyCount = 1; // Default
    if (
      frequency.includes("twice") ||
      frequency.includes("bid") ||
      frequency.includes("2")
    ) {
      dailyCount = 2;
    } else if (
      frequency.includes("three") ||
      frequency.includes("tid") ||
      frequency.includes("3")
    ) {
      dailyCount = 3;
    } else if (
      frequency.includes("four") ||
      frequency.includes("qid") ||
      frequency.includes("4")
    ) {
      dailyCount = 4;
    }

    return daysSupply * dailyCount;
  }
}

export const medicationDelta = new MedicationDeltaService();
