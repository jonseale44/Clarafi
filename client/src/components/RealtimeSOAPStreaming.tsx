/**
 * Real-time SOAP Streaming Component
 * 
 * Streams SOAP note updates incrementally during conversation using OpenAI Realtime API
 * Maintains existing single SOAP note structure and endpoints
 * Eliminates the post-recording bottleneck by building SOAP note in real-time
 */

import React, { 
  useRef, 
  useEffect, 
  useImperativeHandle, 
  forwardRef 
} from 'react';
import { useToast } from '@/hooks/use-toast';

interface RealtimeSOAPStreamingProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onSOAPUpdate: (soapNote: string) => void;
  autoStart?: boolean;
}

export interface RealtimeSOAPStreamingRef {
  startRealtimeStreaming: () => void;
  stopRealtimeStreaming: () => void;
}

export const RealtimeSOAPStreaming = forwardRef<
  RealtimeSOAPStreamingRef,
  RealtimeSOAPStreamingProps
>(
  (
    {
      patientId,
      encounterId,
      isRecording,
      transcription,
      onSOAPUpdate,
      autoStart = false,
    },
    ref,
  ) => {
    const wsRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string>(
      `realtime_soap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );
    const lastTranscriptionRef = useRef("");
    const soapBufferRef = useRef<string>("");
    const isActiveRef = useRef(false);
    const { toast } = useToast();

    // Expose methods to parent component  
    useImperativeHandle(ref, () => ({
      startRealtimeStreaming,
      stopRealtimeStreaming,
    }));

    const startRealtimeStreaming = async () => {
      if (isActiveRef.current) return;

      console.log(
        `🩺 [RealtimeSOAP] Starting real-time SOAP streaming for session ${sessionIdRef.current}`,
      );

      try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        // Step 1: Create session for real-time SOAP streaming
        console.log("🔧 [RealtimeSOAP] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview",
          modalities: ["text"],
          instructions: `You are a medical documentation assistant that creates comprehensive SOAP notes from patient-provider conversations in real-time.

CRITICAL INSTRUCTIONS:
- Generate a complete, professional SOAP note in the EXACT format used in the current system
- Update and expand the SOAP note progressively as the conversation continues
- Maintain the existing single SOAP note structure with proper formatting
- Use the same formatting style as the current SOAP note implementation

SOAP NOTE FORMAT (EXACT MATCH):
**SUBJECTIVE:**
[Patient-reported symptoms, concerns, history - use bullet points for clarity]

**OBJECTIVE:**
Vitals: [List all vital signs in single line format: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]]

Physical Exam:
[Use the standard template format with modifications for abnormal findings]

**ASSESSMENT:**
[Clinical impressions, diagnoses, differential diagnoses]

**PLAN:**
[Treatment plans, orders, follow-up instructions]

RESPONSE BEHAVIOR:
- Return the COMPLETE updated SOAP note with each response
- Progressively build and refine the note as more information becomes available
- Maintain professional medical documentation standards
- Only include information explicitly mentioned in the conversation`,
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.3,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          },
        };

        const sessionResponse = await fetch(
          "https://api.openai.com/v1/realtime/sessions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
            body: JSON.stringify(sessionConfig),
          },
        );

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          console.log("❌ [RealtimeSOAP] Session creation failed:", error);
          throw new Error(
            `Failed to create session: ${error.message || "Unknown error"}`,
          );
        }

        const session = await sessionResponse.json();
        console.log("✅ [RealtimeSOAP] Session created:", session.id);

        // Step 2: Connect via WebSocket
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview",
        });

        const ws = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        wsRef.current = ws;

        ws.onopen = () => {
          console.log("🌐 [RealtimeSOAP] Connected to OpenAI Realtime API");
          isActiveRef.current = true;

          // Configure session for SOAP streaming
          const sessionUpdateMessage = {
            type: "session.update",
            session: {
              instructions: `You are a medical documentation assistant that creates comprehensive SOAP notes from patient-provider conversations in real-time.

CRITICAL INSTRUCTIONS:
- Generate a complete, professional SOAP note in the EXACT format used in the current system
- Update and expand the SOAP note progressively as the conversation continues
- Maintain the existing single SOAP note structure with proper formatting
- Use the same formatting style as the current SOAP note implementation

SOAP NOTE FORMAT (EXACT MATCH):
**SUBJECTIVE:**
[Patient-reported symptoms, concerns, history - use bullet points for clarity]

**OBJECTIVE:**
Vitals: [List all vital signs in single line format: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]]

Physical Exam:
[Use the standard template format with modifications for abnormal findings]

**ASSESSMENT:**
[Clinical impressions, diagnoses, differential diagnoses]

**PLAN:**
[Treatment plans, orders, follow-up instructions]

RESPONSE BEHAVIOR:
- Return the COMPLETE updated SOAP note with each response
- Progressively build and refine the note as more information becomes available
- Maintain professional medical documentation standards
- Only include information explicitly mentioned in the conversation`,
              modalities: ["text"],
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
                language: "en",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 200,
                create_response: true,
              },
            },
          };

          ws.send(JSON.stringify(sessionUpdateMessage));

          console.log("✅ [RealtimeSOAP] Real-time SOAP streaming started");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleRealtimeMessage(message);
          } catch (error) {
            console.error(
              "❌ [RealtimeSOAP] Error parsing WebSocket message:",
              error,
            );
          }
        };

        ws.onerror = (error) => {
          console.error("❌ [RealtimeSOAP] WebSocket error:", error);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to real-time SOAP service",
          });
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 [RealtimeSOAP] WebSocket closed:",
            event.code,
            event.reason,
          );
          isActiveRef.current = false;
        };
      } catch (error) {
        console.error(
          "❌ [RealtimeSOAP] Error starting real-time SOAP:",
          error,
        );
        isActiveRef.current = false;

        toast({
          variant: "destructive",
          title: "SOAP Streaming Failed",
          description: "Failed to start real-time SOAP streaming",
        });
      }
    };

    const stopRealtimeStreaming = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      isActiveRef.current = false;

      console.log(
        `🛑 [RealtimeSOAP] Real-time SOAP streaming stopped for session ${sessionIdRef.current}`,
      );
    };

    const processTranscriptionUpdate = (newTranscription: string) => {
      if (!wsRef.current || !isActiveRef.current) return;

      console.log(`📝 [RealtimeSOAP] Processing transcription update`);

      // Get patient context for SOAP generation
      const fetchPatientContext = async () => {
        try {
          const response = await fetch(`/api/patients/${patientId}/chart`);
          if (response.ok) {
            const chart = await response.json();
            return chart;
          }
        } catch (error) {
          console.warn("Failed to fetch patient context:", error);
        }
        return null;
      };

      fetchPatientContext().then(patientChart => {
        // Build comprehensive context for SOAP generation
        const patientContext = patientChart ? `
Patient Context:
- Allergies: ${patientChart.allergies?.map((a: any) => a.allergen).join(", ") || "None documented"}
- Current Medications: ${patientChart.currentMedications?.map((m: any) => m.name).join(", ") || "None documented"}
- Active Problems: ${patientChart.activeProblems?.map((p: any) => p.description).join(", ") || "None documented"}
` : "";

        // Send transcription to OpenAI for SOAP generation
        const contextMessage = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${patientContext}

CONVERSATION TRANSCRIPT:
${newTranscription}

Generate a comprehensive SOAP note based on this conversation transcript. Return the complete SOAP note with all sections formatted exactly as specified.`,
              },
            ],
          },
        };

        wsRef.current.send(JSON.stringify(contextMessage));

        const responseRequest = {
          type: "response.create",
          response: {
            modalities: ["text"],
            instructions: `Generate a complete SOAP note in the exact format specified. Include all sections (Subjective, Objective, Assessment, Plan) with proper formatting. Return the complete SOAP note, not just sections.`,
          },
        };

        wsRef.current.send(JSON.stringify(responseRequest));
      });
    };

    const formatSoapNoteContent = (content: string) => {
      if (!content) return "";

      return (
        content
          // Convert markdown bold to HTML
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          // Convert single line breaks to HTML breaks
          .replace(/\n/g, "<br/>")
          // Aggressively clean up multiple consecutive breaks (2 or more)
          .replace(/(<br\/>){2,}/g, "<br/>")
          // Ensure SOAP headers have proper spacing before them but not excessive spacing after
          .replace(/(<strong>SUBJECTIVE:<\/strong>)/g, "<br/>$1")
          .replace(/(<strong>OBJECTIVE:<\/strong>)/g, "<br/>$1")
          .replace(/(<strong>ASSESSMENT.*?:<\/strong>)/g, "<br/>$1")
          .replace(/(<strong>PLAN:<\/strong>)/g, "<br/>$1")
          .replace(/(<strong>ORDERS:<\/strong>)/g, "<br/>$1")
          // Remove leading breaks
          .replace(/^(<br\/>)+/, "")
      );
    };

    const handleRealtimeMessage = (message: any) => {
      console.log(`📨 [RealtimeSOAP] OpenAI message type: ${message.type}`);

      switch (message.type) {
        case "session.created":
          console.log("✅ [RealtimeSOAP] Session created successfully");
          break;

        case "response.text.delta":
          // Handle streaming text responses - build SOAP note incrementally
          const deltaText = message.delta || "";
          soapBufferRef.current += deltaText;
          
          // Format the SOAP note with the same formatting as the current system
          const formattedSOAP = formatSoapNoteContent(soapBufferRef.current);
          
          // Update SOAP note in real-time as it streams with proper formatting
          onSOAPUpdate(formattedSOAP);
          
          console.log("📝 [RealtimeSOAP] Streaming SOAP update:", deltaText.substring(0, 50));
          break;

        case "response.text.done":
          // Complete response received - finalize SOAP note
          const responseText = message.text || "";
          console.log("✅ [RealtimeSOAP] Complete SOAP note generated");
          
          // Update with final SOAP note using same formatting
          soapBufferRef.current = responseText;
          const finalFormattedSOAP = formatSoapNoteContent(responseText);
          onSOAPUpdate(finalFormattedSOAP);
          break;

        case "error":
          console.error("❌ [RealtimeSOAP] OpenAI error:", message.error);
          toast({
            variant: "destructive",
            title: "SOAP Generation Error",
            description: message.error?.message || "Unknown error occurred",
          });
          break;

        default:
          console.log(`📨 [RealtimeSOAP] Unhandled message type: ${message.type}`);
      }
    };

    // Process transcription updates when they change
    useEffect(() => {
      if (transcription && transcription !== lastTranscriptionRef.current) {
        lastTranscriptionRef.current = transcription;
        if (isActiveRef.current && transcription.length > 100) {
          // Debounce transcription updates to avoid overwhelming the API
          const debounceTimer = setTimeout(() => {
            processTranscriptionUpdate(transcription);
          }, 2000);

          return () => clearTimeout(debounceTimer);
        }
      }
    }, [transcription]);

    // Auto-start when recording begins
    useEffect(() => {
      if (autoStart && isRecording && !isActiveRef.current) {
        startRealtimeStreaming();
      } else if (!isRecording && isActiveRef.current) {
        stopRealtimeStreaming();
      }
    }, [isRecording, autoStart]);

    // This component has no UI - it's purely for streaming functionality
    return null;
  },
);

RealtimeSOAPStreaming.displayName = "RealtimeSOAPStreaming";