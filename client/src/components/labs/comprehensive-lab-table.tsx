/**
 * Comprehensive Lab Results Table
 * Human-centered design prioritizing pattern recognition and quick provider workflow
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, 
  ChevronDown, ChevronRight, MessageSquare, CheckCircle2, Clock, Trash2, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LabResult {
  id: number;
  labOrderId: number;
  testName: string;
  testCode: string;
  testCategory?: string;
  resultValue: string;
  resultNumeric?: number;
  resultUnits?: string;
  referenceRange?: string;
  ageGenderAdjustedRange?: string;
  abnormalFlag?: string; // 'H', 'L', 'HH', 'LL', 'A', 'AA'
  criticalFlag?: boolean;
  deltaFlag?: string;
  resultAvailableAt: string;
  resultStatus: string;
  reviewedBy?: number;
  reviewedAt?: string;
  providerNotes?: string;
  trendDirection?: string; // 'increasing', 'decreasing', 'stable', 'fluctuating'
  percentChange?: number;
  previousValue?: number;
  previousDate?: string;
  orderedBy?: number;
  orderedAt?: string;
  clinicalIndication?: string;
  priority?: string;
  providerName?: string;
  sourceType?: string;
  sourceConfidence?: string;
}

interface ComprehensiveLabTableProps {
  patientId: number;
  patientName: string;
}

export function ComprehensiveLabTable({ patientId, patientName }: ComprehensiveLabTableProps) {
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [bulkReviewNote, setBulkReviewNote] = useState("");
  const [showBulkReview, setShowBulkReview] = useState(false);
  const [editingResult, setEditingResult] = useState<LabResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    resultValue: "",
    resultUnits: "",
    referenceRange: "",
    abnormalFlag: "",
    criticalFlag: false,
    providerNotes: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('🧪 [ComprehensiveLabTable] Component initialized with:', { patientId, patientName });

  // Fetch comprehensive lab data
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    enabled: !!patientId
  });

  console.log('🧪 [ComprehensiveLabTable] Query result:', { 
    labResults, 
    isLoading, 
    dataType: typeof labResults,
    isArray: Array.isArray(labResults),
    length: Array.isArray(labResults) ? labResults.length : 'N/A',
    sampleResult: Array.isArray(labResults) && labResults.length > 0 ? labResults[0] : null
  });

  // Group results by test type for better organization
  const groupedResults = useMemo(() => {
    console.log('🧪 [ComprehensiveLabTable] Processing results in useMemo:', labResults);
    const safeResults = Array.isArray(labResults) ? labResults as LabResult[] : [];
    console.log('🧪 [ComprehensiveLabTable] Safe results:', safeResults.length, 'items');
    
    if (safeResults.length === 0) {
      console.log('🧪 [ComprehensiveLabTable] No results to process');
      return [];
    }

    // Group by test name, then sort chronologically within each group
    const grouped = safeResults.reduce((acc: { [key: string]: LabResult[] }, result: LabResult) => {
      const key = result.testName;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    console.log('🧪 [ComprehensiveLabTable] Grouped results:', Object.keys(grouped));

    // Sort each group by date (newest first) and return as flat array with grouping info
    const flattened: (LabResult & { isGroupStart?: boolean, groupSize?: number })[] = [];
    
    Object.entries(grouped)
      .sort(([, a], [, b]) => {
        // Sort groups by most recent result date
        const groupA = a as LabResult[];
        const groupB = b as LabResult[];
        const latestA = Math.max(...groupA.map(r => new Date(r.resultAvailableAt).getTime()));
        const latestB = Math.max(...groupB.map(r => new Date(r.resultAvailableAt).getTime()));
        return latestB - latestA;
      })
      .forEach(([testName, results]) => {
        const typedResults = results as LabResult[];
        const sortedResults = typedResults.sort((a, b) => 
          new Date(b.resultAvailableAt).getTime() - new Date(a.resultAvailableAt).getTime()
        );
        
        sortedResults.forEach((result, index) => {
          flattened.push({
            ...result,
            isGroupStart: index === 0,
            groupSize: sortedResults.length
          });
        });
      });

    console.log('🧪 [ComprehensiveLabTable] Final processed results:', flattened.length, 'items');
    console.log('🧪 [ComprehensiveLabTable] Sample result:', flattened[0]);
    
    return flattened;
  }, [labResults]);

  // Bulk review mutation
  const bulkReviewMutation = useMutation({
    mutationFn: async ({ resultIds, notes }: { resultIds: number[], notes: string }) => {
      const response = await fetch('/api/lab-orders/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultIds, notes })
      });
      if (!response.ok) throw new Error('Failed to review results');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results-enhanced`] });
      setSelectedResults(new Set());
      setBulkReviewNote("");
      setShowBulkReview(false);
      toast({ title: "Lab results reviewed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to review lab results", variant: "destructive" });
    }
  });

  // Delete lab result mutation
  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      const response = await fetch(`/api/patients/${patientId}/lab-results/${resultId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete lab result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      toast({ title: "Lab result deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete lab result", variant: "destructive" });
    }
  });

  // Update lab result mutation
  const updateLabResultMutation = useMutation({
    mutationFn: async ({ resultId, updates }: { resultId: number, updates: typeof editFormData }) => {
      const response = await fetch(`/api/patients/${patientId}/lab-results/${resultId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update lab result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      toast({ title: "Lab result updated successfully" });
      setEditingResult(null);
    },
    onError: () => {
      toast({ title: "Failed to update lab result", variant: "destructive" });
    }
  });

  const handleSelectResult = (resultId: number, checked: boolean) => {
    const newSelected = new Set(selectedResults);
    if (checked) {
      newSelected.add(resultId);
    } else {
      newSelected.delete(resultId);
    }
    setSelectedResults(newSelected);
  };

  const handleEditResult = (result: LabResult) => {
    setEditingResult(result);
    setEditFormData({
      resultValue: result.resultValue || "",
      resultUnits: result.resultUnits || "",
      referenceRange: result.referenceRange || "",
      abnormalFlag: result.abnormalFlag || "",
      criticalFlag: result.criticalFlag || false,
      providerNotes: result.providerNotes || ""
    });
  };

  const handleUpdateResult = () => {
    if (!editingResult) return;
    updateLabResultMutation.mutate({
      resultId: editingResult.id,
      updates: editFormData
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedResults(new Set(groupedResults.map(r => r.id)));
    } else {
      setSelectedResults(new Set());
    }
  };

  const handleBulkReview = () => {
    const resultIds = Array.from(selectedResults);
    if (resultIds.length === 0) {
      toast({ title: "Please select results to review", variant: "destructive" });
      return;
    }
    bulkReviewMutation.mutate({ resultIds, notes: bulkReviewNote });
  };

  const toggleRowExpansion = (resultId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedRows(newExpanded);
  };

  const getResultRowClass = (result: LabResult) => {
    const baseClass = "border-b transition-colors";
    
    // Unreviewed results get subtle background shading
    if (!result.reviewedBy) {
      if (result.criticalFlag) {
        return cn(baseClass, "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30");
      } else if (result.abnormalFlag && result.abnormalFlag !== 'N') {
        return cn(baseClass, "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30");
      } else {
        return cn(baseClass, "bg-gray-50 dark:bg-gray-950/50 hover:bg-gray-100 dark:hover:bg-gray-900/50");
      }
    }
    
    return cn(baseClass, "hover:bg-muted/50");
  };

  const getValueDisplayClass = (result: LabResult) => {
    if (result.criticalFlag) return "text-red-600 dark:text-red-400 font-semibold";
    if (result.abnormalFlag === 'H' || result.abnormalFlag === 'HH') return "text-orange-600 dark:text-orange-400 font-medium";
    if (result.abnormalFlag === 'L' || result.abnormalFlag === 'LL') return "text-navy-blue-600 dark:text-navy-blue-400 font-medium";
    return "text-foreground";
  };

  const getTrendIcon = (direction?: string, percentChange?: number) => {
    if (!direction || direction === 'stable') {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }
    
    const isSignificantChange = percentChange && Math.abs(percentChange) >= 10;
    const iconClass = isSignificantChange ? "h-3 w-3 font-bold" : "h-3 w-3";
    
    if (direction === 'increasing') {
      return <TrendingUp className={cn(iconClass, "text-red-500")} />;
    } else if (direction === 'decreasing') {
      return <TrendingDown className={cn(iconClass, "text-navy-blue-500")} />;
    }
    
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MM/dd/yy HH:mm') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Lab Results - {patientName}</h3>
          <Badge variant="outline">
            {groupedResults.filter(r => !r.reviewedBy).length} pending review
          </Badge>
        </div>
        
        {selectedResults.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedResults.size} selected
            </span>
            <Button 
              size="sm" 
              onClick={() => setShowBulkReview(!showBulkReview)}
              variant="outline"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Review Selected
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Review Panel */}
      {showBulkReview && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="space-y-3">
            <h4 className="font-medium">Review {selectedResults.size} selected results</h4>
            <Textarea
              placeholder="Add review notes (optional)..."
              value={bulkReviewNote}
              onChange={(e) => setBulkReviewNote(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkReview}
                disabled={bulkReviewMutation.isPending}
              >
                {bulkReviewMutation.isPending ? "Reviewing..." : "Mark as Reviewed"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkReview(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table */}
      <div className="rounded-md border">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedResults.size === groupedResults.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">Test</TableHead>
                <TableHead className="font-semibold">Value</TableHead>
                <TableHead className="font-semibold">Trend</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Provider</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedResults.flatMap((result) => {
                console.log('🧪 [ComprehensiveLabTable] Rendering result:', result.id, result.testName);
                
                const rows = [
                  <TableRow key={result.id} className={getResultRowClass(result)}>
                    <TableCell>
                      <Checkbox
                        checked={selectedResults.has(result.id)}
                        onCheckedChange={(checked) => handleSelectResult(result.id, !!checked)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      {result.isGroupStart && result.groupSize && result.groupSize > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {result.groupSize}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.testName}</span>
                          {result.sourceType === 'user_entered' && (
                            <Badge className="bg-blue-500 text-white text-xs">User Entered</Badge>
                          )}
                        </div>
                        {result.testCategory && (
                          <div className="text-xs text-muted-foreground">{result.testCategory}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="space-y-1">
                              <div className={getValueDisplayClass(result)}>
                                {result.resultValue} {result.resultUnits}
                                {result.abnormalFlag && result.abnormalFlag !== 'N' && (
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {result.abnormalFlag}
                                  </Badge>
                                )}
                                {result.criticalFlag && (
                                  <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              {result.referenceRange && (
                                <div>Reference: {result.referenceRange}</div>
                              )}
                              {result.ageGenderAdjustedRange && (
                                <div>Age/Gender Adjusted: {result.ageGenderAdjustedRange}</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(result.trendDirection, result.percentChange)}
                        {result.percentChange && (
                          <span className="text-xs text-muted-foreground">
                            {result.percentChange > 0 ? '+' : ''}{result.percentChange.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">{formatDate(result.resultAvailableAt)}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        {result.reviewedBy ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600">Reviewed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-600">Pending</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {result.orderedByName || 'Unknown'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(result.providerNotes || result.clinicalIndication) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(result.id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedRows.has(result.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditResult(result)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the lab result for ${result.testName}?`)) {
                              deleteLabResultMutation.mutate(result.id);
                            }
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          disabled={deleteLabResultMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ];

                // Add expanded row if needed
                if (expandedRows.has(result.id)) {
                  rows.push(
                    <TableRow key={`expanded-${result.id}`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        <div className="space-y-3 text-sm">
                          {result.clinicalIndication && (
                            <div>
                              <span className="font-medium">Clinical Indication: </span>
                              {result.clinicalIndication}
                            </div>
                          )}
                          {result.providerNotes && (
                            <div>
                              <span className="font-medium">Provider Notes: </span>
                              {result.providerNotes}
                            </div>
                          )}
                          {result.previousValue && (
                            <div>
                              <span className="font-medium">Previous Value: </span>
                              {result.previousValue} ({result.previousDate ? formatDate(result.previousDate) : 'Unknown date'})
                            </div>
                          )}
                          {result.reviewedAt && (
                            <div className="text-xs text-muted-foreground">
                              Reviewed on {formatDate(result.reviewedAt)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return rows;
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {groupedResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No lab results found for this patient.
        </div>
      )}

      {/* Edit Lab Result Dialog */}
      <Dialog open={!!editingResult} onOpenChange={(open) => !open && setEditingResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lab Result</DialogTitle>
            <DialogDescription>
              Modify the lab result values. User-entered values will be marked with a blue tag.
            </DialogDescription>
          </DialogHeader>
          
          {editingResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resultValue">Result Value</Label>
                <Input
                  id="resultValue"
                  value={editFormData.resultValue}
                  onChange={(e) => setEditFormData({...editFormData, resultValue: e.target.value})}
                  placeholder="Enter result value"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resultUnits">Units</Label>
                <Input
                  id="resultUnits"
                  value={editFormData.resultUnits}
                  onChange={(e) => setEditFormData({...editFormData, resultUnits: e.target.value})}
                  placeholder="Enter units (e.g., mg/dL, mmol/L)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceRange">Reference Range</Label>
                <Input
                  id="referenceRange"
                  value={editFormData.referenceRange}
                  onChange={(e) => setEditFormData({...editFormData, referenceRange: e.target.value})}
                  placeholder="Enter reference range (e.g., 4.5-11.0)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abnormalFlag">Abnormal Flag</Label>
                <Select 
                  value={editFormData.abnormalFlag} 
                  onValueChange={(value) => setEditFormData({...editFormData, abnormalFlag: value})}
                >
                  <SelectTrigger id="abnormalFlag">
                    <SelectValue placeholder="Select abnormal flag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Normal</SelectItem>
                    <SelectItem value="L">Low</SelectItem>
                    <SelectItem value="H">High</SelectItem>
                    <SelectItem value="LL">Critical Low</SelectItem>
                    <SelectItem value="HH">Critical High</SelectItem>
                    <SelectItem value="A">Abnormal</SelectItem>
                    <SelectItem value="AA">Critical Abnormal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="criticalFlag"
                  checked={editFormData.criticalFlag}
                  onCheckedChange={(checked) => setEditFormData({...editFormData, criticalFlag: !!checked})}
                />
                <Label htmlFor="criticalFlag">Critical Result</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="providerNotes">Provider Notes</Label>
                <Textarea
                  id="providerNotes"
                  value={editFormData.providerNotes}
                  onChange={(e) => setEditFormData({...editFormData, providerNotes: e.target.value})}
                  placeholder="Add any notes about this result"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingResult(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateResult}
                  disabled={updateLabResultMutation.isPending}
                >
                  {updateLabResultMutation.isPending ? "Updating..." : "Update Result"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}