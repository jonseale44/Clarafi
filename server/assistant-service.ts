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
    console.log('🤖 [AssistantService] Initializing OpenAI Assistant...');
    if (!this.assistantId) {
      console.log('🤖 [AssistantService] No existing assistant ID, creating new assistant...');
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
      console.log('🤖 [AssistantService] ✅ New assistant created with ID:', this.assistantId);
    } else {
      console.log('🤖 [AssistantService] ✅ Using existing assistant ID:', this.assistantId);
    }
  }
  
  async getOrCreateThread(patientId: number): Promise<string> {
    console.log('🧵 [AssistantService] Getting or creating thread for patient ID:', patientId);
    
    // Check if patient already has a thread
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    console.log('🧵 [AssistantService] Patient data retrieved:', { 
      patientId, 
      hasExistingThread: !!patient[0]?.assistantThreadId,
      threadId: patient[0]?.assistantThreadId 
    });
    
    if (patient[0]?.assistantThreadId) {
      console.log('🧵 [AssistantService] ✅ Using existing thread:', patient[0].assistantThreadId);
      return patient[0].assistantThreadId;
    }
    
    // Create new thread
    console.log('🧵 [AssistantService] Creating new OpenAI thread...');
    const thread = await openai.beta.threads.create();
    console.log('🧵 [AssistantService] ✅ New thread created:', thread.id);
    
    // Save thread ID to patient record
    console.log('🧵 [AssistantService] Saving thread ID to patient record...');
    await db.update(patients)
      .set({ assistantThreadId: thread.id })
      .where(eq(patients.id, patientId));
    console.log('🧵 [AssistantService] ✅ Thread ID saved to patient record');
    
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
    console.log('🎯 [AssistantService] Processing voice recording...', {
      threadId,
      patientId,
      encounterId,
      userRole,
      transcriptionLength: transcription.length,
      chartDataKeys: Object.keys(currentChartData)
    });

    // Add message to thread with full context
    console.log('💬 [AssistantService] Adding message to thread...');
    const messageContent = `
VOICE RECORDING TRANSCRIPTION: ${transcription}

CURRENT PATIENT CHART: ${JSON.stringify(currentChartData, null, 2)}

USER ROLE: ${userRole}

ENCOUNTER ID: ${encounterId}

Please process this voice recording and provide structured medical documentation following the output format specified in your instructions.
    `;
    
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messageContent
    });
    console.log('💬 [AssistantService] ✅ Message added to thread');
    
    // Run assistant
    console.log('🚀 [AssistantService] Starting assistant run...');
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    });
    console.log('🚀 [AssistantService] ✅ Assistant run started:', run.id);
    
    // Wait for completion
    console.log('⏳ [AssistantService] Waiting for assistant completion...');
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let pollCount = 0;
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      pollCount++;
      console.log(`⏳ [AssistantService] Poll ${pollCount}: Status = ${runStatus.status}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    console.log('🏁 [AssistantService] Assistant run completed with status:', runStatus.status);
    
    if (runStatus.status === 'completed') {
      console.log('📥 [AssistantService] Retrieving assistant response...');
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.content[0].type === 'text') {
        const responseText = lastMessage.content[0].text.value;
        console.log('📄 [AssistantService] Raw response length:', responseText.length);
        console.log('📄 [AssistantService] Response preview:', responseText.substring(0, 200) + '...');
        
        try {
          const parsedResponse = JSON.parse(responseText);
          console.log('✅ [AssistantService] Successfully parsed JSON response');
          console.log('📊 [AssistantService] Response structure:', Object.keys(parsedResponse));
          return parsedResponse;
        } catch (parseError) {
          console.error('❌ [AssistantService] Failed to parse JSON response:', parseError);
          console.log('📄 [AssistantService] Full response text:', responseText);
          throw new Error('Assistant response was not valid JSON');
        }
      }
    } else {
      console.error('❌ [AssistantService] Assistant run failed with status:', runStatus.status);
      if (runStatus.last_error) {
        console.error('❌ [AssistantService] Error details:', runStatus.last_error);
      }
    }
    
    throw new Error(`Assistant processing failed with status: ${runStatus.status}`);
  }
}