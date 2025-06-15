import { useQuery } from "@tanstack/react-query";
import { EncounterDetailView } from "./encounter-detail-view";
import { NursingEncounterView } from "./nursing-encounter-view";
import type { Patient, User as UserType } from "@shared/schema";

interface RoleBasedEncounterViewProps {
  patient: Patient;
  encounterId: number;
  encounter?: any;
  onBackToChart: () => void;
}

export function RoleBasedEncounterView({ 
  patient, 
  encounterId, 
  encounter, 
  onBackToChart 
}: RoleBasedEncounterViewProps) {
  // Get current user to determine role
  const { data: currentUser, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading encounter view...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate encounter view based on user role
  switch (currentUser?.role) {
    case 'nurse':
      return (
        <NursingEncounterView
          patient={patient}
          encounterId={encounterId}
          onBackToChart={onBackToChart}
        />
      );
    
    case 'provider':
    case 'admin':
    default:
      return (
        <EncounterDetailView
          patient={patient}
          encounterId={encounterId}
          encounter={encounter}
          onBackToChart={onBackToChart}
        />
      );
  }
}