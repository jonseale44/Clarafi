import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, Calendar, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
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
}

interface EnhancedMedicalProblemsListProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
}

export function EnhancedMedicalProblemsList({ 
  patientId, 
  encounterId, 
  mode = "patient-chart", 
  isReadOnly = false 
}: EnhancedMedicalProblemsListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<MedicalProblem | null>(null);
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'chronic': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-3">
      {mode !== "encounter" && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Medical Problems</h2>
          {!isReadOnly && (
            <Button onClick={handleAddNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Problem
            </Button>
          )}
        </div>
      )}

      {medicalProblems.length === 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="text-center py-4 text-gray-500 text-sm">
              No medical problems recorded
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medicalProblems.map((problem) => (
            <Card key={problem.id} className="relative">
              <Collapsible
                open={expandedProblems.has(problem.id)}
                onOpenChange={() => toggleProblemExpansion(problem.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedProblems.has(problem.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <CardTitle className="text-base font-medium">
                            {problem.problemTitle}
                            {problem.currentIcd10Code && (
                              <span className="ml-2 text-sm font-normal text-gray-500">
                                ({problem.currentIcd10Code})
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(problem.problemStatus)}>
                              {problem.problemStatus.toUpperCase()}
                            </Badge>
                            {problem.firstDiagnosedDate && (
                              <span className="text-xs text-gray-500">
                                First diagnosed: {formatDate(problem.firstDiagnosedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!isReadOnly && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(problem)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(problem.id)}
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
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Visit History
                      </h4>
                      
                      {problem.visitHistory && problem.visitHistory.length > 0 ? (
                        <div className="space-y-3">
                          {problem.visitHistory
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((visit, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-sm">{formatDate(visit.date)}</span>
                                {getSourceBadge(visit.source)}
                                {visit.providerName && (
                                  <span className="text-xs text-gray-500">by {visit.providerName}</span>
                                )}
                                {visit.encounterId && (
                                  <span className="text-xs text-gray-500">Encounter #{visit.encounterId}</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{visit.notes}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No visit history recorded</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
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
}