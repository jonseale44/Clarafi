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
  createdAt: string;
  updatedAt: string;
}

interface FamilyHistorySectionProps {
  patientId: number;
  className?: string;
}

const FAMILY_RELATIONSHIPS = [
  "father", "mother", "brother", "sister", "son", "daughter", 
  "grandmother", "grandfather", "aunt", "uncle", "cousin"
];

const FamilyHistorySection: React.FC<FamilyHistorySectionProps> = ({ patientId, className = "" }) => {
  const [editingEntry, setEditingEntry] = useState<FamilyHistoryEntry | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Create family history mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/family-history/${patientId}`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Family history added",
        description: "Family history entry has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create family history entry",
        variant: "destructive",
      });
    },
  });

  // Update family history mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/family-history/${id}`, "PUT", { ...data, patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
      setEditingEntry(null);
      resetForm();
      toast({
        title: "Family history updated",
        description: "Family history entry has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update family history entry",
        variant: "destructive",
      });
    },
  });

  // Delete family history mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/family-history/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-history", patientId] });
      toast({
        title: "Family history deleted",
        description: "Family history entry has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete family history entry",
        variant: "destructive",
      });
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

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case "attachment_extracted": return "bg-blue-100 text-blue-800";
      case "soap_derived": return "bg-green-100 text-green-800";
      case "manual_entry": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatFamilyMember = (member: string) => {
    return member.charAt(0).toUpperCase() + member.slice(1);
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
              <Users className="h-4 w-4" />
              Family History
              {familyHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {familyHistory.length}
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
              <p className="text-lg font-medium">No family history documented</p>
              <p className="text-sm">Add family medical history using the button above</p>
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
                        <Badge className={getSourceBadgeColor(entry.sourceType)}>
                          {entry.sourceType === "attachment_extracted" ? "Document" :
                           entry.sourceType === "soap_derived" ? "Note" : "Manual"}
                        </Badge>
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
                          <div className="space-y-2">
                            {entry.visitHistory.map((visit, index) => (
                              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {format(new Date(visit.date), "MMM d, yyyy")}
                                    </Badge>
                                    <Badge className={getSourceBadgeColor(visit.source)}>
                                      {visit.source === "attachment" ? "Document" :
                                       visit.source === "encounter" ? "Encounter" : 
                                       visit.source === "manual" ? "Manual" : visit.source}
                                    </Badge>
                                    {visit.confidence && (
                                      <Badge variant="secondary">
                                        {Math.round(visit.confidence * 100)}% confidence
                                      </Badge>
                                    )}
                                  </div>
                                  {visit.providerName && (
                                    <span className="text-xs text-gray-500">
                                      by {visit.providerName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{visit.notes}</p>
                                {visit.changesMade && visit.changesMade.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Changes:</span> {visit.changesMade.join(", ")}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source Information */}
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Source:</span> {entry.sourceType} 
                            <span className="ml-2">
                              <span className="font-medium">Confidence:</span> {Math.round(parseFloat(entry.sourceConfidence) * 100)}%
                            </span>
                          </div>
                          {entry.sourceNotes && (
                            <div>
                              <span className="font-medium">Notes:</span> {entry.sourceNotes}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Last updated:</span> {format(new Date(entry.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      </div>
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