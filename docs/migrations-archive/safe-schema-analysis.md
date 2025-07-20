# Safe Schema Analysis Report
Generated on: 7/17/2025

## Extra Tables in Database

### Table: dashboards
- Row count: 0
- ⚠️  **CONTAINS DATA** - DO NOT REMOVE

### Table: migration_invitations
- Row count: 0
- ⚠️  **CONTAINS DATA** - DO NOT REMOVE

### Table: session
- Row count: 1
- ⚠️  **CONTAINS DATA** - DO NOT REMOVE

## Column Analysis for Each Table

### Table: admin_prompt_reviews
#### Extra columns in database:
- prompt_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "promptId" to schema.ts instead of removing from DB
- reviewer_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewerId" to schema.ts instead of removing from DB
- feedback (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "feedback" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- templateId → template_id (SAFE TO ADD)
- originalPrompt → original_prompt (SAFE TO ADD)
- reviewedPrompt → reviewed_prompt (SAFE TO ADD)
- adminUserId → admin_user_id (SAFE TO ADD)
- reviewNotes → review_notes (SAFE TO ADD)
- isActive → is_active (SAFE TO ADD)
- performanceMetrics → performance_metrics (SAFE TO ADD)
- reviewedAt → reviewed_at (SAFE TO ADD)

### Table: allergies
#### Extra columns in database:
- encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "encounterId" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- verified_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verifiedBy" to schema.ts instead of removing from DB
- verified_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verifiedAt" to schema.ts instead of removing from DB
- source_timestamp (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceTimestamp" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- reaction_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reactionType" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- last_reaction (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastReaction" to schema.ts instead of removing from DB
- source_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceNotes" to schema.ts instead of removing from DB
- entered_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "enteredBy" to schema.ts instead of removing from DB
- temporal_conflict_resolution (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "temporalConflictResolution" to schema.ts instead of removing from DB
- last_updated_encounter (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUpdatedEncounter" to schema.ts instead of removing from DB

### Table: appointment_duration_history
#### Extra columns in database:
- predicted_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "predictedDuration" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- aiPredictedDuration → ai_predicted_duration (SAFE TO ADD)
- providerScheduledDuration → provider_scheduled_duration (SAFE TO ADD)
- patientVisibleDuration → patient_visible_duration (SAFE TO ADD)
- actualArrivalDelta → actual_arrival_delta (SAFE TO ADD)
- factorsUsed → factors_used (SAFE TO ADD)

### Table: appointment_resource_requirements
#### Extra columns in database:
- resource_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resourceType" to schema.ts instead of removing from DB
- resource_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resourceId" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- requiresRoom → requires_room (SAFE TO ADD)
- roomType → room_type (SAFE TO ADD)
- requiresEquipment → requires_equipment (SAFE TO ADD)
- requiresStaff → requires_staff (SAFE TO ADD)

### Table: appointment_types
#### Extra columns in database:
- name (character varying) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "name" to schema.ts instead of removing from DB
- duration_minutes (integer) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "durationMinutes" to schema.ts instead of removing from DB
- color (character varying) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "color" to schema.ts instead of removing from DB
- description (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "description" to schema.ts instead of removing from DB
- is_active (boolean) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "isActive" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 4 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- locationId → location_id (SAFE TO ADD)
- typeName → type_name (SAFE TO ADD)
- typeCode → type_code (SAFE TO ADD)
- category → category (SAFE TO ADD)
- defaultDuration → default_duration (SAFE TO ADD)
- minDuration → min_duration (SAFE TO ADD)
- maxDuration → max_duration (SAFE TO ADD)
- allowOnlineScheduling → allow_online_scheduling (SAFE TO ADD)
- requiresPreAuth → requires_pre_auth (SAFE TO ADD)
- requiresSpecialPrep → requires_special_prep (SAFE TO ADD)
- prepInstructions → prep_instructions (SAFE TO ADD)
- defaultResourceRequirements → default_resource_requirements (SAFE TO ADD)

### Table: appointments
#### Extra columns in database:
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- location_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "locationId" to schema.ts instead of removing from DB
- appointment_type_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appointmentTypeId" to schema.ts instead of removing from DB
- start_time (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startTime" to schema.ts instead of removing from DB
- end_time (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "endTime" to schema.ts instead of removing from DB
- duration_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "durationMinutes" to schema.ts instead of removing from DB
- ai_predicted_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "aiPredictedDuration" to schema.ts instead of removing from DB
- status (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- chief_complaint (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "chiefComplaint" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- checked_in_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "checkedInAt" to schema.ts instead of removing from DB
- checked_in_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "checkedInBy" to schema.ts instead of removing from DB
- completed_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "completedAt" to schema.ts instead of removing from DB
- completed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "completedBy" to schema.ts instead of removing from DB
- cancelled_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "cancelledAt" to schema.ts instead of removing from DB
- cancelled_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "cancelledBy" to schema.ts instead of removing from DB
- cancellation_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "cancellationReason" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: article_comments
#### Extra columns in database:
- author_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "authorName" to schema.ts instead of removing from DB
- author_email (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "authorEmail" to schema.ts instead of removing from DB
- content (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "content" to schema.ts instead of removing from DB
- is_approved (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isApproved" to schema.ts instead of removing from DB
- parent_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "parentId" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: article_revisions
#### Extra columns in database:
- content (text) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "content" to schema.ts instead of removing from DB
- revision_note (text) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "revisionNote" to schema.ts instead of removing from DB
- revision_type (text) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "revisionType" to schema.ts instead of removing from DB
- created_by (integer) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "createdBy" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: asymmetric_scheduling_config
#### Extra columns in database:
- weekday_schedule (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "weekdaySchedule" to schema.ts instead of removing from DB
- custom_rules (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "customRules" to schema.ts instead of removing from DB
- effective_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "effectiveDate" to schema.ts instead of removing from DB
#### Missing columns in database:
- locationId → location_id (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- enabled → enabled (SAFE TO ADD)
- patientMinDuration → patient_min_duration (SAFE TO ADD)
- providerMinDuration → provider_min_duration (SAFE TO ADD)
- roundingInterval → rounding_interval (SAFE TO ADD)
- defaultBufferMinutes → default_buffer_minutes (SAFE TO ADD)
- bufferForChronicPatients → buffer_for_chronic_patients (SAFE TO ADD)
- bufferThresholdProblemCount → buffer_threshold_problem_count (SAFE TO ADD)
- createdBy → created_by (SAFE TO ADD)

### Table: attachment_extracted_content
#### Extra columns in database:
- page_number (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "pageNumber" to schema.ts instead of removing from DB
- content_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "contentType" to schema.ts instead of removing from DB
- structured_data (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "structuredData" to schema.ts instead of removing from DB
- confidence_score (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "confidenceScore" to schema.ts instead of removing from DB
- extraction_method (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionMethod" to schema.ts instead of removing from DB
#### Missing columns in database:
- aiGeneratedTitle → ai_generated_title (SAFE TO ADD)
- documentType → document_type (SAFE TO ADD)
- processingStatus → processing_status (SAFE TO ADD)
- errorMessage → error_message (SAFE TO ADD)
- processedAt → processed_at (SAFE TO ADD)

### Table: authentication_logs
#### Extra columns in database:
- error_message (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "errorMessage" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- deviceFingerprint → device_fingerprint (SAFE TO ADD)
- geolocation → geolocation (SAFE TO ADD)

### Table: clinic_admin_verifications
#### Extra columns in database:
- applicant_first_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "applicantFirstName" to schema.ts instead of removing from DB
- applicant_last_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "applicantLastName" to schema.ts instead of removing from DB
- applicant_email (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "applicantEmail" to schema.ts instead of removing from DB
- applicant_phone (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "applicantPhone" to schema.ts instead of removing from DB
- address_street (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addressStreet" to schema.ts instead of removing from DB
- address_city (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addressCity" to schema.ts instead of removing from DB
- address_state (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addressState" to schema.ts instead of removing from DB
- address_zip (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addressZip" to schema.ts instead of removing from DB
- website (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "website" to schema.ts instead of removing from DB
- preferred_ehr_tier (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferredEhrTier" to schema.ts instead of removing from DB
- verification_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationStatus" to schema.ts instead of removing from DB
- verification_score (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationScore" to schema.ts instead of removing from DB
- verification_details (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationDetails" to schema.ts instead of removing from DB
- risk_assessment (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "riskAssessment" to schema.ts instead of removing from DB
- automated_decision (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "automatedDecision" to schema.ts instead of removing from DB
- automated_recommendations (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "automatedRecommendations" to schema.ts instead of removing from DB
- manual_review_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "manualReviewNotes" to schema.ts instead of removing from DB
- reviewer_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewerId" to schema.ts instead of removing from DB
- reviewed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewedAt" to schema.ts instead of removing from DB
- api_verification_results (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "apiVerificationResults" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- email → email (SAFE TO ADD)
- verificationCode → verification_code (SAFE TO ADD)
- verificationData → verification_data (SAFE TO ADD)
- status → status (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- submittedAt → submitted_at (SAFE TO ADD)
- approvedAt → approved_at (SAFE TO ADD)
- rejectedAt → rejected_at (SAFE TO ADD)
- rejectionReason → rejection_reason (SAFE TO ADD)
- expiresAt → expires_at (SAFE TO ADD)
- approvedBy → approved_by (SAFE TO ADD)
- ipAddress → ip_address (SAFE TO ADD)
- userAgent → user_agent (SAFE TO ADD)

### Table: data_modification_logs
#### Extra columns in database:
- action (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "action" to schema.ts instead of removing from DB
- old_values (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "oldValues" to schema.ts instead of removing from DB
- new_values (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "newValues" to schema.ts instead of removing from DB
- reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reason" to schema.ts instead of removing from DB
- ip_address (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ipAddress" to schema.ts instead of removing from DB
- user_agent (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "userAgent" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- userName → user_name (SAFE TO ADD)
- userRole → user_role (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- patientId → patient_id (SAFE TO ADD)
- operation → operation (SAFE TO ADD)
- fieldName → field_name (SAFE TO ADD)
- oldValue → old_value (SAFE TO ADD)
- newValue → new_value (SAFE TO ADD)
- changeReason → change_reason (SAFE TO ADD)
- encounterId → encounter_id (SAFE TO ADD)
- orderAuthority → order_authority (SAFE TO ADD)
- validated → validated (SAFE TO ADD)
- validatedBy → validated_by (SAFE TO ADD)
- validatedAt → validated_at (SAFE TO ADD)
- modifiedAt → modified_at (SAFE TO ADD)

### Table: diagnoses
#### Extra columns in database:
- claim_submission_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "claimSubmissionStatus" to schema.ts instead of removing from DB
- claim_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "claimId" to schema.ts instead of removing from DB
- clearinghouse_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clearinghouseId" to schema.ts instead of removing from DB
- payer_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "payerId" to schema.ts instead of removing from DB
- allowed_amount (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "allowedAmount" to schema.ts instead of removing from DB
- paid_amount (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "paidAmount" to schema.ts instead of removing from DB
- patient_responsibility (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientResponsibility" to schema.ts instead of removing from DB
- adjustment_amount (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "adjustmentAmount" to schema.ts instead of removing from DB
- denial_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "denialReason" to schema.ts instead of removing from DB
- denial_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "denialCode" to schema.ts instead of removing from DB
- appeal_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appealStatus" to schema.ts instead of removing from DB
- appeal_deadline (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appealDeadline" to schema.ts instead of removing from DB
- billing_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingNotes" to schema.ts instead of removing from DB
- last_billing_action (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastBillingAction" to schema.ts instead of removing from DB
- assigned_biller (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assignedBiller" to schema.ts instead of removing from DB
- modifier_applied (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "modifierApplied" to schema.ts instead of removing from DB
- billing_action_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingActionDate" to schema.ts instead of removing from DB

### Table: document_processing_queue
#### Extra columns in database:
- priority (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priority" to schema.ts instead of removing from DB
- processor_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processorType" to schema.ts instead of removing from DB
- processing_metadata (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingMetadata" to schema.ts instead of removing from DB
- error_message (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "errorMessage" to schema.ts instead of removing from DB
- retry_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "retryCount" to schema.ts instead of removing from DB
- started_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startedAt" to schema.ts instead of removing from DB
- completed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "completedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- attempts → attempts (SAFE TO ADD)
- lastAttempt → last_attempt (SAFE TO ADD)

### Table: email_notifications
#### Extra columns in database:
- recipient_email (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "recipientEmail" to schema.ts instead of removing from DB
- subject (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "subject" to schema.ts instead of removing from DB
- body_html (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodyHtml" to schema.ts instead of removing from DB
- body_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodyText" to schema.ts instead of removing from DB
- related_user_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relatedUserId" to schema.ts instead of removing from DB
- related_entity_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relatedEntityType" to schema.ts instead of removing from DB
- related_entity_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relatedEntityId" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- sent_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sentAt" to schema.ts instead of removing from DB
- error_message (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "errorMessage" to schema.ts instead of removing from DB
- retry_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "retryCount" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- userId → user_id (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)

### Table: emergency_access_logs
#### Extra columns in database:
- access_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "accessReason" to schema.ts instead of removing from DB
- override_restrictions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "overrideRestrictions" to schema.ts instead of removing from DB
- supervisor_approval (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "supervisorApproval" to schema.ts instead of removing from DB
- access_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "accessDuration" to schema.ts instead of removing from DB
- ip_address (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ipAddress" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- userName → user_name (SAFE TO ADD)
- userRole → user_role (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- patientName → patient_name (SAFE TO ADD)
- justification → justification (SAFE TO ADD)
- authorizingPhysician → authorizing_physician (SAFE TO ADD)
- accessStartTime → access_start_time (SAFE TO ADD)
- accessEndTime → access_end_time (SAFE TO ADD)
- accessedResources → accessed_resources (SAFE TO ADD)

### Table: encounters
#### Extra columns in database:
- encounter_date (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "encounterDate" to schema.ts instead of removing from DB
- visit_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitReason" to schema.ts instead of removing from DB
- status (character varying) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- location (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "location" to schema.ts instead of removing from DB
- insurance_verified (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "insuranceVerified" to schema.ts instead of removing from DB
- copay_collected (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "copayCollected" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- location_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "locationId" to schema.ts instead of removing from DB
- ai_scribe_mode (text) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "aiScribeMode" to schema.ts instead of removing from DB
- signed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signedBy" to schema.ts instead of removing from DB
- signed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signedAt" to schema.ts instead of removing from DB
- is_signed (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "isSigned" to schema.ts instead of removing from DB
- appointment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appointmentId" to schema.ts instead of removing from DB
- transcription_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "transcriptionId" to schema.ts instead of removing from DB
- assistant_thread_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assistantThreadId" to schema.ts instead of removing from DB
- voice_recording_url (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "voiceRecordingUrl" to schema.ts instead of removing from DB
- alerts (jsonb) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "alerts" to schema.ts instead of removing from DB
- draft_orders (jsonb) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "draftOrders" to schema.ts instead of removing from DB
- draft_diagnoses (jsonb) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "draftDiagnoses" to schema.ts instead of removing from DB
- cpt_codes (jsonb) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "cptCodes" to schema.ts instead of removing from DB
- signature_id (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signatureId" to schema.ts instead of removing from DB
- last_chart_update (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastChartUpdate" to schema.ts instead of removing from DB
- chart_update_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "chartUpdateDuration" to schema.ts instead of removing from DB

### Table: external_labs
#### Extra columns in database:
- patient_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientId" to schema.ts instead of removing from DB
- test_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testName" to schema.ts instead of removing from DB
- test_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testDate" to schema.ts instead of removing from DB
- result_value (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultValue" to schema.ts instead of removing from DB
- unit (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "unit" to schema.ts instead of removing from DB
- reference_range (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referenceRange" to schema.ts instead of removing from DB
- abnormal_flag (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "abnormalFlag" to schema.ts instead of removing from DB
- ordering_provider (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderingProvider" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "attachmentId" to schema.ts instead of removing from DB
#### Missing columns in database:
- labIdentifier → lab_identifier (SAFE TO ADD)
- integrationType → integration_type (SAFE TO ADD)
- apiEndpoint → api_endpoint (SAFE TO ADD)
- hl7Endpoint → hl7_endpoint (SAFE TO ADD)
- apiKeyEncrypted → api_key_encrypted (SAFE TO ADD)
- usernameEncrypted → username_encrypted (SAFE TO ADD)
- sslCertificatePath → ssl_certificate_path (SAFE TO ADD)
- supportedTests → supported_tests (SAFE TO ADD)
- turnaroundTimes → turnaround_times (SAFE TO ADD)
- active → active (SAFE TO ADD)

### Table: family_history
#### Extra columns in database:
- relationship (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relationship" to schema.ts instead of removing from DB
- condition (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "condition" to schema.ts instead of removing from DB
- age_at_onset (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ageAtOnset" to schema.ts instead of removing from DB
- age_at_death (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ageAtDeath" to schema.ts instead of removing from DB
- cause_of_death (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "causeOfDeath" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- source_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceType" to schema.ts instead of removing from DB
- source_confidence (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceConfidence" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- maternal_side (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "maternalSide" to schema.ts instead of removing from DB
- living_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "livingStatus" to schema.ts instead of removing from DB
- genetic_marker (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "geneticMarker" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- familyMember → family_member (SAFE TO ADD)
- medicalHistory → medical_history (SAFE TO ADD)
- lastUpdatedEncounter → last_updated_encounter (SAFE TO ADD)

### Table: gpt_lab_review_notes
#### Extra columns in database:
- lab_order_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "labOrderId" to schema.ts instead of removing from DB
- review_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewType" to schema.ts instead of removing from DB
- ai_interpretation (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "aiInterpretation" to schema.ts instead of removing from DB
- clinical_significance (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clinicalSignificance" to schema.ts instead of removing from DB
- follow_up_recommendations (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpRecommendations" to schema.ts instead of removing from DB
- risk_assessment (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "riskAssessment" to schema.ts instead of removing from DB
- reviewed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewedBy" to schema.ts instead of removing from DB
- review_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewStatus" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- encounterId → encounter_id (SAFE TO ADD)
- resultIds → result_ids (SAFE TO ADD)
- clinicalReview → clinical_review (SAFE TO ADD)
- patientMessage → patient_message (SAFE TO ADD)
- nurseMessage → nurse_message (SAFE TO ADD)
- patientContext → patient_context (SAFE TO ADD)

### Table: health_systems
#### Extra columns in database:
- type (character varying) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "type" to schema.ts instead of removing from DB
- subscription_key (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "subscriptionKey" to schema.ts instead of removing from DB
- is_migration (boolean) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "isMigration" to schema.ts instead of removing from DB
- stripe_customer_id (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "stripeCustomerId" to schema.ts instead of removing from DB
- metadata (jsonb) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "metadata" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- subscription_limits (jsonb) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "subscriptionLimits" to schema.ts instead of removing from DB
- active_user_count (jsonb) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "activeUserCount" to schema.ts instead of removing from DB
- billing_details (jsonb) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "billingDetails" to schema.ts instead of removing from DB
- active (boolean) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- status (text) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB

### Table: imaging_orders
#### Extra columns in database:
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- imaging_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "imagingType" to schema.ts instead of removing from DB
- indication (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "indication" to schema.ts instead of removing from DB
- priority (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priority" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- facility_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "facilityId" to schema.ts instead of removing from DB
- scheduled_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "scheduledDate" to schema.ts instead of removing from DB
- completed_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "completedDate" to schema.ts instead of removing from DB
#### Missing columns in database:
- studyType → study_type (SAFE TO ADD)
- contrastNeeded → contrast_needed (SAFE TO ADD)
- clinicalIndication → clinical_indication (SAFE TO ADD)
- relevantSymptoms → relevant_symptoms (SAFE TO ADD)
- orderedBy → ordered_by (SAFE TO ADD)
- orderedAt → ordered_at (SAFE TO ADD)
- externalFacilityId → external_facility_id (SAFE TO ADD)
- externalOrderId → external_order_id (SAFE TO ADD)
- dicomAccessionNumber → dicom_accession_number (SAFE TO ADD)
- orderStatus → order_status (SAFE TO ADD)
- scheduledAt → scheduled_at (SAFE TO ADD)
- completedAt → completed_at (SAFE TO ADD)
- prepInstructions → prep_instructions (SAFE TO ADD)
- schedulingNotes → scheduling_notes (SAFE TO ADD)
- updatedAt → updated_at (SAFE TO ADD)

### Table: imaging_results
#### Extra columns in database:
- encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "encounterId" to schema.ts instead of removing from DB
- study_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "studyType" to schema.ts instead of removing from DB
- accession_number (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "accessionNumber" to schema.ts instead of removing from DB
- performing_facility (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "performingFacility" to schema.ts instead of removing from DB
- ordering_provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderingProviderId" to schema.ts instead of removing from DB
- reading_radiologist (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "readingRadiologist" to schema.ts instead of removing from DB
- recommendations (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "recommendations" to schema.ts instead of removing from DB
- comparison_studies (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "comparisonStudies" to schema.ts instead of removing from DB
- technique (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "technique" to schema.ts instead of removing from DB
- contrast_used (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "contrastUsed" to schema.ts instead of removing from DB
- contrast_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "contrastType" to schema.ts instead of removing from DB
- radiation_dose (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "radiationDose" to schema.ts instead of removing from DB
- number_of_images (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "numberOfImages" to schema.ts instead of removing from DB
- critical_findings (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalFindings" to schema.ts instead of removing from DB
- critical_findings_communicated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalFindingsCommunicatedAt" to schema.ts instead of removing from DB
- report_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reportStatus" to schema.ts instead of removing from DB
- report_finalized_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reportFinalizedAt" to schema.ts instead of removing from DB
- addendum (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addendum" to schema.ts instead of removing from DB
- addendum_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "addendumDate" to schema.ts instead of removing from DB
- procedure_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "procedureCode" to schema.ts instead of removing from DB
- diagnostic_quality (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "diagnosticQuality" to schema.ts instead of removing from DB
- limitations (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "limitations" to schema.ts instead of removing from DB
- follow_up_needed (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpNeeded" to schema.ts instead of removing from DB
- follow_up_timeframe (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpTimeframe" to schema.ts instead of removing from DB
- bi_rads_score (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "biRadsScore" to schema.ts instead of removing from DB
- lung_rads_score (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lungRadsScore" to schema.ts instead of removing from DB
- ti_rads_score (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "tiRadsScore" to schema.ts instead of removing from DB
- pi_rads_score (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "piRadsScore" to schema.ts instead of removing from DB
- liver_rads_score (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "liverRadsScore" to schema.ts instead of removing from DB
- incidental_findings (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "incidentalFindings" to schema.ts instead of removing from DB
- relevant_history (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relevantHistory" to schema.ts instead of removing from DB
- clinical_indication (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clinicalIndication" to schema.ts instead of removing from DB
- protocol_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "protocolName" to schema.ts instead of removing from DB
- series_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "seriesCount" to schema.ts instead of removing from DB
- image_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "imageCount" to schema.ts instead of removing from DB
- study_size_mb (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "studySizeMb" to schema.ts instead of removing from DB
- pacs_study_uid (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "pacsStudyUid" to schema.ts instead of removing from DB
- dicom_retrieval_url (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dicomRetrievalUrl" to schema.ts instead of removing from DB
- external_system_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalSystemId" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- laterality → laterality (SAFE TO ADD)
- clinicalSummary → clinical_summary (SAFE TO ADD)
- radiologistName → radiologist_name (SAFE TO ADD)
- facilityName → facility_name (SAFE TO ADD)
- attachmentId → attachment_id (SAFE TO ADD)
- dicomStudyId → dicom_study_id (SAFE TO ADD)
- dicomSeriesId → dicom_series_id (SAFE TO ADD)
- imageFilePaths → image_file_paths (SAFE TO ADD)
- resultStatus → result_status (SAFE TO ADD)
- reviewedBy → reviewed_by (SAFE TO ADD)
- reviewedAt → reviewed_at (SAFE TO ADD)
- providerNotes → provider_notes (SAFE TO ADD)
- needsReview → needs_review (SAFE TO ADD)

### Table: lab_orders
#### Extra columns in database:
- order_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderId" to schema.ts instead of removing from DB
- result_received_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultReceivedAt" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- transmission_response (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "transmissionResponse" to schema.ts instead of removing from DB
- result_data (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultData" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- specimen_source (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "specimenSource" to schema.ts instead of removing from DB
- special_instructions (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "specialInstructions" to schema.ts instead of removing from DB
- collection_site (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "collectionSite" to schema.ts instead of removing from DB
- collected_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "collectedBy" to schema.ts instead of removing from DB
- external_lab (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalLab" to schema.ts instead of removing from DB
- result_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultStatus" to schema.ts instead of removing from DB
- reference_range (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referenceRange" to schema.ts instead of removing from DB
- expected_turnaround (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "expectedTurnaround" to schema.ts instead of removing from DB
- external_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalStatus" to schema.ts instead of removing from DB
- results (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "results" to schema.ts instead of removing from DB
- abnormal_flags (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "abnormalFlags" to schema.ts instead of removing from DB
- discontinued_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuedAt" to schema.ts instead of removing from DB
- discontinued_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuedBy" to schema.ts instead of removing from DB
- discontinued_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuedReason" to schema.ts instead of removing from DB
- critical_values (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalValues" to schema.ts instead of removing from DB
- stat_order (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "statOrder" to schema.ts instead of removing from DB
- provider_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerNotes" to schema.ts instead of removing from DB
- patient_preparation (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientPreparation" to schema.ts instead of removing from DB
- collection_priority (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "collectionPriority" to schema.ts instead of removing from DB
- processing_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingNotes" to schema.ts instead of removing from DB
- billing_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingCode" to schema.ts instead of removing from DB
- insurance_preauth_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insurancePreauthDate" to schema.ts instead of removing from DB
- actual_cost (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "actualCost" to schema.ts instead of removing from DB
- patient_consent (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientConsent" to schema.ts instead of removing from DB
- consent_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consentDate" to schema.ts instead of removing from DB
- insurance_coverage (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insuranceCoverage" to schema.ts instead of removing from DB
- patient_copay (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientCopay" to schema.ts instead of removing from DB
- billing_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingStatus" to schema.ts instead of removing from DB
- billing_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingDate" to schema.ts instead of removing from DB
- cancellation_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "cancellationReason" to schema.ts instead of removing from DB
- result_interpretation (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultInterpretation" to schema.ts instead of removing from DB
- ai_suggested_tests (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "aiSuggestedTests" to schema.ts instead of removing from DB
- ai_analysis (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "aiAnalysis" to schema.ts instead of removing from DB
- result_notification_sent (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultNotificationSent" to schema.ts instead of removing from DB
- result_notification_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultNotificationDate" to schema.ts instead of removing from DB
- performing_lab_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "performingLabId" to schema.ts instead of removing from DB
- lab_account_number (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "labAccountNumber" to schema.ts instead of removing from DB
- risk_flags (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "riskFlags" to schema.ts instead of removing from DB
- quality_control_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "qualityControlStatus" to schema.ts instead of removing from DB
- quality_control_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "qualityControlNotes" to schema.ts instead of removing from DB
- repeat_test_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "repeatTestReason" to schema.ts instead of removing from DB
- original_order_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalOrderId" to schema.ts instead of removing from DB
- test_methodology (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testMethodology" to schema.ts instead of removing from DB
- quality_measure (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "qualityMeasure" to schema.ts instead of removing from DB
- processing_lab_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingLabName" to schema.ts instead of removing from DB
- processing_lab_director (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingLabDirector" to schema.ts instead of removing from DB
- test_validation_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testValidationStatus" to schema.ts instead of removing from DB
- regulatory_compliance (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "regulatoryCompliance" to schema.ts instead of removing from DB
- sample_rejection_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sampleRejectionReason" to schema.ts instead of removing from DB
- preventive_care_flag (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preventiveCareFlag" to schema.ts instead of removing from DB
- clinical_trial_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clinicalTrialId" to schema.ts instead of removing from DB
- research_study_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "researchStudyId" to schema.ts instead of removing from DB
- patient_location (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientLocation" to schema.ts instead of removing from DB
- ordering_facility_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderingFacilityId" to schema.ts instead of removing from DB
- test_performed_at (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testPerformedAt" to schema.ts instead of removing from DB

### Table: lab_reference_ranges
#### Extra columns in database:
- test_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "testCode" to schema.ts instead of removing from DB
- reference_low (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referenceLow" to schema.ts instead of removing from DB
- reference_high (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referenceHigh" to schema.ts instead of removing from DB
- critical_low (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalLow" to schema.ts instead of removing from DB
- critical_high (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalHigh" to schema.ts instead of removing from DB
- unit (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "unit" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- loincCode → loinc_code (SAFE TO ADD)
- testCategory → test_category (SAFE TO ADD)
- normalLow → normal_low (SAFE TO ADD)

### Table: lab_results
#### Extra columns in database:
- result_units (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultUnits" to schema.ts instead of removing from DB
- reference_range (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referenceRange" to schema.ts instead of removing from DB
- age_gender_adjusted_range (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ageGenderAdjustedRange" to schema.ts instead of removing from DB
- abnormal_flag (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "abnormalFlag" to schema.ts instead of removing from DB
- critical_flag (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "criticalFlag" to schema.ts instead of removing from DB
- delta_flag (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deltaFlag" to schema.ts instead of removing from DB
- specimen_collected_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "specimenCollectedAt" to schema.ts instead of removing from DB
- specimen_received_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "specimenReceivedAt" to schema.ts instead of removing from DB
- result_available_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultAvailableAt" to schema.ts instead of removing from DB
- result_finalized_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultFinalizedAt" to schema.ts instead of removing from DB
- received_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "receivedAt" to schema.ts instead of removing from DB
- external_lab_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalLabId" to schema.ts instead of removing from DB
- external_result_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalResultId" to schema.ts instead of removing from DB
- hl7_message_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "hl7MessageId" to schema.ts instead of removing from DB
- instrument_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "instrumentId" to schema.ts instead of removing from DB
- result_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultStatus" to schema.ts instead of removing from DB
- verification_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationStatus" to schema.ts instead of removing from DB
- result_comments (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resultComments" to schema.ts instead of removing from DB
- reviewed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewedBy" to schema.ts instead of removing from DB
- reviewed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewedAt" to schema.ts instead of removing from DB
- provider_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerNotes" to schema.ts instead of removing from DB
- needs_review (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "needsReview" to schema.ts instead of removing from DB
- review_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewStatus" to schema.ts instead of removing from DB
- review_note (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewNote" to schema.ts instead of removing from DB
- review_template (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewTemplate" to schema.ts instead of removing from DB
- review_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewHistory" to schema.ts instead of removing from DB
- patient_communication_sent (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientCommunicationSent" to schema.ts instead of removing from DB
- patient_communication_method (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientCommunicationMethod" to schema.ts instead of removing from DB
- patient_communication_sent_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientCommunicationSentAt" to schema.ts instead of removing from DB
- patient_notified_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientNotifiedBy" to schema.ts instead of removing from DB
- patient_message (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientMessage" to schema.ts instead of removing from DB
- patient_message_sent_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientMessageSentAt" to schema.ts instead of removing from DB
- source_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceType" to schema.ts instead of removing from DB
- source_confidence (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceConfidence" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: locations
#### Extra columns in database:
- zip (character varying) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "zip" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- services (jsonb) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "services" to schema.ts instead of removing from DB
- has_lab (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "hasLab" to schema.ts instead of removing from DB
- has_imaging (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "hasImaging" to schema.ts instead of removing from DB
- has_pharmacy (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "hasPharmacy" to schema.ts instead of removing from DB
#### Missing columns in database:
- fax → fax (SAFE TO ADD)
- email → email (SAFE TO ADD)
- operatingHours → operating_hours (SAFE TO ADD)

### Table: magic_links
#### Extra columns in database:
- used (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "used" to schema.ts instead of removing from DB
#### Missing columns in database:
- userId → user_id (SAFE TO ADD)
- purpose → purpose (SAFE TO ADD)

### Table: medical_history
#### Extra columns in database:
- condition (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "condition" to schema.ts instead of removing from DB
- onset_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "onsetDate" to schema.ts instead of removing from DB
- resolution_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resolutionDate" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- severity (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "severity" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- conditionCategory → condition_category (SAFE TO ADD)
- historyText → history_text (SAFE TO ADD)
- lastUpdatedEncounter → last_updated_encounter (SAFE TO ADD)
- sourceType → source_type (SAFE TO ADD)
- sourceConfidence → source_confidence (SAFE TO ADD)

### Table: medical_problems
#### Extra columns in database:
- encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "encounterId" to schema.ts instead of removing from DB
- icd10_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "icd10Code" to schema.ts instead of removing from DB
- snomed_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "snomedCode" to schema.ts instead of removing from DB
- onset_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "onsetDate" to schema.ts instead of removing from DB
- resolution_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "resolutionDate" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- severity (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "severity" to schema.ts instead of removing from DB
- source_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceType" to schema.ts instead of removing from DB
- source_confidence (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceConfidence" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- date_diagnosed (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dateDiagnosed" to schema.ts instead of removing from DB
- last_updated (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUpdated" to schema.ts instead of removing from DB
- verification_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationStatus" to schema.ts instead of removing from DB
- verification_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verificationDate" to schema.ts instead of removing from DB
- verified_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "verifiedBy" to schema.ts instead of removing from DB
- clinical_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clinicalStatus" to schema.ts instead of removing from DB
- body_site (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodySite" to schema.ts instead of removing from DB
- body_site_laterality (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodySiteLaterality" to schema.ts instead of removing from DB
- category (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "category" to schema.ts instead of removing from DB
- last_reviewed_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastReviewedDate" to schema.ts instead of removing from DB
- reviewed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reviewedBy" to schema.ts instead of removing from DB
- patient_education_provided (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientEducationProvided" to schema.ts instead of removing from DB
- care_plan_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "carePlanStatus" to schema.ts instead of removing from DB
- functional_impact (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "functionalImpact" to schema.ts instead of removing from DB
- prognosis (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prognosis" to schema.ts instead of removing from DB
- risk_factors (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "riskFactors" to schema.ts instead of removing from DB
- associated_conditions (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "associatedConditions" to schema.ts instead of removing from DB
- treatment_goals (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "treatmentGoals" to schema.ts instead of removing from DB
- monitoring_parameters (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "monitoringParameters" to schema.ts instead of removing from DB
- follow_up_required (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpRequired" to schema.ts instead of removing from DB
- follow_up_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpDate" to schema.ts instead of removing from DB
- problem_ranking (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "problemRanking" to schema.ts instead of removing from DB
- display_in_summary (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "displayInSummary" to schema.ts instead of removing from DB
- patient_aware (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientAware" to schema.ts instead of removing from DB
- caregiver_aware (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "caregiverAware" to schema.ts instead of removing from DB
- reportable_condition (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reportableCondition" to schema.ts instead of removing from DB
- reported_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reportedDate" to schema.ts instead of removing from DB
- clinical_priority (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "clinicalPriority" to schema.ts instead of removing from DB
- social_determinants (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "socialDeterminants" to schema.ts instead of removing from DB
- cultural_considerations (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "culturalConsiderations" to schema.ts instead of removing from DB
- patient_goals (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientGoals" to schema.ts instead of removing from DB
- barriers_to_care (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "barriersToCare" to schema.ts instead of removing from DB
- quality_measures (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "qualityMeasures" to schema.ts instead of removing from DB
- outcome_measures (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "outcomeMeasures" to schema.ts instead of removing from DB
- care_team_members (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "careTeamMembers" to schema.ts instead of removing from DB
- care_coordination_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "careCoordinationNotes" to schema.ts instead of removing from DB
- original_problem_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalProblemText" to schema.ts instead of removing from DB
- mapped_by_ai (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mappedByAi" to schema.ts instead of removing from DB
- ai_confidence_score (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "aiConfidenceScore" to schema.ts instead of removing from DB
- human_verified (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "humanVerified" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- firstDiagnosedDate → first_diagnosed_date (SAFE TO ADD)
- firstEncounterId → first_encounter_id (SAFE TO ADD)

### Table: medication_formulary
#### Extra columns in database:
- medication_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationName" to schema.ts instead of removing from DB
- drug_class (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "drugClass" to schema.ts instead of removing from DB
- dosage_forms (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dosageForms" to schema.ts instead of removing from DB
- strengths (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "strengths" to schema.ts instead of removing from DB
- route (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "route" to schema.ts instead of removing from DB
- tier (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "tier" to schema.ts instead of removing from DB
- prior_auth_required (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priorAuthRequired" to schema.ts instead of removing from DB
- quantity_limits (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "quantityLimits" to schema.ts instead of removing from DB
- step_therapy (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "stepTherapy" to schema.ts instead of removing from DB
- alternatives (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "alternatives" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- brandNames → brand_names (SAFE TO ADD)
- commonNames → common_names (SAFE TO ADD)
- standardStrengths → standard_strengths (SAFE TO ADD)
- availableForms → available_forms (SAFE TO ADD)
- formRoutes → form_routes (SAFE TO ADD)

### Table: medications
#### Extra columns in database:
- form (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "form" to schema.ts instead of removing from DB
- discontinuation_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuationDate" to schema.ts instead of removing from DB
- discontinuation_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuationReason" to schema.ts instead of removing from DB
- prescribed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prescribedBy" to schema.ts instead of removing from DB
- prescribed_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prescribedDate" to schema.ts instead of removing from DB
- pharmacy (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "pharmacy" to schema.ts instead of removing from DB
- prescriber_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prescriberNotes" to schema.ts instead of removing from DB
- patient_instructions (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientInstructions" to schema.ts instead of removing from DB
- rxnorm_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "rxnormCode" to schema.ts instead of removing from DB
- refills (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "refills" to schema.ts instead of removing from DB
- lot_number (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lotNumber" to schema.ts instead of removing from DB
- expiration_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "expirationDate" to schema.ts instead of removing from DB
- manufacturer (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "manufacturer" to schema.ts instead of removing from DB
- dea_schedule (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deaSchedule" to schema.ts instead of removing from DB
- is_controlled (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isControlled" to schema.ts instead of removing from DB
- requires_prior_auth (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "requiresPriorAuth" to schema.ts instead of removing from DB
- prior_auth_number (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priorAuthNumber" to schema.ts instead of removing from DB
- formulary_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "formularyStatus" to schema.ts instead of removing from DB
- therapeutic_class (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "therapeuticClass" to schema.ts instead of removing from DB
- source_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceType" to schema.ts instead of removing from DB
- source_confidence (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceConfidence" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- grouping_strategy (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "groupingStrategy" to schema.ts instead of removing from DB
- discontinuation_source (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "discontinuationSource" to schema.ts instead of removing from DB
- original_order_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalOrderId" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- surescripts_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "surescriptsId" to schema.ts instead of removing from DB
- reason_for_change (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reasonForChange" to schema.ts instead of removing from DB
- medication_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationHistory" to schema.ts instead of removing from DB
- change_log (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "changeLog" to schema.ts instead of removing from DB
- source_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceNotes" to schema.ts instead of removing from DB
- entered_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "enteredBy" to schema.ts instead of removing from DB
- related_medications (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "relatedMedications" to schema.ts instead of removing from DB
- drug_interactions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "drugInteractions" to schema.ts instead of removing from DB
- pharmacy_order_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "pharmacyOrderId" to schema.ts instead of removing from DB
- insurance_auth_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insuranceAuthStatus" to schema.ts instead of removing from DB
- prior_auth_required (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priorAuthRequired" to schema.ts instead of removing from DB
- last_updated_encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUpdatedEncounterId" to schema.ts instead of removing from DB
#### Missing columns in database:
- rxNormCode → rx_norm_code (SAFE TO ADD)
- sureScriptsId → sure_scripts_id (SAFE TO ADD)

### Table: orders
#### Extra columns in database:
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- order_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderDate" to schema.ts instead of removing from DB
- status (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- medication_dosage (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationDosage" to schema.ts instead of removing from DB
- medication_route (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationRoute" to schema.ts instead of removing from DB
- medication_frequency (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationFrequency" to schema.ts instead of removing from DB
- medication_duration (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationDuration" to schema.ts instead of removing from DB
- medication_quantity (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationQuantity" to schema.ts instead of removing from DB
- medication_refills (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicationRefills" to schema.ts instead of removing from DB
- lab_test_name (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "labTestName" to schema.ts instead of removing from DB
- lab_test_code (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "labTestCode" to schema.ts instead of removing from DB
- imaging_study_type (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "imagingStudyType" to schema.ts instead of removing from DB
- imaging_body_part (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "imagingBodyPart" to schema.ts instead of removing from DB
- referral_specialty (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referralSpecialty" to schema.ts instead of removing from DB
- referral_reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "referralReason" to schema.ts instead of removing from DB
- instructions (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "instructions" to schema.ts instead of removing from DB
- diagnosis_codes (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "diagnosisCodes" to schema.ts instead of removing from DB
- prescriber (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prescriber" to schema.ts instead of removing from DB
- prescriber_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "prescriberId" to schema.ts instead of removing from DB
- body_part (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodyPart" to schema.ts instead of removing from DB
- ndc_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ndcCode" to schema.ts instead of removing from DB
- route (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "route" to schema.ts instead of removing from DB
- frequency (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "frequency" to schema.ts instead of removing from DB
- duration (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "duration" to schema.ts instead of removing from DB
- start_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startDate" to schema.ts instead of removing from DB
- end_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "endDate" to schema.ts instead of removing from DB
- indication (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "indication" to schema.ts instead of removing from DB
- imaging_order_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "imagingOrderId" to schema.ts instead of removing from DB
- external_order_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalOrderId" to schema.ts instead of removing from DB

### Table: organization_documents
#### Extra columns in database:
- organization_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "organizationId" to schema.ts instead of removing from DB
- file_path (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "filePath" to schema.ts instead of removing from DB
- file_size (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "fileSize" to schema.ts instead of removing from DB
- mime_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mimeType" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- documentUrl → document_url (SAFE TO ADD)
- uploadedAt → uploaded_at (SAFE TO ADD)
- verifiedAt → verified_at (SAFE TO ADD)
- verifiedBy → verified_by (SAFE TO ADD)
- expiresAt → expires_at (SAFE TO ADD)

### Table: organizations
#### Extra columns in database:
- type (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "type" to schema.ts instead of removing from DB
- website (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "website" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: patient_attachments
#### Extra columns in database:
- filename (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "filename" to schema.ts instead of removing from DB
- original_filename (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalFilename" to schema.ts instead of removing from DB
- file_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "fileType" to schema.ts instead of removing from DB
- upload_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "uploadDate" to schema.ts instead of removing from DB
- document_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "documentType" to schema.ts instead of removing from DB
- document_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "documentDate" to schema.ts instead of removing from DB
- ocr_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ocrText" to schema.ts instead of removing from DB
- ocr_completed (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ocrCompleted" to schema.ts instead of removing from DB
- ocr_completed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ocrCompletedAt" to schema.ts instead of removing from DB
- processing_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingNotes" to schema.ts instead of removing from DB
- extracted_data (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedData" to schema.ts instead of removing from DB
- chart_sections_updated (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "chartSectionsUpdated" to schema.ts instead of removing from DB
- confidence_scores (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "confidenceScores" to schema.ts instead of removing from DB
- hash_value (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "hashValue" to schema.ts instead of removing from DB
- is_deleted (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isDeleted" to schema.ts instead of removing from DB
- deleted_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deletedAt" to schema.ts instead of removing from DB
- deleted_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deletedBy" to schema.ts instead of removing from DB
- retention_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "retentionDate" to schema.ts instead of removing from DB
- access_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "accessCount" to schema.ts instead of removing from DB
- last_accessed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastAccessedAt" to schema.ts instead of removing from DB
- source_system (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceSystem" to schema.ts instead of removing from DB
- external_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalId" to schema.ts instead of removing from DB
#### Missing columns in database:
- fileName → file_name (SAFE TO ADD)
- originalFileName → original_file_name (SAFE TO ADD)
- fileExtension → file_extension (SAFE TO ADD)
- filePath → file_path (SAFE TO ADD)
- category → category (SAFE TO ADD)
- title → title (SAFE TO ADD)
- isConfidential → is_confidential (SAFE TO ADD)
- accessLevel → access_level (SAFE TO ADD)
- contentHash → content_hash (SAFE TO ADD)
- virusScanStatus → virus_scan_status (SAFE TO ADD)

### Table: patient_order_preferences
#### Extra columns in database:
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- order_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "orderType" to schema.ts instead of removing from DB
- preferences (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferences" to schema.ts instead of removing from DB
- standing_orders (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "standingOrders" to schema.ts instead of removing from DB
#### Missing columns in database:
- labDeliveryMethod → lab_delivery_method (SAFE TO ADD)
- labServiceProvider → lab_service_provider (SAFE TO ADD)
- imagingDeliveryMethod → imaging_delivery_method (SAFE TO ADD)
- imagingServiceProvider → imaging_service_provider (SAFE TO ADD)
- medicationDeliveryMethod → medication_delivery_method (SAFE TO ADD)
- preferredPharmacy → preferred_pharmacy (SAFE TO ADD)
- pharmacyPhone → pharmacy_phone (SAFE TO ADD)
- pharmacyFax → pharmacy_fax (SAFE TO ADD)
- lastUpdatedBy → last_updated_by (SAFE TO ADD)

### Table: patient_physical_findings
#### Extra columns in database:
- encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "encounterId" to schema.ts instead of removing from DB
- body_system (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bodySystem" to schema.ts instead of removing from DB
- finding (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "finding" to schema.ts instead of removing from DB
- severity (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "severity" to schema.ts instead of removing from DB
- laterality (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "laterality" to schema.ts instead of removing from DB
- quality (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "quality" to schema.ts instead of removing from DB
- duration (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "duration" to schema.ts instead of removing from DB
- context (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "context" to schema.ts instead of removing from DB
- associated_symptoms (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "associatedSymptoms" to schema.ts instead of removing from DB
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- examined_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "examinedAt" to schema.ts instead of removing from DB
- is_normal (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isNormal" to schema.ts instead of removing from DB
- requires_follow_up (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "requiresFollowUp" to schema.ts instead of removing from DB
- follow_up_timeframe (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpTimeframe" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- examSystem → exam_system (SAFE TO ADD)
- examComponent → exam_component (SAFE TO ADD)
- findingText → finding_text (SAFE TO ADD)
- findingType → finding_type (SAFE TO ADD)
- confidence → confidence (SAFE TO ADD)

### Table: patient_scheduling_patterns
#### Extra columns in database:
- provider_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "providerId" to schema.ts instead of removing from DB
- pattern_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patternType" to schema.ts instead of removing from DB
- frequency (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "frequency" to schema.ts instead of removing from DB
- time_preferences (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "timePreferences" to schema.ts instead of removing from DB
- seasonal_variations (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "seasonalVariations" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- avgVisitDuration → avg_visit_duration (SAFE TO ADD)

### Table: patients
#### Extra columns in database:
- external_id (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "externalId" to schema.ts instead of removing from DB
- middle_name (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "middleName" to schema.ts instead of removing from DB
- phone (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "phone" to schema.ts instead of removing from DB
- phone_type (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "phoneType" to schema.ts instead of removing from DB
- city (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "city" to schema.ts instead of removing from DB
- state (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "state" to schema.ts instead of removing from DB
- zip (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "zip" to schema.ts instead of removing from DB
- insurance_provider (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insuranceProvider" to schema.ts instead of removing from DB
- insurance_policy_number (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insurancePolicyNumber" to schema.ts instead of removing from DB
- insurance_group_number (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "insuranceGroupNumber" to schema.ts instead of removing from DB
- emergency_contact_name (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "emergencyContactName" to schema.ts instead of removing from DB
- emergency_contact_phone (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "emergencyContactPhone" to schema.ts instead of removing from DB
- emergency_contact_relationship (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "emergencyContactRelationship" to schema.ts instead of removing from DB
- preferred_language (character varying) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "preferredLanguage" to schema.ts instead of removing from DB
- race (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "race" to schema.ts instead of removing from DB
- ethnicity (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ethnicity" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- profile_photo_filename (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "profilePhotoFilename" to schema.ts instead of removing from DB
- consent_given (boolean) - **HAS 1 NON-NULL VALUES** ⚠️
  → Consider adding "consentGiven" to schema.ts instead of removing from DB

### Table: phi_access_logs
#### Extra columns in database:
- created_at (timestamp without time zone) - **HAS 417 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: problem_rank_overrides
#### Extra columns in database:
- user_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "userId" to schema.ts instead of removing from DB
- patient_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patientId" to schema.ts instead of removing from DB
- custom_rank (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "customRank" to schema.ts instead of removing from DB
- reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reason" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: provider_schedules
#### Extra columns in database:
- location_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "locationId" to schema.ts instead of removing from DB
- day_of_week (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dayOfWeek" to schema.ts instead of removing from DB
- start_time (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startTime" to schema.ts instead of removing from DB
- end_time (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "endTime" to schema.ts instead of removing from DB
- break_start (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "breakStart" to schema.ts instead of removing from DB
- break_end (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "breakEnd" to schema.ts instead of removing from DB
- effective_from (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "effectiveFrom" to schema.ts instead of removing from DB
- effective_to (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "effectiveTo" to schema.ts instead of removing from DB
- schedule_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "scheduleType" to schema.ts instead of removing from DB
- max_appointments (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "maxAppointments" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: provider_scheduling_patterns
#### Extra columns in database:
- pattern_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "patternType" to schema.ts instead of removing from DB
- preferences (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferences" to schema.ts instead of removing from DB
- constraints (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "constraints" to schema.ts instead of removing from DB
- historical_data (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "historicalData" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- locationId → location_id (SAFE TO ADD)
- avgVisitDuration → avg_visit_duration (SAFE TO ADD)

### Table: realtime_schedule_status
#### Extra columns in database:
- date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "date" to schema.ts instead of removing from DB
- time_slot (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "timeSlot" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- appointment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appointmentId" to schema.ts instead of removing from DB
- buffer_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bufferStatus" to schema.ts instead of removing from DB
- efficiency_score (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "efficiencyScore" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- locationId → location_id (SAFE TO ADD)
- scheduleDate → schedule_date (SAFE TO ADD)
- currentPatientId → current_patient_id (SAFE TO ADD)
- currentAppointmentId → current_appointment_id (SAFE TO ADD)
- runningBehindMinutes → running_behind_minutes (SAFE TO ADD)
- lastUpdateTime → last_update_time (SAFE TO ADD)
- dayStartedAt → day_started_at (SAFE TO ADD)
- estimatedCatchUpTime → estimated_catch_up_time (SAFE TO ADD)
- aiRecommendations → ai_recommendations (SAFE TO ADD)

### Table: resource_bookings
#### Missing columns in database:
- bookingDate → booking_date (SAFE TO ADD)
- createdBy → created_by (SAFE TO ADD)

### Table: schedule_exceptions
#### Extra columns in database:
- exception_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "exceptionDate" to schema.ts instead of removing from DB
- exception_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "exceptionType" to schema.ts instead of removing from DB
- start_time (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startTime" to schema.ts instead of removing from DB
- end_time (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "endTime" to schema.ts instead of removing from DB
- reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reason" to schema.ts instead of removing from DB
- affects_scheduling (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "affectsScheduling" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: schedule_preferences
#### Extra columns in database:
- preferred_appointment_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferredAppointmentDuration" to schema.ts instead of removing from DB
- buffer_time_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bufferTimeMinutes" to schema.ts instead of removing from DB
- lunch_start (time without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lunchStart" to schema.ts instead of removing from DB
- lunch_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lunchDuration" to schema.ts instead of removing from DB
- max_daily_appointments (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "maxDailyAppointments" to schema.ts instead of removing from DB
- max_consecutive_appointments (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "maxConsecutiveAppointments" to schema.ts instead of removing from DB
- preferred_break_after_n_appointments (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferredBreakAfterNAppointments" to schema.ts instead of removing from DB
- break_duration_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "breakDurationMinutes" to schema.ts instead of removing from DB
- allow_double_booking (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "allowDoubleBooking" to schema.ts instead of removing from DB
- allow_overtime (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "allowOvertime" to schema.ts instead of removing from DB
- overtime_limit_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "overtimeLimitMinutes" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- useAiScheduling → use_ai_scheduling (SAFE TO ADD)
- aiAggressiveness → ai_aggressiveness (SAFE TO ADD)

### Table: scheduling_ai_factors
#### Extra columns in database:
- category (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "category" to schema.ts instead of removing from DB
- description (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "description" to schema.ts instead of removing from DB
- is_enabled (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isEnabled" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- factorCategory → factor_category (SAFE TO ADD)
- factorDescription → factor_description (SAFE TO ADD)
- defaultEnabled → default_enabled (SAFE TO ADD)

### Table: scheduling_ai_weights
#### Extra columns in database:
- created_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdBy" to schema.ts instead of removing from DB
- factor_name (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "factorName" to schema.ts instead of removing from DB
- is_active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isActive" to schema.ts instead of removing from DB
- custom_parameters (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "customParameters" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- factorId → factor_id (SAFE TO ADD)
- enabled → enabled (SAFE TO ADD)

### Table: scheduling_resources
#### Extra columns in database:
- name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "name" to schema.ts instead of removing from DB
- available_hours (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "availableHours" to schema.ts instead of removing from DB
- requires_cleaning (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "requiresCleaning" to schema.ts instead of removing from DB
- cleaning_duration (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "cleaningDuration" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- resourceName → resource_name (SAFE TO ADD)
- resourceCode → resource_code (SAFE TO ADD)
- capabilities → capabilities (SAFE TO ADD)
- requiresCleaningMinutes → requires_cleaning_minutes (SAFE TO ADD)
- maintenanceSchedule → maintenance_schedule (SAFE TO ADD)

### Table: scheduling_rules
#### Extra columns in database:
- name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "name" to schema.ts instead of removing from DB
- applies_to (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appliesTo" to schema.ts instead of removing from DB
- conditions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "conditions" to schema.ts instead of removing from DB
- actions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "actions" to schema.ts instead of removing from DB
- priority (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "priority" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- ruleName → rule_name (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- ruleConfig → rule_config (SAFE TO ADD)

### Table: scheduling_templates
#### Extra columns in database:
- template_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "templateType" to schema.ts instead of removing from DB
- day_configuration (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dayConfiguration" to schema.ts instead of removing from DB
- appointment_types (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "appointmentTypes" to schema.ts instead of removing from DB
- buffer_rules (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bufferRules" to schema.ts instead of removing from DB
- break_configuration (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "breakConfiguration" to schema.ts instead of removing from DB
#### Missing columns in database:
- description → description (SAFE TO ADD)
- locationId → location_id (SAFE TO ADD)
- healthSystemId → health_system_id (SAFE TO ADD)
- slotDuration → slot_duration (SAFE TO ADD)
- startTime → start_time (SAFE TO ADD)
- endTime → end_time (SAFE TO ADD)
- lunchStart → lunch_start (SAFE TO ADD)
- lunchDuration → lunch_duration (SAFE TO ADD)
- bufferBetweenAppts → buffer_between_appts (SAFE TO ADD)
- allowDoubleBooking → allow_double_booking (SAFE TO ADD)
- maxPatientsPerDay → max_patients_per_day (SAFE TO ADD)
- daysOfWeek → days_of_week (SAFE TO ADD)
- isDefault → is_default (SAFE TO ADD)
- createdBy → created_by (SAFE TO ADD)

### Table: signatures
#### Extra columns in database:
- encounter_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "encounterId" to schema.ts instead of removing from DB
- signed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signedBy" to schema.ts instead of removing from DB
- signature_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signatureType" to schema.ts instead of removing from DB
- ip_address (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "ipAddress" to schema.ts instead of removing from DB
- attestation_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "attestationText" to schema.ts instead of removing from DB
#### Missing columns in database:
- userId → user_id (SAFE TO ADD)

### Table: signed_orders
#### Extra columns in database:
- delivery_method (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryMethod" to schema.ts instead of removing from DB
- delivery_status (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryStatus" to schema.ts instead of removing from DB
- delivery_attempts (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryAttempts" to schema.ts instead of removing from DB
- last_delivery_attempt (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastDeliveryAttempt" to schema.ts instead of removing from DB
- delivery_error (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryError" to schema.ts instead of removing from DB
- can_change_delivery (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "canChangeDelivery" to schema.ts instead of removing from DB
- delivery_lock_reason (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryLockReason" to schema.ts instead of removing from DB
- original_delivery_method (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalDeliveryMethod" to schema.ts instead of removing from DB
- delivery_changes (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deliveryChanges" to schema.ts instead of removing from DB
- signed_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signedAt" to schema.ts instead of removing from DB
- signed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signedBy" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: social_history
#### Extra columns in database:
- details (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "details" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- start_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "startDate" to schema.ts instead of removing from DB
- end_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "endDate" to schema.ts instead of removing from DB
- quantity (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "quantity" to schema.ts instead of removing from DB
- frequency (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "frequency" to schema.ts instead of removing from DB
- notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "notes" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- risk_level (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "riskLevel" to schema.ts instead of removing from DB
- counseling_provided (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "counselingProvided" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- currentStatus → current_status (SAFE TO ADD)
- historyNotes → history_notes (SAFE TO ADD)
- lastUpdatedEncounter → last_updated_encounter (SAFE TO ADD)

### Table: subscription_history
#### Extra columns in database:
- previous_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "previousStatus" to schema.ts instead of removing from DB
- new_status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "newStatus" to schema.ts instead of removing from DB
- changed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "changedBy" to schema.ts instead of removing from DB
- reason (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "reason" to schema.ts instead of removing from DB
- billing_impact (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingImpact" to schema.ts instead of removing from DB
- effective_date (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "effectiveDate" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- changedAt → changed_at (SAFE TO ADD)
- gracePeriodEnds → grace_period_ends (SAFE TO ADD)
- dataExpiresAt → data_expires_at (SAFE TO ADD)
- metadata → metadata (SAFE TO ADD)

### Table: subscription_keys
#### Extra columns in database:
- health_system_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "healthSystemId" to schema.ts instead of removing from DB
- key_value (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "keyValue" to schema.ts instead of removing from DB
- key_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "keyType" to schema.ts instead of removing from DB
- created_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdBy" to schema.ts instead of removing from DB
- assigned_to (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assignedTo" to schema.ts instead of removing from DB
- assigned_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assignedAt" to schema.ts instead of removing from DB
- expires_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "expiresAt" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- usage_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "usageCount" to schema.ts instead of removing from DB
- last_used_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUsedAt" to schema.ts instead of removing from DB
- metadata (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "metadata" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
#### Missing columns in database:
- key → key (SAFE TO ADD)

### Table: surgical_history
#### Extra columns in database:
- surgeon (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "surgeon" to schema.ts instead of removing from DB
- facility (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "facility" to schema.ts instead of removing from DB
- findings (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "findings" to schema.ts instead of removing from DB
- implants_used (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "implantsUsed" to schema.ts instead of removing from DB
- pathology_results (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "pathologyResults" to schema.ts instead of removing from DB
- recovery_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "recoveryNotes" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- procedure_code (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "procedureCode" to schema.ts instead of removing from DB
- approach (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "approach" to schema.ts instead of removing from DB
- duration_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "durationMinutes" to schema.ts instead of removing from DB
- estimated_blood_loss_ml (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "estimatedBloodLossMl" to schema.ts instead of removing from DB
- specimens_removed (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "specimensRemoved" to schema.ts instead of removing from DB
- drains_placed (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "drainsPlaced" to schema.ts instead of removing from DB
- post_op_diagnosis (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "postOpDiagnosis" to schema.ts instead of removing from DB
- discharge_instructions (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "dischargeInstructions" to schema.ts instead of removing from DB
- follow_up_date (date) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "followUpDate" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- last_updated_encounter (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUpdatedEncounter" to schema.ts instead of removing from DB
#### Missing columns in database:
- outcome → outcome (SAFE TO ADD)

### Table: template_shares
#### Extra columns in database:
- shared_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sharedBy" to schema.ts instead of removing from DB
- shared_with (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sharedWith" to schema.ts instead of removing from DB
- status (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "status" to schema.ts instead of removing from DB
- shared_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sharedAt" to schema.ts instead of removing from DB
- responded_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "respondedAt" to schema.ts instead of removing from DB
- share_message (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "shareMessage" to schema.ts instead of removing from DB
- can_modify (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "canModify" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB

### Table: template_versions
#### Extra columns in database:
- version_number (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "versionNumber" to schema.ts instead of removing from DB
- change_description (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "changeDescription" to schema.ts instead of removing from DB
- changed_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "changedBy" to schema.ts instead of removing from DB
- example_note_snapshot (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "exampleNoteSnapshot" to schema.ts instead of removing from DB
- generated_prompt_snapshot (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "generatedPromptSnapshot" to schema.ts instead of removing from DB
- change_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "changeType" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: user_assistant_threads
#### Extra columns in database:
- assistant_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assistantType" to schema.ts instead of removing from DB
- thread_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "threadId" to schema.ts instead of removing from DB
- assistant_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "assistantId" to schema.ts instead of removing from DB
- context (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "context" to schema.ts instead of removing from DB
- last_message_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastMessageAt" to schema.ts instead of removing from DB
- message_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "messageCount" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: user_edit_patterns
#### Extra columns in database:
- note_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "noteType" to schema.ts instead of removing from DB
- section_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sectionName" to schema.ts instead of removing from DB
- edit_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "editType" to schema.ts instead of removing from DB
- original_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "originalText" to schema.ts instead of removing from DB
- edited_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "editedText" to schema.ts instead of removing from DB
- edit_frequency (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "editFrequency" to schema.ts instead of removing from DB
- confidence_score (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "confidenceScore" to schema.ts instead of removing from DB
- last_occurrence (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastOccurrence" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB

### Table: user_locations
#### Extra columns in database:
- location_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "locationId" to schema.ts instead of removing from DB
- is_primary (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isPrimary" to schema.ts instead of removing from DB
- permissions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "permissions" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- role_at_location (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "roleAtLocation" to schema.ts instead of removing from DB

### Table: user_note_preferences
#### Extra columns in database:
- last_selected_note_type (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastSelectedNoteType" to schema.ts instead of removing from DB
- default_chief_complaint (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultChiefComplaint" to schema.ts instead of removing from DB
- default_physical_exam (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultPhysicalExam" to schema.ts instead of removing from DB
- default_ros_negatives (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultRosNegatives" to schema.ts instead of removing from DB
- default_assessment_style (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultAssessmentStyle" to schema.ts instead of removing from DB
- use_voice_commands (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "useVoiceCommands" to schema.ts instead of removing from DB
- auto_save_interval (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "autoSaveInterval" to schema.ts instead of removing from DB
- show_template_suggestions (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "showTemplateSuggestions" to schema.ts instead of removing from DB
- include_time_stamps (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "includeTimeStamps" to schema.ts instead of removing from DB
- default_note_font_size (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultNoteFontSize" to schema.ts instead of removing from DB
- default_macro_set (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultMacroSet" to schema.ts instead of removing from DB
- preferred_exam_order (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "preferredExamOrder" to schema.ts instead of removing from DB
- custom_normal_exams (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "customNormalExams" to schema.ts instead of removing from DB
- abbreviation_expansions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "abbreviationExpansions" to schema.ts instead of removing from DB
- quick_phrases (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "quickPhrases" to schema.ts instead of removing from DB
- billing_reminder_enabled (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "billingReminderEnabled" to schema.ts instead of removing from DB
- sign_reminder_minutes (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "signReminderMinutes" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- default_soap_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultSoapTemplate" to schema.ts instead of removing from DB
- default_apso_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultApsoTemplate" to schema.ts instead of removing from DB
- default_progress_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultProgressTemplate" to schema.ts instead of removing from DB
- default_h_and_p_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultHAndPTemplate" to schema.ts instead of removing from DB
- default_discharge_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultDischargeTemplate" to schema.ts instead of removing from DB
- default_procedure_template (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "defaultProcedureTemplate" to schema.ts instead of removing from DB
- global_ai_learning (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "globalAiLearning" to schema.ts instead of removing from DB
- learning_aggressiveness (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "learningAggressiveness" to schema.ts instead of removing from DB
- remember_last_template (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "rememberLastTemplate" to schema.ts instead of removing from DB
- show_template_preview (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "showTemplatePreview" to schema.ts instead of removing from DB
- auto_save_changes (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "autoSaveChanges" to schema.ts instead of removing from DB
- medical_problems_display_threshold (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "medicalProblemsDisplayThreshold" to schema.ts instead of removing from DB
- ranking_weights (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "rankingWeights" to schema.ts instead of removing from DB
- chart_panel_width (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "chartPanelWidth" to schema.ts instead of removing from DB
- enable_dense_view (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "enableDenseView" to schema.ts instead of removing from DB

### Table: user_note_templates
#### Extra columns in database:
- template_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "templateName" to schema.ts instead of removing from DB
- base_note_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "baseNoteType" to schema.ts instead of removing from DB
- display_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "displayName" to schema.ts instead of removing from DB
- is_personal (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isPersonal" to schema.ts instead of removing from DB
- is_default (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isDefault" to schema.ts instead of removing from DB
- created_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdBy" to schema.ts instead of removing from DB
- shared_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sharedBy" to schema.ts instead of removing from DB
- example_note (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "exampleNote" to schema.ts instead of removing from DB
- base_note_text (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "baseNoteText" to schema.ts instead of removing from DB
- inline_comments (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "inlineComments" to schema.ts instead of removing from DB
- has_comments (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "hasComments" to schema.ts instead of removing from DB
- generated_prompt (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "generatedPrompt" to schema.ts instead of removing from DB
- prompt_version (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "promptVersion" to schema.ts instead of removing from DB
- enable_ai_learning (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "enableAiLearning" to schema.ts instead of removing from DB
- learning_confidence (numeric) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "learningConfidence" to schema.ts instead of removing from DB
- last_learning_update (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastLearningUpdate" to schema.ts instead of removing from DB
- usage_count (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "usageCount" to schema.ts instead of removing from DB
- last_used (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUsed" to schema.ts instead of removing from DB
- version (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "version" to schema.ts instead of removing from DB
- parent_template_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "parentTemplateId" to schema.ts instead of removing from DB
- active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "active" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: user_problem_list_preferences
#### Extra columns in database:
- id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "id" to schema.ts instead of removing from DB
- show_resolved_problems (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "showResolvedProblems" to schema.ts instead of removing from DB
- show_inactive_problems (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "showInactiveProblems" to schema.ts instead of removing from DB
- sort_by (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sortBy" to schema.ts instead of removing from DB
- group_by_category (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "groupByCategory" to schema.ts instead of removing from DB
- highlight_recent_changes (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "highlightRecentChanges" to schema.ts instead of removing from DB
- recent_change_days (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "recentChangeDays" to schema.ts instead of removing from DB
- max_problems_displayed (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "maxProblemsDisplayed" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: user_session_locations
#### Extra columns in database:
- location_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "locationId" to schema.ts instead of removing from DB
- session_id (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sessionId" to schema.ts instead of removing from DB
- is_primary (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isPrimary" to schema.ts instead of removing from DB
- permissions (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "permissions" to schema.ts instead of removing from DB
- remembered (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "remembered" to schema.ts instead of removing from DB
- created_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp with time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- is_active (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "isActive" to schema.ts instead of removing from DB
- remember_selection (boolean) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "rememberSelection" to schema.ts instead of removing from DB
- selected_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "selectedAt" to schema.ts instead of removing from DB

### Table: users
#### Extra columns in database:
- license_state (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "licenseState" to schema.ts instead of removing from DB
- bio (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bio" to schema.ts instead of removing from DB
- is_active (boolean) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "isActive" to schema.ts instead of removing from DB
- profile_image_url (character varying) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "profileImageUrl" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 5 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB

### Table: vitals
#### Extra columns in database:
- blood_pressure_systolic (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bloodPressureSystolic" to schema.ts instead of removing from DB
- blood_pressure_diastolic (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bloodPressureDiastolic" to schema.ts instead of removing from DB
- blood_glucose (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "bloodGlucose" to schema.ts instead of removing from DB
- extracted_from_attachment_id (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractedFromAttachmentId" to schema.ts instead of removing from DB
- extraction_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "extractionNotes" to schema.ts instead of removing from DB
- consolidation_reasoning (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "consolidationReasoning" to schema.ts instead of removing from DB
- merged_ids (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "mergedIds" to schema.ts instead of removing from DB
- visit_history (jsonb) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "visitHistory" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- updated_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "updatedAt" to schema.ts instead of removing from DB
- systolic (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "systolic" to schema.ts instead of removing from DB
- diastolic (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "diastolic" to schema.ts instead of removing from DB
- processing_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "processingNotes" to schema.ts instead of removing from DB
- source_notes (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "sourceNotes" to schema.ts instead of removing from DB
- entered_by (integer) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "enteredBy" to schema.ts instead of removing from DB

### Table: webauthn_credentials
#### Extra columns in database:
- credential_id (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "credentialId" to schema.ts instead of removing from DB
- public_key (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "publicKey" to schema.ts instead of removing from DB
- counter (bigint) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "counter" to schema.ts instead of removing from DB
- device_type (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deviceType" to schema.ts instead of removing from DB
- transports (ARRAY) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "transports" to schema.ts instead of removing from DB
- created_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "createdAt" to schema.ts instead of removing from DB
- last_used_at (timestamp without time zone) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "lastUsedAt" to schema.ts instead of removing from DB
- registered_device (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "registeredDevice" to schema.ts instead of removing from DB
- device_name (text) - **HAS 0 NON-NULL VALUES** ⚠️
  → Consider adding "deviceName" to schema.ts instead of removing from DB

## Summary
- Total risky columns with data: 925
- Safe fixes identified: 476

## ⚠️  RISKY COLUMNS (contain data):
- Table dashboards contains 0 rows
- Table migration_invitations contains 0 rows
- Table session contains 1 rows
- admin_prompt_reviews.prompt_id has 0 non-null values
- admin_prompt_reviews.reviewer_id has 0 non-null values
- admin_prompt_reviews.feedback has 0 non-null values
- admin_prompt_reviews.updated_at has 0 non-null values
- allergies.encounter_id has 0 non-null values
- allergies.notes has 0 non-null values
- allergies.verified_by has 0 non-null values
- allergies.verified_at has 0 non-null values
- allergies.source_timestamp has 0 non-null values
- allergies.extracted_from_attachment_id has 0 non-null values
- allergies.extraction_notes has 0 non-null values
- allergies.reaction_type has 0 non-null values
- allergies.consolidation_reasoning has 0 non-null values
- allergies.merged_ids has 0 non-null values
- allergies.visit_history has 0 non-null values
- allergies.created_at has 0 non-null values
- allergies.updated_at has 0 non-null values
- allergies.last_reaction has 0 non-null values
- allergies.source_notes has 0 non-null values
- allergies.entered_by has 0 non-null values
- allergies.temporal_conflict_resolution has 0 non-null values
- allergies.last_updated_encounter has 0 non-null values
- appointment_duration_history.predicted_duration has 0 non-null values
- appointment_duration_history.created_at has 0 non-null values
- appointment_resource_requirements.resource_type has 0 non-null values
- appointment_resource_requirements.resource_id has 0 non-null values
- appointment_resource_requirements.created_at has 0 non-null values
- appointment_types.name has 4 non-null values
- appointment_types.duration_minutes has 4 non-null values
- appointment_types.color has 4 non-null values
- appointment_types.description has 0 non-null values
- appointment_types.is_active has 4 non-null values
- appointment_types.created_at has 4 non-null values
- appointment_types.updated_at has 4 non-null values
- appointments.provider_id has 0 non-null values
- appointments.location_id has 0 non-null values
- appointments.appointment_type_id has 0 non-null values
- appointments.start_time has 0 non-null values
- appointments.end_time has 0 non-null values
- appointments.duration_minutes has 0 non-null values
- appointments.ai_predicted_duration has 0 non-null values
- appointments.status has 0 non-null values
- appointments.chief_complaint has 0 non-null values
- appointments.notes has 0 non-null values
- appointments.checked_in_at has 0 non-null values
- appointments.checked_in_by has 0 non-null values
- appointments.completed_at has 0 non-null values
- appointments.completed_by has 0 non-null values
- appointments.cancelled_at has 0 non-null values
- appointments.cancelled_by has 0 non-null values
- appointments.cancellation_reason has 0 non-null values
- appointments.created_at has 0 non-null values
- appointments.updated_at has 0 non-null values
- article_comments.author_name has 0 non-null values
- article_comments.author_email has 0 non-null values
- article_comments.content has 0 non-null values
- article_comments.is_approved has 0 non-null values
- article_comments.parent_id has 0 non-null values
- article_comments.created_at has 0 non-null values
- article_revisions.content has 1 non-null values
- article_revisions.revision_note has 1 non-null values
- article_revisions.revision_type has 1 non-null values
- article_revisions.created_by has 1 non-null values
- article_revisions.created_at has 1 non-null values
- asymmetric_scheduling_config.weekday_schedule has 0 non-null values
- asymmetric_scheduling_config.custom_rules has 0 non-null values
- asymmetric_scheduling_config.effective_date has 0 non-null values
- attachment_extracted_content.page_number has 0 non-null values
- attachment_extracted_content.content_type has 0 non-null values
- attachment_extracted_content.structured_data has 0 non-null values
- attachment_extracted_content.confidence_score has 0 non-null values
- attachment_extracted_content.extraction_method has 0 non-null values
- authentication_logs.error_message has 0 non-null values
- authentication_logs.created_at has 0 non-null values
- clinic_admin_verifications.applicant_first_name has 0 non-null values
- clinic_admin_verifications.applicant_last_name has 0 non-null values
- clinic_admin_verifications.applicant_email has 0 non-null values
- clinic_admin_verifications.applicant_phone has 0 non-null values
- clinic_admin_verifications.address_street has 0 non-null values
- clinic_admin_verifications.address_city has 0 non-null values
- clinic_admin_verifications.address_state has 0 non-null values
- clinic_admin_verifications.address_zip has 0 non-null values
- clinic_admin_verifications.website has 0 non-null values
- clinic_admin_verifications.preferred_ehr_tier has 0 non-null values
- clinic_admin_verifications.verification_status has 0 non-null values
- clinic_admin_verifications.verification_score has 0 non-null values
- clinic_admin_verifications.verification_details has 0 non-null values
- clinic_admin_verifications.risk_assessment has 0 non-null values
- clinic_admin_verifications.automated_decision has 0 non-null values
- clinic_admin_verifications.automated_recommendations has 0 non-null values
- clinic_admin_verifications.manual_review_notes has 0 non-null values
- clinic_admin_verifications.reviewer_id has 0 non-null values
- clinic_admin_verifications.reviewed_at has 0 non-null values
- clinic_admin_verifications.api_verification_results has 0 non-null values
- clinic_admin_verifications.created_at has 0 non-null values
- clinic_admin_verifications.updated_at has 0 non-null values
- data_modification_logs.action has 0 non-null values
- data_modification_logs.old_values has 0 non-null values
- data_modification_logs.new_values has 0 non-null values
- data_modification_logs.reason has 0 non-null values
- data_modification_logs.ip_address has 0 non-null values
- data_modification_logs.user_agent has 0 non-null values
- data_modification_logs.created_at has 0 non-null values
- diagnoses.claim_submission_status has 0 non-null values
- diagnoses.claim_id has 0 non-null values
- diagnoses.clearinghouse_id has 0 non-null values
- diagnoses.payer_id has 0 non-null values
- diagnoses.allowed_amount has 0 non-null values
- diagnoses.paid_amount has 0 non-null values
- diagnoses.patient_responsibility has 0 non-null values
- diagnoses.adjustment_amount has 0 non-null values
- diagnoses.denial_reason has 0 non-null values
- diagnoses.denial_code has 0 non-null values
- diagnoses.appeal_status has 0 non-null values
- diagnoses.appeal_deadline has 0 non-null values
- diagnoses.billing_notes has 0 non-null values
- diagnoses.last_billing_action has 0 non-null values
- diagnoses.assigned_biller has 0 non-null values
- diagnoses.modifier_applied has 0 non-null values
- diagnoses.billing_action_date has 0 non-null values
- document_processing_queue.priority has 0 non-null values
- document_processing_queue.processor_type has 0 non-null values
- document_processing_queue.processing_metadata has 0 non-null values
- document_processing_queue.error_message has 0 non-null values
- document_processing_queue.retry_count has 0 non-null values
- document_processing_queue.started_at has 0 non-null values
- document_processing_queue.completed_at has 0 non-null values
- email_notifications.recipient_email has 0 non-null values
- email_notifications.subject has 0 non-null values
- email_notifications.body_html has 0 non-null values
- email_notifications.body_text has 0 non-null values
- email_notifications.related_user_id has 0 non-null values
- email_notifications.related_entity_type has 0 non-null values
- email_notifications.related_entity_id has 0 non-null values
- email_notifications.status has 0 non-null values
- email_notifications.sent_at has 0 non-null values
- email_notifications.error_message has 0 non-null values
- email_notifications.retry_count has 0 non-null values
- email_notifications.created_at has 0 non-null values
- emergency_access_logs.access_reason has 0 non-null values
- emergency_access_logs.override_restrictions has 0 non-null values
- emergency_access_logs.supervisor_approval has 0 non-null values
- emergency_access_logs.access_duration has 0 non-null values
- emergency_access_logs.ip_address has 0 non-null values
- emergency_access_logs.created_at has 0 non-null values
- encounters.encounter_date has 1 non-null values
- encounters.visit_reason has 0 non-null values
- encounters.status has 1 non-null values
- encounters.location has 0 non-null values
- encounters.insurance_verified has 1 non-null values
- encounters.copay_collected has 0 non-null values
- encounters.notes has 0 non-null values
- encounters.created_at has 1 non-null values
- encounters.updated_at has 1 non-null values
- encounters.location_id has 0 non-null values
- encounters.ai_scribe_mode has 1 non-null values
- encounters.signed_by has 0 non-null values
- encounters.signed_at has 0 non-null values
- encounters.is_signed has 1 non-null values
- encounters.appointment_id has 0 non-null values
- encounters.transcription_id has 0 non-null values
- encounters.assistant_thread_id has 0 non-null values
- encounters.voice_recording_url has 0 non-null values
- encounters.alerts has 1 non-null values
- encounters.draft_orders has 1 non-null values
- encounters.draft_diagnoses has 1 non-null values
- encounters.cpt_codes has 1 non-null values
- encounters.signature_id has 0 non-null values
- encounters.last_chart_update has 0 non-null values
- encounters.chart_update_duration has 0 non-null values
- external_labs.patient_id has 0 non-null values
- external_labs.test_name has 0 non-null values
- external_labs.test_date has 0 non-null values
- external_labs.result_value has 0 non-null values
- external_labs.unit has 0 non-null values
- external_labs.reference_range has 0 non-null values
- external_labs.abnormal_flag has 0 non-null values
- external_labs.ordering_provider has 0 non-null values
- external_labs.status has 0 non-null values
- external_labs.attachment_id has 0 non-null values
- family_history.relationship has 0 non-null values
- family_history.condition has 0 non-null values
- family_history.age_at_onset has 0 non-null values
- family_history.age_at_death has 0 non-null values
- family_history.cause_of_death has 0 non-null values
- family_history.notes has 0 non-null values
- family_history.source_type has 0 non-null values
- family_history.source_confidence has 0 non-null values
- family_history.extracted_from_attachment_id has 0 non-null values
- family_history.extraction_notes has 0 non-null values
- family_history.maternal_side has 0 non-null values
- family_history.living_status has 0 non-null values
- family_history.genetic_marker has 0 non-null values
- family_history.consolidation_reasoning has 0 non-null values
- family_history.merged_ids has 0 non-null values
- family_history.created_at has 0 non-null values
- family_history.updated_at has 0 non-null values
- gpt_lab_review_notes.lab_order_id has 0 non-null values
- gpt_lab_review_notes.review_type has 0 non-null values
- gpt_lab_review_notes.ai_interpretation has 0 non-null values
- gpt_lab_review_notes.clinical_significance has 0 non-null values
- gpt_lab_review_notes.follow_up_recommendations has 0 non-null values
- gpt_lab_review_notes.risk_assessment has 0 non-null values
- gpt_lab_review_notes.reviewed_by has 0 non-null values
- gpt_lab_review_notes.review_status has 0 non-null values
- gpt_lab_review_notes.created_at has 0 non-null values
- gpt_lab_review_notes.updated_at has 0 non-null values
- health_systems.type has 1 non-null values
- health_systems.subscription_key has 0 non-null values
- health_systems.is_migration has 5 non-null values
- health_systems.stripe_customer_id has 0 non-null values
- health_systems.metadata has 5 non-null values
- health_systems.created_at has 5 non-null values
- health_systems.updated_at has 5 non-null values
- health_systems.subscription_limits has 5 non-null values
- health_systems.active_user_count has 5 non-null values
- health_systems.billing_details has 5 non-null values
- health_systems.active has 5 non-null values
- health_systems.status has 5 non-null values
- imaging_orders.provider_id has 0 non-null values
- imaging_orders.imaging_type has 0 non-null values
- imaging_orders.indication has 0 non-null values
- imaging_orders.priority has 0 non-null values
- imaging_orders.status has 0 non-null values
- imaging_orders.facility_id has 0 non-null values
- imaging_orders.scheduled_date has 0 non-null values
- imaging_orders.completed_date has 0 non-null values
- imaging_results.encounter_id has 0 non-null values
- imaging_results.study_type has 0 non-null values
- imaging_results.accession_number has 0 non-null values
- imaging_results.performing_facility has 0 non-null values
- imaging_results.ordering_provider_id has 0 non-null values
- imaging_results.reading_radiologist has 0 non-null values
- imaging_results.recommendations has 0 non-null values
- imaging_results.comparison_studies has 0 non-null values
- imaging_results.technique has 0 non-null values
- imaging_results.contrast_used has 0 non-null values
- imaging_results.contrast_type has 0 non-null values
- imaging_results.radiation_dose has 0 non-null values
- imaging_results.number_of_images has 0 non-null values
- imaging_results.critical_findings has 0 non-null values
- imaging_results.critical_findings_communicated_at has 0 non-null values
- imaging_results.report_status has 0 non-null values
- imaging_results.report_finalized_at has 0 non-null values
- imaging_results.addendum has 0 non-null values
- imaging_results.addendum_date has 0 non-null values
- imaging_results.procedure_code has 0 non-null values
- imaging_results.diagnostic_quality has 0 non-null values
- imaging_results.limitations has 0 non-null values
- imaging_results.follow_up_needed has 0 non-null values
- imaging_results.follow_up_timeframe has 0 non-null values
- imaging_results.bi_rads_score has 0 non-null values
- imaging_results.lung_rads_score has 0 non-null values
- imaging_results.ti_rads_score has 0 non-null values
- imaging_results.pi_rads_score has 0 non-null values
- imaging_results.liver_rads_score has 0 non-null values
- imaging_results.incidental_findings has 0 non-null values
- imaging_results.relevant_history has 0 non-null values
- imaging_results.clinical_indication has 0 non-null values
- imaging_results.protocol_name has 0 non-null values
- imaging_results.series_count has 0 non-null values
- imaging_results.image_count has 0 non-null values
- imaging_results.study_size_mb has 0 non-null values
- imaging_results.pacs_study_uid has 0 non-null values
- imaging_results.dicom_retrieval_url has 0 non-null values
- imaging_results.external_system_id has 0 non-null values
- imaging_results.extracted_from_attachment_id has 0 non-null values
- imaging_results.extraction_notes has 0 non-null values
- imaging_results.consolidation_reasoning has 0 non-null values
- imaging_results.merged_ids has 0 non-null values
- imaging_results.visit_history has 0 non-null values
- imaging_results.created_at has 0 non-null values
- imaging_results.updated_at has 0 non-null values
- lab_orders.order_id has 0 non-null values
- lab_orders.result_received_at has 0 non-null values
- lab_orders.status has 0 non-null values
- lab_orders.transmission_response has 0 non-null values
- lab_orders.result_data has 0 non-null values
- lab_orders.created_at has 0 non-null values
- lab_orders.updated_at has 0 non-null values
- lab_orders.provider_id has 0 non-null values
- lab_orders.specimen_source has 0 non-null values
- lab_orders.special_instructions has 0 non-null values
- lab_orders.collection_site has 0 non-null values
- lab_orders.collected_by has 0 non-null values
- lab_orders.external_lab has 0 non-null values
- lab_orders.result_status has 0 non-null values
- lab_orders.reference_range has 0 non-null values
- lab_orders.expected_turnaround has 0 non-null values
- lab_orders.external_status has 0 non-null values
- lab_orders.results has 0 non-null values
- lab_orders.abnormal_flags has 0 non-null values
- lab_orders.discontinued_at has 0 non-null values
- lab_orders.discontinued_by has 0 non-null values
- lab_orders.discontinued_reason has 0 non-null values
- lab_orders.critical_values has 0 non-null values
- lab_orders.stat_order has 0 non-null values
- lab_orders.provider_notes has 0 non-null values
- lab_orders.patient_preparation has 0 non-null values
- lab_orders.collection_priority has 0 non-null values
- lab_orders.processing_notes has 0 non-null values
- lab_orders.billing_code has 0 non-null values
- lab_orders.insurance_preauth_date has 0 non-null values
- lab_orders.actual_cost has 0 non-null values
- lab_orders.patient_consent has 0 non-null values
- lab_orders.consent_date has 0 non-null values
- lab_orders.insurance_coverage has 0 non-null values
- lab_orders.patient_copay has 0 non-null values
- lab_orders.billing_status has 0 non-null values
- lab_orders.billing_date has 0 non-null values
- lab_orders.cancellation_reason has 0 non-null values
- lab_orders.result_interpretation has 0 non-null values
- lab_orders.ai_suggested_tests has 0 non-null values
- lab_orders.ai_analysis has 0 non-null values
- lab_orders.result_notification_sent has 0 non-null values
- lab_orders.result_notification_date has 0 non-null values
- lab_orders.performing_lab_id has 0 non-null values
- lab_orders.lab_account_number has 0 non-null values
- lab_orders.risk_flags has 0 non-null values
- lab_orders.quality_control_status has 0 non-null values
- lab_orders.quality_control_notes has 0 non-null values
- lab_orders.repeat_test_reason has 0 non-null values
- lab_orders.original_order_id has 0 non-null values
- lab_orders.test_methodology has 0 non-null values
- lab_orders.quality_measure has 0 non-null values
- lab_orders.processing_lab_name has 0 non-null values
- lab_orders.processing_lab_director has 0 non-null values
- lab_orders.test_validation_status has 0 non-null values
- lab_orders.regulatory_compliance has 0 non-null values
- lab_orders.sample_rejection_reason has 0 non-null values
- lab_orders.preventive_care_flag has 0 non-null values
- lab_orders.clinical_trial_id has 0 non-null values
- lab_orders.research_study_id has 0 non-null values
- lab_orders.patient_location has 0 non-null values
- lab_orders.ordering_facility_id has 0 non-null values
- lab_orders.test_performed_at has 0 non-null values
- lab_reference_ranges.test_code has 0 non-null values
- lab_reference_ranges.reference_low has 0 non-null values
- lab_reference_ranges.reference_high has 0 non-null values
- lab_reference_ranges.critical_low has 0 non-null values
- lab_reference_ranges.critical_high has 0 non-null values
- lab_reference_ranges.unit has 0 non-null values
- lab_reference_ranges.notes has 0 non-null values
- lab_reference_ranges.created_at has 0 non-null values
- lab_reference_ranges.updated_at has 0 non-null values
- lab_results.result_units has 0 non-null values
- lab_results.reference_range has 0 non-null values
- lab_results.age_gender_adjusted_range has 0 non-null values
- lab_results.abnormal_flag has 0 non-null values
- lab_results.critical_flag has 0 non-null values
- lab_results.delta_flag has 0 non-null values
- lab_results.specimen_collected_at has 0 non-null values
- lab_results.specimen_received_at has 0 non-null values
- lab_results.result_available_at has 0 non-null values
- lab_results.result_finalized_at has 0 non-null values
- lab_results.received_at has 0 non-null values
- lab_results.external_lab_id has 0 non-null values
- lab_results.external_result_id has 0 non-null values
- lab_results.hl7_message_id has 0 non-null values
- lab_results.instrument_id has 0 non-null values
- lab_results.result_status has 0 non-null values
- lab_results.verification_status has 0 non-null values
- lab_results.result_comments has 0 non-null values
- lab_results.reviewed_by has 0 non-null values
- lab_results.reviewed_at has 0 non-null values
- lab_results.provider_notes has 0 non-null values
- lab_results.needs_review has 0 non-null values
- lab_results.review_status has 0 non-null values
- lab_results.review_note has 0 non-null values
- lab_results.review_template has 0 non-null values
- lab_results.review_history has 0 non-null values
- lab_results.patient_communication_sent has 0 non-null values
- lab_results.patient_communication_method has 0 non-null values
- lab_results.patient_communication_sent_at has 0 non-null values
- lab_results.patient_notified_by has 0 non-null values
- lab_results.patient_message has 0 non-null values
- lab_results.patient_message_sent_at has 0 non-null values
- lab_results.source_type has 0 non-null values
- lab_results.source_confidence has 0 non-null values
- lab_results.extracted_from_attachment_id has 0 non-null values
- lab_results.extraction_notes has 0 non-null values
- lab_results.consolidation_reasoning has 0 non-null values
- lab_results.merged_ids has 0 non-null values
- lab_results.visit_history has 0 non-null values
- lab_results.created_at has 0 non-null values
- lab_results.updated_at has 0 non-null values
- locations.zip has 1 non-null values
- locations.created_at has 1 non-null values
- locations.updated_at has 1 non-null values
- locations.services has 1 non-null values
- locations.has_lab has 1 non-null values
- locations.has_imaging has 1 non-null values
- locations.has_pharmacy has 1 non-null values
- magic_links.used has 0 non-null values
- medical_history.condition has 0 non-null values
- medical_history.onset_date has 0 non-null values
- medical_history.resolution_date has 0 non-null values
- medical_history.status has 0 non-null values
- medical_history.severity has 0 non-null values
- medical_history.notes has 0 non-null values
- medical_history.created_at has 0 non-null values
- medical_history.updated_at has 0 non-null values
- medical_problems.encounter_id has 0 non-null values
- medical_problems.icd10_code has 0 non-null values
- medical_problems.snomed_code has 0 non-null values
- medical_problems.onset_date has 0 non-null values
- medical_problems.resolution_date has 0 non-null values
- medical_problems.notes has 0 non-null values
- medical_problems.severity has 0 non-null values
- medical_problems.source_type has 0 non-null values
- medical_problems.source_confidence has 0 non-null values
- medical_problems.extracted_from_attachment_id has 0 non-null values
- medical_problems.extraction_notes has 0 non-null values
- medical_problems.provider_id has 0 non-null values
- medical_problems.date_diagnosed has 0 non-null values
- medical_problems.last_updated has 0 non-null values
- medical_problems.verification_status has 0 non-null values
- medical_problems.verification_date has 0 non-null values
- medical_problems.verified_by has 0 non-null values
- medical_problems.clinical_status has 0 non-null values
- medical_problems.body_site has 0 non-null values
- medical_problems.body_site_laterality has 0 non-null values
- medical_problems.category has 0 non-null values
- medical_problems.last_reviewed_date has 0 non-null values
- medical_problems.reviewed_by has 0 non-null values
- medical_problems.patient_education_provided has 0 non-null values
- medical_problems.care_plan_status has 0 non-null values
- medical_problems.functional_impact has 0 non-null values
- medical_problems.prognosis has 0 non-null values
- medical_problems.risk_factors has 0 non-null values
- medical_problems.associated_conditions has 0 non-null values
- medical_problems.treatment_goals has 0 non-null values
- medical_problems.monitoring_parameters has 0 non-null values
- medical_problems.follow_up_required has 0 non-null values
- medical_problems.follow_up_date has 0 non-null values
- medical_problems.problem_ranking has 0 non-null values
- medical_problems.display_in_summary has 0 non-null values
- medical_problems.patient_aware has 0 non-null values
- medical_problems.caregiver_aware has 0 non-null values
- medical_problems.reportable_condition has 0 non-null values
- medical_problems.reported_date has 0 non-null values
- medical_problems.clinical_priority has 0 non-null values
- medical_problems.social_determinants has 0 non-null values
- medical_problems.cultural_considerations has 0 non-null values
- medical_problems.patient_goals has 0 non-null values
- medical_problems.barriers_to_care has 0 non-null values
- medical_problems.quality_measures has 0 non-null values
- medical_problems.outcome_measures has 0 non-null values
- medical_problems.care_team_members has 0 non-null values
- medical_problems.care_coordination_notes has 0 non-null values
- medical_problems.original_problem_text has 0 non-null values
- medical_problems.mapped_by_ai has 0 non-null values
- medical_problems.ai_confidence_score has 0 non-null values
- medical_problems.human_verified has 0 non-null values
- medical_problems.consolidation_reasoning has 0 non-null values
- medical_problems.merged_ids has 0 non-null values
- medical_problems.visit_history has 0 non-null values
- medical_problems.created_at has 0 non-null values
- medical_problems.updated_at has 0 non-null values
- medication_formulary.medication_name has 0 non-null values
- medication_formulary.drug_class has 0 non-null values
- medication_formulary.dosage_forms has 0 non-null values
- medication_formulary.strengths has 0 non-null values
- medication_formulary.route has 0 non-null values
- medication_formulary.tier has 0 non-null values
- medication_formulary.prior_auth_required has 0 non-null values
- medication_formulary.quantity_limits has 0 non-null values
- medication_formulary.step_therapy has 0 non-null values
- medication_formulary.alternatives has 0 non-null values
- medication_formulary.active has 0 non-null values
- medication_formulary.created_at has 0 non-null values
- medications.form has 0 non-null values
- medications.discontinuation_date has 0 non-null values
- medications.discontinuation_reason has 0 non-null values
- medications.prescribed_by has 0 non-null values
- medications.prescribed_date has 0 non-null values
- medications.pharmacy has 0 non-null values
- medications.prescriber_notes has 0 non-null values
- medications.patient_instructions has 0 non-null values
- medications.rxnorm_code has 0 non-null values
- medications.refills has 0 non-null values
- medications.lot_number has 0 non-null values
- medications.expiration_date has 0 non-null values
- medications.manufacturer has 0 non-null values
- medications.dea_schedule has 0 non-null values
- medications.is_controlled has 0 non-null values
- medications.requires_prior_auth has 0 non-null values
- medications.prior_auth_number has 0 non-null values
- medications.formulary_status has 0 non-null values
- medications.therapeutic_class has 0 non-null values
- medications.source_type has 0 non-null values
- medications.source_confidence has 0 non-null values
- medications.extracted_from_attachment_id has 0 non-null values
- medications.extraction_notes has 0 non-null values
- medications.grouping_strategy has 0 non-null values
- medications.discontinuation_source has 0 non-null values
- medications.original_order_id has 0 non-null values
- medications.consolidation_reasoning has 0 non-null values
- medications.merged_ids has 0 non-null values
- medications.visit_history has 0 non-null values
- medications.created_at has 0 non-null values
- medications.updated_at has 0 non-null values
- medications.surescripts_id has 0 non-null values
- medications.reason_for_change has 0 non-null values
- medications.medication_history has 0 non-null values
- medications.change_log has 0 non-null values
- medications.source_notes has 0 non-null values
- medications.entered_by has 0 non-null values
- medications.related_medications has 0 non-null values
- medications.drug_interactions has 0 non-null values
- medications.pharmacy_order_id has 0 non-null values
- medications.insurance_auth_status has 0 non-null values
- medications.prior_auth_required has 0 non-null values
- medications.last_updated_encounter_id has 0 non-null values
- orders.provider_id has 0 non-null values
- orders.order_date has 0 non-null values
- orders.status has 0 non-null values
- orders.medication_dosage has 0 non-null values
- orders.medication_route has 0 non-null values
- orders.medication_frequency has 0 non-null values
- orders.medication_duration has 0 non-null values
- orders.medication_quantity has 0 non-null values
- orders.medication_refills has 0 non-null values
- orders.lab_test_name has 0 non-null values
- orders.lab_test_code has 0 non-null values
- orders.imaging_study_type has 0 non-null values
- orders.imaging_body_part has 0 non-null values
- orders.referral_specialty has 0 non-null values
- orders.referral_reason has 0 non-null values
- orders.instructions has 0 non-null values
- orders.diagnosis_codes has 0 non-null values
- orders.prescriber has 0 non-null values
- orders.prescriber_id has 0 non-null values
- orders.body_part has 0 non-null values
- orders.ndc_code has 0 non-null values
- orders.route has 0 non-null values
- orders.frequency has 0 non-null values
- orders.duration has 0 non-null values
- orders.start_date has 0 non-null values
- orders.end_date has 0 non-null values
- orders.indication has 0 non-null values
- orders.imaging_order_id has 0 non-null values
- orders.external_order_id has 0 non-null values
- organization_documents.organization_id has 0 non-null values
- organization_documents.file_path has 0 non-null values
- organization_documents.file_size has 0 non-null values
- organization_documents.mime_type has 0 non-null values
- organization_documents.active has 0 non-null values
- organization_documents.created_at has 0 non-null values
- organizations.type has 0 non-null values
- organizations.website has 0 non-null values
- organizations.updated_at has 0 non-null values
- patient_attachments.filename has 0 non-null values
- patient_attachments.original_filename has 0 non-null values
- patient_attachments.file_type has 0 non-null values
- patient_attachments.upload_date has 0 non-null values
- patient_attachments.document_type has 0 non-null values
- patient_attachments.document_date has 0 non-null values
- patient_attachments.ocr_text has 0 non-null values
- patient_attachments.ocr_completed has 0 non-null values
- patient_attachments.ocr_completed_at has 0 non-null values
- patient_attachments.processing_notes has 0 non-null values
- patient_attachments.extracted_data has 0 non-null values
- patient_attachments.chart_sections_updated has 0 non-null values
- patient_attachments.confidence_scores has 0 non-null values
- patient_attachments.hash_value has 0 non-null values
- patient_attachments.is_deleted has 0 non-null values
- patient_attachments.deleted_at has 0 non-null values
- patient_attachments.deleted_by has 0 non-null values
- patient_attachments.retention_date has 0 non-null values
- patient_attachments.access_count has 0 non-null values
- patient_attachments.last_accessed_at has 0 non-null values
- patient_attachments.source_system has 0 non-null values
- patient_attachments.external_id has 0 non-null values
- patient_order_preferences.provider_id has 0 non-null values
- patient_order_preferences.order_type has 0 non-null values
- patient_order_preferences.preferences has 0 non-null values
- patient_order_preferences.standing_orders has 0 non-null values
- patient_physical_findings.encounter_id has 0 non-null values
- patient_physical_findings.body_system has 0 non-null values
- patient_physical_findings.finding has 0 non-null values
- patient_physical_findings.severity has 0 non-null values
- patient_physical_findings.laterality has 0 non-null values
- patient_physical_findings.quality has 0 non-null values
- patient_physical_findings.duration has 0 non-null values
- patient_physical_findings.context has 0 non-null values
- patient_physical_findings.associated_symptoms has 0 non-null values
- patient_physical_findings.provider_id has 0 non-null values
- patient_physical_findings.examined_at has 0 non-null values
- patient_physical_findings.is_normal has 0 non-null values
- patient_physical_findings.requires_follow_up has 0 non-null values
- patient_physical_findings.follow_up_timeframe has 0 non-null values
- patient_physical_findings.created_at has 0 non-null values
- patient_physical_findings.updated_at has 0 non-null values
- patient_scheduling_patterns.provider_id has 0 non-null values
- patient_scheduling_patterns.pattern_type has 0 non-null values
- patient_scheduling_patterns.frequency has 0 non-null values
- patient_scheduling_patterns.time_preferences has 0 non-null values
- patient_scheduling_patterns.seasonal_variations has 0 non-null values
- patient_scheduling_patterns.created_at has 0 non-null values
- patient_scheduling_patterns.updated_at has 0 non-null values
- patients.external_id has 0 non-null values
- patients.middle_name has 0 non-null values
- patients.phone has 0 non-null values
- patients.phone_type has 0 non-null values
- patients.city has 0 non-null values
- patients.state has 0 non-null values
- patients.zip has 0 non-null values
- patients.insurance_provider has 0 non-null values
- patients.insurance_policy_number has 0 non-null values
- patients.insurance_group_number has 0 non-null values
- patients.emergency_contact_name has 0 non-null values
- patients.emergency_contact_phone has 0 non-null values
- patients.emergency_contact_relationship has 0 non-null values
- patients.preferred_language has 1 non-null values
- patients.race has 0 non-null values
- patients.ethnicity has 0 non-null values
- patients.created_at has 1 non-null values
- patients.updated_at has 1 non-null values
- patients.profile_photo_filename has 0 non-null values
- patients.consent_given has 1 non-null values
- phi_access_logs.created_at has 417 non-null values
- problem_rank_overrides.user_id has 0 non-null values
- problem_rank_overrides.patient_id has 0 non-null values
- problem_rank_overrides.custom_rank has 0 non-null values
- problem_rank_overrides.reason has 0 non-null values
- problem_rank_overrides.created_at has 0 non-null values
- problem_rank_overrides.updated_at has 0 non-null values
- provider_schedules.location_id has 0 non-null values
- provider_schedules.day_of_week has 0 non-null values
- provider_schedules.start_time has 0 non-null values
- provider_schedules.end_time has 0 non-null values
- provider_schedules.break_start has 0 non-null values
- provider_schedules.break_end has 0 non-null values
- provider_schedules.effective_from has 0 non-null values
- provider_schedules.effective_to has 0 non-null values
- provider_schedules.schedule_type has 0 non-null values
- provider_schedules.max_appointments has 0 non-null values
- provider_schedules.active has 0 non-null values
- provider_schedules.created_at has 0 non-null values
- provider_scheduling_patterns.pattern_type has 0 non-null values
- provider_scheduling_patterns.preferences has 0 non-null values
- provider_scheduling_patterns.constraints has 0 non-null values
- provider_scheduling_patterns.historical_data has 0 non-null values
- provider_scheduling_patterns.created_at has 0 non-null values
- provider_scheduling_patterns.updated_at has 0 non-null values
- realtime_schedule_status.date has 0 non-null values
- realtime_schedule_status.time_slot has 0 non-null values
- realtime_schedule_status.status has 0 non-null values
- realtime_schedule_status.appointment_id has 0 non-null values
- realtime_schedule_status.buffer_status has 0 non-null values
- realtime_schedule_status.efficiency_score has 0 non-null values
- realtime_schedule_status.updated_at has 0 non-null values
- schedule_exceptions.exception_date has 0 non-null values
- schedule_exceptions.exception_type has 0 non-null values
- schedule_exceptions.start_time has 0 non-null values
- schedule_exceptions.end_time has 0 non-null values
- schedule_exceptions.reason has 0 non-null values
- schedule_exceptions.affects_scheduling has 0 non-null values
- schedule_exceptions.created_at has 0 non-null values
- schedule_preferences.preferred_appointment_duration has 0 non-null values
- schedule_preferences.buffer_time_minutes has 0 non-null values
- schedule_preferences.lunch_start has 0 non-null values
- schedule_preferences.lunch_duration has 0 non-null values
- schedule_preferences.max_daily_appointments has 0 non-null values
- schedule_preferences.max_consecutive_appointments has 0 non-null values
- schedule_preferences.preferred_break_after_n_appointments has 0 non-null values
- schedule_preferences.break_duration_minutes has 0 non-null values
- schedule_preferences.allow_double_booking has 0 non-null values
- schedule_preferences.allow_overtime has 0 non-null values
- schedule_preferences.overtime_limit_minutes has 0 non-null values
- schedule_preferences.created_at has 0 non-null values
- schedule_preferences.updated_at has 0 non-null values
- scheduling_ai_factors.category has 0 non-null values
- scheduling_ai_factors.description has 0 non-null values
- scheduling_ai_factors.is_enabled has 0 non-null values
- scheduling_ai_factors.created_at has 0 non-null values
- scheduling_ai_factors.updated_at has 0 non-null values
- scheduling_ai_weights.created_by has 0 non-null values
- scheduling_ai_weights.factor_name has 0 non-null values
- scheduling_ai_weights.is_active has 0 non-null values
- scheduling_ai_weights.custom_parameters has 0 non-null values
- scheduling_ai_weights.created_at has 0 non-null values
- scheduling_ai_weights.updated_at has 0 non-null values
- scheduling_resources.name has 0 non-null values
- scheduling_resources.available_hours has 0 non-null values
- scheduling_resources.requires_cleaning has 0 non-null values
- scheduling_resources.cleaning_duration has 0 non-null values
- scheduling_resources.active has 0 non-null values
- scheduling_resources.created_at has 0 non-null values
- scheduling_rules.name has 0 non-null values
- scheduling_rules.applies_to has 0 non-null values
- scheduling_rules.conditions has 0 non-null values
- scheduling_rules.actions has 0 non-null values
- scheduling_rules.priority has 0 non-null values
- scheduling_rules.active has 0 non-null values
- scheduling_rules.created_at has 0 non-null values
- scheduling_templates.template_type has 0 non-null values
- scheduling_templates.day_configuration has 0 non-null values
- scheduling_templates.appointment_types has 0 non-null values
- scheduling_templates.buffer_rules has 0 non-null values
- scheduling_templates.break_configuration has 0 non-null values
- signatures.encounter_id has 0 non-null values
- signatures.signed_by has 0 non-null values
- signatures.signature_type has 0 non-null values
- signatures.ip_address has 0 non-null values
- signatures.attestation_text has 0 non-null values
- signed_orders.delivery_method has 0 non-null values
- signed_orders.delivery_status has 0 non-null values
- signed_orders.delivery_attempts has 0 non-null values
- signed_orders.last_delivery_attempt has 0 non-null values
- signed_orders.delivery_error has 0 non-null values
- signed_orders.can_change_delivery has 0 non-null values
- signed_orders.delivery_lock_reason has 0 non-null values
- signed_orders.original_delivery_method has 0 non-null values
- signed_orders.delivery_changes has 0 non-null values
- signed_orders.signed_at has 0 non-null values
- signed_orders.signed_by has 0 non-null values
- signed_orders.created_at has 0 non-null values
- signed_orders.updated_at has 0 non-null values
- social_history.details has 0 non-null values
- social_history.status has 0 non-null values
- social_history.start_date has 0 non-null values
- social_history.end_date has 0 non-null values
- social_history.quantity has 0 non-null values
- social_history.frequency has 0 non-null values
- social_history.notes has 0 non-null values
- social_history.extracted_from_attachment_id has 0 non-null values
- social_history.extraction_notes has 0 non-null values
- social_history.risk_level has 0 non-null values
- social_history.counseling_provided has 0 non-null values
- social_history.consolidation_reasoning has 0 non-null values
- social_history.merged_ids has 0 non-null values
- social_history.visit_history has 0 non-null values
- social_history.created_at has 0 non-null values
- social_history.updated_at has 0 non-null values
- subscription_history.previous_status has 0 non-null values
- subscription_history.new_status has 0 non-null values
- subscription_history.changed_by has 0 non-null values
- subscription_history.reason has 0 non-null values
- subscription_history.billing_impact has 0 non-null values
- subscription_history.effective_date has 0 non-null values
- subscription_history.created_at has 0 non-null values
- subscription_keys.health_system_id has 0 non-null values
- subscription_keys.key_value has 0 non-null values
- subscription_keys.key_type has 0 non-null values
- subscription_keys.created_by has 0 non-null values
- subscription_keys.assigned_to has 0 non-null values
- subscription_keys.assigned_at has 0 non-null values
- subscription_keys.expires_at has 0 non-null values
- subscription_keys.status has 0 non-null values
- subscription_keys.usage_count has 0 non-null values
- subscription_keys.last_used_at has 0 non-null values
- subscription_keys.metadata has 0 non-null values
- subscription_keys.created_at has 0 non-null values
- surgical_history.surgeon has 0 non-null values
- surgical_history.facility has 0 non-null values
- surgical_history.findings has 0 non-null values
- surgical_history.implants_used has 0 non-null values
- surgical_history.pathology_results has 0 non-null values
- surgical_history.recovery_notes has 0 non-null values
- surgical_history.extracted_from_attachment_id has 0 non-null values
- surgical_history.extraction_notes has 0 non-null values
- surgical_history.procedure_code has 0 non-null values
- surgical_history.approach has 0 non-null values
- surgical_history.duration_minutes has 0 non-null values
- surgical_history.estimated_blood_loss_ml has 0 non-null values
- surgical_history.specimens_removed has 0 non-null values
- surgical_history.drains_placed has 0 non-null values
- surgical_history.post_op_diagnosis has 0 non-null values
- surgical_history.discharge_instructions has 0 non-null values
- surgical_history.follow_up_date has 0 non-null values
- surgical_history.consolidation_reasoning has 0 non-null values
- surgical_history.merged_ids has 0 non-null values
- surgical_history.visit_history has 0 non-null values
- surgical_history.created_at has 0 non-null values
- surgical_history.updated_at has 0 non-null values
- surgical_history.last_updated_encounter has 0 non-null values
- template_shares.shared_by has 0 non-null values
- template_shares.shared_with has 0 non-null values
- template_shares.status has 0 non-null values
- template_shares.shared_at has 0 non-null values
- template_shares.responded_at has 0 non-null values
- template_shares.share_message has 0 non-null values
- template_shares.can_modify has 0 non-null values
- template_shares.active has 0 non-null values
- template_versions.version_number has 0 non-null values
- template_versions.change_description has 0 non-null values
- template_versions.changed_by has 0 non-null values
- template_versions.example_note_snapshot has 0 non-null values
- template_versions.generated_prompt_snapshot has 0 non-null values
- template_versions.change_type has 0 non-null values
- template_versions.created_at has 0 non-null values
- user_assistant_threads.assistant_type has 0 non-null values
- user_assistant_threads.thread_id has 0 non-null values
- user_assistant_threads.assistant_id has 0 non-null values
- user_assistant_threads.context has 0 non-null values
- user_assistant_threads.last_message_at has 0 non-null values
- user_assistant_threads.message_count has 0 non-null values
- user_assistant_threads.active has 0 non-null values
- user_assistant_threads.created_at has 0 non-null values
- user_edit_patterns.note_type has 0 non-null values
- user_edit_patterns.section_name has 0 non-null values
- user_edit_patterns.edit_type has 0 non-null values
- user_edit_patterns.original_text has 0 non-null values
- user_edit_patterns.edited_text has 0 non-null values
- user_edit_patterns.edit_frequency has 0 non-null values
- user_edit_patterns.confidence_score has 0 non-null values
- user_edit_patterns.last_occurrence has 0 non-null values
- user_edit_patterns.created_at has 0 non-null values
- user_locations.location_id has 0 non-null values
- user_locations.is_primary has 0 non-null values
- user_locations.permissions has 0 non-null values
- user_locations.created_at has 0 non-null values
- user_locations.updated_at has 0 non-null values
- user_locations.role_at_location has 0 non-null values
- user_note_preferences.last_selected_note_type has 0 non-null values
- user_note_preferences.default_chief_complaint has 0 non-null values
- user_note_preferences.default_physical_exam has 0 non-null values
- user_note_preferences.default_ros_negatives has 0 non-null values
- user_note_preferences.default_assessment_style has 0 non-null values
- user_note_preferences.use_voice_commands has 0 non-null values
- user_note_preferences.auto_save_interval has 0 non-null values
- user_note_preferences.show_template_suggestions has 0 non-null values
- user_note_preferences.include_time_stamps has 0 non-null values
- user_note_preferences.default_note_font_size has 0 non-null values
- user_note_preferences.default_macro_set has 0 non-null values
- user_note_preferences.preferred_exam_order has 0 non-null values
- user_note_preferences.custom_normal_exams has 0 non-null values
- user_note_preferences.abbreviation_expansions has 0 non-null values
- user_note_preferences.quick_phrases has 0 non-null values
- user_note_preferences.billing_reminder_enabled has 0 non-null values
- user_note_preferences.sign_reminder_minutes has 0 non-null values
- user_note_preferences.created_at has 0 non-null values
- user_note_preferences.updated_at has 0 non-null values
- user_note_preferences.default_soap_template has 0 non-null values
- user_note_preferences.default_apso_template has 0 non-null values
- user_note_preferences.default_progress_template has 0 non-null values
- user_note_preferences.default_h_and_p_template has 0 non-null values
- user_note_preferences.default_discharge_template has 0 non-null values
- user_note_preferences.default_procedure_template has 0 non-null values
- user_note_preferences.global_ai_learning has 0 non-null values
- user_note_preferences.learning_aggressiveness has 0 non-null values
- user_note_preferences.remember_last_template has 0 non-null values
- user_note_preferences.show_template_preview has 0 non-null values
- user_note_preferences.auto_save_changes has 0 non-null values
- user_note_preferences.medical_problems_display_threshold has 0 non-null values
- user_note_preferences.ranking_weights has 0 non-null values
- user_note_preferences.chart_panel_width has 0 non-null values
- user_note_preferences.enable_dense_view has 0 non-null values
- user_note_templates.template_name has 0 non-null values
- user_note_templates.base_note_type has 0 non-null values
- user_note_templates.display_name has 0 non-null values
- user_note_templates.is_personal has 0 non-null values
- user_note_templates.is_default has 0 non-null values
- user_note_templates.created_by has 0 non-null values
- user_note_templates.shared_by has 0 non-null values
- user_note_templates.example_note has 0 non-null values
- user_note_templates.base_note_text has 0 non-null values
- user_note_templates.inline_comments has 0 non-null values
- user_note_templates.has_comments has 0 non-null values
- user_note_templates.generated_prompt has 0 non-null values
- user_note_templates.prompt_version has 0 non-null values
- user_note_templates.enable_ai_learning has 0 non-null values
- user_note_templates.learning_confidence has 0 non-null values
- user_note_templates.last_learning_update has 0 non-null values
- user_note_templates.usage_count has 0 non-null values
- user_note_templates.last_used has 0 non-null values
- user_note_templates.version has 0 non-null values
- user_note_templates.parent_template_id has 0 non-null values
- user_note_templates.active has 0 non-null values
- user_note_templates.created_at has 0 non-null values
- user_note_templates.updated_at has 0 non-null values
- user_problem_list_preferences.id has 0 non-null values
- user_problem_list_preferences.show_resolved_problems has 0 non-null values
- user_problem_list_preferences.show_inactive_problems has 0 non-null values
- user_problem_list_preferences.sort_by has 0 non-null values
- user_problem_list_preferences.group_by_category has 0 non-null values
- user_problem_list_preferences.highlight_recent_changes has 0 non-null values
- user_problem_list_preferences.recent_change_days has 0 non-null values
- user_problem_list_preferences.max_problems_displayed has 0 non-null values
- user_problem_list_preferences.created_at has 0 non-null values
- user_problem_list_preferences.updated_at has 0 non-null values
- user_session_locations.location_id has 0 non-null values
- user_session_locations.session_id has 0 non-null values
- user_session_locations.is_primary has 0 non-null values
- user_session_locations.permissions has 0 non-null values
- user_session_locations.remembered has 0 non-null values
- user_session_locations.created_at has 0 non-null values
- user_session_locations.updated_at has 0 non-null values
- user_session_locations.is_active has 0 non-null values
- user_session_locations.remember_selection has 0 non-null values
- user_session_locations.selected_at has 0 non-null values
- users.license_state has 0 non-null values
- users.bio has 0 non-null values
- users.is_active has 5 non-null values
- users.profile_image_url has 0 non-null values
- users.updated_at has 5 non-null values
- vitals.blood_pressure_systolic has 0 non-null values
- vitals.blood_pressure_diastolic has 0 non-null values
- vitals.blood_glucose has 0 non-null values
- vitals.extracted_from_attachment_id has 0 non-null values
- vitals.extraction_notes has 0 non-null values
- vitals.consolidation_reasoning has 0 non-null values
- vitals.merged_ids has 0 non-null values
- vitals.visit_history has 0 non-null values
- vitals.created_at has 0 non-null values
- vitals.updated_at has 0 non-null values
- vitals.systolic has 0 non-null values
- vitals.diastolic has 0 non-null values
- vitals.processing_notes has 0 non-null values
- vitals.source_notes has 0 non-null values
- vitals.entered_by has 0 non-null values
- webauthn_credentials.credential_id has 0 non-null values
- webauthn_credentials.public_key has 0 non-null values
- webauthn_credentials.counter has 0 non-null values
- webauthn_credentials.device_type has 0 non-null values
- webauthn_credentials.transports has 0 non-null values
- webauthn_credentials.created_at has 0 non-null values
- webauthn_credentials.last_used_at has 0 non-null values
- webauthn_credentials.registered_device has 0 non-null values
- webauthn_credentials.device_name has 0 non-null values

**RECOMMENDATION**: Add these columns to schema.ts instead of removing them!