import { WebSocket } from "ws";

export interface RealtimeSessionConfig {
  model: string;
  modalities: ["text"]; // Set explicitly to text-only to disable audio output
  instructions?: string;
  input_audio_format?: "pcm16" | "mp3" | "opus" | "aac"; // Still needed for input audio
  input_audio_sampling_rate?: number; // Still needed for input audio
  input_audio_transcription?: {
    model: "whisper-1";
  };

  turn_detection: {
    type: "server_vad";
    threshold: 0.6;
    prefix_padding_ms: 300;
    silence_duration_ms: 800;
    create_response: false;
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

  constructor(private apiKey: string) {
    // Register message handlers according to API docs
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
      "transcription.partial",
      this.handleTranscriptionPartial.bind(this),
    );
    this.messageHandlers.set(
      "transcription.final",
      this.handleTranscriptionFinal.bind(this),
    );
    this.messageHandlers.set("error", this.handleError.bind(this));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket("wss://api.openai.com/v1/realtime", [
          "realtime",
          "openai-beta.realtime-v1",
        ]);

        // Headers will be handled by the backend proxy
        this.ws.onopen = () => {
          console.log("WebSocket connection established");
          this.configureSession();
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket connection closed");
          this.sessionId = null;
        };

        this.ws.onmessage = (event: MessageEvent) => {
          const data =
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data);
          this.handleMessage(data);
        };
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
        reject(error);
      }
    });
    engli;
  }

  private configureSession(): void {
    if (!this.ws) return;

    const config: RealtimeSessionConfig = {
      model: "gpt-4o-mini-realtime-preview-2024-12-17",
      modalities: ["text"], // Changed to text-only to reduce token usage
      instructions:
        "literally just say the word 'hello' no matter what question the user asks.",
      // "You are a medical AI assistant. Listen to the doctor-patient conversation and provide brief, single-line medical insights. Focus on: diagnoses, dosages, standards of care. Be extremely concise. One point per line. No explanations or pleasantries.",
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
        create_response: true,
      },
    };

    console.log("[Session Config Sent]:", config);

    this.ws.send(
      JSON.stringify({
        type: "session.update",
        data: config,
      }),
    );
  }

  private handleMessage(data: string): void {
    try {
      const message: Message = JSON.parse(data);
      console.log("[WebSocket Event Debug]:", message);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      } else {
        console.log("[Unhandled WebSocket Event Type]:", message.type, message);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private handleSessionCreated(data: any): void {
    this.sessionId = data.session.id;
    console.log("[Session] Created with ID:", this.sessionId);
    console.log("[Session Response Received]:", data);
  }

  private handleResponseCreated(data: any): void {
    console.log("[Response] Started:", data);
  }

  private handleResponseChunk(data: any): void {
    console.log("[Response] Chunk received:", data);
  }

  private handleResponseDone(data: any): void {
    console.log("[Response] Completed:", data);
  }

  private handleTranscriptionPartial(data: any): void {
    console.log("[Transcription] Partial:", data);
  }

  private handleTranscriptionFinal(data: any): void {
    console.log("[Transcription] Final:", data);
  }

  private handleError(data: any): void {
    console.error("[Error] Server error:", data);
  }

  async sendText(text: string): Promise<void> {
    if (!this.ws || !this.sessionId) {
      throw new Error("WebSocket not connected or session not established");
    }

    this.ws.send(
      JSON.stringify({
        type: "conversation.item.create",
        data: {
          role: "user",
          content: text,
          session_id: this.sessionId,
        },
      }),
    );
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.ws || !this.sessionId) {
      throw new Error("WebSocket not connected or session not established");
    }

    this.ws.send(
      JSON.stringify({
        type: "audio.data",
        data: {
          session_id: this.sessionId,
          audio: audioData,
        },
      }),
    );
  }

  onTranscription(callback: (text: string, isFinal: boolean) => void): void {
    this.messageHandlers.set("transcription.partial", (data) => {
      callback(data.text, false);
    });

    this.messageHandlers.set("transcription.final", (data) => {
      callback(data.text, true);
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
    }
  }
}
