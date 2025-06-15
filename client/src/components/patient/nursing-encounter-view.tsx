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

  // Recording state and references
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording with detailed logging
  const startRecording = async () => {
    try {
      console.log("🎤 [NursingView] Starting transcription recording");
      console.log("🔍 [NursingView] Patient:", patient.id, "Encounter:", encounterId);

      // Connect to the shared WebSocket service that powers provider transcription
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log("🌐 [NursingView] Connecting to WebSocket:", wsUrl);

      const websocket = new WebSocket(wsUrl);

      websocket.onopen = async () => {
        console.log("✅ [NursingView] WebSocket connected successfully");
        setIsRecording(true);
        
        // Initialize transcription session
        websocket.send(JSON.stringify({
          type: 'start_transcription',
          patientId: patient.id.toString(),
          encounterId: encounterId.toString(),
          userRole: 'nurse'
        }));

        try {
          // Start audio capture
          console.log("🎤 [NursingView] Requesting microphone access...");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000
            }
          });

          streamRef.current = stream;
          console.log("🎵 [NursingView] Microphone access granted");

          // Create MediaRecorder
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && websocket.readyState === WebSocket.OPEN) {
              console.log("🔊 [NursingView] Sending audio chunk, size:", event.data.size);
              websocket.send(event.data);
            }
          };

          mediaRecorder.start(250); // Send chunks every 250ms
          console.log("🎬 [NursingView] MediaRecorder started successfully");

        } catch (audioError) {
          console.error("❌ [NursingView] Microphone access failed:", audioError);
          toast({
            variant: "destructive",
            title: "Microphone Access Failed",
            description: "Please allow microphone access to use transcription.",
          });
          setIsRecording(false);
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📥 [NursingView] Received message type:", data.type);

          if (data.type === 'transcription') {
            console.log("📝 [NursingView] Transcription received:", data.text);
            setTranscription(data.text || "");
          }

          if (data.type === 'error') {
            console.error("❌ [NursingView] Server error:", data.message);
            toast({
              variant: "destructive",
              title: "Transcription Error",
              description: data.message,
            });
          }
        } catch (parseError) {
          console.error("❌ [NursingView] Failed to parse message:", parseError);
        }
      };

      websocket.onerror = (error) => {
        console.error("❌ [NursingView] WebSocket error:", error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to transcription service",
        });
      };

      websocket.onclose = (event) => {
        console.log("🔌 [NursingView] WebSocket closed:", event.code, event.reason);
        setIsRecording(false);
      };

      wsRef.current = websocket;

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

  const stopRecording = () => {
    console.log("🎤 [NursingView] Stopping recording...");
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      console.log("🎬 [NursingView] MediaRecorder stopped");
    }
    
    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      console.log("🎵 [NursingView] Audio stream stopped");
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      console.log("🔌 [NursingView] WebSocket closed");
    }
    
    setIsRecording(false);
    
    // Trigger nursing assessment generation after recording stops
    if (transcription.trim()) {
      realtimeNursingRef.current?.generateNursingAssessment();
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
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
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