/**
 * Lab Entry Routes - Multi-source lab data entry
 * Supports patient-reported, provider-entered, and external upload results
 */

import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { labResults, patients, encounters, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";

const router = Router();

/**
 * POST /api/lab-entry/patient-reported
 * Add patient-reported lab value
 */
router.post("/patient-reported", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const {
      patientId,
      encounterId,
      testName,
      resultValue,
      resultUnits,
      sourceNotes,
      reportedDate
    } = req.body;

    if (!patientId || !testName || !resultValue) {
      return APIResponseHandler.badRequest(res, "Patient ID, test name, and result value are required");
    }

    // Insert patient-reported lab result
    const [labResult] = await db.insert(labResults).values({
      patientId: parseInt(patientId),
      testCode: `PATIENT_${testName.toUpperCase()}`,
      testName,
      testCategory: "patient_reported",
      resultValue,
      resultUnits: resultUnits || "",
      resultStatus: "final",
      sourceType: "patient_reported",
      sourceConfidence: 0.6, // Lower confidence for patient-reported
      sourceNotes,
      enteredBy: req.user.id,
      receivedAt: reportedDate ? new Date(reportedDate) : new Date(),
      resultAvailableAt: new Date()
    }).returning();

    return APIResponseHandler.success(res, labResult, 201);
  } catch (error) {
    console.error("Error adding patient-reported lab:", error);
    return APIResponseHandler.error(res, "ENTRY_ERROR", "Failed to add patient-reported lab result");
  }
});

/**
 * POST /api/lab-entry/provider-entered
 * Add provider/staff-entered lab value
 */
router.post("/provider-entered", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const {
      patientId,
      encounterId,
      testName,
      testCode,
      loincCode,
      resultValue,
      resultUnits,
      referenceRange,
      abnormalFlag,
      sourceNotes,
      resultDate
    } = req.body;

    if (!patientId || !testName || !resultValue) {
      return APIResponseHandler.badRequest(res, "Patient ID, test name, and result value are required");
    }

    // Insert provider-entered lab result
    const [labResult] = await db.insert(labResults).values({
      patientId: parseInt(patientId),
      testCode: testCode || `PROVIDER_${testName.toUpperCase()}`,
      testName,
      testCategory: "provider_entered",
      resultValue,
      resultUnits: resultUnits || "",
      referenceRange,
      abnormalFlag,
      resultStatus: "final",
      sourceType: "provider_entered",
      sourceConfidence: 0.85, // Higher confidence for provider-entered
      sourceNotes,
      enteredBy: req.user.id,
      receivedAt: resultDate ? new Date(resultDate) : new Date(),
      resultAvailableAt: new Date()
    }).returning();

    return APIResponseHandler.success(res, labResult, 201);
  } catch (error) {
    console.error("Error adding provider-entered lab:", error);
    return APIResponseHandler.error(res, "ENTRY_ERROR", "Failed to add provider-entered lab result");
  }
});

/**
 * GET /api/lab-entry/source-summary/:patientId
 * Get summary of lab results by source type
 */
router.get("/source-summary/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);

    // Get count of results by source type
    const sourceSummary = await db
      .select({
        sourceType: labResults.sourceType,
        count: sql<number>`count(*)`,
        avgConfidence: sql<number>`avg(${labResults.sourceConfidence})`
      })
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .groupBy(labResults.sourceType);

    return APIResponseHandler.success(res, sourceSummary);
  } catch (error) {
    console.error("Error fetching source summary:", error);
    return APIResponseHandler.error(res, "SUMMARY_ERROR", "Failed to fetch lab source summary");
  }
});

export default router;