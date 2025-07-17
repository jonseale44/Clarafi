-- COMPREHENSIVE SAFE SCHEMA MIGRATION
-- Strategy: Add missing columns, create aliases for misnamed columns, preserve all existing data
-- Generated: 2025-07-17

-- =====================================================
-- IMMEDIATE FIX: patient_attachments table
-- =====================================================
-- The code expects 'file_name' but database has 'filename'
ALTER TABLE patient_attachments 
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Copy existing data from filename to file_name
UPDATE patient_attachments 
  SET file_name = filename 
  WHERE file_name IS NULL AND filename IS NOT NULL;

-- Also add other missing columns from schema
ALTER TABLE patient_attachments
  ADD COLUMN IF NOT EXISTS original_file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_extension TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER,
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS virus_scan_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Populate new columns with data from existing columns where possible
UPDATE patient_attachments SET
  original_file_name = COALESCE(original_file_name, filename),
  file_path = COALESCE(file_path, filename),
  mime_type = COALESCE(mime_type, 'application/octet-stream'),
  file_extension = CASE 
    WHEN filename LIKE '%.pdf' THEN 'pdf'
    WHEN filename LIKE '%.jpg' OR filename LIKE '%.jpeg' THEN 'jpg'
    WHEN filename LIKE '%.png' THEN 'png'
    ELSE 'unknown'
  END
WHERE mime_type IS NULL OR file_extension IS NULL;

-- =====================================================
-- CORE PATIENT TABLES: Add missing columns
-- =====================================================

-- ENCOUNTERS: Add missing columns
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS appointment_id INTEGER,
  ADD COLUMN IF NOT EXISTS discharge_summary TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS estimated_copay NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS billing_status TEXT,
  ADD COLUMN IF NOT EXISTS claim_number TEXT,
  ADD COLUMN IF NOT EXISTS primary_diagnosis_code TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS template_id INTEGER;

-- VITALS: Critical table - add all missing columns
ALTER TABLE vitals
  ADD COLUMN IF NOT EXISTS temperature NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height NUMERIC(10,2);

-- MEDICAL_PROBLEMS: Add all columns from schema
ALTER TABLE medical_problems
  ADD COLUMN IF NOT EXISTS problem_title TEXT,
  ADD COLUMN IF NOT EXISTS clinical_description TEXT,
  ADD COLUMN IF NOT EXISTS current_icd10_code TEXT,
  ADD COLUMN IF NOT EXISTS historical_icd10_codes JSONB,
  ADD COLUMN IF NOT EXISTS snomed_codes JSONB,
  ADD COLUMN IF NOT EXISTS clinical_course TEXT,
  ADD COLUMN IF NOT EXISTS treatment_response TEXT,
  ADD COLUMN IF NOT EXISTS complications JSONB,
  ADD COLUMN IF NOT EXISTS visibility_scope TEXT,
  ADD COLUMN IF NOT EXISTS reported_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_by_provider BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS patient_reported BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_monitoring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monitoring_interval TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed DATE,
  ADD COLUMN IF NOT EXISTS clinical_owner INTEGER,
  ADD COLUMN IF NOT EXISTS semantic_category TEXT,
  ADD COLUMN IF NOT EXISTS anatomical_location TEXT,
  ADD COLUMN IF NOT EXISTS laterality TEXT,
  ADD COLUMN IF NOT EXISTS is_surgical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trauma BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ranking_score NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS provider_ranking_adjustment NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS auto_ranking_factors JSONB,
  ADD COLUMN IF NOT EXISTS grouping_key TEXT,
  ADD COLUMN IF NOT EXISTS parent_problem_id INTEGER,
  ADD COLUMN IF NOT EXISTS child_problems JSONB,
  ADD COLUMN IF NOT EXISTS original_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS last_updated_from_extract TIMESTAMP,
  ADD COLUMN IF NOT EXISTS encounter_specific_details JSONB,
  ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB,
  ADD COLUMN IF NOT EXISTS integration_metadata JSONB;

-- MEDICATIONS: Add missing columns
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS strength TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS grouping_strategy TEXT,
  ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

-- ORDERS: Add missing columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS urgency TEXT,
  ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

-- HEALTH_SYSTEMS: Add missing columns
ALTER TABLE health_systems
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS system_type TEXT,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS merged_into_health_system_id INTEGER,
  ADD COLUMN IF NOT EXISTS merged_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS original_provider_id INTEGER,
  ADD COLUMN IF NOT EXISTS primary_contact TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS npi TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors JSONB,
  ADD COLUMN IF NOT EXISTS subscription_limits JSONB,
  ADD COLUMN IF NOT EXISTS active_user_count JSONB,
  ADD COLUMN IF NOT EXISTS billing_details JSONB,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- ORGANIZATIONS: Add missing columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS health_system_id INTEGER,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'clinic',
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS npi TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Rename zip to zip_code if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'zip') THEN
    ALTER TABLE organizations RENAME COLUMN zip TO zip_code;
  END IF;
END $$;

-- LOCATIONS: Add missing organization_id
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- =====================================================
-- MAKE EXTRA COLUMNS NULLABLE (Safer than removing)
-- =====================================================

-- For columns that exist in DB but not in schema, make them nullable
-- This prevents constraint violations while preserving functionality

ALTER TABLE allergies
  ALTER COLUMN encounter_id DROP NOT NULL,
  ALTER COLUMN notes DROP NOT NULL,
  ALTER COLUMN verified_by DROP NOT NULL,
  ALTER COLUMN verified_at DROP NOT NULL,
  ALTER COLUMN source_timestamp DROP NOT NULL,
  ALTER COLUMN extracted_from_attachment_id DROP NOT NULL;

ALTER TABLE medications
  ALTER COLUMN generic_name DROP NOT NULL,
  ALTER COLUMN brand_name DROP NOT NULL,
  ALTER COLUMN reason DROP NOT NULL,
  ALTER COLUMN pharmacy DROP NOT NULL,
  ALTER COLUMN prescriber_notes DROP NOT NULL,
  ALTER COLUMN side_effects DROP NOT NULL;

ALTER TABLE medical_problems
  ALTER COLUMN acuity DROP NOT NULL,
  ALTER COLUMN functional_status DROP NOT NULL,
  ALTER COLUMN episode_status DROP NOT NULL,
  ALTER COLUMN primary_diagnosis DROP NOT NULL;

ALTER TABLE encounters
  ALTER COLUMN patient_name DROP NOT NULL,
  ALTER COLUMN visit_type DROP NOT NULL,
  ALTER COLUMN discharge_date DROP NOT NULL,
  ALTER COLUMN discharge_disposition DROP NOT NULL;

-- =====================================================
-- CREATE HELPFUL INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient_id ON patient_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_encounter_id ON patient_attachments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_problems_patient_id ON medical_problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient_id ON orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_encounter_id ON orders(encounter_id);

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration:
-- 1. Fixes immediate errors (like file_name issue)
-- 2. Adds all missing columns from schema
-- 3. Makes extra columns nullable instead of removing them
-- 4. Creates indexes for better performance
-- 5. Preserves all existing data and functionality