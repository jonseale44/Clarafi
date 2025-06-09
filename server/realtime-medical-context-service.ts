import OpenAI from "openai";
import WebSocket from "ws";
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
    
    // Step 1: Process audio with WebSocket streaming (parallel with context loading)
    const [transcriptionResult, fastContext] = await Promise.all([
      audioBuffer && audioBuffer.length > 0 
        ? this.processAudioStream(audioBuffer)
        : Promise.resolve({ text: "" }),
      this.getFastPatientContext(patientId)
    ]);

    const transcription = transcriptionResult.text;
    console.log(`🎯 [RealtimeMedical] Stream transcription: "${transcription}"`);
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

      // Extract and clean JSON from response (handle markdown code blocks)
      const rawContent = response.choices[0].message.content || "{}";
      const cleanedContent = this.extractJSON(rawContent);
      const result = JSON.parse(cleanedContent);
      
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
   * Process audio streaming using OpenAI Realtime API (WebSocket approach)
   * This bypasses the file format issues by streaming PCM16 audio directly
   */
  private async processAudioStream(audioBuffer: Buffer): Promise<{ text: string }> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🎵 [RealtimeMedical] Processing audio stream (${audioBuffer.length} bytes)`);

        // Convert audio buffer to base64 for streaming
        const base64Audio = audioBuffer.toString('base64');
        
        // Create WebSocket connection to OpenAI Realtime API
        const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1"
          }
        } as any);

        let transcriptionText = "";

        ws.on('open', () => {
          // Configure session for transcription only
          ws.send(JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text"],
              instructions: "You are a medical transcription assistant. Transcribe the audio accurately.",
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
              }
            }
          }));

          // Send audio buffer in chunks
          const chunkSize = 4096;
          for (let i = 0; i < base64Audio.length; i += chunkSize) {
            const chunk = base64Audio.slice(i, i + chunkSize);
            ws.send(JSON.stringify({
              type: "input_audio_buffer.append",
              audio: chunk
            }));
          }

          // Commit the audio buffer
          ws.send(JSON.stringify({
            type: "input_audio_buffer.commit"
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === "conversation.item.input_audio_transcription.completed") {
            transcriptionText = message.transcript || "";
            console.log(`📝 [RealtimeMedical] Stream transcription: "${transcriptionText}"`);
            ws.close();
            resolve({ text: transcriptionText });
          } else if (message.type === "error") {
            console.error(`❌ [RealtimeMedical] Streaming error:`, message.error);
            ws.close();
            reject(new Error(`Streaming transcription failed: ${message.error.message}`));
          }
        });

        ws.on('error', (error) => {
          console.error(`❌ [RealtimeMedical] WebSocket error:`, error);
          reject(new Error(`WebSocket connection failed: ${error.message}`));
        });

        ws.on('close', () => {
          if (!transcriptionText) {
            resolve({ text: "" }); // Return empty if no transcription received
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error("Transcription timeout"));
          }
        }, 30000);

      } catch (error) {
        console.error(`❌ [RealtimeMedical] Stream processing failed:`, error);
        reject(error);
      }
    });
  }



  /**
   * Extract JSON from AI response, handling markdown code blocks
   */
  private extractJSON(content: string): string {
    try {
      // Remove markdown code block markers
      let cleaned = content.trim();
      
      // Handle ```json blocks
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      // Handle ``` blocks
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object boundaries
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }
      
      return cleaned.trim();
    } catch (error) {
      console.error(`❌ [RealtimeMedical] JSON extraction failed:`, error);
      return "{}";
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