import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Core Tables

// Users (Healthcare professionals)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  
  // Basic info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // 'admin', 'provider', 'nurse', 'staff'
  
  // Professional details
  npi: text("npi").unique(),
  credentials: text("credentials"),
  specialties: text("specialties").array(),
  licenseNumber: text("license_number"),
  
  // Security
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  accountStatus: text("account_status").default("active"),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User SOAP Templates and Preferences
export const userSoapTemplates = pgTable("user_soap_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateName: text("template_name").notNull(),
  isDefault: boolean("is_default").default(false),
  
  // Template Structure
  subjectiveTemplate: text("subjective_template").notNull(),
  objectiveTemplate: text("objective_template").notNull(),
  assessmentTemplate: text("assessment_template").notNull(),
  planTemplate: text("plan_template").notNull(),
  
  // Formatting Preferences
  formatPreferences: jsonb("format_preferences").$type<{
    useBulletPoints: boolean;
    boldDiagnoses: boolean;
    separateAssessmentPlan: boolean;
    vitalSignsFormat: 'inline' | 'list' | 'table';
    physicalExamFormat: 'paragraph' | 'bullets' | 'structured';
    abbreviationStyle: 'minimal' | 'standard' | 'extensive';
    sectionSpacing: number;
    customSectionOrder?: string[];
  }>(),
  
  // AI Learning Settings
  enableAiLearning: boolean("enable_ai_learning").default(true),
  learningConfidence: decimal("learning_confidence", { precision: 3, scale: 2 }).default("0.75"),
  lastLearningUpdate: timestamp("last_learning_update"),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Edit Patterns (for AI learning)
export const userEditPatterns = pgTable("user_edit_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  encounterId: integer("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
  
  // Edit Analysis
  originalText: text("original_text").notNull(),
  editedText: text("edited_text").notNull(),
  sectionType: text("section_type").notNull(), // 'subjective', 'objective', 'assessment', 'plan'
  
  // AI Classification
  patternType: text("pattern_type").notNull(), // 'formatting', 'medical_content', 'style', 'structure'
  isUserPreference: boolean("is_user_preference"), // true = user style, false = patient medical
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  
  // Learning Data
  extractedPattern: jsonb("extracted_pattern").$type<{
    type: string;
    rule: string;
    context: string;
    frequency: number;
    examples: string[];
  }>(),
  
  applied: boolean("applied").default(false),
  reviewedByUser: boolean("reviewed_by_user").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// User AI Assistant Threads
export const userAssistantThreads = pgTable("user_assistant_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  threadId: text("thread_id").notNull().unique(),
  threadType: text("thread_type").notNull(), // 'style_learning', 'template_generation'
  
  // Thread State
  isActive: boolean("is_active").default(true),
  lastInteraction: timestamp("last_interaction").defaultNow(),
  messageCount: integer("message_count").default(0),
  
  // Learning Stats
  patternsLearned: integer("patterns_learned").default(0),
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default("0.50"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  mrn: varchar("mrn").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  contactNumber: text("contact_number"),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  
  // Voice workflow optimization
  assistantId: text("assistant_id"), // Patient-specific OpenAI assistant ID
  assistantThreadId: text("assistant_thread_id"),
  lastChartSummary: text("last_chart_summary"),
  chartLastUpdated: timestamp("chart_last_updated"),
  
  // Clinical flags
  activeProblems: jsonb("active_problems").default([]),
  criticalAlerts: jsonb("critical_alerts").default([]),
  
  profilePhotoFilename: text("profile_photo_filename"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration"), // in minutes
  status: text("status").default("scheduled"),
  appointmentType: text("appointment_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Signatures
export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  signatureData: text("signature_data").notNull(),
  signedAt: timestamp("signed_at").defaultNow(),
});

// Unified Encounters (replaces dual table system)
export const encounters = pgTable("encounters", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  
  // Encounter classification
  encounterType: text("encounter_type").notNull(), // 'office_visit', 'patient_communication', 'virtual_visit', 'orders_only'
  encounterSubtype: text("encounter_subtype"), // 'preventive_care', 'urgent_care', 'procedure_visit'
  
  // Timing & status
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  encounterStatus: text("encounter_status").default("scheduled"), // 'scheduled', 'in_progress', 'completed', 'signed'
  
  // Clinical documentation
  chiefComplaint: text("chief_complaint"),
  note: text("note"), // Complete SOAP note in formatted text
  
  // Nursing documentation (same encounter, different view)
  nurseAssessment: text("nurse_assessment"),
  nurseInterventions: text("nurse_interventions"),
  nurseNotes: text("nurse_notes"),
  
  // Voice workflow support
  transcriptionRaw: text("transcription_raw"),
  transcriptionProcessed: text("transcription_processed"),
  aiSuggestions: jsonb("ai_suggestions").default({}),
  
  // Auto-generated (from voice)
  draftOrders: jsonb("draft_orders").default([]),
  draftDiagnoses: jsonb("draft_diagnoses").default([]),
  cptCodes: jsonb("cpt_codes").default([]),
  
  // Metadata
  location: text("location"),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  signatureId: varchar("signature_id").references(() => signatures.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Audit trail
  lastChartUpdate: timestamp("last_chart_update"),
  chartUpdateDuration: integer("chart_update_duration"),
});

// Historical Data Tables (UPDATE-able by GPT)

// Family History
export const familyHistory = pgTable("family_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  familyMember: text("family_member").notNull(), // 'father', 'mother', 'brother'
  medicalHistory: text("medical_history"), // "DM2, h/o CAD, died of MI at age 70"
  lastUpdatedEncounter: integer("last_updated_encounter").references(() => encounters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical History
export const medicalHistory = pgTable("medical_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  conditionCategory: text("condition_category").notNull(), // 'cardiac', 'endocrine', 'surgical'
  historyText: text("history_text").notNull(),
  lastUpdatedEncounter: integer("last_updated_encounter").references(() => encounters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social History
export const socialHistory = pgTable("social_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  category: text("category").notNull(), // 'smoking', 'alcohol', 'occupation'
  currentStatus: text("current_status").notNull(),
  historyNotes: text("history_notes"),
  lastUpdatedEncounter: integer("last_updated_encounter").references(() => encounters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Allergies
export const allergies = pgTable("allergies", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  allergen: text("allergen").notNull(),
  reaction: text("reaction"),
  severity: text("severity"),
  lastUpdatedEncounter: integer("last_updated_encounter").references(() => encounters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Factual Data Tables (APPEND-only)

// Vitals
export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  measuredAt: timestamp("measured_at").notNull(),
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
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medications
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  route: text("route"), // 'oral', 'IV', 'topical'
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // NULL means active
  prescriber: text("prescriber"),
  status: text("status").default("active"),
  reasonForChange: text("reason_for_change"),
  medicalProblem: text("medical_problem"), // What this treats
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Medical Problems with JSONB Visit History
export const medicalProblems = pgTable("medical_problems", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  problemTitle: text("problem_title").notNull(),
  currentIcd10Code: text("current_icd10_code"),
  problemStatus: text("problem_status").default("active"), // 'active', 'resolved', 'chronic'
  firstDiagnosedDate: date("first_diagnosed_date"),
  firstEncounterId: integer("first_encounter_id").references(() => encounters.id),
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  
  // Enhanced JSONB fields for performance
  visitHistory: jsonb("visit_history").default([]), // Chronological visit notes
  changeLog: jsonb("change_log").default([]), // Audit trail of changes
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy Diagnoses (keeping for backward compatibility)
export const diagnoses = pgTable("diagnoses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  diagnosis: text("diagnosis").notNull(),
  icd10Code: text("icd10_code"),
  diagnosisDate: date("diagnosis_date"),
  status: text("status").notNull(), // 'active', 'resolved', 'chronic', 'rule_out'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// External Labs
export const externalLabs = pgTable("external_labs", {
  id: serial("id").primaryKey(),
  labName: text("lab_name").notNull(), // "LabCorp", "Quest Diagnostics"
  labIdentifier: text("lab_identifier").notNull().unique(), // CLIA number
  
  // Integration method
  integrationType: text("integration_type").notNull(), // 'hl7', 'api', 'manual_fax'
  apiEndpoint: text("api_endpoint"),
  hl7Endpoint: text("hl7_endpoint"),
  
  // Authentication (encrypted)
  apiKeyEncrypted: text("api_key_encrypted"),
  usernameEncrypted: text("username_encrypted"),
  sslCertificatePath: text("ssl_certificate_path"),
  
  // Capabilities
  supportedTests: jsonb("supported_tests"), // Array of LOINC codes
  turnaroundTimes: jsonb("turnaround_times"), // Expected results time by test type
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lab Orders
export const labOrders = pgTable("lab_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  orderSetId: text("order_set_id"), // Groups related tests together
  
  // Order details
  testCode: text("test_code").notNull(), // LOINC code
  testName: text("test_name").notNull(),
  priority: text("priority").default("routine"), // 'stat', 'urgent', 'routine'
  clinicalIndication: text("clinical_indication"), // Why this test was ordered
  
  // Ordering provider
  orderedBy: integer("ordered_by").references(() => users.id).notNull(),
  orderedAt: timestamp("ordered_at").defaultNow(),
  
  // External lab integration
  externalLabId: text("external_lab_id"),
  externalOrderId: text("external_order_id"),
  hl7MessageId: text("hl7_message_id"),
  
  // Status tracking
  orderStatus: text("order_status").default("pending"), // 'pending', 'sent', 'received', 'in_progress', 'completed', 'cancelled'
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  
  // Specimen details
  specimenType: text("specimen_type"), // 'blood', 'urine', 'tissue', etc.
  collectionInstructions: text("collection_instructions"),
  fastingRequired: boolean("fasting_required").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lab Results
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  labOrderId: integer("lab_order_id").references(() => labOrders.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Result data
  testCode: text("test_code").notNull(),
  testName: text("test_name").notNull(),
  resultValue: text("result_value"),
  resultUnits: text("result_units"),
  referenceRange: text("reference_range"),
  abnormalFlag: text("abnormal_flag"), // 'H', 'L', 'HH', 'LL', 'A', null
  
  // Timing
  specimenCollectedAt: timestamp("specimen_collected_at"),
  resultAvailableAt: timestamp("result_available_at"),
  receivedAt: timestamp("received_at").defaultNow(),
  
  // External tracking
  externalLabId: text("external_lab_id"),
  externalResultId: text("external_result_id"),
  hl7MessageId: text("hl7_message_id"),
  
  // Status & review
  resultStatus: text("result_status").default("pending"), // 'pending', 'preliminary', 'final', 'corrected', 'cancelled'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  providerNotes: text("provider_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Imaging Orders
export const imagingOrders = pgTable("imaging_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  
  // Order details
  studyType: text("study_type").notNull(), // 'X-ray', 'CT', 'MRI', 'Ultrasound'
  bodyPart: text("body_part").notNull(),
  laterality: text("laterality"), // 'left', 'right', 'bilateral'
  contrastNeeded: boolean("contrast_needed").default(false),
  
  // Clinical info
  clinicalIndication: text("clinical_indication").notNull(),
  clinicalHistory: text("clinical_history"),
  relevantSymptoms: text("relevant_symptoms"),
  
  // Ordering provider
  orderedBy: integer("ordered_by").references(() => users.id).notNull(),
  orderedAt: timestamp("ordered_at").defaultNow(),
  
  // External integration
  externalFacilityId: text("external_facility_id"),
  externalOrderId: text("external_order_id"),
  dicomAccessionNumber: text("dicom_accession_number"),
  
  // Status tracking
  orderStatus: text("order_status").default("pending"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  
  // Special instructions
  prepInstructions: text("prep_instructions"),
  schedulingNotes: text("scheduling_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Imaging Results
export const imagingResults = pgTable("imaging_results", {
  id: serial("id").primaryKey(),
  imagingOrderId: integer("imaging_order_id").references(() => imagingOrders.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Study details
  studyDate: timestamp("study_date").notNull(),
  modality: text("modality").notNull(), // 'XR', 'CT', 'MR', 'US'
  bodyPart: text("body_part"),
  
  // Results
  findings: text("findings"), // Radiologist findings
  impression: text("impression"),
  radiologistName: text("radiologist_name"),
  
  // DICOM details
  dicomStudyId: text("dicom_study_id"),
  dicomSeriesId: text("dicom_series_id"),
  imageFilePaths: text("image_file_paths").array(),
  
  // Status & review
  resultStatus: text("result_status").default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  providerNotes: text("provider_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient Physical Exam Findings (GPT-managed persistent findings)
export const patientPhysicalFindings = pgTable("patient_physical_findings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Physical exam categorization
  examSystem: text("exam_system").notNull(), // 'cardiovascular', 'pulmonary', 'abdominal', 'neurological', etc.
  examComponent: text("exam_component"), // 'heart sounds', 'lung sounds', 'reflexes', 'scars', etc.
  
  // Finding details
  findingText: text("finding_text").notNull(), // "2/6 systolic murmur at RUSB", "well-healed surgical scar RLQ"
  findingType: text("finding_type").notNull(), // 'chronic_stable', 'anatomical_variant', 'surgical_history', 'congenital'
  
  // Confidence and validation
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(), // GPT confidence 0.00-1.00
  confirmedCount: integer("confirmed_count").default(0), // How many times provider confirmed
  contradictedCount: integer("contradicted_count").default(0), // How many times provider changed/removed
  
  // Source tracking
  firstNotedEncounter: integer("first_noted_encounter").references(() => encounters.id).notNull(),
  lastConfirmedEncounter: integer("last_confirmed_encounter").references(() => encounters.id),
  lastSeenEncounter: integer("last_seen_encounter").references(() => encounters.id),
  
  // Status
  status: text("status").default("active"), // 'active', 'resolved', 'outdated', 'invalid'
  
  // GPT analysis metadata
  gptReasoning: text("gpt_reasoning"), // Why GPT thinks this is persistent
  clinicalContext: jsonb("clinical_context").$type<{
    relatedDiagnoses?: string[];
    expectedDuration?: string;
    monitoringRequired?: boolean;
    significanceLevel?: 'low' | 'moderate' | 'high';
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified Orders Table (for draft orders processing system)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id),
  
  // Order classification
  orderType: text("order_type").notNull(), // 'medication', 'lab', 'imaging', 'referral'
  orderStatus: text("order_status").default("draft"), // 'draft', 'pending', 'approved', 'cancelled', 'completed'
  
  // Reference to specific order tables (for approved orders)
  referenceId: integer("reference_id"), // Links to labOrders.id, imagingOrders.id, etc.
  
  // Common fields for all order types
  providerNotes: text("provider_notes"),
  priority: text("priority").default("routine"), // 'stat', 'urgent', 'routine'
  clinicalIndication: text("clinical_indication"),
  
  // Medication-specific fields
  medicationName: text("medication_name"),
  dosage: text("dosage"),
  quantity: integer("quantity"),
  sig: text("sig"), // Prescription instructions
  refills: integer("refills"),
  form: text("form"), // 'tablet', 'capsule', 'liquid', etc.
  routeOfAdministration: text("route_of_administration"),
  daysSupply: integer("days_supply"),
  diagnosisCode: text("diagnosis_code"),
  requiresPriorAuth: boolean("requires_prior_auth").default(false),
  priorAuthNumber: text("prior_auth_number"),
  
  // Lab-specific fields
  labName: text("lab_name"),
  testName: text("test_name"),
  testCode: text("test_code"), // LOINC code
  specimenType: text("specimen_type"),
  fastingRequired: boolean("fasting_required").default(false),
  
  // Imaging-specific fields
  studyType: text("study_type"), // 'X-ray', 'CT', 'MRI', 'Ultrasound'
  region: text("region"), // Body part/region
  laterality: text("laterality"), // 'left', 'right', 'bilateral'
  contrastNeeded: boolean("contrast_needed").default(false),
  
  // Referral-specific fields
  specialtyType: text("specialty_type"),
  providerName: text("provider_name"),
  urgency: text("urgency"),
  
  // Ordering provider and timestamps
  orderedBy: integer("ordered_by").references(() => users.id),
  orderedAt: timestamp("ordered_at").defaultNow(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  encounters: many(encounters),
  appointments: many(appointments),
  signatures: many(signatures),
  labOrders: many(labOrders),
  imagingOrders: many(imagingOrders),
  orders: many(orders),
  orderedOrders: many(orders, { relationName: "orderedBy" }),
  approvedOrders: many(orders, { relationName: "approvedBy" }),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  encounters: many(encounters),
  appointments: many(appointments),
  familyHistory: many(familyHistory),
  medicalHistory: many(medicalHistory),
  socialHistory: many(socialHistory),
  allergies: many(allergies),
  vitals: many(vitals),
  medications: many(medications),
  diagnoses: many(diagnoses),
  medicalProblems: many(medicalProblems),
  labOrders: many(labOrders),
  labResults: many(labResults),
  imagingOrders: many(imagingOrders),
  imagingResults: many(imagingResults),
  orders: many(orders),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  patient: one(patients, {
    fields: [encounters.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [encounters.providerId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [encounters.appointmentId],
    references: [appointments.id],
  }),
  signature: one(signatures, {
    fields: [encounters.signatureId],
    references: [signatures.id],
  }),
  vitals: many(vitals),
  medications: many(medications),
  diagnoses: many(diagnoses),
  labOrders: many(labOrders),
  imagingOrders: many(imagingOrders),
  orders: many(orders),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [appointments.providerId],
    references: [users.id],
  }),
  encounters: many(encounters),
}));

export const signaturesRelations = relations(signatures, ({ one, many }) => ({
  user: one(users, {
    fields: [signatures.userId],
    references: [users.id],
  }),
  encounters: many(encounters),
}));

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [labOrders.patientId],
    references: [patients.id],
  }),
  encounter: one(encounters, {
    fields: [labOrders.encounterId],
    references: [encounters.id],
  }),
  orderedByUser: one(users, {
    fields: [labOrders.orderedBy],
    references: [users.id],
  }),
  results: many(labResults),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  labOrder: one(labOrders, {
    fields: [labResults.labOrderId],
    references: [labOrders.id],
  }),
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
  reviewedByUser: one(users, {
    fields: [labResults.reviewedBy],
    references: [users.id],
  }),
}));

export const imagingOrdersRelations = relations(imagingOrders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [imagingOrders.patientId],
    references: [patients.id],
  }),
  encounter: one(encounters, {
    fields: [imagingOrders.encounterId],
    references: [encounters.id],
  }),
  orderedByUser: one(users, {
    fields: [imagingOrders.orderedBy],
    references: [users.id],
  }),
  results: many(imagingResults),
}));

export const imagingResultsRelations = relations(imagingResults, ({ one }) => ({
  imagingOrder: one(imagingOrders, {
    fields: [imagingResults.imagingOrderId],
    references: [imagingOrders.id],
  }),
  patient: one(patients, {
    fields: [imagingResults.patientId],
    references: [patients.id],
  }),
  reviewedByUser: one(users, {
    fields: [imagingResults.reviewedBy],
    references: [users.id],
  }),
}));

export const patientPhysicalFindingsRelations = relations(patientPhysicalFindings, ({ one }) => ({
  patient: one(patients, {
    fields: [patientPhysicalFindings.patientId],
    references: [patients.id],
  }),
  firstNotedEncounter: one(encounters, {
    fields: [patientPhysicalFindings.firstNotedEncounter],
    references: [encounters.id],
  }),
  lastConfirmedEncounter: one(encounters, {
    fields: [patientPhysicalFindings.lastConfirmedEncounter],
    references: [encounters.id],
  }),
  lastSeenEncounter: one(encounters, {
    fields: [patientPhysicalFindings.lastSeenEncounter],
    references: [encounters.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  patient: one(patients, {
    fields: [orders.patientId],
    references: [patients.id],
  }),
  encounter: one(encounters, {
    fields: [orders.encounterId],
    references: [encounters.id],
  }),
  orderedByUser: one(users, {
    fields: [orders.orderedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [orders.approvedBy],
    references: [users.id],
  }),
}));

export const medicalProblemsRelations = relations(medicalProblems, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalProblems.patientId],
    references: [patients.id],
  }),
  firstEncounter: one(encounters, {
    fields: [medicalProblems.firstEncounterId],
    references: [encounters.id],
  }),
  lastUpdatedEncounter: one(encounters, {
    fields: [medicalProblems.lastUpdatedEncounterId],
    references: [encounters.id],
  }),
}));

// Medical Problems Types
export type MedicalProblem = typeof medicalProblems.$inferSelect;
export type InsertMedicalProblem = z.infer<typeof insertMedicalProblemSchema>;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  npi: true,
  credentials: true,
  specialties: true,
  licenseNumber: true,
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  mrn: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  contactNumber: true,
  email: true,
  address: true,
  emergencyContact: true,
});

export const insertEncounterSchema = createInsertSchema(encounters).pick({
  patientId: true,
  providerId: true,
  encounterType: true,
  encounterSubtype: true,
  encounterStatus: true,
  chiefComplaint: true,
  note: true,
  nurseAssessment: true,
  nurseInterventions: true,
  nurseNotes: true,
  location: true,
});

export const insertVitalsSchema = createInsertSchema(vitals).pick({
  patientId: true,
  encounterId: true,
  measuredAt: true,
  systolicBp: true,
  diastolicBp: true,
  heartRate: true,
  temperature: true,
  weight: true,
  height: true,
  bmi: true,
  oxygenSaturation: true,
  respiratoryRate: true,
  painScale: true,
  recordedBy: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  patientId: true,
  encounterId: true,
  orderType: true,
  orderStatus: true,
  referenceId: true,
  providerNotes: true,
  priority: true,
  clinicalIndication: true,
  medicationName: true,
  dosage: true,
  quantity: true,
  sig: true,
  refills: true,
  form: true,
  routeOfAdministration: true,
  daysSupply: true,
  diagnosisCode: true,
  requiresPriorAuth: true,
  priorAuthNumber: true,
  labName: true,
  testName: true,
  testCode: true,
  specimenType: true,
  fastingRequired: true,
  studyType: true,
  region: true,
  laterality: true,
  contrastNeeded: true,
  specialtyType: true,
  providerName: true,
  urgency: true,
  orderedBy: true,
  approvedBy: true,
});

export const insertMedicalProblemSchema = createInsertSchema(medicalProblems).pick({
  patientId: true,
  problemTitle: true,
  currentIcd10Code: true,
  problemStatus: true,
  firstDiagnosedDate: true,
  firstEncounterId: true,
  lastUpdatedEncounterId: true,
  visitHistory: true,
  changeLog: true,
});

export const insertDiagnosisSchema = createInsertSchema(diagnoses).pick({
  patientId: true,
  encounterId: true,
  diagnosis: true,
  icd10Code: true,
  diagnosisDate: true,
  status: true,
  notes: true,
});

export const insertPatientPhysicalFindingSchema = createInsertSchema(patientPhysicalFindings).pick({
  patientId: true,
  examSystem: true,
  examComponent: true,
  findingText: true,
  findingType: true,
  confidence: true,
  firstNotedEncounter: true,
  gptReasoning: true,
  clinicalContext: true,
});

// User preference schemas
export const insertUserSoapTemplateSchema = createInsertSchema(userSoapTemplates).pick({
  userId: true,
  templateName: true,
  isDefault: true,
  subjectiveTemplate: true,
  objectiveTemplate: true,
  assessmentTemplate: true,
  planTemplate: true,
  formatPreferences: true,
  enableAiLearning: true,
  learningConfidence: true,
});

export const insertUserEditPatternSchema = createInsertSchema(userEditPatterns).omit({
  id: true,
  createdAt: true,
});

export const insertUserAssistantThreadSchema = createInsertSchema(userAssistantThreads).pick({
  userId: true,
  threadId: true,
  threadType: true,
  isActive: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserSoapTemplate = z.infer<typeof insertUserSoapTemplateSchema>;
export type UserSoapTemplate = typeof userSoapTemplates.$inferSelect;
export type InsertUserEditPattern = z.infer<typeof insertUserEditPatternSchema>;
export type UserEditPattern = typeof userEditPatterns.$inferSelect;
export type InsertUserAssistantThread = z.infer<typeof insertUserAssistantThreadSchema>;
export type UserAssistantThread = typeof userAssistantThreads.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Encounter = typeof encounters.$inferSelect;
export type InsertVitals = z.infer<typeof insertVitalsSchema>;
export type Vitals = typeof vitals.$inferSelect;
export type InsertDiagnosis = z.infer<typeof insertDiagnosisSchema>;
export type Diagnosis = typeof diagnoses.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type LabOrder = typeof labOrders.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type ImagingOrder = typeof imagingOrders.$inferSelect;
export type ImagingResult = typeof imagingResults.$inferSelect;
export type FamilyHistory = typeof familyHistory.$inferSelect;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type SocialHistory = typeof socialHistory.$inferSelect;
export type Allergy = typeof allergies.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
