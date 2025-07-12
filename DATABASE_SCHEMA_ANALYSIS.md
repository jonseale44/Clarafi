# Database vs Schema Analysis Report

## Overview
- **Schema Tables**: 48 tables defined in shared/schema.ts
- **Database Tables**: 45 tables in the actual database
- **Source of Truth**: schema.ts should be the source of truth

## Table-Level Discrepancies

### Tables in Database but NOT in Schema:
1. **session** - This appears to be the express-session store table (created by express-session package)

### Tables in Schema but NOT in Database:
1. **migrationInvitations** (migration_invitations) - line 2819 in schema.ts
2. **labReferenceRanges** (lab_reference_ranges) - line 1683 in schema.ts  
3. **patientPhysicalFindings** (patient_physical_findings) - line 1486 in schema.ts
4. **problemRankOverrides** (problem_rank_overrides) - line 2501 in schema.ts
5. **userProblemListPreferences** (user_problem_list_preferences) - line 2511 in schema.ts

## Column-Level Discrepancies Analysis

### Critical Column Mismatches

#### 1. diagnoses table
**MAJOR MISMATCH - Different column naming conventions**
- **Database columns**: diagnosis, icd10_code, diagnosis_date, plus many billing columns
- **Schema columns**: diagnosis_code, diagnosis_description, diagnosis_type, onset_date, resolution_date, severity, clinician_id
- **Database Extra Columns**: provider_id, is_primary, diagnosis_pointer, billing_sequence, claim_submission_status, claim_submission_date, claim_rejection_reason, medical_necessity_documented, prior_authorization_required, prior_authorization_number, modifier_applied, claim_id, clearinghouse_id, payer_id, allowed_amount, paid_amount, patient_responsibility, adjustment_amount, denial_reason, denial_code, appeal_status, appeal_deadline, billing_notes, last_billing_action, billing_action_date, assigned_biller, prior_auth_number
- **Issue**: Database has extensive RCM/billing columns that were removed from schema

#### 2. patients table
**Database extra columns**:
- created_by_user_id (not in schema) 
- profile_photo_filename (not in schema)
- **Note**: created_by_provider_id exists in both

#### 3. users table (missing from database query but likely has discrepancies)
**Database likely missing**:
- stripe_customer_id (removed from schema?)
- last_selected_note_type (not in schema)

#### 4. lab_results table
**Database columns**:
- previous_date is 'date' type in DB but schema defines it as 'timestamp' at line 1281
- qc_flags is ARRAY type in DB but schema defines it as jsonb

#### 5. external_labs table
**MAJOR MISMATCH - Completely different structure**
- **Schema columns (simple)**: labName, labIdentifier, integrationType, apiEndpoint, hl7Endpoint, apiKeyEncrypted, usernameEncrypted, sslCertificatePath, supportedTests, turnaroundTimes, active
- **Database columns (extensive)**: lab_name, lab_code, interface_type, connection_details, supported_tests, turnaround_times, operating_hours, contact_phone, contact_email, technical_contact, account_number, api_endpoint, api_key, sftp_host, sftp_username, sftp_password, sftp_directory, hl7_version, hl7_sending_facility, hl7_receiving_facility, test_mapping, result_mapping, requires_patient_consent, consent_form_url, billing_info, active, last_connection_test, connection_status, error_log, created_at, updated_at
- **Issue**: Database has production-level external lab integration features not in schema

#### 6. allergies table  
**Database extra columns**:
- drug_class (not in schema)
- last_reaction_date (not in schema)
- temporal_conflict_resolution (not in schema)
- consolidation_reasoning (not in schema)
- extraction_notes (not in schema)
- **Note**: cross_reactivity is ARRAY in DB, not defined in schema

#### 7. medications table
**Database extra columns**:
- source_confidence (numeric) - not in schema
- drug_interactions (jsonb) - not in schema
- prescriber_id (integer) - not in schema 
- encounter_id (integer) - not in schema

#### 8. medical_problems table
**CRITICAL MISMATCH - Completely different structure**
- **Schema columns** (lines 1035-1063): problemTitle, currentIcd10Code, problemStatus, firstDiagnosedDate, firstEncounterId, lastUpdatedEncounterId, visitHistory, changeLog, lastRankedEncounterId, rankingReason, rankingFactors
- **Database columns**: id, patient_id, visit_history, created_at, updated_at, ranking_factors
- **Issue**: Database is missing ALL clinical fields - appears to be a stripped-down version

## Data Type Mismatches

1. **lab_results.qc_flags**: ARRAY in database, but jsonb in schema
2. **locations.services**: ARRAY in database, but not defined in schema
3. **allergies.cross_reactivity**: ARRAY in database, but not in schema

## Summary of Critical Issues

1. **Missing Tables**: 5 tables defined in schema but not created in database
   - migrationInvitations, labReferenceRanges, patientPhysicalFindings, problemRankOverrides, userProblemListPreferences

2. **Extra Database Table**: 1 table (session) exists in database but not in schema - this is OK as it's managed by express-session

3. **Major Structural Mismatches**:
   - **diagnoses table**: Database has extensive RCM/billing columns not in current schema
   - **medical_problems table**: Database missing ALL clinical fields - only has basic structure
   - **external_labs table**: Database has production-level features not reflected in schema

4. **Column Naming Convention Issues**:
   - diagnoses: 'diagnosis' vs 'diagnosis_code/diagnosis_description'  
   - external_labs: camelCase in schema vs snake_case in database

5. **Missing Columns in Schema**: 
   - Many production features exist in database but not documented in schema
   - Suggests schema was simplified but database retained production features

6. **Data Type Mismatches**:
   - lab_results.previous_date: timestamp vs date
   - lab_results.qc_flags: ARRAY vs jsonb
   - allergies.cross_reactivity: ARRAY vs not defined

## Root Cause Analysis

The discrepancies suggest several scenarios:
1. **Schema Simplification**: The schema.ts was refactored to be cleaner/simpler but database wasn't migrated
2. **Production vs Development Drift**: Database has accumulated production features not back-ported to schema
3. **Failed Migration**: A migration to update column names (e.g., diagnoses table) was defined but not executed
4. **Parallel Development**: Different developers added features to database vs schema independently

## Critical Risks

1. **Application Errors**: Code expecting schema structure will fail with database structure (e.g., diagnosis vs diagnosis_code)
2. **Data Loss Risk**: Running db:push could drop production columns not in schema
3. **Feature Loss**: Production features in database (RCM billing, external lab integration) not accessible via ORM

## Functional Code Analysis - Correct Structure Determination

Based on analysis of the actual functional code, here's which structure is correct for each major discrepancy:

### 1. **diagnoses table** - DATABASE IS CORRECT ✓
- **Functional code expects**: `diagnosis`, `icd10Code` (camelCase)
- **Evidence**: 
  - `cpt-codes-diagnoses.tsx` interface uses `diagnosis` and `icd10Code`
  - `routes.ts` creates diagnoses with these field names
  - `storage.ts` already has workaround mapping database fields
- **Action**: Update schema.ts to use `diagnosis` and `icd10_code` instead of `diagnosis_code`/`diagnosis_description`

### 2. **medical_problems table** - SCHEMA IS CORRECT ✓
- **Functional code expects**: Complex structure with `problemTitle`, `currentIcd10Code`, `problemStatus`, `visitHistory`, etc.
- **Evidence**:
  - All unified medical problems services expect these fields
  - `enhanced-medical-problems-dialog.tsx` uses full structure
  - `patient-chart-service.ts` queries for complex fields
- **Action**: Database needs migration to add missing columns

### 3. **patients table** - MIXED
- **profile_photo_filename**: DATABASE IS CORRECT - Used in `patient-header.tsx` and `unified-chart-panel.tsx`
- **created_by_user_id**: NEITHER - Code uses `createdByProviderId` (camelCase in schema, snake_case would be `created_by_provider_id`)
- **Action**: Keep `profile_photo_filename`, ensure `createdByProviderId` mapping works

### 4. **external_labs table** - SCHEMA IS CORRECT ✓
- **Functional code expects**: camelCase columns (`labName`, `labIdentifier`)
- **Evidence**: Schema references in code expect camelCase
- **Database has**: snake_case columns (`lab_name`, `lab_identifier`) plus many extra production features
- **Action**: Either update database columns to camelCase OR update all code to use snake_case

### 5. **Missing Tables** - SCHEMA IS CORRECT ✓
- Tables like `migrationInvitations`, `labReferenceRanges`, etc. are defined in schema but missing from database
- These are likely new features that haven't been deployed
- **Action**: Create these tables in database

## Recommended Resolution Strategy (UPDATED)

### Phase 1: Immediate Fixes (Prevent Errors)
1. **DO NOT run db:push** - it will drop production data
2. **Fix critical errors blocking functionality**:
   - Add temporary column mappings in storage.ts (like done for diagnoses)
   - Handle missing columns gracefully

### Phase 2: Schema Updates (Match Functional Code)
1. **Update diagnoses table schema** to match database/code expectations:
   ```typescript
   diagnosis: text("diagnosis"),
   icd10Code: text("icd10_code"),
   diagnosisDate: date("diagnosis_date"),
   ```
2. **Keep medical_problems schema** as-is (it's correct)
3. **Add missing production columns** to schema where actively used

### Phase 3: Safe Database Migration
1. **For medical_problems table**: Add missing columns via SQL migration
2. **For external_labs**: Decide on naming convention and migrate accordingly
3. **Create missing tables** from schema
4. **Test thoroughly** before production deployment

### Phase 4: Long-term Solution
1. **Single source of truth**: schema.ts should define all structures
2. **Automated drift detection**: CI/CD to compare schema vs database
3. **Document Replit limitation**: Add warning that rollbacks don't affect database
4. **Migration-first approach**: Never use db:push in production