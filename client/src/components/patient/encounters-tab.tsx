import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Encounter } from "@shared/schema";
import { Plus, Eye, Edit, Clock, MapPin, User, Calendar } from "lucide-react";

interface EncountersTabProps {
  encounters: Encounter[];
  patientId: number;
}

export function EncountersTab({ encounters, patientId }: EncountersTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "signed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEncounterTypeLabel = (type: string) => {
    switch (type) {
      case "office_visit":
        return "Office Visit";
      case "virtual_visit":
        return "Virtual Visit";
      case "patient_communication":
        return "Patient Communication";
      case "orders_only":
        return "Orders Only";
      default:
        return type;
    }
  };

  const handleNewEncounter = () => {
    // In a real app, this would open a new encounter modal
    console.log("Creating new encounter for patient:", patientId);
  };

  const handleViewEncounter = (encounterId: number) => {
    console.log("Viewing encounter:", encounterId);
  };

  const handleEditEncounter = (encounterId: number) => {
    console.log("Editing encounter:", encounterId);
  };

  const handleContinueEncounter = (encounterId: number) => {
    console.log("Continuing encounter:", encounterId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">Recent Encounters</h4>
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
                    <Badge variant="secondary" className={getStatusColor(encounter.encounterStatus)}>
                      {encounter.encounterStatus?.replace('_', ' ')}
                    </Badge>
                    {encounter.signatureId && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Signed
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(encounter.startTime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium">Provider:</span>
                      <span>Provider #{encounter.providerId}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">Time:</span>
                      <span>{formatTime(encounter.startTime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">Location:</span>
                      <span>{encounter.location || "Not specified"}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    {encounter.chiefComplaint && (
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Chief Complaint:</span> {encounter.chiefComplaint}
                      </p>
                    )}
                    {encounter.assessment && (
                      <p className="text-gray-700">
                        <span className="font-medium">Assessment:</span> {encounter.assessment}
                      </p>
                    )}
                    {encounter.nurseAssessment && (
                      <p className="text-gray-700 mt-1">
                        <span className="font-medium">Nurse Assessment:</span> {encounter.nurseAssessment}
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
