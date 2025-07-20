-- Fix start_time and end_time columns to be TEXT instead of TIMESTAMP
-- The schema.ts defines these as TEXT fields but database has them as TIMESTAMP

ALTER TABLE appointments 
ALTER COLUMN start_time TYPE TEXT;

ALTER TABLE appointments 
ALTER COLUMN end_time TYPE TEXT;