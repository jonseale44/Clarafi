-- Comprehensive Database Validation Script
-- Generated: January 17, 2025
-- Purpose: Compare database tables with schema.ts and fix all discrepancies

-- First, let's see what tables exist in database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;