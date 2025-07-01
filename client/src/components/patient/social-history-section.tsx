import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNavigationContext } from "@/hooks/use-navigation-context";

// Social history categories based on the unified parser
const SOCIAL_HISTORY_CATEGORIES = [
  "tobacco",
  "alcohol", 
  "occupation",
  "exercise",
  "diet",
  "sexual_history",
  "living_situation",
  "recreational_drugs"
];

interface SocialHistoryEntry {
  id: number;
  patientId: number;
  category: string;
  currentStatus: string;
  historyNotes?: string;
  sourceType: "encounter" | "attachment" | "manual" | "imported_record";
  sourceConfidence?: number;
  extractedFromAttachmentId?: number;
  extractedFromEncounterId?: number;
  extractionNotes?: string;
  consolidationReasoning?: string;
  visitHistory?: VisitHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface VisitHistoryEntry {
  id?: string;
  date: string;
  notes: string;
  source: "encounter" | "attachment" | "manual" | "imported_record";
  encounterId?: number;
  attachmentId?: number;
  providerId?: number;
  providerName?: string;
  changesMade?: string[];
  confidence?: number;
  isSigned?: boolean;
  signedAt?: string;
  sourceConfidence?: number;
  sourceNotes?: string;
}

interface SocialHistorySectionProps {
  patientId: number;
  mode?: "chart" | "encounter";
  className?: string;
}

const SocialHistorySection: React.FC<SocialHistorySectionProps> = ({ 
  patientId, 
  className = "", 
  mode = "chart" 
}) => {
  const [editingEntry, setEditingEntry] = useState<SocialHistoryEntry | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [editingVisitHistory, setEditingVisitHistory] = useState<VisitHistoryEntry[]>([]);
  const [newVisitNote, setNewVisitNote] = useState({ date: "", notes: "" });
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { navigateWithContext } = useNavigationContext();

  // Form state for add/edit
  const [formData, setFormData] = useState({
    category: "",
    currentStatus: "",
    historyNotes: "",
    sourceNotes: ""
  });

  // Get social history data
  const { data: socialHistory = [], isLoading, error } = useQuery<SocialHistoryEntry[]>({
    queryKey: ["/api/social-history", patientId],
    enabled: !!patientId,
  });

  // Enhanced logging for social history component
  console.log(`🚬 [SocialHistorySection] Component rendered for patient ${patientId}`);
  console.log(`🚬 [SocialHistorySection] Query state:`, {
    isLoading,
    hasError: !!error,
    dataLength: socialHistory?.length || 0,
    enabled: !!patientId,
    queryKey: ["/api/social-history", patientId]
  });

  if (error) {
    console.error(`🚬 [SocialHistorySection] Query error:`, error);
  }

  if (socialHistory && socialHistory.length > 0) {
    console.log(`🚬 [SocialHistorySection] Social history data:`, socialHistory.map(sh => ({
      id: sh.id,
      category: sh.category,
      currentStatus: sh.currentStatus,
      sourceType: sh.sourceType,
      visitHistoryLength: sh.visitHistory?.length || 0
    })));
  }

  // Create social history mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/social-history/${patientId}`, "POST", data),
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/social-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/social-history", patientId]);
      
      // Optimistically update to the new value
      const optimisticEntry = {
        id: Date.now(), // Temporary ID
        patientId,
        category: newData.category,
        currentStatus: newData.currentStatus,
        historyNotes: newData.historyNotes,
        extractionNotes: newData.sourceNotes,
        sourceType: "manual_entry",
        sourceConfidence: "100",
        visitHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(["/api/social-history", patientId], (old: any[]) => 
        old ? [...old, optimisticEntry] : [optimisticEntry]
      );
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Social history added",
        description: "Social history entry has been successfully created.",
      });
    },
    onError: (error: any, newData, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/social-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
    },
  });

  // Update social history mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/social-history/${id}`, "PUT", { ...data, patientId }),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/social-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/social-history", patientId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/social-history", patientId], (old: any[]) => {
        if (!old) return old;
        return old.map(entry => 
          entry.id === id 
            ? { 
                ...entry, 
                category: data.category,
                currentStatus: data.currentStatus,
                historyNotes: data.historyNotes,
                extractionNotes: data.sourceNotes,
                updatedAt: new Date().toISOString(),
              }
            : entry
        );
      });
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
      setEditingEntry(null);
      resetForm();
      toast({
        title: "Social history updated",
        description: "Social history entry has been successfully updated.",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/social-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
    },
  });

  // Delete social history mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/social-history/${id}`, "DELETE"),
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/social-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/social-history", patientId]);
      
      // Optimistically remove the entry
      queryClient.setQueryData(["/api/social-history", patientId], (old: any[]) => {
        if (!old) return old;
        return old.filter(entry => entry.id !== id);
      });
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
      toast({
        title: "Social history deleted",
        description: "Social history entry has been successfully deleted.",
      });
    },
    onError: (error: any, id, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/social-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/social-history", patientId] });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "",
      currentStatus: "",
      historyNotes: "",
      sourceNotes: ""
    });
  };

  const handleEdit = (entry: SocialHistoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      currentStatus: entry.currentStatus,
      historyNotes: entry.historyNotes || "",
      sourceNotes: entry.extractionNotes || ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category.trim() || !formData.currentStatus.trim()) {
      toast({
        title: "Error",
        description: "Category and current status are required",
        variant: "destructive",
      });
      return;
    }

    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Source badge with navigation - matches family history pattern exactly
  const getSourceBadge = (source: string, confidence?: number, attachmentId?: number, encounterId?: number) => {
    switch (source) {
      case "encounter":
        // Clickable encounter badge that navigates to encounter detail
        const handleEncounterClick = () => {
          if (encounterId) {
            navigateWithContext(`/patients/${patientId}/encounters/${encounterId}`, "social-history", mode);
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
          console.log("🔗 [SocialHistory] Document badge clicked!");
          console.log("🔗 [SocialHistory] attachmentId:", attachmentId);
          console.log("🔗 [SocialHistory] patientId:", patientId);
          console.log("🔗 [SocialHistory] mode:", mode);
          
          if (attachmentId) {
            const targetUrl = `/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`;
            console.log("🔗 [SocialHistory] Navigating to:", targetUrl);
            console.log("🔗 [SocialHistory] Source section: social-history");
            console.log("🔗 [SocialHistory] Source context:", mode);
            
            navigateWithContext(targetUrl, "social-history", mode);
            console.log("🔗 [SocialHistory] Navigation called successfully");
          } else {
            console.log("❌ [SocialHistory] No attachmentId provided - cannot navigate");
          }
        };
        
        const getConfidenceTooltip = (confidencePercent: number) => {
          if (confidencePercent >= 90) {
            return "High Confidence: Document contains specific social history data with clear lifestyle patterns and behaviors.";
          } else if (confidencePercent >= 70) {
            return "Good Confidence: Document has moderate social history specificity with some behavioral details.";
          } else if (confidencePercent >= 40) {
            return "Medium Confidence: Document contains general social history information but lacks specific details.";
          } else if (confidencePercent >= 10) {
            return "Low Confidence: Document has vague or minimal social history information with limited specificity.";
          } else {
            return "Very Low Confidence: Document contains minimal or very general social history information without specific details.";
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

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "tobacco": return "🚭";
      case "alcohol": return "🍷";
      case "occupation": return "💼";
      case "exercise": return "🏃";
      case "diet": return "🥗";
      case "sexual_history": return "❤️";
      case "living_situation": return "🏠";
      case "recreational_drugs": return "💊";
      default: return "📋";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Toggle function for expanding/collapsing entries
  const toggleEntryExpansion = (entryId: number) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Visit History Management Functions (like surgical history)
  const addVisitNote = () => {
    if (!newVisitNote.date || !newVisitNote.notes) {
      toast({ title: "Error", description: "Date and notes are required", variant: "destructive" });
      return;
    }

    const visitNote = {
      id: Date.now().toString(),
      date: newVisitNote.date,
      notes: newVisitNote.notes,
      source: "manual" as const,
    };

    setEditingVisitHistory(prev => [...prev, visitNote].sort((a, b) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      const aEncounterId = a.encounterId || 0;
      const bEncounterId = b.encounterId || 0;
      return bEncounterId - aEncounterId;
    }));

    setNewVisitNote({ date: "", notes: "" });
  };

  const editVisitNote = (visitId: string) => {
    setEditingVisitId(visitId);
  };

  const saveVisitEdit = (visitId: string, updatedVisit: any) => {
    setEditingVisitHistory(prev => 
      prev.map(visit => 
        visit.id === visitId ? { ...visit, ...updatedVisit } : visit
      )
    );
    setEditingVisitId(null);
  };

  const deleteVisitNote = (visitId: string) => {
    setEditingVisitHistory(prev => prev.filter(visit => visit.id !== visitId));
  };

  // Helper component for editing visit notes
  const EditableVisitNote = ({ visit, onSave, onCancel }: {
    visit: any;
    onSave: (updatedVisit: any) => void;
    onCancel: () => void;
  }) => {
    const [editDate, setEditDate] = useState(visit.date);
    const [editNotes, setEditNotes] = useState(visit.notes);

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
          <Button size="sm" onClick={() => onSave({ date: editDate, notes: editNotes })}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`emr-tight-spacing ${className}`}>
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`emr-tight-spacing ${className}`}>
      <Card>
        <CardHeader className="emr-card-header-tight">
          <div className="flex items-center justify-between">
            <CardTitle className="emr-section-title flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Social History
              {socialHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {socialHistory.length}
                </Badge>
              )}
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="emr-ultra-compact-header">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Social History</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_HISTORY_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {getCategoryIcon(category)} {formatCategory(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currentStatus">Current Status</Label>
                    <Textarea
                      id="currentStatus"
                      value={formData.currentStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentStatus: e.target.value }))}
                      placeholder="e.g., Quit smoking 5 years ago, occasional social drinker"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="historyNotes">History Notes (Optional)</Label>
                    <Textarea
                      id="historyNotes"
                      value={formData.historyNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, historyNotes: e.target.value }))}
                      placeholder="Additional historical context or changes over time"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sourceNotes">Source Notes (Optional)</Label>
                    <Input
                      id="sourceNotes"
                      value={formData.sourceNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, sourceNotes: e.target.value }))}
                      placeholder="Additional context about this information"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
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
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Adding..." : "Add Social History"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="emr-card-content-tight">
          {socialHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No social history documented</p>
              <p className="text-sm">Add social history using the button above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {socialHistory.map((entry: SocialHistoryEntry) => (
                <Card 
                  key={entry.id} 
                  className="relative social-card border-l-gray-200 dark:border-l-gray-700 hover:shadow-md transition-all duration-200 group"
                >
                  <Collapsible
                    open={expandedEntries.has(entry.id)}
                    onOpenChange={() => toggleEntryExpansion(entry.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-opacity-80 social-header transition-colors emr-compact-header">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {expandedEntries.has(entry.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-lg">{getCategoryIcon(entry.category)}</span>
                                  <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                    {formatCategory(entry.category)}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    // Extract attachment ID from visit history OR fall back to extractedFromAttachmentId
                                    const attachmentIdFromVisit = entry.visitHistory?.find(visit => visit.attachmentId)?.attachmentId;
                                    const finalAttachmentId = attachmentIdFromVisit || 
                                      (entry.sourceType === "attachment" ? entry.extractedFromAttachmentId : undefined);
                                    
                                    // Extract encounter ID from visit history OR fall back to extractedFromEncounterId
                                    const encounterIdFromVisit = entry.visitHistory?.find(visit => visit.encounterId)?.encounterId;
                                    const finalEncounterId = encounterIdFromVisit || 
                                      (entry.sourceType === "encounter" ? entry.extractedFromEncounterId : undefined);
                                    
                                    // Use sourceConfidence from the entry OR visit history
                                    const finalConfidence = entry.sourceConfidence || 
                                      entry.visitHistory?.find(visit => visit.confidence)?.confidence;
                                    
                                    return getSourceBadge(
                                      entry.sourceType, 
                                      finalConfidence, 
                                      finalAttachmentId, 
                                      finalEncounterId
                                    );
                                  })()}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 emr-ultra-compact-content">
                                {entry.currentStatus}
                              </p>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(entry);
                                setEditingVisitHistory(entry.visitHistory || []);
                                setIsAddDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this social history entry?")) {
                                  deleteMutation.mutate(entry.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                    <div className="space-y-4">
                      {/* Entry Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {entry.historyNotes && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600">History Notes</Label>
                            <p className="text-sm">{entry.historyNotes}</p>
                          </div>
                        )}
                        {entry.extractionNotes && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Source Notes</Label>
                            <p className="text-sm">{entry.extractionNotes}</p>
                          </div>
                        )}
                        {entry.consolidationReasoning && (
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-gray-600">Consolidation Notes</Label>
                            <p className="text-sm italic text-gray-700">{entry.consolidationReasoning}</p>
                          </div>
                        )}
                      </div>

                      {/* Visit History */}
                      {entry.visitHistory && entry.visitHistory.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-2 block">Visit History</Label>
                          <div className="space-y-2">
                            {entry.visitHistory
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((visit, index) => (
                                <div 
                                  key={visit.id || index} 
                                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm"
                                >
                                  <div className="flex flex-col items-center text-gray-400">
                                    <Calendar className="h-4 w-4" />
                                    <div className="w-px h-full bg-gray-300 mt-1"></div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-900">
                                        {formatDate(visit.date)}
                                      </span>
                                      {visit.source && getSourceBadge(
                                        visit.source, 
                                        visit.confidence, 
                                        visit.attachmentId, 
                                        visit.encounterId
                                      )}
                                      {visit.confidence && (
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(visit.confidence * 100)}% confidence
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-700 leading-relaxed">{visit.notes}</p>
                                    {visit.changesMade && visit.changesMade.length > 0 && (
                                      <div className="mt-2">
                                        <Label className="text-xs text-gray-500">Changes:</Label>
                                        <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                                          {visit.changesMade.map((change, idx) => (
                                            <li key={idx}>{change}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {visit.providerName && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Provider: {visit.providerName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialHistorySection;