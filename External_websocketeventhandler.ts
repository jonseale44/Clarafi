/**
 * WebSocketEventHandler manages different types of events from the OpenAI Realtime API
 */
import { TranscriptionModule } from "./modules/TranscriptionModule";
import { SOAPNoteModule } from "./modules/SOAPNoteModule";
import { RealTimeSuggestionsModule } from "./modules/RealTimeSuggestionsModule";
import { FunctionCallingModule } from "./modules/FunctionCallingModule";
import { DraftOrdersModule } from "./modules/DraftOrdersModule";
import { CPTCodesModule } from "./modules/CPTCodesModule_NEW";
import { DiagnosisCPTMapper } from "./modules/DiagnosisCPTMapper";
//import {VitalsModule} from './modules/VitalsModule'; // Added VitalsModule import

export class WebSocketEventHandler {
  public transcriptionModule: TranscriptionModule;
  public soapNoteModule: SOAPNoteModule;
  public suggestionsModule: RealTimeSuggestionsModule;
  public functionModule: FunctionCallingModule;
  public draftOrdersModule: DraftOrdersModule;
  public cptCodesModule: CPTCodesModule;
  public diagnosisCPTMapper: DiagnosisCPTMapper;
  //private vitalsModule: VitalsModule; // Added vitalsModule
  private _ws: WebSocket | null;

  // Track processed events to prevent duplication
  private processedEvents: Set<string> = new Set();
  // Track which content has already been handled
  private processedContent: Set<string> = new Set();

  /**
   * @param ws - WebSocket connection instance
   * @param onMessage - Callback for processed events
   */
  constructor(
    ws: WebSocket | null,
    private onMessage: (event: any) => void,
  ) {
    try {
      if (!ws) {
        throw new Error("WebSocket instance is required");
      }

      console.log(
        "[WebSocketEventHandler] Initializing with WebSocket state:",
        ws.readyState,
      );

      this._ws = ws;

      // Initialize specialized modules for different event types
      this.transcriptionModule = new TranscriptionModule(ws);
      this.soapNoteModule = new SOAPNoteModule(ws);
      this.suggestionsModule = new RealTimeSuggestionsModule(ws);
      this.functionModule = new FunctionCallingModule(ws);
      this.draftOrdersModule = new DraftOrdersModule(ws);
      this.cptCodesModule = new CPTCodesModule();
      this.diagnosisCPTMapper = new DiagnosisCPTMapper(ws);
      //this.vitalsModule = new VitalsModule(ws); // Initialize VitalsModule

      console.log("[WebSocketEventHandler] Modules initialized successfully");
    } catch (error: unknown) {
      console.error(
        "[WebSocketEventHandler] Error initializing modules:",
        error,
      );
      throw new Error(
        `Failed to initialize WebSocket modules: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Method to mark an event as processed to prevent duplicate processing
  markEventAsProcessed(eventId: string): void {
    if (eventId) {
      console.log(
        `[WebSocketEventHandler] 🔒 Marking event as processed: ${eventId}`,
      );
      this.processedEvents.add(eventId);
    }
  }

  // Check if an event has already been processed
  isEventProcessed(eventId: string): boolean {
    return eventId ? this.processedEvents.has(eventId) : false;
  }

  // Mark content as processed by its hash signature (prevents duplicates with different event IDs)
  markContentAsProcessed(content: string): void {
    if (content && content.length > 10) {
      // Use a short signature of the content as the key
      const contentSignature = content.substring(0, 50).trim();
      console.log(
        `[WebSocketEventHandler] 🔒 Marking content as processed: ${contentSignature}...`,
      );
      this.processedContent.add(contentSignature);
    }
  }

  // Check if content has already been processed
  isContentProcessed(content: string): boolean {
    if (!content || content.length <= 10) return false;
    const contentSignature = content.substring(0, 50).trim();
    return this.processedContent.has(contentSignature);
  }

  /**
   * Main event handler that routes different event types to appropriate modules
   * Features:
   * - Event type detection and routing
   * - Error handling
   * - Debug logging
   */
  handleEvent(data: any) {
    // Filter out noisy events
    const noisyEvents = [
      "response.content_part.done",
      "response.text.delta",
      "response.output_item.done",
    ];

    if (!noisyEvents.includes(data.type)) {
      console.log("[WebSocket Event]:", data.type);
    }

    // ✨ NEW: Check if this event has already been processed
    if (data.event_id && this.isEventProcessed(data.event_id)) {
      console.log(
        `[WebSocketEventHandler] ⚠️ Skipping already processed event: ${data.event_id}`,
      );
      return;
    }

    // ✨ NEW: Check for duplicate content (common with similar but distinct event IDs)
    const content = data.delta || data.text || "";
    if (content && content.length > 10 && this.isContentProcessed(content)) {
      console.log(
        "[WebSocketEventHandler] ⚠️ Skipping content that has already been processed",
      );
      return;
    }

    // Track token usage for specific event types without triggering conversation restarts
    if (
      data.type === "transcription.completed" ||
      data.type === "conversation.item.input_audio_transcription.completed"
    ) {
      console.log(`[Transcription Completed] Transcript: ${data.transcript}`);
      if (data.usage) {
        this.onMessage({
          type: "token.usage",
          usage: {
            ...data.usage,
            source: "transcription",
            metadata: { type: "transcription" },
          },
        });
      }
    } else if (
      data.type === "response.text.done" &&
      data.response?.metadata?.type === "soap_note"
    ) {
      console.group("[WebSocketEventHandler] 📋 COMPLETED SOAP NOTE DETAILS");
      console.log("Response ID:", data.response.id || "N/A");
      console.log("Content Length:", data.text?.length || "N/A");
      console.log(
        "Content Preview:",
        data.text?.substring(0, 100) + "..." || "N/A",
      );
      console.log("Has Usage Data:", !!data.response.usage);

      if (data.response.usage) {
        console.log(
          "Token Usage:",
          JSON.stringify(data.response.usage, null, 2),
        );
        this.onMessage({
          type: "token.usage",
          usage: {
            ...data.response.usage,
            source: "soap_note",
            metadata: { type: "soap_note" },
          },
        });
      }

      console.log(
        "Full Response Object Structure:",
        JSON.stringify(
          Object.keys(data.response).reduce((acc, key) => {
            // Exclude the actual text content to avoid huge logs
            if (key === "text") {
              acc[key] = `[${data.text?.length || 0} characters]`;
            } else {
              acc[key] = data.response[key];
            }
            return acc;
          }, {}),
          null,
          2,
        ),
      );
      console.groupEnd();
    }
    // Track tokens for all response types that include usage data
    else if (
      data.type === "response.text.done" &&
      data.response?.metadata?.type === "suggestions"
    ) {
      // Only track token usage without triggering conversation actions
      if (data.response.usage) {
        this.onMessage({
          type: "token.usage",
          usage: {
            ...data.response.usage,
            source: "suggestions",
            metadata: { type: "suggestions" },
          },
        });
      }
    }
    // Handle CPT codes specifically
    else if (
      data.type === "response.text.done" &&
      data.response?.metadata?.type === "cpt_codes"
    ) {
      console.log("[WebSocketEventHandler] Processing CPT codes response");
      // Process the CPT codes with the module
      const event = this.cptCodesModule.handleGptResponse(data);
      if (event) {
        this.onMessage(event);
      }

      // Track token usage for CPT code extraction
      if (data.response.usage) {
        this.onMessage({
          type: "token.usage",
          usage: {
            ...data.response.usage,
            source: "cpt_codes",
            metadata: { type: "cpt_codes" },
          },
        });
      }
    }

    // Route events to appropriate handlers
    if (this.transcriptionModule.isTranscriptionEvent(data)) {
      // Handle real-time speech transcription
      const event = this.transcriptionModule.handleTranscriptionEvent(data);

      // Track token usage for completed transcriptions
      if (data.type.includes("completed")) {
        const tokenUsage = {
          input_tokens: data.transcript?.length || 0, // Estimate input tokens from transcript length
          output_tokens: 0, // Transcription has no output tokens
          total_tokens: data.transcript?.length || 0,
          source: "transcription",
          metadata: { type: "transcription" },
        };

        this.onMessage({
          type: "token.usage",
          usage: tokenUsage,
        });
      }

      this.onMessage(event);
    } else if (data.type === "session.updated") {
      // Handle session configuration updates
      console.log("[Session] Updated configuration:", {
        instructions: data.session?.instructions,
        modalities: data.session?.modalities,
      });
    } else if (data.type === "response.audio_transcript.delta") {
      // Process real-time AI analysis and suggestions
      const event = this.suggestionsModule.handleGptAnalysis(data);
      this.onMessage(event);
    } else if (
      data.type === "response.text.delta" ||
      data.type === "response.text.done"
    ) {
      // Enhanced logging for event metadata and content
      console.group("[WebSocketEventHandler] 🔍 TEXT EVENT ROUTING");
      console.log(`Event Type: ${data.type}`);
      console.log(
        `Metadata Type: ${data.response?.metadata?.type || "MISSING"}`,
      );
      console.log(`Has Response Object: ${!!data.response}`);
      console.log(
        `Delta Content Preview: ${data.delta ? `"${data.delta.substring(0, 30)}${data.delta.length > 30 ? "..." : ""}"` : "N/A"}`,
      );
      console.log(
        `Text Content Preview: ${data.text ? `"${data.text.substring(0, 30)}${data.text.length > 30 ? "..." : ""}"` : "N/A"}`,
      );

      // Additional contextual data that might help diagnose routing issues
      if (data.response) {
        console.log("Response ID:", data.response.id || "N/A");
        console.log("Content Type:", data.content_type || "N/A");
        console.log("Event ID:", data.event_id || "N/A");

        // Detailed metadata inspection
        if (data.response.metadata) {
          console.log(
            "Full Metadata:",
            JSON.stringify(data.response.metadata, null, 2),
          );
        } else {
          console.log(
            "⚠️ NO METADATA OBJECT - This is likely causing the routing issue",
          );
        }
      }
      console.groupEnd();

      // Use strict type checking to route events correctly
      if (
        data.response?.metadata?.type === "soap_note" &&
        this.soapNoteModule
      ) {
        console.log("[WebSocketEventHandler] ✅ Processing SOAP note event");
        const event = this.soapNoteModule.handleSoapNoteEvent(data);

        // Mark this event as processed to prevent duplicate handling
        if (data.event_id) {
          this.markEventAsProcessed(data.event_id);
        }
        const content = data.text || data.delta || "";
        if (content && content.length > 10) {
          this.markContentAsProcessed(content);
        }

        console.log(
          "[WebSocketEventHandler] SOAP event produced:",
          event?.type || "NULL",
        );
        if (event) this.onMessage(event);
      } else if (
        data.response?.metadata?.type === "draft_orders" &&
        this.draftOrdersModule
      ) {
        console.log("[WebSocketEventHandler] Processing draft orders event");
        const event = this.draftOrdersModule.handleGptResponse(
          data,
          this.onMessage,
        );

        // Mark this event as processed to prevent duplicate handling
        if (data.event_id) {
          this.markEventAsProcessed(data.event_id);
        }
        const content = data.text || data.delta || "";
        if (content && content.length > 10) {
          this.markContentAsProcessed(content);
        }

        if (event) this.onMessage(event);
      } else if (
        data.response?.metadata?.type === "cpt_codes" &&
        this.cptCodesModule
      ) {
        console.log("[WebSocketEventHandler] Processing CPT codes event");
        const event = this.cptCodesModule.handleGptResponse(
          data,
          this.onMessage,
        );

        // Mark this event as processed to prevent duplicate handling
        if (data.event_id) {
          this.markEventAsProcessed(data.event_id);
        }
        const content = data.text || data.delta || "";
        if (content && content.length > 10) {
          this.markContentAsProcessed(content);
        }

        if (event) this.onMessage(event);
      } else if (
        data.response?.metadata?.type === "suggestions" &&
        this.suggestionsModule
      ) {
        console.log("[WebSocketEventHandler] Processing suggestions event");
        const event = this.suggestionsModule.handleGptAnalysis(data);

        // Mark this event as processed to prevent duplicate handling
        if (data.event_id) {
          this.markEventAsProcessed(data.event_id);
        }
        const content = data.text || data.delta || "";
        if (content && content.length > 10) {
          this.markContentAsProcessed(content);
        }

        this.onMessage(event);
      } else if (this.suggestionsModule && !data.response?.metadata?.type) {
        // Detect if this might be a SOAP note or patient visit summary based on content structure
        let content = data.delta || data.text || "";

        // Log full content for debugging & save a snapshot to the console for analysis
        console.log("[WebSocketEventHandler] 🛑 CONTENT DIAGNOSTIC 🛑");
        console.log("====== FULL EVENT DATA ======");
        console.log(JSON.stringify(data, null, 2));
        console.log("====== CONTENT ======");
        console.log(content);
        console.log("==========================");

        // SUPER AGGRESSIVE PREVENTION: Multiple checks for ANY form of Visit Summary
        const visitSummaryPatterns = [
          "Patient Visit Summary",
          "PATIENT VISIT SUMMARY",
          "Visit Summary",
          "VISIT SUMMARY",
          "Chief Complaint:",
          "**Chief Complaint:**",
          "History of Present Illness:",
          "**History of Present Illness:**",
        ];

        // Check if ANY of the patterns match
        const containsVisitSummary = visitSummaryPatterns.some((pattern) =>
          content.includes(pattern),
        );

        if (containsVisitSummary) {
          console.log(
            "[WebSocketEventHandler] 🔍 VISIT SUMMARY DETECTED - Routing to SOAP note module",
          );
          console.log(
            "[WebSocketEventHandler] 🔍 Matched pattern detected in content",
          );

          // Inject the missing metadata before passing to SOAP module
          const enrichedData = {
            ...data,
            response: {
              ...data.response,
              metadata: { type: "soap_note" },
            },
          };

          const event = this.soapNoteModule.handleSoapNoteEvent(enrichedData);

          // Mark this content as processed to prevent duplication
          if (data.event_id) {
            this.markEventAsProcessed(data.event_id);
          }
          this.markContentAsProcessed(content);

          if (event) this.onMessage(event);

          // Important: Return early to avoid dual processing
          return;
        }

        // More comprehensive SOAP detection for other cases
        const isSoapNoteLikely =
          content.includes("**SUBJECTIVE:**") ||
          content.includes("**OBJECTIVE:**") ||
          content.includes("**ASSESSMENT:**") ||
          content.includes("**PLAN:**") ||
          content.includes("SUBJECTIVE:") ||
          content.includes("OBJECTIVE:") ||
          content.includes("ASSESSMENT:") ||
          content.includes("PLAN:") ||
          content.includes("**Chief Complaint:**") ||
          content.includes("Chief Complaint:") ||
          (content.toUpperCase().includes("SUBJECTIVE:") &&
            content.toUpperCase().includes("OBJECTIVE:") &&
            content.toUpperCase().includes("ASSESSMENT") &&
            content.includes("PLAN"));

        console.group("[WebSocketEventHandler] 🔍 UNTYPED EVENT ANALYSIS");
        console.log(
          "Content preview:",
          content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        );
        console.log("SOAP note format detected:", isSoapNoteLikely);
        console.groupEnd();

        if (isSoapNoteLikely && this.soapNoteModule) {
          console.log(
            "[WebSocketEventHandler] ✅ Routing untyped event to SOAP note module based on content analysis",
          );

          // Check for CPT code JSON and extract it before passing to SOAP module
          if (
            this.cptCodesModule &&
            content.includes('"metadata"') &&
            content.includes('"cpt_codes"')
          ) {
            console.log(
              "[WebSocketEventHandler] Found CPT codes in SOAP note, extracting...",
            );

            // Extract CPT codes from the content using multiple pattern checks
            const cptJsonPatterns = [
              // Full JSON object with metadata and content
              /\{(?:\s|\n)*"metadata"(?:\s|\n)*:(?:\s|\n)*\{(?:\s|\n)*"type"(?:\s|\n)*:(?:\s|\n)*"cpt_codes"[^}]*\}(?:\s|\n)*,?(?:\s|\n)*"content"(?:\s|\n)*:(?:\s|\n)*\[(?:\s|\n)*\{[^]*?\}(?:\s|\n)*\](?:\s|\n)*\}/g,

              // Simpler JSON object that contains cpt_codes
              /\{(?:\s|\n)*"metadata"(?:\s|\n)*:(?:\s|\n)*\{(?:\s|\n)*"type"(?:\s|\n)*:(?:\s|\n)*"cpt_codes"[^}]*\}[^}]*\}/g,

              // Any JSON block that contains both "code" and "description" fields near CPT Codes
              /CPT Codes:?\s*\{(?:[^}]*"code"[^}]*"description"[^}]*|[^}]*"description"[^}]*"code"[^}]*)\}/gi,
            ];

            // Find all instances of CPT code JSON blocks and extract their codes
            let tempContent = content;
            let allParsedCodes: any[] = [];
            let foundCptJsonBlocks = false;

            for (const pattern of cptJsonPatterns) {
              const matches = tempContent.match(pattern);

              if (matches) {
                foundCptJsonBlocks = true;

                matches.forEach((match) => {
                  const parsedCodes = this.cptCodesModule.parseCPTCodes(match);
                  if (parsedCodes && parsedCodes.length > 0) {
                    allParsedCodes = [...allParsedCodes, ...parsedCodes];

                    // Replace this specific JSON block with a readable format
                    const codesDesc = parsedCodes
                      .map(
                        (c) =>
                          `${c.code} (${c.description || "Unknown procedure"})`,
                      )
                      .join(", ");
                    tempContent = tempContent.replace(
                      match,
                      `CPT Codes: ${codesDesc}`,
                    );
                  } else {
                    // If parsing failed, try to extract simple code patterns
                    const simpleCodeMatch = match.match(/"code":\s*"([^"]+)"/);
                    const simpleDescMatch = match.match(
                      /"description":\s*"([^"]+)"/,
                    );

                    if (simpleCodeMatch && simpleDescMatch) {
                      const code = simpleCodeMatch[1];
                      const description = simpleDescMatch[1];
                      tempContent = tempContent.replace(
                        match,
                        `CPT Codes: ${code} (${description})`,
                      );
                    } else if (simpleCodeMatch) {
                      const code = simpleCodeMatch[1];
                      tempContent = tempContent.replace(
                        match,
                        `CPT Codes: ${code}`,
                      );
                    } else {
                      // Only use fallback if we truly can't extract anything
                      tempContent = tempContent.replace(
                        match,
                        `CPT Codes: (see billing panel for details)`,
                      );
                    }
                  }
                });
              }
            }

            if (foundCptJsonBlocks) {
              console.log(
                `[WebSocketEventHandler] Successfully extracted ${allParsedCodes.length} CPT codes from SOAP note`,
              );

              // Process each code
              allParsedCodes.forEach((code) => {
                this.cptCodesModule.handleCPTCodeFound({
                  code: code.code,
                  description: code.description || `CPT code ${code.code}`,
                  complexity: code.complexity || "medium",
                  source: "soap-note",
                });
              });

              // Update the data object with the cleaned content
              content = tempContent;
              if (data.text) data.text = content;
              if (data.delta && data.delta.text) data.delta.text = content;
            }
          }

          // Inject the missing metadata before passing to SOAP module
          const enrichedData = {
            ...data,
            response: {
              ...data.response,
              metadata: { type: "soap_note" },
            },
          };
          const event = this.soapNoteModule.handleSoapNoteEvent(enrichedData);

          // Mark this content as processed to prevent duplication
          if (data.event_id) {
            this.markEventAsProcessed(data.event_id);
          }
          this.markContentAsProcessed(content);

          if (event) this.onMessage(event);

          // Important: Return early to avoid dual processing
          return;
        } else {
          // This is expected for regular GPT suggestions - it's not an error
          console.log(
            "[WebSocketEventHandler] Processing untyped event as GPT suggestion (normal behavior)",
          );
          const event = this.suggestionsModule.handleGptAnalysis(data);

          // Mark this content as processed to prevent duplication
          if (data.event_id) {
            this.markEventAsProcessed(data.event_id);
          }
          if (content && content.length > 10) {
            this.markContentAsProcessed(content);
          }

          this.onMessage(event);
        }
      } else if (data.type === "vitals.updated" && this.vitalsModule) {
        // Added vitals event handling
        const event = this.vitalsModule.handleVitalsUpdate(data); // Added vitals handling
        if (event) this.onMessage(event);
      } else {
        // Log any other text event types
        console.warn(
          "[WebSocketEventHandler] Unhandled text event type:",
          data.response?.metadata?.type || "unknown",
        );
      }
    } else if (data.type === "error") {
      // Handle error events
      console.error("[WebSocket] Error event received:", data.error);
    } else if (
      data.type === "input_audio_buffer.speech_started" ||
      data.type === "response.created" ||
      data.type === "rate_limits.updated" ||
      data.type === "response.output_item.added" ||
      data.type === "conversation.item.created" ||
      data.type === "response.content_part.added" ||
      data.type === "response.content_part.done" ||
      data.type === "response.output_item.done"
    ) {
      // These are expected events, no special handling needed
      return;
    } else if (
      data.type === "response.done" &&
      data.response?.metadata?.type === "soap_note"
    ) {
      // Handle soap note completion events
      console.group(
        "[WebSocketEventHandler] 📋 PROCESSING SOAP NOTE RESPONSE.DONE EVENT",
      );
      console.log("Response ID:", data.response.id || "N/A");
      console.log("Has output array:", !!data.response?.output);

      // Extract the SOAP note text from the response output
      const soapNoteText = data.response?.output?.[0]?.content?.[0]?.text || "";
      console.log("Content Length:", soapNoteText.length);
      console.log("Content Preview:", soapNoteText.substring(0, 100) + "...");

      // Track token usage if available
      if (data.response?.usage) {
        console.log(
          "Token Usage:",
          JSON.stringify(data.response.usage, null, 2),
        );
        this.onMessage({
          type: "token.usage",
          usage: {
            ...data.response.usage,
            source: "soap_note",
            metadata: { type: "soap_note" },
          },
        });
      }

      console.groupEnd();

      // Process the SOAP note through the appropriate module
      if (this.soapNoteModule) {
        console.log(
          "[WebSocketEventHandler] ✅ Routing response.done SOAP note to SOAPNoteModule",
        );
        console.log(
          "[WebSocketEventHandler] 🔍 SOAP Note Preview:",
          soapNoteText.substring(0, 100) + "...",
        );

        // Create a compatible format for the SOAP note module
        const enrichedData = {
          ...data,
          type: "response.text.done", // Convert to a format SOAPNoteModule expects
          text: soapNoteText, // Add the text field expected by SOAPNoteModule
        };

        const event = this.soapNoteModule.handleSoapNoteEvent(enrichedData);

        // Mark this SOAP note as processed
        if (data.event_id) {
          this.markEventAsProcessed(data.event_id);
        }
        if (soapNoteText) {
          this.markContentAsProcessed(soapNoteText);
        }

        if (event) {
          console.log(
            "[WebSocketEventHandler] SOAPNoteModule produced event:",
            event.type,
          );
          console.log(
            "[WebSocketEventHandler] This content will now appear in the SOAP note section, not GPT suggestions",
          );
          this.onMessage(event);
        } else {
          console.warn(
            "[WebSocketEventHandler] ⚠️ SOAPNoteModule did not produce an event for this SOAP note",
          );
        }
      }
    } else if (
      data.type === "response.done" &&
      data.response?.metadata?.type === "cpt_codes"
    ) {
      // Handle CPT codes response - delegating to CPTCodesModule similar to draft orders pattern
      console.log("[WebSocketEventHandler] Processing CPT codes response");

      // Extract CPT codes text from the response
      const cptCodeText = data.response?.output?.[0]?.content?.[0]?.text;
      if (cptCodeText) {
        console.log(
          "[WebSocketEventHandler] Delegating CPT codes processing to module:",
          cptCodeText.substring(0, 100) + "...",
        );

        // Mark this specific message as already processed to prevent duplication
        this.markEventAsProcessed(data.event_id);
        this.markContentAsProcessed(cptCodeText);

        // Delegate processing to the CPTCodesModule
        if (this.cptCodesModule) {
          const event = this.cptCodesModule.handleGptResponse(
            {
              response: data.response,
              text: cptCodeText,
            },
            this.onMessage,
          );

          if (event) {
            console.log(
              "[WebSocketEventHandler] CPT codes module produced event:",
              event,
            );
            this.onMessage(event);
          }
        } else {
          console.error(
            "[WebSocketEventHandler] CPT codes module not available",
          );
        }
      } else {
        console.warn(
          "[WebSocketEventHandler] No text content in CPT codes response",
        );
      }
    } else if (
      data.type === "response.done" &&
      data.response?.metadata?.type === "draft_orders"
    ) {
      // Handle draft orders completion without triggering chart updates
      const draftOrderText = data.response?.output?.[0]?.content?.[0]?.text;
      if (draftOrderText) {
        console.log(
          "[WebSocketEventHandler] Processing draft orders:",
          draftOrderText,
        );
        // CRITICAL FIX: Prevent this content from going to the AI-Insights section
        // Mark this specific message as already processed
        this.markEventAsProcessed(data.event_id);

        const orders = this.draftOrdersModule.parseDraftOrders(draftOrderText);
        if (orders?.length) {
          this.draftOrdersModule.saveDraftOrders(orders, this.onMessage);
        }
      }
    } else if (data.type.includes("function_call")) {
      // Handle AI function calls
      const event = this.functionModule.handleFunctionCall(data);
      if (event) this.onMessage(event);
    } else if (data.type === "response.draft_orders") {
      console.log("[WebSocketEventHandler] Received draft orders response:", {
        type: data.type,
        hasResponse: !!data.response,
        hasOutput: !!data.response?.output,
      });
      try {
        this.draftOrdersModule.handleGptResponse(data, this.onMessage);
        console.log(
          "[WebSocketEventHandler] Draft orders processed successfully",
        );
      } catch (error) {
        console.error(
          "[WebSocketEventHandler] Error processing draft orders:",
          error,
        );
      }
    } else {
      // Log unhandled event types
      console.warn("[Unhandled WebSocket Event Type]:", data.type, data);
    }
  }
}
