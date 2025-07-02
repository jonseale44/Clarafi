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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
} from "lucide-react";
import { Patient } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SOAPNoteEditor } from "@/components/ui/soap-note-editor";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SharedChartSections } from "./shared-chart-sections";
import { UnifiedChartPanel } from "./unified-chart-panel";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import { DraftOrders } from "./draft-orders";
import { CPTCodesDiagnoses } from "./cpt-codes-diagnoses";

import { EncounterSignaturePanel } from "./encounter-signature-panel";
import { EncounterWorkflowControls } from "./encounter-workflow-controls";
import { EmbeddedPDFViewer } from "./embedded-pdf-viewer";
import {
  RealtimeSOAPIntegration,
  RealtimeSOAPRef,
} from "@/components/RealtimeSOAPIntegration";
import { NoteTypeSelector } from "@/components/NoteTypeSelector";

import { NursingSummaryDisplay } from "@/components/nursing-summary-display";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { ComprehensiveLabTable } from "@/components/labs/comprehensive-lab-table";

interface EncounterDetailViewProps {
  patient: Patient;
  encounterId: number;
  encounter?: any;
  onBackToChart: () => void;
}

// Vulnerable Window Loading Screen Component
interface VulnerableWindowLoadingScreenProps {
  userEditingLock: boolean;
  contentLength: number;
}

const VulnerableWindowLoadingScreen = ({
  userEditingLock,
  contentLength,
}: VulnerableWindowLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // 4-second progress animation (matches vulnerable window duration)
    const startTime = Date.now();
    const duration = 4000; // 4 seconds
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 50); // Update every 50ms for smooth progression
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center z-50">
      <div className="text-center space-y-4 p-8">
        <div className="mx-auto w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div 
            className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
            style={{
              borderTopColor: 'transparent',
              borderRightColor: '#2563eb',
              borderBottomColor: '#2563eb',
              borderLeftColor: '#2563eb',
            }}
          ></div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Protecting Your Edits
          </h3>
          <p className="text-sm text-gray-600">
            Editor locked to prevent API overwrites
          </p>
        </div>
        
        <div className="w-64 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <div>{Math.round(progress)}% complete</div>
          <div className="flex justify-between text-xs">
            <span>Lock: {userEditingLock ? "Active" : "Inactive"}</span>
            <span>Content: {contentLength} chars</span>
          </div>
        </div>
        
        <div className="text-xs text-blue-600 max-w-xs">
          This prevents delayed AI responses from overwriting your manual edits.
        </div>
      </div>
    </div>
  );
};

const chartSections = [
  { id: "encounters", label: "Patient Encounters" },
  { id: "problems", label: "Medical Problems" },
  { id: "medication", label: "Medication" },
  { id: "allergies", label: "Allergies" },
  { id: "labs", label: "Labs" },
  { id: "vitals", label: "Vitals" },
  { id: "imaging", label: "Imaging" },
  { id: "documents", label: "Patient Documents" },
  { id: "family-history", label: "Family History" },
  { id: "social-history", label: "Social History" },
  { id: "surgical-history", label: "Surgical History" },
  { id: "attachments", label: "Attachments" },
  { id: "appointments", label: "Appointments" },

];



export function EncounterDetailView({
  patient,
  encounterId,
  encounter,
  onBackToChart,
}: EncounterDetailViewProps) {
  // Get current user for role-based filtering
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  }) as { data?: { id?: number; role?: string } };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<"INACTIVE" | "ACTIVE">("INACTIVE");
  const [transcription, setTranscription] = useState("");
  const [mediaRecorderRef, setMediaRecorderRef] = useState<MediaRecorder | null>(null);
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
  const [selectedNoteType, setSelectedNoteType] = useState<string>("soap");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const useRealtimeAPI = true; // Real-time API enabled by default in background
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [cptCodes, setCptCodes] = useState<any[]>([]);
  const [gptSuggestions, setGptSuggestions] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState("");
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0);
  const [suggestionsBuffer, setSuggestionsBuffer] = useState("");
  const [liveTranscriptionContent, setLiveTranscriptionContent] = useState(""); // Unified content for AI
  const [useRestAPI, setUseRestAPI] = useState<boolean>(true);
  const [isGeneratingRestSuggestions, setIsGeneratingRestSuggestions] = useState(false);
  const [suggestionProgress, setSuggestionProgress] = useState(0);
  const [isGeneratingSmartSuggestions, setIsGeneratingSmartSuggestions] = useState(false);
  const [lastSuggestionCall, setLastSuggestionCall] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState(0);

  // User edit lock system to prevent AI overwrites
  const [userEditingLock, setUserEditingLock] = useState(false);
  const [recordingCooldown, setRecordingCooldown] = useState(false);
  const [lastUserEditTime, setLastUserEditTime] = useState<number | null>(null);

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
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | ""
  >("");

  // Transcription auto-save functionality
  const transcriptionAutoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedTranscription, setLastSavedTranscription] = useState<string>("");
  const [transcriptionSaveStatus, setTranscriptionSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | ""
  >("");

  // Auto-save transcription function
  const autoSaveTranscription = async (rawTranscription: string, processedTranscription?: string) => {
    if (!rawTranscription.trim() || rawTranscription === lastSavedTranscription) {
      return; // Don't save empty content or unchanged content
    }

    setTranscriptionSaveStatus("saving");

    try {
      console.log(
        "🎤 [TranscriptionAutoSave] Saving transcription automatically...",
        `Raw: ${rawTranscription.length} chars, Processed: ${processedTranscription?.length || 0} chars`
      );

      const response = await fetch(
        `/api/patients/${patient.id}/encounters/${encounterId}/transcription`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcriptionRaw: rawTranscription,
            transcriptionProcessed: processedTranscription || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to auto-save transcription: ${response.statusText}`,
        );
      }

      console.log("✅ [TranscriptionAutoSave] Transcription auto-saved successfully");
      setLastSavedTranscription(rawTranscription);
      setTranscriptionSaveStatus("saved");

    } catch (error) {
      console.error("❌ [TranscriptionAutoSave] Failed to auto-save transcription:", error);
      setTranscriptionSaveStatus("unsaved");
    }
  };

  // Debounced transcription auto-save trigger
  const triggerTranscriptionAutoSave = (rawContent: string, processedContent?: string) => {
    // Only trigger auto-save if there are actual changes
    if (!rawContent.trim() || rawContent === lastSavedTranscription) {
      setTranscriptionSaveStatus("saved");
      return;
    }

    if (transcriptionAutoSaveTimer.current) {
      clearTimeout(transcriptionAutoSaveTimer.current);
    }

    setTranscriptionSaveStatus("unsaved");

    // Auto-save after 5 seconds of inactivity during recording
    transcriptionAutoSaveTimer.current = setTimeout(() => {
      autoSaveTranscription(rawContent, processedContent);
    }, 5000);
  };

  // Track automatic SOAP generation after stopping recording
  const [isAutoGeneratingSOAP, setIsAutoGeneratingSOAP] = useState(false);

  // Track automatic medical problems, orders and billing generation after stopping recording
  const [isAutoGeneratingMedicalProblems, setIsAutoGeneratingMedicalProblems] = useState(false);
  const [isAutoGeneratingOrders, setIsAutoGeneratingOrders] = useState(false);
  const [isAutoGeneratingBilling, setIsAutoGeneratingBilling] = useState(false);
  
  // Enhanced progress tracking for medical problems, orders and billing animations
  const [medicalProblemsProgress, setMedicalProblemsProgress] = useState(0);
  const [ordersProgress, setOrdersProgress] = useState(0);
  const [billingProgress, setBillingProgress] = useState(0);
  const medicalProblemsProgressInterval = useRef<NodeJS.Timeout | null>(null);
  const ordersProgressInterval = useRef<NodeJS.Timeout | null>(null);
  const billingProgressInterval = useRef<NodeJS.Timeout | null>(null);

  // Medical problems processing state tracking
  const [lastProcessedSOAPContent, setLastProcessedSOAPContent] =
    useState<string>("");
  const [lastRecordingStopTime, setLastRecordingStopTime] = useState<number>(0);

  // Function removed - GPT unified parser now handles all medical problem processing decisions

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
      console.log(
        "💾 [AutoSave] Saving SOAP note automatically...",
        content.length,
        "characters",
      );

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
        throw new Error(
          `Failed to auto-save SOAP note: ${response.statusText}`,
        );
      }

      console.log("✅ [AutoSave] SOAP note auto-saved successfully");
      setLastSaved(content);
      setAutoSaveStatus("saved");

      // NOTE: Medical problems processing removed from auto-save
      // Medical problems will only be processed when:
      // 1. Recording stops (stopRecording function)
      // 2. Manual save with significant changes outside of recording
      console.log(
        "💾 [AutoSave] Auto-save completed - medical problems processing skipped (will process on recording stop)",
      );

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

  // Animation helper functions for medical problems, orders and billing progress
  const startMedicalProblemsAnimation = () => {
    console.log("🎬 [MedicalProblemsAnimation] Starting medical problems animation");
    setIsAutoGeneratingMedicalProblems(true);
    setMedicalProblemsProgress(0);
    
    const startTime = Date.now();
    const estimatedDuration = 4500; // Medical problems typically take 4.5 seconds (GPT-4.1 processing)
    
    medicalProblemsProgressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setMedicalProblemsProgress(progress);
    }, 50);
  };

  const completeMedicalProblemsAnimation = () => {
    console.log("✅ [MedicalProblemsAnimation] Completing medical problems animation");
    if (medicalProblemsProgressInterval.current) {
      clearInterval(medicalProblemsProgressInterval.current);
      medicalProblemsProgressInterval.current = null;
    }
    
    setMedicalProblemsProgress(100);
    setTimeout(() => {
      setIsAutoGeneratingMedicalProblems(false);
      setMedicalProblemsProgress(0);
    }, 500);
  };

  const startOrdersAnimation = () => {
    console.log("🎬 [OrdersAnimation] Starting orders animation");
    setIsAutoGeneratingOrders(true);
    setOrdersProgress(0);
    
    const startTime = Date.now();
    const estimatedDuration = 4000; // Orders typically take 4 seconds
    
    ordersProgressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setOrdersProgress(progress);
    }, 50);
  };

  const completeOrdersAnimation = () => {
    console.log("✅ [OrdersAnimation] Completing orders animation");
    if (ordersProgressInterval.current) {
      clearInterval(ordersProgressInterval.current);
      ordersProgressInterval.current = null;
    }
    
    setOrdersProgress(100);
    setTimeout(() => {
      setIsAutoGeneratingOrders(false);
      setOrdersProgress(0);
    }, 500);
  };

  const startBillingAnimation = () => {
    console.log("🎬 [BillingAnimation] Starting billing animation");
    setIsAutoGeneratingBilling(true);
    setBillingProgress(0);
    
    const startTime = Date.now();
    const estimatedDuration = 3500; // Billing typically takes 3.5 seconds
    
    billingProgressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setBillingProgress(progress);
    }, 50);
  };

  const completeBillingAnimation = () => {
    console.log("✅ [BillingAnimation] Completing billing animation");
    if (billingProgressInterval.current) {
      clearInterval(billingProgressInterval.current);
      billingProgressInterval.current = null;
    }
    
    setBillingProgress(100);
    setTimeout(() => {
      setIsAutoGeneratingBilling(false);
      setBillingProgress(0);
    }, 500);
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (medicalProblemsProgressInterval.current) {
        clearInterval(medicalProblemsProgressInterval.current);
      }
      if (ordersProgressInterval.current) {
        clearInterval(ordersProgressInterval.current);
      }
      if (billingProgressInterval.current) {
        clearInterval(billingProgressInterval.current);
      }
    };
  }, []);

  // Handlers for Real-time SOAP Integration
  const handleSOAPNoteUpdate = (note: string) => {
    setSoapNote(note);
    if (editor && !editor.isDestroyed) {
      const formattedContent = formatSoapNoteContent(note);
      editor.commands.setContent(formattedContent);
    }
  };

  const handleSOAPNoteComplete = async (note: string) => {
    console.log(
      `🚨 [DEBUG] handleSOAPNoteComplete FUNCTION CALLED!!! This is the main trigger!`,
    );
    console.log(
      `🚨 [DEBUG] Stack trace to see who called this:`,
      new Error().stack,
    );

    const timestamp = new Date().toISOString();
    console.log(`🔍 [EncounterView] === SOAP NOTE COMPLETION START ===`);
    console.log(`🔍 [EncounterView] Time: ${timestamp}`);
    console.log(`🔍 [EncounterView] Note length: ${note.length}`);
    console.log(
      `🔍 [EncounterView] Patient: ${patient?.id || "MISSING"}, Encounter: ${encounterId || "MISSING"}`,
    );
    console.log(`🔍 [EncounterView] Patient object:`, patient);
    console.log(
      `🔍 [EncounterView] Recording state: ${isRecording ? "ACTIVE" : "STOPPED"}`,
    );
    console.log(`🔍 [EncounterView] About to save SOAP note to encounter...`);

    // CRITICAL SAFEGUARD: Prevent medical problems processing during active recording
    if (isRecording) {
      console.log(
        `🚫 [EncounterView] BLOCKING medical problems processing - recording is ACTIVE`,
      );
      console.log(
        `🚫 [EncounterView] SOAP note will be saved but medical problems processing skipped until recording stops`,
      );

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
        console.log(
          `✅ [EncounterView] SOAP note saved during recording - medical processing deferred`,
        );
      } catch (error) {
        console.error(
          "❌ [EncounterView] Error saving SOAP note during recording:",
          error,
        );
      }

      return; // Exit early - no medical processing during recording
    }

    console.log(
      `✅ [EncounterView] Recording is STOPPED - proceeding with full medical processing`,
    );

    // Reset all generating states when SOAP generation completes
    setIsGeneratingSOAP(false);
    setIsAutoGeneratingSOAP(false);
    setIsAutoGeneratingOrders(false);
    setIsAutoGeneratingBilling(false);
    
    // Complete the progress animation
    setGenerationProgress(100);
    setTimeout(() => {
      setGenerationProgress(0);
    }, 500);

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
      
      // 🔑 Set baseline hash for chart update detection immediately after SOAP save
      const baselineHash = generateSOAPHash(note);
      setLastProcessedSOAPHash(baselineHash);
      console.log("🔑 [ChartUpdate] Setting baseline hash after recording stop:", baselineHash);
      
      console.log(
        `🔍 [EncounterView] SOAP save completed successfully, starting medical problems processing...`,
      );

      // Process medical problems, medications, orders, and billing in parallel with delta analysis
      try {
        console.log(
          `🏥 [ParallelProcessing] === PARALLEL PROCESSING START ===`,
        );
        console.log(`🏥 [ParallelProcessing] Patient ID: ${patient.id}`);
        console.log(`🏥 [ParallelProcessing] Encounter ID: ${encounterId}`);
        console.log(
          `🏥 [ParallelProcessing] SOAP Note length: ${note.length} characters`,
        );
        console.log(
          `🏥 [ParallelProcessing] SOAP Note preview: ${note.substring(0, 200)}...`,
        );

        const triggerType = "manual_edit"; // Manual save from SOAP editor
        const medicalProblemsRequestBody = {
          encounterId: encounterId,
          triggerType: triggerType,
        };

        const medicationsRequestBody = {
          patientId: patient.id,
        };

        const ordersRequestBody = {
          // Orders extraction doesn't need additional data as it reads from encounter SOAP note
        };

        const cptRequestBody = {
          // CPT extraction reads from encounter SOAP note
        };

        console.log(
          `🏥 [ParallelProcessing] Medical problems request body:`,
          medicalProblemsRequestBody,
        );
        console.log(
          `🏥 [ParallelProcessing] Medications request body:`,
          medicationsRequestBody,
        );
        console.log(
          `🏥 [ParallelProcessing] Orders request body:`,
          ordersRequestBody,
        );
        console.log(
          `🏥 [ParallelProcessing] CPT request body:`,
          cptRequestBody,
        );

        // Allergy processing request body
        const allergyRequestBody = {
          patientId: patient.id,
          encounterId: encounterId,
          soapNote: note,
          attachmentContent: null, // No attachment for SOAP processing
          attachmentId: null,
          triggerType: "recording_complete",
          providerId: 1, // Current user ID
        };

        console.log(
          `🚨 [ParallelProcessing] Allergy request body:`,
          allergyRequestBody,
        );

        console.log(`🚨 [ParallelProcessing] === STARTING ALLERGY API CALL ===`);
        console.log(`🚨 [ParallelProcessing] Calling: /api/allergies/process-unified`);
        console.log(`🚨 [ParallelProcessing] Patient ID: ${patient.id}`);
        console.log(`🚨 [ParallelProcessing] Encounter ID: ${encounterId}`);
        console.log(`🚨 [ParallelProcessing] SOAP Note Length: ${note?.length || 0} chars`);

        // Process all services in parallel for maximum efficiency
        const [
          medicalProblemsResponse,
          medicationsResponse,
          ordersResponse,
          cptResponse,
          allergyResponse,
        ] = await Promise.all([
          fetch(`/api/medical-problems/process-unified`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(medicalProblemsRequestBody),
          }),
          fetch(`/api/encounters/${encounterId}/process-medications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(medicationsRequestBody),
          }),
          fetch(`/api/encounters/${encounterId}/extract-orders-from-soap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(ordersRequestBody),
          }),
          fetch(
            `/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ soapNote: note }),
            },
          ).then(async (response) => {
            console.log(
              "🏥 [ParallelProcessing] CPT extraction response status:",
              response.status,
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                "❌ [ParallelProcessing] CPT extraction failed:",
                errorText,
              );
              return response;
            }

            const extractedData = await response.json();
            console.log(
              "✅ [ParallelProcessing] CPT extraction successful:",
              extractedData,
            );

            // Now save the extracted data to the database
            console.log(
              "💾 [ParallelProcessing] Saving CPT codes to database...",
            );
            const saveResponse = await fetch(
              `/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  cptCodes: extractedData.cptCodes || [],
                  diagnoses: extractedData.diagnoses || [],
                  mappings: extractedData.mappings || [],
                }),
              },
            );

            if (saveResponse.ok) {
              console.log(
                "✅ [ParallelProcessing] CPT codes saved to database successfully",
              );

              // Force refetch encounter data to refresh billing component immediately
              await queryClient.refetchQueries({
                queryKey: [
                  `/api/patients/${patient.id}/encounters/${encounterId}`,
                ],
              });
              console.log(
                "🔄 [ParallelProcessing] Encounter data refetched for billing component",
              );
            } else {
              const saveErrorText = await saveResponse.text();
              console.error(
                "❌ [ParallelProcessing] Failed to save CPT codes:",
                saveErrorText,
              );
            }

            // Return the original extraction response for the parallel processing handler
            return new Response(JSON.stringify(extractedData), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }),
          fetch(`/api/allergies/process-unified`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(allergyRequestBody),
          }).then(async (response) => {
            console.log(
              "🚨 [ParallelProcessing] Allergy API response status:",
              response.status,
            );
            console.log(
              "🚨 [ParallelProcessing] Allergy API response headers:",
              Object.fromEntries(response.headers.entries()),
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                "❌ [ParallelProcessing] Allergy API failed:",
                errorText,
              );
              return response;
            }

            const allergyData = await response.json();
            console.log(
              "✅ [ParallelProcessing] Allergy API successful:",
              allergyData,
            );

            return new Response(JSON.stringify(allergyData), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }),
        ]);

        console.log(`🏥 [ParallelProcessing] All requests completed`);
        console.log(
          `🏥 [MedicalProblems] Response status: ${medicalProblemsResponse.status}`,
        );
        console.log(
          `🏥 [Medications] Response status: ${medicationsResponse.status}`,
        );
        console.log(`🏥 [Orders] Response status: ${ordersResponse.status}`);
        console.log(`🏥 [CPT] Response status: ${cptResponse.status}`);
        console.log(`🚨 [Allergies] Response status: ${allergyResponse.status}`);

        // Handle medical problems response
        if (medicalProblemsResponse.ok) {
          const result = await medicalProblemsResponse.json();
          console.log(
            `✅ [MedicalProblems] SUCCESS: ${result.problemsAffected || result.total_problems_affected || "unknown"} problems affected`,
          );
          console.log(
            `✅ [MedicalProblems] Processing time: ${result.processingTimeMs || result.processing_time_ms || "unknown"}ms`,
          );

          // Invalidate medical problems queries to refresh UI (unified API)
          await queryClient.invalidateQueries({
            queryKey: ['/api/medical-problems', patient.id],
          });
          console.log(`🔄 [MedicalProblems] Cache invalidation completed`);
        } else {
          const errorText = await medicalProblemsResponse.text();
          console.error(
            `❌ [MedicalProblems] FAILED with status ${medicalProblemsResponse.status}`,
          );
          console.error(`❌ [MedicalProblems] Error response: ${errorText}`);
        }

        // Handle medications response
        if (medicationsResponse.ok) {
          const result = await medicationsResponse.json();
          console.log(
            `✅ [Medications] SUCCESS: ${result.medicationsAffected} medications affected`,
          );
          console.log(
            `✅ [Medications] Processing time: ${result.processingTimeMs}ms`,
          );
          console.log(
            `✅ [Medications] Drug interactions found: ${result.drugInteractions?.length || 0}`,
          );

          // Invalidate medications queries to refresh UI
          await queryClient.invalidateQueries({
            queryKey: [`/api/patients/${patient.id}/medications-enhanced`],
          });
          console.log(`🔄 [Medications] Cache invalidation completed`);
        } else {
          const errorText = await medicationsResponse.text();
          console.error(
            `❌ [Medications] FAILED with status ${medicationsResponse.status}`,
          );
          console.error(`❌ [Medications] Error response: ${errorText}`);
        }

        // Handle orders response
        if (ordersResponse.ok) {
          const result = await ordersResponse.json();
          console.log(
            `✅ [Orders] SUCCESS: ${result.ordersCount || 0} orders extracted and saved`,
          );
          console.log(`✅ [Orders] Message: ${result.message}`);

          // Invalidate orders queries to refresh UI
          await queryClient.invalidateQueries({
            queryKey: [`/api/patients/${patient.id}/draft-orders`],
          });
          await queryClient.invalidateQueries({
            queryKey: [`/api/encounters/${encounterId}/validation`],
          });
          console.log(`🔄 [Orders] Cache invalidation completed`);
        } else {
          const errorText = await ordersResponse.text();
          console.error(
            `❌ [Orders] FAILED with status ${ordersResponse.status}`,
          );
          console.error(`❌ [Orders] Error response: ${errorText}`);
        }

        // Handle CPT response
        if (cptResponse.ok) {
          const result = await cptResponse.json();
          console.log(
            `✅ [CPT] SUCCESS: ${result.cptCodes?.length || 0} CPT codes and ${result.diagnoses?.length || 0} diagnoses extracted`,
          );
          console.log(`✅ [CPT] Processing details:`, result);

          // Invalidate billing queries to refresh UI
          await queryClient.invalidateQueries({
            queryKey: [
              `/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`,
            ],
          });
          await queryClient.invalidateQueries({
            queryKey: [`/api/encounters/${encounterId}/validation`],
          });
          console.log(`🔄 [CPT] Cache invalidation completed`);
        } else {
          const errorText = await cptResponse.text();
          console.error(`❌ [CPT] FAILED with status ${cptResponse.status}`);
          console.error(`❌ [CPT] Error response: ${errorText}`);
        }

        // Handle allergy response
        if (allergyResponse.ok) {
          const result = await allergyResponse.json();
          console.log(
            `✅ [Allergies] SUCCESS: ${result.allergiesAffected || result.total_allergies_affected || 0} allergies affected`,
          );
          console.log(
            `✅ [Allergies] Processing time: ${result.processingTimeMs || "unknown"}ms`,
          );

          // Invalidate allergy queries to refresh UI
          await queryClient.invalidateQueries({
            queryKey: ['/api/allergies', patient.id],
          });
          console.log(`🔄 [Allergies] Cache invalidation completed`);
        } else {
          const errorText = await allergyResponse.text();
          console.error(`❌ [Allergies] FAILED with status ${allergyResponse.status}`);
          console.error(`❌ [Allergies] Error response: ${errorText}`);
        }

        console.log(`🏥 [ParallelProcessing] === PARALLEL PROCESSING END ===`);
        
        // Update hash after successful processing to track chart state
        const processedHash = generateSOAPHash(soapNote);
        setLastProcessedSOAPHash(processedHash);
        setIsChartUpdateAvailable(false);
        console.log("📝 [ChartUpdate] Hash updated after stop recording processing");
        
      } catch (error) {
        console.error(
          `❌ [ParallelProcessing] EXCEPTION during processing:`,
          error as Error,
        );
        console.error(
          `❌ [ParallelProcessing] Stack trace:`,
          (error as Error).stack,
        );
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
    const medicationOrders = orders.filter(
      (order) => order.orderType === "medication",
    );
    if (medicationOrders.length > 0) {
      console.log(
        "💊 [EncounterView] Medication orders detected, invalidating medications cache",
      );

      // Invalidate medications queries to refresh UI with new pending medications
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}/medications-enhanced`],
      });
      console.log(
        "💊 [EncounterView] Medications cache invalidation completed",
      );
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

      // Invalidate medical problems cache since CPT codes trigger medical problems processing (unified API)
      await queryClient.invalidateQueries({
        queryKey: ['/api/medical-problems', patient.id],
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

  // User edit detection handlers with persistent lock
  const handleUserStartsEditing = () => {
    if (!userEditingLock) {
      setUserEditingLock(true);
      setLastUserEditTime(Date.now());
      console.log("🔒 [UserEditLock] User started editing - persistent lock activated");
      
      // Activate vulnerable window protection
      if (!editorVulnerableWindow) {
        setEditorVulnerableWindow(true);
        console.log("🛡️ [VulnerableWindow] Editor locked - protecting against delayed API responses");
        
        // Clear any existing timeout
        if (vulnerableWindowTimeout) {
          clearTimeout(vulnerableWindowTimeout);
        }
        
        // Set timeout to clear vulnerable window after 4 seconds
        const timeout = setTimeout(() => {
          setEditorVulnerableWindow(false);
          console.log("🛡️ [VulnerableWindow] Editor unlocked - vulnerable window passed");
        }, 4000);
        
        setVulnerableWindowTimeout(timeout);
      }
    }
  };

  const clearEditLock = () => {
    setUserEditingLock(false);
    setLastUserEditTime(null);
    setEditorVulnerableWindow(false);
    if (vulnerableWindowTimeout) {
      clearTimeout(vulnerableWindowTimeout);
      setVulnerableWindowTimeout(null);
    }
    console.log("🔓 [UserEditLock] Edit lock cleared - AI updates allowed");
  };

  // Cleanup timeout on unmount  
  useEffect(() => {
    return () => {
      if (vulnerableWindowTimeout) {
        clearTimeout(vulnerableWindowTimeout);
      }
    };
  }, []);

  // Modal warning state for recording conflicts
  const [showRecordingConflictModal, setShowRecordingConflictModal] = useState(false);
  const [pendingRecordingStart, setPendingRecordingStart] = useState<(() => void) | null>(null);

  // Vulnerable window protection - editor loading during API pipeline risk
  const [editorVulnerableWindow, setEditorVulnerableWindow] = useState(false);
  const [vulnerableWindowTimeout, setVulnerableWindowTimeout] = useState<NodeJS.Timeout | null>(null);

  // Smart Chart Update Button State
  const [lastProcessedSOAPHash, setLastProcessedSOAPHash] = useState<string>("");
  const [isChartUpdateAvailable, setIsChartUpdateAvailable] = useState(false);
  const [isUpdatingChart, setIsUpdatingChart] = useState(false);
  const [chartUpdateProgress, setChartUpdateProgress] = useState(0);

  // Hash generation utility (reusing logic from medical-problems-orchestrator)
  const generateSOAPHash = (content: string): string => {
    let hash = 0;
    const cleanContent = content.trim();
    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  // Check if chart update should be available
  const checkForChartUpdateAvailability = (currentSOAP: string) => {
    console.log("🔍 [ChartUpdate] === DETAILED BUTTON AVAILABILITY CHECK ===");
    console.log("🔍 [ChartUpdate] Input conditions:", {
      soapNoteExists: !!currentSOAP,
      soapLength: currentSOAP?.length || 0,
      soapPreview: currentSOAP ? currentSOAP.substring(0, 100) + "..." : "NO SOAP NOTE",
      hasLastHash: !!lastProcessedSOAPHash,
      lastHash: lastProcessedSOAPHash || "NONE SET",
      buttonCurrentlyVisible: isChartUpdateAvailable,
      isRecording: isRecording,
      isGenerating: isGeneratingSOAP || isAutoGeneratingSOAP
    });

    if (!currentSOAP || currentSOAP.trim().length < 100) {
      console.log("❌ [ChartUpdate] SOAP too short or empty - hiding button");
      console.log("💡 [ChartUpdate] Need at least 100 characters in SOAP note");
      setIsChartUpdateAvailable(false);
      return;
    }

    // Generate current hash
    const currentHash = generateSOAPHash(currentSOAP);
    console.log("🔍 [ChartUpdate] Hash analysis:", {
      currentHash,
      lastProcessedHash: lastProcessedSOAPHash || "NONE",
      hashesMatch: currentHash === lastProcessedSOAPHash,
      hashExists: !!lastProcessedSOAPHash
    });

    // Check all conditions for showing button
    const hasBaseline = !!lastProcessedSOAPHash;
    const hasChanges = currentHash !== lastProcessedSOAPHash;
    const notRecording = !isRecording;
    const notGenerating = !isGeneratingSOAP && !isAutoGeneratingSOAP;
    const soapLongEnough = currentSOAP && currentSOAP.length > 100;

    console.log("🔍 [ChartUpdate] Condition analysis:", {
      hasBaseline: hasBaseline ? "✅ YES" : "❌ NO - need baseline hash first",
      hasChanges: hasChanges ? "✅ YES" : "❌ NO - content unchanged", 
      notRecording: notRecording ? "✅ YES" : "❌ NO - recording active",
      notGenerating: notGenerating ? "✅ YES" : "❌ NO - generation active",
      soapLongEnough: soapLongEnough ? "✅ YES" : "❌ NO - SOAP too short",
      allConditionsMet: hasBaseline && hasChanges && notRecording && notGenerating && soapLongEnough
    });
    
    // Only show button if content has changed significantly since last processing
    if (hasBaseline && hasChanges && notRecording && notGenerating && soapLongEnough) {
      setIsChartUpdateAvailable(true);
      console.log("✅ [ChartUpdate] ALL CONDITIONS MET - SHOWING BUTTON");
      console.log("✅ [ChartUpdate] Button will process: Medical Problems, Surgical History, Medications, Allergies");
      console.log("✅ [ChartUpdate] Will exclude: Orders, Billing (transactional data)");
    } else {
      setIsChartUpdateAvailable(false);
      console.log("❌ [ChartUpdate] CONDITIONS NOT MET - HIDING BUTTON");
      if (!hasBaseline) {
        console.log("💡 [ChartUpdate] TIP: Baseline hash gets set when recording stops or on initial load");
      }
      if (!hasChanges && hasBaseline) {
        console.log("💡 [ChartUpdate] TIP: Edit the SOAP note content to trigger button");
      }
      if (!notRecording) {
        console.log("💡 [ChartUpdate] TIP: Stop recording first before manual chart updates");
      }
      if (!notGenerating) {
        console.log("💡 [ChartUpdate] TIP: Wait for AI generation to complete");
      }
    }
    console.log("🔍 [ChartUpdate] === END AVAILABILITY CHECK ===");
  };

  // Detect SOAP content changes and show update button when appropriate
  useEffect(() => {
    if (soapNote && soapNote.trim().length > 100) {
      checkForChartUpdateAvailability(soapNote);
    }
  }, [soapNote, lastProcessedSOAPHash]);

  // Initialize hash for existing SOAP notes (for existing encounters with SOAP but no hash baseline)
  useEffect(() => {
    if (soapNote && soapNote.trim().length > 100 && !lastProcessedSOAPHash) {
      // For existing encounters that already have SOAP notes, set initial hash on load
      const initialHash = generateSOAPHash(soapNote);
      setLastProcessedSOAPHash(initialHash);
      console.log("🔧 [ChartUpdate] Setting initial hash for existing SOAP note:", initialHash);
      console.log("🔧 [ChartUpdate] Note: Button will only appear after SOAP content changes significantly");
    }
  }, [soapNote]); // Only depends on soapNote, not lastProcessedSOAPHash to avoid infinite loop

  // FUTURE-PROOF REMINDER: When adding new chart sections, update BOTH:
  // 1. Stop Recording parallel processing (lines ~680-880)
  // 2. Manual Update Chart button (this function)
  // Current sections: medicalProblems, surgicalHistory, medications
  // Future sections: allergies, imaging, familyHistory, [add here]
  
  // Selective chart update - processes only chart data (excludes orders & billing)
  const updateChartFromNote = async () => {
    if (!patient || !encounter || !soapNote || isUpdatingChart) return;

    console.log("🔄 [ChartUpdate] === SELECTIVE CHART UPDATE START ===");
    console.log("🔄 [ChartUpdate] Processing: Medical Problems + Surgical History + Medications + Allergies + Social History");
    
    setIsUpdatingChart(true);
    setChartUpdateProgress(0);

    try {
      // Start progress animation
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress <= 90) {
          setChartUpdateProgress(progress);
        }
      }, 50);

      // Process only chart sections in parallel (exclude orders & CPT)
      const [medicalProblemsResponse, surgicalHistoryResponse, medicationsResponse, allergyResponse, socialHistoryResponse] = await Promise.all([
        // Medical Problems Processing
        fetch("/api/medical-problems/process-unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId: patient.id,
            encounterId: encounter.id,
            soapNote: soapNote,
            attachmentContent: null,
            attachmentId: null,
            providerId: currentUser?.id || 1,
            triggerType: "manual_chart_update",
          }),
        }),

        // Surgical History Processing  
        fetch("/api/surgical-history/process-unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId: patient.id,
            encounterId: encounter.id,
            soapNote: soapNote,
            attachmentContent: null,
            attachmentId: null,
            providerId: currentUser?.id || 1,
            triggerType: "manual_chart_update",
          }),
        }),

        // Medications Processing
        fetch(`/api/encounters/${encounter.id}/process-medications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            soapNote: soapNote,
          }),
        }),

        // Allergy Processing
        fetch(`/api/allergies/process-unified`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId: patient.id,
            encounterId: encounter.id,
            soapNote: soapNote,
            attachmentContent: null,
            attachmentId: null,
            providerId: currentUser?.id || 1,
            triggerType: "manual_chart_update",
          }),
        }),

        // Social History Processing
        fetch(`/api/social-history/process-unified`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId: patient.id,
            encounterId: encounter.id,
            soapNote: soapNote,
            attachmentContent: null,
            attachmentId: null,
            providerId: currentUser?.id || 1,
            triggerType: "manual_chart_update",
          }),
        }),
      ]);

      clearInterval(progressInterval);
      setChartUpdateProgress(100);

      console.log(`🔄 [ChartUpdate] All chart requests completed`);
      console.log(`🔄 [ChartUpdate] Medical Problems: ${medicalProblemsResponse.status}`);
      console.log(`🔄 [ChartUpdate] Surgical History: ${surgicalHistoryResponse.status}`);  
      console.log(`🔄 [ChartUpdate] Medications: ${medicationsResponse.status}`);
      console.log(`🔄 [ChartUpdate] Allergies: ${allergyResponse.status}`);
      console.log(`🔄 [ChartUpdate] Social History: ${socialHistoryResponse.status}`);

      // Handle responses and refresh UI
      let sectionsUpdated = 0;

      if (medicalProblemsResponse.ok) {
        const result = await medicalProblemsResponse.json();
        console.log(`✅ [ChartUpdate-MedProblems] ${result.problemsAffected || result.total_problems_affected || 0} problems affected`);
        
        await queryClient.invalidateQueries({
          queryKey: ['/api/medical-problems', patient.id],
        });
        sectionsUpdated++;
      }

      if (surgicalHistoryResponse.ok) {
        const result = await surgicalHistoryResponse.json();
        console.log(`✅ [ChartUpdate-Surgery] ${result.surgeriesAffected || 0} surgeries affected`);
        
        await queryClient.invalidateQueries({
          queryKey: [`/api/surgical-history/${patient.id}`],
        });
        sectionsUpdated++;
      }

      if (medicationsResponse.ok) {
        const result = await medicationsResponse.json();
        console.log(`✅ [ChartUpdate-Meds] ${result.medicationsAffected || 0} medications affected`);
        
        await queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patient.id}/medications-enhanced`],
        });
        sectionsUpdated++;
      }

      if (allergyResponse.ok) {
        const result = await allergyResponse.json();
        console.log(`✅ [ChartUpdate-Allergies] ${result.allergiesAffected || 0} allergies affected`);
        
        await queryClient.invalidateQueries({
          queryKey: ['/api/allergies', patient.id],
        });
        sectionsUpdated++;
      }

      if (socialHistoryResponse.ok) {
        const result = await socialHistoryResponse.json();
        console.log(`✅ [ChartUpdate-SocialHistory] ${result.socialHistoryAffected || 0} social history items affected`);
        
        await queryClient.invalidateQueries({
          queryKey: [`/api/social-history`, patient.id],
        });
        sectionsUpdated++;
      }

      // Update hash to prevent button from showing again
      const newHash = generateSOAPHash(soapNote);
      setLastProcessedSOAPHash(newHash);
      setIsChartUpdateAvailable(false);

      toast({
        title: "Chart Updated Successfully",
        description: `Updated ${sectionsUpdated} chart sections from SOAP note content`,
      });

      console.log("🔄 [ChartUpdate] === SELECTIVE CHART UPDATE COMPLETE ===");

    } catch (error) {
      console.error("❌ [ChartUpdate] Error during selective chart update:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update chart sections. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingChart(false);
      setChartUpdateProgress(0);
    }
  };

  // Cleanup timeout on unmount  
  useEffect(() => {
    return () => {
      if (vulnerableWindowTimeout) {
        clearTimeout(vulnerableWindowTimeout);
      }
    };
  }, []);

  // Custom extension to force Enter key to create hard breaks instead of paragraphs
  const ForceHardBreak = Extension.create({
    name: 'forceHardBreak',
    
    addKeyboardShortcuts() {
      return {
        'Enter': () => {
          return this.editor.commands.setHardBreak()
        },
      }
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure HardBreak in StarterKit instead of adding separate extension
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: {},
        },
      }),
      ForceHardBreak,
      Placeholder.configure({
        placeholder: "Generated SOAP note will appear here...",
      }),
    ],
    editable: !editorVulnerableWindow, // Disable editing during vulnerable window
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

        // Detect user editing and activate persistent lock
        handleUserStartsEditing();

        // Trigger auto-save with debouncing
        triggerAutoSave(newContent);
      }
    },
    onFocus: () => {
      // User clicked into editor - activate lock
      handleUserStartsEditing();
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

  // Check for unsaved content before navigation and trigger immediate save
  const checkUnsavedContent = async () => {
    const hasUnsavedTranscription = transcriptionSaveStatus === "unsaved" || transcriptionSaveStatus === "saving";
    const hasUnsavedSoapNote = autoSaveStatus === "unsaved" || autoSaveStatus === "saving";
    
    if (hasUnsavedTranscription || hasUnsavedSoapNote) {
      const unsavedItems = [];
      if (hasUnsavedTranscription) unsavedItems.push("transcription");
      if (hasUnsavedSoapNote) unsavedItems.push("SOAP note");
      
      console.log("💾 [Navigation] Unsaved content detected, triggering immediate save:", {
        transcription: transcriptionSaveStatus,
        soapNote: autoSaveStatus,
        unsavedItems
      });

      // Trigger immediate saves to prevent data loss
      try {
        if (hasUnsavedTranscription && transcription) {
          await autoSaveTranscription(transcription, liveTranscriptionContent);
        }
        if (hasUnsavedSoapNote && soapNote) {
          triggerAutoSave(soapNote);
        }

        toast({
          title: "Content Saved",
          description: `Your ${unsavedItems.join(" and ")} ${unsavedItems.length === 1 ? 'has' : 'have'} been saved automatically.`,
          duration: 3000,
        });
      } catch (error) {
        console.error("❌ [Navigation] Failed to save content:", error);
        toast({
          title: "Save Warning",
          description: `Your ${unsavedItems.join(" and ")} will auto-save in a few seconds. Content is protected.`,
          duration: 4000,
        });
      }
    }
  };

  // Cleanup auto-save timers on unmount and check for unsaved content
  useEffect(() => {
    return () => {
      // Check for unsaved content before component unmounts
      checkUnsavedContent();
      
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      if (transcriptionAutoSaveTimer.current) {
        clearTimeout(transcriptionAutoSaveTimer.current);
      }
    };
  }, [transcriptionSaveStatus, autoSaveStatus]);

  // Effect to load existing SOAP note and transcription from encounter data
  useEffect(() => {
    if (encounter && editor && !editor.isDestroyed) {
      // Load existing SOAP note from database
      if (encounter.note) {
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

      // Load existing transcription from database
      if (encounter.transcriptionRaw || encounter.transcriptionProcessed) {
        const savedRawTranscription = encounter.transcriptionRaw || "";
        const savedProcessedTranscription = encounter.transcriptionProcessed || "";

        if (savedRawTranscription.trim()) {
          setTranscription(savedRawTranscription);
          setLastSavedTranscription(savedRawTranscription);
          setTranscriptionSaveStatus("saved");
          
          // CRITICAL: Also initialize the transcription buffer for multi-session recording
          setTranscriptionBuffer(savedRawTranscription);
          
          console.log(
            "🎤 [EncounterView] Restored transcription from database:",
            `Raw: ${savedRawTranscription.length} chars, Processed: ${savedProcessedTranscription.length} chars`
          );
          console.log(
            "🎤 [EncounterView] MULTI-SESSION FIX: Initialized transcription buffer with saved content for continuation"
          );
        }

        if (savedProcessedTranscription.trim()) {
          setLiveTranscriptionContent(savedProcessedTranscription);
        }
      }
    }
  }, [encounter?.note, encounter?.transcriptionRaw, encounter?.transcriptionProcessed, editor]);

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
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to get real-time suggestions during recording
  const getLiveAISuggestions = async (transcription: string) => {
    // Skip if using REST API mode - suggestions handled manually
    if (useRestAPI) return;

    if (transcription.length < 15) return; // Process smaller chunks for faster response

    // Debounce suggestions to prevent too many rapid API calls
    const now = Date.now();
    if (now - lastSuggestionTime < 10000) {
      // 10-second throttle for REST API compatibility
      // Clear any existing timeout and set a new one
      if (suggestionDebounceTimer.current) {
        clearTimeout(suggestionDebounceTimer.current);
      }
      suggestionDebounceTimer.current = setTimeout(() => {
        getLiveAISuggestions(transcription);
      }, 10000);
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

  // Enhanced start recording with edit lock conflict detection
  const startRecording = async () => {
    console.log(
      "🎤 [EncounterView] Starting REAL-TIME voice recording for patient:",
      patient.id,
    );
    console.log("🎤 [EncounterView] Current AI mode:", useRestAPI ? "REST API" : "WebSocket");

    // Check for edit lock conflict and show modal if needed
    if (userEditingLock) {
      console.log("🔒 [UserEditLock] Edit lock active - showing conflict modal");
      setPendingRecordingStart(() => () => proceedWithRecording());
      setShowRecordingConflictModal(true);
      return;
    }

    // Proceed with normal recording
    await proceedWithRecording();
  };

  // Actual recording implementation (extracted from original startRecording)
  const proceedWithRecording = async () => {

    // Clear previous suggestions when starting new recording (both WebSocket and REST API)
    setGptSuggestions("");
    setLiveSuggestions(""); // Clear live suggestions for new encounter
    setSuggestionsBuffer(""); // Clear suggestions buffer for fresh accumulation
    // NOTE: Don't clear transcription here - let it accumulate for intelligent streaming

    try {
      // CRITICAL FIX: Only create WebSocket connection in WebSocket mode
      let realtimeWs: WebSocket | null = null;
      let transcriptionBuffer = "";
      let lastSuggestionLength = 0;
      let suggestionsStarted = false;
      let conversationActive = false; // Track active conversation state
      let sessionId = "";

      try {
        if (useRestAPI) {
          console.log("🔍 [EncounterView] REST API mode - WebSocket needed for Whisper transcription, AI suggestions disabled");
          console.log("🔍 [TokenMonitor] REST API mode - WebSocket will handle transcription only, no AI suggestion tokens");
        }
        console.log(
          "🌐 [EncounterView] Connecting to OpenAI Realtime API for transcription...",
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

          // 2. Format patient context with full chart data for direct question responses
          const formatPatientContext = (chart: any, basicData: any): string => {
            const basicInfo = `Patient: ${basicData.firstName} ${basicData.lastName}
Age: ${basicData.age || "Unknown"} 
Gender: ${basicData.gender || "Unknown"}
MRN: ${basicData.mrn || "Unknown"}

${
  chart
    ? `
MEDICAL PROBLEMS:
${
  chart.medicalProblems?.length > 0
    ? chart.medicalProblems
        .map((p: any) => `- ${p.problemTitle} (${p.problemStatus})`)
        .join("\n")
    : "- No active medical problems documented"
}

CURRENT MEDICATIONS:
${
  chart.currentMedications?.length > 0
    ? chart.currentMedications
        .map((m: any) => `- ${m.medicationName} ${m.dosage} ${m.frequency}`)
        .join("\n")
    : "- No current medications documented"
}

ALLERGIES:
${
  chart.allergies?.length > 0
    ? chart.allergies
        .map((a: any) => `- ${a.allergen}: ${a.reaction} (${a.severity})`)
        .join("\n")
    : "- NKDA (No Known Drug Allergies)"
}

RECENT VITALS:
${
  chart.vitals?.length > 0
    ? `- BP: ${chart.vitals[0].systolic}/${chart.vitals[0].diastolic} mmHg
- HR: ${chart.vitals[0].heartRate} bpm
- Temp: ${chart.vitals[0].temperature}°F
- RR: ${chart.vitals[0].respiratoryRate || "Not recorded"}
- O2 Sat: ${chart.vitals[0].oxygenSaturation || "Not recorded"}%`
    : "- No recent vitals available"
}
`
    : "Limited patient data available - chart context not accessible"
}`;

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

CRITICAL: If the provider is asking direct questions about patient chart information, provide SPECIFIC facts from the chart data above, NOT generic suggestions.

Examples:
- Question: "Does the patient have medical problems?" → Answer: "Medical problems: HTN, DM2, CKD stage 3, AFib, CHF"
- Question: "What medications is the patient on?" → Answer: "Current medications: Lisinopril 10mg daily, Metformin 500mg BID"
- Question: "Any allergies?" → Answer: "NKDA (No Known Drug Allergies)"

DO NOT say "Assess" or "Evaluate" - give the actual chart facts directly.

Please provide medical suggestions based on what the provider is saying in this current conversation.`;

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
            type: "response.create", //SUPPOSEDLY THE INITIAL "REST API RESPONSE"
            response: {
              modalities: ["text"],
              instructions: `You are a medical AI assistant attempting to help the provider during the conversation, but you are always confused so you always respond with 3 question marks. Always end each suggestion with 3 question marks (???).`,
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
          console.log("📨 [EncounterView] WebSocket mode - OpenAI message type:", message.type);
          console.log("🔍 [TokenMonitor] WebSocket activity detected - consuming tokens in background");

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
              console.log(
                "📝 [EncounterView] Real-time transcription update:",
                {
                  previousLength: prev.length,
                  deltaLength: deltaText.length,
                  newLength: newTranscription.length,
                  preview: newTranscription.substring(0, 100),
                  containsMedicalKeywords:
                    /\b(pain|symptoms?|medication|treatment|diagnosis|chest|headache|fever|nausea|dizzy|shortness of breath|allergic|prescription|blood pressure|heart rate|exam|vital|lab|test|drug|pill|tablet|injection|therapy|surgery|procedure|complaint|history)\b/i.test(
                      deltaText,
                    ),
                },
              );

              // Trigger intelligent streaming check for medical content
              if (
                newTranscription.length > 50 &&
                /\b(pain|symptoms?|medication|treatment|diagnosis|chest|headache|fever|nausea|dizzy|shortness of breath|allergic|prescription|blood pressure|heart rate|exam|vital|lab|test|drug|pill|tablet|injection|therapy|surgery|procedure|complaint|history)\b/i.test(
                  deltaText,
                )
              ) {
                console.log(
                  "🔥 [EncounterView] Medical keywords detected in real-time - triggering intelligent streaming",
                );
                setTimeout(() => {
                  // Force re-evaluation of intelligent streaming
                  setTranscription((current) => current);
                }, 500);
              }

              // Trigger transcription auto-save after each delta update
              triggerTranscriptionAutoSave(newTranscription, liveTranscriptionContent + deltaText);

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
            // CRITICAL: Only update AI suggestions in WebSocket mode, not REST API mode
            if (
              suggestionsStarted &&
              transcriptionBuffer.length > 20 &&
              realtimeWs &&
              !useRestAPI
            ) {
              // Debounce to prevent too many rapid updates
              if (suggestionDebounceTimer.current) {
                clearTimeout(suggestionDebounceTimer.current);
              }

              suggestionDebounceTimer.current = setTimeout(() => {
                console.log(
                  "🧠 [EncounterView] WebSocket mode - Real-time AI context update with partial transcription",
                );
                console.log("🔍 [TokenMonitor] WebSocket context update - consuming tokens for suggestions");

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
                    instructions: `You are a medical AI assistant attempting to help the provider during the conversation, but you only provide enthusiastic and aggressive responses. End each suggestion with 3 exclamation points (!!!).`,
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
          // CRITICAL: Only process AI suggestions in WebSocket mode
          else if (message.type === "response.text.delta" && !useRestAPI) {
            const deltaText = message.delta || "";
            console.log(
              "🧠 [EncounterView] WebSocket mode - AI suggestions delta received:",
              deltaText,
            );
            console.log("🔍 [TokenMonitor] WebSocket delta received - tokens being consumed for suggestions");
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
                formattedSuggestions = formattedSuggestions.replace(
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
                const newTranscription = prev
                  ? prev + "\n" + newBullets
                  : newBullets;
                console.log(
                  "🔥 [EncounterView] Transcription updated during recording - triggering intelligent streaming check",
                );

                // Force a re-render to trigger intelligent streaming
                setTimeout(() => {
                  console.log(
                    "🔥 [EncounterView] Forcing component update for intelligent streaming",
                  );
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
                  instructions: `You are a medical AI assistant attempting to help the provider during the conversation, but you work for the Red Cross so you always provide three plus signs at the end of each suggestion. End each suggestion with 3 plus signs (+++).`,
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
      
      // Clear all edit locks when starting new recording
      setUserEditingLock(false);
      setRecordingCooldown(false);
      setLastUserEditTime(null);
      console.log("🔓 [UserEditLock] All edit locks cleared - starting new recording session");

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
    console.log("🎤 [EncounterView] === STOP RECORDING CALLED ===");
    console.log("🎤 [EncounterView] Current AI mode:", useRestAPI ? "REST API" : "WebSocket");
    console.log(
      "🎤 [EncounterView] Current soapNote:",
      soapNote ? soapNote.substring(0, 100) + "..." : "NULL/EMPTY",
    );
    console.log("🎤 [EncounterView] soapNote length:", soapNote?.length || 0);
    console.log(
      "🎤 [EncounterView] soapNote.trim():",
      soapNote?.trim() ? "HAS CONTENT" : "EMPTY AFTER TRIM",
    );

    // Stop recording based on current mode
    const mediaRecorder = (window as any).currentMediaRecorder || mediaRecorderRef;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      console.log("🛑 [EncounterView] Stopping MediaRecorder, current state:", mediaRecorder.state);
      mediaRecorder.stop();
      console.log("🎤 [EncounterView] MediaRecorder stopped");
    } else {
      console.log("⚠️ [EncounterView] No active MediaRecorder found or already stopped");
      console.log("🔍 [EncounterView] MediaRecorder state:", mediaRecorder?.state || "null");
    }

    setIsRecording(false);
    setLastRecordingStopTime(Date.now());
    
    // Activate recording cooldown to prevent AI overwrites during transcription completion
    setRecordingCooldown(true);
    console.log("⏱️ [UserEditLock] Recording cooldown activated - preventing AI updates for 5 seconds");
    
    // Clear cooldown after transcription typically finishes
    setTimeout(() => {
      setRecordingCooldown(false);
      console.log("⏱️ [UserEditLock] Recording cooldown cleared");
    }, 5000);

    // Real-time streaming has been updating SOAP note during recording
    // Now trigger medical problems processing directly (bypassing recording check)
    console.log(
      "🎤 [EncounterView] Checking if should process SOAP content...",
    );
    if (soapNote && soapNote.trim()) {
      console.log(
        "✅ [EncounterView] SOAP content exists - starting processing...",
      );
      console.log(
        "🩺 [EncounterView] Processing final SOAP note with medical problems after recording stop...",
      );

      // Mark this content as processed for future change detection
      setLastProcessedSOAPContent(soapNote);

      try {
        // Save SOAP note and final transcription
        console.log("🔄 [StopRecording] Saving SOAP note and final transcription...");
        
        // Save final transcription state
        if (transcription && transcription.trim()) {
          await autoSaveTranscription(transcription, liveTranscriptionContent);
          console.log("✅ [StopRecording] Final transcription auto-saved");
        }

        const soapSaveResponse = await fetch(
          `/api/patients/${patient.id}/encounters/${encounterId}/soap-note`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ soapNote }),
          },
        );

        console.log("🔄 [StopRecording] SOAP save response status:", soapSaveResponse.status);
        if (!soapSaveResponse.ok) {
          const soapError = await soapSaveResponse.text();
          console.error("❌ [StopRecording] SOAP save failed:", soapError);
          throw new Error(`SOAP save failed: ${soapSaveResponse.status}`);
        }

        console.log("✅ [StopRecording] SOAP note saved");

        // Process ALL services in parallel for maximum speed optimization
        console.log(
          "🏥 [StopRecording] Starting TRUE parallel processing: medical problems, surgical history, medications, orders, CPT codes, allergies, family history, and social history...",
        );
        console.log(
          "🏥 [StopRecording] CPT extraction URL:",
          `/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt`,
        );
        console.log("🏥 [StopRecording] CPT extraction payload:", {
          soapNote: soapNote.substring(0, 200) + "...",
        });

        // Start animations for medical problems, orders and billing processing
        startMedicalProblemsAnimation();
        startOrdersAnimation();
        startBillingAnimation();

        const [medicalProblemsResponse, surgicalHistoryResponse, medicationsResponse, ordersResponse, cptResponse, allergyResponse, familyHistoryResponse, socialHistoryResponse] =
          await Promise.all([
            fetch(`/api/medical-problems/process-unified`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: soapNote,
                triggerType: "recording_complete",
              }),
            }).then(async (response) => {
              console.log("🏥 [StopRecording] Medical problems response status:", response.status);
              console.log("🏥 [StopRecording] Medical problems response headers:", Object.fromEntries(response.headers.entries()));
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Medical problems processing failed:", errorText.substring(0, 500));
              }
              return response;
            }),
            fetch(`/api/surgical-history/process-unified`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: soapNote,
                triggerType: "recording_complete",
              }),
            }).then(async (response) => {
              console.log("🏥 [StopRecording] Surgical history response status:", response.status);
              console.log("🏥 [StopRecording] Surgical history response headers:", Object.fromEntries(response.headers.entries()));
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Surgical history processing failed:", errorText.substring(0, 500));
              }
              return response;
            }),
            fetch(`/api/encounters/${encounterId}/process-medications`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ patientId: patient.id }),
            }).then(async (response) => {
              console.log("💊 [StopRecording] Medications response status:", response.status);
              console.log("💊 [StopRecording] Medications response headers:", Object.fromEntries(response.headers.entries()));
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Medications processing failed:", errorText.substring(0, 500));
              }
              return response;
            }),
            fetch(`/api/encounters/${encounterId}/extract-orders-from-soap`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            }).then(async (response) => {
              console.log("📋 [StopRecording] Orders response status:", response.status);
              console.log("📋 [StopRecording] Orders response headers:", Object.fromEntries(response.headers.entries()));
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Orders processing failed:", errorText.substring(0, 500));
              }
              return response;
            }),
            fetch(
              `/api/patients/${patient.id}/encounters/${encounterId}/extract-cpt`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ soapNote }),
              },
            ).then(async (response) => {
              console.log(
                "🏥 [StopRecording] CPT response status:",
                response.status,
              );
              console.log(
                "🏥 [StopRecording] CPT response headers:",
                Object.fromEntries(response.headers.entries()),
              );

              if (!response.ok) {
                const errorText = await response.text();
                console.error(
                  "❌ [StopRecording] CPT extraction failed:",
                  errorText,
                );
                return response;
              }

              const extractedData = await response.json();
              console.log(
                "✅ [StopRecording] CPT extraction successful:",
                extractedData,
              );

              // Now save the extracted data to the database
              console.log("💾 [StopRecording] Saving CPT codes to database...");
              const saveResponse = await fetch(
                `/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    cptCodes: extractedData.cptCodes || [],
                    diagnoses: extractedData.diagnoses || [],
                    mappings: extractedData.mappings || [],
                  }),
                },
              );

              if (saveResponse.ok) {
                console.log(
                  "✅ [StopRecording] CPT codes saved to database successfully",
                );

                // Force refetch encounter data to refresh billing component immediately
                await queryClient.refetchQueries({
                  queryKey: [
                    `/api/patients/${patient.id}/encounters/${encounterId}`,
                  ],
                });
                console.log(
                  "🔄 [StopRecording] Encounter data refetched for billing component",
                );
              } else {
                const saveErrorText = await saveResponse.text();
                console.error(
                  "❌ [StopRecording] Failed to save CPT codes:",
                  saveErrorText,
                );
              }

              // Return the original extraction response for the parallel processing handler
              return new Response(JSON.stringify(extractedData), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }),
            fetch(`/api/allergies/process-unified`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: soapNote,
                attachmentContent: null,
                attachmentId: null,
                triggerType: "recording_complete",
                providerId: 1,
              }),
            }).then(async (response) => {
              console.log("🚨 [StopRecording] Allergy API response status:", response.status);
              console.log("🚨 [StopRecording] Allergy API response headers:", Object.fromEntries(response.headers.entries()));
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Allergy processing failed:", errorText.substring(0, 500));
                return response;
              }

              const allergyData = await response.json();
              console.log("✅ [StopRecording] Allergy processing successful:", allergyData);

              return new Response(JSON.stringify(allergyData), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }),
            fetch(`/api/family-history/process-unified`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: soapNote,
                attachmentContent: null,
                attachmentId: null,
                triggerType: "recording_complete",
              }),
            }).then(async (response) => {
              console.log("👨‍👩‍👧‍👦 [StopRecording] Family history API response status:", response.status);
              console.log("👨‍👩‍👧‍👦 [StopRecording] Family history API response headers:", Object.fromEntries(response.headers.entries()));
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Family history processing failed:", errorText.substring(0, 500));
                return response;
              }

              const familyHistoryData = await response.json();
              console.log("✅ [StopRecording] Family history processing successful:", familyHistoryData);

              return new Response(JSON.stringify(familyHistoryData), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }),
            fetch(`/api/social-history/process-unified`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: soapNote,
                attachmentContent: null,
                attachmentId: null,
                triggerType: "recording_complete",
              }),
            }).then(async (response) => {
              console.log("🚬 [StopRecording] Social history API response status:", response.status);
              console.log("🚬 [StopRecording] Social history API response headers:", Object.fromEntries(response.headers.entries()));
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [StopRecording] Social history processing failed:", errorText.substring(0, 500));
                return response;
              }

              const socialHistoryData = await response.json();
              console.log("✅ [StopRecording] Social history processing successful:", socialHistoryData);

              return new Response(JSON.stringify(socialHistoryData), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }),
          ]);

        // Handle parallel responses and invalidate caches
        console.log("🔄 [StopRecording] Processing parallel responses...");
        
        // Helper function to handle response processing with consistent error handling
        const handleServiceResponse = async (
          response: Response, 
          serviceName: string, 
          resultProperty: string,
          cacheInvalidation: () => Promise<void>,
          animationCompletion?: () => void
        ) => {
          if (response.ok) {
            try {
              const result = await response.json();
              const affected = result[resultProperty] || 0;
              console.log(`✅ [StopRecording] ${serviceName} processed: ${affected} items affected`);
              
              await cacheInvalidation();
              console.log(`✅ [StopRecording] ${serviceName} cache invalidated`);
              
              if (animationCompletion) animationCompletion();
            } catch (jsonError) {
              console.error(`❌ [StopRecording] Error parsing ${serviceName} JSON:`, jsonError);
              if (animationCompletion) animationCompletion();
            }
          } else {
            try {
              const errorText = await response.text();
              console.error(`❌ [StopRecording] ${serviceName} processing failed: ${response.status}`);
              console.error(`❌ [StopRecording] ${serviceName} error:`, errorText.substring(0, 500));
            } catch (textError) {
              console.error(`❌ [StopRecording] Error reading ${serviceName} error text:`, textError);
            }
            if (animationCompletion) animationCompletion();
          }
        };
        
        // Handle medical problems response
        await handleServiceResponse(
          medicalProblemsResponse,
          "Medical problems",
          "problemsAffected",
          () => queryClient.invalidateQueries({ queryKey: ['/api/medical-problems', patient.id] }),
          completeMedicalProblemsAnimation
        );

        // Handle surgical history response
        await handleServiceResponse(
          surgicalHistoryResponse,
          "Surgical history",
          "total_surgeries_affected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/surgical-history/${patient.id}`] })
        );
        
        // Handle medications response
        await handleServiceResponse(
          medicationsResponse,
          "Medications",
          "medicationsAffected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/medications-enhanced`] })
        );

        // Handle orders response
        await handleServiceResponse(
          ordersResponse,
          "Orders",
          "ordersAffected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/draft-orders`] }),
          completeOrdersAnimation
        );

        // Handle CPT response  
        await handleServiceResponse(
          cptResponse,
          "CPT codes",
          "cptCodesAffected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/encounters/${encounterId}/cpt-codes`] }),
          completeBillingAnimation
        );

        // Handle allergy response
        await handleServiceResponse(
          allergyResponse,
          "Allergies",
          "allergiesAffected",
          () => queryClient.invalidateQueries({ queryKey: ['/api/allergies', patient.id] })
        );

        // Handle family history response
        await handleServiceResponse(
          familyHistoryResponse,
          "Family history",
          "familyHistoryAffected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/family-history/${patient.id}`] })
        );

        // Handle social history response
        await handleServiceResponse(
          socialHistoryResponse,
          "Social history",
          "socialHistoryAffected",
          () => queryClient.invalidateQueries({ queryKey: [`/api/social-history`, patient.id] })
        );

        toast({
          title: "Recording Complete",
          description:
            "SOAP note saved and all medical data processed successfully",
        });
      } catch (error) {
        console.error(
          "❌ [StopRecording] Error processing after recording stop:",
          error,
        );
        toast({
          variant: "destructive",
          title: "Processing Error",
          description:
            "SOAP note saved but some processing failed. Please try manual save.",
        });
      }
    } else {
      console.log("❌ [EncounterView] === NO SOAP CONTENT TO PROCESS ===");
      console.log(
        "❌ [EncounterView] This explains why automatic processing isn't happening!",
      );
      console.log("❌ [EncounterView] soapNote value:", soapNote);
      console.log("❌ [EncounterView] typeof soapNote:", typeof soapNote);
      toast({
        title: "Recording Stopped",
        description: "No SOAP content was generated during recording",
      });
    }

    // Mode-specific cleanup and status reporting
    if (useRestAPI) {
      console.log("🔍 [EncounterView] REST API mode - WebSocket stays open for transcription only");
      console.log("🔍 [TokenMonitor] REST API mode - no AI suggestion token consumption, only Whisper transcription");
    } else {
      console.log("🧠 [EncounterView] WebSocket mode - WebSocket remains open for ongoing AI suggestions");
      console.log("🔍 [TokenMonitor] WebSocket mode - background token consumption continues for suggestions");
    }
    
    console.log("✅ [EncounterView] Recording complete. Mode:", useRestAPI ? "REST API (manual suggestions + WebSocket transcription)" : "WebSocket (continuous suggestions + transcription)");
  };

  const generateSmartSuggestions = () => {
    setIsGeneratingSmartSuggestions(true);
    setTimeout(() => {
      setGptSuggestions(
        "AI-generated clinical suggestions based on the encounter...",
      );
      setIsGeneratingSmartSuggestions(false);
      toast({
        title: "Smart Suggestions Generated", 
        description: "GPT analysis complete",
      });
    }, 1000);
  };

  // REST API Suggestions - Cost-optimized alternative
  const generateRestAPISuggestions = async () => {
    console.log("🔍 [TokenMonitor] Manual REST API suggestion request initiated");
    console.log("🔍 [TokenMonitor] This will consume tokens via REST API call");
    
    // Throttling check for manual requests - using lastSuggestionCall for animation state
    const now = Date.now();
    if (now - lastSuggestionCall < 10000) {
      console.log("🚫 [RestAPI] Manual request throttled - last request was", Math.round((now - lastSuggestionCall) / 1000), "seconds ago");
      toast({
        title: "Request Throttled",
        description: `Please wait ${Math.ceil((10000 - (now - lastSuggestionCall)) / 1000)} more seconds before requesting suggestions again.`,
        variant: "destructive",
      });
      return;
    }
    
    setLastSuggestionCall(now);
    
    // Start animation
    setIsGeneratingRestSuggestions(true);
    setSuggestionProgress(0);
    
    // Progress animation - smooth updates every 50ms
    const startTime = Date.now();
    const estimatedDuration = 4000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setSuggestionProgress(progress);
    }, 50);

    if (!transcription || transcription.length < 15) {
      toast({
        title: "Insufficient Content",
        description:
          "Need at least 15 characters of transcription for suggestions",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(
        "🧠 [EncounterView] Generating REST API suggestions for transcription:",
        transcription.substring(0, 100) + "...",
      );

      const requestBody = {
        patientId: patient.id.toString(),
        userRole: "provider",
        transcription: transcription,
      };

      const response = await fetch("/api/voice/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🧠 [EncounterView] REST API suggestions received:", data);
        
        // Complete animation
        clearInterval(progressInterval);
        setSuggestionProgress(100);
        setTimeout(() => {
          setIsGeneratingRestSuggestions(false);
          setSuggestionProgress(0);
        }, 500);

        if (data.aiSuggestions?.realTimePrompts?.length > 0) {
          console.log("🔍 [TokenMonitor] REST API response received - tokens consumed:", data.usage);
          
          // Implement accumulative behavior with WebSocket formatting
          setGptSuggestions((prevSuggestions) => {
            // Format suggestions exactly like WebSocket with proper bullet points
            const formattedPrompts = data.aiSuggestions.realTimePrompts.map(
              (prompt: string) => {
                const cleanPrompt = prompt.replace(/^[•\-\*]\s*/, "").trim();
                return cleanPrompt ? `• ${cleanPrompt}` : prompt;
              },
            );

            const newInsights = formattedPrompts.join("\n");

            // Check if this is the first suggestion or we're adding to existing ones
            if (
              !prevSuggestions ||
              prevSuggestions === "AI analysis will appear here..."
            ) {
              // First suggestion - add header like WebSocket
              return `🩺 REST API CLINICAL INSIGHTS:\n\n${newInsights}`;
            } else {
              // Accumulate new suggestions with existing ones, add separator like WebSocket
              return `${prevSuggestions}\n\n${newInsights}`;
            }
          });

          toast({
            title: "AI Suggestions Generated",
            description: `Added ${data.aiSuggestions.realTimePrompts.length} new insights using ${data.model}`,
          });
        } else {
          console.log("🔍 [TokenMonitor] REST API response with no suggestions - tokens still consumed");
          setGptSuggestions((prevSuggestions) => {
            if (
              !prevSuggestions ||
              prevSuggestions === "AI analysis will appear here..."
            ) {
              return "🩺 REST API CLINICAL INSIGHTS:\n\nNo specific suggestions generated for current content.";
            } else {
              return `${prevSuggestions}\n\nNo additional suggestions for current input.`;
            }
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "Unknown error",
        );
      }
    } catch (error) {
      console.error("❌ [EncounterView] REST API suggestions failed:", error);
      console.log("🔍 [TokenMonitor] REST API request failed - no tokens consumed");
      
      // Reset animation on error
      clearInterval(progressInterval);
      setIsGeneratingRestSuggestions(false);
      setSuggestionProgress(0);
      
      setGptSuggestions(
        `❌ REST API Error: ${(error as any)?.message || "Unknown error"}`,
      );
      toast({
        title: "Suggestion Generation Failed",
        description: "REST API error - check logs for details",
        variant: "destructive",
      });
    }
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
        description:
          "No transcription available to generate SOAP note from. Please record some audio first.",
      });
      return;
    }

    console.log(
      "🔄 [EncounterView] Manually triggering SOAP note generation from transcription...",
    );

    // Start animation - Set generating state first
    setIsGeneratingSOAP(true);
    setGenerationProgress(0);
    
    // Progress animation - smooth updates every 50ms
    const startTime = Date.now();
    const estimatedDuration = 6000; // Note generation typically takes longer than suggestions
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setGenerationProgress(progress);
    }, 50);

    try {
      // Use the unified streaming system with force generation
      if (realtimeSOAPRef.current) {
        realtimeSOAPRef.current.generateSOAPNote(true); // Force generation bypasses intelligent streaming checks
        
        // Complete the progress animation when generation is done
        // Note: The actual completion will be handled by onSOAPNoteComplete callback
        // but we set up a fallback cleanup
        setTimeout(() => {
          clearInterval(progressInterval);
          setGenerationProgress(100);
          setTimeout(() => {
            setGenerationProgress(0);
          }, 500);
        }, estimatedDuration);
        
      } else {
        clearInterval(progressInterval);
        setGenerationProgress(0);
        setIsGeneratingSOAP(false);
        console.error(
          "❌ [EncounterView] RealtimeSOAPIntegration ref not available",
        );
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description:
            "Unable to access SOAP generation system. Please try again.",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setGenerationProgress(0);
      setIsGeneratingSOAP(false);
      console.error("❌ [EncounterView] Error during generation:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "An error occurred during note generation. Please try again.",
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

      // Process medical problems - let GPT unified parser handle all processing decisions
      const timeSinceRecordingStop = Date.now() - lastRecordingStopTime;
      const shouldProcessMedicalProblems = timeSinceRecordingStop > 5000; // Only wait 5 seconds after recording stop

      console.log(
        "🏥 [SmartProcessing] === MEDICAL PROBLEMS PROCESSING ===",
      );
      console.log(
        "🏥 [SmartProcessing] Time since recording stop:",
        timeSinceRecordingStop,
        "ms",
      );
      console.log(
        "🏥 [SmartProcessing] Should process medical problems:",
        shouldProcessMedicalProblems,
      );

      if (shouldProcessMedicalProblems) {
        console.log(
          "🏥 [SmartProcessing] Processing medical problems for significant manual changes...",
        );

        try {
          const medicalProblemsResponse = await fetch(
            `/api/medical-problems/process-unified`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                patientId: patient.id,
                encounterId: encounterId,
                soapNote: currentContent,
                triggerType: "manual_edit",
              }),
            },
          );

          if (medicalProblemsResponse.ok) {
            const result = await medicalProblemsResponse.json();
            console.log(
              `✅ [SmartProcessing] Medical problems updated: ${result.problemsAffected || 0} problems affected`,
            );

            // Update tracking state
            setLastProcessedSOAPContent(currentContent);

            // Invalidate medical problems cache (unified API)
            await queryClient.invalidateQueries({
              queryKey: ['/api/medical-problems', patient.id],
            });
          } else {
            console.error(
              `❌ [SmartProcessing] Medical problems processing failed: ${medicalProblemsResponse.status}`,
            );
          }
        } catch (error) {
          console.error(
            "❌ [SmartProcessing] Error processing medical problems:",
            error,
          );
        }
      } else {
        console.log(
          "🏥 [SmartProcessing] Skipping medical problems processing - too soon after recording (waiting 5 seconds)",
        );
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
      {/* Left Chart Panel - Unified Expandable */}
      <UnifiedChartPanel
        patient={patient}
        config={{
          context: 'provider-encounter',
          userRole: currentUser?.role,
          allowResize: true,
          defaultWidth: "w-80",
          maxExpandedWidth: "90vw",
          enableSearch: true
        }}
        encounterId={encounterId}
        encounter={encounter}
        onBackToChart={onBackToChart}
        isAutoGeneratingMedicalProblems={isAutoGeneratingMedicalProblems}
        medicalProblemsProgress={medicalProblemsProgress}
      />

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
              <h2 className="text-xl font-semibold">
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

                {/* Frozen Recording Mode Indicator */}
                {isRecording && userEditingLock && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-xs text-amber-700 font-medium">
                      Recording Frozen - Manual edits protected
                    </span>
                  </div>
                )}

                {isRecording && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      console.log(
                        "🔄 [EncounterView] Manual transcription restart requested...",
                      );
                      try {
                        await stopRecording();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 2000),
                        );
                        await startRecording();
                        toast({
                          title: "Transcription Restarted",
                          description: "Recording session has been refreshed.",
                        });
                      } catch (error) {
                        console.error(
                          "❌ [EncounterView] Manual restart failed:",
                          error,
                        );
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
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold">
                  AI Suggestions
                </h2>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Mode:</span>
                  <button
                    onClick={() => setUseRestAPI(!useRestAPI)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      useRestAPI
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {useRestAPI ? "REST API" : "WebSocket"}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={
                    useRestAPI
                      ? generateRestAPISuggestions
                      : generateSmartSuggestions
                  }
                  size="sm"
                  variant="outline"
                  disabled={
                    (useRestAPI && (!transcription || transcription.length < 15)) ||
                    isGeneratingRestSuggestions ||
                    isGeneratingSmartSuggestions
                  }
                  className={`relative overflow-hidden transition-all duration-200 ${
                    isGeneratingRestSuggestions ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  style={{
                    background: isGeneratingRestSuggestions && useRestAPI
                      ? `linear-gradient(90deg, 
                          rgba(59, 130, 246, 0.1) 0%, 
                          rgba(59, 130, 246, 0.1) ${suggestionProgress}%, 
                          transparent ${suggestionProgress}%, 
                          transparent 100%)`
                      : undefined
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {isGeneratingRestSuggestions && useRestAPI && (
                      <div 
                        className="h-3 w-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"
                        style={{
                          animationDuration: '1s'
                        }}
                      />
                    )}
                    {isGeneratingSmartSuggestions && !useRestAPI && (
                      <div className="h-3 w-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    )}
                    <span>
                      {isGeneratingRestSuggestions && useRestAPI
                        ? `Generating... ${Math.round(suggestionProgress)}%`
                        : isGeneratingSmartSuggestions && !useRestAPI
                        ? "Generating..."
                        : useRestAPI
                        ? "Add Suggestions"
                        : "Generate Suggestions"}
                    </span>
                  </div>
                  {/* Precise progress indicator - subtle border animation */}
                  {isGeneratingRestSuggestions && useRestAPI && (
                    <div 
                      className="absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-100 ease-out"
                      style={{
                        width: `${suggestionProgress}%`
                      }}
                    />
                  )}
                </Button>
                {useRestAPI && (
                  <Button
                    onClick={() => setGptSuggestions("")}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    disabled={isGeneratingRestSuggestions}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="text-gray-500 text-sm whitespace-pre-line">
              {gptSuggestions || "AI analysis will appear here..."}
            </div>
          </Card>

          {/* Note Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold">
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

              {/* Note Type Selection */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                <NoteTypeSelector
                  noteType={selectedNoteType}
                  onNoteTypeChange={setSelectedNoteType}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  disabled={isRecording}
                />
                <div className="text-xs text-gray-500">
                  {isRecording
                    ? "Recording in progress - template locked"
                    : "Select template before recording"}
                </div>
              </div>

              <div className="flex items-center space-x-2 px-4 py-2">
                {/* Real-time Clinical Note Integration */}
                <RealtimeSOAPIntegration
                  patientId={patient.id.toString()}
                  encounterId={encounterId.toString()}
                  transcription={transcription}
                  userEditingLock={userEditingLock}
                  recordingCooldown={recordingCooldown}
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
                    
                    // Complete the progress animation
                    setGenerationProgress(100);
                    setTimeout(() => {
                      setGenerationProgress(0);
                    }, 500);
                    
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
                  autoTrigger={false}
                  enableIntelligentStreaming={false}
                  noteType={selectedNoteType}
                  selectedTemplate={selectedTemplate}
                />

                {/* Context-Aware AI Generation Button */}
                {transcription.trim() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (userEditingLock) {
                        // Show modal for user with edits
                        console.log("🔒 [UserEditLock] Manual AI regeneration requested with edit lock active");
                        setShowRecordingConflictModal(true);
                        setPendingRecordingStart(() => () => {
                          // Auto-save current edits first
                          if (editor && soapNote.trim()) {
                            console.log("💾 [UserEditLock] Auto-saving edits before regeneration");
                            handleSaveSOAP();
                          }
                          // Clear edit lock and regenerate
                          setUserEditingLock(false);
                          if (realtimeSOAPRef.current) {
                            realtimeSOAPRef.current.generateSOAPNote(true);
                          }
                        });
                      } else {
                        // Direct generation for users without edits
                        handleGenerateFromTranscription();
                      }
                    }}
                    disabled={isGeneratingSOAP || !transcription.trim()}
                    className={`relative overflow-hidden transition-all duration-200 ${
                      userEditingLock 
                        ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' 
                        : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                    } ${isGeneratingSOAP ? (userEditingLock ? 'bg-purple-100 border-purple-300' : 'bg-green-100 border-green-300') : ''}`}
                    style={{
                      background: isGeneratingSOAP
                        ? `linear-gradient(90deg, 
                            ${userEditingLock 
                              ? 'rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0.1)' 
                              : 'rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.1)'
                            } ${generationProgress || 0}%, 
                            transparent ${generationProgress || 0}%, 
                            transparent 100%)`
                        : undefined
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      {isGeneratingSOAP && (
                        <div 
                          className={`h-3 w-3 rounded-full border-2 ${
                            userEditingLock ? 'border-purple-600' : 'border-green-600'
                          } border-t-transparent animate-spin`}
                          style={{
                            animationDuration: '1s'
                          }}
                        />
                      )}
                      {userEditingLock && <Bot className="h-4 w-4" />}
                      <span>
                        {isGeneratingSOAP
                          ? `Generating... ${Math.round(generationProgress || 0)}%`
                          : userEditingLock
                          ? "Regenerate from AI"
                          : "Generate from Transcription"}
                      </span>
                    </div>
                    {/* Precise progress indicator - subtle border animation */}
                    {isGeneratingSOAP && (
                      <div 
                        className={`absolute bottom-0 left-0 h-0.5 ${
                          userEditingLock ? 'bg-purple-500' : 'bg-green-500'
                        } transition-all duration-100 ease-out`}
                        style={{
                          width: `${generationProgress || 0}%`
                        }}
                      />
                    )}
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
                    autoSaveStatus === "saved" ||
                    (editor?.getHTML() || soapNote) === lastSaved
                      ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  }`}
                >
                  {isSavingSOAP || isAutoSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : autoSaveStatus === "saved" ||
                    (editor?.getHTML() || soapNote) === lastSaved ? (
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
              <div className="relative w-full h-full min-h-[500px] border rounded-lg bg-white">
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
                
                {/* Vulnerable Window Protection Loading Screen */}
                {editorVulnerableWindow && (
                  <VulnerableWindowLoadingScreen 
                    userEditingLock={userEditingLock}
                    contentLength={soapNote?.length || 0}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Unified Real-time Clinical Note Integration with Intelligent Streaming */}
          <RealtimeSOAPIntegration
            ref={realtimeSOAPRef}
            patientId={patient.id.toString()}
            encounterId={encounterId.toString()}
            transcription={transcription}
            userEditingLock={userEditingLock}
            recordingCooldown={recordingCooldown}
            onSOAPNoteUpdate={handleSOAPNoteUpdate}
            onSOAPNoteComplete={handleSOAPNoteComplete}
            onDraftOrdersReceived={handleDraftOrdersReceived}
            onCPTCodesReceived={handleCPTCodesReceived}
            isRealtimeEnabled={true}
            autoTrigger={true}
            enableIntelligentStreaming={true}
            isRecording={isRecording}
            noteType={selectedNoteType}
            selectedTemplate={selectedTemplate}
          />

          {/* Draft Orders */}
          <DraftOrders
            patientId={patient.id}
            encounterId={encounterId}
            isAutoGenerating={isAutoGeneratingOrders}
            ordersProgress={ordersProgress}
          />

          {/* CPT Codes & Diagnoses */}
          <CPTCodesDiagnoses
            patientId={patient.id}
            encounterId={encounterId}
            isAutoGenerating={isAutoGeneratingBilling}
            billingProgress={billingProgress}
          />

          {/* Encounter Workflow Controls */}
          <EncounterWorkflowControls
            encounterId={encounterId}
            encounterStatus={encounter?.encounterStatus || "in_progress"}
            onStatusChange={() => {
              queryClient.invalidateQueries({
                queryKey: [`/api/encounters/${encounterId}`],
              });
            }}
          />

          {/* Smart Chart Update Button */}
          {isChartUpdateAvailable && (
            <Card className="mb-4 border-l-4 border-l-blue-500 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Chart Update Available</h3>
                        <p className="text-sm text-blue-700">
                          SOAP note has been modified. Update chart sections with latest content.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={updateChartFromNote}
                    disabled={isUpdatingChart}
                    className={`relative overflow-hidden transition-all duration-300 ${
                      isUpdatingChart 
                        ? 'bg-blue-100 text-blue-500 border-blue-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title="Update Medical Problems, Surgical History, Medications, and Allergies from SOAP note changes"
                  >
                    {/* Progress bar background */}
                    {isUpdatingChart && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-100 ease-linear"
                        style={{ 
                          width: `${chartUpdateProgress}%`,
                          opacity: 0.3
                        }}
                      />
                    )}
                    
                    <RefreshCw className={`h-4 w-4 mr-2 relative z-10 ${
                      isUpdatingChart ? 'animate-spin' : ''
                    }`} />
                    
                    <span className="relative z-10">
                      {isUpdatingChart 
                        ? `Updating... ${Math.round(chartUpdateProgress)}%`
                        : "Update Chart from Note"
                      }
                    </span>
                  </Button>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Will update: Medical Problems • Surgical History • Medications
                </div>
              </CardContent>
            </Card>
          )}

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
                description:
                  "The encounter has been successfully signed and completed.",
              });
            }}
          />
        </div>
      </div>

      {/* Recording Conflict Modal */}
      <Dialog open={showRecordingConflictModal} onOpenChange={setShowRecordingConflictModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Warning: Manual Edits Will Be Lost</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              You have made manual edits to the note. Starting live recording or regenerating from AI will replace your changes with AI-generated content.
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="text-sm text-amber-800">
                  <strong>Your edits will be automatically saved before proceeding.</strong>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRecordingConflictModal(false);
                setPendingRecordingStart(null);
                console.log("🔒 [UserEditLock] User chose to keep note frozen");
              }}
              className="w-full sm:w-auto"
            >
              Keep Note Frozen
            </Button>
            <Button
              onClick={() => {
                console.log("🔄 [UserEditLock] User confirmed override with AI");
                setShowRecordingConflictModal(false);
                if (pendingRecordingStart) {
                  pendingRecordingStart();
                  setPendingRecordingStart(null);
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              Replace My Edits with AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
