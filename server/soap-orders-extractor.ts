import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";

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
  
  async extractOrders(soapNote: string, patientId: number, encounterId: number): Promise<InsertOrder[]> {
    try {
      console.log(`[SOAPExtractor] ========== STARTING ORDER EXTRACTION ==========`);
      console.log(`[SOAPExtractor] Patient ID: ${patientId}, Encounter ID: ${encounterId}`);
      console.log(`[SOAPExtractor] SOAP Note length: ${soapNote.length} characters`);
      console.log(`[SOAPExtractor] SOAP Note preview: ${soapNote.substring(0, 200)}...`);
      
      const extractedOrders = await this.parseOrdersWithGPT(soapNote);
      console.log(`[SOAPExtractor] Raw GPT extraction result:`, JSON.stringify(extractedOrders, null, 2));
      
      // Convert extracted orders to database format
      const orderInserts: InsertOrder[] = [];
      
      // Process medications
      if (extractedOrders.medications && extractedOrders.medications.length > 0) {
        console.log(`[SOAPExtractor] Processing ${extractedOrders.medications.length} medications:`);
        for (const med of extractedOrders.medications) {
          console.log(`[SOAPExtractor] Medication: ${med.medication_name} - ${med.dosage}`);
          const medicationOrder = {
            patientId,
            encounterId,
            orderType: 'medication',
            orderStatus: 'draft',
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
            priority: 'routine'
          };
          console.log(`[SOAPExtractor] Created medication order:`, medicationOrder);
          orderInserts.push(medicationOrder);
        }
      } else {
        console.log(`[SOAPExtractor] No medications found in extracted orders`);
      }
      
      // Process labs
      if (extractedOrders.labs) {
        for (const lab of extractedOrders.labs) {
          orderInserts.push({
            patientId,
            encounterId,
            orderType: 'lab',
            orderStatus: 'draft',
            labName: lab.lab_name,
            testName: lab.test_name,
            testCode: lab.test_code,
            specimenType: lab.specimen_type,
            fastingRequired: lab.fasting_required || false,
            clinicalIndication: lab.clinical_indication,
            priority: lab.priority || 'routine'
          });
        }
      }
      
      // Process imaging
      if (extractedOrders.imaging) {
        for (const img of extractedOrders.imaging) {
          orderInserts.push({
            patientId,
            encounterId,
            orderType: 'imaging',
            orderStatus: 'draft',
            studyType: img.study_type,
            region: img.region,
            laterality: img.laterality,
            contrastNeeded: img.contrast_needed || false,
            clinicalIndication: img.clinical_indication,
            priority: img.priority || 'routine'
          });
        }
      }
      
      // Process referrals
      if (extractedOrders.referrals) {
        for (const ref of extractedOrders.referrals) {
          orderInserts.push({
            patientId,
            encounterId,
            orderType: 'referral',
            orderStatus: 'draft',
            specialtyType: ref.specialty_type,
            providerName: ref.provider_name,
            clinicalIndication: ref.clinical_indication,
            urgency: ref.urgency,
            priority: ref.urgency === 'urgent' ? 'urgent' : 'routine'
          });
        }
      }
      
      console.log(`[SOAPExtractor] Extracted ${orderInserts.length} total orders: ${orderInserts.filter(o => o.orderType === 'medication').length} medications, ${orderInserts.filter(o => o.orderType === 'lab').length} labs, ${orderInserts.filter(o => o.orderType === 'imaging').length} imaging, ${orderInserts.filter(o => o.orderType === 'referral').length} referrals`);
      
      return orderInserts;
      
    } catch (error: any) {
      console.error('[SOAPExtractor] Error extracting orders:', error);
      return [];
    }
  }
  
  private async parseOrdersWithGPT(soapNote: string): Promise<{
    medications?: ExtractedMedication[];
    labs?: ExtractedLab[];
    imaging?: ExtractedImaging[];
    referrals?: ExtractedReferral[];
  }> {
    const prompt = `You are a medical AI assistant. Extract all medical orders from this SOAP note and categorize them into medications, labs, imaging, and referrals.

SOAP Note:
${soapNote}

Please extract and return a JSON object with the following structure:

{
  "medications": [
    {
      "medication_name": "medication name",
      "dosage": "strength and amount",
      "quantity": number_of_units,
      "sig": "patient instructions",
      "refills": number_of_refills,
      "form": "tablet/capsule/liquid/etc",
      "route_of_administration": "oral/topical/injection/etc",
      "days_supply": number_of_days,
      "diagnosis_code": "ICD-10 code if mentioned",
      "requires_prior_auth": boolean,
      "clinical_indication": "reason for prescription"
    }
  ],
  "labs": [
    {
      "lab_name": "laboratory or test panel name",
      "test_name": "specific test name",
      "test_code": "CPT or LOINC code if mentioned",
      "specimen_type": "blood/urine/tissue/etc",
      "fasting_required": boolean,
      "clinical_indication": "reason for test",
      "priority": "stat/urgent/routine"
    }
  ],
  "imaging": [
    {
      "study_type": "X-ray/CT/MRI/Ultrasound/etc",
      "region": "body part or region",
      "laterality": "left/right/bilateral",
      "contrast_needed": boolean,
      "clinical_indication": "reason for imaging",
      "priority": "stat/urgent/routine"
    }
  ],
  "referrals": [
    {
      "specialty_type": "cardiology/orthopedics/etc",
      "provider_name": "specific provider if mentioned",
      "clinical_indication": "reason for referral",
      "urgency": "urgent/routine"
    }
  ]
}

Rules:
1. Only extract orders that are explicitly mentioned in the SOAP note
2. For medications, parse dosages carefully (e.g., "10mg twice daily" = dosage: "10mg", sig: "Take twice daily")
3. For quantity, estimate reasonable amounts (e.g., 30-90 tablets for oral medications)
4. For refills, use common values (0-5 refills typically)
5. If information is not specified, use reasonable clinical defaults
6. Return empty arrays for categories with no orders
7. Ensure all JSON is properly formatted

Return only the JSON object, no additional text.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical AI that extracts structured data from clinical notes. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No response from GPT');
      }

      // Parse the JSON response
      const parsedOrders = JSON.parse(content);
      console.log(`[SOAPExtractor] GPT extracted orders:`, JSON.stringify(parsedOrders, null, 2));
      
      return parsedOrders;
      
    } catch (error: any) {
      console.error('[SOAPExtractor] Error parsing orders with GPT:', error);
      if (error.message?.includes('JSON')) {
        console.error('[SOAPExtractor] JSON parsing failed, GPT response may be malformed');
      }
      return {};
    }
  }
}