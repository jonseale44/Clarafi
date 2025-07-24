import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Encounter } from "@shared/schema";
import { Plus, Eye, Edit, MapPin, User, Calendar, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface EncountersTabProps {
  encounters: Encounter[];
  patientId: number;
  onRefresh?: () => void;
}

export function EncountersTab({ encounters, patientId, onRefresh }: EncountersTabProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch all users/providers for name lookup
  const { data: providers = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: encounters.length > 0,
  });
  
  // Get current user
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });
  
  // Mutation to create new encounter
  const createEncounterMutation = useMutation({
    mutationFn: async (encounterData: any) => {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encounterData),
      });
      if (!response.ok) throw new Error('Failed to create encounter');
      return response.json();
    },
    onSuccess: (newEncounter) => {
      // Navigate to the newly created encounter
      setLocation(`/patients/${patientId}/encounters/${newEncounter.id}`);
      toast({
        title: "Success",
        description: "New encounter created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getProviderName = (providerId: number | null) => {
    if (!providerId) return "Unassigned";
    const provider = (providers as any[]).find((p: any) => p.id === providerId);
    return provider ? `Dr. ${provider.username}` : `Provider #${providerId}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      // Format as M/D/YY (e.g., 7/3/25)
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;
    } catch {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "No time";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Time";
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Time";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "No date/time";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date/Time";
      // Format as M/D/YY at H:MM AM/PM
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${month}/${day}/${year} at ${time}`;
    } catch {
      return "Invalid Date/Time";
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-navy-blue-100 text-navy-blue-800";
      case "signed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEncounterTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case "office_visit":
      case "office visit":
        return "Office Visit";
      case "virtual_visit":
      case "virtual visit":
        return "Virtual Visit";
      case "patient_communication":
        return "Patient Communication";
      case "orders_only":
        return "Orders Only";
      case "voice_note":
        return "Voice Note";
      default:
        return type || "Unknown";
    }
  };

  const handleNewEncounter = () => {
    // Create new encounter via API
    const encounterData = {
      patientId: patientId,
      providerId: currentUser?.id || 1,
      encounterType: "Office Visit",
      encounterSubtype: "Routine",
      startTime: new Date().toISOString(),
      encounterStatus: "scheduled",
      chiefComplaint: "",
      note: null,
    };
    
    createEncounterMutation.mutate(encounterData);
  };

  const handleViewEncounter = (encounterId: number) => {
    // Navigate to encounter view page with patient context
    setLocation(`/patients/${patientId}/encounters/${encounterId}`);
  };

  const handleEditEncounter = (encounterId: number) => {
    // Navigate to encounter edit page with patient context
    setLocation(`/patients/${patientId}/encounters/${encounterId}`);
  };

  const handleContinueEncounter = (encounterId: number) => {
    // Navigate to continue encounter with patient context
    setLocation(`/patients/${patientId}/encounters/${encounterId}`);
  };

  const stripHtmlTags = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  return (
    <div data-median="encounters-tab-container">
      <div className="flex items-center justify-between mb-6" data-median="encounters-header">
        <h4 className="text-lg font-semibold text-gray-900">Recent Encounters</h4>
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            className="flex items-center gap-2"
            data-median="refresh-button"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>
      
      {/* New Encounter Button - Added for mobile */}
      <div className="mb-4" data-median="mobile-new-encounter-container">
        <Button 
          onClick={handleNewEncounter} 
          className="w-full bg-slate-700 hover:bg-slate-800 text-white"
          data-median="mobile-new-encounter-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Encounter
        </Button>
      </div>
      
      <div className="space-y-4">
        {encounters.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No encounters found</h3>
              <p className="text-sm">Start by creating a new encounter for this patient.</p>
            </div>
          </Card>
        ) : (
          encounters.map((encounter) => (
            <Card key={encounter.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="font-semibold text-gray-900">
                      {getEncounterTypeLabel(encounter.encounterType)}
                      {encounter.encounterSubtype && ` - ${encounter.encounterSubtype}`}
                    </h5>
                    <Badge variant="secondary" className={getStatusColor(encounter.encounterStatus || '')}>
                      {encounter.encounterStatus?.replace('_', ' ') || 'Unknown'}
                    </Badge>
                    {encounter.signatureId && (
                      <Badge variant="secondary" className="bg-navy-blue-100 text-navy-blue-800">
                        Signed
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{encounter.startTime ? formatDateTime(encounter.startTime.toString()) : "No date/time"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span>{getProviderName(encounter.providerId)}</span>
                      </div>
                      {encounter.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{encounter.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    {encounter.chiefComplaint && (
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Chief Complaint:</span> {encounter.chiefComplaint}
                      </p>
                    )}
                    {encounter.note && (
                      <p className="text-gray-700">
                        <span className="font-medium">Note:</span> {(() => {
                          const plainText = stripHtmlTags(encounter.note);
                          // Extract key sections for a more informative preview
                          const sections = [];
                          
                          // Look for Assessment/Plan section (most important for providers)
                          const assessmentMatch = plainText.match(/(ASSESSMENT|PLAN|A&P)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
                          if (assessmentMatch) {
                            const assessment = assessmentMatch[0].replace(/^(ASSESSMENT|PLAN|A&P)[:\s]*\n?/i, '').trim();
                            if (assessment) sections.push(`Assessment: ${assessment.substring(0, 80)}...`);
                          }
                          
                          // If no assessment found, look for chief complaint
                          if (sections.length === 0) {
                            const ccMatch = plainText.match(/(Chief Complaint|CC)[:\s]*([^\n]+)/i);
                            if (ccMatch && ccMatch[2]) {
                              sections.push(`CC: ${ccMatch[2].trim()}`);
                            }
                          }
                          
                          // Fallback to truncated full text
                          if (sections.length === 0) {
                            return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
                          }
                          
                          return sections.join(' | ');
                        })()}
                      </p>
                    )}
                    {encounter.nurseAssessment && (
                      <p className="text-gray-700 mt-1">
                        <span className="font-medium">Nurse Assessment:</span> {(() => {
                          try {
                            // Parse the JSON nursing assessment
                            const assessmentData = JSON.parse(encounter.nurseAssessment);
                            const summary = [];
                            if (assessmentData.cc) summary.push(`CC: ${assessmentData.cc}`);
                            if (assessmentData.hpi) summary.push(`HPI: ${assessmentData.hpi.replace(/\n/g, ' ').substring(0, 50)}...`);
                            if (assessmentData.pmh) summary.push(`PMH: ${assessmentData.pmh.replace(/\n/g, ' ')}`);
                            return summary.length > 0 ? summary.join(' | ') : 'Assessment completed by nursing';
                          } catch {
                            // If it's not JSON, just truncate the string
                            return encounter.nurseAssessment.length > 100 
                              ? encounter.nurseAssessment.substring(0, 100) + '...' 
                              : encounter.nurseAssessment;
                          }
                        })()}
                      </p>
                    )}
                    {encounter.nurseNotes && (
                      <p className="text-gray-700 mt-1">
                        <span className="font-medium">Nursing Summary:</span> {(() => {
                          const plainText = stripHtmlTags(encounter.nurseNotes);
                          // Extract key nursing information
                          const sections = [];
                          
                          // Look for Chief Complaint from nursing notes
                          const ccMatch = plainText.match(/CHIEF COMPLAINT[\s\S]*?(?=\n\n|\*\*|$)/i);
                          if (ccMatch) {
                            const cc = ccMatch[0].replace(/\*\*CHIEF COMPLAINT\*\*/i, '').replace(/^[:\s-]*/, '').trim();
                            if (cc) sections.push(`CC: ${cc.split('\n')[0]}`);
                          }
                          
                          // Look for key medications from nursing notes
                          const medsMatch = plainText.match(/CURRENT MEDICATIONS[\s\S]*?(?=\n\n|\*\*|$)/i);
                          if (medsMatch) {
                            const meds = medsMatch[0].replace(/\*\*CURRENT MEDICATIONS\*\*/i, '').replace(/^[:\s-]*/, '').trim();
                            if (meds && !meds.includes('Not documented')) {
                              const medList = meds.split('\n').filter(m => m.trim() && m.includes('mg')).slice(0, 2);
                              if (medList.length > 0) sections.push(`Meds: ${medList.join(', ')}`);
                            }
                          }
                          
                          // Look for allergies from nursing notes
                          const allergyMatch = plainText.match(/ALLERGIES[\s\S]*?(?=\n\n|\*\*|$)/i);
                          if (allergyMatch) {
                            const allergies = allergyMatch[0].replace(/\*\*ALLERGIES\*\*/i, '').replace(/^[:\s-]*/, '').trim();
                            if (allergies && !allergies.includes('Not documented')) {
                              sections.push(`Allergies: ${allergies.split('\n')[0]}`);
                            }
                          }
                          
                          // Fallback to truncated summary
                          if (sections.length === 0) {
                            return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
                          }
                          
                          return sections.join(' | ');
                        })()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {encounter.encounterStatus === "in_progress" ? (
                    <Button 
                      size="sm" 
                      className="bg-primary text-white"
                      onClick={() => handleContinueEncounter(encounter.id)}
                    >
                      Continue
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewEncounter(encounter.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditEncounter(encounter.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
