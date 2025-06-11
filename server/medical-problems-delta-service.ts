/**
 * Medical Problems Delta Processing Service
 * Implements incremental visit history building with GPT-driven diagnosis evolution
 * Based on JSONB approach for optimal performance
 */

import OpenAI from "openai";
import { db } from "./db";
import { medicalProblems, encounters, patients } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface VisitHistoryEntry {
  encounter_id: number;
  date: string;
  notes: string;
  icd10_at_visit: string;
  provider: string;
  changes_made: string[];
  confidence: number;
  is_signed: boolean;
  signed_by?: number;
  signed_at?: string;
}

export interface ChangeLogEntry {
  encounter_id: number;
  timestamp: string;
  change_type: "visit_added" | "icd10_updated" | "problem_created" | "problem_resolved";
  old_icd10?: string;
  new_icd10?: string;
  processing_time_ms: number;
}

export interface ProblemChange {
  problem_id?: number; // null if new problem
  action: "ADD_VISIT" | "UPDATE_ICD" | "NEW_PROBLEM" | "RESOLVE";
  problem_title?: string;
  visit_notes?: string;
  icd10_change?: { from: string; to: string };
  confidence: number;
}

export interface DeltaProcessingResult {
  changes: ProblemChange[];
  processing_time_ms: number;
  total_problems_affected: number;
}

export class MedicalProblemsDeltaService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process SOAP note incrementally to identify medical problem changes
   * Only analyzes what changed, not full rewrite
   */
  async processSOAPDelta(
    patientId: number,
    encounterId: number,
    soapNote: string,
    providerId: number
  ): Promise<DeltaProcessingResult> {
    const startTime = Date.now();
    console.log(`🏥 [DeltaService] === DELTA PROCESSING START ===`);
    console.log(`🏥 [DeltaService] Patient ID: ${patientId}, Encounter ID: ${encounterId}, Provider ID: ${providerId}`);
    console.log(`🏥 [DeltaService] SOAP Note length: ${soapNote.length} characters`);

    try {
      // Get existing medical problems for context
      console.log(`🏥 [DeltaService] Fetching existing medical problems...`);
      const existingProblems = await this.getExistingProblems(patientId);
      console.log(`🏥 [DeltaService] Found ${existingProblems.length} existing medical problems`);
      
      // Get encounter and patient info
      console.log(`🏥 [DeltaService] Fetching encounter and patient info...`);
      const [encounter, patient] = await Promise.all([
        this.getEncounterInfo(encounterId),
        this.getPatientInfo(patientId)
      ]);
      console.log(`🏥 [DeltaService] Patient: ${patient.firstName} ${patient.lastName}, Age: ${this.calculateAge(patient.dateOfBirth)}`);
      console.log(`🏥 [DeltaService] Encounter: ${encounter.encounterType}, Status: ${encounter.encounterStatus}`);

      // Generate delta changes using GPT
      console.log(`🏥 [DeltaService] Starting GPT delta analysis...`);
      const changes = await this.generateDeltaChanges(
        existingProblems,
        soapNote,
        encounter,
        patient,
        providerId
      );
      console.log(`🏥 [DeltaService] GPT analysis completed. Generated ${changes.length} changes:`);
      changes.forEach((change, index) => {
        console.log(`🏥 [DeltaService] Change ${index + 1}: ${change.action} - ${change.problem_title || 'existing problem'} (confidence: ${change.confidence})`);
      });

      // Apply changes optimistically to database
      console.log(`🏥 [DeltaService] Applying ${changes.length} changes to database...`);
      await this.applyChangesToDatabase(changes, patientId, encounterId);
      console.log(`🏥 [DeltaService] Database changes applied successfully`);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [DeltaService] === DELTA PROCESSING COMPLETE ===`);
      console.log(`✅ [DeltaService] Total time: ${processingTime}ms, Problems affected: ${changes.length}`);

      return {
        changes,
        processing_time_ms: processingTime,
        total_problems_affected: changes.length
      };

    } catch (error) {
      console.error(`❌ [DeltaService] Error in processSOAPDelta:`, error);
      console.error(`❌ [DeltaService] Stack trace:`, error.stack);
      throw error;
    }
  }

  /**
   * Sign encounter - finalizes all visit history entries for this encounter
   */
  async signEncounter(encounterId: number, providerId: number): Promise<void> {
    try {
      // Update all visit history entries for this encounter to signed status
      const problems = await db.select()
        .from(medicalProblems)
        .where(eq(medicalProblems.lastUpdatedEncounterId, encounterId));

      for (const problem of problems) {
        const visitHistory = problem.visitHistory as VisitHistoryEntry[];
        const updatedHistory = visitHistory.map(visit => {
          if (visit.encounter_id === encounterId && !visit.is_signed) {
            return {
              ...visit,
              is_signed: true,
              signed_by: providerId,
              signed_at: new Date().toISOString()
            };
          }
          return visit;
        });

        await db.update(medicalProblems)
          .set({
            visitHistory: updatedHistory,
            updatedAt: new Date()
          })
          .where(eq(medicalProblems.id, problem.id));
      }

      console.log(`[MedicalProblemsDelta] Signed encounter ${encounterId} for ${problems.length} problems`);

    } catch (error) {
      console.error("Error signing encounter:", error);
      throw error;
    }
  }

  /**
   * Get patient's medical problems for context
   */
  private async getExistingProblems(patientId: number) {
    return await db.select()
      .from(medicalProblems)
      .where(and(
        eq(medicalProblems.patientId, patientId),
        eq(medicalProblems.problemStatus, "active")
      ));
  }

  /**
   * Generate delta changes using GPT analysis
   */
  private async generateDeltaChanges(
    existingProblems: any[],
    soapNote: string,
    encounter: any,
    patient: any,
    providerId: number
  ): Promise<ProblemChange[]> {

    const deltaPrompt = `
CURRENT MEDICAL PROBLEMS (DO NOT REWRITE):
${JSON.stringify(existingProblems.map(p => ({
  id: p.id,
  title: p.problemTitle,
  current_icd10: p.currentIcd10Code,
  status: p.problemStatus
})))}

NEW SOAP NOTE CONTENT:
${soapNote}

PATIENT CONTEXT:
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${this.calculateAge(patient.dateOfBirth)}
- Encounter Date: ${encounter.startTime}

TASK: Identify ONLY what changed in this visit. Return minimal updates in this exact JSON format:
{
  "changes": [
    {
      "problem_id": 123, // null if new problem
      "action": "ADD_VISIT" | "UPDATE_ICD" | "NEW_PROBLEM" | "RESOLVE",
      "problem_title": "Type 2 diabetes", // required for NEW_PROBLEM
      "visit_notes": "A1c at goal. Continue metformin 1000mg BID, glyburide 5mg daily.",
      "icd10_change": { "from": "E11.0", "to": "E11.41" }, // only if diagnosis evolved
      "confidence": 0.95
    }
  ]
}

RULES:
1. DO NOT return full problem lists - only changes from this visit
2. If diabetes develops neuropathy, evolve E11.0 → E11.41 (your decision, not hardcoded)
3. Visit notes should be concise clinical summary for this encounter only
4. Only include problems mentioned or affected in this SOAP note
5. Use highest complexity ICD-10 code when conditions evolve
6. Return empty changes array if no medical problems are discussed

Respond with ONLY the JSON, no other text.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: deltaPrompt }],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content?.trim();
      if (!content) {
        return [];
      }

      const result = JSON.parse(content);
      return result.changes || [];

    } catch (error) {
      console.error("Error generating delta changes:", error);
      return [];
    }
  }

  /**
   * Apply changes to database with optimistic updates
   */
  private async applyChangesToDatabase(
    changes: ProblemChange[],
    patientId: number,
    encounterId: number
  ): Promise<void> {

    for (const change of changes) {
      try {
        switch (change.action) {
          case "NEW_PROBLEM":
            await this.createNewProblem(change, patientId, encounterId);
            break;
          
          case "ADD_VISIT":
          case "UPDATE_ICD":
            await this.updateExistingProblem(change, encounterId);
            break;
          
          case "RESOLVE":
            await this.resolveProblem(change);
            break;
        }
      } catch (error) {
        console.error(`Error applying change for problem ${change.problem_id}:`, error);
      }
    }
  }

  /**
   * Create new medical problem with initial visit entry
   */
  private async createNewProblem(
    change: ProblemChange,
    patientId: number,
    encounterId: number
  ): Promise<void> {

    const visitEntry: VisitHistoryEntry = {
      encounter_id: encounterId,
      date: new Date().toISOString(),
      notes: change.visit_notes || "",
      icd10_at_visit: change.icd10_change?.to || "",
      provider: "Dr. Provider", // TODO: Get actual provider name
      changes_made: ["initial_diagnosis"],
      confidence: change.confidence,
      is_signed: false
    };

    const changeLogEntry: ChangeLogEntry = {
      encounter_id: encounterId,
      timestamp: new Date().toISOString(),
      change_type: "problem_created",
      new_icd10: change.icd10_change?.to,
      processing_time_ms: 0
    };

    await db.insert(medicalProblems).values({
      patientId,
      problemTitle: change.problem_title!,
      currentIcd10Code: change.icd10_change?.to,
      problemStatus: "active",
      firstDiagnosedDate: new Date().toISOString().split('T')[0],
      firstEncounterId: encounterId,
      lastUpdatedEncounterId: encounterId,
      visitHistory: [visitEntry],
      changeLog: [changeLogEntry]
    });

    console.log(`[MedicalProblemsDelta] Created new problem: ${change.problem_title}`);
  }

  /**
   * Update existing problem with new visit entry
   */
  private async updateExistingProblem(
    change: ProblemChange,
    encounterId: number
  ): Promise<void> {

    if (!change.problem_id) return;

    const [existingProblem] = await db.select()
      .from(medicalProblems)
      .where(eq(medicalProblems.id, change.problem_id));

    if (!existingProblem) return;

    const visitHistory = existingProblem.visitHistory as VisitHistoryEntry[];
    const changeLog = existingProblem.changeLog as ChangeLogEntry[];

    // Add new visit entry
    const newVisitEntry: VisitHistoryEntry = {
      encounter_id: encounterId,
      date: new Date().toISOString(),
      notes: change.visit_notes || "",
      icd10_at_visit: change.icd10_change?.to || existingProblem.currentIcd10Code || "",
      provider: "Dr. Provider", // TODO: Get actual provider name
      changes_made: change.icd10_change ? ["diagnosis_evolution"] : ["routine_follow_up"],
      confidence: change.confidence,
      is_signed: false
    };

    const newChangeLogEntry: ChangeLogEntry = {
      encounter_id: encounterId,
      timestamp: new Date().toISOString(),
      change_type: change.action === "UPDATE_ICD" ? "icd10_updated" : "visit_added",
      old_icd10: change.icd10_change?.from,
      new_icd10: change.icd10_change?.to,
      processing_time_ms: 0
    };

    // Update problem with new visit history
    await db.update(medicalProblems)
      .set({
        currentIcd10Code: change.icd10_change?.to || existingProblem.currentIcd10Code,
        lastUpdatedEncounterId: encounterId,
        visitHistory: [...visitHistory, newVisitEntry],
        changeLog: [...changeLog, newChangeLogEntry],
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(`[MedicalProblemsDelta] Updated problem ${change.problem_id} with visit entry`);
  }

  /**
   * Resolve medical problem
   */
  private async resolveProblem(change: ProblemChange): Promise<void> {
    if (!change.problem_id) return;

    await db.update(medicalProblems)
      .set({
        problemStatus: "resolved",
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(`[MedicalProblemsDelta] Resolved problem ${change.problem_id}`);
  }

  /**
   * Get encounter information
   */
  private async getEncounterInfo(encounterId: number) {
    const [encounter] = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId));
    return encounter;
  }

  /**
   * Get patient information
   */
  private async getPatientInfo(patientId: number) {
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId));
    return patient;
  }

  /**
   * Calculate patient age
   */
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
}

export const medicalProblemsDelta = new MedicalProblemsDeltaService();