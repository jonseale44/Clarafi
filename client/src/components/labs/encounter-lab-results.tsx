import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FlaskConical, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface EncounterLabResultsProps {
  patientId: number;
  encounterDate?: Date;
}

export function EncounterLabResults({ patientId, encounterDate }: EncounterLabResultsProps) {
  const [activeTab, setActiveTab] = useState("recent");

  // Fetch lab orders and results
  const { data: labOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  // Ensure data is arrays
  const safeLabResults = Array.isArray(labResults) ? labResults : [];
  const safeLabOrders = Array.isArray(labOrders) ? labOrders : [];

  // Filter results by encounter date if provided
  const recentResults = encounterDate 
    ? safeLabResults.filter((result: any) => {
        if (!result.resultAvailableAt) return false;
        const resultDate = new Date(result.resultAvailableAt);
        const encDate = new Date(encounterDate);
        const timeDiff = Math.abs(resultDate.getTime() - encDate.getTime());
        return timeDiff <= 30 * 24 * 60 * 60 * 1000; // Within 30 days
      })
    : safeLabResults.slice(0, 30); // Show more recent results

  const pendingOrders = safeLabOrders.filter((order: any) => 
    order.orderStatus === 'pending' || order.orderStatus === 'collected'
  );

  const abnormalResults = safeLabResults.filter((result: any) => 
    result.abnormalFlag && result.abnormalFlag !== 'N'
  );

  // Group results by lab order (panel) for compact display
  const groupedResults = recentResults.reduce((groups: any, result: any) => {
    const orderKey = result.labOrderId || 'standalone';
    if (!groups[orderKey]) {
      groups[orderKey] = {
        orderInfo: {
          date: result.resultAvailableAt,
          panelName: result.labOrderId ? getPanelName(result.testName) : result.testName,
          status: result.resultStatus
        },
        results: []
      };
    }
    groups[orderKey].results.push(result);
    return groups;
  }, {});

  // Helper function to determine panel name from test name
  function getPanelName(testName: string): string {
    if (['White Blood Cell Count', 'Red Blood Cell Count', 'Hemoglobin', 'Hematocrit', 'Platelet Count', 'Mean Corpuscular Volume', 'Mean Corpuscular Hemoglobin', 'Mean Corpuscular Hemoglobin Concentration'].includes(testName)) {
      return 'Complete Blood Count (CBC)';
    }
    if (['Glucose', 'BUN', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'CO2'].includes(testName)) {
      return 'Comprehensive Metabolic Panel (CMP)';
    }
    if (['TSH', 'T4', 'T3'].includes(testName)) {
      return 'Thyroid Panel';
    }
    return testName;
  }

  // Helper function to get flag color
  function getFlagColor(flag: string): string {
    if (!flag || flag === 'N') return '';
    if (flag === 'H' || flag === 'HH') return 'text-red-600 font-medium';
    if (flag === 'L' || flag === 'LL') return 'text-blue-600 font-medium';
    return 'text-orange-600 font-medium';
  }

  // Helper function to get test abbreviations
  function getTestAbbreviation(testName: string): string {
    const abbreviations: { [key: string]: string } = {
      'White Blood Cell Count': 'WBC',
      'Red Blood Cell Count': 'RBC', 
      'Mean Corpuscular Volume': 'MCV',
      'Mean Corpuscular Hemoglobin': 'MCH',
      'Mean Corpuscular Hemoglobin Concentration': 'MCHC',
      'Platelet Count': 'PLT',
      'Hemoglobin': 'HGB',
      'Hematocrit': 'HCT'
    };
    return abbreviations[testName] || testName;
  }

  if (ordersLoading || resultsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Lab Results
        </CardTitle>
        <CardDescription>
          Recent laboratory data for this patient (last 30 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">
              Recent Results ({recentResults.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Orders ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-3">
            {Object.keys(groupedResults).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent lab results found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {Object.entries(groupedResults).map(([orderKey, group]: [string, any]) => (
                    <div key={orderKey} className="border rounded-lg">
                      {/* Panel Header */}
                      <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{group.orderInfo.panelName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {group.orderInfo.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {group.orderInfo.date && format(new Date(group.orderInfo.date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      
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
                            <div key={result.id} className="grid grid-cols-7 gap-1 py-1 px-2 text-sm hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0">
                              <div className="col-span-3 font-medium text-xs">
                                {getTestAbbreviation(result.testName)}
                              </div>
                              <div className="col-span-2 text-right font-mono text-sm">
                                <span className={getFlagColor(result.abnormalFlag)}>
                                  {result.resultValue} <span className="text-xs text-gray-500">{result.resultUnits}</span>
                                </span>
                              </div>
                              <div className="col-span-1 text-center">
                                {result.abnormalFlag && result.abnormalFlag !== 'N' && (
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
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{order.testName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {order.testCode} • {order.priority}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.clinicalIndication}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {order.orderStatus}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Ordered: {order.orderedAt && format(new Date(order.orderedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="abnormal" className="space-y-3">
            {abnormalResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No abnormal results found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-2 py-1 px-2 bg-red-100 rounded">
                    <div className="col-span-3 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      Test
                    </div>
                    <div className="col-span-2 text-right">Result</div>
                    <div className="col-span-1 text-center">Flag</div>
                    <div className="col-span-1 text-center">Date</div>
                  </div>
                  
                  <div className="space-y-1">
                    {abnormalResults.map((result: any) => (
                      <TooltipProvider key={result.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="grid grid-cols-7 gap-1 py-2 text-sm border-l-4 border-red-400 bg-red-50 hover:bg-red-100 rounded px-2 cursor-help">
                              <div className="col-span-3 font-medium text-sm">
                                {getTestAbbreviation(result.testName)}
                              </div>
                              <div className="col-span-2 text-right font-mono font-semibold text-red-600">
                                {result.resultValue} <span className="text-xs">{result.resultUnits}</span>
                              </div>
                              <div className="col-span-1 text-center">
                                <Badge variant="destructive" className="text-xs h-4">
                                  {result.abnormalFlag}
                                </Badge>
                              </div>
                              <div className="col-span-1 text-center text-xs text-muted-foreground">
                                {result.resultAvailableAt && format(new Date(result.resultAvailableAt), 'MMM dd')}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <div className="text-xs">
                              <div><strong>Full Name:</strong> {result.testName}</div>
                              <div><strong>Reference:</strong> {result.referenceRange}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}