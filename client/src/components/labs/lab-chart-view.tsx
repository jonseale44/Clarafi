/**
 * Comprehensive Laboratory Chart View
 * Production-level lab management interface
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import {
  TestTube, AlertTriangle, Clock, Eye, CheckCircle2,
  Search, Download, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LabOrder {
  id: number;
  testName: string;
  loincCode?: string;
  testCategory?: string;
  priority: string;
  orderStatus: string;
  orderedAt: string;
  clinicalIndication?: string;
  specimenType?: string;
  fastingRequired: boolean;
}

interface LabResult {
  id: number;
  labOrderId: number;
  testName: string;
  resultValue: string;
  resultUnits?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  criticalFlag?: boolean;
  resultStatus: string;
  resultAvailableAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
}

interface LabChartViewProps {
  patientId: number;
  patientName: string;
}

export function LabChartView({ patientId, patientName }: LabChartViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch lab orders
  const { data: labOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  // Fetch lab results
  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  const filteredResults = labResults.filter((result: LabResult) => {
    const matchesCategory = selectedCategory === "all" || 
      (result as any).testCategory === selectedCategory;
    const matchesSearch = result.testName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const criticalResults = labResults.filter((result: LabResult) => result.criticalFlag);
  const unreviewedResults = labResults.filter((result: LabResult) => !result.reviewedBy);

  const getStatusColor = (flag?: string) => {
    switch (flag) {
      case "H": case "HH": return "destructive";
      case "L": case "LL": return "secondary";
      case "A": return "outline";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "destructive";
      case "urgent": return "destructive";
      case "routine": return "secondary";
      default: return "outline";
    }
  };

  // Helper function to get test abbreviations
  const getTestAbbreviation = (testName: string): string => {
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
  };

  // Helper function to get flag color
  const getFlagColor = (flag: string): string => {
    if (!flag || flag === 'N') return '';
    if (flag === 'H' || flag === 'HH') return 'text-red-600 font-medium';
    if (flag === 'L' || flag === 'LL') return 'text-blue-600 font-medium';
    return 'text-orange-600 font-medium';
  };

  // Group results by panel/category for compact display
  const groupedResults = filteredResults.reduce((groups: any, result: LabResult) => {
    const panelName = result.testCategory || 'Miscellaneous';
    if (!groups[panelName]) {
      groups[panelName] = [];
    }
    groups[panelName].push(result);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Laboratory Results</h2>
          <p className="text-gray-600">{patientName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <TestTube className="h-4 w-4 text-blue-500" />
            <span>{labResults.length} Total Results</span>
          </div>
          {criticalResults.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{criticalResults.length} Critical</span>
            </div>
          )}
          {unreviewedResults.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span>{unreviewedResults.length} Pending Review</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search lab tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="chemistry">Chemistry</SelectItem>
                <SelectItem value="hematology">Hematology</SelectItem>
                <SelectItem value="microbiology">Microbiology</SelectItem>
                <SelectItem value="molecular">Molecular</SelectItem>
                <SelectItem value="endocrinology">Endocrinology</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Lab Results</TabsTrigger>
          <TabsTrigger value="orders">Pending Orders</TabsTrigger>
          <TabsTrigger value="critical">Critical Values</TabsTrigger>
        </TabsList>

        {/* Lab Results Tab - Compact View */}
        <TabsContent value="results" className="space-y-4">
          {resultsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {Object.entries(groupedResults).map(([panelName, results]: [string, any]) => (
                  <Card key={panelName}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TestTube className="h-4 w-4" />
                          {panelName}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {results[0]?.resultAvailableAt && format(parseISO(results[0].resultAvailableAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                              <div className="text-xs font-medium mb-2">Reference Ranges for {panelName}</div>
                              <div className="space-y-1 text-xs">
                                {results.map((result: LabResult, idx: number) => (
                                  <div key={idx} className="flex justify-between gap-4">
                                    <span className="font-medium">{getTestAbbreviation(result.testName)}:</span>
                                    <span className="text-muted-foreground">{result.referenceRange || 'N/A'}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div className="space-y-0">
                          {results.map((result: LabResult) => (
                            <div key={result.id} className={`grid grid-cols-7 gap-1 py-1 px-2 text-sm hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0 ${result.criticalFlag ? 'bg-red-50 border-red-200' : ''}`}>
                              <div className="col-span-3 font-medium text-xs flex items-center gap-1">
                                {result.criticalFlag && <AlertTriangle className="h-3 w-3 text-red-500" />}
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
                                {result.criticalFlag && (
                                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                                    CRIT
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-1"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredResults.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Results Found</h3>
                    <p>No laboratory results match your current filters.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {labOrders
                .filter((order: LabOrder) => order.orderStatus !== 'completed')
                .map((order: LabOrder) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">{order.testName}</h4>
                          <Badge variant={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {order.orderStatus}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Ordered:</span>
                            <p>{format(parseISO(order.orderedAt), "MMM d, yyyy HH:mm")}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Specimen:</span>
                            <p className="capitalize">{order.specimenType || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Fasting:</span>
                            <p>{order.fastingRequired ? "Required" : "Not Required"}</p>
                          </div>
                        </div>

                        {order.clinicalIndication && (
                          <div>
                            <span className="font-medium text-gray-600">Clinical Indication:</span>
                            <p className="text-sm">{order.clinicalIndication}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {labOrders.filter((order: LabOrder) => order.orderStatus !== 'completed').length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Orders</h3>
                  <p>All laboratory orders have been completed.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Critical Values Tab - Compact View */}
        <TabsContent value="critical" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="p-2">
              <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-2 py-1 px-2 bg-red-100 rounded">
                <div className="col-span-3 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  Test
                </div>
                <div className="col-span-2 text-right">Critical Value</div>
                <div className="col-span-1 text-center">Flag</div>
                <div className="col-span-1 text-center">Date</div>
              </div>
              
              <div className="space-y-1">
                {criticalResults.map((result: LabResult) => (
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
                              CRIT
                            </Badge>
                          </div>
                          <div className="col-span-1 text-center text-xs text-muted-foreground">
                            {format(parseISO(result.resultAvailableAt), 'MMM dd')}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="text-xs">
                          <div><strong>Full Name:</strong> {result.testName}</div>
                          <div><strong>Reference:</strong> {result.referenceRange || 'N/A'}</div>
                          <div><strong>Status:</strong> {result.reviewedBy ? 'Reviewed' : 'Pending Review'}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              
              {criticalResults.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Values</h3>
                  <p>No critical laboratory values require immediate attention.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}