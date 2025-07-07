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

    try {
      // Create connection to OpenAI
      const protocols = [
        'realtime',
        `openai-insecure-api-key.${this.openaiApiKey}`,
        'openai-beta.realtime-v1'
      ];

      const params = new URLSearchParams({
        model: 'gpt-4o-mini-realtime-preview'
      });

      const openaiWs = new WebSocket(
        `wss://api.openai.com/v1/realtime?${params.toString()}`,
        protocols
      );

      // Store connection pair
      this.activeConnections.set(connectionId, { clientWs: ws, openaiWs });

      // Handle OpenAI connection events
      openaiWs.on('open', () => {
        console.log(`✅ [RealtimeProxy] Connected to OpenAI for user ${req.user?.id}`);
      });

      openaiWs.on('message', (data) => {
        // Forward OpenAI messages to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      openaiWs.on('error', (error) => {
        console.error(`❌ [RealtimeProxy] OpenAI WebSocket error for ${connectionId}:`, error);
        ws.close(1011, 'OpenAI connection error');
      });

      openaiWs.on('close', (code, reason) => {
        console.log(`🔌 [RealtimeProxy] OpenAI connection closed for ${connectionId}: ${code} ${reason}`);
        this.activeConnections.delete(connectionId);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(code, reason.toString());
        }
      });

      // Handle client messages
      ws.on('message', (data) => {
        // Forward client messages to OpenAI
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(data);
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