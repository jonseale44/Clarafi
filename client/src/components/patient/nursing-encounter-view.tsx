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
  
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [nursingAssessment, setNursingAssessment] = useState("");
  const [nursingInterventions, setNursingInterventions] = useState("");
  const [nursingNotes, setNursingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("assessment");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["encounters"])
  );
  const realtimeNursingRef = useRef<RealtimeNursingRef>(null);

  // Get current user for role-based functionality
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Get encounter data
  const { data: encounter, isLoading } = useQuery({
    queryKey: [`/api/encounters/${encounterId}`],
    enabled: !!encounterId,
  });

  // Recording state and references - using same approach as provider view
  const [transcriptionBuffer, setTranscriptionBuffer] = useState("");

  // Deduplication tracking for WebSocket messages
  const processedEvents = useRef(new Set<string>());
  const processedContent = useRef(new Set<string>());

  const isEventProcessed = (eventId: string) => processedEvents.current.has(eventId);
  const markEventAsProcessed = (eventId: string) => processedEvents.current.add(eventId);
  const isContentProcessed = (content: string) => processedContent.current.has(content);
  const markContentAsProcessed = (content: string) => processedContent.current.add(content);

  // Start recording using same OpenAI Realtime API as provider view
  const startRecording = async () => {
    console.log("🎤 [NursingView] Starting REAL-TIME voice recording for patient:", patient.id);

    // Clear previous transcription when starting new recording
    setTranscription("");
    setTranscriptionBuffer("");

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

        realtimeWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log("📨 [NursingView] OpenAI message type:", message.type);

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

          // Handle transcription events - accumulate deltas
          if (message.type === "conversation.item.input_audio_transcription.delta") {
            const deltaText = message.transcript || message.delta || "";
            console.log("📝 [NursingView] Transcription delta received:", deltaText);
            
            transcriptionBuffer += deltaText;
            setTranscriptionBuffer(transcriptionBuffer);
            setTranscription(transcriptionBuffer);
          }

          if (message.type === "conversation.item.input_audio_transcription.completed") {
            console.log("✅ [NursingView] Transcription segment completed");
            const completedText = message.transcript || "";
            if (completedText && completedText !== transcriptionBuffer) {
              transcriptionBuffer = completedText;
              setTranscriptionBuffer(transcriptionBuffer);
              setTranscription(transcriptionBuffer);
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

        // Step 3: Start audio capture and streaming like provider view
        console.log("🎤 [NursingView] Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000,
          },
        });

        console.log("🎵 [NursingView] Microphone access granted");

        // Create MediaRecorder to capture audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        let audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
            console.log("🔊 [NursingView] Audio chunk captured, size:", event.data.size);

            // Convert to PCM16 and send to OpenAI
            try {
              const audioBlob = new Blob([event.data], { type: "audio/webm" });
              const arrayBuffer = await audioBlob.arrayBuffer();
              
              // Convert to base64 for transmission
              const uint8Array = new Uint8Array(arrayBuffer);
              let binaryString = '';
              for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
              }
              const base64Audio = btoa(binaryString);
              
              if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                realtimeWs.send(JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: base64Audio,
                }));
              }
            } catch (error) {
              console.error("❌ [NursingView] Error processing audio chunk:", error);
            }
          }
        };

        mediaRecorder.onstop = () => {
          console.log("🎬 [NursingView] MediaRecorder stopped");
          stream.getTracks().forEach(track => track.stop());
        };

        // Store references for cleanup
        (window as any).currentMediaRecorder = mediaRecorder;
        (window as any).currentRealtimeWs = realtimeWs;

        // Start recording
        mediaRecorder.start(250); // Capture every 250ms
        setIsRecording(true);

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
    const realtimeWs = (window as any).currentRealtimeWs;

    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      console.log("🎤 [NursingView] MediaRecorder stopped");
    }

    if (realtimeWs) {
      realtimeWs.close();
      console.log("🔌 [NursingView] WebSocket closed");
    }

    setIsRecording(false);

    // Trigger nursing assessment generation after recording stops
    if (transcriptionBuffer && transcriptionBuffer.trim()) {
      console.log("🩺 [NursingView] Triggering nursing assessment generation after recording...");
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