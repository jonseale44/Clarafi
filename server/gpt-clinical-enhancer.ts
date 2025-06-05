import OpenAI from "openai";
import { InsertOrder } from "../shared/schema.js";

/**
 * GPT-powered clinical enhancement service
 * Uses AI to intelligently complete missing clinical data for orders
 * Ensures all medical decision-making remains with GPT, not hardcoded logic
 */
export class GPTClinicalEnhancer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Enhances incomplete medication orders using GPT medical knowledge
   * Incorporates patient chart data for clinically accurate ICD-10 selection
   * Populates missing ICD-10 codes, clinical indications, and prior auth requirements
   */
  async enhanceMedicationOrder(order: InsertOrder, patientChartData?: any): Promise<InsertOrder> {
    // Check if order needs enhancement
    if (!this.needsEnhancement(order)) {
      return order;
    }

    try {
      console.log(`[GPT Enhancer] Enhancing medication order: ${order.medicationName}`);
      
      const enhancement = await this.requestGPTEnhancement(order, patientChartData);
      
      const enhancedOrder = {
        ...order,
        clinicalIndication: enhancement.clinicalIndication || order.clinicalIndication,
        diagnosisCode: enhancement.diagnosisCode || order.diagnosisCode,
        requiresPriorAuth: enhancement.requiresPriorAuth !== undefined ? enhancement.requiresPriorAuth : (order.requiresPriorAuth || false)
      };

      console.log(`[GPT Enhancer] Enhanced order with ICD-10: ${enhancement.diagnosisCode}, Indication: ${enhancement.clinicalIndication}`);
      
      return enhancedOrder;
    } catch (error) {
      console.error('[GPT Enhancer] Error enhancing medication order:', error);
      return order; // Return original order if enhancement fails
    }
  }

  /**
   * Determines if an order needs GPT enhancement
   */
  private needsEnhancement(order: InsertOrder): boolean {
    const hasGenericIndication = !order.clinicalIndication || 
      order.clinicalIndication.includes('See diagnosis') ||
      order.clinicalIndication.includes('Clinical evaluation needed') ||
      order.clinicalIndication.includes('Clinical correlation needed');
    
    const missingDiagnosisCode = !order.diagnosisCode || order.diagnosisCode === '';
    
    return Boolean(order.medicationName) && (hasGenericIndication || missingDiagnosisCode);
  }

  /**
   * Requests GPT to provide clinical enhancement for incomplete orders
   * Incorporates patient chart data for clinically accurate decisions
   */
  private async requestGPTEnhancement(order: InsertOrder, patientChartData?: any): Promise<{
    clinicalIndication?: string;
    diagnosisCode?: string;
    requiresPriorAuth?: boolean;
  }> {
    const chartContext = patientChartData ? `
Patient Chart Context:
- Active Problems: ${JSON.stringify(patientChartData.activeProblems || [])}
- Medical History: ${JSON.stringify(patientChartData.medicalHistory || [])}
- Current Medications: ${JSON.stringify(patientChartData.currentMedications || [])}
- Recent Diagnoses: ${JSON.stringify(patientChartData.recentDiagnoses || [])}
- Allergies: ${JSON.stringify(patientChartData.allergies || [])}
` : 'No patient chart data available.';

    const prompt = `You are a clinical pharmacist AI assistant. A medication order was created manually and needs clinical enhancement for EMR integration and insurance processing.

${chartContext}

Medication Order Details:
- Medication: ${order.medicationName}
- Dosage: ${order.dosage || 'Not specified'}
- Form: ${order.form || 'Not specified'}
- Route: ${order.routeOfAdministration || 'Not specified'}
- Current Indication: ${order.clinicalIndication || 'Not specified'}
- Current ICD-10: ${order.diagnosisCode || 'Not specified'}

CRITICAL: Use the patient's existing chart data to make clinically appropriate ICD-10 selections. If the patient has documented hypertension and is being prescribed lisinopril, use the hypertension ICD-10 code. If they have diabetes and are prescribed metformin, use the diabetes code. Always prioritize existing documented conditions over general medication indications.

Please provide clinical enhancement data in JSON format:

{
  "clinicalIndication": "specific clinical indication for this medication",
  "diagnosisCode": "most appropriate ICD-10 code",
  "requiresPriorAuth": boolean
}

Guidelines:
1. Provide the most common/likely clinical indication for this medication
2. Suggest the most appropriate ICD-10 code for the indication
3. Determine if this medication commonly requires prior authorization
4. Base recommendations on standard clinical practice and common usage patterns
5. If medication name is unclear or very uncommon, provide best clinical judgment

Return only the JSON object, no additional text.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a clinical pharmacist AI that provides accurate medical enhancement data for EMR systems. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from GPT');
    }

    // Clean and parse JSON response
    let cleanedContent = content;
    if (content.startsWith('```json')) {
      cleanedContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      cleanedContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const enhancement = JSON.parse(cleanedContent);
      console.log(`[GPT Enhancer] GPT provided enhancement:`, enhancement);
      return enhancement;
    } catch (parseError) {
      console.error('[GPT Enhancer] Failed to parse GPT response:', cleanedContent);
      throw new Error('Invalid JSON response from GPT');
    }
  }
}