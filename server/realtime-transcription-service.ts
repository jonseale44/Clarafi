import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { AssistantContextService } from './assistant-context-service.js';

export class RealtimeTranscriptionService {
  private wss: WebSocketServer | null = null;
  private assistantService: AssistantContextService;
  private activeConnections = new Map<string, {
    clientWs: WebSocket;
    openaiWs: WebSocket | null;
    threadId: string | null;
    patientId: number;
    userRole: string;
    transcriptionBuffer: string;
  }>();

  constructor() {
    this.assistantService = new AssistantContextService();
  }

  initialize(server: any) {
    console.log('🌐 [RealtimeTranscription] Initializing WebSocket server for real-time transcription...');
    
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/realtime-transcription' 
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔌 [RealtimeTranscription] New connection:', connectionId);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(connectionId, ws, message);
        } catch (error) {
          console.error('❌ [RealtimeTranscription] Error parsing message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 [RealtimeTranscription] Connection closed:', connectionId);
        this.cleanup(connectionId);
      });

      ws.on('error', (error) => {
        console.error('❌ [RealtimeTranscription] WebSocket error:', error);
        this.cleanup(connectionId);
      });
    });

    console.log('✅ [RealtimeTranscription] WebSocket server initialized');
  }

  private async handleClientMessage(connectionId: string, clientWs: WebSocket, message: any) {
    switch (message.type) {
      case 'start_session':
        await this.startSession(connectionId, clientWs, message);
        break;
      case 'audio_chunk':
        await this.handleAudioChunk(connectionId, message);
        break;
      case 'stop_session':
        await this.stopSession(connectionId);
        break;
      default:
        console.warn('⚠️ [RealtimeTranscription] Unknown message type:', message.type);
    }
  }

  private async startSession(connectionId: string, clientWs: WebSocket, message: any) {
    const { patientId, userRole } = message;
    console.log('🚀 [RealtimeTranscription] Starting session for patient:', patientId);

    try {
      // Initialize Assistant and get thread
      await this.assistantService.initializeAssistant();
      const threadId = await this.assistantService.getOrCreateThread(patientId);

      // Create OpenAI Realtime connection using the correct format from your working code
      const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Store connection info
      this.activeConnections.set(connectionId, {
        clientWs,
        openaiWs,
        threadId,
        patientId,
        userRole,
        transcriptionBuffer: ''
      });

      openaiWs.on('open', () => {
        console.log('🌐 [RealtimeTranscription] Connected to OpenAI Realtime API');
        
        // Configure session using the exact format from your working code
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            model: 'gpt-4o-mini-realtime-preview-2024-12-17',
            modalities: ['text'], // Text only to reduce token usage
            instructions: 'You are a medical transcription assistant. Provide accurate transcription of medical conversations.',
            input_audio_format: 'pcm16',
            input_audio_sampling_rate: 16000,
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
              create_response: false
            }
          }
        }));

        clientWs.send(JSON.stringify({
          type: 'session_started',
          connectionId,
          message: 'Real-time transcription session started'
        }));
      });

      openaiWs.on('message', (data) => {
        this.handleOpenAIMessage(connectionId, JSON.parse(data.toString()));
      });

      openaiWs.on('error', (error) => {
        console.error('❌ [RealtimeTranscription] OpenAI WebSocket error:', error);
        clientWs.send(JSON.stringify({
          type: 'error',
          message: 'OpenAI connection failed'
        }));
      });

    } catch (error) {
      console.error('❌ [RealtimeTranscription] Failed to start session:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start transcription session'
      }));
    }
  }

  private async handleOpenAIMessage(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    console.log('📨 [RealtimeTranscription] OpenAI message:', message.type);

    switch (message.type) {
      case 'session.created':
        console.log('✅ [RealtimeTranscription] OpenAI session created');
        break;

      case 'input_audio_buffer.speech_started':
        connection.clientWs.send(JSON.stringify({
          type: 'speech_started',
          message: 'Speech detected'
        }));
        break;

      case 'input_audio_buffer.speech_stopped':
        connection.clientWs.send(JSON.stringify({
          type: 'speech_stopped',
          message: 'Speech stopped'
        }));
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const transcription = message.transcript;
        connection.transcriptionBuffer += transcription + ' ';
        
        // Send live transcription to client
        connection.clientWs.send(JSON.stringify({
          type: 'live_transcription',
          transcription: connection.transcriptionBuffer.trim()
        }));

        // Get live AI suggestions
        await this.getLiveSuggestions(connectionId, connection.transcriptionBuffer.trim());
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('❌ [RealtimeTranscription] Transcription failed:', message.error);
        break;

      case 'response.done':
        console.log('✅ [RealtimeTranscription] Response completed');
        break;

      default:
        // Log other events for debugging
        console.log('📋 [RealtimeTranscription] Unhandled event:', message.type);
    }
  }

  private async getLiveSuggestions(connectionId: string, transcription: string) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection || !connection.threadId) return;

    try {
      const suggestions = await this.assistantService.getRealtimeSuggestions(
        connection.threadId,
        transcription,
        connection.userRole,
        connection.patientId
      );

      connection.clientWs.send(JSON.stringify({
        type: 'live_suggestions',
        suggestions
      }));

    } catch (error) {
      console.error('❌ [RealtimeTranscription] Error getting live suggestions:', error);
    }
  }

  private async handleAudioChunk(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection?.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) return;

    try {
      // Convert comma-separated string back to ArrayBuffer if needed
      let audioData = message.audio;
      if (typeof audioData === 'string') {
        const pcm16Array = audioData.split(',').map(x => parseInt(x));
        audioData = new Int16Array(pcm16Array).buffer;
      }

      // Send audio chunk to OpenAI Realtime API with correct format
      connection.openaiWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        data: {
          audio: audioData
        }
      }));
    } catch (error) {
      console.error('❌ [RealtimeTranscription] Error sending audio chunk:', error);
    }
  }

  private async stopSession(connectionId: string) {
    console.log('🛑 [RealtimeTranscription] Stopping session:', connectionId);
    
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.clientWs.send(JSON.stringify({
        type: 'session_stopped',
        finalTranscription: connection.transcriptionBuffer.trim()
      }));
    }

    this.cleanup(connectionId);
  }

  private cleanup(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection?.openaiWs) {
      connection.openaiWs.close();
    }
    this.activeConnections.delete(connectionId);
  }
}