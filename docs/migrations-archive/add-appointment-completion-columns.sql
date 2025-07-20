-- Add appointment completion tracking columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_duration INTEGER; -- Actual appointment duration in minutes
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_predicted_duration INTEGER; -- AI predicted duration in minutes

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_completed_at ON appointments(completed_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status_completed ON appointments(status) WHERE status = 'completed';