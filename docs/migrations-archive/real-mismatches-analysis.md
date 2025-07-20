# Real Database vs Schema Mismatches
(Excluding naming convention differences)


## Table: admin_prompt_reviews

### Columns to REMOVE from database:
- prompt_id (text)
- reviewer_id (integer)
- feedback (text)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- templateId → template_id
- originalPrompt → original_prompt
- reviewedPrompt → reviewed_prompt
- adminUserId → admin_user_id
- reviewNotes → review_notes
- isActive → is_active
- performanceMetrics → performance_metrics
- reviewedAt → reviewed_at

## Table: allergies

### Columns to REMOVE from database:
- encounter_id (integer)
- notes (text)
- verified_by (integer)
- verified_at (timestamp without time zone)
- source_timestamp (timestamp without time zone)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- reaction_type (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- last_reaction (date)
- source_notes (text)
- entered_by (integer)
- temporal_conflict_resolution (text)
- last_updated_encounter (integer)

## Table: appointment_duration_history

### Columns to REMOVE from database:
- predicted_duration (integer)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- aiPredictedDuration → ai_predicted_duration
- providerScheduledDuration → provider_scheduled_duration
- patientVisibleDuration → patient_visible_duration
- actualArrivalDelta → actual_arrival_delta
- factorsUsed → factors_used

## Table: appointment_resource_requirements

### Columns to REMOVE from database:
- resource_type (text)
- resource_id (integer)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- requiresRoom → requires_room
- roomType → room_type
- requiresEquipment → requires_equipment
- requiresStaff → requires_staff

## Table: appointment_types

### Columns to REMOVE from database:
- name (character varying)
- duration_minutes (integer)
- color (character varying)
- description (text)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Columns to ADD to database:
- locationId → location_id
- typeName → type_name
- typeCode → type_code
- category → category
- defaultDuration → default_duration
- minDuration → min_duration
- maxDuration → max_duration
- allowOnlineScheduling → allow_online_scheduling
- requiresPreAuth → requires_pre_auth
- requiresSpecialPrep → requires_special_prep
- prepInstructions → prep_instructions
- defaultResourceRequirements → default_resource_requirements

## Table: appointments

### Columns to REMOVE from database:
- provider_id (integer)
- location_id (integer)
- appointment_type_id (integer)
- start_time (timestamp with time zone)
- end_time (timestamp with time zone)
- duration_minutes (integer)
- ai_predicted_duration (integer)
- status (character varying)
- chief_complaint (text)
- notes (text)
- checked_in_at (timestamp with time zone)
- checked_in_by (integer)
- completed_at (timestamp with time zone)
- completed_by (integer)
- cancelled_at (timestamp with time zone)
- cancelled_by (integer)
- cancellation_reason (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

## Table: article_comments

### Columns to REMOVE from database:
- author_name (text)
- author_email (text)
- content (text)
- is_approved (boolean)
- parent_id (integer)
- created_at (timestamp without time zone)

## Table: article_revisions

### Columns to REMOVE from database:
- content (text)
- revision_note (text)
- revision_type (text)
- created_by (integer)
- created_at (timestamp without time zone)

## Table: asymmetric_scheduling_config

### Columns to REMOVE from database:
- weekday_schedule (jsonb)
- custom_rules (jsonb)
- effective_date (date)

### Columns to ADD to database:
- locationId → location_id
- healthSystemId → health_system_id
- enabled → enabled
- patientMinDuration → patient_min_duration
- providerMinDuration → provider_min_duration
- roundingInterval → rounding_interval
- defaultBufferMinutes → default_buffer_minutes
- bufferForChronicPatients → buffer_for_chronic_patients
- bufferThresholdProblemCount → buffer_threshold_problem_count
- createdBy → created_by

## Table: attachment_extracted_content

### Columns to REMOVE from database:
- page_number (integer)
- content_type (text)
- structured_data (jsonb)
- confidence_score (numeric)
- extraction_method (text)

### Columns to ADD to database:
- aiGeneratedTitle → ai_generated_title
- documentType → document_type
- processingStatus → processing_status
- errorMessage → error_message
- processedAt → processed_at

## Table: authentication_logs

### Columns to REMOVE from database:
- error_message (text)
- created_at (timestamp with time zone)

### Columns to ADD to database:
- deviceFingerprint → device_fingerprint
- geolocation → geolocation

## Table: clinic_admin_verifications

### Columns to REMOVE from database:
- applicant_first_name (text)
- applicant_last_name (text)
- applicant_email (text)
- applicant_phone (text)
- address_street (text)
- address_city (text)
- address_state (text)
- address_zip (text)
- website (text)
- preferred_ehr_tier (integer)
- verification_status (text)
- verification_score (numeric)
- verification_details (jsonb)
- risk_assessment (jsonb)
- automated_decision (text)
- automated_recommendations (ARRAY)
- manual_review_notes (text)
- reviewer_id (integer)
- reviewed_at (timestamp without time zone)
- api_verification_results (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- email → email
- verificationCode → verification_code
- verificationData → verification_data
- status → status
- healthSystemId → health_system_id
- submittedAt → submitted_at
- approvedAt → approved_at
- rejectedAt → rejected_at
- rejectionReason → rejection_reason
- expiresAt → expires_at
- approvedBy → approved_by
- ipAddress → ip_address
- userAgent → user_agent

## Table: data_modification_logs

### Columns to REMOVE from database:
- action (text)
- old_values (jsonb)
- new_values (jsonb)
- reason (text)
- ip_address (text)
- user_agent (text)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- userName → user_name
- userRole → user_role
- healthSystemId → health_system_id
- patientId → patient_id
- operation → operation
- fieldName → field_name
- oldValue → old_value
- newValue → new_value
- changeReason → change_reason
- encounterId → encounter_id
- orderAuthority → order_authority
- validated → validated
- validatedBy → validated_by
- validatedAt → validated_at
- modifiedAt → modified_at

## Table: diagnoses

### Columns to REMOVE from database:
- claim_submission_status (text)
- claim_id (text)
- clearinghouse_id (text)
- payer_id (text)
- allowed_amount (numeric)
- paid_amount (numeric)
- patient_responsibility (numeric)
- adjustment_amount (numeric)
- denial_reason (text)
- denial_code (text)
- appeal_status (text)
- appeal_deadline (text)
- billing_notes (text)
- last_billing_action (text)
- assigned_biller (integer)
- modifier_applied (text)
- billing_action_date (timestamp without time zone)

## Table: document_processing_queue

### Columns to REMOVE from database:
- priority (integer)
- processor_type (text)
- processing_metadata (jsonb)
- error_message (text)
- retry_count (integer)
- started_at (timestamp without time zone)
- completed_at (timestamp without time zone)

### Columns to ADD to database:
- attempts → attempts
- lastAttempt → last_attempt

## Table: email_notifications

### Columns to REMOVE from database:
- recipient_email (text)
- subject (text)
- body_html (text)
- body_text (text)
- related_user_id (integer)
- related_entity_type (text)
- related_entity_id (integer)
- status (text)
- sent_at (timestamp without time zone)
- error_message (text)
- retry_count (integer)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- userId → user_id
- healthSystemId → health_system_id

## Table: emergency_access_logs

### Columns to REMOVE from database:
- access_reason (text)
- override_restrictions (jsonb)
- supervisor_approval (integer)
- access_duration (integer)
- ip_address (text)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- userName → user_name
- userRole → user_role
- healthSystemId → health_system_id
- patientName → patient_name
- justification → justification
- authorizingPhysician → authorizing_physician
- accessStartTime → access_start_time
- accessEndTime → access_end_time
- accessedResources → accessed_resources

## Table: encounters

### Columns to REMOVE from database:
- encounter_date (timestamp without time zone)
- visit_reason (text)
- status (character varying)
- location (character varying)
- insurance_verified (boolean)
- copay_collected (numeric)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- location_id (integer)
- ai_scribe_mode (text)
- signed_by (integer)
- signed_at (timestamp without time zone)
- is_signed (boolean)
- appointment_id (integer)
- transcription_id (text)
- assistant_thread_id (text)
- voice_recording_url (text)
- alerts (jsonb)
- draft_orders (jsonb)
- draft_diagnoses (jsonb)
- cpt_codes (jsonb)
- signature_id (character varying)
- last_chart_update (timestamp without time zone)
- chart_update_duration (integer)

## Table: external_labs

### Columns to REMOVE from database:
- patient_id (integer)
- test_name (text)
- test_date (date)
- result_value (text)
- unit (text)
- reference_range (text)
- abnormal_flag (text)
- ordering_provider (text)
- status (text)
- attachment_id (integer)

### Columns to ADD to database:
- labIdentifier → lab_identifier
- integrationType → integration_type
- apiEndpoint → api_endpoint
- hl7Endpoint → hl7_endpoint
- apiKeyEncrypted → api_key_encrypted
- usernameEncrypted → username_encrypted
- sslCertificatePath → ssl_certificate_path
- supportedTests → supported_tests
- turnaroundTimes → turnaround_times
- active → active

## Table: family_history

### Columns to REMOVE from database:
- relationship (text)
- condition (text)
- age_at_onset (integer)
- age_at_death (integer)
- cause_of_death (text)
- notes (text)
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- maternal_side (boolean)
- living_status (text)
- genetic_marker (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- familyMember → family_member
- medicalHistory → medical_history
- lastUpdatedEncounter → last_updated_encounter

## Table: gpt_lab_review_notes

### Columns to REMOVE from database:
- lab_order_id (integer)
- review_type (text)
- ai_interpretation (text)
- clinical_significance (text)
- follow_up_recommendations (text)
- risk_assessment (jsonb)
- reviewed_by (integer)
- review_status (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- encounterId → encounter_id
- resultIds → result_ids
- clinicalReview → clinical_review
- patientMessage → patient_message
- nurseMessage → nurse_message
- patientContext → patient_context

## Table: health_systems

### Columns to REMOVE from database:
- type (character varying)
- subscription_key (character varying)
- is_migration (boolean)
- stripe_customer_id (character varying)
- metadata (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- subscription_limits (jsonb)
- active_user_count (jsonb)
- billing_details (jsonb)
- active (boolean)
- status (text)

## Table: imaging_orders

### Columns to REMOVE from database:
- provider_id (integer)
- imaging_type (text)
- indication (text)
- priority (text)
- status (text)
- facility_id (integer)
- scheduled_date (timestamp without time zone)
- completed_date (timestamp without time zone)

### Columns to ADD to database:
- studyType → study_type
- contrastNeeded → contrast_needed
- clinicalIndication → clinical_indication
- relevantSymptoms → relevant_symptoms
- orderedBy → ordered_by
- orderedAt → ordered_at
- externalFacilityId → external_facility_id
- externalOrderId → external_order_id
- dicomAccessionNumber → dicom_accession_number
- orderStatus → order_status
- scheduledAt → scheduled_at
- completedAt → completed_at
- prepInstructions → prep_instructions
- schedulingNotes → scheduling_notes
- updatedAt → updated_at

## Table: imaging_results

### Columns to REMOVE from database:
- encounter_id (integer)
- study_type (text)
- accession_number (text)
- performing_facility (text)
- ordering_provider_id (integer)
- reading_radiologist (text)
- recommendations (text)
- comparison_studies (text)
- technique (text)
- contrast_used (boolean)
- contrast_type (text)
- radiation_dose (text)
- number_of_images (integer)
- critical_findings (boolean)
- critical_findings_communicated_at (timestamp without time zone)
- report_status (text)
- report_finalized_at (timestamp without time zone)
- addendum (text)
- addendum_date (timestamp without time zone)
- procedure_code (text)
- diagnostic_quality (text)
- limitations (text)
- follow_up_needed (boolean)
- follow_up_timeframe (text)
- bi_rads_score (text)
- lung_rads_score (text)
- ti_rads_score (text)
- pi_rads_score (text)
- liver_rads_score (text)
- incidental_findings (text)
- relevant_history (text)
- clinical_indication (text)
- protocol_name (text)
- series_count (integer)
- image_count (integer)
- study_size_mb (numeric)
- pacs_study_uid (text)
- dicom_retrieval_url (text)
- external_system_id (text)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- laterality → laterality
- clinicalSummary → clinical_summary
- radiologistName → radiologist_name
- facilityName → facility_name
- attachmentId → attachment_id
- dicomStudyId → dicom_study_id
- dicomSeriesId → dicom_series_id
- imageFilePaths → image_file_paths
- resultStatus → result_status
- reviewedBy → reviewed_by
- reviewedAt → reviewed_at
- providerNotes → provider_notes
- needsReview → needs_review

## Table: lab_orders

### Columns to REMOVE from database:
- order_id (integer)
- result_received_at (timestamp without time zone)
- status (text)
- transmission_response (jsonb)
- result_data (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- provider_id (integer)
- specimen_source (text)
- special_instructions (text)
- collection_site (text)
- collected_by (integer)
- external_lab (text)
- result_status (text)
- reference_range (text)
- expected_turnaround (text)
- external_status (text)
- results (jsonb)
- abnormal_flags (ARRAY)
- discontinued_at (timestamp without time zone)
- discontinued_by (integer)
- discontinued_reason (text)
- critical_values (ARRAY)
- stat_order (boolean)
- provider_notes (text)
- patient_preparation (text)
- collection_priority (text)
- processing_notes (text)
- billing_code (text)
- insurance_preauth_date (timestamp without time zone)
- actual_cost (numeric)
- patient_consent (boolean)
- consent_date (timestamp without time zone)
- insurance_coverage (text)
- patient_copay (numeric)
- billing_status (text)
- billing_date (timestamp without time zone)
- cancellation_reason (text)
- result_interpretation (text)
- ai_suggested_tests (ARRAY)
- ai_analysis (text)
- result_notification_sent (boolean)
- result_notification_date (timestamp without time zone)
- performing_lab_id (integer)
- lab_account_number (text)
- risk_flags (ARRAY)
- quality_control_status (text)
- quality_control_notes (text)
- repeat_test_reason (text)
- original_order_id (integer)
- test_methodology (text)
- quality_measure (text)
- processing_lab_name (text)
- processing_lab_director (text)
- test_validation_status (text)
- regulatory_compliance (text)
- sample_rejection_reason (text)
- preventive_care_flag (boolean)
- clinical_trial_id (text)
- research_study_id (text)
- patient_location (text)
- ordering_facility_id (integer)
- test_performed_at (text)

## Table: lab_reference_ranges

### Columns to REMOVE from database:
- test_code (text)
- reference_low (numeric)
- reference_high (numeric)
- critical_low (numeric)
- critical_high (numeric)
- unit (text)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- loincCode → loinc_code
- testCategory → test_category
- normalLow → normal_low

## Table: lab_results

### Columns to REMOVE from database:
- result_units (text)
- reference_range (text)
- age_gender_adjusted_range (text)
- abnormal_flag (text)
- critical_flag (boolean)
- delta_flag (text)
- specimen_collected_at (timestamp without time zone)
- specimen_received_at (timestamp without time zone)
- result_available_at (timestamp without time zone)
- result_finalized_at (timestamp without time zone)
- received_at (timestamp without time zone)
- external_lab_id (integer)
- external_result_id (text)
- hl7_message_id (text)
- instrument_id (text)
- result_status (text)
- verification_status (text)
- result_comments (text)
- reviewed_by (integer)
- reviewed_at (timestamp without time zone)
- provider_notes (text)
- needs_review (boolean)
- review_status (text)
- review_note (text)
- review_template (text)
- review_history (jsonb)
- patient_communication_sent (boolean)
- patient_communication_method (text)
- patient_communication_sent_at (timestamp without time zone)
- patient_notified_by (integer)
- patient_message (text)
- patient_message_sent_at (timestamp without time zone)
- source_type (text)
- source_confidence (text)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

## Table: locations

### Columns to REMOVE from database:
- zip (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- services (jsonb)
- has_lab (boolean)
- has_imaging (boolean)
- has_pharmacy (boolean)

### Columns to ADD to database:
- fax → fax
- email → email
- operatingHours → operating_hours

## Table: magic_links

### Columns to REMOVE from database:
- used (boolean)

### Columns to ADD to database:
- userId → user_id
- purpose → purpose

## Table: medical_history

### Columns to REMOVE from database:
- condition (text)
- onset_date (date)
- resolution_date (date)
- status (text)
- severity (text)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- conditionCategory → condition_category
- historyText → history_text
- lastUpdatedEncounter → last_updated_encounter
- sourceType → source_type
- sourceConfidence → source_confidence

## Table: medical_problems

### Columns to REMOVE from database:
- encounter_id (integer)
- icd10_code (text)
- snomed_code (text)
- onset_date (date)
- resolution_date (date)
- notes (text)
- severity (text)
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- provider_id (integer)
- date_diagnosed (date)
- last_updated (timestamp without time zone)
- verification_status (text)
- verification_date (timestamp without time zone)
- verified_by (integer)
- clinical_status (text)
- body_site (text)
- body_site_laterality (text)
- category (text)
- last_reviewed_date (timestamp without time zone)
- reviewed_by (integer)
- patient_education_provided (boolean)
- care_plan_status (text)
- functional_impact (text)
- prognosis (text)
- risk_factors (ARRAY)
- associated_conditions (ARRAY)
- treatment_goals (text)
- monitoring_parameters (text)
- follow_up_required (boolean)
- follow_up_date (date)
- problem_ranking (integer)
- display_in_summary (boolean)
- patient_aware (boolean)
- caregiver_aware (boolean)
- reportable_condition (boolean)
- reported_date (date)
- clinical_priority (text)
- social_determinants (jsonb)
- cultural_considerations (text)
- patient_goals (text)
- barriers_to_care (text)
- quality_measures (jsonb)
- outcome_measures (jsonb)
- care_team_members (jsonb)
- care_coordination_notes (text)
- original_problem_text (text)
- mapped_by_ai (boolean)
- ai_confidence_score (numeric)
- human_verified (boolean)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- firstDiagnosedDate → first_diagnosed_date
- firstEncounterId → first_encounter_id

## Table: medication_formulary

### Columns to REMOVE from database:
- medication_name (text)
- drug_class (text)
- dosage_forms (ARRAY)
- strengths (ARRAY)
- route (ARRAY)
- tier (integer)
- prior_auth_required (boolean)
- quantity_limits (jsonb)
- step_therapy (jsonb)
- alternatives (ARRAY)
- active (boolean)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- brandNames → brand_names
- commonNames → common_names
- standardStrengths → standard_strengths
- availableForms → available_forms
- formRoutes → form_routes

## Table: medications

### Columns to REMOVE from database:
- form (text)
- discontinuation_date (date)
- discontinuation_reason (text)
- prescribed_by (integer)
- prescribed_date (timestamp without time zone)
- pharmacy (text)
- prescriber_notes (text)
- patient_instructions (text)
- rxnorm_code (text)
- refills (integer)
- lot_number (text)
- expiration_date (date)
- manufacturer (text)
- dea_schedule (text)
- is_controlled (boolean)
- requires_prior_auth (boolean)
- prior_auth_number (text)
- formulary_status (text)
- therapeutic_class (text)
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- grouping_strategy (text)
- discontinuation_source (text)
- original_order_id (integer)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- surescripts_id (text)
- reason_for_change (text)
- medication_history (jsonb)
- change_log (jsonb)
- source_notes (text)
- entered_by (integer)
- related_medications (jsonb)
- drug_interactions (jsonb)
- pharmacy_order_id (text)
- insurance_auth_status (text)
- prior_auth_required (boolean)
- last_updated_encounter_id (integer)

### Columns to ADD to database:
- rxNormCode → rx_norm_code
- sureScriptsId → sure_scripts_id

## Table: orders

### Columns to REMOVE from database:
- provider_id (integer)
- order_date (timestamp without time zone)
- status (character varying)
- medication_dosage (character varying)
- medication_route (character varying)
- medication_frequency (character varying)
- medication_duration (character varying)
- medication_quantity (integer)
- medication_refills (integer)
- lab_test_name (character varying)
- lab_test_code (character varying)
- imaging_study_type (character varying)
- imaging_body_part (character varying)
- referral_specialty (character varying)
- referral_reason (text)
- instructions (text)
- diagnosis_codes (ARRAY)
- prescriber (text)
- prescriber_id (integer)
- body_part (text)
- ndc_code (text)
- route (text)
- frequency (text)
- duration (text)
- start_date (timestamp without time zone)
- end_date (timestamp without time zone)
- indication (text)
- imaging_order_id (integer)
- external_order_id (text)

## Table: organization_documents

### Columns to REMOVE from database:
- organization_id (integer)
- file_path (text)
- file_size (integer)
- mime_type (text)
- active (boolean)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- documentUrl → document_url
- uploadedAt → uploaded_at
- verifiedAt → verified_at
- verifiedBy → verified_by
- expiresAt → expires_at

## Table: organizations

### Columns to REMOVE from database:
- type (character varying)
- website (character varying)
- updated_at (timestamp with time zone)

## Table: patient_attachments

### Columns to REMOVE from database:
- filename (text)
- original_filename (text)
- file_type (text)
- upload_date (timestamp without time zone)
- document_type (text)
- document_date (date)
- ocr_text (text)
- ocr_completed (boolean)
- ocr_completed_at (timestamp without time zone)
- processing_notes (text)
- extracted_data (jsonb)
- chart_sections_updated (ARRAY)
- confidence_scores (jsonb)
- hash_value (text)
- is_deleted (boolean)
- deleted_at (timestamp without time zone)
- deleted_by (integer)
- retention_date (date)
- access_count (integer)
- last_accessed_at (timestamp without time zone)
- source_system (text)
- external_id (text)

### Columns to ADD to database:
- fileName → file_name
- originalFileName → original_file_name
- fileExtension → file_extension
- filePath → file_path
- category → category
- title → title
- isConfidential → is_confidential
- accessLevel → access_level
- contentHash → content_hash
- virusScanStatus → virus_scan_status

## Table: patient_order_preferences

### Columns to REMOVE from database:
- provider_id (integer)
- order_type (text)
- preferences (jsonb)
- standing_orders (jsonb)

### Columns to ADD to database:
- labDeliveryMethod → lab_delivery_method
- labServiceProvider → lab_service_provider
- imagingDeliveryMethod → imaging_delivery_method
- imagingServiceProvider → imaging_service_provider
- medicationDeliveryMethod → medication_delivery_method
- preferredPharmacy → preferred_pharmacy
- pharmacyPhone → pharmacy_phone
- pharmacyFax → pharmacy_fax
- lastUpdatedBy → last_updated_by

## Table: patient_physical_findings

### Columns to REMOVE from database:
- encounter_id (integer)
- body_system (text)
- finding (text)
- severity (text)
- laterality (text)
- quality (text)
- duration (text)
- context (text)
- associated_symptoms (text)
- provider_id (integer)
- examined_at (timestamp without time zone)
- is_normal (boolean)
- requires_follow_up (boolean)
- follow_up_timeframe (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- examSystem → exam_system
- examComponent → exam_component
- findingText → finding_text
- findingType → finding_type
- confidence → confidence

## Table: patient_scheduling_patterns

### Columns to REMOVE from database:
- provider_id (integer)
- pattern_type (text)
- frequency (jsonb)
- time_preferences (jsonb)
- seasonal_variations (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- avgVisitDuration → avg_visit_duration

## Table: patients

### Columns to REMOVE from database:
- external_id (character varying)
- middle_name (character varying)
- phone (character varying)
- phone_type (character varying)
- city (character varying)
- state (character varying)
- zip (character varying)
- insurance_provider (character varying)
- insurance_policy_number (character varying)
- insurance_group_number (character varying)
- emergency_contact_name (character varying)
- emergency_contact_phone (character varying)
- emergency_contact_relationship (character varying)
- preferred_language (character varying)
- race (character varying)
- ethnicity (character varying)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- profile_photo_filename (text)
- consent_given (boolean)

## Table: phi_access_logs

### Columns to REMOVE from database:
- created_at (timestamp without time zone)

## Table: problem_rank_overrides

### Columns to REMOVE from database:
- user_id (integer)
- patient_id (integer)
- custom_rank (integer)
- reason (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

## Table: provider_schedules

### Columns to REMOVE from database:
- location_id (integer)
- day_of_week (text)
- start_time (time without time zone)
- end_time (time without time zone)
- break_start (time without time zone)
- break_end (time without time zone)
- effective_from (date)
- effective_to (date)
- schedule_type (text)
- max_appointments (integer)
- active (boolean)
- created_at (timestamp without time zone)

## Table: provider_scheduling_patterns

### Columns to REMOVE from database:
- pattern_type (text)
- preferences (jsonb)
- constraints (jsonb)
- historical_data (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- locationId → location_id
- avgVisitDuration → avg_visit_duration

## Table: realtime_schedule_status

### Columns to REMOVE from database:
- date (date)
- time_slot (time without time zone)
- status (text)
- appointment_id (integer)
- buffer_status (text)
- efficiency_score (numeric)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- locationId → location_id
- scheduleDate → schedule_date
- currentPatientId → current_patient_id
- currentAppointmentId → current_appointment_id
- runningBehindMinutes → running_behind_minutes
- lastUpdateTime → last_update_time
- dayStartedAt → day_started_at
- estimatedCatchUpTime → estimated_catch_up_time
- aiRecommendations → ai_recommendations

## Table: resource_bookings

### Columns to ADD to database:
- bookingDate → booking_date
- createdBy → created_by

## Table: schedule_exceptions

### Columns to REMOVE from database:
- exception_date (date)
- exception_type (text)
- start_time (time without time zone)
- end_time (time without time zone)
- reason (text)
- affects_scheduling (boolean)
- created_at (timestamp without time zone)

## Table: schedule_preferences

### Columns to REMOVE from database:
- preferred_appointment_duration (integer)
- buffer_time_minutes (integer)
- lunch_start (time without time zone)
- lunch_duration (integer)
- max_daily_appointments (integer)
- max_consecutive_appointments (integer)
- preferred_break_after_n_appointments (integer)
- break_duration_minutes (integer)
- allow_double_booking (boolean)
- allow_overtime (boolean)
- overtime_limit_minutes (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- useAiScheduling → use_ai_scheduling
- aiAggressiveness → ai_aggressiveness

## Table: scheduling_ai_factors

### Columns to REMOVE from database:
- category (character varying)
- description (text)
- is_enabled (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Columns to ADD to database:
- factorCategory → factor_category
- factorDescription → factor_description
- defaultEnabled → default_enabled

## Table: scheduling_ai_weights

### Columns to REMOVE from database:
- created_by (integer)
- factor_name (character varying)
- is_active (boolean)
- custom_parameters (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Columns to ADD to database:
- factorId → factor_id
- enabled → enabled

## Table: scheduling_resources

### Columns to REMOVE from database:
- name (text)
- available_hours (jsonb)
- requires_cleaning (boolean)
- cleaning_duration (integer)
- active (boolean)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- resourceName → resource_name
- resourceCode → resource_code
- capabilities → capabilities
- requiresCleaningMinutes → requires_cleaning_minutes
- maintenanceSchedule → maintenance_schedule

## Table: scheduling_rules

### Columns to REMOVE from database:
- name (text)
- applies_to (text)
- conditions (jsonb)
- actions (jsonb)
- priority (integer)
- active (boolean)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- ruleName → rule_name
- healthSystemId → health_system_id
- ruleConfig → rule_config

## Table: scheduling_templates

### Columns to REMOVE from database:
- template_type (text)
- day_configuration (jsonb)
- appointment_types (jsonb)
- buffer_rules (jsonb)
- break_configuration (jsonb)

### Columns to ADD to database:
- description → description
- locationId → location_id
- healthSystemId → health_system_id
- slotDuration → slot_duration
- startTime → start_time
- endTime → end_time
- lunchStart → lunch_start
- lunchDuration → lunch_duration
- bufferBetweenAppts → buffer_between_appts
- allowDoubleBooking → allow_double_booking
- maxPatientsPerDay → max_patients_per_day
- daysOfWeek → days_of_week
- isDefault → is_default
- createdBy → created_by

## Table: signatures

### Columns to REMOVE from database:
- encounter_id (integer)
- signed_by (integer)
- signature_type (text)
- ip_address (text)
- attestation_text (text)

### Columns to ADD to database:
- userId → user_id

## Table: signed_orders

### Columns to REMOVE from database:
- delivery_method (character varying)
- delivery_status (character varying)
- delivery_attempts (integer)
- last_delivery_attempt (timestamp without time zone)
- delivery_error (text)
- can_change_delivery (boolean)
- delivery_lock_reason (character varying)
- original_delivery_method (character varying)
- delivery_changes (jsonb)
- signed_at (timestamp without time zone)
- signed_by (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

## Table: social_history

### Columns to REMOVE from database:
- details (text)
- status (text)
- start_date (date)
- end_date (date)
- quantity (text)
- frequency (text)
- notes (text)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- risk_level (text)
- counseling_provided (boolean)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

### Columns to ADD to database:
- currentStatus → current_status
- historyNotes → history_notes
- lastUpdatedEncounter → last_updated_encounter

## Table: subscription_history

### Columns to REMOVE from database:
- previous_status (text)
- new_status (text)
- changed_by (integer)
- reason (text)
- billing_impact (jsonb)
- effective_date (timestamp without time zone)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- changedAt → changed_at
- gracePeriodEnds → grace_period_ends
- dataExpiresAt → data_expires_at
- metadata → metadata

## Table: subscription_keys

### Columns to REMOVE from database:
- health_system_id (integer)
- key_value (text)
- key_type (text)
- created_by (integer)
- assigned_to (integer)
- assigned_at (timestamp without time zone)
- expires_at (timestamp without time zone)
- status (text)
- usage_count (integer)
- last_used_at (timestamp without time zone)
- metadata (jsonb)
- created_at (timestamp without time zone)

### Columns to ADD to database:
- key → key

## Table: surgical_history

### Columns to REMOVE from database:
- surgeon (text)
- facility (text)
- findings (text)
- implants_used (text)
- pathology_results (text)
- recovery_notes (text)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- procedure_code (text)
- approach (text)
- duration_minutes (integer)
- estimated_blood_loss_ml (integer)
- specimens_removed (text)
- drains_placed (text)
- post_op_diagnosis (text)
- discharge_instructions (text)
- follow_up_date (date)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- last_updated_encounter (integer)

### Columns to ADD to database:
- outcome → outcome

## Table: template_shares

### Columns to REMOVE from database:
- shared_by (integer)
- shared_with (integer)
- status (text)
- shared_at (timestamp without time zone)
- responded_at (timestamp without time zone)
- share_message (text)
- can_modify (boolean)
- active (boolean)

## Table: template_versions

### Columns to REMOVE from database:
- version_number (integer)
- change_description (text)
- changed_by (integer)
- example_note_snapshot (text)
- generated_prompt_snapshot (text)
- change_type (text)
- created_at (timestamp without time zone)

## Table: user_assistant_threads

### Columns to REMOVE from database:
- assistant_type (text)
- thread_id (text)
- assistant_id (text)
- context (jsonb)
- last_message_at (timestamp without time zone)
- message_count (integer)
- active (boolean)
- created_at (timestamp without time zone)

## Table: user_edit_patterns

### Columns to REMOVE from database:
- note_type (text)
- section_name (text)
- edit_type (text)
- original_text (text)
- edited_text (text)
- edit_frequency (integer)
- confidence_score (numeric)
- last_occurrence (timestamp without time zone)
- created_at (timestamp without time zone)

## Table: user_locations

### Columns to REMOVE from database:
- location_id (integer)
- is_primary (boolean)
- permissions (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- role_at_location (text)

## Table: user_note_preferences

### Columns to REMOVE from database:
- last_selected_note_type (character varying)
- default_chief_complaint (text)
- default_physical_exam (text)
- default_ros_negatives (text)
- default_assessment_style (character varying)
- use_voice_commands (boolean)
- auto_save_interval (integer)
- show_template_suggestions (boolean)
- include_time_stamps (boolean)
- default_note_font_size (integer)
- default_macro_set (character varying)
- preferred_exam_order (ARRAY)
- custom_normal_exams (jsonb)
- abbreviation_expansions (jsonb)
- quick_phrases (jsonb)
- billing_reminder_enabled (boolean)
- sign_reminder_minutes (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- default_soap_template (integer)
- default_apso_template (integer)
- default_progress_template (integer)
- default_h_and_p_template (integer)
- default_discharge_template (integer)
- default_procedure_template (integer)
- global_ai_learning (boolean)
- learning_aggressiveness (text)
- remember_last_template (boolean)
- show_template_preview (boolean)
- auto_save_changes (boolean)
- medical_problems_display_threshold (integer)
- ranking_weights (jsonb)
- chart_panel_width (integer)
- enable_dense_view (boolean)

## Table: user_note_templates

### Columns to REMOVE from database:
- template_name (text)
- base_note_type (text)
- display_name (text)
- is_personal (boolean)
- is_default (boolean)
- created_by (integer)
- shared_by (integer)
- example_note (text)
- base_note_text (text)
- inline_comments (jsonb)
- has_comments (boolean)
- generated_prompt (text)
- prompt_version (integer)
- enable_ai_learning (boolean)
- learning_confidence (numeric)
- last_learning_update (timestamp without time zone)
- usage_count (integer)
- last_used (timestamp without time zone)
- version (integer)
- parent_template_id (integer)
- active (boolean)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

## Table: user_problem_list_preferences

### Columns to REMOVE from database:
- id (integer)
- show_resolved_problems (boolean)
- show_inactive_problems (boolean)
- sort_by (text)
- group_by_category (boolean)
- highlight_recent_changes (boolean)
- recent_change_days (integer)
- max_problems_displayed (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

## Table: user_session_locations

### Columns to REMOVE from database:
- location_id (integer)
- session_id (character varying)
- is_primary (boolean)
- permissions (jsonb)
- remembered (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- is_active (boolean)
- remember_selection (boolean)
- selected_at (timestamp without time zone)

## Table: users

### Columns to REMOVE from database:
- license_state (character varying)
- bio (text)
- is_active (boolean)
- profile_image_url (character varying)
- updated_at (timestamp without time zone)

## Table: vitals

### Columns to REMOVE from database:
- blood_pressure_systolic (integer)
- blood_pressure_diastolic (integer)
- blood_glucose (integer)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- systolic (integer)
- diastolic (integer)
- processing_notes (text)
- source_notes (text)
- entered_by (integer)

## Table: webauthn_credentials

### Columns to REMOVE from database:
- credential_id (text)
- public_key (text)
- counter (bigint)
- device_type (text)
- transports (ARRAY)
- created_at (timestamp without time zone)
- last_used_at (timestamp without time zone)
- registered_device (text)
- device_name (text)

## Tables to REMOVE from database:
- dashboards
- migration_invitations
- session