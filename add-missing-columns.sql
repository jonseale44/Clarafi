-- Add missing columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS social_security_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS drivers_license_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS military_id TEXT;

-- Add missing columns to lab_results table
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS patient_message TEXT;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS patient_message_sent_at TIMESTAMP;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS extraction_notes TEXT;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS merged_ids JSONB;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS visit_history JSONB;

-- Add missing columns to medication_formulary table
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS medication_name TEXT;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS drug_class TEXT;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS dosage_forms JSONB;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS strengths JSONB;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS prior_auth_required BOOLEAN DEFAULT FALSE;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS quantity_limits JSONB;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS step_therapy JSONB;
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS alternatives JSONB;

-- Add missing columns to schedule_preferences table
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS preferred_appointment_duration INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS lunch_start TEXT;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS lunch_duration INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS max_daily_appointments INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS max_consecutive_appointments INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS preferred_break_after_n_appointments INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS allow_overtime BOOLEAN DEFAULT FALSE;
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS overtime_limit_minutes INTEGER;

-- Add missing columns to imaging_orders table
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES users(id);
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS imaging_type TEXT;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS indication TEXT;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS facility_id INTEGER;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP;
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP;

-- Add missing columns to data_modification_logs table
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
