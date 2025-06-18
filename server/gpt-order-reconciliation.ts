import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";

/**
 * GPT-powered intelligent order reconciliation service
 * Gives GPT complete authority to understand clinical intent and manage orders
 */
export class GPTOrderReconciliation {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Let GPT intelligently reconcile orders with full medical authority
   * GPT understands clinical context, medication changes, and duplicate elimination
   */
  async reconcileOrders(
    existingOrders: InsertOrder[],
    newSoapOrders: InsertOrder[],
    soapNote: string
  ): Promise<InsertOrder[]> {
    console.log(`🧠 [GPTReconcile] Starting intelligent order reconciliation`);
    console.log(`🧠 [GPTReconcile] Existing orders: ${existingOrders.length}, New SOAP orders: ${newSoapOrders.length}`);

    // If no existing orders, just return the new ones
    if (existingOrders.length === 0) return newSoapOrders;
    // If no new orders, keep existing ones
    if (newSoapOrders.length === 0) return existingOrders;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `You are a clinical decision support AI with complete medical authority over order management.

CONTEXT: A provider has existing draft orders and updated their SOAP note, generating new orders. You need to determine what orders should exist.

YOUR AUTHORITY:
- Complete decision-making power over the final order set
- Full understanding of clinical intent and medical context
- Authority to eliminate duplicates, identify medication changes, and preserve legitimate variations

CLINICAL INTELLIGENCE:
- Recognize when "amoxicillin" was CHANGED to "levaquin" vs ADDED levaquin
- Understand that duplicate labs (CBC, CXR) with same indication make no clinical sense
- Identify medication switches vs additions vs dose changes
- Know when multiple orders are clinically justified vs wasteful duplicates

DECISION PRINCIPLES:
- The SOAP note reflects current clinical thinking - trust it
- Eliminate medically unnecessary duplicates
- Preserve clinically justified orders
- Use medical judgment, not rigid rules

Your job: Return the complete final order set that should exist after intelligent reconciliation.`
          },
          {
            role: "user",
            content: `I need you to determine the final set of orders after the provider updated their SOAP note.

SOAP NOTE CONTEXT:
${soapNote}

EXISTING ORDERS:
${JSON.stringify(existingOrders.map(order => ({
  type: order.orderType,
  medication: order.medicationName,
  dosage: order.dosage,
  sig: order.sig,
  lab_test: order.testName,
  imaging: order.studyType,
  indication: order.clinicalIndication
})), null, 2)}

NEW ORDERS FROM UPDATED SOAP:
${JSON.stringify(newSoapOrders.map(order => ({
  type: order.orderType,
  medication: order.medicationName,
  dosage: order.dosage,
  sig: order.sig,
  lab_test: order.testName,
  imaging: order.studyType,
  indication: order.clinicalIndication
})), null, 2)}

Return ONLY the orders that should exist in the final reconciled set. Use your medical judgment to eliminate duplicates and preserve legitimate orders.

Return JSON:
{
  "clinical_reasoning": "Your thought process",
  "final_orders": [
    {
      "source": "existing|new|modified",
      "order_index": number, // index from source array
      "rationale": "Why this order should exist"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content!);
      console.log("🧠 [GPTReconcile] Clinical reasoning:", result.clinical_reasoning);

      // Build final order set based on GPT's decisions
      const finalOrders: InsertOrder[] = [];
      
      for (const finalOrder of result.final_orders || []) {
        let sourceOrder: InsertOrder | null = null;
        
        if (finalOrder.source === 'existing') {
          sourceOrder = existingOrders[finalOrder.order_index] || null;
        } else if (finalOrder.source === 'new') {
          sourceOrder = newSoapOrders[finalOrder.order_index] || null;
        }
        
        if (sourceOrder) {
          finalOrders.push(sourceOrder);
          console.log(`🧠 [GPTReconcile] ✓ ${finalOrder.source} order: ${sourceOrder.medicationName || sourceOrder.testName || sourceOrder.studyType} - ${finalOrder.rationale}`);
        }
      }

      console.log(`🧠 [GPTReconcile] Reconciliation complete: ${existingOrders.length + newSoapOrders.length} → ${finalOrders.length} orders`);
      return finalOrders;

    } catch (error) {
      console.error("❌ [GPTReconcile] Error in order reconciliation:", error);
      // Fallback: return new orders only to avoid duplicates
      return newSoapOrders;
    }
  }
}

export const gptOrderReconciliation = new GPTOrderReconciliation();