import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, Zap, Building, FileText, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeploymentReadinessReport {
  overallReadiness: number;
  canDeployToday: boolean;
  clinicOnboardingTime: string;
  systemCapabilities: {
    labCatalogTests: number;
    supportedCategories: string[];
    gptProcessingReady: boolean;
    mockLabReady: boolean;
    realLabReady: boolean;
    patientCommunicationReady: boolean;
  };
  integrationStatus: {
    questDiagnostics: 'not_integrated' | 'ready_for_integration' | 'live';
    labcorp: 'not_integrated' | 'ready_for_integration' | 'live';
    hospitalLabs: 'not_integrated' | 'ready_for_integration' | 'live';
  };
  clinicOnboardingSteps: Array<{
    step: number;
    description: string;
    estimatedTime: string;
    automated: boolean;
    dependencies: string[];
  }>;
  marketingRecommendations: string[];
  technicalRecommendations: string[];
}

export function DeploymentReadinessDashboard() {
  const { toast } = useToast();
  const [selectedLab, setSelectedLab] = useState<string>("");

  // Fetch deployment readiness report
  const { data: readinessReport, isLoading } = useQuery<DeploymentReadinessReport>({
    queryKey: ['/api/lab-deployment/readiness'],
  });

  // Fetch supported labs
  const { data: supportedLabs } = useQuery({
    queryKey: ['/api/lab-deployment/supported-labs'],
  });

  // Request lab integration mutation
  const requestIntegrationMutation = useMutation({
    mutationFn: async (labId: string) => {
      const response = await fetch('/api/lab-deployment/request-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId,
          clinicInfo: "Test clinic integration request",
          estimatedVolume: "medium",
          urgency: "normal"
        }),
      });
      if (!response.ok) throw new Error('Failed to request integration');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Integration Request Submitted",
        description: `Request ID: ${data.request_id}. Business development will contact you within 24 hours.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Submit Request",
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Analyzing deployment readiness...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!readinessReport) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            Failed to load deployment readiness report
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getIntegrationStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="default">Live</Badge>;
      case 'ready_for_integration':
        return <Badge variant="secondary">Ready for Integration</Badge>;
      case 'not_integrated':
        return <Badge variant="outline">Not Integrated</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Readiness Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Production Deployment Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Readiness Score</h3>
                <p className="text-sm text-gray-600">
                  Clinic onboarding time: {readinessReport.clinicOnboardingTime}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={readinessReport.overallReadiness} className="w-32" />
                <span className="text-2xl font-bold">{readinessReport.overallReadiness}%</span>
              </div>
            </div>

            {readinessReport.canDeployToday ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-green-700">Ready for Production Deployment</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-yellow-700">Near Production Ready</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="capabilities" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="capabilities">System Capabilities</TabsTrigger>
          <TabsTrigger value="integrations">Lab Integrations</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Steps</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current System Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Lab Test Catalog</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(readinessReport.systemCapabilities.labCatalogTests >= 80)}
                  <span>{readinessReport.systemCapabilities.labCatalogTests} LOINC tests</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>GPT Attachment Processing</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(readinessReport.systemCapabilities.gptProcessingReady)}
                  <span>AI-powered document parsing</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Mock Lab Service</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(readinessReport.systemCapabilities.mockLabReady)}
                  <span>Full workflow testing</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Real Lab Service</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(readinessReport.systemCapabilities.realLabReady)}
                  <span>External lab connections</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Patient Communication</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(readinessReport.systemCapabilities.patientCommunicationReady)}
                  <span>Automated result notifications</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Supported Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {readinessReport.systemCapabilities.supportedCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External Lab Integration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Quest Diagnostics</span>
                  <p className="text-sm text-gray-600">35% market share</p>
                </div>
                <div className="flex items-center gap-2">
                  {getIntegrationStatusBadge(readinessReport.integrationStatus.questDiagnostics)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestIntegrationMutation.mutate('quest')}
                    disabled={requestIntegrationMutation.isPending}
                  >
                    Request Integration
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">LabCorp</span>
                  <p className="text-sm text-gray-600">30% market share</p>
                </div>
                <div className="flex items-center gap-2">
                  {getIntegrationStatusBadge(readinessReport.integrationStatus.labcorp)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestIntegrationMutation.mutate('labcorp')}
                    disabled={requestIntegrationMutation.isPending}
                  >
                    Request Integration
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Hospital Labs</span>
                  <p className="text-sm text-gray-600">Regional coverage</p>
                </div>
                <div className="flex items-center gap-2">
                  {getIntegrationStatusBadge(readinessReport.integrationStatus.hospitalLabs)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestIntegrationMutation.mutate('hospital')}
                    disabled={requestIntegrationMutation.isPending}
                  >
                    Request Integration
                  </Button>
                </div>
              </div>

              {supportedLabs && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    <Zap className="inline h-4 w-4 mr-1" />
                    Immediate Solution Available
                  </h4>
                  <p className="text-sm text-green-700">
                    {supportedLabs.immediate_option}: Start processing labs today from any worldwide source using GPT-powered attachment processing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Onboarding Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readinessReport.clinicOnboardingSteps.map((step) => (
                  <div key={step.step} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.description}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>⏱️ {step.estimatedTime}</span>
                        <Badge variant={step.automated ? "default" : "secondary"}>
                          {step.automated ? "Automated" : "Manual"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Marketing Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {readinessReport.marketingRecommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Technical Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {readinessReport.technicalRecommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}