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
      this.ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview", {
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
        instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

Instructions:

Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights. Additionally, if the physician asks, provide relevant information from the patient's chart or office visits, such as past medical history, current medications, allergies, lab results, and imaging findings. Include this information concisely and accurately where appropriate. This medical information might be present in old office visit notes. Do not make anything up, it would be better to say you don't have that information available.

Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. When referencing diagnostics or red flags, provide a complete list to guide the differential diagnosis (e.g., imaging-related red flags). Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per line.

Additional details for medication recommendations:

Always include typical starting dose, dose adjustment schedules, and maximum dose.
Output examples of good insights:

Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

Output examples of bad insights (to avoid):

Encourage gentle stretches and light activity to maintain mobility.
Suggest warm baths at night for symptomatic relief of muscle tension.
Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

Return each new insight on a separate line, and prefix each line with a bullet (•), dash (-), or number if appropriate. Do not combine multiple ideas on the same line. 

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a user question.`,
        model: "gpt-4o-mini-realtime-preview",
        modalities: ["text"], // Keep text-only for suggestions
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
          language: "en",
          prompt: "You MUST ALWAYS translate the speech into English ONLY, regardless of input language. NEVER include the original non-English text. ONLY OUTPUT ENGLISH text. Translate all utterances, questions, and statements fully to English without leaving any words in the original language."
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.3, // Lower threshold for better sensitivity
          prefix_padding_ms: 500, // Increased to catch more of the start of speech
          silence_duration_ms: 1000, // Increased to allow for natural pauses
          create_response: true
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
      data: {
        role: "user",
        content: patientContext,
        session_id: this.sessionId
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
   * Freeze insights to prevent overwrites
   */
  freezeInsights(): void {
    this.freezeSuggestions();
  }

  /**
   * Unfreeze insights
   */
  unfreezeInsights(): void {
    this.unfreezeSuggestions();
  }

  /**
   * Check if suggestions are frozen
   */
  areFrozen(): boolean {
    return this.isFrozen;
  }

  /**
   * Get module status
   */
  getStatus(): { connected: boolean; frozen: boolean; sessionId: string } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      frozen: this.isFrozen,
      sessionId: this.sessionId
    };
  }

  /**
   * Close connection
   */
  close(): void {
    this.cleanup();
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