import React, { useState, useEffect, useRef } from "react";
import { WebSocketClient } from "../utils/WebSocketClient";
import { AudioRecorder } from "./AudioRecorder";
import { Button } from "@/components/ui/button";
import { ChevronDown, PauseCircle } from "lucide-react";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficeVisits } from "@/components/OfficeVisits";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useToast } from "@/hooks/use-toast";
import { eventBus } from "../utils/eventBus";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DraftOrders } from "./DraftOrders";
import CPTCodes from "./CPTCodes";
import { TokenUsage } from "./TokenUsage";
import { LoadingProgress } from "@/components/LoadingProgress";

export function MainTranscription({
  patientId,
  encounterId,
  isRecordingStarted: externalIsRecordingStarted,
  encounterData: externalEncounterData,
  onEncounterChange,
  setOriginalEncounterData,
}: {
  patientId: string;
  encounterId?: string;
  isRecordingStarted?: boolean;
  encounterData?: any;
  onEncounterChange?: (updatedData: any) => void;
  setOriginalEncounterData?: (data: any) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [webSocketClient, setWebSocketClient] =
    useState<WebSocketClient | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [gptAnalysis, setGptAnalysis] = useState<string>("");

  const transcriptionScroll = useAutoScroll(transcription);
  const gptAnalysisScroll = useAutoScroll(gptAnalysis);
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState<boolean>(false);
  // Add a loading state for the provider note - initialize true for existing notes, false for new notes
  const [isLoadingNote, setIsLoadingNote] = useState<boolean>(
    !!externalEncounterData
      ? false
      : !!encounterId && encounterId !== "new"
        ? true
        : false,
  );
  const [isRecordingStarted, setIsRecordingStarted] = useState<boolean>(
    externalIsRecordingStarted || false,
  );

  // Sync with external isRecordingStarted prop when it changes
  useEffect(() => {
    if (externalIsRecordingStarted !== undefined) {
      setIsRecordingStarted(externalIsRecordingStarted);
    }
  }, [externalIsRecordingStarted]);
  const [soapNote, setSoapNote] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");
  const [areInsightsFrozen, setAreInsightsFrozen] = useState(false);

  // Track if the content is being updated programmatically
  const isUpdatingProgrammatically = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          encounterId && encounterId !== "new"
            ? "Loading existing note content..."
            : "Type or generate a SOAP note...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[500px] prose max-w-none whitespace-pre-wrap",
      },
    },
    content: "", // Initialize with empty content and update with soapNote in useEffect
    onUpdate: ({ editor }) => {
      // Only update React state if this isn't a programmatic update
      if (!editor.isDestroyed && !isUpdatingProgrammatically.current) {
        const newContent = editor.getHTML();

        // Debug log to verify content changes are detected
        console.log(
          `[MainTranscription] Editor content changed (${newContent.length} chars)`,
        );

        setSoapNote(newContent);

        // If this is an encounter view and we have a callback function,
        // update the parent component's encounter data
        if (encounterId && onEncounterChange && externalEncounterData) {
          console.log(
            "[MainTranscription] Updating parent component with new note content",
          );
          const updatedData = {
            ...externalEncounterData,
            note: newContent,
          };
          onEncounterChange(updatedData);
        }
      }
    },
    editable: true,
  });

  // Enhanced editor initialization effect with failsafe content setting
  useEffect(() => {
    if (editor) {
      console.log(
        "[MainTranscription] Editor initialized/updated with content length:",
        editor.getHTML().length,
        "First 50 chars:",
        editor.getHTML().substring(0, 50),
      );

      // Critical enhancement: Force a content update on editor initialization
      // if we already have soapNote content available - ensures sync on mount
      if (soapNote && soapNote.length > 0) {
        // Strip tags to compare actual content (not just HTML structure)
        const stripTags = (html: string): string =>
          html.replace(/<[^>]*>/g, "").trim();
        const editorText = stripTags(editor.getHTML());
        const soapNoteText = stripTags(soapNote);

        // Only update if editor is essentially empty but we have note content
        if (editorText.length < 3 && soapNoteText.length > 3) {
          console.log(
            "[MainTranscription] Force-updating editor content on initialization - editor empty but note exists",
          );

          // Mark that we're updating programmatically to avoid circular updates
          isUpdatingProgrammatically.current = true;

          try {
            // Set content and explicitly preserve our selection (false)
            editor.commands.setContent(soapNote, false);
            console.log(
              "[MainTranscription] Initial editor content set successfully",
            );
          } catch (err) {
            console.error(
              "[MainTranscription] Error setting initial editor content:",
              err,
            );
          } finally {
            // Reset flag after a short delay
            setTimeout(() => {
              isUpdatingProgrammatically.current = false;
            }, 100);
          }
        }
      }

      // Ensure loading state is turned off once editor is initialized with note content
      // This fixes cases where the loading state might persist incorrectly
      if (isLoadingNote && soapNote) {
        console.log(
          "[MainTranscription] Editor initialized with note content, ensuring loading state is reset",
        );
        setIsLoadingNote(false);
      }
    }
  }, [editor, soapNote, isLoadingNote]);

  // This effect runs when soapNote changes from external sources (not from typing)
  useEffect(() => {
    // Debug log to see when soapNote changes
    console.log("[MainTranscription] soapNote changed:", {
      length: soapNote?.length || 0,
      preview: soapNote ? soapNote.substring(0, 50) + "..." : "(empty)",
      editorReady: !!editor && !editor.isDestroyed,
      isUpdatingProgrammatically: isUpdatingProgrammatically.current,
    });

    // Skip this update if we're the ones who initiated it
    if (!editor || editor.isDestroyed || isUpdatingProgrammatically.current) {
      console.log(
        "[MainTranscription] Skipping editor update - editor not ready or already updating",
      );
      return;
    }

    // Only update if the content actually changed - but handle HTML normalization
    const currentEditorHTML = editor.getHTML();

    // More robust content comparison to handle whitespace and HTML structure differences
    // If lengths are significantly different or content isn't similar, consider it changed
    const lengthDifference = Math.abs(
      currentEditorHTML.length - soapNote.length,
    );
    const stripTags = (html: string): string =>
      html.replace(/<[^>]*>/g, "").trim();
    const editorText = stripTags(currentEditorHTML);
    const soapNoteText = stripTags(soapNote);

    // Consider content changed if:
    // 1. Current editor is essentially empty and soapNote has content
    // 2. The text content (without HTML tags) is different
    // 3. Length difference is significant, suggesting structural differences
    const editorIsEmpty = editorText.length < 3; // Allow for whitespace/newlines
    const hasRealContent = soapNoteText.length > 3;
    const textContentDifferent = editorText !== soapNoteText;
    const contentChanged =
      (editorIsEmpty && hasRealContent) ||
      textContentDifferent ||
      lengthDifference > 10;

    console.log("[MainTranscription] Enhanced editor content comparison:", {
      editorContentLength: currentEditorHTML.length,
      soapNoteLength: soapNote.length,
      editorTextLength: editorText.length,
      soapNoteTextLength: soapNoteText.length,
      editorIsEmpty,
      hasRealContent,
      textContentDifferent,
      contentDifferent: contentChanged,
      editorPreview: currentEditorHTML.substring(0, 50) + "...",
      soapNotePreview: soapNote.substring(0, 50) + "...",
    });

    if (contentChanged) {
      console.log("[MainTranscription] Updating editor content with soapNote");

      // Save the current cursor position and selection
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      // Mark that we're updating programmatically
      isUpdatingProgrammatically.current = true;

      try {
        // Update the content while preserving selection
        editor.commands.setContent(soapNote, false);
        console.log("[MainTranscription] Editor content updated successfully");

        // If we had a selection, try to restore it
        if (hasSelection && from < soapNote.length && to < soapNote.length) {
          editor.commands.setTextSelection({ from, to });
          console.log("[MainTranscription] Selection restored");
        }
      } catch (err) {
        console.error(
          "[MainTranscription] Error updating editor content:",
          err,
        );
      } finally {
        // Always reset the flag after a short delay
        setTimeout(() => {
          isUpdatingProgrammatically.current = false;
          console.log(
            "[MainTranscription] Reset isUpdatingProgrammatically flag",
          );
        }, 100);
      }
    } else {
      console.log(
        "[MainTranscription] No content change needed - editor already has current content",
      );
    }
  }, [soapNote, editor]);

  // Reset loading state when encounterId changes
  useEffect(() => {
    if (encounterId) {
      // Only set loading state for actual encounter IDs, not "new" ones
      if (encounterId !== "new") {
        console.log(
          "[MainTranscription] Encounter ID changed, setting loading state to true",
        );
        setIsLoadingNote(true);
      } else {
        // For "new" encounters, we don't need to load anything
        console.log("[MainTranscription] New encounter, no loading needed");
        setIsLoadingNote(false);
      }
    }
  }, [encounterId]);

  // Add safety timeout to ensure loading state is never stuck
  useEffect(() => {
    // Set a safety timeout to ensure loading state is never stuck for more than 5 seconds
    if (isLoadingNote) {
      console.log(
        "[MainTranscription] Setting safety timeout for loading state",
      );
      const safetyTimeout = setTimeout(() => {
        console.log(
          "[MainTranscription] Safety timeout triggered, forcing loading state to false",
        );
        setIsLoadingNote(false);
      }, 5000);

      // Clear the timeout if loading state changes before timeout
      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoadingNote]);

  // Load encounter data if encounterId is provided
  useEffect(() => {
    // If external encounter data is provided, use it
    if (externalEncounterData) {
      // Reset loading state since we have data
      setIsLoadingNote(false);

      console.log(
        "[MainTranscription] Using external encounter data:",
        externalEncounterData,
      );

      // Simple debug logging to verify presence of note content
      console.log("[MainTranscription] Note content check:", {
        hasNote: !!externalEncounterData.note,
        noteLength: externalEncounterData.note
          ? externalEncounterData.note.length
          : 0,
        notePreview: externalEncounterData.note
          ? externalEncounterData.note.substring(0, 50) + "..."
          : "(empty)",
      });

      // STRICT APPROACH: Only use the canonical location for provider notes
      // Always use encounters.note field and avoid fallbacks to prevent data contamination
      if (externalEncounterData.note) {
        console.log(
          "[MainTranscription] Setting note content from encounters.note (canonical location)",
        );
        setSoapNote(externalEncounterData.note);
      } else {
        // If no note is found, just set an empty string - don't attempt to find content elsewhere
        console.log(
          "[MainTranscription] No note content found in encounters.note, using empty string",
        );
        setSoapNote("");
      }

      // Always reset loading state when we have external data, regardless of content
      setIsLoadingNote(false);
      return;
    }

    if (encounterId) {
      // If it's a new encounter, don't try to fetch data
      if (encounterId === "new") {
        // Just clear the editor for a new note - effect will handle editor update
        setSoapNote("");
        // Explicitly set loading to false for new encounters
        setIsLoadingNote(false);
        return;
      }

      const fetchEncounterData = async () => {
        try {
          // Explicitly indicate we're loading
          setIsLoadingNote(true);

          console.log(
            `[MainTranscription] Fetching encounter data for patient ${patientId}, encounter ${encounterId}`,
          );

          // Additional debug info about API request
          console.log(
            `[MainTranscription] API URL: /api/patients/${patientId}/office-visits/${encounterId}`,
          );

          const response = await fetch(
            `/api/patients/${patientId}/office-visits/${encounterId}`,
          );

          // Log response status and headers for debugging
          console.log(
            `[MainTranscription] API response status: ${response.status} ${response.statusText}`,
          );

          if (!response.ok) {
            console.error(
              `[MainTranscription] Error fetching encounter: ${response.status} ${response.statusText}`,
            );
            throw new Error(
              `Failed to fetch encounter data: ${response.status} ${response.statusText}`,
            );
          }

          // Get response as text first to inspect it
          const responseText = await response.text();
          console.log(
            `[MainTranscription] Raw API response length: ${responseText.length}`,
          );
          console.log(
            `[MainTranscription] Raw API response (first 500 chars): ${responseText.substring(0, 500)}...`,
          );

          // Parse the text to JSON
          let encounter;
          try {
            encounter = JSON.parse(responseText);
            // Super detailed logging of the encounter structure
            console.log(
              "[MainTranscription] ENCOUNTER STRUCTURE DEBUG:",
              JSON.stringify({
                hasNote: !!encounter.note,
                noteLength: encounter.note?.length || 0,
                noteType: typeof encounter.note,
                notePreview: encounter.note?.substring(0, 100) || "EMPTY",
                encounterKeys: Object.keys(encounter),
                hasNestedNote: encounter.metadata && !!encounter.metadata.note,
                nestedNoteLength: encounter.metadata?.note?.length || 0,
                hasContent: !!encounter.content,
                contentLength: encounter.content?.length || 0,
              }),
            );
          } catch (parseError) {
            console.error(
              `[MainTranscription] JSON parse error: ${parseError}`,
            );
            throw new Error(`Failed to parse encounter data: ${parseError}`);
          }

          // Log the full encounter data for debugging
          console.log("[MainTranscription] Loaded encounter data:", encounter);

          // Enhanced debug logging to check note content
          console.log("[MainTranscription] Note content check:", {
            hasNote: !!encounter.note,
            noteLength: encounter.note ? encounter.note.length : 0,
            notePreview: encounter.note
              ? encounter.note.substring(0, 50) + "..."
              : "(empty)",
            noteType: typeof encounter.note,
            isNullOrUndefined:
              encounter.note === null || encounter.note === undefined,
            rawNote: String(encounter.note).substring(0, 100), // Convert to string and get first 100 chars
          });

          // Update loading state - note has been fetched
          setIsLoadingNote(false);

          // STRICT APPROACH: Only use the canonical field - encounters.note
          // This ensures consistent behavior with our data integrity model
          if (encounter.note) {
            console.log(
              "[MainTranscription] Setting note content from encounters.note (canonical location)",
            );
            setSoapNote(encounter.note);
          } else {
            // If no note is found, just set an empty string - don't attempt to find content elsewhere
            console.log(
              "[MainTranscription] No note content found in encounters.note, using empty string",
            );
            setSoapNote("");
          }

          // Always reset loading state when done, regardless of content

          // Save the original encounter data if we have a callback to do so
          if (setOriginalEncounterData) {
            console.log(
              "[MainTranscription] Saving original encounter data to parent component",
            );
            setOriginalEncounterData(encounter);
          }
        } catch (error) {
          console.error("[MainTranscription] Error loading encounter:", error);
          // Critical fix: Ensure loading state is reset even in error scenarios
          setIsLoadingNote(false);
          toast({
            variant: "destructive",
            description: "Failed to load encounter data",
          });
        }
      };

      fetchEncounterData();
    }
  }, [encounterId, patientId, editor, externalEncounterData]);

  const [isEditing, setIsEditing] = useState<boolean>(true);

  const [pendingChartUpdates, setPendingChartUpdates] = useState<any>(null);

  const invalidatePatientQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [`/api/patients/${patientId}/chart`],
    });
    queryClient.invalidateQueries({
      queryKey: [`/api/patients/${patientId}/office-visits`],
    });
    queryClient.invalidateQueries({
      queryKey: [`/api/patients/${patientId}/medical-problems`],
    });
    queryClient.invalidateQueries({
      queryKey: [`/api/patiensots/${patientId}/medications`],
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (soapNote: string) => {
      if (!patientId) {
        throw new Error("Patient ID is required");
      }

      // If encounterId is provided and not 'new', update the existing encounter
      // Otherwise, create a new encounter
      const isNewEncounter = !encounterId || encounterId === "new";

      // CRITICAL FIX: Always use the encounters endpoint directly to avoid trigger recursion issues
      // This is the canonical data source and avoids the complex sync triggers between encounters/office_visits

      // Check for Method A flags in external encounter data
      const isMethodA =
        externalEncounterData?.appointment_id ||
        externalEncounterData?.metadata?.fromAppointment ||
        externalEncounterData?.metadata?.appointment_id;

      // For Method A, we need to check several places for the correct ID
      // Log detailed debug information to trace the issue
      console.log(
        `[MainTranscription] CRITICAL FIX - Direct save to canonical endpoint detected. ` +
          `Is new: ${isNewEncounter}, Method A: ${isMethodA}, ` +
          `Patient ID: ${patientId}, Encounter ID: ${encounterId}, ` +
          `Note length: ${soapNote?.length || 0}`,
      );

      // CRITICAL FIX: Use the canonical encounters endpoint for all saves to avoid trigger issues
      // This directly bypasses complex trigger logic and ensures data integrity
      const url = !isNewEncounter
        ? `/api/patients/${patientId}/encounters/${encounterId}`
        : `/api/patients/${patientId}/encounters`;

      console.log(
        `[MainTranscription] CRITICAL FIX - Using direct canonical URL: ${url}`,
      );

      const method = !isNewEncounter ? "PUT" : "POST";

      console.log(
        `[MainTranscription] Using URL: ${url} with method: ${method}`,
      );

      // Prepare request body with enhanced metadata to help debugging
      const requestBody: any = {
        // CANONICAL STORAGE ONLY: Only use the canonical note field for provider notes
        note: soapNote,

        // CRITICAL FIX: Always include proper provider ID when using encounters endpoint directly
        provider_id: 15, // Use known valid provider ID

        visit_date: new Date().toISOString(),
        // CRITICAL FIX: Define encounter state string here to ensure consistency
        state: "signed", // Include state field for backward compatibility
        encounter_state: "signed", // Always mark as signed to ensure proper processing
        encounter_status: "signed", // Additional field for compatibility
        force_processing: true, // Force the server to process chart data

        // CRITICAL FIX: Always identify as provider role to ensure proper SOAP processing
        userRole: "provider", // Explicitly identify as provider role

        // CRITICAL FIX: Adding encounter_type field for direct encounters endpoint
        // This is required when using the encounters API directly
        encounter_type: "office_visit",

        // CRITICAL FIX: Add trigger recursion prevention flag
        // This is the key fix that prevents stack overflow by telling triggers not to fire again
        disable_triggers: true,

        metadata: {
          // CRITICAL FIX: Add synced_by_trigger flag to prevent recursion
          // This matches what the database trigger functions check for
          synced_by_trigger: true,

          // Add contextual information for debugging purposes
          saveTime: new Date().toISOString(),
          method: encounterId ? "update_existing" : "create_new",
          fromAppointment: !!externalEncounterData?.appointment,
          appointmentId: externalEncounterData?.appointment?.id,

          // CRITICAL FIX: Explicitly identify as provider in metadata
          userRole: "provider",

          // CRITICAL FIX: Add state values to metadata to ensure consistency
          state: "signed",
          encounter_state: "signed",
          encounter_status: "signed",

          // Add flags to ensure processing happens but prevent trigger recursion
          is_provider_submission: true,
          force_processing: true,
          disable_triggers: true,
          direct_save: true,

          // CRITICAL FIX: Add provider ID in metadata as well for better compatibility
          provider_id: 15,

          // Add a flag indicating we're using canonical storage only
          using_canonical_storage: true,

          // CRITICAL FIX: This is a direct save to the encounter endpoint
          using_direct_encounters_endpoint: true,
          encounter_id: encounterId,
          attempt: Math.floor(Date.now() / 1000), // Timestamp to track retries
          version: "fix-v3", // Updated version tag for debugging
        },
      };

      // Check if we need to restore the original state (for previously signed notes)
      // If the encounter was previously in "signed" state and temporarily changed to "in_progress"
      if (
        externalEncounterData?._original_state === "signed" ||
        externalEncounterData?._original_encounter_status === "signed"
      ) {
        console.log(
          "[MainTranscription] Restoring original signed state for previously signed encounter",
        );

        // Use the original state values if available
        requestBody.state = "signed";
        requestBody.encounter_status = "signed";

        // Important: set display_mode to ensure the note is still visible after saving
        requestBody.display_mode = "visible";
        requestBody.hidden = false;

        // Add a flag in metadata to ensure note remains visible
        if (requestBody.metadata) {
          requestBody.metadata.display_after_signing = true;
          requestBody.metadata.previously_reopened = true;
        }

        // Log for debugging
        console.log(
          "[MainTranscription] State restoration - original state:",
          externalEncounterData?._original_state || "unknown",
          "original encounter_status:",
          externalEncounterData?._original_encounter_status || "unknown",
        );
      }

      // Include visit_type if available from external encounter data
      if (externalEncounterData?.visit_type) {
        requestBody.visit_type = externalEncounterData.visit_type;
      } else {
        // Default to office_visit if no visit_type is specified
        requestBody.visit_type = "office_visit";
      }

      // ALWAYS add the force chart processing flags regardless of method
      // This ensures consistent behavior between Method A and Method B
      requestBody.force_chart_processing = true;

      // Use isMethodA from earlier in the code
      // Adding a fallback check for encounterId as well
      if (isMethodA || (encounterId && encounterId !== "new")) {
        console.log(
          "[MainTranscription] METHOD A CRITICAL DEBUG - Method A detected (appointment workflow).",
        );
        // Add special flags for Method A to ensure chart processing happens
        requestBody.from_method_a = true;
        requestBody.source = "method_a_from_appointment";

        // DEBUG: Log the note content length to check if it's being properly included
        console.log(
          `[MainTranscription] METHOD A DEBUG - Note content length: ${soapNote.length} characters`,
        );
        console.log(
          `[MainTranscription] METHOD A DEBUG - First 50 chars of note: ${soapNote.substring(0, 50)}...`,
        );

        // Ensure note field is explicitly set and not undefined
        requestBody.note = soapNote;

        // Extra metadata to ensure the server knows this came from an appointment flow
        requestBody.metadata = {
          ...(requestBody.metadata || {}),
          fromAppointment: true,
          isMethodA: true,
          noteLength: soapNote.length,
          noteIsHTML: soapNote.includes("<"),
        };
      } else {
        // Method B (from chart) - still need to set flags for consistent processing
        console.log(
          "[MainTranscription] Method B detected (chart). Adding processing flags for consistency.",
        );
        requestBody.source = "method_b_from_chart";

        // CRITICAL FIX: For Method B, add more explicit metadata
        // This ensures chart initialization happens for new encounters from chart view
        requestBody.metadata = {
          ...(requestBody.metadata || {}),
          method: "method_b_from_chart",
          source: "method_b_from_chart",
          from_chart: true,
          needs_chart_init: true,
          force_processing: true,
          isMethodB: true,
        };

        // CRITICAL FIX: Set top-level flags for Method B
        requestBody.force_processing = true;
        requestBody.force_chart_processing = true;
      }

      // If we have appointment data in external encounter data, include it
      if (externalEncounterData?.appointment) {
        requestBody.appointment_id = externalEncounterData.appointment.id;
        requestBody.from_appointment = true;

        // Log that we've already added all note content fields higher up in the code
        if (isMethodA) {
          console.log(
            "[MainTranscription] METHOD A - Appointment data included, note fields already set",
          );
        }

        console.log(
          "[MainTranscription] Including appointment data:",
          externalEncounterData.appointment,
        );
      }

      console.log(
        `[MainTranscription] Saving SOAP note via ${method} to ${url}`,
      );

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error("[MainTranscription] Failed to save SOAP note:", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(
          `Failed to ${encounterId ? "update" : "save"} SOAP note`,
        );
      }

      const result = await response.json();
      console.log("[MainTranscription] SOAP note save response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log(
        "[MainTranscription] SOAP note save success, processing response:",
        data,
      );

      // Invalidate the appropriate queries for both office_visits and encounters
      queryClient.invalidateQueries({ queryKey: ["office_visits", patientId] });
      queryClient.invalidateQueries({ queryKey: ["encounters", patientId] });

      // Show different messages based on operation type
      const isNewEncounter = !encounterId || encounterId === "new";

      // Only show toast for new encounters to avoid interrupting the chart update toast
      if (isNewEncounter) {
        toast({
          description: "SOAP Note signed and saved successfully!",
        });
      }

      // Process chart updates and show appropriate feedback
      // Always log the entire response to assist with debugging
      console.log(
        "[MainTranscription] Complete SOAP note save response:",
        JSON.stringify(data),
      );

      // Check for chart updates in either standard location or in alternative locations
      const hasStandardUpdates =
        data.chartUpdates && Object.keys(data.chartUpdates).length > 0;
      const hasNestedUpdates =
        data.visit &&
        data.visit.chartUpdates &&
        Object.keys(data.visit.chartUpdates).length > 0;

      console.log("[MainTranscription] Update detection:", {
        hasStandardUpdates,
        hasNestedUpdates,
        fromMethod:
          data.chartUpdates?.fromMethod ||
          data.visit?.chartUpdates?.fromMethod ||
          "unknown",
      });

      // For method A (from appointment), use a specially formatted toast that stays visible longer
      const isMethodA =
        data.chartUpdates?.fromMethod?.includes("appointment") ||
        data.visit?.chartUpdates?.fromMethod?.includes("appointment") ||
        data.metadata?.fromAppointment;

      // Add clear logging about which method was detected
      console.log(
        `[MainTranscription] Method detection: ${isMethodA ? "METHOD A (FROM APPOINTMENT)" : "METHOD B (FROM CHART)"}`,
      );

      // Process whichever location has thoe updates
      const chartUpdates = hasStandardUpdates
        ? data.chartUpdates
        : hasNestedUpdates
          ? data.visit.chartUpdates
          : null;

      if (chartUpdates) {
        console.log(
          "[MainTranscription] Processing chart updates:",
          chartUpdates,
        );

        // Check if chartUpdates exists and count the values in each category
        const updates: string[] = [];
        if (chartUpdates.medicalProblems?.length) updates.push("problems");
        if (chartUpdates.medications?.length) updates.push("medications");
        if (chartUpdates.labs?.length) updates.push("labs");
        if (chartUpdates.allergies?.length) updates.push("allergies");
        if (chartUpdates.imaging?.length) updates.push("imaging");

        console.log("[MainTranscription] Detected updates:", updates);

        // Show chart update toasts with different timings based on the method used
        // Method A (from appointment) gets a longer-duration toast with distinctive styling
        const toastDuration = isMethodA ? 30000 : 15000; // Extra long for Method A

        // Always delay the completion notification to ensure user sees the chart update
        // Use a longer delay for Method A to make absolutely sure it persists
        setTimeout(
          () => {
            if (updates.length > 0) {
              console.log(
                `[MainTranscription] Chart updated with ${updates.length} items: ${updates.join(", ")}`,
              );
              toast({
                title: isMethodA
                  ? "✅ Chart Updated from Appointment"
                  : "✅ Chart Updated Successfully",
                description: `Patient chart updated with: ${updates.join(", ")}`,
                duration: toastDuration,
                variant: "default",
              });
            } else {
              console.log("[MainTranscription] No chart updates needed");
              // Only show this toast for existing encounters, not new ones
              if (!isNewEncounter) {
                toast({
                  title: "✅ SOAP Note Saved",
                  description:
                    "Note saved successfully. No chart updates were needed.",
                  duration: 5000,
                });
              }
            }
          },
          isMethodA ? 3000 : 2000,
        ); // Even longer delay for Method A
      } else {
        console.log(
          "[MainTranscription] No chart updates data in response. Full response:",
          data,
        );

        // Try to extract chart updates from the response if they're nested differently
        let extractedUpdates: string[] = [];

        // Check if data.visit exists (from our server-side change)
        if (data.visit) {
          console.log("[MainTranscription] Visit data found:", data.visit);

          // Attempt to find chartUpdates in parent object
          if (data.visit.chartUpdates) {
            console.log(
              "[MainTranscription] Found chartUpdates in visit object",
            );

            if (data.visit.chartUpdates.medicalProblems?.length)
              extractedUpdates.push("problems");
            if (data.visit.chartUpdates.medications?.length)
              extractedUpdates.push("medications");
            if (data.visit.chartUpdates.labs?.length)
              extractedUpdates.push("labs");
            if (data.visit.chartUpdates.allergies?.length)
              extractedUpdates.push("allergies");
            if (data.visit.chartUpdates.imaging?.length)
              extractedUpdates.push("imaging");

            if (extractedUpdates.length > 0) {
              toast({
                title: "✅ Chart Updated Successfully",
                description: `Patient chart updated with: ${extractedUpdates.join(", ")}`,
                duration: 15000,
                variant: "default",
              });
              return;
            }
          }
        }

        // If no chart updates were found, show a generic toast
        setTimeout(() => {
          // Only show this toast for existing encounters, not new ones
          if (!isNewEncounter) {
            toast({
              title: "SOAP Note Saved",
              description: "Note was saved successfully",
              duration: 3000,
            });
          }
        }, 2000);
      }

      // Invalidate all relevant patient queries to ensure data is fresh
      invalidatePatientQueries();

      // Reset modification flag in parent component by updating original data
      if (encounterId && onEncounterChange && externalEncounterData) {
        console.log(
          "[MainTranscription] Updating parent component with server data",
        );

        // For Method A (from appointment), ensure encounter state is correctly set to signed
        // This is critical for Method A to work properly
        const isMethodA =
          data.chartUpdates?.fromMethod?.includes("appointment") ||
          data.visit?.chartUpdates?.fromMethod?.includes("appointment") ||
          data.metadata?.fromAppointment;

        // Ensure the data we send back has the correct state
        const updatedData = {
          ...data,
          // Force these critical fields to ensure they're set regardless of what the server returned
          encounter_state: "signed",
          state: "signed",
          note: data.note || editor?.getHTML() || externalEncounterData.note,
        };

        console.log("[MainTranscription] Forcing state update after save:", {
          method: isMethodA ? "A (appointment)" : "B (chart)",
          encounterId,
          setToState: "signed",
        });

        // First, update the current state via onEncounterChange
        // We'll pass false as a second parameter to indicate this shouldn't mark as modified
        if (typeof onEncounterChange === "function") {
          console.log(
            "[MainTranscription] Calling onEncounterChange with resetModified flag",
          );

          // Check if onEncounterChange accepts a second parameter for resetModified
          // If it does, we'll use it; otherwise we need to modify patient-detail.tsx
          const paramCount = onEncounterChange.length;
          if (paramCount > 1) {
            // This means onEncounterChange has been updated to accept the resetModified parameter
            onEncounterChange(updatedData, true);
          } else {
            // Original behavior - will need to update patient-detail.tsx separately
            onEncounterChange(updatedData);
          }
        }

        // Then, ensure originalEncounterData is updated to match exactly
        // This is critical to prevent "unsaved changes" warnings
        if (typeof setOriginalEncounterData === "function") {
          const clonedData = JSON.parse(JSON.stringify(updatedData));
          console.log(
            "[MainTranscription] Setting originalEncounterData to match current state",
          );
          setOriginalEncounterData(clonedData);
        }
      }

      // Only clear the SOAP note if it's a new encounter (not updating)
      if (isNewEncounter) {
        setSoapNote("");
      }

      // Reset modification flag in the parent component
      // Find and call any parent function that might handle this state
      if (typeof window !== "undefined" && window.parent) {
        // Use a custom event to communicate with parent components
        const resetEvent = new CustomEvent("reset-soap-modified-state", {
          detail: { encounterId },
        });
        console.log(
          "[MainTranscription] Dispatching reset-soap-modified-state event",
        );
        window.dispatchEvent(resetEvent);
      }

      // Finish by clearing the saving state
      console.log("[MainTranscription] SOAP note save process completed");
      setIsSavingNote(false);
      setSavingMessage("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
      setIsSavingNote(false);
      setSavingMessage("");
    },
  });

  const SYSTEM_PROMPT = `
  You are a medical AI assistant. ALWAYS RESPOND IN ENGLISH ONLY, regardless of what language is used for input. NEVER respond in any language other than English under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

  Instructions:

  Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights. Additionally, if the physician asks, provide relevant information from the patient's chart or office visits, such as past medical history, current medications, allergies, lab results, and imaging findings. Include this information concisely and accurately where appropriate. This medical information might be present in old office visit notes. Do not make anything up, it would be better to just say you don't know.

  Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
  Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. When referencing diagnostics or red flags, provide a complete list to guide the differential diagnosis (e.g., imaging-related red flags). Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per line.

  Additional details for medication recommendations:

  Always include typical starting dose, dose adjustment schedules, and maximum dose.
  Output examples of good insights:

  Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
  Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
  Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

  Output examples of bad insights (to avoid):

  Encourage gentle stretches and light activity to maintain mobility.
  Suggest warm baths at night for symptomatic relief of muscle tension.
  Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

  Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

  Return each new insight on a separate line, and prefix each line with a bullet (•), dash (-), or number if appropriate. Do not combine multiple ideas on the same line. 

  Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a  user question.
  `;

  const [prompt] = useState<string>(SYSTEM_PROMPT);

  const handleWebSocketMessage = (event: any) => {
    console.log("[MainTranscription] Received WebSocket Message:", event);
    console.log("[MainTranscription] WebSocket instance:", webSocketClient?.ws);
    console.log(
      "[MainTranscription] Current WebSocket State:",
      webSocketClient?.ws?.readyState,
    );
    switch (event.type) {
      case "draft_orders.generated":
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/orders/draft`],
        });
        toast({
          title: "Draft Orders Generated",
          description: `${event.payload.length} orders have been created for review`,
        });
        break;
      case "transcription.delta":
      case "conversation.item.input_audio_transcription.delta":
        setTranscription((prev) => prev + (event.delta?.text || event.delta));
        break;
      case "transcription.completed":
      case "conversation.item.input_audio_transcription.completed":
        setTranscription((prev) => prev + (event.transcript || "") + "\n");
        break;
      case "gpt.analysis.delta":
        // Skip updating the analysis if insights are frozen
        if (areInsightsFrozen) {
          console.log(
            "[MainTranscription] GPT analysis update skipped - insights are frozen",
          );
          break;
        }
        setGptAnalysis((prev) => {
          const updatedDelta = event.delta.replace(/\.\s+/g, ".\n");
          return prev + updatedDelta;
        });
        break;
      case "soap.note.partial":
      case "soap.note.completed":
        if (event.note) {
          const formattedNote = event.note
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .split("\n")
            .map((line) => (line.trim() ? `<p>${line}</p>` : "<p><br></p>"))
            .join("");

          // Only update the state - our effect will handle updating the editor
          // This prevents problems with cursor positions
          setSoapNote(formattedNote);

          if (event.type === "soap.note.completed") {
            console.group("[MainTranscription] 🏁 SOAP NOTE COMPLETED");
            console.log("Note Length:", event.note.length);
            console.log("Note Preview:", event.note.substring(0, 100) + "...");
            console.log("Editor Instance:", !!editor);
            console.log("Editor Destroyed:", editor?.isDestroyed);

            // Scan the completed note for CPT codes
            if (webSocketClient?.eventHandler?.cptCodesModule && event.note) {
              console.log(
                "[MainTranscription] Scanning completed SOAP note for CPT codes",
              );
              webSocketClient.eventHandler.cptCodesModule.parseTextForCPTCodes(
                event.note,
              );
            } else {
              console.log(
                "[MainTranscription] Cannot scan for CPT codes - module not available",
              );
            }

            console.groupEnd();

            setIsGeneratingSOAP(false);
            queryClient.invalidateQueries({
              queryKey: ["orders", "draft", patientId],
            });
            toast({
              description: "SOAP Note generated successfully!",
              variant: "default",
            });
          }
        }
        break;
      case "soap.note.delta":
        console.group("[MainTranscription] 📝 SOAP NOTE DELTA");
        console.log("Delta Content:", event.delta);
        console.log("Delta Length:", event.delta.length);
        console.log("Editor Instance:", !!editor);
        console.log("Editor Destroyed:", editor?.isDestroyed);

        // Only update the state - our effect will handle updating the editor
        // This prevents problems with cursor positions
        const previousLength = soapNote?.length || 0;
        setSoapNote((prev) => prev + event.delta);

        console.log("Previous SOAP Note Length:", previousLength);
        console.log(
          "New SOAP Note Length:",
          previousLength + event.delta.length,
        );
        console.log("Delegating editor update to useEffect");
        console.groupEnd();
        break;
    }
  };

  const generateSOAPNote = async () => {
    return new Promise(async (resolve, reject) => {
      console.log("[MainTranscription] Starting SOAP note generation");
      toast({
        title: "Processing SOAP Note",
        description:
          "Your note is being processed and saved. You can continue using the app.",
        duration: 10000,
        variant: "default",
      });
      console.log("[MainTranscription] WebSocket client:", !!webSocketClient);
      console.log("[MainTranscription] Patient ID:", patientId);
      console.log(
        "[MainTranscription] SOAP Note Module:",
        !!webSocketClient?.eventHandler?.soapNoteModule,
      );

      if (
        !webSocketClient ||
        !patientId ||
        !webSocketClient.eventHandler?.soapNoteModule
      ) {
        console.error("[MainTranscription] Missing required components:", {
          webSocketClient: !!webSocketClient,
          patientId: !!patientId,
          soapNoteModule: !!webSocketClient?.eventHandler?.soapNoteModule,
        });
        reject("Required components not available");
        return;
      }

      try {
        const response = await fetch(`/api/patients/${patientId}/chart`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient chart");
        }
        const patientChart = await response.json();
        const enrichedChart = {
          ...patientChart,
          patient_id: parseInt(patientId),
          id: parseInt(patientId),
        };
        console.log("[MainTranscription] Patient chart set:", enrichedChart);

        if (webSocketClient?.eventHandler) {
          if (webSocketClient.eventHandler.soapNoteModule) {
            webSocketClient.eventHandler.soapNoteModule.setPatientChart(
              enrichedChart,
            );
          }
          if (webSocketClient.eventHandler.draftOrdersModule) {
            webSocketClient.eventHandler.draftOrdersModule.setPatientChart(
              enrichedChart,
            );
          }
        } else {
          console.error(
            "[MainTranscription] Event handler modules not available",
          );
        }
        console.log(
          "[MainTranscription] Starting SOAP note generation for patient:",
          patientId,
        );

        const soapInstructions = `
Generate a SOAP note with the following sections, each preceded by FOUR blank lines:

(preceded by FOUR blank lines)**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

(preceded by FOUR blank lines)**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely **normal**, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Modify only abnormal systems. All normal areas must remain unchanged.

Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.

Document abnormal findings first (bolded), followed by pertinent negatives (normal font) where space allows.

Use concise, structured phrases. Avoid full sentences and narrative explanations.

✅ Good Example (Objective, No Diagnosis):

Skin: Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale, without ulceration, bleeding, or induration.

🚫 Bad Example (Incorrect Use of Diagnosis):

Skin: Actinic keratosis right forearm.

✅ Good Example (Objective, No Diagnosis):

Lungs: Diminished breath sounds over the right lung base with scattered rhonchi. No wheezes, rales.

🚫 Bad Example (Incorrect Use of Diagnosis):

Lungs: Sounds of pneumonia right lung.

✅ Good Example (Objective, No Diagnosis):

Skin: Left lower leg with erythema, warmth, and mild swelling, without bullae, ulceration, or fluctuance.

🚫 Bad Example (Incorrect Use of Diagnosis):

Skin: Cellulitis on the left lower leg.

Labs: List any lab results if available. If none, state "No labs reported today."


(preceded by FOUR blank lines)**ASSESSMENT/PLAN:**

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]
Example:

Chest Tightness, Suspected Airway Constriction (R06.4):

Trial low-dose inhaler therapy to address potential airway constriction.
Monitor response to inhaler and reassess in 2 weeks.
Patient education on environmental triggers (e.g., dust exposure).
Fatigue, Work-Related Stress (Z73.0):

Counsel patient on stress management and lifestyle modifications.
Encourage gradual increase in physical activity.
Family History of Cardiovascular Disease (Z82.49):

Document family history and assess cardiovascular risk factors as part of ongoing care.
(preceded by FOUR blank lines)**ORDERS:** 

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY. Be concise (e.g., "CBC, BMP, TSH"). Do not include reasons or justification for labs. 

Imaging: Specify the modality and purpose in clear terms (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose of the referral (e.g., "Refer to pulmonologist for abnormal lung function testing").

CPT Codes: Identify and include relevant CPT codes for all procedures, services, and visits. Use this format:

{
  "metadata": {
    "type": "cpt_codes"
  },
  "content": [
    {
      "code": "[CPT CODE]",
      "description": "[PROCEDURE DESCRIPTION]",
      "complexity": "low|medium|high"
    }
  ]
}

Example CPT codes to consider:
- 99201-99205: New patient office visits (complexity levels)
- 99211-99215: Established patient office visits (complexity levels)
- 99381-99387: New patient preventive visits
- 99391-99397: Established patient preventive visits
- 80048-80076: Metabolic panels and blood tests
- 71045-71048: Chest X-rays
- 93000: ECG with interpretation
- 96372: Therapeutic injection

Additional Guidelines for Medications:

Avoid vague dosing descriptions like "typical dose" or "usual dose."
Include specific strengths and formulations for every medication (e.g., "Metformin 500 mg extended-release tablet").
Always include instructions for any situational use (e.g., "May use 2 puffs 15-30 minutes before exercise if needed").
Specify safety limits where appropriate (e.g., "Do not exceed 12 puffs in a 24-hour period").
Clearly document prescribing details, including dispense quantity and number of refills.
Additional Notes:

Use clear headers to distinguish sections (Subjective, Objective, Assessment/Plan, Orders).
Precede each section header with four blank lines. 
Ensure documentation is concise, focused, and free from narrative explanations or filler.
Use the default Physical Exam template unless manual findings are explicitly documented. Replace only the affected areas as necessary.
Include ICD-10 codes for all conditions immediately after each condition in the Assessment/Plan section.
    `;

        const responsePayload = {
          type: "response.create",
          response: {
            conversation: "none",
            modalities: ["text"],
            instructions: soapInstructions,
            metadata: { type: "soap_note" },
            max_output_tokens: 4096,
            input: [
              {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: transcription }],
              },
              {
                type: "message",
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: `Patient Chart Data: ${JSON.stringify(enrichedChart)}`,
                  },
                ],
              },
            ],
            temperature: 0.7,
          },
        };

        console.log(
          "[MainTranscription] ========= SOAP NOTE GPT REQUEST =========",
        );
        console.log("1. Raw Transcription:", transcription);
        console.log(
          "2. Patient Chart:",
          JSON.stringify(enrichedChart, null, 2),
        );
        console.log("3. SOAP Instructions:", soapInstructions);
        console.log("4. Request Structure:", {
          type: responsePayload.type,
          conversation: responsePayload.response.conversation,
          modalities: responsePayload.response.modalities,
          metadata: responsePayload.response.metadata,
          maxTokens: responsePayload.response.max_output_tokens,
          temperature: responsePayload.response.temperature,
        });
        console.log(
          "5. Full GPT Payload:",
          JSON.stringify(responsePayload, null, 2),
        );
        console.log("6. WebSocket State:", webSocketClient?.ws?.readyState);
        console.log("================================================");

        webSocketClient.sendMessage(responsePayload);
        resolve(true);
      } catch (error) {
        console.error("[MainTranscription] Error generating SOAP note:", error);
        reject(error);
      }
    });
  };

  const handleConnect = async () => {
    console.log("[MainTranscription] Initiating connection");
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("API key is required");
      }
      const client = new WebSocketClient(
        apiKey,
        prompt,
        handleWebSocketMessage,
        { patient_id: parseInt(patientId), id: parseInt(patientId) },
      );
      await client.init();
      setWebSocketClient(client);

      try {
        const response = await fetch(`/api/patients/${patientId}/chart`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient chart");
        }
        const chartData = await response.json();

        if (client?.ws && client.ws.readyState === WebSocket.OPEN) {
          console.log(
            "[MainTranscription] Patient chart loaded, WebSocket ready",
          );
        } else {
          console.error(
            "[MainTranscription] WebSocket not open, unable to send initial context.",
          );
        }
      } catch (error) {
        console.error(
          "[MainTranscription] Failed to fetch patient chart:",
          error,
        );
      }
    } catch (error) {
      console.error("[MainTranscription] Connection error:", error);
      toast({
        variant: "destructive",
        description: "Failed to connect to WebSocket server",
      });
    }
  };

  useEffect(() => {
    handleConnect();
    return () => {
      if (webSocketClient) {
        webSocketClient.resetPatientChartCache();
        webSocketClient.close();
        setWebSocketClient(null);
      }
    };
  }, []);

  const handleStopRecording = async () => {
    handleRecordingTriger();
    // Freeze AI insights when recording stops - BOTH in local state and in the module
    setAreInsightsFrozen(true);
    console.log("[MainTranscription] Freezing AI insights");

    // CRITICAL: Freeze insights in the suggestionsModule to actually stop updates
    if (webSocketClient?.eventHandler?.suggestionsModule) {
      webSocketClient.eventHandler.suggestionsModule.freezeInsights();
      console.log(
        "[MainTranscription] Called freezeInsights() on suggestionsModule",
      );
    } else {
      console.warn(
        "[MainTranscription] Could not freeze insights - suggestionsModule not available",
      );
    }

    if (
      !webSocketClient?.ws ||
      webSocketClient.ws.readyState !== WebSocket.OPEN
    ) {
      console.log(
        "WebSocket not connected. Please wait for the connection to be established.",
      );
      return;
    }
    if (webSocketClient && transcription) {
      try {
        // Generate the SOAP note
        await generateSOAPNote();

        // Then process for CPT codes immediately after SOAP note is generated
        // This ensures CPT codes are available right after recording stops
        if (soapNote && patientId && encounterId) {
          console.log("[MainTranscription] Processing SOAP note for CPT codes");

          // Emit a recording-completed event with the SOAP note
          // This will be caught by DiagnosisCPTMapper and processed automatically
          eventBus.emit("recording-completed", {
            soapNote: soapNote,
            patientId: Number(patientId),
            encounterId: Number(encounterId),
          });

          // Also process directly via the module for redundancy
          if (webSocketClient?.eventHandler?.diagnosisCPTMapper) {
            const diagnosisCPTMapper =
              webSocketClient.eventHandler.diagnosisCPTMapper;

            // Set the current patient and encounter
            diagnosisCPTMapper.setPatientId(Number(patientId));
            diagnosisCPTMapper.setEncounterId(Number(encounterId));

            // Process the SOAP note to extract diagnoses and CPT codes
            await diagnosisCPTMapper.processSoapNote(soapNote);
            console.log(
              "[MainTranscription] Successfully processed SOAP note for CPT codes",
            );
          } else {
            console.warn(
              "[MainTranscription] DiagnosisCPTMapper module not available",
            );
          }
        } else {
          console.warn(
            "[MainTranscription] Cannot process CPT codes - missing SOAP note or patient/encounter ID",
          );
        }
      } catch (error) {
        console.error("Error processing SOAP note:", error);
      }
    }
  };

  const handleRecordingTriger = () => {
    setIsRecordingStarted(!isRecordingStarted);
  };

  const handleSave = async () => {
    try {
      // Set processing state and a longer message that's clear about what's happening
      setIsSavingNote(true);
      setSavingMessage(
        "Extracting medical data from note and updating patient chart. This may take a moment...",
      );

      // Display a persistent toast during processing to ensure visibility
      toast({
        title: "Processing SOAP Note",
        description: "Extracting medical data and updating patient chart...",
        duration: 10000, // Long duration to ensure visibility during processing
      });

      if (!editor || !editor.getHTML().trim()) {
        toast({
          variant: "destructive",
          description: "Cannot save empty note",
        });
        setIsSavingNote(false);
        setSavingMessage("");
        return;
      }

      const noteContent = editor.getHTML();
      console.log("[MainTranscription] Starting SOAP note save process");

      // CRITICAL DEBUG FOR METHOD A: Log note content details
      console.log(
        "[MainTranscription] CRITICAL DEBUG - Note content for save:",
        {
          contentLength: noteContent.length,
          isHTML: noteContent.includes("<"),
          firstChars: noteContent.substring(0, 50) + "...",
          isMethodA:
            !!externalEncounterData?.appointment_id ||
            !!externalEncounterData?.metadata?.fromAppointment,
          encounterId: encounterId || "new",
          hasExternalData: !!externalEncounterData,
        },
      );

      // Update parent component state if this is an encounter
      if (encounterId && onEncounterChange && externalEncounterData) {
        // Create enhanced update with forced encounter state to make sure it's always signed
        const updatedData = {
          ...externalEncounterData,
          note: noteContent,
          encounter_state: "signed", // Ensure it's marked as signed
          state: "signed", // Add both state formats to be safe
          // Add metadata to help server identify the source
          metadata: {
            ...(externalEncounterData.metadata || {}),
            saveTime: new Date().toISOString(),
            saveSource: "direct_user_save",
          },
        };

        console.log(
          "[MainTranscription] Updating parent component with note data and forcing encounter_state to 'signed'",
        );
        // Pass false as a second parameter to indicate this is a save operation
        // and shouldn't mark the encounter as modified
        try {
          // Check if the function accepts a second parameter
          if (onEncounterChange.length > 1) {
            onEncounterChange(updatedData, false);
          } else {
            onEncounterChange(updatedData);
          }
        } catch (error) {
          // Fallback to the original approach
          onEncounterChange(updatedData);
        }

        // Also update originalEncounterData in parent component to prevent "unsaved changes" warning
        // This is crucial for Method A to work properly
        if (typeof setOriginalEncounterData === "function") {
          console.log(
            "[MainTranscription] Pre-emptively updating originalEncounterData to match current state",
          );
          // Clone to ensure deep copy
          setOriginalEncounterData(JSON.parse(JSON.stringify(updatedData)));
        }
      }

      const isNewEncounter = !encounterId || encounterId === "new";

      // Keep the saving message visible until the mutation completes
      // Do not clear it here, let the mutation's onSuccess/onError handle that

      // We won't use finally block to clear the status since we want the chart update
      // message to persist while the backend processes the SOAP note

      // Save the note - this will trigger onSuccess or onError which will clear status
      console.log("[MainTranscription] Submitting note to saveMutation");
      await saveMutation.mutateAsync(noteContent);

      // Only clear for new encounters - handled in onSuccess instead
      // if (isNewEncounter) {
      //   setSoapNote("");
      // }

      console.log("[MainTranscription] SOAP note save completed successfully");
    } catch (error) {
      console.error("[MainTranscription] Failed to save SOAP note:", error);
      toast({
        variant: "destructive",
        description: "Failed to save note. Please try again.",
      });

      // Only clear status message on error
      setIsSavingNote(false);
      setSavingMessage("");
    }
    // We don't use finally here because we want the "updating chart" message
    // to persist until the mutation's onSuccess handler completes
  };

  return (
    <div className="w-full h-full">
      <div className="flex flex-col h-full">
        <LoadingProgress isLoading={isSavingNote} message={savingMessage} />
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            p<h1 className="text-2xl font-bold">Notes</h1>
            <TokenUsage
              isRecordingStarted={isRecordingStarted}
              patientId={patientId}
            />
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent"
              onClick={() => {
                const panels = document.querySelectorAll("[data-panel]");
                const firstPanel = panels[0] as HTMLElement;
                const isExpanded =
                  firstPanel?.getAttribute("data-expanded") === "true";

                panels.forEach((panel) => {
                  const resizablePanel = panel.closest(
                    "[data-radix-resizable-panel]",
                  );
                  if (resizablePanel) {
                    if (isExpanded) {
                      (resizablePanel as HTMLElement).style.flexGrow = "0";
                      panel.setAttribute("data-expanded", "false");
                    } else {
                      (resizablePanel as HTMLElement).style.flexGrow = "1";
                      panel.setAttribute("data-expanded", "true");
                    }
                  }
                });
              }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <AudioRecorder
          client={webSocketClient}
          onStopRecording={handleStopRecording}
          onStartRecording={() => {
            // Unfreeze insights both in local state and module
            setAreInsightsFrozen(false);
            // CRITICAL: Unfreeze insights in the suggestionsModule to allow updates again
            if (webSocketClient?.eventHandler?.suggestionsModule) {
              webSocketClient.eventHandler.suggestionsModule.unfreezeInsights();
              console.log(
                "[MainTranscription] Called unfreezeInsights() on suggestionsModule",
              );
            }
          }}
          patientId={patientId}
          handleRecordingTriger={handleRecordingTriger}
        />
        <ResizablePanelGroup
          direction="vertical"
          className="flex-1 rounded-lg border"
        >
          <ResizablePanel defaultSize={60} minSize={10}>
            <Card className="h-full border-0">
              <CardHeader className="pb-3 border-b bg-gray-50 sticky top-0 z-10">
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Real-Time Transcription
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-4rem)]">
                <ScrollArea
                  className="h-full w-full overflow-y-auto"
                  ref={transcriptionScroll.scrollRef}
                >
                  <div className="text-sm leading-snug text-gray-700">
                    {transcription.split("\n").map(
                      (line, index) =>
                        line.trim() && (
                          <div
                            key={index}
                            className="flex items-start space-x-2 mb-1"
                          >
                            <span className="mt-0.5">•</span>
                            <span className="flex-1">{line}</span>
                          </div>
                        ),
                    ) || "Transcription will appear here..."}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80} minSize={10} data-panel>
            <Card className="h-full border-0">
              <CardHeader className="pb-3 border-b bg-gray-50 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    GPT Suggestions
                  </CardTitle>
                  {areInsightsFrozen && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <PauseCircle size={14} />
                      <span>Paused</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-4rem)]">
                <ScrollArea
                  className="h-full w-full overflow-y-auto"
                  ref={gptAnalysisScroll.scrollRef}
                >
                  <div className="text-sm leading-snug text-gray-700">
                    {gptAnalysis
                      ? gptAnalysis
                          .split(/\n/)
                          .filter((line) => line.trim())
                          .map((line, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2 mb-1"
                            >
                              <span className="flex-1">{line.trim()}</span>
                            </div>
                          ))
                      : "GPT analysis will appear here..."}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={120} minSize={15}>
            <Card className="h-full border-0 bg-white">
              <CardHeader className="pb-3 border-b bg-gray-50 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold text-gray-800 -mt-1">
                    SOAP Note
                  </CardTitle>
                  <div className="flex gap-2">
                    {soapNote && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `/api/soap/print/${patientId}`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ soapNote }),
                              },
                            );
                            const { fileName } = await response.json();
                            window.open(`/soap_notes/${fileName}`, "_blank");
                          } catch (error) {
                            console.error("Error printing SOAP note:", error);
                          }
                        }}
                      >
                        Print
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                      onClick={async () => {
                        try {
                          // Get current SOAP note content
                          const currentContent =
                            editor?.getHTML() || soapNote || "";
                          if (!currentContent || currentContent.length < 10) {
                            toast({
                              variant: "destructive",
                              description:
                                "Please add some content to your SOAP note first",
                            });
                            return;
                          }

                          toast({
                            description:
                              "Generating smart suggestions with patient memory...",
                            duration: 3000,
                          });

                          // Call the Assistant API for smart SOAP note suggestions
                          const response = await fetch(
                            `/api/assistant/soap-note`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                patientId: parseInt(patientId),
                                transcription:
                                  transcription || "No transcription available",
                                currentNote: currentContent,
                                encounterId: encounterId || "new",
                              }),
                            },
                          );

                          if (!response.ok) {
                            throw new Error(
                              `Failed to generate suggestions: ${response.status}`,
                            );
                          }

                          const result = await response.json();

                          // Update the editor with the improved SOAP note
                          if (result.soapNote && editor) {
                            isUpdatingProgrammatically.current = true;
                            editor.commands.setContent(result.soapNote);
                            setSoapNote(result.soapNote);

                            setTimeout(() => {
                              isUpdatingProgrammatically.current = false;
                            }, 100);

                            toast({
                              description:
                                "SOAP note enhanced with patient memory insights!",
                              variant: "default",
                            });
                          }
                        } catch (error) {
                          console.error(
                            "Error generating smart suggestions:",
                            error,
                          );
                          toast({
                            variant: "destructive",
                            description:
                              "Failed to generate smart suggestions. Please try again.",
                          });
                        }
                      }}
                    >
                      🧠 Smart Suggestions
                    </Button>
                    <Button onClick={handleSave}>Sign & Save</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-full overflow-y-auto">
                <div className="w-full h-full min-h-[500px] pb-8 font-sans text-base leading-relaxed whitespace-pre-wrap">
                  <div className="w-full h-full min-h-[500px] border-none">
                    {/* Show editor content when available, even while technically loading */}
                    {editor && soapNote && soapNote.length > 0 ? (
                      <EditorContent
                        editor={editor}
                        className="soap-note prose max-w-none p-4"
                      />
                    ) : isLoadingNote ? (
                      <div className="flex flex-col items-center justify-center h-full w-full p-4">
                        <div className="text-center space-y-3">
                          <LoadingProgress isLoading={true} />
                          <p className="text-muted-foreground">
                            Loading existing note content...
                          </p>
                          {encounterId && encounterId !== "new" && (
                            <p className="text-xs text-muted-foreground">
                              Loading encounter ID: {encounterId}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : editor ? (
                      <EditorContent
                        editor={editor}
                        className="soap-note prose max-w-none p-4"
                      />
                    ) : (
                      <div className="p-4">
                        <p className="text-muted-foreground">
                          Editor is loading...
                        </p>
                        {/* Fallback rendering of note content if editor fails to initialize */}
                        {soapNote && (
                          <div
                            className="mt-4 p-4 border rounded soap-note prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: soapNote }}
                          />
                        )}
                      </div>
                    )}

                    {/* Debug info section - will only appear in development */}
                    {process.env.NODE_ENV !== "production" && (
                      <div className="mt-2 p-2 text-xs text-gray-500 border-t">
                        <details>
                          <summary>Debug Info</summary>
                          <p>Note content length: {soapNote?.length || 0}</p>
                          <p>Editor initialized: {editor ? "Yes" : "No"}</p>
                          <p>
                            Editor HTML length: {editor?.getHTML()?.length || 0}
                          </p>
                          <p>
                            Loading state:{" "}
                            {isLoadingNote ? "Loading" : "Complete"}
                          </p>
                          <p>Encounter ID: {encounterId || "None"}</p>
                          <p>
                            API endpoint:{" "}
                            {`/api/patients/${patientId}/office-visits/${encounterId}`}
                          </p>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80} minSize={10} data-panel>
            <div className="flex h-full flex-col">
              <DraftOrders
                patientId={parseInt(patientId)}
                isRecordingStarted={isRecordingStarted}
                draftOrdersModule={
                  webSocketClient?.eventHandler?.draftOrdersModule || null
                }
              />
              {/* CPT codes component for billing codes */}
              <CPTCodes
                patientId={parseInt(patientId)}
                encounterId={encounterId ? parseInt(encounterId) : undefined}
                isRecordingStarted={isRecordingStarted}
                cptCodesModule={
                  webSocketClient?.eventHandler?.cptCodesModule || null
                }
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
