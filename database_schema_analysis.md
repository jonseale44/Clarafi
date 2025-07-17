# Database vs Schema Analysis Report
Generated on: January 17, 2025
**Status: RESOLVED - All critical issues have been fixed**

## Summary of Findings

### Tables Analysis

#### Tables in Database but NOT in Schema (2 tables)
1. **dashboards** - Appears to be an extra table not defined in the schema
2. **session** - Session management table (likely from connect-pg-simple or express-session)

#### Tables in Schema but NOT in Database (33 tables)
1. asymmetric_scheduling_config
2. attachment_extracted_content
3. data_modification_logs
4. document_processing_queue
5. email_notifications
6. emergency_access_logs
7. external_labs
8. gpt_lab_review_notes
9. imaging_orders
10. magic_links
11. medical_history
12. medication_formulary
13. organization_documents
14. patient_order_preferences
15. patient_scheduling_patterns
16. provider_schedules
17. provider_scheduling_patterns
18. realtime_schedule_status
19. resource_bookings
20. schedule_exceptions
21. schedule_preferences
22. scheduling_resources
23. scheduling_rules
24. scheduling_templates
25. signatures
26. signed_orders
27. subscription_history
28. subscription_keys
29. template_shares
30. template_versions
31. user_assistant_threads
32. user_edit_patterns
33. user_note_templates

#### Tables Present in Both (43 tables)
admin_prompt_reviews, allergies, appointment_duration_history, appointment_resource_requirements, 
appointments, appointment_types, article_comments, article_generation_queue, article_revisions, 
articles, authentication_logs, clinic_admin_verifications, diagnoses, encounters, family_history, 
health_systems, imaging_results, lab_orders, lab_reference_ranges, lab_results, locations, 
medical_problems, medications, migration_invitations, newsletter_subscribers, orders, organizations, 
patient_attachments, patient_physical_findings, patients, phi_access_logs, problem_rank_overrides, 
scheduling_ai_factors, scheduling_ai_weights, social_history, surgical_history, user_locations, 
user_note_preferences, user_problem_list_preferences, user_session_locations, users, vitals, 
webauthn_credentials

### Column-Level Discrepancies

#### Users Table
**Database has but Schema doesn't have:**
- license_state (varchar)
- bio (text)
- is_active (boolean)
- profile_image_url (varchar)
- created_at (timestamp) - Note: Schema has 'createdAt'
- updated_at (timestamp)

**Schema has but Database doesn't have:**
- None (all schema columns exist in database)

**Note:** Some columns have naming convention differences (snake_case in DB vs camelCase in schema):
- created_at vs createdAt
- health_system_id vs healthSystemId
- first_name vs firstName
- last_name vs lastName
- etc.

#### Patients Table
**Database has but Schema doesn't have:**
- middle_name (varchar)
- phone_type (varchar)
- city (varchar)
- state (varchar)
- zip (varchar)
- insurance_provider (varchar)
- insurance_policy_number (varchar)
- insurance_group_number (varchar)
- emergency_contact_name (varchar)
- emergency_contact_phone (varchar)
- emergency_contact_relationship (varchar)
- preferred_language (varchar)
- race (varchar)
- ethnicity (varchar)

**Schema has but Database doesn't have:**
- consentGiven

#### Health Systems Table
**Database has but Schema doesn't have:**
- type (varchar) - Note: Schema uses 'systemType'
- subscription_key (varchar)
- is_migration (boolean)
- stripe_customer_id (varchar)
- metadata (jsonb)
- created_at (timestamp with time zone) - Note: Schema has 'createdAt' without timezone
- updated_at (timestamp with time zone)
- status (text)

**Schema has but Database doesn't have:**
- None (all schema columns exist in database with naming differences)

#### Surgical History Table
**Database has but Schema doesn't have:**
- surgeon (text)
- facility (text)
- findings (text)
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
- follow_up_date (date)
- consolidation_reasoning (text)
- merged_ids (array)
- visit_history (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

**Schema Columns Not Verified in Database:**
The schema for surgical_history includes many additional columns that may or may not exist in the database, including surgeon_name, facility_name, cpt_code, icd10_procedure_code, anatomical_site, urgency_level, blood_loss, transfusions_required, implants_hardware, recovery_status, and last_updated_encounter

### Critical Issues Found

1. **Missing GPT Lab Review Notes Table**: Confirmed that the `gpt_lab_review_notes` table does not exist in the database (verified via SQL query), but it is defined in the schema. This causes patient deletion to fail with the error: `relation "gpt_lab_review_notes" does not exist`.

2. **Column Naming Convention Mismatch**: The schema uses camelCase while the database uses snake_case. This could cause issues with the ORM mappings.

3. **Missing Tables**: 33 tables defined in the schema are not present in the database, indicating incomplete database setup or migration issues.

4. **Extra Database Tables**: The `dashboards` and `session` tables exist in the database but are not defined in the schema, which could indicate manual database modifications.

5. **Column Mismatches**: Several tables have columns in the database that don't match the schema definition, particularly in the patients and users tables.

### Recommendations

1. **Immediate Action Required**:
   - Create the missing `gpt_lab_review_notes` table to fix the patient deletion error
   - Run migrations to create all 33 missing tables

2. **Data Integrity**:
   - Review and reconcile column differences, especially for critical tables like users and patients
   - Ensure naming conventions are consistent between schema and database

3. **Schema Cleanup**:
   - Either add the `dashboards` and `session` tables to the schema or remove them from the database
   - Update schema definitions to match the actual database structure where appropriate

4. **Migration Strategy**:
   - Consider using `npm run db:push` to synchronize the schema with the database
   - Back up the database before making any structural changes