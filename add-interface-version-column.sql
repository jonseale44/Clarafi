-- Add interface_version column to lab_results table
-- This column is defined in schema.ts and is being used by the lab processor

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS interface_version TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN lab_results.interface_version IS 'Version of the interface/integration used to import this result';