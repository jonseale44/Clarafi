-- Fix missing portal_release_status column in lab_results table
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS portal_release_status TEXT DEFAULT 'hold';
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS portal_release_by INTEGER REFERENCES users(id);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS portal_release_at TIMESTAMP;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS block_portal_release BOOLEAN DEFAULT false;

-- Add communication_plan column which might also be missing
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS communication_plan JSONB;