-- COMPREHENSIVE DATABASE SCHEMA FIX
-- This script adds ALL missing columns from schema.ts to the database

-- VITALS TABLE FIXES
ALTER TABLE vitals 
ADD COLUMN IF NOT EXISTS source_notes TEXT,
ADD COLUMN IF NOT EXISTS parsed_from_text BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'routine';

-- MEDICATIONS TABLE FIXES - Add ALL missing columns from schema.ts
ALTER TABLE medications
-- Core medication info
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS generic_name TEXT,
ADD COLUMN IF NOT EXISTS strength TEXT,
ADD COLUMN IF NOT EXISTS dosage_form TEXT,
ADD COLUMN IF NOT EXISTS route TEXT,

-- Prescription details
ADD COLUMN IF NOT EXISTS quantity_unit TEXT,
ADD COLUMN IF NOT EXISTS days_supply INTEGER,
ADD COLUMN IF NOT EXISTS refills_remaining INTEGER,
ADD COLUMN IF NOT EXISTS total_refills INTEGER,
ADD COLUMN IF NOT EXISTS sig TEXT,

-- Standardization codes
ADD COLUMN IF NOT EXISTS rxnorm_code TEXT,
ADD COLUMN IF NOT EXISTS ndc_code TEXT,
ADD COLUMN IF NOT EXISTS surescripts_id TEXT,

-- Clinical context
ADD COLUMN IF NOT EXISTS clinical_indication TEXT,

-- Two-phase workflow support
ADD COLUMN IF NOT EXISTS source_order_id INTEGER,
ADD COLUMN IF NOT EXISTS problem_mappings JSONB DEFAULT '[]',

-- Change tracking
ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
ADD COLUMN IF NOT EXISTS medication_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS visit_history JSONB DEFAULT '[]',

-- Source attribution
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS source_notes TEXT,
ADD COLUMN IF NOT EXISTS extracted_from_attachment_id INTEGER,
ADD COLUMN IF NOT EXISTS entered_by INTEGER,

-- GPT-driven organization
ADD COLUMN IF NOT EXISTS grouping_strategy TEXT DEFAULT 'medical_problem',
ADD COLUMN IF NOT EXISTS related_medications JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS drug_interactions JSONB DEFAULT '[]',

-- External integration
ADD COLUMN IF NOT EXISTS pharmacy_order_id TEXT,
ADD COLUMN IF NOT EXISTS insurance_auth_status TEXT,
ADD COLUMN IF NOT EXISTS prior_auth_required BOOLEAN DEFAULT false;

-- ENCOUNTERS TABLE FIXES - Add missing columns based on common errors
ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS nurse_assessment TEXT,
ADD COLUMN IF NOT EXISTS nurse_interventions TEXT,
ADD COLUMN IF NOT EXISTS nurse_notes TEXT;

-- ALLERGIES TABLE FIXES - Ensure all columns exist
ALTER TABLE allergies
ADD COLUMN IF NOT EXISTS entered_by INTEGER,
ADD COLUMN IF NOT EXISTS temporal_conflict_resolution TEXT,
ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;

-- Verify the changes
\echo 'Checking vitals table columns...'
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'vitals' 
AND column_name IN ('source_notes', 'parsed_from_text', 'entry_type', 'systolic_bp', 'diastolic_bp', 'alerts', 'original_text');

\echo 'Checking medications table columns...'
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'medications' 
AND column_name IN ('dosage_form', 'brand_name', 'generic_name', 'strength', 'route', 'quantity_unit', 'visit_history');

\echo 'Database schema fixes completed!'