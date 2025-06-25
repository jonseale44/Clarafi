import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RealtimeSOAPIntegrationProps {
  patientId: string;
  encounterId: string;
  transcription: string;
  onSOAPNoteUpdate: (note: string) => void;
  onSOAPNoteComplete: (note: string) => void;
  onDraftOrdersReceived: (orders: any[]) => void;
  onCPTCodesReceived?: (cptData: any) => void;
  isRealtimeEnabled: boolean;
  autoTrigger?: boolean;
  enableIntelligentStreaming?: boolean;
  isRecording?: boolean;
  noteType?: string; // New prop for note type selection
  selectedTemplate?: any; // New prop for custom template selection
}

export interface RealtimeSOAPRef {
  generateSOAPNote: (forceGeneration?: boolean) => void;
}

export const RealtimeSOAPIntegration = forwardRef<RealtimeSOAPRef, RealtimeSOAPIntegrationProps>(({
  patientId,
  encounterId,
  transcription,
  onSOAPNoteUpdate,
  onSOAPNoteComplete,
  onDraftOrdersReceived,
  onCPTCodesReceived,
  isRealtimeEnabled,
  autoTrigger = false,
  enableIntelligentStreaming = false,
  isRecording = false,
  noteType = 'soap', // Default to SOAP note
  selectedTemplate
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [soapBuffer, setSoapBuffer] = useState("");
  const [lastSOAPContent, setLastSOAPContent] = useState("");
  const [lastTranscriptionHash, setLastTranscriptionHash] = useState("");
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const { toast } = useToast();
  
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Frontend change detection utilities
  const generateSimpleHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const hasStructuralChanges = (oldContent: string, newContent: string): boolean => {
    // Check for formatting differences that don't need medical review
    const oldHTML = oldContent.replace(/<[^>]*>/g, '').trim();
    const newHTML = newContent.replace(/<[^>]*>/g, '').trim();
    return oldHTML !== newHTML;
  };

  const shouldTriggerUpdate = (oldSOAP: string, newSOAP: string): boolean => {
    if (!oldSOAP && newSOAP) return true; // First generation
    if (!newSOAP) return false; // No new content
    
    // Length threshold check (5% minimum change)
    const lengthDifference = Math.abs(oldSOAP.length - newSOAP.length) / Math.max(oldSOAP.length, 1);
    if (lengthDifference < 0.05 && !hasStructuralChanges(oldSOAP, newSOAP)) {
      console.log("🔍 [IntelligentStreaming] Skipping update - minimal change detected");
      return false;
    }

    // Rate limiting check (max 1 per 5 seconds)
    const now = Date.now();
    if (now - lastGenerationTime < 5000) {
      console.log("🔍 [IntelligentStreaming] Skipping update - rate limited");
      return false;
    }

    // Duplicate content check
    const newHash = generateSimpleHash(newSOAP);
    if (newHash === lastTranscriptionHash) {
      console.log("🔍 [IntelligentStreaming] Skipping update - duplicate content");
      return false;
    }

    return true;
  };

  const detectMedicalKeywords = (text: string): boolean => {
    const medicalKeywords = /\b(pain|symptoms?|medication|treatment|diagnosis|chest|headache|fever|nausea|dizzy|shortness of breath|allergic|prescription|blood pressure|heart rate|exam|vital|lab|test|drug|pill|tablet|injection|therapy|surgery|procedure|complaint|history)\b/i;
    return medicalKeywords.test(text);
  };

  // Generate SOAP note using Real-time API for streaming delivery
  const generateSOAPNote = async (forceGeneration = false) => {
    console.log("🩺 [RealtimeSOAP] generateSOAPNote called with:", {
      forceGeneration,
      transcriptionLength: transcription?.length || 0,
      transcriptionPreview: transcription?.substring(0, 100) || 'empty'
    });

    if (!transcription?.trim()) {
      console.log("🩺 [RealtimeSOAP] No transcription available - showing toast");
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "Please record some audio first before generating a SOAP note.",
      });
      return;
    }

    // Skip if already generating (unless forced)
    if (isGenerating && !forceGeneration) {
      console.log("🔍 [IntelligentStreaming] Skipping - already generating");
      return;
    }

    // Apply frontend change detection (unless forced by manual button)
    if (!forceGeneration && enableIntelligentStreaming) {
      const transcriptionHash = generateSimpleHash(transcription);
      
      // For automatic generation, be more lenient with change detection
      if (!shouldTriggerUpdate(lastSOAPContent, soapBuffer)) {
        console.log("🔍 [IntelligentStreaming] Skipping update - minimal change detected");
        console.log("🔍 [IntelligentStreaming] But continuing with generation for automatic trigger");
        // Don't return early for automatic generation - continue with generation
      } else {
        console.log("🔍 [IntelligentStreaming] Triggering update - change detected");
      }
      
      setLastTranscriptionHash(transcriptionHash);
      setLastGenerationTime(Date.now());
    }

    console.log("🩺 [RealtimeSOAP] Starting Real-time SOAP generation");
    console.log("🩺 [RealtimeSOAP] Force generation:", forceGeneration);
    console.log("🩺 [RealtimeSOAP] Enable intelligent streaming:", enableIntelligentStreaming);
    setIsGenerating(true);
    setSoapBuffer("");
    
    // Only show toast for manual generation or first automatic generation
    if (forceGeneration || !lastSOAPContent) {
      toast({
        title: "Generating SOAP Note",
        description: "Creating your clinical documentation...",
      });
    }
    
    try {
      console.log(`🚀 [RealtimeSOAP] Starting note generation:`, {
        noteType,
        patientId,
        encounterId,
        transcriptionLength: transcription.trim().length,
        selectedTemplate: selectedTemplate?.id,
        isBaseTemplate: selectedTemplate?.isBaseTemplate
      });

      // Send complete transcription to enhanced clinical notes API
      const requestBody: any = {
        noteType,
        patientId,
        encounterId,
        transcription: transcription.trim(), // Complete transcript from entire recording
      };

      // Add template ID if custom template is being used
      if (selectedTemplate && !selectedTemplate.isBaseTemplate) {
        requestBody.templateId = selectedTemplate.id;
        console.log(`📋 [RealtimeSOAP] Using custom template: ${selectedTemplate.id}`);
      } else {
        console.log(`📋 [RealtimeSOAP] Using base template for ${noteType}`);
      }

      console.log(`📤 [RealtimeSOAP] Sending request to /api/clinical-notes/generate`);
      const response = await fetch('/api/clinical-notes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 [RealtimeSOAP] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [RealtimeSOAP] HTTP Error:`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📥 [RealtimeSOAP] API Response data:`, {
        hasNote: !!data.note,
        noteLength: data.note?.length || 0,
        noteType: data.noteType,
        processingTime: data.processingTimeMs
      });
      
      if (data.note) {
        console.log(`📝 [RealtimeSOAP] Successfully generated ${noteType.toUpperCase()} note (${data.note.length} chars)`);
        onSOAPNoteComplete(data.note);
        
        if (forceGeneration) {
          toast({
            title: "Note Generated",
            description: `${noteType.toUpperCase()} note generated successfully`,
          });
        }
      } else {
        console.error(`❌ [RealtimeSOAP] No note in response:`, data);
        throw new Error('No note returned from API');
      }
      
    } catch (error: any) {
      console.error(`❌ [RealtimeSOAP] Error generating ${noteType.toUpperCase()} note:`, {
        error: error.message,
        stack: error.stack,
        requestDetails: {
          noteType,
          patientId,
          encounterId,
          transcriptionLength: transcription.trim().length
        }
      });
      toast({
        title: "Generation Failed",
        description: `Failed to generate ${noteType.toUpperCase()} note. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Expose generateSOAPNote method via ref
  useImperativeHandle(ref, () => ({
    generateSOAPNote
  }));

  // Intelligent streaming with conversation pause detection
  useEffect(() => {
    console.log("🔍 [IntelligentStreaming] useEffect triggered with:", {
      enableIntelligentStreaming,
      autoTrigger,
      transcriptionLength: transcription?.length || 0,
      isGenerating,
      transcriptionPreview: transcription?.substring(0, 100) || 'empty'
    });

    if (!enableIntelligentStreaming) {
      console.log("🔍 [IntelligentStreaming] Intelligent streaming disabled, using traditional auto-trigger");
      // Traditional auto-trigger behavior - but only when recording
      if (autoTrigger && transcription?.trim() && !isGenerating && isRecording) {
        console.log("🔄 [RealtimeSOAP] Auto-triggering SOAP generation (traditional mode)");
        generateSOAPNote();
      } else {
        console.log("🔍 [IntelligentStreaming] Traditional auto-trigger conditions not met:", {
          autoTrigger,
          hasTranscription: !!transcription?.trim(),
          isGenerating,
          isRecording
        });
      }
      return;
    }

    console.log("🔍 [IntelligentStreaming] Intelligent streaming enabled");

    // Clear existing timeouts
    if (pauseDetectionTimeoutRef.current) {
      console.log("🔍 [IntelligentStreaming] Clearing existing pause detection timeout");
      clearTimeout(pauseDetectionTimeoutRef.current);
    }
    if (streamingTimeoutRef.current) {
      console.log("🔍 [IntelligentStreaming] Clearing existing streaming timeout");
      clearTimeout(streamingTimeoutRef.current);
    }

    if (!transcription?.trim() || isGenerating || !isRecording) {
      console.log("🔍 [IntelligentStreaming] Skipping - no transcription, already generating, or not recording:", {
        hasTranscription: !!transcription?.trim(),
        isGenerating,
        isRecording
      });
      return;
    }

    // Immediate trigger on medical keywords
    const recentTranscription = transcription.slice(-100); // Last 100 characters
    console.log("🔍 [IntelligentStreaming] Checking recent transcription for medical keywords:", recentTranscription);
    
    if (detectMedicalKeywords(recentTranscription)) {
      console.log("🔍 [IntelligentStreaming] Medical keywords detected - immediate trigger");
      generateSOAPNote();
      return;
    } else {
      console.log("🔍 [IntelligentStreaming] No medical keywords detected in recent transcription");
    }

    // Content-based batching (50+ new words)
    const wordCount = transcription.split(/\s+/).length;
    const lastWordCount = lastTranscriptionHash ? parseInt(lastTranscriptionHash.split('_')[1] || '0') : 0;
    
    if (wordCount - lastWordCount >= 50) {
      console.log("🔍 [IntelligentStreaming] Content threshold reached - triggering generation");
      generateSOAPNote();
      return;
    } else {
      console.log("🔍 [IntelligentStreaming] Content threshold not reached:", {
        currentWordCount: wordCount,
        lastWordCount,
        difference: wordCount - lastWordCount,
        threshold: 50
      });
    }

    // Set pause detection timer (2-3 seconds of silence)
    console.log("🔍 [IntelligentStreaming] Setting pause detection timeout (2.5s)");
    pauseDetectionTimeoutRef.current = setTimeout(() => {
      console.log("🔍 [IntelligentStreaming] Conversation pause detected - triggering generation");
      generateSOAPNote();
    }, 2500);

    // Cleanup function
    return () => {
      if (pauseDetectionTimeoutRef.current) {
        clearTimeout(pauseDetectionTimeoutRef.current);
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [transcription, autoTrigger, enableIntelligentStreaming, isGenerating]);

  // Real-time SOAP works seamlessly in background - no UI needed
  return null;
});

RealtimeSOAPIntegration.displayName = "RealtimeSOAPIntegration";