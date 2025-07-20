-- Add communication_status column to lab_results table
-- This column is already defined in schema.ts but missing from database

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS communication_status TEXT DEFAULT 'none';

-- Add a comment explaining the column
COMMENT ON COLUMN lab_results.communication_status IS 'Communication status: none, pending, completed';