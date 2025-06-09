import WebSocket from "ws";
import { medicalChartIndex } from "./medical-chart-index-service.js";

/**
 * Real-time GPT Suggestions Module
 * Based on your external working implementation
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
      
      // Connect to OpenAI Realtime API using your working format
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
        console.error(`❌ [Suggestions] WebSocket error:`, error);
      });

      this.ws.on("close", () => {
        console.log(`🔌 [Suggestions] WebSocket closed for session ${this.sessionId}`);
      });

    } catch (error) {
      console.error(`❌ [Suggestions] Failed to initialize:`, error);
      throw error;
    }
  }

  /**
   * Configure session based on your working implementation
   */
  private configureSession(): void {
    if (!this.ws) return;

    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text"],
        instructions: "You are a medical AI assistant providing real-time clinical insights and suggestions during patient encounters. Focus on actionable clinical guidance, differential diagnoses, and treatment recommendations based on the conversation flow.",
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        tool_choice: "none",
        temperature: 0.7,
        max_response_output_tokens: 1000
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
  }

  /**
   * Inject patient chart context once per session
   */
  private async injectChartContext(): Promise<void> {
    if (!this.ws || !this.patientChart) return;

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
   * Handle WebSocket messages from OpenAI
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case "response.text.delta":
        this.handleGptAnalysis(data);
        break;
        
      case "response.text.done":
        this.handleGptAnalysisComplete(data);
        break;
        
      case "error":
        console.error(`❌ [Suggestions] OpenAI error:`, data.error);
        break;
    }
  }

  /**
   * Handle streaming GPT analysis deltas
   */
  handleGptAnalysis(data: any): SuggestionEvent | null {
    if (this.isFrozen) {
      return null;
    }

    const delta = data.delta || "";
    this.currentContent += delta;

    // Content filtering - block SOAP notes and orders from suggestions
    const containsVisitSummary = this.visitSummaryPatterns.some(pattern => 
      this.currentContent.includes(pattern)
    );

    if (containsVisitSummary) {
      console.log(`🚫 [Suggestions] Blocked content containing visit summary patterns`);
      return null;
    }

    // Throttle suggestions to prevent overwhelming
    const now = Date.now();
    if (now - this.lastSuggestionTime < 100) {
      return null;
    }
    this.lastSuggestionTime = now;

    const event: SuggestionEvent = {
      type: "gpt.analysis.delta",
      delta,
      content: this.currentContent,
      sessionId: this.sessionId
    };

    this.onMessage(event);
    return event;
  }

  /**
   * Handle GPT analysis completion
   */
  private handleGptAnalysisComplete(data: any): void {
    if (this.isFrozen) return;

    const event: SuggestionEvent = {
      type: "gpt.analysis.completed",
      content: this.currentContent,
      sessionId: this.sessionId
    };

    this.onMessage(event);
    
    // Reset for next conversation turn
    this.currentContent = "";
  }

  /**
   * Process new transcription input
   */
  processTranscription(transcription: string): void {
    if (!this.ws || this.isFrozen) return;

    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: `Current conversation: ${transcription}`
        }]
      }
    };

    this.ws.send(JSON.stringify(message));

    // Trigger response generation
    this.ws.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: "Provide clinical insights and suggestions based on this conversation update."
      }
    }));
  }

  /**
   * Freeze suggestions to prevent overwrites
   */
  freezeSuggestions(): void {
    this.isFrozen = true;
    const event: SuggestionEvent = {
      type: "suggestions.frozen",
      sessionId: this.sessionId,
      frozen: true
    };
    this.onMessage(event);
  }

  /**
   * Unfreeze suggestions
   */
  unfreezeSuggestions(): void {
    this.isFrozen = false;
    const event: SuggestionEvent = {
      type: "suggestions.unfrozen",
      sessionId: this.sessionId,
      frozen: false
    };
    this.onMessage(event);
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
          age: 0,
          gender: "Unknown",
          mrn: patientId.toString()
        },
        activeProblems: context.activeProblems || [],
        medications: context.medications || [],
        allergies: context.allergies || [],
        medicalHistory: [],
        recentEncounters: [],
        vitals: {}
      };
    } catch (error) {
      console.error(`❌ [Suggestions] Failed to load patient chart:`, error);
      throw error;
    }
  }

  /**
   * Format patient context for injection
   */
  private formatPatientContext(chart: PatientChart): string {
    return `Patient Context for Clinical Suggestions:
    
Patient: ${chart.basicInfo.age}yo ${chart.basicInfo.gender} (MRN: ${chart.basicInfo.mrn})

Active Problems: ${chart.activeProblems.join(', ') || 'None documented'}

Current Medications: ${chart.medications.join(', ') || 'None'}

Allergies: ${chart.allergies.join(', ') || 'NKDA'}

Medical History: ${chart.medicalHistory.join(', ') || 'None documented'}

Recent Vitals: ${Object.entries(chart.vitals).map(([key, value]) => `${key}: ${value}`).join(', ') || 'None available'}

Please provide real-time clinical insights and suggestions as the conversation progresses.`;
  }

  /**
   * Cleanup and close connection
   */
  cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}