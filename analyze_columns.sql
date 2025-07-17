-- Check columns for users table
SELECT 
    'USERS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check columns for patients table
SELECT 
    'PATIENTS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- Check columns for encounters table
SELECT 
    'ENCOUNTERS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'encounters'
ORDER BY ordinal_position;

-- Check columns for health_systems table
SELECT 
    'HEALTH_SYSTEMS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'health_systems'
ORDER BY ordinal_position;

-- Check columns for locations table
SELECT 
    'LOCATIONS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'locations'
ORDER BY ordinal_position;