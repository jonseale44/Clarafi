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
      // Prepare order data for GPT analysis
      const orderData = {
        transcriptionOrders: transcriptionOrders.map((order, index) => ({
          id: `T${index + 1}`,
          type: order.orderType,
          medication_name: order.medicationName,
          dosage: order.dosage,
          sig: order.sig,
          clinical_indication: order.clinicalIndication,
          lab_name: order.labName,
          test_name: order.testName,
          study_type: order.studyType,
          region: order.region,
          specialty_type: order.specialtyType,
          provider_name: order.providerName
        })),
        soapOrders: soapOrders.map((order, index) => ({
          id: `S${index + 1}`,
          type: order.orderType,
          medication_name: order.medicationName,
          dosage: order.dosage,
          sig: order.sig,
          clinical_indication: order.clinicalIndication,
          lab_name: order.labName,
          test_name: order.testName,
          study_type: order.studyType,
          region: order.region,
          specialty_type: order.specialtyType,
          provider_name: order.providerName
        }))
      };

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a medical AI expert specializing in clinical order analysis and deduplication. 

Your task is to intelligently merge two sets of medical orders, eliminating true duplicates while preserving legitimate variations.

MEDICAL EXPERTISE REQUIRED:
- Understand generic vs brand names (e.g., hydroxychloroquine = Plaquenil)
- Recognize medication formulations and strengths
- Identify medication tapers (e.g., prednisone 40mg→20mg→10mg are separate orders)
- Distinguish between same medication for different indications
- Understand lab test equivalencies and variations
- Recognize imaging study variations

DEDUPLICATION RULES:
1. TRUE DUPLICATES (merge): Same drug, same dosage, same indication
2. DIFFERENT DRUGS (keep both): Different active ingredients
3. SAME DRUG, DIFFERENT DOSAGES (keep both): Could be a taper or different indication
4. SAME DRUG, DIFFERENT INDICATIONS (keep both): Different clinical purposes
5. BRAND VS GENERIC (merge): Same active ingredient, same strength, same indication
6. LAB VARIATIONS (smart merge): "CBC" vs "Complete Blood Count" = duplicate
7. IMAGING VARIATIONS (smart merge): "CXR" vs "Chest X-ray" = duplicate

PRIORITIZATION:
- SOAP orders (more detailed) take priority over transcription orders when merging
- Preserve the most complete order information
- Maintain clinical accuracy above all

Respond with JSON only:`
          },
          {
            role: "user",
            content: `Analyze these medical orders for intelligent deduplication:

${JSON.stringify(orderData, null, 2)}

Return a JSON object with this exact structure:
{
  "analysis": {
    "total_transcription_orders": number,
    "total_soap_orders": number,
    "duplicates_found": [
      {
        "transcription_id": "T1",
        "soap_id": "S1", 
        "reason": "Same medication (hydroxychloroquine = Plaquenil), same dosage, same indication",
        "action": "merge_prefer_soap"
      }
    ],
    "unique_orders": ["T2", "S2", "S3"],
    "final_count": number
  },
  "merged_orders": [
    {
      "source_ids": ["T1", "S1"],
      "preferred_source": "soap",
      "reason": "SOAP order has more complete information"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const analysisResult = JSON.parse(response.choices[0].message.content!);
      console.log("🧠 [GPTDedup] Analysis result:", JSON.stringify(analysisResult, null, 2));

      // Build final order list based on GPT analysis
      const finalOrders: InsertOrder[] = [];
      const processedIds = new Set<string>();

      // Add merged orders (GPT chose the best version)
      for (const merge of analysisResult.merged_orders || []) {
        const sourceIds = merge.source_ids;
        const preferredSource = merge.preferred_source;
        
        // Find the preferred order
        let preferredOrder: InsertOrder | null = null;
        
        for (const sourceId of sourceIds) {
          if (sourceId.startsWith('T') && preferredSource === 'transcription') {
            const index = parseInt(sourceId.substring(1)) - 1;
            preferredOrder = transcriptionOrders[index];
          } else if (sourceId.startsWith('S') && preferredSource === 'soap') {
            const index = parseInt(sourceId.substring(1)) - 1;
            preferredOrder = soapOrders[index];
          }
        }

        if (preferredOrder) {
          finalOrders.push(preferredOrder);
          sourceIds.forEach(id => processedIds.add(id));
          console.log(`🧠 [GPTDedup] Merged orders ${sourceIds.join(', ')} → preferred ${preferredSource}`);
        }
      }

      // Add unique orders that weren't part of any merge
      for (const uniqueId of analysisResult.analysis.unique_orders || []) {
        if (!processedIds.has(uniqueId)) {
          if (uniqueId.startsWith('T')) {
            const index = parseInt(uniqueId.substring(1)) - 1;
            if (index >= 0 && index < transcriptionOrders.length) {
              finalOrders.push(transcriptionOrders[index]);
              console.log(`🧠 [GPTDedup] Added unique transcription order ${uniqueId}`);
            }
          } else if (uniqueId.startsWith('S')) {
            const index = parseInt(uniqueId.substring(1)) - 1;
            if (index >= 0 && index < soapOrders.length) {
              finalOrders.push(soapOrders[index]);
              console.log(`🧠 [GPTDedup] Added unique SOAP order ${uniqueId}`);
            }
          }
          processedIds.add(uniqueId);
        }
      }

      console.log(`🧠 [GPTDedup] Deduplication complete: ${transcriptionOrders.length + soapOrders.length} → ${finalOrders.length} orders`);
      console.log(`🧠 [GPTDedup] Duplicates eliminated: ${analysisResult.analysis.duplicates_found?.length || 0}`);

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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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