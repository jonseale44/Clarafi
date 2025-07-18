# Unused Database Columns Report

## Summary
- **Total Extra Columns Analyzed**: 542
- **Actively Used**: 366 (68%)
- **Unused**: 176 (32%)

## Purpose
This report lists all database columns that exist in the database but are:
1. Not defined in schema.ts
2. Not actively used in the codebase

These columns are candidates for removal from the database after careful review.

## Unused Columns by Table

### allergies (1 unused column)
- entry_method

### appointments (5 unused columns)
- virtual_meeting_link
- preparation_instructions
- follow_up_required
- intake_form_completed
- recurring_pattern

### assistant_interactions (5 unused columns)
- session_id
- context
- response_time_ms
- error_details
- user_feedback

### attachments (2 unused columns)
- processing_attempts
- processing_error

### blog_articles (5 unused columns)
- canonical_url
- social_media_image
- schema_markup
- reading_time
- last_crawled_at

### encounters (13 unused columns)
- admission_date
- discharge_date
- referring_provider
- admitting_diagnosis
- discharge_diagnosis
- discharge_disposition
- level_of_service
- teaching_encounter
- interpreter_needed
- interpreter_language
- advance_directives_discussed
- discharge_instructions
- follow_up_appointments

### family_history (1 unused column)
- family_member_deceased

### health_systems (3 unused columns)
- time_zone
- operating_hours
- custom_features

### lab_results (10 unused columns)
- delta_value
- critical_notified_at
- critical_notified_by
- specimen_source
- collection_method
- specimen_condition
- test_methodology
- instrument_id
- lot_number
- reagent_expiry

### locations (7 unused columns)
- parking_info
- accessibility_features
- insurance_accepted
- languages_spoken
- appointment_types_offered
- lab_draw_site
- imaging_available

### medical_history (3 unused columns)
- reaction_severity
- witnessed_by
- emergency_contact_notified

### medical_problems (3 unused columns)
- patient_reported
- family_history_relevant
- genetic_markers

### medications (8 unused columns)
- prescribed_by_external
- external_pharmacy
- cost_per_dose
- insurance_coverage
- patient_assistance_program
- compound_ingredients
- stability_date
- disposal_instructions

### migration_invitations (8 unused columns)
- invitation_type
- migration_options
- custom_message
- reminder_count
- last_reminder_sent
- accepted_terms
- migration_preferences
- legacy_system_data

### organization_documents (3 unused columns)
- compliance_type
- review_required
- reviewer_notes

### organizations (5 unused columns)
- billing_npi
- default_appointment_duration
- telemedicine_enabled
- patient_portal_enabled
- custom_branding

### patient_order_preferences (3 unused columns)
- consent_on_file
- standing_orders
- auto_release_results

### patient_physical_findings (4 unused columns)
- body_location_code
- laterality
- measurement_value
- measurement_unit

### patients (15 unused columns)
- occupation
- employer
- work_phone
- marital_status
- emergency_contact_relationship
- living_will_on_file
- power_of_attorney
- organ_donor
- blood_type
- pharmacy_name
- pharmacy_phone
- pcp_name
- pcp_phone
- insurance_group_number
- insurance_effective_date

### problem_rank_overrides (2 unused columns)
- override_source
- clinical_rationale

### providers_schedules (10 unused columns)
- appointment_types
- new_patient_duration
- established_patient_duration
- telemedicine_available
- double_booking_allowed
- buffer_time
- lunch_break_start
- lunch_break_end
- max_daily_patients
- advance_booking_days

### realtime_transcripts (2 unused columns)
- confidence_score
- speaker_identification

### scheduling_ai_factors (2 unused columns)
- seasonal_variation
- historical_accuracy

### subscription_keys (3 unused columns)
- usage_limits
- feature_restrictions
- renewal_reminder_sent

### user_note_preferences (3 unused columns)
- auto_save_interval
- spell_check_enabled
- voice_to_text_enabled

### user_preferences (12 unused columns)
- notification_preferences
- dashboard_layout
- default_view
- color_blind_mode
- font_size_preference
- keyboard_shortcuts
- auto_logout_minutes
- timezone_override
- date_format
- time_format
- measurement_units
- currency_preference

### users (13 unused columns)
- middle_name
- suffix
- date_of_birth
- gender
- preferred_pronouns
- primary_location_id
- secondary_email
- mobile_phone
- pager_number
- office_extension
- available_for_referrals
- accepts_new_patients
- languages_spoken

### vital_ranges (5 unused columns)
- reference_population
- confidence_interval
- last_reviewed_date
- reviewed_by
- clinical_notes

### vitals (8 unused columns)
- pain_scale_type
- oxygen_flow_rate
- oxygen_delivery_method
- position_during_measurement
- activity_before_measurement
- time_since_last_meal
- environmental_temperature
- measurement_device

### webauthn_credentials (2 unused columns)
- last_success_timestamp
- failure_count

## Recommendations

1. **Review with clinical team**: Some unused columns may be reserved for future features
2. **Check for regulatory requirements**: Some columns might be needed for compliance
3. **Consider data migration**: Ensure no historical data dependencies exist
4. **Test thoroughly**: Before removing any columns, test in a non-production environment
5. **Create backup**: Always backup the database before removing columns

## Next Steps

1. Review each unused column with the development team
2. Identify columns that can be safely removed
3. Create a migration script to remove approved columns
4. Test the removal in a staging environment
5. Deploy to production with proper rollback plan