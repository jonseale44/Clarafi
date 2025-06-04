import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw
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
}

export function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending encounters
  const { data: pendingEncounters = [], isLoading: encountersLoading } = useQuery<PendingEncounter[]>({
    queryKey: ["/api/dashboard/pending-encounters"],
    refetchInterval: 30000,
  });

  // Fetch lab orders to review
  const { data: labOrders = [], isLoading: labOrdersLoading } = useQuery<LabOrderToReview[]>({
    queryKey: ["/api/dashboard/lab-orders-to-review"],
    refetchInterval: 30000,
  });

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

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TestTube className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Lab Orders to Review</p>
                <p className="text-2xl font-bold text-blue-900">{stats?.labOrdersToReview || 0}</p>
              </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending-encounters">Pending Encounters</TabsTrigger>
          <TabsTrigger value="lab-reviews">Lab Reviews</TabsTrigger>
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
                        <Button size="sm" variant="outline">
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
                  {labOrders.filter(lab => lab.criticalFlag).slice(0, 5).map((lab) => (
                    <div key={lab.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{lab.patientName}</h4>
                          <Badge variant="destructive">Critical</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{lab.testName}</p>
                        <p className="text-xs text-gray-500">
                          Ordered {formatDistanceToNow(new Date(lab.orderedDate), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="destructive">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  {labOrders.filter(lab => lab.criticalFlag).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No critical lab results</p>
                    </div>
                  )}
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
                <Button variant="outline" size="sm">
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
                          <Button size="sm" variant="outline">
                            <User className="h-4 w-4 mr-1" />
                            View Patient
                          </Button>
                          <Button size="sm">
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending encounters</h3>
                    <p>All encounters have been completed or are in progress.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab-reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lab Orders Requiring Review</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  labOrders.map((lab) => (
                    <div key={lab.id} className={`p-4 border rounded-lg hover:bg-gray-50 ${lab.criticalFlag ? 'bg-red-50 border-red-200' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium">{lab.patientName}</h4>
                            <Badge className={getPriorityColor(lab.priority)}>
                              {lab.priority}
                            </Badge>
                            {lab.criticalFlag && (
                              <Badge variant="destructive">Critical</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Test:</strong> {lab.testName}</p>
                            <p><strong>Status:</strong> {lab.status}</p>
                            <p><strong>Ordered:</strong> {format(new Date(lab.orderedDate), "PPp")}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <User className="h-4 w-4 mr-1" />
                            View Patient
                          </Button>
                          <Button size="sm" variant={lab.criticalFlag ? "destructive" : "default"}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review Results
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {!labOrdersLoading && labOrders.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No lab orders to review</h3>
                    <p>All lab results have been reviewed and signed.</p>
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
    </div>
  );
}