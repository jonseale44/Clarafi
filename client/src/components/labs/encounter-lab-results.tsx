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
  Activity
} from "lucide-react";
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
          Laboratory data relevant to this encounter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recent Results</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="abnormal">
              Abnormal ({abnormalResults.length})
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
                      
                      {/* Compact Results Table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-2 text-xs">Test</TableHead>
                            <TableHead className="py-2 text-xs text-right">Result</TableHead>
                            <TableHead className="py-2 text-xs text-center">Flag</TableHead>
                            <TableHead className="py-2 text-xs">Reference</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.results.map((result: any) => (
                            <TableRow key={result.id} className="text-sm">
                              <TableCell className="py-1 font-medium">
                                {result.testName.replace(/^(White Blood Cell Count|Red Blood Cell Count|Mean Corpuscular Volume|Mean Corpuscular Hemoglobin|Mean Corpuscular Hemoglobin Concentration)$/, (match) => {
                                  const abbreviations: { [key: string]: string } = {
                                    'White Blood Cell Count': 'WBC',
                                    'Red Blood Cell Count': 'RBC', 
                                    'Mean Corpuscular Volume': 'MCV',
                                    'Mean Corpuscular Hemoglobin': 'MCH',
                                    'Mean Corpuscular Hemoglobin Concentration': 'MCHC'
                                  };
                                  return abbreviations[match] || match;
                                })}
                              </TableCell>
                              <TableCell className="py-1 text-right font-mono">
                                <span className={getFlagColor(result.abnormalFlag)}>
                                  {result.resultValue} {result.resultUnits}
                                </span>
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                                  <Badge variant={result.abnormalFlag.includes('H') ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                                    {result.abnormalFlag}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-1 text-xs text-muted-foreground">
                                {result.referenceRange}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-2 text-xs">Test</TableHead>
                      <TableHead className="py-2 text-xs text-right">Result</TableHead>
                      <TableHead className="py-2 text-xs text-center">Flag</TableHead>
                      <TableHead className="py-2 text-xs">Reference</TableHead>
                      <TableHead className="py-2 text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abnormalResults.map((result: any) => (
                      <TableRow key={result.id} className="text-sm border-l-4 border-red-400">
                        <TableCell className="py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            {result.testName}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold text-red-600">
                          {result.resultValue} {result.resultUnits}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Badge variant="destructive" className="text-xs">
                            {result.abnormalFlag}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">
                          {result.referenceRange}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">
                          {result.resultAvailableAt && format(new Date(result.resultAvailableAt), 'MMM dd')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}