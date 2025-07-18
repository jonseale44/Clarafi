-- Fix all missing appointment columns found in schema.ts

-- Add confirmation_status column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';

-- Add checked_in columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS checked_in_by INTEGER REFERENCES users(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS room_assignment TEXT;

-- Add scheduling intelligence columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'routine';

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_preferences JSONB;

-- Add AI scheduling data
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS ai_scheduling_data JSONB;

-- Add AI prediction columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS ai_predicted_duration INTEGER;

-- Add AI confidence score
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2);

-- Add manual override flag
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration_manually_overridden BOOLEAN DEFAULT FALSE;

-- Add timestamps for tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Add cancellation tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add completion tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id);

-- Add linked encounter
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES encounters(id);

-- Add resource assignment
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS resource_requirements JSONB;

-- Add automated communication tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS communication_status JSONB;

-- Add reminder settings
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_preferences JSONB;

-- Add recurring appointment support
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurring_rule JSONB;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurring_parent_id INTEGER REFERENCES appointments(id);

-- Add waitlist support
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS waitlist_priority INTEGER;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS waitlist_reason TEXT;

-- Comments for clarity
COMMENT ON COLUMN appointments.confirmation_status IS 'pending, confirmed, declined';
COMMENT ON COLUMN appointments.urgency_level IS 'stat, urgent, routine, elective';
COMMENT ON COLUMN appointments.ai_confidence_score IS 'Confidence in AI duration prediction (0.00-1.00)';
COMMENT ON COLUMN appointments.duration_manually_overridden IS 'True if provider manually adjusted duration from AI prediction';