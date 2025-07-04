CREATE TABLE "admin_prompt_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"original_prompt" text NOT NULL,
	"reviewed_prompt" text,
	"admin_user_id" integer,
	"review_status" text DEFAULT 'pending',
	"review_notes" text,
	"is_active" boolean DEFAULT false,
	"performance_metrics" jsonb,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "allergies" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"allergen" text NOT NULL,
	"reaction" text,
	"severity" text,
	"allergy_type" text,
	"onset_date" date,
	"last_reaction_date" date,
	"status" text DEFAULT 'active',
	"verification_status" text DEFAULT 'unconfirmed',
	"drug_class" text,
	"cross_reactivity" text[],
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"last_updated_encounter" integer,
	"entered_by" integer,
	"consolidation_reasoning" text,
	"extraction_notes" text,
	"temporal_conflict_resolution" text,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"appointment_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration" integer NOT NULL,
	"appointment_type" text NOT NULL,
	"chief_complaint" text,
	"visit_reason" text,
	"status" text DEFAULT 'scheduled',
	"confirmation_status" text DEFAULT 'pending',
	"checked_in_at" timestamp,
	"checked_in_by" integer,
	"room_assignment" text,
	"urgency_level" text DEFAULT 'routine',
	"scheduling_notes" text,
	"patient_preferences" jsonb,
	"ai_scheduling_data" jsonb,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_sent" timestamp,
	"communication_preferences" jsonb,
	"external_appointment_id" text,
	"synced_at" timestamp,
	"insurance_verified" boolean DEFAULT false,
	"verified_by" integer,
	"copay_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment_extracted_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"attachment_id" integer NOT NULL,
	"extracted_text" text,
	"ai_generated_title" text,
	"document_type" text,
	"processing_status" text DEFAULT 'pending',
	"error_message" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "attachment_extracted_content_attachment_id_unique" UNIQUE("attachment_id")
);
--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer NOT NULL,
	"diagnosis" text NOT NULL,
	"icd10_code" text,
	"diagnosis_date" date,
	"status" text NOT NULL,
	"notes" text,
	"is_primary" boolean DEFAULT false,
	"diagnosis_pointer" text,
	"billing_sequence" integer,
	"claim_submission_status" text DEFAULT 'pending',
	"claim_id" text,
	"clearinghouse_id" text,
	"payer_id" text,
	"allowed_amount" numeric(10, 2),
	"paid_amount" numeric(10, 2),
	"patient_responsibility" numeric(10, 2),
	"adjustment_amount" numeric(10, 2),
	"denial_reason" text,
	"denial_code" text,
	"appeal_status" text,
	"appeal_deadline" date,
	"billing_notes" text,
	"last_billing_action" text,
	"billing_action_date" timestamp,
	"assigned_biller" integer,
	"medical_necessity_documented" boolean DEFAULT false,
	"prior_authorization_required" boolean DEFAULT false,
	"prior_auth_number" text,
	"modifier_applied" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_processing_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"attachment_id" integer NOT NULL,
	"status" text DEFAULT 'queued',
	"attempts" integer DEFAULT 0,
	"last_attempt" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"encounter_type" text NOT NULL,
	"encounter_subtype" text,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"encounter_status" text DEFAULT 'scheduled',
	"chief_complaint" text,
	"note" text,
	"nurse_assessment" text,
	"nurse_interventions" text,
	"nurse_notes" text,
	"transcription_raw" text,
	"transcription_processed" text,
	"ai_suggestions" jsonb DEFAULT '{}'::jsonb,
	"draft_orders" jsonb DEFAULT '[]'::jsonb,
	"draft_diagnoses" jsonb DEFAULT '[]'::jsonb,
	"cpt_codes" jsonb DEFAULT '[]'::jsonb,
	"location" text,
	"appointment_id" integer,
	"signature_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_chart_update" timestamp,
	"chart_update_duration" integer
);
--> statement-breakpoint
CREATE TABLE "external_labs" (
	"id" serial PRIMARY KEY NOT NULL,
	"lab_name" text NOT NULL,
	"lab_identifier" text NOT NULL,
	"integration_type" text NOT NULL,
	"api_endpoint" text,
	"hl7_endpoint" text,
	"api_key_encrypted" text,
	"username_encrypted" text,
	"ssl_certificate_path" text,
	"supported_tests" jsonb,
	"turnaround_times" jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "external_labs_lab_identifier_unique" UNIQUE("lab_identifier")
);
--> statement-breakpoint
CREATE TABLE "family_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"family_member" text NOT NULL,
	"medical_history" text,
	"last_updated_encounter" integer,
	"visit_history" jsonb,
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gpt_lab_review_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"result_ids" integer[] NOT NULL,
	"clinical_review" text NOT NULL,
	"patient_message" text NOT NULL,
	"nurse_message" text NOT NULL,
	"patient_context" jsonb,
	"gpt_model" text DEFAULT 'gpt-4',
	"prompt_version" text DEFAULT 'v1.0',
	"revised_by" integer,
	"revision_reason" text,
	"processing_time" integer,
	"tokens_used" integer,
	"status" text DEFAULT 'draft',
	"generated_by" integer NOT NULL,
	"reviewed_by" integer,
	"generated_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"patient_message_sent" boolean DEFAULT false,
	"nurse_message_sent" boolean DEFAULT false,
	"patient_message_sent_at" timestamp,
	"nurse_message_sent_at" timestamp,
	"revision_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"system_type" text NOT NULL,
	"primary_contact" text,
	"phone" text,
	"email" text,
	"website" text,
	"npi" text,
	"tax_id" text,
	"logo_url" text,
	"brand_colors" jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imaging_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer NOT NULL,
	"study_type" text NOT NULL,
	"body_part" text NOT NULL,
	"laterality" text,
	"contrast_needed" boolean DEFAULT false,
	"clinical_indication" text NOT NULL,
	"clinical_history" text,
	"relevant_symptoms" text,
	"ordered_by" integer NOT NULL,
	"ordered_at" timestamp DEFAULT now(),
	"external_facility_id" text,
	"external_order_id" text,
	"dicom_accession_number" text,
	"order_status" text DEFAULT 'pending',
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"prep_instructions" text,
	"scheduling_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imaging_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"imaging_order_id" integer,
	"patient_id" integer NOT NULL,
	"study_date" timestamp NOT NULL,
	"modality" text NOT NULL,
	"body_part" text,
	"laterality" text,
	"clinical_summary" text NOT NULL,
	"findings" text,
	"impression" text,
	"radiologist_name" text,
	"facility_name" text,
	"attachment_id" integer,
	"dicom_study_id" text,
	"dicom_series_id" text,
	"image_file_paths" text[],
	"result_status" text DEFAULT 'preliminary',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"provider_notes" text,
	"needs_review" boolean DEFAULT true,
	"source_type" text DEFAULT 'pdf_extract',
	"source_confidence" numeric(3, 2) DEFAULT '0.95',
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer NOT NULL,
	"order_set_id" text,
	"loinc_code" text NOT NULL,
	"cpt_code" text,
	"test_code" text NOT NULL,
	"test_name" text NOT NULL,
	"test_category" text,
	"priority" text DEFAULT 'routine',
	"clinical_indication" text,
	"icd10_codes" text[],
	"ordered_by" integer NOT NULL,
	"ordered_at" timestamp DEFAULT now(),
	"target_lab_id" integer,
	"external_order_id" text,
	"hl7_message_id" text,
	"requisition_number" text,
	"order_status" text DEFAULT 'draft',
	"transmitted_at" timestamp,
	"acknowledged_at" timestamp,
	"collected_at" timestamp,
	"specimen_type" text,
	"specimen_volume" text,
	"container_type" text,
	"collection_instructions" text,
	"fasting_required" boolean DEFAULT false,
	"fasting_hours" integer,
	"timing_instructions" text,
	"insurance_preauth" text,
	"estimated_cost" numeric(10, 2),
	"insurance_coverage" text,
	"ai_suggested_tests" jsonb,
	"risk_flags" jsonb,
	"quality_measure" text,
	"preventive_care_flag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lab_reference_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"loinc_code" text NOT NULL,
	"test_name" text NOT NULL,
	"test_category" text,
	"gender" text,
	"age_min" integer DEFAULT 0,
	"age_max" integer DEFAULT 120,
	"normal_low" numeric(15, 6),
	"normal_high" numeric(15, 6),
	"units" text NOT NULL,
	"critical_low" numeric(15, 6),
	"critical_high" numeric(15, 6),
	"display_range" text,
	"lab_source" text,
	"last_verified" timestamp DEFAULT now(),
	"active" boolean DEFAULT true,
	"clinical_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"lab_order_id" integer,
	"patient_id" integer NOT NULL,
	"loinc_code" text NOT NULL,
	"test_code" text NOT NULL,
	"test_name" text NOT NULL,
	"test_category" text,
	"result_value" text,
	"result_numeric" numeric(15, 6),
	"result_units" text,
	"reference_range" text,
	"age_gender_adjusted_range" text,
	"abnormal_flag" text,
	"critical_flag" boolean DEFAULT false,
	"delta_flag" text,
	"specimen_collected_at" timestamp,
	"specimen_received_at" timestamp,
	"result_available_at" timestamp,
	"result_finalized_at" timestamp,
	"received_at" timestamp DEFAULT now(),
	"external_lab_id" integer,
	"external_result_id" text,
	"hl7_message_id" text,
	"instrument_id" text,
	"result_status" text DEFAULT 'pending',
	"verification_status" text DEFAULT 'unverified',
	"result_comments" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"provider_notes" text,
	"needs_review" boolean DEFAULT true,
	"review_status" text DEFAULT 'pending',
	"review_note" text,
	"review_template" text,
	"review_history" jsonb DEFAULT '[]'::jsonb,
	"assigned_to" integer,
	"communication_status" text DEFAULT 'none',
	"communication_plan" jsonb,
	"portal_release_status" text DEFAULT 'hold',
	"portal_release_by" integer,
	"portal_release_at" timestamp,
	"block_portal_release" boolean DEFAULT false,
	"ai_interpretation" jsonb,
	"previous_value" numeric(15, 6),
	"previous_date" timestamp,
	"trend_direction" text,
	"percent_change" numeric(5, 2),
	"qc_flags" jsonb,
	"source_system" text,
	"interface_version" text,
	"source_type" text DEFAULT 'lab_order',
	"source_confidence" numeric(5, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"health_system_id" integer,
	"name" text NOT NULL,
	"short_name" text,
	"location_type" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"phone" text,
	"fax" text,
	"email" text,
	"facility_code" text,
	"npi" text,
	"operating_hours" jsonb,
	"services" text[],
	"has_lab" boolean DEFAULT false,
	"has_imaging" boolean DEFAULT false,
	"has_pharmacy" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medical_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"condition_category" text NOT NULL,
	"history_text" text NOT NULL,
	"last_updated_encounter" integer,
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medical_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"problem_title" text NOT NULL,
	"current_icd10_code" text,
	"problem_status" text DEFAULT 'active',
	"first_diagnosed_date" date,
	"first_encounter_id" integer,
	"last_updated_encounter_id" integer,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"change_log" jsonb DEFAULT '[]'::jsonb,
	"last_ranked_encounter_id" integer,
	"ranking_reason" text,
	"ranking_factors" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medication_formulary" (
	"id" serial PRIMARY KEY NOT NULL,
	"generic_name" text NOT NULL,
	"brand_names" text[],
	"common_names" text[],
	"standard_strengths" text[] NOT NULL,
	"available_forms" text[] NOT NULL,
	"form_routes" jsonb NOT NULL,
	"sig_templates" jsonb NOT NULL,
	"common_doses" text[],
	"max_daily_dose" text,
	"therapeutic_class" text NOT NULL,
	"indication" text NOT NULL,
	"black_box_warning" text,
	"age_restrictions" text,
	"prescription_type" text NOT NULL,
	"is_controlled" boolean DEFAULT false,
	"controlled_schedule" text,
	"requires_prior_auth" boolean DEFAULT false,
	"renal_adjustment" boolean DEFAULT false,
	"hepatic_adjustment" boolean DEFAULT false,
	"prescription_volume" integer DEFAULT 0,
	"popularity_rank" integer,
	"data_source" text NOT NULL,
	"last_verified" timestamp DEFAULT now(),
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"medication_name" text NOT NULL,
	"brand_name" text,
	"generic_name" text,
	"dosage" text NOT NULL,
	"strength" text,
	"dosage_form" text,
	"route" text,
	"frequency" text NOT NULL,
	"quantity" integer,
	"days_supply" integer,
	"refills_remaining" integer,
	"total_refills" integer,
	"sig" text,
	"rxnorm_code" text,
	"ndc_code" text,
	"surescripts_id" text,
	"clinical_indication" text,
	"source_order_id" integer,
	"problem_mappings" jsonb DEFAULT '[]'::jsonb,
	"start_date" date NOT NULL,
	"end_date" date,
	"discontinued_date" date,
	"status" text DEFAULT 'active',
	"prescriber" text,
	"prescriber_id" integer,
	"first_encounter_id" integer,
	"last_updated_encounter_id" integer,
	"reason_for_change" text,
	"medication_history" jsonb DEFAULT '[]'::jsonb,
	"change_log" jsonb DEFAULT '[]'::jsonb,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"source_type" text,
	"source_confidence" numeric(3, 2),
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"grouping_strategy" text DEFAULT 'medical_problem',
	"related_medications" jsonb DEFAULT '[]'::jsonb,
	"drug_interactions" jsonb DEFAULT '[]'::jsonb,
	"pharmacy_order_id" text,
	"insurance_auth_status" text,
	"prior_auth_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"order_type" text NOT NULL,
	"order_status" text DEFAULT 'draft',
	"reference_id" integer,
	"provider_notes" text,
	"priority" text DEFAULT 'routine',
	"clinical_indication" text,
	"medication_name" text,
	"dosage" text,
	"quantity" integer,
	"sig" text,
	"refills" integer,
	"form" text,
	"route_of_administration" text,
	"days_supply" integer,
	"diagnosis_code" text,
	"requires_prior_auth" boolean DEFAULT false,
	"prior_auth_number" text,
	"lab_name" text,
	"test_name" text,
	"test_code" text,
	"specimen_type" text,
	"fasting_required" boolean DEFAULT false,
	"study_type" text,
	"region" text,
	"laterality" text,
	"contrast_needed" boolean DEFAULT false,
	"specialty_type" text,
	"provider_name" text,
	"urgency" text,
	"ordered_by" integer,
	"ordered_at" timestamp DEFAULT now(),
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"health_system_id" integer,
	"name" text NOT NULL,
	"short_name" text,
	"organization_type" text NOT NULL,
	"region" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"address" text,
	"npi" text,
	"tax_id" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"file_extension" text NOT NULL,
	"file_path" text NOT NULL,
	"thumbnail_path" text,
	"category" text DEFAULT 'general' NOT NULL,
	"title" text,
	"description" text,
	"tags" text[] DEFAULT '{}',
	"uploaded_by" integer NOT NULL,
	"is_confidential" boolean DEFAULT false,
	"access_level" text DEFAULT 'standard',
	"processing_status" text DEFAULT 'completed',
	"virus_scan_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_order_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"lab_delivery_method" text DEFAULT 'mock_service',
	"lab_service_provider" text,
	"imaging_delivery_method" text DEFAULT 'print_pdf',
	"imaging_service_provider" text,
	"medication_delivery_method" text DEFAULT 'preferred_pharmacy',
	"preferred_pharmacy" text,
	"pharmacy_phone" text,
	"pharmacy_fax" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_updated_by" integer,
	CONSTRAINT "patient_order_preferences_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "patient_physical_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"exam_system" text NOT NULL,
	"exam_component" text,
	"finding_text" text NOT NULL,
	"finding_type" text NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"confirmed_count" integer DEFAULT 0,
	"contradicted_count" integer DEFAULT 0,
	"first_noted_encounter" integer NOT NULL,
	"last_confirmed_encounter" integer,
	"last_seen_encounter" integer,
	"status" text DEFAULT 'active',
	"gpt_reasoning" text,
	"clinical_context" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"mrn" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"contact_number" text,
	"email" text,
	"address" text,
	"emergency_contact" text,
	"preferred_location_id" integer,
	"primary_provider_id" integer,
	"insurance_primary" text,
	"insurance_secondary" text,
	"policy_number" text,
	"group_number" text,
	"assistant_id" text,
	"assistant_thread_id" text,
	"last_chart_summary" text,
	"chart_last_updated" timestamp,
	"active_problems" jsonb DEFAULT '[]'::jsonb,
	"critical_alerts" jsonb DEFAULT '[]'::jsonb,
	"profile_photo_filename" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "patients_mrn_unique" UNIQUE("mrn")
);
--> statement-breakpoint
CREATE TABLE "problem_rank_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"preference_weight" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"schedule_type" text NOT NULL,
	"appointment_types" text[],
	"slot_duration" integer DEFAULT 30,
	"buffer_time" integer DEFAULT 0,
	"max_concurrent_appts" integer DEFAULT 1,
	"advance_booking_days" integer DEFAULT 365,
	"cancelation_policy_hours" integer DEFAULT 24,
	"is_available_for_urgent" boolean DEFAULT true,
	"allow_double_booking" boolean DEFAULT false,
	"requires_referral" boolean DEFAULT false,
	"effective_from" date,
	"effective_until" date,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"location_id" integer,
	"exception_date" date NOT NULL,
	"start_time" text,
	"end_time" text,
	"exception_type" text NOT NULL,
	"reason" text,
	"cancels_existing_appts" boolean DEFAULT false,
	"allows_emergency_override" boolean DEFAULT true,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"signature_data" text NOT NULL,
	"signed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "signed_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"order_type" varchar(50) NOT NULL,
	"delivery_method" varchar(50) NOT NULL,
	"delivery_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"last_delivery_attempt" timestamp,
	"delivery_error" text,
	"can_change_delivery" boolean DEFAULT true NOT NULL,
	"delivery_lock_reason" varchar(255),
	"original_delivery_method" varchar(50) NOT NULL,
	"delivery_changes" jsonb DEFAULT '[]',
	"signed_at" timestamp NOT NULL,
	"signed_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"category" text NOT NULL,
	"current_status" text NOT NULL,
	"history_notes" text,
	"last_updated_encounter" integer,
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"consolidation_reasoning" text,
	"extraction_notes" text,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "surgical_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"procedure_name" text NOT NULL,
	"procedure_date" date,
	"surgeon_name" text,
	"facility_name" text,
	"indication" text,
	"complications" text,
	"outcome" text DEFAULT 'successful',
	"anesthesia_type" text,
	"cpt_code" text,
	"icd10_procedure_code" text,
	"anatomical_site" text,
	"laterality" text,
	"urgency_level" text,
	"length_of_stay" text,
	"blood_loss" text,
	"transfusions_required" boolean DEFAULT false,
	"implants_hardware" text,
	"follow_up_required" text,
	"recovery_status" text,
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"last_updated_encounter" integer,
	"entered_by" integer,
	"consolidation_reasoning" text,
	"extraction_notes" text,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"shared_by" integer NOT NULL,
	"shared_with" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"shared_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"share_message" text,
	"can_modify" boolean DEFAULT false,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text,
	"changed_by" integer NOT NULL,
	"example_note_snapshot" text NOT NULL,
	"generated_prompt_snapshot" text NOT NULL,
	"change_type" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_assistant_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"thread_id" text NOT NULL,
	"thread_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_interaction" timestamp DEFAULT now(),
	"message_count" integer DEFAULT 0,
	"patterns_learned" integer DEFAULT 0,
	"confidence_level" numeric(3, 2) DEFAULT '0.50',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_assistant_threads_thread_id_unique" UNIQUE("thread_id")
);
--> statement-breakpoint
CREATE TABLE "user_edit_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"patient_id" integer,
	"encounter_id" integer,
	"original_text" text NOT NULL,
	"edited_text" text NOT NULL,
	"section_type" text NOT NULL,
	"pattern_type" text NOT NULL,
	"is_user_preference" boolean,
	"confidence_score" numeric(3, 2),
	"extracted_pattern" jsonb,
	"applied" boolean DEFAULT false,
	"reviewed_by_user" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"role_at_location" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"work_schedule" jsonb,
	"can_schedule" boolean DEFAULT true,
	"can_view_all_patients" boolean DEFAULT true,
	"can_create_orders" boolean DEFAULT true,
	"active" boolean DEFAULT true,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_note_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"default_soap_template" integer,
	"default_apso_template" integer,
	"default_progress_template" integer,
	"default_h_and_p_template" integer,
	"default_discharge_template" integer,
	"default_procedure_template" integer,
	"last_selected_note_type" text DEFAULT 'soap',
	"global_ai_learning" boolean DEFAULT true,
	"learning_aggressiveness" text DEFAULT 'moderate',
	"remember_last_template" boolean DEFAULT true,
	"show_template_preview" boolean DEFAULT true,
	"auto_save_changes" boolean DEFAULT true,
	"medical_problems_display_threshold" integer DEFAULT 100,
	"ranking_weights" jsonb DEFAULT '{"clinical_severity":40,"treatment_complexity":30,"patient_frequency":20,"clinical_relevance":10}'::jsonb,
	"chart_panel_width" integer DEFAULT 400,
	"enable_dense_view" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_note_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_note_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"template_name" text NOT NULL,
	"base_note_type" text NOT NULL,
	"display_name" text NOT NULL,
	"is_personal" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"shared_by" integer,
	"example_note" text NOT NULL,
	"base_note_text" text,
	"inline_comments" jsonb,
	"has_comments" boolean DEFAULT false,
	"generated_prompt" text NOT NULL,
	"prompt_version" integer DEFAULT 1,
	"enable_ai_learning" boolean DEFAULT true,
	"learning_confidence" numeric(3, 2) DEFAULT '0.75',
	"last_learning_update" timestamp,
	"usage_count" integer DEFAULT 0,
	"last_used" timestamp,
	"version" integer DEFAULT 1,
	"parent_template_id" integer,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_problem_list_preferences" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"max_problems_displayed" integer DEFAULT 10,
	"show_resolved_problems" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_session_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"session_id" text,
	"selected_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"remember_selection" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"npi" text,
	"credentials" text,
	"specialties" text[],
	"license_number" text,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" text,
	"account_status" text DEFAULT 'active',
	"last_login" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"account_locked_until" timestamp,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_npi_unique" UNIQUE("npi")
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"entry_type" text DEFAULT 'routine' NOT NULL,
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"heart_rate" integer,
	"temperature" numeric,
	"weight" numeric,
	"height" numeric,
	"bmi" numeric,
	"oxygen_saturation" numeric,
	"respiratory_rate" integer,
	"pain_scale" integer,
	"notes" text,
	"alerts" text[],
	"parsed_from_text" boolean DEFAULT false,
	"original_text" text,
	"source_type" text DEFAULT 'manual_entry',
	"source_confidence" numeric(3, 2) DEFAULT '1.00',
	"source_notes" text,
	"extracted_from_attachment_id" integer,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_prompt_reviews" ADD CONSTRAINT "admin_prompt_reviews_template_id_user_note_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_prompt_reviews" ADD CONSTRAINT "admin_prompt_reviews_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_last_updated_encounter_encounters_id_fk" FOREIGN KEY ("last_updated_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_extracted_content" ADD CONSTRAINT "attachment_extracted_content_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_assigned_biller_users_id_fk" FOREIGN KEY ("assigned_biller") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_queue" ADD CONSTRAINT "document_processing_queue_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_signature_id_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_history" ADD CONSTRAINT "family_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_history" ADD CONSTRAINT "family_history_last_updated_encounter_encounters_id_fk" FOREIGN KEY ("last_updated_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_history" ADD CONSTRAINT "family_history_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_history" ADD CONSTRAINT "family_history_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_lab_review_notes" ADD CONSTRAINT "gpt_lab_review_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_lab_review_notes" ADD CONSTRAINT "gpt_lab_review_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_lab_review_notes" ADD CONSTRAINT "gpt_lab_review_notes_revised_by_users_id_fk" FOREIGN KEY ("revised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_lab_review_notes" ADD CONSTRAINT "gpt_lab_review_notes_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_lab_review_notes" ADD CONSTRAINT "gpt_lab_review_notes_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_imaging_order_id_imaging_orders_id_fk" FOREIGN KEY ("imaging_order_id") REFERENCES "public"."imaging_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_results" ADD CONSTRAINT "imaging_results_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_target_lab_id_external_labs_id_fk" FOREIGN KEY ("target_lab_id") REFERENCES "public"."external_labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_external_lab_id_external_labs_id_fk" FOREIGN KEY ("external_lab_id") REFERENCES "public"."external_labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_portal_release_by_users_id_fk" FOREIGN KEY ("portal_release_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_health_system_id_health_systems_id_fk" FOREIGN KEY ("health_system_id") REFERENCES "public"."health_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_last_updated_encounter_encounters_id_fk" FOREIGN KEY ("last_updated_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_problems" ADD CONSTRAINT "medical_problems_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_problems" ADD CONSTRAINT "medical_problems_first_encounter_id_encounters_id_fk" FOREIGN KEY ("first_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_problems" ADD CONSTRAINT "medical_problems_last_updated_encounter_id_encounters_id_fk" FOREIGN KEY ("last_updated_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_problems" ADD CONSTRAINT "medical_problems_last_ranked_encounter_id_encounters_id_fk" FOREIGN KEY ("last_ranked_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescriber_id_users_id_fk" FOREIGN KEY ("prescriber_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_first_encounter_id_encounters_id_fk" FOREIGN KEY ("first_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_last_updated_encounter_id_encounters_id_fk" FOREIGN KEY ("last_updated_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_health_system_id_health_systems_id_fk" FOREIGN KEY ("health_system_id") REFERENCES "public"."health_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_order_preferences" ADD CONSTRAINT "patient_order_preferences_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_order_preferences" ADD CONSTRAINT "patient_order_preferences_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_physical_findings" ADD CONSTRAINT "patient_physical_findings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_physical_findings" ADD CONSTRAINT "patient_physical_findings_first_noted_encounter_encounters_id_fk" FOREIGN KEY ("first_noted_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_physical_findings" ADD CONSTRAINT "patient_physical_findings_last_confirmed_encounter_encounters_id_fk" FOREIGN KEY ("last_confirmed_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_physical_findings" ADD CONSTRAINT "patient_physical_findings_last_seen_encounter_encounters_id_fk" FOREIGN KEY ("last_seen_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_preferred_location_id_locations_id_fk" FOREIGN KEY ("preferred_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_primary_provider_id_users_id_fk" FOREIGN KEY ("primary_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_rank_overrides" ADD CONSTRAINT "problem_rank_overrides_problem_id_medical_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."medical_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_rank_overrides" ADD CONSTRAINT "problem_rank_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_orders" ADD CONSTRAINT "signed_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_orders" ADD CONSTRAINT "signed_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_orders" ADD CONSTRAINT "signed_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_orders" ADD CONSTRAINT "signed_orders_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_history" ADD CONSTRAINT "social_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_history" ADD CONSTRAINT "social_history_last_updated_encounter_encounters_id_fk" FOREIGN KEY ("last_updated_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_history" ADD CONSTRAINT "social_history_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_history" ADD CONSTRAINT "social_history_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgical_history" ADD CONSTRAINT "surgical_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgical_history" ADD CONSTRAINT "surgical_history_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgical_history" ADD CONSTRAINT "surgical_history_last_updated_encounter_encounters_id_fk" FOREIGN KEY ("last_updated_encounter") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgical_history" ADD CONSTRAINT "surgical_history_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_shares" ADD CONSTRAINT "template_shares_template_id_user_note_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."user_note_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_shares" ADD CONSTRAINT "template_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_shares" ADD CONSTRAINT "template_shares_shared_with_users_id_fk" FOREIGN KEY ("shared_with") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_user_note_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."user_note_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assistant_threads" ADD CONSTRAINT "user_assistant_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_edit_patterns" ADD CONSTRAINT "user_edit_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_edit_patterns" ADD CONSTRAINT "user_edit_patterns_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_edit_patterns" ADD CONSTRAINT "user_edit_patterns_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_soap_template_user_note_templates_id_fk" FOREIGN KEY ("default_soap_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_apso_template_user_note_templates_id_fk" FOREIGN KEY ("default_apso_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_progress_template_user_note_templates_id_fk" FOREIGN KEY ("default_progress_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_h_and_p_template_user_note_templates_id_fk" FOREIGN KEY ("default_h_and_p_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_discharge_template_user_note_templates_id_fk" FOREIGN KEY ("default_discharge_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_default_procedure_template_user_note_templates_id_fk" FOREIGN KEY ("default_procedure_template") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_templates" ADD CONSTRAINT "user_note_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_templates" ADD CONSTRAINT "user_note_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_templates" ADD CONSTRAINT "user_note_templates_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_templates" ADD CONSTRAINT "user_note_templates_parent_template_id_user_note_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."user_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problem_list_preferences" ADD CONSTRAINT "user_problem_list_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_locations" ADD CONSTRAINT "user_session_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_locations" ADD CONSTRAINT "user_session_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_extracted_from_attachment_id_patient_attachments_id_fk" FOREIGN KEY ("extracted_from_attachment_id") REFERENCES "public"."patient_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;