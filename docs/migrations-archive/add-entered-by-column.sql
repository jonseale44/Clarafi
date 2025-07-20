-- Add entered_by column to lab_results table
-- This column is being used by the lab processor

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS entered_by INTEGER REFERENCES users(id);

-- Add a comment explaining the column
COMMENT ON COLUMN lab_results.entered_by IS 'User who entered this lab result';