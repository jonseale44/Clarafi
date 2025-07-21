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
  if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'system_admin')) {
    return res.status(403).json({ error: "Admin access required for marketing analytics" });
  }
  next();
};

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

// Get conversion events
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

// Create marketing insight (stub - would be generated by analytics engine)
router.post("/api/marketing/insights", requireAdmin, async (req, res) => {
  try {
    const insightData = {
      ...req.body,
      healthSystemId: req.user.healthSystemId,
      generatedAt: new Date(),
    };
    
    const validatedData = insertMarketingInsightSchema.parse(insightData);
    const insight = await storage.createMarketingInsight(validatedData);
    res.json(insight);
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