-- COMPREHENSIVE SCHEMA FIX - ALL MISSING TABLES AND COLUMNS
-- Generated after complete database vs schema.ts comparison
-- This script adds ALL missing elements to align database with schema.ts

-- =====================================================
-- PART 1: CREATE ALL MISSING TABLES FROM SCHEMA.TS
-- =====================================================

-- 1. Create allergies table (completely missing)
CREATE TABLE IF NOT EXISTS allergies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    allergen TEXT NOT NULL,
    reaction TEXT NOT NULL,
    severity TEXT CHECK (severity IS NULL OR severity = ANY (ARRAY['mild', 'moderate', 'severe', 'life-threatening', 'unknown'])),
    onset_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'active',
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    source_type TEXT DEFAULT 'patient_reported',
    source_confidence DECIMAL(3,2),
    source_timestamp TIMESTAMP,
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    allergy_type TEXT DEFAULT 'drug',
    reaction_type TEXT,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create vitals table (completely missing)
CREATE TABLE IF NOT EXISTS vitals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature DECIMAL(5,2),
    oxygen_saturation INTEGER,
    weight DECIMAL(6,2),
    height DECIMAL(5,2),
    bmi DECIMAL(5,2),
    recorded_at TIMESTAMP DEFAULT NOW(),
    recorded_by INTEGER REFERENCES users(id),
    notes TEXT,
    pain_scale INTEGER,
    blood_glucose INTEGER,
    source_type TEXT DEFAULT 'manual_entry',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create medications table (likely missing based on errors)
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    medication_name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    dosage TEXT,
    strength TEXT,
    form TEXT,
    route TEXT,
    frequency TEXT,
    sig TEXT,
    start_date DATE,
    end_date DATE,
    discontinuation_date DATE,
    discontinuation_reason TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed', 'on-hold', 'pending', 'held', 'historical')),
    prescribed_by INTEGER REFERENCES users(id),
    prescribed_date TIMESTAMP,
    pharmacy TEXT,
    prescriber_notes TEXT,
    patient_instructions TEXT,
    ndc_code TEXT,
    rxnorm_code TEXT,
    days_supply INTEGER,
    quantity INTEGER,
    quantity_unit TEXT,
    refills INTEGER,
    refills_remaining INTEGER,
    lot_number TEXT,
    expiration_date DATE,
    manufacturer TEXT,
    dea_schedule TEXT,
    is_controlled BOOLEAN DEFAULT FALSE,
    requires_prior_auth BOOLEAN DEFAULT FALSE,
    prior_auth_number TEXT,
    formulary_status TEXT,
    therapeutic_class TEXT,
    source_type TEXT DEFAULT 'prescribed',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    grouping_strategy TEXT,
    discontinuation_source TEXT,
    original_order_id INTEGER,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create medical_problems table (likely missing)
CREATE TABLE IF NOT EXISTS medical_problems (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    problem_title TEXT NOT NULL,
    icd10_code TEXT,
    snomed_code TEXT,
    problem_status TEXT DEFAULT 'active',
    onset_date DATE,
    resolution_date DATE,
    notes TEXT,
    severity TEXT,
    source_type TEXT DEFAULT 'provider_entered',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    provider_id INTEGER REFERENCES users(id),
    date_diagnosed DATE,
    last_updated TIMESTAMP DEFAULT NOW(),
    verification_status TEXT DEFAULT 'unverified',
    verification_date TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    clinical_status TEXT,
    body_site TEXT,
    body_site_laterality TEXT,
    category TEXT,
    current_icd10_code TEXT,
    last_reviewed_date TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    patient_education_provided BOOLEAN DEFAULT FALSE,
    care_plan_status TEXT,
    functional_impact TEXT,
    prognosis TEXT,
    risk_factors TEXT[],
    associated_conditions TEXT[],
    treatment_goals TEXT,
    monitoring_parameters TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    problem_ranking INTEGER,
    display_in_summary BOOLEAN DEFAULT TRUE,
    patient_aware BOOLEAN DEFAULT TRUE,
    caregiver_aware BOOLEAN DEFAULT FALSE,
    reportable_condition BOOLEAN DEFAULT FALSE,
    reported_date DATE,
    clinical_priority TEXT,
    social_determinants JSONB,
    cultural_considerations TEXT,
    patient_goals TEXT,
    barriers_to_care TEXT,
    quality_measures JSONB,
    outcome_measures JSONB,
    care_team_members JSONB,
    care_coordination_notes TEXT,
    original_problem_text TEXT,
    mapped_by_ai BOOLEAN DEFAULT FALSE,
    ai_confidence_score DECIMAL(3,2),
    human_verified BOOLEAN DEFAULT FALSE,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create imaging_results table (likely missing)
CREATE TABLE IF NOT EXISTS imaging_results (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    imaging_order_id INTEGER,
    study_type TEXT NOT NULL,
    body_part TEXT NOT NULL,
    modality TEXT,
    study_date TIMESTAMP,
    accession_number TEXT,
    performing_facility TEXT,
    ordering_provider_id INTEGER REFERENCES users(id),
    reading_radiologist TEXT,
    findings TEXT,
    impression TEXT,
    recommendations TEXT,
    comparison_studies TEXT,
    technique TEXT,
    contrast_used BOOLEAN DEFAULT FALSE,
    contrast_type TEXT,
    radiation_dose TEXT,
    number_of_images INTEGER,
    critical_findings BOOLEAN DEFAULT FALSE,
    critical_findings_communicated_at TIMESTAMP,
    report_status TEXT DEFAULT 'preliminary',
    report_finalized_at TIMESTAMP,
    addendum TEXT,
    addendum_date TIMESTAMP,
    procedure_code TEXT,
    diagnostic_quality TEXT,
    limitations TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_timeframe TEXT,
    bi_rads_score TEXT,
    lung_rads_score TEXT,
    ti_rads_score TEXT,
    pi_rads_score TEXT,
    liver_rads_score TEXT,
    incidental_findings TEXT,
    relevant_history TEXT,
    clinical_indication TEXT,
    protocol_name TEXT,
    series_count INTEGER,
    image_count INTEGER,
    study_size_mb DECIMAL(10,2),
    pacs_study_uid TEXT,
    dicom_retrieval_url TEXT,
    external_system_id TEXT,
    source_type TEXT DEFAULT 'manual_entry',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create surgical_history table
CREATE TABLE IF NOT EXISTS surgical_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    procedure_name TEXT NOT NULL,
    procedure_date DATE,
    surgeon TEXT,
    facility TEXT,
    indication TEXT,
    findings TEXT,
    complications TEXT,
    anesthesia_type TEXT,
    implants_used TEXT,
    pathology_results TEXT,
    recovery_notes TEXT,
    source_type TEXT DEFAULT 'patient_reported',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    procedure_code TEXT,
    laterality TEXT,
    approach TEXT,
    duration_minutes INTEGER,
    estimated_blood_loss_ml INTEGER,
    specimens_removed TEXT,
    drains_placed TEXT,
    post_op_diagnosis TEXT,
    discharge_instructions TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create family_history table
CREATE TABLE IF NOT EXISTS family_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    relationship TEXT NOT NULL,
    condition TEXT NOT NULL,
    age_at_onset INTEGER,
    age_at_death INTEGER,
    cause_of_death TEXT,
    notes TEXT,
    source_type TEXT DEFAULT 'patient_reported',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    maternal_side BOOLEAN,
    living_status TEXT,
    genetic_marker TEXT,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Create social_history table
CREATE TABLE IF NOT EXISTS social_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    category TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'current',
    start_date DATE,
    end_date DATE,
    quantity TEXT,
    frequency TEXT,
    notes TEXT,
    source_type TEXT DEFAULT 'patient_reported',
    source_confidence DECIMAL(3,2),
    extracted_from_attachment_id INTEGER,
    extraction_notes TEXT,
    risk_level TEXT,
    counseling_provided BOOLEAN DEFAULT FALSE,
    consolidation_reasoning TEXT,
    merged_ids INTEGER[],
    visit_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Create attachments table (might be missing)
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    filename TEXT NOT NULL,
    original_filename TEXT,
    file_type TEXT,
    file_size INTEGER,
    mime_type TEXT,
    upload_date TIMESTAMP DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users(id),
    document_type TEXT,
    document_date DATE,
    description TEXT,
    thumbnail_path TEXT,
    ocr_text TEXT,
    ocr_completed BOOLEAN DEFAULT FALSE,
    ocr_completed_at TIMESTAMP,
    processing_status TEXT DEFAULT 'pending',
    processing_notes TEXT,
    extracted_data JSONB,
    chart_sections_updated TEXT[],
    confidence_scores JSONB,
    hash_value TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id),
    retention_date DATE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    tags TEXT[],
    source_system TEXT,
    external_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Other potentially missing tables
CREATE TABLE IF NOT EXISTS lab_reference_ranges (
    id SERIAL PRIMARY KEY,
    test_code TEXT NOT NULL,
    test_name TEXT NOT NULL,
    age_min INTEGER,
    age_max INTEGER,
    gender TEXT,
    reference_low DECIMAL(15,6),
    reference_high DECIMAL(15,6),
    critical_low DECIMAL(15,6),
    critical_high DECIMAL(15,6),
    unit TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_physical_findings (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    encounter_id INTEGER REFERENCES encounters(id),
    body_system TEXT NOT NULL,
    finding TEXT NOT NULL,
    severity TEXT,
    laterality TEXT,
    quality TEXT,
    duration TEXT,
    context TEXT,
    associated_symptoms TEXT,
    provider_id INTEGER REFERENCES users(id),
    examined_at TIMESTAMP,
    is_normal BOOLEAN DEFAULT FALSE,
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_timeframe TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_rank_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    problem_id INTEGER REFERENCES medical_problems(id) NOT NULL,
    custom_rank INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_problem_list_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    show_resolved_problems BOOLEAN DEFAULT FALSE,
    show_inactive_problems BOOLEAN DEFAULT TRUE,
    sort_by TEXT DEFAULT 'ranking',
    group_by_category BOOLEAN DEFAULT TRUE,
    highlight_recent_changes BOOLEAN DEFAULT TRUE,
    recent_change_days INTEGER DEFAULT 30,
    max_problems_displayed INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create other tables that might be referenced in schema.ts
CREATE TABLE IF NOT EXISTS admin_prompt_reviews (
    id SERIAL PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    reviewer_id INTEGER REFERENCES users(id),
    review_status TEXT,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_duration_history (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER,
    predicted_duration INTEGER,
    actual_duration INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_resource_requirements (
    id SERIAL PRIMARY KEY,
    appointment_type_id INTEGER,
    resource_type TEXT,
    resource_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PART 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

DO $$ 
BEGIN
    -- Add failure_reason to authentication_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='authentication_logs' 
                   AND column_name='failure_reason') THEN
        ALTER TABLE authentication_logs ADD COLUMN failure_reason TEXT;
    END IF;
    
    -- Add role_at_location to user_locations if that table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_locations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='user_locations' 
                       AND column_name='role_at_location') THEN
            ALTER TABLE user_locations ADD COLUMN role_at_location TEXT;
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_problems_patient_id ON medical_problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_results_patient_id ON imaging_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgical_history_patient_id ON surgical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_history_patient_id ON family_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_social_history_patient_id ON social_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_attachments_patient_id ON attachments(patient_id);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- After running this script, you can verify all tables exist with:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
-- ORDER BY table_name;