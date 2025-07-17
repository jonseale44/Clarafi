-- IMMEDIATE FIXES FOR RUNTIME ERRORS
-- These columns are in schema.ts but missing from database

-- 1. Fix imaging_results.laterality (causing runtime errors)
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS laterality TEXT;

-- 2. Fix document_processing_queue.attempts (causing runtime errors)
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- 3. Remove dashboards table (exists in DB with 0 records, not in schema)
DROP TABLE IF EXISTS dashboards;

-- 4. Create migration_invitations table (exported in schema but not in DB)
CREATE TABLE IF NOT EXISTS migration_invitations (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    health_system_id INTEGER REFERENCES health_systems(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- CRITICAL ORPHANED COLUMNS WITH DATA
-- These need to be added back to schema.ts

-- appointments table orphaned columns (has data!)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 20;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS use_ai_scheduling BOOLEAN DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS resource_requirements JSONB DEFAULT '[]';
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
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_exceptions TEXT[];
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

-- vitals table orphaned columns (has 15 records of data!)
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES encounters(id);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS temperature DECIMAL(5,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS heart_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS blood_pressure TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS oxygen_saturation INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users(id);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS pain_scale INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS blood_glucose INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual_entry';
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source_confidence DECIMAL(3,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS extracted_from_attachment_id INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS extraction_notes TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS merged_ids INTEGER[];
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS visit_history JSONB DEFAULT '[]';
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'standard';
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic_bp INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS alerts JSONB;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS parsed_from_text BOOLEAN DEFAULT false;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS processing_notes TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS original_text TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source_notes TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS entered_by INTEGER REFERENCES users(id);

-- users table orphaned columns (has 5 records of data!)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_system_id INTEGER REFERENCES health_systems(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

-- patients table orphaned columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT false;

-- locations table orphaned columns (has data!)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS health_system_id INTEGER REFERENCES health_systems(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS npi TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS services JSONB;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS facility_code TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_imaging BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT false;

-- organizations table orphaned columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name TEXT;