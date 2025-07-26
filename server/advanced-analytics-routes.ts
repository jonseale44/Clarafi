import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { APIResponseHandler } from "./api-response-handler";
import { User, AnalyticsEvent } from "@shared/schema";

const router = Router();

// Middleware to ensure admin access
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user || (req.user.role !== 'admin' && req.user.role !== 'system_admin')) {
    return res.status(403).json({ error: "Admin access required for advanced analytics" });
  }
  next();
};

// ==========================================
// Comprehensive Analytics Endpoint
// ==========================================
router.get("/api/analytics/comprehensive", requireAdmin, async (req: any, res: any) => {
  try {
    const { range = '30d', channel = 'all' } = req.query;
    const healthSystemId = req.user.healthSystemId;
    
    // Parse time range
    const now = new Date();
    const rangeMap: { [key: string]: number } = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const daysBack = rangeMap[range as string] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const previousStartDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    // Get current period data
    const currentPeriodData = await getAnalyticsForPeriod(
      healthSystemId,
      startDate,
      now,
      channel as string
    );
    
    // Get previous period data for comparison
    const previousPeriodData = await getAnalyticsForPeriod(
      healthSystemId,
      previousStartDate,
      startDate,
      channel as string
    );
    
    res.json({
      current: currentPeriodData,
      previous: previousPeriodData,
      period: { start: startDate, end: now, days: daysBack }
    });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// Predictive Analytics Endpoint
// ==========================================
router.get("/api/analytics/predictive", requireAdmin, async (req: any, res: any) => {
  try {
    const healthSystemId = req.user.healthSystemId;
    
    // Get user activity data for predictions
    const allUsers = await storage.getAllUsers();
    const users = allUsers.filter(u => u.healthSystemId === healthSystemId);
    const events = await storage.getAnalyticsEvents({
      healthSystemId,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      endDate: new Date()
    });
    
    // Analyze churn risk (users who haven't logged in recently)
    const churnThresholdDays = 14;
    const now = new Date();
    const churnRiskUsers = users.filter(user => {
      if (!user.lastLogin) return true;
      const daysSinceLogin = Math.floor((now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLogin > churnThresholdDays;
    }).map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      lastVisitDays: user.lastLogin 
        ? Math.floor((now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24))
        : 999,
      riskScore: calculateChurnRiskScore(user, events)
    })).sort((a, b) => b.riskScore - a.riskScore);
    
    // Identify high-value opportunities
    const highValueOpportunities = analyzeHighValueOpportunities(users, events);
    
    // Generate campaign optimization suggestions
    const campaignOptimizations = generateCampaignOptimizations(events);
    
    res.json({
      churnRisk: churnRiskUsers.slice(0, 10), // Top 10 at risk
      highValueOpportunities,
      campaignOptimizations,
      analysisDate: new Date()
    });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// User Journey Analytics (CLARAFI acquires users, not patients)
// ==========================================
router.get("/api/analytics/user-journey", requireAdmin, async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    const healthSystemId = req.user.healthSystemId;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Get all events for journey analysis
    const events = await storage.getAnalyticsEvents({
      healthSystemId,
      startDate: start,
      endDate: end
    });
    
    // Get real page views - if no landing page views, use all page views
    const pageViews = events.filter(e => e.eventType === 'page_view');
    const landingPageViews = pageViews.filter(e => e.eventData?.pageType === 'landing');
    const websiteVisits = landingPageViews.length || pageViews.length;
    
    // Get sign-ups and user conversions
    const signUps = events.filter(e => e.eventType === 'conversion_signup').length;
    const allUsers = await storage.getAllUsers();
    const accountsCreated = allUsers.filter(u => 
      u.healthSystemId === healthSystemId &&
      u.createdAt && new Date(u.createdAt) >= start && new Date(u.createdAt) <= end
    ).length;
    
    const firstPatientAdded = events.filter(e => e.eventType === 'conversion_first_patient').length;
    const activeSubscribers = events.filter(e => e.eventType === 'conversion_subscription_upgrade').length;
    
    // Build journey stages for CLARAFI's user acquisition
    const stages = [
      { 
        stage: "Website Visit", 
        count: websiteVisits,
        icon: "Globe"
      },
      { 
        stage: "Sign Up Started", 
        count: signUps,
        icon: "Mail"
      },
      { 
        stage: "Account Created", 
        count: accountsCreated,
        icon: "UserCheck"
      },
      { 
        stage: "First Patient Added", 
        count: firstPatientAdded,
        icon: "Users"
      },
      { 
        stage: "Active Subscriber", 
        count: activeSubscribers,
        icon: "Activity"
      }
    ];
    
    res.json({ stages });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// Channel Attribution Analytics
// ==========================================
router.get("/api/analytics/channel-attribution", requireAdmin, async (req: any, res: any) => {
  try {
    const healthSystemId = req.user.healthSystemId;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    
    // Get all conversion events with attribution
    const conversionEvents = await storage.getAnalyticsEvents({
      healthSystemId,
      eventType: 'conversion_signup',
      startDate,
      endDate
    });
    
    // Analyze by channel
    const channelData: { [key: string]: any } = {
      organic: { patients: 0, revenue: 0, cost: 0 },
      paid: { patients: 0, revenue: 0, cost: 0 },
      social: { patients: 0, revenue: 0, cost: 0 },
      email: { patients: 0, revenue: 0, cost: 0 },
      referral: { patients: 0, revenue: 0, cost: 0 },
      direct: { patients: 0, revenue: 0, cost: 0 }
    };
    
    // Process each conversion
    conversionEvents.forEach(event => {
      const source = event.eventData?.utmSource || event.eventData?.source || 'direct';
      const channel = mapSourceToChannel(source);
      
      if (channelData[channel]) {
        channelData[channel].patients += 1;
        channelData[channel].revenue += event.eventData?.value || 0;
      }
    });
    
    // Add mock cost data for now (would come from ad platforms integration)
    channelData.paid.cost = channelData.paid.patients * 75; // Average CPA
    channelData.social.cost = channelData.social.patients * 50;
    channelData.email.cost = channelData.email.patients * 5;
    
    // Calculate ROI for each channel
    Object.keys(channelData).forEach(channel => {
      const data = channelData[channel];
      data.roi = data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0;
    });
    
    res.json({
      attribution: channelData,
      period: { start: startDate, end: endDate }
    });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// A/B Test Management
// ==========================================
router.post("/api/analytics/ab-tests", requireAdmin, async (req: any, res: any) => {
  try {
    const testData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
      createdBy: req.user.id,
      status: 'active',
      startDate: new Date()
    };
    
    // Store A/B test configuration (would need new table)
    // For now, return mock response
    res.json({
      id: Date.now(),
      ...testData,
      variants: [
        { name: 'control', traffic: 50, conversions: 0 },
        { name: 'variant', traffic: 50, conversions: 0 }
      ]
    });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// Marketing Alerts Configuration
// ==========================================
router.post("/api/analytics/alerts", requireAdmin, async (req: any, res: any) => {
  try {
    const alertConfig = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
      createdBy: req.user.id,
      enabled: true,
      createdAt: new Date()
    };
    
    // Store alert configuration (would need new table)
    res.json({
      id: Date.now(),
      ...alertConfig,
      lastTriggered: null,
      triggerCount: 0
    });
  } catch (error) {
    APIResponseHandler.error(res, error as Error);
  }
});

// ==========================================
// Helper Functions
// ==========================================

async function getAnalyticsForPeriod(
  healthSystemId: number, 
  startDate: Date, 
  endDate: Date, 
  channel: string
) {
  // Get all events for the period
  const events = await storage.getAnalyticsEvents({
    healthSystemId,
    startDate,
    endDate
  });
  
  // Get user data - filter by health system
  const allUsers = await storage.getAllUsers();
  const users = allUsers.filter(u => u.healthSystemId === healthSystemId);
  const newUsers = users.filter(u => 
    u.createdAt && new Date(u.createdAt) >= startDate && new Date(u.createdAt) <= endDate
  );
  
  // Calculate marketing spend (mock data for now)
  const marketingSpend = calculateMarketingSpend(startDate, endDate, channel);
  
  // Calculate metrics
  const websiteVisitors = events.filter(e => e.eventType === 'page_view').length;
  const leads = events.filter(e => e.eventType === 'lead_capture').length;
  const appointments = events.filter(e => e.eventType === 'appointment_booked').length;
  const newPatientsFromWeb = events.filter(e => e.eventType === 'conversion_first_patient').length;
  
  // Email metrics
  const emailEvents = events.filter(e => e.eventType === 'email_sent' || e.eventType === 'email_opened' || e.eventType === 'email_clicked');
  const emailMetrics = {
    sent: emailEvents.filter(e => e.eventType === 'email_sent').length,
    opened: emailEvents.filter(e => e.eventType === 'email_opened').length,
    clicked: emailEvents.filter(e => e.eventType === 'email_clicked').length,
    ctr: emailEvents.filter(e => e.eventType === 'email_sent').length > 0 
      ? (emailEvents.filter(e => e.eventType === 'email_clicked').length / emailEvents.filter(e => e.eventType === 'email_sent').length) * 100 
      : 0
  };
  
  // Revenue calculations - CLARAFI subscription model
  const individualMonthlyRevenue = 149; // Individual provider subscription
  const enterpriseBaseRevenue = 399; // Enterprise base subscription
  const nurseMonthlyRevenue = 99; // Per nurse in enterprise
  const staffMonthlyRevenue = 49; // Per non-clinical staff in enterprise
  
  // Calculate average revenue per user based on subscription model
  const avgMonthlyRevenuePerUser = individualMonthlyRevenue; // Default to individual tier
  const avgCustomerLifetimeMonths = 24; // 2-year average retention
  const avgRevenuePerUser = avgMonthlyRevenuePerUser * avgCustomerLifetimeMonths;
  
  return {
    marketingSpend,
    newPatients: newUsers.length,
    websiteVisitors,
    leads,
    appointments,
    newPatientsFromWeb,
    avgRevenuePerUser,
    avgCustomerLifetimeMonths,
    emailMetrics,
    channelAttribution: await getChannelAttribution(events),
    cpa: newUsers.length > 0 ? marketingSpend / newUsers.length : 0,
    ltv: avgRevenuePerUser
  };
}

function calculateMarketingSpend(startDate: Date, endDate: Date, channel: string): number {
  // Mock calculation - would integrate with ad platforms
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Realistic daily spend for a healthcare practice
  const dailySpend = {
    all: 25,      // $750/month total marketing budget
    organic: 0,   // SEO/content marketing (no direct cost)
    paid: 15,     // $450/month on Google Ads/Facebook
    social: 5,    // $150/month on social media ads
    email: 3,     // $90/month on email marketing tools
    referral: 0,  // No cost for referrals
    direct: 0     // No cost for direct traffic
  };
  return days * (dailySpend[channel as keyof typeof dailySpend] || dailySpend.all);
}

async function getChannelAttribution(events: any[]) {
  const channels: { [key: string]: any } = {};
  
  events.filter(e => e.eventType === 'conversion_signup').forEach(event => {
    const source = event.eventData?.utmSource || event.eventData?.source || 'direct';
    const channel = mapSourceToChannel(source);
    
    if (!channels[channel]) {
      channels[channel] = { patients: 0, revenue: 0, cost: 0 };
    }
    channels[channel].patients += 1;
    channels[channel].revenue += 149 * 24; // Individual subscription LTV (24-month retention)
  });
  
  return channels;
}

function mapSourceToChannel(source: string): string {
  if (source.includes('google') || source.includes('bing')) return 'paid';
  if (source.includes('facebook') || source.includes('twitter') || source.includes('linkedin')) return 'social';
  if (source.includes('email') || source.includes('newsletter')) return 'email';
  if (source.includes('referral') || source.includes('partner')) return 'referral';
  if (source === 'direct' || !source) return 'direct';
  return 'organic';
}

function calculateChurnRiskScore(user: any, events: any[]): number {
  // Simple scoring algorithm
  let score = 0;
  
  // Days since last login
  if (user.lastLogin) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
    score += Math.min(daysSinceLogin * 2, 50); // Max 50 points
  } else {
    score += 50;
  }
  
  // Activity level
  const userEvents = events.filter(e => e.userId === user.id);
  if (userEvents.length === 0) score += 30;
  else if (userEvents.length < 5) score += 20;
  else if (userEvents.length < 10) score += 10;
  
  // Account age
  const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (accountAgeDays < 7) score += 20; // New users more likely to churn
  
  return Math.min(score, 100); // Cap at 100
}

function analyzeHighValueOpportunities(users: any[], events: any[]) {
  // Identify users with high engagement who might upgrade
  const activeUsers = users.filter(user => {
    const userEvents = events.filter(e => e.userId === user.id);
    return userEvents.length > 20; // High activity threshold
  });
  
  return {
    count: activeUsers.length,
    potentialRevenue: activeUsers.length * 500, // Mock upgrade value
    users: activeUsers.slice(0, 5).map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      activityScore: events.filter(e => e.userId === u.id).length
    }))
  };
}

function generateCampaignOptimizations(events: any[]) {
  const optimizations = [];
  
  // Analyze conversion rates
  const pageViews = events.filter(e => e.eventType === 'page_view').length;
  const signups = events.filter(e => e.eventType === 'conversion_signup').length;
  const conversionRate = pageViews > 0 ? (signups / pageViews) * 100 : 0;
  
  if (conversionRate < 2) {
    optimizations.push({
      suggestion: "Landing page conversion below industry average. Consider A/B testing CTA buttons.",
      expectedImprovement: 15,
      priority: 'high'
    });
  }
  
  // Email performance
  const emailClicks = events.filter(e => e.eventType === 'email_clicked').length;
  const emailSends = events.filter(e => e.eventType === 'email_sent').length;
  const emailCtr = emailSends > 0 ? (emailClicks / emailSends) * 100 : 0;
  
  if (emailCtr < 2) {
    optimizations.push({
      suggestion: "Email CTR below healthcare average (2.38%). Personalize subject lines.",
      expectedImprovement: 10,
      priority: 'medium'
    });
  }
  
  // Time-based patterns
  const hourlyDistribution = events.reduce((acc, event) => {
    const hour = new Date(event.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as { [key: number]: number });
  
  const peakHour = Object.entries(hourlyDistribution).sort(([,a], [,b]) => (b as number) - (a as number))[0];
  if (peakHour) {
    optimizations.push({
      suggestion: `Schedule campaigns for ${peakHour[0]}:00 when engagement peaks`,
      expectedImprovement: 8,
      priority: 'low'
    });
  }
  
  return optimizations;
}

export default router;