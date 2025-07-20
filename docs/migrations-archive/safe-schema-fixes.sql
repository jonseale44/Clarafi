
-- Generated: 2025-07-17T16:31:21.121Z
-- SAFE Schema Fixes Only (no data loss)
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS template_id INTEGER;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS original_prompt TEXT;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS reviewed_prompt TEXT;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS admin_user_id INTEGER;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS review_notes TEXT;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS performance_metrics JSONB;
-- Add missing column to admin_prompt_reviews
ALTER TABLE admin_prompt_reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
-- Add missing column to appointment_duration_history
ALTER TABLE appointment_duration_history ADD COLUMN IF NOT EXISTS ai_predicted_duration INTEGER;
-- Add missing column to appointment_duration_history
ALTER TABLE appointment_duration_history ADD COLUMN IF NOT EXISTS provider_scheduled_duration INTEGER;
-- Add missing column to appointment_duration_history
ALTER TABLE appointment_duration_history ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER;
-- Add missing column to appointment_duration_history
ALTER TABLE appointment_duration_history ADD COLUMN IF NOT EXISTS actual_arrival_delta INTEGER;
-- Add missing column to appointment_duration_history
ALTER TABLE appointment_duration_history ADD COLUMN IF NOT EXISTS factors_used JSONB;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_room BOOLEAN DEFAULT false;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS room_type TEXT;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_equipment TEXT;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_staff JSONB;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS type_name TEXT;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS type_code TEXT;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS category TEXT;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS default_duration INTEGER;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS min_duration INTEGER;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS max_duration INTEGER;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS allow_online_scheduling BOOLEAN DEFAULT false;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS requires_pre_auth BOOLEAN DEFAULT false;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS requires_special_prep BOOLEAN DEFAULT false;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS prep_instructions TEXT;
-- Add missing column to appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS default_resource_requirements JSONB;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS patient_min_duration INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS provider_min_duration INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS rounding_interval INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS default_buffer_minutes INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS buffer_for_chronic_patients INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS buffer_threshold_problem_count INTEGER;
-- Add missing column to asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config ADD COLUMN IF NOT EXISTS created_by INTEGER;
-- Add missing column to attachment_extracted_content
ALTER TABLE attachment_extracted_content ADD COLUMN IF NOT EXISTS ai_generated_title TEXT;
-- Add missing column to attachment_extracted_content
ALTER TABLE attachment_extracted_content ADD COLUMN IF NOT EXISTS document_type TEXT;
-- Add missing column to attachment_extracted_content
ALTER TABLE attachment_extracted_content ADD COLUMN IF NOT EXISTS processing_status TEXT;
-- Add missing column to attachment_extracted_content
ALTER TABLE attachment_extracted_content ADD COLUMN IF NOT EXISTS error_message TEXT;
-- Add missing column to attachment_extracted_content
ALTER TABLE attachment_extracted_content ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
-- Add missing column to authentication_logs
ALTER TABLE authentication_logs ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
-- Add missing column to authentication_logs
ALTER TABLE authentication_logs ADD COLUMN IF NOT EXISTS geolocation JSONB;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS email TEXT;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS verification_code TEXT;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS verification_data JSONB;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS status TEXT;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS approved_by INTEGER;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS ip_address TEXT;
-- Add missing column to clinic_admin_verifications
ALTER TABLE clinic_admin_verifications ADD COLUMN IF NOT EXISTS user_agent TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS patient_id INTEGER;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS operation TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS field_name TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS change_reason TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS encounter_id INTEGER;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS order_authority TEXT;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS validated_by INTEGER;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;
-- Add missing column to data_modification_logs
ALTER TABLE data_modification_logs ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;
-- Add missing column to document_processing_queue
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS attempts INTEGER;
-- Add missing column to document_processing_queue
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;
-- Add missing column to email_notifications
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Add missing column to email_notifications
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS patient_name TEXT;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS justification TEXT;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS authorizing_physician TEXT;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS access_start_time TIMESTAMP;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS access_end_time TIMESTAMP;
-- Add missing column to emergency_access_logs
ALTER TABLE emergency_access_logs ADD COLUMN IF NOT EXISTS accessed_resources JSONB;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS lab_identifier TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS integration_type TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS api_endpoint TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS hl7_endpoint TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS username_encrypted TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS ssl_certificate_path TEXT;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS supported_tests JSONB;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS turnaround_times JSONB;
-- Add missing column to external_labs
ALTER TABLE external_labs ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS family_member TEXT;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS medical_history TEXT;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS encounter_id INTEGER;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS result_ids INTEGER;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS clinical_review TEXT;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS patient_message TEXT;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS nurse_message TEXT;
-- Add missing column to gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes ADD COLUMN IF NOT EXISTS patient_context JSONB;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS study_type TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS contrast_needed BOOLEAN DEFAULT false;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS clinical_indication TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS relevant_symptoms TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS ordered_by INTEGER;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMP;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS external_facility_id TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS dicom_accession_number TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS order_status TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS prep_instructions TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;
-- Add missing column to imaging_orders
ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS laterality TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS clinical_summary TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS radiologist_name TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS facility_name TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS attachment_id INTEGER;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS dicom_study_id TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS dicom_series_id TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS image_file_paths TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS result_status TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS provider_notes TEXT;
-- Add missing column to imaging_results
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS loinc_code TEXT;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS test_category TEXT;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS normal_low NUMERIC(10,2);
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fax TEXT;
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS email TEXT;
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS operating_hours JSONB;
-- Add missing column to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Add missing column to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS purpose TEXT;
-- Add missing column to medical_history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS condition_category TEXT;
-- Add missing column to medical_history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS history_text TEXT;
-- Add missing column to medical_history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;
-- Add missing column to medical_history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS source_type TEXT;
-- Add missing column to medical_history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS source_confidence NUMERIC(10,2);
-- Add missing column to medical_problems
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_diagnosed_date DATE;
-- Add missing column to medical_problems
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_encounter_id INTEGER;
-- Add missing column to medication_formulary
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS brand_names TEXT;
-- Add missing column to medication_formulary
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS common_names TEXT;
-- Add missing column to medication_formulary
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS standard_strengths TEXT;
-- Add missing column to medication_formulary
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS available_forms TEXT;
-- Add missing column to medication_formulary
ALTER TABLE medication_formulary ADD COLUMN IF NOT EXISTS form_routes JSONB;
-- Add missing column to medications
ALTER TABLE medications ADD COLUMN IF NOT EXISTS rx_norm_code TEXT;
-- Add missing column to medications
ALTER TABLE medications ADD COLUMN IF NOT EXISTS sure_scripts_id TEXT;
-- Add missing column to organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS document_url TEXT;
-- Add missing column to organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;
-- Add missing column to organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
-- Add missing column to organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS verified_by INTEGER;
-- Add missing column to organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS original_file_name TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS file_extension TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS file_path TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS category TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS title TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS access_level TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS content_hash TEXT;
-- Add missing column to patient_attachments
ALTER TABLE patient_attachments ADD COLUMN IF NOT EXISTS virus_scan_status TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS lab_delivery_method TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS lab_service_provider TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS imaging_delivery_method TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS imaging_service_provider TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS medication_delivery_method TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS preferred_pharmacy TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS pharmacy_phone TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS pharmacy_fax TEXT;
-- Add missing column to patient_order_preferences
ALTER TABLE patient_order_preferences ADD COLUMN IF NOT EXISTS last_updated_by INTEGER;
-- Add missing column to patient_physical_findings
ALTER TABLE patient_physical_findings ADD COLUMN IF NOT EXISTS exam_system TEXT;
-- Add missing column to patient_physical_findings
ALTER TABLE patient_physical_findings ADD COLUMN IF NOT EXISTS exam_component TEXT;
-- Add missing column to patient_physical_findings
ALTER TABLE patient_physical_findings ADD COLUMN IF NOT EXISTS finding_text TEXT;
-- Add missing column to patient_physical_findings
ALTER TABLE patient_physical_findings ADD COLUMN IF NOT EXISTS finding_type TEXT;
-- Add missing column to patient_physical_findings
ALTER TABLE patient_physical_findings ADD COLUMN IF NOT EXISTS confidence NUMERIC(10,2);
-- Add missing column to patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns ADD COLUMN IF NOT EXISTS avg_visit_duration NUMERIC(10,2);
-- Add missing column to provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns ADD COLUMN IF NOT EXISTS avg_visit_duration NUMERIC(10,2);
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS schedule_date DATE;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS current_patient_id INTEGER;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS current_appointment_id INTEGER;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS running_behind_minutes INTEGER;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS last_update_time TIMESTAMP;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS day_started_at TIMESTAMP;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS estimated_catch_up_time TEXT;
-- Add missing column to realtime_schedule_status
ALTER TABLE realtime_schedule_status ADD COLUMN IF NOT EXISTS ai_recommendations JSONB;
-- Add missing column to resource_bookings
ALTER TABLE resource_bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
-- Add missing column to resource_bookings
ALTER TABLE resource_bookings ADD COLUMN IF NOT EXISTS created_by INTEGER;
-- Add missing column to schedule_preferences
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS use_ai_scheduling BOOLEAN DEFAULT false;
-- Add missing column to schedule_preferences
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS ai_aggressiveness NUMERIC(10,2);
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS factor_category TEXT;
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS factor_description TEXT;
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN DEFAULT false;
-- Add missing column to scheduling_ai_weights
ALTER TABLE scheduling_ai_weights ADD COLUMN IF NOT EXISTS factor_id INTEGER;
-- Add missing column to scheduling_ai_weights
ALTER TABLE scheduling_ai_weights ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;
-- Add missing column to scheduling_resources
ALTER TABLE scheduling_resources ADD COLUMN IF NOT EXISTS resource_name TEXT;
-- Add missing column to scheduling_resources
ALTER TABLE scheduling_resources ADD COLUMN IF NOT EXISTS resource_code TEXT;
-- Add missing column to scheduling_resources
ALTER TABLE scheduling_resources ADD COLUMN IF NOT EXISTS capabilities TEXT;
-- Add missing column to scheduling_resources
ALTER TABLE scheduling_resources ADD COLUMN IF NOT EXISTS requires_cleaning_minutes INTEGER;
-- Add missing column to scheduling_resources
ALTER TABLE scheduling_resources ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS rule_name TEXT;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS rule_config JSONB;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS description TEXT;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS slot_duration INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS start_time TEXT;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS end_time TEXT;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS lunch_start TEXT;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS lunch_duration INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS buffer_between_appts INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS allow_double_booking BOOLEAN DEFAULT false;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS max_patients_per_day INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS days_of_week INTEGER;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
-- Add missing column to scheduling_templates
ALTER TABLE scheduling_templates ADD COLUMN IF NOT EXISTS created_by INTEGER;
-- Add missing column to signatures
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS current_status TEXT;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS history_notes TEXT;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS data_expires_at TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS metadata JSONB;
-- Add missing column to subscription_keys
ALTER TABLE subscription_keys ADD COLUMN IF NOT EXISTS key TEXT;
-- Add missing column to surgical_history
ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS outcome TEXT;