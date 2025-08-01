import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, FileText, AlertCircle, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertDiagnosisSchema, type Diagnosis, type InsertDiagnosis } from "@shared/schema";
import { z } from "zod";

interface MedicalProblemsSectionProps {
  patientId: number;
  encounterId?: number;
  mode?: "patient-chart" | "encounter";
  isReadOnly?: boolean;
}

const medicalProblemFormSchema = insertDiagnosisSchema.extend({
  diagnosisDate: z.string().optional(),
});

type MedicalProblemFormData = z.infer<typeof medicalProblemFormSchema>;

export function MedicalProblemsSection({ 
  patientId, 
  encounterId, 
  mode = "patient-chart", 
  isReadOnly = false 
}: MedicalProblemsSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Diagnosis | null>(null);
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch medical problems
  const { data: medicalProblems = [], isLoading, error } = useQuery<any[]>({
    queryKey: [`/api/patients/${patientId}/medical-problems`],
    enabled: !!patientId,
  });

  // Fetch encounters for dropdown
  const { data: encounters = [] } = useQuery<any[]>({
    queryKey: [`/api/patients/${patientId}/encounters`],
    enabled: !!patientId,
  });

  // Form setup
  const form = useForm<MedicalProblemFormData>({
    resolver: zodResolver(medicalProblemFormSchema),
    defaultValues: {
      patientId,
      diagnosis: "",
      icd10Code: "",
      diagnosisDate: new Date().toISOString().split('T')[0],
      status: "active",
      notes: "",
      encounterId: undefined,
    },
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: async (data: MedicalProblemFormData) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create medical problem");
      return response.json();
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/patients/${patientId}/medical-problems`],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        `/api/patients/${patientId}/medical-problems`,
      ]);

      // Optimistically update to the new value
      const optimisticProblem = {
        id: Date.now(), // Temporary ID
        patientId,
        diagnosis: newData.diagnosis,
        icd10Code: newData.icd10Code,
        diagnosisDate: newData.diagnosisDate,
        status: newData.status,
        notes: newData.notes,
        encounterId: newData.encounterId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        [`/api/patients/${patientId}/medical-problems`],
        (old: any[]) => (old ? [...old, optimisticProblem] : [optimisticProblem]),
      );

      return { previousData };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Medical problem added successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error, newData, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [`/api/patients/${patientId}/medical-problems`],
          context.previousData,
        );
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ problemId, data }: { problemId: number; data: MedicalProblemFormData }) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems/${problemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update medical problem");
      return response.json();
    },
    onMutate: async ({ problemId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/patients/${patientId}/medical-problems`],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        `/api/patients/${patientId}/medical-problems`,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/patients/${patientId}/medical-problems`],
        (old: any[]) => {
          if (!old) return old;
          return old.map((problem) =>
            problem.id === problemId
              ? {
                  ...problem,
                  diagnosis: data.diagnosis,
                  icd10Code: data.icd10Code,
                  diagnosisDate: data.diagnosisDate,
                  status: data.status,
                  notes: data.notes,
                  encounterId: data.encounterId,
                  updatedAt: new Date().toISOString(),
                }
              : problem
          );
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Medical problem updated successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [`/api/patients/${patientId}/medical-problems`],
          context.previousData,
        );
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems/${problemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete medical problem");
      return response.json();
    },
    onMutate: async (problemId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/patients/${patientId}/medical-problems`],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        `/api/patients/${patientId}/medical-problems`,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/patients/${patientId}/medical-problems`],
        (old: any[]) => {
          if (!old) return old;
          return old.filter((problem) => problem.id !== problemId);
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Medical problem deleted successfully" });
    },
    onError: (error: Error, problemId, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [`/api/patients/${patientId}/medical-problems`],
          context.previousData,
        );
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
    },
  });

  const handleSubmit = (data: MedicalProblemFormData) => {
    console.log('🔍 [MedicalProblems] Form submission started');
    console.log('🔍 [MedicalProblems] Form data:', JSON.stringify(data, null, 2));
    console.log('🔍 [MedicalProblems] Editing problem:', editingProblem);
    console.log('🔍 [MedicalProblems] Form validation errors:', form.formState.errors);
    
    try {
      if (editingProblem) {
        console.log('🔍 [MedicalProblems] Updating existing problem ID:', editingProblem.id);
        updateMutation.mutate({ problemId: editingProblem.id, data });
      } else {
        console.log('🔍 [MedicalProblems] Creating new problem');
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('❌ [MedicalProblems] Form submission error:', error);
    }
  };

  const handleEdit = (problem: Diagnosis) => {
    setEditingProblem(problem);
    form.reset({
      patientId,
      diagnosis: problem.diagnosis,
      icd10Code: problem.icd10Code || "",
      diagnosisDate: problem.diagnosisDate || "",
      status: problem.status,
      notes: problem.notes || "",
      encounterId: problem.encounterId,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (problemId: number) => {
    if (confirm("Are you sure you want to delete this medical problem?")) {
      deleteMutation.mutate(problemId);
    }
  };

  const handleDeleteAll = () => {
    if (confirm(`Are you sure you want to delete all ${medicalProblems.length} medical problems? This action cannot be undone.`)) {
      medicalProblems.forEach(problem => deleteMutation.mutate(problem.id));
    }
  };

  const resetForm = () => {
    setEditingProblem(null);
    form.reset({
      patientId,
      diagnosis: "",
      icd10Code: "",
      diagnosisDate: new Date().toISOString().split('T')[0],
      status: "active",
      notes: "",
      encounterId: undefined,
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'chronic': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rule_out': return 'bg-navy-blue-100 text-navy-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    // Parse date as local date to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const showAddButton = !isReadOnly;

  return (
    <div className="space-y-3">
      {mode !== "encounter" && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Medical Problems</h2>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {showAddButton && (
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Problem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProblem ? 'Edit Medical Problem' : 'Add New Medical Problem'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diagnosis *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Type 2 Diabetes Mellitus" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="icd10Code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ICD-10 Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., E11.9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="chronic">Chronic</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="rule_out">Rule Out</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="diagnosisDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diagnosis Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinical Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional clinical notes or context..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {encounters.length > 0 && (
                      <FormField
                        control={form.control}
                        name="encounterId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Associated Encounter (Optional)</FormLabel>
                            <Select onValueChange={(value) => {
                              console.log('🔍 [MedicalProblems] Select value changed:', value);
                              field.onChange(value === "none" ? undefined : parseInt(value));
                            }} value={field.value?.toString() || "none"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select encounter" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No encounter</SelectItem>
                                {encounters.map((encounter: any) => {
                                  console.log('🔍 [MedicalProblems] Rendering encounter:', encounter.id, encounter.encounterType);
                                  return (
                                    <SelectItem key={encounter.id} value={encounter.id.toString()}>
                                      {encounter.encounterType} - {formatDate(encounter.startTime)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-slate-700 hover:bg-slate-800"
                      >
                        {editingProblem ? 'Update Problem' : 'Add Problem'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            {medicalProblems.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAll}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete All
              </Button>
            )}
          </div>
        )}
      </div>

      {medicalProblems.length === 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="text-center py-4 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">No medical problems recorded</p>
              <p className="text-xs">Add the first medical problem to start building the patient's problem list.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {medicalProblems.map((problem: any) => (
            <Card key={problem.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-sm">{problem.diagnosis}</h3>
                      {problem.icd10Code && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {problem.icd10Code}
                        </Badge>
                      )}
                      <Badge className={`text-xs px-1 py-0 ${getStatusColor(problem.status)}`}>
                        {problem.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    {/* Visit History Collapsible */}
                    <Collapsible 
                      open={expandedProblems.has(problem.id)}
                      onOpenChange={() => toggleProblemExpansion(problem.id)}
                    >
                      <CollapsibleTrigger className="flex items-center text-xs text-gray-500 hover:text-gray-700 mt-1">
                        {expandedProblems.has(problem.id) ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        <Calendar className="h-3 w-3 mr-1" />
                        Visit History
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-gray-50 rounded p-2 text-xs">
                          {problem.visitHistory && problem.visitHistory.length > 0 ? (
                            <div className="space-y-2">
                              {problem.visitHistory.map((visit: any, index: number) => (
                                <div key={index} className="border-l-2 border-navy-blue-200 pl-2">
                                  <div className="text-gray-700 font-medium text-xs">
                                    {new Date(visit.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-gray-600 text-xs mt-1">
                                    {visit.notes}
                                  </div>
                                  <div className="text-gray-500 text-xs mt-1">
                                    Provider: {visit.provider} | Encounter #{visit.encounter_id}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-600 text-center py-2">
                              No visit history available yet
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(problem)}
                      className="text-navy-blue-600 hover:text-navy-blue-700 h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(problem.id)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}