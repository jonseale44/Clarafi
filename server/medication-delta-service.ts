/**
 * Enhanced Medication Delta Processing Service
 * Implements incremental medication history building with GPT-driven medication evolution
 * Enhanced with GPT-powered duplicate detection and chart medication management
 * Mirrors the medical problems delta service architecture
 */

import OpenAI from "openai";
import { db } from "./db.js";
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
  order_id?: number; // ID of the order that triggered this change
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
      console.log(`💊 [MedicationDelta] === STARTING ORDER PROCESSING ===`);
      console.log(`💊 [MedicationDelta] Patient ID: ${patientId}, Encounter ID: ${encounterId}, Provider ID: ${providerId}`);
      
      // Get medication orders for this encounter
      const medicationOrders = await this.getMedicationOrders(encounterId);
      console.log(`💊 [MedicationDelta] Found ${medicationOrders.length} medication orders for encounter ${encounterId}`);
      
      if (medicationOrders.length === 0) {
        console.log(`⚠️ [MedicationDelta] No medication orders found for encounter ${encounterId}`);
        return {
          changes: [],
          processing_time_ms: Date.now() - startTime,
          total_medications_affected: 0,
        };
      }

      // Log all medication orders
      medicationOrders.forEach((order, index) => {
        console.log(`💊 [MedicationDelta] Order ${index + 1}: ${order.medicationName || 'N/A'} (ID: ${order.id}, Status: ${order.orderStatus})`);
      });

      // Get existing medications for context
      const existingMedications = await this.getExistingMedications(patientId);
      console.log(`💊 [MedicationDelta] Found ${existingMedications.length} existing medications for patient ${patientId}`);

      // Process each medication order
      const changes: MedicationChange[] = [];
      for (const order of medicationOrders) {
        console.log(`💊 [MedicationDelta] Processing order ID ${order.id}: ${order.medicationName || 'N/A'}`);
        const change = await this.processIndividualMedicationOrder(
          order,
          existingMedications,
          patientId,
          encounterId,
          providerId,
        );

        if (change) {
          console.log(`💊 [MedicationDelta] Generated change for order ${order.id}: ${change.action} - ${change.medication_name}`);
          changes.push(change);
        } else {
          console.log(`⚠️ [MedicationDelta] No change generated for order ${order.id}`);
        }
      }

      changes.forEach((change, index) => {});

      // Apply changes to database
      console.log(`💊 [MedicationDelta] Applying ${changes.length} changes to database`);
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
    return `UNIFIED MEDICATION PROCESSING - SOAP NOTE DELTA ANALYSIS
You are an expert clinical pharmacist with 20+ years of experience analyzing medication changes in clinical encounters.
Your PRIMARY RESPONSIBILITY is to perform intelligent DELTA ANALYSIS comparing SOAP note content against existing medications.

=== CRITICAL ENCOUNTER DATE INTELLIGENCE ===
This is a CURRENT encounter happening NOW:

ENCOUNTER CONTEXT:
- This SOAP note represents TODAY'S clinical encounter
- Encounter date is provided in the patient context
- ALL medication changes in this note are happening NOW
- Visit history entries should use the current encounter date

DATE EXTRACTION FOR HISTORICAL REFERENCES:
When the SOAP note mentions historical medication events:
- "Started lisinopril 3 months ago" → Create historical visit entry with calculated date
- "Increased metformin last week" → Create visit entry with approximate past date
- "Has been on atorvastatin for 2 years" → Note duration but focus on current status

=== MEDICATION CONSOLIDATION INTELLIGENCE ===
Apply this systematic decision tree for EVERY medication mentioned:

STEP 1 - EXACT MATCH CHECK:
- Same medication name (case-insensitive)
- Include common abbreviations: HCTZ = hydrochlorothiazide, ASA = aspirin, MVI = multivitamin
- Example: "Lisinopril" = "lisinopril" = "LISINOPRIL"

STEP 2 - BRAND/GENERIC MATCHING:
You MUST recognize and consolidate these common pairs:
- Synthroid = levothyroxine
- Glucophage = metformin  
- Zestril/Prinivil = lisinopril
- Norvasc = amlodipine
- Lipitor = atorvastatin
- Crestor = rosuvastatin
- Nexium = esomeprazole
- Prilosec = omeprazole
- Coumadin = warfarin
- Lasix = furosemide
- Toprol XL = metoprolol succinate
- Lopressor = metoprolol tartrate
- Protonix = pantoprazole
- Zoloft = sertraline
- Prozac = fluoxetine

STEP 3 - FORMULATION VARIATIONS:
Recognize as SAME medication requiring history update (not new medication):
- Metoprolol tartrate vs metoprolol succinate (different salts)
- Diltiazem vs Diltiazem CD/ER/XR (different release mechanisms)
- Regular insulin vs insulin glargine (different types but same drug class)

=== DELTA ANALYSIS RULES ===

PRIMARY RESPONSIBILITY: Identify what CHANGED during this encounter
- BEFORE creating new medications, check if existing medication is being modified
- Focus on EXPLICIT changes mentioned in the SOAP note
- DO NOT assume medication continuation unless explicitly stated
- Each identified change should represent NEW information from THIS encounter

CHANGE TYPES TO IDENTIFY:
1. ADD_HISTORY - Medication explicitly mentioned with new clinical information
   • "Patient reports good control on lisinopril"
   • "Metformin well tolerated, no GI upset"
   • "Continuing atorvastatin for hyperlipidemia"

2. UPDATE_DOSAGE - Explicit dosage changes
   • "Increase lisinopril to 20mg daily"
   • "Reduce metformin to 500mg twice daily"
   • Must identify both FROM and TO dosages

3. NEW_MEDICATION - Genuinely new prescriptions
   • "Started on amlodipine 5mg daily"
   • "Adding rosuvastatin 10mg at bedtime"
   • CRITICAL: Verify it's not already in medication list

4. DISCONTINUE - Explicit discontinuation
   • "Stop atorvastatin due to myalgia"
   • "D/C lisinopril, switching to ARB"
   • Must be explicitly stated, never assume

5. MODIFY_FREQUENCY - Timing changes
   • "Change metformin from twice daily to three times daily"
   • "Switch from daily to twice daily dosing"

6. CHANGE_INDICATION - Reason for medication changes
   • "Continue lisinopril for CKD protection (was for HTN)"
   • "Metformin now for prediabetes (was for PCOS)"

=== VISIT HISTORY FORMATTING (ULTRA-CONCISE) ===
Create brief, standardized entries following pharmacy notation:

CURRENT ENCOUNTER ENTRIES:
- "Continues - well tolerated"
- "↑ 20mg QD" (increased dose)
- "↓ 250mg BID" (decreased dose)
- "D/C - myalgia" (discontinued with reason)
- "Started 5mg QHS" (new medication)
- "Good control" (effectiveness note)

HISTORICAL REFERENCES (when mentioned):
- "Started 3mo ago per pt" (historical context)
- "↑ last week per records" (recent history)

STANDARD ABBREVIATIONS (MANDATORY USE):
- QD = once daily, BID = twice daily, TID = three times daily
- QHS = at bedtime, PRN = as needed, QAM = every morning
- D/C = discontinued, AE = adverse effect
- ↑ = increased, ↓ = decreased

=== CONFIDENCE SCORING ===
Base confidence on clarity of information:
- 95-100%: Explicitly stated medication changes with complete details
- 85-94%: Clear medication mentions with most details present
- 70-84%: Medication mentioned but some details missing
- Below 70%: Inferred from context or unclear references

=== CRITICAL SAFETY RULES ===
1. NEVER create duplicate medications - always check existing list first
2. NEVER discontinue without explicit mention in SOAP note
3. PRESERVE all medication history - add to it, don't replace it
4. FLAG potential interactions or safety concerns
5. CONSIDER patient-specific factors (age, kidney function, allergies)

=== RESPONSE FORMAT ===
{
  "encounter_date": "YYYY-MM-DD", 
  "changes": [
    {
      "medication_id": number | null,
      "action": "ADD_HISTORY|UPDATE_DOSAGE|NEW_MEDICATION|DISCONTINUE|MODIFY_FREQUENCY|CHANGE_INDICATION",
      "medication_name": "generic name preferred",
      "brand_name": "if mentioned",
      "history_notes": "ultra-concise pharmacy notation",
      "dosage_change": {"from": "10mg", "to": "20mg"} | null,
      "frequency_change": {"from": "QD", "to": "BID"} | null,
      "indication_change": {"from": "HTN", "to": "HTN + CKD"} | null,
      "confidence": 0.95,
      "reasoning": "Explicit statement in plan: 'Increase lisinopril to 20mg'",
      "safety_flag": "none|interaction|contraindication|caution"
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
      status: relatedOrder?.orderStatus === "approved" ? "active" : "pending", // Use order status to determine medication status
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      sourceOrderId: change.order_id || relatedOrder?.id || null, // Link to source order - use change.order_id first
      medicationHistory: [historyEntry],
      // Add visit history in the format expected by the UI
      visitHistory: [
        {
          encounterId: encounterId,
          date: historyEntry.date,
          notes: historyEntry.notes,
          sourceType: 'encounter',
          orderId: change.order_id, // Track which order created this visit entry
          confidence: historyEntry.confidence || 0.95,
        }
      ],
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
    const existingVisitHistory = (medication.visitHistory as any[]) || [];

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

    // Add visit history entry for UI display with order tracking
    const previousState = {
      dosage: medication.dosage,
      frequency: medication.frequency,
      status: medication.status,
      clinicalIndication: medication.clinicalIndication,
    };

    // Filter out duplicate visits using surgical history pattern
    const filteredVisitHistory = this.filterDuplicateVisitEntries(
      existingVisitHistory,
      historyEntry.encounterId || null,
      null, // No attachment ID for order-based updates
      "encounter"
    );
    
    const updatedVisitHistory = [
      ...filteredVisitHistory,
      {
        encounterId: historyEntry.encounterId,
        date: historyEntry.date,
        notes: historyEntry.notes,
        source: 'order' as const,
        orderId: change.order_id, // Track which order created this visit entry
        confidence: historyEntry.confidence || 0.95,
        previousState, // Store medication state before this change
      }
    ];

    const updateData: any = {
      medicationHistory: updatedHistory,
      visitHistory: updatedVisitHistory,
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
    const existingVisitHistory = (medication.visitHistory as any[]) || [];

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

    // Filter out duplicate visits using surgical history pattern
    const filteredVisitHistory = this.filterDuplicateVisitEntries(
      existingVisitHistory,
      historyEntry.encounterId || null,
      null, // No attachment ID for order-based updates
      "encounter"
    );
    
    // Add visit history entry for discontinuation
    const updatedVisitHistory = [
      ...filteredVisitHistory,
      {
        encounterId: historyEntry.encounterId,
        date: historyEntry.date,
        orderId: change.order_id, // Track which order created this visit entry
        notes: historyEntry.notes,
        sourceType: 'encounter',
        confidence: historyEntry.confidence || 0.95,
      }
    ];

    await storage.updateMedication(change.medication_id, {
      status: "discontinued",
      endDate: new Date().toISOString().split("T")[0],
      medicationHistory: updatedHistory,
      visitHistory: updatedVisitHistory,
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
      order_id: order.id, // Track which order created this change
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

    // Generate meaningful clinical history note based on the changes
    let action: "started" | "continued" | "increased" | "decreased" | "changed" = "changed";
    
    if (order.dosage && existingMedication.dosage && order.dosage !== existingMedication.dosage) {
      // Compare numeric dosages to determine if increased or decreased
      const currentDose = this.extractNumericDose(order.dosage);
      const previousDose = this.extractNumericDose(existingMedication.dosage);
      
      if (currentDose > previousDose) {
        action = "increased";
      } else if (currentDose < previousDose) {
        action = "decreased";
      }
    }
    
    const clinicalNote = this.generateClinicalHistoryNote(order, existingMedication, action);
    change.history_notes = clinicalNote;

    return change;
  }

  /**
   * Create history entry for continuing medication
   */
  private createHistoryChange(
    order: any,
    existingMedication: any,
  ): MedicationChange {
    // Generate meaningful clinical history note
    const clinicalNote = this.generateClinicalHistoryNote(order, existingMedication, "continued");
    
    return {
      medication_id: existingMedication.id,
      order_id: order.id, // Track which order created this change
      action: "ADD_HISTORY",
      medication_name: order.medicationName,
      history_notes: clinicalNote,
      confidence: 0.9,
      reasoning: "Medication continues from previous encounters",
    };
  }

  /**
   * Create new medication change
   */
  private createNewMedicationChange(order: any): MedicationChange {
    // Generate meaningful clinical history note
    const clinicalNote = this.generateClinicalHistoryNote(order, null, "started");
    
    return {
      medication_id: undefined,
      order_id: order.id, // Track which order created this change
      action: "NEW_MEDICATION",
      medication_name: order.medicationName,
      history_notes: clinicalNote,
      confidence: 0.95,
      reasoning: "New medication order",
    };
  }

  /**
   * Generate meaningful clinical history note from order details
   */
  private generateClinicalHistoryNote(
    order: any,
    existingMedication: any,
    action: "started" | "continued" | "increased" | "decreased" | "changed"
  ): string {
    // Extract key details from order
    const medName = order.medicationName || "medication";
    const dosage = order.dosage || "";
    
    // Build the clinical note based on action
    let note = "";
    
    if (action === "started") {
      note = `Started ${medName}`;
      if (dosage) note += ` ${dosage}`;
    } else if (action === "continued") {
      note = `Continued ${medName}`;
      if (dosage) note += ` ${dosage}`;
    } else if (action === "increased") {
      note = `Increased ↑ ${medName}`;
      if (dosage) note += ` to ${dosage}`;
    } else if (action === "decreased") {
      note = `Decreased ↓ ${medName}`;
      if (dosage) note += ` to ${dosage}`;
    } else if (action === "changed") {
      note = `Changed ${medName}`;
      if (dosage) note += ` to ${dosage}`;
    }
    
    return note;
  }

  /**
   * Extract numeric dose from dosage string for comparison
   */
  private extractNumericDose(dosageStr: string): number {
    if (!dosageStr) return 0;
    
    // Extract numeric value from strings like "10mg", "20 mg", "0.5mg"
    const match = dosageStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Convert frequency to medical abbreviation
   */
  private abbreviateFrequency(frequency: string): string {
    const freq = frequency.toLowerCase();
    
    // Common medical abbreviations
    if (freq.includes("once daily") || freq.includes("once a day") || freq.includes("1 time daily")) {
      return "QD";
    } else if (freq.includes("twice daily") || freq.includes("twice a day") || freq.includes("2 times daily")) {
      return "BID";
    } else if (freq.includes("three times daily") || freq.includes("three times a day") || freq.includes("3 times daily")) {
      return "TID";
    } else if (freq.includes("four times daily") || freq.includes("four times a day") || freq.includes("4 times daily")) {
      return "QID";
    } else if (freq.includes("every 8 hours")) {
      return "Q8H";
    } else if (freq.includes("every 12 hours")) {
      return "Q12H";
    } else if (freq.includes("at bedtime") || freq.includes("at night")) {
      return "QHS";
    } else if (freq.includes("as needed") || freq.includes("prn")) {
      return "PRN";
    } else if (freq.includes("every morning")) {
      return "QAM";
    } else if (freq.includes("every evening")) {
      return "QPM";
    }
    
    // Extract frequency from sig if not matched
    const sigMatch = frequency.match(/take\s+\d+\s+\w+\s+(.+?)(?:\s+for|$)/i);
    if (sigMatch) {
      return this.abbreviateFrequency(sigMatch[1]);
    }
    
    // Return original if no match
    return frequency;
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
            gptResponse.document_date, // Pass the document date from GPT
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
   * Process individual medication from attachment with enhanced dual-action capability
   */
  private async processAttachmentMedication(
    medicationData: any,
    patientId: number,
    encounterId: number,
    attachmentId: number,
    providerId: number,
    existingMedications: any[],
    documentDate: string | null,
  ): Promise<any> {
    console.log(
      `💊 [AttachmentMed] Processing medication: ${medicationData.medication_name}`,
    );
    console.log(
      `💊 [AttachmentMed] Action type: ${medicationData.action_type}`,
    );
    console.log(
      `💊 [AttachmentMed] Individual medication date: ${medicationData.medication_date}`,
    );

    const results = [];

    // Use individual medication date if available, fallback to document date
    const effectiveDate = medicationData.medication_date || documentDate;

    // Handle based on GPT's intelligent decision
    switch (medicationData.action_type) {
      case "create_historical":
        // Create only a historical medication entry
        console.log(`💊 [AttachmentMed] Creating historical medication entry`);
        const historical = await this.createMedicationFromAttachment(
          medicationData,
          patientId,
          encounterId,
          attachmentId,
          providerId,
          effectiveDate,
        );
        results.push(historical);
        break;

      case "update_visit_history":
        // Only update existing medication's visit history
        if (medicationData.matched_current_med_id) {
          const currentMed = existingMedications.find(
            m => m.id === medicationData.matched_current_med_id
          );
          if (currentMed) {
            console.log(
              `💊 [AttachmentMed] Updating visit history for medication ID ${currentMed.id}`,
            );
            const visitUpdate = await this.addAttachmentVisitHistory(
              currentMed,
              medicationData,
              attachmentId,
              encounterId,
              effectiveDate,
            );
            results.push(visitUpdate);
          }
        }
        break;

      case "both":
        // Update existing medication with comprehensive visit history (do NOT create new entry)
        console.log(`💊 [AttachmentMed] Updating existing medication with comprehensive history`);
        
        if (medicationData.matched_current_med_id) {
          const currentMed = existingMedications.find(
            m => m.id === medicationData.matched_current_med_id
          );
          if (currentMed) {
            // Update medication with comprehensive visit history from GPT
            const visitUpdate = await this.updateMedicationWithFullHistory(
              currentMed,
              medicationData,
              attachmentId,
              encounterId,
              effectiveDate,
            );
            results.push(visitUpdate);
          } else {
            // If no existing medication found, create new one with full history
            console.log(`💊 [AttachmentMed] No existing medication found, creating new with full history`);
            const newMed = await this.createMedicationFromAttachment(
              medicationData,
              patientId,
              encounterId,
              attachmentId,
              providerId,
              effectiveDate,
            );
            results.push(newMed);
          }
        } else {
          // No matched medication, create new with full history
          console.log(`💊 [AttachmentMed] No matched medication ID, creating new with full history`);
          const newMed = await this.createMedicationFromAttachment(
            medicationData,
            patientId,
            encounterId,
            attachmentId,
            providerId,
            effectiveDate,
          );
          results.push(newMed);
        }
        break;

      default:
        // Fallback to legacy behavior for backward compatibility
        const existingMedication = this.findMatchingMedicationForAttachment(
          medicationData,
          existingMedications,
        );

        if (existingMedication && medicationData.should_consolidate) {
          console.log(
            `💊 [AttachmentMed] Legacy consolidation with existing medication ID ${existingMedication.id}`,
          );
          const result = await this.addAttachmentVisitHistory(
            existingMedication,
            medicationData,
            attachmentId,
            encounterId,
            effectiveDate,
          );
          results.push(result);
        } else {
          console.log(`💊 [AttachmentMed] Legacy creation of new medication`);
          const result = await this.createMedicationFromAttachment(
            medicationData,
            patientId,
            encounterId,
            attachmentId,
            providerId,
            effectiveDate,
          );
          results.push(result);
        }
    }

    return results.length === 1 ? results[0] : results;
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
   * Filter duplicate visit entries using surgical history pattern
   * Prevents duplicate visits for same encounter/attachment
   */
  private filterDuplicateVisitEntries(
    existingVisits: any[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment",
  ): any[] {
    return existingVisits.filter((visit) => {
      // Allow both attachment and encounter entries for the same encounter ID
      if (encounterId && visit.encounterId === encounterId) {
        return visit.source !== sourceType; // Keep if different source type
      }

      // Prevent duplicate attachment entries
      if (attachmentId && visit.sourceId === attachmentId) {
        return false; // Remove duplicate attachment
      }

      return true; // Keep all other entries
    });
  }

  /**
   * Update medication with comprehensive visit history from GPT
   */
  private async updateMedicationWithFullHistory(
    existingMedication: any,
    medicationData: any,
    attachmentId: number,
    encounterId: number,
    extractedDate: string | null,
  ): Promise<any> {
    console.log(
      `💊 [UpdateFullHistory] Updating medication ${existingMedication.id} with comprehensive history`,
    );

    // Get current visit history
    const currentVisitHistory = (existingMedication.visitHistory as any[]) || [];
    
    // If GPT provided comprehensive visit history, use it
    let updatedVisitHistory = currentVisitHistory;
    if (medicationData.visit_history && Array.isArray(medicationData.visit_history) && medicationData.visit_history.length > 0) {
      console.log(`💊 [UpdateFullHistory] Using GPT-provided comprehensive history with ${medicationData.visit_history.length} entries`);
      
      // Convert GPT visit history to database format and merge with existing
      const newEntries = medicationData.visit_history.map((visit: any) => ({
        date: visit.date,
        notes: visit.notes || "Documented in attachment",
        source: "attachment" as const,
        encounterId: encounterId,
        attachmentId: attachmentId
      }));
      
      // Merge with existing history, avoiding duplicates by date
      const existingDates = new Set(currentVisitHistory.map(v => v.date));
      const uniqueNewEntries = newEntries.filter((entry: any) => !existingDates.has(entry.date));
      
      updatedVisitHistory = [...currentVisitHistory, ...uniqueNewEntries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    // Update medication with new visit history and current dosage info
    await storage.updateMedication(existingMedication.id, {
      dosage: medicationData.dosage || existingMedication.dosage,
      frequency: medicationData.frequency || existingMedication.frequency,
      visitHistory: updatedVisitHistory,
      lastUpdatedEncounterId: encounterId,
    });

    return {
      action: "COMPREHENSIVE_HISTORY_UPDATE",
      medicationId: existingMedication.id,
      medicationName: existingMedication.medicationName,
      visitHistoryCount: updatedVisitHistory.length,
    };
  }

  /**
   * Add visit history entry from attachment to existing medication
   */
  private async addAttachmentVisitHistory(
    existingMedication: any,
    medicationData: any,
    attachmentId: number,
    encounterId: number,
    extractedDate: string | null,
  ): Promise<any> {
    console.log(
      `💊 [AttachmentVisitHistory] Adding visit history to medication ${existingMedication.id}`,
    );

    const visitEntry = {
      encounterDate: extractedDate || new Date().toISOString().split("T")[0],
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

    // Get current visit history and filter duplicates
    const currentVisitHistory =
      (existingMedication.visitHistory as any[]) || [];
    
    // Filter out duplicate visits using surgical history pattern
    const filteredVisitHistory = this.filterDuplicateVisitEntries(
      currentVisitHistory,
      encounterId,
      attachmentId,
      "attachment"
    );
    
    const updatedVisitHistory = [...filteredVisitHistory, visitEntry];

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
    extractedDate: string | null,
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

    // Use GPT-extracted visit history if available, otherwise create initial entry
    let initialVisitHistory;
    if (medicationData.visit_history && Array.isArray(medicationData.visit_history) && medicationData.visit_history.length > 0) {
      // Transform GPT visit history to database format
      console.log(`💊 [AttachmentCreate] Using GPT-extracted visit history with ${medicationData.visit_history.length} entries`);
      initialVisitHistory = medicationData.visit_history.map((visit: any) => ({
        encounterDate: visit.date,
        changes: [visit.change_type || "documented"],
        notes: visit.notes || visit.change_type || "Documented in attachment",
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
      })).sort((a: any, b: any) => 
        new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime()
      );
    } else {
      // Fallback to simple entry if no visit history from GPT
      console.log(`💊 [AttachmentCreate] No GPT visit history found, using simple entry`);
      initialVisitHistory = [
        {
          encounterDate: extractedDate || new Date().toISOString().split("T")[0],
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
    }

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
      startDate: extractedDate || new Date().toISOString().split("T")[0],
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
      visitHistory: medicationData.visit_history && Array.isArray(medicationData.visit_history) && medicationData.visit_history.length > 0
        ? medicationData.visit_history.map((visit: any) => ({
            date: visit.date,
            notes: visit.notes || "Documented in attachment",
            source: "attachment" as const,
            encounterId: encounterId,
            attachmentId: attachmentId
          }))
        : [
            {
              date: extractedDate || new Date().toISOString().split("T")[0],
              notes: `Extracted from uploaded document`,
              source: "attachment" as const,
              encounterId: encounterId,
              attachmentId: attachmentId
            }
          ],
      medicationHistory: [
        {
          date: extractedDate || new Date().toISOString().split("T")[0],
          notes: `Extracted from uploaded document`,
          source: "attachment" as const,
          encounterId: encounterId,
          attachmentId: attachmentId
        }
      ],
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
      .values([medicationRecord])
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

    const systemPrompt = `UNIFIED MEDICATION PROCESSING - ATTACHMENT EXTRACTION
You are an expert clinical pharmacist with 20+ years of experience analyzing medical documents.
Your PRIMARY RESPONSIBILITY is to extract medications with intelligent consolidation and historical preservation.

=== INTELLIGENT DATE EXTRACTION (ENHANCED) ===
Extract INDIVIDUAL dates for each medication to preserve historical context:

STEP 1 - DOCUMENT DATE IDENTIFICATION:
First, identify the overall document date for context:
- Headers/footers: "Date of Service: MM/DD/YYYY", "Visit Date: MM/DD/YYYY"
- Provider signatures: "Signed by Dr. X on MM/DD/YYYY"
- Document metadata: Report generation dates (use as fallback)

STEP 2 - INDIVIDUAL MEDICATION DATE EXTRACTION:
CRITICAL: Each medication can have its OWN date based on the document content:
- Medication lists with dates: "03/08/24  Escitalopram 10mg  Take 1 daily"
- Historical entries: "Started metformin 500mg on 1/1/24"
- Change dates: "Increased to 1000mg on 5/15/24"
- Discontinuation dates: "Stopped atorvastatin 6/1/24"
- If a medication has no specific date, use the document date
- If neither exists, return null for that medication's date

STEP 3 - HISTORICAL PRESERVATION:
When you find medications with past dates:
- Include them in the visit_history array of the SINGLE medication entry
- DO NOT create separate historical entries
- Consolidate all doses/dates into ONE comprehensive medication record

=== ENHANCED MEDICATION CONSOLIDATION INTELLIGENCE ===
You have access to the patient's CURRENT medications. Use this to make intelligent decisions:

EXISTING MEDICATIONS PROVIDED:
${existingMedications.map(med => `- ${med.medicationName} ${med.dosage} ${med.frequency} (${med.status}) - started ${med.startDate}`).join('\n')}

CRITICAL WITHIN-DOCUMENT CONSOLIDATION:
When processing medications from THIS document, you MUST consolidate them intelligently:
1. Group all mentions of the same medication (by generic/brand name)
2. Identify the MOST RECENT entry as the current medication
3. Include ALL historical doses/dates in the visit_history array
4. Return ONE entry per unique medication name - NEVER create separate entries for different doses

EXAMPLE - If document contains:
- 3/8/24: Escitalopram 10mg daily
- 7/2/24: Escitalopram 10mg daily  
- 7/19/24: Escitalopram 5mg daily
- 6/7/25: Escitalopram 5mg daily

RETURN EXACTLY ONE ENTRY:
{
  "medication_name": "Escitalopram",
  "dosage": "5mg",
  "frequency": "daily",
  "medication_date": "2025-06-07",
  "action_type": "both",
  "visit_history": [
    {"date": "2024-03-08", "notes": "Started 10mg QD"},
    {"date": "2024-07-02", "notes": "Continued 10mg QD"},
    {"date": "2024-07-19", "notes": "↓ 5mg QD"},
    {"date": "2025-06-07", "notes": "Current 5mg QD"}
  ]
}

STEP 1 - INTELLIGENT DEDUPLICATION:
For EACH medication group:
- If no existing medication matches → Create new with full history from document
- If existing medication matches current dose → Update visit history only
- If existing medication has different dose → Create historical entry AND update current

STEP 2 - BRAND/GENERIC MATCHING:
Recognize these as the SAME medication:
- Synthroid = levothyroxine
- Glucophage = metformin
- Zestril/Prinivil = lisinopril
- Norvasc = amlodipine
- Lipitor = atorvastatin
- Crestor = rosuvastatin
- Nexium = esomeprazole
- Prilosec = omeprazole
- Coumadin = warfarin
- Lasix = furosemide
- Toprol XL = metoprolol succinate
- Lopressor = metoprolol tartrate

STEP 3 - AVOID HISTORICAL DUPLICATES:
DO NOT create separate "historical" medications. Instead:
- When dose differs from current, include it in visit_history array
- When medication was discontinued, note it in visit_history
- Always consolidate into ONE entry per medication name

STEP 4 - VISIT HISTORY UPDATES:
ALWAYS update the current medication's visit history when you find:
- Historical doses or regimens
- Start/stop dates
- Dose changes over time
- Any relevant historical context

EXAMPLE CONSOLIDATION:
Document shows: "1/1/24: Metformin 500mg BID"
Current medication: Metformin 1000mg BID (started 3/3/25)
ACTION:
Update current medication's visit history to include: "1/1/24: Started 500mg BID"
Result: ONE Metformin entry with complete dosing history

=== VISIT HISTORY FORMATTING (ULTRA-CONCISE) ===
Create brief, standardized entries following this exact format:

DOSE CHANGES:
- "Started 10mg QD" (initial prescription)
- "↑ 20mg QD" (increase - use ↑ symbol)
- "↓ 5mg BID" (decrease - use ↓ symbol) 
- "Changed to ER 30mg" (formulation change)

STATUS CHANGES:
- "D/C - resolved" (discontinued, reason)
- "D/C - AE (rash)" (discontinued, adverse effect)
- "Resumed 10mg" (restarted after gap)
- "On hold - surgery" (temporary stop)

STANDARD ABBREVIATIONS (MANDATORY USE):
- QD = once daily, BID = twice daily, TID = three times daily
- QHS = at bedtime, PRN = as needed
- ER/XR/SR = extended/sustained release
- D/C = discontinued, AE = adverse effect

=== EXTRACTION REQUIREMENTS ===
1. Extract ALL medications mentioned (active, discontinued, historical)
2. Capture complete details: name, dose, route, frequency, indication
3. CRITICAL: Extract medication FORM (tablet, capsule, injection, liquid, cream, patch, inhaler, etc.)
   - Look for form in medication lists: "metformin 500mg tablet", "insulin glargine injection"
   - If form not explicitly stated but medication name implies it (e.g., "insulin" → injection)
   - Common forms: tablet, capsule, injection, solution, suspension, cream, ointment, patch, inhaler
4. Determine current status based on document context
5. Note any allergies or intolerances mentioned
6. Include adherence notes if documented

=== CONFIDENCE SCORING ===
Assign confidence based on information clarity:
- 95-100%: Listed in formal medication list/table with all details
- 85-94%: Clearly mentioned in narrative with dose/frequency
- 70-84%: Mentioned without complete details
- Below 70%: Inferred from context or partially visible

=== RESPONSE FORMAT ===
{
  "document_date": "YYYY-MM-DD" or null,  // Overall document date if found
  "date_extraction_source": "header|signature|metadata|not_found",
  "medications": [
    {
      "medication_name": "standardized generic name",
      "brand_name": "if applicable",
      "dosage": "strength per unit (e.g., 10mg)",
      "form": "tablet/capsule/injection/liquid/solution/cream/patch/inhaler/etc",
      "frequency": "QD/BID/TID/etc",
      "route": "PO/IV/IM/SC/topical/inhalation/etc",
      "indication": "concise reason (HTN/DM/etc)",
      "status": "active/discontinued/historical",
      "medication_date": "YYYY-MM-DD",  // Individual date for this medication
      "confidence": 0.95,
      "should_consolidate": true/false,
      "consolidation_reasoning": "Exact match with existing lisinopril entry",
      "extraction_location": "medication list page 2",
      "action_type": "create_historical|update_visit_history|both",  // What to do with this entry
      "matched_current_med_id": 31,  // If updating visit history, which current med to update
      "visit_history_note": "Previously on 500mg BID as of 1/1/24",  // Note to add to current med
      "visit_history": [
        {
          "date": "2024-02-20",
          "notes": "Started 10mg QD",
          "change_type": "initiation"
        },
        {
          "date": "2024-05-15",
          "notes": "↑ 20mg QD",
          "change_type": "dose_increase"
        }
      ]
    }
  ]
}

CRITICAL RESPONSE REQUIREMENTS:
1. You MUST include the "action_type" field for EVERY medication
2. MANDATORY RULE: If you populate the "visit_history" array with ANY entries, you MUST use action_type: "both"
3. Only use action_type: "update_visit_history" when there's NO historical data (empty visit_history array)
4. NEVER use action_type: "create_historical" alone - always consolidate into ONE entry per medication name
5. If the document shows dose changes over time (e.g., "3/8/24: 10mg" → "7/19/24: 5mg"), you MUST:
   - Include ALL dates in visit_history array
   - Set action_type: "both" to preserve this rich history`;

    const userPrompt = `PATIENT CONTEXT:
Age: ${patientContext.age} years
Gender: ${patientContext.gender}

EXISTING MEDICATIONS (${existingMedications.length}):
${existingMedications.length > 0 
  ? existingMedications.map((med) => `- ID:${med.id} ${med.medicationName} ${med.dosage} ${med.frequency} (${med.status})`).join("\n")
  : "No existing medications - this is the first attachment being processed"}

DOCUMENT TO ANALYZE:
${extractedText}

CRITICAL INSTRUCTIONS:
1. Group medications by name (same medication = one response entry)
2. Use the MOST RECENT date as the current medication
3. Include ALL dates in visit_history array
4. ALWAYS include "action_type" field - never omit it
5. If same medication appears with different doses/dates, consolidate intelligently

IMPORTANT: Return ONLY the JSON response with no additional text, explanations, or commentary before or after the JSON.`;

    try {
      const startTime = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
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
          quantityUnit: existingMedication.quantityUnit || this.inferQuantityUnit(existingMedication),
          sig: existingMedication.sig,
          refills: refillData.refills,
          form: existingMedication.dosageForm,
          routeOfAdministration: existingMedication.route,
          daysSupply: refillData.daysSupply,
          clinicalIndication:
            input.clinicalIndication || existingMedication.clinicalIndication,
          priority: "routine",
          providerId: input.requestedBy, // Changed from orderedBy to providerId
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

    if (Array.isArray(existingChartEncounter) && existingChartEncounter.length > 0) {
      return existingChartEncounter[0];
    }

    // Create new chart management encounter
    const [chartEncounter] = await db
      .insert(encounters)
      .values([{
        patientId,
        providerId,
        encounterType: "Chart Management",
        encounterSubtype: "Direct Chart Entry",
        startTime: new Date(),
        encounterStatus: "active",
        chiefComplaint: "Chart medication management",
        note: "Virtual encounter for direct chart medication management",
      }])
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

  /**
   * Intelligently infer quantity unit based on medication form
   */
  private inferQuantityUnit(medication: any): string {
    const form = (medication.dosageForm || medication.form || '').toLowerCase();
    
    // Common form to unit mappings
    const formToUnit: Record<string, string> = {
      'tablet': 'tablets',
      'tablets': 'tablets',
      'capsule': 'capsules',
      'capsules': 'capsules',
      'solution': 'mL',
      'suspension': 'mL',
      'syrup': 'mL',
      'liquid': 'mL',
      'drops': 'mL',
      'inhaler': 'inhalers',
      'patch': 'patches',
      'patches': 'patches',
      'cream': 'grams',
      'ointment': 'grams',
      'gel': 'grams',
      'injection': 'mL',
      'vial': 'vials',
      'suppository': 'suppositories',
      'powder': 'grams',
      'spray': 'sprays',
      'nasal spray': 'sprays',
      'lozenge': 'lozenges',
      'film': 'films'
    };
    
    // Check for exact matches
    for (const [formKey, unit] of Object.entries(formToUnit)) {
      if (form.includes(formKey)) {
        return unit;
      }
    }
    
    // Default to tablets for unknown forms
    return 'tablets';
  }
}

export const medicationDelta = new MedicationDeltaService();
