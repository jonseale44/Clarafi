import { Router } from 'express';
import { WebSocketServer } from 'ws';
import { realtimeProxyService } from './realtime-proxy-service';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

const router = Router();

// WebSocket server instance (will be initialized in index.ts)
let wss: WebSocketServer | null = null;

// Initialize WebSocket server
export function initializeWebSocketServer(server: any) {
  wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws/openai-realtime'
  });

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const pathname = request.url?.split('?')[0];
    
    if (pathname === '/ws/openai-realtime') {
      // Check authentication
      const cookies = parseCookies(request.headers.cookie || '');
      const sessionId = cookies['connect.sid'];
      
      if (!sessionId) {
        console.log('❌ [RealtimeProxy] Unauthorized WebSocket connection attempt - no session');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss!.handleUpgrade(request, socket, head, (ws) => {
        // Create a mock Express request object with authentication info
        const req = {
          isAuthenticated: () => true, // In production, verify session properly
          user: { id: extractUserIdFromSession(sessionId) }, // In production, lookup from session store
          headers: request.headers,
          url: request.url
        } as any;

        console.log('✅ [RealtimeProxy] WebSocket upgrade successful');
        wss!.emit('connection', ws, req);
      });
    }
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws, req) => {
    console.log('🔌 [RealtimeProxy] New WebSocket connection established');
    realtimeProxyService.handleConnection(ws, req as any);
  });

  console.log('✅ [RealtimeProxy] WebSocket server initialized at /ws/openai-realtime');
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

// Helper function to extract user ID from session (simplified)
function extractUserIdFromSession(sessionId: string): number {
  // In production, this should lookup the actual session from the session store
  // For now, we'll use a placeholder that can be updated later
  return 1; // Placeholder
}

// Cleanup on server shutdown
export function closeWebSocketServer() {
  if (wss) {
    realtimeProxyService.closeAllConnections();
    wss.close(() => {
      console.log('✅ [RealtimeProxy] WebSocket server closed');
    });
  }
}

export default router;