import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { RealTimeSuggestionsService } from './realtime-suggestions-service';

interface EventMetadata {
  patientId: number;
  sessionId: string;
  userRole: 'nurse' | 'provider';
  moduleType: 'suggestions' | 'transcription' | 'soap' | 'orders';
}

interface ConnectionState {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  suggestionsService: RealTimeSuggestionsService;
  patientId: number;
  userRole: 'nurse' | 'provider';
  sessionId: string;
  transcriptionBuffer: string;
  isConnected: boolean;
  lastActivity: number;
}

/**
 * Consolidated Real-Time Service
 * Replaces all legacy realtime systems with single efficient implementation
 */
export class ConsolidatedRealtimeService {
  private wss: WebSocketServer | null = null;
  private activeConnections = new Map<string, ConnectionState>();
  private connectionCleanupInterval: NodeJS.Timeout;

  constructor() {
    this.connectionCleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  initialize(server: any) {
    console.log('🌐 [ConsolidatedRealtime] Initializing WebSocket server...');
    
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/realtime',
      verifyClient: (info: any) => {
        console.log('🔍 [ConsolidatedRealtime] Verifying client connection from:', info.origin);
        return true;
      }
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔌 [ConsolidatedRealtime] New connection:', connectionId);

      ws.send(JSON.stringify({
        type: 'connection_established',
        connectionId: connectionId,
        timestamp: new Date().toISOString(),
        service: 'consolidated-realtime'
      }));

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(connectionId, message, ws);
        } catch (error) {
          console.error('❌ [ConsolidatedRealtime] Error processing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 [ConsolidatedRealtime] Connection closed:', connectionId);
        this.closeConnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error('❌ [ConsolidatedRealtime] WebSocket error for', connectionId, ':', error);
        this.closeConnection(connectionId);
      });
    });

    console.log('✅ [ConsolidatedRealtime] WebSocket server initialized');
  }

  private async handleClientMessage(connectionId: string, message: any, ws: WebSocket) {
    console.log('📨 [ConsolidatedRealtime] Message:', connectionId, ':', message.type);

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
        console.log('📋 [ConsolidatedRealtime] Unhandled message type:', message.type);
    }
  }

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
      // Create suggestions service
      const suggestionsService = new RealTimeSuggestionsService(
        null, // WebSocket will be set when OpenAI connection is established
        (event) => this.handleSuggestionEvent(connectionId, event),
        patientId.toString()
      );
      
      const connection: ConnectionState = {
        clientWs: ws,
        openaiWs: null,
        suggestionsService,
        patientId: parseInt(patientId),
        userRole: userRole as 'nurse' | 'provider',
        sessionId: sessionId || `session_${Date.now()}`,
        transcriptionBuffer: '',
        isConnected: true,
        lastActivity: Date.now()
      };

      this.activeConnections.set(connectionId, connection);

      ws.send(JSON.stringify({
        type: 'session_initialized',
        connectionId,
        patientId: connection.patientId,
        sessionId: connection.sessionId
      }));

      console.log(`✅ [ConsolidatedRealtime] Session initialized for patient ${patientId}`);

    } catch (error) {
      console.error('❌ [ConsolidatedRealtime] Failed to initialize session:', error);
      ws.send(JSON.stringify({
        type: 'session_error',
        message: 'Failed to initialize session',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  private async startSuggestions(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      console.error('❌ [ConsolidatedRealtime] Connection not found:', connectionId);
      return;
    }

    try {
      await this.connectToOpenAI(connection);

      connection.clientWs.send(JSON.stringify({
        type: 'suggestions_started',
        sessionId: connection.sessionId,
        timestamp: new Date().toISOString()
      }));

      console.log(`🎯 [ConsolidatedRealtime] Suggestions started for session ${connection.sessionId}`);

    } catch (error) {
      console.error('❌ [ConsolidatedRealtime] Failed to start suggestions:', error);
      connection.clientWs.send(JSON.stringify({
        type: 'suggestions_error',
        message: 'Failed to start suggestions',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  private async stopSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    connection.suggestionsService.freeze();

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

    console.log(`⏹️ [ConsolidatedRealtime] Suggestions stopped for session ${connection.sessionId}`);
  }

  private async connectToOpenAI(connection: ConnectionState): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiWs = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview",
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    return new Promise((resolve, reject) => {
      openaiWs.on('open', () => {
        console.log(`✅ [ConsolidatedRealtime] OpenAI WebSocket connected for session ${connection.sessionId}`);
        
        // Configure session with proven medical prompt
        const sessionConfig = {
          type: "session.update",
          session: {
            instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

Instructions:

Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights. Additionally, if the physician asks, provide relevant information from the patient's chart or office visits, such as past medical history, current medications, allergies, lab results, and imaging findings. Include this information concisely and accurately where appropriate. This medical information might be present in old office visit notes. Do not make anything up, it would be better to say you don't have that information available.

Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. When referencing diagnostics or red flags, provide a complete list to guide the differential diagnosis (e.g., imaging-related red flags). Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per line.

Additional details for medication recommendations:

Always include typical starting dose, dose adjustment schedules, and maximum dose.
Output examples of good insights:

Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

Output examples of bad insights (to avoid):

Encourage gentle stretches and light activity to maintain mobility.
Suggest warm baths at night for symptomatic relief of muscle tension.
Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

Return each new insight on a separate line, and prefix each line with a bullet (•), dash (-), or number if appropriate. Do not combine multiple ideas on the same line. 

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a user question.`,
            model: "gpt-4o-mini-realtime-preview",
            modalities: ["text"],
            input_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
              language: "en",
              prompt: "You MUST ALWAYS translate the speech into English ONLY, regardless of input language. NEVER include the original non-English text. ONLY OUTPUT ENGLISH text. Translate all utterances, questions, and statements fully to English without leaving any words in the original language."
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.3,
              prefix_padding_ms: 500,
              silence_duration_ms: 1000,
              create_response: true
            },
            tools: [],
            tool_choice: "none",
            temperature: 0.7,
            max_response_output_tokens: 1000
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));
        connection.openaiWs = openaiWs;
        connection.suggestionsService.updateWebSocket(openaiWs);
        resolve();
      });

      openaiWs.on('message', (data) => {
        this.handleOpenAIMessage(connection, JSON.parse(data.toString()));
      });

      openaiWs.on('error', (error) => {
        console.error(`❌ [ConsolidatedRealtime] OpenAI WebSocket error:`, error);
        reject(error);
      });

      openaiWs.on('close', () => {
        console.log(`🔌 [ConsolidatedRealtime] OpenAI WebSocket closed for session ${connection.sessionId}`);
        connection.openaiWs = null;
      });
    });
  }

  private handleOpenAIMessage(connection: ConnectionState, message: any) {
    connection.lastActivity = Date.now();

    // Handle session events
    if (message.type === "session.created" || message.type === "session.updated") {
      if (message.session?.id) {
        connection.suggestionsService.setSessionId(message.session.id);
      }
      return;
    }

    // Handle transcription events
    if (message.type === "conversation.item.input_audio_transcription.delta") {
      const delta = message.transcript || "";
      connection.transcriptionBuffer += delta;
      
      connection.clientWs.send(JSON.stringify({
        type: 'transcription.delta',
        delta,
        buffer: connection.transcriptionBuffer,
        sessionId: connection.sessionId
      }));
      return;
    }

    if (message.type === "conversation.item.input_audio_transcription.completed") {
      connection.clientWs.send(JSON.stringify({
        type: 'transcription.completed',
        transcript: message.transcript || connection.transcriptionBuffer,
        sessionId: connection.sessionId
      }));
      
      // Process transcription for suggestions
      connection.suggestionsService.processTranscription(connection.transcriptionBuffer);
      return;
    }

    // Handle suggestion events
    if (message.type === "response.text.delta" || message.type === "response.text.done") {
      const event = connection.suggestionsService.handleGptAnalysis(message);
      if (event) {
        // Event is already sent via the onMessage callback
      }
      return;
    }

    // Handle errors
    if (message.type === "error") {
      console.error(`❌ [ConsolidatedRealtime] OpenAI error:`, message.error);
      connection.clientWs.send(JSON.stringify({
        type: 'openai_error',
        error: message.error,
        sessionId: connection.sessionId
      }));
      return;
    }
  }

  private handleSuggestionEvent(connectionId: string, event: any): void {
    const connection = this.activeConnections.get(connectionId);
    if (!connection || connection.clientWs.readyState !== WebSocket.OPEN) return;

    connection.clientWs.send(JSON.stringify({
      type: event.type,
      delta: event.delta,
      content: event.content,
      frozen: event.frozen,
      sessionId: event.sessionId
    }));
  }

  private async processTranscription(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    const { transcription } = message;
    connection.transcriptionBuffer += transcription;
    
    // Process for suggestions
    connection.suggestionsService.processTranscription(transcription);
  }

  private async handleAudioChunk(connectionId: string, message: any) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection || !connection.openaiWs) return;

    const { audioData } = message;
    
    // Forward audio chunk to OpenAI
    connection.openaiWs.send(JSON.stringify({
      type: "input_audio_buffer.append",
      audio: audioData
    }));
  }

  private freezeSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.suggestionsService.freeze();
    }
  }

  private unfreezeSuggestions(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.suggestionsService.unfreeze();
    }
  }

  private handlePing(connectionId: string, ws: WebSocket) {
    ws.send(JSON.stringify({
      type: 'pong',
      timestamp: new Date().toISOString()
    }));
  }

  private closeConnection(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      if (connection.openaiWs) {
        connection.openaiWs.close();
      }
      connection.suggestionsService.close();
      this.activeConnections.delete(connectionId);
    }
  }

  private cleanupStaleConnections() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    const staleConnections: string[] = [];
    this.activeConnections.forEach((connection, connectionId) => {
      if (connection.lastActivity < fiveMinutesAgo) {
        staleConnections.push(connectionId);
      }
    });
    
    staleConnections.forEach(connectionId => {
      console.log(`🧹 [ConsolidatedRealtime] Cleaning up stale connection: ${connectionId}`);
      this.closeConnection(connectionId);
    });
  }

  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      service: 'consolidated-realtime'
    };
  }

  shutdown() {
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
    }
    
    const connectionIds = Array.from(this.activeConnections.keys());
    for (const connectionId of connectionIds) {
      this.closeConnection(connectionId);
    }
    
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const consolidatedRealtimeService = new ConsolidatedRealtimeService();