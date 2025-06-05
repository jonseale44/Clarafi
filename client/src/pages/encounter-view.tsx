import { useParams, useLocation } from "wouter";
import { EncounterDetailView } from "@/components/patient/encounter-detail-view";
import { useQuery } from "@tanstack/react-query";
import { Patient, Encounter } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function EncounterView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const encounterId = parseInt(id || "0");

  console.log('🔍 [EncounterView] Loading encounter ID:', encounterId);
  console.log('🔍 [EncounterView] Raw ID param:', id);

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
    <div className="h-screen bg-background">
      <EncounterDetailView 
        patient={patient} 
        encounterId={encounterId} 
        onBackToChart={handleBackToChart}
      />
    </div>
  );
}