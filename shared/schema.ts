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
  subjective: text("subjective"), // Provider's SOAP note
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  
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

// Diagnoses
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  encounters: many(encounters),
  appointments: many(appointments),
  signatures: many(signatures),
  labOrders: many(labOrders),
  imagingOrders: many(imagingOrders),
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
  labOrders: many(labOrders),
  labResults: many(labResults),
  imagingOrders: many(imagingOrders),
  imagingResults: many(imagingResults),
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
  chiefComplaint: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Encounter = typeof encounters.$inferSelect;
export type InsertVitals = z.infer<typeof insertVitalsSchema>;
export type Vitals = typeof vitals.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type Diagnosis = typeof diagnoses.$inferSelect;
export type LabOrder = typeof labOrders.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type ImagingOrder = typeof imagingOrders.$inferSelect;
export type ImagingResult = typeof imagingResults.$inferSelect;
export type FamilyHistory = typeof familyHistory.$inferSelect;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type SocialHistory = typeof socialHistory.$inferSelect;
export type Allergy = typeof allergies.$inferSelect;
