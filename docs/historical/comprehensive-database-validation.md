# COMPREHENSIVE DATABASE-SCHEMA MIGRATION STRATEGY

## 🎯 MIGRATION GOALS
1. Preserve all existing data (no deletions)
2. Add orphaned columns back to schema
3. Create missing tables in database
4. Document everything for reversibility

## 📊 AUDIT RESULTS SUMMARY

### Database Statistics:
- **78 tables** in database 
- **76 tables** in schema
- **Hundreds of orphaned columns** with actual data
- **2 tables** only in database: `dashboards`, `session`
- **0 tables** missing from database (all schema tables exist)

### Critical Findings:
1. **Rollback Theory Confirmed**: Many orphaned columns have data, indicating they were once valid schema columns that got rolled back
2. **Missing Columns in DB**: `imaging_results.laterality` and `document_processing_queue.attempts` 
3. **Export Issue**: `migrationInvitations` table is exported but not created in database
4. **Orphaned Table**: `dashboards` exists in DB with no schema

## 🛡️ SAFE MIGRATION APPROACH

### Phase 1: Backup & Document (COMPLETED ✅)
- Database structure backed up to: `database-backup-2025-07-17T17-16-59-521Z.json`
- Full audit saved to: `database-audit-2025-07-17T17-16-59-521Z.md`
- Recovery schema generated: `schema-recovery-2025-07-17T17-16-59-521Z.ts`

### Phase 2: Add Orphaned Columns to Schema
**Action**: Add all orphaned columns back to `schema.ts` to match the database
**Why**: These columns have data and were likely valid before a rollback
**How**: Use the generated recovery schema as a guide

### Phase 3: Fix Known Issues
1. **Add missing columns to database**:
   - `imaging_results.laterality`
   - `document_processing_queue.attempts`
   
2. **Fix migrationInvitations table**:
   - Ensure proper export in schema.ts
   - Run db:push to create table

3. **Handle dashboards table**:
   - Either add schema definition OR
   - Remove table if truly unused (has 0 records)

### Phase 4: Validate & Test
1. Run the application and check for errors
2. Verify all features work correctly
3. Check that data integrity is maintained

### Phase 5: Clean Up (OPTIONAL - LATER)
After extensive testing, optionally remove truly unused columns

## 🚨 CRITICAL COLUMNS WITH DATA

These orphaned columns have actual data and should definitely be added back:

### appointments table:
- health_system_id (1 value)
- name (4 values)
- duration_minutes (4 values)
- color (4 values)
- is_active (4 values)

### locations table:
- name, address, city, state, zip (1 value each)
- health_system_id (1 value)
- services (1 value)
- has_lab, has_imaging, has_pharmacy (1 value each)

### organizations table:
- name (1 value)

### patients table:
- insurance_verified (6 values)

### users table:
- username (5 values)
- email (5 values)
- is_verified (5 values)
- health_system_id (5 values)
- role (5 values)

### vitals table:
- patient_id (15 values)
- recorded_at (15 values)
- temperature (11 values)
- heart_rate (15 values)
- respiratory_rate (13 values)
- blood_pressure (11 values)
- oxygen_saturation (12 values)
- height (7 values)
- weight (8 values)
- bmi (5 values)

## 🔧 IMMEDIATE ACTIONS NEEDED

1. **FIRST**: Fix the two missing columns that are causing runtime errors:
   - Add `laterality` to `imaging_results` table in database
   - Add `attempts` to `document_processing_queue` table in database

2. **SECOND**: Add orphaned columns with data back to schema.ts

3. **THIRD**: Fix the `migrationInvitations` table creation

4. **FOURTH**: Decide on `dashboards` table (add schema or remove)

## ⚡ QUICK FIX SQL

```sql
-- Add missing columns that schema expects
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS laterality TEXT;
ALTER TABLE document_processing_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
```

## 📝 NEXT STEPS

Would you like me to:
1. Start by fixing the immediate runtime errors (missing columns)?
2. Begin adding all orphaned columns back to the schema?
3. Create a more detailed column-by-column migration plan?

The key insight here is that your rollback theory is correct - the database has preserved many valid columns that were rolled back from the schema, and we should add them back rather than delete them.