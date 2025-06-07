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
import { SOAPOrdersExtractor } from "./soap-orders-extractor.js";
import { storage } from "./storage.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class RealtimeSOAPStreaming {
  private soapOrdersExtractor: SOAPOrdersExtractor;

  constructor() {
    this.soapOrdersExtractor = new SOAPOrdersExtractor();
  }

  async generateSOAPNoteStream(
    patientId: number,
    encounterId: string,
    transcription: string,
  ): Promise<ReadableStream> {
    console.log(
      `🩺 [RealtimeSOAP] Starting streaming SOAP generation for patient ${patientId}`,
    );

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
        .from(encounters)
        .where(eq(encounters.patientId, patientId))
        .orderBy(desc(encounters.id))
        .limit(3),
    ]);

    if (!patient.length) {
      throw new Error("Patient not found");
    }

    const patientData = patient[0];
    const age =
      new Date().getFullYear() -
      new Date(patientData.dateOfBirth).getFullYear();

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

**SUBJECTIVE222:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

**OBJECTIVE222:** Organize this section as follows:

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
- Format the note for easy reading and clinical handoff.
- If you see 222 in the section headers, keep it, IT'S NOT A TYPO.`;

    // Generate SOAP note first
    console.log("🔄 [RealtimeSOAP] Creating batch SOAP completion...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: soapPrompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const soapNote = completion.choices[0]?.message?.content;
    if (!soapNote) {
      throw new Error("No SOAP note generated from OpenAI");
    }

    // Create streaming response and handle extractions after SOAP delivery
    const self = this;

    return new ReadableStream({
      async start(controller) {
        try {
          // Send complete SOAP note in batch (like your working system)
          const completeData = JSON.stringify({
            type: "response.text.done",
            text: soapNote,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${completeData}\n\n`),
          );

          // Process extractions in background after SOAP note is delivered
          try {
            // Save SOAP note to encounter first
            await storage.updateEncounter(parseInt(encounterId), {
              note: soapNote,
            });

            // Extract draft orders
            const extractedOrders =
              await self.soapOrdersExtractor.extractOrders(
                soapNote,
                patientId,
                parseInt(encounterId),
              );

            if (extractedOrders && extractedOrders.length > 0) {
              // Save orders to database
              console.log(`🗄️ [RealtimeSOAP] Saving ${extractedOrders.length} orders to database...`);
              
              for (const order of extractedOrders) {
                try {
                  const savedOrder = await storage.createOrder(order);
                  console.log(`✅ [RealtimeSOAP] Saved order: ${order.orderType} - ${order.medicationName || order.labName || order.studyType || order.specialtyType}`);
                } catch (saveError) {
                  console.error(`❌ [RealtimeSOAP] Failed to save order:`, order, saveError);
                }
              }

              // Send orders to frontend via stream
              const ordersData = JSON.stringify({
                type: "draft_orders",
                orders: extractedOrders,
              });
              controller.enqueue(
                new TextEncoder().encode(`data: ${ordersData}\n\n`),
              );
              console.log(
                `✅ [RealtimeSOAP] Extracted and saved ${extractedOrders.length} draft orders`,
              );
            } else {
              console.log(`⚠️ [RealtimeSOAP] No orders extracted from SOAP note`);
            }

            // Extract CPT codes and diagnoses
            await self.extractCPTCodesAndDiagnoses(
              soapNote,
              patientId,
              parseInt(encounterId),
            );
          } catch (extractionError) {
            console.error(
              "❌ [RealtimeSOAP] Error in background extractions:",
              extractionError,
            );
          }

          console.log(
            "✅ [RealtimeSOAP] SOAP generation and extraction completed",
          );
          controller.close();
        } catch (error: any) {
          console.error("❌ [RealtimeSOAP] Error in streaming:", error);

          const errorData = JSON.stringify({
            type: "error",
            message:
              (error as Error)?.message || "Failed to generate SOAP note",
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${errorData}\n\n`),
          );
          controller.close();
        }
      },
    });
  }

  /**
   * Process SOAP extractions (draft orders and CPT codes) in parallel
   */
  private async processSOAPExtractions(
    soapNote: string,
    patientId: number,
    encounterId: number,
  ): Promise<{ orders: any[] }> {
    try {
      const results = await Promise.allSettled([
        // Extract structured orders from the generated SOAP note
        this.soapOrdersExtractor.extractOrders(
          soapNote,
          patientId,
          encounterId,
        ),

        // Extract CPT codes and diagnoses from SOAP note
        this.extractCPTCodesAndDiagnoses(soapNote, patientId, encounterId),

        // Save SOAP note to encounter
        storage.updateEncounter(encounterId, {
          note: soapNote,
        }),
      ]);

      // Extract orders result
      const ordersResult = results[0];
      let extractedOrders: any[] = [];

      if (ordersResult.status === "fulfilled" && ordersResult.value) {
        extractedOrders = ordersResult.value;
        console.log(
          `✅ [RealtimeSOAP] Extracted ${extractedOrders.length} draft orders`,
        );
      } else if (ordersResult.status === "rejected") {
        console.error(
          "❌ [RealtimeSOAP] Error extracting orders:",
          ordersResult.reason,
        );
      }

      // Log other results
      if (results[1].status === "rejected") {
        console.error(
          "❌ [RealtimeSOAP] Error extracting CPT codes:",
          results[1].reason,
        );
      }
      if (results[2].status === "rejected") {
        console.error(
          "❌ [RealtimeSOAP] Error saving SOAP note:",
          results[2].reason,
        );
      }

      return { orders: extractedOrders };
    } catch (error: any) {
      console.error(
        "❌ [RealtimeSOAP] Error processing SOAP extractions:",
        error,
      );
      return { orders: [] };
    }
  }

  /**
   * Extract CPT codes and diagnoses from SOAP note and save to database
   */
  private async extractCPTCodesAndDiagnoses(
    soapNote: string,
    patientId: number,
    encounterId: number,
  ): Promise<void> {
    try {
      console.log(
        `🏥 [RealtimeSOAP] Extracting CPT codes for patient ${patientId}, encounter ${encounterId}`,
      );

      const { CPTExtractor } = await import("./cpt-extractor.js");
      const cptExtractor = new CPTExtractor();

      const extractedCPTData =
        await cptExtractor.extractCPTCodesAndDiagnoses(soapNote);

      if (
        extractedCPTData &&
        (extractedCPTData.cptCodes?.length > 0 ||
          extractedCPTData.diagnoses?.length > 0)
      ) {
        console.log(
          `🏥 [RealtimeSOAP] Found ${extractedCPTData.cptCodes?.length || 0} CPT codes and ${extractedCPTData.diagnoses?.length || 0} diagnoses`,
        );

        // Update encounter with CPT codes and diagnoses
        await storage.updateEncounter(encounterId, {
          cptCodes: extractedCPTData.cptCodes || [],
          draftDiagnoses: extractedCPTData.diagnoses || [],
        });

        // Store individual diagnoses in diagnoses table for billing integration
        if (extractedCPTData.diagnoses?.length > 0) {
          for (const diagnosis of extractedCPTData.diagnoses) {
            try {
              await storage.createDiagnosis({
                patientId,
                encounterId,
                diagnosis: diagnosis.diagnosis,
                icd10Code: diagnosis.icd10Code,
                diagnosisDate: new Date().toISOString().split("T")[0],
                status: diagnosis.isPrimary ? "active" : "active",
                notes: `Auto-extracted from SOAP note on ${new Date().toISOString()}`,
              });
            } catch (diagnosisError) {
              console.error(
                `❌ [RealtimeSOAP] Error creating diagnosis:`,
                diagnosisError,
              );
            }
          }
          console.log(
            `✅ [RealtimeSOAP] Created ${extractedCPTData.diagnoses.length} diagnosis records for billing`,
          );
        }
      } else {
        console.log(
          `ℹ️ [RealtimeSOAP] No CPT codes or diagnoses found in SOAP note`,
        );
      }
    } catch (error) {
      console.error("❌ [RealtimeSOAP] Error extracting CPT codes:", error);
    }
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
    const currentDiagnoses =
      diagnosisList.length > 0
        ? diagnosisList
            .map((d) => `- ${d.condition} (${d.icd10Code || "unspecified"})`)
            .join("\n")
        : "- No active diagnoses on file";

    const currentMedications =
      meds.length > 0
        ? meds.map((m) => `- ${m.name}: ${m.dosage}, ${m.frequency}`).join("\n")
        : "- No current medications on file";

    const knownAllergies =
      allergiesList.length > 0
        ? allergiesList
            .map((a) => `- ${a.allergen}: ${a.reaction} (${a.severity})`)
            .join("\n")
        : "- NKDA (No Known Drug Allergies)";

    const recentVitals =
      vitalsList.length > 0
        ? `Recent Vitals: ${vitalsList[0].systolic}/${vitalsList[0].diastolic} mmHg, HR ${vitalsList[0].heartRate}, Temp ${vitalsList[0].temperature}°F`
        : "No recent vitals available";

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
