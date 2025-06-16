/**
 * Real-time SOAP Template Component
 * 
 * Updates SOAP sections incrementally during conversation like nursing template system
 * Eliminates the post-recording bottleneck by streaming updates in real-time
 */

import React, { 
  useState, 
  useRef, 
  useEffect, 
  useImperativeHandle, 
  forwardRef 
} from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Play, 
  Square, 
  Save, 
  FileText,
  Edit3
} from 'lucide-react';

export interface SOAPTemplateData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface RealtimeSOAPTemplateProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onSOAPUpdate: (soap: SOAPTemplateData) => void;
  onFullSOAPGenerated: (soapNote: string) => void;
  autoStart?: boolean;
}

export interface RealtimeSOAPTemplateRef {
  startRealtimeSOAP: () => void;
  stopRealtimeSOAP: () => void;
  getCurrentSOAP: () => SOAPTemplateData;
  generateFullSOAP: () => void;
  saveSOAP: () => void;
}

export const RealtimeSOAPTemplate = forwardRef<
  RealtimeSOAPTemplateRef,
  RealtimeSOAPTemplateProps
>(
  (
    {
      patientId,
      encounterId,
      isRecording,
      transcription,
      onSOAPUpdate,
      onFullSOAPGenerated,
      autoStart = false,
    },
    ref,
  ) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [isGeneratingFull, setIsGeneratingFull] = useState(false);

    const [soapData, setSOAPData] = useState<SOAPTemplateData>({
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    });

    const wsRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string>(
      `realtime_soap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );
    const lastTranscriptionRef = useRef("");
    const { toast } = useToast();

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      startRealtimeSOAP,
      stopRealtimeSOAP,
      getCurrentSOAP: () => soapData,
      generateFullSOAP,
      saveSOAP,
    }));

    const startRealtimeSOAP = async () => {
      if (isActive) return;

      console.log(
        `🩺 [RealtimeSOAP] Starting real-time SOAP generation for session ${sessionIdRef.current}`,
      );

      try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        // Step 1: Create session for real-time SOAP extraction
        console.log("🔧 [RealtimeSOAP] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview",
          modalities: ["text"],
          instructions: `You are a medical documentation assistant that extracts SOAP note sections from patient-provider conversations in real-time.

INSTRUCTIONS:
- Listen to patient-provider conversations and extract information for SOAP note sections
- Only provide information that is explicitly mentioned or clearly implied in the conversation
- Return updates in JSON format with only the sections that have new information
- Be concise and professional in your clinical documentation
- Do not make assumptions or add information not mentioned

SOAP SECTIONS:
- subjective: Patient's reported symptoms, concerns, history (what patient says)
- objective: Observable findings, vital signs, physical exam findings (what provider observes)
- assessment: Clinical impressions, diagnoses, differential diagnoses
- plan: Treatment plans, orders, follow-up instructions

RESPONSE FORMAT:
Always respond with valid JSON containing only sections with new information:
{"subjective": "Patient reports...", "objective": "Vital signs: BP 140/90..."}

Only include sections that have new information from the conversation.`,
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.3,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          },
        };

        const sessionResponse = await fetch(
          "https://api.openai.com/v1/realtime/sessions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
            body: JSON.stringify(sessionConfig),
          },
        );

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          console.log("❌ [RealtimeSOAP] Session creation failed:", error);
          throw new Error(
            `Failed to create session: ${error.message || "Unknown error"}`,
          );
        }

        const session = await sessionResponse.json();
        console.log("✅ [RealtimeSOAP] Session created:", session.id);

        // Step 2: Connect via WebSocket
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview",
        });

        const ws = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        wsRef.current = ws;

        ws.onopen = () => {
          console.log("🌐 [RealtimeSOAP] Connected to OpenAI Realtime API");
          setIsConnected(true);
          setIsActive(true);

          // Configure session for SOAP extraction
          const sessionUpdateMessage = {
            type: "session.update",
            session: {
              instructions: `You are a medical documentation assistant that extracts SOAP note sections from patient-provider conversations in real-time.

INSTRUCTIONS:
- Listen to patient-provider conversations and extract information for SOAP note sections
- Only provide information that is explicitly mentioned or clearly implied in the conversation
- Return updates in JSON format with only the sections that have new information
- Be concise and professional in your clinical documentation
- Do not make assumptions or add information not mentioned

SOAP SECTIONS:
- subjective: Patient's reported symptoms, concerns, history (what patient says)
- objective: Observable findings, vital signs, physical exam findings (what provider observes)  
- assessment: Clinical impressions, diagnoses, differential diagnoses
- plan: Treatment plans, orders, follow-up instructions

RESPONSE FORMAT:
Always respond with valid JSON containing only sections with new information:
{"subjective": "Patient reports...", "objective": "Vital signs: BP 140/90..."}

Only include sections that have new information from the conversation.`,
              modalities: ["text"],
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
                language: "en",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 200,
                create_response: true,
              },
            },
          };

          ws.send(JSON.stringify(sessionUpdateMessage));

          toast({
            title: "Real-time SOAP Started",
            description: "SOAP sections will update automatically during conversation",
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleRealtimeMessage(message);
          } catch (error) {
            console.error(
              "❌ [RealtimeSOAP] Error parsing WebSocket message:",
              error,
            );
          }
        };

        ws.onerror = (error) => {
          console.error("❌ [RealtimeSOAP] WebSocket error:", error);
          setIsConnected(false);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to real-time SOAP service",
          });
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 [RealtimeSOAP] WebSocket closed:",
            event.code,
            event.reason,
          );
          setIsActive(false);
          setIsConnected(false);
        };
      } catch (error) {
        console.error(
          "❌ [RealtimeSOAP] Error starting real-time SOAP:",
          error,
        );
        setIsActive(false);
        setIsConnected(false);

        toast({
          variant: "destructive",
          title: "SOAP Generation Failed",
          description: "Failed to start real-time SOAP generation",
        });
      }
    };

    const stopRealtimeSOAP = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsActive(false);
      setIsConnected(false);

      console.log(
        `🛑 [RealtimeSOAP] Real-time SOAP stopped for session ${sessionIdRef.current}`,
      );

      toast({
        title: "Real-time SOAP Stopped",
        description: "SOAP generation has been finalized",
      });
    };

    const processTranscriptionUpdate = (newTranscription: string) => {
      if (!wsRef.current || !isConnected) return;

      console.log(`📝 [RealtimeSOAP] Processing transcription update`);

      // Send transcription to OpenAI for SOAP section extraction
      const contextMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Extract SOAP note sections from this conversation transcript. Only include sections with new information:\n\n${newTranscription}`,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(contextMessage));

      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: `Extract SOAP note data from the conversation and return as JSON with only populated sections. Use this exact format:
{"subjective": "value", "objective": "value", "assessment": "value", "plan": "value"}

Only include sections that have information mentioned in the conversation.`,
        },
      };

      wsRef.current.send(JSON.stringify(responseRequest));
    };

    const handleRealtimeMessage = (message: any) => {
      console.log(`📨 [RealtimeSOAP] OpenAI message type: ${message.type}`);

      switch (message.type) {
        case "session.created":
          console.log("✅ [RealtimeSOAP] Session created successfully");
          break;

        case "response.text.delta":
          // Handle streaming text responses
          const deltaText = message.delta || "";
          console.log("📝 [RealtimeSOAP] Received text delta:", deltaText);
          break;

        case "response.text.done":
          // Complete response received - parse SOAP sections
          const responseText = message.text || "";
          console.log("✅ [RealtimeSOAP] Complete response:", responseText);
          
          try {
            // Try to parse JSON response
            const soapUpdate = JSON.parse(responseText);
            updateSOAPSections(soapUpdate);
          } catch (error) {
            console.warn("⚠️ [RealtimeSOAP] Failed to parse JSON response, treating as text");
            // If not JSON, try to extract sections from text
            parseTextResponseToSOAP(responseText);
          }
          break;

        case "error":
          console.error("❌ [RealtimeSOAP] OpenAI error:", message.error);
          toast({
            variant: "destructive",
            title: "SOAP Generation Error",
            description: message.error?.message || "Unknown error occurred",
          });
          break;

        default:
          console.log(`📨 [RealtimeSOAP] Unhandled message type: ${message.type}`);
      }
    };

    const updateSOAPSections = (updates: Partial<SOAPTemplateData>) => {
      console.log("🔄 [RealtimeSOAP] Updating SOAP sections:", updates);

      setSOAPData(prev => {
        const newData = { ...prev };
        let hasUpdates = false;

        // Update each section if new data is provided
        if (updates.subjective && updates.subjective !== prev.subjective) {
          newData.subjective = updates.subjective;
          hasUpdates = true;
        }
        if (updates.objective && updates.objective !== prev.objective) {
          newData.objective = updates.objective;
          hasUpdates = true;
        }
        if (updates.assessment && updates.assessment !== prev.assessment) {
          newData.assessment = updates.assessment;
          hasUpdates = true;
        }
        if (updates.plan && updates.plan !== prev.plan) {
          newData.plan = updates.plan;
          hasUpdates = true;
        }

        if (hasUpdates) {
          console.log("✅ [RealtimeSOAP] SOAP sections updated");
          onSOAPUpdate(newData);
        }

        return newData;
      });
    };

    const parseTextResponseToSOAP = (text: string) => {
      // Fallback parsing if JSON parsing fails
      const updates: Partial<SOAPTemplateData> = {};

      if (text.toLowerCase().includes("subjective")) {
        const match = text.match(/subjective[:\s]+(.*?)(?=objective|assessment|plan|$)/is);
        if (match) updates.subjective = match[1].trim();
      }

      if (text.toLowerCase().includes("objective")) {
        const match = text.match(/objective[:\s]+(.*?)(?=assessment|plan|$)/is);
        if (match) updates.objective = match[1].trim();
      }

      if (text.toLowerCase().includes("assessment")) {
        const match = text.match(/assessment[:\s]+(.*?)(?=plan|$)/is);
        if (match) updates.assessment = match[1].trim();
      }

      if (text.toLowerCase().includes("plan")) {
        const match = text.match(/plan[:\s]+(.*?)$/is);
        if (match) updates.plan = match[1].trim();
      }

      if (Object.keys(updates).length > 0) {
        updateSOAPSections(updates);
      }
    };

    const generateFullSOAP = async () => {
      setIsGeneratingFull(true);
      
      try {
        // Combine all sections into a full SOAP note
        const fullSOAP = `**SUBJECTIVE:**
${soapData.subjective || "No subjective data recorded."}

**OBJECTIVE:**
${soapData.objective || "No objective data recorded."}

**ASSESSMENT:**
${soapData.assessment || "No assessment recorded."}

**PLAN:**
${soapData.plan || "No plan recorded."}`;

        onFullSOAPGenerated(fullSOAP);
        
        toast({
          title: "SOAP Note Generated",
          description: "Full SOAP note has been compiled from real-time sections",
        });
      } catch (error) {
        console.error("❌ [RealtimeSOAP] Error generating full SOAP:", error);
        toast({
          variant: "destructive",
          title: "Generation Failed", 
          description: "Failed to generate full SOAP note",
        });
      } finally {
        setIsGeneratingFull(false);
      }
    };

    const saveSOAP = async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}/soap-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(soapData),
          credentials: "include",
        });

        if (response.ok) {
          toast({
            title: "SOAP Template Saved",
            description: "Real-time SOAP sections have been saved successfully",
          });
        } else {
          throw new Error("Failed to save SOAP template");
        }
      } catch (error) {
        console.error("❌ [RealtimeSOAP] Error saving SOAP:", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save SOAP template",
        });
      }
    };

    // Process transcription updates when they change
    useEffect(() => {
      if (transcription && transcription !== lastTranscriptionRef.current) {
        lastTranscriptionRef.current = transcription;
        if (isActive && transcription.length > 50) {
          processTranscriptionUpdate(transcription);
        }
      }
    }, [transcription, isActive]);

    // Auto-start when recording begins
    useEffect(() => {
      if (autoStart && isRecording && !isActive) {
        startRealtimeSOAP();
      } else if (!isRecording && isActive) {
        stopRealtimeSOAP();
      }
    }, [isRecording, autoStart]);

    const sectionLabels = {
      subjective: "Subjective (S)",
      objective: "Objective (O)", 
      assessment: "Assessment (A)",
      plan: "Plan (P)",
    };

    return (
      <Card className="p-6 border-blue-200 bg-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Real-time SOAP Template
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Live
              </Badge>
            )}
            <Button
              onClick={isActive ? stopRealtimeSOAP : startRealtimeSOAP}
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
              onClick={generateFullSOAP}
              size="sm"
              variant="outline"
              className="h-8"
              disabled={isGeneratingFull}
            >
              {isGeneratingFull ? (
                <>
                  <Activity className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Generate Full
                </>
              )}
            </Button>
            <Button
              onClick={saveSOAP}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(soapData).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {sectionLabels[key as keyof SOAPTemplateData]}
                </label>
                <Button
                  onClick={() => setEditingSection(editingSection === key ? null : key)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === key ? (
                <Textarea
                  value={value}
                  onChange={(e) => {
                    const newData = { ...soapData, [key]: e.target.value };
                    setSOAPData(newData);
                    onSOAPUpdate(newData);
                  }}
                  onBlur={() => setEditingSection(null)}
                  className="min-h-[100px] text-sm"
                  placeholder={`Enter ${key} information...`}
                  autoFocus
                />
              ) : (
                <div className="border rounded-md p-3 min-h-[100px] bg-white text-sm whitespace-pre-wrap">
                  {value || (
                    <span className="text-gray-400 italic">
                      {isConnected ? "Listening for " + key + " information..." : `No ${key} data yet`}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  },
);

RealtimeSOAPTemplate.displayName = "RealtimeSOAPTemplate";