import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Square, Play, Pause, Snowflake, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnhancedRealtimeSuggestionsProps {
  patientId: number;
  userRole: "nurse" | "provider";
  onSuggestionsReceived?: (suggestions: any) => void;
  onTranscriptionReceived?: (transcription: string) => void;
}

interface ConnectionStats {
  connected: boolean;
  frozen: boolean;
  sessionId: string | null;
  responseTime?: number;
  tokenCount?: number;
  cacheHit?: boolean;
}

export function EnhancedRealtimeSuggestions({
  patientId,
  userRole,
  onSuggestionsReceived,
  onTranscriptionReceived
}: EnhancedRealtimeSuggestionsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    connected: false,
    frozen: false,
    sessionId: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const { toast } = useToast();

  // Initialize WebSocket connection
  const initializeConnection = useCallback(async () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/enhanced-realtime`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ [EnhancedSuggestions] WebSocket connected');
        setIsConnected(true);
        
        // Initialize session
        wsRef.current?.send(JSON.stringify({
          type: 'init_session',
          patientId: patientId,
          userRole: userRole,
          sessionId: sessionIdRef.current
        }));
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 [EnhancedSuggestions] WebSocket disconnected');
        setIsConnected(false);
        setConnectionStats(prev => ({ ...prev, connected: false }));
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ [EnhancedSuggestions] WebSocket error:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to enhanced realtime service"
        });
      };

    } catch (error) {
      console.error('❌ [EnhancedSuggestions] Failed to initialize connection:', error);
      toast({
        variant: "destructive",
        title: "Initialization Error",
        description: "Failed to initialize enhanced suggestions"
      });
    }
  }, [patientId, userRole, toast]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('📨 [EnhancedSuggestions] Received message:', message.type);

    switch (message.type) {
      case 'connection_established':
        console.log('✅ [EnhancedSuggestions] Connection established');
        break;

      case 'session_initialized':
        console.log('✅ [EnhancedSuggestions] Session initialized');
        setConnectionStats(prev => ({
          ...prev,
          connected: true,
          sessionId: message.sessionId
        }));
        break;

      case 'suggestions_started':
        console.log('🎯 [EnhancedSuggestions] Suggestions started');
        break;

      case 'transcription.delta':
        const deltaText = message.delta || "";
        setTranscription(prev => prev + deltaText);
        onTranscriptionReceived?.(message.buffer || transcription + deltaText);
        break;

      case 'transcription.completed':
        const finalTranscript = message.transcript || "";
        setTranscription(prev => prev + finalTranscript + "\n");
        onTranscriptionReceived?.(message.fullBuffer || transcription + finalTranscript);
        break;

      case 'gpt.analysis.delta':
        if (!isFrozen) {
          const suggestionDelta = message.delta || "";
          setSuggestions(prev => prev + suggestionDelta);
        }
        break;

      case 'gpt.analysis.completed':
        if (!isFrozen) {
          const suggestionContent = message.content || "";
          setSuggestions(suggestionContent);
          onSuggestionsReceived?.(suggestionContent);
        }
        break;

      case 'suggestions.frozen':
        setIsFrozen(true);
        setConnectionStats(prev => ({ ...prev, frozen: true }));
        break;

      case 'suggestions.unfrozen':
        setIsFrozen(false);
        setConnectionStats(prev => ({ ...prev, frozen: false }));
        break;

      case 'suggestions_stopped':
        console.log('⏹️ [EnhancedSuggestions] Suggestions stopped');
        break;

      case 'pong':
        setConnectionStats(prev => ({
          ...prev,
          ...message.stats?.suggestionsStatus,
          responseTime: message.stats?.responseTime
        }));
        break;

      case 'error':
      case 'session_error':
      case 'suggestions_error':
        console.error('❌ [EnhancedSuggestions] Error:', message.message);
        toast({
          variant: "destructive",
          title: "Suggestions Error",
          description: message.message || "An error occurred"
        });
        break;

      default:
        console.log('📋 [EnhancedSuggestions] Unhandled message:', message.type);
    }
  }, [isFrozen, transcription, onSuggestionsReceived, onTranscriptionReceived, toast]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isConnected || !wsRef.current) {
      toast({
        variant: "destructive",
        title: "Not Connected",
        description: "Please wait for connection to be established"
      });
      return;
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      audioStreamRef.current = stream;

      // Start suggestions
      wsRef.current.send(JSON.stringify({
        type: 'start_suggestions'
      }));

      // Create audio context for real-time processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isRecording || !wsRef.current) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputBuffer.length);
        
        for (let i = 0; i < inputBuffer.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
        }

        // Send audio chunk
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          audio: Array.from(pcm16).join(',')
        }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setTranscription("");
      setSuggestions("");

      console.log('🎤 [EnhancedSuggestions] Recording started');

    } catch (error) {
      console.error('❌ [EnhancedSuggestions] Failed to start recording:', error);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: "Failed to start recording. Please check microphone permissions."
      });
    }
  }, [isConnected, isRecording, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_suggestions'
      }));
    }

    setIsRecording(false);
    console.log('⏹️ [EnhancedSuggestions] Recording stopped');
  }, []);

  // Freeze/unfreeze suggestions
  const toggleFrozen = useCallback(() => {
    if (!wsRef.current) return;

    const action = isFrozen ? 'unfreeze_suggestions' : 'freeze_suggestions';
    wsRef.current.send(JSON.stringify({ type: action }));
  }, [isFrozen]);

  // Ping for connection health
  const ping = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, [isConnected]);

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeConnection]);

  // Periodic ping for connection health
  useEffect(() => {
    const interval = setInterval(ping, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [ping]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            Enhanced AI Suggestions
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {isFrozen && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Snowflake className="h-3 w-3" />
                  Frozen
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected}
              variant={isRecording ? "destructive" : "default"}
              size="sm"
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <Button
              onClick={toggleFrozen}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              {isFrozen ? (
                <>
                  <Flame className="h-4 w-4 mr-2" />
                  Unfreeze
                </>
              ) : (
                <>
                  <Snowflake className="h-4 w-4 mr-2" />
                  Freeze
                </>
              )}
            </Button>

            {connectionStats.sessionId && (
              <Badge variant="outline" className="text-xs">
                Session: {connectionStats.sessionId.slice(-8)}
              </Badge>
            )}
          </div>

          {connectionStats.responseTime && (
            <div className="mt-2 text-xs text-muted-foreground">
              Response time: {connectionStats.responseTime}ms
              {connectionStats.tokenCount && ` • Tokens: ${connectionStats.tokenCount}`}
              {connectionStats.cacheHit && " • Cache hit"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Transcription */}
      {transcription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Live Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md text-sm max-h-32 overflow-y-auto">
              {transcription || "Listening..."}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              AI Suggestions
              {isFrozen && <Snowflake className="h-4 w-4 text-blue-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm max-h-48 overflow-y-auto">
              {suggestions.split('\n').map((line, index) => (
                <div key={index} className="mb-1">
                  {line}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Info for Development */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>Patient ID: {patientId}</div>
              <div>User Role: {userRole}</div>
              <div>Session ID: {connectionStats.sessionId}</div>
              <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
              <div>Recording: {isRecording ? 'Yes' : 'No'}</div>
              <div>Frozen: {isFrozen ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}