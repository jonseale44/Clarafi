-- Phase 2: Drop Extra Tables
-- These tables exist in database but NOT in schema.ts
-- They should be removed to align with schema.ts as the source of truth

-- First, let's check for any foreign key dependencies
DO $$ 
BEGIN
    -- Drop tables one by one to avoid dependency issues
    
    -- 1. Drop care_plans (likely no dependencies)
    DROP TABLE IF EXISTS care_plans CASCADE;
    RAISE NOTICE 'Dropped table: care_plans';
    
    -- 2. Drop cpt_codes (likely no dependencies)
    DROP TABLE IF EXISTS cpt_codes CASCADE;
    RAISE NOTICE 'Dropped table: cpt_codes';
    
    -- 3. Drop lab_reference_ranges (might be referenced by lab_results)
    DROP TABLE IF EXISTS lab_reference_ranges CASCADE;
    RAISE NOTICE 'Dropped table: lab_reference_ranges';
    
    -- 4. Drop migration_invitations (likely no dependencies)
    DROP TABLE IF EXISTS migration_invitations CASCADE;
    RAISE NOTICE 'Dropped table: migration_invitations';
    
    -- 5. Drop nursing_assessments (likely no dependencies)
    DROP TABLE IF EXISTS nursing_assessments CASCADE;
    RAISE NOTICE 'Dropped table: nursing_assessments';
    
    -- 6. Drop patient_physical_findings (likely no dependencies)
    DROP TABLE IF EXISTS patient_physical_findings CASCADE;
    RAISE NOTICE 'Dropped table: patient_physical_findings';
    
    -- 7. Drop problem_rank_overrides (likely no dependencies)
    DROP TABLE IF EXISTS problem_rank_overrides CASCADE;
    RAISE NOTICE 'Dropped table: problem_rank_overrides';
    
    -- 8. Drop session (Express session table, no dependencies)
    DROP TABLE IF EXISTS session CASCADE;
    RAISE NOTICE 'Dropped table: session';
    
    -- 9. Drop user_problem_list_preferences (likely no dependencies)
    DROP TABLE IF EXISTS user_problem_list_preferences CASCADE;
    RAISE NOTICE 'Dropped table: user_problem_list_preferences';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping tables: %', SQLERRM;
END $$;

-- Verify tables were dropped
SELECT 'Tables that should NOT exist:' as status
UNION ALL
SELECT '  ' || table_name || ': ' || 
    CASE WHEN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = t.table_name
    ) THEN 'STILL EXISTS (ERROR!)' 
    ELSE 'Successfully removed' 
    END
FROM (VALUES 
    ('care_plans'),
    ('cpt_codes'),
    ('lab_reference_ranges'),
    ('migration_invitations'),
    ('nursing_assessments'),
    ('patient_physical_findings'),
    ('problem_rank_overrides'),
    ('session'),
    ('user_problem_list_preferences')
) AS t(table_name);