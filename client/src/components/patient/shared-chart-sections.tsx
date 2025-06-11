import { MedicalProblemsSection } from "./medical-problems-section";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface SharedChartSectionsProps {
  patientId: number;
  mode: "patient-chart" | "encounter";
  encounterId?: number;
  isReadOnly?: boolean;
}

export function SharedChartSections({ 
  patientId, 
  mode, 
  encounterId,
  isReadOnly = false 
}: SharedChartSectionsProps) {
  
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "problems":
        return (
          <MedicalProblemsSection 
            patientId={patientId} 
            encounterId={encounterId}
            mode={mode}
            isReadOnly={isReadOnly}
          />
        );
      
      case "medication":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Medications</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Medications management coming soon</p>
                  <p className="text-sm">Full CRUD functionality will be available here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
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
            <h2 className="text-xl font-semibold">Lab Results</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Lab results management coming soon</p>
                  <p className="text-sm">View and manage lab orders and results here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "vitals":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vital Signs</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Vitals management coming soon</p>
                  <p className="text-sm">Track patient vital signs over time.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
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
      
      case "attachments":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Attachments</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Document attachments coming soon</p>
                  <p className="text-sm">Upload and manage patient documents.</p>
                </div>
              </CardContent>
            </Card>
          </div>
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

  return <>{renderSectionContent}</>;
}