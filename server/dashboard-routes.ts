import { Router, Request, Response } from "express";
import { db } from "./db";
import { encounters, labOrders, labResults, orders, patients, users } from "@shared/schema";
import { eq, and, sql, desc, isNull, or, gte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

const router = Router();

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the provider
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1; // Default to provider 1 for demo
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Get pending encounters (in_progress, waiting, ready_for_provider)
    const pendingEncountersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .where(
        and(
          eq(encounters.providerId, userId),
          or(
            eq(encounters.encounterStatus, "in_progress"),
            eq(encounters.encounterStatus, "waiting"),
            eq(encounters.encounterStatus, "ready_for_provider"),
            eq(encounters.encounterStatus, "scheduled")
          )
        )
      );

    // Get lab orders requiring review (completed but not reviewed)
    const labOrdersToReviewResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .where(
        and(
          eq(labOrders.orderedBy, userId),
          eq(labResults.resultStatus, "final"),
          isNull(labResults.reviewedBy)
        )
      );

    // Get completed encounters today
    const completedTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .where(
        and(
          eq(encounters.providerId, userId),
          eq(encounters.encounterStatus, "completed"),
          sql`date(${encounters.endTime}) = current_date`
        )
      );

    // Get imaging orders to review (placeholder - would need imaging tables)
    const imagingToReview = 0;

    // Get unread messages (placeholder - would need messaging tables)
    const messagesUnread = 0;

    // Get prescriptions/orders needing signature
    const prescriptionsToSignResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.orderedBy, userId),
          eq(orders.orderStatus, "pending_signature")
        )
      );

    const stats = {
      pendingEncounters: Number(pendingEncountersResult[0]?.count || 0),
      labOrdersToReview: Number(labOrdersToReviewResult[0]?.count || 0),
      completedToday: Number(completedTodayResult[0]?.count || 0),
      imagingToReview,
      messagesUnread,
      prescriptionsToSign: Number(prescriptionsToSignResult[0]?.count || 0),
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

/**
 * GET /api/dashboard/pending-encounters
 * Returns list of pending encounters for the provider
 */
router.get("/pending-encounters", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1; // Default to provider 1 for demo

    const pendingEncounters = await db
      .select({
        id: encounters.id,
        patientId: encounters.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        encounterType: encounters.encounterType,
        encounterSubtype: encounters.encounterSubtype,
        startTime: encounters.startTime,
        status: encounters.encounterStatus,
        chiefComplaint: encounters.chiefComplaint,
        assignedProvider: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        roomNumber: sql<string>`'Room ' || (${encounters.id} % 10 + 1)`, // Mock room assignment
        priority: sql<string>`case 
          when ${encounters.encounterType} = 'urgent_care' then 'urgent'
          when ${encounters.chiefComplaint} ilike '%chest pain%' then 'stat'
          when ${encounters.chiefComplaint} ilike '%emergency%' then 'stat'
          else 'routine'
        end`,
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .innerJoin(users, eq(encounters.providerId, users.id))
      .where(
        and(
          eq(encounters.providerId, userId),
          or(
            eq(encounters.encounterStatus, "in_progress"),
            eq(encounters.encounterStatus, "waiting"),
            eq(encounters.encounterStatus, "ready_for_provider"),
            eq(encounters.encounterStatus, "scheduled")
          )
        )
      )
      .orderBy(desc(encounters.startTime))
      .limit(50);

    res.json(pendingEncounters);
  } catch (error) {
    console.error("Error fetching pending encounters:", error);
    res.status(500).json({ error: "Failed to fetch pending encounters" });
  }
});

/**
 * GET /api/dashboard/lab-orders-to-review
 * Returns lab orders requiring provider review
 */
router.get("/lab-orders-to-review", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1; // Default to provider 1 for demo

    const labOrdersToReview = await db
      .select({
        id: labResults.id,
        labOrderId: labOrders.id,
        patientId: labOrders.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        testName: labOrders.testName,
        orderedDate: labOrders.orderedAt,
        status: labResults.resultStatus,
        priority: labOrders.priority,
        criticalFlag: sql<boolean>`case when ${labResults.abnormalFlag} in ('HH', 'LL') then true else false end`,
        results: labResults.resultValue,
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(
        and(
          eq(labOrders.orderedBy, userId),
          eq(labResults.status, "completed"),
          isNull(labResults.reviewedBy)
        )
      )
      .orderBy(
        desc(labResults.criticalFlag), // Critical results first
        desc(labOrders.orderedAt)
      )
      .limit(50);

    res.json(labOrdersToReview);
  } catch (error) {
    console.error("Error fetching lab orders to review:", error);
    res.status(500).json({ error: "Failed to fetch lab orders to review" });
  }
});

/**
 * POST /api/dashboard/review-lab-result/:resultId
 * Mark a lab result as reviewed by the provider
 */
router.post("/review-lab-result/:resultId", async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const userId = (req as any).user?.id || 1;
    const { reviewNote } = req.body;

    const [updatedResult] = await db
      .update(labResults)
      .set({
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
        status: "reviewed",
      })
      .where(eq(labResults.id, parseInt(resultId)))
      .returning();

    if (!updatedResult) {
      return res.status(404).json({ error: "Lab result not found" });
    }

    res.json({ success: true, result: updatedResult });
  } catch (error) {
    console.error("Error reviewing lab result:", error);
    res.status(500).json({ error: "Failed to review lab result" });
  }
});

/**
 * POST /api/dashboard/sign-encounter/:encounterId
 * Sign a completed encounter
 */
router.post("/sign-encounter/:encounterId", async (req: Request, res: Response) => {
  try {
    const { encounterId } = req.params;
    const userId = (req as any).user?.id || 1;
    const { signatureNote } = req.body;

    // Check if encounter exists and belongs to the provider
    const encounter = await db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.id, parseInt(encounterId)),
          eq(encounters.providerId, userId)
        )
      )
      .limit(1);

    if (encounter.length === 0) {
      return res.status(404).json({ error: "Encounter not found or not authorized" });
    }

    // Update encounter to signed status
    const [updatedEncounter] = await db
      .update(encounters)
      .set({
        encounterStatus: "signed",
        // Add signature fields if they exist in schema
        // signedBy: userId,
        // signedAt: new Date(),
        // signatureNote: signatureNote || null,
      })
      .where(eq(encounters.id, parseInt(encounterId)))
      .returning();

    res.json({ success: true, encounter: updatedEncounter });
  } catch (error) {
    console.error("Error signing encounter:", error);
    res.status(500).json({ error: "Failed to sign encounter" });
  }
});

/**
 * POST /api/dashboard/assign-encounter
 * Assign an encounter to a provider (for workflow management)
 */
router.post("/assign-encounter", async (req: Request, res: Response) => {
  try {
    const { encounterId, providerId, priority, roomNumber } = req.body;
    const currentUserId = (req as any).user?.id || 1;

    // Update encounter assignment
    const [updatedEncounter] = await db
      .update(encounters)
      .set({
        providerId: providerId,
        encounterStatus: "assigned",
        // Add room assignment if field exists in schema
        // roomNumber: roomNumber,
        // priority: priority,
      })
      .where(eq(encounters.id, encounterId))
      .returning();

    if (!updatedEncounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ success: true, encounter: updatedEncounter });
  } catch (error) {
    console.error("Error assigning encounter:", error);
    res.status(500).json({ error: "Failed to assign encounter" });
  }
});

/**
 * GET /api/dashboard/provider-workload/:providerId
 * Get current workload for a specific provider
 */
router.get("/provider-workload/:providerId", async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;

    const workload = await db
      .select({
        activeEncounters: sql<number>`count(case when ${encounters.encounterStatus} in ('in_progress', 'waiting') then 1 end)`,
        pendingSignatures: sql<number>`count(case when ${encounters.encounterStatus} = 'pending_signature' then 1 end)`,
        todayCompleted: sql<number>`count(case when ${encounters.encounterStatus} = 'completed' and date(${encounters.endTime}) = current_date then 1 end)`,
      })
      .from(encounters)
      .where(eq(encounters.providerId, parseInt(providerId)));

    res.json(workload[0] || { activeEncounters: 0, pendingSignatures: 0, todayCompleted: 0 });
  } catch (error) {
    console.error("Error fetching provider workload:", error);
    res.status(500).json({ error: "Failed to fetch provider workload" });
  }
});

export default router;