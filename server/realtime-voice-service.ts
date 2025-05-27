import WebSocket from 'ws';
import { AssistantContextService } from './assistant-context-service.js';

export class RealtimeVoiceService {
  private openaiWs: WebSocket | null = null;
  private assistantService: AssistantContextService;
  private currentTranscription: string = '';
  private threadId: string | null = null;
  private patientId: number | null = null;
  private userRole: string = 'provider';
  private onTranscriptionUpdate: ((text: string) => void) | null = null;
  private onSuggestionsUpdate: ((suggestions: any) => void) | null = null;
  private onComplete: ((result: any) => void) | null = null;

  constructor() {
    this.assistantService = new AssistantContextService();
  }

  async initializeSession(
    patientId: number, 
    userRole: string,
    onTranscriptionUpdate: (text: string) => void,
    onSuggestionsUpdate: (suggestions: any) => void,
    onComplete: (result: any) => void
  ) {
    console.log('🔥 [RealtimeVoiceService] Initializing session for patient:', patientId);
    
    this.patientId = patientId;
    this.userRole = userRole;
    this.onTranscriptionUpdate = onTranscriptionUpdate;
    this.onSuggestionsUpdate = onSuggestionsUpdate;
    this.onComplete = onComplete;
    
    // Initialize Assistant
    await this.assistantService.initializeAssistant();
    this.threadId = await this.assistantService.getOrCreateThread(patientId);
    
    // Create WebSocket connection to OpenAI Realtime API
    await this.createRealtimeConnection();
  }

  private async createRealtimeConnection() {
    console.log('🌐 [RealtimeVoiceService] Creating WebSocket connection to OpenAI Realtime API...');
    
    try {
      this.openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.openaiWs.on('open', () => {
        console.log('🌐 [RealtimeVoiceService] ✅ Connected to OpenAI Realtime API');
        this.configureSession();
      });

      this.openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleRealtimeEvent(event);
        } catch (error) {
          console.error('❌ [RealtimeVoiceService] Error parsing WebSocket message:', error);
        }
      });

      this.openaiWs.on('error', (error) => {
        console.error('❌ [RealtimeVoiceService] WebSocket error:', error);
      });

      this.openaiWs.on('close', () => {
        console.log('🌐 [RealtimeVoiceService] WebSocket connection closed');
      });

    } catch (error) {
      console.error('❌ [RealtimeVoiceService] Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  private configureSession() {
    console.log('⚙️ [RealtimeVoiceService] Configuring session...');
    
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a medical transcription assistant. Transcribe speech accurately for clinical documentation.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };

    this.sendToRealtime(config);
  }

  private handleRealtimeEvent(event: any) {
    console.log('📨 [RealtimeVoiceService] Received event:', event.type);

    switch (event.type) {
      case 'session.created':
        console.log('✅ [RealtimeVoiceService] Session created successfully');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 [RealtimeVoiceService] Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('🔇 [RealtimeVoiceService] Speech stopped');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscriptionUpdate(event);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('❌ [RealtimeVoiceService] Transcription failed:', event.error);
        break;

      case 'response.done':
        this.handleResponseComplete();
        break;

      case 'error':
        console.error('❌ [RealtimeVoiceService] OpenAI error:', event.error);
        break;

      default:
        // Log other events for debugging
        if (event.type.includes('transcription') || event.type.includes('audio')) {
          console.log(`📝 [RealtimeVoiceService] ${event.type}:`, event);
        }
    }
  }

  private async handleTranscriptionUpdate(event: any) {
    const newText = event.transcript;
    this.currentTranscription = newText;
    
    console.log('📝 [RealtimeVoiceService] Transcription update:', newText);
    
    // Send real-time transcription to UI
    if (this.onTranscriptionUpdate) {
      this.onTranscriptionUpdate(this.currentTranscription);
    }

    // Get Assistant suggestions for longer transcriptions
    if (this.currentTranscription.length > 50 && this.threadId && this.patientId) {
      try {
        const suggestions = await this.assistantService.getRealtimeSuggestions(
          this.threadId,
          this.currentTranscription,
          this.userRole,
          this.patientId
        );

        if (this.onSuggestionsUpdate) {
          this.onSuggestionsUpdate(suggestions);
        }
      } catch (error) {
        console.error('❌ [RealtimeVoiceService] Error getting suggestions:', error);
      }
    }
  }

  private async handleResponseComplete() {
    console.log('✅ [RealtimeVoiceService] Response complete, processing final transcription...');
    
    if (this.currentTranscription && this.threadId && this.patientId) {
      try {
        // Process complete transcription with Assistant
        const completeResults = await this.assistantService.processCompleteTranscription(
          this.threadId,
          this.currentTranscription,
          this.userRole,
          this.patientId,
          0 // encounterId will be provided from the calling context
        );

        if (this.onComplete) {
          this.onComplete({
            transcription: this.currentTranscription,
            ...completeResults
          });
        }
      } catch (error) {
        console.error('❌ [RealtimeVoiceService] Error processing complete transcription:', error);
      }
    }
  }

  sendAudioChunk(audioData: ArrayBuffer) {
    if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
      const audioEvent = {
        type: 'input_audio_buffer.append',
        audio: Buffer.from(audioData).toString('base64')
      };
      
      this.sendToRealtime(audioEvent);
    }
  }

  commitAudio() {
    if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
      this.sendToRealtime({ type: 'input_audio_buffer.commit' });
    }
  }

  startResponse() {
    if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
      this.sendToRealtime({ 
        type: 'response.create',
        response: {
          modalities: ['text']
        }
      });
    }
  }

  private sendToRealtime(event: any) {
    if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
      this.openaiWs.send(JSON.stringify(event));
    }
  }

  disconnect() {
    console.log('🔌 [RealtimeVoiceService] Disconnecting...');
    
    if (this.openaiWs) {
      this.openaiWs.close();
      this.openaiWs = null;
    }
    
    this.currentTranscription = '';
    this.threadId = null;
    this.patientId = null;
  }
}