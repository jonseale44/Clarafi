/**
 * WebSocketEventHandler manages different types of events from the OpenAI Realtime API
 * Routes events to appropriate modules (transcription, suggestions, SOAP, orders)
 */
import { RealTimeSuggestionsModule, EventMetadata } from './RealTimeSuggestionsModule';

export class WebSocketEventHandler {
  public suggestionsModule: RealTimeSuggestionsModule;
  private _ws: WebSocket | null;
  private processedEvents: Set<string> = new Set();
  private processedContent: Set<string> = new Set();

  constructor(
    ws: WebSocket | null,
    private onMessage: (event: any) => void,
  ) {
    try {
      if (!ws) {
        throw new Error("WebSocket instance is required");
      }

      console.log(
        "[WebSocketEventHandler] Initializing with WebSocket state:",
        ws.readyState,
      );

      this._ws = ws;

      // Initialize suggestions module for AI insights
      this.suggestionsModule = new RealTimeSuggestionsModule(ws, onMessage);

      console.log("[WebSocketEventHandler] Modules initialized successfully");
    } catch (error: unknown) {
      console.error(
        "[WebSocketEventHandler] Error initializing modules:",
        error,
      );
      throw new Error(
        `Failed to initialize WebSocket modules: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  markEventAsProcessed(eventId: string): void {
    if (eventId) {
      console.log(
        `[WebSocketEventHandler] 🔒 Marking event as processed: ${eventId}`,
      );
      this.processedEvents.add(eventId);
    }
  }

  isEventProcessed(eventId: string): boolean {
    return eventId ? this.processedEvents.has(eventId) : false;
  }

  markContentAsProcessed(content: string): void {
    if (content && content.length > 10) {
      const contentSignature = content.substring(0, 50).trim();
      console.log(
        `[WebSocketEventHandler] 🔒 Marking content as processed: ${contentSignature}...`,
      );
      this.processedContent.add(contentSignature);
    }
  }

  isContentProcessed(content: string): boolean {
    if (!content || content.length <= 10) return false;
    const contentSignature = content.substring(0, 50).trim();
    return this.processedContent.has(contentSignature);
  }

  /**
   * Main event handler that routes different event types to appropriate modules
   */
  handleEvent(data: any) {
    try {
      console.log(`[WebSocketEventHandler] 📨 Processing event: ${data.type}`);

      // Create metadata for module routing
      const metadata: EventMetadata = {
        patientId: 0, // Will be set by calling code
        sessionId: '',
        userRole: 'provider',
        moduleType: 'suggestions'
      };

      // Route transcription events (handled by frontend directly)
      if (data.type === "conversation.item.input_audio_transcription.delta" || 
          data.type === "conversation.item.input_audio_transcription.completed") {
        console.log("[WebSocketEventHandler] 📝 Routing transcription event to frontend");
        // Let frontend handle transcription directly
        return data;
      }

      // Route AI suggestions events to suggestions module
      if (data.type === "response.text.delta" || data.type === "response.text.done") {
        console.log("[WebSocketEventHandler] 🧠 Routing to suggestions module");
        return this.suggestionsModule.handleGptAnalysis(data, metadata);
      }

      // Route session events
      if (data.type === "session.created" || data.type === "session.updated") {
        console.log("[WebSocketEventHandler] 🔧 Session event:", data.type);
        if (data.session?.id) {
          this.suggestionsModule.setSessionId(data.session.id);
        }
        return data;
      }

      // Route error events
      if (data.type === "error") {
        console.error("[WebSocketEventHandler] ❌ OpenAI Error:", data.error);
        return data;
      }

      // Log unhandled events for debugging
      console.log(`[WebSocketEventHandler] ⚠️ Unhandled event type: ${data.type}`);
      return data;

    } catch (error) {
      console.error("[WebSocketEventHandler] ❌ Error processing event:", error);
      console.error("[WebSocketEventHandler] Event data:", data);
      return null;
    }
  }

  /**
   * Initialize suggestions for a patient
   */
  async initializeSuggestions(patientId: string) {
    console.log("[WebSocketEventHandler] 🚀 Initializing suggestions for patient:", patientId);
    this.suggestionsModule.setPatientId(patientId);
    await this.suggestionsModule.startNewConversation(patientId);
  }

  /**
   * Freeze suggestions (typically when recording stops)
   */
  freezeSuggestions() {
    console.log("[WebSocketEventHandler] ❄️ Freezing suggestions");
    this.suggestionsModule.freeze();
  }

  /**
   * Unfreeze suggestions
   */
  unfreezeSuggestions() {
    console.log("[WebSocketEventHandler] 🔥 Unfreezing suggestions");
    this.suggestionsModule.unfreeze();
  }

  /**
   * Reset suggestions buffer for new recording session
   */
  resetSuggestions() {
    console.log("[WebSocketEventHandler] 🔄 Resetting suggestions buffer");
    this.suggestionsModule.resetBuffer();
  }

  /**
   * Get current suggestions
   */
  getCurrentSuggestions(): string {
    return this.suggestionsModule.getCurrentSuggestions();
  }

  /**
   * Update WebSocket reference
   */
  updateWebSocket(newWs: WebSocket | null) {
    this._ws = newWs;
    this.suggestionsModule.updateWebSocket(newWs);
  }
}