import { pgTable, serial, integer, text, timestamp, jsonb, boolean, date, decimal, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * HIPAA-Compliant Data Archive System
 * 
 * Purpose: Maintain archived copies of user data for recovery purposes
 * Retention: 7 years (standard HIPAA requirement)
 * Access: System administrators only, with full audit trail
 * 
 * Architecture:
 * - Mirror tables for all critical data
 * - Audit logs for all access
 * - Encrypted at rest (handled by database)
 * - Automatic purging after retention period
 */

// Archive metadata - tracks what was archived and when
export const dataArchives = pgTable('data_archives', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').defaultRandom().notNull().unique(), // Unique identifier for this archive batch
  
  // What was archived
  healthSystemId: integer('health_system_id').notNull(),
  healthSystemName: text('health_system_name').notNull(),
  archiveReason: text('archive_reason').notNull(), // 'trial_expired', 'grace_period_ended', 'account_deleted', 'manual_archive'
  
  // When it was archived
  archivedAt: timestamp('archived_at').defaultNow().notNull(),
  archivedBy: integer('archived_by'), // User ID who initiated (null for automatic)
  
  // Retention management
  retentionEndDate: date('retention_end_date').notNull(), // When this archive can be purged
  isPurged: boolean('is_purged').default(false),
  purgedAt: timestamp('purged_at'),
  
  // Restore tracking
  hasBeenRestored: boolean('has_been_restored').default(false),
  lastRestoredAt: timestamp('last_restored_at'),
  restoredBy: integer('restored_by'),
  
  // Metadata
  originalSubscriptionTier: integer('original_subscription_tier'),
  originalSubscriptionStatus: text('original_subscription_status'),
  dataStatistics: jsonb('data_statistics').$type<{
    userCount: number;
    patientCount: number;
    encounterCount: number;
    attachmentCount: number;
    totalSizeMB: number;
  }>(),
  
  // Legal/compliance
  legalHold: boolean('legal_hold').default(false), // Prevents automatic purging
  legalHoldReason: text('legal_hold_reason'),
  complianceNotes: text('compliance_notes')
});

// Archive access logs - HIPAA requires tracking all access to PHI
export const archiveAccessLogs = pgTable('archive_access_logs', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  // Who accessed
  accessedBy: integer('accessed_by').notNull(), // User ID
  accessedByName: text('accessed_by_name').notNull(),
  accessedByRole: text('accessed_by_role').notNull(),
  
  // What they did
  accessType: text('access_type').notNull(), // 'view', 'export', 'restore', 'purge'
  accessReason: text('access_reason').notNull(), // Required justification
  
  // When and from where
  accessedAt: timestamp('accessed_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  // What was accessed (for granular tracking)
  tablesAccessed: text('tables_accessed').array(),
  recordCount: integer('record_count'),
  
  // Results
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  
  // Additional security info
  mfaVerified: boolean('mfa_verified').default(false),
  sessionId: text('session_id')
});

// Archived health systems
export const archivedHealthSystems = pgTable('archived_health_systems', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  // Original health system data
  originalId: integer('original_id').notNull(),
  name: text('name').notNull(),
  systemType: text('system_type'),
  taxId: text('tax_id'),
  npi: text('npi'),
  website: text('website'),
  phone: text('phone'),
  fax: text('fax'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  
  // Subscription info at time of archive
  subscriptionStatus: text('subscription_status'),
  subscriptionTier: integer('subscription_tier'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  trialEndDate: timestamp('trial_end_date'),
  
  // Timestamps
  originalCreatedAt: timestamp('original_created_at'),
  originalUpdatedAt: timestamp('original_updated_at'),
  archivedAt: timestamp('archived_at').defaultNow()
});

// Archived users
export const archivedUsers = pgTable('archived_users', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  // Original user data (PHI removed/hashed where appropriate)
  originalId: integer('original_id').notNull(),
  username: text('username').notNull(), // Keep for reference
  emailHash: text('email_hash').notNull(), // Hash email for privacy
  healthSystemId: integer('health_system_id'),
  
  // De-identified personal info
  firstNameInitial: text('first_name_initial'), // Just store first letter
  lastNameInitial: text('last_name_initial'),
  role: text('role'),
  
  // Professional info (kept for compliance)
  npi: text('npi'),
  credentials: text('credentials'),
  specialties: text('specialties').array(),
  licenseState: text('license_state'),
  
  // Account status at archive time
  accountStatus: text('account_status'),
  lastLogin: timestamp('last_login'),
  emailVerified: boolean('email_verified'),
  mfaEnabled: boolean('mfa_enabled'),
  
  // Timestamps
  originalCreatedAt: timestamp('original_created_at'),
  archivedAt: timestamp('archived_at').defaultNow()
});

// Archived patients (with extra privacy measures)
export const archivedPatients = pgTable('archived_patients', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  // Original patient reference
  originalId: integer('original_id').notNull(),
  healthSystemId: integer('health_system_id').notNull(),
  
  // De-identified demographics
  mrn: text('mrn'), // Medical record number - kept for potential matching
  yearOfBirth: integer('year_of_birth'), // Store year only, not full DOB
  gender: text('gender'),
  stateOfResidence: text('state_of_residence'), // State only, not full address
  
  // Clinical metadata (no PHI)
  hasAllergies: boolean('has_allergies'),
  hasMedications: boolean('has_medications'),
  hasProblems: boolean('has_problems'),
  encounterCount: integer('encounter_count'),
  lastEncounterDate: date('last_encounter_date'),
  
  // Timestamps
  originalCreatedAt: timestamp('original_created_at'),
  archivedAt: timestamp('archived_at').defaultNow()
});

// Archived encounters (summary only)
export const archivedEncounters = pgTable('archived_encounters', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  originalId: integer('original_id').notNull(),
  patientId: integer('patient_id').notNull(),
  providerId: integer('provider_id'),
  
  // Basic encounter info
  encounterType: text('encounter_type'),
  chiefComplaint: text('chief_complaint'), // May contain PHI - handle carefully
  encounterDate: date('encounter_date'),
  
  // Status info
  status: text('status'),
  isSigned: boolean('is_signed'),
  signedAt: timestamp('signed_at'),
  
  // Metadata
  hasVitals: boolean('has_vitals'),
  hasSOAPNote: boolean('has_soap_note'),
  hasOrders: boolean('has_orders'),
  attachmentCount: integer('attachment_count'),
  
  archivedAt: timestamp('archived_at').defaultNow()
});

// Archived attachments metadata (not the actual files)
export const archivedAttachmentMetadata = pgTable('archived_attachment_metadata', {
  id: serial('id').primaryKey(),
  archiveId: uuid('archive_id').notNull(),
  
  originalId: integer('original_id').notNull(),
  patientId: integer('patient_id').notNull(),
  
  // File metadata only
  fileName: text('file_name'),
  fileType: text('file_type'),
  fileSizeBytes: integer('file_size_bytes'),
  uploadedAt: timestamp('uploaded_at'),
  
  // Processing status
  wasProcessed: boolean('was_processed'),
  documentType: text('document_type'),
  hasExtractedContent: boolean('has_extracted_content'),
  
  // Storage info for potential recovery
  originalStoragePath: text('original_storage_path'),
  isRecoverable: boolean('is_recoverable').default(false),
  
  archivedAt: timestamp('archived_at').defaultNow()
});

// Create schemas for validation
export const insertDataArchiveSchema = createInsertSchema(dataArchives);
export const insertArchiveAccessLogSchema = createInsertSchema(archiveAccessLogs);

// Export types
export type DataArchive = typeof dataArchives.$inferSelect;
export type InsertDataArchive = z.infer<typeof insertDataArchiveSchema>;
export type ArchiveAccessLog = typeof archiveAccessLogs.$inferSelect;
export type InsertArchiveAccessLog = z.infer<typeof insertArchiveAccessLogSchema>;

// Helper type for archive restoration
export interface ArchiveRestoreRequest {
  archiveId: string;
  reason: string;
  restoreUsers?: boolean;
  restorePatients?: boolean;
  restoreEncounters?: boolean;
  restoreAttachments?: boolean;
  targetHealthSystemId?: number; // If restoring to different health system
}

// Helper type for archive search
export interface ArchiveSearchCriteria {
  healthSystemName?: string;
  archivedAfter?: Date;
  archivedBefore?: Date;
  archiveReason?: string;
  hasBeenRestored?: boolean;
  includeStatistics?: boolean;
}