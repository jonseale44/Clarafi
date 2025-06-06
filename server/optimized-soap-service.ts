import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  diagnoses,
  medications,
  allergies,
  vitals,
  encounters
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
    transcription: string
  ): Promise<{
    soapNote: string;
    extractedOrders: any[];
    physicalExamAnalysis?: any;
  }> {
    const startTime = Date.now();
    console.log(`🚀 [OptimizedSOAP] Starting parallel SOAP generation for patient ${patientId}`);

    try {
      // Step 1: Get patient context quickly (parallel database queries)
      const [patient, diagnosisList, meds, allergiesList, vitalsList, recentEncounters] = await Promise.all([
        db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
        db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)).limit(10),
        db.select().from(medications).where(eq(medications.patientId, patientId)).limit(10),
        db.select().from(allergies).where(eq(allergies.patientId, patientId)).limit(5),
        db.select().from(vitals).where(eq(vitals.patientId, patientId)).limit(5),
        db.select().from(encounters).where(eq(encounters.patientId, patientId)).orderBy(desc(encounters.startTime)).limit(3)
      ]);

      if (!patient.length) {
        throw new Error('Patient not found');
      }

      const patientData = patient[0];
      const age = new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear();

      // Step 2: Get physical exam suggestions (uses Assistant API for context)
      const chiefComplaint = this.extractChiefComplaint(transcription);
      const physicalExamSuggestions = await this.physicalExamLearningService.generatePhysicalExamSuggestions(
        patientId,
        chiefComplaint,
        `Age: ${age}, Gender: ${patientData.gender}`
      );

      // Step 3: Build comprehensive medical context
      const medicalContext = this.buildMedicalContext(
        patientData,
        age,
        diagnosisList,
        meds,
        allergiesList,
        vitalsList,
        recentEncounters
      );

      const persistentFindingsContext = physicalExamSuggestions.length > 0 
        ? `\n\nPERSISTENT PHYSICAL FINDINGS (include these appropriately in physical exam):\n${physicalExamSuggestions.map(s => `- ${s.examSystem}: ${s.suggestedText} (${s.reasoning})`).join('\n')}`
        : '';

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

**ASSESSMENT:**
- Primary and secondary diagnoses with ICD-10 codes
- Clinical reasoning and differential diagnosis

**PLAN:**
- Specific treatment plans for each problem
- Medications with dosages, frequencies, and durations
- Follow-up instructions
- Patient education
- Any orders for labs, imaging, referrals

**ORDERS:** (Use this exact structured format)

Medications:
For each medication, use this template:
Medication: [name with strength]
Sig: [detailed instructions including route, frequency, indications]
Dispense: [quantity with formulation]
Refills: [number]

Labs: (if any)
- [Test name]: [indication]

Imaging: (if any)
- [Study type] of [region]: [indication]

Referrals: (if any)
- [Specialty]: [indication]

Keep the note concise but thorough, using standard medical terminology and proper formatting.`;

      // Step 5: Generate SOAP note with embedded orders using direct GPT-4 (faster than Assistant API)
      console.log(`🤖 [OptimizedSOAP] Sending unified request to GPT-4...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: unifiedPrompt }],
        temperature: 0.3,
        max_tokens: 3000
      });

      const soapNoteWithOrders = completion.choices[0]?.message?.content;
      if (!soapNoteWithOrders) {
        throw new Error('No SOAP note generated from OpenAI');
      }

      // Step 6: Start parallel processing while SOAP note is fresh
      const parallelProcessing = await Promise.allSettled([
        // Extract structured orders from the generated SOAP note
        this.soapOrdersExtractor.extractOrders(soapNoteWithOrders, patientId, parseInt(encounterId)),
        // Analyze for physical exam learning (background processing)
        this.physicalExamLearningService.analyzeSOAPNoteForPersistentFindings(
          patientId,
          parseInt(encounterId),
          soapNoteWithOrders
        ).catch(error => {
          console.warn('🧠 [OptimizedSOAP] Physical exam learning analysis failed:', error);
          return null;
        })
      ]);

      const extractedOrders = parallelProcessing[0].status === 'fulfilled' ? parallelProcessing[0].value : [];
      const physicalExamAnalysis = parallelProcessing[1].status === 'fulfilled' ? parallelProcessing[1].value : null;

      const duration = Date.now() - startTime;
      console.log(`✅ [OptimizedSOAP] Completed parallel generation in ${duration}ms`);
      console.log(`📊 [OptimizedSOAP] Results: SOAP note (${soapNoteWithOrders.length} chars), ${extractedOrders.length} orders`);

      return {
        soapNote: soapNoteWithOrders,
        extractedOrders,
        physicalExamAnalysis
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
      /here for[:\s]+([^\.]+)/i
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback - take first sentence
    const firstSentence = transcription.split('.')[0];
    return firstSentence.length > 10 ? firstSentence : 'General visit';
  }

  private buildMedicalContext(
    patientData: any,
    age: number,
    diagnosisList: any[],
    meds: any[],
    allergiesList: any[],
    vitalsList: any[],
    recentEncounters: any[]
  ): string {
    let context = `PATIENT: ${patientData.firstName} ${patientData.lastName}, ${age}yo ${patientData.gender}\n`;
    context += `MRN: ${patientData.mrn}\n\n`;

    if (allergiesList.length > 0) {
      context += `ALLERGIES:\n${allergiesList.map(a => `- ${a.allergen}: ${a.reaction}`).join('\n')}\n\n`;
    }

    if (diagnosisList.length > 0) {
      context += `ACTIVE PROBLEMS:\n${diagnosisList.map(d => `- ${d.diagnosis} (${d.diagnosisDate})`).join('\n')}\n\n`;
    }

    if (meds.length > 0) {
      context += `CURRENT MEDICATIONS:\n${meds.map(m => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join('\n')}\n\n`;
    }

    if (vitalsList.length > 0) {
      const latestVital = vitalsList[0];
      context += `RECENT VITALS:\n`;
      if (latestVital.systolicBp) context += `- BP: ${latestVital.systolicBp}/${latestVital.diastolicBp}\n`;
      if (latestVital.heartRate) context += `- HR: ${latestVital.heartRate}\n`;
      if (latestVital.temperature) context += `- Temp: ${latestVital.temperature}°F\n`;
      if (latestVital.oxygenSaturation) context += `- O2 Sat: ${latestVital.oxygenSaturation}%\n`;
      context += '\n';
    }

    if (recentEncounters.length > 0) {
      context += `RECENT ENCOUNTERS:\n${recentEncounters.map(e => `- ${e.startTime}: ${e.encounterType} - ${e.chiefComplaint || 'No chief complaint'}`).join('\n')}\n\n`;
    }

    return context;
  }
}