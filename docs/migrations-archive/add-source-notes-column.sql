-- Add source_notes column to lab_results table
-- This column is defined in schema.ts and is being used by the lab processor

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN lab_results.source_notes IS 'Additional notes about the source of this lab result';