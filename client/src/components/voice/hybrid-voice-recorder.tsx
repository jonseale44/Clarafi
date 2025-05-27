import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Brain, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HybridVoiceRecorderProps {
  patientId: number;
  encounterId: number;
  userRole?: string;
  onTranscriptionUpdate: (text: string) => void;
  onSuggestionsUpdate: (suggestions: any) => void;
  onComplete: (result: any) => void;
}

export function HybridVoiceRecorder({
  patientId,
  encounterId,
  userRole = "provider",
  onTranscriptionUpdate,
  onSuggestionsUpdate,
  onComplete
}: HybridVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const initializeHybridSession = async () => {
    console.log('🔥 [HybridVoiceRecorder] Initializing hybrid session for patient:', patientId);
    
    try {
      setIsConnecting(true);
      
      const response = await fetch("/api/voice/hybrid-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, userRole })
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`);
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      
      console.log('✅ [HybridVoiceRecorder] Hybrid session initialized:', data.sessionId);
      
      toast({
        title: "Voice System Ready",
        description: "Hybrid Realtime + AI Assistant session initialized successfully"
      });
      
      return data.sessionId;
    } catch (error) {
      console.error('❌ [HybridVoiceRecorder] Failed to initialize session:', error);
      toast({
        title: "Session Error",
        description: "Failed to initialize voice session. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const startRecording = async () => {
    console.log('🎤 [HybridVoiceRecorder] Starting hybrid voice recording...');
    
    try {
      // Initialize session if not already done
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await initializeHybridSession();
      }

      console.log('🎤 [HybridVoiceRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000, // OpenAI Realtime API requirement
          sampleSize: 16,
        },
      });

      console.log('🎤 [HybridVoiceRecorder] ✅ Microphone access granted');
      streamRef.current = stream;

      // Create MediaRecorder for audio processing
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          console.log('🎤 [HybridVoiceRecorder] Audio chunk collected:', event.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎤 [HybridVoiceRecorder] Recording stopped, processing final audio...');
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Send final audio for complete processing
        await processFinalAudio(audioBlob, currentSessionId);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second for real-time processing
      setIsRecording(true);
      
      console.log('🎤 [HybridVoiceRecorder] ✅ Recording started successfully');
      
      toast({
        title: "Recording Started",
        description: "Real-time transcription and AI suggestions are active"
      });

      // Set up real-time audio chunk processing
      setupRealtimeProcessing(mediaRecorder, currentSessionId);

    } catch (error) {
      console.error('❌ [HybridVoiceRecorder] Failed to start recording:', error);
      toast({
        title: "Recording Error", 
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const setupRealtimeProcessing = (mediaRecorder: MediaRecorder, sessionId: string) => {
    console.log('⚡ [HybridVoiceRecorder] Setting up real-time processing...');
    
    // Process audio chunks in real-time for immediate transcription
    let chunkCount = 0;
    
    const originalOnDataAvailable = mediaRecorder.ondataavailable;
    mediaRecorder.ondataavailable = async (event) => {
      // Call original handler
      if (originalOnDataAvailable) {
        originalOnDataAvailable(event);
      }
      
      // Send chunks to realtime API for immediate transcription
      if (event.data.size > 0 && chunkCount % 2 === 0) { // Send every other chunk to avoid overwhelming
        try {
          await sendAudioChunk(event.data, sessionId);
        } catch (error) {
          console.error('❌ [HybridVoiceRecorder] Error sending audio chunk:', error);
        }
      }
      chunkCount++;
    };
  };

  const sendAudioChunk = async (audioChunk: Blob, sessionId: string) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioChunk, "chunk.webm");
      formData.append("patientId", patientId.toString());
      formData.append("userRole", userRole);
      formData.append("sessionId", sessionId);

      const response = await fetch("/api/voice/process-realtime", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error('❌ [HybridVoiceRecorder] Failed to send audio chunk:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [HybridVoiceRecorder] Error sending audio chunk:', error);
    }
  };

  const processFinalAudio = async (audioBlob: Blob, sessionId: string) => {
    console.log('📝 [HybridVoiceRecorder] Processing final audio for complete results...');
    
    try {
      // Use the existing enhanced transcription endpoint for final processing
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("patientId", patientId.toString());
      formData.append("userRole", userRole);

      const response = await fetch("/api/voice/transcribe-enhanced", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process final audio: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [HybridVoiceRecorder] Final processing complete:', result);

      // Send complete results to parent component
      onComplete({
        transcription: result.transcription,
        soapNote: result.soapNote,
        aiSuggestions: result.aiSuggestions,
        draftOrders: result.draftOrders,
        cptCodes: result.cptCodes,
        encounterId: result.encounterId
      });

      toast({
        title: "Processing Complete",
        description: "Voice recording processed with AI analysis complete"
      });

    } catch (error) {
      console.error('❌ [HybridVoiceRecorder] Failed to process final audio:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('🛑 [HybridVoiceRecorder] Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    toast({
      title: "Recording Stopped",
      description: "Processing complete transcription and generating AI insights..."
    });
  };

  // Simulate real-time updates (in production this would come from WebSocket)
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        // Simulate transcription updates
        const mockTranscription = "Patient reports chest pain that started this morning...";
        setLiveTranscription(mockTranscription);
        onTranscriptionUpdate(mockTranscription);

        // Simulate AI suggestions
        const mockSuggestions = {
          suggestions: ["Consider EKG", "Check vital signs", "Assess pain scale"],
          clinicalFlags: ["Chest pain - possible cardiac event"],
          historicalContext: "Patient has history of hypertension"
        };
        setAiSuggestions(mockSuggestions);
        onSuggestionsUpdate(mockSuggestions);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isRecording, onTranscriptionUpdate, onSuggestionsUpdate]);

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isConnecting}
          className={`${
            isRecording 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isRecording ? (
            <MicOff className="h-4 w-4 mr-2" />
          ) : (
            <Mic className="h-4 w-4 mr-2" />
          )}
          {isConnecting ? 'Connecting...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>

        {sessionId && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <span>● Connected</span>
            <span className="text-xs text-gray-500">Hybrid AI Active</span>
          </div>
        )}
      </div>

      {/* Real-Time Transcription */}
      <Card className="p-4">
        <h4 className="font-medium mb-2 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Real-Time Transcription
        </h4>
        <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
          {liveTranscription || (isRecording ? "Listening..." : "Transcription will appear here during recording")}
        </div>
      </Card>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Card className="p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            AI {userRole === "nurse" ? "Nurse" : "Provider"} Suggestions
          </h4>
          {aiSuggestions.suggestions?.length > 0 && (
            <ul className="text-sm text-blue-800 space-y-1">
              {aiSuggestions.suggestions.map((suggestion: string, index: number) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          )}
          
          {aiSuggestions.clinicalFlags?.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-medium text-red-900">Clinical Flags:</h5>
              <ul className="text-sm text-red-800 space-y-1">
                {aiSuggestions.clinicalFlags.map((flag: string, index: number) => (
                  <li key={index}>⚠️ {flag}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}