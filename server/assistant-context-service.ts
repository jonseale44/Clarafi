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
  private assistantId: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || "";
  }

  async initializeAssistant() {
    if (!this.assistantId) {
      console.log(
        "🤖 [AssistantContextService] Creating new medical assistant...",
      );
      const assistant = await this.openai.beta.assistants.create({
        name: "Medical Context Assistant",
        instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

  Instructions:

  Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights. Additionally, if the physician asks, provide relevant information from the patient's chart or office visits, such as past medical history, current medications, allergies, lab results, and imaging findings. Include this information concisely and accurately where appropriate. This medical information might be present in old office visit notes. Do not make anything up, it would be better to just say you don't know.

  Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
  Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. When referencing diagnostics or red flags, provide a complete list to guide the differential diagnosis (e.g., imaging-related red flags). Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per line.

  Additional details for medication recommendations:

  Always include typical starting dose, dose adjustment schedules, and maximum dose.
  Output examples of good insights:

  Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
  Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
  Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

  Output examples of bad insights (to avoid):

  Encourage gentle stretches and light activity to maintain mobility.
  Suggest warm baths at night for symptomatic relief of muscle tension.
  Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

  Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

  Return each new insight on a separate line, and prefix each line with a bullet (•), dash (-), or number if appropriate. Do not combine multiple ideas on the same line. 
  
  Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a  user question.`,
        model: "gpt-4o",
        tools: [],
      });
      this.assistantId = assistant.id;
      console.log(
        "🤖 [AssistantContextService] ✅ Assistant created:",
        this.assistantId,
      );
    }
  }

  async getOrCreateThread(patientId: number): Promise<string> {
    console.log(
      "🧵 [AssistantContextService] Getting thread for patient:",
      patientId,
    );

    // Check if patient already has thread (we'll add this field to schema later)
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    // Create new thread with patient context
    const thread = await this.openai.beta.threads.create();
    console.log(
      "🧵 [AssistantContextService] ✅ Created new thread:",
      thread.id,
    );

    // Load patient's complete medical history
    const patientHistory = await this.getPatientHistory(patientId);

    // Add historical context to thread
    await this.openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Patient Historical Context: ${JSON.stringify(patientHistory)}`,
    });

    return thread.id;
  }

  // Real-time suggestions during transcription
  async getRealtimeSuggestions(
    threadId: string,
    partialTranscription: string,
    userRole: string,
    patientId: number,
  ) {
    console.log(
      "⚡ [AssistantContextService] Getting real-time suggestions...",
    );

    await this.openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `PARTIAL TRANSCRIPTION: "${partialTranscription}"
USER ROLE: ${userRole}
MODE: REAL_TIME_SUGGESTIONS

Provide immediate clinical suggestions based on this partial transcription.`,
    });

    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId,
    });

    // Wait for completion (should be fast for suggestions)
    let runStatus = await this.openai.beta.threads.runs.retrieve(
      threadId,
      run.id,
    );
    let attempts = 0;
    while (
      (runStatus.status === "in_progress" || runStatus.status === "queued") &&
      attempts < 20
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await this.openai.beta.threads.runs.retrieve(
        threadId,
        run.id,
      );
      attempts++;
    }

    if (runStatus.status === "completed") {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];

      if (lastMessage.content[0].type === "text") {
        const rawResponse = lastMessage.content[0].text.value;
        console.log("🔍 [AssistantContextService] Raw assistant response:", rawResponse);
        
        try {
          // Try to clean the response if it has markdown code blocks
          let cleanedResponse = rawResponse;
          if (rawResponse.includes('```json')) {
            cleanedResponse = rawResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
          }
          
          return JSON.parse(cleanedResponse);
        } catch (error) {
          console.error(
            "❌ [AssistantContextService] Failed to parse suggestions:",
            error,
          );
          console.error("🔍 [AssistantContextService] Raw response was:", rawResponse);
        }
      }
    }

    return { suggestions: [], clinicalFlags: [], historicalContext: "" };
  }

  // Complete processing after recording stops
  async processCompleteTranscription(
    threadId: string,
    fullTranscription: string,
    userRole: string,
    patientId: number,
    encounterId: number,
  ) {
    console.log(
      "📝 [AssistantContextService] Processing complete transcription...",
    );

    await this.openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `COMPLETE TRANSCRIPTION: "${fullTranscription}"
USER ROLE: ${userRole}
ENCOUNTER_ID: ${encounterId}
MODE: COMPLETE_PROCESSING

Generate SOAP note, draft orders, CPT codes, and chart updates.`,
    });

    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId,
    });

    // Wait for completion
    let runStatus = await this.openai.beta.threads.runs.retrieve(
      threadId,
      run.id,
    );
    let attempts = 0;
    while (
      (runStatus.status === "in_progress" || runStatus.status === "queued") &&
      attempts < 60
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(
        threadId,
        run.id,
      );
      attempts++;
    }

    if (runStatus.status === "completed") {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];

      if (lastMessage.content[0].type === "text") {
        try {
          return JSON.parse(lastMessage.content[0].text.value);
        } catch (error) {
          console.error(
            "❌ [AssistantContextService] Failed to parse complete response:",
            error,
          );
          throw new Error("Failed to parse assistant response");
        }
      }
    }

    throw new Error("Assistant processing failed or timed out");
  }

  private async getPatientHistory(patientId: number) {
    console.log(
      "📋 [AssistantContextService] Loading patient history for:",
      patientId,
    );

    try {
      // Get comprehensive patient data
      const [
        patient,
        familyHistoryData,
        socialHistoryData,
        allergiesData,
        recentVitals,
        currentMedications,
        activeDiagnoses,
        recentEncounters,
      ] = await Promise.all([
        db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
        db
          .select()
          .from(familyHistory)
          .where(eq(familyHistory.patientId, patientId)),
        db
          .select()
          .from(socialHistory)
          .where(eq(socialHistory.patientId, patientId)),
        db.select().from(allergies).where(eq(allergies.patientId, patientId)),
        db
          .select()
          .from(vitals)
          .where(eq(vitals.patientId, patientId))
          .orderBy(desc(vitals.measuredAt))
          .limit(10),
        db
          .select()
          .from(medications)
          .where(eq(medications.patientId, patientId)),
        db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)),
        db
          .select()
          .from(encounters)
          .where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.createdAt))
          .limit(5),
      ]);

      const history = {
        patient: patient[0],
        familyHistory: familyHistoryData,
        socialHistory: socialHistoryData,
        allergies: allergiesData,
        recentVitals,
        currentMedications,
        activeDiagnoses,
        recentEncounters,
      };

      console.log("📋 [AssistantContextService] ✅ Patient history loaded:", {
        hasPatient: !!history.patient,
        familyHistoryCount: history.familyHistory.length,
        allergiesCount: history.allergies.length,
        vitalsCount: history.recentVitals.length,
        medicationsCount: history.currentMedications.length,
        diagnosesCount: history.activeDiagnoses.length,
      });

      return history;
    } catch (error) {
      console.error(
        "❌ [AssistantContextService] Failed to load patient history:",
        error,
      );
      return {
        patient: null,
        familyHistory: [],
        socialHistory: [],
        allergies: [],
        recentVitals: [],
        currentMedications: [],
        activeDiagnoses: [],
        recentEncounters: [],
      };
    }
  }
}
