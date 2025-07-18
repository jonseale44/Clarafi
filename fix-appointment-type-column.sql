-- Fix missing appointment_type column

-- Add missing column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'follow-up';

-- Comment for clarity
COMMENT ON COLUMN appointments.appointment_type IS 'Type of appointment: new_patient, follow_up, annual_physical, urgent, telehealth';