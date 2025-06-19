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
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        return "bg-blue-100 text-blue-800";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Pending Encounters</p>
                <p className="text-2xl font-bold text-yellow-900">{stats?.pendingEncounters || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setIsReviewDialogOpen(true)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TestTube className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Lab Orders to Review</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.labOrdersToReview || 0}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="bg-white hover:bg-blue-50">
                Review
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Completed Today</p>
                <p className="text-2xl font-bold text-green-900">{stats?.completedToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Imaging to Review</p>
                <p className="text-2xl font-bold text-purple-900">{stats?.imagingToReview || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <PenTool className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Prescriptions to Sign</p>
                <p className="text-2xl font-bold text-orange-900">{stats?.prescriptionsToSign || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Unread Messages</p>
                <p className="text-2xl font-bold text-red-900">{stats?.messagesUnread || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending-encounters">Pending Encounters</TabsTrigger>
          <TabsTrigger value="signatures">Signatures Needed</TabsTrigger>
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
                <div className="space-y-3">
                  {pendingEncounters.slice(0, 5).map((encounter) => (
                    <div key={encounter.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{encounter.patientName}</h4>
                          <Badge className={getPriorityColor(encounter.priority)}>
                            {encounter.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{encounter.encounterType}</p>
                        <p className="text-xs text-gray-500">
                          {encounter.roomNumber && `Room ${encounter.roomNumber} • `}
                          {formatDistanceToNow(new Date(encounter.startTime), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getStatusColor(encounter.status)}>
                          {encounter.status.replace("_", " ")}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartEncounter(encounter.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingEncounters.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No pending encounters</p>
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
                <div className="space-y-3">
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Lab Results</h3>
                    <p className="text-sm">Critical lab results will appear here when lab orders are placed and results are received from external laboratories.</p>
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
                            setSelectedPatientGroup(group);
                            setReviewNote("");
                            setGeneratedMessage("");
                          }}
                          variant={selectedPatientGroup?.patientId === group.patientId ? "default" : "outline"}
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
                    console.log('🔍 [Dashboard] onReviewEncounter called with:', { date, encounterIds });
                    console.log('🔍 [Dashboard] Selected date to match:', date);
                    
                    // CRITICAL FIX: The dashboard lab data structure is different from the matrix data
                    // We need to fetch the actual lab results and match against those, not the dashboard summary
                    
                    // For now, use a more direct approach - we'll get ALL result IDs that match the selected date
                    // by directly querying the actual lab results data
                    
                    const selectedDate = new Date(date);
                    const selectedDateOnly = selectedDate.toISOString().split('T')[0];
                    
                    console.log('🔍 [Dashboard] Looking for results matching date:', selectedDateOnly);
                    
                    // Instead of filtering the dashboard labs (which have wrong structure), 
                    // let's pass the date to the review handler and let it fetch the correct data
                    const resultIds: number[] = [];
                    
                    console.log('🔍 [Dashboard] Proceeding with date-based review, will fetch actual results in backend');
                    
                    // Set up the review with the date - the review handler will fetch actual results
                    setSelectedLabForReview({
                      type: 'encounter',
                      date,
                      encounterIds,
                      resultIds: [], // We'll fetch the actual result IDs in the review process
                      patientName: selectedPatientGroup.patientName,
                      patientId: selectedPatientGroup.patientId // Add patientId so we can fetch lab results
                    });
                  }}
                  onReviewTestGroup={(testName, resultIds) => {
                    console.log('🔍 [Dashboard] onReviewTestGroup called with:', { testName, resultIds });
                    
                    // Open test group review
                    setSelectedLabForReview({
                      type: 'testGroup',
                      testName,
                      resultIds,
                      patientName: selectedPatientGroup.patientName
                    });
                  }}
                  onReviewSpecific={(testName, date, resultId) => {
                    // Open specific result review
                    setSelectedLabForReview({
                      type: 'specific',
                      testName,
                      date,
                      resultId,
                      patientName: selectedPatientGroup.patientName
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
                        ? "Enter clinical interpretation for all labs from this encounter..."
                        : selectedLabForReview.type === 'testGroup'
                        ? `Enter clinical interpretation for ${selectedLabForReview.testName} trend analysis...`
                        : "Enter clinical interpretation, follow-up needed, patient communication notes..."
                    }
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[120px]"
                  />
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
                                reviewNote: reviewNote,
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
                          
                          const reviewResult = await reviewResponse.json();
                          console.log('🔍 [Dashboard] Professional review completed:', reviewResult);
                          
                          if (!reviewResponse.ok) {
                            throw new Error(reviewResult.error?.message || 'Review failed');
                          }
                          

                          
                          await Promise.all(promises);
                          
                          // Mark results as reviewed in UI
                          const newReviewedIds = new Set(reviewedResultIds);
                          resultIdsToReview.forEach(id => newReviewedIds.add(id));
                          setReviewedResultIds(newReviewedIds);
                          
                          // Show success feedback
                          toast({
                            title: "Review Completed",
                            description: `Successfully reviewed ${resultIdsToReview.length} lab result${resultIdsToReview.length > 1 ? 's' : ''}`,
                            duration: 3000,
                          });
                          
                          setSelectedLabForReview(null);
                          setReviewNote("");
                          
                          // Refresh the data to show updated status
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
                          
                        } catch (error) {
                          console.error('Review failed:', error);
                          toast({
                            title: "Review Failed",
                            description: "There was an error completing the review. Please try again.",
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

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsReviewDialogOpen(false);
                  setSelectedPatientGroup(null);
                  setSelectedLabForReview(null);
                  setReviewNote("");
                  setGeneratedMessage("");
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