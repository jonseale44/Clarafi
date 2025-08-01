import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { realtimeAnalytics } from './services/realtime-analytics-service.js';
import { storage } from './storage.js';

export function setupAnalyticsWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/analytics'
  });
  
  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('📊 New analytics WebSocket connection');
    
    // Parse user authentication from query params or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      ws.close();
      return;
    }
    
    try {
      // Verify user session
      const session = await storage.getSessionByToken(token);
      if (!session || !session.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid session' }));
        ws.close();
        return;
      }
      
      // Get user details
      const user = await storage.getUserById(session.userId);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
        ws.close();
        return;
      }
      
      // Subscribe to real-time analytics
      const metrics = url.searchParams.get('metrics')?.split(',') || [
        'activeUsersToday',
        'pageViewsToday',
        'newPatientsToday',
        'appointmentsToday',
        'revenueToday',
        'conversionRate'
      ];
      
      realtimeAnalytics.subscribe(
        ws,
        user.healthSystemId,
        user.id,
        metrics
      );
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to real-time analytics',
        metrics
      }));
      
      // Handle incoming messages
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'refresh':
              // Force refresh specific metrics
              realtimeAnalytics.refreshMetrics(user.healthSystemId, data.metrics);
              break;
              
            case 'subscribe':
              // Update subscription metrics
              realtimeAnalytics.subscribe(
                ws,
                user.healthSystemId,
                user.id,
                data.metrics
              );
              break;
              
            case 'ping':
              // Heartbeat
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
      ws.close();
    }
  });
  
  console.log('📊 Analytics WebSocket server initialized');
}