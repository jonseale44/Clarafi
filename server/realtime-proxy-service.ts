import { WebSocket } from 'ws';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  isAuthenticated(): boolean;
  user?: any;
}

export class RealtimeProxyService {
  private openaiApiKey: string;
  private activeConnections: Map<string, { clientWs: WebSocket; openaiWs: WebSocket }> = new Map();

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      console.error('❌ [RealtimeProxy] OPENAI_API_KEY not found in environment');
    }
  }

  async handleConnection(ws: WebSocket, req: AuthenticatedRequest) {
    // Generate unique connection ID
    const connectionId = `${req.user?.id}-${Date.now()}`;
    console.log(`🔌 [RealtimeProxy] New connection from user ${req.user?.id}`);
    console.log(`🔑 [RealtimeProxy] API Key available: ${this.openaiApiKey ? 'Yes' : 'No'}`);
    console.log(`🔑 [RealtimeProxy] API Key prefix: ${this.openaiApiKey?.substring(0, 7)}...`);

    try {
      // Create connection to OpenAI using headers instead of protocols
      const params = new URLSearchParams({
        model: 'gpt-4o-realtime-preview-2024-10-01'
      });

      const url = `wss://api.openai.com/v1/realtime?${params.toString()}`;
      console.log(`🔗 [RealtimeProxy] Connecting to OpenAI URL: ${url}`);

      const openaiWs = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any);
      
      console.log(`⏳ [RealtimeProxy] OpenAI WebSocket created, waiting for connection...`);

      // Store connection pair
      this.activeConnections.set(connectionId, { clientWs: ws, openaiWs });

      // Handle OpenAI connection events
      openaiWs.on('open', () => {
        console.log(`✅ [RealtimeProxy] Connected to OpenAI for user ${req.user?.id}`);
        console.log(`✅ [RealtimeProxy] OpenAI WebSocket readyState: ${openaiWs.readyState}`);
        console.log(`✅ [RealtimeProxy] Connection opened at: ${new Date().toISOString()}`);
        console.log(`✅ [RealtimeProxy] Connection details:`, {
          url,
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey?.substring(0, 7)}...`,
            'OpenAI-Beta': 'realtime=v1'
          },
          connectionId
        });
        this.activeConnections.set(connectionId, { clientWs: ws, openaiWs });
      });

      openaiWs.on('message', (data) => {
        const message = data.toString();
        const timestamp = new Date().toISOString();
        
        try {
          const parsed = JSON.parse(message);
          console.log(`📨 [RealtimeProxy] ${timestamp} - Message from OpenAI - type: ${parsed.type}`);
          
          if (parsed.type === 'error') {
            console.error(`❌ [RealtimeProxy] OpenAI error event received:`, {
              timestamp,
              error: parsed.error,
              code: parsed.error?.code,
              message: parsed.error?.message,
              type: parsed.error?.type,
              param: parsed.error?.param,
              event_id: parsed.event_id
            });
          } else if (parsed.type === 'session.created') {
            console.log(`🎯 [RealtimeProxy] Session created successfully:`, {
              session_id: parsed.session?.id,
              model: parsed.session?.model,
              modalities: parsed.session?.modalities,
              event_id: parsed.event_id
            });
          } else if (parsed.type === 'session.updated') {
            console.log(`🎯 [RealtimeProxy] Session updated successfully:`, {
              event_id: parsed.event_id
            });
          }
        } catch (e) {
          console.log(`📨 [RealtimeProxy] ${timestamp} - Binary message from OpenAI (audio data)`);
        }
        
        // Forward OpenAI messages to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      openaiWs.on('error', (error) => {
        console.error(`❌ [RealtimeProxy] OpenAI WebSocket error for ${connectionId}:`, error);
        console.error(`❌ [RealtimeProxy] Error details:`, {
          message: error.message,
          code: (error as any).code,
          type: (error as any).type,
          stack: error.stack
        });
        
        // Don't immediately close client connection - let it handle the error
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            error: {
              message: error.message || 'OpenAI connection error',
              code: (error as any).code
            }
          }));
        }
      });

      openaiWs.on('close', (code, reason) => {
        const timestamp = new Date().toISOString();
        console.log(`🔌 [RealtimeProxy] OpenAI connection closed for ${connectionId}`);
        console.log(`🔌 [RealtimeProxy] Close timestamp: ${timestamp}`);
        console.log(`🔌 [RealtimeProxy] Close code: ${code}`);
        console.log(`🔌 [RealtimeProxy] Close reason: ${reason || 'No reason provided'}`);
        
        // Log close code meanings
        const closeCodeMeanings: Record<number, string> = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure',
          1007: 'Invalid frame payload data',
          1008: 'Policy violation',
          1009: 'Message too big',
          1011: 'Internal server error',
          1015: 'TLS handshake failure',
          4001: 'Invalid authentication',
          4002: 'Invalid model',
          4003: 'Model not supported',
          4008: 'API key invalid or missing'
        };
        console.log(`🔌 [RealtimeProxy] Close code meaning: ${closeCodeMeanings[code] || 'Unknown/Custom code'}`);
        
        // Calculate connection duration
        const openTime = new Date(timestamp).getTime() - 10000; // Approximate
        const closeTime = new Date(timestamp).getTime();
        const duration = closeTime - openTime;
        console.log(`🔌 [RealtimeProxy] Connection duration: ${duration}ms`);
        
        this.activeConnections.delete(connectionId);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(code, reason.toString());
        }
      });

      // Handle client messages
      ws.on('message', (data) => {
        const message = data.toString();
        try {
          const parsed = JSON.parse(message);
          console.log(`📤 [RealtimeProxy] Message from client - type: ${parsed.type}`);
          
          // According to OpenAI docs, the client should send session.update, not session.create
          if (parsed.type === 'session.create') {
            console.warn(`⚠️ [RealtimeProxy] Client sent session.create - this should be session.update per OpenAI docs`);
          }
          
          if (parsed.type === 'session.update') {
            console.log(`📤 [RealtimeProxy] Full session.update message:`, JSON.stringify(parsed, null, 2));
            console.log(`📤 [RealtimeProxy] Session config:`, JSON.stringify(parsed.session, null, 2));
          }
        } catch (e) {
          console.log(`📤 [RealtimeProxy] Binary message from client (audio data)`);
        }
        
        // Forward client messages to OpenAI
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(data);
        } else {
          console.warn(`⚠️ [RealtimeProxy] OpenAI WebSocket not ready, state: ${openaiWs.readyState}`);
        }
      });

      ws.on('error', (error) => {
        console.error(`❌ [RealtimeProxy] Client WebSocket error for ${connectionId}:`, error);
      });

      ws.on('close', (code, reason) => {
        console.log(`🔌 [RealtimeProxy] Client connection closed for ${connectionId}: ${code} ${reason}`);
        this.activeConnections.delete(connectionId);
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close(code, reason.toString());
        }
      });

    } catch (error) {
      console.error(`❌ [RealtimeProxy] Error setting up connection for ${connectionId}:`, error);
      ws.close(1011, 'Failed to establish proxy connection');
    }
  }

  // Clean up all connections
  closeAllConnections() {
    console.log(`🔌 [RealtimeProxy] Closing ${this.activeConnections.size} active connections`);
    this.activeConnections.forEach(({ clientWs, openaiWs }, connectionId) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1001, 'Server shutting down');
      }
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close(1001, 'Server shutting down');
      }
    });
    this.activeConnections.clear();
  }
}

// Export singleton instance
export const realtimeProxyService = new RealtimeProxyService();