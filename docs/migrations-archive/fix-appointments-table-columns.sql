-- Fix appointments table missing columns
-- These columns are defined in schema.ts but missing from database

-- Add provider_scheduled_duration column (line 970 in schema.ts)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS provider_scheduled_duration INTEGER;

-- Also ensure patient_visible_duration exists (line 969 in schema.ts)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER;

-- Comments for clarity
COMMENT ON COLUMN appointments.provider_scheduled_duration IS 'Duration in minutes that provider has blocked for this appointment';
COMMENT ON COLUMN appointments.patient_visible_duration IS 'Duration in minutes shown to patient (may be shorter than actual scheduled time)';