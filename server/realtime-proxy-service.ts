import WebSocket from 'ws';
import { Request } from 'express';

interface ProxyConnection {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  userId: number;
  patientId: number;
  encounterId: number;
  connectionId: string;
  createdAt: Date;
}

export class RealtimeProxyService {
  private connections: Map<string, ProxyConnection> = new Map();
  
  constructor() {
    console.log('🔒 [RealtimeProxy] Service initialized - API key secured on server');
  }

  async handleConnection(ws: WebSocket, req: Request, connectionId: string) {
    const userId = (req as any).user?.id || 0;
    const { patientId, encounterId } = req.query as { patientId: string; encounterId: string };
    
    console.log('🔐 [RealtimeProxy] New secure connection request:', {
      userId,
      patientId,
      encounterId,
      connectionId,
      timestamp: new Date().toISOString()
    });

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ [RealtimeProxy] No OpenAI API key found in environment');
      ws.send(JSON.stringify({
        type: 'error',
        error: {
          type: 'configuration_error',
          message: 'OpenAI API key not configured on server'
        }
      }));
      ws.close();
      return;
    }

    // Store connection info
    const connection: ProxyConnection = {
      clientWs: ws,
      openaiWs: null,
      userId,
      patientId: parseInt(patientId),
      encounterId: parseInt(encounterId),
      connectionId,
      createdAt: new Date()
    };
    
    this.connections.set(connectionId, connection);

    try {
      // Create connection to OpenAI
      console.log('🌐 [RealtimeProxy] Establishing secure connection to OpenAI...');
      
      const protocols = [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
        'openai-beta.realtime-v1'
      ];
      
      const params = new URLSearchParams({
        model: 'gpt-4o-mini-realtime-preview'
      });
      
      const openaiWs = new WebSocket(
        `wss://api.openai.com/v1/realtime?${params.toString()}`,
        protocols
      );
      
      connection.openaiWs = openaiWs;

      // Handle OpenAI connection events
      openaiWs.on('open', () => {
        console.log('✅ [RealtimeProxy] Connected to OpenAI Realtime API');
        console.log(`📊 [RealtimeProxy] Active connections: ${this.connections.size}`);
        
        // Notify client of successful connection
        ws.send(JSON.stringify({
          type: 'proxy.connection.established',
          connectionId,
          timestamp: new Date().toISOString()
        }));
      });

      openaiWs.on('message', (data: WebSocket.Data) => {
        // Forward all OpenAI messages to client
        const message = data.toString();
        
        // Log message types for monitoring (but not content for privacy)
        try {
          const parsed = JSON.parse(message);
          console.log(`📥 [RealtimeProxy] OpenAI → Client: ${parsed.type}`);
          
          // Add audit metadata
          const auditedMessage = {
            ...parsed,
            _audit: {
              proxyTimestamp: new Date().toISOString(),
              userId,
              patientId,
              encounterId
            }
          };
          
          ws.send(JSON.stringify(auditedMessage));
        } catch (e) {
          // If not JSON, forward as-is
          ws.send(message);
        }
      });

      openaiWs.on('error', (error) => {
        console.error('❌ [RealtimeProxy] OpenAI WebSocket error:', error.message);
        ws.send(JSON.stringify({
          type: 'error',
          error: {
            type: 'openai_connection_error',
            message: error.message
          }
        }));
      });

      openaiWs.on('close', (code, reason) => {
        console.log(`🔌 [RealtimeProxy] OpenAI connection closed: ${code} - ${reason}`);
        this.handleDisconnection(connectionId);
      });

      // Handle client messages
      ws.on('message', (data: WebSocket.Data) => {
        const message = data.toString();
        
        try {
          const parsed = JSON.parse(message);
          console.log(`📤 [RealtimeProxy] Client → OpenAI: ${parsed.type}`);
          
          // Forward to OpenAI
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(message);
          } else {
            console.warn('⚠️ [RealtimeProxy] OpenAI WebSocket not ready, queuing message');
          }
        } catch (e) {
          console.error('❌ [RealtimeProxy] Invalid message from client:', e);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 [RealtimeProxy] Client disconnected: ${connectionId}`);
        this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`❌ [RealtimeProxy] Client WebSocket error: ${error.message}`);
        this.handleDisconnection(connectionId);
      });

    } catch (error) {
      console.error('❌ [RealtimeProxy] Failed to establish proxy connection:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: {
          type: 'proxy_error',
          message: 'Failed to establish secure connection'
        }
      }));
      ws.close();
    }
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Close both connections
    if (connection.openaiWs?.readyState === WebSocket.OPEN) {
      connection.openaiWs.close();
    }
    if (connection.clientWs.readyState === WebSocket.OPEN) {
      connection.clientWs.close();
    }

    // Remove from active connections
    this.connections.delete(connectionId);
    console.log(`🧹 [RealtimeProxy] Cleaned up connection ${connectionId}`);
    console.log(`📊 [RealtimeProxy] Active connections remaining: ${this.connections.size}`);
  }

  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        connectionId: conn.connectionId,
        userId: conn.userId,
        patientId: conn.patientId,
        encounterId: conn.encounterId,
        createdAt: conn.createdAt,
        duration: Date.now() - conn.createdAt.getTime()
      }))
    };
  }
}

// Export singleton instance
export const realtimeProxyService = new RealtimeProxyService();