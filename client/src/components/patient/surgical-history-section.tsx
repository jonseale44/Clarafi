import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Scissors, Plus, Edit2, Trash2, Calendar, MapPin, User, FileText, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSurgery, setEditingSurgery] = useState<SurgicalHistoryEntry | null>(null);
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
  };

  const handleUpdateSurgery = () => {
    if (!editingSurgery) return;
    updateSurgeryMutation.mutate({
      surgeryId: editingSurgery.id,
      updates: editingSurgery
    });
  };

  const handleDeleteSurgery = (surgeryId: number) => {
    if (confirm("Are you sure you want to delete this surgical history entry?")) {
      deleteSurgeryMutation.mutate(surgeryId);
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
      case "attachment_derived": return "bg-purple-100 text-purple-800 border-purple-200";
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
              <div key={surgery.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{surgery.procedureName}</h4>
                      <div className="flex items-center gap-1">
                        {getOutcomeIcon(surgery.outcome)}
                        <Badge variant="outline" className={`text-xs ${getOutcomeColor(surgery.outcome)}`}>
                          {surgery.outcome}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-xs ${getSourceColor(surgery.sourceType)}`}>
                          {surgery.sourceType === "soap_derived" ? "SOAP" : 
                           surgery.sourceType === "attachment_derived" ? "Document" : "Manual"}
                        </Badge>
                        
                        {/* Attachment source link and confidence for document-derived surgeries */}
                        {surgery.sourceType === "attachment_derived" && surgery.extractedFromAttachmentId && (
                          <>
                            <a 
                              href={`/patients/${surgery.patientId}/attachments/${surgery.extractedFromAttachmentId}`}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                              title="View source document"
                            >
                              📎 Source
                            </a>
                            {surgery.sourceConfidence && (
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                                title={`Extraction confidence: ${Math.round(surgery.sourceConfidence * 100)}%`}
                              >
                                {Math.round(surgery.sourceConfidence * 100)}%
                              </Badge>
                            )}
                          </>
                        )}
                        
                        {/* Confidence for SOAP-derived surgeries */}
                        {surgery.sourceType === "soap_derived" && surgery.sourceConfidence && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            title={`Extraction confidence: ${Math.round(surgery.sourceConfidence * 100)}%`}
                          >
                            {Math.round(surgery.sourceConfidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {surgery.procedureDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(surgery.procedureDate), "MMM d, yyyy")}
                        </div>
                      )}
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
                    </div>

                    {surgery.complications && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <strong>Complications:</strong> {surgery.complications}
                      </div>
                    )}
                  </div>
                  
                  {!isReadOnly && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSurgery(surgery)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSurgery(surgery.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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