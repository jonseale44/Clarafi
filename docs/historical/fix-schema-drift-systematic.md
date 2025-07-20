# Systematic Schema Drift Fix Plan

## Root Cause Confirmed
The issue is NOT a camelCase/snake_case mapping problem. Drizzle ORM is working correctly. The problem is schema drift - the database has evolved with columns that don't exist in schema.ts.

## Tables Requiring Immediate Fix (with NOT NULL constraints)

### 1. ✅ document_processing_queue (FIXED)
- Added missing columns: processor_type, priority, processing_metadata, error_message, retry_count, started_at, completed_at
- Updated insert schema to include all fields

### 2. allergies (reaction column issue)
- Database has "reaction" as NOT NULL but schema defines it as nullable
- Need to make reaction .notNull() in schema

### 3. patient_scheduling_patterns (from previous errors)
- Missing proper column definitions for snake_case columns
- Columns like avg_visit_duration, no_show_rate need to be added

### 4. appointments (extensive drift)
- Missing many columns based on previous scheduling errors
- Need to add appointment_date, ai_predicted_duration, etc.

### 5. orders (provider_name, urgency issues)
- Missing columns for referral functionality
- Need to add provider_name, urgency, ordered_at, approved_by, approved_at

## Fix Strategy

1. **Add missing columns to schema.ts** - Include all columns that exist in database
2. **Update insert schemas** - Include new fields in insert schemas
3. **Set proper defaults** - For NOT NULL columns, add .default() values
4. **Test each fix** - Verify operations work after updates

## Priority Order
1. Fix tables causing immediate errors (document_processing_queue ✅, allergies)
2. Fix tables used in core workflows (appointments, orders, patient_scheduling_patterns)
3. Fix remaining tables systematically

## Important Notes
- Do NOT remove columns from database - that would lose data
- Add missing columns to schema.ts to match database reality
- Use proper types (jsonb, arrays, etc.) as they exist in database