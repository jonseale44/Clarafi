-- Fix ALL remaining scheduling errors comprehensively

-- 1. Fix missing column in patient_scheduling_patterns table
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS no_show_by_day_of_week JSONB DEFAULT '{}'::jsonb;

-- 2. Fix duration_minutes to be nullable (or set default) since we're not always providing it
ALTER TABLE appointments 
ALTER COLUMN duration_minutes DROP NOT NULL;

-- 3. Add any other missing columns that might be referenced
ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS visit_patterns JSONB DEFAULT '{}'::jsonb;

ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS seasonal_patterns JSONB DEFAULT '{}'::jsonb;

-- 4. Ensure all columns match what the code expects
COMMENT ON COLUMN patient_scheduling_patterns.no_show_by_day_of_week IS 'JSON object with day of week (0-6) as keys and no-show rates as values';
COMMENT ON COLUMN patient_scheduling_patterns.arrival_consistency IS 'Standard deviation of arrival times in minutes';