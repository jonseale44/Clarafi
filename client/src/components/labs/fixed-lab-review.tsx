import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LabResult {
  id: number;
  testName: string;
  testCode: string;
  resultValue: string;
  resultNumeric?: number;
  resultUnits: string;
  referenceRange: string;
  abnormalFlag: string | null;
  criticalFlag: boolean;
  resultAvailableAt: string;
  labOrderId: number;
  reviewedBy?: number;
  reviewedAt?: string;
}

interface LabOrder {
  id: number;
  testName: string;
  orderStatus: string;
  externalOrderId: string;
  transmittedAt: string;
}

interface FixedLabReviewProps {
  patientId: number;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FixedLabReview({ patientId, patientName, isOpen, onClose }: FixedLabReviewProps) {
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch lab results
  const { data: labResults = [], isLoading: resultsLoading } = useQuery<LabResult[]>({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: isOpen && !!patientId
  });

  // Fetch lab orders for context
  const { data: labOrders = [], isLoading: ordersLoading } = useQuery<LabOrder[]>({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    enabled: isOpen && !!patientId
  });

  // Group results by lab order
  const groupedResults = labResults.reduce((acc: Record<number, LabResult[]>, result) => {
    const orderId = result.labOrderId;
    if (!acc[orderId]) {
      acc[orderId] = [];
    }
    acc[orderId].push(result);
    return acc;
  }, {});

  // Get order info for each group
  const getOrderInfo = (orderId: number) => {
    return labOrders.find(order => order.id === orderId);
  };

  // Filter pending review results
  const pendingResults = labResults.filter(result => !result.reviewedBy);
  
  const handleReviewResults = async (resultIds: number[]) => {
    if (resultIds.length === 0) return;
    
    setIsReviewing(true);
    try {
      const response = await fetch('/api/lab-review/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultIds,
          reviewNote: reviewNote || 'Results reviewed by provider',
          reviewType: 'batch'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to review results');
      }

      const data = await response.json();
      
      toast({
        title: "Results Reviewed",
        description: `Successfully reviewed ${data.resultCount} lab results`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/lab-orders-to-review'] });
      
      setReviewNote('');
      onClose();
      
    } catch (error) {
      console.error('Review error:', error);
      toast({
        variant: "destructive",
        title: "Review Failed",
        description: "Failed to review lab results. Please try again.",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  if (resultsLoading || ordersLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading lab results...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Lab Results Review - {patientName}
            {pendingResults.length > 0 && (
              <Badge variant="destructive">
                {pendingResults.length} results pending review
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          {pendingResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Review ({pendingResults.length} results)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-review-note">Review Note (Optional)</Label>
                  <Textarea
                    id="bulk-review-note"
                    placeholder="Enter clinical notes for all pending results..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button 
                  onClick={() => handleReviewResults(pendingResults.map(r => r.id))}
                  disabled={isReviewing}
                  className="w-full"
                >
                  {isReviewing ? 'Reviewing...' : `Review All ${pendingResults.length} Pending Results`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results by Order */}
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([orderIdStr, results]) => {
              const orderId = parseInt(orderIdStr);
              const orderInfo = getOrderInfo(orderId);
              const pendingInOrder = results.filter(r => !r.reviewedBy);
              const hasAbnormal = results.some(r => r.abnormalFlag && r.abnormalFlag !== 'N');
              const hasCritical = results.some(r => r.criticalFlag);

              return (
                <Card key={orderId} className={`${hasCritical ? 'border-red-500' : hasAbnormal ? 'border-yellow-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {orderInfo?.testName || `Lab Order #${orderId}`}
                        {hasCritical && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {hasAbnormal && !hasCritical && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {orderInfo?.orderStatus && (
                          <Badge variant={orderInfo.orderStatus === 'completed' ? 'default' : 'secondary'}>
                            {orderInfo.orderStatus}
                          </Badge>
                        )}
                        {pendingInOrder.length > 0 && (
                          <Badge variant="destructive">
                            {pendingInOrder.length} pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    {orderInfo?.externalOrderId && (
                      <p className="text-sm text-gray-600">
                        External Order: {orderInfo.externalOrderId}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Test</th>
                            <th className="text-left p-2">Result</th>
                            <th className="text-left p-2">Reference Range</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Review Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <tr key={result.id} className={`border-b ${result.criticalFlag ? 'bg-red-50' : result.abnormalFlag && result.abnormalFlag !== 'N' ? 'bg-yellow-50' : ''}`}>
                              <td className="p-2 font-medium">{result.testName}</td>
                              <td className="p-2">
                                <span className={`${result.criticalFlag ? 'text-red-600 font-bold' : result.abnormalFlag && result.abnormalFlag !== 'N' ? 'text-yellow-600 font-medium' : ''}`}>
                                  {result.resultValue} {result.resultUnits}
                                </span>
                              </td>
                              <td className="p-2 text-gray-600">{result.referenceRange}</td>
                              <td className="p-2">
                                {result.criticalFlag && <Badge variant="destructive">Critical</Badge>}
                                {result.abnormalFlag && result.abnormalFlag !== 'N' && !result.criticalFlag && (
                                  <Badge variant="secondary">Abnormal</Badge>
                                )}
                                {(!result.abnormalFlag || result.abnormalFlag === 'N') && !result.criticalFlag && (
                                  <Badge variant="outline">Normal</Badge>
                                )}
                              </td>
                              <td className="p-2">
                                {result.reviewedBy ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs">Reviewed</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs">Pending</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                {!result.reviewedBy && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReviewResults([result.id])}
                                    disabled={isReviewing}
                                  >
                                    Review
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {pendingInOrder.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => handleReviewResults(pendingInOrder.map(r => r.id))}
                          disabled={isReviewing}
                          className="w-full"
                        >
                          Review All {pendingInOrder.length} Results in This Panel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {labResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No lab results found for this patient.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}