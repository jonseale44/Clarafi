-- Fix missing reminder and communication columns

-- Add reminder tracking columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminders_sent INTEGER DEFAULT 0;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS communication_preferences JSONB;

-- Add external integration columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS external_appointment_id TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Add insurance verification columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS copay_amount DECIMAL(10, 2);

-- Add additional tracking columns from schema
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS actual_duration INTEGER;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS billing_notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS chart_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS copay_collected BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS forms_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS images_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS insurance_verification_notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS interpreter_language TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS interpreter_needed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS labs_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS late_cancellation_reason TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS medications_reconciled BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS no_show_reason TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS parent_appointment_id INTEGER REFERENCES appointments(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS post_appointment_notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS pre_appointment_notes TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS problems_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS provider_ready_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurrence_exceptions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS referral_reason TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS referring_provider TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;