-- Comprehensive database vs schema.ts check
-- This query lists ALL tables and their columns in the database

SELECT 
    t.table_name,
    string_agg(
        c.column_name || ' (' || c.data_type || 
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END ||
        ')',
        ', ' ORDER BY c.ordinal_position
    ) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
GROUP BY t.table_name
ORDER BY t.table_name;