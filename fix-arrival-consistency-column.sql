-- Fix missing arrival_consistency column in patient_scheduling_patterns table

ALTER TABLE patient_scheduling_patterns 
ADD COLUMN IF NOT EXISTS arrival_consistency DECIMAL(5,2);