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
import { 
  calculateMedicalProblemRanking, 
  assignPriorityLevels,
  getRankingStyles, 
  getPriorityDisplayName,
  shouldUseLegacyRank,
  migrateLegacyRanking,
  type RankingFactors,
  type RankingWeights,
  type RankingResult,
  RANKING_CONFIG
} from "@shared/ranking-calculation-service";

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
  rankScore?: number; // 1.00 (highest priority) to 99.99 (lowest priority) - LEGACY, use calculated rank
  lastRankedEncounterId?: number;
  rankingReason?: string; // GPT's reasoning for rank assignment
  // Enhanced ranking with factor breakdown for user weighting
  rankingFactors?: {
    clinical_severity: number;      // Relative percentage (0-100%) within patient context
    treatment_complexity: number;   // Relative percentage (0-100%) within patient context
    patient_frequency: number;      // Relative percentage (0-100%) within patient context
    clinical_relevance: number;     // Relative percentage (0-100%) within patient context
  };
}



interface EnhancedMedicalProblemsListProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
  // Animation props for optimistic UI updating
  isAutoGeneratingMedicalProblems?: boolean;
  medicalProblemsProgress?: number;
}

// Priority styling function based on rankingResult.priorityLevel (determined by relative position)
const getPriorityLevelStyles = (problem: { rankingResult: { priorityLevel: string } }) => {
  if (!problem.rankingResult?.priorityLevel) return { 
    bgColor: "bg-gray-50 dark:bg-gray-800", 
    borderColor: "border-gray-200 dark:border-gray-700", 
    textColor: "text-gray-600 dark:text-gray-400",
    priority: "Unranked"
  };
  
  // Priority styling now based on rankingResult.priorityLevel (determined by relative position)
  switch (problem.rankingResult.priorityLevel) {
    case 'high':
      return { 
        bgColor: "bg-orange-50 dark:bg-orange-900/20", 
        borderColor: "border-orange-300 dark:border-orange-800", 
        textColor: "text-orange-700 dark:text-orange-300", 
        priority: "High" 
      };
    case 'medium':
      return { 
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20", 
        borderColor: "border-yellow-300 dark:border-yellow-800", 
        textColor: "text-yellow-700 dark:text-yellow-300", 
        priority: "Medium" 
      };
    case 'low':
      return { 
        bgColor: "bg-green-50 dark:bg-green-900/20", 
        borderColor: "border-green-300 dark:border-green-800", 
        textColor: "text-green-700 dark:text-green-300", 
        priority: "Low" 
      };
    default:
      return { 
        bgColor: "bg-gray-50 dark:bg-gray-900/20", 
        borderColor: "border-gray-300 dark:border-gray-800", 
        textColor: "text-gray-700 dark:text-gray-300", 
        priority: "Unranked" 
      };
  }
};

export function EnhancedMedicalProblemsList({ 
  patientId, 
  encounterId, 
  mode = "patient-chart", 
  isReadOnly = false,
  isAutoGeneratingMedicalProblems = false,
  medicalProblemsProgress = 0
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

  // User preferences query including ranking weights
  const { data: userPreferences } = useQuery<{ 
    medicalProblemsDisplayThreshold?: number;
    rankingWeights?: RankingWeights;
  }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Default ranking weights if none set
  const currentRankingWeights: RankingWeights = userPreferences?.rankingWeights || {
    clinical_severity: 40,
    treatment_complexity: 30,
    patient_frequency: 20,
    clinical_relevance: 10
  };

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

  // CENTRALIZED ranking calculation using the shared service
  const calculateProblemRanking = (problem: MedicalProblem, weights: RankingWeights): RankingResult => {
    // Always use real-time calculation if ranking factors are available
    if (problem.rankingFactors) {
      return calculateMedicalProblemRanking(problem.rankingFactors, weights);
    }
    
    // Only fall back to legacy system if this is truly a legacy problem with old rankScore
    if (problem.rankScore && shouldUseLegacyRank(problem)) {
      return migrateLegacyRanking(problem.rankScore);
    }
    
    // Handle manually created problems with null rank - return unranked status
    if (problem.rankScore === null || problem.rankScore === undefined) {
      return {
        finalRank: null,
        priorityLevel: 'medium', // Default for display purposes
        calculationDetails: null
      };
    }
    
    // For other problems without AI ranking factors, use modern fallback system
    return calculateMedicalProblemRanking(null, weights);
  };

  // Generate clinical reasoning text for each factor
  const getFactorReasoning = (factorName: string, score: number, problemTitle: string) => {
    const title = problemTitle.toLowerCase();
    
    switch (factorName) {
      case "Clinical Severity":
        if (score >= 30) return "Life-threatening condition requiring immediate intervention";
        if (score >= 20) return "Serious condition with high complication risk";
        if (score >= 10) return "Moderate condition requiring active management";
        return "Stable condition with routine monitoring needs";
        
      case "Treatment Complexity":
        if (score >= 25) return "Multiple medications, specialist care, frequent monitoring";
        if (score >= 15) return "Moderate complexity with regular provider oversight";
        if (score >= 8) return "Standard treatment protocols with routine follow-up";
        return "Simple management with minimal interventions";
        
      case "Patient Frequency":
        if (score >= 15) return "Frequently discussed, rapidly changing, high patient concern";
        if (score >= 10) return "Regular mentions across multiple encounters";
        if (score >= 5) return "Occasional documentation with stable course";
        return "Infrequent mentions, stable baseline condition";
        
      case "Clinical Relevance":
        if (score >= 8) return "Primary focus of current care, active treatment adjustments";
        if (score >= 6) return "Important ongoing condition requiring monitoring";
        if (score >= 3) return "Relevant to current care but stable";
        return "Historical reference with minimal current impact";
        
      default:
        return "Clinical assessment factor";
    }
  };

  // Generate problem-specific ranking tooltip content with horizontal bar chart
  const getRankingTooltipContent = (problem: MedicalProblem & { rankingResult: RankingResult }, weights: RankingWeights) => {
    // Use the same ranking result that's displayed in the main list for consistency
    const rankingResult = problem.rankingResult;
    
    if (!problem.rankingFactors) {
      // Check if this is truly a legacy problem or a new manual problem
      const isLegacyProblem = shouldUseLegacyRank(problem);
      
      if (isLegacyProblem) {
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">Clinical Priority Ranking: #{rankingResult.finalRank?.toFixed(2) || 'N/A'}</p>
            <p className="text-xs opacity-75">Using legacy ranking system</p>
            <p className="text-xs opacity-75 mt-1">
              Lower scores = higher clinical priority (1.00 = most urgent, 99.99 = routine)
            </p>
          </div>
        );
      } else {
        // New manual problem - unranked
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">Status: Unranked</p>
            <p className="text-xs opacity-75">Manual entry - awaiting AI ranking</p>
            <p className="text-xs opacity-75 mt-1">
              Click "Refresh Rankings" to analyze and rank this problem using AI
            </p>
          </div>
        );
      }
    }

    const factors = problem.rankingFactors;
    const calculations = [
      {
        name: "Clinical Severity",
        score: factors.clinical_severity,
        maxScore: 100,
        weight: weights.clinical_severity,
        contribution: (factors.clinical_severity * weights.clinical_severity / 100), // New percentage system
        color: "bg-red-500"
      },
      {
        name: "Treatment Complexity", 
        score: factors.treatment_complexity,
        maxScore: 100,
        weight: weights.treatment_complexity,
        contribution: (factors.treatment_complexity * weights.treatment_complexity / 100), // New percentage system
        color: "bg-blue-500"
      },
      {
        name: "Patient Frequency",
        score: factors.patient_frequency,
        maxScore: 100,
        weight: weights.patient_frequency,
        contribution: (factors.patient_frequency * weights.patient_frequency / 100), // New percentage system
        color: "bg-green-500"
      },
      {
        name: "Clinical Relevance",
        score: factors.clinical_relevance,
        maxScore: 100,
        weight: weights.clinical_relevance,
        contribution: (factors.clinical_relevance * weights.clinical_relevance / 100), // New percentage system
        color: "bg-purple-500"
      }
    ];

    const totalFactorScore = calculations.reduce((sum, calc) => sum + calc.contribution, 0);
    // Direct score: higher weighted percentages = higher clinical priority
    const totalScore = totalFactorScore; // Higher score means higher clinical priority

    return (
      <div className="space-y-4 w-80">
        <div className="text-center">
          <p className="text-sm font-bold">Priority Score: {totalScore.toFixed(2)}</p>
          <p className="text-xs opacity-75">{problem.problemTitle}</p>
        </div>
        
        {/* Column headers */}
        <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">
          <span></span>
          <div className="flex items-center space-x-1">
            <span className="text-blue-600 dark:text-blue-400">GPT</span>
            <span>×</span>
            <span className="text-purple-600 dark:text-purple-400">User</span>
            <span>=</span>
            <span>Score</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {calculations.map((calc, index) => {
            const fillPercentage = (calc.score / calc.maxScore) * 100;
            const reasoning = getFactorReasoning(calc.name, calc.score, problem.problemTitle);
            
            return (
              <div key={index} className="space-y-1.5">
                {/* Factor name and contribution */}
                <div className="flex justify-between items-center text-xs font-medium">
                  <span>{calc.name}</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    <span className="text-blue-600 dark:text-blue-400">{calc.score}%</span> × <span className="text-purple-600 dark:text-purple-400">{calc.weight}%</span> = {calc.contribution.toFixed(1)}
                  </span>
                </div>
                
                {/* Progress bar showing weighted contribution percentage */}
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`${calc.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${(calc.contribution / totalScore) * 100}%` }}
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 text-xs font-mono text-gray-500">
                    {((calc.contribution / totalScore) * 100).toFixed(1)}%
                  </div>
                </div>
                
                {/* Clinical reasoning */}
                <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-tight">
                  {reasoning}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm font-bold">
            <span>Total Priority Score:</span>
            <span className="text-blue-600 dark:text-blue-400">{totalScore.toFixed(2)}</span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            Higher scores = higher clinical priority (relative to other conditions for this patient)
          </p>
        </div>
      </div>
    );
  };

  // Transform problems with real-time ranking calculations and convert to ranks
  const getProblemsWithRealTimeRanking = (problems: MedicalProblem[]): (MedicalProblem & { rankingResult: RankingResult; displayRank: number })[] => {
    const problemsWithScores = problems.map(problem => ({
      ...problem,
      rankingResult: calculateProblemRanking(problem, currentRankingWeights)
    }));
    
    // Sort by score descending (highest scores first) and assign ranks
    // Handle null/undefined ranks by placing them at the top (unranked problems)
    const sortedProblems = problemsWithScores.sort((a, b) => {
      // If both have null/undefined ranks, maintain original order
      if ((a.rankingResult.finalRank === null || a.rankingResult.finalRank === undefined) && 
          (b.rankingResult.finalRank === null || b.rankingResult.finalRank === undefined)) {
        return 0;
      }
      
      // Null ranks go to top (are "higher priority" than any numbered rank)
      if (a.rankingResult.finalRank === null || a.rankingResult.finalRank === undefined) {
        return -1;
      }
      if (b.rankingResult.finalRank === null || b.rankingResult.finalRank === undefined) {
        return 1;
      }
      
      // Normal ranking comparison: higher scores first
      return b.rankingResult.finalRank - a.rankingResult.finalRank;
    });
    
    const problemsWithRanks = sortedProblems.map((problem, index) => ({
      ...problem,
      displayRank: index + 1 // Rank 1 = highest score (most urgent)
    }));
    
    // Apply relative priority levels based on ranking position
    return assignPriorityLevels(problemsWithRanks);
  };

  // Calculate filtered problems based on small handle value (for already-enhanced and sorted problems)
  const getFilteredProblems = (problems: (MedicalProblem & { rankingResult: RankingResult; displayRank: number })[]) => {
    if (!problems.length) return problems;
    
    // Problems are already enhanced and sorted by score descending, just apply percentage filter
    const totalProblems = problems.length;
    const percentageToShow = smallHandleValue;
    const problemsToShow = Math.max(1, Math.ceil((percentageToShow / 100) * totalProblems));
    
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

  // Transform all problems with real-time ranking calculations first
  const enhancedProblems = getProblemsWithRealTimeRanking(medicalProblems);

  // Separate problems while preserving global sort order by score (already sorted in getProblemsWithRealTimeRanking)
  const activeProblems = enhancedProblems
    .filter(p => p.problemStatus === 'active'); // Keep existing order from global sort (highest scores first)

  // Apply filtering based on slider values to active problems only
  const filteredActiveProblems = getFilteredProblems(activeProblems);
  
  const chronicProblems = enhancedProblems
    .filter(p => p.problemStatus === 'chronic'); // Keep existing order from global sort (highest scores first)
  
  const resolvedProblems = enhancedProblems
    .filter(p => p.problemStatus === 'resolved'); // Keep existing order from global sort (highest scores first)

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

  const renderProblemCard = (problem: MedicalProblem & { rankingResult: RankingResult; displayRank: number }) => {
    const badgeClass = getRankingStyles(problem.rankingResult.priorityLevel);
    
    return (
      <Card 
        key={problem.id} 
        className={`relative medical-problem-card border-l-gray-200 dark:border-l-gray-700 hover:shadow-md transition-all duration-200`}
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
                      {problem.rankingResult && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant="outline" className={`text-xs font-medium ${badgeClass} cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                                  {problem.rankingResult.finalRank === null || problem.rankingResult.finalRank === undefined 
                                    ? "Unranked" 
                                    : `${getPriorityDisplayName(problem.rankingResult.priorityLevel)} (#${problem.displayRank})`
                                  }
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-none p-4">
                              {getRankingTooltipContent(problem, currentRankingWeights)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge className={getStatusColor(problem.problemStatus)}>
                        {problem.problemStatus}
                      </Badge>
                    </div>
                    <CardTitle className={`text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight`}>
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
                      .sort((a, b) => {
                        // Primary sort: Date descending (most recent first)
                        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
                        if (dateComparison !== 0) return dateComparison;
                        
                        // Secondary sort: Encounter ID descending (higher encounter numbers first for same-date entries)
                        const aEncounterId = a.encounterId || 0;
                        const bEncounterId = b.encounterId || 0;
                        return bEncounterId - aEncounterId;
                      })
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
            <div className="flex gap-2">
              {/* Auto-generation progress indicator */}
              {isAutoGeneratingMedicalProblems && (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={true}
                  className="relative overflow-hidden bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed"
                  title={`Processing medical problems... ${Math.round(medicalProblemsProgress)}% complete`}
                >
                  {/* Progress bar background */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-green-200 to-green-300 transition-all duration-100 ease-linear"
                    style={{ 
                      width: `${medicalProblemsProgress}%`,
                      opacity: 0.3
                    }}
                  />
                  
                  <Activity className="h-4 w-4 mr-2 relative z-10 animate-pulse" />
                  
                  <span className="relative z-10">
                    Processing... {Math.round(medicalProblemsProgress)}%
                  </span>
                </Button>
              )}
              <Button onClick={handleAddNew} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Problem
              </Button>
            </div>
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
              // Real-time recalculation happens automatically via the currentRankingWeights dependency
              // No API call needed - just update user preferences cache
              console.log('🔄 [MedicalProblems] Weight preferences updated:', weights);
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