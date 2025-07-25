/**
 * Core Analytics Tracking Service
 * Provides centralized event tracking, session management, and conversion logging
 */

import { apiRequest } from '@/lib/queryClient';

// Types
export interface AnalyticsEvent {
  eventType: string;
  eventData?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  userId?: number;
  healthSystemId?: number;
}

export interface ConversionEvent {
  eventType: 'signup' | 'trial_start' | 'onboarding_complete' | 'first_chart_note' | 'subscription_upgrade' | 'feature_usage' | 'attachment_parsed' | 'ai_scribe_used';
  eventData?: Record<string, any>;
  monetaryValue?: number;
  acquisitionId?: number;
}

export interface PageViewEvent {
  page: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Session Management
class SessionManager {
  private sessionId: string;
  private sessionStartTime: Date;
  private lastActivityTime: Date;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = new Date();
    this.lastActivityTime = new Date();
    this.startSessionTimer();
  }

  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) {
      const { id, lastActivity } = JSON.parse(stored);
      if (Date.now() - lastActivity < this.SESSION_TIMEOUT) {
        return id;
      }
    }
    return this.createNewSession();
  }

  private createNewSession(): string {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.updateSessionStorage(sessionId);
    return sessionId;
  }

  private updateSessionStorage(sessionId: string): void {
    sessionStorage.setItem('analytics_session_id', JSON.stringify({
      id: sessionId,
      lastActivity: Date.now()
    }));
  }

  private startSessionTimer(): void {
    setInterval(() => {
      if (Date.now() - this.lastActivityTime.getTime() > this.SESSION_TIMEOUT) {
        this.sessionId = this.createNewSession();
        this.sessionStartTime = new Date();
      }
    }, 60000); // Check every minute
  }

  public recordActivity(): void {
    this.lastActivityTime = new Date();
    this.updateSessionStorage(this.sessionId);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getSessionDuration(): number {
    return Date.now() - this.sessionStartTime.getTime();
  }
}

// Device Detection
class DeviceDetector {
  public getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  public getBrowserInfo(): { name: string; version: string; os: string } {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = '';
    let os = 'Unknown';

    // Detect browser
    if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+\.?\d*)/)?.[1] || '';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+\.?\d*)/)?.[1] || '';
    } else if (userAgent.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+\.?\d*)/)?.[1] || '';
    }

    // Detect OS
    if (userAgent.indexOf('Windows') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1) os = 'iOS';

    return { name: browserName, version: browserVersion, os };
  }
}

// Main Analytics Service
class AnalyticsService {
  private sessionManager: SessionManager;
  private deviceDetector: DeviceDetector;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxQueueSize: number = 50;
  private isInitialized: boolean = false;
  private userId?: number;
  private healthSystemId?: number;

  constructor() {
    this.sessionManager = new SessionManager();
    this.deviceDetector = new DeviceDetector();
  }

  public initialize(userId?: number, healthSystemId?: number): void {
    if (this.isInitialized) return;
    
    this.userId = userId;
    this.healthSystemId = healthSystemId;
    this.isInitialized = true;

    // Start event flushing
    this.startEventFlushing();

    // Track initial page view
    this.trackPageView();

    // Listen for page navigation
    this.setupNavigationTracking();

    console.log('📊 Analytics service initialized');
  }

  private startEventFlushing(): void {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);

    // Also flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents(true);
    });
  }

  private setupNavigationTracking(): void {
    // Track browser back/forward
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });

    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackPageView();
    };
  }

  // Public tracking methods
  public trackEvent(eventType: string, eventData?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      eventType,
      eventData,
      timestamp: new Date(),
      sessionId: this.sessionManager.getSessionId(),
      userId: this.userId,
      healthSystemId: this.healthSystemId
    };

    this.eventQueue.push(event);
    this.sessionManager.recordActivity();

    // Flush if queue is getting large
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flushEvents();
    }

    console.log(`📊 Event tracked: ${eventType}`, eventData);
  }

  public trackPageView(customData?: Partial<PageViewEvent>): void {
    const urlParams = new URLSearchParams(window.location.search);
    
    const pageViewData: PageViewEvent = {
      page: window.location.pathname,
      referrer: document.referrer,
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined,
      utmTerm: urlParams.get('utm_term') || undefined,
      utmContent: urlParams.get('utm_content') || undefined,
      ...customData
    };

    this.trackEvent('page_view', pageViewData);
  }

  public async trackConversion(event: ConversionEvent): Promise<void> {
    try {
      // Track locally first
      this.trackEvent(`conversion_${event.eventType}`, event.eventData);

      // Then send to conversion API if user is authenticated
      if (this.userId) {
        const deviceInfo = this.deviceDetector.getBrowserInfo();
        
        await apiRequest('POST', '/api/marketing/conversions', {
          eventType: event.eventType,
          eventData: event.eventData,
          sessionId: this.sessionManager.getSessionId(),
          deviceType: this.deviceDetector.getDeviceType(),
          browserInfo: deviceInfo,
          monetaryValue: event.monetaryValue,
          acquisitionId: event.acquisitionId
        });
      }
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  }

  // Feature-specific tracking methods
  public trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...metadata
    });
  }

  public trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  public trackTiming(category: string, variable: string, duration: number): void {
    this.trackEvent('timing', {
      category,
      variable,
      duration
    });
  }

  // Clinical feature tracking
  public trackClinicalAction(action: string, details: Record<string, any>): void {
    this.trackEvent('clinical_action', {
      action,
      timestamp: new Date().toISOString(),
      sessionDuration: this.sessionManager.getSessionDuration(),
      ...details
    });
  }

  // Update user context
  public setUser(userId: number, healthSystemId: number): void {
    this.userId = userId;
    this.healthSystemId = healthSystemId;
    
    // Track user identification
    this.trackEvent('identify', {
      userId,
      healthSystemId
    });
  }

  // Event queue management
  private async flushEvents(forceSend: boolean = false): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, you'd send these to your analytics backend
      // For now, we'll store them in localStorage for debugging
      const stored = localStorage.getItem('analytics_events') || '[]';
      const allEvents = JSON.parse(stored);
      allEvents.push(...eventsToSend);
      
      // Keep only last 1000 events
      if (allEvents.length > 1000) {
        allEvents.splice(0, allEvents.length - 1000);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(allEvents));
      
      // TODO: Send to actual analytics endpoint when ready
      // await apiRequest('POST', '/api/analytics/events', { events: eventsToSend });
      
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events if send failed and not forcing
      if (!forceSend) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  // Utility methods
  public getSessionId(): string {
    return this.sessionManager.getSessionId();
  }

  public getSessionDuration(): number {
    return this.sessionManager.getSessionDuration();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export helper functions for common tracking scenarios
export const trackSignup = (acquisitionData?: Record<string, any>) => {
  analytics.trackConversion({
    eventType: 'signup',
    eventData: acquisitionData
  });
};

export const trackTrialStart = () => {
  analytics.trackConversion({
    eventType: 'trial_start'
  });
};

export const trackOnboardingComplete = () => {
  analytics.trackConversion({
    eventType: 'onboarding_complete'
  });
};

export const trackFirstChartNote = () => {
  analytics.trackConversion({
    eventType: 'first_chart_note'
  });
};

export const trackSubscriptionUpgrade = (plan: string, value: number) => {
  analytics.trackConversion({
    eventType: 'subscription_upgrade',
    eventData: { plan },
    monetaryValue: value
  });
};

export const trackAttachmentParsed = (success: boolean, documentType: string, processingTime: number) => {
  analytics.trackClinicalAction('attachment_parsed', {
    success,
    documentType,
    processingTime
  });
};

export const trackAIScribeUsed = (feature: string, duration: number) => {
  analytics.trackClinicalAction('ai_scribe_used', {
    feature,
    duration
  });
};