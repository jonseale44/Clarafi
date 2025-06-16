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
  enableIntelligentStreaming = false
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
      // Send complete transcription to Real-time API for streaming SOAP generation
      const response = await fetch('/api/realtime-soap/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          transcription: transcription.trim(), // Complete transcript from entire recording
          action: 'generate_soap_note'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle JSON response instead of streaming
      const responseData = await response.json();
      console.log("🔍 [RealtimeSOAP] Received JSON response:", responseData);
      console.log("🔍 [RealtimeSOAP] Response has soapNote:", !!responseData.soapNote);
      console.log("🔍 [RealtimeSOAP] Callback functions available:", {
        onSOAPNoteUpdate: !!onSOAPNoteUpdate,
        onSOAPNoteComplete: !!onSOAPNoteComplete
      });
      
      if (responseData.soapNote) {
        const completeSoap = responseData.soapNote;
        setSoapBuffer(completeSoap);
        
        console.log("📝 [RealtimeSOAP] Processing SOAP note from JSON response");
        console.log("📝 [RealtimeSOAP] SOAP note length:", completeSoap.length);
        
        // Apply intelligent change detection for UI updates
        if (enableIntelligentStreaming && shouldTriggerUpdate(lastSOAPContent, completeSoap)) {
          console.log("📝 [IntelligentStreaming] Meaningful change detected - updating UI");
          setLastSOAPContent(completeSoap);
          onSOAPNoteUpdate(completeSoap);
        } else if (!enableIntelligentStreaming) {
          // Traditional behavior - always update
          console.log("📝 [RealtimeSOAP] Traditional update - no change detection");
          onSOAPNoteUpdate(completeSoap);
        } else {
          console.log("📝 [IntelligentStreaming] No meaningful change - but updating UI anyway for automatic generation");
          // For automatic generation, always update UI even if minimal change
          onSOAPNoteUpdate(completeSoap);
        }
        
        console.log("🎯 [RealtimeSOAP] About to call onSOAPNoteComplete - THIS SHOULD TRIGGER MEDICAL PROBLEMS");
        console.log("🎯 [RealtimeSOAP] Patient ID:", patientId, "Encounter ID:", encounterId);
        console.log("🎯 [RealtimeSOAP] SOAP note preview:", completeSoap.substring(0, 200));
        onSOAPNoteComplete(completeSoap);
        
        console.log("✅ [RealtimeSOAP] SOAP note generation completed - onSOAPNoteComplete called");
        
        // Only show success toast for manual generation or significant changes
        if (forceGeneration || (!enableIntelligentStreaming)) {
          toast({
            title: "SOAP Note Generated",
            description: "Clinical documentation completed successfully",
          });
        }
      } else {
        throw new Error("No SOAP note received in response");
      }
      
    } catch (error) {
      console.error("❌ [RealtimeSOAP] Error generating SOAP note:", error);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate SOAP note. Please try again.",
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
      // Traditional auto-trigger behavior
      if (autoTrigger && transcription?.trim() && !isGenerating) {
        console.log("🔄 [RealtimeSOAP] Auto-triggering SOAP generation (traditional mode)");
        generateSOAPNote();
      } else {
        console.log("🔍 [IntelligentStreaming] Traditional auto-trigger conditions not met:", {
          autoTrigger,
          hasTranscription: !!transcription?.trim(),
          isGenerating
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

    if (!transcription?.trim() || isGenerating) {
      console.log("🔍 [IntelligentStreaming] Skipping - no transcription or already generating:", {
        hasTranscription: !!transcription?.trim(),
        isGenerating
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