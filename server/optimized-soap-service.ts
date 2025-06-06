import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  diagnoses,
  medications,
  allergies,
  vitals,
  encounters,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { SOAPOrdersExtractor } from "./soap-orders-extractor.js";
import { PhysicalExamLearningService } from "./physical-exam-learning-service.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OptimizedSOAPService {
  private soapOrdersExtractor: SOAPOrdersExtractor;
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.soapOrdersExtractor = new SOAPOrdersExtractor();
    this.physicalExamLearningService = new PhysicalExamLearningService();
  }

  async generateSOAPNoteAndOrdersInParallel(
    patientId: number,
    encounterId: string,
    transcription: string,
  ): Promise<{
    soapNote: string;
    extractedOrders: any[];
    physicalExamAnalysis?: any;
  }> {
    const startTime = Date.now();
    console.log(
      `🚀 [OptimizedSOAP] Starting parallel SOAP generation for patient ${patientId}`,
    );

    try {
      // Step 1: Get patient context quickly (parallel database queries)
      const [
        patient,
        diagnosisList,
        meds,
        allergiesList,
        vitalsList,
        recentEncounters,
      ] = await Promise.all([
        db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
        db
          .select()
          .from(diagnoses)
          .where(eq(diagnoses.patientId, patientId))
          .limit(10),
        db
          .select()
          .from(medications)
          .where(eq(medications.patientId, patientId))
          .limit(10),
        db
          .select()
          .from(allergies)
          .where(eq(allergies.patientId, patientId))
          .limit(5),
        db
          .select()
          .from(vitals)
          .where(eq(vitals.patientId, patientId))
          .limit(5),
        db
          .select()
          .from(encounters)
          .where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.startTime))
          .limit(3),
      ]);

      if (!patient.length) {
        throw new Error("Patient not found");
      }

      const patientData = patient[0];
      const age =
        new Date().getFullYear() -
        new Date(patientData.dateOfBirth).getFullYear();

      // Step 2: Get physical exam suggestions (uses Assistant API for context)
      const chiefComplaint = this.extractChiefComplaint(transcription);
      const physicalExamSuggestions =
        await this.physicalExamLearningService.generatePhysicalExamSuggestions(
          patientId,
          chiefComplaint,
          `Age: ${age}, Gender: ${patientData.gender}`,
        );

      // Step 3: Build comprehensive medical context
      const medicalContext = this.buildMedicalContext(
        patientData,
        age,
        diagnosisList,
        meds,
        allergiesList,
        vitalsList,
        recentEncounters,
      );

      const persistentFindingsContext =
        physicalExamSuggestions.length > 0
          ? `\n\nPERSISTENT PHYSICAL FINDINGS (include these appropriately in physical exam):\n${physicalExamSuggestions.map((s) => `- ${s.examSystem}: ${s.suggestedText} (${s.reasoning})`).join("\n")}`
          : "";

      // Step 4: Create unified prompt for SOAP note with embedded orders section
      const unifiedPrompt = `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}${persistentFindingsContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
- Chief complaint and HPI (detailed, chronological)
- Review of systems (relevant positives and negatives)
- Past medical history, medications, allergies (reference context above)
- Social history and family history (if mentioned)

**OBJECTIVE:**
- Vital signs (if available)
- Physical examination (systematic, include persistent findings where appropriate)
- Relevant diagnostic results

**ASSESSMENT/PLAN:**

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]
Example:

Chest Tightness, Suspected Airway Constriction (R06.4):

Trial low-dose inhaler therapy to address potential airway constriction.
Monitor response to inhaler and reassess in 2 weeks.
Patient education on environmental triggers (e.g., dust exposure).
Fatigue, Work-Related Stress (Z73.0):

Counsel patient on stress management and lifestyle modifications.
Encourage gradual increase in physical activity.
Family History of Cardiovascular Disease (Z82.49):

Document family history and assess cardiovascular risk factors as part of ongoing care.
(preceded by FOUR blank lines)**ORDERS:** 

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY. Be concise (e.g., "CBC, BMP, TSH"). Do not include reasons or justification for labs. 

Imaging: Specify the modality and purpose in clear terms (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose of the referral (e.g., "Refer to pulmonologist for abnormal lung function testing").

CPT Codes: Identify and include relevant CPT codes for all procedures, services, and visits. Use this format:

{
  "metadata": {
    "type": "cpt_codes"
  },
  "content": [
    {
      "code": "[CPT CODE]",
      "description": "[PROCEDURE DESCRIPTION]",
      "complexity": "low|medium|high"
    }
  ]
}

Example CPT codes to consider:
- 99201-99205: New patient office visits (complexity levels)
- 99211-99215: Established patient office visits (complexity levels)
- 99381-99387: New patient preventive visits
- 99391-99397: Established patient preventive visits
- 80048-80076: Metabolic panels and blood tests
- 71045-71048: Chest X-rays
- 93000: ECG with interpretation
- 96372: Therapeutic injection

Additional Guidelines for Medications:

Avoid vague dosing descriptions like "typical dose" or "usual dose."
Include specific strengths and formulations for every medication (e.g., "Metformin 500 mg extended-release tablet").
Always include instructions for any situational use (e.g., "May use 2 puffs 15-30 minutes before exercise if needed").
Specify safety limits where appropriate (e.g., "Do not exceed 12 puffs in a 24-hour period").
Clearly document prescribing details, including dispense quantity and number of refills.
Additional Notes:

Use clear headers to distinguish sections (Subjective, Objective, Assessment/Plan, Orders).
Precede each section header with four blank lines. 
Ensure documentation is concise, focused, and free from narrative explanations or filler.
Use the default Physical Exam template unless manual findings are explicitly documented. Replace only the affected areas as necessary.
Include ICD-10 codes for all conditions immediately after each condition in the Assessment/Plan section.

Keep the note concise but thorough, using standard medical terminology and proper formatting.`;

      // Step 5: Generate SOAP note with embedded orders using direct GPT-4 (faster than Assistant API)
      console.log(`🤖 [OptimizedSOAP] Sending unified request to GPT-4...`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: unifiedPrompt }],
        temperature: 0.3,
        max_tokens: 32000,
      });

      const soapNoteWithOrders = completion.choices[0]?.message?.content;
      if (!soapNoteWithOrders) {
        throw new Error("No SOAP note generated from OpenAI");
      }

      // Step 6: Start parallel processing while SOAP note is fresh
      const parallelProcessing = await Promise.allSettled([
        // Extract structured orders from the generated SOAP note
        this.soapOrdersExtractor.extractOrders(
          soapNoteWithOrders,
          patientId,
          parseInt(encounterId),
        ),
        // Analyze for physical exam learning (background processing)
        this.physicalExamLearningService
          .analyzeSOAPNoteForPersistentFindings(
            patientId,
            parseInt(encounterId),
            soapNoteWithOrders,
          )
          .catch((error) => {
            console.warn(
              "🧠 [OptimizedSOAP] Physical exam learning analysis failed:",
              error,
            );
            return null;
          }),
      ]);

      const extractedOrders =
        parallelProcessing[0].status === "fulfilled"
          ? parallelProcessing[0].value
          : [];
      const physicalExamAnalysis =
        parallelProcessing[1].status === "fulfilled"
          ? parallelProcessing[1].value
          : null;

      const duration = Date.now() - startTime;
      console.log(
        `✅ [OptimizedSOAP] Completed parallel generation in ${duration}ms`,
      );
      console.log(
        `📊 [OptimizedSOAP] Results: SOAP note (${soapNoteWithOrders.length} chars), ${extractedOrders.length} orders`,
      );

      return {
        soapNote: soapNoteWithOrders,
        extractedOrders,
        physicalExamAnalysis,
      };
    } catch (error: any) {
      console.error(`❌ [OptimizedSOAP] Error in parallel generation:`, error);
      throw new Error(`Failed to generate SOAP note: ${error.message}`);
    }
  }

  private extractChiefComplaint(transcription: string): string {
    // Simple extraction - look for common patterns
    const patterns = [
      /chief complaint[:\s]+([^\.]+)/i,
      /presenting with[:\s]+([^\.]+)/i,
      /complains? of[:\s]+([^\.]+)/i,
      /here for[:\s]+([^\.]+)/i,
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback - take first sentence
    const firstSentence = transcription.split(".")[0];
    return firstSentence.length > 10 ? firstSentence : "General visit";
  }

  private buildMedicalContext(
    patientData: any,
    age: number,
    diagnosisList: any[],
    meds: any[],
    allergiesList: any[],
    vitalsList: any[],
    recentEncounters: any[],
  ): string {
    let context = `PATIENT: ${patientData.firstName} ${patientData.lastName}, ${age}yo ${patientData.gender}\n`;
    context += `MRN: ${patientData.mrn}\n\n`;

    if (allergiesList.length > 0) {
      context += `ALLERGIES:\n${allergiesList.map((a) => `- ${a.allergen}: ${a.reaction}`).join("\n")}\n\n`;
    }

    if (diagnosisList.length > 0) {
      context += `ACTIVE PROBLEMS:\n${diagnosisList.map((d) => `- ${d.diagnosis} (${d.diagnosisDate})`).join("\n")}\n\n`;
    }

    if (meds.length > 0) {
      context += `CURRENT MEDICATIONS:\n${meds.map((m) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join("\n")}\n\n`;
    }

    if (vitalsList.length > 0) {
      const latestVital = vitalsList[0];
      context += `RECENT VITALS:\n`;
      if (latestVital.systolicBp)
        context += `- BP: ${latestVital.systolicBp}/${latestVital.diastolicBp}\n`;
      if (latestVital.heartRate) context += `- HR: ${latestVital.heartRate}\n`;
      if (latestVital.temperature)
        context += `- Temp: ${latestVital.temperature}°F\n`;
      if (latestVital.oxygenSaturation)
        context += `- O2 Sat: ${latestVital.oxygenSaturation}%\n`;
      context += "\n";
    }

    if (recentEncounters.length > 0) {
      context += `RECENT ENCOUNTERS:\n${recentEncounters.map((e) => `- ${e.startTime}: ${e.encounterType} - ${e.chiefComplaint || "No chief complaint"}`).join("\n")}\n\n`;
    }

    return context;
  }
}
