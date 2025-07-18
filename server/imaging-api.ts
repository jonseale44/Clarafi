import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { imagingOrders, imagingResults, users } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler.js";

const router = Router();

// Get imaging orders for a patient with provider details and results
router.get("/patients/:patientId/imaging/orders", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    if (!patientId || isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    console.log(`🩻 [ImagingAPI] Fetching imaging orders for patient ${patientId}`);

    // Get imaging orders with provider details
    const orders = await db
      .select({
        id: imagingOrders.id,
        patientId: imagingOrders.patientId,
        encounterId: imagingOrders.encounterId,
        studyType: imagingOrders.studyType,
        bodyPart: imagingOrders.bodyPart,
        laterality: imagingOrders.laterality,
        contrastNeeded: imagingOrders.contrastNeeded,
        clinicalIndication: imagingOrders.clinicalIndication,
        clinicalHistory: imagingOrders.clinicalHistory,
        relevantSymptoms: imagingOrders.relevantSymptoms,
        orderedBy: imagingOrders.orderedBy,
        orderedAt: imagingOrders.orderedAt,
        orderStatus: imagingOrders.orderStatus,
        scheduledAt: imagingOrders.scheduledAt,
        completedAt: imagingOrders.completedAt,
        prepInstructions: imagingOrders.prepInstructions,
        schedulingNotes: imagingOrders.schedulingNotes,
        externalFacilityId: imagingOrders.externalFacilityId,
        externalOrderId: imagingOrders.externalOrderId,
        dicomAccessionNumber: imagingOrders.dicomAccessionNumber,
        orderedByUser: {
          firstName: users.firstName,
          lastName: users.lastName,
          credentials: users.credentials
        }
      })
      .from(imagingOrders)
      .leftJoin(users, eq(imagingOrders.orderedBy, users.id))
      .where(eq(imagingOrders.patientId, patientId))
      .orderBy(desc(imagingOrders.orderedAt));

    // For each order, get associated results
    const ordersWithResults = await Promise.all(
      orders.map(async (order) => {
        const results = await db
          .select({
            id: imagingResults.id,
            imagingOrderId: imagingResults.imagingOrderId,
            patientId: imagingResults.patientId,
            studyDate: imagingResults.studyDate,
            modality: imagingResults.modality,
            bodyPart: imagingResults.bodyPart,
            laterality: imagingResults.laterality,
            findings: imagingResults.findings,
            impression: imagingResults.impression,
            readingRadiologist: imagingResults.readingRadiologist,
            performingFacility: imagingResults.performingFacility,
            pacsStudyUid: imagingResults.pacsStudyUid,
            reportStatus: imagingResults.reportStatus,
            sourceType: imagingResults.sourceType,
            sourceConfidence: imagingResults.sourceConfidence,
            extractedFromAttachmentId: imagingResults.extractedFromAttachmentId,
            visitHistory: imagingResults.visitHistory
          })
          .from(imagingResults)
          .where(eq(imagingResults.imagingOrderId, order.id))
          .orderBy(desc(imagingResults.studyDate));

        return {
          ...order,
          results
        };
      })
    );

    console.log(`✅ [ImagingAPI] Retrieved ${ordersWithResults.length} imaging orders for patient ${patientId}`);
    
    return APIResponseHandler.success(res, ordersWithResults);
  } catch (error) {
    console.error(`❌ [ImagingAPI] Error fetching imaging orders:`, error);
    return APIResponseHandler.error(res, "Failed to fetch imaging orders");
  }
});

// Get imaging results for a patient with reviewer details
router.get("/patients/:patientId/imaging/results", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    if (!patientId || isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    console.log(`🩻 [ImagingAPI] Fetching imaging results for patient ${patientId}`);

    const results = await db
      .select({
        id: imagingResults.id,
        imagingOrderId: imagingResults.imagingOrderId,
        patientId: imagingResults.patientId,
        studyDate: imagingResults.studyDate,
        modality: imagingResults.modality,
        bodyPart: imagingResults.bodyPart,
        laterality: imagingResults.laterality,
        findings: imagingResults.findings,
        impression: imagingResults.impression,
        readingRadiologist: imagingResults.readingRadiologist,
        performingFacility: imagingResults.performingFacility,
        pacsStudyUid: imagingResults.pacsStudyUid,
        reportStatus: imagingResults.reportStatus,
        sourceType: imagingResults.sourceType,
        sourceConfidence: imagingResults.sourceConfidence,
        extractedFromAttachmentId: imagingResults.extractedFromAttachmentId,
        visitHistory: imagingResults.visitHistory
      })
      .from(imagingResults)
      .where(eq(imagingResults.patientId, patientId))
      .orderBy(desc(imagingResults.studyDate));

    console.log(`✅ [ImagingAPI] Retrieved ${results.length} imaging results for patient ${patientId}`);
    
    return APIResponseHandler.success(res, results);
  } catch (error) {
    console.error(`❌ [ImagingAPI] Error fetching imaging results:`, error);
    return APIResponseHandler.error(res, "Failed to fetch imaging results");
  }
});

// Update imaging result (for provider review)
router.put("/imaging/results/:resultId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const resultId = parseInt(req.params.resultId);
    
    if (!resultId || isNaN(resultId)) {
      return APIResponseHandler.badRequest(res, "Invalid result ID");
    }

    const updateSchema = z.object({
      reportStatus: z.enum(["preliminary", "final", "addendum", "superseded"]).optional(),
      findings: z.string().optional(),
      impression: z.string().optional()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return APIResponseHandler.badRequest(res, "Invalid request data", validation.error.errors);
    }

    const updateData = validation.data;
    
    console.log(`🩻 [ImagingAPI] Updating imaging result ${resultId}`);

    // Simply use the validated update data
    const finalUpdateData = {
      ...updateData,
      updatedAt: new Date()
    };

    const [updatedResult] = await db
      .update(imagingResults)
      .set(finalUpdateData)
      .where(eq(imagingResults.id, resultId))
      .returning();

    if (!updatedResult) {
      return APIResponseHandler.notFound(res, "Imaging result");
    }

    console.log(`✅ [ImagingAPI] Updated imaging result ${resultId}`);
    
    return APIResponseHandler.success(res, updatedResult);
  } catch (error) {
    console.error(`❌ [ImagingAPI] Error updating imaging result:`, error);
    return APIResponseHandler.error(res, "Failed to update imaging result");
  }
});

export { router as imagingRoutes };