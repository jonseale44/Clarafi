import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Search, Star, RefreshCw, Bot } from "lucide-react";
import { Patient } from "@shared/schema";
import { EncountersTab } from "./encounters-tab";
import { EncounterDetailView } from "./encounter-detail-view";
import { NursingEncounterView } from "./nursing-encounter-view";
import { SharedChartSections } from "./shared-chart-sections";
import { UnifiedChartPanel } from "./unified-chart-panel";
import { EnhancedMedicalProblemsList } from "./enhanced-medical-problems-list";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface PatientChartViewProps {
  patient: Patient;
  patientId: number;
}

const chartSections = [
  { id: "encounters", label: "Patient Encounters", icon: Star },
  { id: "problems", label: "Medical Problems", icon: null },
  { id: "medication", label: "Medication", icon: null },
  { id: "allergies", label: "Allergies", icon: null },
  { id: "labs", label: "Labs", icon: null },
  { id: "vitals", label: "Vitals", icon: null },
  { id: "imaging", label: "Imaging", icon: null },
  { id: "documents", label: "Patient Documents", icon: null },
  { id: "family-history", label: "Family History", icon: null },
  { id: "social-history", label: "Social History", icon: null },
  { id: "surgical-history", label: "Surgical History", icon: null },
  { id: "attachments", label: "Attachments", icon: null },
  { id: "appointments", label: "Appointments", icon: null },
  { id: "ai-debug", label: "AI Assistant Debug", icon: null },
];

// AI Debug Section Component
function AIDebugSection({ patientId }: { patientId: number }) {
  const {
    data: assistantConfig,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant`],
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading assistant info...</div>
    );
  }

  if (error || !assistantConfig) {
    return <div className="p-4 text-sm text-red-600">No assistant found</div>;
  }

  const config = assistantConfig as any;

  return (
    <div className="p-4">
      <div className="text-sm space-y-3">
        <div>
          <span className="font-medium">Assistant:</span>{" "}
          {config?.name || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Model:</span>{" "}
          {config?.model || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Thread:</span>{" "}
          {config?.thread_id ? "Active" : "None"}
        </div>
        <Button size="sm" variant="outline" className="w-full">
          View Full Debug
        </Button>
      </div>
    </div>
  );
}

export function PatientChartView({ patient, patientId }: PatientChartViewProps) {
  const [activeSection, setActiveSection] = useState("encounters");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["encounters"]));
  const [currentEncounterId, setCurrentEncounterId] = useState<number | null>(null);
  const [showEncounterDetail, setShowEncounterDetail] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle URL parameters for navigation from vitals to attachments
  const [highlightAttachmentId, setHighlightAttachmentId] = useState<number | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const highlight = urlParams.get('highlight');
    
    console.log('🔗 [PatientChart] URL parameters:', { 
      section, 
      highlight, 
      currentLocation: window.location.href,
      availableSections: chartSections.map(s => s.id)
    });
    
    if (section && chartSections.some(s => s.id === section)) {
      console.log('🔗 [PatientChart] Setting active section:', section);
      setActiveSection(section);
      setExpandedSections(prev => new Set([...prev, section]));
    }
    
    if (highlight) {
      const attachmentId = parseInt(highlight);
      console.log('🔗 [PatientChart] Setting highlight attachment:', attachmentId);
      setHighlightAttachmentId(attachmentId);
      // Clear highlight after 5 seconds
      setTimeout(() => {
        console.log('🔗 [PatientChart] Clearing highlight after 5 seconds');
        setHighlightAttachmentId(null);
      }, 5000);
    }
  }, []);

  // Get current user to determine role-based routing
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch encounters with automatic refresh
  const { data: encounters = [], refetch: refetchEncounters } = useQuery({
    queryKey: [`/api/patients/${patientId}/encounters`],
    enabled: !!patientId,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });

  // Fetch allergies
  const { data: allergies = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "allergies"],
    enabled: !!patientId,
  });

  // Mutation to create new encounter
  const createEncounterMutation = useMutation({
    mutationFn: async (encounterData: any) => {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encounterData),
      });
      if (!response.ok) throw new Error('Failed to create encounter');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/pending-encounters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "New encounter created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartNewEncounter = async () => {
    const encounterData = {
      patientId: patientId,
      providerId: 1, // Assuming current user is provider
      encounterType: "Office Visit",
      encounterSubtype: "Routine",
      startTime: new Date().toISOString(),
      status: "In Progress",
      chiefComplaint: "",
      presentIllness: "",
      assessmentPlan: "",
      providerNotes: "",
    };

    createEncounterMutation.mutate(encounterData, {
      onSuccess: (newEncounter) => {
        setCurrentEncounterId(newEncounter.id);
        setShowEncounterDetail(true);
      }
    });
  };

  const handleBackToChart = () => {
    setShowEncounterDetail(false);
    setCurrentEncounterId(null);
  };

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
    if (!dateString) return 'Invalid Date';
    // Parse date as local date to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "encounters":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">Patient Encounters</h2>
              </div>
              <Button onClick={handleStartNewEncounter} className="bg-slate-700 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Encounter
              </Button>
            </div>
            <EncountersTab 
              encounters={Array.isArray(encounters) ? encounters : []} 
              patientId={patientId} 
              onRefresh={refetchEncounters}
            />
          </div>
        );
      case "problems":
        return <EnhancedMedicalProblemsList patientId={patientId} mode="patient-chart" isReadOnly={false} />;
      case "labs":
        return <LabResultsMatrix patientId={patientId} mode="full" />;
      case "documents":
        return <EmbeddedPDFViewer patientId={patientId} title="Patient Documents" />;
      case "medication":
      case "allergies":
      case "vitals":
      case "imaging":
      case "family-history":
      case "social-history":
      case "surgical-history":
      case "attachments":
      case "appointments":
        return <SharedChartSections 
          patientId={patientId} 
          mode="patient-chart" 
          isReadOnly={false} 
          sectionId={activeSection}
          highlightAttachmentId={highlightAttachmentId}
        />;
      case "ai-debug":
        return <AIDebugSection patientId={patientId} />;
      default:
        return <div>Section not found</div>;
    }
  };

  // Show role-based encounter view if in encounter mode
  if (showEncounterDetail && currentEncounterId) {
    const userRole = (currentUser as any)?.role;
    const isNurse = userRole === "nurse";

    console.log("🔍 [PatientChart] Current user:", currentUser);
    console.log("🔍 [PatientChart] User role:", userRole);
    console.log("🔍 [PatientChart] Is nurse?", isNurse);

    if (isNurse) {
      console.log("🩺 [PatientChart] Routing to NursingEncounterView");
      return (
        <NursingEncounterView 
          patient={patient} 
          encounterId={currentEncounterId} 
          onBackToChart={handleBackToChart}
        />
      );
    } else {
      console.log("🏥 [PatientChart] Routing to EncounterDetailView (provider)");
      return (
        <EncounterDetailView 
          patient={patient} 
          encounterId={currentEncounterId} 
          onBackToChart={handleBackToChart}
        />
      );
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Chart Panel - Unified Resizable */}
      <UnifiedChartPanel
        patient={patient}
        config={{
          context: 'patient-chart',
          userRole: (currentUser as any)?.role,
          allowResize: true,
          defaultWidth: "w-80",
          maxExpandedWidth: "90vw",
          enableSearch: true
        }}
        highlightAttachmentId={highlightAttachmentId}
      />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-gray-600">
                Patient Chart • DOB: {formatDate(patient.dateOfBirth)} • Age: {calculateAge(patient.dateOfBirth)}
              </p>
            </div>
            <Button onClick={handleStartNewEncounter} className="bg-slate-700 hover:bg-slate-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Encounter
            </Button>
          </div>
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}

function AIDebugSection({ patientId }: { patientId: number }) {
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: assistantConfig, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant`],
    enabled: !!patientId
  });

  const { data: threadMessages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant/messages`],
    enabled: !!patientId && !!(assistantConfig as any)?.thread_id
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchMessages()]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Debug
          </h2>
        </div>
        <div className="text-center py-8 text-gray-500">Loading assistant information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Debug
          </h2>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">No AI assistant found for this patient</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant Debug
        </h2>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {assistantConfig && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assistant Overview</span>
                <Badge variant="secondary">{(assistantConfig as any)?.model}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Assistant ID:</label>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">{(assistantConfig as any)?.id}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Thread ID:</label>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">{(assistantConfig as any)?.thread_id || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Name:</label>
                  <p className="mt-1">{(assistantConfig as any)?.name || 'Unnamed Assistant'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Created:</label>
                  <p className="mt-1">
                    {(assistantConfig as any)?.created_at ? new Date((assistantConfig as any).created_at * 1000).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Context & Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={(assistantConfig as any)?.instructions || 'No instructions provided'}
                readOnly
                className="min-h-[200px] font-mono text-xs"
              />
            </CardContent>
          </Card>

          {threadMessages && (threadMessages as any)?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Conversation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(threadMessages as any)?.map((message: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      message.role === 'assistant' ? 'bg-blue-50 border-l-4 border-blue-200' : 'bg-gray-50 border-l-4 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={message.role === 'assistant' ? 'default' : 'secondary'}>
                          {message.role}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at * 1000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(assistantConfig as any)?.tools && (assistantConfig as any)?.tools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {(assistantConfig as any)?.tools.map((tool: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {tool.type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}