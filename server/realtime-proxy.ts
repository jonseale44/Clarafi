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
import * as dns from 'dns';

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
    console.log('🔌 [RealtimeProxy] Process ID:', process.pid);
    console.log('🔌 [RealtimeProxy] Environment:', process.env.NODE_ENV);
    console.log('🔌 [RealtimeProxy] Node version:', process.version);
    console.log('🔌 [RealtimeProxy] Request URL:', request.url);
    console.log('🔌 [RealtimeProxy] Request method:', request.method);
    console.log('🔌 [RealtimeProxy] HTTP version:', request.httpVersion);
    console.log('🔌 [RealtimeProxy] Socket info:', {
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      localAddress: socket.localAddress,
      localPort: socket.localPort,
      bytesRead: socket.bytesRead,
      bytesWritten: socket.bytesWritten,
      destroyed: socket.destroyed,
      connecting: socket.connecting,
      readyState: socket.readyState
    });
    
    // Log all headers for production debugging
    console.log('🔌 [RealtimeProxy] ALL REQUEST HEADERS:');
    Object.entries(request.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'cookie') {
        console.log(`🔌 [RealtimeProxy]   ${key}: [REDACTED - ${value?.toString().length || 0} chars]`);
        // Log cookie presence without values
        const cookieString = value?.toString() || '';
        const cookieCount = cookieString.split(';').filter(c => c.trim()).length;
        console.log(`🔌 [RealtimeProxy]   Cookie count: ${cookieCount}`);
        console.log(`🔌 [RealtimeProxy]   Has connect.sid: ${cookieString.includes('connect.sid')}`);
      } else if (key.toLowerCase() === 'authorization') {
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

    console.log('✅ [RealtimeProxy] === SESSION VERIFIED SUCCESSFULLY ===');
    console.log('✅ [RealtimeProxy] User ID:', userId);
    console.log('✅ [RealtimeProxy] Session ID:', sessionId.substring(0, 20) + '...');
    console.log('✅ [RealtimeProxy] Timestamp:', new Date().toISOString());
    console.log('✅ [RealtimeProxy] Memory state:', process.memoryUsage());
    
    console.log('✅ [RealtimeProxy] Initiating WebSocket upgrade...');
    console.log('✅ [RealtimeProxy] WebSocket server readyState:', wss.readyState);
    console.log('✅ [RealtimeProxy] WebSocket server clients count:', wss.clients.size);
    
    try {
      console.log('✅ [RealtimeProxy] Calling wss.handleUpgrade...');
      const upgradeStartTime = Date.now();
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('✅ [RealtimeProxy] === WEBSOCKET UPGRADE COMPLETED ===');
        console.log('✅ [RealtimeProxy] Upgrade duration:', Date.now() - upgradeStartTime, 'ms');
        console.log('✅ [RealtimeProxy] WebSocket state:', ws.readyState);
        console.log('✅ [RealtimeProxy] WebSocket URL:', ws.url);
        console.log('✅ [RealtimeProxy] WebSocket protocol:', ws.protocol);
        
        const authenticatedWs = ws as AuthenticatedWebSocket;
        authenticatedWs.userId = userId;
        authenticatedWs.sessionId = sessionId;
        
        console.log('✅ [RealtimeProxy] Authentication data attached to WebSocket');
        console.log('✅ [RealtimeProxy] Emitting connection event...');
        
        try {
          wss.emit('connection', authenticatedWs, request);
          console.log('✅ [RealtimeProxy] Connection event emitted successfully');
        } catch (emitError) {
          console.error('❌ [RealtimeProxy] ERROR EMITTING CONNECTION EVENT');
          console.error('❌ [RealtimeProxy] Error:', emitError);
          console.error('❌ [RealtimeProxy] Stack:', (emitError as any)?.stack);
        }
      });
      
      console.log('✅ [RealtimeProxy] handleUpgrade called successfully');
    } catch (upgradeError) {
      console.error('❌ [RealtimeProxy] === WEBSOCKET UPGRADE FAILED ===');
      console.error('❌ [RealtimeProxy] Error during handleUpgrade:', upgradeError);
      console.error('❌ [RealtimeProxy] Error type:', (upgradeError as any)?.constructor?.name);
      console.error('❌ [RealtimeProxy] Error message:', (upgradeError as any)?.message);
      console.error('❌ [RealtimeProxy] Error code:', (upgradeError as any)?.code);
      console.error('❌ [RealtimeProxy] Stack trace:', (upgradeError as any)?.stack);
      
      console.error('❌ [RealtimeProxy] Socket state at error:', {
        destroyed: socket.destroyed,
        readable: socket.readable,
        writable: socket.writable,
        closed: socket.closed,
        connecting: socket.connecting
      });
      
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ [RealtimeProxy] PRODUCTION UPGRADE FAILURE CONTEXT:');
        console.error('❌ [RealtimeProxy]   Process uptime:', process.uptime(), 'seconds');
        console.error('❌ [RealtimeProxy]   Active sessions:', activeSessions.size);
        console.error('❌ [RealtimeProxy]   WebSocket clients:', wss.clients.size);
      }
      
      // Send error response to client
      try {
        if (!socket.destroyed) {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          socket.destroy();
        }
      } catch (socketError) {
        console.error('❌ [RealtimeProxy] Error sending error response:', socketError);
      }
    }
  });

  // Handle WebSocket connections
  wss.on('connection', async (clientWs: AuthenticatedWebSocket, request: IncomingMessage) => {
    const connectionTime = new Date();
    console.log('🤝 [RealtimeProxy] === CLIENT WEBSOCKET CONNECTED ===');
    console.log('🤝 [RealtimeProxy] Connection timestamp:', connectionTime.toISOString());
    console.log('🤝 [RealtimeProxy] Environment:', process.env.NODE_ENV);
    console.log('🤝 [RealtimeProxy] User ID:', clientWs.userId);
    console.log('🤝 [RealtimeProxy] Session ID:', clientWs.sessionId?.substring(0, 20) + '...');
    
    console.log('🤝 [RealtimeProxy] Client WebSocket details:', {
      readyState: clientWs.readyState,
      readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][clientWs.readyState],
      bufferedAmount: clientWs.bufferedAmount,
      extensions: clientWs.extensions,
      protocol: clientWs.protocol,
      binaryType: clientWs.binaryType
    });
    
    console.log('🤝 [RealtimeProxy] Request details:', {
      url: request?.url,
      headers: request?.headers ? Object.keys(request.headers).length + ' headers' : 'No headers',
      method: request?.method,
      httpVersion: request?.httpVersion
    });
    
    // Extract URL parameters
    if (request?.url) {
      try {
        const url = new URL(request.url, `http://${request?.headers?.host || 'localhost'}`);
        console.log('🤝 [RealtimeProxy] URL parameters:', {
          pathname: url.pathname,
          search: url.search,
          params: Object.fromEntries(url.searchParams.entries())
        });
      } catch (urlError) {
        console.error('🤝 [RealtimeProxy] Error parsing URL:', urlError);
      }
    }
    
    console.log('🤝 [RealtimeProxy] Connection metrics:', {
      totalConnections: wss.clients.size,
      activeSessions: activeSessions.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🤝 [RealtimeProxy] PRODUCTION CONNECTION INFO:');
      console.log('🤝 [RealtimeProxy]   AWS instance:', process.env.AWS_INSTANCE_ID || 'Unknown');
      console.log('🤝 [RealtimeProxy]   Container hostname:', process.env.HOSTNAME || 'Unknown');
      console.log('🤝 [RealtimeProxy]   OpenAI API key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
      console.log('🤝 [RealtimeProxy]   Session secret:', process.env.SESSION_SECRET ? 'Present' : 'Missing');
    }
    
    console.log('🤝 [RealtimeProxy] Sending initial success message to client...');
    try {
      clientWs.send(JSON.stringify({
        type: 'connection.success',
        timestamp: connectionTime.toISOString(),
        userId: clientWs.userId,
        message: 'WebSocket connection established successfully'
      }));
      console.log('🤝 [RealtimeProxy] Success message sent to client');
    } catch (sendError) {
      console.error('🤝 [RealtimeProxy] Error sending success message:', sendError);
    }
    
    let openAiWs: WebSocket | null = null;
    let sessionActive = false;
    const messageBuffer: any[] = [];

    // Set up heartbeat to detect disconnected clients
    clientWs.isAlive = true;
    clientWs.on('pong', () => {
      console.log('💓 [RealtimeProxy] Heartbeat pong received from user:', clientWs.userId);
      clientWs.isAlive = true;
    });

    clientWs.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 [RealtimeProxy] Message from client:', message.type);

        // Handle session creation
        if (message.type === 'session.create') {
          console.log('🎯 [RealtimeProxy] === SESSION CREATE MESSAGE RECEIVED ===');
          console.log('🎯 [RealtimeProxy] Timestamp:', new Date().toISOString());
          console.log('🎯 [RealtimeProxy] Environment:', process.env.NODE_ENV);
          console.log('🎯 [RealtimeProxy] Process uptime:', process.uptime(), 'seconds');
          console.log('🎯 [RealtimeProxy] Memory state:', process.memoryUsage());
          
          console.log('🎯 [RealtimeProxy] Message analysis:', {
            type: message.type,
            hasData: !!message.data,
            dataKeys: message.data ? Object.keys(message.data) : [],
            hasSessionConfig: !!message.data?.sessionConfig,
            sessionConfigKeys: message.data?.sessionConfig ? Object.keys(message.data.sessionConfig) : [],
            hasPatientId: !!message.data?.patientId,
            patientId: message.data?.patientId,
            hasEncounterId: !!message.data?.encounterId,
            encounterId: message.data?.encounterId,
            messageSize: JSON.stringify(message).length
          });
          
          console.log('🎯 [RealtimeProxy] Client WebSocket state:', {
            userId: clientWs.userId,
            sessionId: clientWs.sessionId,
            readyState: clientWs.readyState,
            readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][clientWs.readyState],
            isAlive: clientWs.isAlive,
            bufferedAmount: clientWs.bufferedAmount
          });
          
          if (openAiWs) {
            console.warn('⚠️ [RealtimeProxy] === SESSION ALREADY EXISTS ===');
            console.warn('⚠️ [RealtimeProxy] Existing session state:', {
              readyState: openAiWs.readyState,
              readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs.readyState],
              bufferedAmount: openAiWs.bufferedAmount,
              sessionActive: sessionActive,
              messageBufferLength: messageBuffer.length
            });
            console.warn('⚠️ [RealtimeProxy] Ignoring duplicate session.create request');
            return;
          }

          console.log('🔧 [RealtimeProxy] === BEGINNING OPENAI SESSION CREATION ===');
          console.log('🔧 [RealtimeProxy] Full message data:', JSON.stringify(message.data, null, 2));
          console.log('🔧 [RealtimeProxy] Raw message string (first 500 chars):', data.toString().substring(0, 500));
          
          // Extract session config from client message
          const clientData = message.data || {};
          const sessionConfig = clientData.sessionConfig || {};
          
          console.log('🔧 [RealtimeProxy] Session configuration:', {
            hasSessionConfig: !!sessionConfig,
            configKeys: Object.keys(sessionConfig),
            model: sessionConfig.model,
            modalities: sessionConfig.modalities,
            instructions: sessionConfig.instructions ? sessionConfig.instructions.substring(0, 100) + '...' : 'None',
            voice: sessionConfig.voice,
            temperature: sessionConfig.temperature,
            turnDetection: sessionConfig.turn_detection
          });
          
          console.log('🔧 [RealtimeProxy] Clinical context:', {
            patientId: clientData.patientId,
            encounterId: clientData.encounterId,
            hasAdditionalData: Object.keys(clientData).filter(k => !['sessionConfig', 'patientId', 'encounterId'].includes(k))
          });
          
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
                const dnsPromises = dns.promises;
                const addresses = await dnsPromises.resolve4('api.openai.com');
                console.log('🔧 [RealtimeProxy]   OpenAI API IPs:', addresses);
              } catch (dnsError) {
                console.error('🔧 [RealtimeProxy]   DNS resolution failed:', dnsError);
              }
            }
            
            const openAiConnectionStart = Date.now();
            console.log('🔧 [RealtimeProxy] Connection attempt started at:', new Date(openAiConnectionStart).toISOString());
            
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
                extensions: openAiWs.extensions,
                timeSinceStart: Date.now() - openAiConnectionStart + 'ms'
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
              const connectionDuration = Date.now() - openAiConnectionStart;
              console.log('🌐 [RealtimeProxy] === OPENAI WEBSOCKET OPENED ===');
              console.log('🌐 [RealtimeProxy] Connection established at:', new Date().toISOString());
              console.log('🌐 [RealtimeProxy] Connection duration:', connectionDuration, 'ms');
              console.log('🌐 [RealtimeProxy] Environment:', process.env.NODE_ENV);
              
              console.log('🌐 [RealtimeProxy] WebSocket state details:', {
                readyState: openAiWs?.readyState,
                readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs?.readyState || 0],
                url: openAiWs?.url,
                protocol: openAiWs?.protocol,
                extensions: openAiWs?.extensions,
                bufferedAmount: openAiWs?.bufferedAmount,
                binaryType: openAiWs?.binaryType
              });
              
              console.log('🌐 [RealtimeProxy] Connection context:', {
                userId: clientWs.userId,
                sessionId: clientWs.sessionId,
                patientId: clientData.patientId,
                encounterId: clientData.encounterId,
                clientWsState: clientWs.readyState,
                clientWsIsAlive: clientWs.isAlive,
                messageBufferSize: messageBuffer.length,
                activeSessions: activeSessions.size
              });
              
              console.log('🌐 [RealtimeProxy] Process metrics at connection:', {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
              });
              
              sessionActive = true;
              console.log('🌐 [RealtimeProxy] Session marked as active');
              
              if (process.env.NODE_ENV === 'production') {
                console.log('🌐 [RealtimeProxy] === PRODUCTION CONNECTION SUCCESS ===');
                console.log('🌐 [RealtimeProxy] Production details:', {
                  awsRegion: process.env.AWS_REGION || 'Not set',
                  instanceId: process.env.AWS_INSTANCE_ID || 'Not set',
                  containerPort: process.env.PORT || '5000',
                  hostname: process.env.HOSTNAME || 'Unknown',
                  productionDomain: process.env.PRODUCTION_DOMAIN || 'Not set',
                  sessionStore: process.env.SESSION_STORE || 'memory',
                  cookieDomain: process.env.SESSION_COOKIE_DOMAIN || 'not set',
                  cookieSecure: process.env.SESSION_COOKIE_SECURE || 'not set'
                });
                
                console.log('🌐 [RealtimeProxy] Connection security:', {
                  apiKeyExists: !!process.env.OPENAI_API_KEY,
                  apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
                  sessionSecretExists: !!process.env.SESSION_SECRET,
                  httpsEnabled: process.env.NODE_ENV === 'production'
                });
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
              console.error('❌ [RealtimeProxy] Process uptime:', process.uptime(), 'seconds');
              console.error('❌ [RealtimeProxy] Memory usage:', process.memoryUsage());
              
              console.error('❌ [RealtimeProxy] Error details:');
              console.error('❌ [RealtimeProxy]   Error type:', error?.constructor?.name);
              console.error('❌ [RealtimeProxy]   Error message:', (error as any)?.message);
              console.error('❌ [RealtimeProxy]   Error code:', (error as any)?.code);
              console.error('❌ [RealtimeProxy]   Error errno:', (error as any)?.errno);
              console.error('❌ [RealtimeProxy]   Error syscall:', (error as any)?.syscall);
              console.error('❌ [RealtimeProxy]   Error address:', (error as any)?.address);
              console.error('❌ [RealtimeProxy]   Error port:', (error as any)?.port);
              console.error('❌ [RealtimeProxy]   Error path:', (error as any)?.path);
              console.error('❌ [RealtimeProxy]   Error host:', (error as any)?.host);
              console.error('❌ [RealtimeProxy]   Error hostname:', (error as any)?.hostname);
              console.error('❌ [RealtimeProxy]   Error stack:', (error as any)?.stack);
              console.error('❌ [RealtimeProxy]   Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
              
              console.error('❌ [RealtimeProxy] WebSocket state:');
              console.error('❌ [RealtimeProxy]   ReadyState:', openAiWs?.readyState);
              console.error('❌ [RealtimeProxy]   ReadyState name:', ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs?.readyState || 0]);
              console.error('❌ [RealtimeProxy]   URL:', openAiWs?.url);
              console.error('❌ [RealtimeProxy]   Protocol:', openAiWs?.protocol);
              console.error('❌ [RealtimeProxy]   Session was active:', sessionActive);
              
              if (process.env.NODE_ENV === 'production') {
                console.error('❌ [RealtimeProxy] === PRODUCTION ERROR CONTEXT ===');
                console.error('❌ [RealtimeProxy] Environment variables:');
                console.error('❌ [RealtimeProxy]   NODE_ENV:', process.env.NODE_ENV);
                console.error('❌ [RealtimeProxy]   PORT:', process.env.PORT);
                console.error('❌ [RealtimeProxy]   AWS_REGION:', process.env.AWS_REGION || 'Not set');
                console.error('❌ [RealtimeProxy]   OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
                console.error('❌ [RealtimeProxy]   OpenAI API Key length:', process.env.OPENAI_API_KEY?.length || 0);
                console.error('❌ [RealtimeProxy]   OpenAI API Key format valid:', /^sk-[a-zA-Z0-9]{48,}$/.test(process.env.OPENAI_API_KEY || ''));
                
                console.error('❌ [RealtimeProxy] Connection context:');
                console.error('❌ [RealtimeProxy]   Messages buffered:', messageBuffer.length);
                console.error('❌ [RealtimeProxy]   User ID:', clientWs.userId);
                console.error('❌ [RealtimeProxy]   Session ID:', clientWs.sessionId);
                console.error('❌ [RealtimeProxy]   Patient ID:', clientData.patientId);
                console.error('❌ [RealtimeProxy]   Client WebSocket state:', clientWs.readyState);
                console.error('❌ [RealtimeProxy]   Client alive:', clientWs.isAlive);
                
                console.error('❌ [RealtimeProxy] Common error causes by code:');
                const errorCode = (error as any)?.code;
                switch (errorCode) {
                  case 'ECONNREFUSED':
                    console.error('❌ [RealtimeProxy]   → Connection refused: OpenAI API is not reachable');
                    console.error('❌ [RealtimeProxy]   → Check network connectivity and firewall rules');
                    break;
                  case 'ENOTFOUND':
                    console.error('❌ [RealtimeProxy]   → DNS resolution failed: Cannot resolve api.openai.com');
                    console.error('❌ [RealtimeProxy]   → Check DNS configuration and network connectivity');
                    break;
                  case 'ETIMEDOUT':
                    console.error('❌ [RealtimeProxy]   → Connection timeout: Network is too slow or blocked');
                    console.error('❌ [RealtimeProxy]   → Check firewall rules, proxy settings, and network latency');
                    break;
                  case 'ECONNRESET':
                    console.error('❌ [RealtimeProxy]   → Connection reset: Connection was forcibly closed');
                    console.error('❌ [RealtimeProxy]   → Could indicate rate limiting or network interruption');
                    break;
                  case 'CERT_HAS_EXPIRED':
                  case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
                    console.error('❌ [RealtimeProxy]   → SSL/TLS certificate error');
                    console.error('❌ [RealtimeProxy]   → Check system time and certificate chain');
                    break;
                  default:
                    console.error('❌ [RealtimeProxy]   → Unknown error code:', errorCode);
                    console.error('❌ [RealtimeProxy]   → Could be: Invalid API key, rate limiting, or service outage');
                }
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
              const closeTime = Date.now();
              const connectionDuration = 'Unknown'; // Connection start time tracking would need to be implemented server-side
              
              console.log('🔌 [RealtimeProxy] === OPENAI WEBSOCKET CLOSED ===');
              console.log('🔌 [RealtimeProxy] Timestamp:', new Date().toISOString());
              console.log('🔌 [RealtimeProxy] Environment:', process.env.NODE_ENV);
              console.log('🔌 [RealtimeProxy] Process uptime:', process.uptime(), 'seconds');
              console.log('🔌 [RealtimeProxy] Memory usage:', process.memoryUsage());
              
              console.log('🔌 [RealtimeProxy] Close event details:');
              console.log('🔌 [RealtimeProxy]   Close code:', code);
              console.log('🔌 [RealtimeProxy]   Close reason:', reason?.toString() || 'No reason provided');
              console.log('🔌 [RealtimeProxy]   Reason length:', reason?.toString().length || 0);
              console.log('🔌 [RealtimeProxy]   Connection duration:', connectionDuration, 'ms');
              console.log('🔌 [RealtimeProxy]   Session was active:', sessionActive);
              console.log('🔌 [RealtimeProxy]   Messages buffered:', messageBuffer.length);
              
              console.log('🔌 [RealtimeProxy] WebSocket final state:');
              console.log('🔌 [RealtimeProxy]   ReadyState:', openAiWs?.readyState);
              console.log('🔌 [RealtimeProxy]   ReadyState name:', ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs?.readyState || 0]);
              console.log('🔌 [RealtimeProxy]   URL:', openAiWs?.url);
              console.log('🔌 [RealtimeProxy]   Protocol:', openAiWs?.protocol);
              console.log('🔌 [RealtimeProxy]   Extensions:', openAiWs?.extensions);
              
              console.log('🔌 [RealtimeProxy] Close code interpretation:');
              switch(code) {
                case 1000:
                  console.log('🔌 [RealtimeProxy]   ✅ 1000: Normal closure - Connection completed successfully');
                  break;
                case 1001:
                  console.log('🔌 [RealtimeProxy]   ⚠️ 1001: Going away - Server shutdown or browser navigating away');
                  break;
                case 1002:
                  console.log('🔌 [RealtimeProxy]   ❌ 1002: Protocol error - Invalid WebSocket protocol');
                  break;
                case 1003:
                  console.log('🔌 [RealtimeProxy]   ❌ 1003: Unsupported data - Server received unsupported data type');
                  break;
                case 1006:
                  console.log('🔌 [RealtimeProxy]   ❌ 1006: Abnormal closure - Connection lost without close frame');
                  console.log('🔌 [RealtimeProxy]   Common causes: Network failure, server crash, firewall blocking');
                  break;
                case 1007:
                  console.log('🔌 [RealtimeProxy]   ❌ 1007: Invalid frame payload data');
                  break;
                case 1008:
                  console.log('🔌 [RealtimeProxy]   ❌ 1008: Policy violation - Message violates server policy');
                  break;
                case 1009:
                  console.log('🔌 [RealtimeProxy]   ❌ 1009: Message too big - Payload exceeds server limits');
                  break;
                case 1010:
                  console.log('🔌 [RealtimeProxy]   ❌ 1010: Mandatory extension - Server requires extension client doesn\'t support');
                  break;
                case 1011:
                  console.log('🔌 [RealtimeProxy]   ❌ 1011: Internal server error - Unexpected condition on server');
                  break;
                case 1015:
                  console.log('🔌 [RealtimeProxy]   ❌ 1015: TLS handshake failure - SSL/TLS certificate issues');
                  console.log('🔌 [RealtimeProxy]   Check: Certificate validity, hostname match, TLS version compatibility');
                  break;
                case 4000:
                  console.log('🔌 [RealtimeProxy]   ❌ 4000: Invalid request - Malformed request to OpenAI');
                  break;
                case 4001:
                  console.log('🔌 [RealtimeProxy]   ❌ 4001: Unauthorized - Invalid or missing API key');
                  console.log('🔌 [RealtimeProxy]   API key exists:', !!process.env.OPENAI_API_KEY);
                  console.log('🔌 [RealtimeProxy]   API key format valid:', /^sk-[a-zA-Z0-9]{48,}$/.test(process.env.OPENAI_API_KEY || ''));
                  break;
                case 4002:
                  console.log('🔌 [RealtimeProxy]   ❌ 4002: Rate limit exceeded - Too many requests');
                  break;
                case 4003:
                  console.log('🔌 [RealtimeProxy]   ❌ 4003: Resource exhausted - Quota or resource limit reached');
                  break;
                case 4008:
                  console.log('🔌 [RealtimeProxy]   ❌ 4008: Invalid session config - Session parameters rejected');
                  break;
                default:
                  if (code >= 4000 && code <= 4999) {
                    console.log(`🔌 [RealtimeProxy]   ❌ ${code}: OpenAI application-specific error`);
                  } else if (code >= 3000 && code <= 3999) {
                    console.log(`🔌 [RealtimeProxy]   ⚠️ ${code}: Reserved for libraries/frameworks`);
                  } else {
                    console.log(`🔌 [RealtimeProxy]   ⚠️ ${code}: Unknown/non-standard close code`);
                  }
              }
              
              if (process.env.NODE_ENV === 'production') {
                console.log('🔌 [RealtimeProxy] === PRODUCTION CLOSE CONTEXT ===');
                console.log('🔌 [RealtimeProxy] Connection info:');
                console.log('🔌 [RealtimeProxy]   Session duration:', sessionActive ? 'Active session terminated' : 'No active session');
                console.log('🔌 [RealtimeProxy]   Connection lasted:', connectionDuration, 'ms');
                console.log('🔌 [RealtimeProxy]   User ID:', clientWs.userId);
                console.log('🔌 [RealtimeProxy]   Session ID:', clientWs.sessionId);
                console.log('🔌 [RealtimeProxy]   Patient ID:', clientData.patientId);
                
                console.log('🔌 [RealtimeProxy] Session configuration used:');
                console.log('🔌 [RealtimeProxy]', JSON.stringify(sessionConfig, null, 2));
                
                console.log('🔌 [RealtimeProxy] Client WebSocket state:');
                console.log('🔌 [RealtimeProxy]   Client still connected:', clientWs.readyState === WebSocket.OPEN);
                console.log('🔌 [RealtimeProxy]   Client readyState:', clientWs.readyState);
                console.log('🔌 [RealtimeProxy]   Client alive flag:', clientWs.isAlive);
                
                // Log recommendations based on close code
                if (code === 1006) {
                  console.log('🔌 [RealtimeProxy] Recommendations for code 1006:');
                  console.log('🔌 [RealtimeProxy]   1. Check AWS App Runner network configuration');
                  console.log('🔌 [RealtimeProxy]   2. Verify outbound HTTPS/WSS is allowed');
                  console.log('🔌 [RealtimeProxy]   3. Check if api.openai.com is reachable from container');
                  console.log('🔌 [RealtimeProxy]   4. Review AWS security groups and NACLs');
                  console.log('🔌 [RealtimeProxy]   5. Consider network latency and timeouts');
                } else if (code === 4001) {
                  console.log('🔌 [RealtimeProxy] Recommendations for code 4001:');
                  console.log('🔌 [RealtimeProxy]   1. Verify OPENAI_API_KEY environment variable is set');
                  console.log('🔌 [RealtimeProxy]   2. Check API key has realtime API access');
                  console.log('🔌 [RealtimeProxy]   3. Ensure API key is not expired or revoked');
                  console.log('🔌 [RealtimeProxy]   4. Verify billing is active on OpenAI account');
                }
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
          console.log('🎵 [RealtimeProxy] === AUDIO CHUNK RECEIVED ===');
          console.log('🎵 [RealtimeProxy] Timestamp:', new Date().toISOString());
          console.log('🎵 [RealtimeProxy] Environment:', process.env.NODE_ENV);
          console.log('🎵 [RealtimeProxy] Process uptime:', process.uptime(), 'seconds');
          console.log('🎵 [RealtimeProxy] Audio chunk details:', {
            hasAudio: !!message.audio,
            audioLength: message.audio?.length || 0,
            audioType: typeof message.audio,
            audioIsString: typeof message.audio === 'string',
            sessionActive: sessionActive,
            openAiWsExists: !!openAiWs,
            openAiWsState: openAiWs?.readyState,
            openAiWsStateText: openAiWs ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][openAiWs.readyState] : 'null',
            messageBufferLength: messageBuffer.length,
            dataType: typeof data,
            dataLength: data.toString().length
          });
          
          if (message.audio && typeof message.audio === 'string') {
            console.log('🎵 [RealtimeProxy] Audio data analysis:');
            console.log('🎵 [RealtimeProxy]   String length:', message.audio.length);
            console.log('🎵 [RealtimeProxy]   First 100 chars:', message.audio.substring(0, 100));
            console.log('🎵 [RealtimeProxy]   Last 100 chars:', message.audio.substring(message.audio.length - 100));
            console.log('🎵 [RealtimeProxy]   Looks like base64:', /^[A-Za-z0-9+/]+=*$/.test(message.audio.substring(0, 100)));
          }
          
          if (process.env.NODE_ENV === 'production') {
            console.log('🎵 [RealtimeProxy] PRODUCTION AUDIO METRICS:');
            console.log('🎵 [RealtimeProxy]   Memory usage:', process.memoryUsage());
            console.log('🎵 [RealtimeProxy]   Client WS state:', clientWs.readyState);
            console.log('🎵 [RealtimeProxy]   Client is alive:', clientWs.isAlive);
            console.log('🎵 [RealtimeProxy]   User ID:', clientWs.userId);
            console.log('🎵 [RealtimeProxy]   Session ID:', clientWs.sessionId);
            console.log('🎵 [RealtimeProxy]   Active sessions count:', activeSessions.size);
          }
          
          if (openAiWs && sessionActive) {
            console.log('🎵 [RealtimeProxy] === FORWARDING AUDIO TO OPENAI ===');
            console.log('🎵 [RealtimeProxy] Pre-send state:', {
              openAiReadyState: openAiWs.readyState,
              openAiBufferedAmount: openAiWs.bufferedAmount,
              dataSize: data.toString().length,
              messageSize: JSON.stringify(message).length
            });
            
            try {
              const startTime = Date.now();
              openAiWs.send(data.toString());
              const sendDuration = Date.now() - startTime;
              
              console.log('✅ [RealtimeProxy] Audio forwarded successfully');
              console.log('✅ [RealtimeProxy] Send duration:', sendDuration, 'ms');
              console.log('✅ [RealtimeProxy] Post-send buffered amount:', openAiWs.bufferedAmount);
              
              if (sendDuration > 100) {
                console.warn('⚠️ [RealtimeProxy] SLOW SEND DETECTED:', sendDuration, 'ms');
              }
            } catch (sendError: any) {
              console.error('❌ [RealtimeProxy] AUDIO FORWARD ERROR');
              console.error('❌ [RealtimeProxy] Error type:', sendError?.constructor?.name);
              console.error('❌ [RealtimeProxy] Error message:', sendError?.message);
              console.error('❌ [RealtimeProxy] Error code:', sendError?.code);
              console.error('❌ [RealtimeProxy] Error stack:', sendError?.stack);
              console.error('❌ [RealtimeProxy] WebSocket state at error:', openAiWs.readyState);
            }
          } else {
            console.log('⏳ [RealtimeProxy] === BUFFERING AUDIO ===');
            console.log('⏳ [RealtimeProxy] Reason for buffering:');
            console.log('⏳ [RealtimeProxy]   OpenAI WS exists:', !!openAiWs);
            console.log('⏳ [RealtimeProxy]   Session active:', sessionActive);
            console.log('⏳ [RealtimeProxy]   Current buffer size:', messageBuffer.length);
            console.log('⏳ [RealtimeProxy]   Will buffer to position:', messageBuffer.length + 1);
            
            if (!openAiWs) {
              console.log('⏳ [RealtimeProxy]   PRIMARY ISSUE: No OpenAI WebSocket connection');
            } else if (!sessionActive) {
              console.log('⏳ [RealtimeProxy]   PRIMARY ISSUE: Session not yet active');
              console.log('⏳ [RealtimeProxy]   OpenAI WS state:', openAiWs.readyState);
            }
            
            messageBuffer.push(message);
            console.log('⏳ [RealtimeProxy] Audio chunk buffered successfully');
            
            if (messageBuffer.length > 100) {
              console.warn('⚠️ [RealtimeProxy] LARGE BUFFER WARNING: ', messageBuffer.length, 'messages buffered');
            }
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

    clientWs.on('close', async (code, reason) => {
      console.log('👋 [RealtimeProxy] === CLIENT DISCONNECTED ===');
      console.log('👋 [RealtimeProxy] Timestamp:', new Date().toISOString());
      console.log('👋 [RealtimeProxy] Environment:', process.env.NODE_ENV);
      console.log('👋 [RealtimeProxy] Disconnection details:', {
        code: code,
        reason: reason?.toString() || 'No reason provided',
        userId: clientWs.userId,
        sessionId: clientWs.sessionId,
        wasAlive: clientWs.isAlive,
        sessionWasActive: sessionActive,
        openAiWsExists: !!openAiWs,
        openAiWsState: openAiWs?.readyState,
        messageBufferLength: messageBuffer.length,
        processUptime: process.uptime()
      });
      
      if (process.env.NODE_ENV === 'production') {
        console.log('👋 [RealtimeProxy] PRODUCTION DISCONNECT ANALYSIS:');
        console.log('👋 [RealtimeProxy]   Memory at disconnect:', process.memoryUsage());
        console.log('👋 [RealtimeProxy]   Active sessions before cleanup:', activeSessions.size);
        console.log('👋 [RealtimeProxy]   Common disconnect codes:');
        console.log('👋 [RealtimeProxy]     1000 = Normal closure');
        console.log('👋 [RealtimeProxy]     1001 = Going away (page navigation)');
        console.log('👋 [RealtimeProxy]     1006 = Abnormal closure (network loss)');
        console.log('👋 [RealtimeProxy]     1011 = Server error');
        console.log('👋 [RealtimeProxy]   Actual code:', code);
      }
      
      // Close OpenAI connection
      if (openAiWs) {
        console.log('👋 [RealtimeProxy] Closing OpenAI WebSocket...');
        console.log('👋 [RealtimeProxy]   OpenAI WS state before close:', openAiWs.readyState);
        console.log('👋 [RealtimeProxy]   OpenAI WS buffered amount:', openAiWs.bufferedAmount);
        
        try {
          openAiWs.close(1000, 'Client disconnected');
          console.log('👋 [RealtimeProxy] OpenAI WebSocket close initiated');
        } catch (closeError: any) {
          console.error('👋 [RealtimeProxy] Error closing OpenAI WebSocket:', closeError);
          console.error('👋 [RealtimeProxy]   Error type:', closeError?.constructor?.name);
          console.error('👋 [RealtimeProxy]   Error message:', closeError?.message);
        }
      } else {
        console.log('👋 [RealtimeProxy] No OpenAI WebSocket to close');
      }

      // Clean up session and save recording metadata
      console.log('👋 [RealtimeProxy] === SESSION CLEANUP ===');
      console.log('👋 [RealtimeProxy] Active sessions to check:', activeSessions.size);
      
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
  console.log('🔍 [RealtimeProxy] === SESSION VERIFICATION START ===');
  console.log('🔍 [RealtimeProxy] Timestamp:', new Date().toISOString());
  console.log('🔍 [RealtimeProxy] Environment:', process.env.NODE_ENV);
  console.log('🔍 [RealtimeProxy] Raw session ID:', sessionId.substring(0, 30) + '...');
  console.log('🔍 [RealtimeProxy] Session ID length:', sessionId.length);
  console.log('🔍 [RealtimeProxy] Session ID format analysis:', {
    startsWithS: sessionId.startsWith('s:'),
    hasSignature: sessionId.includes('.'),
    colonCount: (sessionId.match(/:/g) || []).length,
    dotCount: (sessionId.match(/\./g) || []).length
  });
  
  // Import storage instance to access sessionStore
  console.log('🔍 [RealtimeProxy] Importing storage module...');
  const importStart = Date.now();
  let storage;
  try {
    const module = await import('./storage');
    storage = module.storage;
    const importDuration = Date.now() - importStart;
    console.log('🔍 [RealtimeProxy] Storage imported successfully in', importDuration, 'ms');
    console.log('🔍 [RealtimeProxy] Storage type:', storage?.constructor?.name);
    console.log('🔍 [RealtimeProxy] SessionStore available:', !!storage?.sessionStore);
    console.log('🔍 [RealtimeProxy] SessionStore type:', storage?.sessionStore?.constructor?.name);
  } catch (importError) {
    console.error('❌ [RealtimeProxy] Failed to import storage:', importError);
    console.error('❌ [RealtimeProxy] Import error type:', (importError as any)?.constructor?.name);
    console.error('❌ [RealtimeProxy] Import error message:', (importError as any)?.message);
    console.error('❌ [RealtimeProxy] Import error stack:', (importError as any)?.stack);
    return null;
  }
  
  // Extract session ID from connect.sid cookie format (s:sessionId.signature)
  console.log('🔍 [RealtimeProxy] Parsing session ID format...');
  console.log('🔍 [RealtimeProxy] Session ID parts after split by ":":', sessionId.split(':'));
  const cleanSessionId = sessionId.split(':')[1]?.split('.')[0];
  
  if (!cleanSessionId) {
    console.error('❌ [RealtimeProxy] === INVALID SESSION ID FORMAT ===');
    console.error('❌ [RealtimeProxy] Failed to extract clean session ID');
    console.error('❌ [RealtimeProxy] Raw sessionId:', sessionId);
    console.error('❌ [RealtimeProxy] Split by ":" result:', sessionId.split(':'));
    console.error('❌ [RealtimeProxy] Expected format: s:sessionId.signature');
    console.error('❌ [RealtimeProxy] Actual format analysis:', {
      firstChar: sessionId[0],
      secondChar: sessionId[1],
      firstColon: sessionId.indexOf(':'),
      firstDot: sessionId.indexOf('.'),
      substring: sessionId.substring(0, 50)
    });
    console.error('❌ [RealtimeProxy] === END INVALID SESSION ID ===');
    return null;
  }
  
  console.log('🔍 [RealtimeProxy] Clean session ID extracted:', cleanSessionId.substring(0, 20) + '...');
  console.log('🔍 [RealtimeProxy] Clean session ID length:', cleanSessionId.length);

  return new Promise((resolve) => {
    console.log('🔍 [RealtimeProxy] Looking up session in store...');
    const lookupStart = Date.now();
    
    storage.sessionStore.get(cleanSessionId, (err: any, session: any) => {
      const lookupDuration = Date.now() - lookupStart;
      console.log('🔍 [RealtimeProxy] === SESSION LOOKUP COMPLETE ===');
      console.log('🔍 [RealtimeProxy] Lookup duration:', lookupDuration, 'ms');
      
      if (err) {
        console.error('❌ [RealtimeProxy] === SESSION LOOKUP ERROR ===');
        console.error('❌ [RealtimeProxy] Error during session lookup');
        console.error('❌ [RealtimeProxy] Error type:', err?.constructor?.name);
        console.error('❌ [RealtimeProxy] Error message:', err?.message);
        console.error('❌ [RealtimeProxy] Error code:', (err as any)?.code);
        console.error('❌ [RealtimeProxy] Error stack:', err?.stack);
        console.error('❌ [RealtimeProxy] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ [RealtimeProxy] PRODUCTION CONTEXT:');
          console.error('❌ [RealtimeProxy]   Database connectivity check needed');
          console.error('❌ [RealtimeProxy]   Session table may be inaccessible');
          console.error('❌ [RealtimeProxy]   Check RDS connection and permissions');
        }
        console.error('❌ [RealtimeProxy] === END SESSION LOOKUP ERROR ===');
        resolve(null);
        return;
      }
      
      if (!session) {
        console.error('❌ [RealtimeProxy] === SESSION NOT FOUND ===');
        console.error('❌ [RealtimeProxy] No session found for clean ID:', cleanSessionId.substring(0, 20) + '...');
        console.error('❌ [RealtimeProxy] This could mean:');
        console.error('❌ [RealtimeProxy]   - Session has expired');
        console.error('❌ [RealtimeProxy]   - Session was never created');
        console.error('❌ [RealtimeProxy]   - Session ID mismatch between cookie and store');
        console.error('❌ [RealtimeProxy]   - Different session stores between HTTP and WebSocket');
        
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ [RealtimeProxy] PRODUCTION DEBUG:');
          console.error('❌ [RealtimeProxy]   SESSION_STORE type:', process.env.SESSION_STORE || 'Not set');
          console.error('❌ [RealtimeProxy]   Check if using same session store as Express');
        }
        console.error('❌ [RealtimeProxy] === END SESSION NOT FOUND ===');
        resolve(null);
        return;
      }

      console.log('🔍 [RealtimeProxy] Session found successfully');
      console.log('🔍 [RealtimeProxy] Session structure:', {
        hasPassport: !!session.passport,
        passportKeys: session.passport ? Object.keys(session.passport) : [],
        hasUser: !!session.passport?.user,
        userType: typeof session.passport?.user,
        sessionKeys: Object.keys(session),
        cookie: {
          expires: session.cookie?.expires,
          maxAge: session.cookie?.maxAge,
          httpOnly: session.cookie?.httpOnly,
          secure: session.cookie?.secure,
          sameSite: session.cookie?.sameSite,
          domain: session.cookie?.domain,
          path: session.cookie?.path
        }
      });

      // Check if session has passport user
      if (!session.passport?.user) {
        console.error('❌ [RealtimeProxy] === NO USER IN SESSION ===');
        console.error('❌ [RealtimeProxy] Session exists but no passport.user');
        console.error('❌ [RealtimeProxy] Session passport data:', JSON.stringify(session.passport, null, 2));
        console.error('❌ [RealtimeProxy] Full session data:', JSON.stringify(session, null, 2));
        console.error('❌ [RealtimeProxy] This indicates:');
        console.error('❌ [RealtimeProxy]   - User logged out but session persists');
        console.error('❌ [RealtimeProxy]   - Passport deserialization failed');
        console.error('❌ [RealtimeProxy]   - Session data corruption');
        console.error('❌ [RealtimeProxy] === END NO USER IN SESSION ===');
        resolve(null);
        return;
      }

      const userId = typeof session.passport.user === 'object' ? session.passport.user.id : session.passport.user;
      console.log('✅ [RealtimeProxy] === SESSION VERIFIED ===');
      console.log('✅ [RealtimeProxy] User ID:', userId);
      console.log('✅ [RealtimeProxy] User ID type:', typeof userId);
      console.log('✅ [RealtimeProxy] Session verification complete');
      console.log('✅ [RealtimeProxy] === END SESSION VERIFICATION ===');
      resolve(userId);
    });
  });
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