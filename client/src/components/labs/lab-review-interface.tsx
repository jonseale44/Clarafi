/**
 * Universal Lab Review Interface
 * 
 * Professional EMR-grade component that provides consistent lab review
 * capabilities across all contexts (dashboard, encounter, patient chart)
 * 
 * Follows healthcare industry standards for lab result review workflows
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LabResult {
  id: number;
  testName: string;
  resultValue: string;
  resultUnits?: string;
  referenceRange?: string;
  abnormalFlag?: string | null;
  criticalFlag?: boolean;
  resultAvailableAt: string;
  specimenCollectedAt?: string;
  reviewed?: boolean;
}

interface UniversalLabReviewProps {
  // Context identification
  context: 'dashboard' | 'encounter' | 'patient-chart';
  patientId: number;
  patientName: string;
  
  // Review data - one of these must be provided
  selectedDate?: string;
  selectedPanels?: string[];
  selectedResultIds?: number[];
  
  // Review state
  isOpen: boolean;
  onClose: () => void;
  onReviewComplete?: (reviewedCount: number) => void;
  
  // Optional: pre-loaded results for performance
  preloadedResults?: LabResult[];
}

export function UniversalLabReview({
  context,
  patientId,
  patientName,
  selectedDate,
  selectedPanels,
  selectedResultIds,
  isOpen,
  onClose,
  onReviewComplete,
  preloadedResults
}: UniversalLabReviewProps) {
  const [reviewNote, setReviewNote] = React.useState('');
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [resultsToReview, setResultsToReview] = React.useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const { toast } = useToast();

  // Fetch results when component opens
  React.useEffect(() => {
    if (!isOpen) return;
    
    if (preloadedResults) {
      setResultsToReview(preloadedResults);
      return;
    }
    
    fetchResultsToReview();
  }, [isOpen, selectedDate, selectedPanels, selectedResultIds]);

  const fetchResultsToReview = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      
      if (selectedDate) {
        endpoint = `/api/lab-review/date-results/${patientId}/${encodeURIComponent(selectedDate)}`;
      } else if (selectedResultIds?.length) {
        // For specific result IDs, we'd need a different endpoint
        // For now, use the lab results endpoint and filter
        const response = await fetch(`/api/patients/${patientId}/lab-results`);
        const allResults = await response.json();
        const filtered = allResults.filter((r: any) => selectedResultIds.includes(r.id));
        setResultsToReview(filtered);
        setIsLoading(false);
        return;
      }
      
      if (endpoint) {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success) {
          setResultsToReview(data.data?.results || []);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch results');
        }
      }
    } catch (error) {
      console.error('Error fetching results to review:', error);
      toast({
        title: "Error",
        description: "Failed to load lab results for review",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewNote.trim()) {
      toast({
        title: "Review Note Required",
        description: "Please provide a clinical review note",
        variant: "destructive"
      });
      return;
    }

    setIsReviewing(true);
    try {
      let reviewResponse;
      
      if (selectedDate) {
        reviewResponse = await fetch('/api/lab-review/by-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            selectedDate,
            reviewNote,
            reviewType: 'encounter'
          })
        });
      } else if (selectedPanels?.length) {
        reviewResponse = await fetch('/api/lab-review/by-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            panelNames: selectedPanels,
            reviewNote,
            reviewType: 'panel'
          })
        });
      } else if (selectedResultIds?.length) {
        reviewResponse = await fetch('/api/lab-review/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resultIds: selectedResultIds,
            reviewNote,
            reviewType: 'batch'
          })
        });
      }

      if (!reviewResponse) {
        throw new Error('No valid review configuration');
      }

      const result = await reviewResponse.json();
      
      if (!reviewResponse.ok) {
        throw new Error(result.error?.message || 'Review failed');
      }

      const reviewedCount = result.data?.resultCount || 0;
      
      toast({
        title: "Review Completed",
        description: result.data?.message || `Successfully reviewed ${reviewedCount} lab results`,
      });

      onReviewComplete?.(reviewedCount);
      onClose();
      
    } catch (error) {
      console.error('Review error:', error);
      toast({
        title: "Review Failed",
        description: error.message || "Failed to complete lab review",
        variant: "destructive"
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const getReviewScopeDescription = () => {
    if (selectedDate) {
      const date = new Date(selectedDate).toLocaleDateString();
      return `All lab results from encounter(s) on ${date}`;
    } else if (selectedPanels?.length) {
      return `Lab panels: ${selectedPanels.join(', ')}`;
    } else if (selectedResultIds?.length) {
      return `${selectedResultIds.length} selected lab results`;
    }
    return 'Selected lab results';
  };

  const criticalCount = resultsToReview.filter(r => r.criticalFlag).length;
  const abnormalCount = resultsToReview.filter(r => r.abnormalFlag && r.abnormalFlag !== 'N').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Lab Results Review</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {patientName} • {getReviewScopeDescription()}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin mr-2" />
              Loading lab results...
            </div>
          ) : (
            <>
              {/* Review Summary */}
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-3">Review Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{resultsToReview.length}</div>
                    <div className="text-sm text-muted-foreground">Total Results</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{abnormalCount}</div>
                    <div className="text-sm text-muted-foreground">Abnormal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 mb-6">
                <h3 className="font-medium">Results to Review</h3>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {resultsToReview.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div className="flex-1">
                        <div className="font-medium">{result.testName}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.resultValue} {result.resultUnits}
                          {result.referenceRange && ` (Ref: ${result.referenceRange})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.criticalFlag && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                          <Badge variant="secondary" className="text-xs">
                            {result.abnormalFlag}
                          </Badge>
                        )}
                        {result.reviewed && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Note */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Clinical Review & Notes</label>
                <Textarea
                  placeholder="Enter your clinical interpretation and review notes..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </>
          )}
        </CardContent>
        
        <div className="border-t p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Review will be recorded in patient chart with audit trail
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isReviewing}>
              Cancel
            </Button>
            <Button 
              onClick={handleReview} 
              disabled={isReviewing || isLoading || !reviewNote.trim()}
              className="min-w-32"
            >
              {isReviewing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Reviewing...
                </>
              ) : (
                `Review ${resultsToReview.length} Results`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}