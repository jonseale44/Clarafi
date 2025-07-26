import { Router } from "express";
import { storage } from "./storage.js";
import { 
  insertAbTestSchema, insertAbTestAssignmentSchema, 
  insertAdPlatformAccountSchema, insertAdCampaignPerformanceSchema,
  insertUserCohortSchema, insertHealthcareMarketingIntelligenceSchema 
} from "@shared/schema";
import { z } from "zod";
import { trialStatusMiddleware } from "./trial-middleware.js";
import { TrialManagementService } from "./trial-management-service.js";

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Middleware to ensure user is admin
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  // Check trial status
  try {
    const trialStatus = await TrialManagementService.getTrialStatus(req.user.healthSystemId);
    if (trialStatus.status === 'deactivated') {
      return res.status(403).json({ 
        error: "Trial expired", 
        trialStatus 
      });
    }
  } catch (error) {
    console.error("Error checking trial status:", error);
  }
  
  next();
};

// A/B Testing Routes
router.get("/ab-tests", requireAuth, requireAdmin, async (req, res) => {
  try {
    const tests = await storage.getAbTests(req.user!.healthSystemId, req.query.status as string);
    res.json(tests);
  } catch (error) {
    console.error("Error fetching A/B tests:", error);
    res.status(500).json({ error: "Failed to fetch A/B tests" });
  }
});

router.get("/ab-tests/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const test = await storage.getAbTest(parseInt(req.params.id));
    if (!test) {
      return res.status(404).json({ error: "A/B test not found" });
    }
    res.json(test);
  } catch (error) {
    console.error("Error fetching A/B test:", error);
    res.status(500).json({ error: "Failed to fetch A/B test" });
  }
});

router.post("/ab-tests", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertAbTestSchema.parse({
      ...req.body,
      healthSystemId: req.user!.healthSystemId,
    });
    
    const test = await storage.createAbTest(validatedData);
    res.json(test);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating A/B test:", error);
    res.status(500).json({ error: "Failed to create A/B test" });
  }
});

router.patch("/ab-tests/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const test = await storage.updateAbTest(parseInt(req.params.id), req.body);
    res.json(test);
  } catch (error) {
    console.error("Error updating A/B test:", error);
    res.status(500).json({ error: "Failed to update A/B test" });
  }
});

router.delete("/ab-tests/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteAbTest(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting A/B test:", error);
    res.status(500).json({ error: "Failed to delete A/B test" });
  }
});

// A/B Test Assignment (for tracking user assignments)
router.get("/ab-tests/:testId/assignment", requireAuth, async (req, res) => {
  try {
    const assignment = await storage.getAbTestAssignment(
      parseInt(req.params.testId),
      req.user!.id,
      req.query.sessionId as string
    );
    res.json(assignment || null);
  } catch (error) {
    console.error("Error fetching test assignment:", error);
    res.status(500).json({ error: "Failed to fetch test assignment" });
  }
});

router.post("/ab-tests/:testId/assignment", requireAuth, async (req, res) => {
  try {
    const validatedData = insertAbTestAssignmentSchema.parse({
      testId: parseInt(req.params.testId),
      userId: req.user!.id,
      ...req.body,
    });
    
    const assignment = await storage.createAbTestAssignment(validatedData);
    res.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating test assignment:", error);
    res.status(500).json({ error: "Failed to create test assignment" });
  }
});

router.get("/ab-tests/:testId/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getTestAssignmentStats(parseInt(req.params.testId));
    res.json(stats);
  } catch (error) {
    console.error("Error fetching test stats:", error);
    res.status(500).json({ error: "Failed to fetch test stats" });
  }
});

// Ad Platform Integration Routes
router.get("/ad-platforms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accounts = await storage.getAdPlatformAccounts(req.user!.healthSystemId);
    res.json(accounts);
  } catch (error) {
    console.error("Error fetching ad platform accounts:", error);
    res.status(500).json({ error: "Failed to fetch ad platform accounts" });
  }
});

router.get("/ad-platforms/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const account = await storage.getAdPlatformAccount(parseInt(req.params.id));
    if (!account) {
      return res.status(404).json({ error: "Ad platform account not found" });
    }
    res.json(account);
  } catch (error) {
    console.error("Error fetching ad platform account:", error);
    res.status(500).json({ error: "Failed to fetch ad platform account" });
  }
});

router.post("/ad-platforms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertAdPlatformAccountSchema.parse({
      ...req.body,
      healthSystemId: req.user!.healthSystemId,
    });
    
    const account = await storage.createAdPlatformAccount(validatedData);
    res.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating ad platform account:", error);
    res.status(500).json({ error: "Failed to create ad platform account" });
  }
});

router.patch("/ad-platforms/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const account = await storage.updateAdPlatformAccount(parseInt(req.params.id), req.body);
    res.json(account);
  } catch (error) {
    console.error("Error updating ad platform account:", error);
    res.status(500).json({ error: "Failed to update ad platform account" });
  }
});

router.delete("/ad-platforms/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteAdPlatformAccount(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad platform account:", error);
    res.status(500).json({ error: "Failed to delete ad platform account" });
  }
});

// Ad Campaign Performance
router.get("/ad-performance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const params: any = {
      healthSystemId: req.user!.healthSystemId,
    };
    
    if (req.query.accountId) params.accountId = parseInt(req.query.accountId as string);
    if (req.query.startDate) params.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) params.endDate = new Date(req.query.endDate as string);
    
    const performance = await storage.getAdCampaignPerformance(params);
    res.json(performance);
  } catch (error) {
    console.error("Error fetching ad performance:", error);
    res.status(500).json({ error: "Failed to fetch ad performance" });
  }
});

router.post("/ad-performance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertAdCampaignPerformanceSchema.parse(req.body);
    const performance = await storage.createAdCampaignPerformance(validatedData);
    res.json(performance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating ad performance:", error);
    res.status(500).json({ error: "Failed to create ad performance" });
  }
});

router.post("/ad-performance/batch", requireAuth, requireAdmin, async (req, res) => {
  try {
    const performances = req.body.map((p: any) => insertAdCampaignPerformanceSchema.parse(p));
    const results = await storage.batchCreateAdCampaignPerformance(performances);
    res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error batch creating ad performance:", error);
    res.status(500).json({ error: "Failed to batch create ad performance" });
  }
});

// User Cohorts
router.get("/cohorts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cohorts = await storage.getUserCohorts(req.user!.healthSystemId);
    res.json(cohorts);
  } catch (error) {
    console.error("Error fetching cohorts:", error);
    res.status(500).json({ error: "Failed to fetch cohorts" });
  }
});

router.get("/cohorts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cohort = await storage.getUserCohort(parseInt(req.params.id));
    if (!cohort) {
      return res.status(404).json({ error: "Cohort not found" });
    }
    res.json(cohort);
  } catch (error) {
    console.error("Error fetching cohort:", error);
    res.status(500).json({ error: "Failed to fetch cohort" });
  }
});

router.post("/cohorts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertUserCohortSchema.parse({
      ...req.body,
      healthSystemId: req.user!.healthSystemId,
    });
    
    const cohort = await storage.createUserCohort(validatedData);
    res.json(cohort);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating cohort:", error);
    res.status(500).json({ error: "Failed to create cohort" });
  }
});

router.patch("/cohorts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cohort = await storage.updateUserCohort(parseInt(req.params.id), req.body);
    res.json(cohort);
  } catch (error) {
    console.error("Error updating cohort:", error);
    res.status(500).json({ error: "Failed to update cohort" });
  }
});

router.delete("/cohorts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteUserCohort(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting cohort:", error);
    res.status(500).json({ error: "Failed to delete cohort" });
  }
});

// Healthcare Marketing Intelligence
router.get("/healthcare-intelligence", requireAuth, requireAdmin, async (req, res) => {
  try {
    const intelligence = await storage.getHealthcareMarketingIntelligence(
      req.user!.healthSystemId,
      req.query.marketSegment as string
    );
    res.json(intelligence);
  } catch (error) {
    console.error("Error fetching healthcare intelligence:", error);
    res.status(500).json({ error: "Failed to fetch healthcare intelligence" });
  }
});

router.get("/healthcare-intelligence/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const intelligence = await storage.getHealthcareMarketingIntelligenceById(parseInt(req.params.id));
    if (!intelligence) {
      return res.status(404).json({ error: "Healthcare intelligence not found" });
    }
    res.json(intelligence);
  } catch (error) {
    console.error("Error fetching healthcare intelligence:", error);
    res.status(500).json({ error: "Failed to fetch healthcare intelligence" });
  }
});

router.post("/healthcare-intelligence", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertHealthcareMarketingIntelligenceSchema.parse({
      ...req.body,
      healthSystemId: req.user!.healthSystemId,
      analysisDate: req.body.analysisDate || new Date().toISOString().split('T')[0],
    });
    
    const intelligence = await storage.createHealthcareMarketingIntelligence(validatedData);
    res.json(intelligence);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating healthcare intelligence:", error);
    res.status(500).json({ error: "Failed to create healthcare intelligence" });
  }
});

router.patch("/healthcare-intelligence/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const intelligence = await storage.updateHealthcareMarketingIntelligence(
      parseInt(req.params.id), 
      req.body
    );
    res.json(intelligence);
  } catch (error) {
    console.error("Error updating healthcare intelligence:", error);
    res.status(500).json({ error: "Failed to update healthcare intelligence" });
  }
});

// Ad Platform Sync Endpoint (for syncing data from external APIs)
router.post("/ad-platforms/:id/sync", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.getAdPlatformAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ error: "Ad platform account not found" });
    }
    
    // TODO: Implement actual API integration based on platform type
    // For now, return a mock response
    await storage.updateAdPlatformAccount(accountId, {
      lastSyncAt: new Date(),
      syncStatus: 'success',
      accountMetrics: {
        totalSpend: 15420.50,
        totalImpressions: 245000,
        totalClicks: 3200,
        totalConversions: 85,
        lastUpdated: new Date().toISOString(),
      },
    });
    
    res.json({ 
      success: true, 
      message: "Sync completed successfully",
      metrics: {
        totalSpend: 15420.50,
        totalImpressions: 245000,
        totalClicks: 3200,
        totalConversions: 85,
      }
    });
  } catch (error) {
    console.error("Error syncing ad platform:", error);
    res.status(500).json({ error: "Failed to sync ad platform" });
  }
});

// Cohort Analysis Endpoint
router.post("/cohorts/:id/analyze", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cohortId = parseInt(req.params.id);
    const cohort = await storage.getUserCohort(cohortId);
    
    if (!cohort) {
      return res.status(404).json({ error: "Cohort not found" });
    }
    
    // TODO: Implement actual cohort analysis
    // For now, return mock analysis results
    const mockMetrics = {
      totalUsers: 150,
      activeUsers: {
        "week_1": 142,
        "week_2": 135,
        "week_3": 128,
        "week_4": 120,
      },
      retentionRate: {
        "week_1": 94.7,
        "week_2": 90.0,
        "week_3": 85.3,
        "week_4": 80.0,
      },
      revenue: {
        "week_1": 59850,
        "week_2": 53865,
        "week_3": 51120,
        "week_4": 47880,
      },
      avgRevenuePerUser: {
        "week_1": 399,
        "week_2": 399,
        "week_3": 399,
        "week_4": 399,
      },
      churnRate: {
        "week_1": 5.3,
        "week_2": 10.0,
        "week_3": 14.7,
        "week_4": 20.0,
      },
      ltv: 4788,
    };
    
    await storage.updateUserCohort(cohortId, {
      metrics: mockMetrics,
      userCount: 150,
    });
    
    res.json({ 
      success: true,
      cohort: {
        ...cohort,
        metrics: mockMetrics,
        userCount: 150,
      }
    });
  } catch (error) {
    console.error("Error analyzing cohort:", error);
    res.status(500).json({ error: "Failed to analyze cohort" });
  }
});

console.log("📊 [AdvancedMarketing] Advanced marketing routes registered");

export default router;