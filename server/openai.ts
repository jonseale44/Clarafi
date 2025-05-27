import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "default_key" 
});

export interface VoiceTranscriptionResult {
  transcription: string;
  aiSuggestions: {
    nursePrompts?: string[];
    providerPrompts?: string[];
    draftOrders?: string[];
    draftDiagnoses?: string[];
    clinicalNotes?: string;
  };
}

export interface AIAssistantParams {
  userRole: "nurse" | "provider";
  patientContext: {
    age: number;
    gender: string;
    medicalHistory: string[];
    currentMedications: string[];
    allergies: string[];
    chiefComplaint?: string;
  };
  transcription: string;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Convert buffer to a readable stream-like object
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    throw new Error("Failed to transcribe audio: " + error.message);
  }
}

export async function generateAIAssistance(params: AIAssistantParams): Promise<VoiceTranscriptionResult["aiSuggestions"]> {
  try {
    const { userRole, patientContext, transcription } = params;

    // Create role-specific prompts
    const systemPrompt = userRole === "nurse" 
      ? `You are an AI assistant helping a nurse with patient care. Based on the patient's information and the voice transcription, provide helpful nursing-focused suggestions, interventions, and next steps. Focus on patient comfort, vital signs monitoring, medication administration, and patient education.`
      : `You are an AI assistant helping a healthcare provider with clinical decision making. Based on the patient's information and the voice transcription, provide clinical insights, diagnostic considerations, treatment recommendations, and follow-up care suggestions.`;

    const contextPrompt = `
Patient Context:
- Age: ${patientContext.age}, Gender: ${patientContext.gender}
- Medical History: ${patientContext.medicalHistory.join(", ") || "None documented"}
- Current Medications: ${patientContext.currentMedications.join(", ") || "None"}
- Allergies: ${patientContext.allergies.join(", ") || "NKDA"}
- Chief Complaint: ${patientContext.chiefComplaint || "Not specified"}

Voice Transcription: "${transcription}"

Please provide suggestions in JSON format with the following structure:
{
  "${userRole}Prompts": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "draftOrders": ["order 1", "order 2"],
  "draftDiagnoses": ["diagnosis 1", "diagnosis 2"],
  "clinicalNotes": "Summary and recommendations"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      ...(userRole === "nurse" ? { nursePrompts: result.nursePrompts } : { providerPrompts: result.providerPrompts }),
      draftOrders: result.draftOrders || [],
      draftDiagnoses: result.draftDiagnoses || [],
      clinicalNotes: result.clinicalNotes || "",
    };
  } catch (error) {
    throw new Error("Failed to generate AI assistance: " + error.message);
  }
}

export async function processVoiceRecording(
  audioBuffer: Buffer, 
  assistantParams: AIAssistantParams
): Promise<VoiceTranscriptionResult> {
  try {
    // First transcribe the audio
    const transcription = await transcribeAudio(audioBuffer);
    
    // Then generate AI suggestions based on transcription and context
    const aiSuggestions = await generateAIAssistance({
      ...assistantParams,
      transcription
    });

    return {
      transcription,
      aiSuggestions
    };
  } catch (error) {
    throw new Error("Failed to process voice recording: " + error.message);
  }
}

// Enhanced voice processing with Assistant API
export async function processVoiceRecordingEnhanced(
  audioBuffer: Buffer,
  patientId: number,
  encounterId: number,
  userRole: string
): Promise<{
  transcription: string;
  aiResponse: any;
}> {
  try {
    const { VoiceChartUpdater } = await import('./voice-chart-updater.js');
    const updater = new VoiceChartUpdater();
    
    // First transcribe the audio
    const transcription = await transcribeAudio(audioBuffer);
    
    // Process with enhanced AI Assistant
    const aiResponse = await updater.processVoiceRecording(
      transcription,
      patientId,
      encounterId,
      userRole
    );

    return {
      transcription,
      aiResponse
    };
  } catch (error) {
    throw new Error("Failed to process enhanced voice recording: " + error.message);
  }
}

export async function updatePatientChart(
  patientData: any,
  transcription: string,
  aiSuggestions: any
): Promise<{
  updatedHistory: any;
  suggestedChanges: string[];
}> {
  try {
    const prompt = `
You are an AI assistant helping to update patient medical records based on voice transcription.

Current Patient Data:
${JSON.stringify(patientData, null, 2)}

Voice Transcription:
"${transcription}"

AI Suggestions:
${JSON.stringify(aiSuggestions, null, 2)}

Please analyze the transcription and suggest updates to the patient's chart. Follow these rules:
1. Historical data (family history, medical history, social history, allergies) can be UPDATED if new information clarifies or corrects existing data
2. Factual data (vitals, medications, diagnoses) should be APPENDED as new entries
3. Provide specific suggestions for what should be updated vs. what should be added

Respond in JSON format:
{
  "updatedHistory": {
    "familyHistory": "updated family history if any changes needed",
    "medicalHistory": "updated medical history if any changes needed", 
    "socialHistory": "updated social history if any changes needed",
    "allergies": "updated allergies if any changes needed"
  },
  "suggestedChanges": ["specific change 1", "specific change 2", "etc"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a medical AI assistant that helps maintain accurate patient records." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new Error("Failed to update patient chart: " + error.message);
  }
}
