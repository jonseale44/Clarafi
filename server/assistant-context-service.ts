import OpenAI from 'openai';
import { db } from './db.js';
import { patients, familyHistory, socialHistory, allergies, vitals, medications, diagnoses, encounters } from '../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

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
    if (!this.assistantId) {
      console.log('🤖 [AssistantContextService] Creating new medical assistant...');
      const assistant = await this.openai.beta.assistants.create({
        name: "Medical Context Assistant",
        instructions: `You are a medical AI assistant providing real-time clinical decision support for healthcare providers with deep patient history integration.

PROVIDER REAL-TIME SUGGESTIONS:
Analyze provider speech against patient's complete medical history and provide intelligent, contextual guidance:

MEDICATION INTELLIGENCE:
- Contraindications: "Avoid metformin - patient has CKD stage 3 (creatinine 2.1 from 03/15/2024)"
- Dosing guidance: "Patient's eGFR 45 ml/min - reduce lisinopril to 5mg daily"
- Drug interactions: "Warfarin + new antibiotic - monitor INR closely"
- Historical responses: "Patient discontinued simvastatin 6 months ago due to myalgias"

CLINICAL CONTEXT:
- Lab trends: "Last A1C was 8.2% (6 months ago) - target <7% not met"
- Vital patterns: "BP trending up: 145/90 today vs 130/80 last visit"
- Follow-up needs: "Due for mammogram (last one 18 months ago)"
- Red flags: "New chest pain + history of CAD - consider EKG"

DIAGNOSTIC SUPPORT:
- Differential considerations based on history
- Missing assessments for chronic conditions
- Preventive care reminders
- Treatment optimization opportunities

CRITICAL: Always reference specific dates, values, and historical context. Be precise and actionable.

OUTPUT FORMATS:
For real-time suggestions: 
{
  "suggestions": ["specific clinical suggestion with historical context"],
  "clinicalFlags": ["urgent safety or diagnostic considerations"],
  "contextualReminders": ["relevant historical data with dates/values"]
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
      console.log('🤖 [AssistantContextService] ✅ Assistant created:', this.assistantId);
    }
  }
  
  async getOrCreateThread(patientId: number): Promise<string> {
    console.log('🧵 [AssistantContextService] Getting thread for patient:', patientId);
    
    // Check if patient already has thread (we'll add this field to schema later)
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId)).limit(1);
    
    // Create new thread with patient context
    const thread = await this.openai.beta.threads.create();
    console.log('🧵 [AssistantContextService] ✅ Created new thread:', thread.id);
    
    // Load patient's complete medical history
    const patientHistory = await this.getPatientHistory(patientId);
    
    // Add historical context to thread
    await this.openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Patient Historical Context: ${JSON.stringify(patientHistory)}`
    });
    
    return thread.id;
  }
  
  // Real-time suggestions during transcription
  async getRealtimeSuggestions(
    threadId: string,
    partialTranscription: string,
    userRole: string,
    patientId: number
  ) {
    console.log('⚡ [AssistantContextService] Getting real-time suggestions...');
    
    await this.openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `PARTIAL TRANSCRIPTION: "${partialTranscription}"
USER ROLE: ${userRole}
MODE: REAL_TIME_SUGGESTIONS

Provide immediate clinical suggestions based on this partial transcription.`
    });
    
    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    });
    
    // Wait for completion (should be fast for suggestions)
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }
    
    if (runStatus.status === 'completed') {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.content[0].type === 'text') {
        try {
          return JSON.parse(lastMessage.content[0].text.value);
        } catch (error) {
          console.error('❌ [AssistantContextService] Failed to parse suggestions:', error);
        }
      }
    }
    
    return { suggestions: [], clinicalFlags: [], historicalContext: "" };
  }
  
  // Complete processing after recording stops
  async processCompleteTranscription(
    threadId: string,
    fullTranscription: string,
    userRole: string,
    patientId: number,
    encounterId: number
  ) {
    console.log('📝 [AssistantContextService] Processing complete transcription...');
    
    await this.openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `COMPLETE TRANSCRIPTION: "${fullTranscription}"
USER ROLE: ${userRole}
ENCOUNTER_ID: ${encounterId}
MODE: COMPLETE_PROCESSING

Generate SOAP note, draft orders, CPT codes, and chart updates.`
    });
    
    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    });
    
    // Wait for completion
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }
    
    if (runStatus.status === 'completed') {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.content[0].type === 'text') {
        try {
          return JSON.parse(lastMessage.content[0].text.value);
        } catch (error) {
          console.error('❌ [AssistantContextService] Failed to parse complete response:', error);
          throw new Error('Failed to parse assistant response');
        }
      }
    }
    
    throw new Error('Assistant processing failed or timed out');
  }
  
  private async getPatientHistory(patientId: number) {
    console.log('📋 [AssistantContextService] Loading patient history for:', patientId);
    
    try {
      // Get comprehensive patient data
      const [
        patient,
        familyHistoryData,
        socialHistoryData,
        allergiesData,
        recentVitals,
        currentMedications,
        activeDiagnoses,
        recentEncounters
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
        recentVitals,
        currentMedications,
        activeDiagnoses,
        recentEncounters
      };
      
      console.log('📋 [AssistantContextService] ✅ Patient history loaded:', {
        hasPatient: !!history.patient,
        familyHistoryCount: history.familyHistory.length,
        allergiesCount: history.allergies.length,
        vitalsCount: history.recentVitals.length,
        medicationsCount: history.currentMedications.length,
        diagnosesCount: history.activeDiagnoses.length
      });
      
      return history;
    } catch (error) {
      console.error('❌ [AssistantContextService] Failed to load patient history:', error);
      return {
        patient: null,
        familyHistory: [],
        socialHistory: [],
        allergies: [],
        recentVitals: [],
        currentMedications: [],
        activeDiagnoses: [],
        recentEncounters: []
      };
    }
  }
}