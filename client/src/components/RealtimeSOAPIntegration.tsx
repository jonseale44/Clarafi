import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RealtimeSOAPIntegrationProps {
  patientId: string;
  encounterId: string;
  transcription: string;
  onSOAPNoteUpdate: (note: string) => void;
  onSOAPNoteComplete: (note: string) => void;
  onDraftOrdersReceived: (orders: any[]) => void;
  isRealtimeEnabled: boolean;
}

export const RealtimeSOAPIntegration: React.FC<RealtimeSOAPIntegrationProps> = ({
  patientId,
  encounterId,
  transcription,
  onSOAPNoteUpdate,
  onSOAPNoteComplete,
  onDraftOrdersReceived,
  isRealtimeEnabled
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [soapBuffer, setSoapBuffer] = useState("");
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to existing Real-time transcription WebSocket
  useEffect(() => {
    if (!isRealtimeEnabled) {
      console.log('🔌 [RealtimeSOAP] Real-time disabled, skipping connection');
      return;
    }

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime-transcription`;
      
      console.log('🔌 [RealtimeSOAP] Attempting to connect to:', wsUrl);
      console.log('🔌 [RealtimeSOAP] Protocol:', protocol);
      console.log('🔌 [RealtimeSOAP] Host:', window.location.host);
      
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('✅ [RealtimeSOAP] Connected to Real-time transcription service');
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        console.log('📨 [RealtimeSOAP] Received message:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [RealtimeSOAP] Parsed message:', message);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ [RealtimeSOAP] Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('🔌 [RealtimeSOAP] Connection closed. Code:', event.code, 'Reason:', event.reason);
        setWs(null);
        
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 [RealtimeSOAP] Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('❌ [RealtimeSOAP] WebSocket error:', error);
        console.error('❌ [RealtimeSOAP] Connection state:', websocket.readyState);
        setWs(null);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        console.log('🔌 [RealtimeSOAP] Cleaning up WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [isRealtimeEnabled]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'soap_delta':
        // Stream SOAP note content as it's generated
        setSoapBuffer(prev => {
          const updated = prev + message.delta;
          onSOAPNoteUpdate(updated);
          return updated;
        });
        break;

      case 'soap_completed':
        // SOAP note generation finished
        const finalNote = message.note;
        setSoapBuffer(finalNote);
        onSOAPNoteComplete(finalNote);
        setIsGenerating(false);
        
        toast({
          title: "SOAP Note Generated",
          description: "Clinical documentation completed using Real-time streaming",
        });
        break;

      case 'soap_error':
        console.error('SOAP generation error:', message.error);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: message.error || "Failed to generate SOAP note",
        });
        break;

      default:
        // Handle other message types if needed
        break;
    }
  };

  const generateRealtimeSOAP = async () => {
    if (!ws || !transcription) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Real-time connection not available or no transcription",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setSoapBuffer("");
      
      console.log('🔄 [RealtimeSOAP] Starting SOAP generation process...');

      // Fetch patient chart for context
      const response = await fetch(`/api/patients/${patientId}/chart`);
      const patientChart = await response.json();
      
      console.log('📊 [RealtimeSOAP] Patient chart fetched, sending SOAP request...');

      // Send SOAP generation request to the existing Real-time service
      ws.send(JSON.stringify({
        type: 'generate_soap',
        encounterId: encounterId,
        instructions: 'Use the existing SOAP note generation prompt from the system', // Preserve existing prompt
        patientChart: patientChart,
        transcription: transcription
      }));

      console.log('📤 [RealtimeSOAP] SOAP note generation requested via existing Real-time service');

    } catch (error) {
      console.error('❌ [RealtimeSOAP] Error generating SOAP note:', error);
      setIsGenerating(false);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate SOAP note. Please try again.",
      });
    }
  };

  if (!isRealtimeEnabled) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {!ws && (
        <div className="text-sm text-yellow-600 flex items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-2 border-yellow-600 border-t-transparent rounded-full" />
          Connecting to Real-time service...
        </div>
      )}
      
      {isGenerating && (
        <div className="text-sm text-blue-600 flex items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full" />
          Generating via Real-time streaming...
        </div>
      )}

      <Button
        onClick={generateRealtimeSOAP}
        disabled={!ws || isGenerating || !transcription}
        variant="default"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isGenerating ? "Generating..." : "Generate SOAP (Real-time)"}
      </Button>

      {ws && (
        <div className="text-xs text-green-600">
          Real-time Connected
        </div>
      )}
    </div>
  );
};