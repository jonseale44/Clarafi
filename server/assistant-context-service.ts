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
import { PrivacyService } from "./privacy-service.js";

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

    // Create new de-identified patient-specific assistant
    const deidentifiedId = `P${patientId.toString().padStart(3, '0')}`;
    console.log(`🤖 [AssistantContextService] Creating new de-identified assistant for patient ${patientId} (${deidentifiedId})...`);
    
    // Get de-identified patient context
    const deidentifiedContext = await this.getDeidentifiedPatientContext(patientId);
    const instructions = PrivacyService.createDeidentifiedInstructions(deidentifiedContext, 'provider');
    
    const assistant = await this.openai.beta.assistants.create({
      name: PrivacyService.createAssistantName(deidentifiedId),
      instructions: instructions,
      model: "gpt-4",
      tools: []
    });

    // Store the assistant ID in the database
    await db.update(patients)
      .set({ assistantId: assistant.id })
      .where(eq(patients.id, patientId));

    // Cache the assistant ID
    this.patientAssistants.set(patientId, assistant.id);
    
    console.log(`✅ [AssistantContextService] Created de-identified assistant ${assistant.id} for patient ${deidentifiedId}`);
    return assistant.id;
  }

  /**
   * Get de-identified patient context for assistant creation
   */
  private async getDeidentifiedPatientContext(patientId: number): Promise<any> {
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (patient.length === 0) {
      throw new Error(`Patient ${patientId} not found`);
    }

    // Get recent encounters - using a different approach to avoid SQL syntax issues
    const recentEncounters = await db.select()
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .limit(5);

    // Get latest vitals - using a different approach to avoid SQL syntax issues
    const latestVitals = await db.select()
      .from(vitals)
      .where(eq(vitals.patientId, patientId))
      .limit(1);

    return PrivacyService.deidentifyPatientData(patient[0], recentEncounters, latestVitals);
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
  ): Promise<string> {
    try {
      // Get the patient's assistant
      const assistantId = await this.getOrCreatePatientAssistant(patientId);

      // Wait for any existing runs to complete before creating a new one
      await this.waitForThreadReady(threadId);

      // Create SOAP note generation prompt identical to external implementation
      const soapPrompt = `Generate a SOAP note with the following sections, each preceded by FOUR blank lines:

(preceded by FOUR blank lines)**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

(preceded by FOUR blank lines)**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

PHYSICAL EXAM:

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

Use concise, structured phrases. Avoid full sentences and narrative explanations.

Labs: List any lab results if available. If none, state "No labs reported today."

(preceded by FOUR blank lines)**ASSESSMENT/PLAN:**

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

(preceded by FOUR blank lines)**ORDERS:** 

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

ENCOUNTER TRANSCRIPTION:
${fullTranscription}`;

      // Add the SOAP generation request to the thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: soapPrompt
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      // Wait for completion with timeout
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      
      while ((runStatus.status === "in_progress" || runStatus.status === "queued") && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
        attempts++;
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
            console.log(`✅ [AssistantContextService] Generated SOAP note (${content.text.value.length} characters)`);
            return content.text.value;
          }
        }
      } else {
        console.error(`❌ [AssistantContextService] Assistant run failed with status: ${runStatus.status}`);
        if (runStatus.last_error) {
          console.error(`❌ [AssistantContextService] Error details:`, runStatus.last_error);
        }
      }

      return "Unable to generate SOAP note at this time. Please try again.";
    } catch (error) {
      console.error('❌ [AssistantContextService] Error processing complete transcription:', error);
      return "Unable to process transcription at this time. Please check your connection and try again.";
    }
  }

  private async waitForThreadReady(threadId: string): Promise<void> {
    try {
      // Check for any active runs on this thread
      const runs = await this.openai.beta.threads.runs.list(threadId, {
        limit: 10
      });

      const activeRuns = runs.data.filter(run => 
        run.status === "in_progress" || run.status === "queued"
      );

      if (activeRuns.length > 0) {
        console.log(`🔄 [AssistantContextService] Waiting for ${activeRuns.length} active runs to complete...`);
        
        // Wait for all active runs to complete
        await Promise.all(activeRuns.map(async (run) => {
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds max wait
          
          while (attempts < maxAttempts) {
            const runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            if (runStatus.status !== "in_progress" && runStatus.status !== "queued") {
              console.log(`✅ [AssistantContextService] Run ${run.id} completed with status: ${runStatus.status}`);
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            console.warn(`⚠️ [AssistantContextService] Run ${run.id} did not complete within timeout`);
          }
        }));
      }
    } catch (error) {
      console.error('❌ [AssistantContextService] Error waiting for thread to be ready:', error);
      // Continue anyway - we'll handle the conflict in the main function
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