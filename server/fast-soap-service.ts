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

export class FastSOAPService {
  async generateSOAPNoteAndOrdersFast(
    patientId: number,
    encounterId: string,
    transcription: string,
  ): Promise<{
    soapNote: string;
    extractedOrders: any[];
    cptCodes: any[];
    diagnoses: any[];
  }> {
    const startTime = Date.now();
    console.log(
      `⚡ [FastSOAP] Starting fast generation for patient ${patientId}`,
    );

    try {
      // Step 1: Get patient context quickly (parallel database queries)
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
          .limit(10),
        db
          .select()
          .from(medications)
          .where(eq(medications.patientId, patientId))
          .limit(10),
        db
          .select()
          .from(allergies)
          .where(eq(allergies.patientId, patientId))
          .limit(5),
        db
          .select()
          .from(vitals)
          .where(eq(vitals.patientId, patientId))
          .limit(5),
        db
          .select()
          .from(encounters)
          .where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.startTime))
          .limit(3),
      ]);

      if (!patient.length) {
        throw new Error("Patient not found");
      }

      const patientData = patient[0];
      const age =
        new Date().getFullYear() -
        new Date(patientData.dateOfBirth).getFullYear();

      // Step 2: Get precomputed physical exam findings for this encounter
      const { PrecomputedPhysicalExamService } = await import(
        "./precomputed-physical-exam-service.js"
      );
      const precomputedService = new PrecomputedPhysicalExamService();
      const precomputedFindings =
        await precomputedService.getPrecomputedFindings(parseInt(encounterId));

      // Step 3: Build comprehensive medical context
      const medicalContext = this.buildMedicalContext(
        patientData,
        age,
        diagnosisList,
        meds,
        allergiesList,
        vitalsList,
        recentEncounters,
      );

      // Step 4: Create unified prompt that generates SOAP + structured orders in one call
      const unifiedPrompt = `You are an expert physician creating a comprehensive SOAP note with structured orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}${precomputedFindings}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections, followed by a structured JSON orders section:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 


**OBJECTIVE:**
Vitals: List all vital signs in a single line, formatted as:
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely **normal**, use the following full, pre-defined template verbatim:
- Replace any normal findings with either or both of the {precomputedFindings} and any noted abnormal physical exam findings from the {transcription}. 
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

✅ Good Example (Objective, No Diagnosis):

Skin: Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale, without ulceration, bleeding, or induration.

🚫 Bad Example (Incorrect Use of Diagnosis):

Skin: Actinic keratosis right forearm.

✅ Good Example (Objective, No Diagnosis):

Lungs: Diminished breath sounds over the right lung base with scattered rhonchi. No wheezes, rales.

🚫 Bad Example (Incorrect Use of Diagnosis):

Lungs: Sounds of pneumonia right lung.

✅ Good Example (Objective, No Diagnosis):

Skin: Left lower leg with erythema, warmth, and mild swelling, without bullae, ulceration, or fluctuance.

🚫 Bad Example (Incorrect Use of Diagnosis):

Skin: Cellulitis on the left lower leg.

Labs: List any lab results if available. If none, state "No labs reported today."


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

CPT Codes: Identify and include relevant CPT codes for all procedures, services, and visits.

After completing the SOAP note, add this exact section:

---ORDERS_JSON---
{
  "medications": [
    {
      "medication_name": "string",
      "dosage": "string", 
      "quantity": number,
      "sig": "string",
      "refills": number,
      "form": "string",
      "route_of_administration": "string",
      "days_supply": number,
      "diagnosis_code": "string",
      "clinical_indication": "string"
    }
  ],
  "labs": [
    {
      "lab_name": "string",
      "test_name": "string",
      "specimen_type": "string",
      "fasting_required": boolean,
      "clinical_indication": "string",
      "priority": "routine"
    }
  ],
  "imaging": [
    {
      "study_type": "string",
      "region": "string",
      "contrast_needed": boolean,
      "clinical_indication": "string",
      "priority": "routine"
    }
  ],
  "referrals": [
    {
      "specialty_type": "string",
      "clinical_indication": "string",
      "urgency": "routine"
    }
  ],
  "cpt_codes": [
    {
      "code": "string",
      "description": "string",
      "complexity": "low|medium|high"
    }
  ],
  "diagnoses": [
    {
      "diagnosis": "string",
      "icd10_code": "string",
      "is_primary": boolean
    }
  ]
}
---END_ORDERS_JSON---

Keep the note concise but thorough, using standard medical terminology and proper formatting.`;

      // Step 4: Single GPT-4 call for everything
      console.log(`🤖 [FastSOAP] Sending unified request to GPT-4...`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: unifiedPrompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response generated from OpenAI");
      }

      // Step 5: Parse SOAP note and orders from single response
      const { soapNote, extractedOrders } = this.parseSOAPAndOrders(
        response,
        patientId,
        parseInt(encounterId),
      );

      const duration = Date.now() - startTime;
      console.log(`✅ [FastSOAP] Completed fast generation in ${duration}ms`);
      console.log(
        `📊 [FastSOAP] Results: SOAP note (${soapNote.length} chars), ${extractedOrders.length} orders`,
      );

      return {
        soapNote,
        extractedOrders,
        cptCodes: [],
        diagnoses: [],
      };
    } catch (error: any) {
      console.error(`❌ [FastSOAP] Error in fast generation:`, error);
      throw new Error(`Failed to generate SOAP note: ${error.message}`);
    }
  }

  private parseSOAPAndOrders(
    response: string,
    patientId: number,
    encounterId: number,
  ): {
    soapNote: string;
    extractedOrders: any[];
  } {
    const ordersStartMarker = "---ORDERS_JSON---";
    const ordersEndMarker = "---END_ORDERS_JSON---";

    const ordersStartIndex = response.indexOf(ordersStartMarker);
    const ordersEndIndex = response.indexOf(ordersEndMarker);

    let soapNote = response;
    let extractedOrders: any[] = [];

    if (ordersStartIndex !== -1 && ordersEndIndex !== -1) {
      // Extract SOAP note (everything before orders)
      soapNote = response.substring(0, ordersStartIndex).trim();

      // Extract and parse orders JSON
      const ordersJsonStr = response
        .substring(ordersStartIndex + ordersStartMarker.length, ordersEndIndex)
        .trim();

      try {
        const ordersData = JSON.parse(ordersJsonStr);
        extractedOrders = this.convertToOrderInserts(
          ordersData,
          patientId,
          encounterId,
        );
      } catch (parseError) {
        console.warn("⚠️ [FastSOAP] Failed to parse orders JSON:", parseError);
      }
    }

    return { soapNote, extractedOrders };
  }

  private convertToOrderInserts(
    ordersData: any,
    patientId: number,
    encounterId: number,
  ): any[] {
    const orderInserts: any[] = [];

    // Process medications
    if (ordersData.medications?.length > 0) {
      for (const med of ordersData.medications) {
        orderInserts.push({
          patientId,
          encounterId,
          orderType: "medication",
          orderStatus: "draft",
          medicationName: med.medication_name,
          dosage: med.dosage,
          quantity: med.quantity || 30,
          sig: med.sig,
          refills: med.refills || 0,
          form: med.form || "tablet",
          routeOfAdministration: med.route_of_administration || "oral",
          daysSupply: med.days_supply || 30,
          diagnosisCode: med.diagnosis_code,
          requiresPriorAuth: false,
          clinicalIndication: med.clinical_indication,
          priority: "routine",
        });
      }
    }

    // Process labs
    if (ordersData.labs?.length > 0) {
      for (const lab of ordersData.labs) {
        orderInserts.push({
          patientId,
          encounterId,
          orderType: "lab",
          orderStatus: "draft",
          labName: lab.lab_name,
          testName: lab.test_name,
          testCode: lab.test_code || "",
          specimenType: lab.specimen_type || "blood",
          fastingRequired: lab.fasting_required || false,
          clinicalIndication: lab.clinical_indication,
          priority: lab.priority || "routine",
        });
      }
    }

    // Process imaging
    if (ordersData.imaging?.length > 0) {
      for (const img of ordersData.imaging) {
        orderInserts.push({
          patientId,
          encounterId,
          orderType: "imaging",
          orderStatus: "draft",
          studyType: img.study_type,
          region: img.region,
          laterality: img.laterality || "",
          contrastNeeded: img.contrast_needed || false,
          clinicalIndication: img.clinical_indication,
          priority: img.priority || "routine",
        });
      }
    }

    // Process referrals
    if (ordersData.referrals?.length > 0) {
      for (const ref of ordersData.referrals) {
        orderInserts.push({
          patientId,
          encounterId,
          orderType: "referral",
          orderStatus: "draft",
          specialtyType: ref.specialty_type,
          providerName: ref.provider_name || "",
          clinicalIndication: ref.clinical_indication,
          urgency: ref.urgency || "routine",
          priority: ref.urgency === "urgent" ? "urgent" : "routine",
        });
      }
    }

    return orderInserts;
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
    let context = `PATIENT: ${patientData.firstName} ${patientData.lastName}, ${age}yo ${patientData.gender}\n`;
    context += `MRN: ${patientData.mrn}\n\n`;

    if (allergiesList.length > 0) {
      context += `ALLERGIES:\n${allergiesList.map((a) => `- ${a.allergen}: ${a.reaction}`).join("\n")}\n\n`;
    }

    if (diagnosisList.length > 0) {
      context += `ACTIVE PROBLEMS:\n${diagnosisList.map((d) => `- ${d.diagnosis} (${d.diagnosisDate})`).join("\n")}\n\n`;
    }

    if (meds.length > 0) {
      context += `CURRENT MEDICATIONS:\n${meds.map((m) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join("\n")}\n\n`;
    }

    if (vitalsList.length > 0) {
      const latestVital = vitalsList[0];
      context += `RECENT VITALS:\n`;
      if (latestVital.systolicBp)
        context += `- BP: ${latestVital.systolicBp}/${latestVital.diastolicBp}\n`;
      if (latestVital.heartRate) context += `- HR: ${latestVital.heartRate}\n`;
      if (latestVital.temperature)
        context += `- Temp: ${latestVital.temperature}°F\n`;
      if (latestVital.oxygenSaturation)
        context += `- O2 Sat: ${latestVital.oxygenSaturation}%\n`;
      context += "\n";
    }

    if (recentEncounters.length > 0) {
      context += `RECENT ENCOUNTERS:\n${recentEncounters.map((e) => `- ${e.startTime}: ${e.encounterType} - ${e.chiefComplaint || "No chief complaint"}`).join("\n")}\n\n`;
    }

    return context;
  }
}
