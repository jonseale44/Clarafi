/**
 * ⚠️ INACTIVE MODULE - Not connected to UI ⚠️
 *
 * Real-time AI suggestions module with comprehensive medical prompts
 * Contains high-quality medical guidance but not used by current UI
 *
 * ACTIVE AI SUGGESTIONS SYSTEM:
 * - client/src/components/patient/encounter-detail-view.tsx (Direct WebSocket to OpenAI)
 *
 * This module could be used for future WebSocket-based implementations
 */

export interface EventMetadata {
  patientId: number;
  sessionId: string;
  userRole: "nurse" | "provider";
  moduleType: "suggestions" | "transcription" | "soap" | "orders";
}

export class RealTimeSuggestionsModule {
  private patientChart: any = null;
  private static _injectedChartWebSockets = new WeakMap<
    WebSocket,
    Set<string>
  >();
  private currentConversationId: string | null = null;
  private ws: WebSocket | null;
  private sessionId: string | null = null;
  private isConversationActive: boolean = false;
  private patientId: string | null = null;
  private _isFrozen: boolean = false;
  private suggestionsBuffer: string = "";
  private onMessage: (event: any) => void;

  constructor(
    webSocket: WebSocket | null,
    onMessage: (event: any) => void,
    patientId?: string,
  ) {
    this.ws = webSocket;
    this.onMessage = onMessage;
    if (patientId) {
      this.patientId = patientId;
    }
    console.log(
      "[RealTimeSuggestionsModule] WebSocket initialized:",
      !!webSocket,
      "for patient:",
      patientId,
    );
  }

  updateWebSocket(newWs: WebSocket | null) {
    const previousWs = this.ws;
    this.ws = newWs;

    if (previousWs !== newWs) {
      this.isConversationActive = false;
      this.currentConversationId = null;
      console.log(
        "[RealTimeSuggestionsModule] WebSocket updated, chart injection needed:",
        this.patientId && newWs
          ? !this.hasInjectedChart(this.patientId)
          : "unknown patient",
      );
    }
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    console.log("[RealTimeSuggestionsModule] Session ID set:", sessionId);
  }

  setPatientId(patientId: string) {
    this.patientId = patientId;
    console.log("[RealTimeSuggestionsModule] Patient ID set:", patientId);
  }

  setPatientChart(chart: any) {
    this.patientChart = chart;
    console.log(
      "[RealTimeSuggestionsModule] Chart data set for patient:",
      this.patientId,
    );
  }

  freeze() {
    this._isFrozen = true;
    console.log("[RealTimeSuggestionsModule] Suggestions frozen");
  }

  unfreeze() {
    this._isFrozen = false;
    console.log("[RealTimeSuggestionsModule] Suggestions unfrozen");
  }

  isFrozen(): boolean {
    return this._isFrozen;
  }

  private hasInjectedChart(patientId: string): boolean {
    if (!this.ws) return false;
    const injectedPatients =
      RealTimeSuggestionsModule._injectedChartWebSockets.get(this.ws);
    return injectedPatients ? injectedPatients.has(patientId) : false;
  }

  private markChartAsInjected(patientId: string): void {
    if (!this.ws) return;
    let injectedPatients =
      RealTimeSuggestionsModule._injectedChartWebSockets.get(this.ws);
    if (!injectedPatients) {
      injectedPatients = new Set<string>();
      RealTimeSuggestionsModule._injectedChartWebSockets.set(
        this.ws,
        injectedPatients,
      );
    }
    injectedPatients.add(patientId);
  }

  async startNewConversation(patientId: string) {
    console.log(
      "[RealTimeSuggestionsModule] Starting new conversation for patient:",
      patientId,
    );

    if (!this.ws) {
      console.error("[RealTimeSuggestionsModule] WebSocket not initialized");
      return;
    }

    if (this.isConversationActive) {
      console.log(
        "[RealTimeSuggestionsModule] Conversation already active, skipping",
      );
      return;
    }

    this.patientId = patientId;
    this.isConversationActive = true;
    this.currentConversationId = null;

    try {
      const needsChartInjection = !this.hasInjectedChart(patientId);

      if (needsChartInjection) {
        console.log(
          "[RealTimeSuggestionsModule] Fetching patient chart data for context injection",
        );
        const chartResponse = await fetch(`/api/patients/${patientId}/chart`);
        if (!chartResponse.ok) {
          throw new Error(
            `Failed to fetch patient chart: ${chartResponse.status}`,
          );
        }
        this.patientChart = await chartResponse.json();

        if (!this.sessionId) {
          console.log(
            "[RealTimeSuggestionsModule] Waiting for session to be established...",
          );
          await new Promise<void>((resolve, reject) => {
            const checkSession = () => {
              if (this.sessionId) {
                resolve();
              } else if (!this.ws) {
                reject(
                  new Error("WebSocket disconnected while waiting for session"),
                );
              } else {
                setTimeout(checkSession, 100);
              }
            };
            checkSession();
          });
        }

        await this.injectChartContext();
        this.markChartAsInjected(patientId);
      }

      await this.createConversation();
    } catch (error) {
      console.error(
        "[RealTimeSuggestionsModule] Error starting conversation:",
        error,
      );
      this.isConversationActive = false;
    }
  }

  private async injectChartContext() {
    if (!this.ws || !this.patientChart) return;

    const patientContext = this.formatPatientContext(this.patientChart);
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: patientContext,
          },
        ],
      },
    };

    console.log("[RealTimeSuggestionsModule] Injecting patient chart context");
    this.ws.send(JSON.stringify(message));
  }

  private formatPatientContext(chart: any): string {
    const context = `
PATIENT CONTEXT FOR AI ASSISTANT:
Patient: ${chart.firstName} ${chart.lastName}
Age: ${chart.age || "Unknown"}
Gender: ${chart.gender || "Unknown"}

${chart.activeProblems?.length > 0 ? `Active Problems: ${chart.activeProblems.join(", ")}` : ""}
${chart.criticalAlerts?.length > 0 ? `⚠️ Alerts: ${chart.criticalAlerts.join("; ")}` : ""}
${chart.allergies?.length > 0 ? `Allergies: ${chart.allergies.join(", ")}` : ""}
${chart.medications?.length > 0 ? `Current Medications: ${chart.medications.join(", ")}` : ""}

You are providing real-time clinical insights. Respond with concise, actionable bullet points with specific medication dosages and evidence-based guidance.
Format responses as bullet points (•) with clinical specificity.
`;
    return context;
  }

  private async createConversation() {
    if (!this.ws) return;

    const message = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ITALIAN ONLY, regardless of what language is used for input. NEVER respond in any language other than ITALIAN under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

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
      },
    };

    console.log(
      "[RealTimeSuggestionsModule] Creating conversation for suggestions",
    );
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle streaming GPT analysis from OpenAI Realtime API
   */
  handleGptAnalysis(data: any, metadata: EventMetadata): any {
    if (this._isFrozen) {
      console.log(
        "[RealTimeSuggestionsModule] Suggestions frozen, ignoring update",
      );
      return null;
    }

    console.log(
      "[RealTimeSuggestionsModule] Processing GPT analysis:",
      data.type,
    );

    // Handle streaming text deltas (like transcription)
    if (data.type === "response.text.delta") {
      const deltaText = data.delta || "";
      console.log("[RealTimeSuggestionsModule] Suggestion delta:", deltaText);

      // Accumulate suggestions like transcription deltas
      this.suggestionsBuffer += deltaText;

      // Filter out SOAP notes and orders from suggestions
      if (this.containsVisitSummary(this.suggestionsBuffer)) {
        console.log(
          "[RealTimeSuggestionsModule] Filtering out SOAP content from suggestions",
        );
        return null;
      }

      const event = {
        type: "ai_suggestions_delta",
        data: {
          delta: deltaText,
          buffer: this.suggestionsBuffer,
          patientId: metadata.patientId,
          sessionId: metadata.sessionId,
        },
      };

      this.onMessage(event);
      return event;
    }

    // Handle completion
    if (data.type === "response.text.done") {
      console.log(
        "[RealTimeSuggestionsModule] Suggestions completed, buffer length:",
        this.suggestionsBuffer.length,
      );

      const event = {
        type: "ai_suggestions_completed",
        data: {
          finalText: this.suggestionsBuffer,
          patientId: metadata.patientId,
          sessionId: metadata.sessionId,
        },
      };

      this.onMessage(event);

      // Reset for next conversation
      this.isConversationActive = false;
      this.currentConversationId = null;

      return event;
    }

    return null;
  }

  /**
   * Filter out SOAP notes and orders from appearing in suggestions
   */
  private containsVisitSummary(content: string): boolean {
    const visitSummaryPatterns = [
      "Chief Complaint:",
      "SUBJECTIVE:",
      "OBJECTIVE:",
      "ASSESSMENT:",
      "PLAN:",
      "Patient Visit Summary",
      "**SUBJECTIVE:**",
      "**OBJECTIVE:**",
      "**ASSESSMENT:**",
      "**PLAN:**",
    ];

    return visitSummaryPatterns.some((pattern) => content.includes(pattern));
  }

  /**
   * Reset suggestions buffer for new recording session
   */
  resetBuffer() {
    this.suggestionsBuffer = "";
    console.log("[RealTimeSuggestionsModule] Suggestions buffer reset");
  }

  /**
   * Get current suggestions buffer
   */
  getCurrentSuggestions(): string {
    return this.suggestionsBuffer;
  }

  /**
   * Configure OpenAI Realtime API session with comprehensive medical prompt
   */
  configureSession(): void {
    if (!this.ws) return;

    const sessionConfig = {
      type: "session.update",
      session: {
        instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ITALIAN ONLY, regardless of what language is used for input. NEVER respond in any language other than ITALIAN under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

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

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\\n) after answering a user question.`,
        model: "gpt-4o-mini-realtime-preview",
        modalities: ["text"], // Keep text-only for suggestions
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
          language: "en",
          prompt:
            "You MUST ALWAYS translate the speech into Italian ONLY, regardless of input language. NEVER include the original non-Italian text. ONLY OUTPUT Italian text. Translate all utterances, questions, and statements fully to ITALIAN without leaving any words in the original language.",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.3, // Lower threshold for better sensitivity
          prefix_padding_ms: 500, // Increased to catch more of the start of speech
          silence_duration_ms: 1000, // Increased to allow for natural pauses
          create_response: true,
        },
        tools: [],
        tool_choice: "none",
        temperature: 0.7,
        max_response_output_tokens: 1000,
      },
    };

    console.log(
      "[RealTimeSuggestionsModule] Configuring session with comprehensive medical prompt",
    );
    this.ws.send(JSON.stringify(sessionConfig));
  }
}
