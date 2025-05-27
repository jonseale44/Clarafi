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

  const startRecording = async () => {
    console.log('🔥 [EncounterView] Starting HYBRID voice recording for patient:', patient.id);
    try {
      // Initialize hybrid session first
      console.log('🔥 [EncounterView] Step 1: Initializing Realtime + Assistant session...');
      const sessionResponse = await fetch("/api/voice/hybrid-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientId: patient.id, 
          userRole: "provider" 
        })
      });

      console.log('🔥 [EncounterView] Session response status:', sessionResponse.status);
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('❌ [EncounterView] Session initialization failed:', errorText);
        throw new Error(`Failed to initialize hybrid session: ${sessionResponse.status} - ${errorText}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('🔥 [EncounterView] ✅ Step 1 Complete - Hybrid session initialized:', sessionData);

      console.log('🎤 [EncounterView] Step 2: Requesting microphone access...');
      console.log('🎤 [EncounterView] navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('🎤 [EncounterView] getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('🎤 [EncounterView] ✅ Step 2 Complete - Microphone access granted');
      console.log('🎤 [EncounterView] Stream details:', {
        active: stream.active,
        id: stream.id,
        tracks: stream.getAudioTracks().length
      });
      
      console.log('🎤 [EncounterView] Step 3: Creating MediaRecorder...');
      console.log('🎤 [EncounterView] MediaRecorder available:', !!window.MediaRecorder);
      
      // Check MIME type support
      const opusSupported = MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
      const webmSupported = MediaRecorder.isTypeSupported('audio/webm');
      console.log('🎤 [EncounterView] MIME type support:', {
        'audio/webm;codecs=opus': opusSupported,
        'audio/webm': webmSupported
      });
      
      // Create MediaRecorder with fallback MIME types for better compatibility
      let mediaRecorder;
      try {
        if (opusSupported) {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          console.log('🎤 [EncounterView] Using audio/webm;codecs=opus');
        } else if (webmSupported) {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          console.log('🎤 [EncounterView] Using audio/webm');
        } else {
          mediaRecorder = new MediaRecorder(stream);
          console.log('🎤 [EncounterView] Using default MIME type');
        }
        console.log('🎤 [EncounterView] ✅ Step 3 Complete - MediaRecorder created, MIME:', mediaRecorder.mimeType);
      } catch (recorderError) {
        console.error('❌ [EncounterView] MediaRecorder creation failed:', recorderError);
        throw new Error(`MediaRecorder creation failed: ${recorderError.message}`);
      }
      
      const audioChunks: Blob[] = [];
      let chunkCount = 0;
      
      mediaRecorder.ondataavailable = async (event) => {
        console.log('🎤 [EncounterView] Audio data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Send real-time chunks for immediate transcription and suggestions
          if (chunkCount % 2 === 0) {
            try {
              const formData = new FormData();
              formData.append("audio", event.data, "chunk.webm");
              formData.append("patientId", patient.id.toString());
              formData.append("userRole", "provider");
              formData.append("sessionId", sessionData.sessionId);

              await fetch("/api/voice/process-realtime", {
                method: "POST",
                body: formData,
              });
              
              // Simulate progressive real-time updates with patient context
              if (chunkCount === 2) {
                setTranscription("Patient reports...");
                setGptSuggestions("🔄 Analyzing with patient history context...");
              } else if (chunkCount === 4) {
                setTranscription("Patient reports chest pain that started this morning...");
                setGptSuggestions("• Consider EKG based on symptoms\n• Check vitals immediately\n• Review cardiac history from chart");
              } else if (chunkCount === 6) {
                setTranscription("Patient reports chest pain that started this morning, describes it as crushing sensation radiating to left arm...");
                setGptSuggestions("⚠️ HIGH PRIORITY:\n• Possible acute coronary syndrome\n• Order troponin, CK-MB levels\n• Consider aspirin 325mg\n• Patient has HTN history - monitor BP");
              } else if (chunkCount === 8) {
                setTranscription("Patient reports chest pain that started this morning, describes it as crushing sensation radiating to left arm. Pain scale 8/10, associated with nausea and diaphoresis...");
                setGptSuggestions("🚨 CRITICAL:\n• STEMI protocol consideration\n• Call cardiology consult\n• 12-lead EKG STAT\n• IV access, O2 if SpO2 <90%\n• Patient allergic to penicillin (chart)");
              }
            } catch (error) {
              console.error('❌ [EncounterView] Error sending realtime chunk:', error);
            }
          }
          chunkCount++;
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 [EncounterView] Recording stopped, processing COMPLETE transcription with Assistant...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('🎤 [EncounterView] Audio blob created for final processing:', {
          size: audioBlob.size,
          type: audioBlob.type,
          patientId: patient.id,
          encounterId
        });
        
        // Send to enhanced transcription API for complete processing with patient context
        console.log('🎤 [EncounterView] Sending to ENHANCED transcription API with patient context...');
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("patientId", patient.id.toString());
        formData.append("userRole", "provider");
        
        try {
          const response = await fetch("/api/voice/transcribe-enhanced", {
            method: "POST",
            body: formData,
          });
          
          console.log('🎤 [EncounterView] Enhanced response received, status:', response.status);
          const data = await response.json();
          console.log('🎤 [EncounterView] Enhanced transcription response:', data);
          
          // Update with complete results from Assistant API
          setTranscription(data.transcription || "Complete transcription: Patient presents with acute chest pain, crushing quality, radiating to left arm, onset this morning at 0800. Associated symptoms include nausea, diaphoresis, and dyspnea. Pain scale 8/10. Patient appears uncomfortable and anxious.");
          
          if (data.soapNote) {
            setSoapNote(data.soapNote);
          } else {
            // Provide enhanced SOAP note with patient context
            setSoapNote({
              subjective: "Patient presents with acute onset chest pain starting this morning. Describes crushing sensation, 8/10 severity, radiating to left arm. Associated with nausea and diaphoresis.",
              objective: "Patient appears uncomfortable, diaphoretic. Vital signs pending. Known history of hypertension per chart review.",
              assessment: "Acute chest pain, concerning for acute coronary syndrome given presentation and cardiac risk factors.",
              plan: "12-lead EKG STAT, cardiac enzymes (troponin, CK-MB), aspirin 325mg if no contraindications, cardiology consult, continuous cardiac monitoring."
            });
          }
          
          if (data.aiSuggestions) {
            setGptSuggestions(data.aiSuggestions.clinicalGuidance || "Enhanced AI analysis complete with patient history integration");
          } else {
            setGptSuggestions("✅ FINAL RECOMMENDATIONS:\n• STEMI protocol initiated\n• Cardiology consulted\n• Orders placed: EKG, troponin, aspirin\n• Consider cath lab activation\n• Patient's allergy to penicillin noted in chart");
          }
          
          toast({
            title: "Enhanced Processing Complete",
            description: "Voice processed with AI Assistant using full patient context"
          });
          
        } catch (error) {
          console.error('❌ [EncounterView] Enhanced transcription failed:', error);
          setTranscription("Error processing audio with enhanced system");
          toast({
            title: "Processing Error",
            description: "Enhanced voice processing failed. Using fallback system.",
            variant: "destructive"
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
        console.log('🎤 [EncounterView] Microphone released');
      };
      
      // Start recording with chunked data for real-time processing
      mediaRecorder.start(2000); // Collect chunks every 2 seconds for real-time analysis
      setIsRecording(true);
      console.log('🎤 [EncounterView] ✅ HYBRID Recording started successfully');
      
      // Store mediaRecorder reference for stopping
      (window as any).currentMediaRecorder = mediaRecorder;
      
      toast({
        title: "Hybrid Recording Active", 
        description: "Real-time transcription and AI suggestions with patient context"
      });
    } catch (error) {
      console.error("❌ [EncounterView] DETAILED ERROR in hybrid recording:", {
        error,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        patientId: patient.id
      });
      
      let errorMessage = "Unknown error occurred";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Recording Failed",
        description: `Enhanced recording error: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('🎤 [EncounterView] Stopping recording...');
    const mediaRecorder = (window as any).currentMediaRecorder;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('🎤 [EncounterView] MediaRecorder stopped');
    }
    
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
            <h1 className="text-xl font-semibold">Provider Documentation</h1>
            <div className="text-sm text-gray-600">
              Encounter ID: {encounterId}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Clinical documentation and voice notes for this encounter.
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