import { Router } from "express";
import { db } from "./db.js";
import { patientOrderPreferences, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler.js";

const router = Router();

/**
 * GET /api/patients/:patientId/order-preferences
 * Get order delivery preferences for a patient
 */
router.get("/:patientId/order-preferences", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    console.log(`🎯 [OrderPreferences] Fetching preferences for patient ${patientId}`);

    // Get existing preferences or return defaults
    const preferences = await db
      .select()
      .from(patientOrderPreferences)
      .where(eq(patientOrderPreferences.patientId, patientId))
      .limit(1);

    if (preferences.length === 0) {
      // Return default preferences structure
      const defaultPreferences = {
        patientId,
        labDeliveryMethod: "mock_service",
        labServiceProvider: null,
        imagingDeliveryMethod: "print_pdf", 
        imagingServiceProvider: null,
        medicationDeliveryMethod: "preferred_pharmacy",
        preferredPharmacy: null,
        pharmacyPhone: null,
        pharmacyFax: null,
        createdAt: null,
        updatedAt: null,
        lastUpdatedBy: null
      };
      
      console.log(`🎯 [OrderPreferences] No preferences found, returning defaults`);
      return APIResponseHandler.success(res, defaultPreferences);
    }

    console.log(`🎯 [OrderPreferences] Found preferences:`, preferences[0]);
    return APIResponseHandler.success(res, preferences[0]);

  } catch (error) {
    console.error("Error fetching patient order preferences:", error);
    return APIResponseHandler.error(res, "Failed to fetch patient order preferences", 500, "FETCH_PREFERENCES_ERROR");
  }
});

/**
 * PUT /api/patients/:patientId/order-preferences
 * Update order delivery preferences for a patient
 */
router.put("/:patientId/order-preferences", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return APIResponseHandler.badRequest(res, "Invalid patient ID");
    }

    const userId = (req.user as any).id;
    const {
      labDeliveryMethod,
      labServiceProvider,
      imagingDeliveryMethod,
      imagingServiceProvider,
      medicationDeliveryMethod,
      preferredPharmacy,
      pharmacyPhone,
      pharmacyFax
    } = req.body;

    console.log(`🎯 [OrderPreferences] Updating preferences for patient ${patientId}`);
    console.log(`🎯 [OrderPreferences] New preferences:`, req.body);

    // Check if preferences exist
    const existingPreferences = await db
      .select()
      .from(patientOrderPreferences)
      .where(eq(patientOrderPreferences.patientId, patientId))
      .limit(1);

    const updateData = {
      labDeliveryMethod: labDeliveryMethod || "mock_service",
      labServiceProvider,
      imagingDeliveryMethod: imagingDeliveryMethod || "print_pdf",
      imagingServiceProvider,
      medicationDeliveryMethod: medicationDeliveryMethod || "preferred_pharmacy",
      preferredPharmacy,
      pharmacyPhone,
      pharmacyFax,
      updatedAt: new Date(),
      lastUpdatedBy: userId
    };

    let result;
    
    if (existingPreferences.length === 0) {
      // Create new preferences
      console.log(`🎯 [OrderPreferences] Creating new preferences for patient ${patientId}`);
      result = await db
        .insert(patientOrderPreferences)
        .values({
          patientId,
          providerId: userId,  // Add the missing provider_id
          ...updateData,
          createdAt: new Date()
        })
        .returning();
    } else {
      // Update existing preferences
      console.log(`🎯 [OrderPreferences] Updating existing preferences for patient ${patientId}`);
      result = await db
        .update(patientOrderPreferences)
        .set(updateData)
        .where(eq(patientOrderPreferences.patientId, patientId))
        .returning();
    }

    console.log(`🎯 [OrderPreferences] Successfully updated preferences:`, result[0]);
    return APIResponseHandler.success(res, result[0]);

  } catch (error) {
    console.error("Error updating patient order preferences:", error);
    return APIResponseHandler.error(res, "Failed to update patient order preferences", 500, "UPDATE_PREFERENCES_ERROR");
  }
});

export default router;