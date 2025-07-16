-- Fix schema mismatches between database and schema.ts

-- 1. Make health_systems.type nullable (it's duplicating system_type)
ALTER TABLE health_systems 
ALTER COLUMN type DROP NOT NULL;

-- 2. Add organization_id to locations table (code expects this column)
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- 3. Update organizations table to match schema.ts structure
-- First add missing columns
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS health_system_id INTEGER REFERENCES health_systems(id);

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS short_name TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS organization_type TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS region TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS tax_id TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS npi TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Rename existing columns to match schema.ts
ALTER TABLE organizations 
RENAME COLUMN zip TO zip_code;

-- Set NOT NULL constraint on organization_type after adding it
UPDATE organizations SET organization_type = 'clinic' WHERE organization_type IS NULL;
ALTER TABLE organizations ALTER COLUMN organization_type SET NOT NULL;

-- Optional: Set type column in health_systems to be same as system_type for consistency
UPDATE health_systems SET type = system_type WHERE type IS NULL OR type != system_type;