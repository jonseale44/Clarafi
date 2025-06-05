import OpenAI from 'openai';
import { db } from './db';
import { patients, encounters, diagnoses, medications, allergies, vitals } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PhysicalExamLearningService } from './physical-exam-learning-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class FastSOAPService {
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.physicalExamLearningService = new PhysicalExamLearningService();
  }

  async generateSOAPNote(patientId: number, encounterId: string, transcription: string): Promise<string> {
    console.log(`🩺 [FastSOAP] Generating SOAP note for patient ${patientId}, encounter ${encounterId}`);
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

      const prompt = `You are a medical AI assistant. Generate a comprehensive SOAP note based on the transcription and patient context.

PATIENT CONTEXT:
- Age: ${age}, Gender: ${patientData.gender}
- Current Problems: ${diagnosisList.map(d => d.diagnosis).join(', ') || 'None documented'}
- Current Medications: ${meds.map(m => `${m.medicationName} ${m.dosage}`).join(', ') || 'None documented'}
- Allergies: ${allergiesList.map(a => a.allergen).join(', ') || 'NKDA'}
- Recent Vitals: ${vitalsList.length > 0 ? `BP: ${vitalsList[0].systolicBp || 'N/A'}/${vitalsList[0].diastolicBp || 'N/A'}, HR: ${vitalsList[0].heartRate || 'N/A'}` : 'None recent'}${persistentFindingsContext}

TRANSCRIPTION:
${transcription}

Generate a comprehensive SOAP note based on the provided information. Return ONLY the SOAP note content in your response - do not add any introductory text, explanations, or formatting instructions.

Structure the note with these sections:
**SUBJECTIVE:**
**OBJECTIVE:**
**ASSESSMENT:**
**PLAN:**

Use clear, professional medical language. Include relevant findings and clinical reasoning.
Be concise but thorough. Focus on the current encounter while incorporating relevant history.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical AI that generates SOAP notes. Return ONLY the raw SOAP note content exactly as it should appear to the physician. Do not include any introductory text, explanations, or meta-commentary. Start directly with the SOAP note sections."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const soapNote = response.choices[0].message.content?.trim() || '';
      const duration = Date.now() - startTime;
      
      console.log(`✅ [FastSOAP] Generated SOAP note in ${duration}ms (${soapNote.length} characters)`);
      
      return soapNote;

    } catch (error) {
      console.error('❌ [FastSOAP] Error generating SOAP note:', error);
      throw error;
    }
  }

  /**
   * Extract chief complaint from transcription for context
   */
  private extractChiefComplaint(transcription: string): string {
    // Look for common patterns indicating chief complaint
    const patterns = [
      /(?:chief complaint|cc|presenting complaint|here for|complains? of)[:\s]*(.*?)(?:\.|$)/i,
      /patient (?:presents|came in|here) (?:with|for|complaining of)[:\s]*(.*?)(?:\.|$)/i,
      /(?:states|reports|complains)[:\s]*(.*?)(?:\.|$)/i
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first sentence
    const firstSentence = transcription.split('.')[0];
    return firstSentence.length < 100 ? firstSentence : 'Follow-up visit';
  }
}