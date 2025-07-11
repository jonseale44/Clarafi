import { Router } from "express";
import { MigrationService } from "./migration-service";
import { db } from "./db";
import { users, healthSystems, migrationInvitations } from "@shared/schema";
import { eq, and, or, gt } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Get active migration invitations for the current user
router.get("/api/migration/invitations", requireAuth, async (req, res) => {
  try {
    const userEmail = req.user!.email;
    
    // Fetch pending invitations for this user
    const invitations = await db.query.migrationInvitations.findMany({
      where: and(
        eq(migrationInvitations.invitedUserEmail, userEmail),
        eq(migrationInvitations.status, 'pending'),
        gt(migrationInvitations.expiresAt, new Date())
      ),
      with: {
        targetHealthSystem: true,
        createdByUser: true,
      },
    });
    
    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      targetHealthSystemId: inv.targetHealthSystemId,
      targetHealthSystemName: inv.targetHealthSystem?.name || 'Unknown',
      invitationCode: inv.invitationCode,
      message: inv.message,
      createdByUserName: inv.createdByUser?.username || 'System Admin',
      expiresAt: inv.expiresAt,
      status: inv.status,
    }));
    
    res.json(formattedInvitations);
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error fetching invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
});

// Validate an invitation code
router.post("/api/migration/validate-invitation", requireAuth, async (req, res) => {
  try {
    const { invitationCode } = req.body;
    const userEmail = req.user!.email;
    
    if (!invitationCode) {
      return res.status(400).json({ valid: false, message: "Invitation code is required" });
    }
    
    // Find the invitation
    const invitation = await db.query.migrationInvitations.findFirst({
      where: and(
        eq(migrationInvitations.invitationCode, invitationCode.trim()),
        eq(migrationInvitations.invitedUserEmail, userEmail),
        eq(migrationInvitations.status, 'pending'),
        gt(migrationInvitations.expiresAt, new Date())
      ),
      with: {
        targetHealthSystem: true,
        createdByUser: true,
      },
    });
    
    if (!invitation) {
      return res.json({ 
        valid: false, 
        message: "Invalid or expired invitation code" 
      });
    }
    
    res.json({
      valid: true,
      invitation: {
        id: invitation.id,
        targetHealthSystemId: invitation.targetHealthSystemId,
        targetHealthSystemName: invitation.targetHealthSystem?.name || 'Unknown',
        invitationCode: invitation.invitationCode,
        message: invitation.message,
        createdByUserName: invitation.createdByUser?.username || 'System Admin',
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error validating invitation:", error);
    res.status(500).json({ valid: false, message: "Failed to validate invitation" });
  }
});

// Analyze migration for the current user
router.post("/api/migration/analyze", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetHealthSystemId } = req.body;
    
    if (!targetHealthSystemId) {
      return res.status(400).json({ message: "Target health system ID is required" });
    }
    
    // Get categorized patients
    const categorizedPatients = await MigrationService.categorizePatients(userId, targetHealthSystemId);
    
    // Build analysis response
    const analysis = {
      totalPatients: categorizedPatients.length,
      autoMigrateCount: categorizedPatients.filter(p => p.canAutoMigrate).length,
      requiresConsentCount: categorizedPatients.filter(p => p.requiresConsent).length,
      patientCategories: {
        clinicPatients: categorizedPatients.filter(p => p.category === 'clinic_patient').length,
        hospitalPatients: categorizedPatients.filter(p => p.category === 'hospital_patient').length,
        privatePatients: categorizedPatients.filter(p => p.category === 'private_patient').length,
        unknownOrigin: categorizedPatients.filter(p => p.category === 'unknown').length,
      },
    };
    
    res.json(analysis);
  } catch (error) {
    console.error("❌ [MigrationRoutes] Error analyzing migration:", error);
    res.status(500).json({ message: "Failed to analyze migration" });
  }
});

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

// Execute migration with invitation code
router.post("/api/migration/execute", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { invitationCode, targetHealthSystemId } = req.body;
    
    if (!invitationCode || !targetHealthSystemId) {
      return res.status(400).json({ message: "Invitation code and target health system are required" });
    }
    
    // Validate invitation
    const invitation = await db.query.migrationInvitations.findFirst({
      where: and(
        eq(migrationInvitations.invitationCode, invitationCode),
        eq(migrationInvitations.invitedUserEmail, userEmail),
        eq(migrationInvitations.status, 'pending'),
        eq(migrationInvitations.targetHealthSystemId, targetHealthSystemId),
        gt(migrationInvitations.expiresAt, new Date())
      ),
    });
    
    if (!invitation) {
      return res.status(403).json({ message: "Invalid or expired invitation" });
    }
    
    // Get all patient IDs that can auto-migrate
    const categorizedPatients = await MigrationService.categorizePatients(userId, targetHealthSystemId);
    const autoMigratePatientIds = categorizedPatients
      .filter(p => p.canAutoMigrate)
      .map(p => p.patientId);
    
    if (autoMigratePatientIds.length === 0) {
      // Even if no patients to migrate, still update user's health system
      await db
        .update(users)
        .set({
          healthSystemId: targetHealthSystemId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
        
      // Update invitation status
      await db
        .update(migrationInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(migrationInvitations.id, invitation.id));
        
      return res.json({
        success: true,
        migratedCount: 0,
        message: "Successfully joined the new practice (no patients required migration)",
      });
    }
    
    // Execute migration
    const results = await MigrationService.migratePatients(
      userId,
      targetHealthSystemId,
      autoMigratePatientIds,
      {} // Empty consent data since we're only migrating auto-eligible patients
    );
    
    // Update invitation status
    await db
      .update(migrationInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(migrationInvitations.id, invitation.id));
    
    // Update user's health system
    await db
      .update(users)
      .set({
        healthSystemId: targetHealthSystemId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    res.json({
      success: true,
      migratedCount: results.migrated.length,
      message: `Successfully migrated ${results.migrated.length} patients and joined the new practice`,
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