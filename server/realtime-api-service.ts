import { WebSocket } from 'ws';

export interface RealtimeSessionConfig {
  model: string;
  modalities: ["text"];
  instructions?: string;
  input_audio_format?: "pcm16" | "mp3" | "opus" | "aac";
  input_audio_sampling_rate?: number;
  input_audio_transcription?: {
    model: "whisper-1";
  };
  turn_detection: {
    type: "server_vad";
    threshold: 0.6;
    prefix_padding_ms: 300;
    silence_duration_ms: 800;
    create_response: boolean;
  };
}

interface Message {
  type: string;
  data: any;
}

export class RealtimeAPIService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private onTranscriptionCallback: ((text: string, isFinal: boolean) => void) | null = null;

  constructor(private apiKey: string) {
    // Register message handlers according to your working implementation
    this.messageHandlers.set(
      "session.created",
      this.handleSessionCreated.bind(this),
    );
    this.messageHandlers.set(
      "response.created",
      this.handleResponseCreated.bind(this),
    );
    this.messageHandlers.set(
      "response.chunk",
      this.handleResponseChunk.bind(this),
    );
    this.messageHandlers.set(
      "response.done",
      this.handleResponseDone.bind(this),
    );
    this.messageHandlers.set(
      "conversation.item.input_audio_transcription.delta",
      this.handleTranscriptionPartial.bind(this),
    );
    this.messageHandlers.set(
      "conversation.item.input_audio_transcription.completed",
      this.handleTranscriptionFinal.bind(this),
    );
    this.messageHandlers.set("error", this.handleError.bind(this));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🌐 [RealtimeAPI] Connecting to OpenAI Realtime API...');
        
        this.ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        this.ws.onopen = () => {
          console.log("🌐 [RealtimeAPI] WebSocket connection established");
          this.configureSession();
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error("❌ [RealtimeAPI] WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("🔌 [RealtimeAPI] WebSocket connection closed");
          this.sessionId = null;
        };

        this.ws.onmessage = (event) => {
          const data = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
          this.handleMessage(data);
        };
      } catch (error) {
        console.error("❌ [RealtimeAPI] Failed to establish WebSocket connection:", error);
        reject(error);
      }
    });
  }

  private configureSession(): void {
    if (!this.ws) return;

    const config: RealtimeSessionConfig = {
      model: "gpt-4o-realtime-preview-2024-10-01",
      modalities: ["text"], // Text only for transcription
      instructions: "You are a medical transcription assistant. Provide accurate transcription of medical conversations.",
      input_audio_format: "pcm16",
      input_audio_sampling_rate: 16000,
      input_audio_transcription: {
        model: "whisper-1",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.6,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
        create_response: false, // Don't generate responses, just transcribe
      },
    };

    console.log("[RealtimeAPI] Sending session config:", config);

    this.ws.send(JSON.stringify({
      type: "session.update",
      session: config,
    }));
  }

  private handleMessage(data: string): void {
    try {
      const message: Message = JSON.parse(data);
      console.log("[RealtimeAPI] Message received:", message.type);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data || message);
      } else {
        console.log("[RealtimeAPI] Unhandled event type:", message.type);
      }
    } catch (error) {
      console.error("❌ [RealtimeAPI] Error handling message:", error);
    }
  }

  private handleSessionCreated(data: any): void {
    this.sessionId = data.session?.id || data.id;
    console.log("✅ [RealtimeAPI] Session created with ID:", this.sessionId);
  }

  private handleResponseCreated(data: any): void {
    console.log("📝 [RealtimeAPI] Response started:", data);
  }

  private handleResponseChunk(data: any): void {
    console.log("📦 [RealtimeAPI] Response chunk received");
  }

  private handleResponseDone(data: any): void {
    console.log("✅ [RealtimeAPI] Response completed");
  }

  private handleTranscriptionPartial(data: any): void {
    const transcript = data.transcript || data.delta || '';
    console.log("📝 [RealtimeAPI] Partial transcription:", transcript);
    if (this.onTranscriptionCallback) {
      this.onTranscriptionCallback(transcript, false);
    }
  }

  private handleTranscriptionFinal(data: any): void {
    const transcript = data.transcript || '';
    console.log("✅ [RealtimeAPI] Final transcription:", transcript);
    if (this.onTranscriptionCallback) {
      this.onTranscriptionCallback(transcript, true);
    }
  }

  private handleError(data: any): void {
    console.error("❌ [RealtimeAPI] Server error:", data);
  }

  async sendAudio(audioData: Buffer): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    // Convert buffer to base64 for transmission
    const base64Audio = audioData.toString('base64');
    
    this.ws.send(JSON.stringify({
      type: "input_audio_buffer.append",
      audio: base64Audio
    }));
  }

  onTranscription(callback: (text: string, isFinal: boolean) => void): void {
    this.onTranscriptionCallback = callback;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
    }
  }
}