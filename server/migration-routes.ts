import { Router } from "express";
import { MigrationService } from "./migration-service";
import { db } from "./db";
import { users, healthSystems } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Get migration analysis for a provider joining a health system
router.get("/api/migration/analyze/:targetHealthSystemId", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const targetHealthSystemId = parseInt(req.params.targetHealthSystemId);
    
    // Verify the user is a provider with an individual practice
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        healthSystem: true,
      },
    });
    
    if (!user || user.role !== 'provider') {
      return res.status(403).json({ message: "Only providers can migrate practices" });
    }
    
    // Verify target health system exists
    const targetSystem = await db.query.healthSystems.findFirst({
      where: eq(healthSystems.id, targetHealthSystemId),
    });
    
    if (!targetSystem) {
      return res.status(404).json({ message: "Target health system not found" });
    }
    
    // Get categorized patients
    const categorizedPatients = await MigrationService.categorizePatients(userId, targetHealthSystemId);
    
    // Group by category
    const analysis = {
      targetHealthSystem: {
        id: targetSystem.id,
        name: targetSystem.name,
      },
      categories: {
        clinicPatients: categorizedPatients.filter(p => p.category === 'clinic_patient'),
        hospitalPatients: categorizedPatients.filter(p => p.category === 'hospital_patient'),
        privatePatients: categorizedPatients.filter(p => p.category === 'private_patient'),
        unknownPatients: categorizedPatients.filter(p => p.category === 'unknown'),
      },
      summary: {
        total: categorizedPatients.length,
        canAutoMigrate: categorizedPatients.filter(p => p.canAutoMigrate).length,
        requiresConsent: categorizedPatients.filter(p => p.requiresConsent).length,
      },
    };
    
    res.json(analysis);
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error analyzing migration:", error);
    res.status(500).json({ message: "Failed to analyze migration" });
  }
});

// Execute migration for selected patients
router.post("/api/migration/execute", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetHealthSystemId, patientIds, consentData } = req.body;
    
    if (!targetHealthSystemId || !Array.isArray(patientIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    
    // Execute migration
    const results = await MigrationService.migratePatients(
      userId,
      targetHealthSystemId,
      patientIds,
      consentData
    );
    
    res.json({
      success: true,
      results,
      message: `Successfully migrated ${results.migrated.length} patients`,
    });
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error executing migration:", error);
    res.status(500).json({ message: "Failed to execute migration" });
  }
});

// Send consent requests for patients requiring authorization
router.post("/api/migration/request-consent", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { patientIds, targetHealthSystemName } = req.body;
    
    if (!Array.isArray(patientIds) || !targetHealthSystemName) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    
    const result = await MigrationService.sendConsentRequests(
      userId,
      patientIds,
      targetHealthSystemName
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error sending consent requests:", error);
    res.status(500).json({ message: "Failed to send consent requests" });
  }
});

console.log("✅ [MigrationRoutes] Migration routes registered");

export default router;