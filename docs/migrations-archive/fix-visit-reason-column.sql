-- Fix missing visit_reason column

-- Add missing column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS visit_reason TEXT;

-- Comment for clarity
COMMENT ON COLUMN appointments.visit_reason IS 'Reason for the visit (similar to chief complaint but may be more detailed)';