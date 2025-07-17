-- Final fix for column naming issues

-- Vitals table - add aliases for different naming conventions
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic_bp INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER;

-- Encounters table - add missing columns
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS transcription_id TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS assistant_thread_id TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS voice_recording_url TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT '{}';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS appointment_id INTEGER;

-- Show the final state
\d vitals
\d encounters