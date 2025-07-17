-- Safe Incremental Database Fix
-- Strategy: Add missing columns, keep existing ones, fix known issues

-- 1. Fix known naming issues
-- The code expects 'file_name' but database has 'filename'
ALTER TABLE patient_attachments 
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Copy data from filename to file_name if it exists
UPDATE patient_attachments 
  SET file_name = filename 
  WHERE file_name IS NULL AND filename IS NOT NULL;

-- 2. Add all missing columns from schema (safe - only adds, doesn't remove)
-- This ensures the code can work with what it expects

-- Example for encounters table (add missing columns)
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

-- For vitals table (add what's missing in snake_case)
ALTER TABLE vitals 
  ADD COLUMN IF NOT EXISTS temperature NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS bmi NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS temperature_celsius NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2);

-- 3. Make extra columns nullable (safer than removing)
-- This prevents any constraint violations while preserving functionality

-- For columns that exist in DB but not in schema, make them nullable
ALTER TABLE allergies 
  ALTER COLUMN encounter_id DROP NOT NULL,
  ALTER COLUMN notes DROP NOT NULL,
  ALTER COLUMN verified_by DROP NOT NULL,
  ALTER COLUMN verified_at DROP NOT NULL;

-- Continue pattern for other tables...

-- 4. Only drop columns that have NO data (verify first!)
-- Run these queries first to check:
-- SELECT COUNT(*) FROM table_name WHERE column_name IS NOT NULL;

-- 5. Add indexes for better performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient_id ON patient_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_encounter_id ON patient_attachments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);