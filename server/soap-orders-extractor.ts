import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";
import { OrderStandardizationService } from "./order-standardization-service.js";
import { LOINCLookupService } from "./loinc-lookup-service.js";
import { MedicationStandardizationService } from "./medication-standardization-service.js";
import { TokenCostAnalyzer } from "./token-cost-analyzer.js";
import { storage } from "./storage.js";

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

      // Get existing draft orders for this encounter to enable deduplication
      console.log(`[SOAPExtractor] Fetching existing draft orders for deduplication...`);
      const existingOrders = await storage.getDraftOrdersByEncounter(encounterId);
      console.log(`[SOAPExtractor] Found ${existingOrders.length} existing draft orders for encounter ${encounterId}`);

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
            `[SOAPExtractor] Processing medication: ${med.medication_name} - ${med.dosage}`,
          );
          
          // Standardize medication using the new service
          const standardized = MedicationStandardizationService.standardizeMedicationFromAI(
            med.medication_name,
            med.dosage,
            med.form,
            med.route_of_administration
          );
          
          console.log(`[SOAPExtractor] Standardized medication:`, standardized);
          
          // Fix AI-generated sig instructions to use dosage form count instead of strength
          const standardizedSig = MedicationStandardizationService.standardizeSigInstruction(
            med.sig,
            standardized.dosageForm || med.form || 'tablet',
            standardized.strength || med.dosage
          );
          
          const rawOrder = {
            patientId,
            encounterId,
            orderType: "medication",
            orderStatus: "draft",
            medicationName: standardized.medicationName || med.medication_name,
            dosage: standardized.strength || med.dosage,
            quantity: med.quantity,
            sig: standardizedSig,
            refills: med.refills,
            form: standardized.dosageForm || med.form,
            routeOfAdministration: standardized.route || med.route_of_administration,
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

      // Process labs with LOINC standardization
      if (extractedOrders.labs) {
        console.log(
          `[SOAPExtractor] Processing ${extractedOrders.labs.length} lab orders with LOINC lookup:`,
        );
        for (const lab of extractedOrders.labs) {
          console.log(
            `[SOAPExtractor] Lab: ${lab.lab_name} / ${lab.test_name} - Original code: ${lab.test_code}`,
          );

          // Standardize lab with LOINC lookup for database compatibility
          const standardizedLab = LOINCLookupService.standardizeLabOrder({
            labName: lab.lab_name,
            testName: lab.test_name,
            testCode: lab.test_code,
            specimenType: lab.specimen_type,
            fastingRequired: lab.fasting_required,
          });

          const rawOrder = {
            patientId,
            encounterId,
            orderType: "lab",
            orderStatus: "draft",
            labName: standardizedLab.labName,
            testName: standardizedLab.testName,
            testCode: standardizedLab.testCode,
            specimenType: standardizedLab.specimenType,
            fastingRequired: standardizedLab.fastingRequired,
            clinicalIndication: lab.clinical_indication,
            priority: lab.priority || "routine",
          };

          console.log(
            `[SOAPExtractor] Standardized lab: ${standardizedLab.testName} - LOINC: ${standardizedLab.testCode}`,
          );

          // Apply order standardization for database requirements
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

      // Apply GPT-powered deduplication against existing orders
      let finalOrders: InsertOrder[] = [];
      if (existingOrders.length > 0) {
        console.log(`[SOAPExtractor] ========== APPLYING GPT DEDUPLICATION ==========`);
        console.log(`[SOAPExtractor] Comparing ${orderInserts.length} new orders against ${existingOrders.length} existing orders`);
        
        try {
          // Convert existing orders to InsertOrder format for comparison
          const existingInsertOrders: InsertOrder[] = existingOrders.map((order: any) => ({
            patientId: order.patientId,
            encounterId: order.encounterId,
            orderType: order.orderType as any,
            orderStatus: order.orderStatus as any,
            medicationName: order.medicationName,
            dosage: order.dosage,
            quantity: order.quantity,
            sig: order.sig,
            refills: order.refills,
            form: order.form,
            routeOfAdministration: order.routeOfAdministration,
            daysSupply: order.daysSupply,
            labName: order.labName,
            testName: order.testName,
            testCode: order.testCode,
            specimenType: order.specimenType,
            fastingRequired: order.fastingRequired,
            studyType: order.studyType,
            region: order.region,
            laterality: order.laterality,
            contrastNeeded: order.contrastNeeded,
            specialtyType: order.specialtyType,
            providerName: order.providerName,
            clinicalIndication: order.clinicalIndication,
            diagnosisCode: order.diagnosisCode,
            requiresPriorAuth: order.requiresPriorAuth,
            priority: order.priority
          }));

          // Import GPT deduplication service dynamically to avoid import issues
          const { gptOrderDeduplication } = await import("./gpt-order-deduplication-service.js");
          
          // Use GPT to intelligently reconcile existing and new orders
          // GPT has full authority to decide what orders should exist
          finalOrders = await gptOrderDeduplication.mergeAndDeduplicateOrders(
            existingInsertOrders, // existing draft orders
            orderInserts // new SOAP-extracted orders
          );
          
          console.log(`[SOAPExtractor] GPT deduplication complete: ${existingOrders.length + orderInserts.length} total → ${finalOrders.length} final orders`);
          console.log(`[SOAPExtractor] Duplicates eliminated: ${(existingOrders.length + orderInserts.length) - finalOrders.length}`);
          
        } catch (deduplicationError) {
          console.error(`❌ [SOAPExtractor] GPT deduplication failed, using fallback logic:`, deduplicationError);
          
          // Fallback deduplication: filter out new orders that duplicate existing ones
          finalOrders = orderInserts.filter(newOrder => {
            const isDuplicate = existingOrders.some(existingOrder => {
              if (newOrder.orderType === 'medication' && existingOrder.orderType === 'medication') {
                const newMedName = newOrder.medicationName?.toLowerCase().trim() || '';
                const existingMedName = existingOrder.medicationName?.toLowerCase().trim() || '';
                return newMedName === existingMedName && newOrder.dosage === existingOrder.dosage;
              }
              if (newOrder.orderType === 'lab' && existingOrder.orderType === 'lab') {
                const newTestName = newOrder.testName?.toLowerCase().trim() || '';
                const existingTestName = existingOrder.testName?.toLowerCase().trim() || '';
                return newTestName === existingTestName;
              }
              if (newOrder.orderType === 'imaging' && existingOrder.orderType === 'imaging') {
                const newStudyType = newOrder.studyType?.toLowerCase().trim() || '';
                const existingStudyType = existingOrder.studyType?.toLowerCase().trim() || '';
                return newStudyType === existingStudyType && newOrder.region === existingOrder.region;
              }
              return false;
            });
            
            return !isDuplicate; // Only keep orders that are NOT duplicates
          });
          
          console.log(`[SOAPExtractor] Fallback deduplication complete: ${existingOrders.length + orderInserts.length} total → ${finalOrders.length} final orders`);
        }
      } else {
        // No existing orders, use all new orders
        finalOrders = orderInserts;
        console.log(`[SOAPExtractor] No existing orders found, using all ${finalOrders.length} newly extracted orders`);
      }

      // Check if we have medication orders that need medication processing
      const medicationOrders = finalOrders.filter((o) => o.orderType === "medication");
      if (medicationOrders.length > 0) {
        console.log(`💊 [SOAPExtractor] Triggering medication processing for ${medicationOrders.length} medication orders`);
        try {
          const { medicationDelta } = await import("./medication-delta-service.js");
          await medicationDelta.processOrderDelta(patientId, encounterId, 1);
          console.log(`✅ [SOAPExtractor] Medication processing completed for voice-extracted orders`);
        } catch (medicationError) {
          console.error(`❌ [SOAPExtractor] Medication processing failed for voice-extracted orders:`, medicationError);
          // Continue - don't fail order extraction if medication processing fails
        }
      }

      return finalOrders;
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
      "medication_name": "PROPER CASE medication name (e.g., Lisinopril, Hydrochlorothiazide, Montelukast)",
      "dosage": "strength only (e.g., 10 mg, 25 mg, 250 mg)",
      "quantity": number_of_units,
      "sig": "standardized patient instructions using tablet/capsule count, NOT strength",
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
      "test_code": "LOINC code - REQUIRED for all lab tests (e.g., 58410-2 for CBC, 24323-8 for CMP)",
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
1. MEDICATIONS: 
   - ALWAYS use proper case medication names (Lisinopril, NOT lisinopril)
   - ALWAYS generate sig instructions based on dosage form count, NOT strength amount
   - Examples of CORRECT sig instructions:
     * "Take 1 tablet by mouth once daily" (NOT "Take 10 mg by mouth once daily")
     * "Take 2 capsules by mouth twice daily" (NOT "Take 40 mg by mouth twice daily")
     * "Apply 1 patch topically once daily" (NOT "Apply 25 mg topically once daily")
     * "Take 1 tablet by mouth every 12 hours" (NOT "Take 500 mg by mouth every 12 hours")
   - Always include dosage form and route - these are required for pharmacy NDC lookup
   - Separate medication name from strength (e.g., "Hydrochlorothiazide" + "25 mg", NOT "HCTZ 25mg")
2. LABS: MUST include LOINC codes for ALL tests - required for EMR integration and lab ordering systems
   - CBC = 58410-2
   - CMP/Comprehensive Metabolic Panel = 24323-8  
   - BMP/Basic Metabolic Panel = 51990-0
   - TSH = 11579-0
   - A1C/HbA1c = 4548-4
   - Lipid Panel = 57698-3
   - Urinalysis = 5794-3
   - AST = 1920-8
   - ALT = 1742-6
   - CRP = 1988-5
   - ESR = 4537-7
   - Vitamin D = 14905-4
   - Vitamin B12 = 2132-9
3. IMAGING: Always include study type and region - required for DICOM routing and scheduling
4. REFERRALS: Map to standard specialty types for provider network routing
5. CLINICAL INDICATIONS: Provide detailed context, not just "routine" - required for authorization
6. QUANTITIES: For medications, estimate 30-90 day supplies based on frequency
7. SPECIMEN TYPES: Use specific types (blood vs whole_blood, swab vs throat swab)
8. PRIORITIES: Map clinical urgency to standard values (STAT, URGENT, ROUTINE)
9. FORMS: Use standardized pharmaceutical forms for accurate dispensing
10. ROUTES: Use standard administration routes for safety verification

MEDICATION NAME STANDARDIZATION:
- Always expand common abbreviations to full generic names:
  * HCTZ → Hydrochlorothiazide
  * ASA → Aspirin
  * APAP → Acetaminophen
  * ACE → Lisinopril (or specific ACE inhibitor mentioned)
  * CCB → Amlodipine (or specific calcium channel blocker mentioned)
  * PPI → Omeprazole (or specific proton pump inhibitor mentioned)
  * ARB → Losartan (or specific angiotensin receptor blocker mentioned)

DEFAULTS FOR MISSING INFO:
- For medications: 
  * Include generic and brand names, dosages, frequencies, quantities
  * Default to 90-day TOTAL supply (including refills) unless duration is specified
  * For once daily: 30 tablets with 2 refills (30+30+30=90 day supply)
  * For twice daily: 60 tablets with 2 refills (60+60+60=180 tablets for 90 days)
  * For three times daily: 90 tablets with 2 refills (90+90+90=270 tablets for 90 days)
  * If specific duration mentioned (e.g., "for 5 days", "7 day course"), calculate exact quantity with 0 refills
  * If user specifies exact quantity/refills, use those values instead of defaults
- For labs: Recognize common abbreviations (CMP = Comprehensive Metabolic Panel, CBC = Complete Blood Count, etc.)
- For imaging: Recognize abbreviations (CXR = Chest X-ray, CT = Computed Tomography, etc.)
- For referrals: Extract specialty consultations mentioned
- Set appropriate defaults for missing information

Return only the JSON object, no markdown formatting or additional text.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
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

      // Log comprehensive token usage and cost analysis
      if (response.usage) {
        const costAnalysis = TokenCostAnalyzer.logCostAnalysis(
          'Orders_Extractor',
          response.usage,
          'gpt-4.1',
          {
            soapNoteLength: soapNote.length,
            maxTokensRequested: 2000,
            temperature: 0.1
          }
        );
        
        // Log cost projections for operational planning
        const projections = TokenCostAnalyzer.calculateProjections(costAnalysis.totalCost, 50);
        console.log(`💰 [Orders_Extractor] COST PROJECTIONS:`);
        console.log(`💰 [Orders_Extractor] Daily (50 encounters): ${projections.formatted.daily}`);
        console.log(`💰 [Orders_Extractor] Monthly: ${projections.formatted.monthly}`);
        console.log(`💰 [Orders_Extractor] Yearly: ${projections.formatted.yearly}`);
      }

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
