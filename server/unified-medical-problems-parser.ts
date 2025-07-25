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
import { PatientChartService } from "./patient-chart-service.js";

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
  action:
    | "ADD_VISIT"
    | "UPDATE_ICD"
    | "NEW_PROBLEM"
    | "EVOLVE_PROBLEM"
    | "RESOLVE";
  problem_title?: string;
  visit_notes?: string;
  icd10_change?: { from: string; to: string };
  confidence: number;
  source_type: "encounter" | "attachment";
  transfer_visit_history_from?: number; // problem_id to transfer history from
  extracted_date?: string; // ISO date string extracted from attachment content
  consolidation_reasoning?: string; // GPT's reasoning for consolidation decisions

  // GPT-powered intelligent ranking
  // rank_score removed - frontend calculates final score using ranking_factors + user weights
  ranking_reason?: string; // GPT's reasoning for rank assignment
  ranking_factors?: {
    clinical_severity: number; // Relative percentage (0-100%) within patient context
    treatment_complexity: number; // Relative percentage (0-100%) within patient context
    patient_frequency: number; // Relative percentage (0-100%) within patient context
    clinical_relevance: number; // Relative percentage (0-100%) within patient context
  }; // GPT-generated factor breakdown for user weight customization
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
    triggerType:
      | "recording_complete"
      | "manual_edit"
      | "attachment_processed" = "recording_complete",
  ): Promise<UnifiedProcessingResult> {
    const startTime = Date.now();

    console.log(`🔄 [UnifiedMedicalProblems] === UNIFIED PROCESSING START ===`);
    console.log(
      `🔄 [UnifiedMedicalProblems] Patient: ${patientId}, Encounter: ${encounterId}, Attachment: ${attachmentId}`,
    );
    console.log(
      `🔄 [UnifiedMedicalProblems] SOAP length: ${soapNote?.length || 0}, Attachment length: ${attachmentContent?.length || 0}`,
    );
    console.log(`🔄 [UnifiedMedicalProblems] Trigger: ${triggerType}`);

    try {
      // Get existing context and comprehensive patient chart data
      const [existingProblems, encounter, patient, patientChart] =
        await Promise.all([
          this.getExistingProblems(patientId),
          encounterId
            ? this.getEncounterInfo(encounterId)
            : Promise.resolve(null),
          this.getPatientInfo(patientId),
          PatientChartService.getPatientChartData(patientId),
        ]);

      console.log(
        `🔄 [UnifiedMedicalProblems] Found ${existingProblems.length} existing problems`,
      );
      console.log(
        `🔄 [UnifiedMedicalProblems] Patient chart data: ${patientChart.medicalProblems?.length || 0} problems, ${patientChart.currentMedications?.length || 0} medications, ${patientChart.vitals?.length || 0} vitals`,
      );

      // Generate unified changes using enhanced GPT prompt with comprehensive patient data
      const changes = await this.generateUnifiedChanges(
        existingProblems,
        soapNote,
        attachmentContent,
        encounter,
        patient,
        patientChart,
        providerId,
        triggerType,
        attachmentId,
      );

      console.log(
        `🔄 [UnifiedMedicalProblems] Generated ${changes.length} changes`,
      );
      
      // Detailed logging for each change
      changes.forEach((change, index) => {
        console.log(`🔍 [UnifiedGPT] Change ${index + 1}:`, {
          action: change.action,
          problemId: change.problem_id,
          problemTitle: change.problem_title,
          hasRankingFactors: !!change.ranking_factors,
          rankingFactors: change.ranking_factors,
          rankingReason: change.ranking_reason ? change.ranking_reason.substring(0, 100) + '...' : 'None',
          sourceType: change.source_type
        });
      });

      // Apply changes with visit history transfer logic
      await this.applyUnifiedChanges(
        changes,
        patientId,
        encounterId,
        attachmentId,
      );

      const processingTime = Date.now() - startTime;

      // Calculate source summary
      const sourceSummary = {
        encounter_problems: changes.filter((c) => c.source_type === "encounter")
          .length,
        attachment_problems: changes.filter(
          (c) => c.source_type === "attachment",
        ).length,
        conflicts_resolved: changes.filter((c) => c.action === "EVOLVE_PROBLEM")
          .length,
      };

      console.log(`✅ [UnifiedMedicalProblems] === PROCESSING COMPLETE ===`);
      console.log(
        `✅ [UnifiedMedicalProblems] Time: ${processingTime}ms, Changes: ${changes.length}`,
      );
      console.log(`✅ [UnifiedMedicalProblems] Source summary:`, sourceSummary);

      return {
        changes,
        processing_time_ms: processingTime,
        total_problems_affected: changes.length,
        source_summary: sourceSummary,
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
    patientChart: any,
    providerId: number,
    triggerType: string,
    attachmentId: number | null,
  ): Promise<UnifiedProblemChange[]> {
    const unifiedPrompt = `
UNIFIED MEDICAL PROBLEMS PROCESSING
You are an expert medical AI that intelligently consolidates medical problems from multiple sources while avoiding duplication.

EXISTING MEDICAL PROBLEMS WITH FULL VISIT HISTORY:
${
  existingProblems.length === 0
    ? "NONE - This is a new patient with no existing medical problems"
    : JSON.stringify(
        existingProblems.map((p) => ({
          id: p.id,
          title: p.problemTitle,
          current_icd10: p.currentIcd10Code,
          status: p.problemStatus,
          visit_history: Array.isArray(p.visitHistory)
            ? p.visitHistory.map((v: any) => ({
                date: v.date,
                notes: v.notes,
                source: v.source,
                attachmentId: v.attachmentId,
                encounterId: v.encounterId
              }))
            : [],
        })),
      )
}

DATA SOURCES TO PROCESS:

${
  soapNote
    ? `
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
`
    : triggerType === "manual_edit" 
      ? `
MANUAL RANKING REFRESH REQUEST:
- This is a MANUAL RANKING REFRESH operation
- NO new content to process - focus on RANKING existing problems
- PRIMARY RESPONSIBILITY: Apply intelligent ranking to all existing problems
- MANDATORY: Every existing problem MUST receive ranking_factors and ranking_reason
- Use clinical intelligence to assess relative priority within this patient's context
- Consider clinical severity, treatment complexity, patient frequency, and current relevance
- Generate ONLY ranking_factors with relative percentages that sum to 100% within each category
- DO NOT generate rank_score - frontend will calculate final score using user weight preferences
- Action should be "ADD_VISIT" with empty visit_notes for ranking-only updates
`
      : "NO SOAP NOTE PROVIDED"
}

${
  attachmentContent
    ? `
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
`
    : "NO ATTACHMENT CONTENT PROVIDED"
}

PATIENT CONTEXT:
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${this.calculateAge(patient.dateOfBirth)}
- Processing Date: ${new Date().toISOString()}

COMPREHENSIVE CLINICAL DATA AVAILABLE FOR ENHANCED VISIT HISTORIES:
${this.formatPatientChartForGPT(patientChart)}

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

CONFIDENCE SCORING METHODOLOGY - CRITICAL:
The confidence score (0.0-1.0) represents YOUR CONFIDENCE IN YOUR OWN EXTRACTION/INFERENCE ACCURACY, 
NOT the clinical validity of the diagnosis. This helps users decide if they need to review source documents.

CONFIDENCE SCORING FRAMEWORK:

95-100% - EXPLICIT STATEMENTS WITH CLEAR LANGUAGE:
- "Known history of atrial fibrillation" → 0.98
- "Diagnosed with Type 2 diabetes in 2019" → 0.99
- "Patient has hypertension" → 0.97
- "Confirmed diagnosis of CHF" → 0.98

85-94% - CLEAR CLINICAL DOCUMENTATION:
- "A1c 10.2%, diagnosed with diabetes" → 0.90
- "ECG shows atrial fibrillation" → 0.92
- "Chest X-ray: cardiomegaly consistent with CHF" → 0.91
- Professional documentation with specific findings → 0.85-0.94

70-84% - STRONG IMPLICATIONS BUT NOT EXPLICIT:
- "On metformin for blood sugar control" → 0.80 (implies diabetes)
- "Taking warfarin for irregular heartbeat" → 0.75 (implies AFib)
- "Patient on lisinopril and HCTZ" → 0.72 (implies hypertension)
- Multiple corroborating details → 0.70-0.84

50-69% - REASONABLE INFERENCES WITH SOME UNCERTAINTY:
- "Irregularly irregular pulse noted" → 0.55 (suggests AFib but not definitive)
- "Blood sugars running high" → 0.60 (suggests diabetes)
- "History of heart problems" → 0.50 (vague, could be many things)
- Clinical findings suggesting diagnosis → 0.50-0.69

30-49% - WEAK EVIDENCE OR CONFLICTING INFORMATION:
- "Patient thinks he might have AFib" → 0.40
- "Possible history of diabetes per family" → 0.35
- "Questionable cardiac history" → 0.30
- Uncertain patient reports → 0.30-0.49

10-29% - MINIMAL OR HIGHLY UNCERTAIN INFORMATION:
- "Concerned about heart condition" → 0.20
- "Family mentioned something about sugar problems" → 0.15
- "Unclear medical history" → 0.10
- Vague references → 0.10-0.29

1-9% - EXTREMELY UNCERTAIN OR CONTRADICTORY:
- Conflicting information in document → 0.05
- Parsing errors or unclear text → 0.01-0.09

KEY PRINCIPLES FOR CONFIDENCE SCORING:
1. Rate your extraction accuracy, NOT the diagnosis quality
2. Clear explicit statements = high confidence
3. Inferences from symptoms/meds = medium confidence  
4. Vague or uncertain language = low confidence
5. Words like "thinks", "might", "possible", "questionable" significantly lower confidence
6. Patient self-reports without clinical confirmation = lower confidence
7. Professional clinical documentation = higher confidence

CONFIDENCE-BASED MATCHING THRESHOLDS:
- 50%+ confidence: Likely match, consolidate with detailed reasoning
- 30-49% confidence: Possible match, consolidate if reasonable clinical correlation exists
- <30% confidence: Different conditions, create new problem

UNIFIED PROCESSING INTELLIGENCE:
1. CONSOLIDATION LOGIC: Match conditions when they are medically related (HTN=Hypertension, DM=Diabetes). DO NOT consolidate unrelated conditions (chronic sinusitis + kidney stones makes no sense)
2. SOURCE AWARENESS: Track which source contributed each piece of information
3. CONFLICT RESOLUTION: If same condition appears in both sources, prefer current encounter data for diagnosis, attachment data for historical context
4. VISIT HISTORY ENRICHMENT: Attachment data should add rich historical context to existing problems
5. CLINICAL EVOLUTION: Use "EVOLVE_PROBLEM" when diagnosis changes significantly with ICD code family change
6. CREATE NEW PROBLEMS: When conditions don't match existing problems, create new ones without hesitation

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
      "consolidation_reasoning": "Why this was matched/not matched with existing problems",

      "ranking_reason": "Clinical reasoning for rank assignment based on severity, complexity, and current relevance",
      "ranking_factors": {
        "clinical_severity": 28,      // Relative percentage (0-100%) within patient context
        "treatment_complexity": 22,   // Relative percentage (0-100%) within patient context
        "patient_frequency": 16,      // Relative percentage (0-100%) within patient context
        "clinical_relevance": 8       // Relative percentage (0-100%) within patient context
      }
    }
  ]
}

ENHANCED EXAMPLES WITH RANKING AND CONFIDENCE:

1. SOAP explicitly states "Type 2 DM with neuropathy" + existing "Type 2 Diabetes" (E11.9):
   {"action": "EVOLVE_PROBLEM", "problem_id": null, "problem_title": "Type 2 diabetes mellitus with diabetic neuropathy", "icd10_change": {"from": "E11.9", "to": "E11.40"}, "confidence": 0.96, "source_type": "encounter", "transfer_visit_history_from": 1, "consolidation_reasoning": "Same underlying diabetes condition with complication development, evolved from E11.9 to E11.40", "ranking_reason": "Complex diabetes with neuropathy complication requiring active medication management and monitoring", "ranking_factors": {"clinical_severity": 32, "treatment_complexity": 25, "patient_frequency": 18, "clinical_relevance": 9}}

2. Attachment clearly documents "HTN" + existing "Hypertension" (I10):
   {"action": "ADD_VISIT", "problem_id": 2, "visit_notes": "Documented on 3/15/20: Historical documentation of hypertension management", "confidence": 0.95, "source_type": "attachment", "extracted_date": "2020-03-15", "consolidation_reasoning": "HTN is medical abbreviation for existing Hypertension problem, adding historical context", "ranking_reason": "Stable chronic hypertension with routine management requirements", "ranking_factors": {"clinical_severity": 18, "treatment_complexity": 12, "patient_frequency": 8, "clinical_relevance": 4}}

3. Document mentions "patient on lisinopril for blood pressure" (no explicit HTN diagnosis):
   {"action": "ADD_VISIT", "problem_id": 2, "visit_notes": "On lisinopril for BP control", "confidence": 0.75, "source_type": "attachment", "consolidation_reasoning": "Lisinopril prescription strongly implies hypertension diagnosis, though not explicitly stated", "ranking_reason": "Well-documented stable hypertension with good historical context", "ranking_factors": {"clinical_severity": 17, "treatment_complexity": 11, "patient_frequency": 9, "clinical_relevance": 4}}

4. Document states "known history of Atrial Fibrillation" + no existing cardiac rhythm problems:
   {"action": "NEW_PROBLEM", "problem_id": null, "problem_title": "Atrial fibrillation", "confidence": 0.98, "source_type": "attachment", "extracted_date": "2019-08-22", "consolidation_reasoning": "No existing cardiac rhythm disorders found, creating new problem for explicitly stated A-Fib", "ranking_reason": "Significant cardiac arrhythmia requiring anticoagulation management and stroke prevention", "ranking_factors": {"clinical_severity": 30, "treatment_complexity": 24, "patient_frequency": 14, "clinical_relevance": 7}}

5. Physical exam notes "irregularly irregular pulse" but no AFib diagnosis mentioned:
   {"action": "NEW_PROBLEM", "problem_id": null, "problem_title": "Atrial fibrillation", "confidence": 0.55, "source_type": "encounter", "consolidation_reasoning": "Irregularly irregular pulse is classic for AFib but not definitive without ECG confirmation", "ranking_reason": "Possible cardiac arrhythmia requiring further evaluation", "ranking_factors": {"clinical_severity": 25, "treatment_complexity": 20, "patient_frequency": 10, "clinical_relevance": 15}}

6. Patient states "I think I might have AFib" in HPI:
   {"action": "NEW_PROBLEM", "problem_id": null, "problem_title": "Atrial fibrillation", "confidence": 0.35, "source_type": "encounter", "consolidation_reasoning": "Patient self-report of possible AFib without clinical confirmation - low confidence extraction", "ranking_reason": "Unconfirmed patient concern requiring evaluation", "ranking_factors": {"clinical_severity": 15, "treatment_complexity": 10, "patient_frequency": 5, "clinical_relevance": 8}}

7. SOAP note clearly states "Shortness of breath on exertion resolved per patient report" + existing "Shortness of breath on exertion" problem:
   {"action": "RESOLVE", "problem_id": 5, "visit_notes": "Resolved per patient report; no current symptoms", "confidence": 0.95, "source_type": "encounter", "consolidation_reasoning": "Patient explicitly reports resolution of existing SOB problem - high confidence in extraction", "ranking_reason": "Resolved condition with no ongoing clinical significance", "ranking_factors": {"clinical_severity": 5, "treatment_complexity": 2, "patient_frequency": 1, "clinical_relevance": 1}}

8. SOAP note mentions "Acute bronchitis resolved, patient feeling better" + existing "Acute bronchitis" problem:
   {"action": "RESOLVE", "problem_id": 3, "visit_notes": "Resolved, patient feeling better", "confidence": 0.94, "source_type": "encounter", "consolidation_reasoning": "Acute condition explicitly stated as resolved", "ranking_reason": "Acute respiratory infection fully resolved with no sequelae", "ranking_factors": {"clinical_severity": 6, "treatment_complexity": 3, "patient_frequency": 2, "clinical_relevance": 1}}

9. Document vaguely mentions "that breathing problem from last year seems better now":
   {"action": "ADD_VISIT", "problem_id": 5, "visit_notes": "Breathing problem seems better", "confidence": 0.45, "source_type": "attachment", "consolidation_reasoning": "Vague reference to improvement but unclear if fully resolved - low confidence", "ranking_reason": "Possibly improving respiratory condition", "ranking_factors": {"clinical_severity": 10, "treatment_complexity": 5, "patient_frequency": 3, "clinical_relevance": 5}}

VISIT HISTORY CONSOLIDATION RULES - CRITICAL:
1. ALWAYS check existing visit history for same-date entries before creating new visits
2. When you find existing visits on the SAME DATE as the current document/encounter:
   - ALWAYS CONSOLIDATE information into a single comprehensive visit entry
   - Combine clinical details from both sources into enriched notes
   - Preserve the most complete information from each source
   - NEVER create duplicate same-date visits - ALL same-date information must be consolidated
3. Examples of how to CONSOLIDATE same-date visits:
   - Multiple lab results from same date → Single visit with all lab values
   - Progress note + lab results from same date → Single visit with exam findings AND lab values
   - Multiple documents from same clinic visit → Single comprehensive visit entry
   - Current meds + historical meds → "On escitalopram 5mg daily (started 5/23/25). Prior: 10mg daily (3/8/24, 7/2/24)"
4. When consolidating, create rich, comprehensive visit notes that include ALL relevant information from all same-date sources

VISIT HISTORY CREATION RULE - CRITICAL:
ONLY create visit history entries when the medical problem was ACTUALLY DISCUSSED, EVALUATED, or MANAGED during this encounter/document. 

DO NOT create empty, generic, or placeholder visit entries. If a problem was not addressed in this encounter, DO NOT include it in your response.

DATE FORMATTING IN VISIT NOTES - CRITICAL:
When writing dates within visit_notes text, ALWAYS use MM/DD/YY format (not YYYY-MM-DD).
Examples:
- Correct: "Admitted 10/20/13 for acute decompensated HFrEF"
- Incorrect: "Admitted 2013-10-20 for acute decompensated HFrEF"
- Correct: "Last A1c on 3/15/24 was 7.2%"
- Incorrect: "Last A1c on 2024-03-15 was 7.2%"

ABSOLUTELY FORBIDDEN VISIT ENTRIES:
- "No current symptoms"
- "Review of systems negative" 
- "General monitoring"
- "Routine monitoring"
- "No specific diagnosis"
- "Patient denies symptoms"
- "No acute symptoms"
- "Not addressed today"
- "Stable condition"
- Any variation of generic status updates

IF A PROBLEM IS NOT SPECIFICALLY DISCUSSED WITH CLINICAL DETAILS (medications, lab values, symptoms, physical exam findings, treatment changes), DO NOT CREATE A VISIT ENTRY.

PERFECT VISIT HISTORY EXAMPLES (only when problem was actively managed):
- "A1c 10.0, added glipizide 10mg daily. Continue metformin 1000mg BID"
- "A1c 9.2, patient reports dietary lapses. Reinforced lifestyle advice. Continue meds"
- "A1c 8.5, blood glucose logs 130-170. Assess for medication adherence. Plan: Increase metformin to 1000mg BID"
- "A1c 8.4, on metformin 500mg BID. Not at goal, consider adding sulfonylurea if persists"
- "A1c 7.9, continue metformin 500mg BID. Patient started exercise program"
- "A1c 7.7, mild polyuria. Renal panel normal, eye exam scheduled. Continue metformin"
- "A1c 7.4, patient interested in nutrition class. Encouraged"
- "A1c 7.2, started metformin 500mg BID. Discussed SMBG. Baseline renal panel normal"
- "Dx Type 2 diabetes (A1c 7.1). Dietary changes recommended. Plan: initiate metformin if A1c rises"
- "Fasting glucose 132, family hx of DM. Pre-diabetes counseling, lifestyle changes advised"
- "BP 160/95, started lisinopril 10mg daily"
- "BP 145/88, increased lisinopril to 20mg daily"
- "BP 128/82, well controlled on lisinopril 10mg"
- "BP 155/90, added HCTZ 25mg to lisinopril"
- "stopped lisinopril 10mg, started losartan 50mg"
- "Creatinine 1.8, switched from lisinopril to amlodipine 5mg"
- "hospitalized for CHF exacerbation, EF 35%. Started carvedilol 3.125mg BID"
- "Echo shows EF improved to 45%, uptitrated carvedilol to 6.25mg BID"
- "no acute symptoms, continue current regimen"
- "routine follow-up, stable"

EXAMPLES OF WHEN NOT TO CREATE VISIT ENTRIES:
- Patient came for knee pain but has diabetes in problem list → NO diabetes visit entry
- Attachment mentions "history of hypertension" but no current BP discussed → NO hypertension visit entry  
- SOAP note focuses on acute UTI, mentions patient has CHF but no cardiac exam → NO CHF visit entry

FORMATTING RULES:
- Include specific lab values, vital signs, medication names/doses
- Use standard medical abbreviations (BP, A1c, BID, etc.)
- Keep entries under 100 characters when possible

ENHANCED VISIT HISTORY WITH CLINICAL DATA CORRELATION:
When building visit histories, you now have access to comprehensive patient chart data. Use this information to create more robust and clinically relevant visit entries:

FOR DIABETES-RELATED PROBLEMS:
- Cross-reference current medications (metformin, insulin, etc.) to enrich visit histories
- Include medication start dates and dosing in visit notes
- Example: "Started on metformin 500mg BID (1/15/23), baseline A1c pending"

FOR HYPERTENSION-RELATED PROBLEMS:
- Include current vital signs in visit notes when clinically relevant
- Correlate BP readings with medication timing
- Example: "BP 140/85 on current lisinopril regimen"

FOR CARDIAC CONDITIONS:
- Include heart rate and blood pressure correlations
- Reference cardiac medications in visit histories
- Example: "HR 72, well controlled on carvedilol 6.25mg BID"

FOR MEDICATION-RELATED PROBLEMS:
- Reference allergy information for medication safety context
- Include medication interactions or contraindications
- Example: "Avoiding ACE inhibitors due to documented cough reaction"

FOR HEREDITARY CONDITIONS:
- Include family history context when creating new genetic/hereditary problems
- Example: "Strong family history of CAD (father: MI at 65), genetic counseling discussed"

CLINICAL DATA INTEGRATION RULES:
1. Only include clinical data that is directly relevant to the specific medical problem
2. Use current medications to provide context for medication-related visit entries
3. Include vital signs when they directly relate to the condition (BP for HTN, HR for arrhythmia)
4. Reference allergies when creating medication-related visit histories
5. Include family history context for genetic predisposition conditions
6. Use social history for lifestyle-related conditions (smoking for COPD, alcohol for liver disease)
- Focus on clinical decision points and changes
- Empty string if no meaningful clinical information
- Use periods to separate distinct clinical facts
- Avoid flowery language or patient education content

RESOLUTION DETECTION RULES:
Look for explicit resolution language in SOAP notes:
- "resolved", "resolution", "resolved per patient report"
- "no longer experiencing", "symptoms resolved", "feeling better"
- "treatment successful", "completed treatment", "cured"
- "acute condition resolved", "infection cleared"
- For acute conditions: automatically consider resolving if patient reports complete symptom resolution
- For chronic conditions: only resolve if explicitly documented as permanently resolved

GPT-POWERED INTELLIGENT RANKING SYSTEM:
For EVERY medical problem (new, updated, or existing), you must provide intelligent ranking based on clinical priority:

RANKING CRITERIA (1.00 = Highest Priority, 99.99 = Lowest Priority):
1. CLINICAL SEVERITY & IMMEDIACY:
   - Life-threatening conditions: 1.00-10.00 (MI, stroke, acute renal failure, sepsis)
   - Urgent conditions requiring monitoring: 10.01-20.00 (uncontrolled diabetes, severe HTN, heart failure)
   - Chronic conditions requiring active management: 20.01-40.00 (controlled diabetes, stable CAD, CKD stages 3-4)
   - Stable chronic conditions: 40.01-60.00 (well-controlled HTN, stable thyroid disease)
   - Historical/resolved conditions: 60.01-80.00 (past surgeries, resolved pneumonia)
   - Minor/routine conditions: 80.01-99.99 (seasonal allergies, minor skin conditions)

2. TREATMENT COMPLEXITY & FOLLOW-UP NEEDS:
   - Multiple medications with interactions: Lower rank (higher priority)
   - Requires specialist management: Lower rank (higher priority)
   - Simple medication management: Higher rank (lower priority)
   - Self-limiting conditions: Higher rank (lower priority)

3. PATIENT-SPECIFIC FREQUENCY & IMPACT:
   - Recently mentioned/updated conditions: Lower rank (higher priority)
   - Conditions mentioned across multiple encounters: Lower rank (higher priority)
   - Long-term stable conditions: Higher rank (lower priority)
   - Conditions not mentioned recently: Higher rank (lower priority)

4. CURRENT CLINICAL RELEVANCE:
   - Conditions actively being treated today: 1.00-20.00
   - Conditions requiring medication adjustments: 10.00-30.00
   - Conditions for routine monitoring: 30.00-50.00
   - Stable baseline conditions: 50.00-70.00
   - Historical reference only: 70.00-99.99

ENHANCED RELATIVE FACTOR SCORING SYSTEM:
For EVERY medical problem, you MUST provide detailed factor breakdown using RELATIVE PERCENTAGES.

CRITICAL INSTRUCTION: Each factor must be distributed as percentages across ALL of this patient's medical problems, where each factor category sums to exactly 100%.

FACTOR 1 - CLINICAL SEVERITY (0-100%):
Compare the clinical severity of THIS patient's conditions against each other:
- Most severe condition for this patient gets highest percentage
- Least severe condition for this patient gets lowest percentage
- All clinical severity percentages across all problems must sum to 100%

FACTOR 2 - TREATMENT COMPLEXITY (0-100%):
Compare the treatment complexity of THIS patient's conditions against each other:
- Most complex treatment regimen for this patient gets highest percentage
- Simplest treatment for this patient gets lowest percentage
- All treatment complexity percentages across all problems must sum to 100%

FACTOR 3 - PATIENT FREQUENCY (0-100%):
Compare how frequently THIS patient's conditions are mentioned/updated:
- Most frequently mentioned condition gets highest percentage
- Least frequently mentioned condition gets lowest percentage
- All patient frequency percentages across all problems must sum to 100%

FACTOR 4 - CLINICAL RELEVANCE (0-100%):
Compare the current clinical relevance of THIS patient's conditions:
- Most currently relevant condition gets highest percentage
- Least currently relevant condition gets lowest percentage
- All clinical relevance percentages across all problems must sum to 100%

RANKING EXAMPLES WITH RELATIVE FACTOR BREAKDOWN:
For a patient with 4 conditions (Type 2 diabetes, CKD Stage 5, Acute sinusitis, Hip osteoarthritis):

- "Type 2 diabetes mellitus with neuropathy" → ranking_factors: {"clinical_severity": 40, "treatment_complexity": 50, "patient_frequency": 50, "clinical_relevance": 40}, ranking_reason: "Most complex treatment regimen and frequently managed condition for this patient"
- "CKD Stage 5" → ranking_factors: {"clinical_severity": 10, "treatment_complexity": 20, "patient_frequency": 30, "clinical_relevance": 30}, ranking_reason: "Severe but stable condition requiring specialist management"
- "Acute sinusitis" → ranking_factors: {"clinical_severity": 30, "treatment_complexity": 10, "patient_frequency": 10, "clinical_relevance": 20}, ranking_reason: "Acute condition but simple treatment compared to chronic conditions"  
- "Hip osteoarthritis" → ranking_factors: {"clinical_severity": 20, "treatment_complexity": 20, "patient_frequency": 10, "clinical_relevance": 10}, ranking_reason: "Chronic stable condition with routine management"

MATHEMATICAL VERIFICATION: Each factor sums to 100% across all problems:
- Clinical severity: 40 + 10 + 30 + 20 = 100%
- Treatment complexity: 50 + 20 + 10 + 20 = 100%
- Patient frequency: 50 + 30 + 10 + 10 = 100%
- Clinical relevance: 40 + 30 + 20 + 10 = 100%

RANKING INSTRUCTIONS:
- NEVER assign identical rank scores - use decimal precision to prevent ties
- Consider the ENTIRE patient context when ranking
- Rank relative to OTHER conditions this patient has
- For NEW problems: Rank based on clinical severity and immediacy
- For EXISTING problems: Consider recent changes, stability, and current relevance
- Use ranking_reason to explain your clinical reasoning for the assigned rank
- MANDATORY: Provide ranking_factors breakdown for EVERY medical problem using the 4-factor scoring system above

INSTRUCTION: Systematically evaluate medical conditions against existing problems using consolidation rules. When SOAP notes document problem resolution, use RESOLVE action. Create new problems when conditions don't reasonably match existing ones. For ALL problems (new/updated/existing), provide intelligent ranking with clinical reasoning. Document consolidation reasoning and ranking reasoning in respective fields.

REQUIRED JSON RESPONSE FORMAT:
{
  "changes": [
    {
      "problem_id": number or null,
      "action": "NEW_PROBLEM" | "UPDATE_ICD" | "ADD_VISIT" | "EVOLVE_PROBLEM" | "RESOLVE",
      "problem_title": "string",
      "visit_notes": "string",
      "icd10_change": { "from": "string", "to": "string" } or null,
      "confidence": number (0.0-1.0),
      "source_type": "encounter" | "attachment",
      "extracted_date": "YYYY-MM-DD" or null,
      "consolidation_reasoning": "string",

      "ranking_reason": "string",
      "ranking_factors": {
        "clinical_severity": number (0-100, percentage relative to other patient problems),
        "treatment_complexity": number (0-100, percentage relative to other patient problems),
        "patient_frequency": number (0-100, percentage relative to other patient problems),
        "clinical_relevance": number (0-100, percentage relative to other patient problems)
      }
    }
  ]
}
`;

    console.log(`🤖 [UnifiedGPT] Sending unified prompt to GPT-4.1`);
    console.log(
      `🤖 [UnifiedGPT] Prompt length: ${unifiedPrompt.length} characters`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: unifiedPrompt }],
        temperature: 0.1,
        max_tokens: 30000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from GPT");
      }

      console.log(
        `🤖 [UnifiedGPT] Response received: ${content.length} characters`,
      );
      console.log(`🤖 [UnifiedGPT] Raw response:`, content);

      const parsed = JSON.parse(content);
      const changes = parsed.changes || [];

      console.log(`🤖 [UnifiedGPT] Parsed ${changes.length} changes`);
      changes.forEach((change: any, index: number) => {
        console.log(
          `🤖 [UnifiedGPT] Change ${index + 1}: ${change.action} - ${change.problem_title || "existing"} (${change.source_type})`,
        );
        if (change.consolidation_reasoning) {
          console.log(
            `🤖 [UnifiedGPT] 🧠 Reasoning: ${change.consolidation_reasoning}`,
          );
        }
        if (change.extracted_date) {
          console.log(
            `🤖 [UnifiedGPT] ✅ Extracted date: ${change.extracted_date}`,
          );
        } else {
          console.log(
            `🤖 [UnifiedGPT] ⚠️ No extracted date found - will use current date`,
          );
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
    attachmentId: number | null,
  ): Promise<void> {
    for (const change of changes) {
      try {
        switch (change.action) {
          case "NEW_PROBLEM":
            await this.createUnifiedProblem(
              change,
              patientId,
              encounterId,
              attachmentId,
            );
            break;

          case "ADD_VISIT":
          case "UPDATE_ICD":
            await this.updateUnifiedProblem(change, encounterId, attachmentId);
            break;

          case "EVOLVE_PROBLEM":
            await this.evolveProblemWithHistoryTransfer(
              change,
              patientId,
              encounterId,
              attachmentId,
            );
            break;

          case "RESOLVE":
            await this.resolveProblem(change);
            break;
        }
      } catch (error) {
        console.error(
          `❌ [UnifiedMedicalProblems] Error applying change:`,
          error,
        );
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
    attachmentId: number | null,
  ): Promise<void> {
    console.log(`🔄 [HistoryTransfer] Evolving problem with history transfer`);
    console.log(
      `🔄 [HistoryTransfer] From problem ID: ${change.transfer_visit_history_from}`,
    );
    console.log(`🔄 [HistoryTransfer] New title: ${change.problem_title}`);

    if (!change.transfer_visit_history_from) {
      console.warn(
        `⚠️ [HistoryTransfer] No source problem ID provided for evolution`,
      );
      return;
    }

    // Get the old problem to transfer history from
    const [oldProblem] = await db
      .select()
      .from(medicalProblems)
      .where(eq(medicalProblems.id, change.transfer_visit_history_from));

    if (!oldProblem) {
      console.error(
        `❌ [HistoryTransfer] Source problem ${change.transfer_visit_history_from} not found`,
      );
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
      ? [...(oldProblem.visitHistory as UnifiedVisitHistoryEntry[])]
      : [];

    // Add new visit entry for this evolution
    const newVisitEntry: UnifiedVisitHistoryEntry = {
      date: visitDate,
      notes:
        change.visit_notes ||
        `Diagnosis evolved: ${change.icd10_change?.from} → ${change.icd10_change?.to}`,
      source: change.source_type === "attachment" ? "attachment" : "encounter",
      encounterId: encounterId || undefined,
      attachmentId: attachmentId || undefined,
      icd10AtVisit: change.icd10_change?.to || "",
      changesMade: ["diagnosis_evolution", "visit_history_transferred"],
      confidence: change.confidence,
      isSigned: false,
      sourceNotes: `Evolved from problem ID ${change.transfer_visit_history_from}`,
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
      changeLog: [
        {
          encounter_id: encounterId || 0,
          timestamp: new Date().toISOString(),
          change_type: "problem_evolved",
          old_icd10: change.icd10_change?.from,
          new_icd10: change.icd10_change?.to,
          processing_time_ms: 0,
        },
      ],
      // GPT-powered intelligent ranking factors (frontend calculates final score)
      rankingFactors: change.ranking_factors || null,
      lastRankedEncounterId: encounterId,
      rankingReason:
        change.ranking_reason ||
        "Automatically ranked by GPT analysis during evolution",
    });

    // Mark old problem as resolved/evolved
    await db
      .update(medicalProblems)
      .set({
        problemStatus: "resolved",
        updatedAt: new Date(),
      })
      .where(eq(medicalProblems.id, change.transfer_visit_history_from));

    console.log(
      `✅ [HistoryTransfer] Successfully evolved problem ${change.transfer_visit_history_from} → new problem`,
    );
    console.log(
      `✅ [HistoryTransfer] Transferred ${transferredHistory.length - 1} historical visits + 1 new visit`,
    );
  }

  /**
   * Create new unified problem with source attribution
   */
  private async createUnifiedProblem(
    change: UnifiedProblemChange,
    patientId: number,
    encounterId: number | null,
    attachmentId: number | null,
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
      sourceConfidence: change.confidence,
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
      changeLog: [
        {
          encounter_id: encounterId || 0,
          timestamp: new Date().toISOString(),
          change_type: "problem_created",
          new_icd10: change.icd10_change?.to,
          processing_time_ms: 0,
        },
      ],
      // GPT-powered intelligent ranking factors (frontend calculates final score)
      rankingFactors: change.ranking_factors || null,
      lastRankedEncounterId: encounterId,
      rankingReason:
        change.ranking_reason || "Automatically ranked by GPT analysis",
    });

    console.log(
      `✅ [UnifiedMedicalProblems] Created problem: ${change.problem_title} (${change.source_type})`,
    );
  }

  /**
   * Update existing problem with unified logic
   */
  private async updateUnifiedProblem(
    change: UnifiedProblemChange,
    encounterId: number | null,
    attachmentId: number | null,
  ): Promise<void> {
    if (!change.problem_id) return;

    const [existingProblem] = await db
      .select()
      .from(medicalProblems)
      .where(eq(medicalProblems.id, change.problem_id));

    if (!existingProblem) return;

    const visitHistory = Array.isArray(existingProblem.visitHistory)
      ? (existingProblem.visitHistory as UnifiedVisitHistoryEntry[])
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

    // Filter out duplicate visits using surgical history pattern
    const filteredVisitHistory = this.filterDuplicateVisitEntries(
      visitHistory,
      encounterId,
      attachmentId,
      change.source_type === "encounter" ? "encounter" : "attachment"
    );

    let updatedVisitHistory: UnifiedVisitHistoryEntry[] = filteredVisitHistory;

    // Add new visit ONLY if GPT provided actual visit notes
    const visitNotes = change.visit_notes?.trim() || "";

    // Handle visit notes creation - but don't exit early as we still need ranking updates
    if (!visitNotes) {
      console.log(
        `🚫 [UnifiedMedicalProblems] Skipping visit entry for problem ${change.problem_id} (empty notes), but proceeding with ranking update`,
      );
      // Don't add visit entry but continue to ranking update
    } else {
      const newVisitEntry: UnifiedVisitHistoryEntry = {
        date: visitDate,
        notes: visitNotes,
        source:
          change.source_type === "attachment" ? "attachment" : "encounter",
        encounterId: encounterId || undefined,
        attachmentId: attachmentId || undefined,
        icd10AtVisit:
          change.icd10_change?.to || existingProblem.currentIcd10Code || "",
        changesMade: change.icd10_change
          ? ["diagnosis_evolution"]
          : ["routine_follow_up"],
        confidence: change.confidence,
        isSigned: false,
      };

      updatedVisitHistory = [...filteredVisitHistory, newVisitEntry];
    }

    // Update the problem with ranking
    await db
      .update(medicalProblems)
      .set({
        currentIcd10Code:
          change.icd10_change?.to || existingProblem.currentIcd10Code,
        lastUpdatedEncounterId: encounterId,
        visitHistory: updatedVisitHistory,
        updatedAt: new Date(),
        // Update ranking if provided - store factors, frontend calculates final ranking
        ...(change.ranking_factors && {
          rankingFactors: change.ranking_factors,
          lastRankedEncounterId: encounterId,
          rankingReason:
            change.ranking_reason ||
            "Updated ranking based on current clinical context",
        }),
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(
      `✅ [UnifiedMedicalProblems] Updated problem ${change.problem_id} (${change.source_type})`,
      {
        hasRankingFactors: !!change.ranking_factors,
        rankingFactors: change.ranking_factors,
        rankingReason: change.ranking_reason,
        problemTitle: change.problem_title || 'Unknown'
      }
    );
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
        updatedAt: new Date(),
      })
      .where(eq(medicalProblems.id, change.problem_id));

    console.log(
      `✅ [UnifiedMedicalProblems] Resolved problem ${change.problem_id}`,
    );
  }

  // Helper methods
  private async getExistingProblems(patientId: number) {
    return await db
      .select()
      .from(medicalProblems)
      .where(
        and(
          eq(medicalProblems.patientId, patientId),
          eq(medicalProblems.problemStatus, "active"),
        ),
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
    return Math.floor(
      (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
  }

  /**
   * Filter duplicate visit entries using surgical history pattern
   * Prevents duplicate visits for same encounter/attachment
   */
  private filterDuplicateVisitEntries(
    existingVisits: UnifiedVisitHistoryEntry[],
    encounterId: number | null,
    attachmentId: number | null,
    sourceType: "encounter" | "attachment",
  ): UnifiedVisitHistoryEntry[] {
    return existingVisits.filter((visit) => {
      // Allow both attachment and encounter entries for the same encounter ID
      if (encounterId && visit.encounterId === encounterId) {
        return visit.source !== sourceType; // Keep if different source type
      }

      // Prevent duplicate attachment entries
      if (attachmentId && visit.attachmentId === attachmentId) {
        return false; // Remove duplicate attachment
      }

      return true; // Keep all other entries
    });
  }

  /**
   * Format comprehensive patient chart data for GPT to use in enhanced visit histories
   */
  private formatPatientChartForGPT(patientChart: any): string {
    const sections = [];

    // Current Medications (for medication-related visit history enrichment)
    if (patientChart.currentMedications?.length > 0) {
      sections.push(`
CURRENT MEDICATIONS (Use for medication-related problem visit histories):
${patientChart.currentMedications
  .map(
    (med: any) =>
      `- ${med.medicationName} ${med.dosage} ${med.frequency} (started ${med.startDate || "unknown date"})`,
  )
  .join("\n")}`);
    }

    // Recent Vitals (for vital sign-related visit history enrichment)
    if (patientChart.vitals?.length > 0) {
      const latestVitals = patientChart.vitals[0];
      sections.push(`
RECENT VITALS (Use for condition-specific correlations):
- Latest Reading: BP ${latestVitals.systolicBp || "?"}/${latestVitals.diastolicBp || "?"} mmHg, HR ${latestVitals.heartRate || "?"} bpm, Temp ${latestVitals.temperature || "?"}°F
- For HYPERTENSION visit histories: Include relevant BP readings
- For DIABETES visit histories: Include weight/BMI trends if available
- For CARDIAC conditions: Include HR and BP correlations`);
    }

    // Allergies (for medication safety and visit history context)
    if (patientChart.allergies?.length > 0) {
      sections.push(`
ALLERGIES (Use for medication-related visit histories):
${patientChart.allergies
  .map(
    (allergy: any) =>
      `- ${allergy.allergen}: ${allergy.reaction} (${allergy.severity})`,
  )
  .join("\n")}`);
    }

    // Family History (for genetic predisposition context)
    if (patientChart.familyHistory?.length > 0) {
      sections.push(`
FAMILY HISTORY (Use for genetic/hereditary condition context):
${patientChart.familyHistory
  .map((fh: any) => `- ${fh.relationship}: ${fh.condition}`)
  .join("\n")}`);
    }

    // Social History (for lifestyle-related conditions)
    if (patientChart.socialHistory?.length > 0) {
      sections.push(`
SOCIAL HISTORY (Use for lifestyle-related condition context):
${patientChart.socialHistory
  .map((sh: any) => `- ${sh.category}: ${sh.details}`)
  .join("\n")}`);
    }

    // Imaging Results (for condition confirmation and progression monitoring)
    if (patientChart.imagingResults?.length > 0) {
      sections.push(`
RECENT IMAGING (Use for condition validation and progression context):
${patientChart.imagingResults
  .slice(0, 5)
  .map((img: any) => {
    const date = new Date(img.studyDate).toLocaleDateString();
    return `- ${date}: ${img.modality} ${img.bodyPart} - ${img.clinicalSummary || img.impression || 'See findings'}`;
  })
  .join("\n")}`);
    }

    return sections.length > 0
      ? sections.join("\n")
      : "- No additional clinical data available for visit history enhancement";
  }


}

// Export singleton instance
export const unifiedMedicalProblemsParser = new UnifiedMedicalProblemsParser();
