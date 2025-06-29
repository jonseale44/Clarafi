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
import { EnhancedMedicalProblemsList } from "./enhanced-medical-problems-list";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { User as UserType } from "@shared/schema";

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

export function PatientChartView({ patient, patientId }: PatientChartViewProps) {
  const [activeSection, setActiveSection] = useState("encounters");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["encounters"]));
  const [currentEncounterId, setCurrentEncounterId] = useState<number | null>(null);
  const [showEncounterDetail, setShowEncounterDetail] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user for role-based routing
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  // Handle URL parameters for navigation from vitals to attachments
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightAttachmentId = urlParams.get('highlightAttachment');
    
    if (highlightAttachmentId) {
      // Switch to attachments section and highlight the specific attachment
      setActiveSection('attachments');
      const newExpandedSections = new Set([...expandedSections]);
      newExpandedSections.add('attachments');
      setExpandedSections(newExpandedSections);
      
      // Clear URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Fetch encounters for the encounters tab
  const { data: encounters = [], refetch: refetchEncounters, isLoading: encountersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/encounters`],
  });

  const createEncounterMutation = useMutation({
    mutationFn: async (newEncounter: any) => {
      const response = await fetch(`/api/patients/${patientId}/encounters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEncounter),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create encounter");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "New encounter created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/pending-encounters"] });
      
      // Navigate to the new encounter
      setCurrentEncounterId(data.id);
      setShowEncounterDetail(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create encounter",
        variant: "destructive",
      });
    },
  });

  const handleBackToChart = () => {
    setShowEncounterDetail(false);
    setCurrentEncounterId(null);
  };

  const handleEncounterSelect = (encounterId: number) => {
    setCurrentEncounterId(encounterId);
    setShowEncounterDetail(true);
  };

  const handleNewEncounter = () => {
    const newEncounter = {
      patientId: patientId,
      providerId: (currentUser as any)?.id || 1,
      encounterType: "Office Visit",
      status: "scheduled",
      scheduledDate: new Date().toISOString(),
    };

    createEncounterMutation.mutate(newEncounter);
  };

  const toggleSection = (sectionId: string) => {
    const newExpandedSections = new Set([...expandedSections]);
    if (newExpandedSections.has(sectionId)) {
      newExpandedSections.delete(sectionId);
    } else {
      newExpandedSections.add(sectionId);
    }
    setExpandedSections(newExpandedSections);
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

  // Main patient chart view
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Chart Sections */}
      <div className="w-80 bg-white shadow-md border-r border-gray-200 flex flex-col">
        {/* Patient Header */}
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src="/placeholder-patient.jpg"
                alt={`${patient.firstName} ${patient.lastName}`}
              />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {patient.firstName?.[0]}{patient.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-600">MRN: {patient.mrn}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 mt-3">
            <Button variant="outline" size="sm" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search patient chart..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <CollapsibleTrigger asChild>
                <div
                  className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                    activeSection === section.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center space-x-2">
                    {section.icon && <section.icon className="h-4 w-4 text-gray-500" />}
                    <span className="text-sm font-medium text-gray-700">{section.label}</span>
                  </div>
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
                    <div className="space-y-2">
                      <Button
                        onClick={handleNewEncounter}
                        disabled={createEncounterMutation.isPending}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createEncounterMutation.isPending ? "Creating..." : "New Encounter"}
                      </Button>
                      <EncountersTab
                        encounters={encounters}
                        patientId={patientId}
                        onRefresh={refetchEncounters}
                      />
                    </div>
                  ) : section.id === "problems" ? (
                    <EnhancedMedicalProblemsList patientId={patientId} />
                  ) : section.id === "labs" ? (
                    <LabResultsMatrix patientId={patientId} />
                  ) : section.id === "documents" ? (
                    <EmbeddedPDFViewer
                      patientId={patientId}
                      title="Patient Documents"
                      maxHeight="300px"
                    />
                  ) : (
                    <SharedChartSections
                      patientId={patientId}
                      mode="patient-chart"
                      encounterId={null}
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

      {/* Right Panel - Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {activeSection === "ai-debug" && (
          <div className="p-6 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center space-x-2 mb-4">
              <Bot className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-amber-800">AI Assistant Debug Panel</h2>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              This panel provides debugging information for AI-powered features in the patient chart.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {activeSection === "encounters" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Star className="h-6 w-6 mr-2 text-yellow-500" />
                  Patient Encounters
                </h2>
                <Button
                  onClick={handleNewEncounter}
                  disabled={createEncounterMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createEncounterMutation.isPending ? "Creating..." : "New Encounter"}
                </Button>
              </div>
              <EncountersTab
                encounters={encounters}
                patientId={patientId}
                onRefresh={refetchEncounters}
              />
            </div>
          )}

          {activeSection === "problems" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Medical Problems</h2>
              <EnhancedMedicalProblemsList patientId={patientId} />
            </div>
          )}

          {activeSection === "labs" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Laboratory Results</h2>
              <LabResultsMatrix patientId={patientId} />
            </div>
          )}

          {activeSection === "ai-debug" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">AI Assistant Debug</h2>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">Debug information and controls for AI features will appear here.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!["encounters", "problems", "labs", "ai-debug"].includes(activeSection) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {chartSections.find(s => s.id === activeSection)?.label || activeSection}
              </h2>
              <SharedChartSections
                patientId={patientId}
                mode="patient-chart"
                encounterId={null}
                isReadOnly={false}
                sectionId={activeSection}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}