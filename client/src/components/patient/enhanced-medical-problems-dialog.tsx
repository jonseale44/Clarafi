import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Plus, Edit, Trash2, Save, X, Brain, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Visit note structure with DP as the authoritative date
interface VisitNote {
  id?: string;
  date: string;  // DP - Date Picker field (authoritative medical event date)
  notes: string;
  source: "encounter" | "attachment" | "manual" | "imported_record";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  confidence?: number;
  sourceConfidence?: number;
}

interface MedicalProblemData {
  id?: number;
  problemTitle: string;
  currentIcd10Code?: string;
  problemStatus: "active" | "resolved" | "chronic";
  firstDiagnosedDate?: string;
  visitHistory: VisitNote[];
}

// GPT-powered diagnosis suggestion interface
interface DiagnosisSuggestion {
  standardTitle: string;
  icd10Code: string;
  confidence: number;
  reasoning: string;
  severity?: "mild" | "moderate" | "severe";
  complexity?: "simple" | "complex" | "chronic";
  aliases: string[];
}

const medicalProblemSchema = z.object({
  problemTitle: z.string().min(1, "Diagnosis is required"),
  currentIcd10Code: z.string().optional(),
  problemStatus: z.enum(["active", "resolved", "chronic"]),
  firstDiagnosedDate: z.string().optional(),
});

const visitNoteSchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().min(1, "Notes are required"),
});

interface EnhancedMedicalProblemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  problem?: MedicalProblemData;
  encounters?: Array<{ id: number; encounterType: string; startTime: string }>;
}

export function EnhancedMedicalProblemsDialog({
  isOpen,
  onClose,
  patientId,
  problem,
  encounters = []
}: EnhancedMedicalProblemsDialogProps) {
  const [visitHistory, setVisitHistory] = useState<VisitNote[]>([]);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [newVisitNote, setNewVisitNote] = useState<{ date: string; notes: string }>({
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  
  // GPT-powered intelligent diagnosis state
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [standardizedDiagnosis, setStandardizedDiagnosis] = useState<DiagnosisSuggestion | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Main form for problem details
  const form = useForm({
    resolver: zodResolver(medicalProblemSchema),
    defaultValues: {
      problemTitle: "",
      currentIcd10Code: "",
      problemStatus: "active",
      firstDiagnosedDate: "",
    },
  });

  // Reset form and visit history when problem changes
  useEffect(() => {
    if (problem) {
      form.reset({
        problemTitle: problem.problemTitle || "",
        currentIcd10Code: problem.currentIcd10Code || "",
        problemStatus: problem.problemStatus || "active",
        firstDiagnosedDate: problem.firstDiagnosedDate || "",
      });
      setInputValue(problem.problemTitle || "");
      // Add unique IDs to visit history entries for editing
      const historyWithIds = (problem.visitHistory || []).map((visit, index) => ({
        ...visit,
        id: visit.id || `visit-${index}-${Date.now()}`
      }));
      setVisitHistory(historyWithIds);
    } else {
      form.reset({
        problemTitle: "",
        currentIcd10Code: "",
        problemStatus: "active",
        firstDiagnosedDate: "",
      });
      setInputValue("");
      setVisitHistory([]);
      setDiagnosisSuggestions([]);
      setStandardizedDiagnosis(null);
    }
  }, [problem, form]);

  // Intelligent diagnosis suggestion functions
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setDiagnosisSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `/api/intelligent-diagnosis/suggestions?input=${encodeURIComponent(input)}&patientId=${patientId}&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDiagnosisSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching diagnosis suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [patientId]);

  const handleDiagnosisInputChange = useCallback((value: string) => {
    setInputValue(value);
    form.setValue("problemTitle", value);
    
    // Debounce API calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }, [fetchSuggestions, form]);

  const selectSuggestion = useCallback((suggestion: DiagnosisSuggestion) => {
    setInputValue(suggestion.standardTitle);
    form.setValue("problemTitle", suggestion.standardTitle);
    form.setValue("currentIcd10Code", suggestion.icd10Code);
    setStandardizedDiagnosis(suggestion);
    setShowSuggestions(false);
    setDiagnosisSuggestions([]);
    
    toast({
      title: "Smart Diagnosis Applied",
      description: `Applied: ${suggestion.standardTitle} (${suggestion.icd10Code})`,
    });
  }, [form, toast]);

  const standardizeDiagnosis = useCallback(async () => {
    if (!inputValue || inputValue.length < 2) return;
    
    try {
      const response = await fetch('/api/intelligent-diagnosis/standardize', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputValue, patientId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.standardized) {
          const standardized = data.standardized;
          setInputValue(standardized.standardTitle);
          form.setValue("problemTitle", standardized.standardTitle);
          form.setValue("currentIcd10Code", standardized.icd10Code);
          setStandardizedDiagnosis(standardized);
          
          toast({
            title: "Diagnosis Standardized",
            description: `Improved to: ${standardized.standardTitle} (${standardized.icd10Code})`,
          });
        }
      }
    } catch (error) {
      console.error("Error standardizing diagnosis:", error);
    }
  }, [inputValue, patientId, form, toast]);

  // Visit note form
  const visitForm = useForm({
    resolver: zodResolver(visitNoteSchema),
    defaultValues: newVisitNote,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        visitHistory: visitHistory.map(visit => ({
          date: visit.date,
          notes: visit.notes,
          source: visit.source,
          encounterId: visit.encounterId,
          providerId: visit.providerId,
          providerName: visit.providerName,
        }))
      };

      const url = problem?.id 
        ? `/api/medical-problems/${problem.id}`
        : `/api/medical-problems/create`;
      
      const response = await fetch(url, {
        method: problem?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error("Failed to save medical problem");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-problems-enhanced`] });
      toast({ title: "Success", description: "Medical problem saved successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addVisitNote = () => {
    if (!newVisitNote.date || !newVisitNote.notes) {
      toast({ title: "Error", description: "Date and notes are required", variant: "destructive" });
      return;
    }

    const visitNote: VisitNote = {
      id: Date.now().toString(),
      date: newVisitNote.date,
      notes: newVisitNote.notes,
      source: "manual",
    };

    setVisitHistory(prev => [...prev, visitNote].sort((a, b) => {
      // Primary sort: Date descending (most recent first)
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Secondary sort: Encounter ID descending (higher encounter numbers first for same-date entries)
      const aEncounterId = a.encounterId || 0;
      const bEncounterId = b.encounterId || 0;
      return bEncounterId - aEncounterId;
    }));

    setNewVisitNote({
      date: new Date().toISOString().split('T')[0],
      notes: ""
    });
  };

  const editVisitNote = (visitId: string) => {
    setEditingVisitId(visitId);
  };

  const saveVisitEdit = (visitId: string, updatedVisit: Partial<VisitNote>) => {
    setVisitHistory(prev => prev.map(visit => 
      visit.id === visitId ? { ...visit, ...updatedVisit } : visit
    ).sort((a, b) => {
      // Primary sort: Date descending (most recent first)
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Secondary sort: Encounter ID descending (higher encounter numbers first for same-date entries)
      const aEncounterId = a.encounterId || 0;
      const bEncounterId = b.encounterId || 0;
      return bEncounterId - aEncounterId;
    }));
    setEditingVisitId(null);
  };

  const deleteVisitNote = (visitId: string) => {
    setVisitHistory(prev => prev.filter(visit => visit.id !== visitId));
  };

  const formatDate = (dateString: string) => {
    // Parse date as local date to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "encounter":
        return <Badge variant="default" className="text-xs">Encounter</Badge>;
      case "attachment":
        return <Badge variant="secondary" className="text-xs"><FileText className="h-3 w-3 mr-1" />Doc Extract</Badge>;
      case "manual":
        return <Badge variant="secondary" className="text-xs">Manual</Badge>;
      case "imported_record":
        return <Badge variant="outline" className="text-xs">Imported</Badge>;
      default:
        return null;
    }
  };

  const handleSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {problem ? "Edit Medical Problem" : "Add Medical Problem"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Intelligent Diagnosis Input */}
            <div className="space-y-4">
              <div className="relative">
                <FormField
                  control={form.control}
                  name="problemTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-500" />
                        Diagnosis * 
                        <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={inputValue}
                            onChange={(e) => handleDiagnosisInputChange(e.target.value)}
                            placeholder="Start typing diagnosis... (e.g., diabetes, hypertension)"
                            className="pr-10"
                          />
                          {isLoadingSuggestions && (
                            <div className="absolute right-3 top-2.5">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                          {inputValue && !isLoadingSuggestions && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={standardizeDiagnosis}
                              className="absolute right-1 top-0.5 h-8 w-8 p-0"
                              title="Standardize diagnosis"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Intelligent Suggestions Dropdown */}
                      {showSuggestions && diagnosisSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {diagnosisSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => selectSuggestion(suggestion)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{suggestion.standardTitle}</div>
                                  <div className="text-xs text-gray-500 mt-1">{suggestion.reasoning}</div>
                                  {suggestion.aliases.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {suggestion.aliases.slice(0, 3).map((alias, aliasIndex) => (
                                        <Badge key={aliasIndex} variant="outline" className="text-xs">
                                          {alias}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-3 text-right">
                                  <div className="text-sm font-mono text-blue-600">{suggestion.icd10Code}</div>
                                  <div className="text-xs text-gray-400">
                                    {Math.round(suggestion.confidence * 100)}% match
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                {/* Standardization Status */}
                {standardizedDiagnosis && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Standardized Diagnosis Applied</span>
                    </div>
                    <div className="mt-1 text-xs text-green-600">
                      {standardizedDiagnosis.reasoning}
                    </div>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="currentIcd10Code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICD-10 Code</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., E11.9" 
                        className={standardizedDiagnosis ? "bg-green-50 border-green-200" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="problemStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="chronic">Chronic</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstDiagnosedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Diagnosed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Visit History Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Visit History</h3>
                <p className="text-sm text-gray-500">Chronological notes for this problem</p>
              </div>

              {/* Add New Visit Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Visit Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <Input
                      type="date"
                      value={newVisitNote.date}
                      onChange={(e) => setNewVisitNote(prev => ({ ...prev, date: e.target.value }))}
                      placeholder="Date"
                    />
                    <div className="col-span-3">
                      <Textarea
                        value={newVisitNote.notes}
                        onChange={(e) => setNewVisitNote(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Clinical notes for this visit..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addVisitNote} size="sm">
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Visit Notes */}
              <div className="space-y-3">
                {visitHistory.map((visit) => (
                  <Card key={visit.id || `${visit.date}-${visit.notes.substring(0, 10)}`}>
                    <CardContent className="pt-4">
                      {editingVisitId === visit.id ? (
                        <EditableVisitNote
                          visit={visit}
                          onSave={(updatedVisit) => saveVisitEdit(visit.id!, updatedVisit)}
                          onCancel={() => setEditingVisitId(null)}
                        />
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{formatDate(visit.date)}</span>
                              {getSourceBadge(visit.source)}
                              {visit.providerName && (
                                <span className="text-sm text-gray-500">by {visit.providerName}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{visit.notes}</p>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editVisitNote(visit.id!)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteVisitNote(visit.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Problem"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Component for editing individual visit notes
function EditableVisitNote({ 
  visit, 
  onSave, 
  onCancel 
}: { 
  visit: VisitNote; 
  onSave: (updatedVisit: Partial<VisitNote>) => void; 
  onCancel: () => void; 
}) {
  const [editDate, setEditDate] = useState(visit.date);
  const [editNotes, setEditNotes] = useState(visit.notes);

  const handleSave = () => {
    onSave({ date: editDate, notes: editNotes });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
        />
        <div className="col-span-3">
          <Textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave}>
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}