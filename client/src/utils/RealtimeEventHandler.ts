// LEGACY: SOAPNoteModuleSimple removed - functionality now handled by RealtimeSOAPIntegration component

export class DraftOrdersModuleSimple {
  private patientChart: any = null;

  constructor(webSocket: WebSocket | null) {
    // Simple implementation
  }

  setPatientChart(chart: any): void {
    this.patientChart = chart;
  }

  processOrders(ordersText: string): any[] {
    if (!ordersText.trim()) return [];
    
    const orders: any[] = [];
    const sections = ordersText.split('\n\n').filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) continue;

      if (lines[0].toLowerCase().startsWith('medication:')) {
        orders.push({
          type: 'medication',
          name: lines[0].substring(11).trim(),
          sig: lines.find(l => l.toLowerCase().startsWith('sig:'))?.substring(4).trim() || '',
          dispense: lines.find(l => l.toLowerCase().startsWith('dispense:'))?.substring(9).trim() || '',
          refills: parseInt(lines.find(l => l.toLowerCase().startsWith('refills:'))?.substring(8).trim() || '0')
        });
      } else if (lines[0].toLowerCase().startsWith('lab:')) {
        orders.push({
          type: 'lab',
          name: lines[0].substring(4).trim()
        });
      } else if (lines[0].toLowerCase().startsWith('imaging:')) {
        orders.push({
          type: 'imaging',
          name: lines[0].substring(8).trim()
        });
      }
    }

    return orders;
  }
}

/**
 * Event handler for Real-time API WebSocket messages
 * Routes events to appropriate modules based on message type
 */
export class RealtimeEventHandler {
  private webSocketClient: any;
  private onMessage: (event: any) => void;
  public draftOrdersModule: DraftOrdersModuleSimple | null = null;

  constructor(
    webSocketClient: any,
    onMessage: (event: any) => void,
    patientChart?: any
  ) {
    this.webSocketClient = webSocketClient;
    this.onMessage = onMessage;
    
    // Initialize draft orders module only (SOAP note handling moved to RealtimeSOAPIntegration)
    this.draftOrdersModule = new DraftOrdersModuleSimple(webSocketClient.ws);
    
    if (patientChart) {
      this.draftOrdersModule?.setPatientChart(patientChart);
    }
  }

  /**
   * Handle incoming WebSocket events and route to appropriate modules
   */
  handleEvent(data: any): void {
    switch (data.type) {
      case "session.created":
        this.handleSessionCreated(data);
        break;
        
      case "session.updated":
        console.log("Session updated:", data.session);
        break;
        
      case "input_audio_buffer.speech_started":
        this.onMessage({
          type: "speech.started",
        });
        break;
        
      case "input_audio_buffer.speech_stopped":
        this.onMessage({
          type: "speech.stopped",
        });
        break;
        
      case "conversation.item.input_audio_transcription.completed":
        this.handleTranscriptionCompleted(data);
        break;
        
      case "response.text.delta":
        this.handleTextDelta(data);
        break;
        
      case "response.text.done":
        this.handleTextDone(data);
        break;
        
      case "response.done":
        this.handleResponseDone(data);
        break;
        
      case "error":
        this.handleError(data);
        break;
        
      default:
        console.log("Unhandled event type:", data.type);
    }
  }

  /**
   * Handle session creation confirmation
   */
  private handleSessionCreated(data: any): void {
    console.log("Real-time session created:", data.session?.id);
    this.onMessage({
      type: "session.ready",
      session: data.session,
    });
  }

  /**
   * Handle completed transcription
   */
  private handleTranscriptionCompleted(data: any): void {
    const transcript = data.transcript || "";
    if (transcript.trim()) {
      // Update transcription content in WebSocket client
      if (this.webSocketClient && this.webSocketClient.updateTranscriptionContent) {
        this.webSocketClient.updateTranscriptionContent(transcript);
      }
      
      this.onMessage({
        type: "transcription.completed",
        transcript: transcript,
      });
    }
  }

  /**
   * Handle streaming text deltas for SOAP notes and other responses
   */
  private handleTextDelta(data: any): void {
    const delta = data.delta || "";
    const responseMetadata = data.response?.metadata;
    
    if (responseMetadata?.type === "soap_note") {
      this.onMessage({
        type: "soap.note.delta",
        delta: delta,
      });
    } else if (responseMetadata?.type === "draft_orders") {
      this.onMessage({
        type: "draft.orders.delta",
        delta: delta,
      });
    } else {
      // Generic text delta
      this.onMessage({
        type: "text.delta",
        delta: delta,
      });
    }
  }

  /**
   * Handle completed text responses
   */
  private handleTextDone(data: any): void {
    const fullText = data.text || "";
    const responseMetadata = data.response?.metadata;
    
    if (responseMetadata?.type === "soap_note") {
      this.handleSOAPNoteCompletion(data, fullText);
    } else if (responseMetadata?.type === "draft_orders") {
      this.handleDraftOrdersCompletion(data, fullText);
    } else {
      this.onMessage({
        type: "text.completed",
        text: fullText,
      });
    }
  }

  /**
   * Handle SOAP note completion - now handled by RealtimeSOAPIntegration component
   */
  private handleSOAPNoteCompletion(data: any, fullText: string): void {
    if (!fullText.trim()) {
      console.warn("Empty SOAP note received from Real-time API");
      return;
    }

    // Direct event forwarding - SOAP processing moved to RealtimeSOAPIntegration
    this.onMessage({
      type: "soap.note.completed",
      note: fullText,
    });
  }

  /**
   * Handle draft orders completion
   */
  private handleDraftOrdersCompletion(data: any, fullText: string): void {
    this.onMessage({
      type: "draft.orders.completed",
      orders: fullText,
    });
  }

  /**
   * Handle response completion
   */
  private handleResponseDone(data: any): void {
    const responseMetadata = data.response?.metadata;
    
    if (responseMetadata?.type === "draft_orders") {
      // Extract orders from the response output
      const output = data.response?.output;
      if (output && output.length > 0) {
        const ordersText = output.map((item: any) => item.content?.text || "").join("");
        this.onMessage({
          type: "draft.orders.completed",
          orders: ordersText,
        });
      }
    }
  }

  /**
   * Handle errors from Real-time API
   */
  private handleError(data: any): void {
    console.error("Real-time API error:", data.error);
    this.onMessage({
      type: "error",
      error: data.error,
    });
  }

  /**
   * Handle reconnection events
   */
  private handleReconnection(): void {
    console.log("Handling WebSocket reconnection");
    this.onMessage({
      type: "reconnection.needed",
    });
  }

  /**
   * Update patient chart in all modules
   */
  public updatePatientChart(patientChart: any): void {
    if (this.soapNoteModule) {
      this.soapNoteModule.setPatientChart(patientChart);
    }
    if (this.draftOrdersModule) {
      this.draftOrdersModule.setPatientChart(patientChart);
    }
  }
}