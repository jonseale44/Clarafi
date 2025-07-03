import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RealtimeWebSocketClient } from "@/utils/RealtimeWebSocketClient";
import { SOAP_INSTRUCTIONS } from "@/utils/soapInstructions";
import { useToast } from "@/hooks/use-toast";

interface RealtimeSOAPGeneratorProps {
  patientId: string;
  encounterId: string;
  transcription: string;
  onSOAPNoteUpdate: (note: string) => void;
  onSOAPNoteComplete: (note: string) => void;
  onDraftOrdersReceived: (orders: any[]) => void;
  apiKey?: string;
}

export const RealtimeSOAPGenerator: React.FC<RealtimeSOAPGeneratorProps> = ({
  patientId,
  encounterId,
  transcription,
  onSOAPNoteUpdate,
  onSOAPNoteComplete,
  onDraftOrdersReceived,
  apiKey
}) => {
  const [webSocketClient, setWebSocketClient] = useState<RealtimeWebSocketClient | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [soapNoteBuffer, setSoapNoteBuffer] = useState("");
  const { toast } = useToast();
  const initializationRef = useRef(false);

  // Initialize WebSocket client
  useEffect(() => {
    if (!apiKey || initializationRef.current) return;

    const initializeClient = async () => {
      try {
        const client = new RealtimeWebSocketClient(
          apiKey,
          handleWebSocketMessage
        );

        await client.init();
        setWebSocketClient(client);
        setIsConnected(true);
        initializationRef.current = true;

        console.log("Real-time WebSocket client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Real-time WebSocket:", error);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Failed to connect to Real-time API. Please check your API key.",
        });
      }
    };

    initializeClient();

    return () => {
      if (webSocketClient) {
        webSocketClient.close();
      }
    };
  }, [apiKey]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (event: any) => {
    switch (event.type) {
      case "session.ready":
        console.log("Real-time session ready");
        break;

      case "transcription.completed":
        console.log("Transcription completed:", event.transcript);
        break;

      case "soap.note.delta":
        // Stream SOAP note content as it's generated
        setSoapNoteBuffer(prev => {
          const updated = prev + event.delta;
          onSOAPNoteUpdate(updated);
          return updated;
        });
        break;

      case "soap.note.completed":
        // SOAP note generation finished
        const finalNote = event.note;
        setSoapNoteBuffer(finalNote);
        onSOAPNoteComplete(finalNote);
        setIsGenerating(false);
        
        toast({
          title: "SOAP Note Generated",
          description: "Clinical documentation completed using Real-time API",
        });
        break;

      case "draft.orders.completed":
        // Process draft orders
        if (webSocketClient?.eventHandler?.draftOrdersModule) {
          const orders = webSocketClient.eventHandler.draftOrdersModule.processOrders(event.orders);
          onDraftOrdersReceived(orders);
        }
        break;

      case "error":
        console.error("Real-time API error:", event.error);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: event.error?.message || "An error occurred during generation",
        });
        break;

      default:
        console.log("Unhandled Real-time event:", event.type);
    }
  };

  // Generate SOAP note using Real-time API
  const generateSOAPNote = async () => {
    if (!webSocketClient || !isConnected || !transcription) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "WebSocket client not ready or no transcription available",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setSoapNoteBuffer("");

      // Fetch patient chart for context
      const response = await fetch(`/api/patients/${patientId}/chart`);
      const patientChart = await response.json();
      
      const enrichedChart = {
        ...patientChart,
        patient_id: parseInt(patientId),
        id: parseInt(patientId),
      };

      // Update patient chart in event handler modules
      if (webSocketClient.eventHandler) {
        webSocketClient.eventHandler.updatePatientChart(enrichedChart);
      }

      // Update transcription content
      webSocketClient.updateTranscriptionContent(transcription);

      // Request SOAP note generation via Real-time API
      webSocketClient.requestSOAPNote(SOAP_INSTRUCTIONS);

      console.log("SOAP note generation requested via Real-time API");

    } catch (error) {
      console.error("Error generating SOAP note:", error);
      setIsGenerating(false);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate SOAP note. Please try again.",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        {!isConnected && (
          <div className="text-sm text-yellow-600 flex items-center">
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-yellow-600 border-t-transparent rounded-full" />
            Connecting to Real-time API...
          </div>
        )}
        
        {isGenerating && (
          <div className="text-sm text-navy-blue-600 flex items-center">
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-navy-blue-600 border-t-transparent rounded-full" />
            Generating via Real-time API...
          </div>
        )}
      </div>

      <Button
        onClick={generateSOAPNote}
        disabled={!isConnected || isGenerating || !transcription}
        variant="default"
        size="sm"
        className="bg-navy-blue-600 hover:bg-navy-blue-700 text-white"
      >
        {isGenerating ? "Generating..." : "Generate SOAP Note (Real-time)"}
      </Button>

      {isConnected && (
        <div className="text-xs text-green-600">
          Real-time API Connected
        </div>
      )}
    </div>
  );
};