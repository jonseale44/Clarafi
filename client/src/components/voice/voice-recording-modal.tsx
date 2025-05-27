import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mic, Square, Pause, Play, X, Brain, Loader2 } from "lucide-react";

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
}

export function VoiceRecordingModal({ isOpen, onClose, patientId }: VoiceRecordingModalProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [realtimeSuggestions, setRealtimeSuggestions] = useState<any[]>([]);
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuggestionTextRef = useRef<string>("");

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      console.log('📡 [VoiceModal] Starting API request to transcribe-enhanced...');
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("patientId", patientId.toString());
      formData.append("userRole", user?.role || "provider");
      
      console.log('📡 [VoiceModal] FormData prepared:', {
        audioSize: audioBlob.size,
        patientId: patientId.toString(),
        userRole: user?.role || "provider"
      });
      
      console.log('📡 [VoiceModal] Sending POST request to /api/voice/transcribe-enhanced...');
      const response = await apiRequest("POST", "/api/voice/transcribe-enhanced", formData);
      console.log('📡 [VoiceModal] Response received, status:', response.status);
      
      const data = await response.json();
      console.log('📡 [VoiceModal] Response data:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ [VoiceModal] Transcription successful:', data);
      setLiveTranscription(data.transcription);
      setAiSuggestions(data.aiSuggestions);
      
      // Store enhanced AI response data
      if (data.soapNote || data.draftOrders || data.cptCodes) {
        console.log('📝 [VoiceModal] Enhanced AI Processing Complete:', {
          soapNote: data.soapNote,
          draftOrders: data.draftOrders,
          cptCodes: data.cptCodes,
          encounterId: data.encounterId
        });
      }
    },
    onError: (error) => {
      console.error('❌ [VoiceModal] Transcription failed:', error);
    }
  });

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    console.log('🎤 [VoiceModal] Starting recording for patient:', patientId);
    try {
      console.log('🎤 [VoiceModal] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 [VoiceModal] ✅ Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      console.log('🎤 [VoiceModal] MediaRecorder created, MIME type:', mediaRecorder.mimeType);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 [VoiceModal] Audio data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 [VoiceModal] Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎤 [VoiceModal] Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          patientId,
          userRole: user?.role
        });
        console.log('🎤 [VoiceModal] Sending to enhanced transcription API...');
        transcribeMutation.mutate(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log('🎤 [VoiceModal] Microphone released');
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setLiveTranscription("");
      setAiSuggestions(null);
      console.log('🎤 [VoiceModal] ✅ Recording started successfully');
    } catch (error) {
      console.error("❌ [VoiceModal] Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setRecordingDuration(0);
    setLiveTranscription("");
    setAiSuggestions(null);
    onClose();
  };

  const getUserRolePrompts = () => {
    if (!aiSuggestions) return [];
    return user?.role === "nurse" ? aiSuggestions.nursePrompts : aiSuggestions.providerPrompts;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>AI-Assisted Voice Recording</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Recording Status */}
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className={`h-8 w-8 text-red-600 ${isRecording && !isPaused ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-lg font-medium text-gray-900">
              {isRecording ? (isPaused ? "Recording paused" : "Recording in progress...") : "Ready to record"}
            </p>
            <p className="text-sm text-gray-500">
              Duration: {formatDuration(recordingDuration)}
            </p>
          </div>
          
          {/* Live Transcription */}
          {(liveTranscription || transcribeMutation.isPending) && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Live Transcription</h4>
              {transcribeMutation.isPending ? (
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing audio...</span>
                </div>
              ) : (
                <p className="text-gray-700 text-sm">{liveTranscription}</p>
              )}
            </Card>
          )}
          
          {/* AI Suggestions */}
          {aiSuggestions && (
            <Card className="p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                AI {user?.role === "nurse" ? "Nurse" : "Provider"} Suggestions
              </h4>
              {getUserRolePrompts()?.length > 0 ? (
                <ul className="text-sm text-blue-800 space-y-1">
                  {getUserRolePrompts().map((suggestion: string, index: number) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-blue-800">No specific suggestions at this time.</p>
              )}
              
              {aiSuggestions.draftOrders?.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-blue-900">Suggested Orders:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {aiSuggestions.draftOrders.map((order: string, index: number) => (
                      <li key={index}>• {order}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {aiSuggestions.clinicalNotes && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-blue-900">Clinical Notes:</h5>
                  <p className="text-sm text-blue-800">{aiSuggestions.clinicalNotes}</p>
                </div>
              )}
            </Card>
          )}
          
          {/* Recording Controls */}
          <div className="flex items-center justify-center space-x-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 text-white hover:bg-red-700">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button onClick={stopRecording} className="bg-red-600 text-white hover:bg-red-700">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
                <Button variant="outline" onClick={pauseRecording}>
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
          
          {/* Role Badge */}
          <div className="text-center">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Recording as: {user?.role} {user?.credentials && `(${user.credentials})`}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
