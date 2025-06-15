import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  diagnoses,
  medications,
  allergies,
  vitals,
  encounters as encountersTable,
  type InsertOrder,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { SOAPOrdersExtractor } from "./soap-orders-extractor.js";
import { PhysicalExamLearningService } from "./physical-exam-learning-service.js";
import { gptOrderDeduplication } from "./gpt-order-deduplication-service.js";
import { storage } from "./storage.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class RealtimeNursingStreaming {
  private soapOrdersExtractor: SOAPOrdersExtractor;
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.soapOrdersExtractor = new SOAPOrdersExtractor();
    this.physicalExamLearningService = new PhysicalExamLearningService();
  }

  async generateNursingAssessmentStream(
    patientId: number,
    encounterId: string,
    transcription: string,
  ): Promise<ReadableStream> {
    console.log(
      `🩺 [RealtimeNursing] Starting streaming nursing assessment generation for patient ${patientId}`,
    );

    // Get patient context (same as SOAP service)
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

    // Build medical context for nursing assessment
    const medicalContext = this.buildNursingContext(
      patientData,
      age,
      diagnosisList,
      meds,
      allergiesList,
      vitalsList,
      recentEncounters,
    );

    // Create the nursing assessment prompt
    const nursingPrompt = this.buildNursingPrompt(
      transcription,
      medicalContext,
      patientData,
      age,
    );

    console.log(`🩺 [RealtimeNursing] Starting OpenAI streaming request`);

    // Create streaming response
    const self = this;
    return new ReadableStream({
      async start(controller) {
        try {
          const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: nursingPrompt,
              },
              {
                role: "user",
                content: `Please generate a comprehensive nursing assessment based on this transcription:\n\n${transcription}`,
              },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 3000,
          });

          let fullAssessment = "";

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullAssessment += content;
            }
          }

          // Send the complete nursing assessment
          const responseData = {
            type: "response.text.done",
            text: fullAssessment,
          };

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(responseData)}\n\n`),
          );

          // Generate nursing interventions based on assessment
          const interventions = await self.generateNursingInterventions(
            fullAssessment,
            medicalContext,
          );

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "nursing_interventions",
                interventions,
              })}\n\n`,
            ),
          );

          // Generate draft orders (same as provider)
          const draftOrders = await self.soapOrdersExtractor.extractOrdersFromSOAP(
            fullAssessment,
            patientId,
            parseInt(encounterId),
          );

          if (draftOrders.length > 0) {
            console.log(`📋 [RealtimeNursing] Generated ${draftOrders.length} draft orders`);
            
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "draft_orders",
                  orders: draftOrders,
                })}\n\n`,
              ),
            );
          }

          controller.close();
        } catch (error) {
          console.error("❌ [RealtimeNursing] Error in streaming:", error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });
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

  private buildNursingPrompt(
    transcription: string,
    medicalContext: string,
    patient: any,
    age: number,
  ): string {
    return `You are an expert registered nurse creating comprehensive nursing assessments. 

**PATIENT CONTEXT:**
${medicalContext}

**NURSING ASSESSMENT GUIDELINES:**
1. **Assessment Structure**: Use systematic nursing assessment format
   - General Appearance & Mental Status
   - Neurological Assessment
   - Cardiovascular Assessment  
   - Respiratory Assessment
   - Gastrointestinal Assessment
   - Genitourinary Assessment
   - Musculoskeletal Assessment
   - Integumentary Assessment
   - Pain Assessment
   - Psychosocial Assessment

2. **Nursing Focus Areas**:
   - Patient safety and fall risk
   - Pain management and comfort measures
   - Medication administration and patient education
   - Functional status and mobility
   - Patient and family education needs
   - Discharge planning considerations

3. **Documentation Standards**:
   - Use objective, measurable observations
   - Include patient's own words when relevant
   - Document nursing interventions performed
   - Note patient response to interventions
   - Identify priority nursing diagnoses

4. **Safety Considerations**:
   - Fall risk assessment
   - Skin integrity assessment
   - Infection prevention measures
   - Patient identification and communication needs

Generate a comprehensive nursing assessment that follows nursing documentation standards and focuses on nursing-specific observations and interventions. Include nursing diagnoses and planned interventions where appropriate.

**TRANSCRIPTION TO ANALYZE:**
${transcription}

Create a detailed nursing assessment that captures the nursing perspective of patient care.`;
  }

  private async generateNursingInterventions(
    assessment: string,
    medicalContext: string,
  ): Promise<any> {
    try {
      const interventionsPrompt = `Based on this nursing assessment and patient context, generate specific nursing interventions:

**NURSING ASSESSMENT:**
${assessment}

**PATIENT CONTEXT:**
${medicalContext}

Generate nursing interventions in the following categories:
1. **Priority Interventions** (immediate needs)
2. **Comfort Measures** (pain, positioning, environment)
3. **Safety Measures** (fall prevention, infection control)
4. **Education** (patient and family teaching)
5. **Monitoring** (assessments to continue)
6. **Discharge Planning** (preparation for discharge)

Format as JSON with categories and specific interventions for each.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert nurse generating evidence-based nursing interventions.",
          },
          {
            role: "user",
            content: interventionsPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "";
      
      try {
        return JSON.parse(content);
      } catch {
        // If JSON parsing fails, return structured format
        return {
          priority: ["Monitor vital signs", "Assess pain level"],
          comfort: ["Position for comfort", "Provide pain relief measures"],
          safety: ["Implement fall precautions", "Maintain skin integrity"],
          education: ["Educate on medications", "Teach safety measures"],
          monitoring: ["Continue assessment", "Monitor for changes"],
          discharge: ["Assess readiness", "Coordinate care"]
        };
      }
    } catch (error) {
      console.error("Error generating nursing interventions:", error);
      return {
        priority: ["Complete comprehensive assessment"],
        comfort: ["Ensure patient comfort"],
        safety: ["Maintain patient safety"],
        education: ["Provide patient education"],
        monitoring: ["Continue monitoring"],
        discharge: ["Plan for discharge needs"]
      };
    }
  }
}

export const realtimeNursingStreaming = new RealtimeNursingStreaming();