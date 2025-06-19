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

  // Filter results by encounter date if provided
  const recentResults = encounterDate 
    ? labResults?.filter((result: any) => {
        const resultDate = new Date(result.resultAvailableAt);
        const encDate = new Date(encounterDate);
        const timeDiff = Math.abs(resultDate.getTime() - encDate.getTime());
        return timeDiff <= 30 * 24 * 60 * 60 * 1000; // Within 30 days
      }) || []
    : labResults?.slice(0, 10) || []; // Show last 10 results

  const pendingOrders = labOrders?.filter((order: any) => 
    order.orderStatus === 'pending' || order.orderStatus === 'collected'
  ) || [];

  const abnormalResults = labResults?.filter((result: any) => 
    result.abnormalFlag && result.abnormalFlag !== 'N'
  ) || [];

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

          <TabsContent value="recent" className="space-y-4">
            {recentResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent lab results found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentResults.map((result: any) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{result.testName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {result.testCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {result.resultValue} {result.resultUnits}
                          </p>
                          {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                            <Badge variant="destructive" className="text-xs">
                              {result.abnormalFlag}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Reference: {result.referenceRange}</p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {result.resultAvailableAt && format(new Date(result.resultAvailableAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {result.resultStatus}
                          </span>
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

          <TabsContent value="abnormal" className="space-y-4">
            {abnormalResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No abnormal results found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {abnormalResults.map((result: any) => (
                    <div key={result.id} className="border rounded-lg p-4 border-yellow-200 bg-yellow-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            {result.testName}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {result.testCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-yellow-800">
                            {result.resultValue} {result.resultUnits}
                          </p>
                          <Badge variant="destructive" className="text-xs">
                            {result.abnormalFlag}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Reference: {result.referenceRange}</p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {result.resultAvailableAt && format(new Date(result.resultAvailableAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-yellow-600" />
                            Requires Review
                          </span>
                        </div>
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