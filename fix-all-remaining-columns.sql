-- Fix all remaining column issues based on errors we're seeing

-- Encounters table - add missing columns
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS nurse_assessment TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS nurse_interventions TEXT;  
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS nurse_notes TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_type TEXT DEFAULT 'office_visit';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_subtype TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_status TEXT DEFAULT 'in_progress';

-- Vitals table - ensure all columns exist
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'manual';
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_by INTEGER;

-- Allergies table - add any remaining columns
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS allergy_type TEXT;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS onset_date DATE;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unconfirmed';
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS drug_class TEXT;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS cross_reactivity TEXT[];
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS source_notes TEXT;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS entered_by INTEGER;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS temporal_conflict_resolution TEXT;
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;

-- Show columns for verification
\d allergies
\d encounters
\d vitals