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
   * Trigger draft orders generation based on completed SOAP note
   */
  private triggerDraftOrders(soapNote: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not ready for draft orders");
      return;
    }

    const draftOrderInstructions = `
Extract medication, lab, and imaging orders from this SOAP note.

For medications, format as follows:
Medication: [name and dosage]
Sig: [instructions]
Dispense: [quantity] tablets
Refills: [number]

For labs, format as follows:
Lab: [test name]

For imaging, format as follows:
Imaging: [modality and body part]
Instructions: [any special instructions]
Priority: [routine/stat]

Each order must be separated by two newlines.
`;

    const message = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: draftOrderInstructions,
        metadata: { type: "draft_orders" },
        max_output_tokens: 2048,
        input: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: soapNote }],
          },
        ],
        temperature: 0.7,
      },
    };

    this.ws.send(JSON.stringify(message));
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