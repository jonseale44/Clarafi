import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Search, Mic, MicOff, ArrowLeft, FileText } from "lucide-react";
import { Patient } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface EncounterDetailViewProps {
  patient: Patient;
  encounterId: number;
  onBackToChart: () => void;
}

const chartSections = [
  { id: "encounters", label: "Patient Encounters" },
  { id: "problems", label: "Medical Problems" },
  { id: "medication", label: "Medication" },
  { id: "allergies", label: "Allergies" },
  { id: "labs", label: "Labs" },
  { id: "vitals", label: "Vitals" },
  { id: "imaging", label: "Imaging" },
  { id: "family-history", label: "Family History" },
  { id: "social-history", label: "Social History" },
  { id: "surgical-history", label: "Surgical History" },
  { id: "attachments", label: "Attachments" },
  { id: "appointments", label: "Appointments" },
];

export function EncounterDetailView({ patient, encounterId, onBackToChart }: EncounterDetailViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["encounters"]));
  const [soapNote, setSoapNote] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [isTextMode, setIsTextMode] = useState(false);
  const { toast } = useToast();

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

  const startRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording Started",
      description: "Voice recording has begun",
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    toast({
      title: "Recording Stopped",
      description: "Processing audio...",
    });
  };

  const generateSOAPNote = () => {
    setSoapNote({
      subjective: "Patient reports chief complaint and symptoms...",
      objective: "Vital signs and physical examination findings...",
      assessment: "Clinical assessment and diagnosis...",
      plan: "Treatment plan and follow-up recommendations..."
    });
    toast({
      title: "SOAP Note Generated",
      description: "Clinical documentation has been created",
    });
  };

  const generateSmartSuggestions = () => {
    setGptSuggestions("AI-generated clinical suggestions based on the encounter...");
    toast({
      title: "Smart Suggestions Generated",
      description: "GPT analysis complete",
    });
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Patient Header */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <Avatar className="w-12 h-12 border-2 border-gray-200">
              <AvatarImage 
                src={patient.profilePhotoFilename ? `/uploads/${patient.profilePhotoFilename}` : undefined}
                alt={`${patient.firstName} ${patient.lastName}`}
              />
              <AvatarFallback className="text-sm bg-gray-100">
                {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || 'P'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                DOB: {formatDate(patient.dateOfBirth)}
              </p>
              <p className="text-sm text-blue-600">
                Encounter #{encounterId} - {formatDate(new Date().toISOString())}
              </p>
              
              <div className="flex space-x-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={onBackToChart}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to Patient Chart
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Encounter Status */}
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="text-sm">
            <div className="font-medium text-blue-900">Office Visit</div>
            <div className="text-blue-700">Encounter #{encounterId} - Type: Office Visit</div>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Scheduled
              </Badge>
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
                <div className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-100 border-b border-gray-100">
                  <span className="font-medium text-sm">{section.label}</span>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-white border-b border-gray-100 p-3 text-xs text-gray-600">
                  {section.id === "encounters" ? "Current encounter in progress" : `${section.label} content`}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Nurse Notes</h1>
            <div className="text-sm text-gray-600">
              Encounter ID: {encounterId}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            No nurse notes are available for this encounter yet.
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Voice Recording Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600">● Connected</span>
                <span className="text-xs text-gray-500">Total: 7,737 tokens (59.5%)</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Transcription: 0</span>
                    <span className="text-sm">Suggestions: 0</span>
                    <span className="text-sm">SOAP: 0</span>
                  </div>
                  <Button variant="outline" size="sm">Reset</Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTextMode(!isTextMode)}
                  className={isTextMode ? "bg-blue-100" : ""}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Text Mode
                </Button>
                
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                  {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
              </div>

              {/* Real-Time Transcription */}
              <div className="space-y-2">
                <h3 className="font-medium">Real-Time Transcription</h3>
                <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                  {transcription || (isRecording ? "Listening..." : "Transcription will appear here during recording")}
                </div>
              </div>
            </div>
          </Card>

          {/* GPT Suggestions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">GPT Suggestions</h2>
              <Button onClick={generateSmartSuggestions} size="sm" variant="outline">
                Generate Suggestions
              </Button>
            </div>
            <div className="text-gray-500 text-sm">
              {gptSuggestions || "GPT analysis will appear here..."}
            </div>
          </Card>

          {/* SOAP Note */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">SOAP Note</h2>
              <div className="flex space-x-2">
                <Button onClick={generateSOAPNote} size="sm" variant="outline" className="text-pink-600 border-pink-300">
                  Smart Suggestions
                </Button>
                <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white">
                  Sign & Save
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">• Drug info</label>
                <Textarea
                  value={soapNote.subjective}
                  onChange={(e) => setSoapNote(prev => ({ ...prev, subjective: e.target.value }))}
                  placeholder="Loading existing note content..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </Card>

          {/* Draft Orders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Draft Orders</h2>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No draft orders</div>
              <div className="text-xs mt-1">Create a new order using the button above</div>
            </div>
          </Card>

          {/* CPT Codes & Diagnoses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">CPT Codes & Diagnoses</h2>
            </div>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No billing codes or diagnoses yet</div>
              <div className="text-xs mt-1">Complete a recording to generate codes</div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-green-600">● Connected</span>
                <span className="text-gray-500">Total: 7,737 tokens (59.5%)</span>
                <span className="text-gray-500">Transcription: 0</span>
                <span className="text-gray-500">Suggestions: 0</span>
                <span className="text-gray-500">SOAP: 0</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2">Reset</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}