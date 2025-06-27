import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Calendar, ChevronDown, ChevronRight, AlertCircle, Eye, EyeOff, Filter, Activity, Clock, CheckCircle2, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/contexts/UploadContext";
import { UploadLoadingOverlay } from "@/components/ui/upload-loading-overlay";
import { EnhancedMedicalProblemsDialog } from "./enhanced-medical-problems-dialog";
import { DualHandleSlider } from "@/components/ui/dual-handle-slider";
import { RankingWeightControls } from "./ranking-weight-controls";
import { useLocation } from "wouter";

interface VisitNote {
  date: string;
  notes: string;
  source: "encounter" | "attachment" | "manual" | "imported_record";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  confidence?: number;
  sourceConfidence?: number;
}

interface MedicalProblem {
  id: number;
  problemTitle: string;
  currentIcd10Code?: string;
  problemStatus: "active" | "resolved" | "chronic";
  firstDiagnosedDate?: string;
  visitHistory: VisitNote[];
  changeLog?: Array<{
    action: string;
    details: string;
    timestamp: string;
  }>;
  lastUpdated?: string;
  // GPT-powered intelligent ranking
  rankScore?: number; // 1.00 (highest priority) to 99.99 (lowest priority)
  lastRankedEncounterId?: number;
  rankingReason?: string; // GPT's reasoning for rank assignment
}

interface EnhancedMedicalProblemsListProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
}

// Utility function for rank-based visual styling
const getRankStyles = (rankScore?: number) => {
  if (!rankScore) return { 
    bgColor: "bg-gray-50 dark:bg-gray-800", 
    borderColor: "border-gray-200 dark:border-gray-700", 
    textColor: "text-gray-600 dark:text-gray-400",
    priority: "Unranked"
  };
  
  // 1.00 = Highest Priority (Red), 99.99 = Lowest Priority (Blue)
  if (rankScore <= 10) {
    return { 
      bgColor: "bg-red-50 dark:bg-red-900/20", 
      borderColor: "border-red-300 dark:border-red-800", 
      textColor: "text-red-700 dark:text-red-300", 
      priority: "Critical" 
    };
  } else if (rankScore <= 20) {
    return { 
      bgColor: "bg-orange-50 dark:bg-orange-900/20", 
      borderColor: "border-orange-300 dark:border-orange-800", 
      textColor: "text-orange-700 dark:text-orange-300", 
      priority: "High" 
    };
  } else if (rankScore <= 40) {
    return { 
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20", 
      borderColor: "border-yellow-300 dark:border-yellow-800", 
      textColor: "text-yellow-700 dark:text-yellow-300", 
      priority: "Medium" 
    };
  } else if (rankScore <= 60) {
    return { 
      bgColor: "bg-green-50 dark:bg-green-900/20", 
      borderColor: "border-green-300 dark:border-green-800", 
      textColor: "text-green-700 dark:text-green-300", 
      priority: "Low" 
    };
  } else {
    return { 
      bgColor: "bg-blue-50 dark:bg-blue-900/20", 
      borderColor: "border-blue-300 dark:border-blue-800", 
      textColor: "text-blue-700 dark:text-blue-300", 
      priority: "Routine" 
    };
  }
};

export function EnhancedMedicalProblemsList({ 
  patientId, 
  encounterId, 
  mode = "patient-chart", 
  isReadOnly = false 
}: EnhancedMedicalProblemsListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<MedicalProblem | null>(null);
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'current' | 'resolved'>('current');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { uploadState } = useUpload();
  
  // Check if upload is for current patient to show loading overlay
  const isUploadingForThisPatient = uploadState.isUploading && uploadState.patientId === patientId;

  // Load medical problems data using unified API
  const { data: medicalProblems = [], isLoading, error } = useQuery<MedicalProblem[]>({
    queryKey: ['/api/medical-problems', patientId],
    enabled: !!patientId,
  });

  const { data: encounters = [] } = useQuery<any[]>({
    queryKey: ['/api/encounters', patientId],
    enabled: !!patientId,
  });

  // User preferences query
  const { data: userPreferences } = useQuery<{ medicalProblemsDisplayThreshold?: number }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Slider state management
  const [largeHandleValue, setLargeHandleValue] = useState(100); // Permanent user preference
  const [smallHandleValue, setSmallHandleValue] = useState(100); // Temporary session filter
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize slider values from user preferences
  useEffect(() => {
    if (userPreferences && !isInitialized) {
      const threshold = userPreferences.medicalProblemsDisplayThreshold || 100; // Default to 100% only if no preference saved
      setLargeHandleValue(threshold);
      setSmallHandleValue(threshold); // Small handle starts at large handle position
      setIsInitialized(true);
    }
  }, [userPreferences, isInitialized]);

  // Reset small handle to large handle position when leaving encounter (simulated by patientId change)
  useEffect(() => {
    if (isInitialized) {
      setSmallHandleValue(largeHandleValue); // Reset to large handle position, not 100%
    }
  }, [patientId, largeHandleValue, isInitialized]);

  // Slider event handlers
  const handleLargeHandleChange = (value: number) => {
    setLargeHandleValue(value);
    setSmallHandleValue(value); // Rule 1: Large handle ALWAYS moves small handle to same position
    
    // Save to user preferences
    updatePreferencesMutation.mutate({
      medicalProblemsDisplayThreshold: value
    });
  };

  const handleSmallHandleChange = (value: number) => {
    setSmallHandleValue(value);
    // Small handle changes are temporary and not saved
  };

  // Calculate filtered problems based on small handle value
  const getFilteredProblems = (problems: MedicalProblem[]) => {
    if (!problems.length) return problems;
    
    // Calculate how many problems to show based on percentage
    const totalProblems = problems.length;
    const percentageToShow = smallHandleValue;
    const problemsToShow = Math.max(1, Math.ceil((percentageToShow / 100) * totalProblems));
    
    // Return top ranked problems (already sorted by rank score)
    return problems.slice(0, problemsToShow);
  };

  const deleteMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/medical-problems/${problemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to delete problem');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-problems', patientId] });
      toast({ title: "Success", description: "Medical problem deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (problem: MedicalProblem) => {
    setEditingProblem(problem);
    setIsDialogOpen(true);
  };

  const handleDelete = (problemId: number) => {
    if (confirm('Are you sure you want to delete this medical problem?')) {
      deleteMutation.mutate(problemId);
    }
  };

  const resolveMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/medical-problems/${problemId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to resolve problem');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-problems', patientId] });
      toast({ title: "Success", description: "Medical problem marked as resolved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // User preferences update mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: { medicalProblemsDisplayThreshold: number }) => {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  const handleResolve = (problemId: number) => {
    if (confirm('Mark this medical problem as resolved?')) {
      resolveMutation.mutate(problemId);
    }
  };

  const handleAddNew = () => {
    setEditingProblem(null);
    setIsDialogOpen(true);
  };

  const toggleProblemExpansion = (problemId: number) => {
    const newExpanded = new Set(expandedProblems);
    if (newExpanded.has(problemId)) {
      newExpanded.delete(problemId);
    } else {
      newExpanded.add(problemId);
    }
    setExpandedProblems(newExpanded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Parse date as local date to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  };

  // Separate and intelligently sort problems by rank score (1.00 = highest priority)
  const activeProblems = medicalProblems
    .filter(p => p.problemStatus === 'active')
    .sort((a, b) => (a.rankScore || 99.99) - (b.rankScore || 99.99));

  // Apply filtering based on slider values
  const filteredActiveProblems = getFilteredProblems(activeProblems);
  
  const chronicProblems = medicalProblems
    .filter(p => p.problemStatus === 'chronic')
    .sort((a, b) => (a.rankScore || 99.99) - (b.rankScore || 99.99));
  
  const resolvedProblems = medicalProblems
    .filter(p => p.problemStatus === 'resolved')
    .sort((a, b) => (a.rankScore || 99.99) - (b.rankScore || 99.99));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'chronic': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'chronic': return <Clock className="h-3 w-3" />;
      case 'resolved': return <CheckCircle2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const getSourceBadge = (visit: VisitNote) => {
    const { source, attachmentId, confidence, encounterId } = visit;
    
    switch (source) {
      case "encounter":
        // Clickable encounter badge that navigates to encounter detail
        const handleEncounterClick = () => {
          if (encounterId) {
            setLocation(`/patients/${patientId}/encounters/${encounterId}`);
          }
        };
        return (
          <Badge 
            variant="default" 
            className="text-xs cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-400 transition-colors"
            onClick={handleEncounterClick}
            title={`Click to view encounter details (Encounter #${encounterId})`}
          >
            Encounter
          </Badge>
        );
      case "attachment":
        // Document Extract badge with confidence score, tooltip, and click navigation
        const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
        const handleDocumentClick = () => {
          if (attachmentId) {
            setLocation(`/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`);
          }
        };
        
        const getConfidenceTooltip = (confidencePercent: number) => {
          if (confidencePercent >= 90) {
            return "High Confidence: Document contains specific medical data (exact values, medications, dosages) with clear diagnostic terminology.";
          } else if (confidencePercent >= 70) {
            return "Good Confidence: Document has moderate clinical specificity with some specific medical details.";
          } else if (confidencePercent >= 40) {
            return "Medium Confidence: Document contains general medical information but lacks specific clinical details.";
          } else if (confidencePercent >= 10) {
            return "Low Confidence: Document has vague or minimal medical information with limited clinical specificity.";
          } else {
            return "Very Low Confidence: Document contains minimal or very general medical information without specific clinical details.";
          }
        };
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    onClick={handleDocumentClick}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Doc Extract {confidencePercent}%
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm font-medium mb-1">Confidence: {confidencePercent}%</p>
                <p className="text-xs">{getConfidenceTooltip(confidencePercent)}</p>
                <p className="text-xs mt-2 opacity-75">Click to view source document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "manual":
        return <Badge variant="secondary" className="text-xs">Manual</Badge>;
      case "imported_record":
        return <Badge variant="outline" className="text-xs">Imported</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-4 text-gray-500 text-sm">Loading medical problems...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load medical problems</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderProblemCard = (problem: MedicalProblem) => {
    const rankStyles = getRankStyles(problem.rankScore);
    
    return (
      <Card 
        key={problem.id} 
        className={`relative border-l-4 ${rankStyles.borderColor} ${rankStyles.bgColor} hover:shadow-md transition-all duration-200`}
      >
        <Collapsible
          open={expandedProblems.has(problem.id)}
          onOpenChange={() => toggleProblemExpansion(problem.id)}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-opacity-80 pb-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedProblems.has(problem.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {problem.rankScore && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant="outline" className={`text-xs font-medium ${rankStyles.textColor} cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                                  {rankStyles.priority} (#{problem.rankScore.toFixed(1)})
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Clinical Priority Ranking: #{problem.rankScore.toFixed(1)}</p>
                                <div className="text-xs space-y-1">
                                  <p><strong>GPT-4 Intelligent Ranking System</strong></p>
                                  <p>Based on multiple clinical factors:</p>
                                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                                    <li>Clinical severity & immediacy</li>
                                    <li>Treatment complexity & follow-up needs</li>
                                    <li>Patient-specific frequency & impact</li>
                                    <li>Current clinical relevance</li>
                                  </ul>
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <p><strong>Scale:</strong> 1.00 (highest priority) → 99.99 (lowest priority)</p>
                                    <p className="opacity-75">Lower numbers = higher clinical priority</p>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge className={getStatusColor(problem.problemStatus)}>
                        {problem.problemStatus}
                      </Badge>
                    </div>
                    <CardTitle className={`text-base font-semibold ${rankStyles.textColor} leading-tight`}>
                      {problem.problemTitle}
                      {problem.currentIcd10Code && (
                        <span className="ml-2 text-sm font-mono text-gray-500 dark:text-gray-400">
                          {problem.currentIcd10Code}
                        </span>
                      )}
                    </CardTitle>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {problem.firstDiagnosedDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Since {formatDate(problem.firstDiagnosedDate)}
                        </span>
                      )}
                      {problem.visitHistory?.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {problem.visitHistory.length} visit{problem.visitHistory.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {!isReadOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {problem.problemStatus !== 'resolved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolve(problem.id)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                        title="Mark as resolved"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(problem)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Edit problem"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(problem.id)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      title="Delete problem"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {problem.visitHistory && problem.visitHistory.length > 0 ? (
                  <div className="space-y-3">
                    {problem.visitHistory
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((visit, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formatDate(visit.date)}</span>
                          {getSourceBadge(visit)}
                          {visit.providerName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">by {visit.providerName}</span>
                          )}
                          {visit.encounterId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Encounter #{visit.encounterId}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{visit.notes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No visit history recorded</p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const resolvedCount = resolvedProblems.length;
  const currentProblemsCount = activeProblems.length + chronicProblems.length;

  const renderCurrentProblems = () => (
    <div className="space-y-6">
      {/* Active Problems */}
      {filteredActiveProblems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
            <Activity className="h-4 w-4" />
            Active Problems ({filteredActiveProblems.length}{activeProblems.length !== filteredActiveProblems.length ? ` of ${activeProblems.length}` : ''})
          </div>
          <div className="space-y-3 group">
            {filteredActiveProblems.map(renderProblemCard)}
          </div>
        </div>
      )}

      {/* Chronic Problems */}
      {chronicProblems.length > 0 && (
        <div className="space-y-3">
          {activeProblems.length > 0 && <Separator className="my-6" />}
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <Clock className="h-4 w-4" />
            Chronic Conditions ({chronicProblems.length})
          </div>
          <div className="space-y-3 group">
            {chronicProblems.map(renderProblemCard)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {currentProblemsCount === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active medical problems recorded</p>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={handleAddNew} className="mt-3">
              <Plus className="h-4 w-4 mr-2" />
              Add Medical Problem
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderResolvedProblems = () => (
    <div className="space-y-3">
      {resolvedProblems.length > 0 ? (
        <div className="space-y-3 group">
          {resolvedProblems.map(renderProblemCard)}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No resolved medical problems</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div className="space-y-6">
        {!isReadOnly && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Medical Problems</h3>
            <Button onClick={handleAddNew} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Problem
            </Button>
          </div>
        )}

        {/* Priority Filter Slider */}
        {activeProblems.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Priority Filter
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DualHandleSlider
                min={1}
                max={100}
                largeHandleValue={largeHandleValue}
                smallHandleValue={smallHandleValue}
                onLargeHandleChange={handleLargeHandleChange}
                onSmallHandleChange={handleSmallHandleChange}
                label="Medical Problems Display"
                formatValue={(value) => `${value}% (${Math.max(1, Math.ceil((value / 100) * activeProblems.length))} of ${activeProblems.length} problems)`}
                className="mb-2"
              />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div className="flex justify-between">
                  <span>• Large handle: Permanent user preference</span>
                  <span className="font-mono">{largeHandleValue}%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Small handle: Session filter for this patient</span>
                  <span className="font-mono">{smallHandleValue}%</span>
                </div>
                <div className="pt-1 border-t border-blue-200 dark:border-blue-800">
                  <span>Showing {filteredActiveProblems.length} of {activeProblems.length} problems based on priority ranking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ranking Weight Controls */}
        {activeProblems.length > 0 && (
          <RankingWeightControls 
            patientId={patientId}
            onWeightsChange={(weights) => {
              // Trigger a refresh of medical problems with new weights
              queryClient.invalidateQueries({ queryKey: ['/api/medical-problems', patientId] });
            }}
          />
        )}

        {(currentProblemsCount > 0 || resolvedCount > 0) && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'current' | 'resolved')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current" className="relative">
                Current Problems
                {currentProblemsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {currentProblemsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="relative">
                Resolved
                {resolvedCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {resolvedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="mt-6">
              {renderCurrentProblems()}
            </TabsContent>
            
            <TabsContent value="resolved" className="mt-6">
              {renderResolvedProblems()}
            </TabsContent>
          </Tabs>
        )}

        <EnhancedMedicalProblemsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          patientId={patientId}
          problem={editingProblem || undefined}
          encounters={encounters}
        />
      </div>
      
      {/* Upload Loading Overlay */}
      <UploadLoadingOverlay
        isVisible={isUploadingForThisPatient}
        progress={uploadState.progress}
        fileName={uploadState.fileName}
        stage={uploadState.stage}
      />
    </div>
  );
}