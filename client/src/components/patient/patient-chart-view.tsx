import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Search, Star } from "lucide-react";
import { Patient } from "@shared/schema";
import { EncountersTab } from "./encounters-tab";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PatientChartViewProps {
  patient: Patient;
  patientId: number;
  onStartVoiceNote: () => void;
}

const chartSections = [
  { id: "encounters", label: "Patient Encounters", icon: Star },
  { id: "problems", label: "Medical Problems", icon: null },
  { id: "medication", label: "Medication", icon: null },
  { id: "allergies", label: "Allergies", icon: null },
  { id: "labs", label: "Labs", icon: null },
  { id: "vitals", label: "Vitals", icon: null },
  { id: "imaging", label: "Imaging", icon: null },
  { id: "family-history", label: "Family History", icon: null },
  { id: "social-history", label: "Social History", icon: null },
  { id: "surgical-history", label: "Surgical History", icon: null },
  { id: "attachments", label: "Attachments", icon: null },
  { id: "appointments", label: "Appointments", icon: null },
];

export function PatientChartView({ patient, patientId, onStartVoiceNote }: PatientChartViewProps) {
  const [activeSection, setActiveSection] = useState("encounters");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["encounters"]));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch encounters
  const { data: encounters = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "encounters"],
    enabled: !!patientId,
  });

  // Fetch allergies
  const { data: allergies = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "allergies"],
    enabled: !!patientId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "encounters"] });
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

  const handleStartNewEncounter = async () => {
    const encounterData = {
      patientId: patientId,
      providerId: 1, // Assuming current user is provider
      encounterType: "Office Visit",
      encounterSubtype: "Routine",
      startTime: new Date().toISOString(),
      status: "In Progress",
      chiefComplaint: "",
      presentIllness: "",
      assessmentPlan: "",
      providerNotes: "",
    };

    createEncounterMutation.mutate(encounterData);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "encounters":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">Patient Encounters</h2>
              </div>
              <Button onClick={handleStartNewEncounter} className="bg-slate-700 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Encounter
              </Button>
            </div>
            <EncountersTab encounters={Array.isArray(encounters) ? encounters : []} patientId={patientId} onStartVoiceNote={onStartVoiceNote} />
          </div>
        );
      case "problems":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Medical Problems</h2>
            <div className="text-gray-500 text-center py-8">Medical problems management coming soon</div>
          </div>
        );
      case "medication":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Medication</h2>
            <div className="text-gray-500 text-center py-8">Medication management coming soon</div>
          </div>
        );
      case "allergies":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Allergies</h2>
            <div className="text-gray-500 text-center py-8">Allergies management coming soon</div>
          </div>
        );
      case "labs":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Labs</h2>
            <div className="text-gray-500 text-center py-8">Lab results management coming soon</div>
          </div>
        );
      case "vitals":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vitals</h2>
            <div className="text-gray-500 text-center py-8">Vitals management coming soon</div>
          </div>
        );
      case "imaging":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Imaging</h2>
            <div className="text-gray-500 text-center py-8">Imaging management coming soon</div>
          </div>
        );
      case "family-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Family History</h2>
            <div className="text-gray-500 text-center py-8">Family history management coming soon</div>
          </div>
        );
      case "social-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Social History</h2>
            <div className="text-gray-500 text-center py-8">Social history management coming soon</div>
          </div>
        );
      case "surgical-history":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Surgical History</h2>
            <div className="text-gray-500 text-center py-8">Surgical history management coming soon</div>
          </div>
        );
      case "attachments":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Attachments</h2>
            <div className="text-gray-500 text-center py-8">Attachments management coming soon</div>
          </div>
        );
      case "appointments":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Appointments</h2>
            <div className="text-gray-500 text-center py-8">Appointments management coming soon</div>
          </div>
        );
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Patient Header */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-gray-200">
                <AvatarImage 
                  src={patient.profilePhotoFilename ? `/uploads/${patient.profilePhotoFilename}` : undefined}
                  alt={`${patient.firstName} ${patient.lastName}`}
                />
                <AvatarFallback className="text-lg bg-gray-100">
                  {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded text-[10px]">
                Upload Photo
              </button>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                DOB: {formatDate(patient.dateOfBirth)}
              </p>
              
              <div className="flex space-x-2 mt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Back to Patient List
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search patient chart..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chart Sections */}
        <div className="flex-1 overflow-y-auto">
          {chartSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.has(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div 
                  className={`flex items-center justify-between w-full p-3 text-left hover:bg-gray-100 border-b border-gray-100 ${
                    activeSection === section.id ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection(section.id);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {section.icon && <section.icon className="h-4 w-4" />}
                    <span className="font-medium text-sm">{section.label}</span>
                  </div>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {section.id === "encounters" && Array.isArray(encounters) && encounters.length > 0 && (
                  <div className="bg-white border-b border-gray-100">
                    {encounters.slice(0, 3).map((encounter: any) => (
                      <div key={encounter.id} className="p-3 text-xs text-gray-600 border-b border-gray-50 last:border-b-0">
                        <div className="font-medium">{encounter.encounterType}</div>
                        <div>{encounter.startTime ? formatDate(encounter.startTime) : 'No date'}</div>
                        <Badge variant="outline" className="mt-1 text-[10px]">{encounter.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {renderSectionContent()}
      </div>
    </div>
  );
}