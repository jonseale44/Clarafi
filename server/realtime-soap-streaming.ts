import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  medications,
  allergies,
  vitals,
  encounters as encountersTable,
  type InsertOrder,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { SOAPOrdersExtractor } from "./soap-orders-extractor.js";
import { PhysicalExamLearningService } from "./physical-exam-learning-service.js";
import { storage } from "./storage.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class RealtimeSOAPStreaming {
  private soapOrdersExtractor: SOAPOrdersExtractor;
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.soapOrdersExtractor = new SOAPOrdersExtractor();
    this.physicalExamLearningService = new PhysicalExamLearningService();
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

- If the physical exam is completely normal, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded

Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.

Use concise, structured phrases. Avoid full sentences and narrative explanations.

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

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

    // Start SOAP generation AND draft orders extraction CONCURRENTLY
    console.log(
      "🔄 [RealtimeSOAP] Starting concurrent SOAP and orders processing...",
    );

    const self = this;

    // Start all three processes simultaneously for maximum speed!
    console.log("🩺 [RealtimeSOAP] Starting SOAP generation...");
    const soapPromise = openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: soapPrompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    // Start draft orders extraction immediately using the same transcription
    console.log("📋 [RealtimeSOAP] Starting draft orders extraction...");
    const ordersPromise = self.soapOrdersExtractor.extractOrders(
      transcription, // Use transcription directly for faster processing
      patientId,
      parseInt(encounterId),
    );

    // Wait for SOAP note generation first, then extract CPT codes from SOAP
    console.log(
      "🏥 [RealtimeSOAP] Will extract CPT codes from generated SOAP note...",
    );

    return new ReadableStream({
      async start(controller) {
        try {
          // Wait for SOAP generation and orders extraction
          console.log(
            "⏳ [RealtimeSOAP] Waiting for SOAP generation and orders extraction...",
          );
          const [soapCompletion, extractedOrders] = await Promise.all([
            soapPromise,
            ordersPromise,
          ]);

          console.log("✅ [RealtimeSOAP] SOAP generation and orders completed");
          console.log(
            `📋 [RealtimeSOAP] Orders extracted: ${extractedOrders?.length || 0}`,
          );

          const soapNote = soapCompletion.choices[0]?.message?.content;
          if (!soapNote) {
            throw new Error("No SOAP note generated from OpenAI");
          }

          console.log(
            `🩺 [RealtimeSOAP] SOAP note generated (${soapNote.length} chars)`,
          );

          // Now extract CPT codes from the generated SOAP note
          console.log(
            "🏥 [RealtimeSOAP] Starting CPT codes extraction from SOAP note...",
          );
          const extractedCPTData = await self.extractCPTFromSOAP(
            soapNote,
            patientId,
            parseInt(encounterId),
          );

          console.log(
            `🏥 [RealtimeSOAP] CPT data result:`,
            extractedCPTData ? "Success" : "Failed",
          );

          // Send SOAP note immediately
          const completeData = JSON.stringify({
            type: "response.text.done",
            text: soapNote,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${completeData}\n\n`),
          );

          // Now extract additional orders from the completed SOAP note and merge with deduplication
          console.log("📋 [RealtimeSOAP] Extracting additional orders from SOAP note...");
          const soapBasedOrders = await self.soapOrdersExtractor.extractOrders(
            soapNote,
            patientId,
            parseInt(encounterId),
          );

          // Merge and deduplicate orders
          const mergedOrders = self.mergeAndDeduplicateOrders(extractedOrders || [], soapBasedOrders || []);
          console.log(
            `📋 [RealtimeSOAP] Merged orders: ${extractedOrders?.length || 0} from transcription + ${soapBasedOrders?.length || 0} from SOAP = ${mergedOrders.length} total (after deduplication)`
          );

          // Save merged orders in parallel
          if (mergedOrders && mergedOrders.length > 0) {
            const savePromises = mergedOrders.map((order: InsertOrder) =>
              storage.createOrder(order).catch((error) => {
                console.error(
                  `❌ [RealtimeSOAP] Failed to save order:`,
                  order.orderType,
                  error,
                );
                return null;
              }),
            );

            await Promise.allSettled(savePromises);
            console.log(
              `⚡ [RealtimeSOAP] Saved ${mergedOrders.length} merged orders`,
            );

            // Send merged orders to frontend
            const ordersData = JSON.stringify({
              type: "draft_orders",
              orders: mergedOrders,
            });
            controller.enqueue(
              new TextEncoder().encode(`data: ${ordersData}\n\n`),
            );
          }

          // Send CPT codes to frontend immediately if available
          console.log("🔍 [RealtimeSOAP] Checking CPT extraction results...");
          console.log("🔍 [RealtimeSOAP] extractedCPTData:", extractedCPTData);

          if (extractedCPTData) {
            console.log(
              "🔍 [RealtimeSOAP] CPT codes found:",
              extractedCPTData.cptCodes?.length || 0,
            );
            console.log(
              "🔍 [RealtimeSOAP] Diagnoses found:",
              extractedCPTData.diagnoses?.length || 0,
            );
            console.log(
              "🔍 [RealtimeSOAP] CPT codes array:",
              extractedCPTData.cptCodes,
            );
            console.log(
              "🔍 [RealtimeSOAP] Diagnoses array:",
              extractedCPTData.diagnoses,
            );
          }

          const hasCptCodes = extractedCPTData?.cptCodes?.length > 0;
          const hasDiagnoses = extractedCPTData?.diagnoses?.length > 0;
          console.log("🔍 [RealtimeSOAP] Has CPT codes:", hasCptCodes);
          console.log("🔍 [RealtimeSOAP] Has diagnoses:", hasDiagnoses);
          console.log(
            "🔍 [RealtimeSOAP] Condition check:",
            extractedCPTData && (hasCptCodes || hasDiagnoses),
          );

          if (extractedCPTData && (hasCptCodes || hasDiagnoses)) {
            console.log(
              `⚡ [RealtimeSOAP] Fast-extracted ${extractedCPTData.cptCodes?.length || 0} CPT codes and ${extractedCPTData.diagnoses?.length || 0} diagnoses`,
            );

            // Save CPT data to encounter immediately
            console.log("💾 [RealtimeSOAP] Saving CPT data to encounter...");
            console.log(
              "💾 [RealtimeSOAP] Encounter ID:",
              parseInt(encounterId),
            );
            console.log(
              "💾 [RealtimeSOAP] CPT codes to save:",
              extractedCPTData.cptCodes,
            );
            console.log(
              "💾 [RealtimeSOAP] Diagnoses to save:",
              extractedCPTData.diagnoses,
            );

            const updateResult = await storage.updateEncounter(
              parseInt(encounterId),
              {
                cptCodes: extractedCPTData.cptCodes || [],
                draftDiagnoses: extractedCPTData.diagnoses || [],
              },
            );

            console.log(
              "💾 [RealtimeSOAP] Encounter update result:",
              updateResult,
            );
            console.log(
              "✅ [RealtimeSOAP] CPT data saved to encounter database",
            );

            // Send CPT data to frontend immediately with automatic mappings
            console.log("📤 [RealtimeSOAP] Streaming CPT codes to frontend...");
            const cptData = JSON.stringify({
              type: "cpt_codes",
              cptCodes: extractedCPTData.cptCodes || [],
              diagnoses: extractedCPTData.diagnoses || [],
              mappings: extractedCPTData.mappings || [],
            });
            controller.enqueue(
              new TextEncoder().encode(`data: ${cptData}\n\n`),
            );
            console.log(
              "✅ [RealtimeSOAP] CPT codes streamed to frontend with automatic mappings",
            );
          } else {
            console.log(
              "⚠️ [RealtimeSOAP] No CPT codes or diagnoses found to stream",
            );
          }

          // Start remaining extractions in parallel immediately after SOAP delivery
          const parallelExtractions = Promise.allSettled([
            // Save SOAP note to encounter
            storage.updateEncounter(parseInt(encounterId), {
              note: soapNote,
            }),

            // Analyze for physical exam learning (background processing)
            self.physicalExamLearningService
              .analyzeSOAPNoteForPersistentFindings(
                patientId,
                parseInt(encounterId),
                soapNote,
              )
              .catch((error) => {
                console.warn(
                  "🧠 [RealtimeSOAP] Physical exam learning analysis failed:",
                  error,
                );
                return null;
              }),
          ]);

          // Don't wait for extractions to complete - let them run in background
          parallelExtractions
            .then((results) => {
              const [soapSave, physicalExamResult] = results;

              if (soapSave.status === "fulfilled") {
                console.log(`✅ [RealtimeSOAP] SOAP note saved`);
              }
              if (physicalExamResult.status === "fulfilled") {
                console.log(
                  `✅ [RealtimeSOAP] Physical exam learning analysis completed`,
                );
              }
            })
            .catch((error) => {
              console.error(
                "❌ [RealtimeSOAP] Background extraction error:",
                error,
              );
            });

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
   * Merge and deduplicate orders from transcription and SOAP note
   * Simple deduplication based on medication name, lab name, or imaging study type
   */
  private mergeAndDeduplicateOrders(transcriptionOrders: InsertOrder[], soapOrders: InsertOrder[]): InsertOrder[] {
    console.log("🔄 [RealtimeSOAP] Starting order merge and deduplication...");
    
    // Start with transcription orders (these are faster and should take priority)
    const mergedOrders = [...transcriptionOrders];
    const existingOrderKeys = new Set();
    
    // Create keys for existing orders to check for duplicates
    transcriptionOrders.forEach(order => {
      let key = '';
      switch (order.orderType) {
        case 'medication':
          key = `med_${order.medicationName?.toLowerCase().trim()}`;
          break;
        case 'lab':
          key = `lab_${order.testName?.toLowerCase().trim() || order.labName?.toLowerCase().trim()}`;
          break;
        case 'imaging':
          key = `img_${order.studyType?.toLowerCase().trim()}_${order.region?.toLowerCase().trim()}`;
          break;
        case 'referral':
          key = `ref_${order.specialtyType?.toLowerCase().trim()}`;
          break;
        default:
          key = `other_${order.orderType}_${JSON.stringify(order).substring(0, 50)}`;
      }
      existingOrderKeys.add(key);
    });
    
    console.log(`📋 [RealtimeSOAP] Existing order keys from transcription:`, Array.from(existingOrderKeys));
    
    // Add SOAP orders that don't already exist
    let addedFromSOAP = 0;
    soapOrders.forEach(order => {
      let key = '';
      switch (order.orderType) {
        case 'medication':
          key = `med_${order.medicationName?.toLowerCase().trim()}`;
          break;
        case 'lab':
          key = `lab_${order.testName?.toLowerCase().trim() || order.labName?.toLowerCase().trim()}`;
          break;
        case 'imaging':
          key = `img_${order.studyType?.toLowerCase().trim()}_${order.region?.toLowerCase().trim()}`;
          break;
        case 'referral':
          key = `ref_${order.specialtyType?.toLowerCase().trim()}`;
          break;
        default:
          key = `other_${order.orderType}_${JSON.stringify(order).substring(0, 50)}`;
      }
      
      if (!existingOrderKeys.has(key)) {
        mergedOrders.push(order);
        existingOrderKeys.add(key);
        addedFromSOAP++;
        console.log(`➕ [RealtimeSOAP] Added new order from SOAP: ${key}`);
      } else {
        console.log(`🚫 [RealtimeSOAP] Skipped duplicate order: ${key}`);
      }
    });
    
    console.log(`📋 [RealtimeSOAP] Deduplication complete: ${addedFromSOAP} new orders added from SOAP`);
    return mergedOrders;
  }

  /**
   * LEGACY: Removed duplicate order extraction - now handled by concurrent processing
   * This method was causing duplicate draft orders with 5-10 second delay
   */
  private async processSOAPExtractions(
    soapNote: string,
    patientId: number,
    encounterId: number,
  ): Promise<{ orders: any[] }> {
    console.log(
      "🚫 [RealtimeSOAP] processSOAPExtractions disabled - orders handled by concurrent processing",
    );
    return { orders: [] };
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

  /**
   * Extract CPT codes from generated SOAP note (sequential after SOAP generation)
   */
  private async extractCPTFromSOAP(
    soapNote: string,
    patientId: number,
    encounterId: number,
  ): Promise<any> {
    try {
      console.log(
        `🏥 [RealtimeSOAP] Extracting CPT codes from SOAP note for patient ${patientId}, encounter ${encounterId}`,
      );
      console.log(
        `🏥 [RealtimeSOAP] SOAP note length: ${soapNote.length} characters`,
      );

      // Get patient context for accurate coding
      const patientContext = await this.getPatientContext(patientId);
      console.log(`🏥 [RealtimeSOAP] Patient context:`, patientContext);

      const { CPTExtractor } = await import("./cpt-extractor.js");
      const cptExtractor = new CPTExtractor();

      // Extract CPT codes from SOAP note with patient context for billing optimization
      console.log(`🏥 [RealtimeSOAP] Starting advanced CPT extraction from SOAP...`);
      console.log(
        `📄 [RealtimeSOAP] SOAP note being sent to CPT extractor (${soapNote.length} chars):`,
      );
      console.log(
        `📋 [RealtimeSOAP] SOAP note content preview:`,
        soapNote.substring(0, 1000),
      );
      console.log(
        `🏥 [RealtimeSOAP] Patient context being sent:`,
        JSON.stringify(patientContext, null, 2),
      );

      const extractedCPTData = await cptExtractor.extractCPTCodesAndDiagnoses(
        soapNote,
        patientContext,
      );

      console.log(
        `🏥 [RealtimeSOAP] CPT extraction completed. Result:`,
        extractedCPTData,
      );

      if (
        extractedCPTData &&
        (extractedCPTData.cptCodes?.length > 0 ||
          extractedCPTData.diagnoses?.length > 0)
      ) {
        console.log(
          `🏥 [RealtimeSOAP] Found ${extractedCPTData.cptCodes?.length || 0} CPT codes and ${extractedCPTData.diagnoses?.length || 0} diagnoses`,
        );
        
        // Apply intelligent clinical mappings (same logic as manual generation)
        extractedCPTData.intelligentMappings = this.generateIntelligentMappings(
          extractedCPTData.cptCodes || [],
          extractedCPTData.diagnoses || []
        );
        
        console.log(
          `🔗 [RealtimeSOAP] Applied ${extractedCPTData.intelligentMappings?.length || 0} intelligent mappings`,
        );
        
        return extractedCPTData;
      }

      console.log(
        `🏥 [RealtimeSOAP] No CPT codes found, returning empty result`,
      );
      return { cptCodes: [], diagnoses: [] };
    } catch (error) {
      console.error(
        "❌ [RealtimeSOAP] Error extracting CPT codes from SOAP note:",
        error,
      );
      return { cptCodes: [], diagnoses: [] };
    }
  }

  /**
   * Generate intelligent clinical mappings between diagnoses and CPT codes
   * Uses the same logic as the frontend manual generation for consistency
   */
  private generateIntelligentMappings(cptCodes: any[], diagnoses: any[]): any[] {
    const intelligentMappings: any[] = [];
    
    diagnoses.forEach((diagnosis, diagnosisIndex) => {
      cptCodes.forEach((cpt, cptIndex) => {
        let shouldSelect = false;
        let clinicalRationale = "";
        
        // Problem-focused E&M codes pair ONLY with clinical diagnoses
        if (['99212', '99213', '99214', '99215', '99202', '99203', '99204', '99205'].includes(cpt.code)) {
          shouldSelect = !diagnosis.icd10Code?.startsWith('Z') && 
                        !diagnosis.diagnosis?.toLowerCase().includes('routine') &&
                        !diagnosis.diagnosis?.toLowerCase().includes('examination');
          
          if (shouldSelect) {
            clinicalRationale = `Acute respiratory symptoms with moderate complexity management (controller therapy, diagnostic testing) justify problem-focused E&M code ${cpt.code}.`;
          }
        }
        
        // Preventive medicine codes pair ONLY with wellness diagnoses
        else if (['99381', '99382', '99383', '99384', '99385', '99386', '99387',
                  '99391', '99392', '99393', '99394', '99395', '99396', '99397'].includes(cpt.code)) {
          shouldSelect = diagnosis.icd10Code?.startsWith('Z00') ||
                        diagnosis.diagnosis?.toLowerCase().includes('routine') ||
                        diagnosis.diagnosis?.toLowerCase().includes('examination');
          
          if (shouldSelect) {
            clinicalRationale = `Annual wellness visit and preventive care map to preventive medicine service code ${cpt.code}.`;
          }
        }
        
        // Procedure codes pair with specific diagnoses
        else if (['17110', '17111'].includes(cpt.code)) {
          shouldSelect = diagnosis.icd10Code?.startsWith('B07') || 
                        diagnosis.icd10Code?.startsWith('D23') ||
                        diagnosis.diagnosis?.toLowerCase().includes('wart') ||
                        diagnosis.diagnosis?.toLowerCase().includes('lesion');
          
          if (shouldSelect) {
            clinicalRationale = `Lesion removal procedure ${cpt.code} is medically necessary for ${diagnosis.diagnosis}.`;
          }
        }
        
        // Default: primary diagnoses map to other codes
        else {
          shouldSelect = diagnosis.isPrimary === true && !diagnosis.icd10Code?.startsWith('Z');
          
          if (shouldSelect) {
            clinicalRationale = `Primary diagnosis ${diagnosis.diagnosis} justifies ${cpt.code} for comprehensive care.`;
          }
        }
        
        if (shouldSelect) {
          intelligentMappings.push({
            diagnosisIndex,
            cptIndex,
            clinicalRationale,
            shouldSelect: true
          });
        }
      });
    });
    
    console.log(`🔗 [RealtimeSOAP] Generated ${intelligentMappings.length} intelligent mappings`);
    return intelligentMappings;
  }

  private async getPatientContext(patientId: number) {
    try {
      // Get patient basic information including date of birth
      const patientData = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      // Get encounter count for this patient (excluding current encounter)
      const patientEncounters = await db
        .select()
        .from(encountersTable)
        .where(eq(encountersTable.patientId, patientId));

      // Get medical history
      const diagnosisList = await db
        .select()
        .from(diagnoses)
        .where(eq(diagnoses.patientId, patientId))
        .limit(10);

      // Calculate patient age from date of birth
      let patientAge = 0;
      let dateOfBirth = "";
      if (patientData.length > 0 && patientData[0].dateOfBirth) {
        dateOfBirth = patientData[0].dateOfBirth;
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          patientAge--;
        }
      }

      // A patient is new if they have 1 or fewer encounters (current one)
      // Medicare defines new patient as no professional services within past 3 years
      const isNewPatient = patientEncounters.length <= 1;

      console.log(
        `🏥 [Patient Context] Patient ${patientId}: age ${patientAge}, ${patientEncounters.length} encounters, isNew: ${isNewPatient}`,
      );

      return {
        isNewPatient,
        previousEncounterCount: patientEncounters.length,
        medicalHistory: diagnosisList.map((d) => d.diagnosis),
        currentProblems: diagnosisList
          .filter((d) => d.status === "active")
          .map((d) => d.diagnosis),
        patientAge: patientAge,
        dateOfBirth: dateOfBirth,
      };
    } catch (error) {
      console.error("Error getting patient context:", error);
      return {
        isNewPatient: false,
        previousEncounterCount: 0,
        medicalHistory: [],
        currentProblems: [],
        patientAge: 0,
        dateOfBirth: "",
      };
    }
  }
}
