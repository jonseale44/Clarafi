-- Add source_system column to lab_results table
-- This column is defined in schema.ts and is being used by the lab processor

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS source_system TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN lab_results.source_system IS 'Source system identifier (epic, cerner, labcorp, quest, etc.)';