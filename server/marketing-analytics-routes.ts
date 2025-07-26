import { Router } from "express";
import { storage } from "./storage";
import { APIResponseHandler } from "./api-response-handler";
import { z } from "zod";
import {
  insertMarketingMetricsSchema,
  insertUserAcquisitionSchema,
  insertConversionEventSchema,
  insertMarketingInsightSchema,
  insertMarketingAutomationSchema,
  insertMarketingCampaignSchema,
} from "@shared/schema";

const router = Router();

// Middleware to ensure admin access for marketing routes
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user || (req.user.role !== 'admin' && req.user.role !== 'system_admin')) {
    return res.status(403).json({ error: "Admin access required for marketing analytics" });
  }
  next();
};

// ==========================================
// Analytics Dashboard Endpoints
// ==========================================

// Get analytics summary
router.get("/api/analytics/summary", requireAdmin, async (req, res) => {
  try {
    const { from, to, healthSystem } = req.query;
    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to as string) : new Date();
    
    // Get real analytics data from the database
    const events = await storage.getAnalyticsEvents({
      healthSystemId: req.user.healthSystemId,
      startDate,
      endDate,
    });
    
    // Get user stats from events
    const activeUserIds = new Set(events.map(e => e.userId).filter(Boolean));
    const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean));
    
    // Get total user count from conversion events
    const totalSignups = events.filter(e => e.eventType === 'conversion_signup');
    const totalUsers = new Set(totalSignups.map(e => e.userId).filter(Boolean)).size;
    
    // Calculate session durations
    const sessionDurations: { [key: string]: number } = {};
    const sessionStarts: { [key: string]: Date } = {};
    
    events.forEach(event => {
      if (!event.sessionId) return;
      
      if (event.eventType === 'session_start' || !sessionStarts[event.sessionId]) {
        sessionStarts[event.sessionId] = new Date(event.timestamp);
      }
      
      const duration = new Date(event.timestamp).getTime() - sessionStarts[event.sessionId].getTime();
      sessionDurations[event.sessionId] = Math.max(sessionDurations[event.sessionId] || 0, duration);
    });
    
    const avgSessionDuration = Object.values(sessionDurations).length > 0
      ? Object.values(sessionDurations).reduce((a, b) => a + b, 0) / Object.values(sessionDurations).length / 60000
      : 0;
    
    // Count clinical events
    const patientCreations = events.filter(e => e.eventType === 'feature_usage' && e.eventData?.feature === 'patient_creation');
    const encounterCreations = events.filter(e => e.eventType === 'feature_usage' && e.eventData?.feature === 'encounter_creation');
    const soapNotes = events.filter(e => e.eventType === 'feature_usage' && e.eventData?.feature === 'soap_note_generation');
    const attachmentUploads = events.filter(e => e.eventType === 'feature_usage' && e.eventData?.feature === 'attachment_upload');
    const orderCreations = events.filter(e => e.eventType === 'feature_usage' && e.eventData?.feature === 'order_creation');
    
    // Calculate conversion metrics
    const signups = events.filter(e => e.eventType === 'conversion_signup');
    const trialStarts = events.filter(e => e.eventType === 'conversion_trial_start');
    const subscriptions = events.filter(e => e.eventType === 'conversion_subscription_upgrade');
    
    const conversionRate = signups.length > 0 ? (subscriptions.length / signups.length) * 100 : 0;
    
    // Generate user engagement data by date
    const userEngagementByDate: { [key: string]: { activeUsers: Set<number>, newUsers: number, sessionDurations: number[] } } = {};
    
    events.forEach(event => {
      const dateKey = new Date(event.timestamp).toISOString().split('T')[0];
      if (!userEngagementByDate[dateKey]) {
        userEngagementByDate[dateKey] = { activeUsers: new Set(), newUsers: 0, sessionDurations: [] };
      }
      
      if (event.userId) {
        userEngagementByDate[dateKey].activeUsers.add(event.userId);
      }
      
      if (event.eventType === 'conversion_signup') {
        userEngagementByDate[dateKey].newUsers++;
      }
      
      if (event.sessionId && sessionDurations[event.sessionId]) {
        userEngagementByDate[dateKey].sessionDurations.push(sessionDurations[event.sessionId]);
      }
    });
    
    const userEngagement = Object.entries(userEngagementByDate).map(([date, data]) => ({
      date,
      activeUsers: data.activeUsers.size,
      newUsers: data.newUsers,
      avgSessionDuration: data.sessionDurations.length > 0
        ? data.sessionDurations.reduce((a, b) => a + b, 0) / data.sessionDurations.length / 60000
        : 0
    }));
    
    // Calculate clinical efficiency metrics
    const soapGenerationTimes: number[] = [];
    soapNotes.forEach(event => {
      if (event.eventData?.duration) {
        soapGenerationTimes.push(Number(event.eventData.duration));
      }
    });
    
    const avgSOAPTime = soapGenerationTimes.length > 0
      ? soapGenerationTimes.reduce((a, b) => a + b, 0) / soapGenerationTimes.length / 60000
      : 0;
    
    const ordersPerEncounter = encounterCreations.length > 0
      ? orderCreations.length / encounterCreations.length
      : 0;
    
    // Identify opportunities based on real data
    const opportunities = [];
    
    // Check for high engagement users
    const userEventCounts: { [key: number]: number } = {};
    events.forEach(event => {
      if (event.userId) {
        userEventCounts[event.userId] = (userEventCounts[event.userId] || 0) + 1;
      }
    });
    
    const highEngagementUserIds = Object.entries(userEventCounts)
      .filter(([_, count]) => count > 100)
      .map(([userId, _]) => parseInt(userId));
    
    if (highEngagementUserIds.length > 0) {
      opportunities.push({
        type: "high_usage",
        message: `${highEngagementUserIds.length} provider(s) have high engagement - perfect for case study`,
        priority: "high"
      });
    }
    
    // Check for low activity - if we have users but few active ones
    if (totalUsers > 0 && activeUserIds.size < totalUsers * 0.5) {
      opportunities.push({
        type: "churn_risk",
        message: `Only ${activeUserIds.size} of ${totalUsers} providers were active during this period`,
        priority: "urgent"
      });
    }
    
    // Check for upsell opportunities (users with many patients)
    const patientsByUser: { [key: number]: number } = {};
    patientCreations.forEach(event => {
      if (event.userId) {
        patientsByUser[event.userId] = (patientsByUser[event.userId] || 0) + 1;
      }
    });
    
    const highPatientUsers = Object.entries(patientsByUser).filter(([_, count]) => count > 20);
    if (highPatientUsers.length > 0) {
      opportunities.push({
        type: "upsell",
        message: `${highPatientUsers.length} providers approaching patient limit - upgrade opportunity`,
        priority: "medium"
      });
    }
    
    // Build response with real data
    const analyticsData = {
      keyMetrics: {
        totalUsers: totalUsers,
        activeUsers: activeUserIds.size,
        newPatients: patientCreations.length,
        totalEncounters: encounterCreations.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
        customerLifetimeValue: 15000, // This would require payment data
        patientAcquisitionCost: 125 // This would require marketing spend data
      },
      userEngagement: userEngagement.sort((a, b) => a.date.localeCompare(b.date)),
      clinicalEfficiency: {
        avgSOAPTime: Math.round(avgSOAPTime * 10) / 10,
        avgEncounterDuration: 12, // Would require more detailed tracking
        documentsProcessedPerDay: Math.round(attachmentUploads.length / Math.max(1, userEngagement.length)),
        ordersPerEncounter: Math.round(ordersPerEncounter * 10) / 10
      },
      opportunities
    };
    
    res.json(analyticsData);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get conversion funnel data
router.get("/api/analytics/conversions", requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to as string) : new Date();
    
    // Get all events within date range
    const events = await storage.getAnalyticsEvents({
      healthSystemId: req.user.healthSystemId,
      startDate,
      endDate,
    });
    
    // Count unique users at each stage
    const pageViewUsers = new Set<number>();
    const signupStartedUsers = new Set<number>();
    const accountCreatedUsers = new Set<number>();
    const firstPatientUsers = new Set<number>();
    const firstSOAPUsers = new Set<number>();
    const paidConversionUsers = new Set<number>();
    
    // Track user journey through funnel
    events.forEach(event => {
      if (!event.userId) return;
      
      // Page views (any page_view event)
      if (event.eventType === 'page_view') {
        pageViewUsers.add(event.userId);
      }
      
      // Sign up started (viewed auth page or started signup)
      if (event.eventType === 'page_view' && event.eventData?.page === '/auth') {
        signupStartedUsers.add(event.userId);
      }
      
      // Account created
      if (event.eventType === 'conversion_signup') {
        accountCreatedUsers.add(event.userId);
      }
      
      // First patient added
      if (event.eventType === 'feature_usage' && event.eventData?.feature === 'patient_creation') {
        firstPatientUsers.add(event.userId);
      }
      
      // First SOAP note
      if (event.eventType === 'feature_usage' && event.eventData?.feature === 'soap_note_generation') {
        firstSOAPUsers.add(event.userId);
      }
      
      // Paid conversion
      if (event.eventType === 'conversion_subscription_upgrade') {
        paidConversionUsers.add(event.userId);
      }
    });
    
    // Calculate funnel with real data
    const baseCount = Math.max(pageViewUsers.size, 1); // Avoid division by zero
    
    const funnel = [
      { 
        stage: "Landing Page Visits", 
        count: pageViewUsers.size, 
        percentage: 100 
      },
      { 
        stage: "Sign Up Started", 
        count: signupStartedUsers.size, 
        percentage: Math.round((signupStartedUsers.size / baseCount) * 100 * 10) / 10 
      },
      { 
        stage: "Account Created", 
        count: accountCreatedUsers.size, 
        percentage: Math.round((accountCreatedUsers.size / baseCount) * 100 * 10) / 10 
      },
      { 
        stage: "First Patient Added", 
        count: firstPatientUsers.size, 
        percentage: Math.round((firstPatientUsers.size / baseCount) * 100 * 10) / 10 
      },
      { 
        stage: "First SOAP Note", 
        count: firstSOAPUsers.size, 
        percentage: Math.round((firstSOAPUsers.size / baseCount) * 100 * 10) / 10 
      },
      { 
        stage: "Paid Conversion", 
        count: paidConversionUsers.size, 
        percentage: Math.round((paidConversionUsers.size / baseCount) * 100 * 10) / 10 
      }
    ];
    
    res.json({ funnel });
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get feature usage analytics
router.get("/api/analytics/feature-usage", requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to as string) : new Date();
    
    // Get all feature usage events within date range
    const events = await storage.getAnalyticsEvents({
      healthSystemId: req.user.healthSystemId,
      eventType: 'feature_usage',
      startDate,
      endDate,
    });
    
    // Count feature usage by feature name
    const featureCounts: { [key: string]: number } = {};
    
    events.forEach(event => {
      if (event.eventData?.feature) {
        const feature = event.eventData.feature;
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      }
    });
    
    // Map feature names to display names
    const featureDisplayNames: { [key: string]: string } = {
      'soap_note_generation': 'SOAP Note Generation',
      'attachment_upload': 'Attachment Processing',
      'order_creation': 'Order Creation',
      'lab_order_creation': 'Lab Order Creation',
      'template_usage': 'Template Usage',
      'template_created': 'Template Creation',
      'medication_prescription': 'Medication Prescribing',
      'patient_creation': 'Patient Creation',
      'bulk_upload': 'Bulk Document Upload',
      'diagnosis_added': 'Diagnoses Management',
      'diagnosis_updated': 'Diagnoses Updated',
      'diagnosis_removed': 'Diagnoses Removed',
      'encounter_creation': 'Encounter Creation',
      'lab_result_view': 'Lab Result Viewing',
    };
    
    // Aggregate similar features
    const aggregatedCounts: { [key: string]: number } = {};
    
    Object.entries(featureCounts).forEach(([feature, count]) => {
      const displayName = featureDisplayNames[feature] || feature;
      
      // Aggregate order types
      if (feature.includes('order') && feature !== 'lab_order_creation') {
        aggregatedCounts['Order Creation'] = (aggregatedCounts['Order Creation'] || 0) + count;
      }
      // Aggregate diagnosis operations
      else if (feature.startsWith('diagnosis_')) {
        aggregatedCounts['Diagnoses Management'] = (aggregatedCounts['Diagnoses Management'] || 0) + count;
      }
      // Aggregate template operations
      else if (feature.startsWith('template_')) {
        aggregatedCounts['Template Usage'] = (aggregatedCounts['Template Usage'] || 0) + count;
      }
      else {
        aggregatedCounts[displayName] = (aggregatedCounts[displayName] || 0) + count;
      }
    });
    
    // Convert to array and sort by usage count
    const features = Object.entries(aggregatedCounts)
      .map(([feature, usageCount]) => ({ feature, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount);
    
    res.json({ features });
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get acquisition analytics
router.get("/api/analytics/acquisition", requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to as string) : new Date();
    
    // Get real acquisition data from the database
    const acquisitions = await storage.getUserAcquisitionByHealthSystem(req.user.healthSystemId);
    
    // Get conversion events for the same period
    const conversionEvents = await storage.getConversionEvents({
      healthSystemId: req.user.healthSystemId,
      startDate,
      endDate,
    });
    
    // Group acquisitions by channel
    const channelStats: { [key: string]: { users: number, conversions: number } } = {};
    let totalUsers = 0;
    
    acquisitions.forEach(acq => {
      const channel = acq.channel || 'Direct';
      if (!channelStats[channel]) {
        channelStats[channel] = { users: 0, conversions: 0 };
      }
      channelStats[channel].users++;
      totalUsers++;
      
      // Check if this user has conversion events
      const userConversions = conversionEvents.filter(e => e.userId === acq.userId);
      if (userConversions.length > 0) {
        channelStats[channel].conversions++;
      }
    });
    
    // Format channel data with percentages
    const channels = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      users: stats.users,
      percentage: totalUsers > 0 ? Math.round((stats.users / totalUsers) * 100) : 0,
      conversions: stats.conversions,
      conversionRate: stats.users > 0 ? Math.round((stats.conversions / stats.users) * 1000) / 10 : 0
    })).sort((a, b) => b.users - a.users);
    
    // Generate trends data by date
    const trendsByDate: { [key: string]: { signups: number, trials: number, conversions: number } } = {};
    
    // Count signups (acquisitions) by date
    acquisitions.forEach(acq => {
      const dateKey = new Date(acq.acquisitionDate).toISOString().split('T')[0];
      if (!trendsByDate[dateKey]) {
        trendsByDate[dateKey] = { signups: 0, trials: 0, conversions: 0 };
      }
      trendsByDate[dateKey].signups++;
    });
    
    // Count conversions by date
    conversionEvents.forEach(event => {
      const dateKey = new Date(event.eventTimestamp).toISOString().split('T')[0];
      if (!trendsByDate[dateKey]) {
        trendsByDate[dateKey] = { signups: 0, trials: 0, conversions: 0 };
      }
      
      if (event.eventType === 'conversion_trial_start') {
        trendsByDate[dateKey].trials++;
      } else if (event.eventType === 'conversion_subscription_upgrade') {
        trendsByDate[dateKey].conversions++;
      }
    });
    
    // Format trends as array sorted by date
    const trends = Object.entries(trendsByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const acquisitionData = {
      channels,
      trends
    };
    
    res.json(acquisitionData);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});



// ==========================================
// Module 1: Marketing Metrics Dashboard
// ==========================================

// Get marketing metrics
router.get("/api/marketing/metrics", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, metricType } = req.query;
    
    const params = {
      healthSystemId: req.user.healthSystemId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      metricType: metricType as string | undefined,
    };
    
    const metrics = await storage.getMarketingMetrics(params);
    res.json(metrics);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Create/update marketing metrics (stub - would be populated by tracking system)
router.post("/api/marketing/metrics", requireAdmin, async (req, res) => {
  try {
    const metricsData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
    };
    
    const validatedData = insertMarketingMetricsSchema.parse(metricsData);
    const metrics = await storage.createMarketingMetrics(validatedData);
    res.json(metrics);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Module 2: User Acquisition Tracking
// ==========================================

// Get acquisition data for a specific user
router.get("/api/marketing/acquisition/user/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const acquisition = await storage.getUserAcquisition(userId);
    res.json(acquisition || null);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get all acquisitions for health system
router.get("/api/marketing/acquisition", requireAdmin, async (req, res) => {
  try {
    const acquisitions = await storage.getUserAcquisitionByHealthSystem(req.user.healthSystemId);
    res.json(acquisitions);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Track user acquisition (stub - would be called during signup)
router.post("/api/marketing/acquisition", requireAdmin, async (req, res) => {
  try {
    const acquisitionData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
    };
    
    const validatedData = insertUserAcquisitionSchema.parse(acquisitionData);
    const acquisition = await storage.createUserAcquisition(validatedData);
    res.json(acquisition);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Module 3: Conversion Event Logging
// ==========================================

// Track conversion event (accessible by authenticated users)
router.post("/api/marketing/conversions", async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const conversionData = {
      ...req.body,
      userId: req.user.id,
      healthSystemId: req.user.healthSystemId,
      timestamp: new Date(),
    };
    
    const validatedData = insertConversionEventSchema.parse(conversionData);
    const event = await storage.createConversionEvent(validatedData);
    res.json(event);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Analytics Events Tracking
// ==========================================

// Track analytics event (accessible by authenticated users)
router.post("/api/analytics/events", async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const eventData = {
      ...req.body,
      userId: req.body.userId || req.user.id,
      healthSystemId: req.body.healthSystemId || req.user.healthSystemId,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
    };
    
    const event = await storage.createAnalyticsEvent(eventData);
    res.json(event);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Track batch analytics events
router.post("/api/analytics/events/batch", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const events = req.body.events || [];
    const eventsWithUser = events.map((event: any) => ({
      ...event,
      userId: event.userId || req.user.id,
      healthSystemId: event.healthSystemId || req.user.healthSystemId,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    }));
    
    const createdEvents = await storage.createAnalyticsEventsBatch(eventsWithUser);
    res.json({ events: createdEvents });
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get analytics events (admin only)
router.get("/api/analytics/events", requireAdmin, async (req, res) => {
  try {
    const params = {
      healthSystemId: req.user.healthSystemId,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      sessionId: req.query.sessionId as string | undefined,
      eventType: req.query.eventType as string | undefined,
      eventCategory: req.query.eventCategory as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 1000,
    };
    
    const events = await storage.getAnalyticsEvents(params);
    res.json(events);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get feature usage stats (admin only)
router.get("/api/analytics/feature-usage", requireAdmin, async (req, res) => {
  try {
    const params = {
      healthSystemId: req.user.healthSystemId,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      featureName: req.query.featureName as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };
    
    const stats = await storage.getFeatureUsageStats(params);
    res.json(stats);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Get conversion events (admin only)
router.get("/api/marketing/conversions", requireAdmin, async (req, res) => {
  try {
    const { userId, eventType, startDate, endDate } = req.query;
    
    const params = {
      healthSystemId: req.user.healthSystemId,
      userId: userId ? parseInt(userId as string) : undefined,
      eventType: eventType as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };
    
    const events = await storage.getConversionEvents(params);
    res.json(events);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Log conversion event (stub - would be called throughout app)
router.post("/api/marketing/conversions", requireAdmin, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
      eventTimestamp: new Date(),
    };
    
    const validatedData = insertConversionEventSchema.parse(eventData);
    const event = await storage.createConversionEvent(validatedData);
    res.json(event);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Module 4: Marketing Insights (Stub)
// ==========================================

// Get marketing insights
router.get("/api/marketing/insights", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const insights = await storage.getMarketingInsights(
      req.user.healthSystemId, 
      status as string | undefined
    );
    res.json(insights);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Generate AI-powered marketing insights
router.post("/api/marketing/insights/generate", requireAdmin, async (req, res) => {
  try {
    const { marketingInsightsAI } = await import('./services/marketing-insights-ai-service');
    const insights = await marketingInsightsAI.generateInsights(req.user.healthSystemId);
    res.json({ 
      generated: insights.length, 
      insights: insights.slice(0, 5) // Return top 5 insights
    });
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Update insight status
router.patch("/api/marketing/insights/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Add timestamps for status changes
    if (updates.status === 'acknowledged' && !updates.acknowledgedAt) {
      updates.acknowledgedAt = new Date();
    } else if (updates.status === 'implemented' && !updates.implementedAt) {
      updates.implementedAt = new Date();
    }
    
    const insight = await storage.updateMarketingInsight(id, updates);
    res.json(insight);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Module 5: Marketing Automations (Stub)
// ==========================================

// Get marketing automations
router.get("/api/marketing/automations", requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.query;
    const automations = await storage.getMarketingAutomations(
      req.user.healthSystemId,
      enabled !== undefined ? enabled === 'true' : undefined
    );
    res.json(automations);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Create marketing automation
router.post("/api/marketing/automations", requireAdmin, async (req, res) => {
  try {
    const automationData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
    };
    
    const validatedData = insertMarketingAutomationSchema.parse(automationData);
    const automation = await storage.createMarketingAutomation(validatedData);
    res.json(automation);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Update automation
router.patch("/api/marketing/automations/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Update execution timestamps if triggered
    if (updates.lastTriggered) {
      updates.lastTriggered = new Date();
    }
    if (updates.lastExecuted) {
      updates.lastExecuted = new Date();
      updates.executionCount = (updates.executionCount || 0) + 1;
    }
    
    const automation = await storage.updateMarketingAutomation(id, updates);
    res.json(automation);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// ==========================================
// Marketing Campaigns
// ==========================================

// Get marketing campaigns
router.get("/api/marketing/campaigns", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const campaigns = await storage.getMarketingCampaigns(
      req.user.healthSystemId,
      status as string | undefined
    );
    res.json(campaigns);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Create marketing campaign
router.post("/api/marketing/campaigns", requireAdmin, async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
    };
    
    const validatedData = insertMarketingCampaignSchema.parse(campaignData);
    const campaign = await storage.createMarketingCampaign(validatedData);
    res.json(campaign);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

// Update campaign
router.patch("/api/marketing/campaigns/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await storage.updateMarketingCampaign(id, req.body);
    res.json(campaign);
  } catch (error) {
    APIResponseHandler.error(res, error);
  }
});

export default router;