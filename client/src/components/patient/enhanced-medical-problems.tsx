import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Clock, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VisitHistoryEntry {
  encounter_id: number;
  date: string;
  notes: string;
  icd10_at_visit: string;
  provider: string;
  changes_made: string[];
  confidence: number;
  is_signed: boolean;
  signed_by?: number;
  signed_at?: string;
}

interface MedicalProblem {
  id: number;
  problemTitle: string;
  currentIcd10Code: string;
  problemStatus: string;
  firstDiagnosedDate: string;
  visitHistory: VisitHistoryEntry[];
  changeLog: any[];
  lastUpdated: string;
}

interface EnhancedMedicalProblemsProps {
  patientId: number;
  encounterId?: number;
}

export function EnhancedMedicalProblems({ patientId, encounterId }: EnhancedMedicalProblemsProps) {
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: problems = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/medical-problems-enhanced`],
    enabled: !!patientId,
  });

  const toggleProblem = (problemId: number) => {
    const newExpanded = new Set(expandedProblems);
    if (newExpanded.has(problemId)) {
      newExpanded.delete(problemId);
    } else {
      newExpanded.add(problemId);
    }
    setExpandedProblems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'chronic': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Medical Problems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Medical Problems
            <Badge variant="secondary">{problems.length}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Open add problem dialog
              toast({
                title: "Add Problem",
                description: "This will open a dialog to add a new medical problem",
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Problem
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Problems</h3>
            <p>Patient's medical problems will appear here as they are documented during encounters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem: MedicalProblem) => (
              <div key={problem.id} className="border rounded-lg">
                <Collapsible 
                  open={expandedProblems.has(problem.id)}
                  onOpenChange={() => toggleProblem(problem.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {problem.problemTitle}
                          </h3>
                          <Badge className={getStatusColor(problem.problemStatus)}>
                            {problem.problemStatus}
                          </Badge>
                          {problem.currentIcd10Code && (
                            <Badge variant="outline">
                              {problem.currentIcd10Code}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          First diagnosed: {formatDate(problem.firstDiagnosedDate)}
                          {problem.visitHistory.length > 0 && (
                            <span className="ml-4">
                              Last visit: {formatDate(problem.visitHistory[0]?.date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {problem.visitHistory.length} visits
                        </Badge>
                        {expandedProblems.has(problem.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Visit History</h4>
                        
                        {problem.visitHistory.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No visit history recorded</p>
                        ) : (
                          <div className="space-y-3">
                            {problem.visitHistory
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((visit, index) => (
                                <div key={index} className="bg-white p-3 rounded border">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">
                                        -{formatDate(visit.date)}:
                                      </span>
                                      {visit.icd10_at_visit && (
                                        <Badge variant="outline" className="text-xs">
                                          {visit.icd10_at_visit}
                                        </Badge>
                                      )}
                                      {visit.is_signed ? (
                                        <Badge className="text-xs bg-green-100 text-green-800">
                                          Signed
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          Draft
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <User className="h-3 w-3" />
                                      {visit.provider}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-gray-700 leading-relaxed">
                                    {visit.notes}
                                  </div>
                                  
                                  {visit.changes_made && visit.changes_made.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {visit.changes_made.map((change, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {change.replace('_', ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {visit.confidence < 0.8 && (
                                    <div className="mt-2 text-xs text-amber-600">
                                      ⚠️ Low confidence ({Math.round(visit.confidence * 100)}%)
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}