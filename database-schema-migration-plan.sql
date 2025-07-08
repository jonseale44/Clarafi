-- COMPREHENSIVE SCHEMA MIGRATION PLAN
-- Chunked approach to prevent timeouts
-- Each chunk can be run independently with rollback capability

-- ====================
-- CHUNK 1: CRITICAL COLUMN FIXES (High Priority)
-- ====================

-- 1.1 Fix medical_problems table (most critical)
BEGIN;
ALTER TABLE medical_problems RENAME COLUMN problem_name TO problem_title;
COMMIT;

-- 1.2 Fix patient_attachments file_type constraint
BEGIN;
ALTER TABLE patient_attachments ALTER COLUMN file_type DROP NOT NULL;
COMMIT;

-- 1.3 Fix encounters table foreign key constraints
BEGIN;
ALTER TABLE encounters ALTER COLUMN patient_id SET NOT NULL;
ALTER TABLE encounters ALTER COLUMN provider_id SET NOT NULL;
COMMIT;

-- ====================
-- CHUNK 2: MEDICAL PROBLEMS TABLE COMPLETION
-- ====================

BEGIN;
-- Add missing columns to medical_problems
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS current_icd10_code TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS problem_status TEXT DEFAULT 'active';
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_diagnosed_date DATE;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_encounter_id INTEGER REFERENCES encounters(id);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS last_updated_encounter_id INTEGER REFERENCES encounters(id);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]';
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS last_ranked_encounter_id INTEGER REFERENCES encounters(id);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS ranking_reason TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS ranking_factors JSONB;
COMMIT;

-- ====================
-- CHUNK 3: PATIENT ATTACHMENTS TABLE COMPLETION
-- ====================

BEGIN;
-- Add missing columns to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS original_file_name TEXT;
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS file_extension TEXT;
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id);
-- Fix uploadedBy constraint to be NOT NULL
UPDATE patient_attachments SET uploaded_by = 5 WHERE uploaded_by IS NULL;
ALTER TABLE patient_attachments ALTER COLUMN uploaded_by SET NOT NULL;
COMMIT;

-- ====================
-- CHUNK 4: USERS TABLE STANDARDIZATION
-- ====================

BEGIN;
-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_system_id INTEGER DEFAULT 2 REFERENCES health_systems(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS npi TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP;
COMMIT;

-- ====================
-- CHUNK 5: ENCOUNTERS TABLE COMPLETION
-- ====================

BEGIN;
-- Add missing columns to encounters table
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_date DATE;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS vital_signs JSONB;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS medical_decision_making TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS procedure_notes TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS complications TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS patient_instructions TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS ai_conversation_state JSONB;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT false;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'soap';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS ai_enhancement_used BOOLEAN DEFAULT false;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS enhancement_preferences JSONB;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS custom_template_id INTEGER;
COMMIT;

-- ====================
-- CHUNK 6: CLINICAL TABLES ALIGNMENT
-- ====================

BEGIN;
-- Fix allergies table alignment
ALTER TABLE allergies RENAME COLUMN allergy_type TO allergy_type_temp;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS allergy_type TEXT;
UPDATE allergies SET allergy_type = allergy_type_temp;
ALTER TABLE allergies DROP COLUMN allergy_type_temp;

-- Fix medications table alignment
ALTER TABLE medications ADD COLUMN IF NOT EXISTS medication_name TEXT;
UPDATE medications SET medication_name = medication_name WHERE medication_name IS NOT NULL;
COMMIT;

-- ====================
-- CHUNK 7: CLEANUP AND OPTIMIZATION
-- ====================

BEGIN;
-- Remove unused columns that aren't in schema
-- (This will be done carefully after testing)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medical_problems_patient_id ON medical_problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient_id ON patient_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_provider_id ON encounters(provider_id);
COMMIT;

-- ====================
-- VERIFICATION QUERIES
-- ====================

-- Verify medical_problems table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'medical_problems'
ORDER BY ordinal_position;

-- Verify patient_attachments table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'patient_attachments'
ORDER BY ordinal_position;

-- Verify encounters table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'encounters'
ORDER BY ordinal_position;