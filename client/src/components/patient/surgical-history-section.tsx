import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Scissors, Plus, Edit2, Trash2, Calendar, MapPin, User, FileText, AlertTriangle, CheckCircle, Clock, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNavigationContext } from "@/hooks/use-navigation-context";

interface SurgicalHistoryEntry {
  id: number;
  patientId: number;
  procedureName: string;
  procedureDate: string | null;
  surgeonName: string | null;
  facilityName: string | null;
  indication: string | null;
  complications: string | null;
  outcome: string;
  anesthesiaType: string | null;
  cptCode: string | null;
  anatomicalSite: string | null;
  laterality: string | null;
  urgencyLevel: string | null;
  lengthOfStay: string | null;
  sourceType: string;
  sourceConfidence: number;
  sourceNotes: string | null;
  extractedFromAttachmentId: number | null;
  attachmentId?: number; // For backward compatibility
  confidence?: number; // For backward compatibility
  visitHistory?: Array<{
    date: string;
    notes: string;
    source: "encounter" | "attachment";
    encounterId?: number;
    attachmentId?: number;
    changesMade?: string[];
    confidence?: number;
    isSigned?: boolean;
    sourceNotes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface SurgicalHistorySectionProps {
  patientId: number;
  encounterId?: number;
  mode: "patient-chart" | "encounter";
  isReadOnly?: boolean;
}

export function SurgicalHistorySection({ patientId, mode, isReadOnly = false }: SurgicalHistorySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { navigateWithContext } = useNavigationContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSurgery, setEditingSurgery] = useState<SurgicalHistoryEntry | null>(null);
  const [expandedSurgeries, setExpandedSurgeries] = useState<Set<number>>(new Set());
  const [editingVisitHistory, setEditingVisitHistory] = useState<any[]>([]);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [newVisitNote, setNewVisitNote] = useState({ date: "", notes: "" });
  const [newSurgery, setNewSurgery] = useState({
    procedureName: "",
    procedureDate: "",
    surgeonName: "",
    facilityName: "",
    indication: "",
    complications: "",
    outcome: "successful",
    anesthesiaType: "",
    cptCode: "",
    anatomicalSite: "",
    laterality: "",
    urgencyLevel: "elective",
    lengthOfStay: "outpatient"
  });

  // Fetch surgical history for the patient
  const { data: surgicalHistory = [], isLoading } = useQuery<SurgicalHistoryEntry[]>({
    queryKey: [`/api/surgical-history/${patientId}`],
    enabled: !!patientId
  });

  // Create new surgical history entry
  const createSurgeryMutation = useMutation({
    mutationFn: (surgeryData: any) => apiRequest("POST", `/api/surgical-history`, { ...surgeryData, patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surgical-history/${patientId}`] });
      setIsAddDialogOpen(false);
      setNewSurgery({
        procedureName: "",
        procedureDate: "",
        surgeonName: "",
        facilityName: "",
        indication: "",
        complications: "",
        outcome: "successful",
        anesthesiaType: "",
        cptCode: "",
        anatomicalSite: "",
        laterality: "",
        urgencyLevel: "elective",
        lengthOfStay: "outpatient"
      });
      toast({
        title: "Surgery Added",
        description: "Surgical history entry created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add surgical history",
        variant: "destructive"
      });
    }
  });

  // Update surgical history entry
  const updateSurgeryMutation = useMutation({
    mutationFn: ({ surgeryId, updates }: { surgeryId: number, updates: any }) => 
      apiRequest("PUT", `/api/surgical-history/${surgeryId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surgical-history/${patientId}`] });
      setEditingSurgery(null);
      toast({
        title: "Surgery Updated",
        description: "Surgical history entry updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update surgical history",
        variant: "destructive"
      });
    }
  });

  // Delete surgical history entry
  const deleteSurgeryMutation = useMutation({
    mutationFn: (surgeryId: number) => apiRequest("DELETE", `/api/surgical-history/${surgeryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surgical-history/${patientId}`] });
      toast({
        title: "Surgery Deleted",
        description: "Surgical history entry removed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete surgical history",
        variant: "destructive"
      });
    }
  });

  const handleAddSurgery = () => {
    if (!newSurgery.procedureName.trim()) {
      toast({
        title: "Error",
        description: "Procedure name is required",
        variant: "destructive"
      });
      return;
    }
    createSurgeryMutation.mutate(newSurgery);
  };

  const handleEditSurgery = (surgery: SurgicalHistoryEntry) => {
    setEditingSurgery(surgery);
    setEditingVisitHistory(surgery.visitHistory || []);
    setNewVisitNote({ date: "", notes: "" });
    setEditingVisitId(null);
  };

  const handleUpdateSurgery = () => {
    if (!editingSurgery) return;
    updateSurgeryMutation.mutate({
      surgeryId: editingSurgery.id,
      updates: {
        ...editingSurgery,
        visitHistory: editingVisitHistory
      }
    });
  };

  const handleDeleteSurgery = (surgeryId: number) => {
    if (confirm("Are you sure you want to delete this surgical history entry?")) {
      deleteSurgeryMutation.mutate(surgeryId);
    }
  };

  const toggleSurgeryExpansion = (surgeryId: number) => {
    setExpandedSurgeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(surgeryId)) {
        newSet.delete(surgeryId);
      } else {
        newSet.add(surgeryId);
      }
      return newSet;
    });
  };

  // Visit History Management Functions
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

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "encounter":
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Encounter</Badge>;
      case "attachment":
        return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Document</Badge>;
      case "manual":
        return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">Manual</Badge>;
      default:
        return null;
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "successful": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "complicated": return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "cancelled": return <Clock className="h-4 w-4 text-gray-600" />;
      case "ongoing": return <Activity className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "successful": return "bg-green-100 text-green-800 border-green-200";
      case "complicated": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
      case "ongoing": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case "soap_derived": return "bg-blue-100 text-blue-800 border-blue-200";
      case "attachment_extracted": return "bg-purple-100 text-purple-800 border-purple-200";
      case "manual_entry": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="emr-card-header-proportional">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Surgical History
          </CardTitle>
        </CardHeader>
        <CardContent className="emr-card-content-proportional">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="emr-card-header-proportional">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Surgical History
            {surgicalHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {surgicalHistory.length}
              </Badge>
            )}
          </CardTitle>
          {!isReadOnly && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="emr-ultra-tight-spacing">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Surgery
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Surgical History</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="procedureName">Procedure Name *</Label>
                      <Input
                        id="procedureName"
                        value={newSurgery.procedureName}
                        onChange={(e) => setNewSurgery({ ...newSurgery, procedureName: e.target.value })}
                        placeholder="e.g., Laparoscopic Appendectomy"
                      />
                    </div>
                    <div>
                      <Label htmlFor="procedureDate">Procedure Date</Label>
                      <Input
                        id="procedureDate"
                        type="date"
                        value={newSurgery.procedureDate}
                        onChange={(e) => setNewSurgery({ ...newSurgery, procedureDate: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="surgeonName">Surgeon</Label>
                      <Input
                        id="surgeonName"
                        value={newSurgery.surgeonName}
                        onChange={(e) => setNewSurgery({ ...newSurgery, surgeonName: e.target.value })}
                        placeholder="e.g., Dr. Smith"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facilityName">Facility</Label>
                      <Input
                        id="facilityName"
                        value={newSurgery.facilityName}
                        onChange={(e) => setNewSurgery({ ...newSurgery, facilityName: e.target.value })}
                        placeholder="e.g., General Hospital"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="outcome">Outcome</Label>
                      <Select value={newSurgery.outcome} onValueChange={(value) => setNewSurgery({ ...newSurgery, outcome: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="successful">Successful</SelectItem>
                          <SelectItem value="complicated">Complicated</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="urgencyLevel">Urgency</Label>
                      <Select value={newSurgery.urgencyLevel} onValueChange={(value) => setNewSurgery({ ...newSurgery, urgencyLevel: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elective">Elective</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="emergent">Emergent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="laterality">Laterality</Label>
                      <Select value={newSurgery.laterality} onValueChange={(value) => setNewSurgery({ ...newSurgery, laterality: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="bilateral">Bilateral</SelectItem>
                          <SelectItem value="midline">Midline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="indication">Indication</Label>
                    <Textarea
                      id="indication"
                      value={newSurgery.indication}
                      onChange={(e) => setNewSurgery({ ...newSurgery, indication: e.target.value })}
                      placeholder="Reason for surgery"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="complications">Complications</Label>
                    <Textarea
                      id="complications"
                      value={newSurgery.complications}
                      onChange={(e) => setNewSurgery({ ...newSurgery, complications: e.target.value })}
                      placeholder="Any complications or notes"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSurgery} disabled={createSurgeryMutation.isPending}>
                      {createSurgeryMutation.isPending ? "Adding..." : "Add Surgery"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="emr-card-content-proportional">
        {surgicalHistory.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Scissors className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No surgical history recorded</p>
            {!isReadOnly && (
              <p className="text-xs text-gray-400 mt-1">
                Add procedures manually or they will be extracted automatically from notes
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {surgicalHistory.map((surgery) => (
              <Card 
                key={surgery.id} 
                className="relative surgical-card border-l-gray-200 dark:border-l-gray-700 hover:shadow-md transition-all duration-200 group"
              >
                <Collapsible
                  open={expandedSurgeries.has(surgery.id)}
                  onOpenChange={() => toggleSurgeryExpansion(surgery.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-opacity-80 surgical-header transition-colors emr-compact-header">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {expandedSurgeries.has(surgery.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="flex items-center gap-1">
                                {getOutcomeIcon(surgery.outcome)}
                                <Badge variant="outline" className={`text-xs ${getOutcomeColor(surgery.outcome)}`}>
                                  {surgery.outcome}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Combined source attribution badge for attachment-extracted surgeries */}
                                {surgery.sourceType === "attachment_extracted" && surgery.extractedFromAttachmentId ? (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs cursor-pointer hover:bg-purple-600 hover:text-white transition-colors bg-purple-50 text-purple-700 border-purple-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log(`🏥 [SurgicalHistory] Navigating to attachment ${surgery.extractedFromAttachmentId} for surgery ${surgery.id}`);
                                      navigateWithContext(
                                        `/patients/${surgery.patientId}/chart?section=attachments&highlight=${surgery.extractedFromAttachmentId}`,
                                        'surgical-history',
                                        mode
                                      );
                                    }}
                                    title={`Click to view source document (Confidence: ${Math.round(surgery.sourceConfidence * 100)}%)`}
                                  >
                                    Doc Extract {Math.round(surgery.sourceConfidence * 100)}%
                                  </Badge>
                                ) : surgery.sourceType === "soap_derived" && surgery.sourceConfidence ? (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                    title={`SOAP-derived surgery (Confidence: ${Math.round(surgery.sourceConfidence * 100)}%)`}
                                  >
                                    SOAP {Math.round(surgery.sourceConfidence * 100)}%
                                  </Badge>
                                ) : (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-gray-50 text-gray-700 border-gray-200"
                                    title="Manually entered surgery"
                                  >
                                    Manual
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {surgery.procedureName}
                              {surgery.cptCode && (
                                <span className="ml-2 text-sm font-mono text-gray-500 dark:text-gray-400">
                                  {surgery.cptCode}
                                </span>
                              )}
                            </CardTitle>
                            
                            <div className="flex items-center gap-3 mt-2">
                              {surgery.procedureDate && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(parseISO(surgery.procedureDate), "MMM d, yyyy")}
                                </span>
                              )}
                              {(surgery.visitHistory?.length ?? 0) > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {surgery.visitHistory?.length} visit{surgery.visitHistory?.length === 1 ? '' : 's'}
                                </span>
                              )}
                              {surgery.surgeonName && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Dr. {surgery.surgeonName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {!isReadOnly && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSurgery(surgery)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Edit surgery"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSurgery(surgery.id)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              title="Delete surgery"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 emr-card-content-tight">
                      <div className="emr-tight-spacing">
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          {surgery.surgeonName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {surgery.surgeonName}
                            </div>
                          )}
                          {surgery.facilityName && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {surgery.facilityName}
                            </div>
                          )}
                          {surgery.indication && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {surgery.indication}
                            </div>
                          )}
                          {surgery.anatomicalSite && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {surgery.anatomicalSite}
                            </div>
                          )}
                        </div>

                        {surgery.complications && (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <strong>Complications:</strong> {surgery.complications}
                          </div>
                        )}

                        {/* Visit History Section */}
                        {surgery.visitHistory && surgery.visitHistory.length > 0 ? (
                          <div className="emr-dense-list">
                            {surgery.visitHistory
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
                              <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {format(parseISO(visit.date), "MMM d, yyyy")}
                                  </span>
                                  {visit.source === "encounter" && visit.encounterId && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-blue-600 hover:text-white transition-colors bg-blue-50 text-blue-700 border-blue-200"
                                      onClick={() => {
                                        navigateWithContext(
                                          `/patients/${surgery.patientId}/encounters/${visit.encounterId}`,
                                          'surgical-history',
                                          mode
                                        );
                                      }}
                                      title="Click to view encounter"
                                    >
                                      Encounter #{visit.encounterId}
                                    </Badge>
                                  )}
                                  {visit.source === "attachment" && visit.attachmentId && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-purple-600 hover:text-white transition-colors bg-purple-50 text-purple-700 border-purple-200"
                                      onClick={() => {
                                        navigateWithContext(
                                          `/patients/${surgery.patientId}/chart?section=attachments&highlight=${visit.attachmentId}`,
                                          'surgical-history',
                                          mode
                                        );
                                      }}
                                      title="Click to view attachment"
                                    >
                                      Document
                                    </Badge>
                                  )}
                                  {visit.changesMade && visit.changesMade.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                      {visit.changesMade.length === 1 ? visit.changesMade[0].replace('_', ' ') : `${visit.changesMade.length} changes`}
                                    </Badge>
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
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Surgery Dialog */}
      {editingSurgery && (
        <Dialog open={!!editingSurgery} onOpenChange={() => setEditingSurgery(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Surgical History</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-procedureName">Procedure Name *</Label>
                  <Input
                    id="edit-procedureName"
                    value={editingSurgery.procedureName}
                    onChange={(e) => setEditingSurgery({ ...editingSurgery, procedureName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-procedureDate">Procedure Date</Label>
                  <Input
                    id="edit-procedureDate"
                    type="date"
                    value={editingSurgery.procedureDate || ""}
                    onChange={(e) => setEditingSurgery({ ...editingSurgery, procedureDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-surgeonName">Surgeon</Label>
                  <Input
                    id="edit-surgeonName"
                    value={editingSurgery.surgeonName || ""}
                    onChange={(e) => setEditingSurgery({ ...editingSurgery, surgeonName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-facilityName">Facility</Label>
                  <Input
                    id="edit-facilityName"
                    value={editingSurgery.facilityName || ""}
                    onChange={(e) => setEditingSurgery({ ...editingSurgery, facilityName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-indication">Indication</Label>
                <Textarea
                  id="edit-indication"
                  value={editingSurgery.indication || ""}
                  onChange={(e) => setEditingSurgery({ ...editingSurgery, indication: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="edit-complications">Complications</Label>
                <Textarea
                  id="edit-complications"
                  value={editingSurgery.complications || ""}
                  onChange={(e) => setEditingSurgery({ ...editingSurgery, complications: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Visit History Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Visit History</h3>
                  <p className="text-sm text-gray-500">Chronological notes for this procedure</p>
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
                  {editingVisitHistory.map((visit) => (
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
                                <Edit2 className="h-3 w-3" />
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSurgery(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSurgery} disabled={updateSurgeryMutation.isPending}>
                  {updateSurgeryMutation.isPending ? "Updating..." : "Update Surgery"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}