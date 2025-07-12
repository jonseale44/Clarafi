-- Fix diagnoses table columns
-- Based on comparison between schema.ts and actual database

-- Current DB columns:
-- id, patient_id, encounter_id, diagnosis_code, diagnosis_description, 
-- diagnosis_type, status, onset_date, resolution_date, notes, severity, 
-- clinician_id, created_at, updated_at

-- Schema.ts columns (converted to snake_case):
-- id, patient_id, encounter_id, diagnosis, icd10_code, diagnosis_date,
-- status, notes, is_primary, diagnosis_pointer, billing_sequence,
-- claim_submission_status, claim_submission_date, claim_rejection_reason,
-- medical_necessity_documented, prior_authorization_required,
-- prior_authorization_number, modifier_applied, provider_id,
-- created_at, updated_at

-- Step 1: Add missing columns
ALTER TABLE diagnoses 
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS icd10_code TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_date DATE,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS diagnosis_pointer TEXT,
ADD COLUMN IF NOT EXISTS billing_sequence INTEGER,
ADD COLUMN IF NOT EXISTS claim_submission_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS claim_submission_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS claim_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS medical_necessity_documented BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prior_authorization_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prior_authorization_number TEXT,
ADD COLUMN IF NOT EXISTS modifier_applied TEXT,
ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES users(id);

-- Step 2: Migrate data from old columns to new ones (if needed)
UPDATE diagnoses 
SET diagnosis = diagnosis_description,
    icd10_code = diagnosis_code,
    diagnosis_date = onset_date,
    provider_id = clinician_id
WHERE diagnosis IS NULL;

-- Step 3: Drop columns that don't exist in schema
ALTER TABLE diagnoses
DROP COLUMN IF EXISTS diagnosis_code,
DROP COLUMN IF EXISTS diagnosis_description,
DROP COLUMN IF EXISTS diagnosis_type,
DROP COLUMN IF EXISTS onset_date,
DROP COLUMN IF EXISTS resolution_date,
DROP COLUMN IF EXISTS severity,
DROP COLUMN IF EXISTS clinician_id;