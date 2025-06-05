import OpenAI from 'openai';
import { db } from './db';
import { patients, encounters, diagnoses, medications, allergies, vitals } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PhysicalExamLearningService } from './physical-exam-learning-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class DirectSOAPService {
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.physicalExamLearningService = new PhysicalExamLearningService();
  }

  async generateSOAPNote(patientId: number, encounterId: string, transcription: string): Promise<string> {
    console.log(`🩺 [DirectSOAP] Generating SOAP note for patient ${patientId}, encounter ${encounterId}`);
    const startTime = Date.now();

    try {
      // Get patient data quickly
      const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (!patient.length) {
        throw new Error('Patient not found');
      }

      // Get current medical context
      const [diagnosisList, meds, allergiesList, vitalsList] = await Promise.all([
        db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)).limit(10),
        db.select().from(medications).where(eq(medications.patientId, patientId)).limit(10),
        db.select().from(allergies).where(eq(allergies.patientId, patientId)).limit(5),
        db.select().from(vitals).where(eq(vitals.patientId, patientId)).limit(5)
      ]);

      const patientData = patient[0];
      const age = new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear();

      // Get persistent physical exam findings to include intelligently
      const chiefComplaint = this.extractChiefComplaint(transcription);
      const physicalExamSuggestions = await this.physicalExamLearningService.generatePhysicalExamSuggestions(
        patientId,
        chiefComplaint,
        `Age: ${age}, Gender: ${patientData.gender}`
      );

      // Create focused prompt for SOAP generation with persistent findings
      const persistentFindingsContext = physicalExamSuggestions.length > 0 
        ? `\n\nPERSISTENT PHYSICAL FINDINGS (include these appropriately in physical exam):\n${physicalExamSuggestions.map(s => `- ${s.examSystem}: ${s.suggestedText} (${s.reasoning})`).join('\n')}`
        : '';

      const medicalContext = this.buildMedicalContext(patientData, age, diagnosisList, meds, allergiesList, vitalsList);
      
      const prompt = `You are an expert physician assistant creating a comprehensive SOAP note from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}${persistentFindingsContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

SUBJECTIVE:
- Chief complaint and HPI (detailed, chronological)
- Review of systems (relevant positives and negatives)
- Past medical history, medications, allergies (reference context above)
- Social history and family history (if mentioned)

OBJECTIVE:
- Vital signs (if available)
- Physical examination (systematic, include persistent findings where appropriate)
- Relevant diagnostic results

ASSESSMENT:
- Primary and secondary diagnoses with ICD-10 codes
- Clinical reasoning and differential diagnosis

PLAN:
- Specific treatment plans for each problem
- Medications with dosages, frequencies, and durations
- Follow-up instructions
- Patient education
- Any orders for labs, imaging, referrals

Keep the note concise but thorough, using standard medical terminology and proper formatting.`;

      console.log(`🤖 [DirectSOAP] Sending request to GPT-4o...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const soapNote = completion.choices[0]?.message?.content;
      if (!soapNote) {
        throw new Error('No SOAP note generated from OpenAI');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [DirectSOAP] Generated SOAP note in ${duration}ms (${soapNote.length} characters)`);
      
      return soapNote;

    } catch (error: any) {
      console.error(`❌ [DirectSOAP] Error generating SOAP note:`, error);
      throw new Error(`Failed to generate SOAP note: ${error.message}`);
    }
  }

  /**
   * Extract chief complaint from transcription for context
   */
  private extractChiefComplaint(transcription: string): string {
    const lowerTranscription = transcription.toLowerCase();
    
    // Look for common chief complaint patterns
    const patterns = [
      /chief complaint[:\s]+(.*?)(?:\n|patient|history|exam)/,
      /cc[:\s]+(.*?)(?:\n|patient|history|exam)/,
      /presents?\s+with[:\s]+(.*?)(?:\n|patient|history|exam)/,
      /complaining?\s+of[:\s]+(.*?)(?:\n|patient|history|exam)/
    ];
    
    for (const pattern of patterns) {
      const match = lowerTranscription.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: take first sentence that might be a complaint
    const sentences = transcription.split(/[.!?]+/);
    for (const sentence of sentences.slice(0, 3)) {
      if (sentence.length > 10 && sentence.length < 200) {
        return sentence.trim();
      }
    }
    
    return "Patient encounter";
  }

  private buildMedicalContext(patientData: any, age: number, diagnoses: any[], medications: any[], allergies: any[], vitals: any[]): string {
    let context = `Patient: ${patientData.firstName} ${patientData.lastName}, ${age}yo ${patientData.gender}\n`;
    
    if (diagnoses.length > 0) {
      context += `\nActive Diagnoses:\n${diagnoses.map(d => `- ${d.diagnosis} (${d.icd10Code || 'no code'})`).join('\n')}`;
    }
    
    if (medications.length > 0) {
      context += `\nCurrent Medications:\n${medications.map(m => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join('\n')}`;
    }
    
    if (allergies.length > 0) {
      context += `\nAllergies:\n${allergies.map(a => `- ${a.allergen}: ${a.reaction} (${a.severity})`).join('\n')}`;
    }
    
    if (vitals.length > 0) {
      const latestVitals = vitals[0];
      context += `\nRecent Vitals:\n- BP: ${latestVitals.systolicBp}/${latestVitals.diastolicBp}, HR: ${latestVitals.heartRate}, Temp: ${latestVitals.temperature}°F`;
    }
    
    return context;
  }
}