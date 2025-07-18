-- Fix additional scheduling-related issues

-- Add missing column to patient_scheduling_patterns table
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS visit_duration_std_dev DECIMAL(5,2);

-- Comment for clarity
COMMENT ON COLUMN patient_scheduling_patterns.visit_duration_std_dev IS 'Standard deviation of visit durations for statistical analysis';