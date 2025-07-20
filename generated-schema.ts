// Auto-generated schema from database
// Generated on: 2025-07-20T00:42:45.390Z
// Tables: 81
// Total columns: 1609

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  varchar,
  jsonb,
  bigint,
  primaryKey,
  foreignKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const adminPromptReviews = pgTable("admin_prompt_reviews", {
  id: serial("id").notNull(),
  templateId: integer("template_id").notNull(),
  originalPrompt: text("original_prompt").notNull(),
  reviewedPrompt: text("reviewed_prompt"),
  adminUserId: integer("admin_user_id"),
  reviewStatus: text("review_status").default("'pending'::text"),
  reviewNotes: text("review_notes"),
  isActive: boolean("is_active").default(false),
  performanceMetrics: jsonb("performance_metrics"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', withTimezone: true }),
});

export const insertAdminPromptReviewsSchema = createInsertSchema(adminPromptReviews);
export type InsertAdminPromptReviews = z.infer<typeof insertAdminPromptReviewsSchema>;
export type SelectAdminPromptReviews = typeof adminPromptReviews.$inferSelect;

export const allergies = pgTable("allergies", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  allergen: text("allergen").notNull(),
  reaction: text("reaction"),
  severity: text("severity"),
  allergyType: text("allergy_type"),
  onsetDate: date("onset_date", { mode: 'date' }),
  lastReactionDate: date("last_reaction_date", { mode: 'date' }),
  status: text("status").default("'active'::text"),
  verificationStatus: text("verification_status").default("'unconfirmed'::text"),
  drugClass: text("drug_class"),
  crossReactivity: text("cross_reactivity").array(),
  encounterId: integer("encounter_id"),
  notes: text("notes"),
  reactionType: text("reaction_type"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'date', withTimezone: true }),
  sourceTimestamp: timestamp("source_timestamp", { mode: 'date', withTimezone: true }),
  lastReaction: date("last_reaction", { mode: 'date' }),
  mergedIds: integer("merged_ids").array(),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  enteredBy: integer("entered_by"),
  consolidationReasoning: text("consolidation_reasoning"),
  extractionNotes: text("extraction_notes"),
  temporalConflictResolution: text("temporal_conflict_resolution"),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAllergiesSchema = createInsertSchema(allergies);
export type InsertAllergies = z.infer<typeof insertAllergiesSchema>;
export type SelectAllergies = typeof allergies.$inferSelect;

export const appointmentDurationHistory = pgTable("appointment_duration_history", {
  id: serial("id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  aiPredictedDuration: integer("ai_predicted_duration").notNull(),
  providerScheduledDuration: integer("provider_scheduled_duration").notNull(),
  patientVisibleDuration: integer("patient_visible_duration").notNull(),
  actualDuration: integer("actual_duration"),
  actualArrivalDelta: integer("actual_arrival_delta"),
  factorsUsed: jsonb("factors_used"),
  predictionAccuracy: decimal("prediction_accuracy", { precision: 5, scale: 2 }),
  providerFeedback: text("provider_feedback"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAppointmentDurationHistorySchema = createInsertSchema(appointmentDurationHistory);
export type InsertAppointmentDurationHistory = z.infer<typeof insertAppointmentDurationHistorySchema>;
export type SelectAppointmentDurationHistory = typeof appointmentDurationHistory.$inferSelect;

export const appointmentResourceRequirements = pgTable("appointment_resource_requirements", {
  id: serial("id").notNull(),
  appointmentTypeId: integer("appointment_type_id"),
  requiresRoom: boolean("requires_room").default(true),
  roomType: text("room_type"),
  requiresEquipment: text("requires_equipment").array(),
  requiresStaff: jsonb("requires_staff"),
  prepTime: integer("prep_time").default(0),
  cleanupTime: integer("cleanup_time").default(0),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAppointmentResourceRequirementsSchema = createInsertSchema(appointmentResourceRequirements);
export type InsertAppointmentResourceRequirements = z.infer<typeof insertAppointmentResourceRequirementsSchema>;
export type SelectAppointmentResourceRequirements = typeof appointmentResourceRequirements.$inferSelect;

export const appointmentTypes = pgTable("appointment_types", {
  id: serial("id").notNull(),
  healthSystemId: integer("health_system_id"),
  locationId: integer("location_id"),
  typeName: text("type_name").notNull(),
  typeCode: text("type_code").notNull(),
  category: text("category").notNull(),
  defaultDuration: integer("default_duration").notNull(),
  minDuration: integer("min_duration").notNull(),
  maxDuration: integer("max_duration").notNull(),
  allowOnlineScheduling: boolean("allow_online_scheduling").default(true),
  requiresPreAuth: boolean("requires_pre_auth").default(false),
  requiresSpecialPrep: boolean("requires_special_prep").default(false),
  prepInstructions: text("prep_instructions"),
  defaultResourceRequirements: jsonb("default_resource_requirements"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAppointmentTypesSchema = createInsertSchema(appointmentTypes);
export type InsertAppointmentTypes = z.infer<typeof insertAppointmentTypesSchema>;
export type SelectAppointmentTypes = typeof appointmentTypes.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  locationId: integer("location_id").notNull(),
  appointmentDate: date("appointment_date", { mode: 'date' }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration").notNull(),
  patientVisibleDuration: integer("patient_visible_duration"),
  providerScheduledDuration: integer("provider_scheduled_duration"),
  appointmentType: text("appointment_type").notNull(),
  appointmentTypeId: integer("appointment_type_id"),
  chiefComplaint: text("chief_complaint"),
  visitReason: text("visit_reason"),
  status: text("status").default("'scheduled'::text"),
  confirmationStatus: text("confirmation_status").default("'pending'::text"),
  checkedInAt: timestamp("checked_in_at", { mode: 'date', withTimezone: true }),
  checkedInBy: integer("checked_in_by"),
  roomAssignment: text("room_assignment"),
  urgencyLevel: text("urgency_level").default("'routine'::text"),
  schedulingNotes: text("scheduling_notes"),
  patientPreferences: jsonb("patient_preferences"),
  aiSchedulingData: jsonb("ai_scheduling_data"),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderSent: timestamp("last_reminder_sent", { mode: 'date', withTimezone: true }),
  communicationPreferences: jsonb("communication_preferences"),
  externalAppointmentId: text("external_appointment_id"),
  syncedAt: timestamp("synced_at", { mode: 'date', withTimezone: true }),
  insuranceVerified: boolean("insurance_verified").default(false),
  verifiedBy: integer("verified_by"),
  copayAmount: decimal("copay_amount", { precision: 10, scale: 2 }),
  actualDuration: integer("actual_duration"),
  aiPredictedDuration: integer("ai_predicted_duration"),
  billingNotes: text("billing_notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at", { mode: 'date', withTimezone: true }),
  cancelledBy: integer("cancelled_by"),
  chartReviewed: boolean("chart_reviewed").default(false),
  completedAt: timestamp("completed_at", { mode: 'date', withTimezone: true }),
  completedBy: integer("completed_by"),
  confirmationSent: boolean("confirmation_sent").default(false),
  confirmationSentAt: timestamp("confirmation_sent_at", { mode: 'date', withTimezone: true }),
  copayCollected: boolean("copay_collected").default(false),
  durationMinutes: integer("duration_minutes"),
  formsCompleted: boolean("forms_completed").default(false),
  imagesReviewed: boolean("images_reviewed").default(false),
  insuranceVerificationNotes: text("insurance_verification_notes"),
  intakeCompletedAt: timestamp("intake_completed_at", { mode: 'date', withTimezone: true }),
  interpreterLanguage: text("interpreter_language"),
  interpreterNeeded: boolean("interpreter_needed").default(false),
  labsReviewed: boolean("labs_reviewed").default(false),
  lateCancellationReason: text("late_cancellation_reason"),
  medicationsReconciled: boolean("medications_reconciled").default(false),
  noShowReason: text("no_show_reason"),
  notes: text("notes"),
  parentAppointmentId: integer("parent_appointment_id"),
  patientConfirmed: boolean("patient_confirmed").default(false),
  patientConfirmedAt: timestamp("patient_confirmed_at", { mode: 'date', withTimezone: true }),
  postAppointmentNotes: text("post_appointment_notes"),
  preAppointmentNotes: text("pre_appointment_notes"),
  problemsReviewed: boolean("problems_reviewed").default(false),
  providerReadyAt: timestamp("provider_ready_at", { mode: 'date', withTimezone: true }),
  recurrenceExceptions: jsonb("recurrence_exceptions").default("'[]'::jsonb"),
  recurrenceRule: text("recurrence_rule"),
  referralReason: text("referral_reason"),
  referringProvider: text("referring_provider"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at", { mode: 'date', withTimezone: true }),
  rescheduledFrom: integer("rescheduled_from"),
  rescheduledReason: text("rescheduled_reason"),
  resourceRequirements: jsonb("resource_requirements").default("'{}'::jsonb"),
  roomNumber: text("room_number"),
  specialInstructions: text("special_instructions"),
  tags: jsonb("tags").default("'[]'::jsonb"),
  useAiScheduling: boolean("use_ai_scheduling").default(true),
  visitCompletedAt: timestamp("visit_completed_at", { mode: 'date', withTimezone: true }),
  vitalSignsTaken: boolean("vital_signs_taken").default(false),
  waitListPriority: integer("wait_list_priority"),
  wheelchairAccessible: boolean("wheelchair_accessible").default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertAppointmentsSchema = createInsertSchema(appointments);
export type InsertAppointments = z.infer<typeof insertAppointmentsSchema>;
export type SelectAppointments = typeof appointments.$inferSelect;

export const articleComments = pgTable("article_comments", {
  id: serial("id").notNull(),
  articleId: integer("article_id").notNull(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertArticleCommentsSchema = createInsertSchema(articleComments);
export type InsertArticleComments = z.infer<typeof insertArticleCommentsSchema>;
export type SelectArticleComments = typeof articleComments.$inferSelect;

export const articleGenerationQueue = pgTable("article_generation_queue", {
  id: serial("id").notNull(),
  topic: text("topic"),
  category: text("category").notNull(),
  targetAudience: text("target_audience").notNull(),
  keywords: text("keywords").array(),
  competitorMentions: text("competitor_mentions").array(),
  customPrompt: text("custom_prompt"),
  researchSources: jsonb("research_sources"),
  status: text("status").notNull().default("'pending'::text"),
  generatedArticleId: integer("generated_article_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  processedAt: timestamp("processed_at", { mode: 'date', withTimezone: true }),
});

export const insertArticleGenerationQueueSchema = createInsertSchema(articleGenerationQueue);
export type InsertArticleGenerationQueue = z.infer<typeof insertArticleGenerationQueueSchema>;
export type SelectArticleGenerationQueue = typeof articleGenerationQueue.$inferSelect;

export const articleRevisions = pgTable("article_revisions", {
  id: serial("id").notNull(),
  articleId: integer("article_id").notNull(),
  content: text("content").notNull(),
  revisionNote: text("revision_note"),
  revisionType: text("revision_type"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertArticleRevisionsSchema = createInsertSchema(articleRevisions);
export type InsertArticleRevisions = z.infer<typeof insertArticleRevisionsSchema>;
export type SelectArticleRevisions = typeof articleRevisions.$inferSelect;

export const articles = pgTable("articles", {
  id: serial("id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  category: text("category").notNull(),
  status: text("status").notNull().default("'draft'::text"),
  authorName: text("author_name").default("'Clarafi Team'::text"),
  featuredImage: text("featured_image"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  keywords: text("keywords").array(),
  targetAudience: text("target_audience"),
  readingTime: integer("reading_time"),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at", { mode: 'date', withTimezone: true }),
  scheduledFor: timestamp("scheduled_for", { mode: 'date', withTimezone: true }),
  generatedAt: timestamp("generated_at", { mode: 'date', withTimezone: true }).default("now()"),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertArticlesSchema = createInsertSchema(articles);
export type InsertArticles = z.infer<typeof insertArticlesSchema>;
export type SelectArticles = typeof articles.$inferSelect;

export const asymmetricSchedulingConfig = pgTable("asymmetric_scheduling_config", {
  id: serial("id").notNull(),
  providerId: integer("provider_id"),
  locationId: integer("location_id"),
  healthSystemId: integer("health_system_id"),
  enabled: boolean("enabled").default(true),
  patientMinDuration: integer("patient_min_duration").default(20),
  providerMinDuration: integer("provider_min_duration").default(10),
  roundingInterval: integer("rounding_interval").default(10),
  defaultBufferMinutes: integer("default_buffer_minutes").default(0),
  bufferForChronicPatients: integer("buffer_for_chronic_patients").default(10),
  bufferThresholdProblemCount: integer("buffer_threshold_problem_count").default(5),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertAsymmetricSchedulingConfigSchema = createInsertSchema(asymmetricSchedulingConfig);
export type InsertAsymmetricSchedulingConfig = z.infer<typeof insertAsymmetricSchedulingConfigSchema>;
export type SelectAsymmetricSchedulingConfig = typeof asymmetricSchedulingConfig.$inferSelect;

export const attachmentExtractedContent = pgTable("attachment_extracted_content", {
  id: serial("id").notNull(),
  attachmentId: integer("attachment_id").notNull(),
  pageNumber: integer("page_number"),
  contentType: text("content_type").notNull(),
  extractedText: text("extracted_text"),
  structuredData: jsonb("structured_data"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  extractionMethod: text("extraction_method"),
  aiGeneratedTitle: text("ai_generated_title"),
  documentType: text("document_type"),
  processingStatus: text("processing_status").default("'pending'::text"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAttachmentExtractedContentSchema = createInsertSchema(attachmentExtractedContent);
export type InsertAttachmentExtractedContent = z.infer<typeof insertAttachmentExtractedContentSchema>;
export type SelectAttachmentExtractedContent = typeof attachmentExtractedContent.$inferSelect;

export const attachments = pgTable("attachments", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadDate: timestamp("upload_date", { mode: 'date', withTimezone: true }).default("now()"),
  uploadedBy: integer("uploaded_by"),
  documentType: text("document_type"),
  documentDate: date("document_date", { mode: 'date' }),
  description: text("description"),
  thumbnailPath: text("thumbnail_path"),
  ocrText: text("ocr_text"),
  ocrCompleted: boolean("ocr_completed").default(false),
  ocrCompletedAt: timestamp("ocr_completed_at", { mode: 'date', withTimezone: true }),
  processingStatus: text("processing_status").default("'pending'::text"),
  processingNotes: text("processing_notes"),
  extractedData: jsonb("extracted_data"),
  chartSectionsUpdated: text("chart_sections_updated").array(),
  confidenceScores: jsonb("confidence_scores"),
  hashValue: text("hash_value"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { mode: 'date', withTimezone: true }),
  deletedBy: integer("deleted_by"),
  retentionDate: date("retention_date", { mode: 'date' }),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at", { mode: 'date', withTimezone: true }),
  tags: text("tags").array(),
  sourceSystem: text("source_system"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertAttachmentsSchema = createInsertSchema(attachments);
export type InsertAttachments = z.infer<typeof insertAttachmentsSchema>;
export type SelectAttachments = typeof attachments.$inferSelect;

export const authenticationLogs = pgTable("authentication_logs", {
  id: serial("id").notNull(),
  userId: integer("user_id"),
  username: text("username").notNull(),
  email: text("email"),
  healthSystemId: integer("health_system_id"),
  eventType: text("event_type").notNull(),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  browserInfo: text("browser_info"),
  deviceInfo: text("device_info"),
  geolocation: jsonb("geolocation"),
  sessionId: text("session_id"),
  sessionDuration: integer("session_duration"),
  logoutType: text("logout_type"),
  logoutReason: text("logout_reason"),
  mfaType: text("mfa_type"),
  mfaSuccess: boolean("mfa_success"),
  riskScore: integer("risk_score"),
  riskFactors: text("risk_factors").array(),
  eventTime: timestamp("event_time", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertAuthenticationLogsSchema = createInsertSchema(authenticationLogs);
export type InsertAuthenticationLogs = z.infer<typeof insertAuthenticationLogsSchema>;
export type SelectAuthenticationLogs = typeof authenticationLogs.$inferSelect;

export const clinicAdminVerifications = pgTable("clinic_admin_verifications", {
  id: serial("id").notNull(),
  email: text("email").notNull(),
  organizationName: text("organization_name").notNull(),
  verificationCode: text("verification_code").notNull(),
  verificationData: jsonb("verification_data").notNull(),
  status: text("status").default("'pending'::text"),
  healthSystemId: integer("health_system_id"),
  submittedAt: timestamp("submitted_at", { mode: 'date', withTimezone: true }).default("now()"),
  approvedAt: timestamp("approved_at", { mode: 'date', withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { mode: 'date', withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }).notNull(),
  approvedBy: integer("approved_by"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const insertClinicAdminVerificationsSchema = createInsertSchema(clinicAdminVerifications);
export type InsertClinicAdminVerifications = z.infer<typeof insertClinicAdminVerificationsSchema>;
export type SelectClinicAdminVerifications = typeof clinicAdminVerifications.$inferSelect;

export const dataModificationLogs = pgTable("data_modification_logs", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  patientId: integer("patient_id"),
  operation: text("operation").notNull(),
  fieldName: text("field_name"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changeReason: text("change_reason"),
  encounterId: integer("encounter_id"),
  orderAuthority: text("order_authority"),
  validated: boolean("validated").default(false),
  validatedBy: integer("validated_by"),
  validatedAt: timestamp("validated_at", { mode: 'date', withTimezone: true }),
  modifiedAt: timestamp("modified_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertDataModificationLogsSchema = createInsertSchema(dataModificationLogs);
export type InsertDataModificationLogs = z.infer<typeof insertDataModificationLogsSchema>;
export type SelectDataModificationLogs = typeof dataModificationLogs.$inferSelect;

export const diagnoses = pgTable("diagnoses", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id").notNull(),
  diagnosisCode: text("diagnosis_code"),
  diagnosisDescription: text("diagnosis_description"),
  diagnosisType: text("diagnosis_type"),
  status: text("status").notNull(),
  onsetDate: date("onset_date", { mode: 'date' }),
  resolutionDate: date("resolution_date", { mode: 'date' }),
  notes: text("notes"),
  severity: text("severity"),
  clinicianId: integer("clinician_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertDiagnosesSchema = createInsertSchema(diagnoses);
export type InsertDiagnoses = z.infer<typeof insertDiagnosesSchema>;
export type SelectDiagnoses = typeof diagnoses.$inferSelect;

export const documentProcessingQueue = pgTable("document_processing_queue", {
  id: serial("id").notNull(),
  attachmentId: integer("attachment_id").notNull(),
  status: text("status").default("'queued'::text"),
  attempts: integer("attempts").default(0),
  priority: integer("priority").default(100),
  processorType: text("processor_type").notNull().default("'document_analysis'::text"),
  processingMetadata: jsonb("processing_metadata"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  startedAt: timestamp("started_at", { mode: 'date', withTimezone: true }),
  completedAt: timestamp("completed_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertDocumentProcessingQueueSchema = createInsertSchema(documentProcessingQueue);
export type InsertDocumentProcessingQueue = z.infer<typeof insertDocumentProcessingQueueSchema>;
export type SelectDocumentProcessingQueue = typeof documentProcessingQueue.$inferSelect;

export const electronicSignatures = pgTable("electronic_signatures", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  encounterId: integer("encounter_id"),
  signatureType: text("signature_type").notNull(),
  signatureData: text("signature_data").notNull(),
  signatureMethod: text("signature_method").notNull(),
  twoFactorMethod: text("two_factor_method"),
  twoFactorVerified: boolean("two_factor_verified").default(false),
  twoFactorTimestamp: timestamp("two_factor_timestamp", { mode: 'date', withTimezone: true }),
  complianceChecks: jsonb("compliance_checks").default("'{}'::jsonb"),
  deaComplianceLevel: text("dea_compliance_level"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }),
  revokedAt: timestamp("revoked_at", { mode: 'date', withTimezone: true }),
  revocationReason: text("revocation_reason"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertElectronicSignaturesSchema = createInsertSchema(electronicSignatures);
export type InsertElectronicSignatures = z.infer<typeof insertElectronicSignaturesSchema>;
export type SelectElectronicSignatures = typeof electronicSignatures.$inferSelect;

export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").notNull(),
  userId: integer("user_id"),
  healthSystemId: integer("health_system_id"),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  sentAt: timestamp("sent_at", { mode: 'date', withTimezone: true }).default("now()"),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  subject: text("subject"),
  metadata: jsonb("metadata").default("'{}'::jsonb"),
});

export const insertEmailNotificationsSchema = createInsertSchema(emailNotifications);
export type InsertEmailNotifications = z.infer<typeof insertEmailNotificationsSchema>;
export type SelectEmailNotifications = typeof emailNotifications.$inferSelect;

export const emergencyAccessLogs = pgTable("emergency_access_logs", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  patientId: integer("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  emergencyType: text("emergency_type").notNull(),
  justification: text("justification").notNull(),
  authorizingPhysician: text("authorizing_physician"),
  accessStartTime: timestamp("access_start_time", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  accessEndTime: timestamp("access_end_time", { mode: 'date', withTimezone: true }),
  accessedResources: jsonb("accessed_resources").default("'[]'::jsonb"),
  reviewRequired: boolean("review_required").default(true),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', withTimezone: true }),
  reviewOutcome: text("review_outcome"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertEmergencyAccessLogsSchema = createInsertSchema(emergencyAccessLogs);
export type InsertEmergencyAccessLogs = z.infer<typeof insertEmergencyAccessLogsSchema>;
export type SelectEmergencyAccessLogs = typeof emergencyAccessLogs.$inferSelect;

export const encounters = pgTable("encounters", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  encounterType: text("encounter_type").notNull(),
  encounterSubtype: text("encounter_subtype"),
  startTime: timestamp("start_time", { mode: 'date', withTimezone: true }).default("now()"),
  endTime: timestamp("end_time", { mode: 'date', withTimezone: true }),
  encounterStatus: text("encounter_status").default("'scheduled'::text"),
  chiefComplaint: text("chief_complaint"),
  note: text("note"),
  nurseAssessment: text("nurse_assessment"),
  nurseInterventions: text("nurse_interventions"),
  nurseNotes: text("nurse_notes"),
  transcriptionRaw: text("transcription_raw"),
  transcriptionProcessed: text("transcription_processed"),
  aiSuggestions: jsonb("ai_suggestions").default("'{}'::jsonb"),
  draftOrders: jsonb("draft_orders").default("'[]'::jsonb"),
  draftDiagnoses: jsonb("draft_diagnoses").default("'[]'::jsonb"),
  cptCodes: jsonb("cpt_codes").default("'[]'::jsonb"),
  location: text("location"),
  appointmentId: integer("appointment_id"),
  signatureId: varchar("signature_id"),
  encounterDate: timestamp("encounter_date", { mode: 'date', withTimezone: true }),
  templateId: integer("template_id"),
  signedBy: integer("signed_by"),
  visitReason: text("visit_reason"),
  notes: text("notes"),
  locationId: integer("location_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
  lastChartUpdate: timestamp("last_chart_update", { mode: 'date', withTimezone: true }),
  chartUpdateDuration: integer("chart_update_duration"),
});

export const insertEncountersSchema = createInsertSchema(encounters);
export type InsertEncounters = z.infer<typeof insertEncountersSchema>;
export type SelectEncounters = typeof encounters.$inferSelect;

export const externalLabs = pgTable("external_labs", {
  id: serial("id").notNull(),
  labName: text("lab_name").notNull(),
  labIdentifier: text("lab_identifier").notNull(),
  integrationType: text("integration_type").notNull(),
  apiEndpoint: text("api_endpoint"),
  hl7Endpoint: text("hl7_endpoint"),
  apiKeyEncrypted: text("api_key_encrypted"),
  usernameEncrypted: text("username_encrypted"),
  sslCertificatePath: text("ssl_certificate_path"),
  supportedTests: jsonb("supported_tests"),
  turnaroundTimes: jsonb("turnaround_times"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertExternalLabsSchema = createInsertSchema(externalLabs);
export type InsertExternalLabs = z.infer<typeof insertExternalLabsSchema>;
export type SelectExternalLabs = typeof externalLabs.$inferSelect;

export const familyHistory = pgTable("family_history", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  relationship: text("relationship").notNull(),
  condition: text("condition"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  visitHistory: jsonb("visit_history"),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  notes: text("notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertFamilyHistorySchema = createInsertSchema(familyHistory);
export type InsertFamilyHistory = z.infer<typeof insertFamilyHistorySchema>;
export type SelectFamilyHistory = typeof familyHistory.$inferSelect;

export const gptLabReviewNotes = pgTable("gpt_lab_review_notes", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  resultIds: integer("result_ids").notNull().array(),
  clinicalReview: text("clinical_review").notNull(),
  patientMessage: text("patient_message").notNull(),
  nurseMessage: text("nurse_message").notNull(),
  patientContext: jsonb("patient_context"),
  gptModel: text("gpt_model").default("'gpt-4'::text"),
  promptVersion: text("prompt_version").default("'v1.0'::text"),
  revisedBy: integer("revised_by"),
  revisionReason: text("revision_reason"),
  processingTime: integer("processing_time"),
  tokensUsed: integer("tokens_used"),
  status: text("status").default("'draft'::text"),
  generatedBy: integer("generated_by").notNull(),
  reviewedBy: integer("reviewed_by"),
  generatedAt: timestamp("generated_at", { mode: 'date', withTimezone: true }).default("now()"),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', withTimezone: true }),
  patientMessageSent: boolean("patient_message_sent").default(false),
  nurseMessageSent: boolean("nurse_message_sent").default(false),
  patientMessageSentAt: timestamp("patient_message_sent_at", { mode: 'date', withTimezone: true }),
  nurseMessageSentAt: timestamp("nurse_message_sent_at", { mode: 'date', withTimezone: true }),
  revisionHistory: jsonb("revision_history").default("'[]'::jsonb"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertGptLabReviewNotesSchema = createInsertSchema(gptLabReviewNotes);
export type InsertGptLabReviewNotes = z.infer<typeof insertGptLabReviewNotesSchema>;
export type SelectGptLabReviewNotes = typeof gptLabReviewNotes.$inferSelect;

export const healthSystems = pgTable("health_systems", {
  id: serial("id").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  systemType: text("system_type").notNull(),
  subscriptionTier: integer("subscription_tier").default(1),
  subscriptionStatus: text("subscription_status").default("'active'::text"),
  subscriptionStartDate: timestamp("subscription_start_date", { mode: 'date', withTimezone: true }),
  subscriptionEndDate: timestamp("subscription_end_date", { mode: 'date', withTimezone: true }),
  mergedIntoHealthSystemId: integer("merged_into_health_system_id"),
  mergedDate: timestamp("merged_date", { mode: 'date', withTimezone: true }),
  originalProviderId: integer("original_provider_id"),
  primaryContact: text("primary_contact"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  npi: text("npi"),
  taxId: text("tax_id"),
  logoUrl: text("logo_url"),
  brandColors: jsonb("brand_colors"),
  subscriptionLimits: jsonb("subscription_limits").default("'{"staffKeys": 0, "totalUsers": 0, "providerKeys": 0}'::jsonb"),
  activeUserCount: jsonb("active_user_count").default("'{"providers": 0, "adminStaff": 0, "lastUpdated": "2025-07-19T23:08:20.835Z", "clinicalStaff": 0}'::jsonb"),
  billingDetails: jsonb("billing_details").default("'{"monthlyTotal": 0, "providerRate": 399, "adminStaffRate": 49, "clinicalStaffRate": 99}'::jsonb"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertHealthSystemsSchema = createInsertSchema(healthSystems);
export type InsertHealthSystems = z.infer<typeof insertHealthSystemsSchema>;
export type SelectHealthSystems = typeof healthSystems.$inferSelect;

export const imagingOrders = pgTable("imaging_orders", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id").notNull(),
  providerId: integer("provider_id").notNull(),
  imagingType: text("imaging_type").notNull(),
  bodyPart: text("body_part").notNull(),
  laterality: text("laterality"),
  indication: text("indication").notNull(),
  clinicalHistory: text("clinical_history"),
  priority: text("priority").default("'routine'::text"),
  status: text("status").default("'pending'::text"),
  facilityId: integer("facility_id"),
  scheduledDate: timestamp("scheduled_date", { mode: 'date', withTimezone: true }),
  completedDate: timestamp("completed_date", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertImagingOrdersSchema = createInsertSchema(imagingOrders);
export type InsertImagingOrders = z.infer<typeof insertImagingOrdersSchema>;
export type SelectImagingOrders = typeof imagingOrders.$inferSelect;

export const imagingResults = pgTable("imaging_results", {
  id: serial("id").notNull(),
  imagingOrderId: integer("imaging_order_id"),
  patientId: integer("patient_id").notNull(),
  studyDate: timestamp("study_date", { mode: 'date', withTimezone: true }).notNull(),
  studyType: text("study_type").notNull(),
  modality: text("modality").notNull(),
  bodyPart: text("body_part"),
  laterality: text("laterality"),
  findings: text("findings"),
  impression: text("impression"),
  readingRadiologist: text("reading_radiologist"),
  performingFacility: text("performing_facility"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  pacsStudyUid: text("pacs_study_uid"),
  reportStatus: text("report_status").default("'preliminary'::text"),
  sourceType: text("source_type").default("'pdf_extract'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(0.95),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  encounterId: integer("encounter_id"),
  recommendations: text("recommendations"),
  technique: text("technique"),
  procedureCode: text("procedure_code"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertImagingResultsSchema = createInsertSchema(imagingResults);
export type InsertImagingResults = z.infer<typeof insertImagingResultsSchema>;
export type SelectImagingResults = typeof imagingResults.$inferSelect;

export const labOrders = pgTable("lab_orders", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id").notNull(),
  orderSetId: text("order_set_id"),
  loincCode: text("loinc_code").notNull(),
  cptCode: text("cpt_code"),
  testCode: text("test_code").notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"),
  priority: text("priority").default("'routine'::text"),
  clinicalIndication: text("clinical_indication"),
  icd10Codes: text("icd10_codes").array(),
  orderedBy: integer("ordered_by").notNull(),
  orderedAt: timestamp("ordered_at", { mode: 'date', withTimezone: true }).default("now()"),
  targetLabId: integer("target_lab_id"),
  externalOrderId: text("external_order_id"),
  hl7MessageId: text("hl7_message_id"),
  requisitionNumber: text("requisition_number"),
  orderStatus: text("order_status").default("'draft'::text"),
  transmittedAt: timestamp("transmitted_at", { mode: 'date', withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', withTimezone: true }),
  collectedAt: timestamp("collected_at", { mode: 'date', withTimezone: true }),
  specimenType: text("specimen_type"),
  specimenVolume: text("specimen_volume"),
  containerType: text("container_type"),
  collectionInstructions: text("collection_instructions"),
  fastingRequired: boolean("fasting_required").default(false),
  fastingHours: integer("fasting_hours"),
  timingInstructions: text("timing_instructions"),
  insurancePreauth: text("insurance_preauth"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  insuranceCoverage: text("insurance_coverage"),
  aiSuggestedTests: jsonb("ai_suggested_tests"),
  riskFlags: jsonb("risk_flags"),
  qualityMeasure: text("quality_measure"),
  preventiveCareFlag: boolean("preventive_care_flag").default(false),
  orderId: text("order_id"),
  results: jsonb("results"),
  externalLab: text("external_lab"),
  providerNotes: text("provider_notes"),
  resultStatus: text("result_status"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertLabOrdersSchema = createInsertSchema(labOrders);
export type InsertLabOrders = z.infer<typeof insertLabOrdersSchema>;
export type SelectLabOrders = typeof labOrders.$inferSelect;

export const labReferenceRanges = pgTable("lab_reference_ranges", {
  id: serial("id").notNull(),
  loincCode: text("loinc_code").notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"),
  gender: text("gender"),
  ageMin: integer("age_min").default(0),
  ageMax: integer("age_max").default(120),
  normalLow: decimal("normal_low", { precision: 15, scale: 6 }),
  normalHigh: decimal("normal_high", { precision: 15, scale: 6 }),
  units: text("units").notNull(),
  criticalLow: decimal("critical_low", { precision: 15, scale: 6 }),
  criticalHigh: decimal("critical_high", { precision: 15, scale: 6 }),
  displayRange: text("display_range"),
  labSource: text("lab_source"),
  lastVerified: timestamp("last_verified", { mode: 'date', withTimezone: true }).default("now()"),
  active: boolean("active").default(true),
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertLabReferenceRangesSchema = createInsertSchema(labReferenceRanges);
export type InsertLabReferenceRanges = z.infer<typeof insertLabReferenceRangesSchema>;
export type SelectLabReferenceRanges = typeof labReferenceRanges.$inferSelect;

export const labResults = pgTable("lab_results", {
  id: serial("id").notNull(),
  labOrderId: integer("lab_order_id"),
  patientId: integer("patient_id").notNull(),
  loincCode: text("loinc_code").notNull(),
  testCode: text("test_code").notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"),
  resultValue: text("result_value"),
  resultNumeric: decimal("result_numeric", { precision: 15, scale: 6 }),
  resultUnits: text("result_units"),
  referenceRange: text("reference_range"),
  ageGenderAdjustedRange: text("age_gender_adjusted_range"),
  abnormalFlag: text("abnormal_flag"),
  criticalFlag: boolean("critical_flag").default(false),
  deltaFlag: text("delta_flag"),
  specimenCollectedAt: timestamp("specimen_collected_at", { mode: 'date', withTimezone: true }),
  specimenReceivedAt: timestamp("specimen_received_at", { mode: 'date', withTimezone: true }),
  resultAvailableAt: timestamp("result_available_at", { mode: 'date', withTimezone: true }),
  resultFinalizedAt: timestamp("result_finalized_at", { mode: 'date', withTimezone: true }),
  receivedAt: timestamp("received_at", { mode: 'date', withTimezone: true }).default("now()"),
  externalLabId: integer("external_lab_id"),
  externalResultId: text("external_result_id"),
  hl7MessageId: text("hl7_message_id"),
  instrumentId: text("instrument_id"),
  resultStatus: text("result_status").default("'pending'::text"),
  verificationStatus: text("verification_status").default("'unverified'::text"),
  resultComments: text("result_comments"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', withTimezone: true }),
  providerNotes: text("provider_notes"),
  needsReview: boolean("needs_review").default(true),
  reviewStatus: text("review_status").default("'pending'::text"),
  reviewNote: text("review_note"),
  reviewTemplate: text("review_template"),
  reviewHistory: jsonb("review_history").default("'[]'::jsonb"),
  communicationStatus: text("communication_status").default("'none'::text"),
  communicationPlan: jsonb("communication_plan"),
  portalReleaseStatus: text("portal_release_status").default("'hold'::text"),
  portalReleaseBy: integer("portal_release_by"),
  portalReleaseAt: timestamp("portal_release_at", { mode: 'date', withTimezone: true }),
  blockPortalRelease: boolean("block_portal_release").default(false),
  aiInterpretation: jsonb("ai_interpretation"),
  previousValue: decimal("previous_value", { precision: 15, scale: 6 }),
  previousDate: timestamp("previous_date", { mode: 'date', withTimezone: true }),
  trendDirection: text("trend_direction"),
  percentChange: decimal("percent_change", { precision: 5, scale: 2 }),
  qcFlags: jsonb("qc_flags"),
  sourceSystem: text("source_system"),
  interfaceVersion: text("interface_version"),
  sourceType: text("source_type").default("'lab_order'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 5, scale: 2 }).default(1.00),
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  enteredBy: integer("entered_by"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertLabResultsSchema = createInsertSchema(labResults);
export type InsertLabResults = z.infer<typeof insertLabResultsSchema>;
export type SelectLabResults = typeof labResults.$inferSelect;

export const locations = pgTable("locations", {
  id: serial("id").notNull(),
  organizationId: integer("organization_id"),
  healthSystemId: integer("health_system_id"),
  name: text("name").notNull(),
  shortName: text("short_name"),
  locationType: text("location_type").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  zip: text("zip"),
  phone: text("phone"),
  fax: text("fax"),
  facilityCode: text("facility_code"),
  npi: text("npi"),
  operatingHours: jsonb("operating_hours"),
  services: text("services").array(),
  hasLab: boolean("has_lab").default(false),
  hasImaging: boolean("has_imaging").default(false),
  hasPharmacy: boolean("has_pharmacy").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertLocationsSchema = createInsertSchema(locations);
export type InsertLocations = z.infer<typeof insertLocationsSchema>;
export type SelectLocations = typeof locations.$inferSelect;

export const magicLinks = pgTable("magic_links", {
  id: serial("id").notNull(),
  userId: integer("user_id"),
  email: text("email").notNull(),
  token: text("token").notNull(),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { mode: 'date', withTimezone: true }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertMagicLinksSchema = createInsertSchema(magicLinks);
export type InsertMagicLinks = z.infer<typeof insertMagicLinksSchema>;
export type SelectMagicLinks = typeof magicLinks.$inferSelect;

export const medicalHistory = pgTable("medical_history", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  conditionCategory: text("condition_category").notNull(),
  historyText: text("history_text").notNull(),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  enteredBy: integer("entered_by"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertMedicalHistorySchema = createInsertSchema(medicalHistory);
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;
export type SelectMedicalHistory = typeof medicalHistory.$inferSelect;

export const medicalProblems = pgTable("medical_problems", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  problemTitle: text("problem_title").notNull(),
  currentIcd10Code: text("current_icd10_code"),
  problemStatus: text("problem_status").default("'active'::text"),
  firstEncounterId: integer("first_encounter_id"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  changeLog: jsonb("change_log").default("'[]'::jsonb"),
  lastRankedEncounterId: integer("last_ranked_encounter_id"),
  rankingReason: text("ranking_reason"),
  rankingFactors: jsonb("ranking_factors"),
  encounterId: integer("encounter_id"),
  icd10Code: text("icd10_code"),
  snomedCode: text("snomed_code"),
  onsetDate: date("onset_date", { mode: 'date' }),
  resolutionDate: date("resolution_date", { mode: 'date' }),
  notes: text("notes"),
  severity: text("severity"),
  sourceType: text("source_type"),
  sourceConfidence: decimal("source_confidence", { precision: 5, scale: 2 }),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  extractionNotes: text("extraction_notes"),
  providerId: integer("provider_id"),
  dateDiagnosed: date("date_diagnosed", { mode: 'date' }),
  lastUpdated: timestamp("last_updated", { mode: 'date', withTimezone: true }),
  verificationStatus: text("verification_status"),
  verificationDate: timestamp("verification_date", { mode: 'date', withTimezone: true }),
  verifiedBy: integer("verified_by"),
  clinicalStatus: text("clinical_status"),
  bodySite: text("body_site"),
  bodySiteLaterality: text("body_site_laterality"),
  category: text("category"),
  lastReviewedDate: timestamp("last_reviewed_date", { mode: 'date', withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  patientEducationProvided: boolean("patient_education_provided").default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertMedicalProblemsSchema = createInsertSchema(medicalProblems);
export type InsertMedicalProblems = z.infer<typeof insertMedicalProblemsSchema>;
export type SelectMedicalProblems = typeof medicalProblems.$inferSelect;

export const medicationFormulary = pgTable("medication_formulary", {
  id: serial("id").notNull(),
  genericName: text("generic_name").notNull(),
  brandNames: text("brand_names").array(),
  commonNames: text("common_names").array(),
  standardStrengths: text("standard_strengths").notNull().array(),
  availableForms: text("available_forms").notNull().array(),
  formRoutes: jsonb("form_routes").notNull(),
  sigTemplates: jsonb("sig_templates").notNull(),
  commonDoses: text("common_doses").array(),
  maxDailyDose: text("max_daily_dose"),
  therapeuticClass: text("therapeutic_class").notNull(),
  indication: text("indication").notNull(),
  blackBoxWarning: text("black_box_warning"),
  ageRestrictions: text("age_restrictions"),
  prescriptionType: text("prescription_type").notNull(),
  isControlled: boolean("is_controlled").default(false),
  controlledSchedule: text("controlled_schedule"),
  requiresPriorAuth: boolean("requires_prior_auth").default(false),
  renalAdjustment: boolean("renal_adjustment").default(false),
  hepaticAdjustment: boolean("hepatic_adjustment").default(false),
  prescriptionVolume: integer("prescription_volume").default(0),
  popularityRank: integer("popularity_rank"),
  dataSource: text("data_source").notNull(),
  lastVerified: timestamp("last_verified", { mode: 'date', withTimezone: true }).default("now()"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertMedicationFormularySchema = createInsertSchema(medicationFormulary);
export type InsertMedicationFormulary = z.infer<typeof insertMedicationFormularySchema>;
export type SelectMedicationFormulary = typeof medicationFormulary.$inferSelect;

export const medications = pgTable("medications", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  medicationName: text("medication_name").notNull(),
  brandName: text("brand_name"),
  genericName: text("generic_name"),
  dosage: text("dosage").notNull(),
  strength: text("strength"),
  dosageForm: text("dosage_form"),
  route: text("route"),
  frequency: text("frequency").notNull(),
  quantity: integer("quantity"),
  quantityUnit: text("quantity_unit"),
  daysSupply: integer("days_supply"),
  refillsRemaining: integer("refills_remaining"),
  totalRefills: integer("total_refills"),
  sig: text("sig"),
  rxnormCode: text("rxnorm_code"),
  ndcCode: text("ndc_code"),
  surescriptsId: text("surescripts_id"),
  clinicalIndication: text("clinical_indication"),
  sourceOrderId: integer("source_order_id"),
  problemMappings: jsonb("problem_mappings").default("'[]'::jsonb"),
  startDate: date("start_date", { mode: 'date' }).notNull(),
  endDate: date("end_date", { mode: 'date' }),
  discontinuedDate: date("discontinued_date", { mode: 'date' }),
  status: text("status").default("'active'::text"),
  prescriber: text("prescriber"),
  prescriberId: integer("prescriber_id"),
  firstEncounterId: integer("first_encounter_id"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  reasonForChange: text("reason_for_change"),
  medicationHistory: jsonb("medication_history").default("'[]'::jsonb"),
  changeLog: jsonb("change_log").default("'[]'::jsonb"),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  sourceType: text("source_type"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }),
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  enteredBy: integer("entered_by"),
  groupingStrategy: text("grouping_strategy").default("'medical_problem'::text"),
  relatedMedications: jsonb("related_medications").default("'[]'::jsonb"),
  drugInteractions: jsonb("drug_interactions").default("'[]'::jsonb"),
  pharmacyOrderId: text("pharmacy_order_id"),
  insuranceAuthStatus: text("insurance_auth_status"),
  priorAuthRequired: boolean("prior_auth_required").default(false),
  deaSchedule: text("dea_schedule"),
  pharmacyNcpdpId: text("pharmacy_ncpdp_id"),
  transmissionStatus: text("transmission_status"),
  transmissionTimestamp: timestamp("transmission_timestamp", { mode: 'date', withTimezone: true }),
  transmissionMessageId: text("transmission_message_id"),
  transmissionErrors: jsonb("transmission_errors").default("'[]'::jsonb"),
  electronicSignatureId: integer("electronic_signature_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertMedicationsSchema = createInsertSchema(medications);
export type InsertMedications = z.infer<typeof insertMedicationsSchema>;
export type SelectMedications = typeof medications.$inferSelect;

export const migrationInvitations = pgTable("migration_invitations", {
  id: serial("id").notNull(),
  invitedUserId: integer("invited_user_id"),
  invitedUserEmail: text("invited_user_email").notNull(),
  targetHealthSystemId: integer("target_health_system_id").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  invitationCode: text("invitation_code").notNull(),
  message: text("message"),
  status: text("status").notNull().default("'pending'::text"),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: 'date', withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertMigrationInvitationsSchema = createInsertSchema(migrationInvitations);
export type InsertMigrationInvitations = z.infer<typeof insertMigrationInvitationsSchema>;
export type SelectMigrationInvitations = typeof migrationInvitations.$inferSelect;

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  subscribedAt: timestamp("subscribed_at", { mode: 'date', withTimezone: true }).default("now()"),
  unsubscribedAt: timestamp("unsubscribed_at", { mode: 'date', withTimezone: true }),
  preferences: jsonb("preferences"),
  source: text("source"),
});

export const insertNewsletterSubscribersSchema = createInsertSchema(newsletterSubscribers);
export type InsertNewsletterSubscribers = z.infer<typeof insertNewsletterSubscribersSchema>;
export type SelectNewsletterSubscribers = typeof newsletterSubscribers.$inferSelect;

export const orders = pgTable("orders", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  providerId: integer("provider_id").notNull(),
  orderType: text("order_type").notNull(),
  orderStatus: text("order_status").default("'draft'::text"),
  referenceId: integer("reference_id"),
  providerNotes: text("provider_notes"),
  priority: text("priority").default("'routine'::text"),
  clinicalIndication: text("clinical_indication"),
  medicationName: text("medication_name"),
  dosage: text("dosage"),
  quantity: integer("quantity"),
  quantityUnit: text("quantity_unit"),
  sig: text("sig"),
  refills: integer("refills"),
  form: text("form"),
  routeOfAdministration: text("route_of_administration"),
  daysSupply: integer("days_supply"),
  diagnosisCode: text("diagnosis_code"),
  requiresPriorAuth: boolean("requires_prior_auth").default(false),
  priorAuthNumber: text("prior_auth_number"),
  labName: text("lab_name"),
  testName: text("test_name"),
  testCode: text("test_code"),
  specimenType: text("specimen_type"),
  fastingRequired: boolean("fasting_required").default(false),
  studyType: text("study_type"),
  region: text("region"),
  laterality: text("laterality"),
  contrastNeeded: boolean("contrast_needed").default(false),
  specialtyType: text("specialty_type"),
  providerName: text("provider_name"),
  urgency: text("urgency"),
  orderedBy: integer("ordered_by"),
  orderedAt: timestamp("ordered_at", { mode: 'date', withTimezone: true }).default("now()"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'date', withTimezone: true }),
  prescriber: text("prescriber"),
  prescriberId: integer("prescriber_id"),
  orderDate: timestamp("order_date", { mode: 'date', withTimezone: true }).default("now()"),
  status: text("status").default("'pending'::text"),
  medicationDosage: text("medication_dosage"),
  medicationRoute: text("medication_route"),
  medicationFrequency: text("medication_frequency"),
  medicationDuration: text("medication_duration"),
  medicationQuantity: integer("medication_quantity"),
  medicationRefills: integer("medication_refills"),
  labTestName: text("lab_test_name"),
  labTestCode: text("lab_test_code"),
  imagingStudyType: text("imaging_study_type"),
  imagingBodyPart: text("imaging_body_part"),
  referralSpecialty: text("referral_specialty"),
  referralReason: text("referral_reason"),
  instructions: text("instructions"),
  diagnosisCodes: text("diagnosis_codes").array(),
  ndcCode: text("ndc_code"),
  route: text("route"),
  frequency: text("frequency"),
  startDate: timestamp("start_date", { mode: 'date', withTimezone: true }),
  endDate: timestamp("end_date", { mode: 'date', withTimezone: true }),
  indication: text("indication"),
  imagingOrderId: integer("imaging_order_id"),
  externalOrderId: text("external_order_id"),
  bodyPart: text("body_part"),
  duration: text("duration"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertOrdersSchema = createInsertSchema(orders);
export type InsertOrders = z.infer<typeof insertOrdersSchema>;
export type SelectOrders = typeof orders.$inferSelect;

export const organizationDocuments = pgTable("organization_documents", {
  id: serial("id").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  documentName: text("document_name"),
  uploadedAt: timestamp("uploaded_at", { mode: 'date', withTimezone: true }).default("now()"),
  uploadedBy: integer("uploaded_by"),
  verifiedAt: timestamp("verified_at", { mode: 'date', withTimezone: true }),
  verifiedBy: integer("verified_by"),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }),
  metadata: jsonb("metadata"),
});

export const insertOrganizationDocumentsSchema = createInsertSchema(organizationDocuments);
export type InsertOrganizationDocuments = z.infer<typeof insertOrganizationDocumentsSchema>;
export type SelectOrganizationDocuments = typeof organizationDocuments.$inferSelect;

export const organizations = pgTable("organizations", {
  id: serial("id").notNull(),
  healthSystemId: integer("health_system_id"),
  name: text("name").notNull(),
  shortName: text("short_name"),
  organizationType: text("organization_type").notNull(),
  region: text("region"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  npi: text("npi"),
  taxId: text("tax_id"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertOrganizationsSchema = createInsertSchema(organizations);
export type InsertOrganizations = z.infer<typeof insertOrganizationsSchema>;
export type SelectOrganizations = typeof organizations.$inferSelect;

export const patientAttachments = pgTable("patient_attachments", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileExtension: text("file_extension").notNull(),
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  category: text("category").notNull().default("'general'::text"),
  title: text("title"),
  description: text("description"),
  tags: text("tags").array().default("'{}'::text[]"),
  uploadedBy: integer("uploaded_by").notNull(),
  isConfidential: boolean("is_confidential").default(false),
  accessLevel: text("access_level").default("'standard'::text"),
  contentHash: text("content_hash"),
  processingStatus: text("processing_status").default("'completed'::text"),
  virusScanStatus: text("virus_scan_status").default("'pending'::text"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPatientAttachmentsSchema = createInsertSchema(patientAttachments);
export type InsertPatientAttachments = z.infer<typeof insertPatientAttachmentsSchema>;
export type SelectPatientAttachments = typeof patientAttachments.$inferSelect;

export const patientOrderPreferences = pgTable("patient_order_preferences", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  orderType: text("order_type").notNull(),
  preferences: jsonb("preferences"),
  standingOrders: jsonb("standing_orders"),
  labDeliveryMethod: text("lab_delivery_method").default("'mock_service'::text"),
  labServiceProvider: text("lab_service_provider"),
  imagingDeliveryMethod: text("imaging_delivery_method").default("'print_pdf'::text"),
  imagingServiceProvider: text("imaging_service_provider"),
  medicationDeliveryMethod: text("medication_delivery_method").default("'preferred_pharmacy'::text"),
  preferredPharmacy: text("preferred_pharmacy"),
  pharmacyPhone: text("pharmacy_phone"),
  pharmacyFax: text("pharmacy_fax"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
  lastUpdatedBy: integer("last_updated_by"),
});

export const insertPatientOrderPreferencesSchema = createInsertSchema(patientOrderPreferences);
export type InsertPatientOrderPreferences = z.infer<typeof insertPatientOrderPreferencesSchema>;
export type SelectPatientOrderPreferences = typeof patientOrderPreferences.$inferSelect;

export const patientPhysicalFindings = pgTable("patient_physical_findings", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  examSystem: text("exam_system").notNull(),
  examComponent: text("exam_component"),
  findingText: text("finding_text").notNull(),
  findingType: text("finding_type").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  confirmedCount: integer("confirmed_count").default(0),
  contradictedCount: integer("contradicted_count").default(0),
  firstNotedEncounter: integer("first_noted_encounter").notNull(),
  lastConfirmedEncounter: integer("last_confirmed_encounter"),
  lastSeenEncounter: integer("last_seen_encounter"),
  status: text("status").default("'active'::text"),
  gptReasoning: text("gpt_reasoning"),
  clinicalContext: jsonb("clinical_context"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPatientPhysicalFindingsSchema = createInsertSchema(patientPhysicalFindings);
export type InsertPatientPhysicalFindings = z.infer<typeof insertPatientPhysicalFindingsSchema>;
export type SelectPatientPhysicalFindings = typeof patientPhysicalFindings.$inferSelect;

export const patientSchedulingPatterns = pgTable("patient_scheduling_patterns", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  avgVisitDuration: decimal("avg_visit_duration", { precision: 5, scale: 2 }),
  avgDurationByType: jsonb("avg_duration_by_type"),
  visitDurationStdDev: decimal("visit_duration_std_dev", { precision: 5, scale: 2 }),
  avgArrivalDelta: decimal("avg_arrival_delta", { precision: 5, scale: 2 }),
  arrivalConsistency: decimal("arrival_consistency", { precision: 5, scale: 2 }),
  noShowRate: decimal("no_show_rate", { precision: 5, scale: 2 }),
  noShowByDayOfWeek: jsonb("no_show_by_day_of_week"),
  noShowByTimeOfDay: jsonb("no_show_by_time_of_day"),
  lastNoShowDate: date("last_no_show_date", { mode: 'date' }),
  preferredReminderTime: integer("preferred_reminder_time"),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }),
  preferredContactMethod: text("preferred_contact_method"),
  avgQuestionCount: decimal("avg_question_count", { precision: 5, scale: 2 }),
  portalMessageFrequency: decimal("portal_message_frequency", { precision: 5, scale: 2 }),
  requiresInterpreter: boolean("requires_interpreter").default(false),
  mobilityIssues: boolean("mobility_issues").default(false),
  cognitiveConsiderations: boolean("cognitive_considerations").default(false),
  lastCalculated: timestamp("last_calculated", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPatientSchedulingPatternsSchema = createInsertSchema(patientSchedulingPatterns);
export type InsertPatientSchedulingPatterns = z.infer<typeof insertPatientSchedulingPatternsSchema>;
export type SelectPatientSchedulingPatterns = typeof patientSchedulingPatterns.$inferSelect;

export const patients = pgTable("patients", {
  id: serial("id").notNull(),
  mrn: varchar("mrn").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  dateOfBirth: date("date_of_birth", { mode: 'date' }).notNull(),
  gender: text("gender").notNull(),
  contactNumber: text("contact_number"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phone: text("phone"),
  phoneType: text("phone_type"),
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  preferredLanguage: text("preferred_language").default("'English'::text"),
  race: text("race"),
  ethnicity: text("ethnicity"),
  preferredLocationId: integer("preferred_location_id"),
  primaryProviderId: integer("primary_provider_id"),
  insurancePrimary: text("insurance_primary"),
  insuranceSecondary: text("insurance_secondary"),
  policyNumber: text("policy_number"),
  groupNumber: text("group_number"),
  insuranceProvider: text("insurance_provider"),
  insuranceVerified: boolean("insurance_verified").default(false),
  externalId: text("external_id"),
  consentGiven: boolean("consent_given").default(false),
  assistantId: text("assistant_id"),
  assistantThreadId: text("assistant_thread_id"),
  lastChartSummary: text("last_chart_summary"),
  chartLastUpdated: timestamp("chart_last_updated", { mode: 'date', withTimezone: true }),
  activeProblems: jsonb("active_problems").default("'[]'::jsonb"),
  criticalAlerts: jsonb("critical_alerts").default("'[]'::jsonb"),
  dataOriginType: text("data_origin_type").default("'emr_direct'::text"),
  originalFacilityId: integer("original_facility_id"),
  createdByProviderId: integer("created_by_provider_id"),
  creationContext: text("creation_context"),
  derivativeWorkNote: text("derivative_work_note"),
  migrationConsent: jsonb("migration_consent").default("'{"consentGiven": false}'::jsonb"),
  profilePhotoFilename: text("profile_photo_filename"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPatientsSchema = createInsertSchema(patients);
export type InsertPatients = z.infer<typeof insertPatientsSchema>;
export type SelectPatients = typeof patients.$inferSelect;

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").notNull(),
  ncpdpId: text("ncpdp_id"),
  npi: text("npi"),
  deaNumber: text("dea_number"),
  googlePlaceId: text("google_place_id"),
  name: text("name").notNull(),
  dbaName: text("dba_name"),
  corporateName: text("corporate_name"),
  address: text("address").notNull(),
  address2: text("address2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone"),
  fax: text("fax"),
  email: text("email"),
  website: text("website"),
  hours: jsonb("hours").default("'{}'::jsonb"),
  is_24Hour: boolean("is_24_hour").default(false),
  services: text("services").array().default("'{}'::text[]"),
  acceptsEprescribing: boolean("accepts_eprescribing").default(true),
  acceptsControlledSubstances: boolean("accepts_controlled_substances").default(false),
  preferredTransmissionMethod: text("preferred_transmission_method").default("'surescripts'::text"),
  surescriptsVersion: text("surescripts_version"),
  specialtyTypes: text("specialty_types").array().default("'{}'::text[]"),
  insuranceNetworks: jsonb("insurance_networks").default("'[]'::jsonb"),
  preferredForConditions: text("preferred_for_conditions").array().default("'{}'::text[]"),
  status: text("status").default("'active'::text"),
  verificationStatus: text("verification_status").default("'pending'::text"),
  lastVerified: timestamp("last_verified", { mode: 'date', withTimezone: true }),
  healthSystemId: integer("health_system_id"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPharmaciesSchema = createInsertSchema(pharmacies);
export type InsertPharmacies = z.infer<typeof insertPharmaciesSchema>;
export type SelectPharmacies = typeof pharmacies.$inferSelect;

export const phiAccessLogs = pgTable("phi_access_logs", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  locationId: integer("location_id"),
  patientId: integer("patient_id"),
  patientName: text("patient_name"),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  action: text("action").notNull(),
  accessMethod: text("access_method").notNull(),
  httpMethod: text("http_method"),
  apiEndpoint: text("api_endpoint"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  responseTime: integer("response_time"),
  accessReason: text("access_reason"),
  emergencyAccess: boolean("emergency_access").default(false),
  breakGlassReason: text("break_glass_reason"),
  accessedAt: timestamp("accessed_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertPhiAccessLogsSchema = createInsertSchema(phiAccessLogs);
export type InsertPhiAccessLogs = z.infer<typeof insertPhiAccessLogsSchema>;
export type SelectPhiAccessLogs = typeof phiAccessLogs.$inferSelect;

export const prescriptionTransmissions = pgTable("prescription_transmissions", {
  id: serial("id").notNull(),
  medicationId: integer("medication_id").notNull(),
  orderId: integer("order_id"),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  pharmacyId: integer("pharmacy_id"),
  electronicSignatureId: integer("electronic_signature_id"),
  transmissionType: text("transmission_type").notNull(),
  transmissionMethod: text("transmission_method").notNull(),
  messageId: text("message_id"),
  ncpdpTransactionId: text("ncpdp_transaction_id"),
  ncpdpVersion: text("ncpdp_version"),
  ncpdpMessageType: text("ncpdp_message_type"),
  status: text("status").notNull().default("'pending'::text"),
  statusHistory: jsonb("status_history").default("'[]'::jsonb"),
  pharmacyResponse: jsonb("pharmacy_response").default("'{}'::jsonb"),
  pharmacyNotes: text("pharmacy_notes"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  gptAnalysis: jsonb("gpt_analysis").default("'{}'::jsonb"),
  gptRecommendations: text("gpt_recommendations").array().default("'{}'::text[]"),
  queuedAt: timestamp("queued_at", { mode: 'date', withTimezone: true }),
  transmittedAt: timestamp("transmitted_at", { mode: 'date', withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', withTimezone: true }),
  completedAt: timestamp("completed_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertPrescriptionTransmissionsSchema = createInsertSchema(prescriptionTransmissions);
export type InsertPrescriptionTransmissions = z.infer<typeof insertPrescriptionTransmissionsSchema>;
export type SelectPrescriptionTransmissions = typeof prescriptionTransmissions.$inferSelect;

export const problemRankOverrides = pgTable("problem_rank_overrides", {
  id: serial("id").notNull(),
  problemId: integer("problem_id").notNull(),
  userId: integer("user_id").notNull(),
  preferenceWeight: text("preference_weight").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertProblemRankOverridesSchema = createInsertSchema(problemRankOverrides);
export type InsertProblemRankOverrides = z.infer<typeof insertProblemRankOverridesSchema>;
export type SelectProblemRankOverrides = typeof problemRankOverrides.$inferSelect;

export const providerSchedules = pgTable("provider_schedules", {
  id: serial("id").notNull(),
  providerId: integer("provider_id").notNull(),
  locationId: integer("location_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  scheduleType: text("schedule_type").notNull(),
  appointmentTypes: text("appointment_types").array(),
  slotDuration: integer("slot_duration").default(30),
  bufferTime: integer("buffer_time").default(0),
  maxConcurrentAppts: integer("max_concurrent_appts").default(1),
  advanceBookingDays: integer("advance_booking_days").default(365),
  cancelationPolicyHours: integer("cancelation_policy_hours").default(24),
  isAvailableForUrgent: boolean("is_available_for_urgent").default(true),
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  requiresReferral: boolean("requires_referral").default(false),
  effectiveFrom: date("effective_from", { mode: 'date' }),
  effectiveUntil: date("effective_until", { mode: 'date' }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertProviderSchedulesSchema = createInsertSchema(providerSchedules);
export type InsertProviderSchedules = z.infer<typeof insertProviderSchedulesSchema>;
export type SelectProviderSchedules = typeof providerSchedules.$inferSelect;

export const providerSchedulingPatterns = pgTable("provider_scheduling_patterns", {
  id: serial("id").notNull(),
  providerId: integer("provider_id").notNull(),
  locationId: integer("location_id"),
  avgVisitDuration: decimal("avg_visit_duration", { precision: 5, scale: 2 }),
  avgDurationByType: jsonb("avg_duration_by_type"),
  avgDurationByHour: jsonb("avg_duration_by_hour"),
  avgTransitionTime: decimal("avg_transition_time", { precision: 5, scale: 2 }),
  documentationLag: decimal("documentation_lag", { precision: 5, scale: 2 }),
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }),
  avgRunningBehind: decimal("avg_running_behind", { precision: 5, scale: 2 }),
  catchUpPatterns: jsonb("catch_up_patterns"),
  preferredPatientLoad: integer("preferred_patient_load"),
  maxComplexVisits: integer("max_complex_visits"),
  bufferPreferences: jsonb("buffer_preferences"),
  lastCalculated: timestamp("last_calculated", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertProviderSchedulingPatternsSchema = createInsertSchema(providerSchedulingPatterns);
export type InsertProviderSchedulingPatterns = z.infer<typeof insertProviderSchedulingPatternsSchema>;
export type SelectProviderSchedulingPatterns = typeof providerSchedulingPatterns.$inferSelect;

export const realtimeScheduleStatus = pgTable("realtime_schedule_status", {
  id: serial("id").notNull(),
  providerId: integer("provider_id").notNull(),
  locationId: integer("location_id").notNull(),
  scheduleDate: date("schedule_date", { mode: 'date' }).notNull(),
  currentPatientId: integer("current_patient_id"),
  currentAppointmentId: integer("current_appointment_id"),
  runningBehindMinutes: integer("running_behind_minutes").default(0),
  lastUpdateTime: timestamp("last_update_time", { mode: 'date', withTimezone: true }).default("now()"),
  dayStartedAt: timestamp("day_started_at", { mode: 'date', withTimezone: true }),
  estimatedCatchUpTime: text("estimated_catch_up_time"),
  aiRecommendations: jsonb("ai_recommendations"),
});

export const insertRealtimeScheduleStatusSchema = createInsertSchema(realtimeScheduleStatus);
export type InsertRealtimeScheduleStatus = z.infer<typeof insertRealtimeScheduleStatusSchema>;
export type SelectRealtimeScheduleStatus = typeof realtimeScheduleStatus.$inferSelect;

export const resourceBookings = pgTable("resource_bookings", {
  id: serial("id").notNull(),
  resourceId: integer("resource_id").notNull(),
  appointmentId: integer("appointment_id"),
  bookingDate: date("booking_date", { mode: 'date' }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").default("'reserved'::text"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertResourceBookingsSchema = createInsertSchema(resourceBookings);
export type InsertResourceBookings = z.infer<typeof insertResourceBookingsSchema>;
export type SelectResourceBookings = typeof resourceBookings.$inferSelect;

export const scheduleExceptions = pgTable("schedule_exceptions", {
  id: serial("id").notNull(),
  providerId: integer("provider_id").notNull(),
  locationId: integer("location_id"),
  exceptionDate: date("exception_date", { mode: 'date' }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  exceptionType: text("exception_type").notNull(),
  reason: text("reason"),
  cancelsExistingAppts: boolean("cancels_existing_appts").default(false),
  allowsEmergencyOverride: boolean("allows_emergency_override").default(true),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertScheduleExceptionsSchema = createInsertSchema(scheduleExceptions);
export type InsertScheduleExceptions = z.infer<typeof insertScheduleExceptionsSchema>;
export type SelectScheduleExceptions = typeof scheduleExceptions.$inferSelect;

export const schedulePreferences = pgTable("schedule_preferences", {
  id: serial("id").notNull(),
  providerId: integer("provider_id").notNull(),
  useAiScheduling: boolean("use_ai_scheduling").default(true),
  aiAggressiveness: decimal("ai_aggressiveness", { precision: 5, scale: 2 }).default(50.00),
  preferredStartTime: text("preferred_start_time"),
  preferredEndTime: text("preferred_end_time"),
  preferredLunchTime: text("preferred_lunch_time"),
  preferredLunchDuration: integer("preferred_lunch_duration"),
  idealPatientsPerDay: integer("ideal_patients_per_day"),
  maxPatientsPerDay: integer("max_patients_per_day"),
  preferredBufferMinutes: integer("preferred_buffer_minutes").default(5),
  maxComplexVisitsPerDay: integer("max_complex_visits_per_day"),
  complexVisitSpacing: text("complex_visit_spacing"),
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  doubleBookingRules: jsonb("double_booking_rules"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSchedulePreferencesSchema = createInsertSchema(schedulePreferences);
export type InsertSchedulePreferences = z.infer<typeof insertSchedulePreferencesSchema>;
export type SelectSchedulePreferences = typeof schedulePreferences.$inferSelect;

export const schedulingAiFactors = pgTable("scheduling_ai_factors", {
  id: serial("id").notNull(),
  factorCategory: text("factor_category").notNull(),
  factorName: text("factor_name").notNull(),
  factorDescription: text("factor_description").notNull(),
  dataType: text("data_type").notNull(),
  defaultEnabled: boolean("default_enabled").default(true),
  defaultWeight: decimal("default_weight", { precision: 5, scale: 2 }).default(50.00),
  calculationMethod: text("calculation_method"),
  sourceTable: text("source_table"),
  updateFrequency: text("update_frequency"),
  impactDirection: text("impact_direction"),
  maxImpactMinutes: integer("max_impact_minutes"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSchedulingAiFactorsSchema = createInsertSchema(schedulingAiFactors);
export type InsertSchedulingAiFactors = z.infer<typeof insertSchedulingAiFactorsSchema>;
export type SelectSchedulingAiFactors = typeof schedulingAiFactors.$inferSelect;

export const schedulingAiWeights = pgTable("scheduling_ai_weights", {
  id: serial("id").notNull(),
  factorId: integer("factor_id"),
  factorName: text("factor_name"),
  providerId: integer("provider_id"),
  locationId: integer("location_id"),
  healthSystemId: integer("health_system_id"),
  enabled: boolean("enabled"),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  customParameters: jsonb("custom_parameters"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSchedulingAiWeightsSchema = createInsertSchema(schedulingAiWeights);
export type InsertSchedulingAiWeights = z.infer<typeof insertSchedulingAiWeightsSchema>;
export type SelectSchedulingAiWeights = typeof schedulingAiWeights.$inferSelect;

export const schedulingResources = pgTable("scheduling_resources", {
  id: serial("id").notNull(),
  locationId: integer("location_id").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceName: text("resource_name").notNull(),
  resourceCode: text("resource_code"),
  capabilities: text("capabilities").array(),
  capacity: integer("capacity").default(1),
  requiresCleaningMinutes: integer("requires_cleaning_minutes").default(0),
  maintenanceSchedule: jsonb("maintenance_schedule"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSchedulingResourcesSchema = createInsertSchema(schedulingResources);
export type InsertSchedulingResources = z.infer<typeof insertSchedulingResourcesSchema>;
export type SelectSchedulingResources = typeof schedulingResources.$inferSelect;

export const schedulingRules = pgTable("scheduling_rules", {
  id: serial("id").notNull(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(),
  providerId: integer("provider_id"),
  locationId: integer("location_id"),
  healthSystemId: integer("health_system_id"),
  ruleConfig: jsonb("rule_config"),
  priority: integer("priority").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertSchedulingRulesSchema = createInsertSchema(schedulingRules);
export type InsertSchedulingRules = z.infer<typeof insertSchedulingRulesSchema>;
export type SelectSchedulingRules = typeof schedulingRules.$inferSelect;

export const schedulingTemplates = pgTable("scheduling_templates", {
  id: serial("id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  providerId: integer("provider_id"),
  locationId: integer("location_id"),
  healthSystemId: integer("health_system_id"),
  slotDuration: integer("slot_duration").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  lunchStart: text("lunch_start"),
  lunchDuration: integer("lunch_duration"),
  bufferBetweenAppts: integer("buffer_between_appts").default(0),
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  maxPatientsPerDay: integer("max_patients_per_day"),
  daysOfWeek: integer("days_of_week").array(),
  isDefault: boolean("is_default").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  createdBy: integer("created_by").notNull(),
});

export const insertSchedulingTemplatesSchema = createInsertSchema(schedulingTemplates);
export type InsertSchedulingTemplates = z.infer<typeof insertSchedulingTemplatesSchema>;
export type SelectSchedulingTemplates = typeof schedulingTemplates.$inferSelect;

export const session = pgTable("session", {
  sid: varchar("sid").notNull(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: 'date', withTimezone: true }).notNull(),
});

export const insertSessionSchema = createInsertSchema(session);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type SelectSession = typeof session.$inferSelect;

export const signatures = pgTable("signatures", {
  id: serial("id").notNull(),
  encounterId: integer("encounter_id").notNull(),
  signedBy: integer("signed_by").notNull(),
  signatureType: text("signature_type").notNull(),
  signedAt: timestamp("signed_at", { mode: 'date', withTimezone: true }).default("now()"),
  signatureData: text("signature_data"),
  ipAddress: text("ip_address"),
  attestationText: text("attestation_text"),
});

export const insertSignaturesSchema = createInsertSchema(signatures);
export type InsertSignatures = z.infer<typeof insertSignaturesSchema>;
export type SelectSignatures = typeof signatures.$inferSelect;

export const signedOrders = pgTable("signed_orders", {
  id: serial("id").notNull(),
  orderId: integer("order_id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  orderType: varchar("order_type", { length: 50 }).notNull(),
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(),
  deliveryStatus: varchar("delivery_status", { length: 50 }).notNull().default("'pending'::character varying"),
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastDeliveryAttempt: timestamp("last_delivery_attempt", { mode: 'date', withTimezone: true }),
  deliveryError: text("delivery_error"),
  canChangeDelivery: boolean("can_change_delivery").notNull().default(true),
  deliveryLockReason: varchar("delivery_lock_reason", { length: 255 }),
  originalDeliveryMethod: varchar("original_delivery_method", { length: 50 }).notNull(),
  deliveryChanges: jsonb("delivery_changes").default("'[]'::jsonb"),
  signedAt: timestamp("signed_at", { mode: 'date', withTimezone: true }).notNull(),
  signedBy: integer("signed_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
});

export const insertSignedOrdersSchema = createInsertSchema(signedOrders);
export type InsertSignedOrders = z.infer<typeof insertSignedOrdersSchema>;
export type SelectSignedOrders = typeof signedOrders.$inferSelect;

export const socialHistory = pgTable("social_history", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  category: text("category").notNull(),
  details: text("details").notNull(),
  currentStatus: text("current_status").notNull(),
  historyNotes: text("history_notes"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  enteredBy: integer("entered_by"),
  consolidationReasoning: text("consolidation_reasoning"),
  extractionNotes: text("extraction_notes"),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSocialHistorySchema = createInsertSchema(socialHistory);
export type InsertSocialHistory = z.infer<typeof insertSocialHistorySchema>;
export type SelectSocialHistory = typeof socialHistory.$inferSelect;

export const subscriptionHistory = pgTable("subscription_history", {
  id: serial("id").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  previousTier: integer("previous_tier"),
  newTier: integer("new_tier"),
  changeType: text("change_type"),
  changedAt: timestamp("changed_at", { mode: 'date', withTimezone: true }).default("now()"),
  gracePeriodEnds: timestamp("grace_period_ends", { mode: 'date', withTimezone: true }),
  dataExpiresAt: timestamp("data_expires_at", { mode: 'date', withTimezone: true }),
  metadata: jsonb("metadata").default("'{}'::jsonb"),
});

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory);
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;
export type SelectSubscriptionHistory = typeof subscriptionHistory.$inferSelect;

export const subscriptionKeys = pgTable("subscription_keys", {
  id: serial("id").notNull(),
  key: varchar("key", { length: 20 }).notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  keyType: text("key_type").notNull(),
  subscriptionTier: integer("subscription_tier").notNull(),
  status: text("status").default("'active'::text"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  expiresAt: timestamp("expires_at", { mode: 'date', withTimezone: true }).notNull(),
  usedBy: integer("used_by"),
  usedAt: timestamp("used_at", { mode: 'date', withTimezone: true }),
  deactivatedBy: integer("deactivated_by"),
  deactivatedAt: timestamp("deactivated_at", { mode: 'date', withTimezone: true }),
  metadata: jsonb("metadata").default("'{}'::jsonb"),
});

export const insertSubscriptionKeysSchema = createInsertSchema(subscriptionKeys);
export type InsertSubscriptionKeys = z.infer<typeof insertSubscriptionKeysSchema>;
export type SelectSubscriptionKeys = typeof subscriptionKeys.$inferSelect;

export const surgicalHistory = pgTable("surgical_history", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  procedureName: text("procedure_name").notNull(),
  procedureDate: date("procedure_date", { mode: 'date' }),
  surgeonName: text("surgeon_name"),
  facilityName: text("facility_name"),
  indication: text("indication"),
  complications: text("complications"),
  anesthesiaType: text("anesthesia_type"),
  cptCode: text("cpt_code"),
  icd10ProcedureCode: text("icd10_procedure_code"),
  anatomicalSite: text("anatomical_site"),
  laterality: text("laterality"),
  urgencyLevel: text("urgency_level"),
  lengthOfStay: text("length_of_stay"),
  bloodLoss: text("blood_loss"),
  transfusionsRequired: boolean("transfusions_required").default(false),
  implantsHardware: text("implants_hardware"),
  followUpRequired: text("follow_up_required"),
  recoveryStatus: text("recovery_status"),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id"),
  enteredBy: integer("entered_by"),
  consolidationReasoning: text("consolidation_reasoning"),
  extractionNotes: text("extraction_notes"),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertSurgicalHistorySchema = createInsertSchema(surgicalHistory);
export type InsertSurgicalHistory = z.infer<typeof insertSurgicalHistorySchema>;
export type SelectSurgicalHistory = typeof surgicalHistory.$inferSelect;

export const templateShares = pgTable("template_shares", {
  id: serial("id").notNull(),
  templateId: integer("template_id").notNull(),
  sharedBy: integer("shared_by").notNull(),
  sharedWith: integer("shared_with").notNull(),
  status: text("status").default("'pending'::text"),
  sharedAt: timestamp("shared_at", { mode: 'date', withTimezone: true }).default("now()"),
  respondedAt: timestamp("responded_at", { mode: 'date', withTimezone: true }),
  shareMessage: text("share_message"),
  canModify: boolean("can_modify").default(false),
  active: boolean("active").default(true),
});

export const insertTemplateSharesSchema = createInsertSchema(templateShares);
export type InsertTemplateShares = z.infer<typeof insertTemplateSharesSchema>;
export type SelectTemplateShares = typeof templateShares.$inferSelect;

export const templateVersions = pgTable("template_versions", {
  id: serial("id").notNull(),
  templateId: integer("template_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  changeDescription: text("change_description"),
  changedBy: integer("changed_by").notNull(),
  exampleNoteSnapshot: text("example_note_snapshot").notNull(),
  generatedPromptSnapshot: text("generated_prompt_snapshot").notNull(),
  changeType: text("change_type").default("'manual'::text"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertTemplateVersionsSchema = createInsertSchema(templateVersions);
export type InsertTemplateVersions = z.infer<typeof insertTemplateVersionsSchema>;
export type SelectTemplateVersions = typeof templateVersions.$inferSelect;

export const userAssistantThreads = pgTable("user_assistant_threads", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  threadId: text("thread_id").notNull(),
  threadType: text("thread_type").notNull(),
  isActive: boolean("is_active").default(true),
  lastInteraction: timestamp("last_interaction", { mode: 'date', withTimezone: true }).default("now()"),
  messageCount: integer("message_count").default(0),
  patternsLearned: integer("patterns_learned").default(0),
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default(0.50),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserAssistantThreadsSchema = createInsertSchema(userAssistantThreads);
export type InsertUserAssistantThreads = z.infer<typeof insertUserAssistantThreadsSchema>;
export type SelectUserAssistantThreads = typeof userAssistantThreads.$inferSelect;

export const userEditPatterns = pgTable("user_edit_patterns", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  patientId: integer("patient_id"),
  encounterId: integer("encounter_id"),
  originalText: text("original_text").notNull(),
  editedText: text("edited_text").notNull(),
  sectionType: text("section_type").notNull(),
  patternType: text("pattern_type").notNull(),
  isUserPreference: boolean("is_user_preference"),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  extractedPattern: jsonb("extracted_pattern"),
  applied: boolean("applied").default(false),
  reviewedByUser: boolean("reviewed_by_user").default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserEditPatternsSchema = createInsertSchema(userEditPatterns);
export type InsertUserEditPatterns = z.infer<typeof insertUserEditPatternsSchema>;
export type SelectUserEditPatterns = typeof userEditPatterns.$inferSelect;

export const userLocations = pgTable("user_locations", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  locationId: integer("location_id").notNull(),
  roleAtLocation: text("role_at_location").notNull(),
  isPrimary: boolean("is_primary").default(false),
  workSchedule: jsonb("work_schedule"),
  canSchedule: boolean("can_schedule").default(true),
  canViewAllPatients: boolean("can_view_all_patients").default(true),
  canCreateOrders: boolean("can_create_orders").default(true),
  active: boolean("active").default(true),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserLocationsSchema = createInsertSchema(userLocations);
export type InsertUserLocations = z.infer<typeof insertUserLocationsSchema>;
export type SelectUserLocations = typeof userLocations.$inferSelect;

export const userNotePreferences = pgTable("user_note_preferences", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  defaultSoapTemplate: integer("default_soap_template"),
  defaultApsoTemplate: integer("default_apso_template"),
  defaultProgressTemplate: integer("default_progress_template"),
  defaultHAndPTemplate: integer("default_h_and_p_template"),
  defaultDischargeTemplate: integer("default_discharge_template"),
  defaultProcedureTemplate: integer("default_procedure_template"),
  lastSelectedNoteType: text("last_selected_note_type").default("'soap'::text"),
  globalAiLearning: boolean("global_ai_learning").default(true),
  learningAggressiveness: text("learning_aggressiveness").default("'moderate'::text"),
  rememberLastTemplate: boolean("remember_last_template").default(true),
  showTemplatePreview: boolean("show_template_preview").default(true),
  autoSaveChanges: boolean("auto_save_changes").default(true),
  medicalProblemsDisplayThreshold: integer("medical_problems_display_threshold").default(100),
  rankingWeights: jsonb("ranking_weights").default("'{"clinical_severity": 40, "patient_frequency": 20, "clinical_relevance": 10, "treatment_complexity": 30}'::jsonb"),
  chartPanelWidth: integer("chart_panel_width").default(400),
  enableDenseView: boolean("enable_dense_view").default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserNotePreferencesSchema = createInsertSchema(userNotePreferences);
export type InsertUserNotePreferences = z.infer<typeof insertUserNotePreferencesSchema>;
export type SelectUserNotePreferences = typeof userNotePreferences.$inferSelect;

export const userNoteTemplates = pgTable("user_note_templates", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  templateName: text("template_name").notNull(),
  baseNoteType: text("base_note_type").notNull(),
  displayName: text("display_name").notNull(),
  isPersonal: boolean("is_personal").default(true),
  isDefault: boolean("is_default").default(false),
  createdBy: integer("created_by").notNull(),
  sharedBy: integer("shared_by"),
  exampleNote: text("example_note").notNull(),
  baseNoteText: text("base_note_text"),
  inlineComments: jsonb("inline_comments"),
  hasComments: boolean("has_comments").default(false),
  generatedPrompt: text("generated_prompt").notNull(),
  promptVersion: integer("prompt_version").default(1),
  enableAiLearning: boolean("enable_ai_learning").default(true),
  learningConfidence: decimal("learning_confidence", { precision: 3, scale: 2 }).default(0.75),
  lastLearningUpdate: timestamp("last_learning_update", { mode: 'date', withTimezone: true }),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used", { mode: 'date', withTimezone: true }),
  version: integer("version").default(1),
  parentTemplateId: integer("parent_template_id"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserNoteTemplatesSchema = createInsertSchema(userNoteTemplates);
export type InsertUserNoteTemplates = z.infer<typeof insertUserNoteTemplatesSchema>;
export type SelectUserNoteTemplates = typeof userNoteTemplates.$inferSelect;

export const userProblemListPreferences = pgTable("user_problem_list_preferences", {
  userId: integer("user_id").notNull(),
  maxProblemsDisplayed: integer("max_problems_displayed").default(10),
  showResolvedProblems: boolean("show_resolved_problems").default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserProblemListPreferencesSchema = createInsertSchema(userProblemListPreferences);
export type InsertUserProblemListPreferences = z.infer<typeof insertUserProblemListPreferencesSchema>;
export type SelectUserProblemListPreferences = typeof userProblemListPreferences.$inferSelect;

export const userSessionLocations = pgTable("user_session_locations", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  locationId: integer("location_id").notNull(),
  sessionId: text("session_id"),
  selectedAt: timestamp("selected_at", { mode: 'date', withTimezone: true }).default("now()"),
  isActive: boolean("is_active").default(true),
  rememberSelection: boolean("remember_selection").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUserSessionLocationsSchema = createInsertSchema(userSessionLocations);
export type InsertUserSessionLocations = z.infer<typeof insertUserSessionLocationsSchema>;
export type SelectUserSessionLocations = typeof userSessionLocations.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  healthSystemId: integer("health_system_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  npi: text("npi"),
  credentials: text("credentials"),
  specialties: text("specialties").array(),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires", { mode: 'date', withTimezone: true }),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  accountStatus: text("account_status").default("'active'::text"),
  lastLogin: timestamp("last_login", { mode: 'date', withTimezone: true }),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until", { mode: 'date', withTimezone: true }),
  requirePasswordChange: boolean("require_password_change").default(false),
  verificationStatus: text("verification_status").default("'unverified'::text"),
  verifiedWithKeyId: integer("verified_with_key_id"),
  verifiedAt: timestamp("verified_at", { mode: 'date', withTimezone: true }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertUsersSchema = createInsertSchema(users);
export type InsertUsers = z.infer<typeof insertUsersSchema>;
export type SelectUsers = typeof users.$inferSelect;

export const vitals = pgTable("vitals", {
  id: serial("id").notNull(),
  patientId: integer("patient_id").notNull(),
  encounterId: integer("encounter_id"),
  recordedAt: timestamp("recorded_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  recordedBy: text("recorded_by").notNull(),
  entryType: text("entry_type").notNull().default("'routine'::text"),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  heartRate: integer("heart_rate"),
  temperature: decimal("temperature"),
  weight: decimal("weight"),
  height: decimal("height"),
  bmi: decimal("bmi"),
  oxygenSaturation: decimal("oxygen_saturation"),
  respiratoryRate: integer("respiratory_rate"),
  painScale: integer("pain_scale"),
  bloodPressure: text("blood_pressure"),
  bloodGlucose: integer("blood_glucose"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  notes: text("notes"),
  parsedFromText: boolean("parsed_from_text").default(false),
  originalText: text("original_text"),
  processingNotes: text("processing_notes"),
  sourceType: text("source_type").default("'manual_entry'::text"),
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default(1.00),
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id"),
  extractionNotes: text("extraction_notes"),
  consolidationReasoning: text("consolidation_reasoning"),
  mergedIds: integer("merged_ids").array(),
  visitHistory: jsonb("visit_history").default("'[]'::jsonb"),
  enteredBy: integer("entered_by"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).default("now()"),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).default("now()"),
});

export const insertVitalsSchema = createInsertSchema(vitals);
export type InsertVitals = z.infer<typeof insertVitalsSchema>;
export type SelectVitals = typeof vitals.$inferSelect;

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: serial("id").notNull(),
  userId: integer("user_id").notNull(),
  credentialId: text("credential_id").notNull(),
  credentialPublicKey: text("credential_public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"),
  transports: jsonb("transports"),
  registeredDevice: text("registered_device"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).notNull().default("now()"),
  lastUsedAt: timestamp("last_used_at", { mode: 'date', withTimezone: true }),
});

export const insertWebauthnCredentialsSchema = createInsertSchema(webauthnCredentials);
export type InsertWebauthnCredentials = z.infer<typeof insertWebauthnCredentialsSchema>;
export type SelectWebauthnCredentials = typeof webauthnCredentials.$inferSelect;

