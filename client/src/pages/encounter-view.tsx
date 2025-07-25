import { useParams, useLocation } from "wouter";
import { RoleBasedEncounterView } from "@/components/patient/role-based-encounter-view";
import { useQuery } from "@tanstack/react-query";
import { Patient, Encounter } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NavigationBreadcrumb } from "@/components/ui/navigation-breadcrumb";

export function EncounterView() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const { id } = params;
  const encounterId = parseInt(id || "0");

  console.log('🔍 [EncounterView] Full params object:', params);
  console.log('🔍 [EncounterView] Current location:', location);
  console.log('🔍 [EncounterView] Window location:', window.location.pathname);
  console.log('🔍 [EncounterView] Raw ID param:', id);
  console.log('🔍 [EncounterView] Parsed encounter ID:', encounterId);

  const { data: encounter, isLoading: encounterLoading, error: encounterError } = useQuery<Encounter>({
    queryKey: [`/api/encounters/${encounterId}`],
    enabled: !!encounterId,
  });

  console.log('🔍 [EncounterView] Encounter query result:', { encounter, encounterLoading, encounterError });

  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<Patient>({
    queryKey: [`/api/patients/${encounter?.patientId}`],
    enabled: !!encounter?.patientId,
  });

  console.log('🔍 [EncounterView] Patient query result:', { patient, patientLoading, patientError });

  const isLoading = encounterLoading || patientLoading;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading encounter information...</p>
        </div>
      </div>
    );
  }

  if (!encounter || !patient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Encounter Not Found</h2>
          <p className="text-gray-600 mb-4">The requested encounter could not be found.</p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleBackToChart = () => {
    setLocation("/");
  };

  return (
    <div className="h-screen bg-background flex flex-col" data-median="encounter-view-container">
      {/* Navigation breadcrumb for hyperlink navigation */}
      <NavigationBreadcrumb />
      
      {/* Mobile-only Fixed Header with Patient Name */}
      <div 
        className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 md:hidden" 
        data-median="mobile-patient-header-encounter"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToChart}
              data-median="mobile-back-button-encounter"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {patient.firstName} {patient.lastName}
              </h1>
              {encounter?.chiefComplaint && (
                <span className="text-sm text-gray-500 truncate max-w-32">
                  • {encounter.chiefComplaint}
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            #{encounterId}
          </div>
        </div>
      </div>
      
      <div className="flex-1" data-median="mobile-encounter-main">
        <RoleBasedEncounterView 
          patient={patient} 
          encounterId={encounterId} 
          encounter={encounter}
          onBackToChart={handleBackToChart}
        />
      </div>
    </div>
  );
}