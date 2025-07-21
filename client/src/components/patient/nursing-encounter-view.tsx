import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mic,
  MicOff,
  Save,
  FileText,
  Heart,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Stethoscope,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSharedRealtimeService } from "@/utils/shared-realtime-service";
import { SharedChartSections } from "@/components/patient/shared-chart-sections";
import { UnifiedChartPanel } from "@/components/patient/unified-chart-panel";
import {
  RealtimeSOAPIntegration,
  RealtimeSOAPRef,
} from "@/components/RealtimeSOAPIntegration";

import {
  NursingTemplateAssessment,
  NursingTemplateRef,
} from "@/components/NursingTemplateAssessment";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { NursingRecordingPanel } from "@/components/NursingRecordingPanel";

interface NursingTemplateData {
  cc: string;
  hpi: string;
  pmh: string;
  meds: string;
  allergies: string;
  famHx: string;
  soHx: string;
  psh: string;
  ros: string;
  vitals: string;
}
import type { Patient, User as UserType, Encounter } from "@shared/schema";

interface NursingEncounterViewProps {
  patient: Patient;
  encounterId: number;
  onBackToChart: () => void;
}

const nursingChartSections = [
  { id: "encounters", label: "Patient Encounters" },
  { id: "problems", label: "Medical Problems" },
  { id: "medication", label: "Medication" },
  { id: "allergies", label: "Allergies" },
  { id: "vitals", label: "Vitals" },
  { id: "labs", label: "Labs" },
  { id: "imaging", label: "Imaging" },
  { id: "documents", label: "Patient Documents" },
  { id: "family-history", label: "Family History" },
  { id: "social-history", label: "Social History" },
  { id: "surgical-history", label: "Surgical History" },
  { id: "attachments", label: "Attachments" },
  { id: "appointments", label: "Appointments" },
  { id: "nursing-assessments", label: "Nursing Assessments" },
  { id: "care-plans", label: "Care Plans" },
];

export function NursingEncounterView({
  patient,
  encounterId,
  onBackToChart,
}: NursingEncounterViewProps) {
  console.log("🩺 [NursingEncounterView] Component initialized with:", {
    patientId: patient?.id,
    encounterId,
    patientName: patient?.firstName + " " + patient?.lastName,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  
  console.log("🩺 [NursingEncounterView] Auth state:", {
    user: user?.username,
    role: user?.role,
    authLoading,
  });

  // State management - simplified with single transcription source
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState("");
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0);
  const [suggestionsBuffer, setSuggestionsBuffer] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
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
    vitals: "",
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["encounters"]),
  );
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [useRestAPI] = useState(true); // Default to REST API for manual triggering
  const [userEditingLock, setUserEditingLock] = useState(false);
  const [recordingCooldown, setRecordingCooldown] = useState(false);
  const [soapNote, setSoapNote] = useState("");
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [cptCodesData, setCptCodesData] = useState(null);

  const nursingTemplateRef = useRef<NursingTemplateRef>(null);
  const realtimeSOAPRef = useRef<RealtimeSOAPRef>(null);
  const suggestionDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Get current user for role-based functionality
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  }) as { data?: { role?: string } };

  // Get encounter data
  const { data: encounter, isLoading } = useQuery<Encounter>({
    queryKey: [`/api/encounters/${encounterId}`],
    enabled: !!encounterId,
  });
  
  console.log("🩺 [NursingEncounterView] Encounter state:", {
    encounter: encounter?.id,
    isLoading,
    encounterId,
    status: encounter?.encounterStatus,
  });

  // Removed legacy deduplication code - no longer needed with proper event handling

  // MISSING: Add the startSuggestionsConversation function from provider view
  const startSuggestionsConversation = async (
    ws: WebSocket | null,
    patientData: any,
  ) => {
    if (!ws) return;

    console.log("[NursingView] Starting AI suggestions conversation");

    // 1. Fetch full patient chart data like external implementation
    let patientChart = null;
    try {
      console.log(
        "[NursingView] Fetching patient chart data for context injection",
      );
      const chartResponse = await fetch(
        `/api/patients/${patientData.id}/chart`,
      );
      if (chartResponse.ok) {
        patientChart = await chartResponse.json();
        console.log("[NursingView] Patient chart data fetched successfully");
      } else {
        console.warn(
          "[NursingView] Failed to fetch patient chart, continuing without context",
        );
      }
    } catch (error) {
      console.error("[NursingView] Error fetching patient chart:", error);
    }

    // 2. Build comprehensive patient context with enhanced chart sections for nursing AI
    const patientContext = `Patient: ${patientData.firstName} ${patientData.lastName}
Age: ${patientData.dateOfBirth ? new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear() : "Unknown"}
Gender: ${patientData.gender || "Unknown"}
MRN: ${patientData.mrn || "Unknown"}

${
  patientChart
    ? `
MEDICAL PROBLEMS:
${patientChart.medicalProblems?.length > 0 
  ? patientChart.medicalProblems.map((p: any) => `- ${p.problemTitle} (${p.problemStatus})`).join("\n")
  : "- No active medical problems documented"
}

CURRENT MEDICATIONS:
${patientChart.currentMedications?.length > 0 
  ? patientChart.currentMedications.map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`).join("\n")
  : "- No current medications documented"
}

ALLERGIES:
${patientChart.allergies?.length > 0 
  ? patientChart.allergies.map((a: any) => `- ${a.allergen}: ${a.reaction} (${a.severity})`).join("\n")
  : "- NKDA (No Known Drug Allergies)"
}

RECENT VITALS:
${patientChart.vitals?.length > 0 
  ? `- BP: ${patientChart.vitals[0].systolic}/${patientChart.vitals[0].diastolic} mmHg
- HR: ${patientChart.vitals[0].heartRate} bpm
- Temp: ${patientChart.vitals[0].temperature}°F
- RR: ${patientChart.vitals[0].respiratoryRate || "Not recorded"}
- O2 Sat: ${patientChart.vitals[0].oxygenSaturation || "Not recorded"}%`
  : "- No recent vitals available"
}

FAMILY HISTORY:
${patientChart.familyHistory?.length > 0
  ? patientChart.familyHistory.map((fh: any) => `- ${fh.relationship}: ${fh.condition}`).join("\n")
  : "- No significant family history documented"
}

SOCIAL HISTORY:
${patientChart.socialHistory?.length > 0
  ? patientChart.socialHistory.map((sh: any) => `- ${sh.category}: ${sh.details}`).join("\n")
  : "- Social history not documented"
}

SURGICAL HISTORY:
${patientChart.surgicalHistory?.length > 0
  ? patientChart.surgicalHistory.map((sh: any) => `- ${sh.procedure} (${sh.date})`).join("\n")
  : "- No surgical history documented"
}
`
    : "Limited patient data available - chart context not accessible"
}`;

    // 3. Send patient context to OpenAI for AI suggestions
    const currentTranscription = transcription || "";

    const contextWithTranscription = `${patientContext}

CURRENT LIVE CONVERSATION:
${currentTranscription}

CRITICAL: If the nurse is asking direct questions about patient chart information, provide SPECIFIC facts from the chart data above, NOT generic suggestions.

Examples:
- Question: "Does the patient have medical problems?" → Answer: "Medical problems: HTN, DM2, CKD stage 3, AFib, CHF"
- Question: "What medications?" → Answer: "Current medications: Acetaminophen 500mg daily"
- Question: "Any allergies?" → Answer: "NKDA (No Known Drug Allergies)"

DO NOT say "Confirm" or "Assess" - give the actual chart facts directly.

Please provide nursing insights based on the current conversation.`;

    const contextMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: contextWithTranscription,
          },
        ],
      },
    };

    console.log(
      "🧠 [NursingView] Injecting patient context for AI suggestions",
    );
    ws.send(JSON.stringify(contextMessage));

    // 4. Create response for AI suggestions with metadata 
    const suggestionsMessage = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: `You are a medical AI assistant for nursing staff. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights for nurses.

CRITICAL PRIORITY: When nurses ask direct questions about patient information, provide SPECIFIC factual answers using the chart data provided in the conversation context. Do NOT give generic advice when asked direct questions.

DIRECT QUESTION RESPONSES:
  -When nurse asks "Does patient have medical problems?" → Answer: "Medical problems: HTN, DM2, CKD stage 3, AFib, CHF with reduced EF"
  -When nurse asks "What medications?" → Answer: "Current medications: Acetaminophen 500mg once daily by mouth"
  -When nurse asks "Any allergies?" → Answer: "NKDA (No Known Drug Allergies)"
  -FORBIDDEN responses: "Confirm...", "Assess...", "Obtain details..." when chart data exists

Focus on high-value, evidence-based, nursing assessments and safety considerations based on what the patient is saying in this conversation. Provide only one brief phrase at a time. If multiple insights could be provided, prioritize the most critical or relevant one first.

Avoid restating general knowledge or overly simplistic recommendations a nurse would already know. Prioritize specifics: vital signs monitoring, medication safety, patient comfort measures, and nursing interventions. Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per response.

DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

IMPORTANT: Return only 1-2 insights maximum per response. Use a bullet (•), dash (-), or number to prefix each insight. Keep responses short and focused.

Format each bullet point on its own line with no extra spacing between them.`,
        metadata: {
          type: "suggestions",
        },
      },
    };

    console.log("🧠 [NursingView] Creating AI suggestions conversation");
    ws.send(JSON.stringify(suggestionsMessage));
  };

  // Generate smart suggestions function - EXACT COPY from provider view
  const generateSmartSuggestions = () => {
    setGptSuggestions(
      "AI-generated nursing suggestions based on the encounter...",
    );
    toast({
      title: "Smart Suggestions Generated",
      description: "GPT analysis complete",
    });
  };

  // Manual AI insights generation function for nursing
  const generateNursingInsights = async () => {
    if (!transcription || isGeneratingInsights) return;
    
    console.log("🧠 [NursingView] Generating nursing insights manually");
    setIsGeneratingInsights(true);
    try {
      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id.toString(),
          userRole: "nurse",
          transcription: transcription,
          isLiveChunk: "false" // Full transcription for manual trigger
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ [NursingView] Full API response:", data);
        
        // Access the correct response structure: data.aiSuggestions.realTimePrompts
        const insights = data.aiSuggestions?.realTimePrompts;
        
        if (insights && Array.isArray(insights) && insights.length > 0) {
          const insightsText = insights.join("\n");
          console.log("✅ [NursingView] Nursing insights generated:", insightsText);
          
          // Accumulate new insights
          setLiveSuggestions(prev => {
            const newInsights = prev ? prev + "\n" + insightsText : insightsText;
            return newInsights;
          });
          setGptSuggestions(prev => {
            const newInsights = prev ? prev + "\n" + insightsText : insightsText;
            return newInsights;
          });
          
          toast({
            title: "AI Insights Generated",
            description: `Generated ${insights.length} nursing insight${insights.length > 1 ? 's' : ''}`,
          });
        } else {
          console.warn("⚠️ [NursingView] No insights returned from API");
          toast({
            title: "No New Insights",
            description: "No additional nursing insights available for this transcription",
          });
        }
      } else {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ [NursingView] Error generating insights:", error);
      toast({
        title: "Error",
        description: "Failed to generate nursing insights",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Function to get real-time suggestions during recording - EXACT COPY from provider view
  const getLiveAISuggestions = async (transcription: string) => {
    if (transcription.length < 15) return; // Process smaller chunks for faster response

    // Debounce suggestions to prevent too many rapid API calls
    const now = Date.now();
    if (now - lastSuggestionTime < 1000) {
      // Clear any existing timeout and set a new one
      if (suggestionDebounceTimer.current) {
        clearTimeout(suggestionDebounceTimer.current);
      }
      suggestionDebounceTimer.current = setTimeout(() => {
        getLiveAISuggestions(transcription);
      }, 1000);
      return;
    }

    setLastSuggestionTime(now);

    try {
      console.log(
        "🧠 [NursingView] Getting live AI suggestions for transcription:",
        transcription.substring(0, 100) + "...",
      );

      const requestBody = {
        patientId: patient.id.toString(),
        userRole: "nurse",
        isLiveChunk: "true",
        transcription: transcription,
      };

      console.log(
        "🧠 [NursingView] Sending live suggestions request to /api/voice/live-suggestions",
      );
      console.log("🧠 [NursingView] Request body:", requestBody);

      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(
        "🧠 [NursingView] Live suggestions response status:",
        response.status,
      );
      console.log(
        "🧠 [NursingView] Live suggestions response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🧠 [NursingView] Live AI suggestions received:", data);

        if (data.aiSuggestions) {
          console.log(
            "🔧 [NursingView] Processing live suggestions, existing:",
            liveSuggestions?.length || 0,
            "chars",
          );
          console.log(
            "🔧 [NursingView] New suggestions count:",
            data.aiSuggestions.realTimePrompts?.length || 0,
          );

          // Get existing live suggestions to append to them (like transcription buffer)
          const existingLiveSuggestions = liveSuggestions || "";
          let suggestionsText = existingLiveSuggestions;

          // If this is the first suggestion, add the header
          if (
            !existingLiveSuggestions.includes("🩺 REAL-TIME CLINICAL INSIGHTS:")
          ) {
            suggestionsText = "🩺 REAL-TIME CLINICAL INSIGHTS:\n\n";
            console.log("🔧 [NursingView] First suggestion - added header");
          }

          // Only append new suggestions if they exist and aren't empty
          if (data.aiSuggestions.realTimePrompts?.length > 0) {
            // Filter out empty suggestions and ones already in the buffer
            const newSuggestions = data.aiSuggestions.realTimePrompts.filter(
              (prompt: string) => {
                if (
                  !prompt ||
                  !prompt.trim() ||
                  prompt.trim() === "Continue recording for more context..."
                ) {
                  return false;
                }
                // Check if this suggestion is already in our accumulated text
                const cleanPrompt = prompt.replace(/^[•\-\*]\s*/, "").trim();
                return !existingLiveSuggestions.includes(cleanPrompt);
              },
            );

            if (newSuggestions.length > 0) {
              console.log(
                "🔧 [NursingView] Adding",
                newSuggestions.length,
                "new suggestions to existing",
                existingLiveSuggestions.length,
                "chars",
              );

              // Append each new suggestion (like transcription delta accumulation)
              newSuggestions.forEach((prompt: string) => {
                const formattedPrompt =
                  prompt.startsWith("•") ||
                  prompt.startsWith("-") ||
                  prompt.startsWith("*")
                    ? prompt
                    : `• ${prompt}`;
                suggestionsText += `${formattedPrompt}\n`;
                console.log(
                  "🔧 [NursingView] Accumulated suggestion:",
                  formattedPrompt.substring(0, 50) + "...",
                );
              });
            } else {
              console.log("🔧 [NursingView] No new suggestions to accumulate");
            }
          }

          console.log(
            "🔧 [NursingView] Final live suggestions length:",
            suggestionsText.length,
          );
          setLiveSuggestions(suggestionsText);
          setGptSuggestions(suggestionsText); // Also update the display
          console.log(
            "🔧 [NursingView] Live suggestions updated, length:",
            suggestionsText.length,
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ [NursingView] Live suggestions HTTP error:",
          response.status,
        );
        console.error("❌ [NursingView] Full HTML response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        );
      }
    } catch (error) {
      console.error("❌ [NursingView] Live suggestions failed:", error);
      console.error("❌ [NursingView] Error details:", {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack,
      });
    }
  };

  // Simple recording function matching provider view exactly
  const startRecording = async () => {
    console.log("🎤 [NursingView] === START RECORDING CALLED ===");
    console.log("🎤 [NursingView] User editing lock status:", userEditingLock);
    console.log("🎤 [NursingView] Current recording status:", isRecording);
    console.log("🎤 [NursingView] Recording cooldown status:", recordingCooldown);

    // Check if user is currently editing - prevent conflicts
    if (userEditingLock) {
      console.log("🔒 [NursingView] User editing lock active - skipping recording");
      toast({
        title: "Recording Unavailable",
        description: "Cannot start recording while editing notes. Complete your edits first.",
        variant: "default",
      });
      return;
    }

    // Proceed with recording using RealtimeSOAP integration
    proceedWithRecording();
  };

  const proceedWithRecording = async () => {
    console.log("🎤 [NursingView] === PROCEED WITH RECORDING ===");
    console.log("🎤 [NursingView] Delegating to RealtimeSOAPIntegration component");
    
    if (realtimeSOAPRef.current) {
      try {
        await realtimeSOAPRef.current.startRecording();
        console.log("✅ [NursingView] RealtimeSOAP recording started successfully");
      } catch (error) {
        console.error("❌ [NursingView] Failed to start RealtimeSOAP recording:", error);
        toast({
          title: "Recording failed",
          description: "Unable to start voice recording. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.error("❌ [NursingView] RealtimeSOAP ref not available");
      toast({
        title: "Recording Error",
        description: "Recording system not ready. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  // Callback handlers for RealtimeSOAPIntegration
  const handleSOAPNoteUpdate = (updatedContent: string) => {
    console.log("📝 [NursingView] SOAP note updated from RealtimeSOAP:", updatedContent?.length || 0, "chars");
    setSoapNote(updatedContent);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    console.log("🎤 [NursingView] Recording state changed:", recording);
    setIsRecording(recording);
  };

  const handleTranscriptionUpdate = (transcription: string) => {
    console.log("📝 [NursingView] Transcription updated:", transcription?.length || 0, "chars");
    setTranscription(transcription);
  };

  const handleDraftOrdersUpdate = (orders: any[]) => {
    console.log("📋 [NursingView] Draft orders updated:", orders?.length || 0, "orders");
    setDraftOrders(orders);
  };

  const handleCptCodesUpdate = (codes: any) => {
    console.log("🏥 [NursingView] CPT codes updated:", codes);
    setCptCodesData(codes);
  };

  // Simple stopRecording function delegating to RealtimeSOAP integration
  const stopRecording = async () => {
    console.log("🎤 [NursingView] === STOP RECORDING CALLED ===");
    
    if (realtimeSOAPRef.current) {
      try {
        await realtimeSOAPRef.current.stopRecording();
        console.log("✅ [NursingView] RealtimeSOAP recording stopped successfully");
      } catch (error) {
        console.error("❌ [NursingView] Failed to stop RealtimeSOAP recording:", error);
      }
    }
    
    // Reset recording state
    setIsRecording(false);
    console.log("✅ [NursingView] Recording stopped successfully");
  };



  // Component UI render
  if (!user && !authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Not authenticated. Please log in.</p>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Chart Panel - Unified Expandable */}
      <UnifiedChartPanel
        patient={patient}
        config={{
          context: 'nurse-encounter',
          userRole: currentUser?.role,
          allowResize: true,
          defaultWidth: "w-80",
          maxExpandedWidth: "90vw",
          enableSearch: true
        }}
        encounterId={encounterId}
        encounter={encounter}
        onBackToChart={onBackToChart}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Nursing Assessment
              </h1>
            </div>
          </div>
        </div>

        {/* Content Area - Two Panel Layout */}
        <div className="flex-1 flex gap-4 overflow-hidden p-4">
          {/* Left Panel - Nursing Template */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-6">
                {/* Comprehensive Nursing Template */}
                <NursingTemplateAssessment
                  ref={nursingTemplateRef}
                  patientId={patient.id.toString()}
                  encounterId={encounterId.toString()}
                  isRecording={isRecording}
                  transcription={transcription}
                  onTemplateUpdate={(data) => {
                    setTemplateData(data);
                    console.log("🩺 [NursingView] Template updated:", data);
                  }}
                  autoStart={false}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Recording and Suggestions */}
          <div className="w-96 overflow-y-auto">
            <NursingRecordingPanel
              isRecording={isRecording}
              transcription={transcription}
              aiSuggestions={liveSuggestions || gptSuggestions}
              wsConnected={wsConnected}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onGenerateInsights={generateNursingInsights}
              isGeneratingInsights={isGeneratingInsights}
            />

            {/* Hidden RealtimeSOAP Integration - handles all recording logic */}
            <div style={{ display: 'none' }}>
              <RealtimeSOAPIntegration
                ref={realtimeSOAPRef}
                patientId={patient.id.toString()}
                encounterId={encounterId.toString()}
                isRecording={isRecording}
                onSOAPNoteUpdate={handleSOAPNoteUpdate}
                onRecordingStateChange={handleRecordingStateChange}
                onTranscriptionUpdate={handleTranscriptionUpdate}
                onDraftOrdersReceived={handleDraftOrdersUpdate}
                onCPTCodesReceived={handleCptCodesUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
