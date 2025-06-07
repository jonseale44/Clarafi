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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class RealtimeSOAPStreaming {
  async generateSOAPNoteStream(
    patientId: number,
    encounterId: string,
    transcription: string,
  ): Promise<ReadableStream> {
    console.log(`🩺 [RealtimeSOAP] Starting streaming SOAP generation for patient ${patientId}`);

    // Get patient context (same as OptimizedSOAPService)
    const [
      patient,
      diagnosisList,
      meds,
      allergiesList,
      vitalsList,
      recentEncounters,
    ] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
      db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)).orderBy(desc(diagnoses.id)).limit(10),
      db.select().from(medications).where(eq(medications.patientId, patientId)).orderBy(desc(medications.id)).limit(10),
      db.select().from(allergies).where(eq(allergies.patientId, patientId)).orderBy(desc(allergies.id)).limit(5),
      db.select().from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.id)).limit(5),
      db.select().from(encounters).where(eq(encounters.patientId, patientId)).orderBy(desc(encounters.id)).limit(3),
    ]);

    if (!patient.length) {
      throw new Error("Patient not found");
    }

    const patientData = patient[0];
    const age = new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear();

    // Build medical context (same as OptimizedSOAPService)
    const medicalContext = this.buildMedicalContext(
      patientData,
      age,
      diagnosisList,
      meds,
      allergiesList,
      vitalsList,
      recentEncounters,
    );

    // Use EXACT same prompt as OptimizedSOAPService to preserve existing logic
    const soapPrompt = `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely **normal**, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Modify only abnormal systems. All normal areas must remain unchanged.

Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.

Document abnormal findings first (bolded), followed by pertinent negatives (normal font) where space allows.

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

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;

    // Create streaming response using Real-time API
    return new ReadableStream({
      async start(controller) {
        try {
          console.log("🔄 [RealtimeSOAP] Creating Real-time API session for streaming...");
          
          // Use Real-time API for streaming response
          const stream = await openai.chat.completions.create({
            model: "gpt-4o-realtime-preview",
            messages: [{ role: "user", content: soapPrompt }],
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              // Send streaming delta to frontend
              const data = JSON.stringify({
                type: 'response.text.delta',
                delta: delta,
              });
              
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }

          // Signal completion
          const completeData = JSON.stringify({
            type: 'response.text.done',
          });
          controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`));
          
          console.log("✅ [RealtimeSOAP] Streaming SOAP generation completed");
          controller.close();

        } catch (error) {
          console.error("❌ [RealtimeSOAP] Error in streaming:", error);
          
          const errorData = JSON.stringify({
            type: 'error',
            message: error.message || 'Failed to generate SOAP note',
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });
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
    // Same medical context building as OptimizedSOAPService
    const currentDiagnoses = diagnosisList.length > 0 
      ? diagnosisList.map(d => `- ${d.condition} (${d.icd10Code || 'unspecified'})`).join('\n')
      : '- No active diagnoses on file';

    const currentMedications = meds.length > 0
      ? meds.map(m => `- ${m.name}: ${m.dosage}, ${m.frequency}`).join('\n')
      : '- No current medications on file';

    const knownAllergies = allergiesList.length > 0
      ? allergiesList.map(a => `- ${a.allergen}: ${a.reaction} (${a.severity})`).join('\n')
      : '- NKDA (No Known Drug Allergies)';

    const recentVitals = vitalsList.length > 0
      ? `Recent Vitals: ${vitalsList[0].systolic}/${vitalsList[0].diastolic} mmHg, HR ${vitalsList[0].heartRate}, Temp ${vitalsList[0].temperature}°F`
      : 'No recent vitals available';

    return `Patient: ${patientData.firstName} ${patientData.lastName}
Age: ${age} years old
Gender: ${patientData.gender}
MRN: ${patientData.mrn}

ACTIVE DIAGNOSES:
${currentDiagnoses}

CURRENT MEDICATIONS:
${currentMedications}

ALLERGIES:
${knownAllergies}

RECENT VITALS:
${recentVitals}`;
  }
}