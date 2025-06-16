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
    if (!transcription?.trim()) {
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
      
      // Skip if rate limited, duplicate, or minimal change
      if (!shouldTriggerUpdate(lastSOAPContent, soapBuffer)) {
        setLastTranscriptionHash(transcriptionHash);
        return;
      }
      
      console.log("🔍 [IntelligentStreaming] Triggering update - change detected");
      setLastTranscriptionHash(transcriptionHash);
      setLastGenerationTime(Date.now());
    }

    console.log("🩺 [RealtimeSOAP] Starting Real-time SOAP generation");
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

      // Stream the response for character-by-character "typing" effect
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let accumulatedSoap = "";
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Parse streaming chunks from Real-time API
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'response.text.done') {
                // Batch delivery - complete SOAP note arrives all at once (faster)
                const completeSoap = data.text || "";
                setSoapBuffer(completeSoap);
                
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
                  console.log("📝 [IntelligentStreaming] No meaningful change - skipping UI update");
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
              } else if (data.type === 'draft_orders') {
                console.log("📋 [RealtimeSOAP] Received draft orders:", data.orders?.length || 0);
                onDraftOrdersReceived(data.orders || []);
              } else if (data.type === 'cpt_codes') {
                console.log("🏥 [RealtimeSOAP] Received CPT codes:", data);
                onCPTCodesReceived?.(data);
                
                // TRIGGER MEDICAL PROBLEMS PROCESSING HERE
                // CPT codes are the final event in the stream, so SOAP note should be complete
                console.log("🎯 [RealtimeSOAP] CPT codes received - triggering medical problems processing");
                console.log("🎯 [RealtimeSOAP] Current SOAP buffer length:", soapBuffer.length);
                if (soapBuffer && soapBuffer.trim().length > 100) {
                  console.log("🎯 [RealtimeSOAP] Calling onSOAPNoteComplete with current SOAP buffer");
                  onSOAPNoteComplete(soapBuffer);
                } else {
                  console.warn("🎯 [RealtimeSOAP] SOAP buffer too short to trigger medical problems processing");
                }
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.warn("Could not parse streaming data:", line);
            }
          }
        }
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
    if (!enableIntelligentStreaming) {
      // Traditional auto-trigger behavior
      if (autoTrigger && transcription?.trim() && !isGenerating) {
        console.log("🔄 [RealtimeSOAP] Auto-triggering SOAP generation");
        generateSOAPNote();
      }
      return;
    }

    // Clear existing timeouts
    if (pauseDetectionTimeoutRef.current) {
      clearTimeout(pauseDetectionTimeoutRef.current);
    }
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }

    if (!transcription?.trim() || isGenerating) {
      return;
    }

    // Immediate trigger on medical keywords
    const recentTranscription = transcription.slice(-100); // Last 100 characters
    if (detectMedicalKeywords(recentTranscription)) {
      console.log("🔍 [IntelligentStreaming] Medical keywords detected - immediate trigger");
      generateSOAPNote();
      return;
    }

    // Content-based batching (50+ new words)
    const wordCount = transcription.split(/\s+/).length;
    const lastWordCount = lastTranscriptionHash ? parseInt(lastTranscriptionHash.split('_')[1] || '0') : 0;
    
    if (wordCount - lastWordCount >= 50) {
      console.log("🔍 [IntelligentStreaming] Content threshold reached - triggering generation");
      generateSOAPNote();
      return;
    }

    // Set pause detection timer (2-3 seconds of silence)
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