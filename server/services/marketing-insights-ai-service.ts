import { storage } from '../storage';
import OpenAI from 'openai';
import { InsertMarketingInsight } from '@shared/schema';

export class MarketingInsightsAIService {
  private openai: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey });
  }
  // Generate AI-powered marketing insights based on analytics data
  async generateInsights(healthSystemId: number): Promise<InsertMarketingInsight[]> {
    try {
      // Gather comprehensive analytics data
      const analyticsData = await this.gatherAnalyticsData(healthSystemId);
      
      // Generate insights using AI
      const insights = await this.analyzeWithAI(analyticsData);
      
      // Format and save insights
      const formattedInsights = insights.map(insight => ({
        healthSystemId,
        insightType: insight.type,
        insightCategory: insight.category,
        title: insight.title,
        description: insight.description,
        analysisData: insight.analysisData,
        recommendations: insight.recommendations,
        priority: insight.priority
      }));
      
      // Save insights to database
      for (const insight of formattedInsights) {
        await storage.createMarketingInsight(insight);
      }
      
      return formattedInsights;
    } catch (error) {
      console.error('Error generating marketing insights:', error);
      return [];
    }
  }
  
  // Gather all relevant analytics data
  private async gatherAnalyticsData(healthSystemId: number) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Get various metrics
    const [events, patients, appointments, users] = await Promise.all([
      storage.getAnalyticsEvents({
        healthSystemId,
        startDate: thirtyDaysAgo,
        endDate: now
      }),
      storage.getAllPatients().then(p => p.filter(patient => patient.healthSystemId === healthSystemId)),
      storage.getAllAppointments(),
      storage.getAllUsers().then(u => u.filter(user => user.healthSystemId === healthSystemId))
    ]);
    
    // Calculate key metrics
    const metrics = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      pageViews: events.filter(e => e.eventType === 'page_view').length,
      conversions: events.filter(e => e.eventType.startsWith('conversion_')).length,
      featureUsage: this.analyzeFeatureUsage(events),
      patientGrowth: this.calculateGrowthRate(patients),
      appointmentTrends: this.analyzeAppointmentTrends(appointments, patients),
      userEngagement: this.analyzeUserEngagement(events, users)
    };
    
    return metrics;
  }
  
  // Analyze feature usage patterns
  private analyzeFeatureUsage(events: any[]) {
    const featureEvents = events.filter(e => e.eventType === 'feature_usage');
    const featureCounts: Record<string, number> = {};
    
    featureEvents.forEach(event => {
      const feature = event.eventData?.feature || 'unknown';
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });
    
    return Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  // Calculate patient growth rate
  private calculateGrowthRate(patients: any[]) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentPatients = patients.filter(p => 
      p.createdAt && new Date(p.createdAt) > thirtyDaysAgo
    ).length;
    
    const previousPatients = patients.filter(p => 
      p.createdAt && new Date(p.createdAt) > sixtyDaysAgo && new Date(p.createdAt) <= thirtyDaysAgo
    ).length;
    
    const growthRate = previousPatients > 0 
      ? ((recentPatients - previousPatients) / previousPatients) * 100 
      : 0;
    
    return {
      recentCount: recentPatients,
      previousCount: previousPatients,
      growthRate
    };
  }
  
  // Analyze appointment trends
  private analyzeAppointmentTrends(appointments: any[], patients: any[]) {
    const patientIds = new Set(patients.map(p => p.id));
    const relevantAppointments = appointments.filter(a => patientIds.has(a.patientId));
    
    const completed = relevantAppointments.filter(a => a.status === 'completed').length;
    const noShows = relevantAppointments.filter(a => a.status === 'no_show').length;
    const cancelled = relevantAppointments.filter(a => a.status === 'cancelled').length;
    
    return {
      total: relevantAppointments.length,
      completed,
      noShows,
      cancelled,
      noShowRate: relevantAppointments.length > 0 ? (noShows / relevantAppointments.length) * 100 : 0
    };
  }
  
  // Analyze user engagement
  private analyzeUserEngagement(events: any[], users: any[]) {
    const userEventCounts: Record<number, number> = {};
    
    events.forEach(event => {
      if (event.userId) {
        userEventCounts[event.userId] = (userEventCounts[event.userId] || 0) + 1;
      }
    });
    
    const activeUsers = Object.keys(userEventCounts).length;
    const totalUsers = users.length;
    const avgEventsPerUser = activeUsers > 0 
      ? Object.values(userEventCounts).reduce((a, b) => a + b, 0) / activeUsers 
      : 0;
    
    return {
      activeUsers,
      totalUsers,
      engagementRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      avgEventsPerUser
    };
  }
  
  // Use AI to analyze data and generate insights
  private async analyzeWithAI(data: any): Promise<any[]> {
    try {
      const prompt = `As a healthcare marketing analytics expert, analyze the following EMR system metrics and provide actionable insights:

Metrics:
- Total Events: ${data.totalEvents}
- Unique Active Users: ${data.uniqueUsers}
- Page Views: ${data.pageViews}
- Conversions: ${data.conversions}
- Patient Growth Rate: ${data.patientGrowth.growthRate.toFixed(1)}%
- No-Show Rate: ${data.appointmentTrends.noShowRate.toFixed(1)}%
- User Engagement Rate: ${data.userEngagement.engagementRate.toFixed(1)}%

Top Features Used:
${data.featureUsage.slice(0, 5).map((f: any) => `- ${f.feature}: ${f.count} uses`).join('\n')}

Generate 3-5 specific, actionable marketing insights. For each insight:
1. Identify a specific opportunity or issue
2. Provide data-driven analysis
3. Recommend 2-3 concrete actions
4. Estimate potential impact

Format as JSON array with structure:
{
  "type": "campaign_performance|feature_adoption|user_retention|conversion_optimization",
  "category": "opportunity|warning|success|trend",
  "title": "Brief title",
  "description": "Detailed analysis",
  "analysisData": { relevant metrics },
  "recommendations": [{ "action": "...", "impact": "high|medium|low", "effort": "high|medium|low", "details": "..." }],
  "priority": 1-100
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      const result = JSON.parse(content);
      return result.insights || [];
    } catch (error) {
      console.error('Error generating AI insights:', error);
      
      // Fallback to rule-based insights
      return this.generateRuleBasedInsights(data);
    }
  }
  
  // Generate rule-based insights as fallback
  private generateRuleBasedInsights(data: any): any[] {
    const insights = [];
    
    // Patient growth insight
    if (data.patientGrowth.growthRate < 10) {
      insights.push({
        type: 'conversion_optimization',
        category: 'warning',
        title: 'Slow Patient Growth Detected',
        description: `Patient acquisition is growing at only ${data.patientGrowth.growthRate.toFixed(1)}%, below the 15% target for healthy practices.`,
        analysisData: {
          currentGrowth: data.patientGrowth.growthRate,
          targetGrowth: 15,
          gap: 15 - data.patientGrowth.growthRate
        },
        recommendations: [
          {
            action: 'Launch targeted Google Ads campaign for local physicians',
            impact: 'high',
            effort: 'medium',
            details: 'Focus on "EMR software [city name]" keywords with $50/day budget'
          },
          {
            action: 'Implement referral program with existing users',
            impact: 'medium',
            effort: 'low',
            details: 'Offer 1 month free for successful referrals'
          }
        ],
        priority: 85
      });
    }
    
    // No-show rate insight
    if (data.appointmentTrends.noShowRate > 5) {
      insights.push({
        type: 'user_retention',
        category: 'opportunity',
        title: 'High No-Show Rate Creates Revenue Loss',
        description: `${data.appointmentTrends.noShowRate.toFixed(1)}% no-show rate is costing approximately $${Math.round(data.appointmentTrends.noShows * 175)} in lost revenue.`,
        analysisData: {
          noShowRate: data.appointmentTrends.noShowRate,
          lostRevenue: data.appointmentTrends.noShows * 175,
          industryAverage: 5
        },
        recommendations: [
          {
            action: 'Enable automated appointment reminders',
            impact: 'high',
            effort: 'low',
            details: 'Send SMS/email reminders 24 hours before appointments'
          },
          {
            action: 'Implement no-show fee policy',
            impact: 'medium',
            effort: 'medium',
            details: 'Charge $25 fee for missed appointments without 24-hour notice'
          }
        ],
        priority: 90
      });
    }
    
    // Feature adoption insight
    const topFeature = data.featureUsage[0];
    if (topFeature && data.featureUsage.length > 3) {
      const underusedFeatures = data.featureUsage.slice(-3);
      insights.push({
        type: 'feature_adoption',
        category: 'opportunity',
        title: 'Underutilized Premium Features',
        description: `While ${topFeature.feature} is used ${topFeature.count} times, several features have minimal adoption.`,
        analysisData: {
          topFeature: topFeature,
          underusedFeatures: underusedFeatures,
          adoptionGap: topFeature.count - underusedFeatures[0].count
        },
        recommendations: [
          {
            action: 'Create in-app tutorials for underused features',
            impact: 'medium',
            effort: 'low',
            details: 'Add tooltips and guided tours for complex features'
          },
          {
            action: 'Send feature highlight emails',
            impact: 'medium',
            effort: 'low',
            details: 'Weekly "Did you know?" emails showcasing one feature'
          }
        ],
        priority: 70
      });
    }
    
    // Engagement insight
    if (data.userEngagement.engagementRate < 70) {
      insights.push({
        type: 'user_retention',
        category: 'warning',
        title: 'Low User Engagement Threatens Retention',
        description: `Only ${data.userEngagement.engagementRate.toFixed(1)}% of users are actively using the system.`,
        analysisData: {
          engagementRate: data.userEngagement.engagementRate,
          inactiveUsers: data.userEngagement.totalUsers - data.userEngagement.activeUsers,
          avgEventsPerUser: data.userEngagement.avgEventsPerUser
        },
        recommendations: [
          {
            action: 'Launch re-engagement email campaign',
            impact: 'high',
            effort: 'low',
            details: 'Target inactive users with personalized benefits reminders'
          },
          {
            action: 'Offer free training webinars',
            impact: 'medium',
            effort: 'medium',
            details: 'Weekly 30-minute sessions on maximizing EMR value'
          }
        ],
        priority: 80
      });
    }
    
    return insights;
  }
  
  // Schedule periodic insight generation
  startInsightGeneration(intervalHours: number = 24) {
    setInterval(async () => {
      const healthSystems = await storage.getAllHealthSystems();
      
      for (const healthSystem of healthSystems) {
        await this.generateInsights(healthSystem.id);
      }
    }, intervalHours * 60 * 60 * 1000);
    
    console.log(`🧠 Marketing insights AI generation scheduled every ${intervalHours} hours`);
  }
}

// Export singleton instance
export const marketingInsightsAI = new MarketingInsightsAIService();