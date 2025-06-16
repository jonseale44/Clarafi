/**
 * Medical Problems Delta Processing Service
 * Implements incremental visit history building with GPT-driven diagnosis evolution
 * Based on JSONB approach for optimal performance
 */

import OpenAI from "openai";
import { db } from "./db";
import { medicalProblems, encounters, patients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { TokenCostAnalyzer } from "./token-cost-analyzer.js";

export interface VisitHistoryEntry {
  date: string; // DP - authoritative medical event date (encounter date)
  notes: string;
  source: "encounter" | "manual" | "imported_record";
  encounterId?: number;
  providerId?: number;
  providerName?: string;
  icd10AtVisit?: string;
  changesMade?: string[];
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
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
      console.error(`❌ [DeltaService] Stack trace:`, (error as Error).stack);
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
          if (visit.encounterId === encounterId && !visit.isSigned) {
            return {
              ...visit,
              isSigned: true,
              providerId: providerId,
              signedAt: new Date().toISOString()
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

    console.log(`🔍 [GPT] Building prompt with ${existingProblems.length} existing problems`);
    
    const deltaPrompt = `
CURRENT MEDICAL PROBLEMS (DO NOT REWRITE):
${existingProblems.length === 0 ? "NONE - This is a new patient with no existing medical problems" : JSON.stringify(existingProblems.map(p => ({
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

CRITICAL MATCHING RULES:
1. ALWAYS check if conditions mentioned in SOAP match existing problems using medical synonyms
2. Common medical synonyms to recognize:
   - "DM2", "Dm2", "Type 2 diabetes", "T2DM", "diabetes mellitus type 2" = SAME CONDITION
   - "HTN", "Hypertension", "High blood pressure", "Elevated BP" = SAME CONDITION
   - "CAD", "Coronary artery disease", "Heart disease", "Cardiac disease" = SAME CONDITION
   - "COPD", "Chronic obstructive pulmonary disease", "Emphysema", "Chronic bronchitis" = SAME CONDITION
   - "UTI", "Urinary tract infection", "Bladder infection", "Cystitis" = SAME CONDITION
3. If SOAP mentions a condition that matches an existing problem (even with different wording), use ADD_VISIT with the existing problem_id
4. Only use NEW_PROBLEM if the condition is genuinely new and doesn't match any existing problem
5. DO NOT create duplicate problems for the same medical condition

PROCESSING RULES:
1. DO NOT return full problem lists - only changes from this visit
2. If diabetes develops neuropathy, evolve E11.0 → E11.41 (your decision, not hardcoded)
3. Visit notes should be concise clinical summary for this encounter only
4. Only include problems mentioned or affected in this SOAP note
5. Use highest complexity ICD-10 code when conditions evolve
6. Look for diagnoses in the Assessment/Plan section
7. Return empty changes array ONLY if truly no medical conditions are discussed

Respond with ONLY the JSON, no other text.
`;

    try {
      console.log(`🤖 [GPT] Sending prompt to GPT-4.1 for delta analysis...`);
      console.log(`🤖 [GPT] Existing problems count: ${existingProblems.length}`);
      console.log(`🤖 [GPT] SOAP note contains Assessment/Plan: ${soapNote.includes('ASSESSMENT') || soapNote.includes('Assessment')}`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: deltaPrompt }],
        temperature: 0.1,
        max_tokens: 1000
      });

      // Log comprehensive token usage and cost analysis
      if (response.usage) {
        const costAnalysis = TokenCostAnalyzer.logCostAnalysis(
          'MedicalProblems',
          response.usage,
          'gpt-4.1',
          {
            existingProblemsCount: existingProblems.length,
            soapNoteLength: soapNote.length,
            patientAge: this.calculateAge(patient.dateOfBirth)
          }
        );
        
        // Log cost projections for business planning
        const projections = TokenCostAnalyzer.calculateProjections(costAnalysis.totalCost, 50); // 50 encounters/day estimate
        console.log(`💰 [MedicalProblems] COST PROJECTIONS:`);
        console.log(`💰 [MedicalProblems] Daily (50 encounters): ${projections.formatted.daily}`);
        console.log(`💰 [MedicalProblems] Monthly: ${projections.formatted.monthly}`);
        console.log(`💰 [MedicalProblems] Yearly: ${projections.formatted.yearly}`);
      }

      const content = response.choices[0].message.content?.trim();
      console.log(`🤖 [GPT] Raw response from GPT:`, content);
      
      if (!content) {
        console.log(`🤖 [GPT] Empty response from GPT`);
        return [];
      }

      // Clean GPT response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith('```json')) {
        cleanedContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
        console.log(`🤖 [GPT] Cleaned markdown formatting from response`);
      } else if (content.startsWith('```')) {
        cleanedContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
        console.log(`🤖 [GPT] Cleaned generic markdown formatting from response`);
      }
      
      console.log(`🤖 [GPT] Cleaned content for parsing:`, cleanedContent);

      const result = JSON.parse(cleanedContent);
      console.log(`🤖 [GPT] Parsed result:`, result);
      console.log(`🤖 [GPT] Changes detected: ${result.changes?.length || 0}`);
      
      if (result.changes && result.changes.length > 0) {
        result.changes.forEach((change: any, index: number) => {
          console.log(`🤖 [GPT] Change ${index + 1}: ${change.action} - ${change.problem_title || 'existing'} (${change.confidence})`);
        });
      }
      
      return result.changes || [];

    } catch (error) {
      console.error("❌ [GPT] Error generating delta changes:", error);
      if (error instanceof SyntaxError) {
        console.error("❌ [GPT] JSON parsing error - invalid response format");
      }
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
   * Create new medical problem with initial visit entry using DP structure
   */
  private async createNewProblem(
    change: ProblemChange,
    patientId: number,
    encounterId: number
  ): Promise<void> {

    // Get encounter details for DP date
    const encounter = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    const encounterDate = encounter[0]?.startTime || new Date();

    const visitEntry: VisitHistoryEntry = {
      date: encounterDate.toISOString().split('T')[0], // DP - authoritative medical event date
      notes: change.visit_notes || "",
      source: "encounter",
      encounterId: encounterId,
      providerId: encounter[0]?.providerId,
      providerName: "Auto-Generated", // TODO: Get actual provider name
      icd10AtVisit: change.icd10_change?.to || "",
      changesMade: ["initial_diagnosis"],
      confidence: change.confidence,
      isSigned: false
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

    // Get encounter details for DP date
    const encounter = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    const encounterDate = encounter[0]?.startTime || new Date();

    // Add new visit entry using DP structure
    const newVisitEntry: VisitHistoryEntry = {
      date: encounterDate.toISOString().split('T')[0], // DP - authoritative medical event date
      notes: change.visit_notes || "",
      source: "encounter",
      encounterId: encounterId,
      providerId: encounter[0]?.providerId,
      providerName: "Auto-Generated", // TODO: Get actual provider name
      icd10AtVisit: change.icd10_change?.to || existingProblem.currentIcd10Code || "",
      changesMade: change.icd10_change ? ["diagnosis_evolution"] : ["routine_follow_up"],
      confidence: change.confidence,
      isSigned: false
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