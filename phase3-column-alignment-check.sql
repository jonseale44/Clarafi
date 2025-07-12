-- Phase 3: Column-Level Alignment Check
-- This script will check columns for each table

-- Function to check columns for a specific table
CREATE OR REPLACE FUNCTION check_table_columns(table_name_param TEXT)
RETURNS TABLE(
    column_name TEXT,
    data_type TEXT,
    is_nullable TEXT,
    column_default TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::TEXT,
        c.data_type::TEXT,
        c.is_nullable::TEXT,
        c.column_default::TEXT
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
    AND c.table_name = table_name_param
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Check a critical table first: encounters
SELECT 'ENCOUNTERS TABLE COLUMNS:' as info;
SELECT * FROM check_table_columns('encounters');