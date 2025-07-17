-- Fix missing columns that are causing errors
-- Based on the errors we're seeing:

-- 1. Allergies table - add last_reaction column that code expects
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS last_reaction DATE;

-- 2. Encounters table - add note column that code expects  
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS note TEXT;

-- 3. Vitals table - add entry_type column that code expects
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'manual';

-- Show the tables after fixes
\dt allergies
\dt encounters  
\dt vitals