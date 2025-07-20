
-- Generated: 2025-07-17T16:22:46.371Z
-- Comprehensive Database Schema Alignment
-- Remove extra column from admin_prompt_reviews
ALTER TABLE admin_prompt_reviews DROP COLUMN IF EXISTS prompt_id;
-- Remove extra column from admin_prompt_reviews
ALTER TABLE admin_prompt_reviews DROP COLUMN IF EXISTS reviewer_id;
-- Remove extra column from admin_prompt_reviews
ALTER TABLE admin_prompt_reviews DROP COLUMN IF EXISTS feedback;
-- Remove extra column from admin_prompt_reviews
ALTER TABLE admin_prompt_reviews DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS encounter_id;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS notes;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS verified_by;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS verified_at;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS source_timestamp;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS reaction_type;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS created_at;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS last_reaction;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS source_notes;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS entered_by;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS temporal_conflict_resolution;
-- Remove extra column from allergies
ALTER TABLE allergies DROP COLUMN IF EXISTS last_updated_encounter;
-- Remove extra column from appointment_duration_history
ALTER TABLE appointment_duration_history DROP COLUMN IF EXISTS predicted_duration;
-- Remove extra column from appointment_duration_history
ALTER TABLE appointment_duration_history DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from appointment_resource_requirements
ALTER TABLE appointment_resource_requirements DROP COLUMN IF EXISTS resource_type;
-- Remove extra column from appointment_resource_requirements
ALTER TABLE appointment_resource_requirements DROP COLUMN IF EXISTS resource_id;
-- Remove extra column from appointment_resource_requirements
ALTER TABLE appointment_resource_requirements DROP COLUMN IF EXISTS created_at;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_room BOOLEAN DEFAULT false;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS room_type TEXT;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_equipment TEXT;
-- Add missing column to appointment_resource_requirements
ALTER TABLE appointment_resource_requirements ADD COLUMN IF NOT EXISTS requires_staff JSONB;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS name;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS duration_minutes;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS color;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS description;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS is_active;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS created_at;
-- Remove extra column from appointment_types
ALTER TABLE appointment_types DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS location_id;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_type_id;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS start_time;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS end_time;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS duration_minutes;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS ai_predicted_duration;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS status;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS chief_complaint;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS notes;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS checked_in_at;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS checked_in_by;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS completed_at;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS completed_by;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_at;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_by;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS cancellation_reason;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS created_at;
-- Remove extra column from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS author_name;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS author_email;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS content;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS is_approved;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS parent_id;
-- Remove extra column from article_comments
ALTER TABLE article_comments DROP COLUMN IF EXISTS created_at;
-- Remove extra column from article_revisions
ALTER TABLE article_revisions DROP COLUMN IF EXISTS content;
-- Remove extra column from article_revisions
ALTER TABLE article_revisions DROP COLUMN IF EXISTS revision_note;
-- Remove extra column from article_revisions
ALTER TABLE article_revisions DROP COLUMN IF EXISTS revision_type;
-- Remove extra column from article_revisions
ALTER TABLE article_revisions DROP COLUMN IF EXISTS created_by;
-- Remove extra column from article_revisions
ALTER TABLE article_revisions DROP COLUMN IF EXISTS created_at;
-- Remove extra column from asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config DROP COLUMN IF EXISTS weekday_schedule;
-- Remove extra column from asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config DROP COLUMN IF EXISTS custom_rules;
-- Remove extra column from asymmetric_scheduling_config
ALTER TABLE asymmetric_scheduling_config DROP COLUMN IF EXISTS effective_date;
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
-- Remove extra column from attachment_extracted_content
ALTER TABLE attachment_extracted_content DROP COLUMN IF EXISTS page_number;
-- Remove extra column from attachment_extracted_content
ALTER TABLE attachment_extracted_content DROP COLUMN IF EXISTS content_type;
-- Remove extra column from attachment_extracted_content
ALTER TABLE attachment_extracted_content DROP COLUMN IF EXISTS structured_data;
-- Remove extra column from attachment_extracted_content
ALTER TABLE attachment_extracted_content DROP COLUMN IF EXISTS confidence_score;
-- Remove extra column from attachment_extracted_content
ALTER TABLE attachment_extracted_content DROP COLUMN IF EXISTS extraction_method;
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
-- Remove extra column from authentication_logs
ALTER TABLE authentication_logs DROP COLUMN IF EXISTS error_message;
-- Remove extra column from authentication_logs
ALTER TABLE authentication_logs DROP COLUMN IF EXISTS created_at;
-- Add missing column to authentication_logs
ALTER TABLE authentication_logs ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
-- Add missing column to authentication_logs
ALTER TABLE authentication_logs ADD COLUMN IF NOT EXISTS geolocation JSONB;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS applicant_first_name;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS applicant_last_name;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS applicant_email;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS applicant_phone;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS address_street;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS address_city;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS address_state;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS address_zip;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS website;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS preferred_ehr_tier;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS verification_status;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS verification_score;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS verification_details;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS risk_assessment;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS automated_decision;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS automated_recommendations;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS manual_review_notes;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS reviewer_id;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS reviewed_at;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS api_verification_results;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS created_at;
-- Remove extra column from clinic_admin_verifications
ALTER TABLE clinic_admin_verifications DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS action;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS old_values;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS new_values;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS reason;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS ip_address;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS user_agent;
-- Remove extra column from data_modification_logs
ALTER TABLE data_modification_logs DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS claim_submission_status;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS claim_id;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS clearinghouse_id;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS payer_id;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS allowed_amount;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS paid_amount;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS patient_responsibility;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS adjustment_amount;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS denial_reason;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS denial_code;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS appeal_status;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS appeal_deadline;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS billing_notes;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS last_billing_action;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS assigned_biller;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS modifier_applied;
-- Remove extra column from diagnoses
ALTER TABLE diagnoses DROP COLUMN IF EXISTS billing_action_date;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS priority;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS processor_type;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS processing_metadata;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS error_message;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS retry_count;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS started_at;
-- Remove extra column from document_processing_queue
ALTER TABLE document_processing_queue DROP COLUMN IF EXISTS completed_at;
-- Add missing column to document_processing_queue
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS attempts INTEGER;
-- Add missing column to document_processing_queue
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS recipient_email;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS subject;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS body_html;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS body_text;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS related_user_id;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS related_entity_type;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS related_entity_id;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS status;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS sent_at;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS error_message;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS retry_count;
-- Remove extra column from email_notifications
ALTER TABLE email_notifications DROP COLUMN IF EXISTS created_at;
-- Add missing column to email_notifications
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Add missing column to email_notifications
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS access_reason;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS override_restrictions;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS supervisor_approval;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS access_duration;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS ip_address;
-- Remove extra column from emergency_access_logs
ALTER TABLE emergency_access_logs DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS encounter_date;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS visit_reason;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS status;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS location;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS insurance_verified;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS copay_collected;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS notes;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS created_at;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS location_id;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS ai_scribe_mode;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS signed_by;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS signed_at;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS is_signed;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS appointment_id;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS transcription_id;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS assistant_thread_id;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS voice_recording_url;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS alerts;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS draft_orders;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS draft_diagnoses;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS cpt_codes;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS signature_id;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS last_chart_update;
-- Remove extra column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS chart_update_duration;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS patient_id;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS test_name;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS test_date;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS result_value;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS unit;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS reference_range;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS abnormal_flag;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS ordering_provider;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS status;
-- Remove extra column from external_labs
ALTER TABLE external_labs DROP COLUMN IF EXISTS attachment_id;
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
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS relationship;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS condition;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS age_at_onset;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS age_at_death;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS cause_of_death;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS notes;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS source_type;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS source_confidence;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS maternal_side;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS living_status;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS genetic_marker;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS created_at;
-- Remove extra column from family_history
ALTER TABLE family_history DROP COLUMN IF EXISTS updated_at;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS family_member TEXT;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS medical_history TEXT;
-- Add missing column to family_history
ALTER TABLE family_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS lab_order_id;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS review_type;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS ai_interpretation;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS clinical_significance;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS follow_up_recommendations;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS risk_assessment;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS reviewed_by;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS review_status;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS created_at;
-- Remove extra column from gpt_lab_review_notes
ALTER TABLE gpt_lab_review_notes DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS type;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS subscription_key;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS is_migration;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS stripe_customer_id;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS metadata;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS created_at;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS subscription_limits;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS active_user_count;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS billing_details;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS active;
-- Remove extra column from health_systems
ALTER TABLE health_systems DROP COLUMN IF EXISTS status;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS imaging_type;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS indication;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS priority;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS status;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS facility_id;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS scheduled_date;
-- Remove extra column from imaging_orders
ALTER TABLE imaging_orders DROP COLUMN IF EXISTS completed_date;
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
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS encounter_id;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS study_type;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS accession_number;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS performing_facility;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS ordering_provider_id;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS reading_radiologist;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS recommendations;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS comparison_studies;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS technique;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS contrast_used;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS contrast_type;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS radiation_dose;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS number_of_images;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS critical_findings;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS critical_findings_communicated_at;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS report_status;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS report_finalized_at;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS addendum;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS addendum_date;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS procedure_code;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS diagnostic_quality;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS limitations;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS follow_up_needed;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS follow_up_timeframe;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS bi_rads_score;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS lung_rads_score;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS ti_rads_score;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS pi_rads_score;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS liver_rads_score;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS incidental_findings;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS relevant_history;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS clinical_indication;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS protocol_name;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS series_count;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS image_count;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS study_size_mb;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS pacs_study_uid;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS dicom_retrieval_url;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS external_system_id;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS created_at;
-- Remove extra column from imaging_results
ALTER TABLE imaging_results DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS order_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_received_at;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS transmission_response;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_data;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS created_at;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS specimen_source;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS special_instructions;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS collection_site;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS collected_by;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS external_lab;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS reference_range;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS expected_turnaround;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS external_status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS results;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS abnormal_flags;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS discontinued_at;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS discontinued_by;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS discontinued_reason;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS critical_values;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS stat_order;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS provider_notes;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS patient_preparation;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS collection_priority;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS processing_notes;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS billing_code;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS insurance_preauth_date;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS actual_cost;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS patient_consent;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS consent_date;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS insurance_coverage;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS patient_copay;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS billing_status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS billing_date;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS cancellation_reason;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_interpretation;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS ai_suggested_tests;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS ai_analysis;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_notification_sent;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS result_notification_date;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS performing_lab_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS lab_account_number;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS risk_flags;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS quality_control_status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS quality_control_notes;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS repeat_test_reason;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS original_order_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS test_methodology;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS quality_measure;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS processing_lab_name;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS processing_lab_director;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS test_validation_status;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS regulatory_compliance;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS sample_rejection_reason;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS preventive_care_flag;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS clinical_trial_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS research_study_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS patient_location;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS ordering_facility_id;
-- Remove extra column from lab_orders
ALTER TABLE lab_orders DROP COLUMN IF EXISTS test_performed_at;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS test_code;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS reference_low;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS reference_high;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS critical_low;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS critical_high;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS unit;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS notes;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS created_at;
-- Remove extra column from lab_reference_ranges
ALTER TABLE lab_reference_ranges DROP COLUMN IF EXISTS updated_at;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS loinc_code TEXT;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS test_category TEXT;
-- Add missing column to lab_reference_ranges
ALTER TABLE lab_reference_ranges ADD COLUMN IF NOT EXISTS normal_low NUMERIC(10,2);
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS result_units;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS reference_range;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS age_gender_adjusted_range;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS abnormal_flag;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS critical_flag;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS delta_flag;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS specimen_collected_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS specimen_received_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS result_available_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS result_finalized_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS received_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS external_lab_id;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS external_result_id;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS hl7_message_id;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS instrument_id;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS result_status;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS verification_status;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS result_comments;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS reviewed_by;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS reviewed_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS provider_notes;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS needs_review;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS review_status;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS review_note;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS review_template;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS review_history;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_communication_sent;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_communication_method;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_communication_sent_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_notified_by;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_message;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS patient_message_sent_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS source_type;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS source_confidence;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS created_at;
-- Remove extra column from lab_results
ALTER TABLE lab_results DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS zip;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS created_at;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS services;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS has_lab;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS has_imaging;
-- Remove extra column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS has_pharmacy;
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fax TEXT;
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS email TEXT;
-- Add missing column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS operating_hours JSONB;
-- Remove extra column from magic_links
ALTER TABLE magic_links DROP COLUMN IF EXISTS used;
-- Add missing column to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Add missing column to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS purpose TEXT;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS condition;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS onset_date;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS resolution_date;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS status;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS severity;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS notes;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS created_at;
-- Remove extra column from medical_history
ALTER TABLE medical_history DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS encounter_id;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS icd10_code;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS snomed_code;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS onset_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS resolution_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS notes;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS severity;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_type;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS source_confidence;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS date_diagnosed;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS last_updated;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS verification_status;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS verification_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS verified_by;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS clinical_status;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS body_site;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS body_site_laterality;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS category;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS last_reviewed_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS reviewed_by;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS patient_education_provided;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS care_plan_status;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS functional_impact;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS prognosis;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS risk_factors;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS associated_conditions;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS treatment_goals;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS monitoring_parameters;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS follow_up_required;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS follow_up_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS problem_ranking;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS display_in_summary;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS patient_aware;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS caregiver_aware;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS reportable_condition;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS reported_date;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS clinical_priority;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS social_determinants;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS cultural_considerations;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS patient_goals;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS barriers_to_care;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS quality_measures;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS outcome_measures;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS care_team_members;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS care_coordination_notes;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS original_problem_text;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS mapped_by_ai;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS ai_confidence_score;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS human_verified;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS created_at;
-- Remove extra column from medical_problems
ALTER TABLE medical_problems DROP COLUMN IF EXISTS updated_at;
-- Add missing column to medical_problems
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_diagnosed_date DATE;
-- Add missing column to medical_problems
ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS first_encounter_id INTEGER;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS medication_name;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS drug_class;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS dosage_forms;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS strengths;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS route;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS tier;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS prior_auth_required;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS quantity_limits;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS step_therapy;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS alternatives;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS active;
-- Remove extra column from medication_formulary
ALTER TABLE medication_formulary DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS form;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS discontinuation_date;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS discontinuation_reason;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS prescribed_by;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS prescribed_date;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS pharmacy;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS prescriber_notes;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS patient_instructions;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS rxnorm_code;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS refills;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS lot_number;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS expiration_date;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS manufacturer;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS dea_schedule;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS is_controlled;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS requires_prior_auth;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS prior_auth_number;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS formulary_status;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS therapeutic_class;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS source_type;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS source_confidence;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS grouping_strategy;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS discontinuation_source;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS original_order_id;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS created_at;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS surescripts_id;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS reason_for_change;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS medication_history;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS change_log;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS source_notes;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS entered_by;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS related_medications;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS drug_interactions;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS pharmacy_order_id;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS insurance_auth_status;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS prior_auth_required;
-- Remove extra column from medications
ALTER TABLE medications DROP COLUMN IF EXISTS last_updated_encounter_id;
-- Add missing column to medications
ALTER TABLE medications ADD COLUMN IF NOT EXISTS rx_norm_code TEXT;
-- Add missing column to medications
ALTER TABLE medications ADD COLUMN IF NOT EXISTS sure_scripts_id TEXT;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS order_date;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS status;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_dosage;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_route;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_frequency;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_duration;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_quantity;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS medication_refills;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS lab_test_name;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS lab_test_code;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS imaging_study_type;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS imaging_body_part;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS referral_specialty;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS referral_reason;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS instructions;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS diagnosis_codes;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS prescriber;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS prescriber_id;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS body_part;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS ndc_code;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS route;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS frequency;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS duration;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS start_date;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS end_date;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS indication;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS imaging_order_id;
-- Remove extra column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS external_order_id;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS organization_id;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS file_path;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS file_size;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS mime_type;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS active;
-- Remove extra column from organization_documents
ALTER TABLE organization_documents DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS type;
-- Remove extra column from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS website;
-- Remove extra column from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS filename;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS original_filename;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS file_type;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS upload_date;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS document_type;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS document_date;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS ocr_text;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS ocr_completed;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS ocr_completed_at;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS processing_notes;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS extracted_data;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS chart_sections_updated;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS confidence_scores;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS hash_value;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS is_deleted;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS deleted_at;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS deleted_by;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS retention_date;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS access_count;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS last_accessed_at;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS source_system;
-- Remove extra column from patient_attachments
ALTER TABLE patient_attachments DROP COLUMN IF EXISTS external_id;
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
-- Remove extra column from patient_order_preferences
ALTER TABLE patient_order_preferences DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from patient_order_preferences
ALTER TABLE patient_order_preferences DROP COLUMN IF EXISTS order_type;
-- Remove extra column from patient_order_preferences
ALTER TABLE patient_order_preferences DROP COLUMN IF EXISTS preferences;
-- Remove extra column from patient_order_preferences
ALTER TABLE patient_order_preferences DROP COLUMN IF EXISTS standing_orders;
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
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS encounter_id;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS body_system;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS finding;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS severity;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS laterality;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS quality;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS duration;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS context;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS associated_symptoms;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS examined_at;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS is_normal;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS requires_follow_up;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS follow_up_timeframe;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS created_at;
-- Remove extra column from patient_physical_findings
ALTER TABLE patient_physical_findings DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS provider_id;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS pattern_type;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS frequency;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS time_preferences;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS seasonal_variations;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS created_at;
-- Remove extra column from patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns DROP COLUMN IF EXISTS updated_at;
-- Add missing column to patient_scheduling_patterns
ALTER TABLE patient_scheduling_patterns ADD COLUMN IF NOT EXISTS avg_visit_duration NUMERIC(10,2);
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS external_id;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS middle_name;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS phone;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS phone_type;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS city;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS state;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS zip;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS insurance_provider;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS insurance_policy_number;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS insurance_group_number;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact_name;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact_phone;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact_relationship;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS preferred_language;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS race;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS ethnicity;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS created_at;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS profile_photo_filename;
-- Remove extra column from patients
ALTER TABLE patients DROP COLUMN IF EXISTS consent_given;
-- Remove extra column from phi_access_logs
ALTER TABLE phi_access_logs DROP COLUMN IF EXISTS created_at;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS user_id;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS patient_id;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS custom_rank;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS reason;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS created_at;
-- Remove extra column from problem_rank_overrides
ALTER TABLE problem_rank_overrides DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS location_id;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS day_of_week;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS start_time;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS end_time;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS break_start;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS break_end;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS effective_from;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS effective_to;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS schedule_type;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS max_appointments;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS active;
-- Remove extra column from provider_schedules
ALTER TABLE provider_schedules DROP COLUMN IF EXISTS created_at;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS pattern_type;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS preferences;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS constraints;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS historical_data;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS created_at;
-- Remove extra column from provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns DROP COLUMN IF EXISTS updated_at;
-- Add missing column to provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns ADD COLUMN IF NOT EXISTS location_id INTEGER;
-- Add missing column to provider_scheduling_patterns
ALTER TABLE provider_scheduling_patterns ADD COLUMN IF NOT EXISTS avg_visit_duration NUMERIC(10,2);
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS date;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS time_slot;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS status;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS appointment_id;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS buffer_status;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS efficiency_score;
-- Remove extra column from realtime_schedule_status
ALTER TABLE realtime_schedule_status DROP COLUMN IF EXISTS updated_at;
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
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS exception_date;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS exception_type;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS start_time;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS end_time;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS reason;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS affects_scheduling;
-- Remove extra column from schedule_exceptions
ALTER TABLE schedule_exceptions DROP COLUMN IF EXISTS created_at;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS preferred_appointment_duration;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS buffer_time_minutes;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS lunch_start;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS lunch_duration;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS max_daily_appointments;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS max_consecutive_appointments;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS preferred_break_after_n_appointments;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS break_duration_minutes;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS allow_double_booking;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS allow_overtime;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS overtime_limit_minutes;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS created_at;
-- Remove extra column from schedule_preferences
ALTER TABLE schedule_preferences DROP COLUMN IF EXISTS updated_at;
-- Add missing column to schedule_preferences
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS use_ai_scheduling BOOLEAN DEFAULT false;
-- Add missing column to schedule_preferences
ALTER TABLE schedule_preferences ADD COLUMN IF NOT EXISTS ai_aggressiveness NUMERIC(10,2);
-- Remove extra column from scheduling_ai_factors
ALTER TABLE scheduling_ai_factors DROP COLUMN IF EXISTS category;
-- Remove extra column from scheduling_ai_factors
ALTER TABLE scheduling_ai_factors DROP COLUMN IF EXISTS description;
-- Remove extra column from scheduling_ai_factors
ALTER TABLE scheduling_ai_factors DROP COLUMN IF EXISTS is_enabled;
-- Remove extra column from scheduling_ai_factors
ALTER TABLE scheduling_ai_factors DROP COLUMN IF EXISTS created_at;
-- Remove extra column from scheduling_ai_factors
ALTER TABLE scheduling_ai_factors DROP COLUMN IF EXISTS updated_at;
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS factor_category TEXT;
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS factor_description TEXT;
-- Add missing column to scheduling_ai_factors
ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN DEFAULT false;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS created_by;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS factor_name;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS is_active;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS custom_parameters;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS created_at;
-- Remove extra column from scheduling_ai_weights
ALTER TABLE scheduling_ai_weights DROP COLUMN IF EXISTS updated_at;
-- Add missing column to scheduling_ai_weights
ALTER TABLE scheduling_ai_weights ADD COLUMN IF NOT EXISTS factor_id INTEGER;
-- Add missing column to scheduling_ai_weights
ALTER TABLE scheduling_ai_weights ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS name;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS available_hours;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS requires_cleaning;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS cleaning_duration;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS active;
-- Remove extra column from scheduling_resources
ALTER TABLE scheduling_resources DROP COLUMN IF EXISTS created_at;
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
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS name;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS applies_to;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS conditions;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS actions;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS priority;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS active;
-- Remove extra column from scheduling_rules
ALTER TABLE scheduling_rules DROP COLUMN IF EXISTS created_at;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS rule_name TEXT;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS health_system_id INTEGER;
-- Add missing column to scheduling_rules
ALTER TABLE scheduling_rules ADD COLUMN IF NOT EXISTS rule_config JSONB;
-- Remove extra column from scheduling_templates
ALTER TABLE scheduling_templates DROP COLUMN IF EXISTS template_type;
-- Remove extra column from scheduling_templates
ALTER TABLE scheduling_templates DROP COLUMN IF EXISTS day_configuration;
-- Remove extra column from scheduling_templates
ALTER TABLE scheduling_templates DROP COLUMN IF EXISTS appointment_types;
-- Remove extra column from scheduling_templates
ALTER TABLE scheduling_templates DROP COLUMN IF EXISTS buffer_rules;
-- Remove extra column from scheduling_templates
ALTER TABLE scheduling_templates DROP COLUMN IF EXISTS break_configuration;
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
-- Remove extra column from signatures
ALTER TABLE signatures DROP COLUMN IF EXISTS encounter_id;
-- Remove extra column from signatures
ALTER TABLE signatures DROP COLUMN IF EXISTS signed_by;
-- Remove extra column from signatures
ALTER TABLE signatures DROP COLUMN IF EXISTS signature_type;
-- Remove extra column from signatures
ALTER TABLE signatures DROP COLUMN IF EXISTS ip_address;
-- Remove extra column from signatures
ALTER TABLE signatures DROP COLUMN IF EXISTS attestation_text;
-- Add missing column to signatures
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS user_id INTEGER;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_method;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_status;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_attempts;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS last_delivery_attempt;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_error;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS can_change_delivery;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_lock_reason;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS original_delivery_method;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS delivery_changes;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS signed_at;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS signed_by;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS created_at;
-- Remove extra column from signed_orders
ALTER TABLE signed_orders DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS details;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS status;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS start_date;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS end_date;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS quantity;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS frequency;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS notes;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS risk_level;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS counseling_provided;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS created_at;
-- Remove extra column from social_history
ALTER TABLE social_history DROP COLUMN IF EXISTS updated_at;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS current_status TEXT;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS history_notes TEXT;
-- Add missing column to social_history
ALTER TABLE social_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS previous_status;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS new_status;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS changed_by;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS reason;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS billing_impact;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS effective_date;
-- Remove extra column from subscription_history
ALTER TABLE subscription_history DROP COLUMN IF EXISTS created_at;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS data_expires_at TIMESTAMP;
-- Add missing column to subscription_history
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS metadata JSONB;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS health_system_id;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS key_value;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS key_type;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS created_by;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS assigned_to;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS assigned_at;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS expires_at;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS status;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS usage_count;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS last_used_at;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS metadata;
-- Remove extra column from subscription_keys
ALTER TABLE subscription_keys DROP COLUMN IF EXISTS created_at;
-- Add missing column to subscription_keys
ALTER TABLE subscription_keys ADD COLUMN IF NOT EXISTS key TEXT;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS surgeon;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS facility;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS findings;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS implants_used;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS pathology_results;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS recovery_notes;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS procedure_code;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS approach;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS duration_minutes;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS estimated_blood_loss_ml;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS specimens_removed;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS drains_placed;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS post_op_diagnosis;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS discharge_instructions;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS follow_up_date;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS created_at;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from surgical_history
ALTER TABLE surgical_history DROP COLUMN IF EXISTS last_updated_encounter;
-- Add missing column to surgical_history
ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS outcome TEXT;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS shared_by;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS shared_with;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS status;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS shared_at;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS responded_at;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS share_message;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS can_modify;
-- Remove extra column from template_shares
ALTER TABLE template_shares DROP COLUMN IF EXISTS active;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS version_number;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS change_description;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS changed_by;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS example_note_snapshot;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS generated_prompt_snapshot;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS change_type;
-- Remove extra column from template_versions
ALTER TABLE template_versions DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS assistant_type;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS thread_id;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS assistant_id;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS context;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS last_message_at;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS message_count;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS active;
-- Remove extra column from user_assistant_threads
ALTER TABLE user_assistant_threads DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS note_type;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS section_name;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS edit_type;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS original_text;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS edited_text;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS edit_frequency;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS confidence_score;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS last_occurrence;
-- Remove extra column from user_edit_patterns
ALTER TABLE user_edit_patterns DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS location_id;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS is_primary;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS permissions;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from user_locations
ALTER TABLE user_locations DROP COLUMN IF EXISTS role_at_location;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS last_selected_note_type;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_chief_complaint;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_physical_exam;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_ros_negatives;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_assessment_style;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS use_voice_commands;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS auto_save_interval;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS show_template_suggestions;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS include_time_stamps;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_note_font_size;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_macro_set;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS preferred_exam_order;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS custom_normal_exams;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS abbreviation_expansions;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS quick_phrases;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS billing_reminder_enabled;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS sign_reminder_minutes;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_soap_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_apso_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_progress_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_h_and_p_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_discharge_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS default_procedure_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS global_ai_learning;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS learning_aggressiveness;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS remember_last_template;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS show_template_preview;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS auto_save_changes;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS medical_problems_display_threshold;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS ranking_weights;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS chart_panel_width;
-- Remove extra column from user_note_preferences
ALTER TABLE user_note_preferences DROP COLUMN IF EXISTS enable_dense_view;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS template_name;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS base_note_type;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS display_name;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS is_personal;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS is_default;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS created_by;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS shared_by;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS example_note;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS base_note_text;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS inline_comments;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS has_comments;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS generated_prompt;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS prompt_version;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS enable_ai_learning;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS learning_confidence;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS last_learning_update;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS usage_count;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS last_used;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS version;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS parent_template_id;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS active;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_note_templates
ALTER TABLE user_note_templates DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS id;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS show_resolved_problems;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS show_inactive_problems;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS sort_by;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS group_by_category;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS highlight_recent_changes;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS recent_change_days;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS max_problems_displayed;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_problem_list_preferences
ALTER TABLE user_problem_list_preferences DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS location_id;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS session_id;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS is_primary;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS permissions;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS remembered;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS created_at;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS is_active;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS remember_selection;
-- Remove extra column from user_session_locations
ALTER TABLE user_session_locations DROP COLUMN IF EXISTS selected_at;
-- Remove extra column from users
ALTER TABLE users DROP COLUMN IF EXISTS license_state;
-- Remove extra column from users
ALTER TABLE users DROP COLUMN IF EXISTS bio;
-- Remove extra column from users
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
-- Remove extra column from users
ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;
-- Remove extra column from users
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS blood_pressure_systolic;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS blood_pressure_diastolic;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS blood_glucose;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS extracted_from_attachment_id;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS extraction_notes;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS consolidation_reasoning;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS merged_ids;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS visit_history;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS created_at;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS updated_at;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS systolic;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS diastolic;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS processing_notes;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS source_notes;
-- Remove extra column from vitals
ALTER TABLE vitals DROP COLUMN IF EXISTS entered_by;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS credential_id;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS public_key;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS counter;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS device_type;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS transports;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS created_at;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS last_used_at;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS registered_device;
-- Remove extra column from webauthn_credentials
ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS device_name;
-- Remove extra table
DROP TABLE IF EXISTS dashboards CASCADE;
-- Remove extra table
DROP TABLE IF EXISTS migration_invitations CASCADE;