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
                      encounterId={encounter?.id}
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

                {transcription && (
                  <Button
                    onClick={generateAIAssessment}
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Generate Assessment
                  </Button>
                )}
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