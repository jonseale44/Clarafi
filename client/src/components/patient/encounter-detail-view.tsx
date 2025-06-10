// Fixed version with continuous AI suggestions - copying working sections
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Save, Brain, FileText, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import EnhancedRealtimeSuggestions from "@/components/EnhancedRealtimeSuggestions";
import RealtimeSOAPGenerator from "@/components/RealtimeSOAPGenerator";
import DraftOrders from "@/components/DraftOrders";
import CPTCodesDiagnoses from "@/components/CPTCodesDiagnoses";

interface Patient {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  allergies?: string;
  medicalHistory?: string;
  currentMedications?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface Encounter {
  id: number;
  patientId: number;
  providerId: number;
  encounterType: string;
  encounterSubtype: string;
  startTime: Date;
  endTime?: Date;
  encounterStatus: string;
  chiefComplaint: string;
  note?: string;
  nurseAssessment?: string;
  nurseInterventions?: string;
  nurseNotes?: string;
  transcriptionRaw?: string;
  transcriptionProcessed?: string;
  aiSuggestions: Record<string, any>;
  draftOrders: any[];
  draftDiagnoses: any[];
  cptCodes: any[];
  location?: string;
  appointmentId?: number;
  signatureId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastChartUpdate?: Date;
  chartUpdateDuration?: number;
}

interface EncounterDetailViewProps {
  patient: Patient;
  encounterId: number;
}

export default function EncounterDetailView({
  patient,
  encounterId,
}: EncounterDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [transcriptionBuffer, setTranscriptionBuffer] = useState("");
  const [soapNote, setSoapNote] = useState("");
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  const [isSavingSOAP, setIsSavingSOAP] = useState(false);
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [cptCodes, setCptCodes] = useState<any[]>([]);
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState("");
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0);
  const [suggestionsBuffer, setSuggestionsBuffer] = useState("");
  const [liveTranscriptionContent, setLiveTranscriptionContent] = useState("");
  
  // Real-time buffer for continuous updates
  let realtimeBuffer = "";
  const suggestionDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // WebSocket and recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const realtimeWsRef = useRef<WebSocket | null>(null);
  const processedContent = useRef<Set<string>>(new Set());
  const lastGeneratedContent = useRef<string>("");

  // OpenAI API key
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  // Real-time API flags
  let suggestionsStarted = false;
  let conversationActive = false;

  // Fetch encounter data
  const { data: encounter } = useQuery({
    queryKey: ["/api/patients", patient.id, "encounters", encounterId],
    enabled: !!encounterId,
  });

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start real-time WebSocket connection
      if (openaiApiKey && !realtimeWsRef.current) {
        connectToRealtimeAPI();
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  };

  // Real-time WebSocket connection
  const connectToRealtimeAPI = () => {
    if (!openaiApiKey) return;

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      ["realtime", `openai-insecure-api-key.${openaiApiKey}`]
    );

    realtimeWsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to OpenAI Realtime API");

      // Configure session
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: "You are a medical AI assistant. Provide real-time clinical insights.",
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          }
        }
      }));

      // Start audio input
      if (mediaRecorderRef.current && isRecording) {
        ws.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: ""
        }));
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleRealtimeMessage(message);
    };

    ws.onclose = () => {
      console.log("Disconnected from OpenAI Realtime API");
      realtimeWsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  const handleRealtimeMessage = (message: any) => {
    // Handle transcription deltas
    if (message.type === "conversation.item.input_audio_transcription.delta") {
      const deltaText = message.transcript || message.delta || "";
      
      transcriptionBuffer += deltaText;
      setTranscriptionBuffer(transcriptionBuffer);
      setTranscription((prev) => prev + deltaText);
      setLiveTranscriptionContent((prev) => prev + deltaText);

      // Start AI suggestions when we have enough content
      if (transcriptionBuffer.length > 50 && !suggestionsStarted && realtimeWsRef.current) {
        suggestionsStarted = true;
        conversationActive = true;
        startSuggestionsConversation();
      }

      // CONTINUOUS AI SUGGESTIONS: Update context with each delta
      if (suggestionsStarted && transcriptionBuffer.length > 50 && realtimeWsRef.current) {
        if (suggestionDebounceTimer.current) {
          clearTimeout(suggestionDebounceTimer.current);
        }
        
        suggestionDebounceTimer.current = setTimeout(() => {
          const contextUpdate = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{
                type: "input_text",
                text: "Updated conversation: " + (liveTranscriptionContent || transcriptionBuffer) + "\n\nProvide medical insights for current symptoms."
              }]
            }
          };
          
          realtimeWsRef.current?.send(JSON.stringify(contextUpdate));
          
          const responseRequest = {
            type: "response.create",
            response: {
              modalities: ["text"],
              instructions: "Medical AI assistant. Focus ONLY on current conversation symptoms. Provide concise diagnostic insights. Add ++ after each sentence.",
              metadata: { type: "suggestions" }
            }
          };
          
          realtimeWsRef.current?.send(JSON.stringify(responseRequest));
        }, 2000);
      }
    }

    // Handle AI suggestion responses
    if (message.type === "response.text.delta") {
      const deltaText = message.delta || "";
      setSuggestionsBuffer((prev) => prev + deltaText);
      setLiveSuggestions((prev) => prev + deltaText);
    }

    // Handle transcription completion
    if (message.type === "conversation.item.input_audio_transcription.completed") {
      const finalText = message.transcript || "";
      if (finalText && suggestionsStarted && realtimeWsRef.current) {
        const completeTranscription = liveTranscriptionContent || transcriptionBuffer;
        const transcriptionContext = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{
              type: "input_text",
              text: "Current complete conversation: " + completeTranscription + "\n\nPlease provide medical suggestions based on this complete conversation context."
            }]
          }
        };

        realtimeWsRef.current.send(JSON.stringify(transcriptionContext));

        const responseRequest = {
          type: "response.create",
          response: {
            modalities: ["text"],
            instructions: "Medical AI assistant. Focus on current symptoms. Provide diagnostic insights. Add ++ after sentences.",
            metadata: { type: "suggestions" }
          }
        };

        realtimeWsRef.current.send(JSON.stringify(responseRequest));
      }
    }
  };

  const startSuggestionsConversation = () => {
    if (!realtimeWsRef.current) return;

    const patientContext = "Patient: " + patient.firstName + " " + patient.lastName + ", Age: " + 
      (new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) + 
      ", Gender: " + patient.gender;

    const currentTranscription = liveTranscriptionContent || transcriptionBuffer || "";
    const contextWithTranscription = patientContext + "\n\nCURRENT LIVE CONVERSATION:\n" + 
      currentTranscription + "\n\nPlease provide medical suggestions based on what the patient is saying in this current conversation.";

    const contextMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: contextWithTranscription
        }]
      }
    };

    realtimeWsRef.current.send(JSON.stringify(contextMessage));

    const responseRequest = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: "Medical AI assistant. Focus on current conversation symptoms. Provide diagnostic insights. Add ++ after sentences.",
        metadata: { type: "suggestions" }
      }
    };

    realtimeWsRef.current.send(JSON.stringify(responseRequest));
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (realtimeWsRef.current) {
        realtimeWsRef.current.close();
      }
      if (suggestionDebounceTimer.current) {
        clearTimeout(suggestionDebounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Encounter</h1>
          <p className="text-muted-foreground">
            {patient.firstName} {patient.lastName} • MRN: {patient.mrn}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {encounter?.encounterStatus || "Active"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Recording and Transcription */}
        <div className="space-y-6">
          {/* Recording Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Recording
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
              </div>

              {/* Transcription Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Live Transcription</label>
                <Textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Transcription will appear here as you speak..."
                  className="min-h-[200px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Clinical Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  value={liveSuggestions}
                  readOnly
                  placeholder="AI suggestions will appear here as you speak..."
                  className="min-h-[150px] resize-none bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - SOAP Notes and Orders */}
        <div className="space-y-6">
          {/* SOAP Note Generator */}
          <RealtimeSOAPGenerator
            patient={patient}
            encounterId={encounterId}
            transcription={transcription}
            autoTrigger={false}
          />

          {/* Draft Orders */}
          <DraftOrders patientId={patient.id} encounterId={encounterId} />

          {/* CPT Codes & Diagnoses */}
          <CPTCodesDiagnoses patientId={patient.id} encounterId={encounterId} />
        </div>
      </div>
    </div>
  );
}