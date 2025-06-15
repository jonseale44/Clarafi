import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RealtimeNursingIntegrationProps {
  patientId: string;
  encounterId: string;
  transcription: string;
  onNursingAssessmentUpdate: (assessment: string) => void;
  onNursingAssessmentComplete: (assessment: string) => void;
  onDraftOrdersReceived: (orders: any[]) => void;
  onNursingInterventionsReceived?: (interventions: any) => void;
  isRealtimeEnabled: boolean;
  autoTrigger?: boolean;
}

export interface RealtimeNursingRef {
  generateNursingAssessment: () => void;
}

export const RealtimeNursingIntegration = forwardRef<RealtimeNursingRef, RealtimeNursingIntegrationProps>(({
  patientId,
  encounterId,
  transcription,
  onNursingAssessmentUpdate,
  onNursingAssessmentComplete,
  onDraftOrdersReceived,
  onNursingInterventionsReceived,
  isRealtimeEnabled,
  autoTrigger = false
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessmentBuffer, setAssessmentBuffer] = useState("");
  const { toast } = useToast();

  // Generate nursing assessment using Real-time API for streaming delivery
  const generateNursingAssessment = async () => {
    if (!transcription?.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcription",
        description: "Please record some audio first before generating a nursing assessment.",
      });
      return;
    }

    console.log("🩺 [RealtimeNursing] Starting Real-time nursing assessment generation");
    setIsGenerating(true);
    setAssessmentBuffer("");
    
    toast({
      title: "Generating Nursing Assessment",
      description: "Creating your nursing documentation...",
    });
    
    try {
      // Send complete transcription to Real-time API for streaming nursing assessment generation
      const response = await fetch('/api/realtime-nursing/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          transcription: transcription.trim(),
          action: 'generate_nursing_assessment'
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

      let accumulatedAssessment = "";
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
                // Batch delivery - complete nursing assessment arrives all at once
                const completeAssessment = data.text || "";
                setAssessmentBuffer(completeAssessment);
                console.log("📝 [RealtimeNursing] About to call onNursingAssessmentUpdate with assessment length:", completeAssessment.length);
                onNursingAssessmentUpdate(completeAssessment);
                
                console.log("🎯 [RealtimeNursing] About to call onNursingAssessmentComplete");
                console.log("🎯 [RealtimeNursing] Patient ID:", patientId, "Encounter ID:", encounterId);
                console.log("🎯 [RealtimeNursing] Assessment preview:", completeAssessment.substring(0, 200));
                onNursingAssessmentComplete(completeAssessment);
                
                console.log("✅ [RealtimeNursing] Nursing assessment generation completed");
                
                toast({
                  title: "Nursing Assessment Generated",
                  description: "Nursing documentation completed successfully",
                });
              } else if (data.type === 'draft_orders') {
                console.log("📋 [RealtimeNursing] Received draft orders:", data.orders?.length || 0);
                onDraftOrdersReceived(data.orders || []);
              } else if (data.type === 'nursing_interventions') {
                console.log("🏥 [RealtimeNursing] Received nursing interventions:", data);
                onNursingInterventionsReceived?.(data);
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
      console.error("❌ [RealtimeNursing] Error generating nursing assessment:", error);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate nursing assessment. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    generateNursingAssessment,
  }));

  // Auto-trigger when transcription updates and auto mode is enabled
  useEffect(() => {
    if (autoTrigger && transcription?.trim() && isRealtimeEnabled && !isGenerating) {
      // Small delay to allow transcription to settle
      const timeoutId = setTimeout(() => {
        generateNursingAssessment();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcription, autoTrigger, isRealtimeEnabled, isGenerating]);

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={generateNursingAssessment}
        disabled={isGenerating || !transcription?.trim()}
        variant="outline"
        size="sm"
        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-2"></div>
            Generating...
          </>
        ) : (
          "Generate Assessment"
        )}
      </Button>
      
      {isRealtimeEnabled && (
        <div className="text-xs text-green-600 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
          Real-time enabled
        </div>
      )}
    </div>
  );
});

RealtimeNursingIntegration.displayName = "RealtimeNursingIntegration";