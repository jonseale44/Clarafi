import { Router } from 'express';
import { WebSocketServer } from 'ws';
import { realtimeProxyService } from './realtime-proxy-service';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { storage } from './storage';

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

      wss!.handleUpgrade(request, socket, head, async (ws) => {
        // Look up actual user ID from session
        const userId = await extractUserIdFromSession(sessionId);
        
        if (!userId) {
          console.error('❌ [RealtimeProxy] Failed to extract user ID from session');
          ws.close(1008, 'Invalid session');
          return;
        }
        
        // Create a mock Express request object with authentication info
        const req = {
          isAuthenticated: () => true,
          user: { id: userId },
          headers: request.headers,
          url: request.url
        } as any;

        console.log('✅ [RealtimeProxy] WebSocket upgrade successful for user:', userId);
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

// Helper function to extract user ID from session
async function extractUserIdFromSession(sessionId: string): Promise<number | null> {
  return new Promise((resolve) => {
    // Remove 's:' prefix and signature from connect.sid cookie if present
    const cleanSessionId = sessionId.includes('.') 
      ? sessionId.split('.')[0].replace('s:', '') 
      : sessionId.replace('s:', '');
    
    console.log('🔍 [RealtimeProxy] Looking up session:', cleanSessionId.substring(0, 10) + '...');
    
    storage.sessionStore.get(cleanSessionId, (err, session) => {
      if (err) {
        console.error('❌ [RealtimeProxy] Session lookup error:', err);
        resolve(null);
      } else if (!session) {
        console.error('❌ [RealtimeProxy] Session not found');
        resolve(null);
      } else if (!session.passport?.user) {
        console.error('❌ [RealtimeProxy] No user in session');
        resolve(null);
      } else {
        const userId = session.passport.user;
        console.log('✅ [RealtimeProxy] Found user ID from session:', userId);
        resolve(userId);
      }
    });
  });
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