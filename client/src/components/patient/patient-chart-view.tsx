import { useState, useEffect } from "react";
import { Patient } from "@shared/schema";
import { EncounterDetailView } from "./encounter-detail-view";
import { NursingEncounterView } from "./nursing-encounter-view";
import { UnifiedChartPanel } from "./unified-chart-panel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

interface PatientChartViewProps {
  patient: Patient;
  patientId: number;
}

export function PatientChartView({ patient, patientId }: PatientChartViewProps) {
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
      // Clear URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleBackToChart = () => {
    setShowEncounterDetail(false);
    setCurrentEncounterId(null);
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

  // Main patient chart view with unified panel
  return (
    <div className="flex h-screen bg-gray-100">
      <UnifiedChartPanel
        patient={patient}
        config={{
          context: 'patient-chart',
          userRole: (currentUser as any)?.role,
          allowResize: true,
          defaultWidth: 'w-80',
          maxExpandedWidth: '90vw',
          enableSearch: true
        }}
      />
      
      {/* Main content area for future use */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold mb-2">Patient Chart</h2>
          <p>Select a section from the left panel to view details</p>
        </div>
      </div>
    </div>
  );
}