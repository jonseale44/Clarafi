import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Square, Activity, Edit2, Save } from "lucide-react";

interface NursingTemplateData {
  cc: string; // Chief Complaint
  hpi: string; // History of Present Illness
  pmh: string; // Past Medical History
  meds: string; // Medications
  allergies: string; // Allergies
  famHx: string; // Family History
  soHx: string; // Social History
  psh: string; // Past Surgical History
  ros: string; // Review of Systems
  vitals: string; // Vital Signs
}

interface NursingTemplateAssessmentProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onTemplateUpdate: (template: NursingTemplateData) => void;
  autoStart?: boolean;
}

export interface NursingTemplateRef {
  startTemplateAssessment: () => void;
  stopTemplateAssessment: () => void;
  getCurrentTemplate: () => NursingTemplateData;
  saveTemplate: () => void;
}

export const NursingTemplateAssessment = forwardRef<NursingTemplateRef, NursingTemplateAssessmentProps>(({
  patientId,
  encounterId,
  isRecording,
  transcription,
  onTemplateUpdate,
  autoStart = false
}, ref) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<NursingTemplateData>({
    cc: "",
    hpi: "",
    pmh: "",
    meds: "",
    allergies: "",
    famHx: "",
    soHx: "",
    psh: "",
    ros: "",
    vitals: ""
  });

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(`nursing_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const lastTranscriptionRef = useRef("");
  const { toast } = useToast();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startTemplateAssessment,
    stopTemplateAssessment,
    getCurrentTemplate: () => templateData,
    saveTemplate,
  }));

  // Auto-start when recording begins
  useEffect(() => {
    if (autoStart && isRecording && !isActive) {
      startTemplateAssessment();
    } else if (!isRecording && isActive) {
      stopTemplateAssessment();
    }
  }, [isRecording, autoStart]);

  // Process new transcription when it changes
  useEffect(() => {
    if (isActive && transcription !== lastTranscriptionRef.current && transcription.trim()) {
      processTranscriptionUpdate(transcription);
      lastTranscriptionRef.current = transcription;
    }
  }, [transcription, isActive]);

  const startTemplateAssessment = async () => {
    if (isActive) return;

    console.log(`🏥 [NursingTemplate] Starting template assessment for session ${sessionIdRef.current}`);
    
    try {
      // Connect to OpenAI Realtime API
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", [
        "realtime",
        "openai-insecure-api-key." + apiKey,
      ]);

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🌐 [NursingTemplate] Connected to OpenAI Realtime API");
        setIsConnected(true);
        setIsActive(true);

        // Configure session for nursing template extraction
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text"],
            instructions: `You are a nursing documentation assistant that extracts structured information from patient conversations.

INSTRUCTIONS:
- Listen to patient-nurse conversations and extract relevant information for nursing assessment fields
- Only provide information that is explicitly mentioned or clearly implied in the conversation
- Return updates in JSON format with only the fields that have new information
- Be concise and professional in your responses
- Do not make assumptions or add information not mentioned

TEMPLATE FIELDS:
- cc: Chief Complaint (main reason for visit)
- hpi: History of Present Illness (timeline, symptoms, characteristics)
- pmh: Past Medical History (previous diagnoses, conditions)
- meds: Current Medications (names, dosages, frequency)
- allergies: Known Allergies (medications, foods, environmental)
- famHx: Family History (genetic predispositions, family medical conditions)
- soHx: Social History (smoking, alcohol, occupation, living situation)
- psh: Past Surgical History (previous surgeries, procedures)
- ros: Review of Systems (systematic symptom review)
- vitals: Vital Signs (BP, HR, temp, resp rate, O2 sat, pain score)

RESPONSE FORMAT:
Always respond with valid JSON containing only fields with new information:
{"cc": "stomach pain", "vitals": "BP 140/90, HR 85"}

Do not include fields that have no new information.`,
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: false
            },
            input_audio_transcription: {
              model: "whisper-1"
            }
          }
        }));

        toast({
          title: "Template Assessment Started",
          description: "Nursing template will update automatically during conversation",
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleRealtimeMessage(message);
        } catch (error) {
          console.error("❌ [NursingTemplate] Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ [NursingTemplate] WebSocket error:", error);
        setIsConnected(false);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to template assessment service",
        });
      };

      ws.onclose = (event) => {
        console.log("🔌 [NursingTemplate] WebSocket closed:", event.code, event.reason);
        setIsActive(false);
        setIsConnected(false);
      };

    } catch (error) {
      console.error("❌ [NursingTemplate] Error starting template assessment:", error);
      setIsActive(false);
      setIsConnected(false);
      
      toast({
        variant: "destructive",
        title: "Assessment Failed",
        description: "Failed to start template assessment",
      });
    }
  };

  const stopTemplateAssessment = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsActive(false);
    setIsConnected(false);

    console.log(`🛑 [NursingTemplate] Template assessment stopped for session ${sessionIdRef.current}`);
    
    toast({
      title: "Template Assessment Stopped",
      description: "Nursing template assessment has been finalized",
    });
  };

  const processTranscriptionUpdate = (newTranscription: string) => {
    if (!wsRef.current || !isConnected) return;

    console.log(`📝 [NursingTemplate] Processing transcription update`);
    
    // Send transcription to OpenAI for field extraction
    wsRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "text",
          text: `Extract nursing assessment information from this conversation transcript. Only include fields with new information:\n\n${newTranscription}`
        }]
      }
    }));

    wsRef.current.send(JSON.stringify({
      type: "response.create"
    }));
  };

  const handleRealtimeMessage = (message: any) => {
    switch (message.type) {
      case "session.created":
        console.log("✅ [NursingTemplate] Session created successfully");
        break;

      case "session.updated":
        console.log("✅ [NursingTemplate] Session updated successfully");
        break;

      case "response.text.delta":
        // Accumulate text deltas for complete response
        break;

      case "response.text.done":
        try {
          const content = message.text;
          console.log("📝 [NursingTemplate] Received template update:", content);
          
          // Parse the JSON response and update template fields
          const updates = JSON.parse(content);
          updateTemplateFields(updates);
        } catch (error) {
          console.error("❌ [NursingTemplate] Error parsing template updates:", error);
        }
        break;

      case "error":
        console.error("❌ [NursingTemplate] OpenAI error:", message);
        toast({
          variant: "destructive",
          title: "AI Processing Error",
          description: message.error?.message || "Unknown error occurred",
        });
        break;

      default:
        console.log(`📊 [NursingTemplate] Unhandled message type: ${message.type}`);
    }
  };

  const updateTemplateFields = (updates: Partial<NursingTemplateData>) => {
    setTemplateData(prev => {
      const newData = { ...prev, ...updates };
      onTemplateUpdate(newData);
      return newData;
    });

    // Show which fields were updated
    const updatedFields = Object.keys(updates);
    if (updatedFields.length > 0) {
      toast({
        title: "Template Updated",
        description: `Updated: ${updatedFields.join(', ')}`,
      });
    }
  };

  const handleFieldEdit = (field: keyof NursingTemplateData, value: string) => {
    setTemplateData(prev => {
      const newData = { ...prev, [field]: value };
      onTemplateUpdate(newData);
      return newData;
    });
  };

  const saveTemplate = async () => {
    try {
      const response = await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nurseAssessment: JSON.stringify(templateData, null, 2)
        }),
      });

      if (!response.ok) throw new Error("Failed to save template");

      toast({
        title: "Template Saved",
        description: "Nursing assessment template saved successfully",
      });
    } catch (error) {
      console.error("❌ [NursingTemplate] Error saving template:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save nursing template",
      });
    }
  };

  const fieldLabels = {
    cc: "Chief Complaint",
    hpi: "History of Present Illness",
    pmh: "Past Medical History",
    meds: "Medications",
    allergies: "Allergies",
    famHx: "Family History",
    soHx: "Social History",
    psh: "Past Surgical History",
    ros: "Review of Systems",
    vitals: "Vital Signs"
  };

  return (
    <Card className="p-6 border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Nursing Assessment Template</h3>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Live
            </Badge>
          )}
          <Button
            onClick={isActive ? stopTemplateAssessment : startTemplateAssessment}
            size="sm"
            variant={isActive ? "destructive" : "default"}
            className="h-8"
          >
            {isActive ? (
              <>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Start
              </>
            )}
          </Button>
          <Button
            onClick={saveTemplate}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs text-blue-600 p-2 bg-blue-100 rounded">
          Template fields will be automatically filled as information is discussed during the patient encounter.
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Object.entries(fieldLabels).map(([field, label]) => (
            <div key={field} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {label}:
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setEditingField(editingField === field ? null : field)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              
              {editingField === field ? (
                <Textarea
                  value={templateData[field as keyof NursingTemplateData]}
                  onChange={(e) => handleFieldEdit(field as keyof NursingTemplateData, e.target.value)}
                  onBlur={() => setEditingField(null)}
                  className="min-h-[60px] text-sm"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  autoFocus
                />
              ) : (
                <div 
                  className="min-h-[60px] p-3 bg-white border rounded-md text-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => setEditingField(field)}
                >
                  {templateData[field as keyof NursingTemplateData] || (
                    <span className="text-gray-400 italic">
                      {`${label} will be filled automatically...`}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Status: {isActive ? (isConnected ? "Active" : "Connecting...") : "Inactive"}</span>
          <span>{Object.values(templateData).filter(v => v.trim()).length}/10 fields completed</span>
        </div>
      </div>
    </Card>
  );
});

NursingTemplateAssessment.displayName = "NursingTemplateAssessment";