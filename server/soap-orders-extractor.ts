import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";
import { OrderStandardizationService } from "./order-standardization-service.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedMedication {
  medication_name: string;
  dosage: string;
  quantity: number;
  sig: string;
  refills: number;
  form?: string;
  route_of_administration?: string;
  days_supply?: number;
  diagnosis_code?: string;
  requires_prior_auth?: boolean;
  clinical_indication?: string;
}

interface ExtractedLab {
  lab_name: string;
  test_name: string;
  test_code?: string;
  specimen_type?: string;
  fasting_required?: boolean;
  clinical_indication?: string;
  priority?: string;
}

interface ExtractedImaging {
  study_type: string;
  region: string;
  laterality?: string;
  contrast_needed?: boolean;
  clinical_indication?: string;
  priority?: string;
}

interface ExtractedReferral {
  specialty_type: string;
  provider_name?: string;
  clinical_indication?: string;
  urgency?: string;
}

export class SOAPOrdersExtractor {
  async extractOrders(
    soapNote: string,
    patientId: number,
    encounterId: number,
  ): Promise<InsertOrder[]> {
    try {
      console.log(
        `[SOAPExtractor] ========== STARTING ORDER EXTRACTION ==========`,
      );
      console.log(
        `[SOAPExtractor] Patient ID: ${patientId}, Encounter ID: ${encounterId}`,
      );
      console.log(
        `[SOAPExtractor] SOAP Note length: ${soapNote.length} characters`,
      );
      console.log(
        `[SOAPExtractor] SOAP Note preview: ${soapNote.substring(0, 200)}...`,
      );

      const extractedOrders = await this.parseOrdersWithGPT(soapNote);
      console.log(
        `[SOAPExtractor] Raw GPT extraction result:`,
        JSON.stringify(extractedOrders, null, 2),
      );

      // Convert extracted orders to database format with standardization
      const orderInserts: InsertOrder[] = [];

      // Process medications
      if (
        extractedOrders.medications &&
        extractedOrders.medications.length > 0
      ) {
        console.log(
          `[SOAPExtractor] Processing ${extractedOrders.medications.length} medications:`,
        );
        for (const med of extractedOrders.medications) {
          console.log(
            `[SOAPExtractor] Medication: ${med.medication_name} - ${med.dosage}`,
          );
          const rawOrder = {
            patientId,
            encounterId,
            orderType: "medication",
            orderStatus: "draft",
            medicationName: med.medication_name,
            dosage: med.dosage,
            quantity: med.quantity,
            sig: med.sig,
            refills: med.refills,
            form: med.form,
            routeOfAdministration: med.route_of_administration,
            daysSupply: med.days_supply,
            diagnosisCode: med.diagnosis_code,
            requiresPriorAuth: med.requires_prior_auth || false,
            clinicalIndication: med.clinical_indication,
            priority: "routine",
          };

          // Apply standardization to ensure all required fields are present
          const standardizedOrder =
            OrderStandardizationService.standardizeOrder(rawOrder);
          console.log(
            `[SOAPExtractor] Standardized medication order:`,
            standardizedOrder,
          );
          orderInserts.push(standardizedOrder);
        }
      } else {
        console.log(`[SOAPExtractor] No medications found in extracted orders`);
      }

      // Process labs
      if (extractedOrders.labs) {
        for (const lab of extractedOrders.labs) {
          const rawOrder = {
            patientId,
            encounterId,
            orderType: "lab",
            orderStatus: "draft",
            labName: lab.lab_name,
            testName: lab.test_name,
            testCode: lab.test_code,
            specimenType: lab.specimen_type,
            fastingRequired: lab.fasting_required || false,
            clinicalIndication: lab.clinical_indication,
            priority: lab.priority || "routine",
          };

          // Apply standardization for lab order requirements
          const standardizedOrder =
            OrderStandardizationService.standardizeOrder(rawOrder);
          orderInserts.push(standardizedOrder);
        }
      }

      // Process imaging
      if (extractedOrders.imaging) {
        for (const img of extractedOrders.imaging) {
          const rawOrder = {
            patientId,
            encounterId,
            orderType: "imaging",
            orderStatus: "draft",
            studyType: img.study_type,
            region: img.region,
            laterality: img.laterality,
            contrastNeeded: img.contrast_needed || false,
            clinicalIndication: img.clinical_indication,
            priority: img.priority || "routine",
          };

          // Apply standardization for imaging order requirements
          const standardizedOrder =
            OrderStandardizationService.standardizeOrder(rawOrder);
          orderInserts.push(standardizedOrder);
        }
      }

      // Process referrals
      if (extractedOrders.referrals) {
        for (const ref of extractedOrders.referrals) {
          const rawOrder = {
            patientId,
            encounterId,
            orderType: "referral",
            orderStatus: "draft",
            specialtyType: ref.specialty_type,
            providerName: ref.provider_name,
            clinicalIndication: ref.clinical_indication,
            urgency: ref.urgency,
            priority: ref.urgency === "urgent" ? "urgent" : "routine",
          };

          // Apply standardization for referral order requirements
          const standardizedOrder =
            OrderStandardizationService.standardizeOrder(rawOrder);
          orderInserts.push(standardizedOrder);
        }
      }

      console.log(
        `[SOAPExtractor] Extracted ${orderInserts.length} total orders: ${orderInserts.filter((o) => o.orderType === "medication").length} medications, ${orderInserts.filter((o) => o.orderType === "lab").length} labs, ${orderInserts.filter((o) => o.orderType === "imaging").length} imaging, ${orderInserts.filter((o) => o.orderType === "referral").length} referrals`,
      );

      return orderInserts;
    } catch (error: any) {
      console.error("[SOAPExtractor] Error extracting orders:", error);
      return [];
    }
  }

  private async parseOrdersWithGPT(soapNote: string): Promise<{
    medications?: ExtractedMedication[];
    labs?: ExtractedLab[];
    imaging?: ExtractedImaging[];
    referrals?: ExtractedReferral[];
  }> {
    const prompt = `You are a medical AI assistant specializing in extracting structured medical orders for real EMR integration with external systems like LabCorp, Quest Diagnostics, pharmacies, and imaging centers.

SOAP Note:
${soapNote}

Extract all medical orders and provide complete standardized parameters required for external integrations. Return a JSON object with this structure:

{
  "medications": [
    {
      "medication_name": "exact medication name",
      "dosage": "strength (e.g., 10mg, 250mg)",
      "quantity": number_of_units,
      "sig": "complete patient instructions",
      "refills": number_of_refills,
      "form": "tablet/capsule/liquid/injection/cream/ointment/patch/inhaler/drops",
      "route_of_administration": "oral/topical/injection/inhalation/ophthalmic/otic/nasal/rectal/transdermal",
      "days_supply": number_of_days,
      "diagnosis_code": "ICD-10 code if available",
      "requires_prior_auth": boolean,
      "clinical_indication": "detailed reason for prescription"
    }
  ],
  "labs": [
    {
      "lab_name": "panel or group name (e.g., Comprehensive Metabolic Panel)",
      "test_name": "specific test name (e.g., Glucose, Creatinine)",
      "test_code": "CPT or LOINC code if known",
      "specimen_type": "blood/whole_blood/urine/tissue/swab/stool/csf/sputum",
      "fasting_required": boolean,
      "clinical_indication": "detailed reason for test",
      "priority": "stat/urgent/routine"
    }
  ],
  "imaging": [
    {
      "study_type": "X-ray/CT/MRI/Ultrasound/Nuclear/Mammography/Fluoroscopy/PET/DEXA",
      "region": "specific anatomical region (e.g., Chest, Left Knee, Abdomen)",
      "laterality": "left/right/bilateral or empty if not applicable",
      "contrast_needed": boolean,
      "clinical_indication": "detailed reason for imaging with clinical context",
      "priority": "stat/urgent/routine",
      "urgency": "stat/urgent/routine"
    }
  ],
  "referrals": [
    {
      "specialty_type": "cardiology/dermatology/endocrinology/gastroenterology/neurology/oncology/orthopedics/psychiatry/pulmonology/rheumatology/urology/ophthalmology/otolaryngology/physical_therapy/other",
      "provider_name": "specific provider name if mentioned",
      "clinical_indication": "detailed reason for referral with clinical context",
      "urgency": "stat/urgent/routine"
    }
  ]
}

CRITICAL EXTRACTION RULES:
1. MEDICATIONS: Always include dosage form and route - these are required for pharmacy NDC lookup
2. LABS: Always specify specimen type - required for lab processing and collection
3. IMAGING: Always include study type and region - required for DICOM routing and scheduling
4. REFERRALS: Map to standard specialty types for provider network routing
5. CLINICAL INDICATIONS: Provide detailed context, not just "routine" - required for authorization
6. QUANTITIES: For medications, estimate 30-90 day supplies based on frequency
7. SPECIMEN TYPES: Use specific types (blood vs whole_blood, swab vs throat swab)
8. PRIORITIES: Map clinical urgency to standard values (STAT, URGENT, ROUTINE)
9. FORMS: Use standardized pharmaceutical forms for accurate dispensing
10. ROUTES: Use standard administration routes for safety verification

DEFAULTS FOR MISSING INFO:
- Medication quantity: 30 (for 30-day supply)
- Medication refills: 0 (no refills unless specified)
- Medication days_supply: 30
- Lab specimen_type: "blood" (most common)
- Lab priority: "routine"
- Imaging priority: "routine"
- Referral urgency: "routine"

Return only the JSON object, no markdown formatting or additional text.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a medical AI that extracts structured data from clinical notes. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response from GPT");
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith("```json")) {
        cleanedContent = content
          .replace(/```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (content.startsWith("```")) {
        cleanedContent = content.replace(/```\s*/, "").replace(/\s*```$/, "");
      }

      console.log(`[SOAPExtractor] Cleaned GPT response:`, cleanedContent);

      // Parse the JSON response
      const parsedOrders = JSON.parse(cleanedContent);
      console.log(
        `[SOAPExtractor] GPT extracted orders:`,
        JSON.stringify(parsedOrders, null, 2),
      );

      return parsedOrders;
    } catch (error: any) {
      console.error("[SOAPExtractor] Error parsing orders with GPT:", error);
      if (error.message?.includes("JSON")) {
        console.error(
          "[SOAPExtractor] JSON parsing failed, GPT response may be malformed",
        );
      }
      return {};
    }
  }
}
