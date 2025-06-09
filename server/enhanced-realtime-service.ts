import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { WebSocketEventHandler, EventMetadata } from './websocket-event-handler.js';
import { realtimeMedicalContext } from './realtime-medical-context-service.js';

/**
 * Enhanced Realtime Service
 * Replaces assistant-based approach with fast realtime GPT suggestions
 * Integrates WebSocket event handler and medical context indexing
 */

interface ConnectionState {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  eventHandler: WebSocketEventHandler;
  patientId: number;
  userRole: 'nurse' | 'provider';
  sessionId: string;
  transcriptionBuffer: string;
  isConnected: boolean;
  lastActivity: number;
}

export class EnhancedRealtimeService {
  private wss: WebSocketServer | null = null;
  private activeConnections = new Map<string, ConnectionState>();
  private connectionCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup stale connections every 5 minutes
    this.connectionCleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  initialize(server: any) {
    console.log('🌐 [EnhancedRealtime] Initializing enhanced WebSocket server...');
    
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/enhanced-realtime',
      verifyClient: (info: any) => {
        console.log('🔍 [EnhancedRealtime] Verifying client connection from:', info.origin);
        return true;
      }
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = `enh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔌 [EnhancedRealtime] New enhanced connection:', connectionId);

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_established',
        connectionId: connectionId,
        timestamp: new Date().toISOString(),
        service: 'enhanced-realtime',
        features: ['fast-suggestions', 'medical-indexing', 'event-routing']
      }));

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(connectionId, message, ws);
        } catch (error) {
          console.error('❌ [EnhancedRealtime] Error processing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 [EnhancedRealtime] Connection closed:', connectionId);
        this.closeConnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error('❌ [EnhancedRealtime] WebSocket error for', connectionId, ':', error);
        this.closeConnection(connectionId);
      });
    });

    console.log('✅ [EnhancedRealtime] Enhanced WebSocket server initialized');
  }

  /**
   * Handle messages from client
   */
  private async handleClientMessage(connectionId: string, message: any, ws: WebSocket) {
    console.log('📨 [EnhancedRealtime] Message from', connectionId, ':', message.type);

    switch (message.type) {
      case 'init_session':
        await this.initializeSession(connectionId, message, ws);
        break;

      case 'start_suggestions':
        await this.startSuggestions(connectionId, message);
        break;

      case 'stop_suggestions':
        await this.stopSuggestions(connectionId);
        break;

      case 'freeze_suggestions':
        this.freezeSuggestions(connectionId);
        break;

      case 'unfreeze_suggestions':
        this.unfreezeSuggestions(connectionId);
        break;

      case 'process_transcription':
        await this.processTranscription(connectionId, message);
        break;

      case 'audio_chunk':
        await this.handleAudioChunk(connectionId, message);
        break;

      case 'ping':
        this.handlePing(connectionId, ws);
        break;

      default:
        console.log('📋 [EnhancedRealtime] Unhandled message type:', message.type);
    }
  }

  /**
   * Initialize session with patient context
   */
  private async initializeSession(connectionId: string, message: any, ws: WebSocket) {
    const { patientId, userRole, sessionId } = message;

    if (!patientId || !userRole) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Patient ID and user role are required'
      }));
      return;
    }

    try {
      // Create event handler
      const eventHandler = new WebSocketEventHandler(ws);
      
      // Create connection state
      const connection: ConnectionState = {
        clientWs: ws,
        openaiWs: null,
        eventHandler,
        patientId: parseInt(patientId),
        userRole: userRole as 'nurse' | 'provider',
        sessionId: sessionId || `session_${Date.now()}`,
        transcriptionBuffer: '',
        isConnected: true,
        lastActivity: Date.now()
      };

      this.activeConnections.set(connectionId, connection);

      // Initialize suggestions module
      await eventHandler.initializeSuggestionsModule(connection.patientId, connection.sessionId);

      ws.send(JSON.stringify({
        type: 'session_initialized',
        connectionId,
        patientId: connection.patientId,
        sessionId: connection.sessionId,
        suggestionsStatus: eventHandler.getSuggestionsStatus()
      }));

      console.log(`✅ [EnhancedRealtime] Session initialized for patient ${patientId}`);

    } catch (error) {
      console.error('❌ [EnhancedRealtime] Failed to initialize session:', error);
      ws.send(JSON.stringify({
        type: 'session_error',
        message: 'Failed to initialize session',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  /**
   * Start realtime suggestions
   */
  private async startSuggestions(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      console.error('❌ [EnhancedRealtime] Connection not found for suggestions start:', connectionId);
      return;
    }

    try {
      // Connect to OpenAI Realtime API for transcription
      await this.connectToOpenAI(connection);

      connection.clientWs.send(JSON.stringify({
        type: 'suggestions_started',
        sessionId: connection.sessionId,
        timestamp: new Date().toISOString()
      }));

      console.log(`🎯 [EnhancedRealtime] Suggestions started for session ${connection.sessionId}`);

    } catch (error) {
      console.error('❌ [EnhancedRealtime] Failed to start suggestions:', error);
      connection.clientWs.send(JSON.stringify({
        type: 'suggestions_error',
        message: 'Failed to start suggestions',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  /**
   * Stop realtime suggestions
   */
  private async stopSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    // Freeze suggestions to prevent overwrites
    connection.eventHandler.freezeSuggestions();

    // Close OpenAI connection
    if (connection.openaiWs) {
      connection.openaiWs.close();
      connection.openaiWs = null;
    }

    connection.clientWs.send(JSON.stringify({
      type: 'suggestions_stopped',
      sessionId: connection.sessionId,
      finalBuffer: connection.transcriptionBuffer,
      timestamp: new Date().toISOString()
    }));

    console.log(`⏹️ [EnhancedRealtime] Suggestions stopped for session ${connection.sessionId}`);
  }

  /**
   * Connect to OpenAI Realtime API
   */
  private async connectToOpenAI(connection: ConnectionState): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiWs = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    return new Promise((resolve, reject) => {
      openaiWs.on('open', () => {
        console.log(`✅ [EnhancedRealtime] OpenAI WebSocket connected for session ${connection.sessionId}`);
        
        // Configure session
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: "You are a helpful AI assistant providing real-time transcription.",
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: "none",
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));
        connection.openaiWs = openaiWs;
        resolve();
      });

      openaiWs.on('message', (data) => {
        this.handleOpenAIMessage(connection, JSON.parse(data.toString()));
      });

      openaiWs.on('error', (error) => {
        console.error(`❌ [EnhancedRealtime] OpenAI WebSocket error for session ${connection.sessionId}:`, error);
        reject(error);
      });

      openaiWs.on('close', () => {
        console.log(`🔌 [EnhancedRealtime] OpenAI WebSocket closed for session ${connection.sessionId}`);
        connection.openaiWs = null;
      });
    });
  }

  /**
   * Handle messages from OpenAI Realtime API
   */
  private handleOpenAIMessage(connection: ConnectionState, message: any) {
    connection.lastActivity = Date.now();

    const metadata: EventMetadata = {
      type: "suggestions",
      patientId: connection.patientId,
      userRole: connection.userRole,
      sessionId: connection.sessionId
    };

    switch (message.type) {
      case 'conversation.item.input_audio_transcription.delta':
        const deltaText = message.transcript || message.delta || "";
        connection.transcriptionBuffer += deltaText;
        
        // Send transcription delta to client
        connection.clientWs.send(JSON.stringify({
          type: 'transcription.delta',
          delta: deltaText,
          buffer: connection.transcriptionBuffer,
          sessionId: connection.sessionId
        }));

        // Process for suggestions with throttling
        this.throttledSuggestionProcessing(connection);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const transcript = message.transcript || "";
        connection.transcriptionBuffer += transcript;
        
        connection.clientWs.send(JSON.stringify({
          type: 'transcription.completed',
          transcript: transcript,
          fullBuffer: connection.transcriptionBuffer,
          sessionId: connection.sessionId
        }));

        // Final suggestion processing
        connection.eventHandler.processTranscriptionForSuggestions(
          connection.transcriptionBuffer,
          metadata
        );
        break;

      default:
        // Route other events through event handler
        connection.eventHandler.handleRealtimeEvent(message, metadata);
    }
  }

  /**
   * Throttled suggestion processing to prevent overload
   */
  private throttledSuggestionProcessing = (() => {
    const lastProcessTime = new Map<string, number>();
    const throttleMs = 2000; // 2 seconds between suggestions

    return (connection: ConnectionState) => {
      const now = Date.now();
      const lastTime = lastProcessTime.get(connection.sessionId) || 0;

      if (now - lastTime >= throttleMs) {
        lastProcessTime.set(connection.sessionId, now);
        
        const metadata: EventMetadata = {
          type: "suggestions",
          patientId: connection.patientId,
          userRole: connection.userRole,
          sessionId: connection.sessionId
        };

        connection.eventHandler.processTranscriptionForSuggestions(
          connection.transcriptionBuffer,
          metadata
        );
      }
    };
  })();

  /**
   * Process transcription for suggestions
   */
  private async processTranscription(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    const { transcription } = message;
    if (!transcription) return;

    const metadata: EventMetadata = {
      type: "suggestions",
      patientId: connection.patientId,
      userRole: connection.userRole,
      sessionId: connection.sessionId
    };

    await connection.eventHandler.processTranscriptionForSuggestions(transcription, metadata);
  }

  /**
   * Handle audio chunks
   */
  private async handleAudioChunk(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection?.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) return;

    try {
      let audioData = message.audio;
      if (typeof audioData === 'string') {
        const pcm16Array = audioData.split(',').map(x => parseInt(x));
        audioData = new Int16Array(pcm16Array).buffer;
      }

      const audioEvent = {
        type: "input_audio_buffer.append",
        audio: Buffer.from(audioData).toString('base64')
      };

      connection.openaiWs.send(JSON.stringify(audioEvent));
    } catch (error) {
      console.error('❌ [EnhancedRealtime] Error processing audio chunk:', error);
    }
  }

  /**
   * Freeze suggestions
   */
  private freezeSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.eventHandler.freezeSuggestions();
    }
  }

  /**
   * Unfreeze suggestions
   */
  private unfreezeSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.eventHandler.unfreezeSuggestions();
    }
  }

  /**
   * Handle ping for connection keepalive
   */
  private handlePing(connectionId: string, ws: WebSocket) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
        stats: connection.eventHandler.getStats()
      }));
    }
  }

  /**
   * Close connection and cleanup
   */
  private closeConnection(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      if (connection.openaiWs) {
        connection.openaiWs.close();
      }
      connection.eventHandler.close();
      this.activeConnections.delete(connectionId);
      console.log(`🧹 [EnhancedRealtime] Connection ${connectionId} cleaned up`);
    }
  }

  /**
   * Cleanup stale connections
   */
  private cleanupStaleConnections() {
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    const connections = Array.from(this.activeConnections.entries());
    for (const [connectionId, connection] of connections) {
      if (now - connection.lastActivity > staleThreshold) {
        console.log(`🧹 [EnhancedRealtime] Cleaning up stale connection: ${connectionId}`);
        this.closeConnection(connectionId);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.entries()).map(([id, conn]) => ({
        id,
        patientId: conn.patientId,
        sessionId: conn.sessionId,
        userRole: conn.userRole,
        isConnected: conn.isConnected,
        lastActivity: new Date(conn.lastActivity).toISOString(),
        suggestionsStatus: conn.eventHandler.getSuggestionsStatus(),
        handlerStats: conn.eventHandler.getStats()
      }))
    };
  }

  /**
   * Shutdown service
   */
  shutdown() {
    // Close all connections
    const connectionIds = Array.from(this.activeConnections.keys());
    for (const connectionId of connectionIds) {
      this.closeConnection(connectionId);
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Clear cleanup interval
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
    }

    console.log('🛑 [EnhancedRealtime] Service shutdown completed');
  }
}