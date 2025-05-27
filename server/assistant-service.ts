import OpenAI from 'openai';
import { db } from './db.js';
import { patients } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AssistantService {
  private assistantId: string;
  
  constructor() {
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }
  
  async initializeAssistant() {
    if (!this.assistantId) {
      const assistant = await openai.beta.assistants.create({
        name: "Medical Documentation Assistant",
        instructions: `You are an expert medical AI assistant that processes voice recordings from healthcare providers.

CORE RESPONSIBILITIES:
1. Convert voice transcriptions into structured SOAP notes
2. Generate appropriate medical orders based on clinical content
3. Suggest relevant CPT codes for billing
4. Provide role-based suggestions (different for nurses vs providers)
5. Update patient charts using smart update strategy

SMART UPDATE RULES:
- Historical data (family history, social history, allergies): UPDATE existing records
- Factual data (vitals, medications, labs, diagnoses): APPEND as new records
- Never modify existing vital signs, lab results, or medication records

ROLE-BASED PROMPTING:
- For NURSES: Focus on assessment questions, patient education, symptom clarification
- For PROVIDERS: Focus on differential diagnosis, treatment plans, clinical decision support

OUTPUT FORMAT: Always respond with valid JSON containing:
{
  "soapNote": {
    "subjective": "string",
    "objective": "string", 
    "assessment": "string",
    "plan": "string"
  },
  "suggestions": {
    "realTimePrompts": ["suggestion1", "suggestion2"],
    "clinicalGuidance": "string"
  },
  "chartUpdates": {
    "historicalUpdates": {
      "familyHistory": [{"familyMember": "string", "medicalHistory": "string"}],
      "socialHistory": [{"category": "string", "currentStatus": "string"}],
      "allergies": [{"allergen": "string", "reaction": "string", "severity": "string"}]
    },
    "factualAppends": {
      "vitals": [{"measuredAt": "datetime", "systolicBp": number, "diastolicBp": number, "heartRate": number, "temperature": number, "weight": number, "height": number}],
      "medications": [{"medicationName": "string", "dosage": "string", "frequency": "string", "route": "string", "startDate": "datetime", "status": "string"}],
      "diagnoses": [{"diagnosis": "string", "icd10Code": "string", "status": "string", "notes": "string"}]
    }
  },
  "draftOrders": [
    {
      "orderType": "lab|imaging|medication|referral",
      "orderDetails": "string",
      "priority": "routine|urgent|stat",
      "clinicalIndication": "string"
    }
  ],
  "cptCodes": [
    {
      "code": "string",
      "description": "string",
      "units": number,
      "modifier": "string"
    }
  ]
}`,
        model: "gpt-4o",
        tools: []
      });
      this.assistantId = assistant.id;
    }
  }
  
  async getOrCreateThread(patientId: number): Promise<string> {
    // Check if patient already has a thread
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    
    if (patient[0]?.assistantThreadId) {
      return patient[0].assistantThreadId;
    }
    
    // Create new thread
    const thread = await openai.beta.threads.create();
    
    // Save thread ID to patient record
    await db.update(patients)
      .set({ assistantThreadId: thread.id })
      .where(eq(patients.id, patientId));
    
    return thread.id;
  }
  
  async processVoiceRecording(
    threadId: string,
    transcription: string,
    patientId: number,
    encounterId: number,
    userRole: string,
    currentChartData: any
  ) {
    // Add message to thread with full context
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `
VOICE RECORDING TRANSCRIPTION: ${transcription}

CURRENT PATIENT CHART: ${JSON.stringify(currentChartData)}

USER ROLE: ${userRole}

ENCOUNTER ID: ${encounterId}

Please process this voice recording and provide structured medical documentation following the output format specified in your instructions.
      `
    });
    
    // Run assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    });
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.content[0].type === 'text') {
        return JSON.parse(lastMessage.content[0].text.value);
      }
    }
    
    throw new Error('Assistant processing failed');
  }
}