/**
 * Advanced Behavior Analytics Service
 * Provides heat mapping, session recording, and user journey analytics
 */

import { analytics } from './analytics';
import { apiRequest } from './queryClient';

export interface HeatMapData {
  pageUrl: string;
  clickData: Array<{
    x: number;
    y: number;
    count: number;
    element: string;
  }>;
  scrollDepth: Array<{
    depth: number;
    percentage: number;
  }>;
  attentionTime: Array<{
    element: string;
    averageTime: number;
  }>;
}

export interface UserJourney {
  userId: number;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  pages: Array<{
    url: string;
    timestamp: Date;
    duration: number;
    actions: Array<{
      type: 'click' | 'scroll' | 'form' | 'navigation';
      target: string;
      timestamp: Date;
      metadata?: any;
    }>;
  }>;
  conversionEvents: string[];
  dropoffPoint?: string;
}

export interface SessionRecording {
  sessionId: string;
  userId: number;
  startTime: Date;
  duration: number;
  events: Array<{
    timestamp: number;
    type: 'mouseMove' | 'click' | 'scroll' | 'input' | 'resize';
    data: any;
  }>;
  metadata: {
    browser: string;
    device: string;
    screenResolution: string;
    userAgent: string;
  };
}

export class BehaviorAnalyticsService {
  private static instance: BehaviorAnalyticsService;
  private recordingActive = false;
  private recordingEvents: any[] = [];
  private sessionStartTime: number = 0;
  private clickMap = new Map<string, number>();
  private scrollDepths = new Map<string, number>();
  private elementTimers = new Map<string, number>();
  private mousePosition = { x: 0, y: 0 };
  
  static getInstance(): BehaviorAnalyticsService {
    if (!this.instance) {
      this.instance = new BehaviorAnalyticsService();
    }
    return this.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTracking();
    }
  }

  /**
   * Initialize behavior tracking
   */
  private initializeTracking(): void {
    // Track clicks for heat map
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const selector = this.getElementSelector(target);
      const key = `${window.location.pathname}:${selector}`;
      
      this.clickMap.set(key, (this.clickMap.get(key) || 0) + 1);
      
      // Track click position
      analytics.trackEvent('behavior_click', {
        x: event.clientX,
        y: event.clientY,
        element: selector,
        page: window.location.pathname
      });

      // Record if session recording is active
      if (this.recordingActive) {
        this.recordEvent('click', {
          x: event.clientX,
          y: event.clientY,
          target: selector
        });
      }
    });

    // Track scroll depth
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const currentDepth = this.scrollDepths.get(window.location.pathname) || 0;
        
        if (scrollPercentage > currentDepth) {
          this.scrollDepths.set(window.location.pathname, scrollPercentage);
          analytics.trackEvent('behavior_scroll', {
            depth: scrollPercentage,
            page: window.location.pathname
          });
        }

        if (this.recordingActive) {
          this.recordEvent('scroll', {
            scrollY: window.scrollY,
            scrollPercentage
          });
        }
      }, 150);
    });

    // Track mouse movement for heat zones
    let mouseMoveTimeout: NodeJS.Timeout;
    document.addEventListener('mousemove', (event) => {
      this.mousePosition = { x: event.clientX, y: event.clientY };
      
      if (this.recordingActive) {
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = setTimeout(() => {
          this.recordEvent('mouseMove', {
            x: event.clientX,
            y: event.clientY
          });
        }, 50); // Throttle to 20fps
      }
    });

    // Track element attention time
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const selector = this.getElementSelector(entry.target as HTMLElement);
        
        if (entry.isIntersecting) {
          this.elementTimers.set(selector, Date.now());
        } else {
          const startTime = this.elementTimers.get(selector);
          if (startTime) {
            const duration = Date.now() - startTime;
            analytics.trackEvent('behavior_attention', {
              element: selector,
              duration,
              page: window.location.pathname
            });
            this.elementTimers.delete(selector);
          }
        }
      });
    }, { threshold: 0.5 });

    // Observe important elements
    document.querySelectorAll('button, a, form, [data-track-attention]').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * Start session recording
   */
  startSessionRecording(): void {
    this.recordingActive = true;
    this.recordingEvents = [];
    this.sessionStartTime = Date.now();
    
    analytics.trackEvent('session_recording_started', {
      sessionId: analytics.getSessionId()
    });
  }

  /**
   * Stop session recording and save
   */
  async stopSessionRecording(): Promise<void> {
    if (!this.recordingActive) return;
    
    this.recordingActive = false;
    const duration = Date.now() - this.sessionStartTime;
    
    const recording: SessionRecording = {
      sessionId: analytics.getSessionId(),
      userId: 0, // Will be set by backend
      startTime: new Date(this.sessionStartTime),
      duration,
      events: this.recordingEvents,
      metadata: {
        browser: this.getBrowserName(),
        device: this.getDeviceType(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        userAgent: navigator.userAgent
      }
    };
    
    try {
      await apiRequest('POST', '/api/analytics/session-recording', recording);
      analytics.trackEvent('session_recording_saved', {
        sessionId: analytics.getSessionId(),
        duration
      });
    } catch (error) {
      console.error('Failed to save session recording:', error);
    }
  }

  /**
   * Generate heat map data for a page
   */
  async getHeatMapData(pageUrl: string): Promise<HeatMapData> {
    try {
      const response = await apiRequest('GET', `/api/analytics/heatmap?page=${encodeURIComponent(pageUrl)}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch heat map data:', error);
      throw error;
    }
  }

  /**
   * Get user journey analysis
   */
  async getUserJourney(userId: number, sessionId?: string): Promise<UserJourney> {
    try {
      const params = sessionId ? `?sessionId=${sessionId}` : '';
      const response = await apiRequest('GET', `/api/analytics/user-journey/${userId}${params}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch user journey:', error);
      throw error;
    }
  }

  /**
   * Track form abandonment
   */
  trackFormAbandonment(formId: string, fieldsCompleted: number, totalFields: number): void {
    analytics.trackEvent('form_abandonment', {
      formId,
      fieldsCompleted,
      totalFields,
      completionPercentage: (fieldsCompleted / totalFields) * 100,
      page: window.location.pathname
    });
  }

  /**
   * Track rage clicks (rapid clicking indicating frustration)
   */
  private detectRageClicks(): void {
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;
    
    document.addEventListener('click', (event) => {
      clickCount++;
      
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 2000);
      }
      
      if (clickCount >= 5) {
        const target = event.target as HTMLElement;
        analytics.trackEvent('rage_click', {
          element: this.getElementSelector(target),
          clickCount,
          page: window.location.pathname
        });
        clickCount = 0;
        clearTimeout(clickTimer);
      }
    });
  }

  /**
   * Generate conversion funnel visualization data
   */
  async getConversionFunnel(funnelSteps: string[]): Promise<any> {
    try {
      const response = await apiRequest('POST', '/api/analytics/conversion-funnel', {
        steps: funnelSteps
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch conversion funnel:', error);
      throw error;
    }
  }

  // Helper methods
  private recordEvent(type: string, data: any): void {
    if (!this.recordingActive) return;
    
    this.recordingEvents.push({
      timestamp: Date.now() - this.sessionStartTime,
      type,
      data
    });
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Enable AI-powered insights
   */
  async getAIInsights(pageUrl: string): Promise<{
    recommendations: string[];
    issues: string[];
    opportunities: string[];
  }> {
    try {
      const heatMapData = await this.getHeatMapData(pageUrl);
      const response = await apiRequest('POST', '/api/analytics/ai-insights', {
        pageUrl,
        heatMapData,
        scrollDepths: Array.from(this.scrollDepths.entries()),
        clickPatterns: Array.from(this.clickMap.entries())
      });
      return response;
    } catch (error) {
      console.error('Failed to get AI insights:', error);
      throw error;
    }
  }
}

export const behaviorAnalytics = BehaviorAnalyticsService.getInstance();