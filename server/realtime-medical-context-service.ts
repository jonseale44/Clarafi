import OpenAI from "openai";
import { medicalChartIndex } from "./medical-chart-index-service.js";

/**
 * Realtime Medical Context Service
 * 
 * Provides fast, token-efficient medical context for OpenAI realtime API calls
 * Replaces the slower assistant-based approach while maintaining medical accuracy
 */

export interface RealtimeMedicalResponse {
  nursePrompts?: string[];
  providerPrompts?: string[];
  draftOrders?: string[];
  draftDiagnoses?: string[];
  clinicalNotes?: string;
  medicalAlerts?: string[];
  contextUsed?: {
    tokenCount: number;
    cacheHit: boolean;
    responseTime: number;
  };
}

export interface FastPatientContext {
  patientId: number;
  age: number;
  gender: string;
  currentProblems: string[];
  activeMedications: string[];
  criticalAllergies: string[];
  medicalSummary: string;
  alerts: string[];
}

export class RealtimeMedicalContextService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main entry point for fast medical AI assistance
   * Replaces the slow assistant-based approach
   */
  async processVoiceWithFastContext(
    audioBuffer: Buffer,
    patientId: number,
    userRole: "nurse" | "provider",
    chiefComplaint?: string
  ): Promise<RealtimeMedicalResponse> {
    const startTime = Date.now();
    
    // Step 1: Transcribe audio (parallel with context loading)
    const [transcription, fastContext] = await Promise.all([
      this.transcribeAudio(audioBuffer),
      this.getFastPatientContext(patientId)
    ]);

    console.log(`🎯 [RealtimeMedical] Transcription: "${transcription}"`);
    console.log(`📋 [RealtimeMedical] Context loaded: ${fastContext.contextUsed?.tokenCount} tokens`);

    // Step 2: Generate AI assistance with optimized context
    const aiResponse = await this.generateFastAIResponse({
      transcription,
      userRole,
      patientContext: fastContext,
      chiefComplaint
    });

    const responseTime = Date.now() - startTime;
    
    return {
      ...aiResponse,
      contextUsed: {
        tokenCount: fastContext.contextUsed?.tokenCount || 0,
        cacheHit: fastContext.contextUsed?.cacheHit || false,
        responseTime
      }
    };
  }

  /**
   * Get fast patient context using the medical chart index
   */
  private async getFastPatientContext(patientId: number): Promise<FastPatientContext & { contextUsed?: any }> {
    const startTime = Date.now();
    
    try {
      // Use the medical chart index for fast context retrieval
      const medicalContext = await medicalChartIndex.getFastMedicalContext(patientId);
      
      const context: FastPatientContext = {
        patientId,
        age: 0, // Will be populated from medical context
        gender: "", // Will be populated from medical context
        currentProblems: medicalContext.activeProblems,
        activeMedications: medicalContext.medications,
        criticalAllergies: medicalContext.allergies,
        medicalSummary: medicalContext.summary,
        alerts: medicalContext.alerts
      };

      const contextTime = Date.now() - startTime;
      
      return {
        ...context,
        contextUsed: {
          tokenCount: medicalContext.tokenCount,
          cacheHit: contextTime < 50, // Fast response indicates cache hit
          responseTime: contextTime
        }
      };
    } catch (error) {
      console.error(`❌ [RealtimeMedical] Error loading context for patient ${patientId}:`, error);
      
      // Fallback to minimal context
      return {
        patientId,
        age: 0,
        gender: "unknown",
        currentProblems: [],
        activeMedications: [],
        criticalAllergies: [],
        medicalSummary: "Patient context unavailable",
        alerts: ["⚠️ Medical context could not be loaded"],
        contextUsed: {
          tokenCount: 20,
          cacheHit: false,
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Generate AI response using OpenAI realtime API with optimized prompt
   */
  private async generateFastAIResponse(params: {
    transcription: string;
    userRole: "nurse" | "provider";
    patientContext: FastPatientContext;
    chiefComplaint?: string;
  }): Promise<RealtimeMedicalResponse> {
    const { transcription, userRole, patientContext, chiefComplaint } = params;

    const systemPrompt = this.buildOptimizedSystemPrompt(userRole);
    const contextPrompt = this.buildOptimizedContextPrompt(patientContext, transcription, chiefComplaint);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt + " Always return valid JSON." },
          { role: "user", content: contextPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Structure response based on user role
      const structuredResponse: RealtimeMedicalResponse = {
        ...(userRole === "nurse" 
          ? { nursePrompts: result.suggestions || [] }
          : { providerPrompts: result.suggestions || [] }
        ),
        draftOrders: result.draftOrders || [],
        draftDiagnoses: result.draftDiagnoses || [],
        clinicalNotes: result.clinicalNotes || "",
        medicalAlerts: result.medicalAlerts || []
      };

      console.log(`✅ [RealtimeMedical] AI response generated for ${userRole}`);
      return structuredResponse;

    } catch (error) {
      console.error(`❌ [RealtimeMedical] AI generation failed:`, error);
      throw new Error(`Failed to generate AI assistance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build optimized system prompt based on user role
   */
  private buildOptimizedSystemPrompt(userRole: "nurse" | "provider"): string {
    const basePrompt = `You are an expert medical AI assistant providing real-time clinical support during patient encounters.`;
    
    if (userRole === "nurse") {
      return `${basePrompt}

NURSE ROLE FOCUS:
- Nursing assessments and interventions
- Patient comfort and safety
- Vital signs interpretation
- Patient education needs
- Care coordination
- Documentation assistance

Provide practical, actionable suggestions that help with immediate nursing tasks.`;
    } else {
      return `${basePrompt}

PROVIDER ROLE FOCUS:
- Diagnostic reasoning
- Treatment planning
- Medical decision-making
- Order management
- Clinical documentation
- Patient care coordination

Provide clinical insights that support diagnostic and therapeutic decisions.`;
    }
  }

  /**
   * Build optimized context prompt (token-efficient)
   */
  private buildOptimizedContextPrompt(
    context: FastPatientContext,
    transcription: string,
    chiefComplaint?: string
  ): string {
    // Build efficient medical context
    const medicalContext = [
      context.medicalSummary,
      context.currentProblems.length > 0 ? `Problems: ${context.currentProblems.slice(0, 3).join(', ')}` : null,
      context.activeMedications.length > 0 ? `Medications: ${context.activeMedications.slice(0, 3).join(', ')}` : null,
      context.criticalAllergies.length > 0 ? `⚠️ Allergies: ${context.criticalAllergies.join(', ')}` : null,
      context.alerts.length > 0 ? `🚨 Alerts: ${context.alerts.join('; ')}` : null
    ].filter(Boolean).join('\n');

    return `
PATIENT CONTEXT:
${medicalContext}

${chiefComplaint ? `CHIEF COMPLAINT: ${chiefComplaint}\n` : ''}
VOICE TRANSCRIPTION: "${transcription}"

Analyze the transcription and provide JSON response:
{
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "draftOrders": ["order 1", "order 2"],
  "draftDiagnoses": ["diagnosis 1", "diagnosis 2"], 
  "clinicalNotes": "Brief clinical summary and recommendations",
  "medicalAlerts": ["alert 1 if any clinical concerns"]
}

Focus on immediate, actionable guidance based on the voice input and patient context.`;
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<{ text: string }> {
    try {
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("Empty audio buffer provided");
      }

      // Check if buffer is too small (likely invalid audio)
      if (audioBuffer.length < 1024) {
        throw new Error("Audio buffer too small, likely invalid audio data");
      }

      console.log(`🎵 [RealtimeMedical] Transcribing audio (${audioBuffer.length} bytes)`);

      // Create proper WAV file with headers
      const wavBuffer = this.createWAVBuffer(audioBuffer);
      const audioFile = new File([wavBuffer], "recording.wav", { type: "audio/wav" });

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "text",
        language: "en"
      });

      const text = response || "";
      console.log(`📝 [RealtimeMedical] Transcription result: "${text}"`);

      return { text };
    } catch (error) {
      console.error(`❌ [RealtimeMedical] Transcription failed:`, error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create proper WAV file buffer with headers
   */
  private createWAVBuffer(audioBuffer: Buffer): Buffer {
    const sampleRate = 16000; // 16kHz
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    let offset = 0;

    // RIFF chunk descriptor
    header.write('RIFF', offset); offset += 4;
    header.writeUInt32LE(fileSize, offset); offset += 4;
    header.write('WAVE', offset); offset += 4;

    // fmt sub-chunk
    header.write('fmt ', offset); offset += 4;
    header.writeUInt32LE(16, offset); offset += 4; // Sub-chunk size
    header.writeUInt16LE(1, offset); offset += 2; // Audio format (PCM)
    header.writeUInt16LE(numChannels, offset); offset += 2;
    header.writeUInt32LE(sampleRate, offset); offset += 4;
    header.writeUInt32LE(byteRate, offset); offset += 4;
    header.writeUInt16LE(blockAlign, offset); offset += 2;
    header.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data sub-chunk
    header.write('data', offset); offset += 4;
    header.writeUInt32LE(dataSize, offset);

    return Buffer.concat([header, audioBuffer]);
  }

  /**
   * Generate text-only suggestions without audio processing
   */
  async generateTextOnlySuggestions(
    patientId: number,
    userRole: "nurse" | "provider",
    transcription: string = ""
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 [RealtimeMedical] Generating text-only suggestions for patient ${patientId} (${userRole})`);

      // Get fast medical context
      const patientContext = await medicalChartIndex.getFastMedicalContext(patientId);

      // Generate suggestions using the fast context
      const suggestions = await this.generateFastSuggestions(
        patientContext,
        transcription,
        userRole
      );

      const responseTime = Date.now() - startTime;
      console.log(`⚡ [RealtimeMedical] Text-only suggestions generated in ${responseTime}ms`);

      return {
        ...suggestions,
        contextUsed: {
          tokenCount: patientContext.tokenCount,
          responseTime,
          cacheHit: true
        }
      };

    } catch (error) {
      console.error(`❌ [RealtimeMedical] Error generating text-only suggestions:`, error);
      throw error;
    }
  }

  /**
   * Update medical chart index after encounter completion
   * This replaces the expensive full chart update in your current system
   */
  async updateMedicalIndex(encounterId: number, soapNote: string): Promise<void> {
    try {
      await medicalChartIndex.updateAfterEncounter(encounterId, soapNote);
      console.log(`✅ [RealtimeMedical] Medical index updated for encounter ${encounterId}`);
    } catch (error) {
      console.error(`❌ [RealtimeMedical] Failed to update medical index:`, error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Search for relevant medical context using semantic search
   */
  async findRelevantContext(patientId: number, query: string): Promise<any[]> {
    try {
      return await medicalChartIndex.findRelevantMedicalContext(patientId, query, 5);
    } catch (error) {
      console.error(`❌ [RealtimeMedical] Context search failed:`, error);
      return [];
    }
  }
}

export const realtimeMedicalContext = new RealtimeMedicalContextService();