import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, numeric, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Core Tables

// Organizational Hierarchy - Scalable Healthcare System Architecture
// Supports everything from single-provider clinics to large health systems

// Health Systems (Top Level) - e.g., "Ascension", "Scott & White", "Mayo Clinic"
export const healthSystems = pgTable("health_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Ascension Health System" or "Dr. Smith Private Practice"
  shortName: text("short_name"), // "Ascension" or "Dr. Smith"
  systemType: text("system_type").notNull(), // 'health_system', 'hospital_network', 'clinic_group', 'individual_provider'
  
  // Subscription Management
  subscriptionTier: integer("subscription_tier").default(1), // 1=Individual, 2=Small Group, 3=Enterprise
  subscriptionStatus: text("subscription_status").default('active'), // 'active', 'suspended', 'cancelled'
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  
  // For merging/migration tracking
  mergedIntoHealthSystemId: integer("merged_into_health_system_id").references(() => healthSystems.id),
  mergedDate: timestamp("merged_date"),
  originalProviderId: integer("original_provider_id").references(() => users.id), // For individual provider accounts
  
  // Contact and administrative info
  primaryContact: text("primary_contact"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  
  // Regulatory
  npi: text("npi"),
  taxId: text("tax_id"),
  
  // Branding
  logoUrl: text("logo_url"),
  brandColors: jsonb("brand_colors").$type<{
    primary?: string;
    secondary?: string;
    accent?: string;
  }>(),
  
  // Subscription Key Management
  subscriptionLimits: jsonb("subscription_limits").$type<{
    providerKeys: number;
    staffKeys: number;
    totalUsers: number;
  }>().default({
    providerKeys: 0,
    staffKeys: 0,
    totalUsers: 0
  }),
  
  // Per-User Billing Tracking
  activeUserCount: jsonb("active_user_count").$type<{
    providers: number;
    clinicalStaff: number;
    adminStaff: number;
    lastUpdated: string;
  }>().default({
    providers: 0,
    clinicalStaff: 0,
    adminStaff: 0,
    lastUpdated: new Date().toISOString()
  }),
  
  billingDetails: jsonb("billing_details").$type<{
    monthlyTotal: number;
    providerRate: number;
    clinicalStaffRate: number;
    adminStaffRate: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    paymentMethodId?: string;
    lastBillingDate?: string;
    nextBillingDate?: string;
  }>().default({
    monthlyTotal: 0,
    providerRate: 399, // Default provider rate
    clinicalStaffRate: 99, // Default clinical staff rate
    adminStaffRate: 49, // Default admin staff rate
  }),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Regional/Area Organizations - e.g., "Ascension Waco", "Mayo Clinic Arizona"
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id), // Nullable for independent clinics
  
  name: text("name").notNull(), // "Ascension Waco"
  shortName: text("short_name"), // "Waco"
  organizationType: text("organization_type").notNull(), // 'regional_health', 'hospital', 'clinic_group', 'department'
  
  // Geographic info
  region: text("region"), // "Central Texas", "Greater Phoenix"
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  
  // Contact info
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  
  // Administrative
  npi: text("npi"),
  taxId: text("tax_id"),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Physical Locations - e.g., "Ascension Waco-Hillsboro", "Mayo Clinic Scottsdale-Main"
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id), // Nullable for direct health system locations
  healthSystemId: integer("health_system_id").references(() => healthSystems.id), // Can bypass organization
  
  name: text("name").notNull(), // "Hillsboro Family Medicine"
  shortName: text("short_name"), // "Hillsboro"
  locationType: text("location_type").notNull(), // 'clinic', 'hospital', 'urgent_care', 'specialty_center', 'outpatient_center'
  
  // Physical address
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  zip: text("zip"), // Legacy duplicate of zip_code
  
  // Contact
  phone: text("phone"),
  fax: text("fax"),
  email: text("email"),
  
  // Facility details
  facilityCode: text("facility_code"), // Internal code for billing/reporting
  npi: text("npi"),
  
  // Scheduling and capacity
  operatingHours: jsonb("operating_hours").$type<{
    monday?: { open: string; close: string; closed?: boolean };
    tuesday?: { open: string; close: string; closed?: boolean };
    wednesday?: { open: string; close: string; closed?: boolean };
    thursday?: { open: string; close: string; closed?: boolean };
    friday?: { open: string; close: string; closed?: boolean };
    saturday?: { open: string; close: string; closed?: boolean };
    sunday?: { open: string; close: string; closed?: boolean };
  }>(),
  
  // Features and capabilities
  services: text("services").array(), // ['primary_care', 'cardiology', 'lab', 'imaging']
  hasLab: boolean("has_lab").default(false),
  hasImaging: boolean("has_imaging").default(false),
  hasPharmacy: boolean("has_pharmacy").default(false),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Location Associations - Which providers work at which locations
export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  
  // Role at this location
  roleAtLocation: text("role_at_location").notNull(), // 'primary_provider', 'covering_provider', 'specialist', 'nurse', 'ma', 'staff'
  isPrimary: boolean("is_primary").default(false), // User's primary/home location
  
  // Schedule and availability
  workSchedule: jsonb("work_schedule").$type<{
    monday?: { start: string; end: string; unavailable?: boolean };
    tuesday?: { start: string; end: string; unavailable?: boolean };
    wednesday?: { start: string; end: string; unavailable?: boolean };
    thursday?: { start: string; end: string; unavailable?: boolean };
    friday?: { start: string; end: string; unavailable?: boolean };
    saturday?: { start: string; end: string; unavailable?: boolean };
    sunday?: { start: string; end: string; unavailable?: boolean };
  }>(),
  
  // Permissions at this location
  canSchedule: boolean("can_schedule").default(true),
  canViewAllPatients: boolean("can_view_all_patients").default(true), // vs only assigned patients
  canCreateOrders: boolean("can_create_orders").default(true),
  
  active: boolean("active").default(true),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Session Locations - Track which location user is "logged into"
export const userSessionLocations = pgTable("user_session_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull().references(() => locations.id),
  
  // Session info
  sessionId: text("session_id"), // If we want to track specific sessions
  selectedAt: timestamp("selected_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  
  // Remember preference
  rememberSelection: boolean("remember_selection").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Users (Healthcare professionals)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  
  // Multi-tenant association
  healthSystemId: integer("health_system_id").notNull().references(() => healthSystems.id),
  
  // Basic info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // 'admin', 'provider', 'nurse', 'ma', 'staff', 'front_desk', 'billing', 'lab_tech', 'referral_coordinator', 'practice_manager', 'read_only'
  
  // Professional details
  npi: text("npi").unique(),
  credentials: text("credentials"),
  specialties: text("specialties").array(),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"), // State where license is valid
  
  // Additional orphaned columns from database
  bio: text("bio"), // Professional biography
  profileImageUrl: text("profile_image_url"), // User profile picture URL
  isActive: boolean("is_active").default(true), // Legacy duplicate of active field
  
  // Email verification
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  
  // Security
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  accountStatus: text("account_status").default("active"),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  requirePasswordChange: boolean("require_password_change").default(false),
  
  // Subscription Key Verification
  verificationStatus: text("verification_status").default("unverified"), // 'unverified', 'verified', 'tier3_verified'
  verifiedWithKeyId: integer("verified_with_key_id"), // Will add reference after table creation
  verifiedAt: timestamp("verified_at"),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Interface Preferences
// Removed orphaned userPreferences table - chartPanelWidth moved to userNotePreferences

// User Clinical Note Templates - Example-Based Customization System
export const userNoteTemplates = pgTable("user_note_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Template identification
  templateName: text("template_name").notNull(), // e.g., "SOAP-DrSmith", "H&P-Cardiology"
  baseNoteType: text("base_note_type").notNull(), // 'soap', 'apso', 'progress', 'hAndP', 'discharge', 'procedure'
  displayName: text("display_name").notNull(), // User-friendly name for dropdown
  
  // Template ownership and sharing
  isPersonal: boolean("is_personal").default(true), // true = personal, false = shared
  isDefault: boolean("is_default").default(false), // User's default for this note type
  createdBy: integer("created_by").notNull().references(() => users.id),
  sharedBy: integer("shared_by").references(() => users.id), // If adopted from another user
  
  // Two-phase template system
  exampleNote: text("example_note").notNull(), // Complete sample note in preferred style (Phase 1)
  baseNoteText: text("base_note_text"), // Clean note text without comments (Phase 1 saved state)
  inlineComments: jsonb("inline_comments"), // Array of comment objects with position data (Phase 2)
  hasComments: boolean("has_comments").default(false), // Whether Phase 2 has been used
  
  // System-generated GPT prompt (hidden from user)
  generatedPrompt: text("generated_prompt").notNull(),
  promptVersion: integer("prompt_version").default(1), // For tracking prompt updates
  
  // AI Learning settings (Phase 2 preparation)
  enableAiLearning: boolean("enable_ai_learning").default(true),
  learningConfidence: decimal("learning_confidence", { precision: 3, scale: 2 }).default("0.75"),
  lastLearningUpdate: timestamp("last_learning_update"),
  
  // Usage statistics
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Version control
  version: integer("version").default(1),
  parentTemplateId: integer("parent_template_id").references(() => userNoteTemplates.id), // For template copies
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template Sharing System
export const templateShares = pgTable("template_shares", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => userNoteTemplates.id, { onDelete: "cascade" }),
  sharedBy: integer("shared_by").notNull().references(() => users.id),
  sharedWith: integer("shared_with").notNull().references(() => users.id),
  
  // Sharing status
  status: text("status").default("pending"), // 'pending', 'accepted', 'declined', 'revoked'
  sharedAt: timestamp("shared_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  
  // Optional message
  shareMessage: text("share_message"),
  
  // Access control
  canModify: boolean("can_modify").default(false), // Future feature for collaborative templates
  
  active: boolean("active").default(true),
});

// Template Version History (for compliance and rollback)
export const templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => userNoteTemplates.id, { onDelete: "cascade" }),
  
  // Version details
  versionNumber: integer("version_number").notNull(),
  changeDescription: text("change_description"),
  changedBy: integer("changed_by").notNull().references(() => users.id),
  
  // Snapshot of template at this version
  exampleNoteSnapshot: text("example_note_snapshot").notNull(),
  generatedPromptSnapshot: text("generated_prompt_snapshot").notNull(),
  
  // Metadata
  changeType: text("change_type").default("manual"), // 'manual', 'ai_learning', 'system_update'
  createdAt: timestamp("created_at").defaultNow(),
});

// User Preferences for Note Templates
export const userNotePreferences = pgTable("user_note_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Default templates for each note type
  defaultSoapTemplate: integer("default_soap_template").references(() => userNoteTemplates.id),
  defaultApsoTemplate: integer("default_apso_template").references(() => userNoteTemplates.id),
  defaultProgressTemplate: integer("default_progress_template").references(() => userNoteTemplates.id),
  defaultHAndPTemplate: integer("default_h_and_p_template").references(() => userNoteTemplates.id),
  defaultDischargeTemplate: integer("default_discharge_template").references(() => userNoteTemplates.id),
  defaultProcedureTemplate: integer("default_procedure_template").references(() => userNoteTemplates.id),
  
  // Last selected built-in note type
  lastSelectedNoteType: text("last_selected_note_type").default("soap"), // 'soap', 'soapNarrative', 'soapPsychiatric', 'soapPediatric', 'apso', 'progress', 'hAndP', 'discharge', 'procedure'
  
  // Global AI learning preferences
  globalAiLearning: boolean("global_ai_learning").default(true),
  learningAggressiveness: text("learning_aggressiveness").default("moderate"), // 'conservative', 'moderate', 'aggressive'
  
  // UI preferences
  rememberLastTemplate: boolean("remember_last_template").default(true),
  showTemplatePreview: boolean("show_template_preview").default(true),
  autoSaveChanges: boolean("auto_save_changes").default(true),
  
  // Medical Problems Display preferences
  medicalProblemsDisplayThreshold: integer("medical_problems_display_threshold").default(100), // Percentage (1-100)
  
  // Medical Problems Ranking Weight preferences (percentages that sum to 100)
  rankingWeights: jsonb("ranking_weights").default({
    "clinical_severity": 40,      // Clinical severity & immediacy weight
    "treatment_complexity": 30,   // Treatment complexity & follow-up needs weight
    "patient_frequency": 20,      // Patient-specific frequency & impact weight
    "clinical_relevance": 10      // Current clinical relevance weight
  }).$type<{
    clinical_severity: number;
    treatment_complexity: number;
    patient_frequency: number;
    clinical_relevance: number;
  }>(),
  
  // Chart panel UI preferences
  chartPanelWidth: integer("chart_panel_width").default(400),
  
  // Dense view toggle for all chart sections
  enableDenseView: boolean("enable_dense_view").default(false),
  
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
  
  // Multi-tenant isolation - CRITICAL for data security
  healthSystemId: integer("health_system_id").notNull().references(() => healthSystems.id),
  
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"), // Middle name or initial
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  contactNumber: text("contact_number"),
  email: text("email"),
  address: text("address"),
  
  // Additional orphaned address fields
  city: text("city"),
  state: text("state"),
  zip: text("zip"), // Legacy zip code field
  
  // Contact details
  phone: text("phone"), // Legacy duplicate of contactNumber
  phoneType: text("phone_type"), // mobile, home, work
  
  // Emergency contact - expanded fields
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  
  // Demographics and preferences
  preferredLanguage: text("preferred_language").default("English"),
  race: text("race"),
  ethnicity: text("ethnicity"),
  
  // Location Associations
  preferredLocationId: integer("preferred_location_id").references(() => locations.id), // Patient's home/primary location
  primaryProviderId: integer("primary_provider_id").references(() => users.id), // PCP assignment
  
  // Insurance and Registration
  insurancePrimary: text("insurance_primary"),
  insuranceSecondary: text("insurance_secondary"),
  
  // Insurance Fields
  policyNumber: text("policy_number"),
  groupNumber: text("group_number"),
  insuranceProvider: text("insurance_provider"), // Legacy insurance provider name
  insuranceVerified: boolean("insurance_verified").default(false), // Insurance verification status
  
  // External system reference
  externalId: text("external_id"), // External system patient ID
  
  // Consent tracking  
  consentGiven: boolean("consent_given").default(false), // General consent flag
  
  // Voice workflow optimization
  assistantId: text("assistant_id"), // Patient-specific OpenAI assistant ID
  assistantThreadId: text("assistant_thread_id"),
  lastChartSummary: text("last_chart_summary"),
  chartLastUpdated: timestamp("chart_last_updated"),
  
  // Clinical flags
  activeProblems: jsonb("active_problems").default([]),
  criticalAlerts: jsonb("critical_alerts").default([]),
  
  // Data Origin Tracking for HIPAA Compliance
  dataOriginType: text("data_origin_type").default("emr_direct"), // 'emr_direct', 'provider_scribe', 'external_import'
  originalFacilityId: integer("original_facility_id").references(() => healthSystems.id), // Where patient was originally seen
  createdByProviderId: integer("created_by_provider_id").references(() => users.id), // Provider who created the record
  creationContext: text("creation_context"), // 'clinic_hours', 'hospital_rounds', 'private_practice'
  derivativeWorkNote: text("derivative_work_note"), // Documentation about derivative work created
  
  // Migration and Consent Tracking
  migrationConsent: jsonb("migration_consent").$type<{
    consentGiven: boolean;
    consentDate?: string;
    consentMethod?: string; // 'email', 'in_person', 'portal'
    consentDocumentId?: string;
    excludedFromMigration?: boolean;
  }>().default({ consentGiven: false }),
  
  profilePhotoFilename: text("profile_photo_filename"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// ADVANCED AI SCHEDULING SYSTEM
// ==========================================

// Scheduling AI Configuration - Global factors that can be measured
export const schedulingAiFactors = pgTable("scheduling_ai_factors", {
  id: serial("id").primaryKey(),
  factorCategory: text("factor_category").notNull(), // 'patient', 'provider', 'visit', 'environmental', 'operational', 'dynamic'
  factorName: text("factor_name").notNull().unique(), // 'problem_count', 'medication_count', 'no_show_risk', etc.
  factorDescription: text("factor_description").notNull(),
  dataType: text("data_type").notNull(), // 'number', 'boolean', 'percentage', 'time_series'
  
  // Default configuration
  defaultEnabled: boolean("default_enabled").default(true),
  defaultWeight: decimal("default_weight", { precision: 5, scale: 2 }).default("50.00"), // 0-100
  
  // Calculation method
  calculationMethod: text("calculation_method"), // SQL query or function name
  sourceTable: text("source_table"), // Where data comes from
  updateFrequency: text("update_frequency"), // 'realtime', 'hourly', 'daily', 'weekly'
  
  // Impact on duration
  impactDirection: text("impact_direction"), // 'increase', 'decrease', 'both'
  maxImpactMinutes: integer("max_impact_minutes"), // Maximum minutes this factor can add/subtract
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Factor Weights - Per provider/location customization
export const schedulingAiWeights = pgTable("scheduling_ai_weights", {
  id: serial("id").primaryKey(),
  factorId: integer("factor_id").references(() => schedulingAiFactors.id), // Made nullable since DB uses factor_name
  factorName: text("factor_name"), // Database has this instead of factor_id
  
  // Scope (can be provider-specific, location-specific, or health system wide)
  providerId: integer("provider_id").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  // Customized settings
  enabled: boolean("enabled"), // Made nullable to match database
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(), // 0-100
  isActive: boolean("is_active").default(true), // Database has this column
  
  // Override calculation parameters
  customParameters: jsonb("custom_parameters").$type<{
    threshold?: number;
    multiplier?: number;
    minValue?: number;
    maxValue?: number;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(), // Database has this column
});

// Patient Scheduling Patterns - AI learning data per patient
export const patientSchedulingPatterns = pgTable("patient_scheduling_patterns", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  
  // Historical patterns
  avgVisitDuration: decimal("avg_visit_duration", { precision: 5, scale: 2 }), // minutes
  avgDurationByType: jsonb("avg_duration_by_type").$type<Record<string, number>>(), // {annual: 45, follow_up: 22}
  visitDurationStdDev: decimal("visit_duration_std_dev", { precision: 5, scale: 2 }),
  
  // Arrival patterns
  avgArrivalDelta: decimal("avg_arrival_delta", { precision: 5, scale: 2 }), // minutes early/late (negative = early)
  arrivalConsistency: decimal("arrival_consistency", { precision: 5, scale: 2 }), // 0-100 score
  
  // No-show patterns
  noShowRate: decimal("no_show_rate", { precision: 5, scale: 2 }), // percentage
  noShowByDayOfWeek: jsonb("no_show_by_day_of_week").$type<Record<string, number>>(),
  noShowByTimeOfDay: jsonb("no_show_by_time_of_day").$type<Record<string, number>>(),
  lastNoShowDate: date("last_no_show_date"),
  
  // Communication patterns
  preferredReminderTime: integer("preferred_reminder_time"), // hours before appointment
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }), // percentage
  preferredContactMethod: text("preferred_contact_method"), // 'sms', 'email', 'phone', 'portal'
  
  // Complexity indicators
  avgQuestionCount: decimal("avg_question_count", { precision: 5, scale: 2 }), // from transcripts
  portalMessageFrequency: decimal("portal_message_frequency", { precision: 5, scale: 2 }), // messages per month
  
  // Special considerations
  requiresInterpreter: boolean("requires_interpreter").default(false),
  mobilityIssues: boolean("mobility_issues").default(false),
  cognitiveConsiderations: boolean("cognitive_considerations").default(false),
  
  lastCalculated: timestamp("last_calculated").defaultNow(),
});

// Provider Scheduling Patterns - AI learning data per provider
export const providerSchedulingPatterns = pgTable("provider_scheduling_patterns", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  locationId: integer("location_id").references(() => locations.id), // Can be location-specific
  
  // Performance metrics
  avgVisitDuration: decimal("avg_visit_duration", { precision: 5, scale: 2 }),
  avgDurationByType: jsonb("avg_duration_by_type").$type<Record<string, number>>(),
  avgDurationByHour: jsonb("avg_duration_by_hour").$type<Record<string, number>>(), // Performance by hour of day
  
  // Efficiency patterns
  avgTransitionTime: decimal("avg_transition_time", { precision: 5, scale: 2 }), // Time between patients
  documentationLag: decimal("documentation_lag", { precision: 5, scale: 2 }), // Minutes to complete notes
  
  // Schedule adherence
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }),
  avgRunningBehind: decimal("avg_running_behind", { precision: 5, scale: 2 }), // minutes
  catchUpPatterns: jsonb("catch_up_patterns").$type<{
    morningCatchUp?: boolean;
    lunchCatchUp?: boolean;
    afternoonSlowdown?: boolean;
  }>(),
  
  // Workload preferences
  preferredPatientLoad: integer("preferred_patient_load"), // per day
  maxComplexVisits: integer("max_complex_visits"), // per day
  bufferPreferences: jsonb("buffer_preferences").$type<{
    afterComplexVisit?: number;
    beforeLunch?: number;
    endOfDay?: number;
  }>(),
  
  lastCalculated: timestamp("last_calculated").defaultNow(),
});

// Appointment Duration History - Actual vs predicted for AI learning
export const appointmentDurationHistory = pgTable("appointment_duration_history", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  
  // Predictions
  aiPredictedDuration: integer("ai_predicted_duration").notNull(), // minutes
  providerScheduledDuration: integer("provider_scheduled_duration").notNull(), // What provider actually scheduled
  patientVisibleDuration: integer("patient_visible_duration").notNull(), // What patient saw
  
  // Actuals
  actualDuration: integer("actual_duration"), // Actual visit duration
  actualArrivalDelta: integer("actual_arrival_delta"), // Minutes early/late
  
  // Factors used in prediction
  factorsUsed: jsonb("factors_used").$type<Array<{
    factorId: number;
    factorName: string;
    value: number;
    weight: number;
    impact: number; // minutes added/subtracted
  }>>(),
  
  // Feedback for learning
  predictionAccuracy: decimal("prediction_accuracy", { precision: 5, scale: 2 }), // percentage
  providerFeedback: text("provider_feedback"), // 'too_short', 'too_long', 'just_right'
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduling Templates - For non-AI traditional scheduling
export const schedulingTemplates = pgTable("scheduling_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Scope
  providerId: integer("provider_id").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  // Template configuration
  slotDuration: integer("slot_duration").notNull(), // 15, 20, 30 minutes
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "17:00"
  
  // Breaks and buffers
  lunchStart: text("lunch_start"),
  lunchDuration: integer("lunch_duration"), // minutes
  bufferBetweenAppts: integer("buffer_between_appts").default(0),
  
  // Rules
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  maxPatientsPerDay: integer("max_patients_per_day"),
  
  // Days of week (stored as array of integers 0-6)
  daysOfWeek: integer("days_of_week").array(),
  
  isDefault: boolean("is_default").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Resource Requirements - What resources appointments need
export const appointmentResourceRequirements = pgTable("appointment_resource_requirements", {
  id: serial("id").primaryKey(),
  appointmentTypeId: integer("appointment_type_id"), // Reference to appointment types table
  
  // Resources needed
  requiresRoom: boolean("requires_room").default(true),
  roomType: text("room_type"), // 'exam', 'procedure', 'consult'
  requiresEquipment: text("requires_equipment").array(), // ['ekg', 'spirometer', 'ultrasound']
  requiresStaff: jsonb("requires_staff").$type<Array<{
    role: string;
    duration: number; // minutes needed
    timing: string; // 'before', 'during', 'after'
  }>>(),
  
  // Time requirements
  prepTime: integer("prep_time").default(0), // minutes before
  cleanupTime: integer("cleanup_time").default(0), // minutes after
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduling Rules - Business rules and constraints
export const schedulingRules = pgTable("scheduling_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(), // 'constraint', 'preference', 'requirement'
  
  // Scope
  providerId: integer("provider_id").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  // Rule configuration
  ruleConfig: jsonb("rule_config").$type<{
    minDuration?: number;
    maxDuration?: number;
    allowedTypes?: string[];
    restrictedTimes?: Array<{day: number; start: string; end: string}>;
    maxPerDay?: number;
    requiresApproval?: boolean;
  }>(),
  
  priority: integer("priority").default(0), // Higher = more important
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Appointment Types - Define visit types and their default durations
export const appointmentTypes = pgTable("appointment_types", {
  id: serial("id").primaryKey(),
  
  // Scope
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  locationId: integer("location_id").references(() => locations.id),
  
  // Type details
  typeName: text("type_name").notNull(), // 'new_patient', 'follow_up', 'annual_physical', etc.
  typeCode: text("type_code").notNull(), // Short code for scheduling
  category: text("category").notNull(), // 'routine', 'acute', 'preventive', 'procedure'
  
  // Duration configuration
  defaultDuration: integer("default_duration").notNull(), // minutes
  minDuration: integer("min_duration").notNull(),
  maxDuration: integer("max_duration").notNull(),
  
  // Scheduling rules
  allowOnlineScheduling: boolean("allow_online_scheduling").default(true),
  requiresPreAuth: boolean("requires_pre_auth").default(false),
  requiresSpecialPrep: boolean("requires_special_prep").default(false),
  prepInstructions: text("prep_instructions"),
  
  // Resource requirements
  defaultResourceRequirements: jsonb("default_resource_requirements").$type<{
    roomType?: string;
    equipment?: string[];
    staffSupport?: Array<{role: string; duration: number}>;
  }>(),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedule Preferences - Provider preferences for their schedule
export const schedulePreferences = pgTable("schedule_preferences", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id).unique(),
  
  // AI vs Template preference
  useAiScheduling: boolean("use_ai_scheduling").default(true),
  aiAggressiveness: decimal("ai_aggressiveness", { precision: 5, scale: 2 }).default("50.00"), // 0-100
  
  // Time preferences
  preferredStartTime: text("preferred_start_time"), // "08:00"
  preferredEndTime: text("preferred_end_time"), // "17:00"
  preferredLunchTime: text("preferred_lunch_time"),
  preferredLunchDuration: integer("preferred_lunch_duration"), // minutes
  
  // Patient load preferences
  idealPatientsPerDay: integer("ideal_patients_per_day"),
  maxPatientsPerDay: integer("max_patients_per_day"),
  preferredBufferMinutes: integer("preferred_buffer_minutes").default(5),
  
  // Complex visit handling
  maxComplexVisitsPerDay: integer("max_complex_visits_per_day"),
  complexVisitSpacing: text("complex_visit_spacing"), // 'spread_out', 'morning', 'afternoon'
  
  // Double booking preferences
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  doubleBookingRules: jsonb("double_booking_rules").$type<{
    allowedTypes?: string[];
    maxPerDay?: number;
    requiresApproval?: boolean;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asymmetric Scheduling Configuration - Patient vs Provider view
export const asymmetricSchedulingConfig = pgTable("asymmetric_scheduling_config", {
  id: serial("id").primaryKey(),
  
  // Scope
  providerId: integer("provider_id").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  // Configuration
  enabled: boolean("enabled").default(true),
  patientMinDuration: integer("patient_min_duration").default(20), // What patient sees minimum
  providerMinDuration: integer("provider_min_duration").default(10), // What provider sees minimum
  roundingInterval: integer("rounding_interval").default(10), // Round to nearest X minutes
  
  // Buffer rules
  defaultBufferMinutes: integer("default_buffer_minutes").default(0),
  bufferForChronicPatients: integer("buffer_for_chronic_patients").default(10),
  bufferThresholdProblemCount: integer("buffer_threshold_problem_count").default(5),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Real-time Schedule Adjustments - Track running behind/ahead
export const realtimeScheduleStatus = pgTable("realtime_schedule_status", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  scheduleDate: date("schedule_date").notNull(),
  
  // Current status
  currentPatientId: integer("current_patient_id").references(() => patients.id),
  currentAppointmentId: integer("current_appointment_id").references(() => appointments.id),
  runningBehindMinutes: integer("running_behind_minutes").default(0),
  
  // Tracking
  lastUpdateTime: timestamp("last_update_time").defaultNow(),
  dayStartedAt: timestamp("day_started_at"),
  estimatedCatchUpTime: text("estimated_catch_up_time"),
  
  // AI recommendations
  aiRecommendations: jsonb("ai_recommendations").$type<Array<{
    type: string; // 'reschedule', 'double_book', 'extend_hours', 'delegate'
    affectedAppointments: number[];
    reasoning: string;
    priority: number;
  }>>(),
});

// Resource Management - Rooms and equipment
export const schedulingResources = pgTable("scheduling_resources", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  
  // Resource details
  resourceType: text("resource_type").notNull(), // 'room', 'equipment', 'staff'
  resourceName: text("resource_name").notNull(),
  resourceCode: text("resource_code"),
  
  // Capabilities
  capabilities: text("capabilities").array(), // ['exam', 'procedure', 'xray']
  capacity: integer("capacity").default(1), // How many can use simultaneously
  
  // Scheduling rules
  requiresCleaningMinutes: integer("requires_cleaning_minutes").default(0),
  maintenanceSchedule: jsonb("maintenance_schedule").$type<{
    frequency?: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
  }>(),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Resource Bookings - Track resource usage
export const resourceBookings = pgTable("resource_bookings", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => schedulingResources.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  
  // Booking details
  bookingDate: date("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  
  // Status
  status: text("status").default("reserved"), // 'reserved', 'in_use', 'cleaning', 'available'
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Intelligent Scheduling System with GPT Integration
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  
  // Appointment timing
  appointmentDate: date("appointment_date").notNull(),
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "09:30"
  duration: integer("duration").notNull(), // minutes
  
  // Asymmetric scheduling
  patientVisibleDuration: integer("patient_visible_duration"), // What patient sees
  providerScheduledDuration: integer("provider_scheduled_duration"), // What provider has blocked
  
  // Appointment details
  appointmentType: text("appointment_type").notNull(), // 'new_patient', 'follow_up', 'annual_physical', 'urgent', 'telehealth'
  appointmentTypeId: integer("appointment_type_id").references(() => appointmentTypes.id), // Database has this column
  chiefComplaint: text("chief_complaint"),
  visitReason: text("visit_reason"),
  
  // Status and workflow
  status: text("status").default("scheduled"), // 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'
  confirmationStatus: text("confirmation_status").default("pending"), // 'pending', 'confirmed', 'declined'
  
  // Check-in and workflow
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: integer("checked_in_by").references(() => users.id),
  roomAssignment: text("room_assignment"),
  
  // Scheduling intelligence
  urgencyLevel: text("urgency_level").default("routine"), // 'stat', 'urgent', 'routine', 'elective'
  schedulingNotes: text("scheduling_notes"),
  patientPreferences: jsonb("patient_preferences").$type<{
    preferredTimes?: string[];
    avoidTimes?: string[];
    specialRequests?: string;
    languageNeeds?: string;
    accessibilityNeeds?: string;
  }>(),
  
  // GPT Scheduling Intelligence
  aiSchedulingData: jsonb("ai_scheduling_data").$type<{
    recommendedDuration?: number;
    suggestedPrep?: string[];
    anticipatedNeeds?: string[];
    complexityScore?: number;
    followUpSuggestions?: string[];
    riskFactors?: string[];
  }>(),
  
  // Communication and reminders
  remindersSent: integer("reminders_sent").default(0),
  lastReminderSent: timestamp("last_reminder_sent"),
  communicationPreferences: jsonb("communication_preferences").$type<{
    reminders?: boolean;
    smsReminders?: boolean;
    emailReminders?: boolean;
    callReminders?: boolean;
    portalNotifications?: boolean;
  }>(),
  
  // External integration
  externalAppointmentId: text("external_appointment_id"), // For EMR integrations
  syncedAt: timestamp("synced_at"),
  
  // Billing and insurance
  insuranceVerified: boolean("insurance_verified").default(false),
  verifiedBy: integer("verified_by").references(() => users.id),
  copayAmount: decimal("copay_amount", { precision: 10, scale: 2 }),
  
  // Additional orphaned columns from database
  actualDuration: integer("actual_duration"),
  aiPredictedDuration: integer("ai_predicted_duration"),
  billingNotes: text("billing_notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by").references(() => users.id),
  chartReviewed: boolean("chart_reviewed").default(false),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  confirmationSent: boolean("confirmation_sent").default(false),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  copayCollected: boolean("copay_collected").default(false),
  durationMinutes: integer("duration_minutes"),
  formsCompleted: boolean("forms_completed").default(false),
  imagesReviewed: boolean("images_reviewed").default(false),
  insuranceVerificationNotes: text("insurance_verification_notes"),
  intakeCompletedAt: timestamp("intake_completed_at"),
  interpreterLanguage: text("interpreter_language"),
  interpreterNeeded: boolean("interpreter_needed").default(false),
  labsReviewed: boolean("labs_reviewed").default(false),
  lateCancellationReason: text("late_cancellation_reason"),
  medicationsReconciled: boolean("medications_reconciled").default(false),
  noShowReason: text("no_show_reason"),
  notes: text("notes"),
  parentAppointmentId: integer("parent_appointment_id").references(() => appointments.id),
  patientConfirmed: boolean("patient_confirmed").default(false),
  patientConfirmedAt: timestamp("patient_confirmed_at"),
  postAppointmentNotes: text("post_appointment_notes"),
  preAppointmentNotes: text("pre_appointment_notes"),
  problemsReviewed: boolean("problems_reviewed").default(false),
  providerReadyAt: timestamp("provider_ready_at"),
  recurrenceExceptions: jsonb("recurrence_exceptions").default([]),
  recurrenceRule: text("recurrence_rule"),
  referralReason: text("referral_reason"),
  referringProvider: text("referring_provider"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  rescheduledFrom: integer("rescheduled_from").references(() => appointments.id),
  rescheduledReason: text("rescheduled_reason"),
  resourceRequirements: jsonb("resource_requirements").default({}),
  roomNumber: text("room_number"),
  specialInstructions: text("special_instructions"),
  tags: jsonb("tags").default([]),
  useAiScheduling: boolean("use_ai_scheduling").default(true),
  visitCompletedAt: timestamp("visit_completed_at"),
  vitalSignsTaken: boolean("vital_signs_taken").default(false),
  waitListPriority: integer("wait_list_priority"),
  wheelchairAccessible: boolean("wheelchair_accessible").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Provider Schedules and Availability
export const providerSchedules = pgTable("provider_schedules", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull().references(() => locations.id),
  
  // Schedule pattern
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "17:00"
  
  // Schedule type and rules
  scheduleType: text("schedule_type").notNull(), // 'regular', 'block', 'on_call', 'vacation', 'conference'
  appointmentTypes: text("appointment_types").array(), // Types of appointments this schedule supports
  
  // Availability settings
  slotDuration: integer("slot_duration").default(30), // Default appointment duration in minutes
  bufferTime: integer("buffer_time").default(0), // Minutes between appointments
  maxConcurrentAppts: integer("max_concurrent_appts").default(1),
  
  // Booking rules
  advanceBookingDays: integer("advance_booking_days").default(365), // How far in advance patients can book
  cancelationPolicyHours: integer("cancelation_policy_hours").default(24),
  
  // Special considerations
  isAvailableForUrgent: boolean("is_available_for_urgent").default(true),
  allowDoubleBooking: boolean("allow_double_booking").default(false),
  requiresReferral: boolean("requires_referral").default(false),
  
  // Date range (for temporary schedules)
  effectiveFrom: date("effective_from"),
  effectiveUntil: date("effective_until"),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedule Exceptions (holidays, time off, blocks)
export const scheduleExceptions = pgTable("schedule_exceptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locations.id), // Nullable for system-wide exceptions
  
  // Exception timing
  exceptionDate: date("exception_date").notNull(),
  startTime: text("start_time"), // Nullable for all-day exceptions
  endTime: text("end_time"),
  
  // Exception details
  exceptionType: text("exception_type").notNull(), // 'vacation', 'conference', 'holiday', 'block', 'emergency', 'sick'
  reason: text("reason"),
  
  // Impact on appointments
  cancelsExistingAppts: boolean("cancels_existing_appts").default(false),
  allowsEmergencyOverride: boolean("allows_emergency_override").default(true),
  
  // Recurring exceptions (yearly holidays, etc.)
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // 'yearly', 'monthly', 'weekly'
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Appointments table moved to enhanced scheduling section above

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
  nurseNotes: text("nurse_notes"), // Generated summary from nursing template assessment
  
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
  
  // Critical missing columns from database (actively used)
  encounterDate: timestamp("encounter_date"), // Encounter date (58 references)
  templateId: integer("template_id"), // Note templates (56 references)
  signedBy: integer("signed_by").references(() => users.id), // Provider signature (16 references)
  visitReason: text("visit_reason"), // Chief complaint alias (26 references)
  notes: text("notes"), // Clinical notes (444 references - CRITICAL!)
  locationId: integer("location_id").references(() => locations.id), // Clinic location (113 references)
  
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
  relationship: text("relationship").notNull(), // 'father', 'mother', 'brother', 'sister', 'son', 'daughter', 'grandmother', 'grandfather'
  condition: text("condition"), // Changed from medical_history to match database - "DM2, h/o CAD, died of MI at age 70"
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  
  // Visit history tracking for family history updates over time
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string; // Medical event date
    notes: string; // Visit notes about family history changes
    source: "encounter" | "attachment" | "manual" | "imported_record";
    encounterId?: number;
    attachmentId?: number;
    providerId?: number;
    providerName?: string;
    changesMade?: string[]; // What was updated in this visit
    confidence?: number;
    isSigned?: boolean;
    signedAt?: string;
    sourceConfidence?: number;
    sourceNotes?: string;
  }>>(),
  
  // Source tracking for multi-source family history data
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'patient_reported', 'family_reported', 'imported_records'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  sourceNotes: text("notes"), // Additional context about data source - maps to 'notes' column in database
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Reference to source attachment
  // enteredBy column doesn't exist in database
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical History
export const medicalHistory = pgTable("medical_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  conditionCategory: text("condition_category").notNull(), // 'cardiac', 'endocrine', 'surgical'
  historyText: text("history_text").notNull(),
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  
  // Source tracking for multi-source medical history data
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'patient_reported', 'provider_verified', 'imported_records'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  sourceNotes: text("source_notes"), // Additional context about data source
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Reference to source attachment
  enteredBy: integer("entered_by").references(() => users.id), // Who entered the data
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social History
export const socialHistory = pgTable("social_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  category: text("category").notNull(), // 'smoking', 'alcohol', 'occupation', 'exercise', 'diet', 'sexual_history', 'living_situation', 'recreational_drugs'
  details: text("details").notNull(), // Required by database
  currentStatus: text("current_status").notNull(),
  historyNotes: text("history_notes"),
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  
  // Source tracking for multi-source social history data
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'patient_reported', 'provider_observed', 'imported_records'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Reference to source attachment
  enteredBy: integer("entered_by").references(() => users.id), // Who entered the data
  
  // GPT processing metadata
  consolidationReasoning: text("consolidation_reasoning"), // GPT's explanation for consolidation decisions
  extractionNotes: text("extraction_notes"), // GPT's notes about extraction process
  
  // Visit history tracking - comprehensive change tracking system
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string; // YYYY-MM-DD format
    notes: string; // Clinical notes about social history discussion/changes
    source: "encounter" | "attachment" | "manual" | "imported_record";
    encounterId?: number; // Reference to encounter if source is encounter
    attachmentId?: number; // Reference to attachment if source is attachment
    providerId?: number;
    providerName?: string;
    changesMade?: string[]; // Array of changes made (e.g., 'status_updated', 'quantity_changed', 'quit_date_added')
    confidence?: number; // AI confidence in extraction (0.0-1.0)
    isSigned?: boolean; // Provider signature status
    signedAt?: string;
    sourceConfidence?: number;
    sourceNotes?: string; // Additional context from extraction source
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Surgical History - Production EMR Standard
export const surgicalHistory = pgTable("surgical_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Core surgical information (EMR Standard Fields)
  procedureName: text("procedure_name").notNull(),
  procedureDate: date("procedure_date"),
  surgeonName: text("surgeon_name"),
  facilityName: text("facility_name"),
  indication: text("indication"), // Reason for surgery
  
  // Clinical details
  complications: text("complications"),
  anesthesiaType: text("anesthesia_type"), // 'general', 'local', 'regional', 'MAC', 'spinal'
  
  // Medical coding integration (Production EMR standard)
  cptCode: text("cpt_code"),
  icd10ProcedureCode: text("icd10_procedure_code"),
  
  // Additional clinical details
  anatomicalSite: text("anatomical_site"),
  laterality: text("laterality"), // 'left', 'right', 'bilateral', 'midline'
  urgencyLevel: text("urgency_level"), // 'elective', 'urgent', 'emergent'
  lengthOfStay: text("length_of_stay"), // 'outpatient', '1 day', '3 days', etc.
  
  // Advanced surgical details
  bloodLoss: text("blood_loss"),
  transfusionsRequired: boolean("transfusions_required").default(false),
  implantsHardware: text("implants_hardware"),
  followUpRequired: text("follow_up_required"),
  recoveryStatus: text("recovery_status"), // 'complete', 'ongoing', 'complicated', 'unknown'
  
  // Source tracking (same pattern as medical problems/medical history)
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'operative_report', 'discharge_summary', 'imported_records'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Reference to source attachment
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  enteredBy: integer("entered_by").references(() => users.id), // Who entered the data
  
  // GPT processing metadata
  consolidationReasoning: text("consolidation_reasoning"), // GPT's explanation for consolidation decisions
  extractionNotes: text("extraction_notes"), // GPT's notes about extraction process
  
  // Visit history tracking - similar to medical problems system
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string; // YYYY-MM-DD format
    notes: string; // Clinical notes about surgery discussion/follow-up
    source: "encounter" | "attachment"; // Source of this visit entry
    encounterId?: number; // Reference to encounter if source is encounter
    attachmentId?: number; // Reference to attachment if source is attachment
    changesMade?: string[]; // Array of changes made (e.g., 'date_corrected', 'surgeon_updated', 'complications_noted')
    confidence?: number; // AI confidence in extraction (0.0-1.0)
    isSigned?: boolean; // Provider signature status
    sourceNotes?: string; // Additional context from extraction source
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Allergies - Production EMR Standard with Visit History
export const allergies = pgTable("allergies", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Core allergy information
  allergen: text("allergen").notNull(),
  reaction: text("reaction"), // GPT-formatted: "rash, hives" or "anaphylaxis" or free-text
  severity: text("severity"), // 'mild', 'moderate', 'severe', 'life-threatening', 'unknown'
  allergyType: text("allergy_type"), // 'drug', 'food', 'environmental', 'contact', 'other'
  
  // Clinical details
  onsetDate: date("onset_date"), // When allergy first occurred
  lastReactionDate: date("last_reaction_date"), // Most recent reaction
  status: text("status").default("active"), // 'active', 'inactive', 'resolved', 'unconfirmed'
  verificationStatus: text("verification_status").default("unconfirmed"), // 'confirmed', 'unconfirmed', 'refuted', 'entered_in_error'
  
  // Cross-reference for drug safety
  drugClass: text("drug_class"), // For drug allergies (e.g., 'penicillins', 'sulfonamides')
  crossReactivity: text("cross_reactivity").array(), // Related allergens to avoid
  
  // Additional orphaned columns from database
  encounterId: integer("encounter_id").references(() => encounters.id), // Specific encounter where allergy was documented
  notes: text("notes"), // Additional clinical notes
  reactionType: text("reaction_type"), // Classification of reaction type
  verifiedBy: integer("verified_by").references(() => users.id), // Who verified this allergy
  verifiedAt: timestamp("verified_at"), // When was it verified
  sourceTimestamp: timestamp("source_timestamp"), // When was the source data created
  lastReaction: date("last_reaction"), // Legacy duplicate of lastReactionDate
  mergedIds: integer("merged_ids").array(), // IDs of allergies that were merged into this one
  
  // Source tracking for multi-source allergy data
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'patient_reported', 'family_reported', 'imported_records', 'nkda_documented'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  sourceNotes: text("source_notes"), // Additional context about data source
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Reference to source attachment
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id),
  enteredBy: integer("entered_by").references(() => users.id), // Who entered the data
  
  // GPT processing metadata
  consolidationReasoning: text("consolidation_reasoning"), // GPT's explanation for consolidation decisions
  extractionNotes: text("extraction_notes"), // GPT's notes about extraction process
  temporalConflictResolution: text("temporal_conflict_resolution"), // How NKDA vs existing allergy conflicts were resolved
  
  // Visit history tracking - tracks allergy discussions, changes, confirmations over time
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string; // YYYY-MM-DD format
    notes: string; // Clinical notes about allergy discussion/changes
    source: "encounter" | "attachment" | "manual" | "imported_record";
    encounterId?: number; // Reference to encounter if source is encounter
    attachmentId?: number; // Reference to attachment if source is attachment
    providerId?: number;
    providerName?: string;
    changesMade?: string[]; // Array of changes made (e.g., 'severity_updated', 'reaction_confirmed', 'status_changed', 'nkda_conflict_resolved')
    confidence?: number; // AI confidence in extraction (0.0-1.0)
    isSigned?: boolean; // Provider signature status
    signedAt?: string;
    sourceConfidence?: number;
    sourceNotes?: string; // Additional context from extraction source
    conflictResolution?: string; // How temporal conflicts (NKDA vs allergy) were resolved
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Factual Data Tables (APPEND-only)

// Vitals
export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  recordedBy: text("recorded_by").notNull(),
  entryType: text("entry_type").notNull().default("routine"), // 'admission', 'routine', 'recheck', 'discharge', etc.
  
  // Vital signs
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
  
  // Additional vital fields from database
  bloodPressure: text("blood_pressure"), // Legacy text format
  bloodGlucose: integer("blood_glucose"),
  systolic: integer("systolic"), // Legacy duplicate fields
  diastolic: integer("diastolic"),
  bloodPressureSystolic: integer("blood_pressure_systolic"), // Legacy duplicates
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  
  // Additional data
  notes: text("notes"),
  parsedFromText: boolean("parsed_from_text").default(false),
  originalText: text("original_text"),
  processingNotes: text("processing_notes"),
  
  // Source tracking for multi-source vital data
  sourceType: text("source_type").default("manual_entry"), // 'manual_entry', 'attachment_extracted', 'soap_derived', 'device_imported', 'patient_reported', 'imported_records'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  sourceNotes: text("source_notes"), // Additional context about data source
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id),
  extractionNotes: text("extraction_notes"),
  consolidationReasoning: text("consolidation_reasoning"),
  mergedIds: integer("merged_ids").array(),
  visitHistory: jsonb("visit_history").default([]),
  enteredBy: integer("entered_by").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Electronic Signatures for e-prescribing compliance
export const electronicSignatures = pgTable("electronic_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id),
  
  // Signature data
  signatureType: text("signature_type").notNull(), // 'medication', 'encounter', 'lab', 'controlled_substance'
  signatureData: text("signature_data").notNull(), // Base64 encoded signature image or cryptographic signature
  signatureMethod: text("signature_method").notNull(), // 'drawn', 'typed', 'biometric', 'cryptographic'
  
  // Two-factor authentication for controlled substances
  twoFactorMethod: text("two_factor_method"), // 'sms', 'authenticator', 'biometric'
  twoFactorVerified: boolean("two_factor_verified").default(false),
  twoFactorTimestamp: timestamp("two_factor_timestamp"),
  
  // GPT-enhanced compliance tracking
  complianceChecks: jsonb("compliance_checks").default({}), // GPT-analyzed compliance requirements met
  deaComplianceLevel: text("dea_compliance_level"), // 'standard', 'epcs_ready', 'epcs_verified'
  
  // Audit trail
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // For time-limited signatures
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Pharmacy Master Data for e-prescribing
export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  
  // Core identification
  ncpdpId: text("ncpdp_id").unique(), // NCPDP Provider ID (7 digits) - optional for Google Places pharmacies
  npi: text("npi"), // National Provider Identifier (10 digits)
  deaNumber: text("dea_number"), // DEA registration number
  googlePlaceId: text("google_place_id").unique(), // Google Places ID for organic pharmacy database building
  
  // Pharmacy details
  name: text("name").notNull(),
  dbaName: text("dba_name"), // Doing Business As name
  corporateName: text("corporate_name"), // Parent company
  
  // Location
  address: text("address").notNull(),
  address2: text("address2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Contact information
  phone: text("phone"), // Optional since Google Places might not have phone
  fax: text("fax"),
  email: text("email"),
  website: text("website"),
  
  // Hours and services
  hours: jsonb("hours").default({}), // {"monday": {"open": "09:00", "close": "18:00"}, ...}
  is24Hour: boolean("is_24_hour").default(false),
  services: text("services").array().default([]), // ['retail', 'compounding', 'specialty', 'mail_order']
  
  // E-prescribing capabilities
  acceptsEprescribing: boolean("accepts_eprescribing").default(true),
  acceptsControlledSubstances: boolean("accepts_controlled_substances").default(false),
  preferredTransmissionMethod: text("preferred_transmission_method").default("surescripts"), // 'surescripts', 'fax', 'phone'
  sureScriptsVersion: text("surescripts_version"), // '10.6', '6.0', etc.
  
  // GPT-enhanced pharmacy intelligence
  specialtyTypes: text("specialty_types").array().default([]), // ['oncology', 'pediatric', 'fertility']
  insuranceNetworks: jsonb("insurance_networks").default([]), // GPT-parsed accepted insurances
  preferredForConditions: text("preferred_for_conditions").array().default([]), // GPT recommendations
  
  // Status and metadata
  status: text("status").default("active"), // 'active', 'inactive', 'suspended'
  verificationStatus: text("verification_status").default("pending"), // 'pending', 'verified', 'failed'
  lastVerified: timestamp("last_verified"),
  
  // Multi-tenant support for production
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prescription Transmission Tracking
export const prescriptionTransmissions = pgTable("prescription_transmissions", {
  id: serial("id").primaryKey(),
  
  // References
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  electronicSignatureId: integer("electronic_signature_id").references(() => electronicSignatures.id),
  
  // Transmission details
  transmissionType: text("transmission_type").notNull(), // 'new_rx', 'refill', 'change', 'cancel'
  transmissionMethod: text("transmission_method").notNull(), // 'surescripts', 'fax', 'print', 'phone'
  messageId: text("message_id").unique(), // SureScripts message ID
  
  // NCPDP transaction data
  ncpdpTransactionId: text("ncpdp_transaction_id"),
  ncpdpVersion: text("ncpdp_version"), // 'SCRIPT 10.6', etc.
  ncpdpMessageType: text("ncpdp_message_type"), // 'NEWRX', 'RXFILL', 'RXCHG', 'CANRX'
  
  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending', 'queued', 'transmitted', 'accepted', 'rejected', 'error'
  statusHistory: jsonb("status_history").default([]), // Array of status changes with timestamps
  
  // Response data
  pharmacyResponse: jsonb("pharmacy_response").default({}), // Full response from pharmacy
  pharmacyNotes: text("pharmacy_notes"), // Human-readable notes from pharmacy
  
  // Error handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  // GPT-enhanced tracking
  gptAnalysis: jsonb("gpt_analysis").default({}), // GPT analysis of transmission issues
  gptRecommendations: text("gpt_recommendations").array().default([]), // GPT suggestions for resolution
  
  // Timestamps
  queuedAt: timestamp("queued_at"),
  transmittedAt: timestamp("transmitted_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Medications with EMR-standard fields
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id), // Nullable for attachment-based medications
  
  // Core medication info
  medicationName: text("medication_name").notNull(),
  brandName: text("brand_name"), // Trade name
  genericName: text("generic_name"), // Generic equivalent
  dosage: text("dosage").notNull(),
  strength: text("strength"), // Separated from dosage for standardization
  dosageForm: text("dosage_form"), // tablet, capsule, liquid, etc.
  route: text("route"), // 'oral', 'IV', 'topical', etc.
  
  // Prescription details
  frequency: text("frequency").notNull(),
  quantity: integer("quantity"), // Number of units
  quantityUnit: text("quantity_unit"), // GPT-determined unit (tablets, mL, units, pens, vials, etc.)
  daysSupply: integer("days_supply"), // Duration of prescription
  refillsRemaining: integer("refills_remaining"),
  totalRefills: integer("total_refills"),
  sig: text("sig"), // Patient instructions
  
  // Standardization codes
  rxNormCode: text("rxnorm_code"), // RxNorm concept ID
  ndcCode: text("ndc_code"), // National Drug Code
  sureScriptsId: text("surescripts_id"), // SureScripts identifier
  
  // Clinical context
  clinicalIndication: text("clinical_indication"), // Why prescribed
  
  // Two-phase workflow support
  sourceOrderId: integer("source_order_id"), // Links to draft order that created this medication
  problemMappings: jsonb("problem_mappings").default([]), // Link to medical problems
  
  // Dates and status
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // NULL means active
  discontinuedDate: date("discontinued_date"),
  status: text("status").default("active"), // 'active', 'discontinued', 'held', 'historical'
  
  // Provider info
  prescriber: text("prescriber"),
  prescriberId: integer("prescriber_id").references(() => users.id),
  firstEncounterId: integer("first_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  
  // Change tracking and visit history (unified with other chart sections)
  reasonForChange: text("reason_for_change"),
  medicationHistory: jsonb("medication_history").default([]), // Chronological changes
  changeLog: jsonb("change_log").default([]), // Audit trail
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string; // YYYY-MM-DD format
    notes: string; // Clinical notes about medication changes
    source: "encounter" | "attachment" | "manual" | "order";
    encounterId?: number; // Reference to encounter if source is encounter
    attachmentId?: number; // Reference to attachment if source is attachment
    orderId?: number; // Reference to order that created this visit entry
    providerId?: number;
    providerName?: string;
    changesMade?: string[]; // Array of changes made
    confidence?: number; // AI confidence in extraction (0.0-1.0)
    isSigned?: boolean; // Provider signature status
    sourceNotes?: string; // Additional context
    previousState?: { // Snapshot of medication state before this change
      dosage?: string;
      frequency?: string;
      status?: string;
      clinicalIndication?: string;
    };
  }>>().default([]), // Unified visit history like medical problems
  
  // Source attribution (unified with other chart sections)
  sourceType: text("source_type"), // 'encounter', 'attachment', 'manual', 'order_conversion'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  sourceNotes: text("source_notes"),
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id, { onDelete: "set null" }),
  enteredBy: integer("entered_by").references(() => users.id),
  
  // GPT-driven organization
  groupingStrategy: text("grouping_strategy").default("medical_problem"), // 'medical_problem', 'drug_class', 'alphabetical'
  relatedMedications: jsonb("related_medications").default([]), // GPT-identified relationships
  drugInteractions: jsonb("drug_interactions").default([]), // GPT-analyzed interactions
  
  // External integration
  pharmacyOrderId: text("pharmacy_order_id"), // External pharmacy reference
  insuranceAuthStatus: text("insurance_auth_status"), // 'approved', 'pending', 'denied'
  priorAuthRequired: boolean("prior_auth_required").default(false),
  
  // E-prescribing fields
  deaSchedule: text("dea_schedule"), // 'CI', 'CII', 'CIII', 'CIV', 'CV', null for non-controlled
  pharmacyNcpdpId: text("pharmacy_ncpdp_id"), // NCPDP Provider ID for transmission
  transmissionStatus: text("transmission_status"), // 'pending', 'transmitted', 'accepted', 'rejected', 'error'
  transmissionTimestamp: timestamp("transmission_timestamp"),
  transmissionMessageId: text("transmission_message_id"), // SureScripts transaction ID
  transmissionErrors: jsonb("transmission_errors").default([]), // Array of transmission errors
  electronicSignatureId: integer("electronic_signature_id").references(() => electronicSignatures.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * LONGITUDINAL MEDICAL PROBLEMS TABLE (PATIENT PROBLEM LIST)
 * 
 * PURPOSE: Cross-encounter tracking of ongoing patient conditions
 * SCOPE: Patient-wide historical view with visit history tracking
 * 
 * IMPORTANT: This is DIFFERENT from diagnoses table:
 * - medicalProblems = Longitudinal problem list (diabetes, hypertension across years)
 * - diagnoses = Billing codes for specific encounters (chest pain visit today)
 * 
 * Both tables serve different business purposes and should coexist.
 */
export const medicalProblems = pgTable("medical_problems", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  problemTitle: text("problem_title").notNull(),
  currentIcd10Code: text("current_icd10_code"),
  problemStatus: text("problem_status").default("active"), // 'active', 'resolved', 'chronic'
  firstEncounterId: integer("first_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  lastUpdatedEncounterId: integer("last_updated_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  
  // Enhanced JSONB fields for performance
  visitHistory: jsonb("visit_history").default([]), // Chronological visit notes
  changeLog: jsonb("change_log").default([]), // Audit trail of changes
  
  // GPT-powered intelligent ranking system
  lastRankedEncounterId: integer("last_ranked_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  rankingReason: text("ranking_reason"), // GPT's reasoning for rank assignment
  
  // Enhanced ranking with factor breakdown for user weighting
  rankingFactors: jsonb("ranking_factors").$type<{
    clinical_severity: number;      // Relative percentage (0-100%) within patient context
    treatment_complexity: number;   // Relative percentage (0-100%) within patient context
    patient_frequency: number;      // Relative percentage (0-100%) within patient context
    clinical_relevance: number;     // Relative percentage (0-100%) within patient context
  }>(), // GPT-generated factor breakdown for user weight customization
  
  // Orphaned columns from database
  encounterId: integer("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  icd10Code: text("icd10_code"), // Legacy ICD-10 code field
  snomedCode: text("snomed_code"), // SNOMED CT code
  onsetDate: date("onset_date"), // Date problem started
  resolutionDate: date("resolution_date"), // Date problem resolved
  notes: text("notes"), // Clinical notes
  severity: text("severity"), // mild, moderate, severe
  
  // Source tracking fields
  sourceType: text("source_type"), // provider, patient_reported, system_extract
  sourceConfidence: decimal("source_confidence", { precision: 5, scale: 2 }), // 0.00-1.00
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id),
  extractionNotes: text("extraction_notes"),
  providerId: integer("provider_id").references(() => users.id),
  
  // Legacy date field (duplicate of firstDiagnosedDate)
  dateDiagnosed: date("date_diagnosed"),
  lastUpdated: timestamp("last_updated"),
  
  // Verification and review fields
  verificationStatus: text("verification_status"), // unverified, verified
  verificationDate: timestamp("verification_date"),
  verifiedBy: integer("verified_by").references(() => users.id),
  
  // Clinical classification
  clinicalStatus: text("clinical_status"), // active, recurrence, relapse, inactive, remission, resolved
  bodySite: text("body_site"), // Anatomical location
  bodySiteLaterality: text("body_site_laterality"), // left, right, bilateral
  category: text("category"), // problem, health_concern, diagnosis
  
  // Review tracking
  lastReviewedDate: timestamp("last_reviewed_date"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  patientEducationProvided: boolean("patient_education_provided").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * BILLING DIAGNOSES TABLE (ACTIVE BILLING & RCM SYSTEM)
 * 
 * PURPOSE: Encounter-specific billing codes for insurance/coding and revenue cycle management
 * SCOPE: Single encounter billing (what you're treating TODAY) with full RCM workflow support
 * 
 * IMPORTANT: This is DIFFERENT from medicalProblems table:
 * - diagnoses = Billing codes for THIS encounter (required for reimbursement) + RCM workflow
 * - medicalProblems = Longitudinal patient problem list (ongoing conditions across encounters)
 * 
 * Both tables serve different business purposes and should coexist.
 * Enhanced for production RCM, claims processing, and reimbursement tracking.
 */
export const diagnoses = pgTable("diagnoses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  
  // Core diagnosis information
  diagnosis_code: text("diagnosis_code"),
  diagnosis_description: text("diagnosis_description"),
  diagnosis_type: text("diagnosis_type"),
  status: text("status").notNull(), // 'active', 'resolved', 'chronic', 'rule_out'
  onset_date: date("onset_date"),
  resolution_date: date("resolution_date"),
  notes: text("notes"),
  severity: text("severity"),
  clinician_id: integer("clinician_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Lab Orders - Enhanced for Production EMR Standards
export const labOrders = pgTable("lab_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  orderSetId: text("order_set_id"), // Groups related tests together (e.g., "CMP_PANEL_001")
  
  // Standardized test identification
  loincCode: text("loinc_code").notNull(), // Primary LOINC identifier for interoperability
  cptCode: text("cpt_code"), // CPT code for billing
  testCode: text("test_code").notNull(), // Lab-specific internal code
  testName: text("test_name").notNull(),
  testCategory: text("test_category"), // 'chemistry', 'hematology', 'microbiology', 'molecular'
  
  // Clinical context
  priority: text("priority").default("routine"), // 'stat', 'urgent', 'routine', 'timed'
  clinicalIndication: text("clinical_indication"), // Why this test was ordered
  icd10Codes: text("icd10_codes").array(), // Supporting diagnosis codes
  
  // Ordering provider
  orderedBy: integer("ordered_by").references(() => users.id).notNull(),
  orderedAt: timestamp("ordered_at").defaultNow(),
  
  // External lab routing
  targetLabId: integer("target_lab_id").references(() => externalLabs.id),
  externalOrderId: text("external_order_id"),
  hl7MessageId: text("hl7_message_id"),
  requisitionNumber: text("requisition_number"), // Lab requisition tracking
  
  // Status tracking with detailed workflow
  orderStatus: text("order_status").default("draft"), // 'draft', 'pending', 'transmitted', 'acknowledged', 'collected', 'in_progress', 'resulted', 'reviewed', 'cancelled'
  transmittedAt: timestamp("transmitted_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  collectedAt: timestamp("collected_at"),
  
  // Specimen requirements
  specimenType: text("specimen_type"), // 'serum', 'plasma', 'whole_blood', 'urine', 'stool', 'tissue'
  specimenVolume: text("specimen_volume"), // Required volume
  containerType: text("container_type"), // 'red_top', 'lavender_top', 'green_top', 'gray_top'
  collectionInstructions: text("collection_instructions"),
  fastingRequired: boolean("fasting_required").default(false),
  fastingHours: integer("fasting_hours"), // Required fasting duration
  timingInstructions: text("timing_instructions"), // Peak/trough, 24hr urine, etc.
  
  // Insurance and authorization
  insurancePreauth: text("insurance_preauth"), // Pre-authorization number
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  insuranceCoverage: text("insurance_coverage"), // 'covered', 'partial', 'not_covered', 'pending'
  
  // AI-enhanced features
  aiSuggestedTests: jsonb("ai_suggested_tests").$type<string[]>(), // Related tests AI recommends
  riskFlags: jsonb("risk_flags").$type<{
    criticalFlag?: boolean;
    interactionWarnings?: string[];
    patientRiskFactors?: string[];
  }>(),
  
  // Quality measures
  qualityMeasure: text("quality_measure"), // Links to quality reporting (HEDIS, CMS)
  preventiveCareFlag: boolean("preventive_care_flag").default(false),
  
  // Critical missing columns from database (actively used)
  orderId: text("order_id"), // External order ID (231 references in codebase)
  results: jsonb("results"), // Lab results data (776 references - CRITICAL!)
  externalLab: text("external_lab"), // External lab name (35 references)
  providerNotes: text("provider_notes"), // Provider notes (139 references)
  resultStatus: text("result_status"), // Result status (17 references)
  specialInstructions: text("special_instructions"), // Special instructions (29 references)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lab Results - Enhanced with AI Intelligence and Clinical Context
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  labOrderId: integer("lab_order_id").references(() => labOrders.id), // Nullable for attachment-extracted labs
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Result identification
  loincCode: text("loinc_code").notNull(),
  testCode: text("test_code").notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"), // 'chemistry', 'hematology', 'microbiology', 'molecular'
  
  // Result data with enhanced context
  resultValue: text("result_value"),
  resultNumeric: decimal("result_numeric", { precision: 15, scale: 6 }), // For trending/calculations
  resultUnits: text("result_units"),
  referenceRange: text("reference_range"),
  ageGenderAdjustedRange: text("age_gender_adjusted_range"), // Personalized normal ranges
  abnormalFlag: text("abnormal_flag"), // 'H', 'L', 'HH', 'LL', 'A', 'AA', null
  criticalFlag: boolean("critical_flag").default(false), // Life-threatening values
  deltaFlag: text("delta_flag"), // Significant change from previous result
  
  // Timing with detailed tracking
  specimenCollectedAt: timestamp("specimen_collected_at"),
  specimenReceivedAt: timestamp("specimen_received_at"),
  resultAvailableAt: timestamp("result_available_at"),
  resultFinalizedAt: timestamp("result_finalized_at"),
  receivedAt: timestamp("received_at").defaultNow(),
  
  // External lab tracking
  externalLabId: integer("external_lab_id").references(() => externalLabs.id),
  externalResultId: text("external_result_id"),
  hl7MessageId: text("hl7_message_id"),
  instrumentId: text("instrument_id"), // Lab instrument that performed test
  
  // Result status and validation
  resultStatus: text("result_status").default("pending"), // 'pending', 'preliminary', 'final', 'corrected', 'cancelled', 'entered_in_error'
  verificationStatus: text("verification_status").default("unverified"), // 'unverified', 'verified', 'validated'
  resultComments: text("result_comments"), // Lab technician notes
  
  // Provider review and clinical intelligence
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  providerNotes: text("provider_notes"),
  
  // Enhanced audit trail for comprehensive review workflow
  needsReview: boolean("needs_review").default(true), // True if requires provider review
  reviewStatus: text("review_status").default("pending"), // 'pending', 'reviewed', 'amended', 'signed_off'
  reviewNote: text("review_note"), // Clinical interpretation and notes
  reviewTemplate: text("review_template"), // Quick-pick template used
  
  // Audit trail
  reviewHistory: jsonb("review_history").default([]).$type<Array<{
    reviewedBy: number;
    reviewedAt: string;
    reviewNote?: string;
    reviewTemplate?: string;
    action: 'reviewed' | 'amended' | 'unreviewed';
    previousNote?: string;
  }>>(),
  
  // Communication and routing
  communicationStatus: text("communication_status").default("none"), // 'none', 'pending', 'completed'
  communicationPlan: jsonb("communication_plan").$type<{
    patientNotification?: boolean;
    phoneCall?: boolean;
    smsText?: boolean;
    letter?: boolean;
    portalRelease?: boolean;
    urgentContact?: boolean;
    assignedStaff?: number;
    dueDate?: string;
    notes?: string;
  }>(),
  
  // Portal and patient communication controls
  portalReleaseStatus: text("portal_release_status").default("hold"), // 'hold', 'approved', 'released', 'blocked'
  portalReleaseBy: integer("portal_release_by").references(() => users.id),
  portalReleaseAt: timestamp("portal_release_at"),
  blockPortalRelease: boolean("block_portal_release").default(false), // Override for sensitive results
  
  // AI-enhanced interpretation
  aiInterpretation: jsonb("ai_interpretation").$type<{
    clinicalSignificance?: string;
    suggestedActions?: string[];
    trendAnalysis?: string;
    riskAssessment?: string;
    relatedFindings?: string[];
    followUpRecommendations?: string[];
  }>(),
  
  // Historical trending
  previousValue: decimal("previous_value", { precision: 15, scale: 6 }),
  previousDate: timestamp("previous_date"),
  trendDirection: text("trend_direction"), // 'increasing', 'decreasing', 'stable', 'fluctuating'
  percentChange: decimal("percent_change", { precision: 5, scale: 2 }),
  
  // Quality control
  qcFlags: jsonb("qc_flags").$type<{
    hemolyzed?: boolean;
    lipemic?: boolean;
    icteric?: boolean;
    clotted?: boolean;
    insufficientSample?: boolean;
  }>(),
  
  // Integration metadata
  sourceSystem: text("source_system"), // 'epic', 'cerner', 'labcorp', 'quest'
  interfaceVersion: text("interface_version"),
  
  // Source classification for multi-source lab data
  sourceType: text("source_type").default("lab_order"), // 'lab_order', 'patient_reported', 'external_upload', 'provider_entered', 'imported_records', 'attachment'
  sourceConfidence: decimal("source_confidence", { precision: 5, scale: 2 }).default("1.00"), // 0.00-1.00 confidence score
  sourceNotes: text("source_notes"), // Additional context about data source
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id, { onDelete: "set null" }), // Source attachment for extracted labs
  enteredBy: integer("entered_by").references(() => users.id), // Who entered non-standard results
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GPT Lab Review Notes - AI-powered clinical interpretations
export const gptLabReviewNotes = pgTable("gpt_lab_review_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id),
  
  // Lab results being reviewed
  resultIds: integer("result_ids").array().notNull(), // Array of lab result IDs
  
  // GPT-generated content
  clinicalReview: text("clinical_review").notNull(), // 2-3 sentence clinical interpretation
  patientMessage: text("patient_message").notNull(), // Message for patient in lay terms
  nurseMessage: text("nurse_message").notNull(), // Message for nurse calling patient
  
  // Clinical context used
  patientContext: jsonb("patient_context").$type<{
    demographics: {
      age: number;
      gender: string;
      mrn: string;
    };
    activeProblems: string[];
    currentMedications: Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>;
    allergies: Array<{
      allergen: string;
      reaction: string;
      severity: string;
    }>;
    recentSOAP: string;
    priorLabResults: Array<{
      testName: string;
      value: string;
      date: string;
      abnormalFlag?: string;
    }>;
  }>(),
  
  // GPT processing metadata
  gptModel: text("gpt_model").default("gpt-4"), // Track which model was used
  promptVersion: text("prompt_version").default("v1.0"), // Track prompt iterations
  
  // Revision tracking (optional for existing reviews)
  revisedBy: integer("revised_by").references(() => users.id), // Who made manual edits
  revisionReason: text("revision_reason"), // Why manual edits were made
  processingTime: integer("processing_time"), // milliseconds
  tokensUsed: integer("tokens_used"),
  
  // Review workflow
  status: text("status").default("draft"), // 'draft', 'pending_approval', 'approved', 'sent', 'archived'
  generatedBy: integer("generated_by").references(() => users.id).notNull(), // Provider who requested
  reviewedBy: integer("reviewed_by").references(() => users.id), // Provider who approved
  generatedAt: timestamp("generated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  
  // Message delivery tracking
  patientMessageSent: boolean("patient_message_sent").default(false),
  nurseMessageSent: boolean("nurse_message_sent").default(false),
  patientMessageSentAt: timestamp("patient_message_sent_at"),
  nurseMessageSentAt: timestamp("nurse_message_sent_at"),
  
  // Audit trail
  revisionHistory: jsonb("revision_history").default([]).$type<Array<{
    revisedAt: string;
    revisedBy: number;
    changes: {
      clinicalReview?: { old: string; new: string };
      patientMessage?: { old: string; new: string };
      nurseMessage?: { old: string; new: string };
    };
    reason: string;
  }>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Imaging Orders (using actual database column names)
export const imagingOrders = pgTable("imaging_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  
  // Order details (matching actual database columns)
  imagingType: text("imaging_type").notNull(), // 'X-ray', 'CT', 'MRI', 'Ultrasound'
  bodyPart: text("body_part").notNull(),
  laterality: text("laterality"), // 'left', 'right', 'bilateral'
  
  // Clinical info (matching actual database columns)
  indication: text("indication").notNull(),
  clinicalHistory: text("clinical_history"),
  
  // Status and scheduling (matching actual database columns)
  priority: text("priority").default("routine"),
  status: text("status").default("pending"),
  facilityId: integer("facility_id"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Imaging Results - Enhanced with PDF-centric workflow and visit history tracking
export const imagingResults = pgTable("imaging_results", {
  id: serial("id").primaryKey(),
  imagingOrderId: integer("imaging_order_id").references(() => imagingOrders.id), // Now optional for historical findings
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  
  // Study details
  studyDate: timestamp("study_date").notNull(),
  studyType: text("study_type").notNull(), // Type of study (e.g., 'XR chest', 'CT abdomen')
  modality: text("modality").notNull(), // 'XR', 'CT', 'MR', 'US', 'Echo', 'PET'
  bodyPart: text("body_part"),
  laterality: text("laterality"), // 'left', 'right', 'bilateral'
  
  // Results
  findings: text("findings"), // Full radiologist findings
  impression: text("impression"), // Radiologist impression
  readingRadiologist: text("reading_radiologist"), // Database column is "reading_radiologist"
  performingFacility: text("performing_facility"), // Database column is "performing_facility"
  
  // PDF attachment integration
  extractedFromAttachmentId: integer("extracted_from_attachment_id").references(() => patientAttachments.id), // Link to PDF report
  
  // DICOM details
  pacsStudyUid: text("pacs_study_uid"), // Changed from dicom_study_id to match database
  
  // Status & review workflow (like labs)
  reportStatus: text("report_status").default("preliminary"), // 'preliminary', 'final', 'addendum', 'corrected'
  
  // Source tracking for multi-source data integration
  sourceType: text("source_type").default("pdf_extract"), // 'pdf_extract', 'hl7_message', 'manual_entry', 'encounter_note'
  sourceConfidence: decimal("source_confidence", { precision: 3, scale: 2 }).default("0.95"), // GPT extraction confidence
  
  // Visit history tracking (like medical problems)
  visitHistory: jsonb("visit_history").default([]).$type<Array<{
    encounterId?: number;
    attachmentId?: number;
    date: string;
    notes: string;
    sourceType: 'encounter' | 'attachment' | 'manual_entry';
    confidence?: number;
    changesFrom?: string;
  }>>(),
  
  // Critical missing column from database (971 references!)
  encounterId: integer("encounter_id").references(() => encounters.id), // Links to encounters
  recommendations: text("recommendations"), // Clinical recommendations (134 references)
  technique: text("technique"), // Imaging technique details (31 references)
  procedureCode: text("procedure_code"), // Billing codes (70 references)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  providerId: integer("provider_id").references(() => users.id).notNull(), // Required by database
  
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
  quantityUnit: text("quantity_unit"), // GPT-determined unit (tablets, mL, units, pens, vials, etc.)
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
  
  // Critical missing columns from database (actively used)
  prescriber: text("prescriber"), // Prescribing provider name (147 references)
  orderDate: timestamp("order_date"), // Order date (24 references)
  startDate: timestamp("start_date"), // Start date (31 references)
  endDate: timestamp("end_date"), // End date (11 references)
  frequency: text("frequency"), // Dosing frequency (87 references)
  imagingStudyType: text("imaging_study_type"), // Imaging type (12 references)
  labTestName: text("lab_test_name"), // Lab test name (16 references)
  referralReason: text("referral_reason"), // Referral reason (7 references)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient Order Delivery Preferences
export const patientOrderPreferences = pgTable("patient_order_preferences", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull().unique(),
  providerId: integer("provider_id").references(() => users.id).notNull(), // Missing required column
  orderType: text("order_type").notNull(), // Missing required column
  preferences: jsonb("preferences"), // JSONB preferences field
  standingOrders: jsonb("standing_orders"), // Standing orders config
  
  // Lab order delivery preferences
  labDeliveryMethod: text("lab_delivery_method").default("mock_service"), // 'mock_service', 'real_service', 'print_pdf'
  labServiceProvider: text("lab_service_provider"), // Name of the actual lab service when real_service is selected
  
  // Imaging order delivery preferences  
  imagingDeliveryMethod: text("imaging_delivery_method").default("print_pdf"), // 'mock_service', 'real_service', 'print_pdf'
  imagingServiceProvider: text("imaging_service_provider"), // Name of the actual imaging service when real_service is selected
  
  // Medication order delivery preferences
  medicationDeliveryMethod: text("medication_delivery_method").default("preferred_pharmacy"), // 'preferred_pharmacy', 'print_pdf', 'fax'
  preferredPharmacy: text("preferred_pharmacy"), // Name/address of preferred pharmacy
  pharmacyPhone: text("pharmacy_phone"), // Pharmacy contact number
  pharmacyFax: text("pharmacy_fax"), // Pharmacy fax number
  
  // Audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
});

// Signed orders tracking table for post-signature management
export const signedOrders = pgTable("signed_orders", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  encounterId: integer("encounter_id").references(() => encounters.id),
  orderType: varchar("order_type", { length: 50 }).notNull(),
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(),
  deliveryStatus: varchar("delivery_status", { length: 50 }).notNull().default("pending"), // pending, delivered, failed, cancelled
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastDeliveryAttempt: timestamp("last_delivery_attempt"),
  deliveryError: text("delivery_error"),
  canChangeDelivery: boolean("can_change_delivery").notNull().default(true), // For SureScripts time window
  deliveryLockReason: varchar("delivery_lock_reason", { length: 255 }), // "pharmacy_confirmed", "time_expired", etc.
  originalDeliveryMethod: varchar("original_delivery_method", { length: 50 }).notNull(),
  deliveryChanges: jsonb("delivery_changes").default("[]"), // Audit trail of delivery method changes
  signedAt: timestamp("signed_at").notNull(),
  signedBy: integer("signed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Medication Formulary - 500 Most Commonly Prescribed Medications
export const medicationFormulary = pgTable("medication_formulary", {
  id: serial("id").primaryKey(),
  
  // Core medication identification
  genericName: text("generic_name").notNull(),
  brandNames: text("brand_names").array(), // Common brand names
  commonNames: text("common_names").array(), // Alternative names/abbreviations
  
  // Physical characteristics
  standardStrengths: text("standard_strengths").array().notNull(), // ['25 mg', '50 mg']
  availableForms: text("available_forms").array().notNull(), // ['tablet', 'capsule']
  formRoutes: jsonb("form_routes").notNull(), // {'tablet': ['oral'], 'cream': ['topical']}
  
  // Prescribing templates
  sigTemplates: jsonb("sig_templates").notNull(), // {'25 mg-tablet-oral': 'Take 1 tablet...'}
  commonDoses: text("common_doses").array(), // ['25 mg once daily', '50 mg twice daily']
  maxDailyDose: text("max_daily_dose"), // '100 mg'
  
  // Clinical information
  therapeuticClass: text("therapeutic_class").notNull(),
  indication: text("indication").notNull(),
  blackBoxWarning: text("black_box_warning"),
  ageRestrictions: text("age_restrictions"),
  
  // Regulatory and pharmacy
  prescriptionType: text("prescription_type").notNull(), // 'rx' or 'otc'
  isControlled: boolean("is_controlled").default(false),
  controlledSchedule: text("controlled_schedule"), // 'CII', 'CIII', etc.
  requiresPriorAuth: boolean("requires_prior_auth").default(false),
  
  // Clinical adjustments
  renalAdjustment: boolean("renal_adjustment").default(false),
  hepaticAdjustment: boolean("hepatic_adjustment").default(false),
  
  // Usage statistics for optimization
  prescriptionVolume: integer("prescription_volume").default(0), // Annual prescription count
  popularityRank: integer("popularity_rank"), // 1-500 ranking
  
  // Data management
  dataSource: text("data_source").notNull(), // 'FDA', 'RxNorm', 'Clinical'
  lastVerified: timestamp("last_verified").defaultNow(),
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lab Reference Ranges - Structured table for advanced AI features
// NOTE: This is SEPARATE from the referenceRange text field in lab_results
// PURPOSE: 
// - referenceRange (text): Simple display string like "150-450" - used for UI display and basic GPT prompts
// - labReferenceRanges (table): Structured data for advanced AI analysis, age/gender-specific ranges, critical values
export const labReferenceRanges = pgTable("lab_reference_ranges", {
  id: serial("id").primaryKey(),
  
  // Test identification - must match lab_results.loincCode for lookups
  loincCode: text("loinc_code").notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"), // 'chemistry', 'hematology', etc.
  
  // Demographics for personalized ranges
  gender: text("gender"), // 'male', 'female', 'all' - null means applies to all
  ageMin: integer("age_min").default(0), // Minimum age in years
  ageMax: integer("age_max").default(120), // Maximum age in years
  
  // Normal reference ranges (for AI analysis)
  normalLow: decimal("normal_low", { precision: 15, scale: 6 }),
  normalHigh: decimal("normal_high", { precision: 15, scale: 6 }),
  units: text("units").notNull(),
  
  // Critical value thresholds (for alerts and AI recommendations)
  criticalLow: decimal("critical_low", { precision: 15, scale: 6 }),
  criticalHigh: decimal("critical_high", { precision: 15, scale: 6 }),
  
  // Display string (should match referenceRange text field when possible)
  displayRange: text("display_range"), // "150-450 K/uL" - for consistency with text field
  
  // Data source and validation
  labSource: text("lab_source"), // 'LabCorp', 'Quest', 'Internal', 'Literature'
  lastVerified: timestamp("last_verified").defaultNow(),
  active: boolean("active").default(true),
  
  // Clinical context
  clinicalNotes: text("clinical_notes"), // Special considerations
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for template system
export const insertUserNoteTemplateSchema = createInsertSchema(userNoteTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  usageCount: true,
  lastUsed: true,
  version: true,
  promptVersion: true
});

export const insertTemplateShareSchema = createInsertSchema(templateShares).omit({ 
  id: true, 
  sharedAt: true,
  respondedAt: true
});

export const insertUserNotePreferencesSchema = createInsertSchema(userNotePreferences).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertUserNoteTemplate = z.infer<typeof insertUserNoteTemplateSchema>;
export type SelectUserNoteTemplate = typeof userNoteTemplates.$inferSelect;
export type InsertTemplateShare = z.infer<typeof insertTemplateShareSchema>;
export type SelectTemplateShare = typeof templateShares.$inferSelect;
export type InsertUserNotePreferences = z.infer<typeof insertUserNotePreferencesSchema>;
export type SelectUserNotePreferences = typeof userNotePreferences.$inferSelect;

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

// Replaced by patientsRelationsEnhanced below

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
  attachments: many(patientAttachments),
}));

// Replaced by appointmentsRelationsEnhanced below

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

export const labReferenceRangesRelations = relations(labReferenceRanges, ({ many }) => ({
  // No direct relations - this is a lookup table queried by LOINC code
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
    fields: [imagingOrders.providerId],
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

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medications.patientId],
    references: [patients.id],
  }),
  encounter: one(encounters, {
    fields: [medications.encounterId],
    references: [encounters.id],
  }),
  prescriber: one(users, {
    fields: [medications.prescriberId],
    references: [users.id],
  }),
  firstEncounter: one(encounters, {
    fields: [medications.firstEncounterId],
    references: [encounters.id],
  }),
  lastUpdatedEncounter: one(encounters, {
    fields: [medications.lastUpdatedEncounterId],
    references: [encounters.id],
  }),
  extractedFromAttachment: one(patientAttachments, {
    fields: [medications.extractedFromAttachmentId],
    references: [patientAttachments.id],
  }),
  enteredByUser: one(users, {
    fields: [medications.enteredBy],
    references: [users.id],
  }),
  electronicSignature: one(electronicSignatures, {
    fields: [medications.electronicSignatureId],
    references: [electronicSignatures.id],
  }),
  transmissions: many(prescriptionTransmissions),
}));

export const electronicSignaturesRelations = relations(electronicSignatures, ({ one, many }) => ({
  user: one(users, {
    fields: [electronicSignatures.userId],
    references: [users.id],
  }),
  encounter: one(encounters, {
    fields: [electronicSignatures.encounterId],
    references: [encounters.id],
  }),
  medications: many(medications),
}));

export const pharmaciesRelations = relations(pharmacies, ({ many }) => ({
  prescriptionTransmissions: many(prescriptionTransmissions),
}));

export const prescriptionTransmissionsRelations = relations(prescriptionTransmissions, ({ one }) => ({
  medication: one(medications, {
    fields: [prescriptionTransmissions.medicationId],
    references: [medications.id],
  }),
  order: one(orders, {
    fields: [prescriptionTransmissions.orderId],
    references: [orders.id],
  }),
  patient: one(patients, {
    fields: [prescriptionTransmissions.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [prescriptionTransmissions.providerId],
    references: [users.id],
  }),
  pharmacy: one(pharmacies, {
    fields: [prescriptionTransmissions.pharmacyId],
    references: [pharmacies.id],
  }),
  electronicSignature: one(electronicSignatures, {
    fields: [prescriptionTransmissions.electronicSignatureId],
    references: [electronicSignatures.id],
  }),
}));

export const patientOrderPreferencesRelations = relations(patientOrderPreferences, ({ one }) => ({
  patient: one(patients, {
    fields: [patientOrderPreferences.patientId],
    references: [patients.id],
  }),
  lastUpdatedByUser: one(users, {
    fields: [patientOrderPreferences.lastUpdatedBy],
    references: [users.id],
  }),
}));

export const signedOrdersRelations = relations(signedOrders, ({ one }) => ({
  order: one(orders, {
    fields: [signedOrders.orderId],
    references: [orders.id],
  }),
  patient: one(patients, {
    fields: [signedOrders.patientId],
    references: [patients.id],
  }),
  encounter: one(encounters, {
    fields: [signedOrders.encounterId],
    references: [encounters.id],
  }),
  signedByUser: one(users, {
    fields: [signedOrders.signedBy],
    references: [users.id],
  }),
}));

// Medical Problems Types
export type MedicalProblem = typeof medicalProblems.$inferSelect;
export type InsertMedicalProblem = z.infer<typeof insertMedicalProblemSchema>;

// Medication Formulary Types
export type MedicationFormulary = typeof medicationFormulary.$inferSelect;
export type InsertMedicationFormulary = z.infer<typeof insertMedicationFormularySchema>;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  healthSystemId: true,
  npi: true,
  credentials: true,
  specialties: true,
  licenseNumber: true,
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  mrn: true,
  healthSystemId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  contactNumber: true,
  email: true,
  address: true,
  emergencyContact: true,
  insurancePrimary: true,
  insuranceSecondary: true,
  policyNumber: true,
  groupNumber: true,
  preferredLocationId: true,
  dataOriginType: true,
  originalFacilityId: true,
  createdByProviderId: true,
  creationContext: true,
  derivativeWorkNote: true,
  migrationConsent: true,
}).extend({
  mrn: z.string().optional(), // Make MRN optional since we auto-generate it
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



export const insertOrderSchema = createInsertSchema(orders).pick({
  patientId: true,
  encounterId: true,
  providerId: true,
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
  lastRankedEncounterId: true,
  rankingReason: true,
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

// Legacy schema - replaced by userNoteTemplates
// export const insertUserSoapTemplateSchema = createInsertSchema(userSoapTemplates);

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
// Legacy types - replaced by userNoteTemplates
// export type InsertUserSoapTemplate = z.infer<typeof insertUserSoapTemplateSchema>;
// export type UserSoapTemplate = typeof userSoapTemplates.$inferSelect;
export type InsertUserEditPattern = z.infer<typeof insertUserEditPatternSchema>;
export type UserEditPattern = typeof userEditPatterns.$inferSelect;
export type InsertUserAssistantThread = z.infer<typeof insertUserAssistantThreadSchema>;
export type UserAssistantThread = typeof userAssistantThreads.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Encounter = typeof encounters.$inferSelect;

export type Vitals = typeof vitals.$inferSelect;
export type InsertDiagnosis = z.infer<typeof insertDiagnosisSchema>;
export type Diagnosis = typeof diagnoses.$inferSelect;
export const insertMedicationFormularySchema = createInsertSchema(medicationFormulary).pick({
  genericName: true,
  brandNames: true,
  commonNames: true,
  standardStrengths: true,
  availableForms: true,
  formRoutes: true,
  sigTemplates: true,
  commonDoses: true,
  maxDailyDose: true,
  therapeuticClass: true,
  indication: true,
  blackBoxWarning: true,
  ageRestrictions: true,
  prescriptionType: true,
  isControlled: true,
  controlledSchedule: true,
  requiresPriorAuth: true,
  renalAdjustment: true,
  hepaticAdjustment: true,
  prescriptionVolume: true,
  popularityRank: true,
  dataSource: true,
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  patientId: true,
  encounterId: true,
  medicationName: true,
  brandName: true,
  genericName: true,
  dosage: true,
  strength: true,
  dosageForm: true,
  route: true,
  frequency: true,
  quantity: true,
  daysSupply: true,
  refillsRemaining: true,
  totalRefills: true,
  sig: true,
  rxNormCode: true,
  ndcCode: true,
  sureScriptsId: true,
  clinicalIndication: true,
  problemMappings: true,
  startDate: true,
  endDate: true,
  discontinuedDate: true,
  status: true,
  prescriber: true,
  prescriberId: true,
  firstEncounterId: true,
  lastUpdatedEncounterId: true,
  reasonForChange: true,
  medicationHistory: true,
  changeLog: true,
  groupingStrategy: true,
  relatedMedications: true,
  drugInteractions: true,
  pharmacyOrderId: true,
  insuranceAuthStatus: true,
  priorAuthRequired: true,
});

export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;
export type LabOrder = typeof labOrders.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type LabReferenceRange = typeof labReferenceRanges.$inferSelect;
export type ImagingOrder = typeof imagingOrders.$inferSelect;
export type ImagingResult = typeof imagingResults.$inferSelect;
export type FamilyHistory = typeof familyHistory.$inferSelect;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type SocialHistory = typeof socialHistory.$inferSelect;
export type SurgicalHistory = typeof surgicalHistory.$inferSelect;
export type Allergy = typeof allergies.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Patient Order Preferences schema and types
export const insertPatientOrderPreferencesSchema = createInsertSchema(patientOrderPreferences).pick({
  patientId: true,
  labDeliveryMethod: true,
  labServiceProvider: true,
  imagingDeliveryMethod: true,
  imagingServiceProvider: true,
  medicationDeliveryMethod: true,
  preferredPharmacy: true,
  pharmacyPhone: true,
  pharmacyFax: true,
  lastUpdatedBy: true,
});

export type PatientOrderPreferences = typeof patientOrderPreferences.$inferSelect;
export type InsertPatientOrderPreferences = z.infer<typeof insertPatientOrderPreferencesSchema>;

// Signed Orders schema and types
export const insertSignedOrderSchema = createInsertSchema(signedOrders).pick({
  orderId: true,
  patientId: true,
  encounterId: true,
  orderType: true,
  deliveryMethod: true,
  deliveryStatus: true,
  deliveryAttempts: true,
  lastDeliveryAttempt: true,
  deliveryError: true,
  canChangeDelivery: true,
  deliveryLockReason: true,
  originalDeliveryMethod: true,
  deliveryChanges: true,
  signedAt: true,
  signedBy: true,
});

export type SignedOrder = typeof signedOrders.$inferSelect;
export type InsertSignedOrder = z.infer<typeof insertSignedOrderSchema>;

// Electronic Signature schema and types
export const insertElectronicSignatureSchema = createInsertSchema(electronicSignatures).pick({
  userId: true,
  encounterId: true,
  signatureType: true,
  signatureString: true,
  signatureCanvas: true,
  certificationText: true,
  ipAddress: true,
  userAgent: true,
  authenticationMethod: true,
  twoFactorUsed: true,
  deaSignature: true,
});

export type ElectronicSignature = typeof electronicSignatures.$inferSelect;
export type InsertElectronicSignature = z.infer<typeof insertElectronicSignatureSchema>;

// Pharmacy schema and types
export const insertPharmacySchema = createInsertSchema(pharmacies).pick({
  ncpdpId: true,
  npi: true,
  deaNumber: true,
  googlePlaceId: true,
  name: true,
  dbaName: true,
  corporateName: true,
  address: true,
  address2: true,
  city: true,
  state: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  phone: true,
  fax: true,
  email: true,
  website: true,
  hours: true,
  is24Hour: true,
  services: true,
  acceptsEprescribing: true,
  acceptsControlledSubstances: true,
  preferredTransmissionMethod: true,
  sureScriptsVersion: true,
  specialtyTypes: true,
  insuranceNetworks: true,
  preferredForConditions: true,
  status: true,
  verificationStatus: true,
  lastVerified: true,
  healthSystemId: true,
});

export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;

// Prescription Transmission schema and types
export const insertPrescriptionTransmissionSchema = createInsertSchema(prescriptionTransmissions).pick({
  medicationId: true,
  orderId: true,
  patientId: true,
  providerId: true,
  pharmacyId: true,
  transmissionMethod: true,
  transmissionStatus: true,
  surescriptsMessageId: true,
  surescriptsThreadId: true,
  ncpdpVersion: true,
  requestPayload: true,
  responsePayload: true,
  pharmacyResponse: true,
  refillRequestId: true,
  electronicSignatureId: true,
  printedCopy: true,
  faxedCopy: true,
  errorMessage: true,
  retryCount: true,
});

export type PrescriptionTransmission = typeof prescriptionTransmissions.$inferSelect;
export type InsertPrescriptionTransmission = z.infer<typeof insertPrescriptionTransmissionSchema>;

// Patient Attachments
export const patientAttachments = pgTable("patient_attachments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id), // Optional encounter association
  
  // File metadata
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: text("mime_type").notNull(),
  fileExtension: text("file_extension").notNull(),
  
  // Storage information
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"), // For images/PDFs
  
  // Categorization
  category: text("category").notNull().default("general"), // 'lab_results', 'insurance', 'referrals', 'imaging', 'general'
  title: text("title"), // User-provided title
  description: text("description"), // User-provided description
  tags: text("tags").array().default([]), // Search tags
  
  // Security and access
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  isConfidential: boolean("is_confidential").default(false),
  accessLevel: text("access_level").default("standard"), // 'public', 'standard', 'restricted'
  
  // Duplicate detection
  contentHash: text("content_hash"), // SHA-256 hash of file content for duplicate detection
  
  // Status
  processingStatus: text("processing_status").default("completed"), // 'processing', 'completed', 'failed'
  virusScanStatus: text("virus_scan_status").default("pending"), // 'pending', 'clean', 'infected'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Extracted Content
export const attachmentExtractedContent = pgTable("attachment_extracted_content", {
  id: serial("id").primaryKey(),
  attachmentId: integer("attachment_id").references(() => patientAttachments.id).notNull().unique(),
  pageNumber: integer("page_number"),
  contentType: text("content_type").notNull(), // Required by database
  extractedText: text("extracted_text"),
  structuredData: jsonb("structured_data"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  extractionMethod: text("extraction_method"),
  aiGeneratedTitle: text("ai_generated_title"),
  documentType: text("document_type"), // "lab_results", "H&P", "discharge_summary", etc.
  processingStatus: text("processing_status").default("pending"), // "pending", "processing", "completed", "failed"
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Processing Queue
export const documentProcessingQueue = pgTable("document_processing_queue", {
  id: serial("id").primaryKey(),
  attachmentId: integer("attachment_id").references(() => patientAttachments.id).notNull(),
  status: text("status").default("queued"), // "queued", "processing", "completed", "failed"
  attempts: integer("attempts").default(0),
  // Removed lastAttempt - doesn't exist in database
  
  // Columns that exist in database
  priority: integer("priority").default(100),
  processorType: text("processor_type").notNull().default("document_analysis"), // Added NOT NULL with default
  processingMetadata: jsonb("processing_metadata"),
  errorMessage: text("error_message"), 
  retryCount: integer("retry_count").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatientAttachmentSchema = createInsertSchema(patientAttachments).pick({
  patientId: true,
  encounterId: true,
  fileName: true,
  originalFileName: true,
  fileSize: true,
  mimeType: true,
  fileExtension: true,
  filePath: true,
  thumbnailPath: true,
  category: true,
  title: true,
  description: true,
  tags: true,
  uploadedBy: true,
  isConfidential: true,
  accessLevel: true,
  contentHash: true,
});

export const insertAttachmentExtractedContentSchema = createInsertSchema(attachmentExtractedContent).pick({
  attachmentId: true,
  extractedText: true,
  aiGeneratedTitle: true,
  documentType: true,
  processingStatus: true,
  errorMessage: true,
  processedAt: true,
});

export const insertDocumentProcessingQueueSchema = createInsertSchema(documentProcessingQueue).pick({
  attachmentId: true,
  status: true,
  attempts: true,
  lastAttempt: true,
  priority: true,
  processorType: true,
  processingMetadata: true,
  errorMessage: true,
  retryCount: true,
  startedAt: true,
  completedAt: true,
});

export type PatientAttachment = typeof patientAttachments.$inferSelect;
export type InsertPatientAttachment = z.infer<typeof insertPatientAttachmentSchema>;
export type AttachmentExtractedContent = typeof attachmentExtractedContent.$inferSelect;
export type InsertAttachmentExtractedContent = z.infer<typeof insertAttachmentExtractedContentSchema>;
export type DocumentProcessingQueue = typeof documentProcessingQueue.$inferSelect;
export type InsertDocumentProcessingQueue = z.infer<typeof insertDocumentProcessingQueueSchema>;

// Zod schemas for source tracking fields
export const insertVitalSchema = createInsertSchema(vitals).pick({
  patientId: true,
  encounterId: true,
  recordedAt: true,
  recordedBy: true,
  entryType: true,
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
  notes: true,
  alerts: true,
  parsedFromText: true,
  originalText: true,
  sourceType: true,
  sourceConfidence: true,
  sourceNotes: true,
  extractedFromAttachmentId: true,
  enteredBy: true,
});

export const insertAllergySchema = createInsertSchema(allergies).pick({
  patientId: true,
  allergen: true,
  reaction: true,
  severity: true,
  lastUpdatedEncounterId: true,
  sourceType: true,
  sourceConfidence: true,
  sourceNotes: true,
  extractedFromAttachmentId: true,
  enteredBy: true,
});

export const insertFamilyHistorySchema = createInsertSchema(familyHistory).pick({
  patientId: true,
  relationship: true,
  condition: true,
  lastUpdatedEncounterId: true,
  sourceType: true,
  sourceConfidence: true,
  sourceNotes: true,
  extractedFromAttachmentId: true,
  enteredBy: true,
});

export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).pick({
  patientId: true,
  conditionCategory: true,
  historyText: true,
  lastUpdatedEncounterId: true,
  sourceType: true,
  sourceConfidence: true,
  sourceNotes: true,
  extractedFromAttachmentId: true,
  enteredBy: true,
});

export const insertSocialHistorySchema = createInsertSchema(socialHistory).pick({
  patientId: true,
  category: true,
  currentStatus: true,
  historyNotes: true,
  lastUpdatedEncounterId: true,
  sourceType: true,
  sourceConfidence: true,
  extractedFromAttachmentId: true,
  enteredBy: true,
  consolidationReasoning: true,
  extractionNotes: true,
  visitHistory: true,
});

export const insertSurgicalHistorySchema = createInsertSchema(surgicalHistory).pick({
  patientId: true,
  procedureName: true,
  procedureDate: true,
  surgeonName: true,
  facilityName: true,
  indication: true,
  complications: true,
  outcome: true,
  anesthesiaType: true,
  cptCode: true,
  icd10ProcedureCode: true,
  anatomicalSite: true,
  laterality: true,
  urgencyLevel: true,
  lengthOfStay: true,
  bloodLoss: true,
  transfusionsRequired: true,
  implantsHardware: true,
  followUpRequired: true,
  recoveryStatus: true,
  sourceType: true,
  sourceConfidence: true,
  sourceNotes: true,
  extractedFromAttachmentId: true,
  lastUpdatedEncounterId: true,
  enteredBy: true,
  consolidationReasoning: true,
  extractionNotes: true,
  visitHistory: true,
});

export type InsertVital = z.infer<typeof insertVitalSchema>;
export type Vital = typeof vitals.$inferSelect;
export type InsertAllergy = z.infer<typeof insertAllergySchema>;
export type InsertFamilyHistory = z.infer<typeof insertFamilyHistorySchema>;
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;
export type InsertSocialHistory = z.infer<typeof insertSocialHistorySchema>;
export type InsertSurgicalHistory = z.infer<typeof insertSurgicalHistorySchema>;

// Imaging Results schemas
export const insertImagingResultSchema = createInsertSchema(imagingResults).pick({
  imagingOrderId: true,
  patientId: true,
  studyDate: true,
  modality: true,
  bodyPart: true,
  laterality: true,
  findings: true,
  impression: true,
  readingRadiologist: true,
  performingFacility: true,
  pacsStudyUid: true,
  reportStatus: true,
  sourceType: true,
  sourceConfidence: true,
  extractedFromAttachmentId: true,
  visitHistory: true,
});

export type InsertImagingResult = z.infer<typeof insertImagingResultSchema>;

// Admin prompt management table for viewing/editing generated prompts
export const adminPromptReviews = pgTable("admin_prompt_reviews", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => userNoteTemplates.id).notNull(),
  originalPrompt: text("original_prompt").notNull(), // GPT-generated prompt
  reviewedPrompt: text("reviewed_prompt"), // Admin-edited version
  adminUserId: integer("admin_user_id").references(() => users.id), // Who reviewed it
  reviewStatus: text("review_status").default("pending"), // 'pending', 'reviewed', 'approved'
  reviewNotes: text("review_notes"), // Admin comments
  isActive: boolean("is_active").default(false), // Whether to use reviewed version
  performanceMetrics: jsonb("performance_metrics"), // Usage stats, success rates
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertAdminPromptReviewSchema = createInsertSchema(adminPromptReviews).pick({
  templateId: true,
  originalPrompt: true,
  reviewedPrompt: true,
  adminUserId: true,
  reviewStatus: true,
  reviewNotes: true,
  isActive: true,
  performanceMetrics: true,
});

export type AdminPromptReview = typeof adminPromptReviews.$inferSelect;
export type InsertAdminPromptReview = z.infer<typeof insertAdminPromptReviewSchema>;

// User-specific problem ranking preferences (collaborative system)
export const problemRankOverrides = pgTable("problem_rank_overrides", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").references(() => medicalProblems.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  preferenceWeight: text("preference_weight").notNull(), // 'low', 'medium', 'high'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User display preferences for problem list view
export const userProblemListPreferences = pgTable("user_problem_list_preferences", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  maxProblemsDisplayed: integer("max_problems_displayed").default(10),
  showResolvedProblems: boolean("show_resolved_problems").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProblemRankOverrideSchema = createInsertSchema(problemRankOverrides).pick({
  problemId: true,
  userId: true,
  preferenceWeight: true,
});

export const insertUserProblemListPreferencesSchema = createInsertSchema(userProblemListPreferences).pick({
  userId: true,
  maxProblemsDisplayed: true,
  showResolvedProblems: true,
});

export type ProblemRankOverride = typeof problemRankOverrides.$inferSelect;
export type InsertProblemRankOverride = z.infer<typeof insertProblemRankOverrideSchema>;
export type UserProblemListPreferences = typeof userProblemListPreferences.$inferSelect;
export type InsertUserProblemListPreferences = z.infer<typeof insertUserProblemListPreferencesSchema>;

// Organizational Structure Relations
export const healthSystemsRelations = relations(healthSystems, ({ many }) => ({
  organizations: many(organizations),
  locations: many(locations), // Direct health system locations
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  healthSystem: one(healthSystems, {
    fields: [organizations.healthSystemId],
    references: [healthSystems.id],
  }),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [locations.organizationId],
    references: [organizations.id],
  }),
  healthSystem: one(healthSystems, {
    fields: [locations.healthSystemId],
    references: [healthSystems.id],
  }),
  userLocations: many(userLocations),
  appointments: many(appointments),
  providerSchedules: many(providerSchedules),
}));

export const userLocationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, {
    fields: [userLocations.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [userLocations.locationId],
    references: [locations.id],
  }),
}));

export const userSessionLocationsRelations = relations(userSessionLocations, ({ one }) => ({
  user: one(users, {
    fields: [userSessionLocations.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [userSessionLocations.locationId],
    references: [locations.id],
  }),
}));

export const providerSchedulesRelations = relations(providerSchedules, ({ one, many }) => ({
  provider: one(users, {
    fields: [providerSchedules.providerId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [providerSchedules.locationId],
    references: [locations.id],
  }),
  exceptions: many(scheduleExceptions),
}));

export const scheduleExceptionsRelations = relations(scheduleExceptions, ({ one }) => ({
  provider: one(users, {
    fields: [scheduleExceptions.providerId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [scheduleExceptions.locationId],
    references: [locations.id],
  }),
  createdByUser: one(users, {
    fields: [scheduleExceptions.createdBy],
    references: [users.id],
  }),
}));

// Enhanced Relations for Existing Tables
export const appointmentsRelationsEnhanced = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [appointments.providerId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [appointments.locationId],
    references: [locations.id],
  }),
  checkedInByUser: one(users, {
    fields: [appointments.checkedInBy],
    references: [users.id],
  }),
  verifiedByUser: one(users, {
    fields: [appointments.verifiedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
  }),
}));

export const patientsRelationsEnhanced = relations(patients, ({ one, many }) => ({
  preferredLocation: one(locations, {
    fields: [patients.preferredLocationId],
    references: [locations.id],
  }),
  primaryProvider: one(users, {
    fields: [patients.primaryProviderId],
    references: [users.id],
  }),
  encounters: many(encounters),
  appointments: many(appointments),
  familyHistory: many(familyHistory),
  medicalHistory: many(medicalHistory),
  socialHistory: many(socialHistory),
  surgicalHistory: many(surgicalHistory),
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
  attachments: many(patientAttachments),
}));

// Insert Schemas for Organizational Structure
export const insertHealthSystemSchema = createInsertSchema(healthSystems).pick({
  name: true,
  shortName: true,
  systemType: true,
  primaryContact: true,
  phone: true,
  email: true,
  website: true,
  npi: true,
  taxId: true,
  logoUrl: true,
  brandColors: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  healthSystemId: true,
  name: true,
  shortName: true,
  organizationType: true,
  region: true,
  city: true,
  state: true,
  zipCode: true,
  phone: true,
  email: true,
  address: true,
  npi: true,
  taxId: true,
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  organizationId: true,
  healthSystemId: true,
  name: true,
  shortName: true,
  locationType: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  phone: true,
  fax: true,
  email: true,
  facilityCode: true,
  npi: true,
  operatingHours: true,
  services: true,
  hasLab: true,
  hasImaging: true,
  hasPharmacy: true,
});

export const insertUserLocationSchema = createInsertSchema(userLocations).pick({
  userId: true,
  locationId: true,
  roleAtLocation: true,
  isPrimary: true,
  workSchedule: true,
  canSchedule: true,
  canViewAllPatients: true,
  canCreateOrders: true,
  startDate: true,
  endDate: true,
});

export const insertUserSessionLocationSchema = createInsertSchema(userSessionLocations).pick({
  userId: true,
  locationId: true,
  sessionId: true,
  rememberSelection: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  patientId: true,
  providerId: true,
  locationId: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  duration: true,
  appointmentType: true,
  chiefComplaint: true,
  visitReason: true,
  urgencyLevel: true,
  schedulingNotes: true,
  patientPreferences: true,
  aiSchedulingData: true,
  communicationPreferences: true,
  copayAmount: true,
  createdBy: true,
});

export const insertProviderScheduleSchema = createInsertSchema(providerSchedules).pick({
  providerId: true,
  locationId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  scheduleType: true,
  appointmentTypes: true,
  slotDuration: true,
  bufferTime: true,
  maxConcurrentAppts: true,
  advanceBookingDays: true,
  cancelationPolicyHours: true,
  isAvailableForUrgent: true,
  allowDoubleBooking: true,
  requiresReferral: true,
  effectiveFrom: true,
  effectiveUntil: true,
});

export const insertScheduleExceptionSchema = createInsertSchema(scheduleExceptions).pick({
  providerId: true,
  locationId: true,
  exceptionDate: true,
  startTime: true,
  endTime: true,
  exceptionType: true,
  reason: true,
  cancelsExistingAppts: true,
  allowsEmergencyOverride: true,
  isRecurring: true,
  recurrencePattern: true,
  createdBy: true,
});

// Types for Organizational Structure
export type HealthSystem = typeof healthSystems.$inferSelect;
export type InsertHealthSystem = z.infer<typeof insertHealthSystemSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
export type UserSessionLocation = typeof userSessionLocations.$inferSelect;
export type InsertUserSessionLocation = z.infer<typeof insertUserSessionLocationSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type ProviderSchedule = typeof providerSchedules.$inferSelect;
export type InsertProviderSchedule = z.infer<typeof insertProviderScheduleSchema>;
export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type InsertScheduleException = z.infer<typeof insertScheduleExceptionSchema>;

// User Preferences Types
// Removed orphaned UserPreferences types - chartPanelWidth moved to userNotePreferences

// Migration Invitations table
export const migrationInvitations = pgTable('migration_invitations', {
  id: serial('id').primaryKey(),
  
  // Who is being invited
  invitedUserId: integer('invited_user_id').references(() => users.id),
  invitedUserEmail: text('invited_user_email').notNull(), // For inviting users not yet in system
  
  // Which health system is inviting them
  targetHealthSystemId: integer('target_health_system_id').notNull().references(() => healthSystems.id),
  
  // Who created the invitation (admin of target health system)
  createdByUserId: integer('created_by_user_id').notNull().references(() => users.id),
  
  // Invitation details
  invitationCode: text('invitation_code').notNull().unique(), // Secure random code
  message: text('message'), // Optional message from inviting organization
  
  // Status tracking
  status: text('status').notNull().default('pending'), // pending, accepted, rejected, expired
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at'),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Insert schema for migration invitations
export const insertMigrationInvitationSchema = createInsertSchema(migrationInvitations)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    invitedUserEmail: z.string().email(),
    status: z.enum(['pending', 'accepted', 'rejected', 'expired']).default('pending'),
  });

export type MigrationInvitation = typeof migrationInvitations.$inferSelect;
export type InsertMigrationInvitation = z.infer<typeof insertMigrationInvitationSchema>;

// Subscription Keys System Tables

// Subscription keys for tier-based access
export const subscriptionKeys = pgTable("subscription_keys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 20 }).unique().notNull(),
  healthSystemId: integer("health_system_id").notNull().references(() => healthSystems.id),
  keyType: text("key_type").notNull(), // 'provider', 'staff', 'admin'
  subscriptionTier: integer("subscription_tier").notNull(), // 1, 2, 3
  status: text("status").default("active"), // 'active', 'used', 'expired', 'deactivated'
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }), // Per-user monthly price
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 72 hours from creation for unused keys
  usedBy: integer("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  deactivatedBy: integer("deactivated_by").references(() => users.id),
  deactivatedAt: timestamp("deactivated_at"),
  metadata: jsonb("metadata").$type<{
    regenerationCount?: number;
    notes?: string;
    [key: string]: any;
  }>().default({}),
});

// Subscription history for tracking changes and grace periods
export const subscriptionHistory = pgTable("subscription_history", {
  id: serial("id").primaryKey(),
  healthSystemId: integer("health_system_id").notNull().references(() => healthSystems.id),
  previousTier: integer("previous_tier"),
  newTier: integer("new_tier"),
  changeType: text("change_type"), // 'upgrade', 'downgrade', 'expire', 'reactivate'
  changedAt: timestamp("changed_at").defaultNow(),
  gracePeriodEnds: timestamp("grace_period_ends"),
  dataExpiresAt: timestamp("data_expires_at"), // 30 days after grace period ends
  metadata: jsonb("metadata").$type<{
    reason?: string;
    adminNotes?: string;
    [key: string]: any;
  }>().default({}),
});

// Email notifications tracking
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  subject: text("subject"),
  metadata: jsonb("metadata").$type<{
    templateUsed?: string;
    sendStatus?: string;
    [key: string]: any;
  }>().default({}),
});

// Clinic administrator verification requests
export const clinicAdminVerifications = pgTable("clinic_admin_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  organizationName: text("organization_name").notNull(),
  verificationCode: text("verification_code").notNull(),
  verificationData: jsonb("verification_data").notNull(), // Full request data
  status: text("status").default('pending'), // 'pending', 'approved', 'rejected', 'expired'
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  expiresAt: timestamp("expires_at").notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

// Organization verification documents
export const organizationDocuments = pgTable("organization_documents", {
  id: serial("id").primaryKey(),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id).notNull(),
  documentType: text("document_type").notNull(), // 'baa', 'business_license', 'medical_license', 'insurance', 'tax_exempt'
  documentUrl: text("document_url").notNull(),
  documentName: text("document_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by").references(() => users.id),
  expiresAt: timestamp("expires_at"), // For licenses that expire
  metadata: jsonb("metadata")
});

// Insert schemas for new tables
export const insertSubscriptionKeySchema = createInsertSchema(subscriptionKeys).pick({
  key: true,
  healthSystemId: true,
  keyType: true,
  subscriptionTier: true,
  expiresAt: true,
  metadata: true,
});

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).pick({
  healthSystemId: true,
  previousTier: true,
  newTier: true,
  changeType: true,
  gracePeriodEnds: true,
  dataExpiresAt: true,
  metadata: true,
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).pick({
  userId: true,
  healthSystemId: true,
  notificationType: true,
  emailAddress: true,
  subject: true,
  metadata: true,
});

// Export types
export type SubscriptionKey = typeof subscriptionKeys.$inferSelect;
export type InsertSubscriptionKey = z.infer<typeof insertSubscriptionKeySchema>;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;

// Insert schemas for verification tables
export const insertClinicAdminVerificationSchema = createInsertSchema(clinicAdminVerifications).pick({
  email: true,
  organizationName: true,
  verificationCode: true,
  verificationData: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true
});

export const insertOrganizationDocumentSchema = createInsertSchema(organizationDocuments).pick({
  healthSystemId: true,
  documentType: true,
  documentUrl: true,
  documentName: true,
  uploadedBy: true,
  expiresAt: true,
  metadata: true
});

// Export types for verification tables
export type ClinicAdminVerification = typeof clinicAdminVerifications.$inferSelect;
export type InsertClinicAdminVerification = z.infer<typeof insertClinicAdminVerificationSchema>;
export type OrganizationDocument = typeof organizationDocuments.$inferSelect;
export type InsertOrganizationDocument = z.infer<typeof insertOrganizationDocumentSchema>;

// Subscription keys relations
export const subscriptionKeysRelations = relations(subscriptionKeys, ({ one }) => ({
  healthSystem: one(healthSystems, {
    fields: [subscriptionKeys.healthSystemId],
    references: [healthSystems.id],
  }),
  usedByUser: one(users, {
    fields: [subscriptionKeys.usedBy],
    references: [users.id],
  }),
  deactivatedByUser: one(users, {
    fields: [subscriptionKeys.deactivatedBy],
    references: [users.id],
  }),
}));

// Subscription history relations
export const subscriptionHistoryRelations = relations(subscriptionHistory, ({ one }) => ({
  healthSystem: one(healthSystems, {
    fields: [subscriptionHistory.healthSystemId],
    references: [healthSystems.id],
  }),
}));

// Email notifications relations
export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  user: one(users, {
    fields: [emailNotifications.userId],
    references: [users.id],
  }),
  healthSystem: one(healthSystems, {
    fields: [emailNotifications.healthSystemId],
    references: [healthSystems.id],
  }),
}));

// Clinic admin verifications relations
export const clinicAdminVerificationsRelations = relations(clinicAdminVerifications, ({ one }) => ({
  healthSystem: one(healthSystems, {
    fields: [clinicAdminVerifications.healthSystemId],
    references: [healthSystems.id],
  }),
  approvedByUser: one(users, {
    fields: [clinicAdminVerifications.approvedBy],
    references: [users.id],
  }),
}));

// Organization documents relations
export const organizationDocumentsRelations = relations(organizationDocuments, ({ one }) => ({
  healthSystem: one(healthSystems, {
    fields: [organizationDocuments.healthSystemId],
    references: [healthSystems.id],
  }),
  uploadedByUser: one(users, {
    fields: [organizationDocuments.uploadedBy],
    references: [users.id],
  }),
  verifiedByUser: one(users, {
    fields: [organizationDocuments.verifiedBy],
    references: [users.id],
  }),
}));

// Migration invitations relations
export const migrationInvitationsRelations = relations(migrationInvitations, ({ one }) => ({
  invitedUser: one(users, {
    fields: [migrationInvitations.invitedUserId],
    references: [users.id],
  }),
  targetHealthSystem: one(healthSystems, {
    fields: [migrationInvitations.targetHealthSystemId],
    references: [healthSystems.id],
  }),
  createdByUser: one(users, {
    fields: [migrationInvitations.createdByUserId],
    references: [users.id],
  }),
}));

// ============================================
// HIPAA AUDIT LOGGING TABLES
// ============================================
// Comprehensive audit logging for HIPAA compliance
// Must track all PHI access, modifications, and authentication events

/**
 * PHI Access Audit Log
 * Tracks every access to patient health information
 * Required for HIPAA compliance - minimum 6 year retention
 */
export const phiAccessLogs = pgTable("phi_access_logs", {
  id: serial("id").primaryKey(),
  
  // Who accessed the data
  userId: integer("user_id").references(() => users.id).notNull(),
  userName: text("user_name").notNull(), // Denormalized for immutability
  userRole: text("user_role").notNull(), // Denormalized for immutability
  healthSystemId: integer("health_system_id").references(() => healthSystems.id).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  
  // What was accessed
  patientId: integer("patient_id").references(() => patients.id),
  patientName: text("patient_name"), // Denormalized for immutability (encrypted)
  resourceType: text("resource_type").notNull(), // 'patient', 'encounter', 'medication', 'lab_result', etc.
  resourceId: integer("resource_id").notNull(),
  
  // How it was accessed
  action: text("action").notNull(), // 'view', 'create', 'update', 'delete', 'print', 'export'
  accessMethod: text("access_method").notNull(), // 'web', 'api', 'mobile', 'report'
  httpMethod: text("http_method"), // GET, POST, PUT, DELETE
  apiEndpoint: text("api_endpoint"), // /api/patients/:id
  
  // Context
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  
  // Result
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // milliseconds
  
  // Additional compliance data
  accessReason: text("access_reason"), // 'treatment', 'payment', 'operations', 'patient_request'
  emergencyAccess: boolean("emergency_access").default(false),
  breakGlassReason: text("break_glass_reason"), // For emergency override access
  
  // Immutable timestamp
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
});

/**
 * Authentication Audit Log
 * Tracks all authentication attempts and session events
 */
export const authenticationLogs = pgTable("authentication_logs", {
  id: serial("id").primaryKey(),
  
  // User info (may be null for failed login attempts)
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  email: text("email"),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id),
  
  // Event details
  eventType: text("event_type").notNull(), // 'login_attempt', 'login_success', 'login_failure', 'logout', 'session_timeout', 'password_change', 'mfa_challenge', 'account_locked'
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // 'invalid_password', 'account_locked', 'mfa_failed', etc.
  
  // Security info
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  browserInfo: text("browser_info"), // Browser name, version, etc.
  deviceInfo: text("device_info"), // Device type, OS, etc.
  geolocation: jsonb("geolocation").$type<{
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }>(),
  
  // Session info
  sessionId: text("session_id"),
  sessionDuration: integer("session_duration"), // seconds
  logoutType: text("logout_type"), // 'manual', 'timeout', 'forced', etc.
  logoutReason: text("logout_reason"), // Reason for logout if applicable
  
  // MFA info
  mfaType: text("mfa_type"), // 'totp', 'sms', 'email'
  mfaSuccess: boolean("mfa_success"),
  
  // Risk assessment
  riskScore: integer("risk_score"), // 0-100
  riskFactors: text("risk_factors").array(), // ['new_device', 'unusual_location', 'multiple_failures']
  
  // Immutable timestamp
  eventTime: timestamp("event_time").defaultNow().notNull(),
});

// Authentication log insert schema and types
export const insertAuthenticationLogSchema = createInsertSchema(authenticationLogs).pick({
  userId: true,
  username: true,
  email: true,
  healthSystemId: true,
  eventType: true,
  success: true,
  failureReason: true,
  ipAddress: true,
  userAgent: true,
  browserInfo: true,
  deviceInfo: true,
  geolocation: true,
  sessionId: true,
  sessionDuration: true,
  logoutType: true,
  logoutReason: true,
  mfaType: true,
  mfaSuccess: true,
  riskScore: true,
  riskFactors: true,
});

export type AuthenticationLog = typeof authenticationLogs.$inferSelect;
export type InsertAuthenticationLog = z.infer<typeof insertAuthenticationLogSchema>;

/**
 * Data Modification Audit Log
 * Tracks all changes to clinical data
 */
export const dataModificationLogs = pgTable("data_modification_logs", {
  id: serial("id").primaryKey(),
  
  // Who made the change
  userId: integer("user_id").references(() => users.id).notNull(),
  userName: text("user_name").notNull(), // Denormalized
  userRole: text("user_role").notNull(), // Denormalized
  healthSystemId: integer("health_system_id").references(() => healthSystems.id).notNull(),
  
  // What was changed
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  patientId: integer("patient_id").references(() => patients.id), // If applicable
  
  // Change details
  operation: text("operation").notNull(), // 'insert', 'update', 'delete'
  fieldName: text("field_name"), // For updates, which field changed
  oldValue: jsonb("old_value"), // Previous value (encrypted if PHI)
  newValue: jsonb("new_value"), // New value (encrypted if PHI)
  
  // Context
  changeReason: text("change_reason"), // User-provided reason for change
  encounterId: integer("encounter_id").references(() => encounters.id),
  orderAuthority: text("order_authority"), // For order-related changes
  
  // Validation
  validated: boolean("validated").default(false),
  validatedBy: integer("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  
  // Immutable timestamp
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
});

/**
 * Emergency Access Log
 * Special logging for break-glass emergency access scenarios
 */
export const emergencyAccessLogs = pgTable("emergency_access_logs", {
  id: serial("id").primaryKey(),
  
  // Who accessed
  userId: integer("user_id").references(() => users.id).notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  healthSystemId: integer("health_system_id").references(() => healthSystems.id).notNull(),
  
  // What was accessed
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  patientName: text("patient_name").notNull(), // Encrypted
  
  // Emergency details
  emergencyType: text("emergency_type").notNull(), // 'life_threatening', 'urgent_care', 'disaster_response'
  justification: text("justification").notNull(), // Required detailed explanation
  authorizingPhysician: text("authorizing_physician"),
  
  // Access scope
  accessStartTime: timestamp("access_start_time").defaultNow().notNull(),
  accessEndTime: timestamp("access_end_time"),
  accessedResources: jsonb("accessed_resources").$type<Array<{
    resourceType: string;
    resourceId: number;
    accessTime: string;
  }>>().default([]),
  
  // Review process
  reviewRequired: boolean("review_required").default(true),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewOutcome: text("review_outcome"), // 'approved', 'violation_found', 'additional_training_required'
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Magic Links for passwordless authentication
 * Stores temporary tokens for email-based authentication
 */
export const magicLinks = pgTable("magic_links", {
  id: serial("id").primaryKey(),
  
  // User association (null for registration links)
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  
  // Token details
  token: text("token").notNull().unique(),
  purpose: text("purpose").notNull(), // 'login', 'registration', 'password_reset'
  
  // Expiration and usage
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  
  // Security tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * WebAuthn Credentials for Passkey Authentication
 * Stores passkey credentials for users enabling passwordless authentication
 */
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: serial("id").primaryKey(),
  
  // User association
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Credential details
  credentialId: text("credential_id").unique().notNull(),
  credentialPublicKey: text("credential_public_key").notNull(),
  counter: integer("counter").default(0).notNull(),
  
  // Device information
  deviceType: text("device_type"),
  transports: jsonb("transports").$type<string[]>(),
  registeredDevice: text("registered_device"),
  
  // Metadata
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at")
}, (table) => ({
  userIdx: index("webauthn_credentials_user_idx").on(table.userId),
  credentialIdx: index("webauthn_credentials_credential_idx").on(table.credentialId),
  createdIdx: index("webauthn_credentials_created_idx").on(table.createdAt)
}));

// Blog/Article System Tables
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  category: text("category").notNull(),
  status: text("status").notNull().default("draft"), // draft, review, published, archived
  authorName: text("author_name").default("Clarafi Team"),
  featuredImage: text("featured_image"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  keywords: text("keywords").array(),
  targetAudience: text("target_audience"), // physician, administrator, ceo
  readingTime: integer("reading_time"), // in minutes
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  generatedAt: timestamp("generated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const articleRevisions = pgTable("article_revisions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  revisionNote: text("revision_note"),
  revisionType: text("revision_type"), // ai_edit, manual_edit, ai_feedback
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const articleComments = pgTable("article_comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false),
  parentId: integer("parent_id").references(() => articleComments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const articleGenerationQueue = pgTable("article_generation_queue", {
  id: serial("id").primaryKey(),
  topic: text("topic"),
  category: text("category").notNull(),
  targetAudience: text("target_audience").notNull(),
  keywords: text("keywords").array(),
  competitorMentions: text("competitor_mentions").array(),
  customPrompt: text("custom_prompt"), // For misc category custom prompts
  researchSources: jsonb("research_sources"), // URLs and snippets from web search
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed
  generatedArticleId: integer("generated_article_id").references(() => articles.id),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  preferences: jsonb("preferences"), // categories they're interested in
  source: text("source"), // blog, landing_page, etc
});

// Blog/Article System Types and Schemas
export const insertArticleSchema = createInsertSchema(articles).pick({
  title: true,
  slug: true,
  content: true,
  excerpt: true,
  category: true,
  status: true,
  authorName: true,
  featuredImage: true,
  metaTitle: true,
  metaDescription: true,
  keywords: true,
  targetAudience: true,
  readingTime: true,
  scheduledFor: true,
  reviewedBy: true,
});

export const insertArticleRevisionSchema = createInsertSchema(articleRevisions).pick({
  articleId: true,
  content: true,
  revisionNote: true,
  revisionType: true,
  createdBy: true,
});

export const insertArticleCommentSchema = createInsertSchema(articleComments).pick({
  articleId: true,
  authorName: true,
  authorEmail: true,
  content: true,
  isApproved: true,
  parentId: true,
});

export const insertArticleGenerationQueueSchema = createInsertSchema(articleGenerationQueue).pick({
  topic: true,
  category: true,
  targetAudience: true,
  keywords: true,
  competitorMentions: true,
  researchSources: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).pick({
  email: true,
  name: true,
  preferences: true,
  source: true,
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type ArticleRevision = typeof articleRevisions.$inferSelect;
export type InsertArticleRevision = z.infer<typeof insertArticleRevisionSchema>;
export type ArticleComment = typeof articleComments.$inferSelect;
export type InsertArticleComment = z.infer<typeof insertArticleCommentSchema>;
export type ArticleGenerationQueue = typeof articleGenerationQueue.$inferSelect;
export type InsertArticleGenerationQueue = z.infer<typeof insertArticleGenerationQueueSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

// Indexes will be created via SQL migration
