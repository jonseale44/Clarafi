-- Fix database schema mismatch issues - COMPREHENSIVE FIX

-- 1. Add missing columns to encounters table
DO $$ 
BEGIN
    -- encounter_status already added, now add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='end_time') THEN
        ALTER TABLE encounters ADD COLUMN end_time TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='location_id') THEN
        ALTER TABLE encounters ADD COLUMN location_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='chief_complaint') THEN
        ALTER TABLE encounters ADD COLUMN chief_complaint TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='ai_scribe_mode') THEN
        ALTER TABLE encounters ADD COLUMN ai_scribe_mode TEXT DEFAULT 'smart_dictation';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='ai_suggestions') THEN
        ALTER TABLE encounters ADD COLUMN ai_suggestions JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='signed_by') THEN
        ALTER TABLE encounters ADD COLUMN signed_by INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='signed_at') THEN
        ALTER TABLE encounters ADD COLUMN signed_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='is_signed') THEN
        ALTER TABLE encounters ADD COLUMN is_signed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='appointment_id') THEN
        ALTER TABLE encounters ADD COLUMN appointment_id INTEGER;
    END IF;
END $$;

-- 2. Add ALL missing columns to phi_access_logs table
DO $$ 
BEGIN
    -- patient_name already added, now add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='access_method') THEN
        ALTER TABLE phi_access_logs ADD COLUMN access_method TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='http_method') THEN
        ALTER TABLE phi_access_logs ADD COLUMN http_method TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='api_endpoint') THEN
        ALTER TABLE phi_access_logs ADD COLUMN api_endpoint TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='session_id') THEN
        ALTER TABLE phi_access_logs ADD COLUMN session_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='success') THEN
        ALTER TABLE phi_access_logs ADD COLUMN success BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='error_message') THEN
        ALTER TABLE phi_access_logs ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='response_time') THEN
        ALTER TABLE phi_access_logs ADD COLUMN response_time INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='access_reason') THEN
        ALTER TABLE phi_access_logs ADD COLUMN access_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='emergency_access') THEN
        ALTER TABLE phi_access_logs ADD COLUMN emergency_access BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='break_glass_reason') THEN
        ALTER TABLE phi_access_logs ADD COLUMN break_glass_reason TEXT;
    END IF;
END $$;

-- 3. Add ALL missing columns to patients table
DO $$ 
BEGIN
    -- Location and provider
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='preferred_location_id') THEN
        ALTER TABLE patients ADD COLUMN preferred_location_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='primary_provider_id') THEN
        ALTER TABLE patients ADD COLUMN primary_provider_id INTEGER;
    END IF;
    
    -- Insurance fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='insurance_primary') THEN
        ALTER TABLE patients ADD COLUMN insurance_primary TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='insurance_secondary') THEN
        ALTER TABLE patients ADD COLUMN insurance_secondary TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='policy_number') THEN
        ALTER TABLE patients ADD COLUMN policy_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='group_number') THEN
        ALTER TABLE patients ADD COLUMN group_number TEXT;
    END IF;
    
    -- Voice workflow optimization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='assistant_id') THEN
        ALTER TABLE patients ADD COLUMN assistant_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='assistant_thread_id') THEN
        ALTER TABLE patients ADD COLUMN assistant_thread_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='last_chart_summary') THEN
        ALTER TABLE patients ADD COLUMN last_chart_summary TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='chart_last_updated') THEN
        ALTER TABLE patients ADD COLUMN chart_last_updated TIMESTAMP;
    END IF;
    
    -- Clinical flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='active_problems') THEN
        ALTER TABLE patients ADD COLUMN active_problems JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='critical_alerts') THEN
        ALTER TABLE patients ADD COLUMN critical_alerts JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Data Origin Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='data_origin_type') THEN
        ALTER TABLE patients ADD COLUMN data_origin_type TEXT DEFAULT 'emr_direct';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='original_facility_id') THEN
        ALTER TABLE patients ADD COLUMN original_facility_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='created_by_provider_id') THEN
        ALTER TABLE patients ADD COLUMN created_by_provider_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='creation_context') THEN
        ALTER TABLE patients ADD COLUMN creation_context TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='derivative_work_note') THEN
        ALTER TABLE patients ADD COLUMN derivative_work_note TEXT;
    END IF;
    
    -- Migration and Consent Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='migration_consent') THEN
        ALTER TABLE patients ADD COLUMN migration_consent JSONB DEFAULT '{"consentGiven": false}'::jsonb;
    END IF;
    
    -- Profile photo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='profile_photo_filename') THEN
        ALTER TABLE patients ADD COLUMN profile_photo_filename TEXT;
    END IF;
    
    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='created_at') THEN
        ALTER TABLE patients ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='updated_at') THEN
        ALTER TABLE patients ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- 3b. Add missing columns from recent errors
DO $$ 
BEGIN
    -- Add accessed_at to phi_access_logs (it's using created_at but code expects accessed_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='phi_access_logs' 
                   AND column_name='accessed_at') THEN
        ALTER TABLE phi_access_logs ADD COLUMN accessed_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    -- Add start_time to encounters table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='encounters' 
                   AND column_name='start_time') THEN
        ALTER TABLE encounters ADD COLUMN start_time TIMESTAMP;
    END IF;
    
    -- Add short_name to locations table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='locations' 
                   AND column_name='short_name') THEN
        ALTER TABLE locations ADD COLUMN short_name TEXT;
    END IF;
    
    -- Add status to health_systems table (for admin stats route)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='health_systems' 
                   AND column_name='status') THEN
        ALTER TABLE health_systems ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 3c. Add columns discovered from latest errors
DO $$ 
BEGIN
    -- Add selected_at to user_session_locations table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_session_locations' 
                   AND column_name='selected_at') THEN
        ALTER TABLE user_session_locations ADD COLUMN selected_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- 4. Create lab_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER REFERENCES lab_orders(id),
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    
    -- Result identification
    loinc_code TEXT NOT NULL,
    test_code TEXT NOT NULL,
    test_name TEXT NOT NULL,
    test_category TEXT,
    
    -- Result data
    result_value TEXT,
    result_numeric DECIMAL(15, 6),
    result_units TEXT,
    reference_range TEXT,
    age_gender_adjusted_range TEXT,
    abnormal_flag TEXT,
    critical_flag BOOLEAN DEFAULT FALSE,
    delta_flag TEXT,
    
    -- Timing
    specimen_collected_at TIMESTAMP,
    specimen_received_at TIMESTAMP,
    result_available_at TIMESTAMP,
    result_finalized_at TIMESTAMP,
    received_at TIMESTAMP DEFAULT NOW(),
    
    -- External lab tracking
    external_lab_id INTEGER,
    external_result_id TEXT,
    hl7_message_id TEXT,
    instrument_id TEXT,
    
    -- Status
    result_status TEXT DEFAULT 'pending',
    verification_status TEXT DEFAULT 'unverified',
    result_comments TEXT,
    
    -- Review
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    provider_notes TEXT,
    needs_review BOOLEAN DEFAULT TRUE,
    review_status TEXT DEFAULT 'pending',
    review_note TEXT,
    review_template TEXT,
    review_history JSONB DEFAULT '[]',
    
    -- Communication
    patient_communication_sent BOOLEAN DEFAULT FALSE,
    patient_communication_method TEXT,
    patient_communication_sent_at TIMESTAMP,
    patient_notified_by INTEGER REFERENCES users(id),
    patient_message TEXT,
    patient_message_sent_at TIMESTAMP,
    
    -- Source tracking
    source_type TEXT DEFAULT 'lab_order',
    source_confidence TEXT,
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_lab_order_id ON lab_results(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_code ON lab_results(test_code);
CREATE INDEX IF NOT EXISTS idx_lab_results_result_status ON lab_results(result_status);

-- 6. Create dashboards table if needed (optional - not in schema.ts)
-- This table might be referenced somewhere in the codebase
CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);