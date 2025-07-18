/**
 * Unified Imaging API Routes
 *
 * RESTful endpoints for imaging results management with:
 * - GET, POST, PUT, DELETE operations for imaging results
 * - Unified processing endpoint for both SOAP notes and attachments
 * - Visit history management and source attribution
 * - Commercial EMR status workflow support
 */

import { Express, Request, Response } from "express";
import { db } from "./db.js";
import { imagingResults, encounters, patients } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { UnifiedImagingParser } from "./unified-imaging-parser.js";
import { APIResponseHandler } from "./api-response-handler.js";

/**
 * Register unified imaging API routes
 */
export function setupUnifiedImagingRoutes(app: Express) {
  const imagingParser = new UnifiedImagingParser();

  // GET /api/patients/:patientId/imaging-results - Get all imaging results for patient
  app.get("/api/patients/:patientId/imaging-results", 
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const patientId = parseInt(req.params.patientId);
      
      console.log(`🔍 [UnifiedImagingAPI] Fetching imaging results for patient ${patientId}`);

      const results = await db
        .select()
        .from(imagingResults)
        .where(eq(imagingResults.patientId, patientId))
        .orderBy(desc(imagingResults.studyDate));

      console.log(`🔍 [UnifiedImagingAPI] Found ${results.length} imaging results for patient ${patientId}`);

      res.json(results);
    })
  );

  // GET /api/imaging-results/:imagingId - Get specific imaging result
  app.get("/api/imaging-results/:imagingId",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const imagingId = parseInt(req.params.imagingId);
      
      console.log(`🔍 [UnifiedImagingAPI] Fetching imaging result ${imagingId}`);

      const result = await db
        .select()
        .from(imagingResults)
        .where(eq(imagingResults.id, imagingId))
        .limit(1);

      if (!result.length) {
        return APIResponseHandler.handleNotFound(res, 'Imaging result not found');
      }

      console.log(`🔍 [UnifiedImagingAPI] Found imaging result: ${result[0].modality} ${result[0].bodyPart}`);

      res.json(result[0]);
    })
  );

  // POST /api/patients/:patientId/imaging-results - Create new imaging result
  app.post("/api/patients/:patientId/imaging-results",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const patientId = parseInt(req.params.patientId);
      const imagingData = req.body;
      
      console.log(`➕ [UnifiedImagingAPI] Creating new imaging result for patient ${patientId}`);
      console.log(`➕ [UnifiedImagingAPI] Study: ${imagingData.modality} ${imagingData.bodyPart}`);

      // Create initial visit history entry
      const initialVisit = {
        date: new Date().toISOString().split('T')[0],
        notes: imagingData.visitNotes || `Initial ${imagingData.modality} ${imagingData.bodyPart} study`,
        source: "manual_entry" as const,
        confidence: 1.0
      };

      const newResult = await db.insert(imagingResults).values({
        patientId,
        imagingOrderId: imagingData.imagingOrderId || null,
        studyDate: new Date(imagingData.studyDate),
        modality: imagingData.modality,
        bodyPart: imagingData.bodyPart,
        laterality: imagingData.laterality || null,
        findings: imagingData.findings || null,
        impression: imagingData.impression || null,
        readingRadiologist: imagingData.radiologistName || null,
        performingFacility: imagingData.facilityName || null,
        reportStatus: imagingData.resultStatus || "final",
        sourceType: "manual_entry",
        sourceConfidence: "1.00",
        visitHistory: [initialVisit]
      }).returning();

      console.log(`✅ [UnifiedImagingAPI] Created imaging result ID: ${newResult[0].id}`);

      res.status(201).json(newResult[0]);
    })
  );

  // PUT /api/imaging-results/:imagingId - Update imaging result
  app.put("/api/imaging-results/:imagingId",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const imagingId = parseInt(req.params.imagingId);
      const updateData = req.body;
      
      console.log(`📝 [UnifiedImagingAPI] Updating imaging result ${imagingId}`);

      // Get existing result
      const existing = await db
        .select()
        .from(imagingResults)
        .where(eq(imagingResults.id, imagingId))
        .limit(1);

      if (!existing.length) {
        return APIResponseHandler.handleNotFound(res, 'Imaging result not found');
      }

      // Add visit history entry for the update
      const currentHistory = existing[0].visitHistory || [];
      const updateVisit = {
        date: new Date().toISOString().split('T')[0],
        notes: updateData.visitNotes || "Study updated manually",
        source: "manual_entry" as const,
        confidence: 1.0,
        changesMade: updateData.changesMade || []
      };

      const updatedResult = await db
        .update(imagingResults)
        .set({
          ...updateData,
          visitHistory: [...currentHistory, updateVisit],
          updatedAt: new Date()
        })
        .where(eq(imagingResults.id, imagingId))
        .returning();

      console.log(`✅ [UnifiedImagingAPI] Updated imaging result: ${updatedResult[0].modality} ${updatedResult[0].bodyPart}`);

      res.json(updatedResult[0]);
    })
  );

  // DELETE /api/imaging-results/:imagingId - Delete imaging result
  app.delete("/api/imaging-results/:imagingId",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const imagingId = parseInt(req.params.imagingId);
      
      console.log(`🗑️ [UnifiedImagingAPI] Deleting imaging result ${imagingId}`);

      const deleted = await db
        .delete(imagingResults)
        .where(eq(imagingResults.id, imagingId))
        .returning();

      if (!deleted.length) {
        return APIResponseHandler.handleNotFound(res, 'Imaging result not found');
      }

      console.log(`✅ [UnifiedImagingAPI] Deleted imaging result: ${deleted[0].modality} ${deleted[0].bodyPart}`);

      res.json({ success: true, deleted: deleted[0] });
    })
  );

  // POST /api/imaging/process-unified - Unified processing endpoint for SOAP notes and attachments
  app.post("/api/imaging/process-unified",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const { patientId, encounterId, soapNote, attachmentId, extractedText, documentType, triggerType } = req.body;
      
      console.log(`🔄 [UnifiedImagingAPI] === UNIFIED PROCESSING START ===`);
      console.log(`🔄 [UnifiedImagingAPI] Patient ID: ${patientId}`);
      console.log(`🔄 [UnifiedImagingAPI] Source: ${soapNote ? 'SOAP Note' : 'Attachment'}`);
      console.log(`🔄 [UnifiedImagingAPI] Trigger: ${triggerType}`);

      let result;

      try {
        if (soapNote && encounterId) {
          // Process SOAP note
          console.log(`🏥 [UnifiedImagingAPI] Processing SOAP note for encounter ${encounterId}`);
          result = await imagingParser.processSoapImagingData(patientId, encounterId, soapNote, triggerType);
        } else if (attachmentId && extractedText) {
          // Process attachment
          console.log(`📄 [UnifiedImagingAPI] Processing attachment ${attachmentId}`);
          result = await imagingParser.processAttachmentImagingData(attachmentId, extractedText, documentType);
        } else {
          throw new Error("Invalid request: must provide either SOAP note or attachment data");
        }

        console.log(`✅ [UnifiedImagingAPI] Processing complete - ${result.total_imaging_affected} imaging studies affected`);
        console.log(`🔄 [UnifiedImagingAPI] === UNIFIED PROCESSING COMPLETE ===`);

        res.json({
          success: true,
          imagingAffected: result.total_imaging_affected,
          changes: result.changes,
          extractionConfidence: result.extraction_confidence,
          processingNotes: result.processing_notes
        });

      } catch (error) {
        console.error(`❌ [UnifiedImagingAPI] Processing failed:`, error);
        
        res.status(500).json({
          success: false,
          error: error.message,
          imagingAffected: 0,
          changes: [],
          extractionConfidence: 0,
          processingNotes: `Processing failed: ${error.message}`
        });
      }
    })
  );

  // PUT /api/imaging-results/:imagingId/status - Update imaging result status
  app.put("/api/imaging-results/:imagingId/status",
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const imagingId = parseInt(req.params.imagingId);
      const { status, providerNotes } = req.body;
      
      console.log(`📊 [UnifiedImagingAPI] Updating status for imaging result ${imagingId} to: ${status}`);

      // Get existing result
      const existing = await db
        .select()
        .from(imagingResults)
        .where(eq(imagingResults.id, imagingId))
        .limit(1);

      if (!existing.length) {
        return APIResponseHandler.handleNotFound(res, 'Imaging result not found');
      }

      // Add visit history entry for status change
      const currentHistory = existing[0].visitHistory || [];
      const statusVisit = {
        date: new Date().toISOString().split('T')[0],
        notes: `Status changed from ${existing[0].reportStatus} to ${status}`,
        source: "manual_entry" as const,
        confidence: 1.0,
        changesMade: [`status_${existing[0].reportStatus}_to_${status}`]
      };

      const updatedResult = await db
        .update(imagingResults)
        .set({
          reportStatus: status,
          visitHistory: [...currentHistory, statusVisit],
          updatedAt: new Date()
        })
        .where(eq(imagingResults.id, imagingId))
        .returning();

      console.log(`✅ [UnifiedImagingAPI] Status updated successfully`);

      res.json(updatedResult[0]);
    })
  );

  console.log(`🔧 [UnifiedImagingAPI] Imaging API routes registered`);
}