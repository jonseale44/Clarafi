import WebSocket from "ws";
import { RealTimeSuggestionsModule, SuggestionEvent } from "./realtime-suggestions-module.js";

/**
 * WebSocket Event Handler
 * Central event routing system for real-time features
 * Prevents duplicate processing and manages different event types
 */

export interface EventMetadata {
  type: "suggestions" | "soap_notes" | "orders" | "transcription";
  patientId: number;
  userRole: "nurse" | "provider";
  sessionId: string;
}

export interface ProcessedEvent {
  eventId: string;
  timestamp: number;
  metadata: EventMetadata;
  processed: boolean;
}

export class WebSocketEventHandler {
  private clientWs: WebSocket;
  private suggestionsModule: RealTimeSuggestionsModule | null = null;
  private processedEvents: Map<string, ProcessedEvent> = new Map();
  private eventCleanupInterval: NodeJS.Timeout;

  constructor(clientWs: WebSocket) {
    this.clientWs = clientWs;
    
    // Clean up old events every 5 minutes
    this.eventCleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 5 * 60 * 1000);
  }

  /**
   * Initialize suggestions module for a patient
   */
  async initializeSuggestionsModule(patientId: number, sessionId: string): Promise<void> {
    try {
      this.suggestionsModule = new RealTimeSuggestionsModule(
        sessionId,
        (event: SuggestionEvent) => this.handleSuggestionEvent(event)
      );

      await this.suggestionsModule.initialize(patientId);
      console.log(`✅ [EventHandler] Suggestions module initialized for patient ${patientId}`);
    } catch (error) {
      console.error(`❌ [EventHandler] Failed to initialize suggestions for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Handle suggestion events from the suggestions module
   */
  private handleSuggestionEvent(event: SuggestionEvent): void {
    if (this.clientWs.readyState !== WebSocket.OPEN) return;

    // Send to client based on event type
    switch (event.type) {
      case "gpt.analysis.delta":
        this.clientWs.send(JSON.stringify({
          type: "gpt.analysis.delta",
          delta: event.delta,
          sessionId: event.sessionId
        }));
        break;

      case "gpt.analysis.completed":
        this.clientWs.send(JSON.stringify({
          type: "gpt.analysis.completed",
          content: event.content,
          sessionId: event.sessionId
        }));
        break;

      case "suggestions.frozen":
        this.clientWs.send(JSON.stringify({
          type: "suggestions.frozen",
          frozen: true,
          sessionId: event.sessionId
        }));
        break;

      case "suggestions.unfrozen":
        this.clientWs.send(JSON.stringify({
          type: "suggestions.unfrozen",
          frozen: false,
          sessionId: event.sessionId
        }));
        break;
    }
  }

  /**
   * Process live transcription for suggestions
   */
  async processTranscriptionForSuggestions(
    transcription: string,
    metadata: EventMetadata
  ): Promise<void> {
    const eventId = this.generateEventId("transcription", metadata);
    
    // Prevent duplicate processing
    if (this.isEventProcessed(eventId)) {
      console.log(`⏭️ [EventHandler] Skipping duplicate transcription event ${eventId}`);
      return;
    }

    try {
      if (this.suggestionsModule) {
        await this.suggestionsModule.processLiveTranscription(transcription);
      }

      this.markEventProcessed(eventId, metadata);
    } catch (error) {
      console.error(`❌ [EventHandler] Error processing transcription for suggestions:`, error);
    }
  }

  /**
   * Handle OpenAI Realtime API events
   */
  handleRealtimeEvent(message: any, metadata: EventMetadata): void {
    const eventId = this.generateEventId(message.type, metadata);

    // Route events based on metadata type
    switch (metadata.type) {
      case "suggestions":
        this.routeSuggestionsEvent(message, eventId, metadata);
        break;

      case "soap_notes":
        this.routeSOAPEvent(message, eventId, metadata);
        break;

      case "orders":
        this.routeOrdersEvent(message, eventId, metadata);
        break;

      case "transcription":
        this.routeTranscriptionEvent(message, eventId, metadata);
        break;

      default:
        console.log(`📋 [EventHandler] Unhandled metadata type: ${metadata.type}`);
    }
  }

  /**
   * Route suggestions-specific events
   */
  private routeSuggestionsEvent(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.isEventProcessed(eventId)) return;

    switch (message.type) {
      case "conversation.item.input_audio_transcription.delta":
        if (this.suggestionsModule) {
          const transcription = message.transcript || message.delta || "";
          this.suggestionsModule.processLiveTranscription(transcription);
        }
        break;

      case "response.text.delta":
        // Handled by suggestions module directly
        break;

      case "response.text.done":
        // Handled by suggestions module directly
        break;

      default:
        console.log(`📋 [EventHandler] Unhandled suggestions event: ${message.type}`);
    }

    this.markEventProcessed(eventId, metadata);
  }

  /**
   * Route SOAP note events
   */
  private routeSOAPEvent(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.isEventProcessed(eventId)) return;

    switch (message.type) {
      case "response.text.delta":
        if (message.response?.metadata?.type === "soap_generation") {
          this.clientWs.send(JSON.stringify({
            type: "soap.note.delta",
            delta: message.delta || "",
            sessionId: metadata.sessionId
          }));
        }
        break;

      case "response.text.done":
        if (message.response?.metadata?.type === "soap_generation") {
          this.clientWs.send(JSON.stringify({
            type: "soap.note.completed",
            content: message.text || "",
            sessionId: metadata.sessionId
          }));
        }
        break;

      default:
        console.log(`📋 [EventHandler] Unhandled SOAP event: ${message.type}`);
    }

    this.markEventProcessed(eventId, metadata);
  }

  /**
   * Route orders events
   */
  private routeOrdersEvent(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.isEventProcessed(eventId)) return;

    switch (message.type) {
      case "response.text.delta":
        if (message.response?.metadata?.type === "draft_orders") {
          this.clientWs.send(JSON.stringify({
            type: "draft.orders.delta",
            delta: message.delta || "",
            sessionId: metadata.sessionId
          }));
        }
        break;

      case "response.text.done":
        if (message.response?.metadata?.type === "draft_orders") {
          this.clientWs.send(JSON.stringify({
            type: "draft.orders.completed",
            content: message.text || "",
            sessionId: metadata.sessionId
          }));
        }
        break;

      default:
        console.log(`📋 [EventHandler] Unhandled orders event: ${message.type}`);
    }

    this.markEventProcessed(eventId, metadata);
  }

  /**
   * Route transcription events
   */
  private routeTranscriptionEvent(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.isEventProcessed(eventId)) return;

    switch (message.type) {
      case "conversation.item.input_audio_transcription.delta":
        this.clientWs.send(JSON.stringify({
          type: "transcription.delta",
          delta: message.transcript || message.delta || "",
          sessionId: metadata.sessionId
        }));
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.clientWs.send(JSON.stringify({
          type: "transcription.completed",
          transcript: message.transcript || "",
          sessionId: metadata.sessionId
        }));
        break;

      default:
        console.log(`📋 [EventHandler] Unhandled transcription event: ${message.type}`);
    }

    this.markEventProcessed(eventId, metadata);
  }

  /**
   * Freeze suggestions to prevent overwrites
   */
  freezeSuggestions(): void {
    if (this.suggestionsModule) {
      this.suggestionsModule.freezeInsights();
    }
  }

  /**
   * Unfreeze suggestions
   */
  unfreezeSuggestions(): void {
    if (this.suggestionsModule) {
      this.suggestionsModule.unfreezeInsights();
    }
  }

  /**
   * Check if suggestions are frozen
   */
  areSuggestionsFrozen(): boolean {
    return this.suggestionsModule?.areFrozen() || false;
  }

  /**
   * Get suggestions module status
   */
  getSuggestionsStatus(): { connected: boolean; frozen: boolean; sessionId: string | null } {
    if (this.suggestionsModule) {
      return this.suggestionsModule.getStatus();
    }
    return { connected: false, frozen: false, sessionId: null };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(eventType: string, metadata: EventMetadata): string {
    const timestamp = Date.now();
    return `${eventType}-${metadata.patientId}-${metadata.sessionId}-${timestamp}`;
  }

  /**
   * Check if event has already been processed
   */
  private isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark event as processed
   */
  private markEventProcessed(eventId: string, metadata: EventMetadata): void {
    this.processedEvents.set(eventId, {
      eventId,
      timestamp: Date.now(),
      metadata,
      processed: true
    });
  }

  /**
   * Clean up old processed events (older than 30 minutes)
   */
  private cleanupOldEvents(): void {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    const eventsToDelete: string[] = [];
    const entries = Array.from(this.processedEvents.entries());
    for (const [eventId, event] of entries) {
      if (event.timestamp < thirtyMinutesAgo) {
        eventsToDelete.push(eventId);
      }
    }
    
    for (const eventId of eventsToDelete) {
      this.processedEvents.delete(eventId);
    }

    console.log(`🧹 [EventHandler] Cleaned up old events, ${this.processedEvents.size} events remaining`);
  }

  /**
   * Close handler and cleanup resources
   */
  close(): void {
    if (this.suggestionsModule) {
      this.suggestionsModule.close();
      this.suggestionsModule = null;
    }

    if (this.eventCleanupInterval) {
      clearInterval(this.eventCleanupInterval);
    }

    this.processedEvents.clear();
    console.log(`🔌 [EventHandler] Event handler closed and cleaned up`);
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    processedEventCount: number;
    suggestionsStatus: { connected: boolean; frozen: boolean; sessionId: string | null };
    clientConnected: boolean;
  } {
    return {
      processedEventCount: this.processedEvents.size,
      suggestionsStatus: this.getSuggestionsStatus(),
      clientConnected: this.clientWs.readyState === WebSocket.OPEN
    };
  }
}