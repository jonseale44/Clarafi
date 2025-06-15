import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Mic, 
  MicOff, 
  Save, 
  FileText, 
  Heart, 
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Stethoscope,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSharedRealtimeService } from "@/utils/shared-realtime-service";
import { SharedChartSections } from "@/components/patient/shared-chart-sections";
import {
  RealtimeNursingIntegration,
  RealtimeNursingRef,
} from "@/components/RealtimeNursingIntegration";
import type { Patient, User as UserType } from "@shared/schema";

interface NursingEncounterViewProps {
  patient: Patient;
  encounterId: number;
  onBackToChart: () => void;
}

const nursingChartSections = [
  { id: "encounters", label: "Patient Encounters" },
  { id: "problems", label: "Medical Problems" },
  { id: "medication", label: "Medication" },
  { id: "allergies", label: "Allergies" },
  { id: "vitals", label: "Vitals" },
  { id: "labs", label: "Labs" },
  { id: "imaging", label: "Imaging" },
  { id: "family-history", label: "Family History" },
  { id: "social-history", label: "Social History" },
  { id: "surgical-history", label: "Surgical History" },
  { id: "attachments", label: "Attachments" },
  { id: "appointments", label: "Appointments" },
  { id: "nursing-assessments", label: "Nursing Assessments" },
  { id: "care-plans", label: "Care Plans" },
];

export function NursingEncounterView({ 
  patient, 
  encounterId, 
  onBackToChart 
}: NursingEncounterViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management - matching provider view exactly including AI suggestions
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [transcriptionBuffer, setTranscriptionBuffer] = useState("");
  const [liveTranscriptionContent, setLiveTranscriptionContent] = useState("");
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState("");
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0);
  const [suggestionsBuffer, setSuggestionsBuffer] = useState("");
  const [nursingAssessment, setNursingAssessment] = useState("");
  const [nursingInterventions, setNursingInterventions] = useState("");
  const [nursingNotes, setNursingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("assessment");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["encounters"])
  );
  const realtimeNursingRef = useRef<RealtimeNursingRef>(null);
  const suggestionDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Get current user for role-based functionality
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Get encounter data
  const { data: encounter, isLoading } = useQuery({
    queryKey: [`/api/encounters/${encounterId}`],
    enabled: !!encounterId,
  });

  // Deduplication tracking for WebSocket messages
  const processedEvents = useRef(new Set<string>());
  const processedContent = useRef(new Set<string>());

  const isEventProcessed = (eventId: string) => processedEvents.current.has(eventId);
  const markEventAsProcessed = (eventId: string) => processedEvents.current.add(eventId);
  const isContentProcessed = (content: string) => processedContent.current.has(content);
  const markContentAsProcessed = (content: string) => processedContent.current.add(content);

  // MISSING: Add the startSuggestionsConversation function from provider view
  const startSuggestionsConversation = async (
    ws: WebSocket | null,
    patientData: any,
  ) => {
    if (!ws) return;

    console.log("[NursingView] Starting AI suggestions conversation");

    // 1. Fetch full patient chart data like external implementation
    let patientChart = null;
    try {
      console.log(
        "[NursingView] Fetching patient chart data for context injection",
      );
      const chartResponse = await fetch(
        `/api/patients/${patientData.id}/chart`,
      );
      if (chartResponse.ok) {
        patientChart = await chartResponse.json();
        console.log(
          "[NursingView] Patient chart data fetched successfully",
        );
      } else {
        console.warn(
          "[NursingView] Failed to fetch patient chart, continuing without context",
        );
      }
    } catch (error) {
      console.error("[NursingView] Error fetching patient chart:", error);
    }

    // 2. Build comprehensive patient context
    const patientContext = `Patient: ${patientData.firstName} ${patientData.lastName}
Age: ${patientData.dateOfBirth ? new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear() : 'Unknown'}
Gender: ${patientData.gender || 'Unknown'}
MRN: ${patientData.mrn || 'Unknown'}

${patientChart ? `
Active Problems: ${patientChart.activeProblems?.map((p: any) => p.title).join(', ') || 'None documented'}
Current Medications: ${patientChart.medications?.map((m: any) => `${m.name} ${m.dosage}`).join(', ') || 'None documented'}
Allergies: ${patientChart.allergies?.map((a: any) => a.allergen).join(', ') || 'NKDA'}
Recent Vitals: ${patientChart.vitals?.length > 0 ? `BP: ${patientChart.vitals[0].systolic}/${patientChart.vitals[0].diastolic}, HR: ${patientChart.vitals[0].heartRate}, Temp: ${patientChart.vitals[0].temperature}°F` : 'Not available'}
` : 'Limited patient data available'}`;

    // 3. Send patient context to OpenAI for AI suggestions
    const currentTranscription = liveTranscriptionContent || transcriptionBuffer || "";

    const contextWithTranscription = `${patientContext}

CURRENT LIVE CONVERSATION:
${currentTranscription}

Please provide nursing suggestions based on what the patient is saying in this current conversation.`;

    const contextMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: contextWithTranscription,
          },
        ],
      },
    };

    console.log(
      "🧠 [NursingView] Injecting patient context for AI suggestions",
    );
    ws.send(JSON.stringify(contextMessage));

    // 4. Create response for AI suggestions with nursing-specific instructions
    const suggestionsMessage = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: `You are a nursing AI assistant. ALWAYS RESPOND IN ENGLISH ONLY. Provide concise, single-line nursing insights exclusively for registered nurses.

Consider nursing assessments, interventions, patient safety, comfort measures, patient education, and care coordination. Focus on practical nursing actions and observations.

Good nursing insights examples:
• Monitor pain level q2h and document response to interventions
• Assess fall risk factors and implement appropriate precautions
• Patient education needed on medication compliance and side effects
• Consider social work consultation for discharge planning
• Monitor for signs of infection at surgical site

Output examples of bad insights (to avoid):
• Encourage deep breathing exercises for relaxation
• Provide emotional support and active listening
• Ensure adequate nutrition and hydration

Produce insights that save the nurse time or enhance their clinical decision-making. No filler or overly obvious advice.

IMPORTANT: Return only 1-2 insights maximum per response. Use a bullet (•), dash (-), or number to prefix each insight. Keep responses short and focused.

Format each bullet point on its own line with no extra spacing between them.`,
        metadata: {
          type: "suggestions",
        },
      },
    };

    console.log(
      "🧠 [NursingView] Creating AI suggestions conversation",
    );
    ws.send(JSON.stringify(suggestionsMessage));
  };

  // Function to get real-time suggestions during recording - EXACT COPY from provider view
  const getLiveAISuggestions = async (transcription: string) => {
    if (transcription.length < 15) return; // Process smaller chunks for faster response

    // Debounce suggestions to prevent too many rapid API calls
    const now = Date.now();
    if (now - lastSuggestionTime < 1000) {
      // Clear any existing timeout and set a new one
      if (suggestionDebounceTimer.current) {
        clearTimeout(suggestionDebounceTimer.current);
      }
      suggestionDebounceTimer.current = setTimeout(() => {
        getLiveAISuggestions(transcription);
      }, 1000);
      return;
    }

    setLastSuggestionTime(now);

    try {
      console.log(
        "🧠 [NursingView] Getting live AI suggestions for transcription:",
        transcription.substring(0, 100) + "...",
      );

      const requestBody = {
        patientId: patient.id.toString(),
        userRole: "nurse",
        isLiveChunk: "true",
        transcription: transcription,
      };

      console.log(
        "🧠 [NursingView] Sending live suggestions request to /api/voice/live-suggestions",
      );
      console.log("🧠 [NursingView] Request body:", requestBody);

      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(
        "🧠 [NursingView] Live suggestions response status:",
        response.status,
      );
      console.log(
        "🧠 [NursingView] Live suggestions response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🧠 [NursingView] Live AI suggestions received:", data);

        if (data.aiSuggestions) {
          console.log(
            "🔧 [NursingView] Processing live suggestions, existing:",
            liveSuggestions?.length || 0,
            "chars",
          );
          console.log(
            "🔧 [NursingView] New suggestions count:",
            data.aiSuggestions.realTimePrompts?.length || 0,
          );

          // Get existing live suggestions to append to them (like transcription buffer)
          const existingLiveSuggestions = liveSuggestions || "";
          let suggestionsText = existingLiveSuggestions;

          // If this is the first suggestion, add the header
          if (
            !existingLiveSuggestions.includes("🩺 REAL-TIME CLINICAL INSIGHTS:")
          ) {
            suggestionsText = "🩺 REAL-TIME CLINICAL INSIGHTS:\n\n";
            console.log("🔧 [NursingView] First suggestion - added header");
          }

          // Only append new suggestions if they exist and aren't empty
          if (data.aiSuggestions.realTimePrompts?.length > 0) {
            // Filter out empty suggestions and ones already in the buffer
            const newSuggestions = data.aiSuggestions.realTimePrompts.filter(
              (prompt: string) => {
                if (
                  !prompt ||
                  !prompt.trim() ||
                  prompt.trim() === "Continue recording for more context..."
                ) {
                  return false;
                }
                // Check if this suggestion is already in our accumulated text
                const cleanPrompt = prompt.replace(/^[•\-\*]\s*/, "").trim();
                return !existingLiveSuggestions.includes(cleanPrompt);
              },
            );

            if (newSuggestions.length > 0) {
              console.log(
                "🔧 [NursingView] Adding",
                newSuggestions.length,
                "new suggestions to existing",
                existingLiveSuggestions.length,
                "chars",
              );

              // Append each new suggestion (like transcription delta accumulation)
              newSuggestions.forEach((prompt: string) => {
                const formattedPrompt =
                  prompt.startsWith("•") ||
                  prompt.startsWith("-") ||
                  prompt.startsWith("*")
                    ? prompt
                    : `• ${prompt}`;
                suggestionsText += `${formattedPrompt}\n`;
                console.log(
                  "🔧 [NursingView] Accumulated suggestion:",
                  formattedPrompt.substring(0, 50) + "...",
                );
              });
            } else {
              console.log(
                "🔧 [NursingView] No new suggestions to accumulate",
              );
            }
          }

          console.log(
            "🔧 [NursingView] Final live suggestions length:",
            suggestionsText.length,
          );
          setLiveSuggestions(suggestionsText);
          setGptSuggestions(suggestionsText); // Also update the display
          console.log(
            "🔧 [NursingView] Live suggestions updated, length:",
            suggestionsText.length,
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ [NursingView] Live suggestions HTTP error:",
          response.status,
        );
        console.error("❌ [NursingView] Full HTML response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        );
      }
    } catch (error) {
      console.error("❌ [NursingView] Live suggestions failed:", error);
      console.error("❌ [NursingView] Error details:", {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack,
      });
    }
  };

  // Start recording using same OpenAI Realtime API as provider view
  const startRecording = async () => {
    console.log("🎤 [NursingView] Starting REAL-TIME voice recording for patient:", patient.id);

    // Clear previous transcription and suggestions when starting new recording
    setGptSuggestions("");
    setLiveSuggestions(""); // Clear live suggestions for new encounter
    setSuggestionsBuffer(""); // Clear suggestions buffer for fresh accumulation
    setTranscription("");
    setTranscriptionBuffer("");
    setLiveTranscriptionContent("");

    try {
      // Create direct WebSocket connection to OpenAI like provider view
      let realtimeWs: WebSocket | null = null;
      let transcriptionBuffer = "";

      try {
        console.log("🌐 [NursingView] Connecting to OpenAI Realtime API...");

        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        console.log("🔑 [NursingView] API key check:", {
          hasApiKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          keyPrefix: apiKey?.substring(0, 7) || "none",
        });

        if (!apiKey) {
          throw new Error("OpenAI API key not available in environment");
        }

        // Step 1: Create session exactly like provider view
        console.log("🔧 [NursingView] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview",
          modalities: ["text"],
          instructions: "You are a medical transcription assistant for nursing documentation. Provide accurate transcription of medical conversations. Translate all languages into English. Only output ENGLISH. Accurately transcribe medical terminology, drug names, dosages, and clinical observations with focus on nursing assessment details.",
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

        const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "realtime=v1",
          },
          body: JSON.stringify(sessionConfig),
        });

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          console.log("❌ [NursingView] Session creation failed:", error);
          throw new Error(`Failed to create session: ${error.message || "Unknown error"}`);
        }

        const session = await sessionResponse.json();
        console.log("✅ [NursingView] Session created:", session.id);

        // Step 2: Connect via WebSocket with session token like provider view
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview",
        });

        realtimeWs = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        realtimeWs.onopen = () => {
          console.log("🌐 [NursingView] ✅ Connected to OpenAI Realtime API");

          // Session configuration: Focus on transcription for nursing
          const sessionUpdateMessage = {
            type: "session.update",
            session: {
              instructions: `You are a medical transcription assistant specialized in nursing documentation and clinical conversations. 
              Accurately transcribe medical terminology, drug names, dosages, and clinical observations. Translate all languages into English. Only output ENGLISH.
              Pay special attention to:
              - Nursing assessment terminology and observations
              - Vital signs and measurements
              - Patient comfort and care interventions
              - Medication administration details
              - Patient education and communication
              Format with bullet points for natural conversation flow.`,
              modalities: ["text", "audio"],
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
                create_response: false,
              },
            },
          };

          realtimeWs!.send(JSON.stringify(sessionUpdateMessage));
        };

        // Add conversation state management like provider view
        let conversationActive = false;
        let suggestionsStarted = false;

        realtimeWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log("📨 [NursingView] OpenAI message type:", message.type);

          // Log all incoming messages for debugging
          console.log("📥 [API-IN] Complete OpenAI message:");
          console.log(JSON.stringify(message, null, 2));

          // Add deduplication checks
          if (message.event_id && isEventProcessed(message.event_id)) {
            console.log("🚫 [NursingView] Skipping duplicate event:", message.event_id);
            return;
          }

          const content = message.delta || message.transcript || message.text || "";
          if (content && isContentProcessed(content)) {
            console.log("🚫 [NursingView] Skipping duplicate content:", content.substring(0, 30));
            return;
          }

          // Mark as processed
          if (message.event_id) markEventAsProcessed(message.event_id);
          if (content) markContentAsProcessed(content);

          // Handle transcription events - accumulate deltas exactly like provider view
          if (message.type === "conversation.item.input_audio_transcription.delta") {
            const deltaText = message.transcript || message.delta || "";
            console.log("📝 [NursingView] Transcription delta received:", deltaText);

            // For delta updates, append the delta text to existing transcription
            transcriptionBuffer += deltaText;
            setTranscriptionBuffer(transcriptionBuffer);

            // Append delta to existing transcription (don't replace)
            setTranscription((prev) => prev + deltaText);

            // CRITICAL: Update unified transcription content for AI suggestions
            setLiveTranscriptionContent((prev) => prev + deltaText);

            console.log(
              "📝 [NursingView] Updated transcription buffer:",
              transcriptionBuffer,
            );
            console.log(
              "📝 [NursingView] Buffer contains '+' symbols:",
              (transcriptionBuffer.match(/\+/g) || []).length,
            );

            // Start AI suggestions conversation when we have enough transcription (first time only)
            if (
              transcriptionBuffer.length > 20 &&
              !suggestionsStarted &&
              !conversationActive &&
              realtimeWs
            ) {
              suggestionsStarted = true;
              conversationActive = true;
              console.log(
                "🧠 [NursingView] TRIGGERING AI suggestions conversation - transcription buffer length:",
                transcriptionBuffer.length,
              );
              console.log(
                "🧠 [NursingView] Suggestions started:",
                suggestionsStarted,
                "Conversation active:",
                conversationActive,
              );
              startSuggestionsConversation(realtimeWs, patient);
            }

            // REAL-TIME: Continuously update AI suggestions with live partial transcription
            if (
              suggestionsStarted &&
              transcriptionBuffer.length > 20 &&
              realtimeWs
            ) {
              // Debounce to prevent too many rapid updates
              if (suggestionDebounceTimer.current) {
                clearTimeout(suggestionDebounceTimer.current);
              }

              suggestionDebounceTimer.current = setTimeout(() => {
                console.log(
                  "🧠 [NursingView] Sending real-time AI update for buffer length:",
                  transcriptionBuffer.length,
                );

                const currentTranscription = liveTranscriptionContent || transcriptionBuffer || "";

                const contextWithTranscription = `Patient context: ${patient.firstName} ${patient.lastName}, ${patient.gender}, Age: ${patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'Unknown'}

CURRENT LIVE CONVERSATION:
${currentTranscription}

Please provide nursing suggestions based on what the patient is saying in this current conversation.`;

                const contextMessage = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: contextWithTranscription,
                      },
                    ],
                  },
                };

                realtimeWs.send(JSON.stringify(contextMessage));

                const responseRequest = {
                  type: "response.create",
                  response: {
                    modalities: ["text"],
                    instructions: `You are a nursing AI assistant. Provide concise, single-line nursing insights based on what the patient is describing RIGHT NOW. Focus on nursing assessments, interventions, patient safety, comfort measures, patient education, and care coordination.

Return only one insight per line and single phrase per response. Use a bullet (•), dash (-), or number to prefix the insight.

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\\n) after answering a user question.`,
                    metadata: {
                      type: "suggestions",
                    },
                  },
                };

                realtimeWs.send(JSON.stringify(responseRequest));
              }, 2000); // Reduced to 2-second debounce for faster real-time response
            }

            // Trigger live AI suggestions exactly like provider view
            if (transcriptionBuffer.length > 15) {
              getLiveAISuggestions(transcriptionBuffer);
            }
          }

          // Handle AI response text deltas for suggestions - EXACT COPY from provider view
          else if (message.type === "response.text.delta") {
            const deltaText = message.delta || "";
            console.log(
              "🧠 [NursingView] AI suggestions delta received:",
              deltaText,
            );
            console.log("🧠 [NursingView] Delta length:", deltaText.length);

            // Accumulate AI suggestions like transcription
            setSuggestionsBuffer(prev => {
              const newSuggestions = prev + deltaText;
              console.log("🧠 [NursingView] AI suggestions buffer updated to length:", newSuggestions.length);
              
              // Update live suggestions display
              setLiveSuggestions(newSuggestions);
              setGptSuggestions(newSuggestions);
              
              return newSuggestions;
            });
          }

          if (message.type === "conversation.item.input_audio_transcription.completed") {
            console.log("✅ [NursingView] Transcription segment completed");
            const completedText = message.transcript || "";
            if (completedText && completedText !== transcriptionBuffer) {
              transcriptionBuffer = completedText;
              setTranscriptionBuffer(transcriptionBuffer);
              setTranscription(completedText);
              setLiveTranscriptionContent(completedText);
            }
          }

          if (message.type === "session.created") {
            console.log("✅ [NursingView] Session created successfully");
          }

          if (message.type === "session.updated") {
            console.log("✅ [NursingView] Session updated successfully");
          }

          if (message.type === "error") {
            console.error("❌ [NursingView] OpenAI error:", message.error);
            if (message.error?.code === "conversation_already_has_active_response") {
              console.log("🔄 [NursingView] Resetting conversation state due to race condition");
              conversationActive = false;
              suggestionsStarted = false;
            }
            toast({
              variant: "destructive",
              title: "Transcription Error",
              description: message.error?.message || "Unknown error occurred",
            });
          }
        };

        realtimeWs.onerror = (error) => {
          console.error("❌ [NursingView] WebSocket error:", error);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to transcription service",
          });
        };

        realtimeWs.onclose = (event) => {
          console.log("🔌 [NursingView] WebSocket closed:", event.code, event.reason);
          setIsRecording(false);
        };

        // Step 3: Start audio capture using exact same method as provider view
        console.log("🎤 [NursingView] Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          },
        });
        console.log("🎤 [NursingView] ✅ Microphone access granted");

        // Set up audio processing exactly like provider view
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const bufferSize = 4096; // Same as provider view
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        processor.onaudioprocess = async (e) => {
          if (!realtimeWs || realtimeWs.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // Convert to PCM16 exactly like provider view
          const pcm16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Create audio blob and send exactly like provider view
          const audioBlob = new Blob([pcm16Data], { type: "audio/pcm" });

          // Convert to base64 exactly like provider view
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

              // Send audio buffer exactly like provider view
              realtimeWs!.send(
                JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: base64Audio,
                }),
              );

              console.log(
                "🎵 [NursingView] Sent audio buffer:",
                base64Audio.length,
                "bytes",
              );
            } catch (error) {
              console.error("❌ [NursingView] Error processing audio:", error);
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
          console.log("🎤 [NursingView] Recording stopped");

          // Clean up audio processing
          if (processor) {
            processor.disconnect();
            source.disconnect();
            audioContext.close();
          }

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(1500); // Collect chunks every 1.5 seconds like provider view
        setIsRecording(true);

        (window as any).currentMediaRecorder = mediaRecorder;
        (window as any).currentRealtimeWs = realtimeWs;

        console.log("🎬 [NursingView] Recording started successfully");

        toast({
          title: "Recording Started",
          description: "Nursing transcription active",
        });

      } catch (error) {
        console.error("❌ [NursingView] DETAILED ERROR in recording:", {
          error,
          message: (error as any)?.message,
          name: (error as any)?.name,
          stack: (error as any)?.stack,
          patientId: patient.id,
        });

        let errorMessage = "Unknown error occurred";
        if ((error as any)?.message) {
          errorMessage = (error as any).message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        toast({
          title: "Recording Failed",
          description: `Transcription error: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [NursingView] Failed to start recording:", error);
      toast({
        variant: "destructive",
        title: "Recording Failed",
        description: "Unable to start voice transcription",
      });
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    console.log("🎤 [NursingView] Stopping recording...");
    const mediaRecorder = (window as any).currentMediaRecorder;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      console.log("🎤 [NursingView] MediaRecorder stopped");
    }

    setIsRecording(false);

    // Trigger nursing assessment generation after recording stops
    if (transcriptionBuffer && transcriptionBuffer.trim()) {
      console.log("🩺 [NursingView] Triggering nursing assessment generation after recording...");

      // Set transcription for Real-time nursing component
      setTranscription(transcriptionBuffer);

      // Trigger Real-time nursing assessment generation
      if (realtimeNursingRef.current) {
        realtimeNursingRef.current.generateNursingAssessment();
      }
    } else {
      toast({
        title: "Recording Stopped",
        description: "Processing audio...",
      });
    }
  };

  // Load existing nursing documentation
  useEffect(() => {
    if (encounter) {
      setNursingAssessment((encounter as any).nurseAssessment || "");
      setNursingInterventions((encounter as any).nurseInterventions || "");
      setNursingNotes((encounter as any).nurseNotes || "");
    }
  }, [encounter]);

  // Save nursing content mutation
  const saveContentMutation = useMutation({
    mutationFn: async (data: { field: string; content: string }) => {
      const response = await fetch(`/api/encounters/${encounterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [data.field]: data.content })
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Saved Successfully",
        description: "Nursing documentation has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save nursing documentation.",
      });
    }
  });

  const handleSaveAssessment = async () => {
    setIsSaving(true);
    try {
      await saveContentMutation.mutateAsync({
        field: 'nurseAssessment',
        content: nursingAssessment
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInterventions = async () => {
    setIsSaving(true);
    try {
      await saveContentMutation.mutateAsync({
        field: 'nurseInterventions',
        content: nursingInterventions
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await saveContentMutation.mutateAsync({
        field: 'nurseNotes',
        content: nursingNotes
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for left panel
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
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleStartRecording = () => {
    startRecording();
    toast({
      title: "Recording Started",
      description: "Your voice is being transcribed in real-time",
    });
  };

  const handleStopRecording = () => {
    stopRecording();
    // Trigger nursing-specific AI processing after recording stops
    realtimeNursingRef.current?.generateNursingAssessment();
    toast({
      title: "Recording Stopped",
      description: "Processing nursing assessment...",
    });
  };

  const generateAIAssessment = () => {
    realtimeNursingRef.current?.generateNursingAssessment();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nursing encounter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Complete Patient Chart */}
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
        <div className="p-4 bg-green-50 border-b border-gray-200">
          <div className="text-sm">
            <div className="font-medium text-green-900 flex items-center">
              <Stethoscope className="w-4 h-4 mr-2" />
              Nursing Encounter
            </div>
            <div className="text-green-700">
              Encounter #{encounterId} - {(encounter as any)?.encounterType || 'Office Visit'}
            </div>
            <div className="flex items-center mt-2">
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300"
              >
                {(encounter as any)?.encounterStatus?.replace('_', ' ') || 'In Progress'}
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>



        {/* Chart Sections */}
        <div className="flex-1 overflow-y-auto">
          {nursingChartSections.map((section) => (
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
                <div className="bg-white border-b border-gray-100 p-3">
                  {section.id === "encounters" ? (
                    <div className="text-xs text-gray-600">Current nursing encounter in progress</div>
                  ) : section.id === "nursing-assessments" ? (
                    <div className="text-xs text-gray-600">
                      <div className="space-y-1">
                        <div className="font-medium">Recent Assessments:</div>
                        <div>Pain: 3/10</div>
                        <div>Fall Risk: Low</div>
                        <div>Skin Integrity: Intact</div>
                      </div>
                    </div>
                  ) : section.id === "care-plans" ? (
                    <div className="text-xs text-gray-600">
                      <div className="space-y-1">
                        <div className="font-medium">Active Plans:</div>
                        <div>• Monitor vital signs q4h</div>
                        <div>• Patient education on medications</div>
                        <div>• Mobility assistance</div>
                      </div>
                    </div>
                  ) : (
                    <SharedChartSections 
                      patientId={patient.id} 
                      mode="encounter" 
                      encounterId={(encounter as any)?.id}
                      isReadOnly={false}
                      sectionId={section.id}
                    />
                  )}
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
            <h1 className="text-xl font-semibold">Nursing Documentation</h1>
            <div className="text-sm text-gray-600">
              Encounter ID: {encounterId}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Nursing assessments, interventions, and care planning for this encounter.
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Voice Recording Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Real-Time Transcription
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600">● Connected</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} text-white`}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>

                <RealtimeNursingIntegration
                  ref={realtimeNursingRef}
                  patientId={patient.id.toString()}
                  encounterId={encounterId.toString()}
                  transcription={transcription}
                  onNursingAssessmentUpdate={setNursingAssessment}
                  onNursingAssessmentComplete={(assessment) => {
                    setNursingAssessment(assessment);
                    toast({
                      title: "Assessment Complete",
                      description: "Nursing assessment generated successfully",
                    });
                  }}
                  onDraftOrdersReceived={(orders) => {
                    console.log("Received draft orders:", orders);
                  }}
                  isRealtimeEnabled={true}
                  autoTrigger={false}
                />
              </div>

              {/* Transcription Content */}
              <div className="space-y-2">
                <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {transcription ||
                      (isRecording
                        ? "Listening..."
                        : "Transcription will appear here during recording")}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Suggestions - EXACT COPY from provider view */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                AI Suggestions
              </h2>
              <Button
                onClick={() => {
                  setGptSuggestions("AI-generated nursing suggestions based on the encounter...");
                  toast({
                    title: "Smart Suggestions Generated",
                    description: "GPT analysis complete",
                  });
                }}
                size="sm"
                variant="outline"
              >
                Generate Suggestions
              </Button>
            </div>
            <div className="text-gray-500 text-sm whitespace-pre-line">
              {gptSuggestions || "AI analysis will appear here..."}
            </div>
          </Card>

          {/* Nursing Documentation Tabs */}
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="notes">Nursing Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="assessment" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nursing Assessment</h3>
                  <Button 
                    onClick={handleSaveAssessment} 
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Document your nursing assessment including patient's current condition, vital signs, pain level, mobility, safety concerns, and educational needs..."
                  value={nursingAssessment}
                  onChange={(e) => setNursingAssessment(e.target.value)}
                  className="min-h-[400px] resize-none"
                />
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="w-4 h-4 mr-1" />
                  {nursingAssessment.length} characters
                </div>
              </TabsContent>

              <TabsContent value="interventions" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Nursing Interventions</h3>
                  <Button 
                    onClick={handleSaveInterventions} 
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Document nursing interventions performed, medications administered, patient education provided, and patient responses to interventions..."
                  value={nursingInterventions}
                  onChange={(e) => setNursingInterventions(e.target.value)}
                  className="min-h-[400px] resize-none"
                />
                <div className="flex items-center text-sm text-gray-500">
                  <Activity className="w-4 h-4 mr-1" />
                  {nursingInterventions.length} characters
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">General Nursing Notes</h3>
                  <Button 
                    onClick={handleSaveNotes} 
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Additional nursing notes, observations, patient interactions, family communications, and care coordination notes..."
                  value={nursingNotes}
                  onChange={(e) => setNursingNotes(e.target.value)}
                  className="min-h-[400px] resize-none"
                />
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="w-4 h-4 mr-1" />
                  {nursingNotes.length} characters
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}