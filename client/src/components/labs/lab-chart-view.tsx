/**
 * Comprehensive Laboratory Chart View
 * Production-level lab management interface
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import {
  TestTube, AlertTriangle, Clock, Eye, CheckCircle2,
  Search, Download
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
    queryKey: ["/api/patients", patientId, "lab-orders"],
    queryFn: () => apiRequest(`/api/patients/${patientId}/lab-orders`),
  });

  // Fetch lab results
  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/patients", patientId, "lab-results"],
    queryFn: () => apiRequest(`/api/patients/${patientId}/lab-results`),
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

        {/* Lab Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {resultsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((result: LabResult) => (
                <Card key={result.id} className={`${result.criticalFlag ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-lg">{result.testName}</h4>
                          {result.abnormalFlag && (
                            <Badge variant={getStatusColor(result.abnormalFlag)}>
                              {result.abnormalFlag}
                            </Badge>
                          )}
                          {result.criticalFlag && (
                            <Badge variant="destructive">Critical</Badge>
                          )}
                          {!result.reviewedBy && (
                            <Badge variant="outline">Pending Review</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Result:</span>
                            <p className="font-mono text-lg">
                              {result.resultValue} {result.resultUnits || ''}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Reference:</span>
                            <p>{result.referenceRange || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Date:</span>
                            <p>{format(parseISO(result.resultAvailableAt), "MMM d, yyyy HH:mm")}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Status:</span>
                            <p className="capitalize">{result.resultStatus}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
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

        {/* Critical Values Tab */}
        <TabsContent value="critical" className="space-y-4">
          <div className="space-y-3">
            {criticalResults.map((result: LabResult) => (
              <Card key={result.id} className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h4 className="font-semibold text-lg text-red-900">{result.testName}</h4>
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-red-700">Critical Value:</span>
                          <p className="font-mono text-lg text-red-900">
                            {result.resultValue} {result.resultUnits || ''}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-red-700">Reference:</span>
                          <p className="text-red-800">{result.referenceRange || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-red-700">Date:</span>
                          <p className="text-red-800">{format(parseISO(result.resultAvailableAt), "MMM d, yyyy HH:mm")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="destructive">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {criticalResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Values</h3>
                <p>No critical laboratory values require immediate attention.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}