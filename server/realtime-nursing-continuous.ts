import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  diagnoses,
  medications,
  allergies,
  vitals,
  encounters as encountersTable,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class RealtimeNursingContinuous {
  private activeStreams = new Map<string, any>();
  private transcriptionBuffers = new Map<string, string>();
  private assessmentBuffers = new Map<string, string>();

  constructor() {}

  async startContinuousAssessment(
    patientId: number,
    encounterId: string,
    sessionId: string,
  ): Promise<ReadableStream> {
    console.log(
      `🩺 [ContinuousNursing] Starting continuous assessment for patient ${patientId}, session ${sessionId}`,
    );

    // Get patient context once at the beginning
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
        .orderBy(desc(diagnoses.id))
        .limit(10),
      db
        .select()
        .from(medications)
        .where(eq(medications.patientId, patientId))
        .orderBy(desc(medications.id))
        .limit(10),
      db
        .select()
        .from(allergies)
        .where(eq(allergies.patientId, patientId))
        .orderBy(desc(allergies.id))
        .limit(5),
      db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.id))
        .limit(5),
      db
        .select()
        .from(encountersTable)
        .where(eq(encountersTable.patientId, patientId))
        .orderBy(desc(encountersTable.id))
        .limit(3),
    ]);

    if (!patient.length) {
      throw new Error("Patient not found");
    }

    const patientData = patient[0];
    const age =
      new Date().getFullYear() -
      new Date(patientData.dateOfBirth).getFullYear();

    const medicalContext = this.buildNursingContext(
      patientData,
      age,
      diagnosisList,
      meds,
      allergiesList,
      vitalsList,
      recentEncounters,
    );

    // Initialize buffers
    this.transcriptionBuffers.set(sessionId, "");
    this.assessmentBuffers.set(sessionId, "");

    return new ReadableStream({
      start: (controller) => {
        this.activeStreams.set(sessionId, {
          controller,
          patientData,
          medicalContext,
          age,
          patientId,
          encounterId,
          lastUpdateTime: Date.now(),
          updateInterval: null,
        });

        // Send initial connection confirmation
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "connection_established",
              sessionId,
              patientId,
              message: "Continuous nursing assessment active",
            })}\n\n`,
          ),
        );

        // Start periodic assessment updates
        this.startPeriodicUpdates(sessionId);

        console.log(`✅ [ContinuousNursing] Stream established for session ${sessionId}`);
      },
      cancel: () => {
        this.stopContinuousAssessment(sessionId);
      },
    });
  }

  private startPeriodicUpdates(sessionId: string) {
    const streamData = this.activeStreams.get(sessionId);
    if (!streamData) return;

    // Update assessment every 10 seconds if there's new transcription
    streamData.updateInterval = setInterval(async () => {
      await this.generateIncrementalAssessment(sessionId);
    }, 10000); // 10 second intervals
  }

  async updateTranscription(sessionId: string, newTranscription: string) {
    const currentBuffer = this.transcriptionBuffers.get(sessionId) || "";
    
    // Only update if there's meaningful new content
    if (newTranscription.length > currentBuffer.length + 20) {
      this.transcriptionBuffers.set(sessionId, newTranscription);
      
      // Trigger immediate assessment update for significant new content
      await this.generateIncrementalAssessment(sessionId);
    }
  }

  private async generateIncrementalAssessment(sessionId: string) {
    const streamData = this.activeStreams.get(sessionId);
    const currentTranscription = this.transcriptionBuffers.get(sessionId) || "";
    
    if (!streamData || !currentTranscription.trim()) {
      return;
    }

    const { controller, patientData, medicalContext, age } = streamData;

    try {
      console.log(`🔄 [ContinuousNursing] Generating incremental assessment for session ${sessionId}`);

      const nursingPrompt = this.buildContinuousNursingPrompt(
        currentTranscription,
        medicalContext,
        patientData,
        age,
      );

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: nursingPrompt,
          },
          {
            role: "user",
            content: `Based on the current conversation, provide an updated nursing assessment. Focus on new information and observations since the last update:\n\n${currentTranscription}`,
          },
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 1500,
      });

      let incrementalAssessment = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          incrementalAssessment += content;
          
          // Stream each chunk immediately
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "assessment_chunk",
                content,
                sessionId,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          );
        }
      }

      // Update the assessment buffer
      this.assessmentBuffers.set(sessionId, incrementalAssessment);

      // Send completion marker
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: "assessment_update_complete",
            fullAssessment: incrementalAssessment,
            sessionId,
            timestamp: new Date().toISOString(),
          })}\n\n`,
        ),
      );

      console.log(`✅ [ContinuousNursing] Assessment update completed for session ${sessionId}`);

    } catch (error) {
      console.error(`❌ [ContinuousNursing] Error in incremental assessment:`, error);
      
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: "error",
            message: "Failed to generate assessment update",
            sessionId,
          })}\n\n`,
        ),
      );
    }

    // Update last update time
    streamData.lastUpdateTime = Date.now();
  }

  stopContinuousAssessment(sessionId: string) {
    const streamData = this.activeStreams.get(sessionId);
    
    if (streamData) {
      if (streamData.updateInterval) {
        clearInterval(streamData.updateInterval);
      }
      
      // Send final assessment
      const finalAssessment = this.assessmentBuffers.get(sessionId);
      if (finalAssessment && streamData.controller) {
        streamData.controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "final_assessment",
              assessment: finalAssessment,
              sessionId,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );
      }

      streamData.controller?.close();
    }

    // Cleanup
    this.activeStreams.delete(sessionId);
    this.transcriptionBuffers.delete(sessionId);
    this.assessmentBuffers.delete(sessionId);
    
    console.log(`🔌 [ContinuousNursing] Session ${sessionId} closed and cleaned up`);
  }

  private buildNursingContext(
    patient: any,
    age: number,
    diagnoses: any[],
    medications: any[],
    allergies: any[],
    vitals: any[],
    encounters: any[],
  ): string {
    const context = [];

    context.push(`**PATIENT INFORMATION:**`);
    context.push(`Name: ${patient.firstName} ${patient.lastName}`);
    context.push(`Age: ${age} years old`);
    context.push(`Gender: ${patient.gender}`);
    context.push(`MRN: ${patient.mrn}`);

    if (diagnoses.length > 0) {
      context.push(`\n**MEDICAL PROBLEMS:**`);
      diagnoses.forEach((dx) => {
        context.push(`- ${dx.diagnosis} (${dx.status})`);
      });
    }

    if (medications.length > 0) {
      context.push(`\n**CURRENT MEDICATIONS:**`);
      medications.forEach((med) => {
        context.push(`- ${med.medicationName} ${med.dosage} ${med.frequency}`);
      });
    }

    if (allergies.length > 0) {
      context.push(`\n**ALLERGIES:**`);
      allergies.forEach((allergy) => {
        context.push(`- ${allergy.allergen}: ${allergy.reaction || "Unknown reaction"}`);
      });
    }

    if (vitals.length > 0) {
      context.push(`\n**RECENT VITAL SIGNS:**`);
      const latestVitals = vitals[0];
      if (latestVitals.bloodPressure) context.push(`BP: ${latestVitals.bloodPressure}`);
      if (latestVitals.heartRate) context.push(`HR: ${latestVitals.heartRate}`);
      if (latestVitals.temperature) context.push(`Temp: ${latestVitals.temperature}`);
      if (latestVitals.respiratoryRate) context.push(`RR: ${latestVitals.respiratoryRate}`);
      if (latestVitals.oxygenSaturation) context.push(`SpO2: ${latestVitals.oxygenSaturation}`);
    }

    return context.join("\n");
  }

  private buildContinuousNursingPrompt(
    transcription: string,
    medicalContext: string,
    patient: any,
    age: number,
  ): string {
    return `You are an expert registered nurse providing continuous nursing assessment during patient encounters.

**PATIENT CONTEXT:**
${medicalContext}

**CONTINUOUS ASSESSMENT GUIDELINES:**
1. **Real-time Focus**: Assess information as it becomes available during the conversation
2. **Incremental Updates**: Build upon previous assessments, noting new observations
3. **Nursing Priorities**: Focus on nursing-specific concerns and interventions
4. **Safety First**: Immediately identify any safety concerns or red flags
5. **Patient Comfort**: Note comfort level, pain, anxiety, or distress

**ASSESSMENT STRUCTURE:**
- **Immediate Observations**: What stands out right now?
- **Nursing Concerns**: Key areas requiring nursing attention
- **Safety Assessment**: Any immediate safety issues?
- **Comfort Status**: Patient comfort and pain level
- **Teaching Opportunities**: Patient education needs identified
- **Planned Interventions**: What nursing actions are needed?

**INSTRUCTIONS:**
- Provide concise, actionable nursing assessments
- Focus on what can be observed and assessed NOW
- Highlight changes from baseline when applicable
- Use nursing language and terminology
- Be specific about nursing interventions needed

Generate a focused nursing assessment based on the current conversation content. Keep it practical and action-oriented for bedside nursing care.`;
  }

  // Get current assessment for a session
  getCurrentAssessment(sessionId: string): string {
    return this.assessmentBuffers.get(sessionId) || "";
  }

  // Check if session is active
  isSessionActive(sessionId: string): boolean {
    return this.activeStreams.has(sessionId);
  }
}

export const realtimeNursingContinuous = new RealtimeNursingContinuous();