import OpenAI from 'openai';
import { db } from './db.js';
import { patients, familyHistory, socialHistory, allergies, vitals, medications, diagnoses, encounters } from '../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export class AssistantContextService {
  private openai: OpenAI;
  private assistantId: string;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }
  
  async initializeAssistant() {
    console.log('🤖 [AssistantContext] Initializing Assistant...');
    
    if (!this.assistantId) {
      console.log('🤖 [AssistantContext] Creating new medical assistant...');
      const assistant = await this.openai.beta.assistants.create({
        name: "Medical Context Assistant",
        instructions: `You are a medical AI assistant that provides real-time clinical decision support.

REAL-TIME SUGGESTIONS MODE:
When receiving partial transcriptions, provide immediate clinical suggestions:
- For NURSES: Assessment questions, symptom clarification, patient education
- For PROVIDERS: Differential diagnosis, treatment considerations, clinical red flags

HISTORICAL CONTEXT MODE:
Analyze patient history and provide contextual insights:
- Previous encounters and outcomes
- Recurring patterns and chronic conditions
- Relevant test results and medication responses
- Clinical decision continuity

OUTPUT FORMATS:
For real-time suggestions: 
{
  "suggestions": ["immediate suggestion 1", "immediate suggestion 2"],
  "clinicalFlags": ["urgent consideration if applicable"],
  "historicalContext": "relevant past encounter info"
}

For complete processing:
{
  "soapNote": { "subjective": "", "objective": "", "assessment": "", "plan": "" },
  "draftOrders": [{"type": "lab", "details": "CBC with diff", "indication": "anemia workup"}],
  "cptCodes": [{"code": "99213", "description": "Office visit", "units": 1}],
  "chartUpdates": { "historicalUpdates": {}, "factualAppends": {} }
}`,
        model: "gpt-4o",
        tools: []
      });
      this.assistantId = assistant.id;
      console.log('🤖 [AssistantContext] ✅ New assistant created:', this.assistantId);
    } else {
      console.log('🤖 [AssistantContext] ✅ Using existing assistant:', this.assistantId);
    }
  }
  
  async getOrCreateThread(patientId: number): Promise<string> {
    console.log('🧵 [AssistantContext] Getting or creating thread for patient:', patientId);
    
    // Check if patient already has thread
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId)).limit(1);
    
    if (patient[0]?.assistantThreadId) {
      console.log('🧵 [AssistantContext] ✅ Using existing thread:', patient[0].assistantThreadId);
      return patient[0].assistantThreadId;
    }
    
    // Create new thread with patient context
    console.log('🧵 [AssistantContext] Creating new thread...');
    const thread = await this.openai.beta.threads.create();
    
    // Load patient's complete medical history
    const patientHistory = await this.getPatientHistory(patientId);
    
    // Add historical context to thread
    await this.openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Patient Historical Context: ${JSON.stringify(patientHistory, null, 2)}`
    });
    
    // Save thread ID to patient record
    await db.update(patients)
      .set({ assistantThreadId: thread.id })
      .where(eq(patients.id, patientId));
    
    console.log('🧵 [AssistantContext] ✅ New thread created and saved:', thread.id);
    return thread.id;
  }
  
  // Real-time suggestions during transcription
  async getRealtimeSuggestions(
    threadId: string,
    partialTranscription: string,
    userRole: string,
    patientId: number
  ) {
    console.log('💡 [AssistantContext] Getting realtime suggestions...', {
      threadId,
      userRole,
      transcriptionLength: partialTranscription.length
    });
    
    try {
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `PARTIAL TRANSCRIPTION: "${partialTranscription}"
USER ROLE: ${userRole}
MODE: REAL_TIME_SUGGESTIONS

Provide immediate clinical suggestions based on this partial transcription. Keep suggestions brief and actionable.`
      });
      
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId
      });
      
      // Wait for completion (should be fast for suggestions)
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max
      
      while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
        attempts++;
      }
      
      if (runStatus.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0].type === 'text') {
          try {
            const result = JSON.parse(lastMessage.content[0].text.value);
            console.log('💡 [AssistantContext] ✅ Suggestions generated:', result);
            return result;
          } catch (parseError) {
            console.error('💡 [AssistantContext] Failed to parse suggestions JSON:', parseError);
            // Return the raw text if JSON parsing fails
            return {
              suggestions: [lastMessage.content[0].text.value],
              clinicalFlags: [],
              historicalContext: ""
            };
          }
        }
      } else {
        console.warn('💡 [AssistantContext] Suggestions run did not complete:', runStatus.status);
      }
      
      return { suggestions: [], clinicalFlags: [], historicalContext: "" };
      
    } catch (error) {
      console.error('💡 [AssistantContext] Error getting suggestions:', error);
      return { suggestions: [], clinicalFlags: [], historicalContext: "" };
    }
  }
  
  // Complete processing after recording stops
  async processCompleteTranscription(
    threadId: string,
    fullTranscription: string,
    userRole: string,
    patientId: number,
    encounterId: number
  ) {
    console.log('📋 [AssistantContext] Processing complete transcription...', {
      threadId,
      userRole,
      patientId,
      encounterId,
      transcriptionLength: fullTranscription.length
    });
    
    try {
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `COMPLETE TRANSCRIPTION: "${fullTranscription}"
USER ROLE: ${userRole}
ENCOUNTER_ID: ${encounterId}
MODE: COMPLETE_PROCESSING

Generate comprehensive SOAP note, draft orders, CPT codes, and chart updates based on this complete transcription.`
      });
      
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId
      });
      
      // Wait for completion with longer timeout for complete processing
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max for complete processing
      
      while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
        attempts++;
        
        if (attempts % 10 === 0) {
          console.log(`📋 [AssistantContext] Still processing... (${attempts}s)`);
        }
      }
      
      if (runStatus.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0].type === 'text') {
          try {
            const result = JSON.parse(lastMessage.content[0].text.value);
            console.log('📋 [AssistantContext] ✅ Complete processing finished');
            return result;
          } catch (parseError) {
            console.error('📋 [AssistantContext] Failed to parse complete processing JSON:', parseError);
            // Return a structured fallback
            return {
              soapNote: {
                subjective: fullTranscription,
                objective: "",
                assessment: "",
                plan: ""
              },
              draftOrders: [],
              cptCodes: [],
              chartUpdates: { historicalUpdates: {}, factualAppends: {} }
            };
          }
        }
      } else {
        console.error('📋 [AssistantContext] Complete processing failed:', runStatus.status);
        throw new Error(`Assistant processing failed with status: ${runStatus.status}`);
      }
      
    } catch (error) {
      console.error('📋 [AssistantContext] Error in complete processing:', error);
      throw new Error('Assistant processing failed: ' + error.message);
    }
    
    throw new Error('Assistant processing failed - no valid response');
  }
  
  private async getPatientHistory(patientId: number) {
    console.log('📖 [AssistantContext] Loading patient history for:', patientId);
    
    try {
      // Get comprehensive patient data
      const [
        patient,
        familyHistoryData,
        socialHistoryData,
        allergiesData,
        recentVitalsData,
        currentMedicationsData,
        activeDiagnosesData,
        recentEncountersData
      ] = await Promise.all([
        db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
        db.select().from(familyHistory).where(eq(familyHistory.patientId, patientId)),
        db.select().from(socialHistory).where(eq(socialHistory.patientId, patientId)),
        db.select().from(allergies).where(eq(allergies.patientId, patientId)),
        db.select().from(vitals).where(eq(vitals.patientId, patientId))
          .orderBy(desc(vitals.measuredAt)).limit(10),
        db.select().from(medications).where(eq(medications.patientId, patientId)),
        db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId)),
        db.select().from(encounters).where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.createdAt)).limit(5)
      ]);
      
      const history = {
        patient: patient[0],
        familyHistory: familyHistoryData,
        socialHistory: socialHistoryData,
        allergies: allergiesData,
        recentVitals: recentVitalsData,
        currentMedications: currentMedicationsData,
        activeDiagnoses: activeDiagnosesData,
        recentEncounters: recentEncountersData
      };
      
      console.log('📖 [AssistantContext] ✅ Patient history loaded:', {
        hasPatient: !!history.patient,
        familyHistoryCount: history.familyHistory.length,
        socialHistoryCount: history.socialHistory.length,
        allergiesCount: history.allergies.length,
        vitalsCount: history.recentVitals.length,
        medicationsCount: history.currentMedications.length,
        diagnosesCount: history.activeDiagnoses.length,
        encountersCount: history.recentEncounters.length
      });
      
      return history;
      
    } catch (error) {
      console.error('📖 [AssistantContext] Error loading patient history:', error);
      throw error as Error;
    }
  }
}