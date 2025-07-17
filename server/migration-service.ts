import { db } from "./db.js";
import { patients, healthSystems, users, medicalProblems, medications, encounters } from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export interface PatientMigrationCategory {
  patient: any;
  category: 'clinic_patient' | 'hospital_patient' | 'private_patient' | 'unknown';
  canAutoMigrate: boolean;
  requiresConsent: boolean;
  originalFacility?: string;
  derivativeWorkSummary?: string;
}

export class MigrationService {
  /**
   * Categorizes a provider's patients for migration when joining a group practice
   */
  static async categorizePatients(providerId: number, targetHealthSystemId: number) {
    console.log(`📊 [MigrationService] Categorizing patients for provider ${providerId}`);
    
    // Get provider information
    const provider = await db.query.users.findFirst({
      where: eq(users.id, providerId),
    });
    
    if (!provider) {
      throw new Error("Provider not found");
    }
    
    // Get all patients created by this provider
    const providerPatients = await db.query.patients.findMany({
      where: eq(patients.createdByProviderId, providerId),
    });
    
    // Get target health system information
    const targetSystem = await db.query.healthSystems.findFirst({
      where: eq(healthSystems.id, targetHealthSystemId),
    });
    
    // Categorize each patient
    const categorizedPatients: PatientMigrationCategory[] = [];
    
    for (const patient of providerPatients) {
      let category: PatientMigrationCategory['category'] = 'unknown';
      let canAutoMigrate = false;
      let requiresConsent = true;
      let originalFacility = '';
      
      // Determine category based on creation context and origin
      if (patient.creationContext === 'clinic_hours' && patient.originalFacilityId === targetHealthSystemId) {
        // Patient was seen at the target clinic
        category = 'clinic_patient';
        canAutoMigrate = true;
        requiresConsent = false;
      } else if (patient.creationContext === 'hospital_rounds') {
        // Patient was seen at hospital
        category = 'hospital_patient';
        canAutoMigrate = false;
        requiresConsent = true;
      } else if (patient.creationContext === 'private_practice' || patient.healthSystemId === provider.healthSystemId) {
        // Patient from provider's individual practice
        category = 'private_patient';
        canAutoMigrate = true;
        requiresConsent = false; // Provider owns this data
      }
      
      // Get original facility name if different
      if (patient.originalFacilityId && patient.originalFacilityId !== targetHealthSystemId) {
        const originalSystem = await db.query.healthSystems.findFirst({
          where: eq(healthSystems.id, patient.originalFacilityId),
        });
        originalFacility = originalSystem?.name || 'Unknown Facility';
      }
      
      // Summarize derivative work
      const derivativeWorkSummary = await this.getDerivativeWorkSummary(patient.id);
      
      categorizedPatients.push({
        patient,
        category,
        canAutoMigrate,
        requiresConsent,
        originalFacility,
        derivativeWorkSummary,
      });
    }
    
    return categorizedPatients;
  }
  
  /**
   * Gets a summary of derivative work created for a patient
   */
  static async getDerivativeWorkSummary(patientId: number) {
    const [problemCount, medicationCount, encounterCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(medicalProblems)
        .where(eq(medicalProblems.patientId, patientId)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(medications)
        .where(eq(medications.patientId, patientId)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(encounters)
        .where(eq(encounters.patientId, patientId)),
    ]);
    
    return `${problemCount[0].count} problems, ${medicationCount[0].count} medications, ${encounterCount[0].count} encounters`;
  }
  
  /**
   * Migrates approved patients to the new health system
   */
  static async migratePatients(
    providerId: number,
    targetHealthSystemId: number,
    patientIds: number[],
    consentData?: Record<number, any>
  ) {
    console.log(`🚀 [MigrationService] Migrating ${patientIds.length} patients to health system ${targetHealthSystemId}`);
    
    const results = {
      migrated: [] as number[],
      failed: [] as { id: number; error: string }[],
    };
    
    for (const patientId of patientIds) {
      try {
        // Update patient consent if provided
        if (consentData && consentData[patientId]) {
          await db.update(patients)
            .set({
              migrationConsent: {
                consentGiven: true,
                consentDate: new Date().toISOString(),
                consentMethod: consentData[patientId].method || 'system_migration',
                consentDocumentId: consentData[patientId].documentId,
              },
            })
            .where(eq(patients.id, patientId));
        }
        
        // Migrate patient to new health system
        await db.update(patients)
          .set({
            healthSystemId: targetHealthSystemId,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, patientId));
        
        results.migrated.push(patientId);
        console.log(`✅ [MigrationService] Migrated patient ${patientId}`);
        
      } catch (error) {
        console.error(`❌ [MigrationService] Failed to migrate patient ${patientId}:`, error);
        results.failed.push({
          id: patientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }
  
  /**
   * Sends consent requests to patients requiring authorization
   */
  static async sendConsentRequests(
    providerId: number,
    patientIds: number[],
    targetHealthSystemName: string
  ) {
    console.log(`📧 [MigrationService] Sending consent requests to ${patientIds.length} patients`);
    
    // In production, this would integrate with email/patient portal
    // For now, we'll just mark them as pending consent
    
    for (const patientId of patientIds) {
      await db.update(patients)
        .set({
          migrationConsent: {
            consentGiven: false,
            consentDate: null,
            consentMethod: 'pending_email',
            excludedFromMigration: false,
          },
        })
        .where(eq(patients.id, patientId));
    }
    
    return {
      sent: patientIds.length,
      message: "Consent requests marked as pending. In production, emails would be sent.",
    };
  }
}