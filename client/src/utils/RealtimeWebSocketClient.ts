import { RealtimeEventHandler } from "./RealtimeEventHandler";

/**
 * Real-time WebSocket Client for OpenAI's Real-time API
 * Handles SOAP note generation with streaming responses
 */
export class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private eventHandler: RealtimeEventHandler;
  private isConnected: boolean = false;
  private onReadyCallback: (() => void) | null = null;
  public transcriptionContent: string = "";

  constructor(
    apiKey: string,
    onMessage: (event: any) => void,
    patientChart?: any
  ) {
    this.apiKey = apiKey;
    this.eventHandler = new RealtimeEventHandler(this, onMessage, patientChart);
  }

  /**
   * Initialize the WebSocket connection to OpenAI's Real-time API
   */
  async init(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    
    try {
      this.ws = new WebSocket(url, [
        "realtime",
        `openai-insecure-api-key.${this.apiKey}`,
      ]);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 10000);

        this.onReady(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
      throw error;
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    console.log("Real-time WebSocket connected");
    this.isConnected = true;
    
    // Configure the session with audio transcription
    this.sendMessage({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: "You are a helpful AI assistant for medical documentation.",
        voice: "shimmer",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        temperature: 0.7,
        max_response_output_tokens: 4096
      }
    });

    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.eventHandler.handleEvent(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log("Real-time WebSocket disconnected:", event.code, event.reason);
    this.isConnected = false;
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Event): void {
    console.error("Real-time WebSocket error:", error);
  }

  /**
   * Send a message through the WebSocket connection
   */
  public sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not connected for message sending");
    }
  }

  /**
   * Update transcription content for SOAP note generation
   */
  public updateTranscriptionContent(text: string): void {
    this.transcriptionContent = text;
  }

  /**
   * Request SOAP note generation using Real-time API
   */
  public requestSOAPNote(instructions: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected for SOAP note request");
      return;
    }

    const transcriptionText = this.transcriptionContent || "";
    
    const response = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: instructions,
        metadata: {
          type: "soap_note",
          partial_updates: "true",
        },
        max_output_tokens: 4096,
        input: [
          {
            type: "message",
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Generate a SOAP note based on the provided transcription and instructions."
              },
            ],
          },
          {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Instructions:\n${instructions}\n\nTranscription:\n${transcriptionText}`,
              },
            ],
          },
        ],
        temperature: 0.7,
      },
    };
    
    console.log("Requesting SOAP note generation via Real-time API");
    this.ws.send(JSON.stringify(response));
  }

  /**
   * Register callback for connection ready state
   */
  public onReady(callback: () => void): void {
    this.onReadyCallback = callback;
    if (this.isConnected) {
      callback();
    }
  }

  /**
   * Check if the client has a valid API key
   */
  public hasValidApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Check if client is connected
   */
  public isInitialized(): boolean {
    return this.isConnected;
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send audio data to the Real-time API
   */
  public async appendAudio(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected for audio");
      return;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);
      
      this.sendMessage({
        type: "input_audio_buffer.append",
        audio: base64Audio
      });
    } catch (error) {
      console.error("Error sending audio data:", error);
    }
  }
}