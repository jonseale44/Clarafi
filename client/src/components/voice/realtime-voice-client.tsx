import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RealtimeVoiceClientProps {
  patientId: number;
  userRole: string;
  onTranscriptionUpdate: (text: string) => void;
  onSuggestionsUpdate: (suggestions: any) => void;
  onComplete: (data: any) => void;
}

interface WebSocketMessage {
  type: string;
  session?: any;
  response?: any;
  item?: any;
  delta?: any;
  error?: any;
}

export function RealtimeVoiceClient({
  patientId,
  userRole,
  onTranscriptionUpdate,
  onSuggestionsUpdate,
  onComplete
}: RealtimeVoiceClientProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const assistantThreadIdRef = useRef<string | null>(null);
  
  const { toast } = useToast();

  // Convert Float32Array to Int16Array for OpenAI Realtime API
  const float32ToInt16 = useCallback((float32Array: Float32Array): ArrayBuffer => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array.buffer;
  }, []);

  // Initialize WebSocket connection to OpenAI Realtime API
  const initializeWebSocket = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get OpenAI API key and create WebSocket connection through our backend proxy
      const response = await fetch('/api/realtime/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get realtime connection details');
      }
      
      const { websocketUrl, authToken } = await response.json();
      
      // Create WebSocket connection
      wsRef.current = new WebSocket(websocketUrl, ['realtime', 'openai-beta.realtime-v1']);
      
      wsRef.current.onopen = () => {
        console.log('🔗 Realtime WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Initialize session with patient context
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are a medical AI assistant providing real-time transcription and clinical suggestions for ${userRole}. Patient ID: ${patientId}. Provide contextual medical insights based on what you hear.`,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
              },
              tools: [],
              tool_choice: 'none',
              temperature: 0.6
            }
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to realtime transcription service",
          variant: "destructive"
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        cleanup();
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: "Could not establish realtime connection",
        variant: "destructive"
      });
    }
  }, [patientId, userRole, toast]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'session.created':
        console.log('✅ Realtime session created');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('🎤 Speech detected');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('🔇 Speech ended');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (message.item?.transcript) {
          const newTranscription = message.item.transcript;
          setCurrentTranscription(prev => prev + ' ' + newTranscription);
          onTranscriptionUpdate(currentTranscription + ' ' + newTranscription);
          
          // Get Assistant suggestions for longer transcriptions
          if (newTranscription.length > 20) {
            requestAssistantSuggestions(currentTranscription + ' ' + newTranscription);
          }
        }
        break;
        
      case 'conversation.item.input_audio_transcription.failed':
        console.error('Transcription failed:', message.error);
        break;
        
      case 'response.done':
        console.log('Response completed');
        if (currentTranscription) {
          processCompleteTranscription(currentTranscription);
        }
        break;
        
      case 'error':
        console.error('Realtime API error:', message.error);
        toast({
          title: "Transcription Error",
          description: message.error?.message || "An error occurred during transcription",
          variant: "destructive"
        });
        break;
    }
  }, [currentTranscription, onTranscriptionUpdate, toast]);

  // Request Assistant suggestions for partial transcription
  const requestAssistantSuggestions = useCallback(async (partialText: string) => {
    try {
      const response = await fetch('/api/realtime/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          userRole,
          partialTranscription: partialText
        })
      });
      
      if (response.ok) {
        const suggestions = await response.json();
        onSuggestionsUpdate(suggestions);
      }
    } catch (error) {
      console.error('Failed to get Assistant suggestions:', error);
    }
  }, [patientId, userRole, onSuggestionsUpdate]);

  // Process complete transcription with Assistant
  const processCompleteTranscription = useCallback(async (fullText: string) => {
    try {
      const response = await fetch('/api/realtime/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          userRole,
          transcription: fullText
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        onComplete(result);
      }
    } catch (error) {
      console.error('Failed to process complete transcription:', error);
    }
  }, [patientId, userRole, onComplete]);

  // Initialize audio recording
  const startAudioRecording = useCallback(async () => {
    try {
      // Request microphone access with optimal settings for medical transcription
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

      streamRef.current = stream;

      // Create AudioContext with 24kHz sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create audio processor for real-time streaming
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          const audioBuffer = float32ToInt16(inputData);
          
          // Send audio data to OpenAI Realtime API
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: Array.from(new Uint8Array(audioBuffer))
          }));
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Real-time transcription is active"
      });

    } catch (error) {
      console.error('Failed to start audio recording:', error);
      toast({
        title: "Microphone Access Failed",
        description: "Please allow microphone access for voice transcription",
        variant: "destructive"
      });
    }
  }, [float32ToInt16, toast]);

  // Stop audio recording
  const stopAudioRecording = useCallback(() => {
    // Commit the current audio buffer
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }

    cleanup();
    setIsRecording(false);
    
    toast({
      title: "Recording Stopped",
      description: "Processing complete transcription..."
    });
  }, [toast]);

  // Cleanup audio resources
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (!isConnected) {
      await initializeWebSocket();
      return;
    }

    if (isRecording) {
      stopAudioRecording();
    } else {
      await startAudioRecording();
    }
  }, [isConnected, isRecording, initializeWebSocket, startAudioRecording, stopAudioRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cleanup]);

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return isRecording ? 'Recording...' : 'Ready to Record';
      case 'error': return 'Connection Failed';
      default: return 'Click to Connect';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return isRecording ? 'text-red-500' : 'text-green-500';
      case 'error': return 'text-red-500';
      case 'connecting': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="text-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        {currentTranscription && (
          <p className="text-xs text-gray-600 mt-1">
            {currentTranscription.length} characters transcribed
          </p>
        )}
      </div>
      
      <Button
        onClick={toggleRecording}
        disabled={connectionStatus === 'connecting'}
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        className="w-20 h-20 rounded-full"
      >
        {connectionStatus === 'connecting' ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      
      <div className="text-center text-xs text-gray-500 max-w-xs">
        {!isConnected ? (
          "Click to connect and enable real-time transcription"
        ) : isRecording ? (
          "Speak clearly. Your voice is being transcribed in real-time."
        ) : (
          "Click the microphone to start recording"
        )}
      </div>
    </div>
  );
}