/**
 * GPT-Powered Interface Engine
 * 
 * This service uses GPT to intelligently parse, transform, and route lab messages
 * from ANY format or source - replacing traditional interface engines like Mirth
 * with AI-powered flexibility.
 */

import OpenAI from 'openai';
import { db } from './db.js';
import { labResults, labOrders, hl7Messages, externalLabs } from '@shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GPTInterfaceRequest {
  // Raw message in ANY format (HL7, XML, JSON, PDF text, etc.)
  rawMessage: string;
  // Source system identifier
  sourceSystem: string;
  // Message type hint (optional)
  messageTypeHint?: 'lab_result' | 'lab_order' | 'status_update' | 'unknown';
  // Additional context about the source
  sourceContext?: {
    labName?: string;
    expectedFormat?: string;
    timezone?: string;
  };
}

export interface GPTInterfaceResponse {
  // What type of message was detected
  messageType: 'lab_result' | 'lab_order' | 'status_update' | 'error' | 'unknown';
  // Parsed and normalized data
  parsedData: any;
  // Confidence in the parsing (0-100)
  confidence: number;
  // Any warnings or notes
  warnings: string[];
  // Suggested actions
  suggestedActions: string[];
  // Original format detected
  detectedFormat: string;
}

export class GPTInterfaceEngine {
  private systemPrompt = `You are an advanced healthcare interface engine powered by AI. Your role is to:

1. INTELLIGENTLY PARSE any lab message format including:
   - HL7 v2.x messages (pipe-delimited)
   - FHIR JSON/XML
   - Proprietary lab formats
   - CSV/TSV lab reports
   - Even unstructured text or scanned documents

2. TRANSFORM data into our standardized format:
   - Extract patient identifiers (MRN, name, DOB)
   - Parse lab test results with values, units, reference ranges
   - Identify critical values and abnormal flags
   - Extract ordering provider information
   - Determine collection dates and times

3. HANDLE VARIATIONS intelligently:
   - Different naming conventions (e.g., "Glucose" vs "Blood Sugar" vs "GLU")
   - Various unit formats (mg/dL vs mmol/L)
   - Different date formats
   - Missing or incomplete data

4. PROVIDE CLINICAL CONTEXT:
   - Flag critical values based on clinical significance
   - Suggest follow-up tests when appropriate
   - Identify result patterns of concern

5. ROUTE messages appropriately:
   - Determine if it's a result, order, or status update
   - Identify the source lab
   - Map to appropriate patient records

Return a structured JSON response with parsed data and metadata.`;

  async parseMessage(request: GPTInterfaceRequest): Promise<GPTInterfaceResponse> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.systemPrompt },
          { 
            role: "user", 
            content: `Parse this lab message:
            
Source System: ${request.sourceSystem}
Message Type Hint: ${request.messageTypeHint || 'unknown'}
Lab Name: ${request.sourceContext?.labName || 'unknown'}
Expected Format: ${request.sourceContext?.expectedFormat || 'auto-detect'}

RAW MESSAGE:
${request.rawMessage}

Please parse this message and return:
1. Message type (lab_result, lab_order, status_update, etc.)
2. All extracted data in a structured format
3. Confidence level (0-100)
4. Any warnings about missing or ambiguous data
5. Suggested follow-up actions
6. The format you detected

For lab results, ensure you extract:
- Patient identifiers (MRN, name, DOB)
- Test name, value, units, reference range
- Collection date/time
- Abnormal flags
- Ordering provider
- Any critical values`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for consistent parsing
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Log successful parsing
      console.log(`[GPTInterface] Successfully parsed ${request.sourceSystem} message with ${response.confidence}% confidence`);
      
      return response;
    } catch (error) {
      console.error('[GPTInterface] Parsing error:', error);
      return {
        messageType: 'error',
        parsedData: null,
        confidence: 0,
        warnings: [`Failed to parse message: ${error instanceof Error ? error.message : String(error)}`],
        suggestedActions: ['Manual review required'],
        detectedFormat: 'unknown'
      };
    }
  }

  async routeMessage(response: GPTInterfaceResponse, sourceSystem: string): Promise<void> {
    // Based on the parsed response, route to appropriate handlers
    switch (response.messageType) {
      case 'lab_result':
        await this.processLabResult(response.parsedData, sourceSystem);
        break;
      case 'lab_order':
        await this.processLabOrder(response.parsedData, sourceSystem);
        break;
      case 'status_update':
        await this.processStatusUpdate(response.parsedData, sourceSystem);
        break;
      default:
        console.warn(`[GPTInterface] Unknown message type: ${response.messageType}`);
    }
  }

  private async processLabResult(data: any, sourceSystem: string): Promise<void> {
    // Store in our lab results table
    // GPT has already normalized the data for us
    console.log(`[GPTInterface] Processing lab result from ${sourceSystem}`, data);
    
    // Implementation would insert into labResults table
    // with GPT-normalized data
  }

  private async processLabOrder(data: any, sourceSystem: string): Promise<void> {
    console.log(`[GPTInterface] Processing lab order from ${sourceSystem}`, data);
    // Implementation would update labOrders table
  }

  private async processStatusUpdate(data: any, sourceSystem: string): Promise<void> {
    console.log(`[GPTInterface] Processing status update from ${sourceSystem}`, data);
    // Implementation would update order status
  }

  // Advanced GPT capabilities beyond traditional interface engines

  async suggestFollowUpTests(labResults: any[]): Promise<string[]> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a clinical laboratory expert. Based on lab results, suggest appropriate follow-up tests."
        },
        {
          role: "user",
          content: `Based on these lab results, what follow-up tests would you recommend?
          ${JSON.stringify(labResults, null, 2)}`
        }
      ],
      temperature: 0.3,
    });

    return completion.choices[0].message.content?.split('\n').filter(s => s.trim()) || [];
  }

  async generateClinicalNarrative(labResults: any[]): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Generate a physician-friendly narrative summary of lab results, highlighting key findings and trends."
        },
        {
          role: "user",
          content: `Create a clinical narrative for these lab results:
          ${JSON.stringify(labResults, null, 2)}`
        }
      ],
      temperature: 0.5,
    });

    return completion.choices[0].message.content || '';
  }

  async reconcileLabNaming(testName: string, sourceLabId: number): Promise<string> {
    // GPT can intelligently map different lab naming conventions
    const externalLab = await db.select().from(externalLabs).where(eq(externalLabs.id, sourceLabId)).limit(1);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Map lab test names to standardized LOINC codes and common names."
        },
        {
          role: "user",
          content: `The lab "${externalLab[0]?.labName}" sent a test called "${testName}". 
          What is the standardized name and LOINC code for this test?`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const mapping = JSON.parse(completion.choices[0].message.content || '{}');
    return mapping.standardizedName || testName;
  }

  async detectCriticalPatterns(patientId: number): Promise<{
    patterns: string[];
    urgency: 'routine' | 'urgent' | 'critical';
    recommendations: string[];
  }> {
    // GPT can analyze patterns across multiple lab results
    const recentResults = await db.select()
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(labResults.collectionDateTime)
      .limit(50);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Analyze lab result patterns for concerning trends or critical findings."
        },
        {
          role: "user",
          content: `Analyze these lab results for patterns:
          ${JSON.stringify(recentResults, null, 2)}
          
          Identify:
          1. Concerning trends
          2. Critical patterns
          3. Urgency level
          4. Clinical recommendations`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

// Export singleton instance
export const gptInterfaceEngine = new GPTInterfaceEngine();