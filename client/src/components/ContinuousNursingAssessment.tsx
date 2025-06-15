import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Activity, Clock } from "lucide-react";

interface ContinuousNursingAssessmentProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onAssessmentUpdate: (assessment: string) => void;
  onAssessmentComplete: (assessment: string) => void;
  autoStart?: boolean;
}

export interface ContinuousNursingRef {
  startContinuousAssessment: () => void;
  stopContinuousAssessment: () => void;
  getCurrentAssessment: () => string;
}

export const ContinuousNursingAssessment = forwardRef<ContinuousNursingRef, ContinuousNursingAssessmentProps>(({
  patientId,
  encounterId,
  isRecording,
  transcription,
  onAssessmentUpdate,
  onAssessmentComplete,
  autoStart = false
}, ref) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [sessionId] = useState(`nursing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTranscriptionRef = useRef("");
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startContinuousAssessment,
    stopContinuousAssessment,
    getCurrentAssessment: () => currentAssessment,
  }));

  // Auto-start when recording begins
  useEffect(() => {
    if (autoStart && isRecording && !isActive) {
      startContinuousAssessment();
    } else if (!isRecording && isActive) {
      stopContinuousAssessment();
    }
  }, [isRecording, autoStart]);

  // Update transcription when it changes
  useEffect(() => {
    if (isActive && transcription !== lastTranscriptionRef.current && transcription.trim()) {
      updateTranscription(transcription);
      lastTranscriptionRef.current = transcription;
    }
  }, [transcription, isActive]);

  const startContinuousAssessment = async () => {
    if (isActive) return;

    console.log(`🔄 [ContinuousNursing] Starting continuous assessment for session ${sessionId}`);
    
    try {
      // Use fetch with streaming for the continuous assessment
      const response = await fetch('/api/realtime-nursing/continuous/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create a reader for the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      setIsActive(true);
      setIsConnected(true);
      setCurrentAssessment("");

      toast({
        title: "Continuous Assessment Started",
        description: "Nursing assessment will update in real-time during conversation",
      });

      // Process the streaming response
      const decoder = new TextDecoder();
      let buffer = "";

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleStreamMessage(data);
                } catch (e) {
                  console.warn("Could not parse streaming data:", line);
                }
              }
            }
          }
        } catch (error) {
          console.error("❌ [ContinuousNursing] Stream processing error:", error);
          setIsConnected(false);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Lost connection to continuous assessment service",
          });
        }
      };

      processStream();

    } catch (error) {
      console.error("❌ [ContinuousNursing] Error starting continuous assessment:", error);
      setIsActive(false);
      setIsConnected(false);
      
      toast({
        variant: "destructive",
        title: "Assessment Failed",
        description: "Failed to start continuous nursing assessment",
      });
    }
  };

  const stopContinuousAssessment = async () => {
    if (!isActive) return;

    console.log(`🛑 [ContinuousNursing] Stopping continuous assessment for session ${sessionId}`);

    try {
      // Stop the continuous assessment
      await fetch('/api/realtime-nursing/continuous/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      // Cleanup
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }

      setIsActive(false);
      setIsConnected(false);

      // Send final assessment
      if (currentAssessment.trim()) {
        onAssessmentComplete(currentAssessment);
      }

      toast({
        title: "Assessment Completed",
        description: "Continuous nursing assessment has been finalized",
      });

    } catch (error) {
      console.error("❌ [ContinuousNursing] Error stopping assessment:", error);
    }
  };

  const updateTranscription = async (newTranscription: string) => {
    if (!isActive || !newTranscription.trim()) return;

    try {
      await fetch('/api/realtime-nursing/continuous/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          transcription: newTranscription,
        }),
      });
    } catch (error) {
      console.error("❌ [ContinuousNursing] Error updating transcription:", error);
    }
  };

  const handleStreamMessage = (data: any) => {
    switch (data.type) {
      case 'connection_established':
        setIsConnected(true);
        console.log(`✅ [ContinuousNursing] Connection established: ${data.message}`);
        break;

      case 'assessment_chunk':
        // Stream individual chunks for real-time display
        setCurrentAssessment(prev => prev + data.content);
        onAssessmentUpdate(currentAssessment + data.content);
        setLastUpdateTime(new Date());
        break;

      case 'assessment_update_complete':
        // Full assessment update
        setCurrentAssessment(data.fullAssessment);
        onAssessmentUpdate(data.fullAssessment);
        setLastUpdateTime(new Date());
        console.log(`📝 [ContinuousNursing] Assessment updated at ${data.timestamp}`);
        break;

      case 'final_assessment':
        setCurrentAssessment(data.assessment);
        onAssessmentComplete(data.assessment);
        console.log(`🏁 [ContinuousNursing] Final assessment received`);
        break;

      case 'error':
        console.error(`❌ [ContinuousNursing] Stream error: ${data.message}`);
        toast({
          variant: "destructive",
          title: "Assessment Error",
          description: data.message,
        });
        break;

      default:
        console.log(`📊 [ContinuousNursing] Unknown message type: ${data.type}`);
    }
  };

  return (
    <Card className="p-4 border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Continuous Nursing Assessment</h3>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Live
            </Badge>
          )}
          <Button
            onClick={isActive ? stopContinuousAssessment : startContinuousAssessment}
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
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Status: {isActive ? (isConnected ? "Active" : "Connecting...") : "Inactive"}</span>
          {lastUpdateTime && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Last update: {lastUpdateTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {isActive && (
          <div className="text-xs text-blue-600 p-2 bg-blue-100 rounded">
            Assessment is updating automatically as the conversation progresses. 
            The nursing documentation will be refined in real-time based on patient interactions.
          </div>
        )}

        {currentAssessment && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Current Assessment:</div>
            <div className="text-xs text-gray-600 p-2 bg-white rounded border max-h-32 overflow-y-auto">
              {currentAssessment.substring(0, 200)}
              {currentAssessment.length > 200 && "..."}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

ContinuousNursingAssessment.displayName = "ContinuousNursingAssessment";