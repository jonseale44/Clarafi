import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSharedRealtimeService } from "@/utils/shared-realtime-service";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, User as UserType } from "@shared/schema";

interface NursingEncounterViewProps {
  patient: Patient;
  encounterId: number;
  onBackToChart: () => void;
}

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

  // Get current user for role-based functionality
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Get encounter data
  const { data: encounter, isLoading } = useQuery({
    queryKey: [`/api/encounters/${encounterId}`],
    enabled: !!encounterId,
  });

  // Initialize shared real-time service
  const { service } = useSharedRealtimeService({
    patientId: patient.id.toString(),
    encounterId: encounterId.toString(),
    userRole: 'nurse',
    onTranscriptionUpdate: (newTranscription) => {
      setTranscription(newTranscription);
    },
    onContentGenerated: (content) => {
      if (content.nursingAssessment) {
        setNursingAssessment(content.nursingAssessment);
      }
      if (content.nursingInterventions) {
        setNursingInterventions(content.nursingInterventions);
      }
      if (content.nursingNotes) {
        setNursingNotes(content.nursingNotes);
      }
    }
  });

  // Load existing nursing documentation
  useEffect(() => {
    if (encounter) {
      setNursingAssessment(encounter.nurseAssessment || "");
      setNursingInterventions(encounter.nurseInterventions || "");
      setNursingNotes(encounter.nurseNotes || "");
    }
  }, [encounter]);

  // Save nursing content mutation
  const saveContentMutation = useMutation({
    mutationFn: async (data: { field: string; content: string }) => {
      const response = await apiRequest(`/api/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [data.field]: data.content })
      });
      return response;
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

  const handleStartRecording = () => {
    setIsRecording(true);
    // Integration with existing voice recording would go here
    toast({
      title: "Recording Started",
      description: "Speak your nursing assessment or interventions.",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Process the recorded audio through the shared real-time service
    if (transcription) {
      service.processTranscription(transcription);
    }
    toast({
      title: "Recording Stopped",
      description: "Processing your nursing documentation...",
    });
  };

  const generateAIAssessment = async () => {
    if (!transcription) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "Please record some content first.",
      });
      return;
    }

    try {
      await service.generateContent({
        type: 'nursing_assessment',
        content: transcription,
        context: { patientId: patient.id, encounterId }
      });
      
      toast({
        title: "AI Assessment Generated",
        description: "Nursing assessment has been generated from your transcription.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate nursing assessment.",
      });
    }
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
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBackToChart}>
              ← Back to Chart
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Nursing Encounter - {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm text-gray-600">
                {encounter?.encounterType} • {new Date(encounter?.startTime).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Stethoscope className="w-3 h-3 mr-1" />
              Nursing View
            </Badge>
            <Badge variant={encounter?.encounterStatus === 'completed' ? 'default' : 'secondary'}>
              {encounter?.encounterStatus?.replace('_', ' ') || 'In Progress'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Patient Info */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h3>
                <p className="text-sm text-gray-600">
                  DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Voice Recording Controls */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Voice Documentation</h4>
            <div className="space-y-3">
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                variant={isRecording ? "destructive" : "default"}
                className="w-full"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
              
              {transcription && (
                <Button
                  onClick={generateAIAssessment}
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Generate Assessment
                </Button>
              )}
            </div>

            {transcription && (
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-1">Transcription:</p>
                <p className="text-sm text-gray-600">{transcription.substring(0, 150)}...</p>
              </div>
            )}
          </div>

          {/* Nursing Priorities */}
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Nursing Priorities</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Vital Signs</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Safety Assessment</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Activity className="w-4 h-4 text-green-500" />
                <span>Pain Management</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>Education Needs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="notes">Nursing Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="assessment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Nursing Assessment</span>
                      <Button 
                        onClick={handleSaveAssessment} 
                        disabled={isSaving}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Document your nursing assessment including patient's current condition, vital signs, pain level, mobility, safety concerns, and educational needs..."
                      value={nursingAssessment}
                      onChange={(e) => setNursingAssessment(e.target.value)}
                      className="min-h-[400px] resize-none"
                    />
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                      <FileText className="w-4 h-4 mr-1" />
                      {nursingAssessment.length} characters
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interventions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Nursing Interventions</span>
                      <Button 
                        onClick={handleSaveInterventions} 
                        disabled={isSaving}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Document nursing interventions performed, medications administered, patient education provided, and patient responses to interventions..."
                      value={nursingInterventions}
                      onChange={(e) => setNursingInterventions(e.target.value)}
                      className="min-h-[400px] resize-none"
                    />
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                      <Activity className="w-4 h-4 mr-1" />
                      {nursingInterventions.length} characters
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>General Nursing Notes</span>
                      <Button 
                        onClick={handleSaveNotes} 
                        disabled={isSaving}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Additional nursing notes, observations, patient interactions, family communications, and care coordination notes..."
                      value={nursingNotes}
                      onChange={(e) => setNursingNotes(e.target.value)}
                      className="min-h-[400px] resize-none"
                    />
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                      <FileText className="w-4 h-4 mr-1" />
                      {nursingNotes.length} characters
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}