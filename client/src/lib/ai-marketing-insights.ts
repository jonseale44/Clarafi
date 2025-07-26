/**
 * AI-Driven Marketing Insights Service
 * Provides predictive analytics, automated recommendations, and intelligent alerts
 */

import { apiRequest } from './queryClient';
import { analytics } from './analytics';

export interface MarketingInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    timeframe: string;
  };
  actionItems: string[];
  confidence: number; // 0-100
  dataPoints: Array<{
    source: string;
    value: any;
    timestamp: Date;
  }>;
}

export interface PredictiveMetrics {
  churnProbability: {
    users: Array<{
      userId: number;
      probability: number;
      riskFactors: string[];
      preventionStrategies: string[];
    }>;
    overallRate: number;
    projectedLoss: number;
  };
  growthForecast: {
    newUsersProjected: number;
    revenueProjected: number;
    confidenceInterval: [number, number];
    assumptions: string[];
  };
  featureAdoption: {
    feature: string;
    currentAdoption: number;
    projectedAdoption: number;
    adoptionDrivers: string[];
  }[];
}

export interface CompetitorIntelligence {
  competitors: Array<{
    name: string;
    marketShare: number;
    keyFeatures: string[];
    pricing: string;
    weaknesses: string[];
    threats: string[];
  }>;
  marketPosition: {
    currentRank: number;
    strengthAreas: string[];
    improvementAreas: string[];
  };
  recommendations: string[];
}

export class AIMarketingInsightsService {
  private static instance: AIMarketingInsightsService;
  private insights: MarketingInsight[] = [];
  private lastAnalysisTime: Date | null = null;
  
  static getInstance(): AIMarketingInsightsService {
    if (!this.instance) {
      this.instance = new AIMarketingInsightsService();
    }
    return this.instance;
  }

  /**
   * Generate AI-powered insights based on current data
   */
  async generateInsights(): Promise<MarketingInsight[]> {
    try {
      // Fetch comprehensive analytics data
      const [analyticsData, userBehavior, conversionData] = await Promise.all([
        apiRequest('GET', '/api/analytics/comprehensive?range=30d'),
        apiRequest('GET', '/api/analytics/user-behavior'),
        apiRequest('GET', '/api/analytics/conversions')
      ]);

      // Generate insights using AI
      const response = await apiRequest('POST', '/api/analytics/ai/insights', {
        analyticsData,
        userBehavior,
        conversionData,
        previousInsights: this.insights
      });

      this.insights = response.insights;
      this.lastAnalysisTime = new Date();

      // Track insight generation
      analytics.trackEvent('ai_insights_generated', {
        insightCount: this.insights.length,
        criticalCount: this.insights.filter(i => i.priority === 'critical').length
      });

      return this.insights;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      // Fallback to rule-based insights
      return this.generateRuleBasedInsights();
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(): Promise<PredictiveMetrics> {
    try {
      const response = await apiRequest('GET', '/api/analytics/ai/predictive');
      return response;
    } catch (error) {
      console.error('Failed to get predictive analytics:', error);
      throw error;
    }
  }

  /**
   * Get competitor intelligence
   */
  async getCompetitorIntelligence(): Promise<CompetitorIntelligence> {
    try {
      const response = await apiRequest('GET', '/api/analytics/ai/competitors');
      return response;
    } catch (error) {
      console.error('Failed to get competitor intelligence:', error);
      // Return hardcoded competitor data as fallback
      return this.getStaticCompetitorData();
    }
  }

  /**
   * Generate automated marketing recommendations
   */
  async getRecommendations(focus: 'acquisition' | 'retention' | 'monetization' = 'acquisition'): Promise<string[]> {
    try {
      const response = await apiRequest('POST', '/api/analytics/ai/recommendations', { focus });
      return response.recommendations;
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      return this.getDefaultRecommendations(focus);
    }
  }

  /**
   * Set up automated alerts
   */
  async setupAutomatedAlerts(config: {
    churnThreshold: number;
    conversionDropThreshold: number;
    competitorAlerts: boolean;
  }): Promise<void> {
    try {
      await apiRequest('POST', '/api/analytics/ai/alerts', config);
      analytics.trackEvent('ai_alerts_configured', config);
    } catch (error) {
      console.error('Failed to setup automated alerts:', error);
    }
  }

  /**
   * Get actionable insights for specific metrics
   */
  async getMetricInsights(metric: string, timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    insights: string[];
    actions: string[];
  }> {
    try {
      const response = await apiRequest('GET', `/api/analytics/ai/metric-insights/${metric}?range=${timeRange}`);
      return response;
    } catch (error) {
      console.error('Failed to get metric insights:', error);
      throw error;
    }
  }

  /**
   * Generate content recommendations
   */
  async getContentRecommendations(): Promise<{
    topics: string[];
    formats: string[];
    channels: string[];
    timing: string;
  }> {
    try {
      const response = await apiRequest('GET', '/api/analytics/ai/content-recommendations');
      return response;
    } catch (error) {
      console.error('Failed to get content recommendations:', error);
      return {
        topics: ['AI in Healthcare', 'Reducing Physician Burnout', 'EMR Efficiency'],
        formats: ['Case Studies', 'Video Tutorials', 'Infographics'],
        channels: ['LinkedIn', 'Medical Forums', 'Email'],
        timing: 'Tuesday-Thursday, 10am-2pm EST'
      };
    }
  }

  // Private helper methods
  
  private generateRuleBasedInsights(): MarketingInsight[] {
    const insights: MarketingInsight[] = [];

    // Example rule-based insight
    insights.push({
      id: 'insight-1',
      type: 'opportunity',
      priority: 'high',
      title: 'Untapped Mental Health Market',
      description: 'Mental health providers show 50% adoption rate - highest among specialties. Target this segment for growth.',
      impact: {
        metric: 'Monthly Revenue',
        currentValue: 10000,
        projectedValue: 25000,
        timeframe: '3 months'
      },
      actionItems: [
        'Create mental health-specific landing page',
        'Develop specialty templates for psychiatry',
        'Partner with mental health associations'
      ],
      confidence: 85,
      dataPoints: [
        {
          source: 'Market Research',
          value: '50% adoption in mental health',
          timestamp: new Date()
        }
      ]
    });

    return insights;
  }

  private getStaticCompetitorData(): CompetitorIntelligence {
    return {
      competitors: [
        {
          name: 'Sunoh.ai',
          marketShare: 22,
          keyFeatures: ['50,000+ physicians', '$1.25/visit pricing'],
          pricing: '$1.25 per visit',
          weaknesses: ['Limited customization', 'No handwriting recognition'],
          threats: ['Large user base', 'Aggressive pricing']
        },
        {
          name: 'Microsoft Nuance DAX',
          marketShare: 31,
          keyFeatures: ['Enterprise focus', 'Deep EHR integration'],
          pricing: 'Enterprise pricing',
          weaknesses: ['High cost', 'Complex implementation'],
          threats: ['Microsoft backing', 'Healthcare relationships']
        }
      ],
      marketPosition: {
        currentRank: 5,
        strengthAreas: ['Handwriting recognition', 'Rapid 90-second notes', 'Self-service model'],
        improvementAreas: ['Market awareness', 'Enterprise features', 'Integration depth']
      },
      recommendations: [
        'Emphasize unique handwriting recognition in marketing',
        'Target small-to-medium practices priced out of enterprise solutions',
        'Develop strategic partnerships with medical associations'
      ]
    };
  }

  private getDefaultRecommendations(focus: string): string[] {
    const recommendations: Record<string, string[]> = {
      acquisition: [
        'Launch targeted Google Ads for "AI medical scribe" keywords',
        'Create comparison content vs. top competitors',
        'Implement referral program for existing users',
        'Attend major healthcare conferences'
      ],
      retention: [
        'Implement in-app onboarding tutorials',
        'Create monthly webinars for power users',
        'Launch customer success program',
        'Build user community forum'
      ],
      monetization: [
        'Introduce enterprise tier with advanced features',
        'Add usage-based pricing option',
        'Create specialty-specific add-ons',
        'Implement annual billing discounts'
      ]
    };

    return recommendations[focus] || recommendations.acquisition;
  }

  /**
   * Real-time anomaly detection
   */
  async detectAnomalies(): Promise<Array<{
    metric: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    recommendation: string;
  }>> {
    try {
      const response = await apiRequest('GET', '/api/analytics/ai/anomalies');
      return response.anomalies;
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      return [];
    }
  }
}

export const aiInsights = AIMarketingInsightsService.getInstance();