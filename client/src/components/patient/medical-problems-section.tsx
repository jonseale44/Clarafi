import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertCircle, Calendar, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch medical problems
  const { data: medicalProblems = [], isLoading, error } = useQuery<Diagnosis[]>({
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: MedicalProblemFormData) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create medical problem');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
      toast({ title: "Success", description: "Medical problem added successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ problemId, data }: { problemId: number; data: Partial<MedicalProblemFormData> }) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems/${problemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update medical problem');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
      toast({ title: "Success", description: "Medical problem updated successfully" });
      setEditingProblem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (problemId: number) => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems/${problemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete medical problem');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems`] });
      toast({ title: "Success", description: "Medical problem deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: MedicalProblemFormData) => {
    if (editingProblem) {
      updateMutation.mutate({ problemId: editingProblem.id, data });
    } else {
      createMutation.mutate(data);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'chronic': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rule_out': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Medical Problems</h2>
        </div>
        <div className="text-center py-8 text-gray-500">Loading medical problems...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Medical Problems</h2>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load medical problems</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showAddButton = !isReadOnly;
  const contextLabel = mode === "encounter" ? "Encounter Medical Problems" : "Medical Problems";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{contextLabel}</h2>
        {showAddButton && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-slate-700 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
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
                          <Input placeholder="e.g., E11.9" {...field} value={field.value || ""} />
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
                  name="encounterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Encounter</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select encounter (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {encounters.map((encounter: any) => (
                            <SelectItem key={encounter.id} value={encounter.id.toString()}>
                              {encounter.encounterType} - {formatDate(encounter.startTime)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this medical problem..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
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
        )}
      </div>

      {medicalProblems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No medical problems recorded</p>
              <p className="text-sm">Add the first medical problem to start building the patient's problem list.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medicalProblems.map((problem: Diagnosis) => (
            <Card key={problem.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">{problem.diagnosis}</h3>
                      <Badge className={getStatusColor(problem.status)}>
                        {problem.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {problem.icd10Code && (
                        <Badge variant="outline" className="text-xs">
                          {problem.icd10Code}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      {problem.diagnosisDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Diagnosed: {formatDate(problem.diagnosisDate)}</span>
                        </div>
                      )}
                    </div>

                    {problem.notes && (
                      <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-md">
                        {problem.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(problem)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(problem.id)}
                      className="text-red-600 hover:text-red-700"
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