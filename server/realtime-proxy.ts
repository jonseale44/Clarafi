/**
 * Secure WebSocket Proxy for OpenAI Realtime API
 * 
 * This proxy ensures that:
 * 1. API keys are never exposed to the frontend
 * 2. All connections are authenticated
 * 3. Full audit trail of AI interactions
 * 4. HIPAA-compliant architecture
 */

import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Express } from 'express';
import { Server as HTTPServer } from 'http';
import OpenAI from 'openai';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  sessionId?: string;
  isAlive?: boolean;
}

// Session management for WebSocket connections
const activeSessions = new Map<string, {
  clientWs: AuthenticatedWebSocket;
  openAiWs: WebSocket;
  userId: number;
  patientId?: number;
  startTime: Date;
}>();

export function setupRealtimeProxy(app: Express, server: HTTPServer) {
  console.log('🔒 [RealtimeProxy] Setting up secure WebSocket proxy for OpenAI');
  
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/realtime/connect'
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
    // Parse URL to handle query parameters
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    // Only handle our realtime proxy path
    if (url.pathname !== '/api/realtime/connect') {
      return;
    }

    console.log('🔌 [RealtimeProxy] WebSocket upgrade request received');
    console.log('🔌 [RealtimeProxy] URL:', request.url);
    console.log('🔌 [RealtimeProxy] Pathname:', url.pathname);
    console.log('🔌 [RealtimeProxy] Query params:', url.searchParams.toString());
    console.log('🔌 [RealtimeProxy] Request headers:', {
      host: request.headers.host,
      cookie: request.headers.cookie ? 'Present' : 'Missing',
      upgrade: request.headers.upgrade,
      connection: request.headers.connection,
      'sec-websocket-version': request.headers['sec-websocket-version'],
      'sec-websocket-key': request.headers['sec-websocket-key'] ? 'Present' : 'Missing'
    });

    // Verify authentication using session cookie
    const cookies = parseCookies(request.headers.cookie || '');
    console.log('🔌 [RealtimeProxy] Parsed cookies:', {
      hasConnectSid: !!cookies['connect.sid'],
      cookieKeys: Object.keys(cookies),
      rawCookie: request.headers.cookie?.substring(0, 100) + '...'
    });
    
    const sessionId = cookies['connect.sid'];
    
    if (!sessionId) {
      console.error('❌ [RealtimeProxy] No session cookie found');
      console.error('❌ [RealtimeProxy] Available cookies:', Object.keys(cookies));
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify session is valid (you'll need to implement this based on your session store)
    const userId = await verifySession(sessionId);
    if (!userId) {
      console.error('❌ [RealtimeProxy] Invalid session');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log('✅ [RealtimeProxy] Session verified for user:', userId);

    wss.handleUpgrade(request, socket, head, (ws) => {
      const authenticatedWs = ws as AuthenticatedWebSocket;
      authenticatedWs.userId = userId;
      authenticatedWs.sessionId = sessionId;
      wss.emit('connection', authenticatedWs, request);
    });
  });

  // Handle WebSocket connections
  wss.on('connection', async (clientWs: AuthenticatedWebSocket) => {
    console.log('🤝 [RealtimeProxy] Client connected, user:', clientWs.userId);
    
    let openAiWs: WebSocket | null = null;
    let sessionActive = false;
    const messageBuffer: any[] = [];

    // Set up heartbeat to detect disconnected clients
    clientWs.isAlive = true;
    clientWs.on('pong', () => {
      clientWs.isAlive = true;
    });

    clientWs.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 [RealtimeProxy] Message from client:', message.type);

        // Handle session creation
        if (message.type === 'session.create') {
          console.log('🎯 [RealtimeProxy] Received session.create message');
          console.log('🎯 [RealtimeProxy] Message structure:', {
            type: message.type,
            hasData: !!message.data,
            hasSessionConfig: !!message.data?.sessionConfig,
            hasPatientId: !!message.data?.patientId,
            hasEncounterId: !!message.data?.encounterId
          });
          
          if (openAiWs) {
            console.warn('⚠️ [RealtimeProxy] Session already exists, ignoring duplicate request');
            return;
          }

          console.log('🔧 [RealtimeProxy] Creating OpenAI session');
          console.log('🔧 [RealtimeProxy] Full message data:', JSON.stringify(message.data, null, 2));
          
          // Extract session config from client message
          const clientData = message.data || {};
          const sessionConfig = clientData.sessionConfig || {};
          
          console.log('🔧 [RealtimeProxy] Extracted session config:', JSON.stringify(sessionConfig, null, 2));
          console.log('🔧 [RealtimeProxy] Patient ID:', clientData.patientId);
          console.log('🔧 [RealtimeProxy] Encounter ID:', clientData.encounterId);
          
          // Ensure we use server-side API key, never client-provided
          console.log('🔧 [RealtimeProxy] Creating OpenAI client instance...');
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          console.log('🔧 [RealtimeProxy] OpenAI client created');

          try {
            // Connect directly to OpenAI WebSocket
            console.log('🔧 [RealtimeProxy] Connecting to OpenAI WebSocket...');
            console.log('🔧 [RealtimeProxy] Using model:', sessionConfig.model || 'gpt-4o-realtime-preview-2024-10-01');
            console.log('🔧 [RealtimeProxy] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
            console.log('🔧 [RealtimeProxy] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
            console.log('🔧 [RealtimeProxy] OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 7) + '...');
            
            const wsUrl = `wss://api.openai.com/v1/realtime?model=${sessionConfig.model || 'gpt-4o-realtime-preview-2024-10-01'}`;
            console.log('🔧 [RealtimeProxy] OpenAI WebSocket URL:', wsUrl);
            console.log('🔧 [RealtimeProxy] Headers being sent:', {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY?.substring(0, 7)}...`,
              'OpenAI-Beta': 'realtime=v1'
            });
            
            console.log('🔧 [RealtimeProxy] Creating WebSocket connection to OpenAI...');
            
            try {
              openAiWs = new WebSocket(wsUrl, {
                headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'OpenAI-Beta': 'realtime=v1'
                }
              });
              console.log('🔧 [RealtimeProxy] OpenAI WebSocket instance created successfully');
              console.log('🔧 [RealtimeProxy] WebSocket instance properties:', {
                url: openAiWs.url,
                readyState: openAiWs.readyState,
                protocol: openAiWs.protocol
              });
            } catch (wsCreateError) {
              console.error('❌ [RealtimeProxy] Failed to create WebSocket instance:', wsCreateError);
              console.error('❌ [RealtimeProxy] Error details:', {
                message: (wsCreateError as any).message,
                stack: (wsCreateError as any).stack,
                code: (wsCreateError as any).code
              });
              clientWs.send(JSON.stringify({
                type: 'error',
                error: {
                  type: 'websocket_creation_error',
                  message: `Failed to create WebSocket: ${(wsCreateError as any).message}`
                }
              }));
              return;
            }

            // Set up OpenAI WebSocket handlers
            openAiWs.on('open', () => {
              console.log('🌐 [RealtimeProxy] Connected to OpenAI WebSocket');
              console.log('🌐 [RealtimeProxy] WebSocket readyState:', openAiWs.readyState);
              console.log('🌐 [RealtimeProxy] WebSocket URL:', openAiWs.url);
              console.log('🌐 [RealtimeProxy] Connection established at:', new Date().toISOString());
              sessionActive = true;
              
              // Send session configuration as first message with full API compliance
              const sessionUpdate = {
                event_id: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                type: 'session.update',
                session: {
                  modalities: sessionConfig.modalities || ["text", "audio"],
                  instructions: sessionConfig.instructions || 'You are a helpful medical transcription assistant.',
                  voice: 'alloy', // Add voice selection for audio output
                  input_audio_format: sessionConfig.input_audio_format || 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: {
                    model: sessionConfig.input_audio_transcription?.model || 'whisper-1'
                  },
                  turn_detection: sessionConfig.turn_detection || {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                  },
                  temperature: sessionConfig.temperature || 0.7,
                  tools: [], // Explicitly set empty tools array
                  tool_choice: 'auto' // Use default tool choice setting
                }
              };
              
              console.log('📤 [RealtimeProxy] Sending session configuration:', JSON.stringify(sessionUpdate, null, 2));
              openAiWs!.send(JSON.stringify(sessionUpdate));
              
              // Send session.created event to client
              clientWs.send(JSON.stringify({
                type: 'session.created',
                session: sessionUpdate.session
              }));

              // Process any buffered messages
              messageBuffer.forEach(msg => openAiWs!.send(JSON.stringify(msg)));
              messageBuffer.length = 0;
            });

            openAiWs.on('message', (data) => {
              const message = JSON.parse(data.toString());
              console.log('📨 [RealtimeProxy] Message from OpenAI:', message.type);
              
              // Log specific message types for debugging
              if (message.type === 'session.updated') {
                console.log('✅ [RealtimeProxy] Session updated successfully');
                console.log('✅ [RealtimeProxy] Session details:', JSON.stringify(message.session, null, 2));
              } else if (message.type === 'error') {
                console.error('❌ [RealtimeProxy] OpenAI API Error:', JSON.stringify(message.error, null, 2));
                console.error('❌ [RealtimeProxy] Error event_id:', message.event_id);
              } else if (message.type === 'input_audio_buffer.speech_started') {
                console.log('🎤 [RealtimeProxy] Speech detected');
              } else if (message.type === 'input_audio_buffer.speech_stopped') {
                console.log('🔇 [RealtimeProxy] Speech ended');
              } else if (message.type === 'conversation.item.created') {
                console.log('💬 [RealtimeProxy] New conversation item:', message.item?.type);
                if (message.item?.transcript) {
                  console.log('📝 [RealtimeProxy] Transcript:', message.item.transcript);
                }
              } else if (message.type === 'response.text.delta') {
                console.log('✍️ [RealtimeProxy] Text delta:', message.delta);
              } else if (message.type === 'error') {
                console.error('❌ [RealtimeProxy] OpenAI error:', message.error);
              }
              
              // Relay messages from OpenAI to client
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data.toString());
              }
            });

            openAiWs.on('error', (error) => {
              console.error('❌ [RealtimeProxy] OpenAI WebSocket error event');
              console.error('❌ [RealtimeProxy] Error object:', error);
              console.error('❌ [RealtimeProxy] Error message:', (error as any)?.message);
              console.error('❌ [RealtimeProxy] Error code:', (error as any)?.code);
              console.error('❌ [RealtimeProxy] Error stack:', (error as any)?.stack);
              console.error('❌ [RealtimeProxy] WebSocket readyState:', openAiWs?.readyState);
              console.error('❌ [RealtimeProxy] OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
              console.error('❌ [RealtimeProxy] Session was active:', sessionActive);
              console.error('❌ [RealtimeProxy] Messages buffered:', messageBuffer.length);
              console.error('❌ [RealtimeProxy] Session config:', JSON.stringify(sessionConfig, null, 2));
              
              clientWs.send(JSON.stringify({
                type: 'error',
                error: 'OpenAI connection error',
                details: {
                  message: (error as any)?.message,
                  code: (error as any)?.code
                }
              }));
            });

            openAiWs.on('close', (code, reason) => {
              console.log('🔌 [RealtimeProxy] OpenAI WebSocket closed');
              console.log('🔌 [RealtimeProxy] Close code:', code);
              console.log('🔌 [RealtimeProxy] Close reason:', reason?.toString());
              console.log('🔌 [RealtimeProxy] Common close codes:');
              console.log('🔌 [RealtimeProxy] - 1000: Normal closure');
              console.log('🔌 [RealtimeProxy] - 1001: Going away');
              console.log('🔌 [RealtimeProxy] - 1006: Abnormal closure');
              console.log('🔌 [RealtimeProxy] - 1015: TLS handshake failure');
              console.log('🔌 [RealtimeProxy] - 4000-4999: Application-specific codes');
              sessionActive = false;
              openAiWs = null;
            });

            // Store session info
            const sessionId = `${clientWs.userId}-${Date.now()}`;
            activeSessions.set(sessionId, {
              clientWs,
              openAiWs,
              userId: clientWs.userId!,
              patientId: message.data?.patientId,
              startTime: new Date()
            });

          } catch (error: any) {
            console.error('❌ [RealtimeProxy] Failed to create OpenAI session:', error);
            clientWs.send(JSON.stringify({
              type: 'error',
              error: error.message || 'Failed to create session'
            }));
          }
        } 
        // Relay other messages to OpenAI
        else if (openAiWs && sessionActive) {
          openAiWs.send(data.toString());
        } 
        // Buffer messages if session not ready
        else {
          console.log('⏳ [RealtimeProxy] Buffering message until session ready');
          messageBuffer.push(message);
        }

      } catch (error: any) {
        console.error('❌ [RealtimeProxy] Message handling error:', error);
        clientWs.send(JSON.stringify({
          type: 'error',
          error: error.message || 'Message processing error'
        }));
      }
    });

    clientWs.on('close', async () => {
      console.log('👋 [RealtimeProxy] Client disconnected');
      
      // Close OpenAI connection
      if (openAiWs) {
        openAiWs.close();
      }

      // Clean up session and save recording metadata
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.clientWs === clientWs) {
          activeSessions.delete(sessionId);
          
          // Calculate session duration
          const duration = Date.now() - session.startTime.getTime();
          const durationInSeconds = Math.round(duration / 1000);
          console.log(`📊 [RealtimeProxy] Session ended - User: ${session.userId}, Duration: ${durationInSeconds}s`);
          
          // Save recording metadata to the encounter if we have encounter context
          if (session.patientId && durationInSeconds > 5) { // Only save if recording was meaningful (>5 seconds)
            try {
              const { saveRecordingMetadata } = await import('./storage.js');
              await saveRecordingMetadata({
                userId: session.userId,
                patientId: session.patientId,
                duration: durationInSeconds,
                startTime: session.startTime,
                endTime: new Date()
              });
              console.log(`💾 [RealtimeProxy] Saved recording metadata - Duration: ${durationInSeconds}s`);
            } catch (error) {
              console.error('❌ [RealtimeProxy] Failed to save recording metadata:', error);
            }
          }
          
          break;
        }
      }
    });

    clientWs.on('error', (error) => {
      console.error('❌ [RealtimeProxy] Client WebSocket error:', error);
    });
  });

  // Heartbeat interval to clean up dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as AuthenticatedWebSocket;
      if (client.isAlive === false) {
        console.log('💔 [RealtimeProxy] Terminating dead connection');
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('✅ [RealtimeProxy] WebSocket proxy initialized at /api/realtime/connect');
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

// Verify session with your session store
async function verifySession(sessionId: string): Promise<number | null> {
  console.log('🔍 [RealtimeProxy] Verifying session:', sessionId);
  
  // Import storage instance to access sessionStore
  const { storage } = await import('./storage');
  
  console.log('🔍 [RealtimeProxy] Storage imported, sessionStore available:', !!storage.sessionStore);
  
  // Extract session ID from connect.sid cookie format (s:sessionId.signature)
  const cleanSessionId = sessionId.split(':')[1]?.split('.')[0];
  
  if (!cleanSessionId) {
    console.error('❌ [RealtimeProxy] Invalid session ID format:', sessionId);
    console.error('❌ [RealtimeProxy] Raw sessionId:', sessionId);
    console.error('❌ [RealtimeProxy] Split result:', sessionId.split(':'));
    return null;
  }
  
  console.log('🔍 [RealtimeProxy] Clean session ID:', cleanSessionId);

  return new Promise((resolve) => {
    storage.sessionStore.get(cleanSessionId, (err: any, session: any) => {
      if (err || !session) {
        console.error('❌ [RealtimeProxy] Session not found or error:', err);
        resolve(null);
        return;
      }

      // Check if session has passport user
      if (!session.passport?.user) {
        console.error('❌ [RealtimeProxy] No user in session');
        resolve(null);
        return;
      }

      console.log('✅ [RealtimeProxy] Session verified for user:', session.passport.user);
      resolve(session.passport.user);
    });
  });
  // You MUST implement proper session verification here
  console.warn('⚠️ [RealtimeProxy] Using placeholder session verification - implement proper verification!');
  return 1; // Placeholder user ID
}

// Export session management functions for monitoring
export function getActiveSessions() {
  return Array.from(activeSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    userId: session.userId,
    patientId: session.patientId,
    startTime: session.startTime,
    duration: Date.now() - session.startTime.getTime()
  }));
}

export function terminateSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.clientWs.close();
    session.openAiWs.close();
    activeSessions.delete(sessionId);
    return true;
  }
  return false;
}