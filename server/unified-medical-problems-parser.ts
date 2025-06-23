/**
 * Unified Medical Problems Parser Service
 * 
 * Processes medical problems from both SOAP notes and attachments with:
 * - GPT-driven intelligent parsing and conflict resolution
 * - Source attribution and confidence scoring
 * - Visit history transfer during diagnosis evolution
 * - Parallel processing architecture for multiple chart sections
 */

import OpenAI from "openai";
import { db } from "./db.js";
import { medicalProblems, encounters, patients } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

export interface UnifiedVisitHistoryEntry {
  date: string; // DP - authoritative medical event date
  notes: string;
  source: "encounter" | "attachment" | "manual" | "imported_record";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  icd10AtVisit?: string;
  changesMade?: string[];
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
  sourceConfidence?: number;
  sourceNotes?: string;
}

export interface UnifiedProblemChange {
  problem_id?: number; // null if new problem
  action: "ADD_VISIT" | "UPDATE_ICD" | "NEW_PROBLEM" | "EVOLVE_PROBLEM" | "RESOLVE";
  problem_title?: string;
  visit_notes?: string;
  icd10_change?: { from: string; to: string };
  confidence: number;
  source_type: "encounter" | "attachment";
  transfer_visit_history_from?: number; // problem_id to transfer history from
  extracted_date?: string; // ISO date string extracted from attachment content
  consolidation_reasoning?: string; // GPT's reasoning for consolidation decisions
}

export interface UnifiedProcessingResult {
  changes: UnifiedProblemChange[];
  processing_time_ms: number;
  total_problems_affected: number;
  source_summary: {
    encounter_problems: number;
    attachment_problems: number;
    conflicts_resolved: number;
  };
}

export class UnifiedMedicalProblemsParser {
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
    triggerType: "recording_complete" | "manual_edit" | "attachment_processed" = "recording_complete"
  ): Promise<UnifiedProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 [UnifiedMedicalProblems] === UNIFIED PROCESSING START ===`);
    console.log(`🔄 [UnifiedMedicalProblems] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`);
    console.log(`🔄 [UnifiedMedicalProblems] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`);
    console.log(`🔄 [UnifiedMedicalProblems] Trigger: ${triggerType}`);

    try {
      // Get existing context
      const [existingProblems, encounter, patient] = await Promise.all([
        this.getExistingProblems(patientId),
        encounterId ? this.getEncounterInfo(encounterId) : Promise.resolve(null),
        this.getPatientInfo(patientId)
      ]);

      console.log(`🔄 [UnifiedMedicalProblems] Found ${existingProblems.length} existing problems`);

      // Generate unified changes using enhanced GPT prompt
      const changes = await this.generateUnifiedChanges(
        existingProblems,
        soapNote,
        attachmentContent,
        encounter,
        patient,
        providerId,
        triggerType,
        attachmentId
      );

      console.log(`🔄 [UnifiedMedicalProblems] Generated ${changes.length} changes`);

      // Apply changes with visit history transfer logic
      await this.applyUnifiedChanges(changes, patientId, encounterId, attachmentId);

      const processingTime = Date.now() - startTime;
      
      // Calculate source summary
      const sourceSummary = {
        encounter_problems: changes.filter(c => c.source_type === "encounter").length,
        attachment_problems: changes.filter(c => c.source_type === "attachment").length,
        conflicts_resolved: changes.filter(c => c.action === "EVOLVE_PROBLEM").length
      };

      console.log(`✅ [UnifiedMedicalProblems] === PROCESSING COMPLETE ===`);
      console.log(`✅ [UnifiedMedicalProblems] Time: ${processingTime}ms, Changes: ${changes.length}`);
      console.log(`✅ [UnifiedMedicalProblems] Source summary:`, sourceSummary);

      return {
        changes,
        processing_time_ms: processingTime,
        total_problems_affected: changes.length,
        source_summary: sourceSummary
      };

    } catch (error) {
      console.error(`❌ [UnifiedMedicalProblems] Processing error:`, error);
      throw error;
    }
  }

  /**
   * Enhanced GPT prompt for unified processing
   */
  private async generateUnifiedChanges(
    existingProblems: any[],
    soapNote: string | null,
    attachmentContent: string | null,
    encounter: any,
    patient: any,
    providerId: number,
    triggerType: string,
    attachmentId: number | null
  ): Promise<UnifiedProblemChange[]> {
    
    const unifiedPrompt = `
UNIFIED MEDICAL PROBLEMS PROCESSING
You are an expert medical AI that intelligently consolidates medical problems from multiple sources while avoiding duplication.

EXISTING MEDICAL PROBLEMS:
${existingProblems.length === 0 
  ? "NONE - This is a new patient with no existing medical problems" 
  : JSON.stringify(existingProblems.map(p => ({
      id: p.id,
      title: p.problemTitle,
      current_icd10: p.currentIcd10Code,
      status: p.problemStatus,
      visit_history_count: Array.isArray(p.visitHistory) ? p.visitHistory.length : 0
    })))}

DATA SOURCES TO PROCESS:

${soapNote ? `
SOAP NOTE CONTENT (Current Encounter - Source: "encounter"):
${soapNote}

SOAP NOTE PROCESSING RULES:
- This is CURRENT encounter data from ${triggerType}
- PRIMARY RESPONSIBILITY: Consolidate and update existing problems intelligently
- BEFORE creating new problems, systematically check for matches using medical synonyms and ICD code families
- Can UPDATE existing diagnoses when they evolve (e.g., DM2 → DM2 with neuropathy)
- Can ADD new visit entries to existing problems with current encounter details
- Should use action "EVOLVE_PROBLEM" when diagnosis significantly changes (e.g., E11.9 → E11.40)
- Only CREATE new problems when no reasonable match exists in current problem list
- Apply clinical intelligence to recognize condition variations (HTN/Hypertension, DM/Diabetes, etc.)
` : "NO SOAP NOTE PROVIDED"}

${attachmentContent ? `
ATTACHMENT CONTENT (Historical Document - Source: "attachment"):
${attachmentContent}

ATTACHMENT PROCESSING RULES:
- This is HISTORICAL data from attachment ID ${attachmentId}
- PRIMARY RESPONSIBILITY: Enrich existing problems with historical visit data
- MANDATORY CONSOLIDATION FIRST: Before creating any new problem, systematically evaluate if it matches existing problems
- Use advanced medical intelligence to match conditions by meaning, synonyms, abbreviations, and ICD code families
- ADD visit history with historical context to existing problems when condition already exists
- UPDATE existing problems with additional historical visit information and clinical details
- Only CREATE new problems when the condition genuinely doesn't exist in current problem list
- CRITICAL: Extract the PRIMARY document date for ALL medical problems from this attachment
- Look for "Date of Service:", "Date:", "Date/Time:", signature dates, or document headers
- ALL problems from this single attachment should use the SAME extracted document date
- If no specific date found, use null (system will default to current date)
` : "NO ATTACHMENT CONTENT PROVIDED"}

PATIENT CONTEXT:
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${this.calculateAge(patient.dateOfBirth)}
- Processing Date: ${new Date().toISOString()}

MEDICAL INTELLIGENCE CONSOLIDATION RULES:
You must use sophisticated medical knowledge to identify matching conditions. Apply this decision tree systematically:

STEP 1 - EXACT MATCH CHECK:
- Problem titles that are identical or near-identical
- Same ICD-10 codes or codes within the same family (e.g., E11.x family for diabetes)

STEP 2 - MEDICAL SYNONYM MATCHING:
Common medical synonyms you MUST recognize and consolidate:
- HTN = Hypertension = High Blood Pressure = Essential Hypertension
- DM = Diabetes = Type 2 Diabetes = T2DM = Diabetes Mellitus
- COPD = Chronic Obstructive Pulmonary Disease = Emphysema/Chronic Bronchitis
- CAD = Coronary Artery Disease = Ischemic Heart Disease = CHD
- CHF = Congestive Heart Failure = Heart Failure = HF
- CKD = Chronic Kidney Disease = Chronic Renal Disease
- GERD = Gastroesophageal Reflux Disease = Acid Reflux
- OSA = Obstructive Sleep Apnea = Sleep Apnea
- RA = Rheumatoid Arthritis
- OA = Osteoarthritis = Degenerative Joint Disease
- Depression = Major Depressive Disorder = MDD
- Anxiety = Generalized Anxiety Disorder = GAD
- A-Fib = Atrial Fibrillation = AFib
- PE = Pulmonary Embolism
- DVT = Deep Vein Thrombosis = Deep Venous Thrombosis
- UTI = Urinary Tract Infection
- PUD = Peptic Ulcer Disease
- IBS = Irritable Bowel Syndrome

STEP 3 - CLINICAL CONDITION EVOLUTION:
Recognize when conditions are the same problem with progression:
- "Diabetes" → "Diabetes with neuropathy" (same underlying condition, evolved)
- "Hypertension" → "Hypertension with target organ damage" (same condition, progression)
- "Heart Failure" → "Heart Failure with reduced ejection fraction" (same condition, specified)

STEP 4 - ICD-10 CODE FAMILY ANALYSIS:
Conditions sharing ICD-10 prefixes are often the same underlying problem:
- E11.x = Type 2 Diabetes family (E11.9, E11.40, E11.21 are all diabetes variations)
- I10-I15 = Hypertensive diseases
- J44.x = COPD family
- I50.x = Heart failure family

CONFIDENCE-BASED MATCHING THRESHOLDS:
- 95%+ confidence: Definite match, consolidate immediately
- 85-94% confidence: Likely match, consolidate with detailed notes
- 70-84% confidence: Possible match, consolidate if reasonable clinical correlation
- <70% confidence: Different conditions, create new problem

UNIFIED PROCESSING INTELLIGENCE:
1. CONSOLIDATION FIRST: Always attempt to match before creating new problems
2. SOURCE AWARENESS: Track which source contributed each piece of information
3. CONFLICT RESOLUTION: If same condition appears in both sources, prefer current encounter data for diagnosis, attachment data for historical context
4. VISIT HISTORY ENRICHMENT: Attachment data should add rich historical context to existing problems
5. CLINICAL EVOLUTION: Use "EVOLVE_PROBLEM" when diagnosis changes significantly with ICD code family change

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "changes": [
    {
      "action": "NEW_PROBLEM" | "ADD_VISIT" | "UPDATE_ICD" | "EVOLVE_PROBLEM" | "RESOLVE",
      "problem_id": number | null,
      "problem_title": "string",
      "visit_notes": "Clinical notes with consolidation reasoning",
      "icd10_change": {"from": "old_code", "to": "new_code"} | null,
      "confidence": 0.95,
      "source_type": "encounter" | "attachment",
      "transfer_visit_history_from": number | null,
      "extracted_date": "2011-10-07" | null,
      "consolidation_reasoning": "Why this was matched/not matched with existing problems"
    }
  ]
}

ENHANCED EXAMPLES:

1. SOAP has "Type 2 DM with neuropathy" + existing "Type 2 Diabetes" (E11.9):
   {"action": "EVOLVE_PROBLEM", "problem_id": null, "problem_title": "Type 2 diabetes mellitus with diabetic neuropathy", "icd10_change": {"from": "E11.9", "to": "E11.40"}, "source_type": "encounter", "transfer_visit_history_from": 1, "consolidation_reasoning": "Same underlying diabetes condition with complication development, evolved from E11.9 to E11.40"}

2. Attachment with "HTN" + existing "Hypertension" (I10):
   {"action": "ADD_VISIT", "problem_id": 2, "visit_notes": "Historical documentation of hypertension management", "source_type": "attachment", "extracted_date": "2020-03-15", "consolidation_reasoning": "HTN is medical abbreviation for existing Hypertension problem, adding historical context"}

3. Attachment with "High Blood Pressure" + existing "Essential Hypertension":
   {"action": "ADD_VISIT", "problem_id": 2, "visit_notes": "Previous documentation of elevated blood pressure", "source_type": "attachment", "consolidation_reasoning": "High Blood Pressure is synonym for existing Essential Hypertension, consolidated based on medical intelligence"}

4. Attachment with completely new condition "Atrial Fibrillation" + no existing cardiac rhythm problems:
   {"action": "NEW_PROBLEM", "problem_id": null, "problem_title": "Atrial fibrillation", "source_type": "attachment", "extracted_date": "2019-08-22", "consolidation_reasoning": "No existing cardiac rhythm disorders found, creating new problem for A-Fib"}

CRITICAL INSTRUCTION: You must systematically evaluate EVERY medical condition against existing problems using the consolidation rules above. Document your reasoning for each decision in the consolidation_reasoning field. Prioritize consolidation over creation of new problems unless you have strong clinical evidence they are different conditions.
`;

    console.log(`🤖 [UnifiedGPT] Sending unified prompt to GPT-4.1-nano`);
    console.log(`🤖 [UnifiedGPT] Prompt length: ${unifiedPrompt.length} characters`);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: unifiedPrompt }],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from GPT");
      }

      console.log(`🤖 [UnifiedGPT] Response received: ${content.length} characters`);
      console.log(`🤖 [UnifiedGPT] Raw response:`, content);
      
      const parsed = JSON.parse(content);
      const changes = parsed.changes || [];
      
      console.log(`🤖 [UnifiedGPT] Parsed ${changes.length} changes`);
      changes.forEach((change: any, index: number) => {
        console.log(`🤖 [UnifiedGPT] Change ${index + 1}: ${change.action} - ${change.problem_title || 'existing'} (${change.source_type})`);
        if (change.consolidation_reasoning) {
          console.log(`🤖 [UnifiedGPT] 🧠 Reasoning: ${change.consolidation_reasoning}`);
        }
        if (change.extracted_date) {
          console.log(`🤖 [UnifiedGPT] ✅ Extracted date: ${change.extracted_date}`);
        } else {
          console.log(`🤖 [UnifiedGPT] ⚠️ No extracted date found - will use current date`);
        }
      });

      return changes;

    } catch (error) {
      console.error(`❌ [UnifiedGPT] Error:`, error);
      return [];
    }
  }

  /**
   * Apply unified changes with visit history transfer logic
   */
  private async applyUnifiedChanges(
    changes: UnifiedProblemChange[],
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    
    for (const change of changes) {
      try {
        switch (change.action) {
          case "NEW_PROBLEM":
            await this.createUnifiedProblem(change, patientId, encounterId, attachmentId);
            break;

          case "ADD_VISIT":
          case "UPDATE_ICD":
            await this.updateUnifiedProblem(change, encounterId, attachmentId);
            break;

          case "EVOLVE_PROBLEM":
            await this.evolveProblemWithHistoryTransfer(change, patientId, encounterId, attachmentId);
            break;

          case "RESOLVE":
            await this.resolveProblem(change);
            break;
        }
      } catch (error) {
        console.error(`❌ [UnifiedMedicalProblems] Error applying change:`, error);
      }
    }
  }

  /**
   * NEW: Evolve problem with visit history transfer
   * Handles cases like DM2 E11.9 → DM2 with neuropathy E11.40
   */
  private async evolveProblemWithHistoryTransfer(
    change: UnifiedProblemChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    
    console.log(`🔄 [HistoryTransfer] Evolving problem with history transfer`);
    console.log(`🔄 [HistoryTransfer] From problem ID: ${change.transfer_visit_history_from}`);
    console.log(`🔄 [HistoryTransfer] New title: ${change.problem_title}`);

    if (!change.transfer_visit_history_from) {
      console.warn(`⚠️ [HistoryTransfer] No source problem ID provided for evolution`);
      return;
    }

    // Get the old problem to transfer history from
    const [oldProblem] = await db
      .select()
      .from(medicalProblems)
      .where(eq(medicalProblems.id, change.transfer_visit_history_from));

    if (!oldProblem) {
      console.error(`❌ [HistoryTransfer] Source problem ${change.transfer_visit_history_from} not found`);
      return;
    }

    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      // Use extracted date from attachment content
      visitDate = change.extracted_date;
    } else if (encounterId) {
      // Use encounter date for SOAP note content
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      // Fallback to current date
      visitDate = new Date().toISOString().split("T")[0];
    }

    // Transfer existing visit history
    const transferredHistory = Array.isArray(oldProblem.visitHistory) 
      ? [...oldProblem.visitHistory as UnifiedVisitHistoryEntry[]]
      : [];

    // Add new visit entry for this evolution
    const newVisitEntry: UnifiedVisitHistoryEntry = {
      date: visitDate,
      notes: change.visit_notes || `Diagnosis evolved: ${change.icd10_change?.from} → ${change.icd10_change?.to}`,
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      icd10AtVisit: change.icd10_change?.to || "",
      changesMade: ["diagnosis_evolution", "visit_history_transferred"],
      confidence: change.confidence,
      isSigned: false,
      sourceNotes: `Evolved from problem ID ${change.transfer_visit_history_from}`
    };

    transferredHistory.push(newVisitEntry);

    // Create the new evolved problem
    await db.insert(medicalProblems).values({
      patientId,
      problemTitle: change.problem_title!,
      currentIcd10Code: change.icd10_change?.to,
      problemStatus: "active",
      firstDiagnosedDate: oldProblem.firstDiagnosedDate, // Preserve original diagnosis date
      firstEncounterId: oldProblem.firstEncounterId,
      lastUpdatedEncounterId: encounterId,
      visitHistory: transferredHistory,
      changeLog: [{
        encounter_id: encounterId || 0,
        timestamp: new Date().toISOString(),
        change_type: "problem_evolved",
        old_icd10: change.icd10_change?.from,
        new_icd10: change.icd10_change?.to,
        processing_time_ms: 0
      }]
    });

    // Mark old problem as resolved/evolved
    await db
      .update(medicalProblems)
      .set({
        problemStatus: "resolved",
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, change.transfer_visit_history_from));

    console.log(`✅ [HistoryTransfer] Successfully evolved problem ${change.transfer_visit_history_from} → new problem`);
    console.log(`✅ [HistoryTransfer] Transferred ${transferredHistory.length - 1} historical visits + 1 new visit`);
  }

  /**
   * Create new unified problem with source attribution
   */
  private async createUnifiedProblem(
    change: UnifiedProblemChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    
    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      // Use extracted date from attachment content
      visitDate = change.extracted_date;
    } else if (encounterId) {
      // Use encounter date for SOAP note content
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      // Fallback to current date
      visitDate = new Date().toISOString().split("T")[0];
    }

    const visitEntry: UnifiedVisitHistoryEntry = {
      date: visitDate,
      notes: change.visit_notes || "",
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      icd10AtVisit: change.icd10_change?.to || "",
      changesMade: ["initial_diagnosis"],
      confidence: change.confidence,
      isSigned: false,
      sourceConfidence: change.confidence
    };

    await db.insert(medicalProblems).values({
      patientId,
      problemTitle: change.problem_title!,
      currentIcd10Code: change.icd10_change?.to,
      problemStatus: "active",
      firstDiagnosedDate: visitDate,
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      visitHistory: [visitEntry],
      changeLog: [{
        encounter_id: encounterId || 0,
        timestamp: new Date().toISOString(),
        change_type: "problem_created",
        new_icd10: change.icd10_change?.to,
        processing_time_ms: 0
      }]
    });

    console.log(`✅ [UnifiedMedicalProblems] Created problem: ${change.problem_title} (${change.source_type})`);
  }

  /**
   * Update existing problem with unified logic
   */
  private async updateUnifiedProblem(
    change: UnifiedProblemChange,
    encounterId: number | null,
    attachmentId: number | null
  ): Promise<void> {
    
    if (!change.problem_id) return;

    const [existingProblem] = await db
      .select()
      .from(medicalProblems)
      .where(eq(medicalProblems.id, change.problem_id));

    if (!existingProblem) return;

    const visitHistory = Array.isArray(existingProblem.visitHistory) 
      ? existingProblem.visitHistory as UnifiedVisitHistoryEntry[]
      : [];

    // Determine appropriate date for visit history
    let visitDate: string;
    if (change.extracted_date) {
      // Use extracted date from attachment content
      visitDate = change.extracted_date;
    } else if (encounterId) {
      // Use encounter date for SOAP note content
      const encounter = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
      const encounterDate = encounter[0]?.startTime || new Date();
      visitDate = encounterDate.toISOString().split("T")[0];
    } else {
      // Fallback to current date
      visitDate = new Date().toISOString().split("T")[0];
    }

    // Check for existing visit from this source
    const existingVisitIndex = visitHistory.findIndex(visit => {
      if (change.source_type === "encounter") {
        return visit.encounterId === encounterId;
      } else {
        return visit.attachmentId === attachmentId;
      }
    });

    let updatedVisitHistory: UnifiedVisitHistoryEntry[];

    if (existingVisitIndex >= 0) {
      // Update existing visit
      const updatedVisit: UnifiedVisitHistoryEntry = {
        ...visitHistory[existingVisitIndex],
        date: visitDate,
        notes: change.visit_notes || visitHistory[existingVisitIndex].notes,
        icd10AtVisit: change.icd10_change?.to || visitHistory[existingVisitIndex].icd10AtVisit,
        confidence: change.confidence
      };

      updatedVisitHistory = [...visitHistory];
      updatedVisitHistory[existingVisitIndex] = updatedVisit;
    } else {
      // Add new visit
      const newVisitEntry: UnifiedVisitHistoryEntry = {
        date: visitDate,
        notes: change.visit_notes || "",
        source: change.source_type === "attachment" ? "attachment" : "encounter",
        encounterId: encounterId || undefined,
        attachmentId: attachmentId || undefined,
        icd10AtVisit: change.icd10_change?.to || existingProblem.currentIcd10Code || "",
        changesMade: change.icd10_change ? ["diagnosis_evolution"] : ["routine_follow_up"],
        confidence: change.confidence,
        isSigned: false
      };

      updatedVisitHistory = [...visitHistory, newVisitEntry];
    }

    // Update the problem
    await db
      .update(medicalProblems)
      .set({
        currentIcd10Code: change.icd10_change?.to || existingProblem.currentIcd10Code,
        lastUpdatedEncounterId: encounterId,
        visitHistory: updatedVisitHistory,
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(`✅ [UnifiedMedicalProblems] Updated problem ${change.problem_id} (${change.source_type})`);
  }

  /**
   * Resolve problem
   */
  private async resolveProblem(change: UnifiedProblemChange): Promise<void> {
    if (!change.problem_id) return;

    await db
      .update(medicalProblems)
      .set({
        problemStatus: "resolved",
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(`✅ [UnifiedMedicalProblems] Resolved problem ${change.problem_id}`);
  }

  // Helper methods
  private async getExistingProblems(patientId: number) {
    return await db
      .select()
      .from(medicalProblems)
      .where(
        and(
          eq(medicalProblems.patientId, patientId),
          eq(medicalProblems.problemStatus, "active")
        )
      );
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

  private calculateAge(dateOfBirth: any): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    return Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }
}

// Export singleton instance
export const unifiedMedicalProblemsParser = new UnifiedMedicalProblemsParser();