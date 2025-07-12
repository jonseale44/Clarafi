-- Fix Schema Drift: Add Missing Columns Script
-- This script adds columns that exist in schema.ts but are missing from the database
-- Having extra columns won't break functionality, but missing columns cause errors

-- 1. Fix medical_problems table (currently only has 6 columns, needs all clinical fields)
ALTER TABLE medical_problems
ADD COLUMN IF NOT EXISTS problem_title TEXT,
ADD COLUMN IF NOT EXISTS current_icd10_code TEXT,
ADD COLUMN IF NOT EXISTS problem_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS first_diagnosed_date DATE,
ADD COLUMN IF NOT EXISTS first_encounter_id INTEGER REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS last_updated_encounter_id INTEGER REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_ranked_encounter_id INTEGER REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS ranking_reason TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'encounter',
ADD COLUMN IF NOT EXISTS extracted_from_attachment_id INTEGER REFERENCES patient_attachments(id),
ADD COLUMN IF NOT EXISTS problem_category TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT,
ADD COLUMN IF NOT EXISTS acuity_level TEXT,
ADD COLUMN IF NOT EXISTS treatment_status TEXT,
ADD COLUMN IF NOT EXISTS monitoring_frequency TEXT,
ADD COLUMN IF NOT EXISTS last_reviewed_date DATE,
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS related_problems JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS complication_risk TEXT,
ADD COLUMN IF NOT EXISTS patient_education_provided BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS care_plan_notes TEXT;

-- 2. Fix medications table (missing strength and other clinical fields)
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS strength TEXT,
ADD COLUMN IF NOT EXISTS dosage_form TEXT,
ADD COLUMN IF NOT EXISTS rxnorm_code TEXT,
ADD COLUMN IF NOT EXISTS surescripts_id TEXT,
ADD COLUMN IF NOT EXISTS source_order_id INTEGER,
ADD COLUMN IF NOT EXISTS problem_mappings JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS discontinued_date DATE,
ADD COLUMN IF NOT EXISTS prescriber TEXT,
ADD COLUMN IF NOT EXISTS first_encounter_id INTEGER REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS last_updated_encounter_id INTEGER REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS refills_remaining INTEGER,
ADD COLUMN IF NOT EXISTS total_refills INTEGER,
ADD COLUMN IF NOT EXISTS medication_class TEXT,
ADD COLUMN IF NOT EXISTS therapeutic_class TEXT,
ADD COLUMN IF NOT EXISTS dea_schedule TEXT,
ADD COLUMN IF NOT EXISTS black_box_warning BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monitoring_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monitoring_parameters TEXT,
ADD COLUMN IF NOT EXISTS last_dispensed_date DATE,
ADD COLUMN IF NOT EXISTS pharmacy_name TEXT,
ADD COLUMN IF NOT EXISTS pharmacy_phone TEXT,
ADD COLUMN IF NOT EXISTS prior_authorization_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prior_authorization_status TEXT,
ADD COLUMN IF NOT EXISTS generic_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS formulary_status TEXT,
ADD COLUMN IF NOT EXISTS patient_instructions TEXT,
ADD COLUMN IF NOT EXISTS discontinuation_reason TEXT,
ADD COLUMN IF NOT EXISTS adverse_reactions TEXT;

-- 3. Add missing tables that exist in schema but not in database
-- Create migration_invitations table
CREATE TABLE IF NOT EXISTS migration_invitations (
  id SERIAL PRIMARY KEY,
  from_health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  to_health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  to_user_email TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  patient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lab_reference_ranges table
CREATE TABLE IF NOT EXISTS lab_reference_ranges (
  id SERIAL PRIMARY KEY,
  lab_test_name TEXT NOT NULL,
  loinc_code TEXT,
  age_min INTEGER,
  age_max INTEGER,
  gender TEXT,
  reference_range_low NUMERIC(10, 4),
  reference_range_high NUMERIC(10, 4),
  critical_low NUMERIC(10, 4),
  critical_high NUMERIC(10, 4),
  unit TEXT,
  notes TEXT,
  effective_date DATE,
  expiration_date DATE,
  source TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patient_physical_findings table
CREATE TABLE IF NOT EXISTS patient_physical_findings (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  body_system TEXT NOT NULL,
  finding_category TEXT NOT NULL,
  finding_detail TEXT NOT NULL,
  laterality TEXT,
  severity TEXT,
  first_noted_encounter INTEGER REFERENCES encounters(id),
  last_confirmed_encounter INTEGER REFERENCES encounters(id),
  last_seen_encounter INTEGER REFERENCES encounters(id),
  confirmed_count INTEGER DEFAULT 0,
  contradicted_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  chronic BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create problem_rank_overrides table  
CREATE TABLE IF NOT EXISTS problem_rank_overrides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  icd10_code TEXT NOT NULL,
  override_rank INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, icd10_code)
);

-- Create user_problem_list_preferences table
CREATE TABLE IF NOT EXISTS user_problem_list_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  display_threshold INTEGER DEFAULT 100,
  group_by_category BOOLEAN DEFAULT false,
  show_inactive BOOLEAN DEFAULT false,
  show_resolved BOOLEAN DEFAULT false,
  sort_order TEXT DEFAULT 'rank',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fix other tables with missing columns
-- Fix external_labs table (schema uses camelCase)
ALTER TABLE external_labs
ADD COLUMN IF NOT EXISTS lab_name TEXT,
ADD COLUMN IF NOT EXISTS lab_identifier TEXT,
ADD COLUMN IF NOT EXISTS integration_type TEXT,
ADD COLUMN IF NOT EXISTS api_endpoint TEXT,
ADD COLUMN IF NOT EXISTS hl7_endpoint TEXT,
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS username_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ssl_certificate_path TEXT;

-- Fix lab_orders table (missing many columns)
ALTER TABLE lab_orders
ADD COLUMN IF NOT EXISTS test_catalog_id INTEGER,
ADD COLUMN IF NOT EXISTS order_set_id INTEGER,
ADD COLUMN IF NOT EXISTS clinical_indication TEXT,
ADD COLUMN IF NOT EXISTS specimen_source TEXT,
ADD COLUMN IF NOT EXISTS collection_datetime TIMESTAMP,
ADD COLUMN IF NOT EXISTS collection_notes TEXT,
ADD COLUMN IF NOT EXISTS fasting_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stat_order BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_order_id TEXT,
ADD COLUMN IF NOT EXISTS transmitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS insurance_coverage_checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS patient_instructions TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS result_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS critical_callback_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specimen_rejected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Fix diagnoses table (ensure all billing columns exist)
ALTER TABLE diagnoses
ADD COLUMN IF NOT EXISTS clinician_id INTEGER REFERENCES users(id);

-- Fix allergies table (add missing columns)
ALTER TABLE allergies
ADD COLUMN IF NOT EXISTS drug_class TEXT,
ADD COLUMN IF NOT EXISTS last_reaction_date DATE,
ADD COLUMN IF NOT EXISTS temporal_conflict_resolution TEXT,
ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT,
ADD COLUMN IF NOT EXISTS extraction_notes TEXT;

COMMIT;