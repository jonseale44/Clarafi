import { EnhancedMedicalProblemsList } from "./enhanced-medical-problems-list";
import { EnhancedMedicationsList } from "./enhanced-medications-list";
import { PatientAttachments } from "./patient-attachments";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
}

// Enhanced Vitals Section Component with Expandable View
function VitalsSection({ patientId, encounterId, mode }: { 
  patientId: number, 
  encounterId?: number, 
  mode: "patient-chart" | "encounter" 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: patient } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId
  });

  // Fetch vitals data for summary
  const { data: vitalsData } = useQuery({
    queryKey: mode === "encounter" && encounterId 
      ? [`/api/vitals/encounter/${encounterId}`]
      : [`/api/vitals/patient/${patientId}`],
    enabled: !!patientId
  });

  // Get latest vitals for compact summary
  const latestVitals = vitalsData?.data?.[0] || vitalsData?.[0];
  
  // Calculate summary stats
  const vitalsCount = vitalsData?.data?.length || vitalsData?.length || 0;
  const hasAlerts = vitalsData?.data?.some((v: any) => v.alerts?.length > 0) || 
                   vitalsData?.some((v: any) => v.alerts?.length > 0);

  if (isExpanded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Vitals - Full View</h3>
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
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Minimize2 className="h-4 w-4 mr-1" />
            Collapse
          </Button>
        </div>
        
        <VitalsFlowsheet
          encounterId={encounterId!}
          patientId={patientId}
          patient={patient as any}
          readOnly={false}
          showAllPatientVitals={mode === "patient-chart"}
        />
      </div>
    );
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Vitals Summary</CardTitle>
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
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <Expand className="h-4 w-4 mr-1" />
            Expand
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {latestVitals ? (
          <div className="space-y-3">
            {/* Latest Vitals Quick View */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Most Recent</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(latestVitals.recordedAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {latestVitals.systolicBp && latestVitals.diastolicBp && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">BP</span>
                    <span className="font-medium">
                      {latestVitals.systolicBp}/{latestVitals.diastolicBp}
                    </span>
                  </div>
                )}
                
                {latestVitals.heartRate && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">HR</span>
                    <span className="font-medium">{latestVitals.heartRate} bpm</span>
                  </div>
                )}
                
                {latestVitals.temperature && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Temp</span>
                    <span className="font-medium">{latestVitals.temperature}°F</span>
                  </div>
                )}
                
                {latestVitals.oxygenSaturation && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">SpO2</span>
                    <span className="font-medium">{latestVitals.oxygenSaturation}%</span>
                  </div>
                )}
              </div>
              
              {latestVitals.sourceType && latestVitals.sourceType !== 'manual_entry' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <Badge variant="outline" className="text-xs">
                    {latestVitals.sourceType === 'attachment_extracted' ? 'Document Extract' : latestVitals.sourceType}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {vitalsCount > 1 ? `${vitalsCount} total entries` : '1 entry'}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-xs"
              >
                View All & Add New
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No vitals recorded yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-xs"
            >
              Add First Entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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