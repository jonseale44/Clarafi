/**
 * Enhanced Laboratory Routes
 * Production-level API endpoints for comprehensive lab management
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { labOrders, labResults, patients, users, encounters } from "@shared/schema";
import { eq, and, desc, gte, lte, isNull, sql } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import { labIntelligenceService } from "./lab-intelligence-service";

const router = Router();

/**
 * GET /api/patients/:patientId/lab-results-enhanced
 * 
 * ENHANCED LAB RESULTS ENDPOINT - Use this for comprehensive clinical review
 * 
 * Features:
 * - AI interpretation and clinical context
 * - Historical trending analysis
 * - Provider review status tracking
 * - Clinical decision support data
 * 
 * Use cases: Clinical review interfaces, comprehensive lab tables, provider workflows
 * Performance: Slower due to complex joins and AI data processing
 * 
 * For basic lab displays, use /api/patients/:patientId/lab-results instead
 */
router.get("/patients/:patientId/lab-results-enhanced", async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const timeframe = req.query.timeframe as string || "1year";
    
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "3months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date("2000-01-01"); // All time
    }

    const enhancedResults = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        loincCode: labResults.loincCode,
        testCategory: labResults.testCategory,
        resultValue: labResults.resultValue,
        resultNumeric: labResults.resultNumeric,
        resultUnits: labResults.resultUnits,
        referenceRange: labResults.referenceRange,
        abnormalFlag: labResults.abnormalFlag,
        criticalFlag: labResults.criticalFlag,
        resultAvailableAt: labResults.resultAvailableAt,
        resultStatus: labResults.resultStatus,
        reviewedBy: labResults.reviewedBy,
        reviewedAt: labResults.reviewedAt,
        aiInterpretation: labResults.aiInterpretation,
        trendDirection: labResults.trendDirection,
        percentChange: labResults.percentChange,
        previousValue: labResults.previousValue,
        previousDate: labResults.previousDate,
        
        // Order information
        orderedBy: labOrders.orderedBy,
        orderedAt: labOrders.orderedAt,
        clinicalIndication: labOrders.clinicalIndication,
        priority: labOrders.priority,
        
        // Provider information
        providerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .leftJoin(users, eq(labOrders.orderedBy, users.id))
      .where(
        and(
          eq(labResults.patientId, patientId),
          gte(labResults.resultAvailableAt, startDate)
        )
      )
      .orderBy(desc(labResults.resultAvailableAt));

    return APIResponseHandler.success(res, enhancedResults);
  } catch (error) {
    console.error("Error fetching enhanced lab results:", error);
    return APIResponseHandler.error(res, "FETCH_ERROR", "Failed to fetch enhanced lab results");
  }
});

/**
 * POST /api/lab-results/:resultId/review
 * Mark a lab result as reviewed by provider
 */
router.post("/lab-results/:resultId/review", async (req: Request, res: Response) => {
  try {
    const resultId = parseInt(req.params.resultId);
    const { notes } = req.body;
    const userId = (req as any).user?.id;

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const [updatedResult] = await db
      .update(labResults)
      .set({
        reviewedBy: userId,
        reviewedAt: new Date(),
        providerNotes: notes || null,
        updatedAt: new Date()
      })
      .where(eq(labResults.id, resultId))
      .returning();

    if (!updatedResult) {
      return APIResponseHandler.notFound(res, "Lab result");
    }

    return APIResponseHandler.success(res, updatedResult);
  } catch (error) {
    console.error("Error reviewing lab result:", error);
    return APIResponseHandler.error(res, "REVIEW_ERROR", "Failed to review lab result");
  }
});

/**
 * POST /api/lab-results/:resultId/ai-interpretation
 * Generate AI interpretation for a lab result
 */
router.post("/lab-results/:resultId/ai-interpretation", async (req: Request, res: Response) => {
  try {
    const resultId = parseInt(req.params.resultId);

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // Check if result exists and get basic info
    const [result] = await db
      .select()
      .from(labResults)
      .where(eq(labResults.id, resultId))
      .limit(1);

    if (!result) {
      return APIResponseHandler.notFound(res, "Lab result");
    }

    // Generate AI interpretation
    const interpretation = await labIntelligenceService.interpretLabResult({
      resultId,
      includeHistoricalTrends: true,
      includeClinicalContext: true,
      includeRecommendations: true
    });

    return APIResponseHandler.success(res, interpretation);
  } catch (error) {
    console.error("Error generating AI interpretation:", error);
    return APIResponseHandler.error(res, "AI_INTERPRETATION_ERROR", "Failed to generate AI interpretation");
  }
});

/**
 * GET /api/lab-results/:resultId/trending
 * Get trending data for a specific test
 */
router.get("/lab-results/:resultId/trending", async (req: Request, res: Response) => {
  try {
    const resultId = parseInt(req.params.resultId);
    const timeframeDays = parseInt(req.query.timeframe as string) || 365;

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // Get the current result to find the test type and patient
    const [currentResult] = await db
      .select({
        patientId: labResults.patientId,
        loincCode: labResults.loincCode,
        testName: labResults.testName
      })
      .from(labResults)
      .where(eq(labResults.id, resultId))
      .limit(1);

    if (!currentResult) {
      return APIResponseHandler.notFound(res, "Lab result");
    }

    // Get historical results for trending
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const trendingData = await db
      .select({
        id: labResults.id,
        resultValue: labResults.resultValue,
        resultNumeric: labResults.resultNumeric,
        resultUnits: labResults.resultUnits,
        abnormalFlag: labResults.abnormalFlag,
        resultAvailableAt: labResults.resultAvailableAt,
        referenceRange: labResults.referenceRange
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, currentResult.patientId),
          eq(labResults.loincCode, currentResult.loincCode),
          gte(labResults.resultAvailableAt, cutoffDate)
        )
      )
      .orderBy(labResults.resultAvailableAt);

    return APIResponseHandler.success(res, {
      testName: currentResult.testName,
      loincCode: currentResult.loincCode,
      trends: trendingData
    });
  } catch (error) {
    console.error("Error fetching trending data:", error);
    return APIResponseHandler.error(res, "TRENDING_ERROR", "Failed to fetch trending data");
  }
});

/**
 * POST /api/lab-orders/bulk-review
 * Review multiple lab results at once
 */
router.post("/lab-orders/bulk-review", async (req: Request, res: Response) => {
  try {
    const { resultIds, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return APIResponseHandler.badRequest(res, "Result IDs array is required");
    }

    // Update all specified results
    const updatedResults = await db
      .update(labResults)
      .set({
        reviewedBy: userId,
        reviewedAt: new Date(),
        providerNotes: notes || null,
        updatedAt: new Date()
      })
      .where(sql`${labResults.id} = ANY(${resultIds})`)
      .returning();

    return APIResponseHandler.success(res, {
      reviewedCount: updatedResults.length,
      results: updatedResults
    });
  } catch (error) {
    console.error("Error bulk reviewing lab results:", error);
    return APIResponseHandler.error(res, "BULK_REVIEW_ERROR", "Failed to bulk review lab results");
  }
});

/**
 * GET /api/patients/:patientId/lab-summary
 * Get comprehensive lab summary with critical values and trends
 */
router.get("/patients/:patientId/lab-summary", async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId);

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // Get recent critical results
    const criticalResults = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        resultUnits: labResults.resultUnits,
        abnormalFlag: labResults.abnormalFlag,
        resultAvailableAt: labResults.resultAvailableAt,
        reviewedBy: labResults.reviewedBy
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          eq(labResults.criticalFlag, true)
        )
      )
      .orderBy(desc(labResults.resultAvailableAt))
      .limit(10);

    // Get unreviewed results
    const unreviewedResults = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        resultAvailableAt: labResults.resultAvailableAt,
        abnormalFlag: labResults.abnormalFlag
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          isNull(labResults.reviewedBy)
        )
      )
      .orderBy(desc(labResults.resultAvailableAt))
      .limit(20);

    // Get pending orders
    const pendingOrders = await db
      .select({
        id: labOrders.id,
        testName: labOrders.testName,
        orderStatus: labOrders.orderStatus,
        orderedAt: labOrders.orderedAt,
        priority: labOrders.priority
      })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.patientId, patientId),
          sql`${labOrders.orderStatus} NOT IN ('completed', 'cancelled')`
        )
      )
      .orderBy(desc(labOrders.orderedAt));

    const summary = {
      criticalResults: criticalResults.length,
      unreviewedResults: unreviewedResults.length,
      pendingOrders: pendingOrders.length,
      recentCritical: criticalResults,
      unreviewedList: unreviewedResults,
      pendingOrdersList: pendingOrders
    };

    return APIResponseHandler.success(res, summary);
  } catch (error) {
    console.error("Error fetching lab summary:", error);
    return APIResponseHandler.error(res, "SUMMARY_ERROR", "Failed to fetch lab summary");
  }
});

/**
 * POST /api/lab-results/analyze-patterns
 * AI-powered analysis of lab result patterns
 */
router.post("/lab-results/analyze-patterns", async (req: Request, res: Response) => {
  try {
    const { patientId, timeframeDays = 90 } = req.body;

    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Patient ID is required");
    }

    const patterns = await labIntelligenceService.analyzeResultPatterns(patientId, timeframeDays);

    return APIResponseHandler.success(res, patterns);
  } catch (error) {
    console.error("Error analyzing lab patterns:", error);
    return APIResponseHandler.error(res, "PATTERN_ANALYSIS_ERROR", "Failed to analyze lab patterns");
  }
});

export default router;