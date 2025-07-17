# Complete Database vs Schema Analysis Report
Generated on: 7/17/2025

## Summary
- Total tables in database: 78
- Total tables in schema: 75
- Tables in DB but not in schema: 3
- Tables in schema but not in DB: 0

## Tables Only in Database (not in schema)
- dashboards
- migration_invitations
- session

## Tables Only in Schema (not in database)
None

## Column Analysis for Each Table
Tables are analyzed in alphabetical order. For each table that exists in both database and schema:

### Table: admin_prompt_reviews

**Columns in database but NOT in schema:**
- prompt_id (text, NOT NULL)
- reviewer_id (integer)
- review_status (text)
- feedback (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- templateId
- originalPrompt
- reviewedPrompt
- adminUserId
- reviewStatus
- reviewNotes
- isActive
- performanceMetrics
- createdAt
- reviewedAt

Total columns in database: 7
Total columns in schema: 11

### Table: allergies

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- onset_date (date)
- notes (text)
- verified_by (integer)
- verified_at (timestamp without time zone)
- source_type (text)
- source_confidence (numeric)
- source_timestamp (timestamp without time zone)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- allergy_type (text)
- reaction_type (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- last_reaction (date)
- last_reaction_date (date)
- verification_status (text)
- drug_class (text)
- cross_reactivity (ARRAY)
- source_notes (text)
- entered_by (integer)
- temporal_conflict_resolution (text)
- last_updated_encounter (integer)

**Columns in schema but NOT in database:**
- patientId
- allergyType
- onsetDate
- lastReactionDate
- verificationStatus
- drugClass
- crossReactivity
- sourceType
- sourceConfidence

Total columns in database: 32
Total columns in schema: 14

### Table: appointment_duration_history

**Columns in database but NOT in schema:**
- appointment_id (integer)
- predicted_duration (integer)
- actual_duration (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- appointmentId
- aiPredictedDuration
- providerScheduledDuration
- patientVisibleDuration
- actualDuration
- actualArrivalDelta
- factorsUsed

Total columns in database: 5
Total columns in schema: 8

### Table: appointment_resource_requirements

**Columns in database but NOT in schema:**
- appointment_type_id (integer)
- resource_type (text)
- resource_id (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- appointmentTypeId
- requiresRoom
- roomType
- requiresEquipment
- requiresStaff

Total columns in database: 5
Total columns in schema: 6

### Table: appointment_types

**Columns in database but NOT in schema:**
- health_system_id (integer)
- name (character varying, NOT NULL)
- duration_minutes (integer, NOT NULL)
- color (character varying)
- description (text)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

**Columns in schema but NOT in database:**
- healthSystemId
- locationId
- typeName
- typeCode
- category
- defaultDuration
- minDuration
- maxDuration
- allowOnlineScheduling
- requiresPreAuth
- requiresSpecialPrep
- prepInstructions
- defaultResourceRequirements

Total columns in database: 9
Total columns in schema: 14

### Table: appointments

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- provider_id (integer, NOT NULL)
- location_id (integer, NOT NULL)
- appointment_type_id (integer)
- start_time (timestamp with time zone, NOT NULL)
- end_time (timestamp with time zone, NOT NULL)
- duration_minutes (integer, NOT NULL)
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

**Columns in schema but NOT in database:**
- patientId

Total columns in database: 21
Total columns in schema: 2

### Table: article_comments

**Columns in database but NOT in schema:**
- article_id (integer, NOT NULL)
- author_name (text, NOT NULL)
- author_email (text, NOT NULL)
- content (text, NOT NULL)
- is_approved (boolean)
- parent_id (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- articleId

Total columns in database: 8
Total columns in schema: 2

### Table: article_generation_queue

**Columns in database but NOT in schema:**
- target_audience (text, NOT NULL)
- competitor_mentions (ARRAY)
- research_sources (jsonb)
- generated_article_id (integer)
- created_at (timestamp without time zone)
- processed_at (timestamp without time zone)
- custom_prompt (text)

**Columns in schema but NOT in database:**
- targetAudience
- competitorMentions
- customPrompt
- researchSources
- generatedArticleId
- createdAt
- processedAt

Total columns in database: 13
Total columns in schema: 13

### Table: article_revisions

**Columns in database but NOT in schema:**
- article_id (integer, NOT NULL)
- content (text, NOT NULL)
- revision_note (text)
- revision_type (text)
- created_by (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- articleId

Total columns in database: 7
Total columns in schema: 2

### Table: articles

**Columns in database but NOT in schema:**
- author_name (text)
- featured_image (text)
- meta_title (text)
- meta_description (text)
- target_audience (text)
- reading_time (integer)
- view_count (integer)
- published_at (timestamp without time zone)
- scheduled_for (timestamp without time zone)
- generated_at (timestamp without time zone)
- reviewed_at (timestamp without time zone)
- reviewed_by (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- authorName
- featuredImage
- metaTitle
- metaDescription
- targetAudience
- readingTime
- viewCount
- publishedAt
- scheduledFor
- generatedAt
- reviewedAt
- reviewedBy
- createdAt
- updatedAt

Total columns in database: 22
Total columns in schema: 22

### Table: asymmetric_scheduling_config

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
- weekday_schedule (jsonb)
- custom_rules (jsonb)
- effective_date (date)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- providerId
- locationId
- healthSystemId
- enabled
- patientMinDuration
- providerMinDuration
- roundingInterval
- defaultBufferMinutes
- bufferForChronicPatients
- bufferThresholdProblemCount
- createdAt
- createdBy

Total columns in database: 6
Total columns in schema: 13

### Table: attachment_extracted_content

**Columns in database but NOT in schema:**
- attachment_id (integer, NOT NULL)
- page_number (integer)
- content_type (text, NOT NULL)
- extracted_text (text)
- structured_data (jsonb)
- confidence_score (numeric)
- extraction_method (text)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- attachmentId
- extractedText
- aiGeneratedTitle
- documentType
- processingStatus
- errorMessage
- processedAt
- createdAt

Total columns in database: 9
Total columns in schema: 9

### Table: authentication_logs

**Columns in database but NOT in schema:**
- user_id (integer)
- event_type (character varying, NOT NULL)
- ip_address (character varying)
- user_agent (text)
- error_message (text)
- created_at (timestamp with time zone)
- health_system_id (integer)
- failure_reason (text)

**Columns in schema but NOT in database:**
- userId
- healthSystemId
- eventType
- failureReason
- ipAddress
- userAgent
- deviceFingerprint
- geolocation

Total columns in database: 12
Total columns in schema: 12

### Table: clinic_admin_verifications

**Columns in database but NOT in schema:**
- organization_name (text, NOT NULL)
- applicant_first_name (text, NOT NULL)
- applicant_last_name (text, NOT NULL)
- applicant_email (text, NOT NULL)
- applicant_phone (text, NOT NULL)
- address_street (text, NOT NULL)
- address_city (text, NOT NULL)
- address_state (text, NOT NULL)
- address_zip (text, NOT NULL)
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

**Columns in schema but NOT in database:**
- email
- organizationName
- verificationCode
- verificationData
- status
- healthSystemId
- submittedAt
- approvedAt
- rejectedAt
- rejectionReason
- expiresAt
- approvedBy
- ipAddress
- userAgent

Total columns in database: 24
Total columns in schema: 15

### Table: data_modification_logs

**Columns in database but NOT in schema:**
- user_id (integer)
- table_name (text, NOT NULL)
- record_id (integer, NOT NULL)
- action (text, NOT NULL)
- old_values (jsonb)
- new_values (jsonb)
- reason (text)
- ip_address (text)
- user_agent (text)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId
- userName
- userRole
- healthSystemId
- tableName
- recordId
- patientId
- operation
- fieldName
- oldValue
- newValue
- changeReason
- encounterId
- orderAuthority
- validated
- validatedBy
- validatedAt
- modifiedAt

Total columns in database: 11
Total columns in schema: 19

### Table: diagnoses

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer, NOT NULL)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
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

**Columns in schema but NOT in database:**
- patientId
- encounterId
- createdAt
- updatedAt

Total columns in database: 31
Total columns in schema: 14

### Table: document_processing_queue

**Columns in database but NOT in schema:**
- attachment_id (integer, NOT NULL)
- priority (integer)
- processor_type (text, NOT NULL)
- processing_metadata (jsonb)
- error_message (text)
- retry_count (integer)
- started_at (timestamp without time zone)
- completed_at (timestamp without time zone)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- attachmentId
- attempts
- lastAttempt
- createdAt

Total columns in database: 11
Total columns in schema: 6

### Table: email_notifications

**Columns in database but NOT in schema:**
- recipient_email (text, NOT NULL)
- subject (text, NOT NULL)
- body_html (text)
- body_text (text)
- notification_type (text, NOT NULL)
- related_user_id (integer)
- related_entity_type (text)
- related_entity_id (integer)
- status (text)
- sent_at (timestamp without time zone)
- error_message (text)
- retry_count (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId
- healthSystemId
- notificationType

Total columns in database: 14
Total columns in schema: 4

### Table: emergency_access_logs

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- patient_id (integer, NOT NULL)
- access_reason (text, NOT NULL)
- emergency_type (text)
- override_restrictions (jsonb)
- supervisor_approval (integer)
- access_duration (integer)
- ip_address (text)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId
- userName
- userRole
- healthSystemId
- patientId
- patientName
- emergencyType
- justification
- authorizingPhysician
- accessStartTime
- accessEndTime
- accessedResources

Total columns in database: 10
Total columns in schema: 13

### Table: encounters

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- provider_id (integer, NOT NULL)
- encounter_date (timestamp without time zone)
- encounter_type (character varying)
- visit_reason (text)
- status (character varying)
- location (character varying)
- insurance_verified (boolean)
- copay_collected (numeric)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- encounter_subtype (text)
- encounter_status (text)
- end_time (timestamp without time zone)
- location_id (integer)
- chief_complaint (text)
- ai_scribe_mode (text)
- ai_suggestions (jsonb)
- signed_by (integer)
- signed_at (timestamp without time zone)
- is_signed (boolean)
- appointment_id (integer)
- start_time (timestamp without time zone)
- nurse_assessment (text)
- nurse_interventions (text)
- nurse_notes (text)
- transcription_id (text)
- assistant_thread_id (text)
- voice_recording_url (text)
- alerts (jsonb)
- transcription_raw (text)
- transcription_processed (text)
- draft_orders (jsonb)
- draft_diagnoses (jsonb)
- cpt_codes (jsonb)
- signature_id (character varying)
- last_chart_update (timestamp without time zone)
- chart_update_duration (integer)

**Columns in schema but NOT in database:**
- patientId
- providerId
- encounterType
- encounterSubtype
- startTime
- endTime
- encounterStatus
- chiefComplaint
- nurseAssessment
- nurseInterventions
- nurseNotes
- transcriptionRaw
- transcriptionProcessed
- aiSuggestions

Total columns in database: 41
Total columns in schema: 16

### Table: external_labs

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- lab_name (text, NOT NULL)
- test_name (text, NOT NULL)
- test_date (date)
- result_value (text)
- unit (text)
- reference_range (text)
- abnormal_flag (text)
- ordering_provider (text)
- status (text)
- attachment_id (integer)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- labName
- labIdentifier
- integrationType
- apiEndpoint
- hl7Endpoint
- apiKeyEncrypted
- usernameEncrypted
- sslCertificatePath
- supportedTests
- turnaroundTimes
- active
- createdAt

Total columns in database: 13
Total columns in schema: 13

### Table: family_history

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- relationship (text, NOT NULL)
- condition (text, NOT NULL)
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
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- familyMember
- medicalHistory
- lastUpdatedEncounter
- visitHistory

Total columns in database: 20
Total columns in schema: 6

### Table: gpt_lab_review_notes

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- lab_order_id (integer)
- review_type (text, NOT NULL)
- ai_interpretation (text)
- clinical_significance (text)
- follow_up_recommendations (text)
- risk_assessment (jsonb)
- reviewed_by (integer)
- review_status (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- resultIds
- clinicalReview
- patientMessage
- nurseMessage
- patientContext

Total columns in database: 12
Total columns in schema: 8

### Table: health_systems

**Columns in database but NOT in schema:**
- type (character varying)
- subscription_tier (integer)
- subscription_status (character varying)
- subscription_key (character varying)
- is_migration (boolean)
- stripe_customer_id (character varying)
- metadata (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- short_name (text)
- system_type (text)
- subscription_start_date (timestamp without time zone)
- subscription_end_date (timestamp without time zone)
- merged_into_health_system_id (integer)
- merged_date (timestamp without time zone)
- original_provider_id (integer)
- primary_contact (text)
- tax_id (text)
- logo_url (text)
- brand_colors (jsonb)
- subscription_limits (jsonb)
- active_user_count (jsonb)
- billing_details (jsonb)
- active (boolean)
- status (text)

**Columns in schema but NOT in database:**
- shortName
- systemType
- subscriptionTier
- subscriptionStatus
- subscriptionStartDate
- subscriptionEndDate
- mergedIntoHealthSystemId
- mergedDate
- originalProviderId
- primaryContact
- taxId
- logoUrl
- brandColors

Total columns in database: 31
Total columns in schema: 19

### Table: imaging_orders

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- provider_id (integer, NOT NULL)
- imaging_type (text, NOT NULL)
- body_part (text)
- indication (text)
- clinical_history (text)
- priority (text)
- status (text)
- facility_id (integer)
- scheduled_date (timestamp without time zone)
- completed_date (timestamp without time zone)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- studyType
- bodyPart
- contrastNeeded
- clinicalIndication
- clinicalHistory
- relevantSymptoms
- orderedBy
- orderedAt
- externalFacilityId
- externalOrderId
- dicomAccessionNumber
- orderStatus
- scheduledAt
- completedAt
- prepInstructions
- schedulingNotes
- createdAt
- updatedAt

Total columns in database: 15
Total columns in schema: 22

### Table: imaging_results

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- imaging_order_id (integer)
- study_type (text, NOT NULL)
- body_part (text, NOT NULL)
- study_date (timestamp without time zone)
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
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- imagingOrderId
- patientId
- studyDate
- bodyPart
- laterality
- clinicalSummary
- radiologistName
- facilityName
- attachmentId
- dicomStudyId
- dicomSeriesId
- imageFilePaths
- resultStatus
- reviewedBy
- reviewedAt
- providerNotes
- needsReview
- sourceType
- sourceConfidence

Total columns in database: 56
Total columns in schema: 23

### Table: lab_orders

**Columns in database but NOT in schema:**
- order_id (integer)
- external_order_id (text)
- transmitted_at (timestamp without time zone)
- acknowledged_at (timestamp without time zone)
- result_received_at (timestamp without time zone)
- status (text)
- transmission_response (jsonb)
- result_data (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- patient_id (integer)
- encounter_id (integer)
- order_set_id (text)
- loinc_code (text)
- provider_id (integer)
- test_name (text)
- cpt_code (text)
- test_code (text)
- test_category (text)
- clinical_indication (text)
- icd10_codes (ARRAY)
- ordered_by (integer)
- ordered_at (timestamp without time zone)
- target_lab_id (text)
- hl7_message_id (text)
- requisition_number (text)
- order_status (text)
- collected_at (timestamp without time zone)
- specimen_type (text)
- specimen_volume (text)
- specimen_source (text)
- fasting_required (boolean)
- special_instructions (text)
- container_type (text)
- collection_site (text)
- collected_by (integer)
- external_lab (text)
- result_status (text)
- collection_instructions (text)
- reference_range (text)
- expected_turnaround (text)
- external_status (text)
- results (jsonb)
- abnormal_flags (ARRAY)
- fasting_hours (integer)
- discontinued_at (timestamp without time zone)
- discontinued_by (integer)
- discontinued_reason (text)
- critical_values (ARRAY)
- stat_order (boolean)
- timing_instructions (text)
- provider_notes (text)
- patient_preparation (text)
- collection_priority (text)
- processing_notes (text)
- billing_code (text)
- insurance_preauth (text)
- insurance_preauth_date (timestamp without time zone)
- estimated_cost (numeric)
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

**Columns in schema but NOT in database:**
- patientId
- encounterId
- orderSetId
- loincCode
- cptCode
- testCode
- testName
- testCategory
- clinicalIndication
- icd10Codes
- orderedBy
- orderedAt
- targetLabId
- externalOrderId
- hl7MessageId
- requisitionNumber
- orderStatus
- transmittedAt
- acknowledgedAt
- collectedAt
- specimenType
- specimenVolume
- containerType
- collectionInstructions
- fastingRequired
- fastingHours
- timingInstructions
- insurancePreauth
- estimatedCost

Total columns in database: 94
Total columns in schema: 31

### Table: lab_reference_ranges

**Columns in database but NOT in schema:**
- test_code (text, NOT NULL)
- test_name (text, NOT NULL)
- age_min (integer)
- age_max (integer)
- reference_low (numeric)
- reference_high (numeric)
- critical_low (numeric)
- critical_high (numeric)
- unit (text)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- loincCode
- testName
- testCategory
- ageMin
- ageMax
- normalLow

Total columns in database: 14
Total columns in schema: 8

### Table: lab_results

**Columns in database but NOT in schema:**
- lab_order_id (integer)
- patient_id (integer, NOT NULL)
- loinc_code (text, NOT NULL)
- test_code (text, NOT NULL)
- test_name (text, NOT NULL)
- test_category (text)
- result_value (text)
- result_numeric (numeric)
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

**Columns in schema but NOT in database:**
- labOrderId
- patientId
- loincCode
- testCode
- testName
- testCategory
- resultValue
- resultNumeric

Total columns in database: 50
Total columns in schema: 9

### Table: locations

**Columns in database but NOT in schema:**
- zip (character varying)
- health_system_id (integer)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- zip_code (text)
- location_type (text)
- organization_id (integer)
- short_name (text)
- services (jsonb)
- facility_code (text)
- has_lab (boolean)
- has_imaging (boolean)
- has_pharmacy (boolean)

**Columns in schema but NOT in database:**
- organizationId
- healthSystemId
- shortName
- locationType
- zipCode
- fax
- email
- facilityCode
- operatingHours

Total columns in database: 20
Total columns in schema: 16

### Table: magic_links

**Columns in database but NOT in schema:**
- expires_at (timestamp without time zone, NOT NULL)
- used (boolean)
- used_at (timestamp without time zone)
- ip_address (text)
- user_agent (text)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId
- purpose
- expiresAt
- usedAt
- ipAddress
- userAgent
- createdAt

Total columns in database: 9
Total columns in schema: 10

### Table: medical_history

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- condition (text, NOT NULL)
- onset_date (date)
- resolution_date (date)
- status (text)
- severity (text)
- notes (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- conditionCategory
- historyText
- lastUpdatedEncounter
- sourceType
- sourceConfidence

Total columns in database: 10
Total columns in schema: 7

### Table: medical_problems

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- problem_title (text, NOT NULL)
- icd10_code (text)
- snomed_code (text)
- problem_status (text)
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
- current_icd10_code (text)
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

**Columns in schema but NOT in database:**
- patientId
- problemTitle
- currentIcd10Code
- problemStatus
- firstDiagnosedDate
- firstEncounterId

Total columns in database: 62
Total columns in schema: 7

### Table: medication_formulary

**Columns in database but NOT in schema:**
- medication_name (text, NOT NULL)
- generic_name (text)
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

**Columns in schema but NOT in database:**
- genericName
- brandNames
- commonNames
- standardStrengths
- availableForms
- formRoutes

Total columns in database: 14
Total columns in schema: 7

### Table: medications

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- medication_name (text, NOT NULL)
- generic_name (text)
- brand_name (text)
- form (text)
- start_date (date)
- end_date (date)
- discontinuation_date (date)
- discontinuation_reason (text)
- prescribed_by (integer)
- prescribed_date (timestamp without time zone)
- pharmacy (text)
- prescriber_notes (text)
- patient_instructions (text)
- ndc_code (text)
- rxnorm_code (text)
- days_supply (integer)
- quantity_unit (text)
- refills (integer)
- refills_remaining (integer)
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
- dosage_form (text)
- total_refills (integer)
- surescripts_id (text)
- clinical_indication (text)
- source_order_id (integer)
- problem_mappings (jsonb)
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
- discontinued_date (date)
- prescriber_id (integer)
- first_encounter_id (integer)
- last_updated_encounter_id (integer)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- medicationName
- brandName
- genericName
- dosageForm
- quantityUnit
- daysSupply
- refillsRemaining
- totalRefills
- rxNormCode
- ndcCode
- sureScriptsId
- clinicalIndication
- sourceOrderId
- problemMappings
- startDate
- endDate
- discontinuedDate
- prescriberId
- firstEncounterId

Total columns in database: 71
Total columns in schema: 30

### Table: newsletter_subscribers

**Columns in database but NOT in schema:**
- subscribed_at (timestamp without time zone)
- unsubscribed_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- subscribedAt
- unsubscribedAt

Total columns in database: 7
Total columns in schema: 7

### Table: orders

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer, NOT NULL)
- provider_id (integer, NOT NULL)
- order_type (character varying, NOT NULL)
- order_date (timestamp without time zone)
- status (character varying)
- medication_name (character varying)
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
- clinical_indication (text)
- diagnosis_codes (ARRAY)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- order_status (character varying)
- reference_id (text)
- provider_notes (text)
- prescriber (text)
- prescriber_id (integer)
- ordered_by (integer)
- test_name (text)
- test_code (text)
- study_type (text)
- body_part (text)
- lab_name (text)
- ndc_code (text)
- route (text)
- frequency (text)
- duration (text)
- start_date (timestamp without time zone)
- end_date (timestamp without time zone)
- route_of_administration (text)
- indication (text)
- imaging_order_id (integer)
- external_order_id (text)
- days_supply (integer)
- diagnosis_code (text)
- requires_prior_auth (boolean)
- prior_auth_number (text)
- specimen_type (text)
- fasting_required (boolean)
- contrast_needed (boolean)
- specialty_type (text)
- provider_name (text)
- ordered_at (timestamp without time zone)
- approved_by (integer)
- approved_at (timestamp without time zone)
- quantity_unit (text)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- orderType
- orderStatus
- referenceId
- providerNotes
- clinicalIndication
- medicationName
- quantityUnit
- routeOfAdministration
- daysSupply
- diagnosisCode
- requiresPriorAuth
- priorAuthNumber
- labName
- testName
- testCode
- specimenType
- fastingRequired
- studyType
- contrastNeeded
- specialtyType
- providerName
- orderedBy
- orderedAt
- approvedBy
- approvedAt
- createdAt
- updatedAt

Total columns in database: 68
Total columns in schema: 39

### Table: organization_documents

**Columns in database but NOT in schema:**
- organization_id (integer)
- health_system_id (integer, NOT NULL)
- document_type (text, NOT NULL)
- document_name (text, NOT NULL)
- file_path (text)
- file_size (integer)
- mime_type (text)
- uploaded_by (integer)
- active (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- healthSystemId
- documentType
- documentUrl
- documentName
- uploadedAt
- uploadedBy
- verifiedAt
- verifiedBy
- expiresAt

Total columns in database: 12
Total columns in schema: 11

### Table: organizations

**Columns in database but NOT in schema:**
- type (character varying)
- zip_code (character varying)
- website (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- health_system_id (integer)
- short_name (text)
- organization_type (text, NOT NULL)
- tax_id (text)

**Columns in schema but NOT in database:**
- healthSystemId
- shortName
- organizationType
- zipCode
- taxId
- createdAt

Total columns in database: 19
Total columns in schema: 16

### Table: patient_attachments

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- filename (text, NOT NULL)
- original_filename (text)
- file_type (text)
- file_size (integer)
- mime_type (text)
- upload_date (timestamp without time zone)
- uploaded_by (integer)
- document_type (text)
- document_date (date)
- thumbnail_path (text)
- ocr_text (text)
- ocr_completed (boolean)
- ocr_completed_at (timestamp without time zone)
- processing_status (text)
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
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- fileName
- originalFileName
- fileSize
- mimeType
- fileExtension
- filePath
- thumbnailPath
- category
- title
- uploadedBy
- isConfidential
- accessLevel
- contentHash
- processingStatus
- virusScanStatus
- createdAt
- updatedAt

Total columns in database: 34
Total columns in schema: 22

### Table: patient_order_preferences

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- provider_id (integer, NOT NULL)
- order_type (text, NOT NULL)
- preferences (jsonb)
- standing_orders (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- labDeliveryMethod
- labServiceProvider
- imagingDeliveryMethod
- imagingServiceProvider
- medicationDeliveryMethod
- preferredPharmacy
- pharmacyPhone
- pharmacyFax
- createdAt
- updatedAt
- lastUpdatedBy

Total columns in database: 8
Total columns in schema: 13

### Table: patient_physical_findings

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- body_system (text, NOT NULL)
- finding (text, NOT NULL)
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

**Columns in schema but NOT in database:**
- patientId
- examSystem
- examComponent
- findingText
- findingType
- confidence

Total columns in database: 18
Total columns in schema: 7

### Table: patient_scheduling_patterns

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- provider_id (integer, NOT NULL)
- pattern_type (text, NOT NULL)
- frequency (jsonb)
- time_preferences (jsonb)
- seasonal_variations (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- avgVisitDuration

Total columns in database: 9
Total columns in schema: 3

### Table: patients

**Columns in database but NOT in schema:**
- external_id (character varying)
- first_name (character varying, NOT NULL)
- last_name (character varying, NOT NULL)
- middle_name (character varying)
- date_of_birth (date, NOT NULL)
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
- health_system_id (integer)
- contact_number (text)
- emergency_contact (jsonb)
- preferred_location_id (integer)
- primary_provider_id (integer)
- insurance_primary (text)
- insurance_secondary (text)
- policy_number (text)
- group_number (text)
- assistant_id (text)
- assistant_thread_id (text)
- last_chart_summary (text)
- chart_last_updated (timestamp without time zone)
- active_problems (jsonb)
- critical_alerts (jsonb)
- data_origin_type (text)
- original_facility_id (integer)
- created_by_provider_id (integer)
- creation_context (text)
- derivative_work_note (text)
- migration_consent (jsonb)
- profile_photo_filename (text)
- consent_given (boolean)

**Columns in schema but NOT in database:**
- healthSystemId
- firstName
- lastName
- dateOfBirth
- contactNumber
- emergencyContact
- preferredLocationId
- primaryProviderId
- insurancePrimary
- insuranceSecondary
- policyNumber
- groupNumber
- assistantId
- assistantThreadId
- lastChartSummary
- chartLastUpdated
- activeProblems
- criticalAlerts
- dataOriginType
- originalFacilityId
- createdByProviderId
- creationContext
- derivativeWorkNote
- migrationConsent

Total columns in database: 49
Total columns in schema: 29

### Table: phi_access_logs

**Columns in database but NOT in schema:**
- user_id (integer)
- patient_id (integer)
- resource_type (text)
- resource_id (integer)
- ip_address (text)
- user_agent (text)
- created_at (timestamp without time zone)
- user_name (text)
- user_role (text)
- health_system_id (integer)
- location_id (integer)
- patient_name (text)
- access_method (text)
- http_method (text)
- api_endpoint (text)
- session_id (text)
- error_message (text)
- response_time (integer)
- access_reason (text)
- emergency_access (boolean)
- break_glass_reason (text)
- accessed_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId
- userName
- userRole
- healthSystemId
- locationId
- patientId
- patientName
- resourceType
- resourceId
- accessMethod
- httpMethod
- apiEndpoint
- ipAddress
- userAgent
- sessionId
- errorMessage
- responseTime
- accessReason
- emergencyAccess
- breakGlassReason
- accessedAt

Total columns in database: 25
Total columns in schema: 24

### Table: problem_rank_overrides

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- patient_id (integer, NOT NULL)
- problem_id (integer, NOT NULL)
- custom_rank (integer, NOT NULL)
- reason (text)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- problemId

Total columns in database: 8
Total columns in schema: 2

### Table: provider_schedules

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
- location_id (integer)
- day_of_week (text, NOT NULL)
- start_time (time without time zone, NOT NULL)
- end_time (time without time zone, NOT NULL)
- break_start (time without time zone)
- break_end (time without time zone)
- effective_from (date)
- effective_to (date)
- schedule_type (text)
- max_appointments (integer)
- active (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- providerId

Total columns in database: 14
Total columns in schema: 2

### Table: provider_scheduling_patterns

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
- pattern_type (text, NOT NULL)
- preferences (jsonb)
- constraints (jsonb)
- historical_data (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- providerId
- locationId
- avgVisitDuration

Total columns in database: 8
Total columns in schema: 4

### Table: realtime_schedule_status

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
- date (date, NOT NULL)
- time_slot (time without time zone, NOT NULL)
- status (text, NOT NULL)
- appointment_id (integer)
- buffer_status (text)
- efficiency_score (numeric)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- providerId
- locationId
- scheduleDate
- currentPatientId
- currentAppointmentId
- runningBehindMinutes
- lastUpdateTime
- dayStartedAt
- estimatedCatchUpTime
- aiRecommendations

Total columns in database: 9
Total columns in schema: 11

### Table: resource_bookings

**Columns in database but NOT in schema:**
- resource_id (integer, NOT NULL)
- appointment_id (integer)
- start_time (timestamp without time zone, NOT NULL)
- end_time (timestamp without time zone, NOT NULL)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- resourceId
- appointmentId
- bookingDate
- startTime
- endTime
- createdAt
- createdBy

Total columns in database: 7
Total columns in schema: 9

### Table: schedule_exceptions

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
- exception_date (date, NOT NULL)
- exception_type (text, NOT NULL)
- start_time (time without time zone)
- end_time (time without time zone)
- reason (text)
- affects_scheduling (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- providerId

Total columns in database: 9
Total columns in schema: 2

### Table: schedule_preferences

**Columns in database but NOT in schema:**
- provider_id (integer, NOT NULL)
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

**Columns in schema but NOT in database:**
- providerId
- useAiScheduling
- aiAggressiveness

Total columns in database: 15
Total columns in schema: 4

### Table: scheduling_ai_factors

**Columns in database but NOT in schema:**
- category (character varying, NOT NULL)
- factor_name (character varying, NOT NULL)
- description (text)
- data_type (character varying, NOT NULL)
- is_enabled (boolean)
- default_weight (numeric)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

**Columns in schema but NOT in database:**
- factorCategory
- factorName
- factorDescription
- dataType
- defaultEnabled
- defaultWeight

Total columns in database: 9
Total columns in schema: 7

### Table: scheduling_ai_weights

**Columns in database but NOT in schema:**
- provider_id (integer)
- location_id (integer)
- health_system_id (integer)
- created_by (integer, NOT NULL)
- factor_name (character varying, NOT NULL)
- is_active (boolean)
- custom_parameters (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

**Columns in schema but NOT in database:**
- factorId
- providerId
- locationId
- healthSystemId
- enabled

Total columns in database: 11
Total columns in schema: 7

### Table: scheduling_resources

**Columns in database but NOT in schema:**
- name (text, NOT NULL)
- resource_type (text, NOT NULL)
- location_id (integer)
- available_hours (jsonb)
- requires_cleaning (boolean)
- cleaning_duration (integer)
- active (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- locationId
- resourceType
- resourceName
- resourceCode
- capabilities
- requiresCleaningMinutes
- maintenanceSchedule

Total columns in database: 10
Total columns in schema: 9

### Table: scheduling_rules

**Columns in database but NOT in schema:**
- name (text, NOT NULL)
- rule_type (text, NOT NULL)
- applies_to (text, NOT NULL)
- provider_id (integer)
- location_id (integer)
- conditions (jsonb, NOT NULL)
- actions (jsonb, NOT NULL)
- priority (integer)
- active (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- ruleName
- ruleType
- providerId
- locationId
- healthSystemId
- ruleConfig

Total columns in database: 11
Total columns in schema: 7

### Table: scheduling_templates

**Columns in database but NOT in schema:**
- provider_id (integer)
- template_type (text, NOT NULL)
- day_configuration (jsonb, NOT NULL)
- appointment_types (jsonb)
- buffer_rules (jsonb)
- break_configuration (jsonb)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- description
- providerId
- locationId
- healthSystemId
- slotDuration
- startTime
- endTime
- lunchStart
- lunchDuration
- bufferBetweenAppts
- allowDoubleBooking
- maxPatientsPerDay
- daysOfWeek
- isDefault
- createdAt
- createdBy

Total columns in database: 10
Total columns in schema: 19

### Table: signatures

**Columns in database but NOT in schema:**
- encounter_id (integer, NOT NULL)
- signed_by (integer, NOT NULL)
- signature_type (text, NOT NULL)
- signed_at (timestamp without time zone)
- signature_data (text)
- ip_address (text)
- attestation_text (text)

**Columns in schema but NOT in database:**
- userId
- signatureData
- signedAt

Total columns in database: 8
Total columns in schema: 4

### Table: signed_orders

**Columns in database but NOT in schema:**
- order_id (integer, NOT NULL)
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- order_type (character varying, NOT NULL)
- delivery_method (character varying, NOT NULL)
- delivery_status (character varying, NOT NULL)
- delivery_attempts (integer, NOT NULL)
- last_delivery_attempt (timestamp without time zone)
- delivery_error (text)
- can_change_delivery (boolean, NOT NULL)
- delivery_lock_reason (character varying)
- original_delivery_method (character varying, NOT NULL)
- delivery_changes (jsonb)
- signed_at (timestamp without time zone, NOT NULL)
- signed_by (integer, NOT NULL)
- created_at (timestamp without time zone, NOT NULL)
- updated_at (timestamp without time zone, NOT NULL)

**Columns in schema but NOT in database:**
- orderId
- patientId
- encounterId
- orderType

Total columns in database: 18
Total columns in schema: 5

### Table: social_history

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- details (text, NOT NULL)
- status (text)
- start_date (date)
- end_date (date)
- quantity (text)
- frequency (text)
- notes (text)
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- risk_level (text)
- counseling_provided (boolean)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- patientId
- currentStatus
- historyNotes
- lastUpdatedEncounter
- sourceType
- sourceConfidence

Total columns in database: 21
Total columns in schema: 8

### Table: subscription_history

**Columns in database but NOT in schema:**
- health_system_id (integer, NOT NULL)
- change_type (text, NOT NULL)
- previous_tier (integer)
- new_tier (integer)
- previous_status (text)
- new_status (text)
- changed_by (integer)
- reason (text)
- billing_impact (jsonb)
- effective_date (timestamp without time zone)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- healthSystemId
- previousTier
- newTier
- changeType
- changedAt
- gracePeriodEnds
- dataExpiresAt
- metadata

Total columns in database: 12
Total columns in schema: 9

### Table: subscription_keys

**Columns in database but NOT in schema:**
- health_system_id (integer, NOT NULL)
- key_value (text, NOT NULL)
- key_type (text, NOT NULL)
- created_by (integer, NOT NULL)
- assigned_to (integer)
- assigned_at (timestamp without time zone)
- expires_at (timestamp without time zone)
- status (text)
- usage_count (integer)
- last_used_at (timestamp without time zone)
- metadata (jsonb)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- key

Total columns in database: 13
Total columns in schema: 2

### Table: surgical_history

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- procedure_name (text, NOT NULL)
- procedure_date (date)
- surgeon (text)
- facility (text)
- findings (text)
- anesthesia_type (text)
- implants_used (text)
- pathology_results (text)
- recovery_notes (text)
- source_type (text)
- source_confidence (numeric)
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
- follow_up_required (boolean)
- follow_up_date (date)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- surgeon_name (text)
- facility_name (text)
- cpt_code (text)
- icd10_procedure_code (text)
- anatomical_site (text)
- urgency_level (text)
- length_of_stay (integer)
- blood_loss (text)
- transfusions_required (boolean)
- implants_hardware (text)
- recovery_status (text)
- last_updated_encounter (integer)

**Columns in schema but NOT in database:**
- patientId
- procedureName
- procedureDate
- surgeonName
- facilityName
- outcome
- anesthesiaType
- cptCode
- icd10ProcedureCode
- anatomicalSite
- urgencyLevel
- lengthOfStay
- bloodLoss
- transfusionsRequired
- implantsHardware
- followUpRequired
- recoveryStatus
- sourceType
- sourceConfidence

Total columns in database: 45
Total columns in schema: 23

### Table: template_shares

**Columns in database but NOT in schema:**
- template_id (integer, NOT NULL)
- shared_by (integer, NOT NULL)
- shared_with (integer, NOT NULL)
- status (text)
- shared_at (timestamp without time zone)
- responded_at (timestamp without time zone)
- share_message (text)
- can_modify (boolean)
- active (boolean)

**Columns in schema but NOT in database:**
- templateId

Total columns in database: 10
Total columns in schema: 2

### Table: template_versions

**Columns in database but NOT in schema:**
- template_id (integer, NOT NULL)
- version_number (integer, NOT NULL)
- change_description (text)
- changed_by (integer, NOT NULL)
- example_note_snapshot (text, NOT NULL)
- generated_prompt_snapshot (text, NOT NULL)
- change_type (text)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- templateId

Total columns in database: 9
Total columns in schema: 2

### Table: user_assistant_threads

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- assistant_type (text, NOT NULL)
- thread_id (text, NOT NULL)
- assistant_id (text)
- context (jsonb)
- last_message_at (timestamp without time zone)
- message_count (integer)
- active (boolean)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 10
Total columns in schema: 2

### Table: user_edit_patterns

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- note_type (text, NOT NULL)
- section_name (text, NOT NULL)
- edit_type (text, NOT NULL)
- original_text (text)
- edited_text (text)
- edit_frequency (integer)
- confidence_score (numeric)
- last_occurrence (timestamp without time zone)
- created_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 11
Total columns in schema: 2

### Table: user_locations

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- location_id (integer, NOT NULL)
- is_primary (boolean)
- permissions (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- role_at_location (text)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 8
Total columns in schema: 2

### Table: user_note_preferences

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
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

**Columns in schema but NOT in database:**
- userId

Total columns in database: 36
Total columns in schema: 2

### Table: user_note_templates

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- template_name (text, NOT NULL)
- base_note_type (text, NOT NULL)
- display_name (text, NOT NULL)
- is_personal (boolean)
- is_default (boolean)
- created_by (integer, NOT NULL)
- shared_by (integer)
- example_note (text, NOT NULL)
- base_note_text (text)
- inline_comments (jsonb)
- has_comments (boolean)
- generated_prompt (text, NOT NULL)
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

**Columns in schema but NOT in database:**
- userId

Total columns in database: 25
Total columns in schema: 2

### Table: user_problem_list_preferences

**Columns in database but NOT in schema:**
- id (integer, NOT NULL)
- user_id (integer, NOT NULL)
- show_resolved_problems (boolean)
- show_inactive_problems (boolean)
- sort_by (text)
- group_by_category (boolean)
- highlight_recent_changes (boolean)
- recent_change_days (integer)
- max_problems_displayed (integer)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 11
Total columns in schema: 1

### Table: user_session_locations

**Columns in database but NOT in schema:**
- user_id (integer, NOT NULL)
- location_id (integer, NOT NULL)
- session_id (character varying)
- is_primary (boolean)
- permissions (jsonb)
- remembered (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- is_active (boolean)
- remember_selection (boolean)
- selected_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 12
Total columns in schema: 2

### Table: users

**Columns in database but NOT in schema:**
- first_name (character varying)
- last_name (character varying)
- license_number (character varying)
- license_state (character varying)
- bio (text)
- is_active (boolean)
- last_login (timestamp without time zone)
- profile_image_url (character varying)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- health_system_id (integer)
- email_verified (boolean)
- email_verification_token (text)
- email_verification_expires (timestamp without time zone)
- mfa_enabled (boolean)
- mfa_secret (text)
- account_status (text)
- failed_login_attempts (integer)
- account_locked_until (timestamp without time zone)
- require_password_change (boolean)
- verification_status (text)
- verified_with_key_id (integer)
- verified_at (timestamp without time zone)

**Columns in schema but NOT in database:**
- healthSystemId
- firstName
- lastName
- licenseNumber
- emailVerified
- emailVerificationToken
- emailVerificationExpires
- mfaEnabled
- mfaSecret
- accountStatus
- lastLogin
- failedLoginAttempts
- accountLockedUntil
- requirePasswordChange
- verificationStatus
- verifiedWithKeyId
- verifiedAt
- createdAt

Total columns in database: 32
Total columns in schema: 27

### Table: vitals

**Columns in database but NOT in schema:**
- patient_id (integer, NOT NULL)
- encounter_id (integer)
- blood_pressure_systolic (integer)
- blood_pressure_diastolic (integer)
- heart_rate (integer)
- respiratory_rate (integer)
- oxygen_saturation (integer)
- recorded_at (timestamp without time zone)
- recorded_by (integer)
- pain_scale (integer)
- blood_glucose (integer)
- source_type (text)
- source_confidence (numeric)
- extracted_from_attachment_id (integer)
- extraction_notes (text)
- consolidation_reasoning (text)
- merged_ids (ARRAY)
- visit_history (jsonb)
- created_at (timestamp without time zone)
- updated_at (timestamp without time zone)
- entry_type (text)
- systolic (integer)
- diastolic (integer)
- systolic_bp (integer)
- diastolic_bp (integer)
- parsed_from_text (boolean)
- processing_notes (text)
- original_text (text)
- source_notes (text)
- entered_by (integer)

**Columns in schema but NOT in database:**
- patientId
- encounterId
- recordedAt
- recordedBy
- entryType
- systolicBp
- diastolicBp
- heartRate
- oxygenSaturation
- respiratoryRate
- painScale
- parsedFromText
- originalText
- sourceType
- sourceConfidence

Total columns in database: 37
Total columns in schema: 22

### Table: webauthn_credentials

**Columns in database but NOT in schema:**
- user_id (integer)
- credential_id (text, NOT NULL)
- public_key (text, NOT NULL)
- counter (bigint)
- device_type (text)
- transports (ARRAY)
- created_at (timestamp without time zone)
- last_used_at (timestamp without time zone)
- registered_device (text)
- device_name (text)

**Columns in schema but NOT in database:**
- userId

Total columns in database: 11
Total columns in schema: 2

## Final Statistics
- Tables analyzed: 75
- Tables with column mismatches: 75
- Total extra columns in database: 1303
- Total missing columns in database: 619