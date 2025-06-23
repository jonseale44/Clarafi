import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { APIResponseHandler } from './api-response-handler';
// Use centralized auth check instead of importing from auth module
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
import { db } from './db';
import { vitalsAlertReviews, vitals, users } from '../shared/schema';
import { and, eq, inArray } from 'drizzle-orm';

const router = Router();

// Schema for reviewing vitals alerts
const ReviewAlertsSchema = z.object({
  vitalsId: z.number(),
  alertTexts: z.array(z.string()), // Array of alert texts to review
  reviewNotes: z.string().optional(),
});

/**
 * POST /api/vitals/:vitalsId/review-alerts
 * Review (dismiss) critical alerts for a specific vitals entry
 * Only providers can review alerts
 */
router.post('/:vitalsId/review-alerts', requireAuth, async (req, res) => {
  try {
    const vitalsId = parseInt(req.params.vitalsId);
    const user = req.user as any;
    
    // Only providers can review critical alerts
    if (user.role !== 'provider' && user.role !== 'admin') {
      return APIResponseHandler.forbidden(res, "Only providers can review critical vitals alerts");
    }
    
    const body = ReviewAlertsSchema.parse(req.body);
    
    // Verify the vitals entry exists
    const vitalsEntry = await storage.getVitalsEntry(vitalsId);
    if (!vitalsEntry) {
      return APIResponseHandler.notFound(res, "Vitals entry not found");
    }
    
    console.log(`🔍 [VitalsAlertReview] Provider ${user.id} reviewing alerts for vitals ${vitalsId}`);
    console.log(`🔍 [VitalsAlertReview] Alert texts to review:`, body.alertTexts);
    
    // Create review records for each alert
    const reviewPromises = body.alertTexts.map(alertText => 
      db.insert(vitalsAlertReviews).values({
        vitalsId: vitalsId,
        alertText: alertText,
        reviewedBy: user.id,
        reviewNotes: body.reviewNotes || null,
        patientId: vitalsEntry.patientId,
        encounterId: vitalsEntry.encounterId || null,
      }).returning()
    );
    
    const reviews = await Promise.all(reviewPromises);
    
    console.log(`✅ [VitalsAlertReview] Created ${reviews.length} alert reviews`);
    
    return APIResponseHandler.success(res, {
      reviewsCreated: reviews.length,
      reviews: reviews.flat(),
      message: `Successfully reviewed ${reviews.length} critical alert(s)`
    });
    
  } catch (error) {
    console.error("❌ [VitalsAlertReview] Error reviewing alerts:", error);
    return APIResponseHandler.error(res, "Failed to review vitals alerts", error);
  }
});

/**
 * GET /api/vitals/patient/:patientId/alert-reviews
 * Get all alert reviews for a patient's vitals
 */
router.get('/patient/:patientId/alert-reviews', requireAuth, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    const reviews = await db
      .select({
        id: vitalsAlertReviews.id,
        vitalsId: vitalsAlertReviews.vitalsId,
        alertText: vitalsAlertReviews.alertText,
        reviewedAt: vitalsAlertReviews.reviewedAt,
        reviewNotes: vitalsAlertReviews.reviewNotes,
        reviewerName: users.firstName,
        reviewerLastName: users.lastName,
        reviewerRole: users.role,
      })
      .from(vitalsAlertReviews)
      .innerJoin(users, eq(vitalsAlertReviews.reviewedBy, users.id))
      .where(eq(vitalsAlertReviews.patientId, patientId))
      .orderBy(vitalsAlertReviews.reviewedAt);
    
    return APIResponseHandler.success(res, reviews);
    
  } catch (error) {
    console.error("❌ [VitalsAlertReview] Error fetching alert reviews:", error);
    return APIResponseHandler.error(res, "Failed to fetch alert reviews", error);
  }
});

/**
 * GET /api/vitals/:vitalsId/unreviewed-alerts
 * Get unreviewed alerts for a specific vitals entry
 */
router.get('/:vitalsId/unreviewed-alerts', requireAuth, async (req, res) => {
  try {
    const vitalsId = parseInt(req.params.vitalsId);
    
    // Get the vitals entry with its alerts
    const vitalsEntry = await storage.getVitalsEntry(vitalsId);
    if (!vitalsEntry || !vitalsEntry.alerts) {
      return APIResponseHandler.success(res, []);
    }
    
    // Get all reviewed alerts for this vitals entry
    const reviewedAlerts = await db
      .select({ alertText: vitalsAlertReviews.alertText })
      .from(vitalsAlertReviews)
      .where(eq(vitalsAlertReviews.vitalsId, vitalsId));
    
    const reviewedAlertTexts = new Set(reviewedAlerts.map(r => r.alertText));
    
    // Filter out reviewed alerts
    const unreviewedAlerts = vitalsEntry.alerts.filter(alert => 
      !reviewedAlertTexts.has(alert)
    );
    
    return APIResponseHandler.success(res, unreviewedAlerts);
    
  } catch (error) {
    console.error("❌ [VitalsAlertReview] Error fetching unreviewed alerts:", error);
    return APIResponseHandler.error(res, "Failed to fetch unreviewed alerts", error);
  }
});

export { router as vitalsAlertReviewRoutes };