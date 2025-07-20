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

  // Debug logging for role-based routing
  console.log("🔍 [RoleBasedEncounter] Current user:", currentUser);
  console.log("🔍 [RoleBasedEncounter] User role:", currentUser?.role);
  console.log("🔍 [RoleBasedEncounter] Is nurse?", currentUser?.role === 'nurse');

  // Route to appropriate encounter view based on user role
  if (currentUser?.role === 'nurse' || currentUser?.role === 'ma') {
    console.log("🩺 [RoleBasedEncounter] Routing to NursingEncounterView");
    return (
      <NursingEncounterView
        patient={patient}
        encounterId={encounterId}
        onBackToChart={onBackToChart}
      />
    );
  }

  // Default to provider view for all other roles
  console.log("🏥 [RoleBasedEncounter] Routing to EncounterDetailView (provider)");
  return (
    <EncounterDetailView
      patient={patient}
      encounterId={encounterId}
      encounter={encounter}
      onBackToChart={onBackToChart}
    />
  );
}