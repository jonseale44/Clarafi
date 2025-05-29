import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  familyHistory,
  socialHistory,
  allergies,
  vitals,
  medications,
  diagnoses,
  encounters,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

export class AssistantContextService {
  private openai: OpenAI;
  private patientAssistants: Map<number, string> = new Map(); // Cache patient ID -> assistant ID

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getOrCreatePatientAssistant(patientId: number): Promise<string> {
    // Check if we already have an assistant for this patient in cache
    if (this.patientAssistants.has(patientId)) {
      return this.patientAssistants.get(patientId)!;
    }

    // Check database for existing assistant ID
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (patient.length === 0) {
      throw new Error(`Patient ${patientId} not found`);
    }

    // If patient already has an assistant ID stored, use it
    if (patient[0].assistantId) {
      this.patientAssistants.set(patientId, patient[0].assistantId);
      return patient[0].assistantId;
    }

    // Create new patient-specific assistant
    console.log(`🤖 [AssistantContextService] Creating new assistant for patient ${patientId} (${patient[0].firstName} ${patient[0].lastName})...`);
    
    // Get patient's medical history to initialize the assistant
    const patientHistory = await this.getPatientHistory(patientId);
    
    const assistant = await this.openai.beta.assistants.create({
      name: `Medical Assistant - ${patient[0].firstName} ${patient[0].lastName}`,
      instructions: `You are a medical AI assistant specifically for patient ${patient[0].firstName} ${patient[0].lastName} (MRN: ${patient[0].mrn}). 

PATIENT CONTEXT:
${patientHistory}

INSTRUCTIONS:
- Always respond in English only
- Provide concise, evidence-based medical insights for physicians
- Focus on this specific patient's medical history and context
- Include relevant medication dosages, red flags, and clinical guidelines
- Build upon previous encounters and medical knowledge for this patient
- Avoid restating obvious medical knowledge
- Stay brief and actionable

Return insights as bullet points, one per line.`,
      model: "gpt-4",
      tools: []
    });

    // Store the assistant ID in the database
    await db.update(patients)
      .set({ assistantId: assistant.id })
      .where(eq(patients.id, patientId));

    // Cache the assistant ID
    this.patientAssistants.set(patientId, assistant.id);
    
    console.log(`✅ [AssistantContextService] Created assistant ${assistant.id} for patient ${patientId}`);
    return assistant.id;
  }

  async getOrCreateThread(patientId: number): Promise<string> {
    // Get patient data
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (patient.length === 0) {
      throw new Error(`Patient ${patientId} not found`);
    }

    // If patient already has a thread ID, return it
    if (patient[0].assistantThreadId) {
      return patient[0].assistantThreadId;
    }

    // Create new thread for this patient
    const thread = await this.openai.beta.threads.create();
    
    // Store thread ID in database
    await db.update(patients)
      .set({ assistantThreadId: thread.id })
      .where(eq(patients.id, patientId));

    console.log(`🧵 [AssistantContextService] Created thread ${thread.id} for patient ${patientId}`);
    return thread.id;
  }

  async getRealtimeSuggestions(
    threadId: string,
    partialTranscription: string,
    userRole: "nurse" | "provider",
    patientId: number
  ) {
    try {
      // Get the patient's assistant
      const assistantId = await this.getOrCreatePatientAssistant(patientId);

      // Add the transcription to the thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `Live transcription from ${userRole}: ${partialTranscription}

Please provide brief clinical insights or suggestions based on this partial transcription and the patient's medical history.`
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      while (runStatus.status === "in_progress" || runStatus.status === "queued") {
        await new Promise(resolve => setTimeout(resolve, 500));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === "completed") {
        // Get the latest messages
        const messages = await this.openai.beta.threads.messages.list(threadId, {
          limit: 1
        });

        const lastMessage = messages.data[0];
        if (lastMessage && lastMessage.role === "assistant") {
          const content = lastMessage.content[0];
          if (content.type === "text") {
            const suggestions = content.text.value.split('\n')
              .filter((line: string) => line.trim())
              .map((line: string) => line.replace(/^[•\-\*]\s*/, '').trim())
              .filter((suggestion: string) => suggestion.length > 0);

            return {
              suggestions,
              clinicalFlags: [],
              contextualReminders: []
            };
          }
        }
      }

      return {
        suggestions: ["Continue recording for more context..."],
        clinicalFlags: [],
        contextualReminders: []
      };
    } catch (error) {
      console.error('Error getting realtime suggestions:', error);
      return {
        suggestions: ["AI suggestions temporarily unavailable"],
        clinicalFlags: [],
        contextualReminders: []
      };
    }
  }

  async processCompleteTranscription(
    threadId: string,
    fullTranscription: string,
    userRole: "nurse" | "provider",
    patientId: number,
    encounterId: number
  ) {
    try {
      // Get the patient's assistant
      const assistantId = await this.getOrCreatePatientAssistant(patientId);

      // Add the complete transcription to the thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `Complete encounter transcription from ${userRole} for encounter ID ${encounterId}:

${fullTranscription}

Please provide:
1. Clinical assessment and recommendations
2. Suggested diagnoses or differential diagnoses
3. Recommended treatments or medications
4. Any red flags or concerns
5. Follow-up recommendations`
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      while (runStatus.status === "in_progress" || runStatus.status === "queued") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === "completed") {
        // Get the latest messages
        const messages = await this.openai.beta.threads.messages.list(threadId, {
          limit: 1
        });

        const lastMessage = messages.data[0];
        if (lastMessage && lastMessage.role === "assistant") {
          const content = lastMessage.content[0];
          if (content.type === "text") {
            return content.text.value;
          }
        }
      }

      return "Analysis completed successfully";
    } catch (error) {
      console.error('Error processing complete transcription:', error);
      return "Unable to process transcription at this time";
    }
  }

  private async getPatientHistory(patientId: number): Promise<string> {
    try {
      // Get patient basic info
      const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patient.length === 0) return "";

      const patientInfo = patient[0];
      let history = `PATIENT: ${patientInfo.firstName} ${patientInfo.lastName}\n`;
      history += `MRN: ${patientInfo.mrn}\n`;
      history += `DOB: ${patientInfo.dateOfBirth}\n`;
      history += `Gender: ${patientInfo.gender}\n\n`;

      // Get allergies
      const allergiesList = await db.select().from(allergies).where(eq(allergies.patientId, patientId));
      if (allergiesList.length > 0) {
        history += "ALLERGIES:\n";
        allergiesList.forEach(allergy => {
          history += `- ${allergy.allergen}: ${allergy.reaction}\n`;
        });
        history += "\n";
      }

      // Get current medications
      const medicationsList = await db.select().from(medications).where(eq(medications.patientId, patientId));
      if (medicationsList.length > 0) {
        history += "CURRENT MEDICATIONS:\n";
        medicationsList.forEach(med => {
          history += `- ${med.medicationName}: ${med.dosage} ${med.frequency}\n`;
        });
        history += "\n";
      }

      // Get diagnoses
      const diagnosesList = await db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId));
      if (diagnosesList.length > 0) {
        history += "MEDICAL HISTORY:\n";
        diagnosesList.forEach(diagnosis => {
          history += `- ${diagnosis.diagnosis} (${diagnosis.diagnosisDate})\n`;
        });
        history += "\n";
      }

      // Get recent encounters
      const recentEncounters = await db.select().from(encounters)
        .where(eq(encounters.patientId, patientId))
        .orderBy(desc(encounters.startTime))
        .limit(5);

      if (recentEncounters.length > 0) {
        history += "RECENT ENCOUNTERS:\n";
        recentEncounters.forEach(encounter => {
          history += `- ${encounter.startTime}: ${encounter.encounterType}\n`;
          if (encounter.chiefComplaint) history += `  Chief Complaint: ${encounter.chiefComplaint}\n`;
          if (encounter.assessment) history += `  Assessment: ${encounter.assessment}\n`;
        });
        history += "\n";
      }

      // Get latest vitals
      const latestVitals = await db.select().from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.measuredAt))
        .limit(1);

      if (latestVitals.length > 0) {
        const vital = latestVitals[0];
        history += "LATEST VITALS:\n";
        if (vital.systolicBp) history += `- BP: ${vital.systolicBp}/${vital.diastolicBp}\n`;
        if (vital.heartRate) history += `- HR: ${vital.heartRate}\n`;
        if (vital.temperature) history += `- Temp: ${vital.temperature}°F\n`;
        if (vital.oxygenSaturation) history += `- O2 Sat: ${vital.oxygenSaturation}%\n`;
      }

      return history;
    } catch (error) {
      console.error('Error getting patient history:', error);
      return "";
    }
  }
}