-- Fix Core Patient Tables Schema Alignment
-- Generated: 2025-07-17
-- This fixes the most critical tables first

-- 1. PATIENTS TABLE
-- No changes needed (already aligned)

-- 2. ENCOUNTERS TABLE
-- Remove extra columns
ALTER TABLE encounters DROP COLUMN IF EXISTS patient_name;
ALTER TABLE encounters DROP COLUMN IF EXISTS visit_type;
ALTER TABLE encounters DROP COLUMN IF EXISTS discharge_date;
ALTER TABLE encounters DROP COLUMN IF EXISTS discharge_disposition;
ALTER TABLE encounters DROP COLUMN IF EXISTS admission_date;
ALTER TABLE encounters DROP COLUMN IF EXISTS admit_source;
ALTER TABLE encounters DROP COLUMN IF EXISTS updated_at;
ALTER TABLE encounters DROP COLUMN IF EXISTS signed_by;
ALTER TABLE encounters DROP COLUMN IF EXISTS signed_at;
ALTER TABLE encounters DROP COLUMN IF EXISTS has_signed_orders;

-- Add missing columns
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS appointment_id INTEGER;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS discharge_summary TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS estimated_copay NUMERIC(10,2);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS billing_status TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS claim_number TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS primary_diagnosis_code TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS reimbursement_amount NUMERIC(10,2);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS template_id INTEGER;

-- 3. VITALS TABLE
-- Remove extra columns
ALTER TABLE vitals DROP COLUMN IF EXISTS patient_id;
ALTER TABLE vitals DROP COLUMN IF EXISTS encounter_id;
ALTER TABLE vitals DROP COLUMN IF EXISTS recorded_at;
ALTER TABLE vitals DROP COLUMN IF EXISTS recorded_by;
ALTER TABLE vitals DROP COLUMN IF EXISTS entry_type;
ALTER TABLE vitals DROP COLUMN IF EXISTS systolic_bp;
ALTER TABLE vitals DROP COLUMN IF EXISTS diastolic_bp;
ALTER TABLE vitals DROP COLUMN IF EXISTS temperature_f;
ALTER TABLE vitals DROP COLUMN IF EXISTS pulse;
ALTER TABLE vitals DROP COLUMN IF EXISTS respiratory_rate;
ALTER TABLE vitals DROP COLUMN IF EXISTS oxygen_saturation;
ALTER TABLE vitals DROP COLUMN IF EXISTS weight_lbs;
ALTER TABLE vitals DROP COLUMN IF EXISTS height_in;
ALTER TABLE vitals DROP COLUMN IF EXISTS bmi;
ALTER TABLE vitals DROP COLUMN IF EXISTS pain_scale;
ALTER TABLE vitals DROP COLUMN IF EXISTS blood_glucose;
ALTER TABLE vitals DROP COLUMN IF EXISTS notes;
ALTER TABLE vitals DROP COLUMN IF EXISTS created_at;
ALTER TABLE vitals DROP COLUMN IF EXISTS updated_at;
ALTER TABLE vitals DROP COLUMN IF EXISTS source_type;
ALTER TABLE vitals DROP COLUMN IF EXISTS source_confidence;
ALTER TABLE vitals DROP COLUMN IF EXISTS extracted_from_attachment_id;
ALTER TABLE vitals DROP COLUMN IF EXISTS vital_type;
ALTER TABLE vitals DROP COLUMN IF EXISTS units;
ALTER TABLE vitals DROP COLUMN IF EXISTS abnormal_flags;
ALTER TABLE vitals DROP COLUMN IF EXISTS source_timestamp;
ALTER TABLE vitals DROP COLUMN IF EXISTS parsed_from_text;
ALTER TABLE vitals DROP COLUMN IF EXISTS processing_notes;
ALTER TABLE vitals DROP COLUMN IF EXISTS original_text;
ALTER TABLE vitals DROP COLUMN IF EXISTS source_notes;
ALTER TABLE vitals DROP COLUMN IF EXISTS entered_by;

-- Add missing columns
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS patient_id INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS encounter_id INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_by INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS entry_type TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic_bp INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS heart_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS oxygen_saturation NUMERIC(10,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS pain_scale INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS parsed_from_text TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS original_text TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source_confidence NUMERIC(10,2);

-- 4. ALLERGIES TABLE
-- Remove extra columns
ALTER TABLE allergies DROP COLUMN IF EXISTS encounter_id;
ALTER TABLE allergies DROP COLUMN IF EXISTS notes;
ALTER TABLE allergies DROP COLUMN IF EXISTS verified_by;
ALTER TABLE allergies DROP COLUMN IF EXISTS verified_at;
ALTER TABLE allergies DROP COLUMN IF EXISTS source_timestamp;
ALTER TABLE allergies DROP COLUMN IF EXISTS extracted_from_attachment_id;
ALTER TABLE allergies DROP COLUMN IF EXISTS extraction_notes;
ALTER TABLE allergies DROP COLUMN IF EXISTS reaction_type;
ALTER TABLE allergies DROP COLUMN IF EXISTS consolidation_reasoning;
ALTER TABLE allergies DROP COLUMN IF EXISTS merged_ids;
ALTER TABLE allergies DROP COLUMN IF EXISTS visit_history;
ALTER TABLE allergies DROP COLUMN IF EXISTS created_at;
ALTER TABLE allergies DROP COLUMN IF EXISTS updated_at;
ALTER TABLE allergies DROP COLUMN IF EXISTS last_reaction;
ALTER TABLE allergies DROP COLUMN IF EXISTS source_notes;
ALTER TABLE allergies DROP COLUMN IF EXISTS entered_by;
ALTER TABLE allergies DROP COLUMN IF EXISTS temporal_conflict_resolution;
ALTER TABLE allergies DROP COLUMN IF EXISTS last_updated_encounter;

-- 5. MEDICATIONS TABLE
-- Remove extra columns
ALTER TABLE medications DROP COLUMN IF EXISTS patient_id;
ALTER TABLE medications DROP COLUMN IF EXISTS encounter_id;
ALTER TABLE medications DROP COLUMN IF EXISTS medication_name;
ALTER TABLE medications DROP COLUMN IF EXISTS generic_name;
ALTER TABLE medications DROP COLUMN IF EXISTS brand_name;
ALTER TABLE medications DROP COLUMN IF EXISTS dosage;
ALTER TABLE medications DROP COLUMN IF EXISTS frequency;
ALTER TABLE medications DROP COLUMN IF EXISTS route;
ALTER TABLE medications DROP COLUMN IF EXISTS start_date;
ALTER TABLE medications DROP COLUMN IF EXISTS end_date;
ALTER TABLE medications DROP COLUMN IF EXISTS prescribed_by;
ALTER TABLE medications DROP COLUMN IF EXISTS reason;
ALTER TABLE medications DROP COLUMN IF EXISTS instructions;
ALTER TABLE medications DROP COLUMN IF EXISTS refills;
ALTER TABLE medications DROP COLUMN IF EXISTS pharmacy;
ALTER TABLE medications DROP COLUMN IF EXISTS prescriber_notes;
ALTER TABLE medications DROP COLUMN IF EXISTS side_effects;
ALTER TABLE medications DROP COLUMN IF EXISTS adherence_notes;
ALTER TABLE medications DROP COLUMN IF EXISTS last_filled;
ALTER TABLE medications DROP COLUMN IF EXISTS next_refill_due;
ALTER TABLE medications DROP COLUMN IF EXISTS discontinuation_reason;
ALTER TABLE medications DROP COLUMN IF EXISTS order_id;
ALTER TABLE medications DROP COLUMN IF EXISTS is_controlled;
ALTER TABLE medications DROP COLUMN IF EXISTS created_at;
ALTER TABLE medications DROP COLUMN IF EXISTS updated_at;
ALTER TABLE medications DROP COLUMN IF EXISTS source_type;
ALTER TABLE medications DROP COLUMN IF EXISTS source_confidence;
ALTER TABLE medications DROP COLUMN IF EXISTS source_timestamp;
ALTER TABLE medications DROP COLUMN IF EXISTS extracted_from_attachment_id;
ALTER TABLE medications DROP COLUMN IF EXISTS extraction_notes;
ALTER TABLE medications DROP COLUMN IF EXISTS consolidation_reasoning;
ALTER TABLE medications DROP COLUMN IF EXISTS merged_ids;
ALTER TABLE medications DROP COLUMN IF EXISTS visit_history;
ALTER TABLE medications DROP COLUMN IF EXISTS drug_class;
ALTER TABLE medications DROP COLUMN IF EXISTS formulary_status;
ALTER TABLE medications DROP COLUMN IF EXISTS prior_auth_required;
ALTER TABLE medications DROP COLUMN IF EXISTS therapeutic_class;
ALTER TABLE medications DROP COLUMN IF EXISTS ndc;
ALTER TABLE medications DROP COLUMN IF EXISTS gpi;
ALTER TABLE medications DROP COLUMN IF EXISTS days_supply;
ALTER TABLE medications DROP COLUMN IF EXISTS quantity_dispensed;
ALTER TABLE medications DROP COLUMN IF EXISTS rx_number;
ALTER TABLE medications DROP COLUMN IF EXISTS daw_code;
ALTER TABLE medications DROP COLUMN IF EXISTS substitution_allowed;
ALTER TABLE medications DROP COLUMN IF EXISTS patient_copay;
ALTER TABLE medications DROP COLUMN IF EXISTS insurance_coverage;
ALTER TABLE medications DROP COLUMN IF EXISTS total_cost;
ALTER TABLE medications DROP COLUMN IF EXISTS medication_type;
ALTER TABLE medications DROP COLUMN IF EXISTS original_text;
ALTER TABLE medications DROP COLUMN IF EXISTS grouping_strategy;
ALTER TABLE medications DROP COLUMN IF EXISTS is_current;
ALTER TABLE medications DROP COLUMN IF EXISTS reconciled_at;
ALTER TABLE medications DROP COLUMN IF EXISTS reconciled_by;
ALTER TABLE medications DROP COLUMN IF EXISTS last_reviewed;
ALTER TABLE medications DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE medications DROP COLUMN IF EXISTS source_notes;
ALTER TABLE medications DROP COLUMN IF EXISTS sig;
ALTER TABLE medications DROP COLUMN IF EXISTS strength_unit;
ALTER TABLE medications DROP COLUMN IF EXISTS form;
ALTER TABLE medications DROP COLUMN IF EXISTS entered_by;
ALTER TABLE medications DROP COLUMN IF EXISTS temporal_conflict_resolution;
ALTER TABLE medications DROP COLUMN IF EXISTS confidence_metadata;

-- Add missing columns
ALTER TABLE medications ADD COLUMN IF NOT EXISTS patient_id INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS encounter_id INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS medication_name TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescribed_by INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS refills INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS order_id INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS strength TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS last_filled DATE;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS discontinuation_reason TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS grouping_strategy TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS visit_history JSONB;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_confidence NUMERIC(10,2);
ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_timestamp TIMESTAMP;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS extracted_from_attachment_id INTEGER;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

-- 6. MEDICAL_PROBLEMS TABLE
-- Remove extra columns
ALTER TABLE medical_problems DROP COLUMN IF EXISTS patient_id;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS problem_text;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS problem_code;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS problem_code_system;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS onset_date;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS resolution_date;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS notes;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS added_by;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS resolved_by;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS last_reviewed;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS encounter_id;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS created_at;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS updated_at;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_type;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_confidence;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_timestamp;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS extracted_from_attachment_id;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS extraction_notes;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS consolidation_reasoning;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS merged_ids;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS visit_history;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS acuity;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS functional_status;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS episode_status;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS primary_diagnosis;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS related_diagnoses;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS complications;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_notes;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS entered_by;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS temporal_conflict_resolution;
ALTER TABLE medical_problems DROP COLUMN IF EXISTS confidence_metadata;

-- Add missing columns
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS patient_id INTEGER;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS problem_title TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS clinical_description TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS problem_text TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS current_icd10_code TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS historical_icd10_codes JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS snomed_codes JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS onset_date DATE;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS resolution_date DATE;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS clinical_course TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS treatment_response TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS complications JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS visibility_scope TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS reported_by TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS verified_by_provider BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS patient_reported BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS requires_monitoring BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS monitoring_interval TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS last_reviewed DATE;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS clinical_owner INTEGER;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS semantic_category TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS anatomical_location TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS laterality TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS is_surgical BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS is_trauma BOOLEAN DEFAULT false;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS ranking_score NUMERIC(10,2);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS provider_ranking_adjustment NUMERIC(10,2);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS auto_ranking_factors JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS grouping_key TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS parent_problem_id INTEGER;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS child_problems JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS visit_history JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS encounter_id INTEGER;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS source_confidence NUMERIC(10,2);
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS source_timestamp TIMESTAMP;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS extracted_from_attachment_id INTEGER;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS original_extracted_text TEXT;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS last_updated_from_extract TIMESTAMP;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS encounter_specific_details JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB;
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS integration_metadata JSONB;

-- Add foreign key constraints after all columns are in place
ALTER TABLE encounters ADD CONSTRAINT fk_encounter_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE vitals ADD CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE allergies ADD CONSTRAINT fk_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE medications ADD CONSTRAINT fk_medications_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE medical_problems ADD CONSTRAINT fk_medical_problems_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;