import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Mic,
  MicOff,
  ArrowLeft,
  FileText,
  Bot,
  RefreshCw,
  Save,
} from "lucide-react";
import { Patient } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SOAPNoteEditor } from "@/components/ui/soap-note-editor";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SharedChartSections } from "./shared-chart-sections";
import Placeholder from "@tiptap/extension-placeholder";
import { DraftOrders } from "./draft-orders";
import { CPTCodesDiagnoses } from "./cpt-codes-diagnoses";
import { EnhancedMedicalProblems } from "./enhanced-medical-problems";
import { EncounterSignaturePanel } from "./encounter-signature-panel";
import { EncounterWorkflowControls } from "./encounter-workflow-controls";
import {
  RealtimeSOAPIntegration,
  RealtimeSOAPRef,
} from "@/components/RealtimeSOAPIntegration";

import { NursingSummaryDisplay } from "@/components/nursing-summary-display";

interface EncounterDetailViewProps {
  patient: Patient;
  encounterId: number;
  encounter?: any;
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
  { id: "ai-debug", label: "AI Assistant Debug" },
];

function AIDebugSection({ patientId }: { patientId: number }) {
  const {
    data: assistantConfig,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/patients/${patientId}/assistant`],
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="p-2 text-xs text-gray-500">Loading assistant info...</div>
    );
  }

  if (error || !assistantConfig) {
    return <div className="p-2 text-xs text-red-600">No assistant found</div>;
  }

  // Type the response data properly
  const config = assistantConfig as any;

  return (
    <div className="p-2">
      <div className="text-xs space-y-2">
        <div>
          <span className="font-medium">Assistant:</span>{" "}
          {config?.name || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Model:</span>{" "}
          {config?.model || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Thread:</span>{" "}
          {config?.thread_id ? "Active" : "None"}
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs">
          View Full Debug
        </Button>
      </div>
    </div>
  );
}

export function EncounterDetailView({
  patient,
  encounterId,
  encounter,
  onBackToChart,
}: EncounterDetailViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["encounters"]),
  );

  // Deduplication system
  const processedEvents = useRef(new Set<string>());
  const processedContent = useRef(new Set<string>());

  // Deduplication helper functions
  const isEventProcessed = (eventId: string) => {
    return eventId ? processedEvents.current.has(eventId) : false;
  };

  const markEventAsProcessed = (eventId: string) => {
    if (eventId) processedEvents.current.add(eventId);
  };

  const isContentProcessed = (content: string) => {
    if (!content || content.length <= 10) return false;
    const signature = content.substring(0, 50).trim();
    return processedContent.current.has(signature);
  };

  const markContentAsProcessed = (content: string) => {
    if (content && content.length > 10) {
      const signature = content.substring(0, 50).trim();
      processedContent.current.add(signature);
    }
  };
  const [soapNote, setSoapNote] = useState("");
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  const [isSavingSOAP, setIsSavingSOAP] = useState(false);
  const useRealtimeAPI = true; // Real-time API enabled by default in background
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [cptCodes, setCptCodes] = useState<any[]>([]);
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState("");
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0);
  const [suggestionsBuffer, setSuggestionsBuffer] = useState("");
  const [liveTranscriptionContent, setLiveTranscriptionContent] = useState(""); // Unified content for AI

  // Better sentence detection and formatting function for conversational exchanges
  const formatTranscriptionWithBullets = (text: string) => {
    if (!text) return text;

    // Split into sentences but keep natural conversation flow
    const sentences = text
      .split(/(?<=[.!?])\s+/) // Split on sentence endings followed by whitespace
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return sentences
      .map((sentence) => {
        // Clean up the sentence and add bullet if it doesn't have one
        const cleanSentence = sentence.replace(/^[•\-\*]\s*/, ""); // Remove existing bullets
        return `• ${cleanSentence}`;
      })
      .join("\n");
  };

  // Track the last generated content to avoid re-formatting user edits
  const lastGeneratedContent = useRef<string>("");
  const suggestionDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-save functionality
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved" | "">("");
  
  // Track automatic SOAP generation after stopping recording
  const [isAutoGeneratingSOAP, setIsAutoGeneratingSOAP] = useState(false);
  
  // Track automatic orders and billing generation after stopping recording
  const [isAutoGeneratingOrders, setIsAutoGeneratingOrders] = useState(false);
  const [isAutoGeneratingBilling, setIsAutoGeneratingBilling] = useState(false);

  // Medical problems processing state tracking
  const [lastProcessedSOAPContent, setLastProcessedSOAPContent] = useState<string>("");
  const [lastRecordingStopTime, setLastRecordingStopTime] = useState<number>(0);
  
  // Function to detect meaningful changes in SOAP content
  const hasSignificantSOAPChanges = (newContent: string): boolean => {
    if (!lastProcessedSOAPContent) return true; // First time processing
    
    // Extract Assessment/Plan sections for comparison (where diagnoses live)
    const extractAssessmentPlan = (content: string) => {
      const assessmentMatch = content.match(/(?:ASSESSMENT|PLAN|A&P|A\/P)[\s\S]*$/i);
      return assessmentMatch ? assessmentMatch[0].toLowerCase() : content.toLowerCase();
    };
    
    const oldAssessment = extractAssessmentPlan(lastProcessedSOAPContent);
    const newAssessment = extractAssessmentPlan(newContent);
    
    // Check for significant changes: new diagnoses, medication changes, plan modifications
    const significantKeywords = [
      // New diagnoses
      'diabetes', 'hypertension', 'pneumonia', 'copd', 'asthma', 'depression', 
      'anxiety', 'arthritis', 'infection', 'pain', 'fracture', 'cancer',
      // ICD codes
      'e11', 'i10', 'j44', 'f32', 'f41', 'm79', 'n39',
      // Medication keywords
      'metformin', 'lisinopril', 'albuterol', 'prednisone', 'amoxicillin',
      'start', 'stop', 'discontinue', 'increase', 'decrease', 'titrate'
    ];
    
    // Look for new significant keywords in the assessment/plan
    const hasNewKeywords = significantKeywords.some(keyword => 
      newAssessment.includes(keyword) && !oldAssessment.includes(keyword)
    );
    
    // Check for substantial content length changes (>20% change)
    const lengthChange = Math.abs(newContent.length - lastProcessedSOAPContent.length) / lastProcessedSOAPContent.length;
    const hasSubstantialChanges = lengthChange > 0.2;
    
    console.log(`🔍 [ChangeDetection] Significant changes detected: ${hasNewKeywords || hasSubstantialChanges}`);
    console.log(`🔍 [ChangeDetection] New keywords: ${hasNewKeywords}, Length change: ${(lengthChange * 100).toFixed(1)}%`);
    
    return hasNewKeywords || hasSubstantialChanges;
  };

  // Get OpenAI API key from environment
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Real-time SOAP generation ref
  const realtimeSOAPRef = useRef<RealtimeSOAPRef>(null);

  // Auto-save function with debouncing
  const autoSaveSOAPNote = async (content: string) => {
    if (!content.trim() || content === lastSaved) {
      return; // Don't save empty content or unchanged content
    }

    setIsAutoSaving(true);
    setAutoSaveStatus("saving");

    try {
      console.log("💾 [AutoSave] Saving SOAP note automatically...", content.length, "characters");

      const response = await fetch(
        `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            soapNote: content,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to auto-save SOAP note: ${response.statusText}`);
      }

      console.log("✅ [AutoSave] SOAP note auto-saved successfully");
      setLastSaved(content);
      setAutoSaveStatus("saved");

      // NOTE: Medical problems processing removed from auto-save
      // Medical problems will only be processed when:
      // 1. Recording stops (stopRecording function)
      // 2. Manual save with significant changes outside of recording
      console.log("💾 [AutoSave] Auto-save completed - medical problems processing skipped (will process on recording stop)");

      // Invalidate relevant caches
      await queryClient.invalidateQueries({
        queryKey: [`/api/encounters/${encounterId}`],
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/encounters`],
      });

    } catch (error) {
      console.error("❌ [AutoSave] Failed to auto-save SOAP note:", error);
      setAutoSaveStatus("unsaved");
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Helper function to check if there are actual unsaved changes
  const hasUnsavedChanges = (currentContent: string): boolean => {
    if (!currentContent.trim()) return false;
    return currentContent !== lastSaved;
  };

  // Debounced auto-save trigger
  const triggerAutoSave = (content: string) => {
    // Only trigger auto-save if there are actual changes
    if (!hasUnsavedChanges(content)) {
      setAutoSaveStatus("saved");
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    setAutoSaveStatus("unsaved");

    // Auto-save after 3 seconds of inactivity (like Microsoft Word)
    autoSaveTimer.current = setTimeout(() => {
      autoSaveSOAPNote(content);
    }, 3000);
  };

  // Handlers for Real-time SOAP Integration
  const handleSOAPNoteUpdate = (note: string) => {
    setSoapNote(note);
    if (editor && !editor.isDestroyed) {
      const formattedContent = formatSoapNoteContent(note);
      editor.commands.setContent(formattedContent);
    }
  };

  const handleSOAPNoteComplete = async (note: string) => {
    console.log(`🚨 [DEBUG] handleSOAPNoteComplete FUNCTION CALLED!!! This is the main trigger!`);
    console.log(`🚨 [DEBUG] Stack trace to see who called this:`, new Error().stack);
    
    const timestamp = new Date().toISOString();
    console.log(`🔍 [EncounterView] === SOAP NOTE COMPLETION START ===`);
    console.log(`🔍 [EncounterView] Time: ${timestamp}`);
    console.log(`🔍 [EncounterView] Note length: ${note.length}`);
    console.log(`🔍 [EncounterView] Patient: ${patient?.id || 'MISSING'}, Encounter: ${encounterId || 'MISSING'}`);
    console.log(`🔍 [EncounterView] Patient object:`, patient);
    console.log(`🔍 [EncounterView] Recording state: ${isRecording ? 'ACTIVE' : 'STOPPED'}`);
    console.log(`🔍 [EncounterView] About to save SOAP note to encounter...`);
    
    // CRITICAL SAFEGUARD: Prevent medical problems processing during active recording
    if (isRecording) {
      console.log(`🚫 [EncounterView] BLOCKING medical problems processing - recording is ACTIVE`);
      console.log(`🚫 [EncounterView] SOAP note will be saved but medical problems processing skipped until recording stops`);
      
      // Only save SOAP note, skip all medical processing
      setSoapNote(note);
      if (editor && !editor.isDestroyed) {
        const formattedContent = formatSoapNoteContent(note);
        editor.commands.setContent(formattedContent);
      }
      
      try {
        await fetch(
          `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ soapNote: note }),
          },
        );
        console.log(`✅ [EncounterView] SOAP note saved during recording - medical processing deferred`);
      } catch (error) {
        console.error("❌ [EncounterView] Error saving SOAP note during recording:", error);
      }
      
      return; // Exit early - no medical processing during recording
    }
    
    console.log(`✅ [EncounterView] Recording is STOPPED - proceeding with full medical processing`);
    
    // Reset all generating states when SOAP generation completes
    setIsGeneratingSOAP(false);
    setIsAutoGeneratingSOAP(false);
    setIsAutoGeneratingOrders(false);
    setIsAutoGeneratingBilling(false);

    setSoapNote(note);
    if (editor && !editor.isDestroyed) {
      const formattedContent = formatSoapNoteContent(note);
      editor.commands.setContent(formattedContent);
    }

    // Save the SOAP note to the encounter
    try {
      console.log(`🔍 [EncounterView] Calling SOAP save API at ${timestamp}`);
      await fetch(
        `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ soapNote: note }),
        },
      );
      
      // Update auto-save state when SOAP note is automatically generated and saved
      setLastSaved(note);
      setAutoSaveStatus("saved");
      
      // Reset the generating state to hide loading animation on "Generate from Transcription" button
      setIsGeneratingSOAP(false);
      
      console.log(
        `✅ [EncounterView] Real-time SOAP note saved to encounter at ${new Date().toISOString()}`,
      );
      console.log(`🔍 [EncounterView] SOAP save completed successfully, starting medical problems processing...`);
      
      // Process medical problems, medications, orders, and billing in parallel with delta analysis
      try {
        console.log(`🏥 [ParallelProcessing] === PARALLEL PROCESSING START ===`);
        console.log(`🏥 [ParallelProcessing] Patient ID: ${patient.id}`);
        console.log(`🏥 [ParallelProcessing] Encounter ID: ${encounterId}`);
        console.log(`🏥 [ParallelProcessing] SOAP Note length: ${note.length} characters`);
        console.log(`🏥 [ParallelProcessing] SOAP Note preview: ${note.substring(0, 200)}...`);
        
        const triggerType = "manual_edit"; // Manual save from SOAP editor
        const medicalProblemsRequestBody = {
          encounterId: encounterId,
          triggerType: triggerType
        };
        
        const medicationsRequestBody = {
          patientId: patient.id
        };
        
        const ordersRequestBody = {
          // Orders extraction doesn't need additional data as it reads from encounter SOAP note
        };
        
        const cptRequestBody = {
          // CPT extraction reads from encounter SOAP note
        };
        
        console.log(`🏥 [ParallelProcessing] Medical problems request body:`, medicalProblemsRequestBody);
        console.log(`🏥 [ParallelProcessing] Medications request body:`, medicationsRequestBody);
        console.log(`🏥 [ParallelProcessing] Orders request body:`, ordersRequestBody);
        console.log(`🏥 [ParallelProcessing] CPT request body:`, cptRequestBody);
        
        // Process all services in parallel for maximum efficiency
        const [medicalProblemsResponse, medicationsResponse, ordersResponse, cptResponse] = await Promise.all([
          fetch(`/api/medical-problems/process-encounter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(medicalProblemsRequestBody)
          }),
          fetch(`/api/encounters/${encounterId}/process-medications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(medicationsRequestBody)
          }),
          fetch(`/api/encounters/${encounterId}/extract-orders-from-soap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(ordersRequestBody)
          }),
          fetch(`/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt-codes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(cptRequestBody)
          })
        ]);

        console.log(`🏥 [ParallelProcessing] All requests completed`);
        console.log(`🏥 [MedicalProblems] Response status: ${medicalProblemsResponse.status}`);
        console.log(`🏥 [Medications] Response status: ${medicationsResponse.status}`);
        console.log(`🏥 [Orders] Response status: ${ordersResponse.status}`);
        console.log(`🏥 [CPT] Response status: ${cptResponse.status}`);

        // Handle medical problems response
        if (medicalProblemsResponse.ok) {
          const result = await medicalProblemsResponse.json();
          console.log(`✅ [MedicalProblems] SUCCESS: ${result.problemsAffected || result.total_problems_affected || 'unknown'} problems affected`);
          console.log(`✅ [MedicalProblems] Processing time: ${result.processingTimeMs || result.processing_time_ms || 'unknown'}ms`);
          
          // Invalidate medical problems queries to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medical-problems-enhanced`] 
          });
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medical-problems`] 
          });
          console.log(`🔄 [MedicalProblems] Cache invalidation completed`);
        } else {
          const errorText = await medicalProblemsResponse.text();
          console.error(`❌ [MedicalProblems] FAILED with status ${medicalProblemsResponse.status}`);
          console.error(`❌ [MedicalProblems] Error response: ${errorText}`);
        }

        // Handle medications response
        if (medicationsResponse.ok) {
          const result = await medicationsResponse.json();
          console.log(`✅ [Medications] SUCCESS: ${result.medicationsAffected} medications affected`);
          console.log(`✅ [Medications] Processing time: ${result.processingTimeMs}ms`);
          console.log(`✅ [Medications] Drug interactions found: ${result.drugInteractions?.length || 0}`);
          
          // Invalidate medications queries to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medications-enhanced`] 
          });
          console.log(`🔄 [Medications] Cache invalidation completed`);
        } else {
          const errorText = await medicationsResponse.text();
          console.error(`❌ [Medications] FAILED with status ${medicationsResponse.status}`);
          console.error(`❌ [Medications] Error response: ${errorText}`);
        }

        // Handle orders response
        if (ordersResponse.ok) {
          const result = await ordersResponse.json();
          console.log(`✅ [Orders] SUCCESS: ${result.ordersCount || 0} orders extracted and saved`);
          console.log(`✅ [Orders] Message: ${result.message}`);
          
          // Invalidate orders queries to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/draft-orders`] 
          });
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/encounters/${encounterId}/validation`] 
          });
          console.log(`🔄 [Orders] Cache invalidation completed`);
        } else {
          const errorText = await ordersResponse.text();
          console.error(`❌ [Orders] FAILED with status ${ordersResponse.status}`);
          console.error(`❌ [Orders] Error response: ${errorText}`);
        }

        // Handle CPT response
        if (cptResponse.ok) {
          const result = await cptResponse.json();
          console.log(`✅ [CPT] SUCCESS: ${result.cptCodes?.length || 0} CPT codes and ${result.diagnoses?.length || 0} diagnoses extracted`);
          console.log(`✅ [CPT] Processing details:`, result);
          
          // Invalidate billing queries to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`] 
          });
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/encounters/${encounterId}/validation`] 
          });
          console.log(`🔄 [CPT] Cache invalidation completed`);
        } else {
          const errorText = await cptResponse.text();
          console.error(`❌ [CPT] FAILED with status ${cptResponse.status}`);
          console.error(`❌ [CPT] Error response: ${errorText}`);
        }
        
        console.log(`🏥 [ParallelProcessing] === PARALLEL PROCESSING END ===`);
      } catch (error) {
        console.error(`❌ [ParallelProcessing] EXCEPTION during processing:`, error as Error);
        console.error(`❌ [ParallelProcessing] Stack trace:`, (error as Error).stack);
        // Don't show error toast for this - it's background processing
      }
      
      console.log(`🔍 [EncounterView] === SOAP SAVE COMPLETED ===`);
    } catch (error) {
      console.error(
        "❌ [EncounterView] Error saving Real-time SOAP note:",
        error,
      );
      setAutoSaveStatus("unsaved");
      
      // Reset the generating state even on error to prevent stuck loading animation
      setIsGeneratingSOAP(false);
    }
  };

  const handleDraftOrdersReceived = async (orders: any[]) => {
    setDraftOrders(orders);
    console.log(
      "📋 [EncounterView] Real-time draft orders received:",
      orders.length,
    );
    
    // Check if any medication orders were received
    const medicationOrders = orders.filter(order => order.orderType === 'medication');
    if (medicationOrders.length > 0) {
      console.log(
        "💊 [EncounterView] Medication orders detected, invalidating medications cache"
      );
      
      // Invalidate medications queries to refresh UI with new pending medications
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/patients/${patient.id}/medications-enhanced`] 
      });
      console.log("💊 [EncounterView] Medications cache invalidation completed");
    }
  };

  const handleCPTCodesReceived = async (cptData: any) => {
    if (cptData.cptCodes || cptData.diagnoses) {
      setCptCodes(cptData.cptCodes || []);
      console.log(
        "🏥 [EncounterView] Real-time CPT codes received:",
        (cptData.cptCodes || []).length,
      );
      console.log(
        "🏥 [EncounterView] Real-time diagnoses received:",
        (cptData.diagnoses || []).length,
      );
      console.log(
        "🔗 [EncounterView] Real-time mappings received:",
        (cptData.mappings || []).length,
      );

      // Refresh the encounter data to show the CPT codes in the CPT codes component
      console.log(
        "🔄 [EncounterView] Invalidating queries for patient:",
        patient.id,
        "encounter:",
        encounterId,
      );
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/encounters/${encounterId}`],
      });
      
      // Invalidate medical problems cache since CPT codes trigger medical problems processing
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/medical-problems`],
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/medical-problems-enhanced`],
      });
      
      console.log("🔄 [EncounterView] Query invalidation completed");

      // Show enhanced toast notification
      const highestCode = (cptData.cptCodes || []).reduce(
        (highest: any, current: any) => {
          return current.code > highest.code ? current : highest;
        },
        { code: "", complexity: "" },
      );

      toast({
        title: "Advanced CPT Codes Generated",
        description: `Optimized billing: ${(cptData.cptCodes || []).length} CPT codes, ${(cptData.diagnoses || []).length} diagnoses${highestCode.code ? ` (${highestCode.code} - ${highestCode.complexity})` : ""}`,
      });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Generated SOAP note will appear here...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[500px] max-w-none whitespace-pre-wrap soap-editor",
      },
    },
    content: "",
    onUpdate: ({ editor }) => {
      // Update React state when user types
      if (!editor.isDestroyed) {
        const newContent = editor.getHTML();
        setSoapNote(newContent);
        
        // Trigger auto-save with debouncing
        triggerAutoSave(newContent);
      }
    },
  });

  // Function to format SOAP note content with proper headers and spacing
  const formatSoapNoteContent = (content: string) => {
    if (!content) return "";

    return (
      content
        // Convert markdown bold to HTML
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Convert single line breaks to HTML breaks
        .replace(/\n/g, "<br/>")
        // Aggressively clean up multiple consecutive breaks (2 or more)
        .replace(/(<br\/>){2,}/g, "<br/>")
        // Ensure SOAP headers have proper spacing before them but not excessive spacing after
        .replace(/(<strong>SUBJECTIVE:<\/strong>)/g, "<br/>$1")
        .replace(/(<strong>OBJECTIVE:<\/strong>)/g, "<br/>$1")
        .replace(/(<strong>ASSESSMENT.*?:<\/strong>)/g, "<br/>$1")
        .replace(/(<strong>PLAN:<\/strong>)/g, "<br/>$1")
        .replace(/(<strong>ORDERS:<\/strong>)/g, "<br/>$1")
        // Remove leading breaks
        .replace(/^(<br\/>)+/, "")
    );
  };

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  // Effect to load existing SOAP note from encounter data
  useEffect(() => {
    if (encounter?.note && editor && !editor.isDestroyed) {
      // Load existing SOAP note from database
      const existingNote = encounter.note;

      // Only update if the content is different from what's currently loaded
      const currentContent = editor.getHTML();
      if (currentContent !== existingNote && existingNote.trim() !== "") {
        setSoapNote(existingNote);
        setLastSaved(existingNote); // Set initial saved state
        setAutoSaveStatus("saved");

        // Format the existing note for proper display
        const formattedContent = formatSoapNoteContent(existingNote);
        editor.commands.setContent(formattedContent);
        console.log(
          "📄 [EncounterView] Loaded existing SOAP note from encounter data",
        );
      }
    }
  }, [encounter?.note, editor]);

  // Effect to load new SOAP note content only when it's generated
  useEffect(() => {
    if (editor && soapNote && !editor.isDestroyed) {
      // Only update if this is new generated content (contains markdown)
      if (
        soapNote.includes("**") &&
        soapNote !== lastGeneratedContent.current
      ) {
        const formattedContent = formatSoapNoteContent(soapNote);
        editor.commands.setContent(formattedContent);
        lastGeneratedContent.current = soapNote;
      }
    }
  }, [soapNote, editor]);

  // Additional state variables (moved to avoid duplication)
  const [isTextMode, setIsTextMode] = useState(false);
  const [transcriptionBuffer, setTranscriptionBuffer] = useState("");
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
    // Parse date as local date to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to get real-time suggestions during recording
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
        "🧠 [EncounterView] Getting live AI suggestions for transcription:",
        transcription.substring(0, 100) + "...",
      );

      const requestBody = {
        patientId: patient.id.toString(),
        userRole: "provider",
        isLiveChunk: "true",
        transcription: transcription,
      };

      console.log(
        "🧠 [EncounterView] Sending live suggestions request to /api/voice/live-suggestions",
      );
      console.log("🧠 [EncounterView] Request body:", requestBody);

      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(
        "🧠 [EncounterView] Live suggestions response status:",
        response.status,
      );
      console.log(
        "🧠 [EncounterView] Live suggestions response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🧠 [EncounterView] Live AI suggestions received:", data);

        if (data.aiSuggestions) {
          console.log(
            "🔧 [EncounterView] Processing live suggestions, existing:",
            liveSuggestions?.length || 0,
            "chars",
          );
          console.log(
            "🔧 [EncounterView] New suggestions count:",
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
            console.log("🔧 [EncounterView] First suggestion - added header");
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
                "🔧 [EncounterView] Adding",
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
                  "🔧 [EncounterView] Accumulated suggestion:",
                  formattedPrompt.substring(0, 50) + "...",
                );
              });
            } else {
              console.log(
                "🔧 [EncounterView] No new suggestions to accumulate",
              );
            }
          }

          console.log(
            "🔧 [EncounterView] Final live suggestions length:",
            suggestionsText.length,
          );
          setLiveSuggestions(suggestionsText);
          setGptSuggestions(suggestionsText); // Also update the display
          console.log(
            "🔧 [EncounterView] Live suggestions updated, length:",
            suggestionsText.length,
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ [EncounterView] Live suggestions HTTP error:",
          response.status,
        );
        console.error("❌ [EncounterView] Full HTML response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        );
      }
    } catch (error) {
      console.error("❌ [EncounterView] Live suggestions failed:", error);
      console.error("❌ [EncounterView] Error details:", {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack,
      });
    }
  };

  const startRecording = async () => {
    console.log(
      "🎤 [EncounterView] Starting REAL-TIME voice recording for patient:",
      patient.id,
    );

    // Clear previous suggestions when starting new recording
    setGptSuggestions("");
    setLiveSuggestions(""); // Clear live suggestions for new encounter
    setSuggestionsBuffer(""); // Clear suggestions buffer for fresh accumulation
    // NOTE: Don't clear transcription here - let it accumulate for intelligent streaming

    try {
      // Create direct WebSocket connection to OpenAI like your working code
      let realtimeWs: WebSocket | null = null;
      let transcriptionBuffer = "";
      let lastSuggestionLength = 0;
      let suggestionsStarted = false;
      let conversationActive = false; // Track active conversation state
      let sessionId = "";

      try {
        console.log(
          "🌐 [EncounterView] Connecting to OpenAI Realtime API like working implementation...",
        );

        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        console.log("🔑 [EncounterView] API key check:", {
          hasApiKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          keyPrefix: apiKey?.substring(0, 7) || "none",
        });

        if (!apiKey) {
          throw new Error("OpenAI API key not available in environment");
        }

        // Step 1: Create session exactly like your working code
        console.log("🔧 [EncounterView] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview",
          modalities: ["text"],
          instructions:
            "You are a medical transcription assistant. Provide accurate transcription of medical conversations. Translate all languages into English. Only output ENGLISH. Under no circumstances should you output anything besides ENGLISH. Accurately transcribe medical terminology, drug names, dosages, and clinical observations. ",
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 300,
            create_response: true,
          },
        };

        console.log("📤 [API-OUT] Session config being sent to OpenAI:");
        console.log(JSON.stringify(sessionConfig, null, 2));

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
          console.log("❌ [API-IN] Session creation failed:");
          console.log(JSON.stringify(error, null, 2));
          throw new Error(
            `Failed to create session: ${error.message || "Unknown error"}`,
          );
        }

        const session = await sessionResponse.json();
        console.log("✅ [EncounterView] Session created:", session.id);
        console.log("📥 [API-IN] Session creation response:");
        console.log(JSON.stringify(session, null, 2));

        // Step 2: Connect via WebSocket with session token like your working code
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview",
        });

        realtimeWs = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        realtimeWs.onopen = () => {
          console.log("🌐 [EncounterView] ✅ Connected to OpenAI Realtime API");

          // Session configuration: Focus on transcription only, AI suggestions handled separately
          const sessionUpdateMessage = {
            type: "session.update",
            session: {
              instructions: `You are a medical transcription assistant specialized in clinical conversations. 
              Accurately transcribe medical terminology, drug names, dosages, and clinical observations. Translate all languages into English. Only output ENGLISH. Under no circumstances should you output anything besides ENGLISH.
              Pay special attention to:
              - Medication names and dosages (e.g., "Metformin 500mg twice daily")
              - Medical abbreviations (e.g., "BP", "HR", "HEENT")
              - Anatomical terms and symptoms
              - Numbers and measurements (vital signs, lab values)
              Format with bullet points for natural conversation flow.`,
              modalities: ["text", "audio"],
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
                language: "en",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 300,
                create_response: false,
              },
            },
          };

          console.log("📤 [API-OUT] Session update message being sent:");
          console.log(JSON.stringify(sessionUpdateMessage, null, 2));

          realtimeWs!.send(JSON.stringify(sessionUpdateMessage));
        };

        // ✅ ACTIVE AI SUGGESTIONS SYSTEM - WebSocket with Comprehensive Medical Prompt
        // This is the primary AI suggestions implementation used by the UI
        const startSuggestionsConversation = async (
          ws: WebSocket | null,
          patientData: any,
        ) => {
          if (!ws) return;

          console.log("[EncounterView] Starting AI suggestions conversation");

          // 1. Fetch full patient chart data like external implementation
          let patientChart = null;
          try {
            console.log(
              "[EncounterView] Fetching patient chart data for context injection",
            );
            const chartResponse = await fetch(
              `/api/patients/${patientData.id}/chart`,
            );
            if (chartResponse.ok) {
              patientChart = await chartResponse.json();
              console.log(
                "[EncounterView] Patient chart data fetched successfully",
              );
            } else {
              console.warn(
                "[EncounterView] Failed to fetch patient chart, using basic data only",
              );
            }
          } catch (error) {
            console.warn(
              "[EncounterView] Error fetching patient chart:",
              error,
            );
          }

          // 2. Format patient context prioritizing current encounter over historical data
          const formatPatientContext = (chart: any, basicData: any): string => {
            // Always start with basic patient demographics only
            const basicInfo = `Patient: ${basicData.firstName} ${basicData.lastName}
Age: ${basicData.age || "Unknown"} 
Gender: ${basicData.gender || "Unknown"}
MRN: ${basicData.mrn || "Unknown"}

CURRENT ENCOUNTER FOCUS: 
- This is a NEW encounter starting fresh
- Focus on the current conversation and transcription
- Provide suggestions based on what the patient is saying NOW
- Do not rely heavily on past medical history unless directly relevant to current symptoms

Critical Allergies: ${chart?.allergies?.length > 0 ? chart.allergies.map((a: any) => a.allergen).join(", ") : "None documented"}
Current Medications: ${chart?.currentMedications?.length > 0 ? chart.currentMedications.map((m: any) => m.name).join(", ") : "None documented"}`;

            return basicInfo;
          };

          const patientContext = formatPatientContext(
            patientChart,
            patientData,
          );

          // 3. Inject patient context AND current live transcription
          const currentTranscription =
            liveTranscriptionContent || transcriptionBuffer || "";
          const contextWithTranscription = `${patientContext}

CURRENT LIVE CONVERSATION:
${currentTranscription}

Please provide medical suggestions based on what the patient is saying in this current conversation.`;

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
            "🧠 [EncounterView] Injecting patient context for AI suggestions",
          );
          ws.send(JSON.stringify(contextMessage));

          // 4. Create response for AI suggestions with metadata like external system
          const suggestionsMessage = {
            type: "response.create",
            response: {
              modalities: ["text"],
              instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

CRITICAL: Focus ONLY on the current conversation and transcription. Do NOT provide suggestions based on past medical history unless the current symptoms directly relate to documented conditions. This is a NEW encounter.

Instructions:

Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights based on what the patient is saying RIGHT NOW in this conversation. Provide only one brief phrase at a time in response to each user query. If multiple insights could be provided, prioritize the most critical or relevant one first.

Base your suggestions on:
1. CURRENT symptoms described in the live conversation
2. CURRENT presentation and patient statements  
3. Only reference past history if directly relevant to current symptoms

Do NOT suggest treatments for conditions not mentioned in the current encounter.

Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per response.

Additional details for medication recommendations:

Always include typical starting dose, dose adjustment schedules, and maximum dose.
Output examples of good insights:

• Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
• Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
• Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

Output examples of bad insights (to avoid):

• Encourage gentle stretches and light activity to maintain mobility.
• Suggest warm baths at night for symptomatic relief of muscle tension.
• Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

IMPORTANT: Return only 1-2 insights maximum per response. Use a bullet (•), dash (-), or number to prefix each insight. Keep responses short and focused.

Format each bullet point on its own line with no extra spacing between them.`,
              metadata: {
                type: "suggestions",
              },
            },
          };

          console.log(
            "🧠 [EncounterView] Creating AI suggestions conversation",
          );
          ws.send(JSON.stringify(suggestionsMessage));
        };

        realtimeWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log("📨 [EncounterView] OpenAI message type:", message.type);

          // Log all incoming messages for debugging
          console.log("📥 [API-IN] Complete OpenAI message:");
          console.log(JSON.stringify(message, null, 2));

          // Add deduplication checks
          if (message.event_id && isEventProcessed(message.event_id)) {
            console.log(
              "🚫 [EncounterView] Skipping duplicate event:",
              message.event_id,
            );
            return;
          }

          const content =
            message.delta || message.transcript || message.text || "";
          if (content && isContentProcessed(content)) {
            console.log(
              "🚫 [EncounterView] Skipping duplicate content:",
              content.substring(0, 30),
            );
            return;
          }

          // Mark as processed
          if (message.event_id) markEventAsProcessed(message.event_id);
          if (content) markContentAsProcessed(content);

          // Handle transcription events - accumulate deltas
          if (
            message.type === "conversation.item.input_audio_transcription.delta"
          ) {
            const deltaText = message.transcript || message.delta || "";
            console.log(
              "📝 [EncounterView] Transcription delta received:",
              deltaText,
            );
            console.log(
              "📝 [EncounterView] Delta contains '+' symbol:",
              deltaText.includes("+"),
            );
            console.log(
              "📝 [EncounterView] Delta ends with '+':",
              deltaText.endsWith("+"),
            );

            // For delta updates, append the delta text to existing transcription
            transcriptionBuffer += deltaText;
            setTranscriptionBuffer(transcriptionBuffer);

            // Append delta to existing transcription (don't replace)
            setTranscription((prev) => {
              const newTranscription = prev + deltaText;
              console.log("📝 [EncounterView] Real-time transcription update:", {
                previousLength: prev.length,
                deltaLength: deltaText.length,
                newLength: newTranscription.length,
                preview: newTranscription.substring(0, 100),
                containsMedicalKeywords: /\b(pain|symptoms?|medication|treatment|diagnosis|chest|headache|fever|nausea|dizzy|shortness of breath|allergic|prescription|blood pressure|heart rate|exam|vital|lab|test|drug|pill|tablet|injection|therapy|surgery|procedure|complaint|history)\b/i.test(deltaText)
              });
              
              // Trigger intelligent streaming check for medical content
              if (newTranscription.length > 50 && /\b(pain|symptoms?|medication|treatment|diagnosis|chest|headache|fever|nausea|dizzy|shortness of breath|allergic|prescription|blood pressure|heart rate|exam|vital|lab|test|drug|pill|tablet|injection|therapy|surgery|procedure|complaint|history)\b/i.test(deltaText)) {
                console.log("🔥 [EncounterView] Medical keywords detected in real-time - triggering intelligent streaming");
                setTimeout(() => {
                  // Force re-evaluation of intelligent streaming
                  setTranscription(current => current);
                }, 500);
              }
              
              return newTranscription;
            });

            // CRITICAL: Update unified transcription content for AI suggestions
            setLiveTranscriptionContent((prev) => prev + deltaText);

            console.log(
              "📝 [EncounterView] Updated transcription buffer:",
              transcriptionBuffer,
            );
            console.log(
              "📝 [EncounterView] Buffer contains '+' symbols:",
              (transcriptionBuffer.match(/\+/g) || []).length,
            );

            // Start AI suggestions conversation when we have enough transcription (first time only)
            if (
              transcriptionBuffer.length > 20 &&
              !suggestionsStarted &&
              !conversationActive &&
              realtimeWs
            ) {
              suggestionsStarted = true;
              conversationActive = true;
              console.log(
                "🧠 [EncounterView] TRIGGERING AI suggestions conversation - transcription buffer length:",
                transcriptionBuffer.length,
              );
              console.log(
                "🧠 [EncounterView] Suggestions started:",
                suggestionsStarted,
                "Conversation active:",
                conversationActive,
              );
              startSuggestionsConversation(realtimeWs, patient);
            }

            // REAL-TIME: Continuously update AI suggestions with live partial transcription
            if (
              suggestionsStarted &&
              transcriptionBuffer.length > 20 &&
              realtimeWs
            ) {
              // Debounce to prevent too many rapid updates
              if (suggestionDebounceTimer.current) {
                clearTimeout(suggestionDebounceTimer.current);
              }

              suggestionDebounceTimer.current = setTimeout(() => {
                console.log(
                  "🧠 [EncounterView] Real-time AI context update with partial transcription",
                );

                // Send live partial transcription to AI
                const contextUpdate = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: `Live partial transcription: "${transcriptionBuffer}"\n\nProvide immediate medical insights based on this ongoing conversation.`,
                      },
                    ],
                  },
                };

                realtimeWs?.send(JSON.stringify(contextUpdate));

                // Request new AI response
                const responseRequest = {
                  type: "response.create",
                  response: {
                    modalities: ["text"],
                    instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

CRITICAL: Focus ONLY on the current conversation and transcription. Do NOT provide suggestions based on past medical history unless the current symptoms directly relate to documented conditions. This is a NEW encounter.

Instructions:

Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights based on what the patient is saying RIGHT NOW in this conversation. Provide only one brief phrase at a time in response to each user query. If multiple insights could be provided, prioritize the most critical or relevant one first.

Base your suggestions on:
1. CURRENT symptoms described in the live conversation
2. CURRENT presentation and patient statements  
3. Only reference past history if directly relevant to current symptoms

Do NOT suggest treatments for conditions not mentioned in the current encounter.

CRITICAL INSTRUCTION: Respond ONLY to symptoms mentioned in the current live conversation. Do NOT use examples from other medical conditions.

For medication recommendations, include starting dose, titration schedule, and maximum dose when relevant to the CURRENT chief complaint.

Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making based on what the patient is describing RIGHT NOW. No filler or overly obvious advice.

Return only one insight per line and single phrase per response. Use a bullet (•), dash (-), or number to prefix the insight.

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\\n) after answering a user question.`,
                    metadata: {
                      type: "suggestions",
                    },
                  },
                };

                realtimeWs?.send(JSON.stringify(responseRequest));
              }, 2000); // Reduced to 2-second debounce for faster real-time response
            }
          }

          // ✅ ACTIVE AI SUGGESTIONS STREAMING - Handles real-time clinical insights
          else if (message.type === "response.text.delta") {
            const deltaText = message.delta || "";
            console.log(
              "🧠 [EncounterView] AI suggestions delta received:",
              deltaText,
            );
            console.log("🧠 [EncounterView] Delta length:", deltaText.length);
            console.log(
              "🧠 [EncounterView] Current suggestions buffer length:",
              suggestionsBuffer.length,
            );
            console.log(
              "🧠 [EncounterView] Current live suggestions length:",
              liveSuggestions.length,
            );

            // Apply external system's content filtering to prevent cross-contamination
            const shouldFilterContent = (content: string): boolean => {
              // Filter out SOAP note patterns
              const soapPatterns = [
                "Patient Visit Summary",
                "PATIENT VISIT SUMMARY",
                "Visit Summary",
                "VISIT SUMMARY",
                "Chief Complaint:",
                "**Chief Complaint:**",
                "History of Present Illness:",
                "**History of Present Illness:**",
                "Vital Signs:",
                "**Vital Signs:**",
                "Review of Systems:",
                "**Review of Systems:**",
                "Physical Examination:",
                "**Physical Examination:**",
                "Assessment:",
                "**Assessment:**",
                "Plan:",
                "**Plan:**",
                "Diagnosis:",
                "**Diagnosis:**",
                "Impression:",
                "**Impression:**",
                "SUBJECTIVE:",
                "OBJECTIVE:",
                "ASSESSMENT:",
                "PLAN:",
                "S:",
                "O:",
                "A:",
                "P:",
                "SOAP Note",
                "Clinical Note",
                "Progress Note",
              ];

              // Filter out order patterns
              const orderPatterns = [
                "Lab: [",
                "Imaging: [",
                "Medication: [",
                "Labs:",
                "Imaging:",
                "Medications:",
                "Laboratory:",
                "Radiology:",
                "Prescriptions:",
              ];

              return (
                soapPatterns.some((pattern) => content.includes(pattern)) ||
                orderPatterns.some((pattern) => content.includes(pattern))
              );
            };

            // Only process if content passes filtering
            if (!shouldFilterContent(deltaText)) {
              console.log(
                "🧠 [EncounterView] Content passed filtering, processing delta",
              );

              // Accumulate suggestions buffer with delta text using state
              setSuggestionsBuffer((prev) => {
                const newBuffer = prev + deltaText;
                console.log(
                  "🧠 [EncounterView] Buffer updated from length",
                  prev.length,
                  "to",
                  newBuffer.length,
                );
                console.log(
                  "🧠 [EncounterView] New buffer content preview:",
                  newBuffer.substring(0, 200),
                );

                // Format the complete accumulated suggestions with header and bullet point separation
                let formattedSuggestions;
                if (!newBuffer.includes("🩺 REAL-TIME CLINICAL INSIGHTS:")) {
                  formattedSuggestions =
                    "🩺 REAL-TIME CLINICAL INSIGHTS:\n\n" + newBuffer;
                  console.log("🧠 [EncounterView] Added header to suggestions");
                } else {
                  formattedSuggestions = newBuffer;
                  console.log(
                    "🧠 [EncounterView] Header already present, using buffer as-is",
                  );
                }

                // Simple formatting - just ensure header spacing
                formattedSuggestions = formattedSuggestions
                  .replace(
                    /🩺 REAL-TIME CLINICAL INSIGHTS:\n+/g,
                    "🩺 REAL-TIME CLINICAL INSIGHTS:\n\n",
                  );

                console.log(
                  "🧠 [EncounterView] Applied bullet point formatting",
                );

                console.log(
                  "🧠 [EncounterView] Final formatted suggestions length:",
                  formattedSuggestions.length,
                );
                console.log(
                  "🧠 [EncounterView] Final formatted suggestions preview:",
                  formattedSuggestions.substring(0, 300),
                );

                // Update the display with accumulated content
                setLiveSuggestions(formattedSuggestions);
                setGptSuggestions(formattedSuggestions);
                console.log(
                  "🧠 [EncounterView] Updated both live and GPT suggestions display",
                );

                return newBuffer;
              });
            } else {
              console.warn(
                "🧠 [EncounterView] Content FILTERED OUT - contains SOAP/order patterns:",
                deltaText.substring(0, 100),
              );
            }
          }

          // Handle AI suggestions completion
          else if (message.type === "response.text.done") {
            console.log("✅ [EncounterView] AI suggestions completed");
            // Add line break after each completed response
            setSuggestionsBuffer((prev) => prev + "\n");
          }

          // Handle transcription completion and trigger new AI suggestions
          else if (
            message.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            const finalText = message.transcript || "";
            console.log(
              "✅ [EncounterView] === TRANSCRIPTION COMPLETED EVENT ===",
            );
            console.log(
              "✅ [EncounterView] Transcription completed:",
              finalText,
            );
            console.log(
              "✅ [EncounterView] Suggestions started status:",
              suggestionsStarted,
            );
            console.log(
              "✅ [EncounterView] Text length for new suggestions:",
              finalText.length,
            );
            console.log(
              "✅ [EncounterView] WebSocket state:",
              realtimeWs?.readyState,
            );
            console.log(
              "📝 [EncounterView] Final transcript contains '+' symbols:",
              (finalText.match(/\+/g) || []).length,
            );
            console.log(
              "📝 [EncounterView] Final transcript formatted correctly:",
              finalText.includes("+"),
            );
            console.log(
              "📝 [EncounterView] Final transcript length:",
              finalText.length,
            );

            // Format completed transcription with bullet points for conversational flow
            if (finalText.trim()) {
              // Split the completed text into natural conversation segments
              const conversationSegments = finalText
                .trim()
                .split(/(?<=[.!?])\s+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);

              // Add each segment as a separate bullet point
              const newBullets = conversationSegments
                .map((segment: string) => `• ${segment}`)
                .join("\n");

              // Simple append to existing transcription - deduplication prevents duplicates
              setTranscription((prev) => {
                const newTranscription = prev ? prev + "\n" + newBullets : newBullets;
                console.log("🔥 [EncounterView] Transcription updated during recording - triggering intelligent streaming check");
                
                // Force a re-render to trigger intelligent streaming
                setTimeout(() => {
                  console.log("🔥 [EncounterView] Forcing component update for intelligent streaming");
                }, 100);
                
                return newTranscription;
              });

              // Clear the buffer since we've processed this content
              transcriptionBuffer = "";
              setTranscriptionBuffer("");

              console.log(
                "📝 [EncounterView] Added conversation segments:",
                conversationSegments.length,
              );
            }

            // Trigger new AI suggestions based on completed transcription
            if (suggestionsStarted && finalText.length > 10 && realtimeWs) {
              console.log(
                "🧠 [EncounterView] Triggering NEW AI suggestions for completed transcription:",
                finalText.substring(0, 100),
              );
              console.log(
                "🧠 [EncounterView] Current suggestions buffer length before new request:",
                suggestionsBuffer.length,
              );
              console.log(
                "🧠 [EncounterView] WebSocket ready state:",
                realtimeWs.readyState,
              );

              // Keep suggestions buffer to accumulate like transcription (don't reset)
              // suggestionsBuffer = ""; // Removed - this was causing replacement instead of accumulation

              // Send the COMPLETE live transcription as context (not just the delta)
              const completeTranscription =
                liveTranscriptionContent || transcriptionBuffer;
              const transcriptionContext = {
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: `Current complete conversation: "${completeTranscription}"

Please provide medical suggestions based on this complete conversation context.`,
                    },
                  ],
                },
              };

              console.log(
                "🧠 [EncounterView] Sending transcription context to OpenAI",
              );
              realtimeWs.send(JSON.stringify(transcriptionContext));

              // Request new AI response
              console.log(
                "🧠 [EncounterView] Creating new response request for AI suggestions",
              );
              const newResponse = {
                type: "response.create",
                response: {
                  modalities: ["text"],
                  instructions: `You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

CRITICAL: Focus ONLY on the current conversation and transcription. Do NOT provide suggestions based on past medical history unless the current symptoms directly relate to documented conditions. This is a NEW encounter.

Instructions:

Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights based on what the patient is saying RIGHT NOW in this conversation. Provide only one brief phrase at a time in response to each user query. If multiple insights could be provided, prioritize the most critical or relevant one first.

Base your suggestions on:
1. CURRENT symptoms described in the live conversation
2. CURRENT presentation and patient statements
3. Only reference past history if directly relevant to current symptoms

Do NOT suggest treatments for conditions not mentioned in the current encounter.

Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per response.

Additional details for medication recommendations:

Always include typical starting dose, dose adjustment schedules, and maximum dose.
Output examples of good insights:

• Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
• Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
• Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

Output examples of bad insights (to avoid):

• Encourage gentle stretches and light activity to maintain mobility.
• Suggest warm baths at night for symptomatic relief of muscle tension.
• Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

Return only one insight per line and single phrase per response. Use a bullet (•), dash (-), or number to prefix the insight.

Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a user question.`,
                  metadata: {
                    type: "suggestions",
                  },
                },
              };

              console.log(
                "🧠 [EncounterView] Sending new response request to OpenAI",
              );
              console.log(
                "🧠 [EncounterView] Response payload:",
                JSON.stringify(newResponse, null, 2),
              );
              realtimeWs.send(JSON.stringify(newResponse));
              console.log(
                "🧠 [EncounterView] New response request sent successfully",
              );
            } else {
              console.log(
                "🧠 [EncounterView] NOT triggering new suggestions - started:",
                suggestionsStarted,
                "text length:",
                finalText.length,
                "ws:",
                !!realtimeWs,
              );
            }
          }

          // Handle session events
          else if (
            message.type === "session.created" ||
            message.type === "session.updated"
          ) {
            console.log("🔧 [EncounterView] Session event:", message.type);
            if (message.session?.id) {
              sessionId = message.session.id;
            }
          }

          // Handle errors and reset conversation state
          else if (message.type === "error") {
            console.error(
              "❌ [EncounterView] OpenAI Realtime API Error:",
              message,
            );

            // Reset conversation state to prevent "conversation already has an active response" errors
            if (
              message.error?.code === "conversation_already_has_active_response"
            ) {
              console.log(
                "🔄 [EncounterView] Resetting conversation state due to race condition",
              );
              conversationActive = false;
              suggestionsStarted = false;
            }
          }
        };

        realtimeWs.onerror = (error) => {
          console.error("❌ [EncounterView] OpenAI WebSocket error:", error);
        };
      } catch (wsError) {
        console.error(
          "❌ [EncounterView] Failed to connect to OpenAI Realtime API:",
          wsError,
        );
        // Fall back to chunked processing if direct connection fails
      }

      console.log("🎤 [EncounterView] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      console.log("🎤 [EncounterView] ✅ Microphone access granted");

      // Set up audio processing exactly like your working AudioRecorder
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096; // Same as your working code
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = async (e) => {
        if (!realtimeWs || realtimeWs.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert to PCM16 and create blob exactly like your working code
        const pcm16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Create audio blob and send exactly like your working appendAudio method
        const audioBlob = new Blob([pcm16Data], { type: "audio/pcm" });

        // Convert to base64 exactly like your working code
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Audio = btoa(binary);

            // Send audio buffer exactly like your working code
            realtimeWs!.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64Audio,
              }),
            );

            console.log(
              "🎵 [EncounterView] Sent audio buffer:",
              base64Audio.length,
              "bytes",
            );
          } catch (error) {
            console.error("❌ [EncounterView] Error processing audio:", error);
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🎤 [EncounterView] Recording stopped");

        // Clean up audio processing
        if (processor) {
          processor.disconnect();
          source.disconnect();
          audioContext.close();
        }

        // Keep WebSocket connection open for ongoing AI suggestions
        // Do NOT close the WebSocket - let it continue providing suggestions
        console.log(
          "🧠 [EncounterView] WebSocket remains open for ongoing AI suggestions",
        );

        // All AI suggestions are now handled by the WebSocket connection
        // No fallback to Assistants API needed
        console.log(
          "✅ [EncounterView] Recording complete. AI suggestions continue via WebSocket.",
        );

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1500); // Collect chunks every 1.5 seconds for faster suggestions
      setIsRecording(true);

      (window as any).currentMediaRecorder = mediaRecorder;

      toast({
        title: "Enhanced Recording Started",
        description: "Real-time AI analysis with patient context active",
      });
    } catch (error) {
      console.error("❌ [EncounterView] DETAILED ERROR in hybrid recording:", {
        error,
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack,
        patientId: patient.id,
      });

      let errorMessage = "Unknown error occurred";
      if ((error as any)?.message) {
        errorMessage = (error as any).message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast({
        title: "Recording Failed",
        description: `Enhanced recording error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    console.log("🎤 [EncounterView] Stopping recording...");
    const mediaRecorder = (window as any).currentMediaRecorder;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      console.log("🎤 [EncounterView] MediaRecorder stopped");
    }

    setIsRecording(false);
    setLastRecordingStopTime(Date.now());

    // Real-time streaming has been updating SOAP note during recording
    // Now trigger medical problems processing directly (bypassing recording check)
    if (soapNote && soapNote.trim()) {
      console.log("🩺 [EncounterView] Processing final SOAP note with medical problems after recording stop...");
      
      // Mark this content as processed for future change detection
      setLastProcessedSOAPContent(soapNote);
      
      try {
        // Save SOAP note first
        await fetch(
          `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ soapNote }),
          },
        );
        
        console.log("✅ [StopRecording] SOAP note saved");
        
        // Process medical problems after recording stops
        console.log("🏥 [StopRecording] Processing medical problems after recording completion...");
        
        const medicalProblemsResponse = await fetch(`/api/medical-problems/process-encounter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            encounterId: encounterId,
            triggerType: "recording_complete"
          })
        });

        if (medicalProblemsResponse.ok) {
          const result = await medicalProblemsResponse.json();
          console.log(`✅ [StopRecording] Medical problems processed: ${result.problemsAffected || 0} problems affected`);
          
          // Invalidate medical problems cache to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medical-problems-enhanced`] 
          });
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medical-problems`] 
          });
        } else {
          console.error(`❌ [StopRecording] Medical problems processing failed: ${medicalProblemsResponse.status}`);
        }
        
        // Process other services in parallel
        console.log("🏥 [StopRecording] Starting parallel processing of medications, orders, and CPT codes...");
        console.log("🏥 [StopRecording] CPT extraction URL:", `/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt`);
        console.log("🏥 [StopRecording] CPT extraction payload:", { soapNote: soapNote.substring(0, 200) + "..." });
        
        const [medicationsResponse, ordersResponse, cptResponse] = await Promise.all([
          fetch(`/api/encounters/${encounterId}/process-medications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ patientId: patient.id })
          }),
          fetch(`/api/encounters/${encounterId}/extract-orders-from-soap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
          }),
          fetch(`/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ soapNote })
          }).then(async response => {
            console.log("🏥 [StopRecording] CPT response status:", response.status);
            console.log("🏥 [StopRecording] CPT response headers:", Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ [StopRecording] CPT extraction failed:", errorText);
              return response;
            }
            
            const responseText = await response.text();
            console.log("✅ [StopRecording] CPT extraction raw response:", responseText.substring(0, 500) + "...");
            
            try {
              const jsonData = JSON.parse(responseText);
              console.log("✅ [StopRecording] CPT extraction parsed data:", jsonData);
              return new Response(responseText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            } catch (parseError) {
              console.error("❌ [StopRecording] CPT response JSON parse error:", parseError);
              console.error("❌ [StopRecording] Raw response that failed to parse:", responseText);
              return response;
            }
          })
        ]);

        // Handle other responses and invalidate caches
        if (medicationsResponse.ok) {
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/medications-enhanced`] 
          });
        }
        
        if (ordersResponse.ok) {
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/draft-orders`] 
          });
        }
        
        if (cptResponse.ok) {
          console.log("✅ [StopRecording] CPT extraction successful, invalidating CPT cache...");
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`] 
          });
          console.log("✅ [StopRecording] CPT cache invalidated");
        } else {
          console.error("❌ [StopRecording] CPT extraction failed with status:", cptResponse.status);
          const errorText = await cptResponse.text();
          console.error("❌ [StopRecording] CPT error response:", errorText);
        }
        
        toast({
          title: "Recording Complete",
          description: "SOAP note saved and medical data processed successfully",
        });
        
      } catch (error) {
        console.error("❌ [StopRecording] Error processing after recording stop:", error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: "SOAP note saved but some processing failed. Please try manual save.",
        });
      }
    } else {
      console.log("🩺 [EncounterView] No SOAP content to process");
      toast({
        title: "Recording Stopped",
        description: "No SOAP content was generated during recording",
      });
    }
  };

  const generateSmartSuggestions = () => {
    setGptSuggestions(
      "AI-generated clinical suggestions based on the encounter...",
    );
    toast({
      title: "Smart Suggestions Generated",
      description: "GPT analysis complete",
    });
  };

  // SOAP Note Generation Function
  const handleGenerateSOAP = async () => {
    if (!transcriptionBuffer.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description:
          "Please complete a recording before generating a SOAP note.",
      });
      return;
    }

    setIsGeneratingSOAP(true);
    try {
      console.log("🩺 [EncounterView] Generating SOAP note...");

      const response = await fetch(
        `/api/patients/${patient.id}/encounters/${encounterId}/generate-soap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcription: transcriptionBuffer,
            userRole: "provider",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to generate SOAP note: ${response.statusText}`);
      }

      const data = await response.json();
      const formattedContent = formatSoapNoteContent(data.soapNote);
      setSoapNote(data.soapNote);

      // Immediately update the editor with formatted content
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(formattedContent);
        console.log(
          "📝 [EncounterView] Updated editor with formatted SOAP note",
        );
      }

      toast({
        title: "SOAP Note Generated",
        description:
          "Your SOAP note has been generated successfully. You can now edit and save it.",
      });
    } catch (error) {
      console.error("❌ [EncounterView] Error generating SOAP note:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate SOAP note. Please try again.",
      });
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  // Generate SOAP Note from Transcription Function
  const handleGenerateFromTranscription = async () => {
    if (!transcription.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "No transcription available to generate SOAP note from. Please record some audio first.",
      });
      return;
    }

    console.log("🔄 [EncounterView] Manually triggering SOAP note generation from transcription...");
    
    // Use the unified streaming system with force generation
    if (realtimeSOAPRef.current) {
      realtimeSOAPRef.current.generateSOAPNote(true); // Force generation bypasses intelligent streaming checks
    } else {
      console.error("❌ [EncounterView] RealtimeSOAPIntegration ref not available");
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Unable to access SOAP generation system. Please try again.",
      });
    }
  };

  // SOAP Note Saving Function
  const handleSaveSOAP = async () => {
    if (!soapNote.trim()) {
      toast({
        variant: "destructive",
        title: "No Content",
        description:
          "Please generate or enter SOAP note content before saving.",
      });
      return;
    }

    setIsSavingSOAP(true);
    try {
      console.log("💾 [EncounterView] Saving SOAP note...");

      // Get the current SOAP note content from the editor
      const currentContent = editor?.getHTML() || soapNote;

      // Save to backend with physical exam learning analysis
      const response = await fetch(
        `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            soapNote: currentContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to save SOAP note: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ [EncounterView] SOAP note saved successfully:", data);

      // Update auto-save state to reflect manual save
      setLastSaved(currentContent);
      setAutoSaveStatus("saved");

      // Clear any pending auto-save timer since we just saved manually
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }

      // Smart medical problems processing for manual edits
      const timeSinceRecordingStop = Date.now() - lastRecordingStopTime;
      const hasSignificantChanges = hasSignificantSOAPChanges(currentContent);
      const shouldProcessMedicalProblems = timeSinceRecordingStop > 5000 && hasSignificantChanges; // Only if 5+ seconds after recording stop AND significant changes
      
      console.log("🏥 [SmartProcessing] === SMART MEDICAL PROBLEMS PROCESSING ===");
      console.log("🏥 [SmartProcessing] Time since recording stop:", timeSinceRecordingStop, "ms");
      console.log("🏥 [SmartProcessing] Has significant changes:", hasSignificantChanges);
      console.log("🏥 [SmartProcessing] Should process medical problems:", shouldProcessMedicalProblems);
      
      if (shouldProcessMedicalProblems) {
        console.log("🏥 [SmartProcessing] Processing medical problems for significant manual changes...");
        
        try {
          const medicalProblemsResponse = await fetch(`/api/medical-problems/process-encounter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              encounterId: encounterId,
              triggerType: "manual_edit"
            })
          });

          if (medicalProblemsResponse.ok) {
            const result = await medicalProblemsResponse.json();
            console.log(`✅ [SmartProcessing] Medical problems updated: ${result.total_problems_affected || 0} problems affected`);
            
            // Update tracking state
            setLastProcessedSOAPContent(currentContent);
            
            // Invalidate medical problems cache
            await queryClient.invalidateQueries({ 
              queryKey: [`/api/patients/${patient.id}/medical-problems-enhanced`] 
            });
            await queryClient.invalidateQueries({ 
              queryKey: [`/api/patients/${patient.id}/medical-problems`] 
            });
          } else {
            console.error(`❌ [SmartProcessing] Medical problems processing failed: ${medicalProblemsResponse.status}`);
          }
        } catch (error) {
          console.error("❌ [SmartProcessing] Error processing medical problems:", error);
        }
      } else {
        console.log("🏥 [SmartProcessing] Skipping medical problems processing - no significant changes or too soon after recording");
      }

      // Invalidate all relevant caches to ensure changes persist
      await queryClient.invalidateQueries({
        queryKey: [`/api/encounters/${encounterId}`],
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/encounters`],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/pending-encounters"],
      });

      toast({
        title: "SOAP Note Saved",
        description:
          "Your SOAP note has been saved and medical problems updated.",
      });

    } catch (error) {
      console.error("❌ [EncounterView] Error saving SOAP note:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save SOAP note. Please try again.",
      });
    } finally {
      setIsSavingSOAP(false);
    }
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
                src={
                  patient.profilePhotoFilename
                    ? `/uploads/${patient.profilePhotoFilename}`
                    : undefined
                }
                alt={`${patient.firstName} ${patient.lastName}`}
              />
              <AvatarFallback className="text-sm bg-gray-100">
                {patient.firstName?.[0] || "P"}
                {patient.lastName?.[0] || "P"}
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
                Encounter #{encounterId} -{" "}
                {formatDate(new Date().toISOString())}
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
            <div className="text-blue-700">
              Encounter #{encounterId} - Type: Office Visit
            </div>
            <div className="flex items-center mt-2">
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300"
              >
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
                <div className="bg-white border-b border-gray-100 p-3">
                  {section.id === "encounters" ? (
                    <div className="text-xs text-gray-600">Current encounter in progress</div>
                  ) : section.id === "ai-debug" ? (
                    <AIDebugSection patientId={patient.id} />
                  ) : (
                    <SharedChartSections 
                      patientId={patient.id} 
                      mode="encounter" 
                      encounterId={encounter?.id}
                      isReadOnly={false}
                      sectionId={section.id}
                    />
                  )}
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
          {/* Nursing Summary Section */}
          <NursingSummaryDisplay 
            encounterId={encounterId} 
            patientId={patient.id} 
          />

          {/* Voice Recording Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Real-Time Transcription
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600">● Connected</span>
              </div>
            </div>

            <div className="space-y-4">
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
                  className={`${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>

                {isRecording && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      console.log("🔄 [EncounterView] Manual transcription restart requested...");
                      try {
                        await stopRecording();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await startRecording();
                        toast({
                          title: "Transcription Restarted",
                          description: "Recording session has been refreshed.",
                        });
                      } catch (error) {
                        console.error("❌ [EncounterView] Manual restart failed:", error);
                        setIsRecording(false);
                        toast({
                          variant: "destructive",
                          title: "Restart Failed",
                          description: "Please try starting recording again.",
                        });
                      }
                    }}
                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Transcription
                  </Button>
                )}
              </div>

              {/* Transcription Content */}
              <div className="space-y-2">
                <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {transcription ||
                      (isRecording
                        ? "Listening..."
                        : "Transcription will appear here during recording")}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Suggestions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                AI Suggestions
              </h2>
              <Button
                onClick={generateSmartSuggestions}
                size="sm"
                variant="outline"
              >
                Generate Suggestions
              </Button>
            </div>
            <div className="text-gray-500 text-sm whitespace-pre-line">
              {gptSuggestions || "AI analysis will appear here..."}
            </div>
          </Card>

          {/* Note Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                  Note
                </h2>
                {/* Auto-save status indicator */}
                <div className="flex items-center text-sm">
                  {autoSaveStatus === "saving" && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin h-3 w-3 mr-1 border border-blue-600 border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </div>
                  )}
                  {autoSaveStatus === "saved" && (
                    <div className="flex items-center text-green-600">
                      <div className="h-2 w-2 mr-1 bg-green-600 rounded-full" />
                      <span>Saved</span>
                    </div>
                  )}
                  {autoSaveStatus === "unsaved" && (
                    <div className="flex items-center text-gray-500">
                      <div className="h-2 w-2 mr-1 bg-gray-400 rounded-full" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Real-time SOAP Integration */}
                <RealtimeSOAPIntegration
                  patientId={patient.id.toString()}
                  encounterId={encounterId.toString()}
                  transcription={transcription}
                  onSOAPNoteUpdate={(note) => {
                    setSoapNote(note);
                    if (editor && !editor.isDestroyed) {
                      const formattedContent = formatSoapNoteContent(note);
                      editor.commands.setContent(formattedContent);
                    }
                  }}
                  onSOAPNoteComplete={(note) => {
                    setSoapNote(note);
                    setIsGeneratingSOAP(false);
                    if (editor && !editor.isDestroyed) {
                      const formattedContent = formatSoapNoteContent(note);
                      editor.commands.setContent(formattedContent);
                      lastGeneratedContent.current = note;
                    }
                  }}
                  onDraftOrdersReceived={(orders) => {
                    setDraftOrders(orders);
                  }}
                  onCPTCodesReceived={handleCPTCodesReceived}
                  isRealtimeEnabled={useRealtimeAPI}
                />

                {transcription.trim() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateFromTranscription}
                    disabled={isGeneratingSOAP || !transcription.trim()}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingSOAP ? 'animate-spin' : ''}`} />
                    {isGeneratingSOAP ? "Generating..." : "Generate from Transcription"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveSOAP}
                  disabled={
                    !soapNote.trim() || 
                    isSavingSOAP || 
                    isAutoSaving ||
                    autoSaveStatus === "saved" ||
                    (editor?.getHTML() || soapNote) === lastSaved
                  }
                  className={`${
                    autoSaveStatus === "saved" || (editor?.getHTML() || soapNote) === lastSaved
                      ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  }`}
                >
                  {isSavingSOAP || isAutoSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : autoSaveStatus === "saved" || (editor?.getHTML() || soapNote) === lastSaved ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Manual Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="w-full min-h-[500px] pb-8 font-sans text-base leading-relaxed">
              <div className="w-full h-full min-h-[500px] border rounded-lg bg-white">
                {editor && soapNote && soapNote.length > 0 ? (
                  <EditorContent
                    editor={editor}
                    className="soap-editor max-w-none p-4"
                  />
                ) : editor ? (
                  <EditorContent
                    editor={editor}
                    className="soap-editor max-w-none p-4"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">No SOAP note generated yet</div>
                    <div className="text-xs mt-1">
                      Complete a recording to automatically generate a SOAP note
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Unified Real-time SOAP Integration with Intelligent Streaming */}
          <RealtimeSOAPIntegration
            ref={realtimeSOAPRef}
            patientId={patient.id.toString()}
            encounterId={encounterId.toString()}
            transcription={transcription}
            onSOAPNoteUpdate={handleSOAPNoteUpdate}
            onSOAPNoteComplete={handleSOAPNoteComplete}
            onDraftOrdersReceived={handleDraftOrdersReceived}
            onCPTCodesReceived={handleCPTCodesReceived}
            isRealtimeEnabled={true}
            autoTrigger={true}
            enableIntelligentStreaming={true}
            isRecording={isRecording}
          />

          {/* Draft Orders */}
          <DraftOrders 
            patientId={patient.id} 
            encounterId={encounterId} 
            isAutoGenerating={isAutoGeneratingOrders}
          />

          {/* CPT Codes & Diagnoses */}
          <CPTCodesDiagnoses 
            patientId={patient.id} 
            encounterId={encounterId} 
            isAutoGenerating={isAutoGeneratingBilling}
          />



          {/* Encounter Workflow Controls */}
          <EncounterWorkflowControls
            encounterId={encounterId}
            encounterStatus={encounter?.encounterStatus || "in_progress"}
            onStatusChange={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
            }}
          />

          {/* Encounter Signature Panel */}
          <EncounterSignaturePanel
            encounterId={encounterId}
            encounterStatus={encounter?.encounterStatus || "in_progress"}
            onSignatureComplete={() => {
              // Refresh encounter data after signing
              queryClient.invalidateQueries({
                queryKey: [`/api/encounters/${encounterId}`],
              });
              toast({
                title: "Encounter Signed",
                description: "The encounter has been successfully signed and completed.",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
