import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Users, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNavigationContext } from "@/hooks/use-navigation-context";
import { useDenseView } from "@/hooks/use-dense-view";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown } from "lucide-react";

interface FamilyHistoryEntry {
  id: number;
  patientId: number;
  familyMember: string;
  medicalHistory: string;
  visitHistory?: Array<{
    date: string;
    notes: string;
    source: "encounter" | "attachment" | "manual" | "imported_record";
    encounterId?: number;
    attachmentId?: number;
    providerName?: string;
    changesMade?: string[];
    confidence?: number;
  }>;
  sourceType: string;
  sourceConfidence: string;
  sourceNotes?: string;
  extractedFromAttachmentId?: number; // Added for proper attachment ID tracking
  createdAt: string;
  updatedAt: string;
}

interface FamilyHistorySectionProps {
  patientId: number;
  className?: string;
  mode?: string;
}

const FAMILY_RELATIONSHIPS = [
  "father", "mother", "brother", "sister", "son", "daughter", 
  "grandmother", "grandfather", "aunt", "uncle", "cousin"
];

const FamilyHistorySection: React.FC<FamilyHistorySectionProps> = ({ patientId, className = "", mode = "chart" }) => {
  const [editingEntry, setEditingEntry] = useState<FamilyHistoryEntry | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  const [expandedDenseEntries, setExpandedDenseEntries] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { navigateWithContext } = useNavigationContext();
  const { isDenseView } = useDenseView();

  // Form state for add/edit
  const [formData, setFormData] = useState({
    familyMember: "",
    medicalHistory: "",
    sourceNotes: ""
  });

  // Get family history data
  const { data: familyHistory = [], isLoading } = useQuery<FamilyHistoryEntry[]>({
    queryKey: ["/api/family-history", patientId],
    enabled: !!patientId,
  });

  // Create family history mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/family-history/${patientId}`, "POST", data),
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/family-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/family-history", patientId]);
      
      // Optimistically update to the new value
      const optimisticEntry = {
        id: Date.now(), // Temporary ID
        patientId,
        familyMember: newData.familyMember,
        medicalHistory: newData.medicalHistory,
        sourceNotes: newData.sourceNotes,
        sourceType: "manual",
        sourceConfidence: "100",
        visitHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(["/api/family-history", patientId], (old: any[]) => 
        old ? [...old, optimisticEntry] : [optimisticEntry]
      );
      
      return { previousData };
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Family history added",
        description: "Family history entry has been successfully created.",
      });
    },
    onError: (error: any, newData, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/family-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create family history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
    },
  });

  // Update family history mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/family-history/${id}`, "PUT", { ...data, patientId }),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/family-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/family-history", patientId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/family-history", patientId], (old: any[]) => {
        if (!old) return old;
        return old.map(entry => 
          entry.id === id 
            ? { 
                ...entry, 
                familyMember: data.familyMember,
                medicalHistory: data.medicalHistory,
                sourceNotes: data.sourceNotes,
                updatedAt: new Date().toISOString(),
              }
            : entry
        );
      });
      
      return { previousData };
    },
    onSuccess: () => {
      setEditingEntry(null);
      resetForm();
      toast({
        title: "Family history updated",
        description: "Family history entry has been successfully updated.",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/family-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update family history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
    },
  });

  // Delete family history mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/family-history/${id}`, "DELETE"),
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/family-history", patientId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/family-history", patientId]);
      
      // Optimistically remove the entry
      queryClient.setQueryData(["/api/family-history", patientId], (old: any[]) => {
        if (!old) return old;
        return old.filter(entry => entry.id !== id);
      });
      
      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "Family history deleted",
        description: "Family history entry has been successfully deleted.",
      });
    },
    onError: (error: any, id, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/family-history", patientId], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete family history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
    },
  });

  const resetForm = () => {
    setFormData({
      familyMember: "",
      medicalHistory: "",
      sourceNotes: ""
    });
  };

  const handleEdit = (entry: FamilyHistoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      familyMember: entry.familyMember,
      medicalHistory: entry.medicalHistory,
      sourceNotes: entry.sourceNotes || ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.familyMember.trim() || !formData.medicalHistory.trim()) {
      toast({
        title: "Error",
        description: "Family member and medical history are required",
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

  // Source badge with navigation - matches medical problems pattern exactly
  const getSourceBadge = (source: string, confidence?: number, attachmentId?: number, encounterId?: number) => {
    switch (source) {
      case "encounter": {
        // Clickable encounter badge that navigates to encounter detail
        const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
        const handleEncounterClick = () => {
          if (encounterId) {
            navigateWithContext(`/patients/${patientId}/encounters/${encounterId}`, "family-history", mode);
          }
        };
        return (
          <Badge 
            variant="default" 
            className="text-xs cursor-pointer hover:bg-navy-blue-600 dark:hover:bg-navy-blue-400 transition-colors bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200"
            onClick={handleEncounterClick}
            title={`Click to view encounter details (Encounter #${encounterId})`}
          >
            Note {confidencePercent}%
          </Badge>
        );
      }
      case "attachment": {
        // Document Extract badge with confidence score, tooltip, and click navigation
        const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
        const handleDocumentClick = () => {
          console.log("🔗 [FamilyHistory] Document badge clicked!");
          console.log("🔗 [FamilyHistory] attachmentId:", attachmentId);
          console.log("🔗 [FamilyHistory] patientId:", patientId);
          console.log("🔗 [FamilyHistory] mode:", mode);
          
          if (attachmentId) {
            const targetUrl = `/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`;
            console.log("🔗 [FamilyHistory] Navigating to:", targetUrl);
            console.log("🔗 [FamilyHistory] Source section: family-history");
            console.log("🔗 [FamilyHistory] Source context:", mode);
            
            navigateWithContext(targetUrl, "family-history", mode);
            console.log("🔗 [FamilyHistory] Navigation called successfully");
          } else {
            console.log("❌ [FamilyHistory] No attachmentId provided - cannot navigate");
          }
        };
        
        const getConfidenceTooltip = (confidencePercent: number) => {
          if (confidencePercent >= 90) {
            return "High Confidence: Document contains specific family history data with clear family member relationships and medical conditions.";
          } else if (confidencePercent >= 70) {
            return "Good Confidence: Document has moderate family history specificity with some specific medical details.";
          } else if (confidencePercent >= 40) {
            return "Medium Confidence: Document contains general family history information but lacks specific clinical details.";
          } else if (confidencePercent >= 10) {
            return "Low Confidence: Document has vague or minimal family history information with limited clinical specificity.";
          } else {
            return "Very Low Confidence: Document contains minimal or very general family history information without specific clinical details.";
          }
        };
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors bg-amber-100 text-amber-800 border-amber-200"
                    onClick={handleDocumentClick}
                  >
                    MR {confidencePercent}%
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
      }
      case "manual":
        return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800 border-gray-200">Manual</Badge>;
      case "imported_record":
        return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-300">MR</Badge>;
      default:
        return null;
    }
  };

  const formatFamilyMember = (member: string) => {
    return member.charAt(0).toUpperCase() + member.slice(1);
  };

  // Toggle expansion for dense view entries
  const toggleDenseEntryExpansion = (entryId: number) => {
    setExpandedDenseEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Dense list rendering for compact view
  const renderFamilyHistoryDenseList = (entry: FamilyHistoryEntry) => {
    const isExpanded = expandedDenseEntries.has(entry.id);
    const mostRecentVisit = entry.visitHistory?.[0];
    
    return (
      <Collapsible
        key={entry.id}
        open={isExpanded}
        onOpenChange={() => toggleDenseEntryExpansion(entry.id)}
      >
        <CollapsibleTrigger asChild>
          <div className="dense-list-item group">
            <div className="dense-list-content">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="dense-list-primary">{formatFamilyMember(entry.familyMember)}</span>
                <span className="dense-list-secondary">{entry.medicalHistory}</span>
              </div>
              
              {mostRecentVisit && (
                <div className="flex items-center gap-2">
                  {getSourceBadge(
                    mostRecentVisit.source,
                    mostRecentVisit.confidence,
                    mostRecentVisit.attachmentId,
                    mostRecentVisit.encounterId
                  )}
                </div>
              )}
            </div>
            
            <div className="dense-list-actions">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(entry);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Are you sure you want to delete this family history entry?")) {
                    deleteMutation.mutate(entry.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="dense-list-expanded">
            {/* Visit History */}
            {entry.visitHistory && entry.visitHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Visit History
                </h4>
                <div className="emr-dense-list">
                  {entry.visitHistory
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
                    <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {format(new Date(visit.date + 'T12:00:00'), "M/d/yy")}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getSourceBadge(
                          visit.source,
                          visit.confidence,
                          visit.attachmentId,
                          visit.encounterId
                        )}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{visit.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (isLoading) {
    return (
      <div className={`emr-tight-spacing ${className}`}>
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-blue-600"></div>
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="emr-ultra-compact-header">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Family History</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="familyMember">Family Member</Label>
                    <Select
                      value={formData.familyMember}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, familyMember: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select family member" />
                      </SelectTrigger>
                      <SelectContent>
                        {FAMILY_RELATIONSHIPS.map(relation => (
                          <SelectItem key={relation} value={relation}>
                            {formatFamilyMember(relation)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="medicalHistory">Medical History</Label>
                    <Textarea
                      id="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                      placeholder="e.g., HTN, DM2, died MI age 83"
                      rows={3}
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
                      {createMutation.isPending ? "Adding..." : "Add Family History"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="emr-card-content-tight">
          {familyHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No family history documented</p>
              <p className="text-sm">Add family medical history using the button above</p>
            </div>
          ) : isDenseView ? (
            <div className="dense-list-container">
              {familyHistory.map(renderFamilyHistoryDenseList)}
            </div>
          ) : (
            <Accordion type="multiple" value={expandedEntries} onValueChange={setExpandedEntries}>
              {familyHistory.map((entry: FamilyHistoryEntry) => (
                <AccordionItem key={entry.id} value={entry.id.toString()}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4 group">
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="font-medium emr-ultra-compact-content">
                            {formatFamilyMember(entry.familyMember)}
                          </div>
                          <div className="text-sm text-gray-600 emr-ultra-compact-content">
                            {entry.medicalHistory}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          // MEDICAL PROBLEMS PATTERN: Use only visit-level confidence to eliminate dual-confidence discrepancy
                          // Get the most recent visit to display its confidence
                          const mostRecentVisit = entry.visitHistory?.[0]; // Assuming sorted by date desc
                          
                          if (mostRecentVisit) {
                            return getSourceBadge(
                              mostRecentVisit.source,
                              mostRecentVisit.confidence,
                              mostRecentVisit.attachmentId,
                              mostRecentVisit.encounterId
                            );
                          }
                          
                          // Fallback for entries without visit history (manual entries)
                          return getSourceBadge("manual", undefined, undefined, undefined);
                        })()}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(entry);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit family history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Are you sure you want to delete this family history entry?")) {
                                      deleteMutation.mutate(entry.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete family history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="emr-tight-spacing pt-2">
                      {/* Visit History */}
                      {entry.visitHistory && entry.visitHistory.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Visit History
                          </h4>
                          <div className="emr-dense-list">
                            {entry.visitHistory
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
                              <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <span className="font-medium text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                                  {format(new Date(visit.date + 'T12:00:00'), "M/d/yy")}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {getSourceBadge(
                                    visit.source,
                                    visit.confidence,
                                    visit.attachmentId,
                                    visit.encounterId
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{visit.notes}</p>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Family History</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="editFamilyMember">Family Member</Label>
              <Select
                value={formData.familyMember}
                onValueChange={(value) => setFormData(prev => ({ ...prev, familyMember: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select family member" />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_RELATIONSHIPS.map(relation => (
                    <SelectItem key={relation} value={relation}>
                      {formatFamilyMember(relation)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editMedicalHistory">Medical History</Label>
              <Textarea
                id="editMedicalHistory"
                value={formData.medicalHistory}
                onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                placeholder="e.g., HTN, DM2, died MI age 83"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="editSourceNotes">Source Notes (Optional)</Label>
              <Input
                id="editSourceNotes"
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
                  setEditingEntry(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Family History"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyHistorySection;