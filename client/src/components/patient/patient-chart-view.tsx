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
import { analytics } from "@/lib/analytics";

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
  { id: "family-history", label: "Family History", icon: null },
  { id: "social-history", label: "Social History", icon: null },
  { id: "surgical-history", label: "Surgical History", icon: null },
  { id: "attachments", label: "Attachments", icon: null },
  { id: "appointments", label: "Appointments", icon: null },
  { id: "documents", label: "Patient Documents", icon: null },
  { id: "prescription-history", label: "Prescription History", icon: null },

];



export function PatientChartView({ patient, patientId }: PatientChartViewProps) {
  // State preservation key for this patient's chart
  const stateKey = `patient-chart-state-${patientId}`;
  
  // Initialize state with potential restoration from sessionStorage
  const getInitialExpandedSections = () => {
    try {
      const savedState = sessionStorage.getItem(stateKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('🔄 [StateRestore] Restoring accordion state:', parsed.expandedSections);
        return new Set<string>(parsed.expandedSections || []);
      }
    } catch (error) {
      console.warn('🔄 [StateRestore] Failed to restore state:', error);
    }
    return new Set<string>(["encounters"]); // Default state
  };

  const getInitialActiveSection = () => {
    try {
      const savedState = sessionStorage.getItem(stateKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('🔄 [StateRestore] Restoring active section:', parsed.activeSection);
        // Only restore if it's not "attachments" (to fix the stuck state issue)
        if (parsed.activeSection && parsed.activeSection !== "attachments") {
          return parsed.activeSection;
        }
      }
    } catch (error) {
      console.warn('🔄 [StateRestore] Failed to restore active section:', error);
    }
    return "encounters"; // Default state
  };

  const [activeSection, setActiveSection] = useState(getInitialActiveSection());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(getInitialExpandedSections());
  const [currentEncounterId, setCurrentEncounterId] = useState<number | null>(null);
  const [showEncounterDetail, setShowEncounterDetail] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle URL parameters for navigation from vitals to attachments
  const [highlightAttachmentId, setHighlightAttachmentId] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  
  // Monitor URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href);
    };
    
    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', handleUrlChange);
    
    // Monitor for programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleUrlChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleUrlChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  
  // React to URL changes
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
  }, [currentUrl]);

  // Save current state to sessionStorage whenever it changes
  useEffect(() => {
    const currentState = {
      activeSection,
      expandedSections: Array.from(expandedSections),
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(stateKey, JSON.stringify(currentState));
      console.log('💾 [StateSave] Saved chart state:', currentState);
    } catch (error) {
      console.warn('💾 [StateSave] Failed to save state:', error);
    }
  }, [activeSection, expandedSections, stateKey]);

  // Enhanced URL parameter handling with state preservation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const highlight = urlParams.get('highlight');
    const returnUrl = urlParams.get('returnUrl');
    const fromSection = urlParams.get('from');
    
    console.log('🔗 [PatientChart] Enhanced URL parameters:', { 
      section, 
      highlight,
      returnUrl,
      fromSection,
      currentLocation: window.location.href,
      availableSections: chartSections.map(s => s.id)
    });
    
    // If navigating via badge (has returnUrl and fromSection), temporarily show target section
    if (section && returnUrl && fromSection) {
      console.log('🔄 [StateRestore] Badge navigation - temporarily showing section:', section);
      console.log('🔄 [StateRestore] Original section from badge:', fromSection);
      
      // Don't save the current attachments state - we want to return to the original section
      // Just temporarily show the target section
      setActiveSection(section);
      setExpandedSections(prev => new Set([...prev, section]));
    } else if (section && !returnUrl) {
      // Direct navigation to section (no badge navigation)
      console.log('🔄 [StateRestore] Direct navigation to section:', section);
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
  }, [currentUrl]);

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

  // Debug encounters data
  useEffect(() => {
    console.log('🏥 [PatientChart] Encounters data:', {
      encounters,
      encountersLength: Array.isArray(encounters) ? encounters.length : 0,
      encountersType: typeof encounters,
      isArray: Array.isArray(encounters),
      activeSection,
      shouldShowEncounters: activeSection === 'encounters'
    });
  }, [encounters, activeSection]);

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
    onSuccess: (encounter) => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/pending-encounters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Track encounter creation
      analytics.trackFeatureUsage('encounter_creation', 'created', {
        encounterType: encounter.encounterType,
        encounterSubtype: encounter.encounterSubtype,
        patientId: encounter.patientId,
        providerId: encounter.providerId,
        source: 'patient_chart'
      });
      
      // Track conversion event
      analytics.trackConversion({
        eventType: 'encounter_created',
        eventData: {
          encounterId: encounter.id,
          patientId: encounter.patientId,
          encounterType: encounter.encounterType,
          source: 'patient_chart'
        }
      });
      
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
          highlightAttachmentId={highlightAttachmentId ?? undefined}
        />;

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
    <div className="flex h-full" data-median="patient-chart-main">
      {/* Mobile-specific full-width chart panel */}
      <div className="hidden" data-median="mobile-full-width-chart">
        <UnifiedChartPanel
          patient={patient}
          config={{
            context: 'patient-chart',
            userRole: (currentUser as any)?.role,
            allowResize: false,
            defaultWidth: "w-full",
            maxExpandedWidth: "100vw",
            enableSearch: true
          }}
          highlightAttachmentId={highlightAttachmentId ?? undefined}
          activeSection={activeSection}
          onSectionChange={(sectionId) => {
            console.log('🔗 [PatientChartView] Received section change:', sectionId);
            setActiveSection(sectionId);
          }}
        />
      </div>

      {/* Desktop Chart Panel - Unified Resizable */}
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
        highlightAttachmentId={highlightAttachmentId ?? undefined}
        activeSection={activeSection}
        onSectionChange={(sectionId) => {
          console.log('🔗 [PatientChartView] Received section change:', sectionId);
          setActiveSection(sectionId);
        }}
        data-median="patient-chart-sidebar desktop-chart-panel"
      />

      {/* Main Content - Desktop Only */}
      <div className="flex-1 patient-header overflow-y-auto" data-median="patient-chart-content desktop-only">
        <div className="max-w-full">
          <div className="flex items-center justify-between mb-4" data-median="patient-chart-header">
            <div>
              <h1 className="patient-title font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-gray-600 text-sm" data-median="patient-chart-info">
                Patient Chart • DOB: {formatDate(patient.dateOfBirth)} • Age: {calculateAge(patient.dateOfBirth)}
              </p>
            </div>
            <Button onClick={handleStartNewEncounter} className="bg-slate-700 hover:bg-slate-800 text-white" data-median="new-encounter-button">
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