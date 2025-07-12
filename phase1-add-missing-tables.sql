-- Phase 1: Add Missing Tables
-- These tables exist in schema.ts but not in the database

-- 1. Create admin_prompt_reviews table
CREATE TABLE IF NOT EXISTS admin_prompt_reviews (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES user_note_templates(id),
  original_prompt TEXT NOT NULL,
  reviewed_prompt TEXT,
  admin_user_id INTEGER REFERENCES users(id),
  review_status TEXT DEFAULT 'pending',
  review_notes TEXT,
  is_active BOOLEAN DEFAULT false,
  performance_metrics JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- 2. Create medication_formulary table
CREATE TABLE IF NOT EXISTS medication_formulary (
  id SERIAL PRIMARY KEY,
  generic_name TEXT NOT NULL,
  brand_names TEXT[],
  common_names TEXT[],
  standard_strengths TEXT[] NOT NULL,
  available_forms TEXT[] NOT NULL,
  form_routes JSONB NOT NULL,
  sig_templates JSONB NOT NULL,
  common_doses TEXT[],
  max_daily_dose TEXT,
  therapeutic_class TEXT NOT NULL,
  indication TEXT NOT NULL,
  requires_special_handling BOOLEAN DEFAULT false,
  special_handling_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify tables were created
SELECT 'admin_prompt_reviews' as table_name, EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_prompt_reviews'
) as created
UNION ALL
SELECT 'medication_formulary' as table_name, EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'medication_formulary'
) as created;