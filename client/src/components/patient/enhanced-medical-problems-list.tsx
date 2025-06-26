import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Calendar, ChevronDown, ChevronRight, AlertCircle, Eye, EyeOff, Filter, Activity, Clock, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { EnhancedMedicalProblemsDialog } from "./enhanced-medical-problems-dialog";

interface VisitNote {
  date: string;
  notes: string;
  source: "encounter" | "manual" | "imported_record";
  encounterId?: number;
  providerId?: number;
  providerName?: string;
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
  if (!rankScore) return { bgColor: "bg-gray-50", borderColor: "border-gray-200", textColor: "text-gray-600" };
  
  // 1.00 = Highest Priority (Red), 99.99 = Lowest Priority (Blue)
  if (rankScore <= 10) {
    return { bgColor: "bg-red-50", borderColor: "border-red-300", textColor: "text-red-700", priority: "Critical" };
  } else if (rankScore <= 20) {
    return { bgColor: "bg-orange-50", borderColor: "border-orange-300", textColor: "text-orange-700", priority: "High" };
  } else if (rankScore <= 40) {
    return { bgColor: "bg-yellow-50", borderColor: "border-yellow-300", textColor: "text-yellow-700", priority: "Medium" };
  } else if (rankScore <= 60) {
    return { bgColor: "bg-green-50", borderColor: "border-green-300", textColor: "text-green-700", priority: "Low" };
  } else {
    return { bgColor: "bg-blue-50", borderColor: "border-blue-300", textColor: "text-blue-700", priority: "Routine" };
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

  // Fetch enhanced medical problems
  const { data: medicalProblems = [], isLoading, error } = useQuery<MedicalProblem[]>({
    queryKey: [`/api/patients/${patientId}/medical-problems-enhanced`],
    enabled: !!patientId,
  });

  // Fetch encounters for dropdown
  const { data: encounters = [] } = useQuery<any[]>({
    queryKey: [`/api/patients/${patientId}/encounters`],
    enabled: !!patientId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/medical-problems/${problemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete medical problem");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems-enhanced`] });
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
    if (confirm("Are you sure you want to delete this medical problem?")) {
      deleteMutation.mutate(problemId);
    }
  };

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/medical-problems/${problemId}/resolve`, {
        method: "PUT",
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to resolve medical problem");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems-enhanced`] });
      toast({ title: "Success", description: "Medical problem resolved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleResolve = (problemId: number) => {
    if (confirm("Are you sure you want to mark this medical problem as resolved?")) {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
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
      default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
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

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "encounter":
        return <Badge variant="default" className="text-xs">Encounter</Badge>;
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
      <Card key={problem.id} className={`relative border-l-4 ${rankStyles.borderColor} ${rankStyles.bgColor} hover:shadow-md transition-all duration-200`}>
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
                        <Badge variant="outline" className={`text-xs font-medium ${rankStyles.textColor}`}>
                          {rankStyles.priority} (#{problem.rankScore.toFixed(1)})
                        </Badge>
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
                    
                    {/* Ranking reason display */}
                    {problem.rankingReason && (
                      <div className="text-xs text-gray-600 mt-1 italic">
                        {problem.rankingReason}
                      </div>
                    )}
                    
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
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                Visit History
              </h4>
              
              {problem.visitHistory && problem.visitHistory.length > 0 ? (
                <div className="space-y-3">
                  {problem.visitHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((visit, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formatDate(visit.date)}</span>
                        {getSourceBadge(visit.source)}
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

  const resolvedCount = resolvedProblems.length;
  const currentProblemsCount = activeProblems.length + chronicProblems.length;

  const renderCurrentProblems = () => (
    <div className="space-y-6">
      {/* Active Problems */}
      {activeProblems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
            <Activity className="h-4 w-4" />
            Active Problems ({activeProblems.length})
          </div>
          <div className="space-y-3 group">
            {activeProblems.map(renderProblemCard)}
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

      {/* No current problems */}
      {currentProblemsCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active medical problems</p>
            </div>
          </CardContent>
        </Card>
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
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No resolved problems</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {mode !== "encounter" && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Medical Problems</h2>
          {!isReadOnly && (
            <Button onClick={handleAddNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Problem
            </Button>
          )}
        </div>
      )}

      {medicalProblems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No medical problems recorded</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'current' | 'resolved')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Current ({currentProblemsCount})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resolved ({resolvedCount})
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
  );
};