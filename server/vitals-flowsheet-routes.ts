import { Router } from "express";
import { APIResponseHandler } from "./api-response-handler.js";
import { storage } from "./storage.js";
import { z } from "zod";
import { vitals } from "../shared/schema.js";

const router = Router();

// Validation schemas - match database schema
const VitalsEntrySchema = z.object({
  patientId: z.number(),
  encounterId: z.number().optional(),
  measuredAt: z.string().datetime().optional(),
  recordedBy: z.string(),
  systolicBp: z.number().min(50).max(300).optional(),
  diastolicBp: z.number().min(20).max(200).optional(),
  heartRate: z.number().min(30).max(250).optional(),
  temperature: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === undefined ? undefined : typeof val === 'string' ? parseFloat(val) : val).refine(val => val === undefined || (!isNaN(val) && val >= 90 && val <= 110), { message: "Temperature must be between 90-110" }).optional(),
  weight: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === undefined ? undefined : typeof val === 'string' ? parseFloat(val) : val).refine(val => val === undefined || (!isNaN(val) && val >= 1 && val <= 1000), { message: "Weight must be between 1-1000" }).optional(),
  height: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === undefined ? undefined : typeof val === 'string' ? parseFloat(val) : val).refine(val => val === undefined || (!isNaN(val) && val >= 10 && val <= 100), { message: "Height must be between 10-100" }).optional(),
  bmi: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === undefined ? undefined : typeof val === 'string' ? parseFloat(val) : val).refine(val => val === undefined || (!isNaN(val) && val >= 10 && val <= 80), { message: "BMI must be between 10-80" }).optional(),
  oxygenSaturation: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === undefined ? undefined : typeof val === 'string' ? parseFloat(val) : val).refine(val => val === undefined || (!isNaN(val) && val >= 70 && val <= 100), { message: "Oxygen saturation must be between 70-100" }).optional(),
  respiratoryRate: z.union([z.number(), z.null()]).transform(val => val === null || val === undefined ? undefined : val).refine(val => val === undefined || (val >= 5 && val <= 100), { message: "Respiratory rate must be between 5-100" }).optional(),
  painScale: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
  parsedFromText: z.boolean().optional(),
  originalText: z.string().nullable().optional(),
});

/**
 * GET /api/vitals/patient/:patientId
 * Get ALL vitals entries for a patient across all encounters (production EMR pattern)
 * Optional query params: ?currentEncounterId=X to mark which vitals are editable
 */
router.get("/patient/:patientId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const currentEncounterId = req.query.currentEncounterId ? parseInt(req.query.currentEncounterId as string) : null;
    
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    const vitalsEntries = await storage.getVitalsByPatient(patientId);
    
    // Sort by recorded time, most recent first
    const sortedEntries = vitalsEntries.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    // Mark which entries are editable based on current encounter
    const enrichedEntries = sortedEntries.map(entry => ({
      ...entry,
      isEditable: currentEncounterId ? entry.encounterId === currentEncounterId : false,
      encounterContext: currentEncounterId && entry.encounterId === currentEncounterId ? 'current' : 'historical'
    }));

    return APIResponseHandler.success(res, enrichedEntries);
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error fetching patient vitals:", error);
    return APIResponseHandler.error(res, "VITALS_FETCH_ERROR", "Failed to fetch patient vitals");
  }
});

/**
 * GET /api/vitals/encounter/:encounterId
 * Get all vitals entries for a specific encounter (legacy support)
 */
router.get("/encounter/:encounterId", async (req, res) => {
  try {
    const encounterId = parseInt(req.params.encounterId);
    if (isNaN(encounterId)) {
      return APIResponseHandler.badRequest(res, "Invalid encounter ID");
    }

    const vitalsEntries = await storage.getVitalsByEncounter(encounterId);
    
    // Sort by recorded time, most recent first
    const sortedEntries = vitalsEntries.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    return APIResponseHandler.success(res, sortedEntries);
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error fetching encounter vitals:", error);
    return APIResponseHandler.error(res, "FETCH_VITALS_ERROR", "Failed to fetch vitals entries");
  }
});

/**
 * GET /api/vitals/patient/:patientId
 * Get all vitals entries for a patient across all encounters
 */
router.get("/patient/:patientId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    const vitalsEntries = await storage.getVitalsByPatient(patientId);
    
    // Sort by recorded time, most recent first
    const sortedEntries = vitalsEntries.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    return APIResponseHandler.success(res, sortedEntries);
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error fetching patient vitals:", error);
    return APIResponseHandler.error(res, "FETCH_VITALS_ERROR", "Failed to fetch vitals entries");
  }
});

/**
 * POST /api/vitals/entries
 * Create a new vitals entry
 */
router.post("/entries", async (req, res) => {
  try {
    console.log("🩺 [VitalsFlowsheet] POST /entries request received");
    console.log("🩺 [VitalsFlowsheet] Request body:", JSON.stringify(req.body, null, 2));
    console.log("🩺 [VitalsFlowsheet] User:", req.user?.id, req.user?.username);
    
    if (!req.user?.id) {
      console.error("❌ [VitalsFlowsheet] Unauthorized - no user");
      return APIResponseHandler.unauthorized(res);
    }

    const dataToValidate = {
      ...req.body,
      recordedBy: req.user.username || `User ${req.user.id}`,
    };
    
    console.log("🩺 [VitalsFlowsheet] Raw request body:", JSON.stringify(req.body, null, 2));
    console.log("🩺 [VitalsFlowsheet] Data to validate:", JSON.stringify(dataToValidate, null, 2));
    console.log("🩺 [VitalsFlowsheet] EncounterId present?", dataToValidate.encounterId !== undefined);
    console.log("🩺 [VitalsFlowsheet] EncounterId value:", dataToValidate.encounterId);
    console.log("🩺 [VitalsFlowsheet] PatientId present?", dataToValidate.patientId !== undefined);
    console.log("🩺 [VitalsFlowsheet] PatientId value:", dataToValidate.patientId);
    
    // encounterId is optional - vitals can be stored at patient level or encounter level
    console.log("🩺 [VitalsFlowsheet] EncounterId is optional for patient-level vitals");
    
    if (!dataToValidate.patientId) {
      console.error("❌ [VitalsFlowsheet] Missing patientId in request body");
      return APIResponseHandler.badRequest(res, "patientId is required");
    }
    
    const validatedData = VitalsEntrySchema.parse(dataToValidate);

    // Calculate BMI if height and weight are provided
    let bmi: number | undefined;
    if (validatedData.height && validatedData.weight) {
      // BMI = weight (lbs) / [height (inches)]² × 703
      bmi = (validatedData.weight / (validatedData.height * validatedData.height)) * 703;
      bmi = Math.round(bmi * 10) / 10; // Round to 1 decimal
    }

    // Generate clinical alerts for critical values
    const alerts = generateClinicalAlerts(validatedData);

    const vitalsEntry = await storage.createVitals({
      patientId: validatedData.patientId,
      encounterId: validatedData.encounterId || undefined,
      recordedAt: new Date(),
      systolicBp: validatedData.systolicBp || undefined,
      diastolicBp: validatedData.diastolicBp || undefined,
      heartRate: validatedData.heartRate || undefined,
      temperature: validatedData.temperature ? validatedData.temperature.toString() : undefined,
      weight: validatedData.weight ? validatedData.weight.toString() : undefined,
      height: validatedData.height ? validatedData.height.toString() : undefined,
      bmi: bmi ? bmi.toString() : undefined,
      oxygenSaturation: validatedData.oxygenSaturation ? validatedData.oxygenSaturation.toString() : undefined,
      respiratoryRate: validatedData.respiratoryRate || undefined,
      painScale: validatedData.painScale || undefined,
      recordedBy: validatedData.recordedBy,
    });

    console.log("✅ [VitalsFlowsheet] Created vitals entry:", vitalsEntry.id);
    console.log("✅ [VitalsFlowsheet] Returning success response with vitals entry");
    const response = APIResponseHandler.success(res, vitalsEntry, 201);
    console.log("✅ [VitalsFlowsheet] Response sent");
    return response;
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error creating vitals entry:", error);
    
    if (error instanceof z.ZodError) {
      console.error("❌ [VitalsFlowsheet] Validation errors:", JSON.stringify(error.errors, null, 2));
      return APIResponseHandler.badRequest(res, "Invalid vitals data", error.errors);
    }
    
    console.error("❌ [VitalsFlowsheet] Unexpected error:", error);
    return APIResponseHandler.error(res, error instanceof Error ? error.message : "Failed to create vitals entry", 500);
  }
});

/**
 * PUT /api/vitals/entries/:id
 * Update an existing vitals entry
 */
router.put("/entries/:id", async (req, res) => {
  try {
    if (!req.user?.id) {
      return APIResponseHandler.unauthorized(res);
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return APIResponseHandler.badRequest(res, "Invalid entry ID");
    }

    const validatedData = VitalsEntrySchema.partial().parse(req.body);

    // Calculate BMI if height and weight are provided
    let bmi: number | undefined;
    if (validatedData.height && validatedData.weight) {
      bmi = (validatedData.weight / (validatedData.height * validatedData.height)) * 703;
      bmi = Math.round(bmi * 10) / 10;
    }

    // Generate clinical alerts for critical values
    const alerts = generateClinicalAlerts(validatedData);

    const updatedEntry = await storage.updateVitalsEntry(entryId, {
      ...validatedData,
      ...(bmi && { bmi }),
      ...(alerts.length > 0 && { alerts }),
      updatedAt: new Date().toISOString(),
    });

    if (!updatedEntry) {
      return APIResponseHandler.notFound(res, "Vitals entry");
    }

    console.log("✅ [VitalsFlowsheet] Updated vitals entry:", entryId);
    return APIResponseHandler.success(res, updatedEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return APIResponseHandler.badRequest(res, "Invalid vitals data", error.errors);
    }
    
    console.error("❌ [VitalsFlowsheet] Error updating vitals entry:", error);
    return APIResponseHandler.error(res, "UPDATE_VITALS_ERROR", "Failed to update vitals entry");
  }
});

/**
 * DELETE /api/vitals/entries/:id
 * Delete a vitals entry
 */
router.delete("/entries/:id", async (req, res) => {
  try {
    if (!req.user?.id) {
      return APIResponseHandler.unauthorized(res);
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return APIResponseHandler.badRequest(res, "Invalid entry ID");
    }

    const deleted = await storage.deleteVitalsEntry(entryId);
    
    if (!deleted) {
      return APIResponseHandler.notFound(res, "Vitals entry");
    }

    console.log("✅ [VitalsFlowsheet] Deleted vitals entry:", entryId);
    return APIResponseHandler.success(res, { deleted: true });
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error deleting vitals entry:", error);
    return APIResponseHandler.error(res, "DELETE_VITALS_ERROR", "Failed to delete vitals entry");
  }
});

/**
 * GET /api/vitals/entries/:id
 * Get a specific vitals entry
 */
router.get("/entries/:id", async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return APIResponseHandler.badRequest(res, "Invalid entry ID");
    }

    const vitalsEntry = await storage.getVitalsEntry(entryId);
    
    if (!vitalsEntry) {
      return APIResponseHandler.notFound(res, "Vitals entry");
    }

    return APIResponseHandler.success(res, vitalsEntry);
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error fetching vitals entry:", error);
    return APIResponseHandler.error(res, "FETCH_VITALS_ERROR", "Failed to fetch vitals entry");
  }
});

/**
 * GET /api/vitals/trends/:patientId
 * Get vitals trends for a patient over time
 */
router.get("/trends/:patientId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    const { days = '30', encounterId } = req.query;
    const daysBack = parseInt(days as string);
    
    let vitalsEntries;
    if (encounterId) {
      vitalsEntries = await storage.getVitalsByEncounter(parseInt(encounterId as string));
    } else {
      vitalsEntries = await storage.getVitalsByPatient(patientId);
      
      // Filter by date range if specified
      if (daysBack > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        vitalsEntries = vitalsEntries.filter((entry: any) => 
          new Date(entry.recordedAt) >= cutoffDate
        );
      }
    }
    
    // Sort chronologically for trend analysis
    const sortedEntries = vitalsEntries.sort((a: any, b: any) => 
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // Calculate trends
    const trends = calculateVitalsTrends(sortedEntries);

    return APIResponseHandler.success(res, {
      entries: sortedEntries,
      trends,
      summary: {
        totalEntries: sortedEntries.length,
        dateRange: {
          start: sortedEntries[0]?.recordedAt,
          end: sortedEntries[sortedEntries.length - 1]?.recordedAt
        },
        criticalAlerts: sortedEntries.filter((entry: any) => entry.alerts?.length > 0).length
      }
    });
  } catch (error) {
    console.error("❌ [VitalsFlowsheet] Error fetching vitals trends:", error);
    return APIResponseHandler.error(res, "FETCH_TRENDS_ERROR", "Failed to fetch vitals trends");
  }
});

/**
 * Generate clinical alerts for critical vital sign values
 */
function generateClinicalAlerts(vitals: any): string[] {
  const alerts: string[] = [];

  // Blood pressure alerts
  if (vitals.systolicBp > 180 || vitals.diastolicBp > 110) {
    alerts.push("Hypertensive Crisis - BP recheck recommended in 15 minutes");
  } else if (vitals.systolicBp > 140 || vitals.diastolicBp > 90) {
    alerts.push("Hypertension Stage 2 - Monitor closely");
  }

  if (vitals.systolicBp < 90 || vitals.diastolicBp < 60) {
    alerts.push("Hypotension - Consider orthostatic vitals");
  }

  // Heart rate alerts
  if (vitals.heartRate > 120) {
    alerts.push("Tachycardia - Consider ECG if sustained");
  } else if (vitals.heartRate < 50) {
    alerts.push("Bradycardia - Monitor for symptoms");
  }

  // Temperature alerts
  if (vitals.temperature > 101.5) {
    alerts.push("High fever - Consider antipyretics and cultures");
  } else if (vitals.temperature < 95.0) {
    alerts.push("Hypothermia - Warm patient and recheck");
  }

  // Oxygen saturation alerts
  if (vitals.oxygenSaturation < 90) {
    alerts.push("Critical hypoxemia - Urgent intervention needed");
  } else if (vitals.oxygenSaturation < 95) {
    alerts.push("Hypoxemia - Consider supplemental oxygen");
  }

  // Respiratory rate alerts
  if (vitals.respiratoryRate > 30) {
    alerts.push("Tachypnea - Assess for respiratory distress");
  } else if (vitals.respiratoryRate < 8) {
    alerts.push("Bradypnea - Monitor closely");
  }

  // Pain scale alerts
  if (vitals.painScale >= 8) {
    alerts.push("Severe pain - Consider pain management interventions");
  }

  return alerts;
}

/**
 * Calculate trends for vital signs over time
 */
function calculateVitalsTrends(entries: any[]) {
  if (entries.length < 2) return {};

  const calculateTrend = (values: number[]) => {
    const validValues = values.filter(v => v !== null && v !== undefined);
    if (validValues.length < 2) return { trend: 'stable', change: 0 };

    const first = validValues[0];
    const last = validValues[validValues.length - 1];
    const change = last - first;
    const percentChange = (change / first) * 100;

    let trend = 'stable';
    if (Math.abs(percentChange) > 10) {
      trend = change > 0 ? 'increasing' : 'decreasing';
    }

    return { trend, change: Math.round(change * 10) / 10, percentChange: Math.round(percentChange * 10) / 10 };
  };

  return {
    systolicBp: calculateTrend(entries.map(e => e.systolicBp)),
    diastolicBp: calculateTrend(entries.map(e => e.diastolicBp)),
    heartRate: calculateTrend(entries.map(e => e.heartRate)),
    temperature: calculateTrend(entries.map(e => e.temperature)),
    weight: calculateTrend(entries.map(e => e.weight)),
    oxygenSaturation: calculateTrend(entries.map(e => e.oxygenSaturation)),
    respiratoryRate: calculateTrend(entries.map(e => e.respiratoryRate)),
    painScale: calculateTrend(entries.map(e => e.painScale))
  };
}

export default router;