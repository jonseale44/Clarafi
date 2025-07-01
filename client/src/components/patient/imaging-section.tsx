import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  FileImage,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Activity,
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface ImagingSectionProps {
  patientId: number;
  mode?: "chart" | "encounter";
  className?: string;
}

interface ImagingOrder {
  id: number;
  patientId: number;
  encounterId: number;
  studyType: string;
  bodyPart: string;
  laterality?: string;
  contrastNeeded: boolean;
  clinicalIndication: string;
  clinicalHistory?: string;
  relevantSymptoms?: string;
  orderedBy: number;
  orderedAt: string;
  orderStatus: string;
  scheduledAt?: string;
  completedAt?: string;
  prepInstructions?: string;
  schedulingNotes?: string;
  externalFacilityId?: string;
  externalOrderId?: string;
  dicomAccessionNumber?: string;
  orderedByUser?: {
    firstName: string;
    lastName: string;
    credentials: string;
  };
  results?: ImagingResult[];
}

interface ImagingResult {
  id: number;
  imagingOrderId: number;
  patientId: number;
  studyDate: string;
  modality: string;
  bodyPart?: string;
  findings?: string;
  impression?: string;
  radiologistName?: string;
  dicomStudyId?: string;
  dicomSeriesId?: string;
  imageFilePaths?: string[];
  resultStatus: string;
  reviewedBy?: number;
  reviewedAt?: string;
  providerNotes?: string;
  reviewedByUser?: {
    firstName: string;
    lastName: string;
    credentials: string;
  };
}

export function ImagingSection({ patientId, mode = "chart", className }: ImagingSectionProps) {
  const [openCards, setOpenCards] = useState<Set<number>>(new Set());
  const [selectedTab, setSelectedTab] = useState<"orders" | "results">("orders");
  
  const queryClient = useQueryClient();

  // Fetch imaging orders with results
  const { data: imagingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/imaging/orders`],
    enabled: !!patientId
  }) as { data: ImagingOrder[], isLoading: boolean };

  // Fetch imaging results
  const { data: imagingResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/imaging/results`],
    enabled: !!patientId
  }) as { data: ImagingResult[], isLoading: boolean };

  const toggleCard = (orderId: number) => {
    setOpenCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: Clock },
      scheduled: { variant: "secondary" as const, color: "text-blue-700 bg-blue-50 border-blue-200", icon: Calendar },
      completed: { variant: "secondary" as const, color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle },
      cancelled: { variant: "secondary" as const, color: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} text-xs font-medium`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (studyType: string, contrastNeeded: boolean) => {
    if (studyType === "CT" && contrastNeeded) {
      return (
        <Badge variant="destructive" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Contrast Required
        </Badge>
      );
    }
    return null;
  };

  const formatStudyDisplay = (order: ImagingOrder) => {
    let display = `${order.studyType} - ${order.bodyPart}`;
    if (order.laterality && order.laterality !== 'bilateral') {
      display += ` (${order.laterality})`;
    }
    return display;
  };

  const renderOrderCard = (order: ImagingOrder) => {
    const isOpen = openCards.has(order.id);
    const hasResults = order.results && order.results.length > 0;

    return (
      <Card key={order.id} className="emr-card border-l-4 border-l-blue-500">
        <Collapsible open={isOpen} onOpenChange={() => toggleCard(order.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors emr-card-content-tight">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <div className="flex items-center space-x-2">
                    <FileImage className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">
                      {formatStudyDisplay(order)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getPriorityBadge(order.studyType, order.contrastNeeded)}
                  {getStatusBadge(order.orderStatus)}
                  {hasResults && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <Activity className="h-3 w-3 mr-1" />
                      Results Available
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {order.orderedByUser 
                      ? `${order.orderedByUser.firstName} ${order.orderedByUser.lastName}, ${order.orderedByUser.credentials}`
                      : 'Provider'
                    }
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(order.orderedAt), 'MMM dd, yyyy')}
                  </span>
                  {order.externalFacilityId && (
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {order.externalFacilityId.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 emr-card-content-tight">
              <Separator className="mb-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Clinical Information</h4>
                  <div className="space-y-1">
                    <p><span className="text-gray-600">Indication:</span> {order.clinicalIndication}</p>
                    {order.clinicalHistory && (
                      <p><span className="text-gray-600">History:</span> {order.clinicalHistory}</p>
                    )}
                    {order.relevantSymptoms && (
                      <p><span className="text-gray-600">Symptoms:</span> {order.relevantSymptoms}</p>
                    )}
                    {order.contrastNeeded && (
                      <p className="text-orange-600 font-medium">
                        <Zap className="h-3 w-3 inline mr-1" />
                        Contrast Enhancement Required
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Order Details</h4>
                  <div className="space-y-1">
                    {order.dicomAccessionNumber && (
                      <p><span className="text-gray-600">Accession #:</span> {order.dicomAccessionNumber}</p>
                    )}
                    {order.externalOrderId && (
                      <p><span className="text-gray-600">External ID:</span> {order.externalOrderId}</p>
                    )}
                    {order.scheduledAt && (
                      <p><span className="text-gray-600">Scheduled:</span> {format(new Date(order.scheduledAt), 'MMM dd, yyyy h:mm a')}</p>
                    )}
                    {order.completedAt && (
                      <p><span className="text-gray-600">Completed:</span> {format(new Date(order.completedAt), 'MMM dd, yyyy h:mm a')}</p>
                    )}
                  </div>
                </div>
              </div>

              {order.prepInstructions && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-800 text-sm mb-1">Preparation Instructions</h4>
                  <p className="text-blue-700 text-sm">{order.prepInstructions}</p>
                </div>
              )}

              {order.schedulingNotes && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Provider Notes</h4>
                  <p className="text-gray-700 text-sm">{order.schedulingNotes}</p>
                </div>
              )}

              {/* Results Section */}
              {hasResults && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Imaging Results</h4>
                  {order.results!.map((result) => (
                    <div key={result.id} className="p-3 bg-green-50 border border-green-200 rounded-md mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            {result.modality}
                          </Badge>
                          <span className="text-sm font-medium">
                            {format(new Date(result.studyDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {getStatusBadge(result.resultStatus)}
                      </div>
                      
                      {result.radiologistName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Radiologist:</span> {result.radiologistName}
                        </p>
                      )}
                      
                      {result.findings && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Findings:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.findings}</p>
                        </div>
                      )}
                      
                      {result.impression && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Impression:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.impression}</p>
                        </div>
                      )}
                      
                      {result.providerNotes && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Provider Review:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.providerNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderResultCard = (result: ImagingResult) => {
    return (
      <Card key={result.id} className="emr-card border-l-4 border-l-green-500">
        <CardContent className="emr-card-content-tight">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileImage className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">
                {result.modality} - {result.bodyPart}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(result.resultStatus)}
              <span className="text-xs text-gray-500">
                {format(new Date(result.studyDate), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>

          {result.radiologistName && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Radiologist:</span> {result.radiologistName}
            </p>
          )}
          
          {result.findings && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700">Findings:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.findings}</p>
            </div>
          )}
          
          {result.impression && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700">Impression:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.impression}</p>
            </div>
          )}
          
          {result.reviewedAt && result.reviewedByUser && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Reviewed by {result.reviewedByUser.firstName} {result.reviewedByUser.lastName}, {result.reviewedByUser.credentials} 
                on {format(new Date(result.reviewedAt), 'MMM dd, yyyy h:mm a')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (ordersLoading || resultsLoading) {
    return (
      <div className={`emr-tight-spacing ${className}`}>
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalOrders = imagingOrders.length;
  const completedOrders = imagingOrders.filter(order => order.orderStatus === 'completed').length;
  const pendingOrders = imagingOrders.filter(order => order.orderStatus === 'pending').length;
  const totalResults = imagingResults.length;

  return (
    <div className={`emr-tight-spacing ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FileImage className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Imaging</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {totalOrders} orders
            </Badge>
            {totalResults > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                {totalResults} results
              </Badge>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{totalOrders}</div>
            <div className="text-xs text-gray-600">Total Orders</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{pendingOrders}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{completedOrders}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "orders" | "results")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Orders ({totalOrders})</TabsTrigger>
            <TabsTrigger value="results">Results ({totalResults})</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {imagingOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No imaging orders found</p>
                    <p className="text-sm">Imaging orders will appear here when available.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              imagingOrders.map(renderOrderCard)
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-3">
            {imagingResults.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No imaging results found</p>
                    <p className="text-sm">Imaging results will appear here when studies are completed.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              imagingResults.map(renderResultCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ImagingSection;