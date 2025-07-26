import { WebSocket } from 'ws';
import { storage } from '../storage';
import { EventEmitter } from 'events';

interface AnalyticsSubscriber {
  ws: WebSocket;
  healthSystemId: number;
  userId: number;
  metrics: string[];
}

interface MetricUpdate {
  metric: string;
  value: any;
  change: number;
  timestamp: Date;
}

export class RealtimeAnalyticsService extends EventEmitter {
  private subscribers: Map<string, AnalyticsSubscriber> = new Map();
  private metricCache: Map<string, any> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.startMetricUpdates();
  }
  
  // Subscribe a WebSocket client to specific metrics
  subscribe(ws: WebSocket, healthSystemId: number, userId: number, metrics: string[]) {
    const subscriberId = `${userId}-${Date.now()}`;
    
    this.subscribers.set(subscriberId, {
      ws,
      healthSystemId,
      userId,
      metrics
    });
    
    // Send initial metric values
    this.sendInitialMetrics(subscriberId);
    
    // Clean up on disconnect
    ws.on('close', () => {
      this.subscribers.delete(subscriberId);
      console.log(`📊 Analytics subscriber ${subscriberId} disconnected`);
    });
    
    console.log(`📊 New analytics subscriber ${subscriberId} for metrics: ${metrics.join(', ')}`);
  }
  
  // Start periodic metric updates
  private startMetricUpdates() {
    if (this.updateInterval) return;
    
    // Update metrics every 5 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateAllMetrics();
    }, 5000);
    
    // Initial update
    this.updateAllMetrics();
  }
  
  // Update all tracked metrics
  private async updateAllMetrics() {
    try {
      const healthSystems = await storage.getAllHealthSystems();
      
      for (const healthSystem of healthSystems) {
        await this.updateHealthSystemMetrics(healthSystem.id);
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }
  
  // Update metrics for a specific health system
  private async updateHealthSystemMetrics(healthSystemId: number) {
    const metrics: Record<string, any> = {};
    
    // Get current timestamp
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Active users today
    const events = await storage.getAnalyticsEvents({
      healthSystemId,
      startDate: today,
      endDate: new Date()
    });
    
    const activeUsers = new Set(events.map(e => e.userId).filter(Boolean));
    metrics.activeUsersToday = activeUsers.size;
    
    // Page views today
    metrics.pageViewsToday = events.filter(e => e.eventType === 'page_view').length;
    
    // New patients today
    const patients = await storage.getAllPatients();
    const newPatientsToday = patients.filter(p => 
      p.healthSystemId === healthSystemId &&
      p.createdAt && new Date(p.createdAt) >= today
    ).length;
    metrics.newPatientsToday = newPatientsToday;
    
    // Appointments today
    const appointments = await storage.getAllAppointments();
    const appointmentsToday = appointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate >= today && apptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
    metrics.appointmentsToday = appointmentsToday;
    
    // Revenue today (mock calculation)
    metrics.revenueToday = appointmentsToday * 175;
    
    // Conversion rate
    const signups = events.filter(e => e.eventType === 'conversion_signup').length;
    const visitors = events.filter(e => e.eventType === 'page_view' && e.eventData?.pageType === 'landing').length;
    metrics.conversionRate = visitors > 0 ? (signups / visitors) * 100 : 0;
    
    // Store in cache and broadcast updates
    for (const [metric, value] of Object.entries(metrics)) {
      const cacheKey = `${healthSystemId}-${metric}`;
      const previousValue = this.metricCache.get(cacheKey) || 0;
      const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
      
      this.metricCache.set(cacheKey, value);
      
      // Broadcast to relevant subscribers
      this.broadcastMetricUpdate(healthSystemId, {
        metric,
        value,
        change,
        timestamp: new Date()
      });
    }
  }
  
  // Send initial metric values to a new subscriber
  private async sendInitialMetrics(subscriberId: string) {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return;
    
    const { ws, healthSystemId, metrics } = subscriber;
    const initialData: Record<string, any> = {};
    
    for (const metric of metrics) {
      const cacheKey = `${healthSystemId}-${metric}`;
      const value = this.metricCache.get(cacheKey);
      if (value !== undefined) {
        initialData[metric] = {
          value,
          change: 0,
          timestamp: new Date()
        };
      }
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'initial',
        data: initialData
      }));
    }
  }
  
  // Broadcast metric update to relevant subscribers
  private broadcastMetricUpdate(healthSystemId: number, update: MetricUpdate) {
    for (const [subscriberId, subscriber] of this.subscribers) {
      if (subscriber.healthSystemId === healthSystemId && 
          subscriber.metrics.includes(update.metric) &&
          subscriber.ws.readyState === WebSocket.OPEN) {
        
        subscriber.ws.send(JSON.stringify({
          type: 'update',
          data: update
        }));
      }
    }
  }
  
  // Emit custom analytics event
  emitAnalyticsEvent(healthSystemId: number, eventType: string, eventData: any) {
    // Store the event
    storage.createAnalyticsEvent({
      healthSystemId,
      eventType,
      eventData
    }).then(() => {
      // Immediately update relevant metrics
      this.updateHealthSystemMetrics(healthSystemId);
      
      // Broadcast event to subscribers
      for (const [subscriberId, subscriber] of this.subscribers) {
        if (subscriber.healthSystemId === healthSystemId &&
            subscriber.ws.readyState === WebSocket.OPEN) {
          
          subscriber.ws.send(JSON.stringify({
            type: 'event',
            data: {
              eventType,
              eventData,
              timestamp: new Date()
            }
          }));
        }
      }
    }).catch(error => {
      console.error('Error emitting analytics event:', error);
    });
  }
  
  // Get current metric value
  getCurrentMetricValue(healthSystemId: number, metric: string): any {
    const cacheKey = `${healthSystemId}-${metric}`;
    return this.metricCache.get(cacheKey);
  }
  
  // Force refresh specific metrics
  async refreshMetrics(healthSystemId: number, metrics?: string[]) {
    await this.updateHealthSystemMetrics(healthSystemId);
  }
  
  // Clean up resources
  shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Close all WebSocket connections
    for (const [subscriberId, subscriber] of this.subscribers) {
      if (subscriber.ws.readyState === WebSocket.OPEN) {
        subscriber.ws.close();
      }
    }
    
    this.subscribers.clear();
    this.metricCache.clear();
    
    console.log('📊 Realtime analytics service shut down');
  }
}

// Export singleton instance
export const realtimeAnalytics = new RealtimeAnalyticsService();