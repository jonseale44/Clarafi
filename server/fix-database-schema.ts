import { db } from "./db";
import { sql } from "drizzle-orm";

async function fixDatabaseSchema() {
  try {
    console.log("Starting database schema fixes...");
    
    // Fix vitals table column names and add missing columns
    console.log("Fixing vitals table column names and adding missing columns...");
    try {
      // Check if columns exist with wrong names
      await db.execute(sql`
        DO $$ 
        BEGIN
          -- Rename systolic to systolic_bp if needed
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vitals' AND column_name = 'systolic') 
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vitals' AND column_name = 'systolic_bp') THEN
            ALTER TABLE vitals RENAME COLUMN systolic TO systolic_bp;
          END IF;
          
          -- Rename diastolic to diastolic_bp if needed
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vitals' AND column_name = 'diastolic') 
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vitals' AND column_name = 'diastolic_bp') THEN
            ALTER TABLE vitals RENAME COLUMN diastolic TO diastolic_bp;
          END IF;
        END $$;
      `);
      
      // Add missing vitals columns
      await db.execute(sql`
        ALTER TABLE vitals 
        ADD COLUMN IF NOT EXISTS notes text,
        ADD COLUMN IF NOT EXISTS alerts text[],
        ADD COLUMN IF NOT EXISTS parsed_from_text boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS original_text text,
        ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual_entry',
        ADD COLUMN IF NOT EXISTS source_confidence decimal(3,2) DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS source_notes text,
        ADD COLUMN IF NOT EXISTS extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        ADD COLUMN IF NOT EXISTS entered_by integer REFERENCES users(id);
      `);
      
      console.log("✓ Fixed vitals table column names and added missing columns");
    } catch (error) {
      console.error("Error fixing vitals table:", error);
    }
    
    // Fix medications table - add missing strength column
    console.log("Adding missing columns to medications table...");
    try {
      await db.execute(sql`
        ALTER TABLE medications 
        ADD COLUMN IF NOT EXISTS strength text;
      `);
      console.log("✓ Added strength column to medications table");
    } catch (error) {
      console.error("Error fixing medications table:", error);
    }
    
    // Create missing family_history table
    console.log("Creating family_history table...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS family_history (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          family_member text NOT NULL,
          medical_history text,
          last_updated_encounter integer REFERENCES encounters(id),
          visit_history jsonb,
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created family_history table");
    } catch (error) {
      console.error("Error creating family_history table:", error);
    }
    
    // Fix allergies table - ensure all columns exist
    console.log("Fixing allergies table columns...");
    try {
      await db.execute(sql`
        ALTER TABLE allergies 
        ADD COLUMN IF NOT EXISTS source_confidence decimal(3,2) DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS source_notes text,
        ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual_entry',
        ADD COLUMN IF NOT EXISTS extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        ADD COLUMN IF NOT EXISTS entered_by integer REFERENCES users(id);
      `);
      console.log("✓ Fixed allergies table columns");
    } catch (error) {
      console.error("Error fixing allergies table:", error);
    }
    
    // Create missing social_history table if needed
    console.log("Creating social_history table if missing...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS social_history (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          category text NOT NULL,
          current_status text NOT NULL,
          history_notes text,
          last_updated_encounter integer REFERENCES encounters(id),
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          visit_history jsonb,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created/verified social_history table");
    } catch (error) {
      console.error("Error creating social_history table:", error);
    }
    
    // Create missing surgical_history table if needed
    console.log("Creating surgical_history table if missing...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS surgical_history (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          procedure_name text NOT NULL,
          procedure_date date,
          surgeon text,
          facility text,
          notes text,
          outcome text,
          complications text,
          recovery_notes text,
          visit_history jsonb,
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created/verified surgical_history table");
    } catch (error) {
      console.error("Error creating surgical_history table:", error);
    }
    
    // Create missing medical_history table if needed
    console.log("Creating medical_history table if missing...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS medical_history (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          condition_category text NOT NULL,
          history_text text NOT NULL,
          last_updated_encounter integer REFERENCES encounters(id),
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created/verified medical_history table");
    } catch (error) {
      console.error("Error creating medical_history table:", error);
    }
    
    // Create missing medical_problems table if needed
    console.log("Creating medical_problems table if missing...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS medical_problems (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          problem_name text NOT NULL,
          icd10_code text,
          snomed_code text,
          problem_status text DEFAULT 'active',
          onset_date date,
          resolution_date date,
          severity text,
          clinical_notes text,
          visit_history jsonb,
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created/verified medical_problems table");
    } catch (error) {
      console.error("Error creating medical_problems table:", error);
    }
    
    // Create missing imaging_results table if needed  
    console.log("Creating imaging_results table if missing...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS imaging_results (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          imaging_type text NOT NULL,
          body_part text,
          imaging_date date,
          ordering_provider text,
          ordering_provider_id integer REFERENCES users(id),
          performing_facility text,
          radiologist text,
          clinical_indication text,
          technique text,
          comparison text,
          findings text,
          impression text,
          critical_findings boolean DEFAULT false,
          critical_findings_communicated_at timestamp,
          follow_up_needed boolean DEFAULT false,
          follow_up_instructions text,
          report_status text DEFAULT 'final',
          visit_history jsonb,
          source_type text DEFAULT 'manual_entry',
          source_confidence decimal(3,2) DEFAULT 1.00,
          source_notes text,
          extracted_from_attachment_id integer REFERENCES patient_attachments(id),
          entered_by integer REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✓ Created/verified imaging_results table");
    } catch (error) {
      console.error("Error creating imaging_results table:", error);
    }
    
    console.log("\n✅ Database schema fixes completed!");
    console.log("Note: You may need to run 'npm run db:push' to ensure complete schema synchronization.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error fixing database schema:", error);
    process.exit(1);
  }
}

fixDatabaseSchema();