import OpenAI from 'openai';
import { db } from './db';
import { patients, encounters, diagnoses, medications, allergies, vitals } from '@shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class FastSOAPService {
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

      // Create focused prompt for SOAP generation
      const prompt = `You are a medical AI assistant. Generate a comprehensive SOAP note based on the transcription and patient context.

PATIENT CONTEXT:
- Age: ${age}, Gender: ${patientData.gender}
- Current Problems: ${diagnosisList.map(d => d.diagnosis).join(', ') || 'None documented'}
- Current Medications: ${meds.map(m => `${m.medicationName} ${m.dosage}`).join(', ') || 'None documented'}
- Allergies: ${allergiesList.map(a => a.allergen).join(', ') || 'NKDA'}
- Recent Vitals: ${vitalsList.length > 0 ? `BP: ${vitalsList[0].systolicBp || 'N/A'}/${vitalsList[0].diastolicBp || 'N/A'}, HR: ${vitalsList[0].heartRate || 'N/A'}` : 'None recent'}

TRANSCRIPTION:
${transcription}

Generate a SOAP note with exactly these 4 sections:
**SUBJECTIVE:**
**OBJECTIVE:**
**ASSESSMENT/PLAN:**
**ORDERS:**

Rules:
1. Use ** for bold headers exactly as shown
2. Keep content concise but medically accurate
3. Base content on transcription but incorporate relevant patient context
4. Include vital signs in OBJECTIVE if available
5. Address issues mentioned in transcription
6. Suggest appropriate orders/medications based on assessment
7. Use professional medical terminology
8. Return only the SOAP note content, no other text`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical AI that generates SOAP notes. Return only the SOAP note content with the exact format requested."
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
}