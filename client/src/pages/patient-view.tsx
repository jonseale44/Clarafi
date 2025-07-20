import { useParams, useLocation } from "wouter";
import { PatientChartView } from "@/components/patient/patient-chart-view";
import { useQuery } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NavigationBreadcrumb } from "@/components/ui/navigation-breadcrumb";

export function PatientView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const patientId = parseInt(id || "0");

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient information...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-4">The requested patient could not be found.</p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col" data-median="patient-view-container">
      {/* Navigation breadcrumb for hyperlink navigation */}
      <NavigationBreadcrumb />
      
      <div className="bg-white border-b border-gray-200 px-6 py-3" data-median="mobile-patient-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              data-median="mobile-back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span data-median="hide-on-mobile-app">Back to Dashboard</span>
            </Button>
            <h1 className="text-xl font-semibold">
              {patient.firstName} {patient.lastName}
            </h1>
          </div>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto" data-median="mobile-patient-main">
        <PatientChartView patient={patient} patientId={patientId} />
      </main>
    </div>
  );
}