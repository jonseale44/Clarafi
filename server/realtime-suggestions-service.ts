import WebSocket from 'ws';
import { medicalChartIndex } from './medical-chart-index-service';

interface PatientChart {
  patientId: number;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: string;
  activeProblems?: string[];
  criticalAlerts?: string[];
  allergies?: string[];
  medications?: string[];
}

interface SuggestionEvent {
  type: 'gpt.analysis.delta' | 'gpt.analysis.completed' | 'suggestions.frozen' | 'suggestions.unfrozen';
  delta?: string;
  content?: string;
  sessionId: string;
  frozen?: boolean;
}

/**
 * Consolidated Real-Time Suggestions Service
 * Based on proven external implementation with efficiency optimizations
 */
export class RealTimeSuggestionsService {
  private patientChart: PatientChart | null = null;
  private static _injectedChartWebSockets = new WeakMap<WebSocket, Set<string>>();
  private currentConversationId: string | null = null;
  private ws: WebSocket | null;
  private sessionId: string | null = null;
  private isConversationActive: boolean = false;
  private patientId: string | null = null;
  private _isFrozen: boolean = false;
  private suggestionsBuffer: string = "";
  private onMessage: (event: SuggestionEvent) => void;

  constructor(webSocket: WebSocket | null, onMessage: (event: SuggestionEvent) => void, patientId?: string) {
    this.ws = webSocket;
    this.onMessage = onMessage;
    if (patientId) {
      this.patientId = patientId;
    }
    console.log('[RealTimeSuggestions] Service initialized for patient:', patientId);
  }

  updateWebSocket(newWs: WebSocket | null) {
    const previousWs = this.ws;
    this.ws = newWs;

    if (previousWs !== newWs) {
      this.isConversationActive = false;
      this.currentConversationId = null;
      console.log('[RealTimeSuggestions] WebSocket updated, chart injection needed:', 
        this.patientId && newWs ? !this.hasInjectedChart(this.patientId) : 'unknown patient');
    }
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    console.log('[RealTimeSuggestions] Session ID set:', sessionId);
  }

  setPatientId(patientId: string) {
    this.patientId = patientId;
    console.log('[RealTimeSuggestions] Patient ID set:', patientId);
  }

  setPatientChart(chart: PatientChart) {
    this.patientChart = chart;
    console.log('[RealTimeSuggestions] Chart data set for patient:', this.patientId);
  }

  freeze() {
    this._isFrozen = true;
    console.log('[RealTimeSuggestions] Suggestions frozen');
    this.onMessage({
      type: 'suggestions.frozen',
      sessionId: this.sessionId || '',
      frozen: true
    });
  }

  unfreeze() {
    this._isFrozen = false;
    console.log('[RealTimeSuggestions] Suggestions unfrozen');
    this.onMessage({
      type: 'suggestions.unfrozen',
      sessionId: this.sessionId || '',
      frozen: false
    });
  }

  isFrozen(): boolean {
    return this._isFrozen;
  }

  private hasInjectedChart(patientId: string): boolean {
    if (!this.ws) return false;
    const injectedPatients = RealTimeSuggestionsService._injectedChartWebSockets.get(this.ws);
    return injectedPatients ? injectedPatients.has(patientId) : false;
  }

  private markChartAsInjected(patientId: string): void {
    if (!this.ws) return;
    let injectedPatients = RealTimeSuggestionsService._injectedChartWebSockets.get(this.ws);
    if (!injectedPatients) {
      injectedPatients = new Set<string>();
      RealTimeSuggestionsService._injectedChartWebSockets.set(this.ws, injectedPatients);
    }
    injectedPatients.add(patientId);
  }

  async startNewConversation(patientId: string) {
    console.log('[RealTimeSuggestions] Starting new conversation for patient:', patientId);

    if (!this.ws) {
      console.error('[RealTimeSuggestions] WebSocket not initialized');
      return;
    }

    if (this.isConversationActive) {
      console.log('[RealTimeSuggestions] Conversation already active, skipping');
      return;
    }

    this.patientId = patientId;
    this.isConversationActive = true;
    this.currentConversationId = null;

    try {
      const needsChartInjection = !this.hasInjectedChart(patientId);

      if (needsChartInjection) {
        console.log('[RealTimeSuggestions] Fetching patient chart data for context injection');
        const chartResponse = await fetch(`/api/patients/${patientId}/chart`);
        if (!chartResponse.ok) {
          throw new Error(`Failed to fetch patient chart: ${chartResponse.status}`);
        }
        this.patientChart = await chartResponse.json();

        if (!this.sessionId) {
          console.log('[RealTimeSuggestions] Waiting for session to be established...');
          await new Promise<void>((resolve, reject) => {
            const checkSession = () => {
              if (this.sessionId) {
                resolve();
              } else if (!this.ws) {
                reject(new Error('WebSocket disconnected while waiting for session'));
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
      console.error('[RealTimeSuggestions] Error starting conversation:', error);
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
        content: [{
          type: "input_text",
          text: patientContext
        }]
      }
    };

    console.log('[RealTimeSuggestions] Injecting patient chart context');
    this.ws.send(JSON.stringify(message));
  }

  private formatPatientContext(chart: PatientChart): string {
    const context = `
PATIENT CONTEXT FOR AI ASSISTANT:
Patient: ${chart.firstName} ${chart.lastName}
Age: ${chart.age || 'Unknown'}
Gender: ${chart.gender || 'Unknown'}

${chart.activeProblems?.length ? `Active Problems: ${chart.activeProblems.join(', ')}` : ''}
${chart.criticalAlerts?.length ? `⚠️ Alerts: ${chart.criticalAlerts.join('; ')}` : ''}
${chart.allergies?.length ? `Allergies: ${chart.allergies.join(', ')}` : ''}
${chart.medications?.length ? `Current Medications: ${chart.medications.join(', ')}` : ''}

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
        instructions: `You are a medical AI assistant providing real-time clinical insights. 
        
Provide clinical guidance based on conversation transcription. Format as bullet points:
• Specific medication dosages with starting dose, titration, max dose
• Evidence-based diagnostic or therapeutic recommendations  
• Red flags or advanced diagnostics when relevant
• Actionable clinical decision-making guidance

Each suggestion should be:
- Single line with bullet point (•)
- Specific and actionable
- Evidence-based medical guidance
- Include dosages, frequencies, monitoring parameters
- Highlight contraindications or precautions when relevant

Focus on immediate clinical utility for provider decision-making.`
      }
    };

    console.log('[RealTimeSuggestions] Creating conversation for suggestions');
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle streaming GPT analysis from OpenAI Realtime API
   * Based on proven external implementation with content filtering
   */
  handleGptAnalysis(data: any): SuggestionEvent | null {
    if (this._isFrozen) {
      console.log('[RealTimeSuggestions] Suggestions frozen, ignoring update');
      return null;
    }

    console.log('[RealTimeSuggestions] Processing GPT analysis:', data.type);

    // Handle streaming text deltas
    if (data.type === "response.text.delta") {
      const deltaText = data.delta || "";
      console.log('[RealTimeSuggestions] Suggestion delta:', deltaText);
      
      this.suggestionsBuffer += deltaText;
      
      // Filter out SOAP notes and orders from suggestions using proven patterns
      if (this.containsVisitSummary(this.suggestionsBuffer)) {
        console.log('[RealTimeSuggestions] Filtering out SOAP content from suggestions');
        return null;
      }

      const event: SuggestionEvent = {
        type: 'gpt.analysis.delta',
        delta: deltaText,
        content: this.suggestionsBuffer,
        sessionId: this.sessionId || ''
      };

      this.onMessage(event);
      return event;
    }

    // Handle completion
    if (data.type === "response.text.done") {
      console.log('[RealTimeSuggestions] Suggestions completed, buffer length:', this.suggestionsBuffer.length);
      
      const event: SuggestionEvent = {
        type: 'gpt.analysis.completed',
        content: this.suggestionsBuffer,
        sessionId: this.sessionId || ''
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
   * Based on proven external patterns
   */
  private containsVisitSummary(content: string): boolean {
    const visitSummaryPatterns = [
      "Patient Visit Summary", "PATIENT VISIT SUMMARY", "Visit Summary",
      "Chief Complaint:", "**Chief Complaint:**",
      "SUBJECTIVE:", "OBJECTIVE:", "ASSESSMENT:", "PLAN:",
      "**SUBJECTIVE:**", "**OBJECTIVE:**", "**ASSESSMENT:**", "**PLAN:**",
      "Lab: [", "Imaging: [", "Medication: [",
      "Labs:", "Imaging:", "Medications:",
      "Laboratory:", "Radiology:", "Prescriptions:"
    ];
    
    return visitSummaryPatterns.some(pattern => content.includes(pattern));
  }

  /**
   * Process transcription for suggestions
   */
  processTranscription(transcription: string): void {
    if (!this.ws || this._isFrozen) return;

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
   * Reset suggestions buffer for new recording session
   */
  resetBuffer() {
    this.suggestionsBuffer = "";
    console.log('[RealTimeSuggestions] Suggestions buffer reset');
  }

  /**
   * Get current suggestions buffer
   */
  getCurrentSuggestions(): string {
    return this.suggestionsBuffer;
  }

  /**
   * Get module status
   */
  getStatus(): { connected: boolean; frozen: boolean; sessionId: string | null } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      frozen: this._isFrozen,
      sessionId: this.sessionId
    };
  }

  /**
   * Close connection and cleanup
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}