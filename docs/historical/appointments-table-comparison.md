# Appointments Table: Schema vs Database Comparison

## Overview
This document provides a detailed comparison between the appointments table as defined in schema.ts versus the actual database structure.

## Summary Statistics
- **Schema.ts columns**: 59 columns (includes encounter_id, parent_appointment_id, no_show_at not shown in initial view)
- **Database columns**: 82 columns
- **Missing from schema**: 23 columns (28% of database columns!)
- **Extra in schema**: 0 columns

> **Critical Finding**: The database has evolved significantly beyond the schema definition. 23 columns exist in the database that are not defined in schema.ts, representing real clinical features that cannot be accessed through TypeScript/Drizzle ORM.

## Detailed Comparison

### Columns Present in Both Schema and Database

| Column Name | Schema Type | Database Type | Match |
|------------|-------------|---------------|-------|
| id | serial (primaryKey) | integer | ✓ |
| patient_id | integer (notNull) | integer | ✓ |
| provider_id | integer (notNull) | integer | ✓ |
| location_id | integer (notNull) | integer | ✓ |
| appointment_date | date (notNull) | date | ✓ |
| start_time | text (notNull) | text | ✓ |
| end_time | text (notNull) | text | ✓ |
| duration | integer (notNull) | integer | ✓ |
| patient_visible_duration | integer | integer | ✓ |
| provider_scheduled_duration | integer | integer | ✓ |
| appointment_type | text (notNull) | text | ✓ |
| appointment_type_id | integer | integer | ✓ |
| chief_complaint | text | text | ✓ |
| visit_reason | text | text | ✓ |
| status | text (default: 'scheduled') | text | ✓ |
| confirmation_status | text (default: 'pending') | text | ✓ |
| checked_in_at | timestamp | timestamp without time zone | ✓ |
| checked_in_by | integer | integer | ✓ |
| room_assignment | text | text | ✓ |
| urgency_level | text (default: 'routine') | text | ✓ |
| scheduling_notes | text | text | ✓ |
| patient_preferences | jsonb | jsonb | ✓ |
| ai_scheduling_data | jsonb | jsonb | ✓ |
| reminders_sent | integer (default: 0) | integer | ✓ |
| last_reminder_sent | timestamp | timestamp without time zone | ✓ |
| communication_preferences | jsonb | jsonb | ✓ |
| external_appointment_id | text | text | ✓ |
| synced_at | timestamp | timestamp without time zone | ✓ |
| insurance_verified | boolean (default: false) | boolean | ✓ |
| verified_by | integer | integer | ✓ |
| copay_amount | decimal(10,2) | numeric(10,2) | ✓ |
| actual_duration | integer | integer | ✓ |
| ai_predicted_duration | integer | integer | ✓ |
| billing_notes | text | text | ✓ |
| cancellation_reason | text | text | ✓ |
| cancelled_at | timestamp | timestamp without time zone | ✓ |
| cancelled_by | integer | integer | ✓ |
| chart_reviewed | boolean (default: false) | boolean | ✓ |
| completed_at | timestamp | timestamp without time zone | ✓ |
| completed_by | integer | integer | ✓ |
| confirmation_sent | boolean (default: false) | boolean | ✓ |
| created_at | timestamp (defaultNow) | timestamp without time zone | ✓ |
| updated_at | timestamp (defaultNow) | timestamp without time zone | ✓ |
| created_by | integer (notNull) | integer | ✓ |
| encounter_id | integer | integer | ✓ |
| parent_appointment_id | integer | integer | ✓ |
| no_show_at | timestamp | timestamp without time zone | ✓ |

### Columns ONLY in Database (Missing from Schema)

These 23 columns exist in the database but are NOT defined in schema.ts:

| Column Name | Database Type | Purpose/Description |
|------------|---------------|---------------------|
| created_at | timestamp | When appointment was created |
| created_by | integer | User who created appointment |
| pre_appointment_notes | text | Notes before appointment |
| problems_reviewed | boolean | Whether problem list reviewed |
| provider_ready_at | timestamp | When provider was ready |
| recurrence_exceptions | jsonb | Exceptions to recurring appointments |
| recurrence_rule | text | Rule for recurring appointments |
| referral_reason | text | Reason for referral |
| referring_provider | text | Name of referring provider |
| reminder_sent | boolean | Whether reminder was sent |
| reminder_sent_at | timestamp | When reminder was sent |
| rescheduled_from | integer | Original appointment ID |
| rescheduled_reason | text | Why appointment was rescheduled |
| resource_requirements | jsonb | Required resources (equipment, rooms) |
| room_number | text | Specific room number |
| special_instructions | text | Special instructions for visit |
| tags | jsonb | Tags for categorization |
| updated_at | timestamp | When appointment was last updated |
| use_ai_scheduling | boolean | Whether to use AI scheduling |
| visit_completed_at | timestamp | When visit was completed |
| vital_signs_taken | boolean | Whether vitals were taken |
| wait_list_priority | integer | Priority on wait list |
| wheelchair_accessible | boolean | Whether room is wheelchair accessible |

### Columns ONLY in Schema (Not in Database)

**NONE** - All columns defined in schema.ts exist in the database (with camelCase to snake_case conversion).

## Impact Analysis

### Critical Missing Columns
These columns exist in the database but not in schema.ts, which means:
- TypeScript has no type safety for these fields
- Drizzle ORM cannot query these columns
- Any code using these columns must use raw SQL

### Development Recommendations
1. Update schema.ts to include all database columns
2. Run `npm run db:generate` to update type definitions
3. Test all appointment-related queries after update