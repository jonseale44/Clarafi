-- Fix missing columns in appointments table

-- Add duration column
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 20;

-- Add other potentially missing columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_predicted_duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS use_ai_scheduling BOOLEAN DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS resource_requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS insurance_verification_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS copay_collected BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS copay_amount DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS forms_completed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vital_signs_taken BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS provider_ready_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_completed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS late_cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS parent_appointment_id INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_exceptions DATE[];
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_confirmed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS wait_list_priority INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referring_provider TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS interpreter_needed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS interpreter_language TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pre_appointment_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS post_appointment_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS chart_reviewed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS labs_reviewed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS images_reviewed BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS medications_reconciled BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS problems_reviewed BOOLEAN DEFAULT false;