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

-- 3. Add missing columns to patients table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' 
                   AND column_name='preferred_location_id') THEN
        ALTER TABLE patients ADD COLUMN preferred_location_id INTEGER;
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