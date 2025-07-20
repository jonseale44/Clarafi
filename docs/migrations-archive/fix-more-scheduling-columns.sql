-- Fix additional scheduling-related missing columns

-- Add missing columns to patient_scheduling_patterns table
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS avg_duration_by_type JSONB;

-- Add missing columns to appointments table
-- Note: appointment_date already exists in schema.ts line 963, so this is the DB missing it
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_date DATE;

-- Comments for clarity
COMMENT ON COLUMN patient_scheduling_patterns.avg_duration_by_type IS 'JSON object mapping appointment types to average durations';
COMMENT ON COLUMN appointments.appointment_date IS 'Date of the appointment (separate from time)';