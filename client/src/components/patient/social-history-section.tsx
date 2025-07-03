import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNavigationContext } from "@/hooks/use-navigation-context";
import { useDenseView } from "@/hooks/use-dense-view";

// Social history categories based on the unified parser
const SOCIAL_HISTORY_CATEGORIES = [
  "tobacco2",
  "alcohol",
  "occupation",
  "exercise",
  "diet",
  "sexual_history",
  "living_situation",
  "recreational_drugs",
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
  mode = "chart",
}) => {
  const [editingEntry, setEditingEntry] = useState<SocialHistoryEntry | null>(
    null,
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    new Set(),
  );
  const [editingVisitHistory, setEditingVisitHistory] = useState<
    VisitHistoryEntry[]
  >([]);
  const [newVisitNote, setNewVisitNote] = useState({ date: "", notes: "" });
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [expandedDenseEntries, setExpandedDenseEntries] = useState<Set<number>>(
    new Set(),
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { navigateWithContext } = useNavigationContext();
  const { isDenseView } = useDenseView();

  // Form state for add/edit
  const [formData, setFormData] = useState({
    category: "",
    currentStatus: "",
    historyNotes: "",
    sourceNotes: "",
  });

  // Get social history data
  const {
    data: socialHistory = [],
    isLoading,
    error,
  } = useQuery<SocialHistoryEntry[]>({
    queryKey: ["/api/social-history", patientId],
    enabled: !!patientId,
  });

  // Enhanced logging for social history component
  console.log(
    `🚬 [SocialHistorySection] Component rendered for patient ${patientId}`,
  );
  console.log(`🚬 [SocialHistorySection] Query state:`, {
    isLoading,
    hasError: !!error,
    dataLength: socialHistory?.length || 0,
    enabled: !!patientId,
    queryKey: ["/api/social-history", patientId],
  });

  if (error) {
    console.error(`🚬 [SocialHistorySection] Query error:`, error);
  }

  if (socialHistory && socialHistory.length > 0) {
    console.log(
      `🚬 [SocialHistorySection] Social history data:`,
      socialHistory.map((sh) => ({
        id: sh.id,
        category: sh.category,
        currentStatus: sh.currentStatus,
        sourceType: sh.sourceType,
        visitHistoryLength: sh.visitHistory?.length || 0,
      })),
    );
  }

  // Create social history mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/social-history/${patientId}`, data),
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/social-history", patientId],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "/api/social-history",
        patientId,
      ]);

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

      queryClient.setQueryData(
        ["/api/social-history", patientId],
        (old: any[]) => (old ? [...old, optimisticEntry] : [optimisticEntry]),
      );

      return { previousData };
    },
    onSuccess: () => {
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
        queryClient.setQueryData(
          ["/api/social-history", patientId],
          context.previousData,
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({
        queryKey: ["/api/social-history", patientId],
      });
    },
  });

  // Update social history mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/social-history/${id}`, { ...data, patientId }),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/social-history", patientId],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "/api/social-history",
        patientId,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ["/api/social-history", patientId],
        (old: any[]) => {
          if (!old) return old;
          return old.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  category: data.category,
                  currentStatus: data.currentStatus,
                  historyNotes: data.historyNotes,
                  extractionNotes: data.sourceNotes,
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          );
        },
      );

      return { previousData };
    },
    onSuccess: () => {
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
        queryClient.setQueryData(
          ["/api/social-history", patientId],
          context.previousData,
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({
        queryKey: ["/api/social-history", patientId],
      });
    },
  });

  // Delete social history mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/social-history/${id}`),
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/social-history", patientId],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "/api/social-history",
        patientId,
      ]);

      // Optimistically remove the entry
      queryClient.setQueryData(
        ["/api/social-history", patientId],
        (old: any[]) => {
          if (!old) return old;
          return old.filter((entry) => entry.id !== id);
        },
      );

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "Social history deleted",
        description: "Social history entry has been successfully deleted.",
      });
    },
    onError: (error: any, id, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/social-history", patientId],
          context.previousData,
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete social history entry",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({
        queryKey: ["/api/social-history", patientId],
      });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "",
      currentStatus: "",
      historyNotes: "",
      sourceNotes: "",
    });
  };

  const handleEdit = (entry: SocialHistoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      currentStatus: entry.currentStatus,
      historyNotes: entry.historyNotes || "",
      sourceNotes: entry.extractionNotes || "",
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
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Source badge with navigation - matches family history pattern exactly
  const getSourceBadge = (
    source: string,
    confidence?: number,
    attachmentId?: number,
    encounterId?: number,
  ) => {
    switch (source) {
      case "encounter": {
        // Clickable encounter badge that navigates to encounter detail
        const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
        const handleEncounterClick = () => {
          if (encounterId) {
            navigateWithContext(
              `/patients/${patientId}/encounters/${encounterId}`,
              "social-history",
              mode,
            );
          }
        };
        return (
          <Badge
            variant="default"
            className="text-xs cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-400 transition-colors bg-blue-100 text-blue-800 border-blue-200"
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
            console.log(
              "❌ [SocialHistory] No attachmentId provided - cannot navigate",
            );
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
                    className="text-xs cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors bg-amber-100 text-amber-800 border-amber-200"
                    onClick={handleDocumentClick}
                  >
                    MR {confidencePercent}%
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm font-medium mb-1">
                  Confidence: {confidencePercent}%
                </p>
                <p className="text-xs">
                  {getConfidenceTooltip(confidencePercent)}
                </p>
                <p className="text-xs mt-2 opacity-75">
                  Click to view source document
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      case "manual":
        return (
          <Badge
            variant="secondary"
            className="text-xs bg-gray-100 text-gray-800 border-gray-200"
          >
            Manual
          </Badge>
        );
      case "imported_record":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-gray-100 text-gray-800 border-gray-300"
          >
            MR
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "tobacco2":
        return "🚭";
      case "alcohol":
        return "🍷";
      case "occupation":
        return "💼";
      case "exercise":
        return "🏃";
      case "diet":
        return "🥗";
      case "sexual_history":
        return "❤️";
      case "living_situation":
        return "🏠";
      case "recreational_drugs":
        return "💊";
      default:
        return "📋";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle date string to avoid timezone conversion issues
      // Parse date as YYYY-MM-DD format and treat as local date
      // UPDATED: Match medical problems format (7/3/25 instead of Jul 3, 2025)
      if (dateString.includes("-")) {
        const [year, month, day] = dateString
          .split("-")
          .map((num) => parseInt(num, 10));
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        return localDate.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "2-digit",
        });
      }
      // Fallback for other date formats
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Toggle function for expanding/collapsing entries
  const toggleEntryExpansion = (entryId: number) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Toggle function for expanding/collapsing dense entries
  const toggleDenseEntryExpansion = (entryId: number) => {
    setExpandedDenseEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Helper function to create concise social history display like medical problems
  const getConcisSocialHistoryDisplay = (entry: SocialHistoryEntry) => {
    const category = formatCategory(entry.category);
    const status = entry.currentStatus;

    // Extract key information concisely like "Diet: ↑ salt intake recently"
    if (entry.category === "diet") {
      if (
        status.toLowerCase().includes("increased") ||
        status.toLowerCase().includes("more")
      ) {
        return `${category}: ↑ salt intake recently`;
      } else if (
        status.toLowerCase().includes("decreased") ||
        status.toLowerCase().includes("less")
      ) {
        return `${category}: ↓ improved recently`;
      } else {
        return `${category}: ${status.substring(0, 50)}${status.length > 50 ? "..." : ""}`;
      }
    } else if (entry.category === "tobacco") {
      if (
        status.toLowerCase().includes("quit") ||
        status.toLowerCase().includes("stopped")
      ) {
        return `${category}: quit smoking`;
      } else if (
        status.toLowerCase().includes("active") ||
        status.toLowerCase().includes("current")
      ) {
        return `${category}: current smoker`;
      } else {
        return `${category}: ${status.substring(0, 50)}${status.length > 50 ? "..." : ""}`;
      }
    } else if (entry.category === "alcohol") {
      if (status.toLowerCase().includes("social")) {
        return `${category}: social use`;
      } else if (
        status.toLowerCase().includes("none") ||
        status.toLowerCase().includes("quit")
      ) {
        return `${category}: none`;
      } else {
        return `${category}: ${status.substring(0, 50)}${status.length > 50 ? "..." : ""}`;
      }
    } else {
      // Generic truncation for other categories
      return `${category}: ${status.substring(0, 50)}${status.length > 50 ? "..." : ""}`;
    }
  };

  // Dense list rendering for compact view - matches medical problems pattern
  const renderSocialHistoryDenseList = (entry: SocialHistoryEntry) => {
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
                <span className="text-lg">
                  {getCategoryIcon(entry.category)}
                </span>
                <span className="dense-list-primary">
                  {getConcisSocialHistoryDisplay(entry)}
                </span>
              </div>

              {mostRecentVisit && (
                <div className="flex items-center gap-2">
                  {getSourceBadge(
                    mostRecentVisit.source,
                    mostRecentVisit.confidence,
                    mostRecentVisit.attachmentId,
                    mostRecentVisit.encounterId,
                  )}
                </div>
              )}
            </div>

            <div
              className="dense-list-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
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
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      "Are you sure you want to delete this social history entry?",
                    )
                  ) {
                    deleteMutation.mutate(entry.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded content for dense view - only show visit history */}
        {isExpanded && (
          <CollapsibleContent>
            <CardContent className="pt-0 emr-card-content-tight">
              <div className="emr-tight-spacing">
                {entry.visitHistory && entry.visitHistory.length > 0 ? (
                  <div className="emr-dense-list">
                    {entry.visitHistory
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((visit, index) => (
                        <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="font-medium text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                            {formatDate(visit.date)}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {visit.source &&
                              getSourceBadge(
                                visit.source,
                                visit.confidence,
                                visit.attachmentId,
                                visit.encounterId,
                              )}
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{visit.notes}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No visit history recorded
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  // Visit History Management Functions (like surgical history)
  const addVisitNote = () => {
    if (!newVisitNote.date || !newVisitNote.notes) {
      toast({
        title: "Error",
        description: "Date and notes are required",
        variant: "destructive",
      });
      return;
    }

    const visitNote = {
      id: Date.now().toString(),
      date: newVisitNote.date,
      notes: newVisitNote.notes,
      source: "manual" as const,
    };

    setEditingVisitHistory((prev) =>
      [...prev, visitNote].sort((a, b) => {
        const dateComparison =
          new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;

        // Simple fallback sorting by ID for same date entries
        return 0;
      }),
    );

    setNewVisitNote({ date: "", notes: "" });
  };

  const editVisitNote = (visitId: string) => {
    setEditingVisitId(visitId);
  };

  const saveVisitEdit = (visitId: string, updatedVisit: any) => {
    setEditingVisitHistory((prev) =>
      prev.map((visit) =>
        visit.id === visitId ? { ...visit, ...updatedVisit } : visit,
      ),
    );
    setEditingVisitId(null);
  };

  const deleteVisitNote = (visitId: string) => {
    setEditingVisitHistory((prev) =>
      prev.filter((visit) => visit.id !== visitId),
    );
  };

  // Helper component for editing visit notes
  const EditableVisitNote = ({
    visit,
    onSave,
    onCancel,
  }: {
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
          <Button
            size="sm"
            onClick={() => onSave({ date: editDate, notes: editNotes })}
          >
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="emr-ultra-compact-header">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEntry
                      ? "Edit Social History Entry"
                      : "Add Social History Entry"}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6">
                  {/* Main Entry Form - Left Column */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Entry Details</h3>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_HISTORY_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {getCategoryIcon(category)}{" "}
                              {formatCategory(category)}
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            currentStatus: e.target.value,
                          }))
                        }
                        placeholder="e.g., Quit smoking 5 years ago, occasional social drinker"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="historyNotes">
                        History Notes (Optional)
                      </Label>
                      <Textarea
                        id="historyNotes"
                        value={formData.historyNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            historyNotes: e.target.value,
                          }))
                        }
                        placeholder="Additional historical context or changes over time"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="sourceNotes">
                        Source Notes (Optional)
                      </Label>
                      <Input
                        id="sourceNotes"
                        value={formData.sourceNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            sourceNotes: e.target.value,
                          }))
                        }
                        placeholder="Additional context about this information"
                      />
                    </div>
                  </div>

                  {/* Visit History Management - Right Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Visit History</h3>
                      <p className="text-sm text-gray-500">
                        Chronological notes for this entry
                      </p>
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
                            onChange={(e) =>
                              setNewVisitNote((prev) => ({
                                ...prev,
                                date: e.target.value,
                              }))
                            }
                            placeholder="Date"
                          />
                          <div className="col-span-3">
                            <Textarea
                              value={newVisitNote.notes}
                              onChange={(e) =>
                                setNewVisitNote((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
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
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {editingVisitHistory.map((visit) => (
                        <Card
                          key={
                            visit.id ||
                            `${visit.date}-${visit.notes.substring(0, 10)}`
                          }
                        >
                          <CardContent className="pt-4">
                            {editingVisitId === visit.id ? (
                              <EditableVisitNote
                                visit={visit}
                                onSave={(updatedVisit) =>
                                  saveVisitEdit(visit.id!, updatedVisit)
                                }
                                onCancel={() => setEditingVisitId(null)}
                              />
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">
                                      {formatDate(visit.date)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {visit.source === "manual"
                                        ? "Manual"
                                        : visit.source}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {visit.notes}
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => editVisitNote(visit.id!)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
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
                </div>

                {/* Dialog Actions */}
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingEntry(null);
                      setEditingVisitHistory([]);
                      setNewVisitNote({ date: "", notes: "" });
                      setEditingVisitId(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (editingEntry) {
                        updateMutation.mutate({
                          id: editingEntry.id,
                          data: {
                            ...formData,
                            visitHistory: editingVisitHistory,
                          },
                        });
                      } else {
                        handleSubmit(e as any);
                      }
                    }}
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingEntry
                        ? "Update Social History"
                        : "Add Social History"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="emr-card-content-tight">
          {socialHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No social history documented</p>
              <p className="text-sm">
                Add social history using the button above
              </p>
            </div>
          ) : (
            <div className={isDenseView ? "dense-list-container" : "space-y-3"}>
              {isDenseView
                ? socialHistory.map(renderSocialHistoryDenseList)
                : socialHistory.map((entry: SocialHistoryEntry) => (
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
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {getCategoryIcon(entry.category)}
                                      </span>
                                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                        {getConcisSocialHistoryDisplay(entry)}
                                      </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {(() => {
                                        // MEDICAL PROBLEMS PATTERN: Use only visit-level confidence to eliminate dual-confidence discrepancy
                                        // Get the most recent visit to display its confidence
                                        const mostRecentVisit =
                                          entry.visitHistory?.[0]; // Assuming sorted by date desc

                                        if (mostRecentVisit) {
                                          return getSourceBadge(
                                            mostRecentVisit.source,
                                            mostRecentVisit.confidence,
                                            mostRecentVisit.attachmentId,
                                            mostRecentVisit.encounterId,
                                          );
                                        }

                                        // Fallback for entries without visit history (manual entries)
                                        return getSourceBadge(
                                          "manual",
                                          undefined,
                                          undefined,
                                          undefined,
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  {entry.visitHistory &&
                                    entry.visitHistory.length > 0 && (
                                      <p className="text-sm text-gray-500 emr-ultra-compact-content">
                                        Since{" "}
                                        {formatDate(
                                          entry.visitHistory[
                                            entry.visitHistory.length - 1
                                          ].date,
                                        )}{" "}
                                        • {entry.visitHistory.length} visit
                                        {entry.visitHistory.length > 1
                                          ? "s"
                                          : ""}
                                      </p>
                                    )}
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
                                    setEditingVisitHistory(
                                      entry.visitHistory || [],
                                    );
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
                                    if (
                                      confirm(
                                        "Are you sure you want to delete this social history entry?",
                                      )
                                    ) {
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
                          <CardContent className="pt-0">
                            {/* Visit History Only - sorted by date descending (most recent first) */}
                            {entry.visitHistory &&
                              entry.visitHistory.length > 0 && (
                                <div className="space-y-2">
                                  {entry.visitHistory
                                    .sort(
                                      (a, b) =>
                                        new Date(b.date).getTime() -
                                        new Date(a.date).getTime(),
                                    )
                                    .map((visit, index) => (
                                      <div
                                        key={visit.id || index}
                                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700/50"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                            {formatDate(visit.date)}
                                          </span>
                                          {visit.source &&
                                            getSourceBadge(
                                              visit.source,
                                              visit.confidence,
                                              visit.attachmentId,
                                              visit.encounterId,
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                          {visit.notes}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialHistorySection;
