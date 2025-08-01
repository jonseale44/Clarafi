import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FlaskConical, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Info,
  Expand,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { IntegratedLabView } from "./integrated-lab-view";
import { useDenseView } from "@/hooks/use-dense-view";

interface EncounterLabResultsProps {
  patientId: number;
  encounterDate?: Date;
}

export function EncounterLabResults({ patientId, encounterDate }: EncounterLabResultsProps) {
  const [activeTab, setActiveTab] = useState("results");
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const { isDenseView } = useDenseView();

  // Fetch lab orders and results
  const { data: labOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const isLoading = ordersLoading || resultsLoading;

  // Ensure data is arrays
  const safeLabResults = Array.isArray(labResults) ? labResults : [];
  const safeLabOrders = Array.isArray(labOrders) ? labOrders : [];

  // Debug: log what we're working with
  console.log('🧪 [EncounterLabResults] Total lab results:', safeLabResults.length);
  console.log('🧪 [EncounterLabResults] Sample result:', safeLabResults[0]);
  console.log('🧪 [EncounterLabResults] Raw API response type check:', typeof labResults, Array.isArray(labResults));
  console.log('🧪 [EncounterLabResults] Full API response:', labResults);

  // Filter for most recent results (all available, sort by most recent)
  const recentResults = safeLabResults
    .filter((result: any) => {
      // Include all results with valid dates
      return result.resultAvailableAt !== null && result.resultAvailableAt !== undefined;
    })
    .sort((a: any, b: any) => {
      // Sort by most recent first
      const dateA = new Date(a.resultAvailableAt || 0);
      const dateB = new Date(b.resultAvailableAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 15); // Show max 15 most recent results for compact view

  console.log('🧪 [EncounterLabResults] Filtered recent results:', recentResults.length);
  console.log('🧪 [EncounterLabResults] Recent results sample:', recentResults[0]);

  const pendingOrders = safeLabOrders.filter((order: any) => 
    ['pending', 'transmitted', 'collected', 'acknowledged', 'order_received', 'specimen_collection_scheduled', 'specimen_collected', 'specimen_received_at_lab', 'specimen_processing_started', 'analysis_completed', 'results_verified'].includes(order.orderStatus)
  );

  // Group results by lab order/panel for better organization
  const groupedResults = recentResults.reduce((groups: any[], result: any) => {
    const existingGroup = groups.find(g => g.orderInfo.id === result.labOrderId);
    
    if (existingGroup) {
      existingGroup.results.push(result);
      // Update group flags
      if (result.abnormalFlag && result.abnormalFlag !== 'N') {
        existingGroup.hasAbnormal = true;
      }
      if (result.criticalFlag) {
        existingGroup.hasCritical = true;
      }
    } else {
      groups.push({
        orderInfo: {
          id: result.labOrderId,
          panelName: getPanelName(result.testName),
          status: result.resultStatus || 'final',
          date: result.resultAvailableAt
        },
        results: [result],
        hasAbnormal: result.abnormalFlag && result.abnormalFlag !== 'N',
        hasCritical: result.criticalFlag || false
      });
    }
    
    return groups;
  }, []);

  // Sort groups to prioritize critical and abnormal results
  groupedResults.sort((a, b) => {
    if (a.hasCritical && !b.hasCritical) return -1;
    if (!a.hasCritical && b.hasCritical) return 1;
    if (a.hasAbnormal && !b.hasAbnormal) return -1;
    if (!a.hasAbnormal && b.hasAbnormal) return 1;
    return new Date(b.orderInfo.date).getTime() - new Date(a.orderInfo.date).getTime();
  });

  function getPanelName(testName: string): string {
    const panelMappings: { [key: string]: string } = {
      'complete blood count': 'Complete Blood Count (CBC)',
      'comprehensive metabolic panel': 'Comprehensive Metabolic Panel (CMP)',
      'basic metabolic panel': 'Basic Metabolic Panel (BMP)',
      'lipid panel': 'Lipid Panel',
      'liver function': 'Liver Function Tests',
      'thyroid': 'Thyroid Function Panel'
    };

    const lowerTest = testName.toLowerCase();
    for (const [key, value] of Object.entries(panelMappings)) {
      if (lowerTest.includes(key)) {
        return value;
      }
    }
    
    return testName || 'Lab Panel';
  }

  function getFlagColor(flag: string): string {
    if (!flag || flag === 'N') return 'text-gray-900';
    if (flag.includes('H')) return 'text-red-600 font-semibold';
    if (flag.includes('L')) return 'text-navy-blue-600 font-semibold';
    return 'text-orange-600 font-semibold';
  }

  function getTestAbbreviation(testName: string): string {
    const abbreviations: { [key: string]: string } = {
      'platelet count': 'PLT',
      'hematocrit': 'HCT',
      'white blood cell count': 'WBC',
      'red blood cell count': 'RBC',
      'hemoglobin': 'HGB',
      'mean corpuscular hemoglobin concentration': 'MCHC',
      'mean corpuscular hemoglobin': 'MCH',
      'mean corpuscular volume': 'MCV',
      'glucose': 'GLU',
      'blood urea nitrogen': 'BUN',
      'creatinine': 'CREAT',
      'sodium': 'Na',
      'potassium': 'K',
      'chloride': 'Cl',
      'carbon dioxide': 'CO2',
      'thyroid stimulating hormone': 'TSH'
    };

    const lowerTest = testName.toLowerCase();
    for (const [key, value] of Object.entries(abbreviations)) {
      if (lowerTest.includes(key)) {
        return value;
      }
    }
    
    return testName.substring(0, 8).toUpperCase();
  }

  // Dense view rendering for compact lab results
  const renderLabResultDenseList = (result: any) => {
    const borderColor = result.criticalFlag ? 'border-l-red-600' :
                       result.abnormalFlag && result.abnormalFlag !== 'N' ? 'border-l-orange-500' :
                       'border-l-green-500';
    
    return (
      <div key={result.id} className={`dense-list-item group ${borderColor}`}>
        <div className="dense-list-content">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FlaskConical className="h-3 w-3 text-gray-400 flex-shrink-0" />
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="dense-list-primary">{getTestAbbreviation(result.testName)}</span>
              
              <div className="flex items-center gap-1">
                <span className={`text-sm font-mono ${getFlagColor(result.abnormalFlag)}`}>
                  {result.resultValue}
                </span>
                {result.resultUnits && (
                  <span className="text-xs text-gray-500">{result.resultUnits}</span>
                )}
              </div>
              
              {result.criticalFlag && (
                <Badge className="dense-list-badge bg-red-600 text-white">
                  CRIT
                </Badge>
              )}
              
              {!result.criticalFlag && result.abnormalFlag && result.abnormalFlag !== 'N' && (
                <Badge className={`dense-list-badge ${
                  result.abnormalFlag.includes('H') ? 'bg-red-500 text-white' : 'bg-navy-blue-500 text-white'
                }`}>
                  {result.abnormalFlag}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="dense-list-secondary">
            {result.resultAvailableAt && format(new Date(result.resultAvailableAt), 'MMM dd')}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading lab results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Lab Results
            </CardTitle>
            <CardDescription>
              Most recent laboratory data
            </CardDescription>
          </div>
          <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All Labs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>All Laboratory Results</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[80vh]">
                <IntegratedLabView 
                  patientId={patientId} 
                  patientName={`Patient ID: ${patientId}`}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className={isDenseView ? "emr-card-content" : "emr-card-content"}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="results" className="text-xs px-2">
              Results ({recentResults.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">
              Orders ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : groupedResults.length === 0 && pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>
                  <p>No lab results found</p>
                  <Button 
                    variant="link" 
                    className="text-sm mt-2"
                    onClick={() => setIsFullViewOpen(true)}
                  >
                    View all patient lab history
                  </Button>
                </div>
              </div>
            ) : groupedResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>
                  <p>No results yet - check Pending tab for active orders</p>
                  <Button 
                    variant="outline" 
                    className="text-sm mt-2"
                    onClick={() => setActiveTab("pending")}
                  >
                    View Pending Orders ({pendingOrders.length})
                  </Button>
                </div>
              </div>
            ) : isDenseView ? (
              // Dense view: Show all individual results in compact list format
              <div className={`${isDenseView ? "dense-list-container" : "space-y-3"} max-h-[400px] overflow-y-auto`}>
                {recentResults.map(renderLabResultDenseList)}
              </div>
            ) : (
              // Regular view: Group results by panel/order
              <div className="max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                  {groupedResults.map((group: any) => (
                    <Card key={group.orderInfo.id} className={group.hasAbnormal ? 'border-orange-200 bg-orange-50' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {group.orderInfo.panelName}
                            <Badge variant="secondary" className="text-xs">
                              {group.orderInfo.status}
                            </Badge>
                            {group.hasAbnormal && (
                              <Badge variant="destructive" className="text-xs">
                                Has Abnormal
                              </Badge>
                            )}
                            {group.hasCritical && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                CRITICAL
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            {group.orderInfo.date && format(new Date(group.orderInfo.date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {/* Ultra-Compact Results Grid */}
                      <div className="p-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1 py-1 px-2 bg-gray-100 rounded cursor-help">
                                <div className="col-span-3">Test</div>
                                <div className="col-span-2 text-right">Result</div>
                                <div className="col-span-1 text-center">Flag</div>
                                <div className="col-span-1 flex items-center justify-center">
                                  <Info className="h-3 w-3" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">
                              <div className="text-xs font-medium mb-2">Reference Ranges for {group.orderInfo.panelName}</div>
                              <div className="space-y-1 text-xs">
                                {group.results.map((result: any, idx: number) => (
                                  <div key={idx} className="flex justify-between gap-4">
                                    <span className="font-medium">{getTestAbbreviation(result.testName)}:</span>
                                    <span className="text-muted-foreground">{result.referenceRange}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div className="space-y-0">
                          {group.results.map((result: any) => (
                            <div key={result.id} className={`grid grid-cols-7 gap-1 py-1 px-2 text-sm hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0 ${result.criticalFlag ? 'bg-red-100 border-red-300' : result.abnormalFlag && result.abnormalFlag !== 'N' ? 'bg-yellow-50' : ''}`}>
                              <div className="col-span-3 font-medium text-xs flex items-center gap-1">
                                {result.criticalFlag && <AlertTriangle className="h-3 w-3 text-red-600" />}
                                {result.abnormalFlag && result.abnormalFlag !== 'N' && !result.criticalFlag && <AlertCircle className="h-3 w-3 text-orange-500" />}
                                {getTestAbbreviation(result.testName)}
                              </div>
                              <div className="col-span-2 text-right font-mono text-sm">
                                <span className={getFlagColor(result.abnormalFlag)}>
                                  {result.resultValue} <span className="text-xs text-gray-500">{result.resultUnits}</span>
                                </span>
                              </div>
                              <div className="col-span-1 text-center">
                                {result.criticalFlag && (
                                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                                    CRIT
                                  </Badge>
                                )}
                                {!result.criticalFlag && result.abnormalFlag && result.abnormalFlag !== 'N' && (
                                  <Badge variant={result.abnormalFlag.includes('H') ? 'destructive' : 'secondary'} className="text-xs px-1 py-0 h-4">
                                    {result.abnormalFlag}
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-1"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Show link to full view if there are more results */}
                  {safeLabResults.length > recentResults.length && (
                    <div className="text-center py-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsFullViewOpen(true)}
                      >
                        <Expand className="h-4 w-4 mr-2" />
                        View All {safeLabResults.length} Lab Results
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending lab orders</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {pendingOrders.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FlaskConical className="h-4 w-4 text-navy-blue-500" />
                          <div>
                            <h4 className="font-medium">{order.testName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ordered {format(new Date(order.orderDate), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={order.priority === 'STAT' ? 'destructive' : 'secondary'}>
                            {order.priority || 'Routine'}
                          </Badge>
                          <Badge variant="outline" className="text-navy-blue-600 border-navy-blue-200">
                            {order.orderStatus.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* External Lab Tracking */}
                      {order.externalOrderId && (
                        <div className="bg-navy-blue-50 p-3 rounded border-l-4 border-navy-blue-400">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-navy-blue-800">
                                External Lab Tracking
                              </p>
                              <p className="text-sm text-navy-blue-600">
                                Order ID: {order.externalOrderId}
                              </p>
                              {order.requisitionNumber && (
                                <p className="text-sm text-navy-blue-600">
                                  Requisition: {order.requisitionNumber}
                                </p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" className="text-navy-blue-600">
                              Track Order
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Status Timeline */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {order.orderStatus === 'pending' && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <Clock className="h-4 w-4" />
                            Order transmitted to lab. Results expected in 2-4 hours.
                          </div>
                        )}
                        {order.collectionDate && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Specimen collected: {format(new Date(order.collectionDate), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}