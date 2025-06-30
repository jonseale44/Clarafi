import { EnhancedMedicalProblemsList } from "./enhanced-medical-problems-list";
import { EnhancedMedicationsList } from "./enhanced-medications-list";
import { SurgicalHistorySection } from "./surgical-history-section";
import { PatientAttachments } from "./patient-attachments";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import { EncountersTab } from "./encounters-tab";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { VitalsTrendingGraph } from "@/components/vitals/vitals-trending-graph";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Expand, Minimize2, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";

interface SharedChartSectionsProps {
  patientId: number;
  mode: "patient-chart" | "encounter";
  encounterId?: number;
  isReadOnly?: boolean;
  sectionId?: string;
  highlightAttachmentId?: number;
  // Medical problems animation props
  isAutoGeneratingMedicalProblems?: boolean;
  medicalProblemsProgress?: number;
  // Layout control props
  compactMode?: boolean;
  isExpanded?: boolean;
}

// Enhanced Vitals Section Component with Expandable View
function VitalsSection({ patientId, encounterId, mode }: { 
  patientId: number, 
  encounterId?: number, 
  mode: "patient-chart" | "encounter" 
}) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  
  const { data: patient } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId
  }) as { data?: any };

  // Always fetch patient vitals to show historical data in encounter view
  const { data: vitalsData } = useQuery({
    queryKey: [`/api/vitals/patient/${patientId}`],
    enabled: !!patientId
  }) as { data?: any };

  // Normalize vitals data - handle both wrapped and direct array responses
  const vitalsArray = (vitalsData as any)?.data || (vitalsData as any) || [];
  const vitalsEntries = Array.isArray(vitalsArray) ? vitalsArray : [];
  
  // Get latest vitals for compact summary
  const latestVitals = vitalsEntries[0];
  
  // Calculate summary stats
  const vitalsCount = vitalsEntries.length;
  const hasAlerts = vitalsEntries.some((v: any) => v.alerts?.length > 0);

  // Always show the full view as baseline
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {vitalsCount} entries
          </Badge>
          {hasAlerts && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Alerts
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullScreenOpen(true)}
          className="text-gray-700 hover:text-gray-900"
        >
          <Expand className="h-4 w-4 mr-1" />
          Full Screen
        </Button>
      </div>
      
      <Tabs defaultValue="flowsheet" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flowsheet">Vitals Table</TabsTrigger>
          <TabsTrigger value="trending">Trending Graph</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flowsheet" className="mt-4">
          <VitalsFlowsheet
            encounterId={encounterId!}
            patientId={patientId}
            patient={patient as any}
            readOnly={false}
            showAllPatientVitals={true}
          />
        </TabsContent>
        
        <TabsContent value="trending" className="mt-4">
          <VitalsTrendingGraph
            vitalsEntries={vitalsEntries}
            patientId={patientId}
          />
        </TabsContent>
      </Tabs>

      {/* Full Screen Modal */}
      <Dialog open={isFullScreenOpen} onOpenChange={setIsFullScreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                <DialogTitle className="text-xl">Vitals - Full Screen View</DialogTitle>
                <Badge variant="secondary">
                  {vitalsCount} entries
                </Badge>
                {hasAlerts && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Alerts
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto px-6 py-4">
            <Tabs defaultValue="flowsheet" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="flowsheet">Vitals Table</TabsTrigger>
                <TabsTrigger value="trending">Trending Graph</TabsTrigger>
              </TabsList>
              
              <TabsContent value="flowsheet" className="mt-4">
                <VitalsFlowsheet
                  encounterId={encounterId!}
                  patientId={patientId}
                  patient={patient as any}
                  readOnly={false}
                  showAllPatientVitals={true}
                />
              </TabsContent>
              
              <TabsContent value="trending" className="mt-4">
                <VitalsTrendingGraph
                  vitalsEntries={vitalsEntries}
                  patientId={patientId}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SharedChartSections({ 
  patientId, 
  mode, 
  encounterId,
  isReadOnly = false,
  sectionId,
  highlightAttachmentId,
  isAutoGeneratingMedicalProblems = false,
  medicalProblemsProgress = 0
}: SharedChartSectionsProps) {
  
  const renderSectionContent = (targetSectionId: string) => {
    switch (targetSectionId) {
      case "encounters":
        // EncountersTab component handles its own data fetching
        const EncountersWrapper = () => {
          const { data: encounters = [] } = useQuery({
            queryKey: [`/api/patients/${patientId}/encounters`],
          });
          
          return (
            <EncountersTab 
              encounters={encounters as any[]} 
              patientId={patientId} 
              onRefresh={() => {
                // Refresh encounters data
                // This will be handled by React Query refetch
              }}
            />
          );
        };
        
        return <EncountersWrapper />;
      
      case "problems":
        return (
          <EnhancedMedicalProblemsList 
            patientId={patientId} 
            encounterId={encounterId}
            mode={mode}
            isReadOnly={isReadOnly}
            isAutoGeneratingMedicalProblems={isAutoGeneratingMedicalProblems}
            medicalProblemsProgress={medicalProblemsProgress}
          />
        );
      
      case "medication":
        return (
          <EnhancedMedicationsList 
            patientId={patientId} 
            encounterId={encounterId}
            readOnly={isReadOnly}
          />
        );
      
      case "allergies":
        return (
          <div className="emr-tight-spacing">
            <Card>
              <CardContent className="pt-3 emr-card-content-tight">
                <div className="text-center py-4 text-gray-500">
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
          <div className="emr-tight-spacing">
            <Card>
              <CardContent className="pt-3 emr-card-content-tight">
                <div className="text-center py-4 text-gray-500">
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
          <div className="emr-tight-spacing">
            <Card>
              <CardContent className="pt-3 emr-card-content-tight">
                <div className="text-center py-4 text-gray-500">
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
          <div className="emr-tight-spacing">
            <Card>
              <CardContent className="pt-3 emr-card-content-tight">
                <div className="text-center py-4 text-gray-500">
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
          <div className="emr-tight-spacing">
            <SurgicalHistorySection
              patientId={patientId}
              encounterId={encounterId}
              mode={mode}
              isReadOnly={isReadOnly}
            />
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