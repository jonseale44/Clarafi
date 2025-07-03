/**
 * Integrated Lab Management View
 * Single interface for all lab-related activities in patient chart
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  TestTube, AlertTriangle, Clock, Eye, CheckCircle2,
  MessageSquare, Send, Plus, FileText, Activity
} from "lucide-react";

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
  sourceType: string;
  sourceConfidence: number;
  providerId?: number;
}

interface IntegratedLabViewProps {
  patientId: number;
  patientName: string;
}

export function IntegratedLabView({ patientId, patientName }: IntegratedLabViewProps) {
  const [selectedResults, setSelectedResults] = useState<LabResult[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch lab results
  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  // Fetch lab orders
  const { data: labOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: !!patientId
  });

  // Group results by order/panel for better organization
  const groupedResults = labResults.reduce((acc: any, result: LabResult) => {
    const orderKey = result.labOrderId || 'standalone';
    if (!acc[orderKey]) {
      acc[orderKey] = [];
    }
    acc[orderKey].push(result);
    return acc;
  }, {});

  // Filter for actionable results
  const pendingReview = labResults.filter((r: LabResult) => !r.reviewedBy);
  const criticalResults = labResults.filter((r: LabResult) => r.criticalFlag);
  const abnormalResults = labResults.filter((r: LabResult) => 
    r.abnormalFlag && r.abnormalFlag !== 'N'
  );

  const handleReviewResults = (results: LabResult[]) => {
    setSelectedResults(results);
    setReviewNote("");
    setGeneratedMessage("");
    setShowReviewDialog(true);
  };

  const handleGenerateMessage = async () => {
    if (selectedResults.length === 0) return;
    
    setIsGeneratingMessage(true);
    try {
      const response = await fetch('/api/lab-communication/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId: 305, // Current encounter
          resultIds: selectedResults.map(r => r.id),
          messageType: criticalResults.length > 0 ? 'critical_results' : 
                      abnormalResults.length > 0 ? 'abnormal_results' : 'normal_results',
          preferredChannel: 'portal',
          forceGenerate: true
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage(data.message || "Message generated and queued for approval");
        toast({
          title: "Message Generated",
          description: "Patient communication created successfully",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate patient message",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCompleteReview = async () => {
    // Mark results as reviewed and optionally send message
    try {
      for (const result of selectedResults) {
        await fetch(`/api/dashboard/review-lab-result/${result.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewNote }),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      setShowReviewDialog(false);
      toast({
        title: "Review Complete",
        description: `${selectedResults.length} result(s) marked as reviewed`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Review Failed",
        description: "Could not complete review",
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return "bg-green-100 text-green-800";
    if (confidence >= 0.85) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  const getAbnormalColor = (flag?: string) => {
    if (!flag || flag === 'N') return "";
    return flag.includes('H') ? "text-red-600 font-semibold" : "text-navy-blue-600 font-semibold";
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Laboratory Results</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Order Labs
          </Button>
          {pendingReview.length > 0 && (
            <Button 
              onClick={() => handleReviewResults(pendingReview)}
              variant="default"
            >
              <Eye className="h-4 w-4 mr-2" />
              Review {pendingReview.length} Results
            </Button>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalResults.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Critical Results Requiring Immediate Attention</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalResults.map((result: LabResult) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                  <div>
                    <span className="font-semibold">{result.testName}: </span>
                    <span className="text-red-600 font-bold">{result.resultValue} {result.resultUnits}</span>
                    <span className="text-sm text-gray-600 ml-2">({result.referenceRange})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReviewResults([result])}
                  >
                    Review Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent">Recent Results</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="orders">Active Orders</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          {resultsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {Object.entries(groupedResults).map(([orderKey, results]: [string, any]) => {
                  const orderInfo = labOrders.find((o: any) => o.id === parseInt(orderKey));
                  const panelName = orderInfo?.testName || 'Standalone Results';
                  
                  return (
                    <Card key={orderKey}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TestTube className="h-5 w-5" />
                            <div>
                              <CardTitle className="text-lg">{panelName}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {results[0]?.resultAvailableAt && 
                                  format(parseISO(results[0].resultAvailableAt), 'MMM dd, yyyy HH:mm')
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getConfidenceColor(results[0]?.sourceConfidence || 0.85)}>
                              {Math.round((results[0]?.sourceConfidence || 0.85) * 100)}% confidence
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReviewResults(results)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Review & Communicate
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {results.map((result: LabResult) => (
                            <div key={result.id} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium">{result.testName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Reference: {result.referenceRange || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-semibold ${getAbnormalColor(result.abnormalFlag)}`}>
                                    {result.resultValue} {result.resultUnits}
                                  </p>
                                  {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                                    <Badge variant={result.abnormalFlag.includes('H') ? 'destructive' : 'secondary'}>
                                      {result.abnormalFlag}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {result.reviewedBy ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Results Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReview.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-300" />
                  <p>All results have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReview.map((result: LabResult) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{result.testName}: </span>
                        <span className={getAbnormalColor(result.abnormalFlag)}>
                          {result.resultValue} {result.resultUnits}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleReviewResults([result])}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Active Lab Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Lab orders content */}
              <p className="text-muted-foreground">Active lab orders will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Lab Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Trends and charts */}
              <p className="text-muted-foreground">Lab trends and historical charts will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Lab Results & Generate Patient Communication</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Results Being Reviewed:</h3>
              <div className="space-y-1">
                {selectedResults.map((result: LabResult) => (
                  <div key={result.id} className="text-sm">
                    <span className="font-medium">{result.testName}:</span> {result.resultValue} {result.resultUnits}
                    {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                      <Badge variant="outline" className="ml-2">{result.abnormalFlag}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Notes */}
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Clinical Interpretation & Notes</Label>
              <Textarea
                id="reviewNote"
                placeholder="Enter your clinical interpretation, follow-up instructions, and any relevant notes..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={4}
              />
            </div>

            {/* Patient Communication */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Patient Communication</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMessage}
                  disabled={isGeneratingMessage}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {isGeneratingMessage ? "Generating..." : "Generate AI Message"}
                </Button>
              </div>
              
              {generatedMessage && (
                <div className="p-3 bg-navy-blue-50 border border-navy-blue-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="h-4 w-4 text-navy-blue-600" />
                    <span className="text-sm font-medium text-navy-blue-800">Generated Patient Message</span>
                  </div>
                  <p className="text-sm text-navy-blue-700">{generatedMessage}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCompleteReview}>
                Complete Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}