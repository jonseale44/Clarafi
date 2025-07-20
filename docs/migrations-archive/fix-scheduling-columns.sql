-- Fix patient_scheduling_patterns table missing columns
-- These columns are defined in schema.ts but missing from database

-- Add avg_visit_duration column (line 610 in schema.ts)
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS avg_visit_duration DECIMAL(5,2);

-- Add other potentially missing columns based on schema.ts
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS no_show_rate DECIMAL(5,2);

ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS avg_arrival_delta DECIMAL(5,2);

-- Comments for clarity
COMMENT ON COLUMN patient_scheduling_patterns.avg_visit_duration IS 'Average visit duration in minutes for this patient';
COMMENT ON COLUMN patient_scheduling_patterns.no_show_rate IS 'Percentage of appointments marked as no-show';
COMMENT ON COLUMN patient_scheduling_patterns.avg_arrival_delta IS 'Average minutes early (negative) or late (positive) for appointments';