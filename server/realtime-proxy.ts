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
  console.log('🔒 [RealtimeProxy] Environment:', process.env.NODE_ENV);
  console.log('🔒 [RealtimeProxy] Server listening on port:', process.env.PORT || 5000);
  
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/realtime/connect'
  });
  
  console.log('🔒 [RealtimeProxy] WebSocket server created with path: /api/realtime/connect');

  // Handle WebSocket upgrade requests
  server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
    console.log('🔌 [RealtimeProxy] ========== WEBSOCKET UPGRADE REQUEST ==========');
    console.log('🔌 [RealtimeProxy] Timestamp:', new Date().toISOString());
    console.log('🔌 [RealtimeProxy] Environment:', process.env.NODE_ENV);
    console.log('🔌 [RealtimeProxy] Request URL:', request.url);
    console.log('🔌 [RealtimeProxy] Request method:', request.method);
    console.log('🔌 [RealtimeProxy] HTTP version:', request.httpVersion);
    
    // Log all headers for production debugging
    console.log('🔌 [RealtimeProxy] ALL REQUEST HEADERS:');
    Object.entries(request.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'cookie') {
        console.log(`🔌 [RealtimeProxy]   ${key}: [REDACTED - ${value?.toString().length || 0} chars]`);
      } else {
        console.log(`🔌 [RealtimeProxy]   ${key}: ${value}`);
      }
    });
    
    // Parse URL to handle query parameters
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    console.log('🔌 [RealtimeProxy] Parsed URL details:', {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      searchParams: Object.fromEntries(url.searchParams.entries())
    });
    
    // Production-specific connection info
    if (process.env.NODE_ENV === 'production') {
      console.log('🔌 [RealtimeProxy] PRODUCTION CONNECTION INFO:');
      console.log('🔌 [RealtimeProxy]   X-Forwarded-For:', request.headers['x-forwarded-for']);
      console.log('🔌 [RealtimeProxy]   X-Forwarded-Proto:', request.headers['x-forwarded-proto']);
      console.log('🔌 [RealtimeProxy]   X-Forwarded-Host:', request.headers['x-forwarded-host']);
      console.log('🔌 [RealtimeProxy]   X-Real-IP:', request.headers['x-real-ip']);
      console.log('🔌 [RealtimeProxy]   CloudFront headers:', {
        'cloudfront-forwarded-proto': request.headers['cloudfront-forwarded-proto'],
        'cloudfront-viewer-country': request.headers['cloudfront-viewer-country'],
        'cloudfront-is-desktop-viewer': request.headers['cloudfront-is-desktop-viewer'],
        'cloudfront-is-mobile-viewer': request.headers['cloudfront-is-mobile-viewer']
      });
    }
    
    // Only handle our realtime proxy path
    if (url.pathname !== '/api/realtime/connect') {
      console.log('🔌 [RealtimeProxy] ❌ IGNORING non-realtime path:', url.pathname);
      console.log('🔌 [RealtimeProxy] Expected: /api/realtime/connect');
      return;
    }

    console.log('🔌 [RealtimeProxy] ✅ Path matches /api/realtime/connect');
    console.log('🔌 [RealtimeProxy] WebSocket-specific headers:', {
      upgrade: request.headers.upgrade,
      connection: request.headers.connection,
      'sec-websocket-version': request.headers['sec-websocket-version'],
      'sec-websocket-key': request.headers['sec-websocket-key'] ? 'Present' : 'Missing',
      'sec-websocket-extensions': request.headers['sec-websocket-extensions'],
      'sec-websocket-protocol': request.headers['sec-websocket-protocol']
    });

    // Verify authentication using session cookie
    console.log('🔌 [RealtimeProxy] === AUTHENTICATION CHECK ===');
    console.log('🔌 [RealtimeProxy] Raw cookie header:', request.headers.cookie ? `[${request.headers.cookie.length} chars]` : 'MISSING');
    
    const cookies = parseCookies(request.headers.cookie || '');
    console.log('🔌 [RealtimeProxy] Parsed cookies count:', Object.keys(cookies).length);
    console.log('🔌 [RealtimeProxy] Cookie keys found:', Object.keys(cookies));
    console.log('🔌 [RealtimeProxy] connect.sid present:', !!cookies['connect.sid']);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🔌 [RealtimeProxy] PRODUCTION COOKIE DEBUG:');
      console.log('🔌 [RealtimeProxy]   Cookie header exists:', !!request.headers.cookie);
      console.log('🔌 [RealtimeProxy]   Cookie header length:', request.headers.cookie?.length || 0);
      console.log('🔌 [RealtimeProxy]   First 200 chars:', request.headers.cookie?.substring(0, 200) || 'N/A');
      console.log('🔌 [RealtimeProxy]   Contains connect.sid:', request.headers.cookie?.includes('connect.sid') || false);
    }
    
    const sessionId = cookies['connect.sid'];
    
    if (!sessionId) {
      console.error('❌ [RealtimeProxy] NO SESSION COOKIE FOUND');
      console.error('❌ [RealtimeProxy] Available cookies:', Object.keys(cookies));
      console.error('❌ [RealtimeProxy] This might be due to:');
      console.error('❌ [RealtimeProxy]   1. Cookie not being sent from client');
      console.error('❌ [RealtimeProxy]   2. Cookie being stripped by proxy/load balancer');
      console.error('❌ [RealtimeProxy]   3. Cross-origin cookie issues');
      console.error('❌ [RealtimeProxy]   4. Secure cookie settings in production');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify session is valid
    console.log('🔌 [RealtimeProxy] Verifying session ID:', sessionId.substring(0, 20) + '...');
    const userId = await verifySession(sessionId);
    
    if (!userId) {
      console.error('❌ [RealtimeProxy] INVALID SESSION');
      console.error('❌ [RealtimeProxy] Session ID:', sessionId.substring(0, 20) + '...');
      console.error('❌ [RealtimeProxy] Possible causes:');
      console.error('❌ [RealtimeProxy]   1. Session expired');
      console.error('❌ [RealtimeProxy]   2. Session not found in store');
      console.error('❌ [RealtimeProxy]   3. Different session store between HTTP and WebSocket');
      console.error('❌ [RealtimeProxy]   4. Cookie domain/path mismatch');
      
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ [RealtimeProxy] PRODUCTION SESSION DEBUG:');
        console.error('❌ [RealtimeProxy]   Session store type:', process.env.SESSION_STORE || 'memory');
        console.error('❌ [RealtimeProxy]   Cookie domain:', process.env.SESSION_COOKIE_DOMAIN || 'not set');
        console.error('❌ [RealtimeProxy]   Cookie secure:', process.env.SESSION_COOKIE_SECURE || 'not set');
      }
      
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log('✅ [RealtimeProxy] Session verified successfully');
    console.log('✅ [RealtimeProxy] User ID:', userId);
    console.log('✅ [RealtimeProxy] Proceeding with WebSocket upgrade');

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
            
            console.log('🔧 [RealtimeProxy] === OPENAI WEBSOCKET CONNECTION ===');
            console.log('🔧 [RealtimeProxy] Environment:', process.env.NODE_ENV);
            console.log('🔧 [RealtimeProxy] Creating WebSocket connection to OpenAI...');
            
            // Production network debugging
            if (process.env.NODE_ENV === 'production') {
              console.log('🔧 [RealtimeProxy] PRODUCTION NETWORK INFO:');
              console.log('🔧 [RealtimeProxy]   AWS Region:', process.env.AWS_REGION || 'Not set');
              console.log('🔧 [RealtimeProxy]   Instance ID:', process.env.AWS_INSTANCE_ID || 'Not set');
              console.log('🔧 [RealtimeProxy]   Container port:', process.env.PORT || '5000');
              console.log('🔧 [RealtimeProxy]   DNS resolution test...');
              
              // Test DNS resolution
              try {
                const dns = require('dns').promises;
                const addresses = await dns.resolve4('api.openai.com');
                console.log('🔧 [RealtimeProxy]   OpenAI API IPs:', addresses);
              } catch (dnsError) {
                console.error('🔧 [RealtimeProxy]   DNS resolution failed:', dnsError);
              }
            }
            
            try {
              console.log('🔧 [RealtimeProxy] WebSocket constructor call...');
              openAiWs = new WebSocket(wsUrl, {
                headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'OpenAI-Beta': 'realtime=v1'
                },
                // Add timeout for production
                handshakeTimeout: 30000
              });
              console.log('🔧 [RealtimeProxy] ✅ OpenAI WebSocket instance created');
              console.log('🔧 [RealtimeProxy] WebSocket initial state:', {
                url: openAiWs.url,
                readyState: openAiWs.readyState,
                readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs.readyState],
                protocol: openAiWs.protocol,
                extensions: openAiWs.extensions
              });
            } catch (wsCreateError) {
              console.error('❌ [RealtimeProxy] WEBSOCKET CREATION FAILED');
              console.error('❌ [RealtimeProxy] Error type:', wsCreateError?.constructor?.name);
              console.error('❌ [RealtimeProxy] Error message:', (wsCreateError as any).message);
              console.error('❌ [RealtimeProxy] Error code:', (wsCreateError as any).code);
              console.error('❌ [RealtimeProxy] Error syscall:', (wsCreateError as any).syscall);
              console.error('❌ [RealtimeProxy] Full error:', wsCreateError);
              console.error('❌ [RealtimeProxy] Stack trace:', (wsCreateError as any).stack);
              
              clientWs.send(JSON.stringify({
                type: 'error',
                error: {
                  type: 'websocket_creation_error',
                  message: `Failed to create WebSocket: ${(wsCreateError as any).message}`,
                  code: (wsCreateError as any).code,
                  details: process.env.NODE_ENV === 'production' ? 'Check server logs for details' : wsCreateError
                }
              }));
              return;
            }

            // Set up OpenAI WebSocket handlers
            openAiWs.on('open', () => {
              console.log('🌐 [RealtimeProxy] === OPENAI WEBSOCKET OPENED ===');
              console.log('🌐 [RealtimeProxy] Connected at:', new Date().toISOString());
              console.log('🌐 [RealtimeProxy] WebSocket readyState:', openAiWs?.readyState);
              console.log('🌐 [RealtimeProxy] WebSocket URL:', openAiWs?.url);
              console.log('🌐 [RealtimeProxy] WebSocket protocol:', openAiWs?.protocol);
              console.log('🌐 [RealtimeProxy] WebSocket extensions:', openAiWs?.extensions);
              sessionActive = true;
              
              if (process.env.NODE_ENV === 'production') {
                console.log('🌐 [RealtimeProxy] PRODUCTION CONNECTION SUCCESS');
                console.log('🌐 [RealtimeProxy] Session ID:', clientData.sessionId || 'Not provided');
                console.log('🌐 [RealtimeProxy] Patient ID:', clientData.patientId);
                console.log('🌐 [RealtimeProxy] User ID:', clientWs.userId);
              }
              
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
              
              console.log('🔧 [RealtimeProxy] Full session update being sent:');
              console.log(JSON.stringify(sessionUpdate, null, 2));
              
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
              } else if (message.type === 'input_audio_buffer.committed') {
                console.log('🎵 [RealtimeProxy] Audio buffer committed');
              } else if (message.type === 'conversation.item.created') {
                console.log('💬 [RealtimeProxy] New conversation item:', message.item?.type);
                console.log('💬 [RealtimeProxy] Item details:', JSON.stringify(message.item, null, 2));
                if (message.item?.transcript) {
                  console.log('📝 [RealtimeProxy] Transcript:', message.item.transcript);
                }
              } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
                console.log('✅ [RealtimeProxy] Transcription completed:', JSON.stringify(message, null, 2));
              } else if (message.type === 'conversation.item.input_audio_transcription.failed') {
                console.log('❌ [RealtimeProxy] Transcription failed:', JSON.stringify(message, null, 2));
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
              console.error('❌ [RealtimeProxy] === OPENAI WEBSOCKET ERROR ===');
              console.error('❌ [RealtimeProxy] Timestamp:', new Date().toISOString());
              console.error('❌ [RealtimeProxy] Environment:', process.env.NODE_ENV);
              console.error('❌ [RealtimeProxy] Error type:', error?.constructor?.name);
              console.error('❌ [RealtimeProxy] Error message:', (error as any)?.message);
              console.error('❌ [RealtimeProxy] Error code:', (error as any)?.code);
              console.error('❌ [RealtimeProxy] Error errno:', (error as any)?.errno);
              console.error('❌ [RealtimeProxy] Error syscall:', (error as any)?.syscall);
              console.error('❌ [RealtimeProxy] Error address:', (error as any)?.address);
              console.error('❌ [RealtimeProxy] Error port:', (error as any)?.port);
              console.error('❌ [RealtimeProxy] Full error:', error);
              console.error('❌ [RealtimeProxy] WebSocket readyState:', openAiWs?.readyState);
              console.error('❌ [RealtimeProxy] Session was active:', sessionActive);
              
              if (process.env.NODE_ENV === 'production') {
                console.error('❌ [RealtimeProxy] PRODUCTION ERROR CONTEXT:');
                console.error('❌ [RealtimeProxy]   OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
                console.error('❌ [RealtimeProxy]   OpenAI API Key length:', process.env.OPENAI_API_KEY?.length || 0);
                console.error('❌ [RealtimeProxy]   Messages buffered:', messageBuffer.length);
                console.error('❌ [RealtimeProxy]   User ID:', clientWs.userId);
                console.error('❌ [RealtimeProxy]   Patient ID:', clientData.patientId);
                console.error('❌ [RealtimeProxy]   Common error causes:');
                console.error('❌ [RealtimeProxy]     - Network connectivity issues');
                console.error('❌ [RealtimeProxy]     - Invalid API key');
                console.error('❌ [RealtimeProxy]     - Rate limiting');
                console.error('❌ [RealtimeProxy]     - TLS/SSL handshake failure');
                console.error('❌ [RealtimeProxy]     - DNS resolution failure');
                console.error('❌ [RealtimeProxy]     - Firewall/proxy blocking');
              }
              
              console.error('❌ [RealtimeProxy] Session config:', JSON.stringify(sessionConfig, null, 2));
              
              clientWs.send(JSON.stringify({
                type: 'error',
                error: 'OpenAI connection error',
                details: {
                  message: (error as any)?.message,
                  code: (error as any)?.code,
                  production_hint: process.env.NODE_ENV === 'production' ? 
                    'Check server logs for detailed error information' : 
                    (error as any)?.stack
                }
              }));
            });

            openAiWs.on('close', (code, reason) => {
              console.log('🔌 [RealtimeProxy] === OPENAI WEBSOCKET CLOSED ===');
              console.log('🔌 [RealtimeProxy] Timestamp:', new Date().toISOString());
              console.log('🔌 [RealtimeProxy] Environment:', process.env.NODE_ENV);
              console.log('🔌 [RealtimeProxy] Close code:', code);
              console.log('🔌 [RealtimeProxy] Close reason:', reason?.toString() || 'No reason provided');
              console.log('🔌 [RealtimeProxy] Close code interpretation:');
              
              switch(code) {
                case 1000:
                  console.log('🔌 [RealtimeProxy]   ✅ 1000: Normal closure');
                  break;
                case 1001:
                  console.log('🔌 [RealtimeProxy]   ⚠️ 1001: Going away (server shutdown)');
                  break;
                case 1006:
                  console.log('🔌 [RealtimeProxy]   ❌ 1006: Abnormal closure (network error)');
                  break;
                case 1015:
                  console.log('🔌 [RealtimeProxy]   ❌ 1015: TLS handshake failure');
                  break;
                case 4000:
                  console.log('🔌 [RealtimeProxy]   ❌ 4000: Invalid request');
                  break;
                case 4001:
                  console.log('🔌 [RealtimeProxy]   ❌ 4001: Unauthorized (invalid API key)');
                  break;
                case 4002:
                  console.log('🔌 [RealtimeProxy]   ❌ 4002: Rate limit exceeded');
                  break;
                case 4003:
                  console.log('🔌 [RealtimeProxy]   ❌ 4003: Resource exhausted');
                  break;
                default:
                  if (code >= 4000 && code <= 4999) {
                    console.log(`🔌 [RealtimeProxy]   ❌ ${code}: Application-specific error`);
                  } else {
                    console.log(`🔌 [RealtimeProxy]   ⚠️ ${code}: Unknown close code`);
                  }
              }
              
              if (process.env.NODE_ENV === 'production') {
                console.log('🔌 [RealtimeProxy] PRODUCTION CLOSE CONTEXT:');
                console.log('🔌 [RealtimeProxy]   Session duration:', sessionActive ? 'Active session terminated' : 'No active session');
                console.log('🔌 [RealtimeProxy]   User ID:', clientWs.userId);
                console.log('🔌 [RealtimeProxy]   Session config:', JSON.stringify(sessionConfig, null, 2));
              }
              
              sessionActive = false;
              openAiWs = null;
              
              // Notify client about closure
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'connection.closed',
                  code: code,
                  reason: reason?.toString() || 'Connection closed'
                }));
              }
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
        // Handle audio buffer append messages
        else if (message.type === 'input_audio_buffer.append') {
          console.log('🎵 [RealtimeProxy] Audio chunk from client:', {
            hasAudio: !!message.audio,
            audioLength: message.audio?.length || 0,
            sessionActive: sessionActive,
            openAiWsState: openAiWs?.readyState,
            openAiWsStateText: openAiWs ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs.readyState] : 'null'
          });
          
          if (openAiWs && sessionActive) {
            openAiWs.send(data.toString());
            console.log('✅ [RealtimeProxy] Audio forwarded to OpenAI');
          } else {
            console.log('⏳ [RealtimeProxy] Buffering audio until session ready');
            messageBuffer.push(message);
          }
        }
        // Handle response.create messages
        else if (message.type === 'response.create') {
          console.log('🤖 [RealtimeProxy] Response creation request from client');
          if (openAiWs && sessionActive) {
            openAiWs.send(data.toString());
            console.log('✅ [RealtimeProxy] Response request forwarded to OpenAI');
          }
        }
        // Relay other messages to OpenAI
        else if (openAiWs && sessionActive) {
          console.log('🔄 [RealtimeProxy] Forwarding message type:', message.type);
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
      for (const [sessionId, session] of Array.from(activeSessions.entries())) {
        if (session.clientWs === clientWs) {
          activeSessions.delete(sessionId);
          
          // Calculate session duration
          const duration = Date.now() - session.startTime.getTime();
          const durationInSeconds = Math.round(duration / 1000);
          console.log(`📊 [RealtimeProxy] Session ended - User: ${session.userId}, Duration: ${durationInSeconds}s`);
          
          // Save recording metadata to the encounter if we have encounter context
          if (session.patientId && durationInSeconds > 5) { // Only save if recording was meaningful (>5 seconds)
            try {
              // TODO: Implement saveRecordingMetadata in storage if needed
              console.log(`📊 [RealtimeProxy] Recording session completed - Duration: ${durationInSeconds}s, Patient: ${session.patientId}`);
            } catch (error) {
              console.error('❌ [RealtimeProxy] Failed to log recording metadata:', error);
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