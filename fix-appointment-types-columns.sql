-- Fix appointment_types table columns to match database
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update data if columns have data in wrong columns
UPDATE appointment_types SET name = type_name WHERE name IS NULL AND type_name IS NOT NULL;
UPDATE appointment_types SET duration_minutes = default_duration WHERE duration_minutes IS NULL AND default_duration IS NOT NULL;
UPDATE appointment_types SET is_active = active WHERE is_active IS NULL AND active IS NOT NULL;
