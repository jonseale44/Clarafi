/**
 * SOAP Note Module for Real-time API
 * Handles SOAP note generation and processing
 */
export class SOAPNoteModule {
  private patientChart: any = null;
  private ws: WebSocket | null = null;
  private isCompleted: boolean = false;

  constructor(webSocket: WebSocket | null, onReconnectNeeded?: () => void) {
    this.initializeWebSocket(webSocket);
  }

  private initializeWebSocket(webSocket: WebSocket | null): void {
    this.ws = webSocket;
  }

  /**
   * Set patient chart data for context
   */
  setPatientChart(chart: any): void {
    if (!chart?.patient_id) {
      console.error("Invalid patient chart - missing patient_id");
      return;
    }
    this.patientChart = chart;
  }

  /**
   * Handle GPT response for SOAP note generation
   */
  handleGptResponse(data: any): any {
    if (data.type === "response.text.done") {
      const fullText = data.response?.text || "";
      
      if (!fullText.trim()) {
        console.warn("Empty SOAP note received from GPT");
        return null;
      }

      this.isCompleted = true;
      
      // Trigger draft orders generation after SOAP completion
      if (this.patientChart?.patient_id) {
        setTimeout(() => {
          this.triggerDraftOrders(fullText);
        }, 0);
      }

      return {
        type: "soap.note.completed",
        note: fullText,
      };
    }
    return null;
  }

  /**
   * LEGACY: Draft orders now handled by concurrent Real-time SOAP system
   * This method is disabled to prevent duplicate order generation
   */
  private triggerDraftOrders(soapNote: string): void {
    console.log("🚫 [SOAPNoteModule] Draft orders disabled - handled by concurrent Real-time SOAP system");
    // Legacy draft order generation disabled to prevent duplicates
    return;
  }

  /**
   * Check if SOAP note generation is completed
   */
  isSOAPCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Reset completion status
   */
  reset(): void {
    this.isCompleted = false;
  }
}