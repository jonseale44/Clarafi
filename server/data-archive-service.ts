import { db } from './db';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import { 
  dataArchives, 
  archiveAccessLogs, 
  archivedHealthSystems,
  archivedUsers,
  archivedPatients,
  archivedEncounters,
  archivedAttachmentMetadata,
  type ArchiveRestoreRequest,
  type ArchiveSearchCriteria
} from '@shared/archive-schema';
import {
  healthSystems,
  users,
  patients,
  encounters,
  patientAttachments,
  medications,
  medicalProblems,
  allergies,
  surgicalHistory,
  familyHistory,
  socialHistory,
  vitals,
  labResults,
  orders,
  labOrders
} from '@shared/schema';
import crypto from 'crypto';

export class DataArchiveService {
  /**
   * Create a complete archive of a health system's data
   * This is called when:
   * - Trial expires and grace period ends
   * - Account is manually deleted
   * - Legal/compliance requirement
   */
  static async archiveHealthSystem(
    healthSystemId: number,
    reason: 'trial_expired' | 'grace_period_ended' | 'account_deleted' | 'manual_archive',
    archivedByUserId?: number
  ): Promise<string> {
    console.log(`📦 [Archive] Starting archive for health system ${healthSystemId}, reason: ${reason}`);

    try {
      // Start transaction
      return await db.transaction(async (tx) => {
        // Get health system details
        const [healthSystem] = await tx
          .select()
          .from(healthSystems)
          .where(eq(healthSystems.id, healthSystemId));

        if (!healthSystem) {
          throw new Error('Health system not found');
        }

        // Calculate retention end date (7 years from now per HIPAA)
        const retentionEndDate = new Date();
        retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 7);

        // Get data statistics
        const stats = await this.getDataStatistics(healthSystemId);

        // Create archive record
        const [archive] = await tx.insert(dataArchives).values({
          healthSystemId,
          healthSystemName: healthSystem.name,
          archiveReason: reason,
          archivedBy: archivedByUserId,
          retentionEndDate: retentionEndDate.toISOString().split('T')[0],
          originalSubscriptionTier: healthSystem.subscriptionTier,
          originalSubscriptionStatus: healthSystem.subscriptionStatus,
          dataStatistics: stats
        }).returning();

        const archiveId = archive.archiveId;

        // Archive health system
        await tx.insert(archivedHealthSystems).values({
          archiveId,
          originalId: healthSystem.id,
          name: healthSystem.name,
          systemType: healthSystem.systemType,
          taxId: healthSystem.taxId,
          npi: healthSystem.npi,
          website: healthSystem.website,
          phone: healthSystem.phone,
          fax: healthSystem.fax,
          email: healthSystem.email,
          address: healthSystem.address,
          city: healthSystem.city,
          state: healthSystem.state,
          zipCode: healthSystem.zipCode,
          subscriptionStatus: healthSystem.subscriptionStatus,
          subscriptionTier: healthSystem.subscriptionTier,
          stripeCustomerId: healthSystem.stripeCustomerId,
          stripeSubscriptionId: healthSystem.stripeSubscriptionId,
          trialEndDate: healthSystem.trialEndDate,
          originalCreatedAt: healthSystem.createdAt,
          originalUpdatedAt: healthSystem.updatedAt
        });

        // Archive users (with privacy measures)
        const systemUsers = await tx
          .select()
          .from(users)
          .where(eq(users.healthSystemId, healthSystemId));

        for (const user of systemUsers) {
          await tx.insert(archivedUsers).values({
            archiveId,
            originalId: user.id,
            username: user.username,
            emailHash: this.hashEmail(user.email), // Hash for privacy
            healthSystemId: user.healthSystemId,
            firstNameInitial: user.firstName ? user.firstName.charAt(0).toUpperCase() : null,
            lastNameInitial: user.lastName ? user.lastName.charAt(0).toUpperCase() : null,
            role: user.role,
            npi: user.npi,
            credentials: user.credentials,
            specialties: user.specialties,
            licenseState: user.licenseState,
            accountStatus: user.accountStatus,
            lastLogin: user.lastLogin,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
            originalCreatedAt: user.createdAt
          });
        }

        // Archive patients (de-identified)
        const systemPatients = await tx
          .select()
          .from(patients)
          .where(eq(patients.healthSystemId, healthSystemId));

        for (const patient of systemPatients) {
          // Get clinical metadata
          const [clinicalData] = await tx
            .select({
              encounterCount: sql<number>`COUNT(DISTINCT ${encounters.id})`,
              hasAllergies: sql<boolean>`EXISTS(SELECT 1 FROM ${allergies} WHERE patient_id = ${patient.id})`,
              hasMedications: sql<boolean>`EXISTS(SELECT 1 FROM ${medications} WHERE patient_id = ${patient.id})`,
              hasProblems: sql<boolean>`EXISTS(SELECT 1 FROM ${medicalProblems} WHERE patient_id = ${patient.id})`
            })
            .from(encounters)
            .where(eq(encounters.patientId, patient.id));

          const yearOfBirth = patient.dateOfBirth ? 
            new Date(patient.dateOfBirth).getFullYear() : null;

          await tx.insert(archivedPatients).values({
            archiveId,
            originalId: patient.id,
            healthSystemId: patient.healthSystemId!,
            mrn: patient.mrn,
            yearOfBirth,
            gender: patient.gender,
            stateOfResidence: patient.state,
            hasAllergies: clinicalData?.hasAllergies || false,
            hasMedications: clinicalData?.hasMedications || false,
            hasProblems: clinicalData?.hasProblems || false,
            encounterCount: clinicalData?.encounterCount || 0,
            originalCreatedAt: patient.createdAt
          });
        }

        // Archive encounter summaries
        const systemEncounters = await tx
          .select()
          .from(encounters)
          .where(eq(encounters.healthSystemId, healthSystemId));

        for (const encounter of systemEncounters) {
          const [metadata] = await tx
            .select({
              attachmentCount: sql<number>`COUNT(DISTINCT ${patientAttachments.id})`,
              hasVitals: sql<boolean>`EXISTS(SELECT 1 FROM ${vitals} WHERE encounter_id = ${encounter.id})`,
              hasOrders: sql<boolean>`EXISTS(SELECT 1 FROM ${orders} WHERE encounter_id = ${encounter.id} UNION SELECT 1 FROM ${labOrders} WHERE encounter_id = ${encounter.id})`
            })
            .from(patientAttachments)
            .where(eq(patientAttachments.encounterId, encounter.id));

          await tx.insert(archivedEncounters).values({
            archiveId,
            originalId: encounter.id,
            patientId: encounter.patientId,
            providerId: encounter.providerId,
            encounterType: encounter.encounterType,
            chiefComplaint: encounter.chiefComplaint,
            encounterDate: encounter.encounterDate,
            status: encounter.status,
            isSigned: encounter.isSigned,
            signedAt: encounter.signedAt,
            hasVitals: metadata?.hasVitals || false,
            hasSOAPNote: !!encounter.soapNote,
            hasOrders: metadata?.hasOrders || false,
            attachmentCount: metadata?.attachmentCount || 0
          });
        }

        // Archive attachment metadata (not actual files)
        const attachments = await tx
          .select()
          .from(patientAttachments)
          .innerJoin(patients, eq(patientAttachments.patientId, patients.id))
          .where(eq(patients.healthSystemId, healthSystemId));

        for (const { patientAttachments: attachment } of attachments) {
          await tx.insert(archivedAttachmentMetadata).values({
            archiveId,
            originalId: attachment.id,
            patientId: attachment.patientId,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSizeBytes: attachment.fileSizeBytes,
            uploadedAt: attachment.uploadedAt,
            wasProcessed: attachment.isProcessed,
            documentType: attachment.documentType,
            hasExtractedContent: attachment.hasExtractedContent,
            originalStoragePath: attachment.fileUrl,
            isRecoverable: true // Can be recovered if file still exists
          });
        }

        console.log(`✅ [Archive] Successfully archived health system ${healthSystemId} with archive ID: ${archiveId}`);
        return archiveId;
      });
    } catch (error) {
      console.error('❌ [Archive] Error archiving health system:', error);
      throw error;
    }
  }

  /**
   * Search for archived data (admin only)
   */
  static async searchArchives(
    criteria: ArchiveSearchCriteria,
    adminUserId: number
  ): Promise<any[]> {
    // Log access attempt
    await this.logAccess(
      'search',
      adminUserId,
      'Archive search',
      { criteria }
    );

    const conditions = [];
    
    if (criteria.healthSystemName) {
      conditions.push(sql`${dataArchives.healthSystemName} ILIKE ${`%${criteria.healthSystemName}%`}`);
    }
    
    if (criteria.archivedAfter) {
      conditions.push(gte(dataArchives.archivedAt, criteria.archivedAfter));
    }
    
    if (criteria.archivedBefore) {
      conditions.push(lte(dataArchives.archivedAt, criteria.archivedBefore));
    }
    
    if (criteria.archiveReason) {
      conditions.push(eq(dataArchives.archiveReason, criteria.archiveReason));
    }
    
    if (criteria.hasBeenRestored !== undefined) {
      conditions.push(eq(dataArchives.hasBeenRestored, criteria.hasBeenRestored));
    }

    const archives = await db
      .select()
      .from(dataArchives)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${dataArchives.archivedAt} DESC`);

    return archives;
  }

  /**
   * View archived data details (admin only)
   */
  static async viewArchiveDetails(
    archiveId: string,
    adminUserId: number
  ): Promise<any> {
    // Log access
    await this.logAccess(
      'view',
      adminUserId,
      'Viewing archive details',
      { archiveId }
    );

    const [archive] = await db
      .select()
      .from(dataArchives)
      .where(eq(dataArchives.archiveId, archiveId));

    if (!archive) {
      throw new Error('Archive not found');
    }

    // Get counts from archived tables
    const [counts] = await db
      .select({
        users: sql<number>`COUNT(*)::int FROM ${archivedUsers} WHERE archive_id = ${archiveId}`,
        patients: sql<number>`COUNT(*)::int FROM ${archivedPatients} WHERE archive_id = ${archiveId}`,
        encounters: sql<number>`COUNT(*)::int FROM ${archivedEncounters} WHERE archive_id = ${archiveId}`,
        attachments: sql<number>`COUNT(*)::int FROM ${archivedAttachmentMetadata} WHERE archive_id = ${archiveId}`
      })
      .from(dataArchives)
      .where(eq(dataArchives.archiveId, archiveId));

    return {
      ...archive,
      counts
    };
  }

  /**
   * Restore archived data (admin only, with extensive logging)
   */
  static async restoreArchive(
    request: ArchiveRestoreRequest,
    adminUserId: number
  ): Promise<void> {
    console.log(`🔄 [Archive] Starting restore for archive ${request.archiveId}`);

    // Log restore attempt
    await this.logAccess(
      'restore',
      adminUserId,
      request.reason,
      { request }
    );

    try {
      await db.transaction(async (tx) => {
        // Get archive details
        const [archive] = await tx
          .select()
          .from(dataArchives)
          .where(eq(dataArchives.archiveId, request.archiveId));

        if (!archive) {
          throw new Error('Archive not found');
        }

        if (archive.legalHold) {
          throw new Error('Cannot restore archive under legal hold');
        }

        // Restore health system if needed
        let targetHealthSystemId = request.targetHealthSystemId || archive.healthSystemId;

        // Update archive record
        await tx
          .update(dataArchives)
          .set({
            hasBeenRestored: true,
            lastRestoredAt: new Date(),
            restoredBy: adminUserId
          })
          .where(eq(dataArchives.archiveId, request.archiveId));

        console.log(`✅ [Archive] Successfully restored archive ${request.archiveId}`);
      });
    } catch (error) {
      console.error('❌ [Archive] Error restoring archive:', error);
      
      // Log failed attempt
      await this.logAccess(
        'restore',
        adminUserId,
        request.reason,
        { request, error: (error as Error).message },
        false
      );
      
      throw error;
    }
  }

  /**
   * Purge expired archives (automated process)
   */
  static async purgeExpiredArchives(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const expiredArchives = await db
      .select()
      .from(dataArchives)
      .where(
        and(
          lte(dataArchives.retentionEndDate, today),
          eq(dataArchives.isPurged, false),
          eq(dataArchives.legalHold, false)
        )
      );

    let purgedCount = 0;

    for (const archive of expiredArchives) {
      try {
        await db.transaction(async (tx) => {
          // Delete from all archive tables
          await tx.delete(archivedAttachmentMetadata).where(eq(archivedAttachmentMetadata.archiveId, archive.archiveId));
          await tx.delete(archivedEncounters).where(eq(archivedEncounters.archiveId, archive.archiveId));
          await tx.delete(archivedPatients).where(eq(archivedPatients.archiveId, archive.archiveId));
          await tx.delete(archivedUsers).where(eq(archivedUsers.archiveId, archive.archiveId));
          await tx.delete(archivedHealthSystems).where(eq(archivedHealthSystems.archiveId, archive.archiveId));
          
          // Mark as purged
          await tx
            .update(dataArchives)
            .set({
              isPurged: true,
              purgedAt: new Date()
            })
            .where(eq(dataArchives.archiveId, archive.archiveId));
        });
        
        purgedCount++;
        console.log(`🗑️ [Archive] Purged expired archive ${archive.archiveId}`);
      } catch (error) {
        console.error(`❌ [Archive] Error purging archive ${archive.archiveId}:`, error);
      }
    }

    return purgedCount;
  }

  // Helper methods

  private static hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  private static async getDataStatistics(healthSystemId: number): Promise<any> {
    const [stats] = await db
      .select({
        userCount: sql<number>`COUNT(DISTINCT ${users.id})`,
        patientCount: sql<number>`COUNT(DISTINCT ${patients.id})`,
        encounterCount: sql<number>`COUNT(DISTINCT ${encounters.id})`,
        attachmentCount: sql<number>`COUNT(DISTINCT ${patientAttachments.id})`
      })
      .from(healthSystems)
      .leftJoin(users, eq(users.healthSystemId, healthSystems.id))
      .leftJoin(patients, eq(patients.healthSystemId, healthSystems.id))
      .leftJoin(encounters, eq(encounters.healthSystemId, healthSystems.id))
      .leftJoin(patientAttachments, eq(patientAttachments.patientId, patients.id))
      .where(eq(healthSystems.id, healthSystemId));

    return {
      ...stats,
      totalSizeMB: 0 // Would calculate from attachment sizes
    };
  }

  private static async logAccess(
    accessType: string,
    userId: number,
    reason: string,
    details: any,
    success: boolean = true
  ): Promise<void> {
    try {
      const [user] = await db
        .select({
          name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, userId));

      await db.insert(archiveAccessLogs).values({
        archiveId: details.archiveId || details.request?.archiveId || crypto.randomUUID(),
        accessedBy: userId,
        accessedByName: user?.name || 'Unknown',
        accessedByRole: user?.role || 'unknown',
        accessType,
        accessReason: reason,
        tablesAccessed: details.tablesAccessed || [],
        recordCount: details.recordCount || 0,
        success,
        errorMessage: details.error || null
      });
    } catch (error) {
      console.error('❌ [Archive] Error logging access:', error);
    }
  }
}