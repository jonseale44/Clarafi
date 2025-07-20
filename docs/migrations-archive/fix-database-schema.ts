#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function fixDatabaseSchema() {
  console.log("🔧 Fixing database schema issues...");
  
  try {
    // Check if email_verified column exists in users table
    const emailVerifiedResult = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `);
    
    if (emailVerifiedResult.length === 0) {
      console.log("Adding email_verified column to users table...");
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN email_verified boolean DEFAULT false
      `);
    }
    
    // Check if email column exists in authentication_logs table
    const emailResult = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'authentication_logs' AND column_name = 'email'
    `);
    
    if (emailResult.length === 0) {
      console.log("Adding email column to authentication_logs table...");
      await db.execute(sql`
        ALTER TABLE authentication_logs 
        ADD COLUMN email text
      `);
    }
    
    // Check if user_note_preferences table exists
    const userNotePrefsResult = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'user_note_preferences'
    `);
    
    if (userNotePrefsResult.length === 0) {
      console.log("Creating user_note_preferences table...");
      await db.execute(sql`
        CREATE TABLE user_note_preferences (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          default_soap_template integer,
          default_apso_template integer,
          default_progress_template integer,
          default_h_and_p_template integer,
          default_discharge_template integer,
          default_procedure_template integer,
          last_selected_note_type text DEFAULT 'soap',
          global_ai_learning boolean DEFAULT true,
          learning_aggressiveness text DEFAULT 'moderate',
          remember_last_template boolean DEFAULT true,
          show_template_preview boolean DEFAULT true,
          auto_save_changes boolean DEFAULT true,
          medical_problems_display_threshold integer DEFAULT 100,
          ranking_weights jsonb DEFAULT '{"clinical_severity": 40, "treatment_complexity": 30, "patient_frequency": 20, "clinical_relevance": 10}',
          chart_panel_width integer DEFAULT 400,
          enable_dense_view boolean DEFAULT false,
          created_at timestamp DEFAULT NOW(),
          updated_at timestamp DEFAULT NOW()
        )
      `);
    }
    
    // Check if imaging_results table exists and has correct structure
    const imagingResultsResult = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'imaging_results'
    `);
    
    if (imagingResultsResult.length === 0) {
      console.log("Creating imaging_results table...");
      await db.execute(sql`
        CREATE TABLE imaging_results (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          encounter_id integer REFERENCES encounters(id),
          imaging_order_id integer,
          result_date timestamp NOT NULL,
          study_type text NOT NULL,
          modality text NOT NULL,
          body_part text NOT NULL,
          findings text,
          impression text,
          radiologist_name text,
          status text DEFAULT 'final',
          created_at timestamp DEFAULT NOW(),
          updated_at timestamp DEFAULT NOW()
        )
      `);
    }
    
    // Check if orders table has correct diagnosis_code column (not plural)
    const diagnosisCodeResult = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'diagnosis_code'
    `);
    
    const diagnosisCodesResult = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'diagnosis_codes'
    `);
    
    if (diagnosisCodesResult.length > 0 && diagnosisCodeResult.length === 0) {
      console.log("Renaming diagnosis_codes to diagnosis_code in orders table...");
      await db.execute(sql`
        ALTER TABLE orders 
        RENAME COLUMN diagnosis_codes TO diagnosis_code
      `);
    }
    
    console.log("✅ Database schema fixes completed!");
    
  } catch (error) {
    console.error("❌ Error fixing database schema:", error);
    throw error;
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));