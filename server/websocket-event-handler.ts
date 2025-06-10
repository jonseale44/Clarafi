import WebSocket from "ws";

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
   * Handle realtime events
   */
  handleRealtimeEvent(message: any, metadata: EventMetadata): void {
    const eventId = this.generateEventId(message.type || "unknown", metadata);
    
    if (this.isEventProcessed(eventId)) {
      return;
    }

    this.markEventProcessed(eventId, metadata);

    // Route based on event type
    switch (message.type) {
      case "conversation.item.input_audio_transcription.delta":
        this.handleTranscriptionDelta(message, eventId, metadata);
        break;
      
      case "conversation.item.input_audio_transcription.completed":
        this.handleTranscriptionCompleted(message, eventId, metadata);
        break;
      
      case "response.text.delta":
        this.handleSuggestionsDelta(message, eventId, metadata);
        break;
      
      case "response.text.done":
        this.handleSuggestionsCompleted(message, eventId, metadata);
        break;
      
      default:
        console.log(`[EventHandler] Unhandled event type: ${message.type}`);
    }
  }

  /**
   * Handle transcription delta events
   */
  private handleTranscriptionDelta(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify({
        type: "transcription.delta",
        delta: message.delta || "",
        eventId,
        metadata
      }));
    }
  }

  /**
   * Handle transcription completed events
   */
  private handleTranscriptionCompleted(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify({
        type: "transcription.completed",
        transcript: message.transcript || "",
        eventId,
        metadata
      }));
    }
  }

  /**
   * Handle suggestions delta events
   */
  private handleSuggestionsDelta(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify({
        type: "suggestions.delta",
        delta: message.delta || "",
        eventId,
        metadata
      }));
    }
  }

  /**
   * Handle suggestions completed events
   */
  private handleSuggestionsCompleted(message: any, eventId: string, metadata: EventMetadata): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify({
        type: "suggestions.completed",
        content: message.text || "",
        eventId,
        metadata
      }));
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(eventType: string, metadata: EventMetadata): string {
    return `${eventType}-${metadata.sessionId}-${Date.now()}`;
  }

  /**
   * Check if event was already processed
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
   * Clean up old processed events
   */
  private cleanupOldEvents(): void {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const eventsToDelete: string[] = [];

    for (const [eventId, event] of this.processedEvents.entries()) {
      if (event.timestamp < thirtyMinutesAgo) {
        eventsToDelete.push(eventId);
      }
    }

    for (const eventId of eventsToDelete) {
      this.processedEvents.delete(eventId);
    }

    console.log(`[EventHandler] Cleaned up ${eventsToDelete.length} old events`);
  }

  /**
   * Get handler statistics
   */
  getStats(): { 
    activeEvents: number; 
    connected: boolean; 
    lastCleanup: boolean; 
    sessionId: string | null 
  } {
    return {
      activeEvents: this.processedEvents.size,
      connected: this.clientWs.readyState === WebSocket.OPEN,
      lastCleanup: true,
      sessionId: null
    };
  }

  /**
   * Cleanup and close
   */
  cleanup(): void {
    if (this.eventCleanupInterval) {
      clearInterval(this.eventCleanupInterval);
    }
    this.processedEvents.clear();
  }
}