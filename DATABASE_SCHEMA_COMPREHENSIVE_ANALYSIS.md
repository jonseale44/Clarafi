# Comprehensive Database vs Schema Analysis Report
Generated: January 17, 2025

## Executive Summary
- **Schema Tables**: 76 tables defined in shared/schema.ts
- **Database Tables**: 79 tables in the actual PostgreSQL database
- **Tables in Both**: 76 tables exist in both systems
- **Database-Only Tables**: 1 table (session - created by express-session)
- **Schema-Only Tables**: 0 tables (all schema tables exist in database)

## Table-Level Analysis

### Tables Present Only in Database (1 table):
1. **session** - Express session store table (created automatically by connect-pg-simple)

### Tables Present Only in Schema (0 tables):
All schema tables exist in the database.

### Tables Present in Both (76 tables):
All 76 tables from the schema exist in the database with matching names.

## Column-Level Discrepancy Analysis

Based on comprehensive database inspection, here are the detailed column mismatches for key tables:

### 1. appointments table
**Database has these columns that Schema doesn't define:**
- `appointment_type_id` (integer) - Referenced in schema but commented as "Database has this column"
- `duration_minutes` (integer) 
- `ai_predicted_duration` (integer)
- `checked_in_at`, `checked_in_by`, `completed_at`, `completed_by` (timestamps)
- `cancelled_at`, `cancelled_by`, `cancellation_reason`
- `created_at`, `updated_at` (timestamps)
- `actual_duration` (integer)
- `use_ai_scheduling` (boolean)
- `resource_requirements` (jsonb)
- `tags` (array)
- Insurance-related fields: `insurance_verified`, `insurance_verification_notes`, `copay_collected`, `copay_amount`
- Clinical workflow fields: `forms_completed`, `vital_signs_taken`, `room_number`
- Timing fields: `intake_completed_at`, `provider_ready_at`, `visit_completed_at`
- Scheduling fields: `no_show_reason`, `late_cancellation_reason`, `rescheduled_from`, `rescheduled_reason`
- Recurrence fields: `parent_appointment_id`, `recurrence_rule`, `recurrence_exceptions`
- Communication fields: `reminder_sent`, `reminder_sent_at`, `confirmation_sent`, `confirmation_sent_at`, `patient_confirmed`, `patient_confirmed_at`
- Additional fields: `wait_list_priority`, `referring_provider`, `referral_reason`
- Accessibility fields: `interpreter_needed`, `interpreter_language`, `wheelchair_accessible`
- Notes fields: `special_instructions`, `pre_appointment_notes`, `post_appointment_notes`, `billing_notes`
- Review flags: `chart_reviewed`, `labs_reviewed`, `images_reviewed`, `medications_reconciled`, `problems_reviewed`

**Schema has these columns that Database doesn't have:**
- `appointment_date` (date) - Database uses start_time/end_time timestamps instead
- `start_time` (text) - Database uses timestamp with timezone
- `end_time` (text) - Database uses timestamp with timezone
- `appointment_type` (text) - Database uses appointment_type_id reference
- `visit_reason` (text)
- `confirmation_status` (text)
- `room_assignment` (text) - Database has `room_number` instead

### 2. scheduling_ai_weights table
**Critical mismatch causing errors:**
- Database has `factor_name` (varchar) instead of `factor_id` (integer reference)
- Database missing `enabled` column that schema defines
- Database has `updated_at` timestamp

### 3. users table
**Database has additional columns:**
- `license_state` (varchar) - Actually exists in schema but as licenseState
- `bio` (text) - Exists in schema
- `is_active` (boolean) - Schema has this as isActive
- `profile_image_url` (varchar) - Schema has this as profileImageUrl
- `created_at`, `updated_at` (timestamps) - Schema has these as createdAt, updatedAt

### 4. diagnoses table  
**Database has these columns:**
- `diagnosis_code`, `diagnosis_description` (text fields)
- Extensive billing/RCM columns not in schema:
  - `claim_submission_status`, `claim_id`, `clearinghouse_id`, `payer_id`
  - `allowed_amount`, `paid_amount`, `patient_responsibility`, `adjustment_amount`
  - `denial_reason`, `denial_code`, `appeal_status`, `appeal_deadline`
  - `billing_notes`, `last_billing_action`, `assigned_biller`
  - `modifier_applied`, `billing_action_date`

**Schema defines:**
- Same core fields (`diagnosis_code`, `diagnosis_description`)
- But application code expects different field names: `diagnosis` and `icd10Code`

### 5. encounters table
**Database has 47 columns including:**
- Core fields: `id`, `patient_id`, `provider_id`, `encounter_date`
- Clinical documentation: `chief_complaint`, `notes`, `nurse_assessment`, `nurse_interventions`
- AI/Voice features: `ai_scribe_mode`, `ai_suggestions`, `transcription_id`, `assistant_thread_id`, `voice_recording_url`
- Billing fields: `insurance_verified`, `copay_collected`, `estimated_copay`, `billing_status`, `claim_number`, `reimbursement_amount`
- Workflow fields: `signed_by`, `signed_at`, `is_signed`, `signature_id`
- Draft fields: `draft_orders`, `draft_diagnoses`, `cpt_codes` (all jsonb)
- Additional: `discharge_summary`, `referral_source`, `template_id`

**Schema likely missing many of these production features**

### 6. patients table
**Database has additional columns:**
- `consent_given` (boolean) - Schema has this as consentGiven
- Various fields exist but with snake_case vs camelCase differences

### 7. health_systems table
**Database missing columns that schema defines:**
- Many of the subscription-related jsonb fields
- Billing details fields

## Naming Convention Issues

The primary issue is inconsistent naming conventions:
- **Database**: Uses snake_case (e.g., `appointment_type_id`, `created_at`)
- **Schema**: Uses camelCase (e.g., `appointmentTypeId`, `createdAt`)

This affects nearly every table and causes ORM mapping issues.

## Critical Functional Issues

1. **appointments.appointment_type**: The error logs show queries failing because:
   - Code expects `appointment_type` column (text)
   - Database has `appointment_type_id` column (integer reference)

2. **scheduling_ai_weights.factor_id**: The error logs show queries failing because:
   - Schema expects `factor_id` (integer reference)
   - Database has `factor_name` (varchar)

3. **Timestamp fields**: Many tables have timestamp fields in database not defined in schema:
   - Most tables have `created_at` and `updated_at` in database
   - Schema defines these as `createdAt` and `updatedAt` but Drizzle may not map them correctly

## Data Type Mismatches

1. **Date/Time handling**:
   - Schema: Uses separate `date` and `text` fields for appointments
   - Database: Uses `timestamp with timezone` for start_time/end_time

2. **Array types**:
   - Some arrays in database don't specify element type (just "ARRAY")
   - Schema specifies typed arrays like `text().array()`

## Missing Indexes and Constraints

The schema file shows index definitions that may not all be created in the database. Need to verify index creation separately.

## Summary of Patterns

### 1. **Naming Convention Inconsistency**
- **Database**: Consistently uses snake_case (e.g., `created_at`, `health_system_id`)
- **Schema**: Uses camelCase (e.g., `createdAt`, `healthSystemId`)
- This affects EVERY table and is the most pervasive issue

### 2. **Database Has More Features**
The database contains many production features not reflected in the schema:
- **Billing/RCM System**: Extensive billing columns in diagnoses, encounters, appointments
- **AI/Voice Features**: Transcription, AI suggestions, assistant threads
- **Clinical Workflow**: Nursing assessments, draft orders, signature tracking
- **Communication**: Reminders, confirmations, patient messaging
- **Accessibility**: Interpreter needs, wheelchair access
- **Review Tracking**: Chart review flags, lab review status

### 3. **Common Missing Columns in Schema**
Almost every table in the database has these columns that schema doesn't define:
- `created_at` and `updated_at` timestamps (schema has camelCase versions)
- Additional workflow tracking fields
- Billing and insurance fields
- AI/automation fields

### 4. **Reference Mismatches**
Some critical mismatches in how tables reference each other:
- `appointments.appointment_type` (schema: text) vs `appointment_type_id` (database: integer reference)
- `scheduling_ai_weights.factor_id` (schema: integer) vs `factor_name` (database: varchar)

### 5. **Data Type Differences**
- Date/time handling varies between text, date, and timestamp types
- Array types sometimes unspecified in database
- JSONB fields have different structures

## Overall Assessment

**The database represents a production system with many features that have been added over time, while the schema.ts file appears to be an older or simplified version that hasn't kept pace with production development.**

Key findings:
- **0 tables** exist only in schema (all schema tables exist in database)
- **1 table** exists only in database (session - created by express-session)
- **76 tables** exist in both but with significant column differences
- **Hundreds of columns** exist in database but not in schema
- **Naming convention mismatch** affects every single table

## Recommendations

1. **Immediate fixes needed for errors**:
   - Update `appointments` table queries to use `appointment_type_id` instead of `appointment_type`
   - Update `scheduling_ai_weights` queries to use `factor_name` instead of `factor_id`

2. **Schema alignment strategy needed**:
   - Decide on consistent naming convention (recommend snake_case to match database)
   - Audit all production features in database and add to schema
   - Create migration plan that preserves production data

3. **Data migration considerations**:
   - Running `npm run db:push` would likely cause significant data loss
   - Need comprehensive column mapping before any schema synchronization
   - Consider creating a new schema file that matches production database

4. **Technical debt resolution**:
   - The schema needs a complete overhaul to match production reality
   - Document all production features currently missing from schema
   - Establish process to keep schema in sync with database changes