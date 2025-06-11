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
}

export interface RealtimeSOAPRef {
  generateSOAPNote: () => void;
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
  autoTrigger = false
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [soapBuffer, setSoapBuffer] = useState("");
  const { toast } = useToast();

  // Generate SOAP note using Real-time API for streaming delivery
  const generateSOAPNote = async () => {
    if (!transcription?.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "Please record some audio first before generating a SOAP note.",
      });
      return;
    }

    console.log("🩺 [RealtimeSOAP] Starting Real-time SOAP generation AFTER recording stop");
    setIsGenerating(true);
    setSoapBuffer("");
    
    toast({
      title: "Generating SOAP Note",
      description: "Creating your clinical documentation...",
    });
    
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
                console.log("📝 [RealtimeSOAP] About to call onSOAPNoteUpdate with note length:", completeSoap.length);
                onSOAPNoteUpdate(completeSoap);
                
                console.log("🎯 [RealtimeSOAP] About to call onSOAPNoteComplete - THIS SHOULD TRIGGER MEDICAL PROBLEMS");
                console.log("🎯 [RealtimeSOAP] Patient ID:", patientId, "Encounter ID:", encounterId);
                console.log("🎯 [RealtimeSOAP] SOAP note preview:", completeSoap.substring(0, 200));
                onSOAPNoteComplete(completeSoap);
                
                console.log("✅ [RealtimeSOAP] SOAP note generation completed - onSOAPNoteComplete called");
                
                toast({
                  title: "SOAP Note Generated",
                  description: "Clinical documentation completed successfully",
                });
              } else if (data.type === 'draft_orders') {
                console.log("📋 [RealtimeSOAP] Received draft orders:", data.orders?.length || 0);
                onDraftOrdersReceived(data.orders || []);
              } else if (data.type === 'cpt_codes') {
                console.log("🏥 [RealtimeSOAP] Received CPT codes:", data);
                onCPTCodesReceived?.(data);
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

  // Auto-trigger SOAP generation if enabled and transcription changes
  useEffect(() => {
    if (autoTrigger && transcription?.trim() && !isGenerating) {
      console.log("🔄 [RealtimeSOAP] Auto-triggering SOAP generation");
      generateSOAPNote();
    }
  }, [transcription, autoTrigger]);

  // Real-time SOAP works seamlessly in background - no UI needed
  return null;
});

RealtimeSOAPIntegration.displayName = "RealtimeSOAPIntegration";