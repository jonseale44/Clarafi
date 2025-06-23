import { EnhancedMedicalProblemsList } from "./enhanced-medical-problems-list";
import { EnhancedMedicationsList } from "./enhanced-medications-list";
import { PatientAttachments } from "./patient-attachments";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SharedChartSectionsProps {
  patientId: number;
  mode: "patient-chart" | "encounter";
  encounterId?: number;
  isReadOnly?: boolean;
  sectionId?: string;
  highlightAttachmentId?: number;
}

// Vitals Section Component
function VitalsSection({ patientId, encounterId, mode }: { 
  patientId: number, 
  encounterId?: number, 
  mode: "patient-chart" | "encounter" 
}) {
  const { data: patient } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId
  });

  return (
    <div className="space-y-4">
      <VitalsFlowsheet
        encounterId={encounterId!}
        patientId={patientId}
        patient={patient as any}
        readOnly={false}
        showAllPatientVitals={true}
      />
    </div>
  );
}

export function SharedChartSections({ 
  patientId, 
  mode, 
  encounterId,
  isReadOnly = false,
  sectionId,
  highlightAttachmentId
}: SharedChartSectionsProps) {
  
  const renderSectionContent = (targetSectionId: string) => {
    switch (targetSectionId) {
      case "problems":
        return (
          <EnhancedMedicalProblemsList 
            patientId={patientId} 
            encounterId={encounterId}
            mode={mode}
            isReadOnly={isReadOnly}
          />
        );
      
      case "medication":
        return (
          <EnhancedMedicationsList 
            patientId={patientId} 
            readOnly={isReadOnly}
          />
        );
      
      case "allergies":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Allergies</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Allergies management coming soon</p>
                  <p className="text-sm">Full CRUD functionality will be available here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "labs":
        return (
          <div className="space-y-4">
            <LabResultsMatrix 
              patientId={patientId} 
              mode={mode === "encounter" ? "compact" : "full"}
              encounterId={encounterId}
            />
          </div>
        );
      
      case "vitals":
        return <VitalsSection patientId={patientId} encounterId={encounterId} mode={mode} />;
      
      case "imaging":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Imaging</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Imaging management coming soon</p>
                  <p className="text-sm">View imaging orders and results here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "family-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Family History</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Family history management coming soon</p>
                  <p className="text-sm">Record family medical history here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "social-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Social History</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Social history management coming soon</p>
                  <p className="text-sm">Document smoking, alcohol, occupation history.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "surgical-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Surgical History</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Surgical history management coming soon</p>
                  <p className="text-sm">Track surgical procedures and outcomes.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "documents":
        return (
          <EmbeddedPDFViewer 
            patientId={patientId} 
            title="Patient Documents"
            showAllPDFs={false}
          />
        );

      case "attachments":
        console.log('🔗 [SharedChartSections] Rendering attachments with highlight:', highlightAttachmentId);
        return (
          <PatientAttachments 
            patientId={patientId} 
            encounterId={encounterId}
            mode={mode}
            isReadOnly={isReadOnly}
            highlightAttachmentId={highlightAttachmentId}
          />
        );
      
      case "appointments":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Appointments</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Appointments management coming soon</p>
                  <p className="text-sm">Schedule and manage patient appointments.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return <div>Section not found</div>;
    }
  };

  // If sectionId is provided, render that specific section
  if (sectionId) {
    return <>{renderSectionContent(sectionId)}</>;
  }

  // Otherwise, return the render function for external use
  return <>{renderSectionContent}</>;
}