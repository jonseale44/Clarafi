-- Check for extra columns in critical tables
-- These queries will help identify columns that need to be removed

-- 1. Check diagnoses table
SELECT 'DIAGNOSES TABLE - Columns in DB:' as info;
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'diagnoses'
ORDER BY ordinal_position;

-- 2. Check medications table  
SELECT 'MEDICATIONS TABLE - Columns in DB:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'medications'
ORDER BY ordinal_position;

-- 3. Check medical_problems table
SELECT 'MEDICAL_PROBLEMS TABLE - Columns in DB:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'medical_problems'
ORDER BY ordinal_position;