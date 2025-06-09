import WebSocket from "ws";
import { medicalChartIndex } from "./medical-chart-index-service.js";

/**
 * Real-time GPT Suggestions Module
 * Handles WebSocket events for real-time suggestions using OpenAI Realtime API
 * Injects patient chart context and manages conversation state
 */

export interface SuggestionEvent {
  type: "gpt.analysis.delta" | "gpt.analysis.completed" | "suggestions.frozen" | "suggestions.unfrozen";
  delta?: string;
  content?: string;
  sessionId: string;
  frozen?: boolean;
}

export interface PatientChart {
  patientId: number;
  basicInfo: {
    age: number;
    gender: string;
    mrn: string;
  };
  activeProblems: string[];
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  recentEncounters: string[];
  vitals: Record<string, any>;
}

export class RealTimeSuggestionsModule {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private patientChart: PatientChart | null = null;
  private currentContent: string = "";
  private isFrozen: boolean = false;
  private lastSuggestionTime: number = 0;
  private onMessage: (event: SuggestionEvent) => void;

  // Content filtering patterns to prevent SOAP notes/orders from appearing in suggestions
  private readonly visitSummaryPatterns = [
    "Chief Complaint:",
    "SUBJECTIVE:",
    "OBJECTIVE:",
    "ASSESSMENT:",
    "PLAN:",
    "Patient Visit Summary",
    "SOAP Note:",
    "Physical Exam:",
    "Review of Systems:",
    "Medications:",
    "Allergies:",
    "Vital Signs:",
    "Laboratory Results:",
    "Imaging Results:",
    "Orders:",
    "Prescriptions:",
    "Referrals:"
  ];

  constructor(sessionId: string, onMessage: (event: SuggestionEvent) => void) {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
  }

  /**
   * Initialize WebSocket connection to OpenAI Realtime API
   */
  async initialize(patientId: number): Promise<void> {
    try {
      // Load patient chart context
      this.patientChart = await this.loadPatientChart(patientId);
      
      // Connect to OpenAI Realtime API
      this.ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      });

      this.ws.on("open", () => {
        console.log(`✅ [Suggestions] WebSocket connected for session ${this.sessionId}`);
        this.configureSession();
        this.injectChartContext();
      });

      this.ws.on("message", (data) => {
        this.handleWebSocketMessage(JSON.parse(data.toString()));
      });

      this.ws.on("error", (error) => {
        console.error(`❌ [Suggestions] WebSocket error for session ${this.sessionId}:`, error);
      });

      this.ws.on("close", () => {
        console.log(`🔌 [Suggestions] WebSocket closed for session ${this.sessionId}`);
      });

    } catch (error) {
      console.error(`❌ [Suggestions] Failed to initialize session ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Configure OpenAI session settings
   */
  private configureSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text"],
        instructions: this.buildSystemInstructions(),
        voice: "alloy",
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
        tools: [],
        tool_choice: "none",
        temperature: 0.7,
        max_response_output_tokens: 150
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
  }

  /**
   * Build system instructions for GPT suggestions
   */
  private buildSystemInstructions(): string {
    return `You are a real-time clinical AI assistant providing live suggestions during patient encounters.

ROLE: Provide brief, actionable clinical insights based on live transcription.

GUIDELINES:
- Respond with ONE specific clinical insight per input
- Keep responses under 25 words
- Focus on immediate clinical relevance
- If nothing new to add, respond "CONTINUE" only
- Never generate SOAP notes, visit summaries, or formal documentation
- Avoid repeating previous suggestions
- Prioritize patient safety and clinical accuracy

RESPONSE STYLE:
- Brief, actionable phrases
- Clinical insights and recommendations
- Diagnostic considerations
- Treatment suggestions
- Safety alerts when appropriate

Remember: You are providing live assistance, not documentation.`;
  }

  /**
   * Inject patient chart context once per session
   */
  private async injectChartContext(): Promise<void> {
    if (!this.ws || !this.patientChart || this.ws.readyState !== WebSocket.OPEN) return;

    const patientContext = this.formatPatientContext(this.patientChart);
    
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: patientContext
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📋 [Suggestions] Patient context injected for session ${this.sessionId}`);
  }

  /**
   * Format patient chart for context injection
   */
  private formatPatientContext(chart: PatientChart): string {
    const context = [
      `PATIENT CONTEXT (${chart.basicInfo.age}${chart.basicInfo.gender.charAt(0).toUpperCase()})`,
      chart.activeProblems.length > 0 ? `Problems: ${chart.activeProblems.slice(0, 3).join(', ')}` : null,
      chart.medications.length > 0 ? `Medications: ${chart.medications.slice(0, 3).join(', ')}` : null,
      chart.allergies.length > 0 ? `Allergies: ${chart.allergies.join(', ')}` : "NKDA",
      chart.medicalHistory.length > 0 ? `History: ${chart.medicalHistory.slice(0, 2).join('; ')}` : null
    ].filter(Boolean).join('\n');

    return `${context}\n\nProvide live clinical suggestions based on upcoming transcription.`;
  }

  /**
   * Process live transcription and get suggestions
   */
  async processLiveTranscription(transcription: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.isFrozen) {
      return;
    }

    // Throttle suggestions to prevent overload
    const now = Date.now();
    if (now - this.lastSuggestionTime < 2000) { // 2 second minimum between suggestions
      return;
    }
    this.lastSuggestionTime = now;

    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: `Live transcription: "${transcription}"\n\nProvide ONE brief clinical insight or "CONTINUE" if nothing new to add.`
        }]
      }
    };

    this.ws.send(JSON.stringify(message));

    // Trigger response
    const responseMessage = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: "Provide a brief clinical insight based on the latest transcription.",
        metadata: { type: "live_suggestions" }
      }
    };

    this.ws.send(JSON.stringify(responseMessage));
  }

  /**
   * Handle WebSocket messages from OpenAI
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case "response.text.delta":
        this.handleGptAnalysisDelta(message);
        break;

      case "response.text.done":
        this.handleGptAnalysisCompleted(message);
        break;

      case "response.done":
        // Reset for next suggestion
        this.currentContent = "";
        break;

      case "error":
        console.error(`❌ [Suggestions] OpenAI error for session ${this.sessionId}:`, message.error);
        break;

      default:
        // Log other events for debugging
        console.log(`📋 [Suggestions] Unhandled event for session ${this.sessionId}:`, message.type);
    }
  }

  /**
   * Handle streaming GPT analysis delta
   */
  private handleGptAnalysisDelta(message: any): SuggestionEvent | null {
    if (this.isFrozen) {
      console.log(`❄️ [Suggestions] GPT analysis update skipped - insights frozen for session ${this.sessionId}`);
      return null;
    }

    const delta = message.delta || "";
    this.currentContent += delta;

    // Filter out SOAP notes and visit summaries
    const containsVisitSummary = this.visitSummaryPatterns.some(pattern => 
      this.currentContent.toUpperCase().includes(pattern.toUpperCase())
    );

    if (containsVisitSummary) {
      console.log(`🚫 [Suggestions] Filtered out visit summary content for session ${this.sessionId}`);
      return null;
    }

    // Skip if just "CONTINUE"
    if (this.currentContent.trim().toUpperCase() === "CONTINUE") {
      return null;
    }

    const event: SuggestionEvent = {
      type: "gpt.analysis.delta",
      delta: delta.replace(/\.\s+/g, ".\n"), // Format with line breaks
      sessionId: this.sessionId
    };

    this.onMessage(event);
    return event;
  }

  /**
   * Handle completed GPT analysis
   */
  private handleGptAnalysisCompleted(message: any): SuggestionEvent | null {
    if (this.isFrozen) {
      return null;
    }

    const fullContent = message.text || this.currentContent;

    // Filter out unwanted content
    const containsVisitSummary = this.visitSummaryPatterns.some(pattern => 
      fullContent.toUpperCase().includes(pattern.toUpperCase())
    );

    if (containsVisitSummary || fullContent.trim().toUpperCase() === "CONTINUE") {
      this.currentContent = "";
      return null;
    }

    const event: SuggestionEvent = {
      type: "gpt.analysis.completed",
      content: fullContent,
      sessionId: this.sessionId
    };

    this.onMessage(event);
    this.currentContent = "";
    return event;
  }

  /**
   * Freeze suggestions to prevent overwrites
   */
  freezeInsights(): void {
    this.isFrozen = true;
    this.onMessage({
      type: "suggestions.frozen",
      sessionId: this.sessionId,
      frozen: true
    });
    console.log(`❄️ [Suggestions] Insights frozen for session ${this.sessionId}`);
  }

  /**
   * Unfreeze suggestions
   */
  unfreezeInsights(): void {
    this.isFrozen = false;
    this.onMessage({
      type: "suggestions.unfrozen",
      sessionId: this.sessionId,
      frozen: false
    });
    console.log(`🔥 [Suggestions] Insights unfrozen for session ${this.sessionId}`);
  }

  /**
   * Check if insights are frozen
   */
  areFrozen(): boolean {
    return this.isFrozen;
  }

  /**
   * Load patient chart from medical index
   */
  private async loadPatientChart(patientId: number): Promise<PatientChart> {
    try {
      const context = await medicalChartIndex.getFastMedicalContext(patientId);
      
      return {
        patientId,
        basicInfo: {
          age: 0, // Will be populated from context
          gender: "unknown",
          mrn: ""
        },
        activeProblems: context.activeProblems,
        medications: context.medications,
        allergies: context.allergies,
        medicalHistory: [],
        recentEncounters: [],
        vitals: {}
      };
    } catch (error) {
      console.error(`❌ [Suggestions] Failed to load chart for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get current session status
   */
  getStatus(): { connected: boolean; frozen: boolean; sessionId: string } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      frozen: this.isFrozen,
      sessionId: this.sessionId
    };
  }
}