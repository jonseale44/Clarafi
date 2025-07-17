import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";

/**
 * GPT-powered intelligent order deduplication service
 * Uses AI to understand medical nuances that hard-coded logic cannot handle
 */
export class GPTOrderDeduplicationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Intelligently merge and deduplicate orders using GPT medical knowledge
   * Handles complex scenarios like:
   * - Generic vs brand names (hydroxychloroquine vs Plaquenil)
   * - Dosage variations and formulations
   * - Medication tapers (prednisone 40mg -> 20mg -> 10mg)
   * - Clinical context and indications
   */
  async mergeAndDeduplicateOrders(
    transcriptionOrders: InsertOrder[], 
    soapOrders: InsertOrder[]
  ): Promise<InsertOrder[]> {
    console.log("🧠 [GPTDedup] Starting intelligent order deduplication...");
    console.log(`🧠 [GPTDedup] Input: ${transcriptionOrders.length} transcription orders + ${soapOrders.length} SOAP orders`);

    // If either set is empty, return the other
    if (transcriptionOrders.length === 0) return soapOrders;
    if (soapOrders.length === 0) return transcriptionOrders;

    try {
      // Prepare comprehensive order data for GPT analysis
      const orderAnalysis = {
        existing_orders: existingOrders.map((order: any, index: number) => ({
          id: `EXISTING_${index + 1}`,
          type: order.orderType,
          medication_name: order.medicationName,
          dosage: order.dosage,
          sig: order.sig,
          quantity: order.quantity,
          refills: order.refills,
          clinical_indication: order.clinicalIndication,
          lab_name: order.labName,
          test_name: order.testName,
          test_code: order.testCode,
          study_type: order.studyType,
          region: order.region,
          specialty_type: order.specialtyType,
          provider_name: order.providerName,
          priority: order.priority
        })),
        new_soap_orders: newSoapOrders.map((order: any, index: number) => ({
          id: `NEW_${index + 1}`,
          type: order.orderType,
          medication_name: order.medicationName,
          dosage: order.dosage,
          sig: order.sig,
          quantity: order.quantity,
          refills: order.refills,
          clinical_indication: order.clinicalIndication,
          lab_name: order.labName,
          test_name: order.testName,
          test_code: order.testCode,
          study_type: order.studyType,
          region: order.region,
          specialty_type: order.specialtyType,
          provider_name: order.providerName,
          priority: order.priority
        }))
      };

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1", // the newest OpenAI model is "gpt-4.1" which is faster, cheaper, and smarter
        messages: [
          {
            role: "system",
            content: `You are a clinical decision support AI with full medical expertise. Your task is to reconcile medical orders based on clinical intent and medical best practices.

CONTEXT: A provider has existing draft orders and has updated their SOAP note, which generated new orders. You need to determine the final set of orders that should exist.

YOUR MEDICAL AUTHORITY:
- You have complete decision-making power over what orders should exist
- You understand clinical intent behind order changes
- You recognize when medications are being switched vs added
- You know when duplicate labs/imaging make no clinical sense
- You can identify medication tapers, combination therapies, and clinical substitutions

CLINICAL SCENARIOS YOU HANDLE:
1. MEDICATION CHANGES: If SOAP note shows "changed from amoxicillin to levaquin" → Remove amoxicillin, keep levaquin
2. MEDICATION ADDITIONS: If SOAP note shows "added prednisone to current regimen" → Keep both
3. DUPLICATE LABS: Multiple CBCs with same indication → Keep only one unless different timing/indication
4. GENERIC/BRAND EQUIVALENTS: Lisinopril vs Prinivil → Same drug, keep one
5. DOSE ADJUSTMENTS: "Increased metformin from 500mg to 1000mg" → Keep only new dose

DECISION PRINCIPLES:
- SOAP note reflects current clinical thinking - it takes precedence
- Eliminate medically unnecessary duplicates
- Preserve clinically justified variations
- Consider timing, indication, and clinical context
- Default to what makes medical sense

OUTPUT: Return the complete final order set that should exist after reconciliation.`
          },
          {
            role: "user",
            content: `I need you to reconcile these medical orders. The provider has existing draft orders and just updated their SOAP note, generating new orders. 

Please determine what the final complete set of orders should be:

EXISTING ORDERS (currently in the system):
${JSON.stringify(orderAnalysis.existing_orders, null, 2)}

NEW ORDERS FROM UPDATED SOAP NOTE:
${JSON.stringify(orderAnalysis.new_soap_orders, null, 2)}

Return a JSON object with this structure:
{
  "clinical_reasoning": "Brief explanation of your clinical decision-making process",
  "final_orders": [
    {
      "source": "existing|new|modified",
      "order_details": {
        // Complete order object with all fields
      },
      "rationale": "Why this order was kept/modified/created"
    }
  ],
  "orders_removed": [
    {
      "removed_order": "Description of removed order",
      "reason": "Why this order was removed"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const reconciliationResult = JSON.parse(response.choices[0].message.content!);
      console.log("🧠 [GPTDedup] Clinical reasoning:", reconciliationResult.clinical_reasoning);
      console.log("🧠 [GPTDedup] Orders removed:", reconciliationResult.orders_removed?.length || 0);
      console.log("🧠 [GPTDedup] Final orders count:", reconciliationResult.final_orders?.length || 0);

      // Convert GPT's final orders back to InsertOrder format
      const finalOrders: InsertOrder[] = [];
      
      for (const finalOrder of reconciliationResult.final_orders || []) {
        const orderDetails = finalOrder.order_details;
        
        // Find the source order to get complete data
        let sourceOrder: InsertOrder | null = null;
        
        if (finalOrder.source === 'existing') {
          // Find matching existing order
          sourceOrder = existingOrders.find(order => 
            this.ordersMatch(order, orderDetails)
          ) || null;
        } else if (finalOrder.source === 'new') {
          // Find matching new order
          sourceOrder = newSoapOrders.find(order => 
            this.ordersMatch(order, orderDetails)
          ) || null;
        }
        
        if (sourceOrder) {
          finalOrders.push(sourceOrder);
          console.log(`🧠 [GPTDedup] Included ${finalOrder.source} order: ${orderDetails.medication_name || orderDetails.test_name || orderDetails.study_type} - ${finalOrder.rationale}`);
        } else {
          // Create new order from GPT specifications if no exact match found
          const newOrder: InsertOrder = {
            patientId: existingOrders[0]?.patientId || newSoapOrders[0]?.patientId || 0,
            encounterId: existingOrders[0]?.encounterId || newSoapOrders[0]?.encounterId || 0,
            providerId: existingOrders[0]?.providerId || newSoapOrders[0]?.providerId || 0,
            orderType: orderDetails.type as any,
            orderStatus: 'draft' as any,
            medicationName: orderDetails.medication_name,
            dosage: orderDetails.dosage,
            sig: orderDetails.sig,
            quantity: orderDetails.quantity,
            refills: orderDetails.refills,
            clinicalIndication: orderDetails.clinical_indication,
            labName: orderDetails.lab_name,
            testName: orderDetails.test_name,
            testCode: orderDetails.test_code,
            studyType: orderDetails.study_type,
            region: orderDetails.region,
            specialtyType: orderDetails.specialty_type,
            providerName: orderDetails.provider_name,
            priority: orderDetails.priority
          };
          finalOrders.push(newOrder);
          console.log(`🧠 [GPTDedup] Created modified order: ${orderDetails.medication_name || orderDetails.test_name || orderDetails.study_type} - ${finalOrder.rationale}`);
        }
      }

      console.log(`🧠 [GPTDedup] Final reconciled orders: ${finalOrders.length}`);
      return finalOrders;

    } catch (error: any) {
      console.error("❌ [GPTDedup] Deduplication failed, falling back to simple merge:", error);
      
      // Fallback to simple concatenation if GPT fails
      const fallbackOrders = [...transcriptionOrders];
      
      // Simple fallback: add SOAP orders that don't have obvious medication name matches
      for (const soapOrder of soapOrders) {
        const isDuplicate = transcriptionOrders.some(transOrder => {
          if (soapOrder.orderType === 'medication' && transOrder.orderType === 'medication') {
            const soapName = soapOrder.medicationName?.toLowerCase().trim() || '';
            const transName = transOrder.medicationName?.toLowerCase().trim() || '';
            return soapName === transName;
          }
          return false;
        });
        
        if (!isDuplicate) {
          fallbackOrders.push(soapOrder);
        }
      }
      
      console.log(`🧠 [GPTDedup] Fallback deduplication: ${transcriptionOrders.length + soapOrders.length} → ${fallbackOrders.length} orders`);
      return fallbackOrders;
    }
  }

  /**
   * Quick duplicate check for real-time processing
   * Uses GPT to quickly assess if two specific orders are duplicates
   */
  async areOrdersDuplicate(order1: InsertOrder, order2: InsertOrder): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1", // the newest OpenAI model is "gpt-4.1" which is faster, cheaper, and smarter
        messages: [
          {
            role: "system",
            content: "You are a medical expert. Determine if these two medical orders are duplicates. Consider generic vs brand names, dosages, indications, and clinical context. Respond with only 'true' or 'false'."
          },
          {
            role: "user",
            content: `Order 1: ${JSON.stringify(order1)}
Order 2: ${JSON.stringify(order2)}

Are these duplicate orders?`
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      });

      const result = response.choices[0].message.content?.toLowerCase().trim();
      return result === 'true';
    } catch (error) {
      console.error("❌ [GPTDedup] Quick duplicate check failed:", error);
      return false;
    }
  }
}

export const gptOrderDeduplication = new GPTOrderDeduplicationService();