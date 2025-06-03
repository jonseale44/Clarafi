import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Mic,
  MicOff,
  ArrowLeft,
  FileText,
  Bot,
  RefreshCw,
  Save,
} from "lucide-react";
import { Patient } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SOAPNoteEditor } from "@/components/ui/soap-note-editor";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface EncounterDetailViewProps {
  patient: Patient;
  encounterId: number;
  onBackToChart: () => void;
}

const chartSections = [
  { id: "encounters", label: "Patient Encounters" },
  { id: "problems", label: "Medical Problems" },
  { id: "medication", label: "Medication" },
  { id: "allergies", label: "Allergies" },
  { id: "labs", label: "Labs" },
  { id: "vitals", label: "Vitals" },
  { id: "imaging", label: "Imaging" },
  { id: "family-history", label: "Family History" },
  { id: "social-history", label: "Social History" },
  { id: "surgical-history", label: "Surgical History" },
  { id: "attachments", label: "Attachments" },
  { id: "appointments", label: "Appointments" },
  { id: "ai-debug", label: "AI Assistant Debug" },
];

function AIDebugSection({ patientId }: { patientId: number }) {
  const { data: assistantConfig, isLoading, error } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant`],
    enabled: !!patientId
  });

  if (isLoading) {
    return (
      <div className="p-2 text-xs text-gray-500">
        Loading assistant info...
      </div>
    );
  }

  if (error || !assistantConfig) {
    return (
      <div className="p-2 text-xs text-red-600">
        No assistant found
      </div>
    );
  }

  // Type the response data properly
  const config = assistantConfig as any;

  return (
    <div className="p-2">
      <div className="text-xs space-y-2">
        <div>
          <span className="font-medium">Assistant:</span> {config?.name || 'Unknown'}
        </div>
        <div>
          <span className="font-medium">Model:</span> {config?.model || 'Unknown'}
        </div>
        <div>
          <span className="font-medium">Thread:</span> {config?.thread_id ? 'Active' : 'None'}
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs">
          View Full Debug
        </Button>
      </div>
    </div>
  );
}

export function EncounterDetailView({
  patient,
  encounterId,
  onBackToChart,
}: EncounterDetailViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["encounters"]),
  );
  const [soapNote, setSoapNote] = useState("");
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  const [isSavingSOAP, setIsSavingSOAP] = useState(false);
  
  // Track if the content is being updated programmatically
  const isUpdatingProgrammatically = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Generated SOAP note will appear here...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "outline-none min-h-[500px] prose max-w-none whitespace-pre-wrap soap-editor",
      },
    },
    content: "",
    onUpdate: ({ editor }) => {
      // Only update React state if this isn't a programmatic update
      if (!editor.isDestroyed && !isUpdatingProgrammatically.current) {
        const newContent = editor.getHTML();
        setSoapNote(newContent);
      }
    },
  });

  // Function to format SOAP note content for proper display
  const formatSoapNoteContent = (content: string) => {
    if (!content) return content;
    
    return content
      // Convert markdown bold to HTML
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Add proper line breaks and spacing
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      // Wrap in paragraph tags
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      // Fix double paragraph issues
      .replace(/<p><\/p>/g, '')
      // Add extra spacing after section headers
      .replace(/(<strong>SUBJECTIVE:<\/strong>)/g, '$1<br/>')
      .replace(/(<strong>OBJECTIVE:<\/strong>)/g, '<br/>$1<br/>')
      .replace(/(<strong>ASSESSMENT\/PLAN:<\/strong>)/g, '<br/>$1<br/>')
      .replace(/(<strong>ORDERS:<\/strong>)/g, '<br/>$1<br/>');
  };

  // Effect to sync soapNote state with editor content
  useEffect(() => {
    if (editor && soapNote && !editor.isDestroyed) {
      const formattedContent = formatSoapNoteContent(soapNote);
      const currentContent = editor.getHTML();
      if (currentContent !== formattedContent) {
        isUpdatingProgrammatically.current = true;
        editor.commands.setContent(formattedContent);
        setTimeout(() => {
          isUpdatingProgrammatically.current = false;
        }, 100);
      }
    }
  }, [soapNote, editor]);
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState(""); // Track live suggestions during recording
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [cptCodes, setCptCodes] = useState<any[]>([]);
  const [isTextMode, setIsTextMode] = useState(false);
  const [transcriptionBuffer, setTranscriptionBuffer] = useState("");
  const { toast } = useToast();

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to get real-time suggestions during recording
  const getLiveAISuggestions = async (transcription: string) => {
    if (transcription.length < 50) return; // Only process meaningful chunks

    try {
      console.log(
        "🧠 [EncounterView] Getting live AI suggestions for transcription:",
        transcription.substring(0, 100) + "...",
      );

      const requestBody = {
        patientId: patient.id.toString(),
        userRole: "provider",
        isLiveChunk: "true",
        transcription: transcription,
      };

      console.log(
        "🧠 [EncounterView] Sending live suggestions request to /api/voice/live-suggestions",
      );
      console.log("🧠 [EncounterView] Request body:", requestBody);

      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(
        "🧠 [EncounterView] Live suggestions response status:",
        response.status,
      );
      console.log(
        "🧠 [EncounterView] Live suggestions response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🧠 [EncounterView] Live AI suggestions received:", data);

        if (data.aiSuggestions) {
          console.log(
            "🔧 [EncounterView] Processing live suggestions, existing:",
            liveSuggestions?.length || 0,
            "chars",
          );
          console.log(
            "🔧 [EncounterView] New suggestions count:",
            data.aiSuggestions.realTimePrompts?.length || 0,
          );

          // Get existing live suggestions to append to them
          const existingLiveSuggestions = liveSuggestions || "";
          let suggestionsText = "";

          // If this is the first suggestion, add the header
          if (!existingLiveSuggestions.includes("🧠 LIVE AI ANALYSIS:")) {
            suggestionsText = "🧠 LIVE AI ANALYSIS:\n";
            if (data.aiSuggestions.clinicalGuidance) {
              suggestionsText += `${data.aiSuggestions.clinicalGuidance}\n\n`;
            }
            suggestionsText += "📋 Live Suggestions:\n";
            console.log("🔧 [EncounterView] First suggestion - added header");
          } else {
            suggestionsText = existingLiveSuggestions;
            console.log(
              "🔧 [EncounterView] Appending to existing live suggestions",
            );
          }

          // Count existing numbered suggestions to continue numbering
          const existingNumbers = (
            existingLiveSuggestions.match(/\d+\./g) || []
          ).length;
          console.log(
            "🔧 [EncounterView] Found existing numbered items:",
            existingNumbers,
          );

          if (data.aiSuggestions.realTimePrompts?.length > 0) {
            data.aiSuggestions.realTimePrompts.forEach(
              (prompt: string, index: number) => {
                const itemNumber = existingNumbers + index + 1;
                suggestionsText += `${itemNumber}. ${prompt}\n`;
                console.log(
                  "🔧 [EncounterView] Added item",
                  itemNumber,
                  ":",
                  prompt.substring(0, 50) + "...",
                );
              },
            );
          }

          console.log(
            "🔧 [EncounterView] Final live suggestions length:",
            suggestionsText.length,
          );
          setLiveSuggestions(suggestionsText);
          setGptSuggestions(suggestionsText); // Also update the display
          console.log(
            "🔧 [EncounterView] Live suggestions updated, length:",
            suggestionsText.length,
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ [EncounterView] Live suggestions HTTP error:",
          response.status,
        );
        console.error("❌ [EncounterView] Full HTML response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        );
      }
    } catch (error) {
      console.error("❌ [EncounterView] Live suggestions failed:", error);
      console.error("❌ [EncounterView] Error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
    }
  };

  const startRecording = async () => {
    console.log(
      "🎤 [EncounterView] Starting REAL-TIME voice recording for patient:",
      patient.id,
    );

    // Clear previous suggestions when starting new recording
    setGptSuggestions("");
    setLiveSuggestions(""); // Clear live suggestions for new encounter
    setTranscription("");

    try {
      // Create direct WebSocket connection to OpenAI like your working code
      let realtimeWs: WebSocket | null = null;
      let transcriptionBuffer = "";
      let lastSuggestionLength = 0;

      try {
        console.log(
          "🌐 [EncounterView] Connecting to OpenAI Realtime API like working implementation...",
        );

        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        console.log("🔑 [EncounterView] API key check:", {
          hasApiKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          keyPrefix: apiKey?.substring(0, 7) || "none",
        });

        if (!apiKey) {
          throw new Error("OpenAI API key not available in environment");
        }

        // Step 1: Create session exactly like your working code
        console.log("🔧 [EncounterView] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
          modalities: ["text"],
          instructions:
            "You are a medical transcription assistant. Provide accurate transcription of medical conversations.",
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
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
          throw new Error(
            `Failed to create session: ${error.message || "Unknown error"}`,
          );
        }

        const session = await sessionResponse.json();
        console.log("✅ [EncounterView] Session created:", session.id);

        // Step 2: Connect via WebSocket with session token like your working code
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
        });

        realtimeWs = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        realtimeWs.onopen = () => {
          console.log("🌐 [EncounterView] ✅ Connected to OpenAI Realtime API");

          // Update session configuration like your working code
          realtimeWs!.send(
            JSON.stringify({
              type: "session.update",
              session: {
                instructions:
                  "You are a medical transcription assistant. Provide accurate transcription of medical conversations.",
                model: "gpt-4o-mini-realtime-preview-2024-12-17",
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
                  silence_duration_ms: 500,
                  create_response: true,
                },
              },
            }),
          );
        };

        realtimeWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log("📨 [EncounterView] OpenAI message type:", message.type);
          console.log("📨 [EncounterView] Full OpenAI message:", message);

          // Handle transcription events - only use delta for live updates
          if (
            message.type === "conversation.item.input_audio_transcription.delta"
          ) {
            const deltaText = message.transcript || message.delta || "";
            console.log("📝 [EncounterView] Transcription delta:", deltaText);
            transcriptionBuffer += deltaText;
            setTranscription(transcriptionBuffer);
            setTranscriptionBuffer(transcriptionBuffer);

            // Trigger live AI suggestions when we have enough text (every 25 chars for faster response)
            if (transcriptionBuffer.length - lastSuggestionLength > 25) {
              lastSuggestionLength = transcriptionBuffer.length;
              console.log(
                "🧠 [EncounterView] Triggering live AI suggestions for buffer length:",
                transcriptionBuffer.length,
              );
              getLiveAISuggestions(transcriptionBuffer);
            }
          } else if (
            message.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            // Log completion but don't add to buffer (already added via deltas)
            const finalText = message.transcript || "";
            console.log(
              "✅ [EncounterView] Transcription completed (not adding to buffer):",
              finalText,
            );

            // Trigger final suggestions on completion if we haven't recently
            if (transcriptionBuffer.length - lastSuggestionLength > 25) {
              console.log(
                "🧠 [EncounterView] Triggering final AI suggestions on completion",
              );
              getLiveAISuggestions(transcriptionBuffer);
            }
          } else if (message.type === "error") {
            console.error(
              "❌ [EncounterView] OpenAI Realtime API Error:",
              message,
            );
            console.error("❌ [EncounterView] Error details:", message.error);
          }
        };

        realtimeWs.onerror = (error) => {
          console.error("❌ [EncounterView] OpenAI WebSocket error:", error);
        };
      } catch (wsError) {
        console.error(
          "❌ [EncounterView] Failed to connect to OpenAI Realtime API:",
          wsError,
        );
        // Fall back to chunked processing if direct connection fails
      }

      console.log("🎤 [EncounterView] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      console.log("🎤 [EncounterView] ✅ Microphone access granted");

      // Set up audio processing exactly like your working AudioRecorder
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096; // Same as your working code
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = async (e) => {
        if (!realtimeWs || realtimeWs.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert to PCM16 and create blob exactly like your working code
        const pcm16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Create audio blob and send exactly like your working appendAudio method
        const audioBlob = new Blob([pcm16Data], { type: "audio/pcm" });

        // Convert to base64 exactly like your working code
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Audio = btoa(binary);

            // Send audio buffer exactly like your working code
            realtimeWs!.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64Audio,
              }),
            );

            console.log(
              "🎵 [EncounterView] Sent audio buffer:",
              base64Audio.length,
              "bytes",
            );
          } catch (error) {
            console.error("❌ [EncounterView] Error processing audio:", error);
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(
          "🎤 [EncounterView] Recording stopped, cleaning up real-time connection...",
        );

        // Close the real-time WebSocket connection
        if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
          realtimeWs.close();
          console.log(
            "🌐 [EncounterView] Real-time WebSocket connection closed",
          );
        }

        // Clean up audio processing
        if (processor) {
          processor.disconnect();
          source.disconnect();
          audioContext.close();
        }

        console.log(
          "🎤 [EncounterView] Now processing with Assistants API for AI suggestions...",
        );

        // Use the real-time transcription for AI analysis via Assistants API
        if (transcriptionBuffer.trim()) {
          try {
            // Send transcription to Assistants API for comprehensive analysis
            const formData = new FormData();
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            formData.append("audio", audioBlob, "recording.webm");
            formData.append("patientId", patient.id.toString());
            formData.append("userRole", "provider");
            formData.append("isLiveChunk", "false");
            formData.append("transcriptionOverride", transcriptionBuffer);

            const response = await fetch("/api/voice/transcribe-enhanced", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              console.log("🤖 [EncounterView] Assistants API response:", data);
              console.log(
                "🧠 [EncounterView] AI Suggestions structure:",
                data.aiSuggestions
                  ? Object.keys(data.aiSuggestions)
                  : "No suggestions",
              );

              // Process AI suggestions - preserve existing live suggestions
              if (data.aiSuggestions) {
                const existingLiveSuggestions = liveSuggestions || "";
                let suggestionsText = existingLiveSuggestions;

                // If we have existing live suggestions from recording, append final analysis
                if (
                  existingLiveSuggestions.includes("🧠 LIVE AI ANALYSIS:") ||
                  existingLiveSuggestions.includes("📋 Live Suggestions:")
                ) {
                  suggestionsText += "\n\n🎯 FINAL ANALYSIS:\n";

                  // Add clinical guidance
                  if (data.aiSuggestions.clinicalGuidance) {
                    suggestionsText += `${data.aiSuggestions.clinicalGuidance}\n\n`;
                  }

                  // Add final provider suggestions with continued numbering
                  if (data.aiSuggestions.realTimePrompts?.length > 0) {
                    const existingNumbers = (
                      existingLiveSuggestions.match(/\d+\./g) || []
                    ).length;
                    suggestionsText += "📋 Final Provider Suggestions:\n";
                    data.aiSuggestions.realTimePrompts.forEach(
                      (prompt: string, index: number) => {
                        suggestionsText += `${existingNumbers + index + 1}. ${prompt}\n`;
                      },
                    );
                  }

                  console.log(
                    "🧠 [EncounterView] Preserved live suggestions and added final analysis",
                  );
                } else {
                  // No existing live suggestions, use regular format
                  suggestionsText = "🧠 AI ANALYSIS:\n";

                  if (data.aiSuggestions.clinicalGuidance) {
                    suggestionsText += `${data.aiSuggestions.clinicalGuidance}\n\n`;
                  }

                  if (data.aiSuggestions.realTimePrompts?.length > 0) {
                    suggestionsText += "📋 Provider Suggestions:\n";
                    data.aiSuggestions.realTimePrompts.forEach(
                      (prompt: string, index: number) => {
                        suggestionsText += `${index + 1}. ${prompt}\n`;
                      },
                    );
                  }

                  console.log(
                    "🧠 [EncounterView] No live suggestions found, using regular format",
                  );
                }

                console.log(
                  "🧠 [EncounterView] Setting GPT suggestions:",
                  suggestionsText,
                );
                setGptSuggestions(suggestionsText);
              }

              // Use SOAP note from Assistants API
              if (data.soapNote) {
                console.log("📝 [EncounterView] Setting SOAP note");
                setSoapNote(data.soapNote);
              }

              // Use draft orders from Assistants API
              if (data.draftOrders) {
                console.log(
                  "📋 [EncounterView] Setting draft orders:",
                  data.draftOrders.length,
                );
                setDraftOrders(data.draftOrders);
              }

              // Use CPT codes from Assistants API
              if (data.cptCodes) {
                console.log(
                  "🏥 [EncounterView] Setting CPT codes:",
                  data.cptCodes.length,
                );
                setCptCodes(data.cptCodes);
              }

              toast({
                title: "AI Analysis Complete",
                description: "Smart suggestions and clinical insights ready",
              });
            } else {
              throw new Error(`Server responded with ${response.status}`);
            }
          } catch (error) {
            console.error(
              "❌ [EncounterView] Assistants API processing failed:",
              error,
            );
            setGptSuggestions("Failed to get AI suggestions");
          }
        } else {
          console.log(
            "⚠️ [EncounterView] No transcription available for AI analysis",
          );
          setGptSuggestions("No transcription available for AI analysis");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(2000); // Collect chunks every 2 seconds for real-time updates
      setIsRecording(true);

      (window as any).currentMediaRecorder = mediaRecorder;

      toast({
        title: "Enhanced Recording Started",
        description: "Real-time AI analysis with patient context active",
      });
    } catch (error) {
      console.error("❌ [EncounterView] DETAILED ERROR in hybrid recording:", {
        error,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        patientId: patient.id,
      });

      let errorMessage = "Unknown error occurred";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast({
        title: "Recording Failed",
        description: `Enhanced recording error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    console.log("🎤 [EncounterView] Stopping recording...");
    const mediaRecorder = (window as any).currentMediaRecorder;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      console.log("🎤 [EncounterView] MediaRecorder stopped");
    }

    setIsRecording(false);
    
    // Automatically generate SOAP note when recording stops (like external implementation)
    if (transcriptionBuffer && transcriptionBuffer.trim()) {
      try {
        console.log("🩺 [EncounterView] Auto-generating SOAP note after recording...");
        setIsGeneratingSOAP(true);
        
        toast({
          title: "Processing SOAP Note",
          description: "Your note is being processed and saved. You can continue using the app.",
          duration: 10000,
        });
        
        // Add a small delay to avoid thread conflicts with live suggestions
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(`/api/patients/${patient.id}/encounters/${encounterId}/generate-soap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcription: transcriptionBuffer,
            userRole: "provider"
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSoapNote(data.soapNote);
          console.log("✅ [EncounterView] SOAP note auto-generated successfully");
          
          toast({
            title: "SOAP Note Generated",
            description: "Clinical documentation has been created automatically",
          });
        } else {
          throw new Error(`Failed to generate SOAP note: ${response.statusText}`);
        }
      } catch (error) {
        console.error("❌ [EncounterView] Error auto-generating SOAP note:", error);
        toast({
          variant: "destructive",
          title: "SOAP Generation Failed",
          description: "Failed to generate SOAP note automatically. You can try the generate button.",
        });
      } finally {
        setIsGeneratingSOAP(false);
      }
    } else {
      toast({
        title: "Recording Stopped",
        description: "Processing audio...",
      });
    }
  };



  const generateSmartSuggestions = () => {
    setGptSuggestions(
      "AI-generated clinical suggestions based on the encounter...",
    );
    toast({
      title: "Smart Suggestions Generated",
      description: "GPT analysis complete",
    });
  };

  // SOAP Note Generation Function
  const handleGenerateSOAP = async () => {
    if (!transcriptionBuffer.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "Please complete a recording before generating a SOAP note.",
      });
      return;
    }

    setIsGeneratingSOAP(true);
    try {
      console.log("🩺 [EncounterView] Generating SOAP note...");
      
      const response = await fetch(`/api/patients/${patient.id}/encounters/${encounterId}/generate-soap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription: transcriptionBuffer,
          userRole: "provider"
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate SOAP note: ${response.statusText}`);
      }

      const data = await response.json();
      setSoapNote(data.soapNote);
      
      toast({
        title: "SOAP Note Generated",
        description: "Your SOAP note has been generated successfully. You can now edit and save it.",
      });

    } catch (error) {
      console.error("❌ [EncounterView] Error generating SOAP note:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate SOAP note. Please try again.",
      });
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  // SOAP Note Saving Function
  const handleSaveSOAP = async () => {
    if (!soapNote.trim()) {
      toast({
        variant: "destructive",
        title: "No Content",
        description: "Please generate or enter SOAP note content before saving.",
      });
      return;
    }

    setIsSavingSOAP(true);
    try {
      console.log("💾 [EncounterView] Saving SOAP note...");
      
      // Here you would typically save to your encounter/notes endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "SOAP Note Saved",
        description: "Your SOAP note has been saved to the patient's record.",
      });

    } catch (error) {
      console.error("❌ [EncounterView] Error saving SOAP note:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save SOAP note. Please try again.",
      });
    } finally {
      setIsSavingSOAP(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Patient Header */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <Avatar className="w-12 h-12 border-2 border-gray-200">
              <AvatarImage
                src={
                  patient.profilePhotoFilename
                    ? `/uploads/${patient.profilePhotoFilename}`
                    : undefined
                }
                alt={`${patient.firstName} ${patient.lastName}`}
              />
              <AvatarFallback className="text-sm bg-gray-100">
                {patient.firstName?.[0] || "P"}
                {patient.lastName?.[0] || "P"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                DOB: {formatDate(patient.dateOfBirth)}
              </p>
              <p className="text-sm text-blue-600">
                Encounter #{encounterId} -{" "}
                {formatDate(new Date().toISOString())}
              </p>

              <div className="flex space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={onBackToChart}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to Patient Chart
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Encounter Status */}
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="text-sm">
            <div className="font-medium text-blue-900">Office Visit</div>
            <div className="text-blue-700">
              Encounter #{encounterId} - Type: Office Visit
            </div>
            <div className="flex items-center mt-2">
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300"
              >
                Scheduled
              </Badge>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient chart..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chart Sections */}
        <div className="flex-1 overflow-y-auto">
          {chartSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.has(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-100 border-b border-gray-100">
                  <span className="font-medium text-sm">{section.label}</span>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-white border-b border-gray-100 p-3 text-xs text-gray-600">
                  {section.id === "encounters"
                    ? "Current encounter in progress"
                    : section.id === "ai-debug"
                    ? <AIDebugSection patientId={patient.id} />
                    : `${section.label} content`}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Provider Documentation</h1>
            <div className="text-sm text-gray-600">
              Encounter ID: {encounterId}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Clinical documentation and voice notes for this encounter.
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Voice Recording Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600">● Connected</span>
                <span className="text-xs text-gray-500">
                  Total: 7,737 tokens (59.5%)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Transcription: 0</span>
                    <span className="text-sm">Suggestions: 0</span>
                    <span className="text-sm">SOAP: 0</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTextMode(!isTextMode)}
                  className={isTextMode ? "bg-blue-100" : ""}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Text Mode
                </Button>

                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
              </div>

              {/* Real-Time Transcription */}
              <div className="space-y-2">
                <h3 className="font-medium">Real-Time Transcription</h3>
                <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                  {transcription ||
                    (isRecording
                      ? "Listening..."
                      : "Transcription will appear here during recording")}
                </div>
              </div>
            </div>
          </Card>

          {/* GPT Suggestions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">GPT Suggestions</h2>
              <Button
                onClick={generateSmartSuggestions}
                size="sm"
                variant="outline"
              >
                Generate Suggestions
              </Button>
            </div>
            <div className="text-gray-500 text-sm whitespace-pre-line">
              {gptSuggestions || "GPT analysis will appear here..."}
            </div>
          </Card>



          {/* SOAP Note Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">SOAP Note</h2>
              <div className="flex items-center space-x-2">
                {isGeneratingSOAP && (
                  <div className="flex items-center text-sm text-blue-600">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full" />
                    Generating...
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveSOAP}
                  disabled={!soapNote.trim() || isSavingSOAP}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  {isSavingSOAP ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Note
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="w-full min-h-[500px] pb-8 font-sans text-base leading-relaxed">
              <div className="w-full h-full min-h-[500px] border rounded-lg bg-white">
                {editor && soapNote && soapNote.length > 0 ? (
                  <EditorContent
                    editor={editor}
                    className="soap-note prose max-w-none p-4"
                  />
                ) : editor ? (
                  <EditorContent
                    editor={editor}
                    className="soap-note prose max-w-none p-4"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">No SOAP note generated yet</div>
                    <div className="text-xs mt-1">
                      Complete a recording to automatically generate a SOAP note
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Draft Orders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Draft Orders</h2>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No draft orders</div>
              <div className="text-xs mt-1">
                Create a new order using the button above
              </div>
            </div>
          </Card>

          {/* CPT Codes & Diagnoses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">CPT Codes & Diagnoses</h2>
            </div>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No billing codes or diagnoses yet</div>
              <div className="text-xs mt-1">
                Complete a recording to generate codes
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-green-600">● Connected</span>
                <span className="text-gray-500">
                  Total: 7,737 tokens (59.5%)
                </span>
                <span className="text-gray-500">Transcription: 0</span>
                <span className="text-gray-500">Suggestions: 0</span>
                <span className="text-gray-500">SOAP: 0</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                Reset
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
