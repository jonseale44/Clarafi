import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { startBackgroundAudio, stopBackgroundAudio } from "@/lib/median-background-audio";

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
  isRecording?: boolean;
  noteType?: string; // New prop for note type selection
  selectedTemplate?: any; // New prop for custom template selection
  userEditingLock?: boolean; // New prop to prevent AI overwrites during user editing
  recordingCooldown?: boolean; // New prop to prevent AI overwrites during transcription completion
  onTranscriptionUpdate?: (transcription: string) => void; // New prop for transcription updates
  onRecordingStateChange?: (isRecording: boolean) => void; // New prop for recording state changes
}

export interface RealtimeSOAPRef {
  generateSOAPNote: (forceGeneration?: boolean) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
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
  enableIntelligentStreaming = false,
  isRecording = false,
  noteType = 'soap', // Default to SOAP note
  selectedTemplate,
  userEditingLock = false,
  recordingCooldown = false,
  onTranscriptionUpdate,
  onRecordingStateChange
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [soapBuffer, setSoapBuffer] = useState("");
  const [lastSOAPContent, setLastSOAPContent] = useState("");
  const [lastTranscriptionHash, setLastTranscriptionHash] = useState("");
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  
  // Recording state
  const [internalIsRecording, setInternalIsRecording] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  
  const { toast } = useToast();
  
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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
    console.log("🩺 [RealtimeSOAP] generateSOAPNote called with:", {
      forceGeneration,
      transcriptionLength: transcription?.length || 0,
      transcriptionPreview: transcription?.substring(0, 100) || 'empty'
    });

    if (!transcription?.trim()) {
      console.log("🩺 [RealtimeSOAP] No transcription available - showing toast");
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
      
      // For automatic generation, be more lenient with change detection
      if (!shouldTriggerUpdate(lastSOAPContent, soapBuffer)) {
        console.log("🔍 [IntelligentStreaming] Skipping update - minimal change detected");
        console.log("🔍 [IntelligentStreaming] But continuing with generation for automatic trigger");
        // Don't return early for automatic generation - continue with generation
      } else {
        console.log("🔍 [IntelligentStreaming] Triggering update - change detected");
      }
      
      setLastTranscriptionHash(transcriptionHash);
      setLastGenerationTime(Date.now());
    }

    console.log("🩺 [RealtimeSOAP] Starting Real-time SOAP generation");
    console.log("🩺 [RealtimeSOAP] Force generation:", forceGeneration);
    console.log("🩺 [RealtimeSOAP] Enable intelligent streaming:", enableIntelligentStreaming);
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
      console.log(`🚀 [RealtimeSOAP] Starting note generation:`, {
        noteType,
        patientId,
        encounterId,
        transcriptionLength: transcription.trim().length,
        selectedTemplate: selectedTemplate?.id,
        isBaseTemplate: selectedTemplate?.isBaseTemplate
      });

      // Send complete transcription to enhanced clinical notes API
      const requestBody: any = {
        noteType,
        patientId,
        encounterId,
        transcription: transcription.trim(), // Complete transcript from entire recording
      };

      // Add template ID if custom template is being used
      if (selectedTemplate && !selectedTemplate.isBaseTemplate) {
        requestBody.templateId = selectedTemplate.id;
        console.log(`📋 [RealtimeSOAP] Using custom template: ${selectedTemplate.id}`);
      } else {
        console.log(`📋 [RealtimeSOAP] Using base template for ${noteType}`);
      }

      console.log(`📤 [RealtimeSOAP] Sending request to /api/clinical-notes/generate`);
      const response = await fetch('/api/clinical-notes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 [RealtimeSOAP] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [RealtimeSOAP] HTTP Error:`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📥 [RealtimeSOAP] API Response data:`, {
        hasNote: !!data.note,
        noteLength: data.note?.length || 0,
        noteType: data.noteType,
        processingTime: data.processingTimeMs
      });
      
      if (data.note) {
        console.log(`📝 [RealtimeSOAP] Successfully generated ${noteType.toUpperCase()} note (${data.note.length} chars)`);
        
        // Track SOAP note generation success
        analytics.trackFeatureUsage('soap_generation', 'generated', {
          noteType: noteType,
          noteLength: data.note.length,
          processingTimeMs: data.processingTimeMs,
          patientId: patientId,
          encounterId: encounterId,
          hasTemplate: !!selectedTemplate,
          templateId: selectedTemplate?.id,
          isManualGeneration: forceGeneration,
          isIntelligentStreaming: enableIntelligentStreaming,
          transcriptionLength: transcription.trim().length
        });
        
        // Track conversion event for SOAP generation as feature usage
        analytics.trackConversion({
          eventType: 'ai_scribe_used',
          eventData: {
            noteType: noteType,
            encounterId: encounterId,
            patientId: patientId,
            generationMethod: forceGeneration ? 'manual' : 'automatic'
          }
        });
        
        // Check edit lock before applying any AI updates
        if (userEditingLock && !forceGeneration) {
          console.log("🔒 [UserEditLock] Blocking AI update - user has active edits. Use 'Regenerate from AI' to override.");
          return;
        }
        
        if (recordingCooldown && !forceGeneration) {
          console.log("🔒 [RecordingCooldown] Blocking AI update - recording cooldown active");
          return;
        }
        
        onSOAPNoteComplete(data.note);
        
        if (forceGeneration) {
          toast({
            title: "Note Generated",
            description: `${noteType.toUpperCase()} note generated successfully`,
          });
        }
      } else {
        console.error(`❌ [RealtimeSOAP] No note in response:`, data);
        throw new Error('No note returned from API');
      }
      
    } catch (error: any) {
      console.error(`❌ [RealtimeSOAP] Error generating ${noteType.toUpperCase()} note:`, {
        error: error.message,
        stack: error.stack,
        requestDetails: {
          noteType,
          patientId,
          encounterId,
          transcriptionLength: transcription.trim().length
        }
      });
      toast({
        title: "Generation Failed",
        description: `Failed to generate ${noteType.toUpperCase()} note. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Recording implementation methods
  const startRecording = async (): Promise<void> => {
    console.log("🎤 [RealtimeSOAPIntegration] === START RECORDING CALLED ===");
    console.log("🎤 [RealtimeSOAPIntegration] Patient ID:", patientId, "Encounter ID:", encounterId);
    
    try {
      setInternalIsRecording(true);
      onRecordingStateChange?.(true);
      
      // Start background audio for iOS devices in Median app
      startBackgroundAudio();
      
      // WebSocket connection for transcription
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/realtime/connect?patientId=${patientId}&encounterId=${encounterId}&userId=${patientId}`;
      
      // Enhanced diagnostic logging for production debugging
      const isProduction = window.location.hostname.includes('.replit.app') || 
                          window.location.hostname.includes('.repl.co') ||
                          !['localhost', '127.0.0.1'].includes(window.location.hostname);
      
      console.log("🌐 [RealtimeSOAPIntegration] WebSocket Connection Details:", {
        url: wsUrl,
        protocol: protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        isProduction: isProduction,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Store WebSocket globally for debugging
      (window as any).currentWebSocket = ws;
      
      // Connection state monitoring
      let connectionStateInterval: NodeJS.Timeout | null = null;
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      // Monitor WebSocket state every second during connection
      connectionStateInterval = setInterval(() => {
        const stateMap: Record<number, string> = {
          0: 'CONNECTING',
          1: 'OPEN', 
          2: 'CLOSING',
          3: 'CLOSED'
        };
        
        const currentState = ws.readyState;
        console.log(`🔍 [WebSocket State Monitor] Current state: ${stateMap[currentState]} (${currentState})`, {
          wsConnected: wsConnected,
          isProduction: isProduction,
          elapsed: `${Math.floor((Date.now() - startTime) / 1000)}s`
        });
        
        // Clear interval once connected or closed
        if (currentState === WebSocket.OPEN || currentState === WebSocket.CLOSED) {
          if (connectionStateInterval) clearInterval(connectionStateInterval);
        }
      }, 1000);
      
      const startTime = Date.now();
      
      // Set connection timeout (10 seconds)
      connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("⏱️ [WebSocket Timeout] Connection failed after 10 seconds", {
            finalState: ws.readyState,
            wsConnected: wsConnected,
            isProduction: isProduction,
            diagnostics: {
              url: wsUrl,
              protocol: protocol,
              host: window.location.host,
              userAgent: navigator.userAgent
            }
          });
          
          // Clean up and close connection
          if (connectionStateInterval) clearInterval(connectionStateInterval);
          ws.close();
          
          toast({
            title: "Connection Timeout",
            description: "Failed to establish WebSocket connection. Please try again.",
            variant: "destructive",
          });
        }
      }, 10000);
      
      ws.onopen = () => {
        console.log("🌐 [RealtimeSOAPIntegration] ✅ Connected to WebSocket proxy", {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol,
          isProduction: isProduction,
          connectionTime: `${Date.now() - startTime}ms`
        });
        
        // Clear timeout since connection succeeded
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (connectionStateInterval) clearInterval(connectionStateInterval);
        
        setWsConnected(true);
        
        // Send session creation request
        const sessionConfig = {
          model: "gpt-4o-realtime-preview-2024-10-01",
          modalities: ["text", "audio"],
          instructions: `You are a medical transcription assistant specialized in clinical conversations. 
            Accurately transcribe medical terminology, drug names, dosages, and clinical observations. Translate all languages into English. Only output ENGLISH.
            Pay special attention to:
            - Medication names and dosages (e.g., "Metformin 500mg twice daily")
            - Medical abbreviations (e.g., "BP", "HR", "HEENT")
            - Anatomical terms and symptoms
            - Numbers and measurements (vital signs, lab values)
            Format with bullet points for natural conversation flow.`,
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 300,
            create_response: false,
          },
        };

        const sessionCreateMessage = {
          type: "session.create",
          data: {
            patientId: patientId,
            encounterId: encounterId,
            sessionConfig: sessionConfig,
          },
        };

        ws.send(JSON.stringify(sessionCreateMessage));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("📨 [RealtimeSOAPIntegration] WebSocket message type:", message.type);

        if (message.type === "session.created") {
          console.log("✅ [RealtimeSOAPIntegration] Session created successfully");
        } else if (message.type === "conversation.item.input_audio_transcription.completed") {
          const completedTranscript = message.transcript || "";
          console.log("✅ [RealtimeSOAPIntegration] Transcription completed:", completedTranscript.substring(0, 100) + "...");
          
          // Process conversation segments like provider view - format with bullet points
          if (completedTranscript) {
            const conversationSegments = completedTranscript.split(/[.!?]+/).filter((segment: string) => segment.trim().length > 0);
            
            if (conversationSegments.length > 0) {
              // Add each segment as a separate bullet point
              const newBullets = conversationSegments
                .map((segment: string) => `• ${segment.trim()}`)
                .join("\n");
              
              // Append to existing transcription with proper formatting
              setLiveTranscription((prev) => {
                const newTranscription = prev + (prev ? "\n" : "") + newBullets;
                console.log("✅ [RealtimeSOAPIntegration] Added conversation segments:", conversationSegments.length);
                
                // Update parent component with final transcription
                onTranscriptionUpdate?.(newTranscription);
                return newTranscription;
              });
            }
          }
        }
      };

      ws.onerror = (error) => {
        console.error("❌ [RealtimeSOAPIntegration] WebSocket error occurred", {
          error: error,
          errorType: error.type,
          errorTarget: error.target,
          readyState: ws.readyState,
          wsConnected: wsConnected,
          isProduction: isProduction,
          url: wsUrl,
          diagnostics: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            connectionDuration: `${Date.now() - startTime}ms`
          }
        });
        
        // Clear intervals/timeouts on error
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (connectionStateInterval) clearInterval(connectionStateInterval);
        
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("🔌 [RealtimeSOAPIntegration] WebSocket connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          readyState: ws.readyState,
          isProduction: isProduction,
          connectionDuration: `${Date.now() - startTime}ms`,
          diagnostics: {
            url: wsUrl,
            timestamp: new Date().toISOString()
          }
        });
        
        // Clear intervals/timeouts on close
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (connectionStateInterval) clearInterval(connectionStateInterval);
        
        // Clear global reference
        if ((window as any).currentWebSocket === ws) {
          (window as any).currentWebSocket = null;
        }
        
        setWsConnected(false);
      };

      // Microphone access with audio processing like provider view
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Set up audio processing like provider view
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert to PCM16 exactly like provider view
        const pcm16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Create audio blob and convert to base64 exactly like provider view
        const audioBlob = new Blob([pcm16Data], { type: "audio/pcm" });

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Audio = btoa(binary);

            // Send audio buffer with proper format like provider view
            wsRef.current?.send(JSON.stringify({
              event_id: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              type: "input_audio_buffer.append",
              audio: base64Audio,
            }));

          } catch (error) {
            console.error("❌ [RealtimeSOAPIntegration] Error processing audio:", error);
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      };

      // Store references for cleanup
      (mediaRecorderRef.current as any) = { processor, audioContext, source, stream };
      
      toast({
        title: "Recording Started",
        description: "Voice recording and transcription active",
      });

    } catch (error) {
      console.error("❌ [RealtimeSOAPIntegration] Recording error:", error);
      setInternalIsRecording(false);
      onRecordingStateChange?.(false);
      
      toast({
        title: "Recording Failed", 
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const stopRecording = async (): Promise<void> => {
    console.log("🎤 [RealtimeSOAPIntegration] === STOP RECORDING CALLED ===", {
      wsConnected: wsConnected,
      wsReadyState: wsRef.current?.readyState,
      hasMediaRecorder: !!mediaRecorderRef.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      setInternalIsRecording(false);
      onRecordingStateChange?.(false);
      
      // Stop background audio for iOS devices in Median app
      stopBackgroundAudio();

      // Cleanup audio processing components
      if (mediaRecorderRef.current) {
        const { processor, audioContext, source, stream } = mediaRecorderRef.current as any;
        
        // Disconnect and cleanup audio processing nodes
        if (processor) {
          processor.disconnect();
          source?.disconnect();
          console.log("🛑 [RealtimeSOAPIntegration] Audio processor disconnected");
        }
        
        // Close audio context
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
          console.log("🛑 [RealtimeSOAPIntegration] Audio context closed");
        }
        
        // Stop media stream tracks
        if (stream) {
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          console.log("🛑 [RealtimeSOAPIntegration] Media stream stopped");
        }
      }

      // Close WebSocket with enhanced cleanup logging
      if (wsRef.current) {
        const ws = wsRef.current;
        const stateMap: Record<number, string> = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED'
        };
        
        console.log("🔌 [RealtimeSOAPIntegration] Cleaning up WebSocket", {
          currentState: stateMap[ws.readyState],
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol
        });
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          console.log("🔌 [RealtimeSOAPIntegration] WebSocket close() called");
        }
        
        // Clear global reference
        if ((window as any).currentWebSocket === ws) {
          (window as any).currentWebSocket = null;
          console.log("🧹 [RealtimeSOAPIntegration] Cleared global WebSocket reference");
        }
        
        wsRef.current = null;
      }

      setWsConnected(false);

      toast({
        title: "Recording Stopped",
        description: "Voice recording completed",
      });

    } catch (error) {
      console.error("❌ [RealtimeSOAPIntegration] Stop recording error:", error);
      throw error;
    }
  };

  // Expose generateSOAPNote method via ref
  useImperativeHandle(ref, () => ({
    generateSOAPNote,
    startRecording,
    stopRecording
  }));

  // Intelligent streaming with conversation pause detection
  useEffect(() => {
    console.log("🔍 [IntelligentStreaming] useEffect triggered with:", {
      enableIntelligentStreaming,
      autoTrigger,
      transcriptionLength: transcription?.length || 0,
      isGenerating,
      transcriptionPreview: transcription?.substring(0, 100) || 'empty'
    });

    if (!enableIntelligentStreaming) {
      console.log("🔍 [IntelligentStreaming] Intelligent streaming disabled, using traditional auto-trigger");
      
      // Check user edit lock first
      if (userEditingLock || recordingCooldown) {
        console.log("🔒 [UserEditLock] Skipping SOAP generation - user editing or recording cooldown active:", {
          userEditingLock,
          recordingCooldown
        });
        return;
      }
      
      // Traditional auto-trigger behavior - but only when recording
      if (autoTrigger && transcription?.trim() && !isGenerating && isRecording) {
        console.log("🔄 [RealtimeSOAP] Auto-triggering SOAP generation (traditional mode)");
        generateSOAPNote();
      } else {
        console.log("🔍 [IntelligentStreaming] Traditional auto-trigger conditions not met:", {
          autoTrigger,
          hasTranscription: !!transcription?.trim(),
          isGenerating,
          isRecording
        });
      }
      return;
    }

    console.log("🔍 [IntelligentStreaming] Intelligent streaming enabled");

    // Clear existing timeouts
    if (pauseDetectionTimeoutRef.current) {
      console.log("🔍 [IntelligentStreaming] Clearing existing pause detection timeout");
      clearTimeout(pauseDetectionTimeoutRef.current);
    }
    if (streamingTimeoutRef.current) {
      console.log("🔍 [IntelligentStreaming] Clearing existing streaming timeout");
      clearTimeout(streamingTimeoutRef.current);
    }

    // Check user edit lock first for intelligent streaming too
    if (userEditingLock || recordingCooldown) {
      console.log("🔒 [UserEditLock] Skipping intelligent streaming - user editing or recording cooldown active:", {
        userEditingLock,
        recordingCooldown
      });
      return;
    }

    if (!transcription?.trim() || isGenerating || !isRecording) {
      console.log("🔍 [IntelligentStreaming] Skipping - no transcription, already generating, or not recording:", {
        hasTranscription: !!transcription?.trim(),
        isGenerating,
        isRecording
      });
      return;
    }

    // Immediate trigger on medical keywords
    const recentTranscription = transcription.slice(-100); // Last 100 characters
    console.log("🔍 [IntelligentStreaming] Checking recent transcription for medical keywords:", recentTranscription);
    
    if (detectMedicalKeywords(recentTranscription)) {
      console.log("🔍 [IntelligentStreaming] Medical keywords detected - immediate trigger");
      generateSOAPNote();
      return;
    } else {
      console.log("🔍 [IntelligentStreaming] No medical keywords detected in recent transcription");
    }

    // Content-based batching (50+ new words)
    const wordCount = transcription.split(/\s+/).length;
    const lastWordCount = lastTranscriptionHash ? parseInt(lastTranscriptionHash.split('_')[1] || '0') : 0;
    
    if (wordCount - lastWordCount >= 50) {
      console.log("🔍 [IntelligentStreaming] Content threshold reached - triggering generation");
      generateSOAPNote();
      return;
    } else {
      console.log("🔍 [IntelligentStreaming] Content threshold not reached:", {
        currentWordCount: wordCount,
        lastWordCount,
        difference: wordCount - lastWordCount,
        threshold: 50
      });
    }

    // Set pause detection timer (2-3 seconds of silence)
    console.log("🔍 [IntelligentStreaming] Setting pause detection timeout (2.5s)");
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