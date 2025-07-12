import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  FileText, 
  TestTube, 
  Stethoscope, 
  CheckCircle, 
  AlertTriangle,
  User,
  Eye,
  PenTool,
  RefreshCw,
  MessageSquare,
  Send
} from "lucide-react";
// Legacy PDFViewer removed - PDFs are now in patient charts only
import { formatDistanceToNow, format } from "date-fns";

interface DashboardStats {
  pendingEncounters: number;
  labOrdersToReview: number;
  completedToday: number;
  imagingToReview: number;
  messagesUnread: number;
  prescriptionsToSign: number;
}

interface PendingEncounter {
  id: number;
  patientName: string;
  patientId: number;
  encounterType: string;
  startTime: string;
  status: string;
  chiefComplaint?: string;
  assignedProvider: string;
  roomNumber?: string;
  priority: string;
}

interface LabOrderToReview {
  id: number;
  patientName: string;
  patientId: number;
  testName: string;
  orderedDate: string;
  status: string;
  priority: string;
  results?: any;
  criticalFlag: boolean;
  encounterId?: number;
}

export function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedLabResult, setSelectedLabResult] = useState<LabOrderToReview | null>(null);
  const [selectedPatientGroup, setSelectedPatientGroup] = useState<any>(null);
  const [selectedLabForReview, setSelectedLabForReview] = useState<any>(null);
  const [showUniversalReview, setShowUniversalReview] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingInProgress, setReviewingInProgress] = useState(false);
  const [reviewedResultIds, setReviewedResultIds] = useState<Set<number>>(new Set());
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [selectedForUnreview, setSelectedForUnreview] = useState<any>(null);
  const [unreviewReason, setUnreviewReason] = useState("");

  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [selectedPatientForReview, setSelectedPatientForReview] = useState<{id: number, name: string} | null>(null);
  const [showFixedLabReview, setShowFixedLabReview] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user for permission checks
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending encounters
  const { data: pendingEncounters = [], isLoading: encountersLoading, refetch: refetchEncounters } = useQuery<PendingEncounter[]>({
    queryKey: ["/api/dashboard/pending-encounters"],
    refetchInterval: 30000,
  });

  // Fetch lab orders to review
  const { data: labOrders = [], isLoading: labOrdersLoading, refetch: refetchLabOrders } = useQuery<LabOrderToReview[]>({
    queryKey: ["/api/dashboard/lab-orders-to-review"],
    refetchInterval: 30000,
  });

  // Mutation for reviewing lab results
  const reviewLabResultMutation = useMutation({
    mutationFn: async ({ resultId, reviewNote }: { resultId: number; reviewNote: string }) => {
      const response = await fetch(`/api/dashboard/review-lab-result/${resultId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewNote }),
      });
      if (!response.ok) throw new Error('Failed to review lab result');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lab Result Reviewed",
        description: "The lab result has been successfully reviewed and marked as complete.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lab-orders-to-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsReviewDialogOpen(false);
      setSelectedLabResult(null);
      setReviewNote("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Review Failed",
        description: error.message || "Failed to review lab result. Please try again.",
      });
    },
  });

  // Mutation for signing encounters
  const signEncounterMutation = useMutation({
    mutationFn: async ({ encounterId, signatureNote }: { encounterId: number; signatureNote?: string }) => {
      const response = await fetch(`/api/dashboard/sign-encounter/${encounterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signatureNote }),
      });
      if (!response.ok) throw new Error('Failed to sign encounter');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Encounter Signed",
        description: "The encounter has been successfully signed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/pending-encounters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Signing Failed",
        description: error.message || "Failed to sign encounter. Please try again.",
      });
    },
  });

  // Event handlers
  const handleViewPatient = (patientId: number) => {
    // Navigate to patient chart
    window.location.href = `/patients/${patientId}`;
  };

  const handleStartEncounter = (encounterId: number) => {
    // Navigate to encounter detail view
    window.location.href = `/encounters/${encounterId}`;
  };

  const handleReviewLabResult = (lab: LabOrderToReview) => {
    setSelectedLabResult(lab);
    setReviewNote("");
    setGeneratedMessage("");
    setIsReviewDialogOpen(true);
  };

  const handleReviewResult = (resultId: number, testName: string, encounterId?: number) => {
    if (encounterId) {
      window.location.href = `/encounters/${encounterId}`;
    } else {
      const labResult = labOrders.find((lab: any) => lab.id === resultId);
      if (labResult) {
        setSelectedLabForReview(labResult);
      }
    }
  };

  const handleBulkReview = async (labs: any[]) => {
    for (const lab of labs) {
      await reviewLabResultMutation.mutateAsync({
        resultId: lab.id,
        reviewNote: "Bulk reviewed"
      });
    }
  };

  const handleUnreviewLabResult = async (resultId: number, testName: string) => {
    try {
      const response = await fetch(`/api/lab-review/unreview/${resultId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          unreviewReason: `Unreviewd from dashboard for ${testName}` 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to unreview lab result');
      
      toast({
        title: "Lab Result Unreviewed",
        description: `${testName} has been marked as unreviewed and requires provider attention.`,
      });
      
      // Refresh data to show updated review status
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientGroup?.patientId}/lab-results`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lab-orders-to-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unreview lab result. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePatientSummary = async (patientGroup: any) => {
    setIsGeneratingMessage(true);
    try {
      const summary = `Lab Results Summary for ${patientGroup.patientName}:\n\n${
        patientGroup.labs.map((lab: any) => 
          `• ${lab.testName}: ${typeof lab.results === 'string' ? lab.results : JSON.stringify(lab.results)} ${lab.criticalFlag ? '(CRITICAL)' : ''}`
        ).join('\n')
      }\n\nAll results have been reviewed. Please contact our office if you have any questions.`;
      
      setGeneratedMessage(summary);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate patient summary.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleSubmitLabReview = () => {
    if (!selectedLabResult) return;
    reviewLabResultMutation.mutate({
      resultId: selectedLabResult.id,
      reviewNote: reviewNote,
    });
  };

  const handleRefreshData = () => {
    refetchStats();
    refetchEncounters();
    refetchLabOrders();
    toast({
      title: "Data Refreshed",
      description: "Dashboard data has been updated.",
    });
  };

  const handleGeneratePatientMessage = async () => {
    if (!selectedLabResult) return;
    
    setIsGeneratingMessage(true);
    try {
      const response = await fetch('/api/lab-communication/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedLabResult.patientId,
          encounterId: selectedLabResult.encounterId || 305, // Use encounter 305 as fallback
          resultIds: [selectedLabResult.id],
          messageType: selectedLabResult.criticalFlag ? 'abnormal_results' : 'normal_results',
          preferredChannel: 'portal',
          forceGenerate: true
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage(data.message || "AI message generated successfully. Check the approval queue for review.");
        toast({
          title: "Message Generated",
          description: "Patient communication has been generated and queued for approval.",
        });
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate patient message. Please try again.",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat":
        return "bg-red-100 text-red-800 border-red-200";
      case "urgent":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "routine":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-navy-blue-100 text-navy-blue-800";
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      case "ready_for_provider":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "pending_signature":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="bg-yellow-50 border-yellow-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-10 w-10 text-yellow-600" />
              <div>
                <p className="text-base font-medium text-yellow-800">Pending Encounters</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{stats?.pendingEncounters || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-navy-blue-50 border-navy-blue-200 cursor-pointer hover:shadow-md transition-all" onClick={() => setIsReviewDialogOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <TestTube className="h-10 w-10 text-navy-blue-600" />
                <div>
                  <p className="text-base font-medium text-navy-blue-800">Lab Orders to Review</p>
                  <p className="text-3xl font-bold text-navy-blue-900 mt-1">{stats?.labOrdersToReview || 0}</p>
                </div>
              </div>
              <Button size="default" variant="outline" className="bg-white hover:bg-navy-blue-50">
                Review
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
              <div>
                <p className="text-base font-medium text-green-800">Completed Today</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats?.completedToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <FileText className="h-10 w-10 text-purple-600" />
              <div>
                <p className="text-base font-medium text-purple-800">Imaging to Review</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats?.imagingToReview || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <PenTool className="h-10 w-10 text-orange-600" />
              <div>
                <p className="text-base font-medium text-orange-800">Prescriptions to Sign</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{stats?.prescriptionsToSign || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
              <div>
                <p className="text-base font-medium text-red-800">Unread Messages</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{stats?.messagesUnread || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 gap-2 p-1 h-14">
          <TabsTrigger value="overview" className="text-base font-medium py-3">Overview</TabsTrigger>
          <TabsTrigger value="pending-encounters" className="text-base font-medium py-3">Pending Encounters</TabsTrigger>
          <TabsTrigger value="signatures" className="text-base font-medium py-3">Signatures Needed</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Pending Encounters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Pending Encounters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingEncounters.slice(0, 5).map((encounter) => (
                    <div key={encounter.id} className="flex items-center justify-between p-5 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-lg">{encounter.patientName}</h4>
                          <Badge className={`${getPriorityColor(encounter.priority)} text-sm px-3 py-1`}>
                            {encounter.priority}
                          </Badge>
                        </div>
                        <p className="text-base text-gray-600 mb-1">{encounter.encounterType}</p>
                        <p className="text-sm text-gray-500">
                          {encounter.roomNumber && `Room ${encounter.roomNumber} • `}
                          {formatDistanceToNow(new Date(encounter.startTime), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className={`${getStatusColor(encounter.status)} text-sm px-3 py-1`}>
                          {encounter.status.replace("_", " ")}
                        </Badge>
                        <Button 
                          size="default" 
                          variant="outline"
                          onClick={() => handleStartEncounter(encounter.id)}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingEncounters.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">No pending encounters</h3>
                      <p className="text-base text-gray-500">Your schedule is clear right now</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Critical Lab Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Critical Lab Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-12 text-gray-500">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Critical Lab Results</h3>
                    <p className="text-base text-gray-500">Critical lab results will appear here when lab orders are placed and results are received from external laboratories.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending-encounters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Encounters</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshData}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {encountersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  pendingEncounters.map((encounter) => (
                    <div key={encounter.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium">{encounter.patientName}</h4>
                            <Badge className={getPriorityColor(encounter.priority)}>
                              {encounter.priority}
                            </Badge>
                            <Badge variant="secondary" className={getStatusColor(encounter.status)}>
                              {encounter.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Type:</strong> {encounter.encounterType}</p>
                            {encounter.chiefComplaint && (
                              <p><strong>Chief Complaint:</strong> {encounter.chiefComplaint}</p>
                            )}
                            <p><strong>Provider:</strong> {encounter.assignedProvider}</p>
                            {encounter.roomNumber && (
                              <p><strong>Room:</strong> {encounter.roomNumber}</p>
                            )}
                            <p><strong>Started:</strong> {format(new Date(encounter.startTime), "PPp")}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewPatient(encounter.patientId)}
                          >
                            <User className="h-4 w-4 mr-1" />
                            View Patient
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleStartEncounter(encounter.id)}
                          >
                            <Stethoscope className="h-4 w-4 mr-1" />
                            Start Encounter
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {!encountersLoading && pendingEncounters.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Encounters</h3>
                    <p>New encounters will appear here when patients are scheduled or arrive for appointments. Encounters require provider documentation and review before completion.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Items Requiring Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <PenTool className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items require signature</h3>
                <p>All encounters and orders have been properly signed.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lab Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Orders Review</DialogTitle>
            <DialogDescription>
              Review pending lab orders and results requiring provider attention.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient-Grouped Lab Orders */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {labOrdersLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading lab orders...</p>
                </div>
              )}
              
              {!labOrdersLoading && (() => {
                // Group lab orders by patient
                const patientGroups = labOrders.reduce((groups: any, lab: any) => {
                  const key = lab.patientId;
                  if (!groups[key]) {
                    groups[key] = {
                      patientName: lab.patientName,
                      patientId: lab.patientId,
                      labs: []
                    };
                  }
                  groups[key].labs.push(lab);
                  return groups;
                }, {});

                return Object.values(patientGroups).map((group: any) => (
                  <div key={group.patientId} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg">{group.patientName}</h3>
                        <Badge variant="outline">{group.labs.length} results pending</Badge>
                        {group.labs.some((lab: any) => lab.criticalFlag) && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical Results
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewPatient(group.patientId)}
                        >
                          <User className="h-4 w-4 mr-1" />
                          View Chart
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedPatientForReview({
                              id: group.patientId,
                              name: group.patientName
                            });
                            setShowFixedLabReview(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review Results
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quick preview of pending results */}
                    <div className="text-sm text-gray-600 space-y-1">
                      {group.labs.slice(0, 3).map((lab: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{lab.testName}</span>
                          <div className="flex items-center space-x-2">
                            {lab.results && (
                              <span className="font-medium">
                                {typeof lab.results === 'string' ? lab.results : JSON.stringify(lab.results)}
                              </span>
                            )}
                            <Badge className={getPriorityColor(lab.priority)}>
                              {lab.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {group.labs.length > 3 && (
                        <p className="text-xs text-gray-500">...and {group.labs.length - 3} more results</p>
                      )}
                    </div>
                  </div>
                ));
              })()}
              
              {!labOrdersLoading && labOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No lab orders requiring review</p>
                </div>
              )}
            </div>

            {/* Lab Results Matrix for Selected Patient */}
            {selectedPatientGroup && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg">Lab Results for {selectedPatientGroup.patientName}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedPatientGroup.labs.length} results pending review
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkReview(selectedPatientGroup.labs)}
                      disabled={isGeneratingMessage}
                    >
                      Review All
                    </Button>
                  </div>
                </div>

                {/* Integrated Lab Results Matrix */}
                <LabResultsMatrix
                  patientId={selectedPatientGroup.patientId}
                  mode="review"
                  showTitle={false}
                  pendingReviewIds={selectedPatientGroup.labs
                    .map((lab: any) => lab.id)
                    .filter((id: number) => !reviewedResultIds.has(id))
                  }
                  onReviewEncounter={(date, encounterIds) => {
                    // Use professional universal lab review interface
                    setSelectedLabForReview({
                      type: 'encounter',
                      date,
                      encounterIds,
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId
                    });
                    setShowUniversalReview(true);
                  }}
                  onReviewTestGroup={(testName, resultIds) => {
                    // Use professional universal lab review interface
                    setSelectedLabForReview({
                      type: 'testGroup',
                      testName,
                      resultIds,
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId
                    });
                    setShowUniversalReview(true);
                  }}
                  onReviewSpecific={(testName, date, resultId) => {
                    // Use professional universal lab review interface
                    setSelectedLabForReview({
                      type: 'specific',
                      testName,
                      date,
                      resultId,
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId
                    });
                    setShowUniversalReview(true);
                  }}
                  onUnreviewEncounter={(date, encounterIds, resultIds) => {
                    setSelectedForUnreview({
                      type: 'encounter',
                      date,
                      encounterIds,
                      resultIds,
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId
                    });
                  }}
                  onUnreviewTestGroup={(testName, resultIds) => {
                    setSelectedForUnreview({
                      type: 'testGroup',
                      testName,
                      resultIds,
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId
                    });
                  }}
                />
              </div>
            )}

            {/* Enhanced Lab Review Section */}
            {selectedLabForReview && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {selectedLabForReview.type === 'encounter' && `Review Labs from ${selectedLabForReview.date}`}
                    {selectedLabForReview.type === 'testGroup' && `Review ${selectedLabForReview.testName} Results`}
                    {selectedLabForReview.type === 'specific' && `Review ${selectedLabForReview.testName} - ${selectedLabForReview.date}`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedLabForReview.type === 'encounter' && `${selectedLabForReview.resultIds?.length || 0} lab results`}
                      {selectedLabForReview.type === 'testGroup' && `${selectedLabForReview.resultIds?.length || 0} results`}
                      {selectedLabForReview.type === 'specific' && 'Single result'}
                    </Badge>
                    {reviewingInProgress && (
                      <Badge variant="secondary">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                        Processing...
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium">Review Scope</Label>
                  <p className="text-sm text-gray-600">
                    {selectedLabForReview.type === 'encounter' && `All lab results from encounter(s) on ${selectedLabForReview.date}`}
                    {selectedLabForReview.type === 'testGroup' && `All ${selectedLabForReview.testName} results for this patient`}
                    {selectedLabForReview.type === 'specific' && `Single ${selectedLabForReview.testName} result from ${selectedLabForReview.date}`}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="reviewNote">Clinical Review & Notes</Label>
                  <Textarea
                    id="reviewNote"
                    placeholder={
                      selectedLabForReview.type === 'encounter' 
                        ? "Enter clinical interpretation for all labs from this encounter... (optional - will use default if empty)"
                        : selectedLabForReview.type === 'testGroup'
                        ? `Enter clinical interpretation for ${selectedLabForReview.testName} trend analysis... (optional)`
                        : "Enter clinical interpretation, follow-up needed, patient communication notes... (optional)"
                    }
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-sm text-gray-500">
                    Note: Review notes are optional. If left empty, a default review note will be used.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedLabForReview(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (selectedLabForReview) {
                        setReviewingInProgress(true);
                        
                        try {
                          console.log('🔍 [Dashboard] Starting professional lab review process for:', selectedLabForReview);
                          
                          let reviewResponse;
                          
                          if (selectedLabForReview.type === 'encounter' && selectedLabForReview.date && selectedLabForReview.patientId) {
                            // Use professional lab review service for date-based review
                            console.log('🔍 [Dashboard] Using professional date-based review service');
                            
                            reviewResponse = await fetch('/api/lab-review/by-date', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                patientId: selectedLabForReview.patientId,
                                selectedDate: selectedLabForReview.date,
                                reviewNote: reviewNote || "Provider reviewed - no additional notes",
                                reviewType: 'encounter'
                              })
                            });
                            
                          } else if (selectedLabForReview.type === 'testGroup' && selectedLabForReview.testName) {
                            // Use professional panel-based review service
                            console.log('🔍 [Dashboard] Using professional panel-based review service');
                            
                            reviewResponse = await fetch('/api/lab-review/by-panel', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                patientId: selectedLabForReview.patientId,
                                panelNames: [selectedLabForReview.testName],
                                reviewNote: reviewNote,
                                reviewType: 'panel'
                              })
                            });
                            
                          } else if (selectedLabForReview.resultIds && selectedLabForReview.resultIds.length > 0) {
                            // Use professional batch review service
                            console.log('🔍 [Dashboard] Using professional batch review service');
                            
                            reviewResponse = await fetch('/api/lab-review/batch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                resultIds: selectedLabForReview.resultIds,
                                reviewNote: reviewNote,
                                reviewType: selectedLabForReview.type
                              })
                            });
                            
                          } else if (selectedLabForReview.resultId) {
                            // Single result review
                            reviewResponse = await fetch('/api/lab-review/batch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                resultIds: [selectedLabForReview.resultId],
                                reviewNote: reviewNote,
                                reviewType: 'individual'
                              })
                            });
                          }
                          
                          if (!reviewResponse) {
                            throw new Error('No valid review type configured');
                          }
                          
                          console.log('🔍 [Dashboard] Raw response status:', reviewResponse.status, reviewResponse.statusText);
                          
                          const reviewResult = await reviewResponse.json();
                          console.log('🔍 [Dashboard] Professional review response:', reviewResult);
                          
                          if (!reviewResponse.ok) {
                            console.error('🚨 [Dashboard] Review request failed:', {
                              status: reviewResponse.status,
                              statusText: reviewResponse.statusText,
                              result: reviewResult
                            });
                            throw new Error(reviewResult.error?.message || reviewResult.message || `Review failed with status ${reviewResponse.status}`);
                          }
                          
                          // Extract result information from successful response
                          const reviewedResultIds = reviewResult.data?.reviewedResults || [];
                          const successCount = reviewResult.data?.resultCount || 0;
                          
                          console.log('🔍 [Dashboard] Review successful:', {
                            successCount,
                            reviewedResultIds,
                            auditTrail: reviewResult.data?.auditTrail
                          });
                          
                          // Show success feedback
                          toast({
                            title: "Review Completed",
                            description: `Successfully reviewed ${successCount} lab result${successCount > 1 ? 's' : ''}`,
                            duration: 3000,
                          });
                          
                          setSelectedLabForReview(null);
                          setReviewNote("");
                          
                          // Refresh the data to show updated status
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/patients', selectedLabForReview.patientId, 'lab-results'] });
                          
                        } catch (error: any) {
                          console.error('🚨 [Dashboard] Review failed with detailed error:', {
                            error: error,
                            message: error?.message,
                            stack: error?.stack,
                            selectedLabForReview: selectedLabForReview,
                            reviewNote: reviewNote
                          });
                          
                          toast({
                            title: "Review Failed",
                            description: error?.message || "There was an error completing the review. Please try again.",
                            variant: "destructive",
                            duration: 5000,
                          });
                        } finally {
                          setReviewingInProgress(false);
                        }
                      }
                    }}
                    disabled={reviewLabResultMutation.isPending || reviewingInProgress}
                  >
                    {(reviewLabResultMutation.isPending || reviewingInProgress) ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Reviewing...
                      </div>
                    ) : (
                      "Complete Review"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Unreview Dialog */}
            {selectedForUnreview && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600">
                    Unreview: {selectedForUnreview.type === 'encounter' ? `Labs from ${selectedForUnreview.date}` : `${selectedForUnreview.testName} Results`}
                  </h4>
                  <Badge variant="destructive">
                    {selectedForUnreview.resultIds?.length || 0} results
                  </Badge>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium mb-2">Important:</p>
                  <p className="text-sm text-red-700">
                    Unreviewing lab results will return them to "pending review" status. This action creates an audit trail and should only be used for workflow corrections.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="unreviewReason">Reason for Unreview (Required)</Label>
                  <Textarea
                    id="unreviewReason"
                    placeholder="Enter detailed reason for unreviewing (e.g., 'Need to add additional clinical notes', 'Incorrect review by mistake', 'Requires re-interpretation after additional data')..."
                    value={unreviewReason}
                    onChange={(e) => setUnreviewReason(e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedForUnreview(null);
                      setUnreviewReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      if (!unreviewReason.trim()) {
                        toast({
                          title: "Reason Required",
                          description: "Please provide a reason for unreviewing these results.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await fetch('/api/lab-review/unreview', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            resultIds: selectedForUnreview.resultIds,
                            unreviewReason: unreviewReason,
                            reviewType: selectedForUnreview.type
                          })
                        });

                        const result = await response.json();

                        if (!response.ok) {
                          throw new Error(result.error?.message || 'Unreview failed');
                        }

                        toast({
                          title: "Unreview Completed",
                          description: `Successfully unreviewed ${result.data?.resultCount || 0} lab results`,
                          duration: 3000,
                        });

                        setSelectedForUnreview(null);
                        setUnreviewReason("");
                        
                        // Refresh data to show updated status
                        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
                        if (selectedForUnreview.patientId) {
                          queryClient.invalidateQueries({ queryKey: ['/api/patients', selectedForUnreview.patientId, 'lab-results'] });
                        }

                      } catch (error: any) {
                        toast({
                          title: "Unreview Failed",
                          description: error.message || "Failed to unreview lab results",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={!unreviewReason.trim()}
                  >
                    Unreview Results
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsReviewDialogOpen(false);
                  setSelectedPatientGroup(null);
                  setSelectedLabForReview(null);
                  setSelectedForUnreview(null);
                  setReviewNote("");
                  setUnreviewReason("");
                  setGeneratedMessage("");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixed Lab Review Dialog */}
      <Dialog open={showFixedLabReview} onOpenChange={setShowFixedLabReview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Results Review - {selectedPatientForReview?.name}</DialogTitle>
            <DialogDescription>
              Review pending lab results for this patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedPatientForReview && (
              <LabResultsMatrix
                patientId={selectedPatientForReview.id}
                mode="review"
                showTitle={false}
                onReviewEncounter={(date, encounterIds) => {
                  setSelectedLabForReview({
                    type: 'encounter',
                    date,
                    encounterIds,
                    patientName: selectedPatientForReview.name,
                    patientId: selectedPatientForReview.id
                  });
                }}
                onReviewTestGroup={(testName, resultIds) => {
                  setSelectedLabForReview({
                    type: 'testGroup',
                    testName,
                    resultIds,
                    patientName: selectedPatientForReview.name,
                    patientId: selectedPatientForReview.id
                  });
                }}
                onReviewSpecific={(testName, date, resultId) => {
                  setSelectedLabForReview({
                    type: 'specific',
                    testName,
                    date,
                    resultId,
                    patientName: selectedPatientForReview.name,
                    patientId: selectedPatientForReview.id
                  });
                }}
                onUnreviewEncounter={(date, encounterIds, resultIds) => {
                  setSelectedForUnreview({
                    type: 'encounter',
                    date,
                    encounterIds,
                    resultIds,
                    patientName: selectedPatientForReview.name,
                    patientId: selectedPatientForReview.id
                  });
                }}
                onUnreviewTestGroup={(testName, resultIds) => {
                  setSelectedForUnreview({
                    type: 'testGroup',
                    testName,
                    resultIds,
                    patientName: selectedPatientForReview.name,
                    patientId: selectedPatientForReview.id
                  });
                }}
              />
            )}

            {/* Enhanced Lab Review Section */}
            {selectedLabForReview && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {selectedLabForReview.type === 'encounter' && `Review Labs from ${selectedLabForReview.date}`}
                    {selectedLabForReview.type === 'testGroup' && `Review ${selectedLabForReview.testName} Results`}
                    {selectedLabForReview.type === 'specific' && `Review ${selectedLabForReview.testName} - ${selectedLabForReview.date}`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedLabForReview.type === 'encounter' && `${selectedLabForReview.resultIds?.length || 0} lab results`}
                      {selectedLabForReview.type === 'testGroup' && `${selectedLabForReview.resultIds?.length || 0} results`}
                      {selectedLabForReview.type === 'specific' && 'Single result'}
                    </Badge>
                    {reviewingInProgress && (
                      <Badge variant="secondary">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                        Processing...
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium">Review Scope</Label>
                  <p className="text-sm text-gray-600">
                    {selectedLabForReview.type === 'encounter' && `All lab results from encounter(s) on ${selectedLabForReview.date}`}
                    {selectedLabForReview.type === 'testGroup' && `All ${selectedLabForReview.testName} results for this patient`}
                    {selectedLabForReview.type === 'specific' && `Single ${selectedLabForReview.testName} result from ${selectedLabForReview.date}`}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="reviewNote">Clinical Review & Notes</Label>
                  <Textarea
                    id="reviewNote"
                    placeholder={
                      selectedLabForReview.type === 'encounter' 
                        ? "Enter clinical interpretation for all labs from this encounter... (optional - will use default if empty)"
                        : selectedLabForReview.type === 'testGroup'
                        ? `Enter clinical interpretation for ${selectedLabForReview.testName} trend analysis... (optional)`
                        : "Enter clinical interpretation, follow-up needed, patient communication notes... (optional)"
                    }
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-sm text-gray-500">
                    Note: Review notes are optional. If left empty, a default review note will be used.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedLabForReview(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (selectedLabForReview) {
                        setReviewingInProgress(true);
                        
                        try {
                          console.log('🔍 [Dashboard] Starting professional lab review process for:', selectedLabForReview);
                          
                          let reviewResponse;
                          
                          if (selectedLabForReview.type === 'encounter' && selectedLabForReview.date && selectedLabForReview.patientId) {
                            // Use professional lab review service for date-based review
                            console.log('🔍 [Dashboard] Using professional date-based review service');
                            
                            reviewResponse = await fetch('/api/lab-review/by-date', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                patientId: selectedLabForReview.patientId,
                                selectedDate: selectedLabForReview.date,
                                reviewNote: reviewNote || "Provider reviewed - no additional notes",
                                reviewType: 'encounter'
                              })
                            });
                            
                          } else if (selectedLabForReview.type === 'testGroup' && selectedLabForReview.testName) {
                            // Use professional panel-based review service
                            console.log('🔍 [Dashboard] Using professional panel-based review service');
                            
                            reviewResponse = await fetch('/api/lab-review/by-panel', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                patientId: selectedLabForReview.patientId,
                                panelNames: [selectedLabForReview.testName],
                                reviewNote: reviewNote,
                                reviewType: 'panel'
                              })
                            });
                            
                          } else if (selectedLabForReview.resultIds && selectedLabForReview.resultIds.length > 0) {
                            // Use professional batch review service
                            console.log('🔍 [Dashboard] Using professional batch review service');
                            
                            reviewResponse = await fetch('/api/lab-review/batch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                resultIds: selectedLabForReview.resultIds,
                                reviewNote: reviewNote,
                                reviewType: selectedLabForReview.type
                              })
                            });
                            
                          } else if (selectedLabForReview.resultId) {
                            // Single result review
                            reviewResponse = await fetch('/api/lab-review/batch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                resultIds: [selectedLabForReview.resultId],
                                reviewNote: reviewNote,
                                reviewType: 'individual'
                              })
                            });
                          }
                          
                          if (!reviewResponse) {
                            throw new Error('No valid review type configured');
                          }
                          
                          console.log('🔍 [Dashboard] Raw response status:', reviewResponse.status, reviewResponse.statusText);
                          
                          const reviewResult = await reviewResponse.json();
                          console.log('🔍 [Dashboard] Professional review response:', reviewResult);
                          
                          if (!reviewResponse.ok) {
                            console.error('🚨 [Dashboard] Review request failed:', {
                              status: reviewResponse.status,
                              statusText: reviewResponse.statusText,
                              result: reviewResult
                            });
                            throw new Error(reviewResult.error?.message || reviewResult.message || `Review failed with status ${reviewResponse.status}`);
                          }
                          
                          // Extract result information from successful response
                          const reviewedResultIds = reviewResult.data?.reviewedResults || [];
                          const successCount = reviewResult.data?.resultCount || 0;
                          
                          console.log('🔍 [Dashboard] Review successful:', {
                            successCount,
                            reviewedResultIds,
                            auditTrail: reviewResult.data?.auditTrail
                          });
                          
                          // Show success feedback
                          toast({
                            title: "Review Completed",
                            description: `Successfully reviewed ${successCount} lab result${successCount > 1 ? 's' : ''}`,
                            duration: 3000,
                          });
                          
                          setSelectedLabForReview(null);
                          setReviewNote("");
                          
                          // Refresh the data to show updated status
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/patients', selectedLabForReview.patientId, 'lab-results'] });
                          
                        } catch (error: any) {
                          console.error('🚨 [Dashboard] Review failed with detailed error:', {
                            error: error,
                            message: error?.message,
                            stack: error?.stack,
                            selectedLabForReview: selectedLabForReview,
                            reviewNote: reviewNote
                          });
                          
                          toast({
                            title: "Review Failed",
                            description: error?.message || "There was an error completing the review. Please try again.",
                            variant: "destructive",
                            duration: 5000,
                          });
                        } finally {
                          setReviewingInProgress(false);
                        }
                      }
                    }}
                    disabled={reviewingInProgress}
                  >
                    {reviewingInProgress ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Reviewing...
                      </div>
                    ) : (
                      "Complete Review"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Unreview Dialog */}
            {selectedForUnreview && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600">
                    Unreview: {selectedForUnreview.type === 'encounter' ? `Labs from ${selectedForUnreview.date}` : `${selectedForUnreview.testName} Results`}
                  </h4>
                  <Badge variant="destructive">
                    {selectedForUnreview.resultIds?.length || 0} results
                  </Badge>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium mb-2">Important:</p>
                  <p className="text-sm text-red-700">
                    Unreviewing lab results will return them to "pending review" status. This action creates an audit trail and should only be used for workflow corrections.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="unreviewReason">Reason for Unreview (Required)</Label>
                  <Textarea
                    id="unreviewReason"
                    placeholder="Enter detailed reason for unreviewing (e.g., 'Need to add additional clinical notes', 'Incorrect review by mistake', 'Requires re-interpretation after additional data')..."
                    value={unreviewReason}
                    onChange={(e) => setUnreviewReason(e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedForUnreview(null);
                      setUnreviewReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      if (!unreviewReason.trim()) {
                        toast({
                          title: "Reason Required",
                          description: "Please provide a reason for unreviewing these results.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await fetch('/api/lab-review/unreview', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            resultIds: selectedForUnreview.resultIds,
                            unreviewReason: unreviewReason,
                            reviewType: selectedForUnreview.type
                          })
                        });

                        const result = await response.json();

                        if (!response.ok) {
                          throw new Error(result.error?.message || 'Unreview failed');
                        }

                        toast({
                          title: "Unreview Completed",
                          description: `Successfully unreviewed ${result.data?.resultCount || 0} lab results`,
                          duration: 3000,
                        });

                        setSelectedForUnreview(null);
                        setUnreviewReason("");
                        
                        // Refresh data to show updated status
                        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
                        if (selectedForUnreview.patientId) {
                          queryClient.invalidateQueries({ queryKey: ['/api/patients', selectedForUnreview.patientId, 'lab-results'] });
                        }

                      } catch (error: any) {
                        toast({
                          title: "Unreview Failed",
                          description: error.message || "Failed to unreview lab results",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={!unreviewReason.trim()}
                  >
                    Unreview Results
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFixedLabReview(false);
                  setSelectedPatientForReview(null);
                  setSelectedLabForReview(null);
                  setSelectedForUnreview(null);
                  setReviewNote("");
                  setUnreviewReason("");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}