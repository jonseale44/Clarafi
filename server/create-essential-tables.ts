import { db } from "./db";
import { sql } from "drizzle-orm";

async function createEssentialTables() {
  try {
    console.log("Creating essential tables...");
    
    // Create users table
    console.log("Creating users table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "username" varchar(50) NOT NULL,
        "email" varchar(255),
        "password" varchar(255) NOT NULL,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "role" varchar(50) DEFAULT 'user',
        "npi" varchar(20),
        "credentials" varchar(50),
        "specialties" varchar(255)[],
        "license_number" varchar(50),
        "license_state" varchar(2),
        "bio" text,
        "is_active" boolean DEFAULT true,
        "last_login" timestamp,
        "profile_image_url" varchar(500),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_username_unique" UNIQUE("username"),
        CONSTRAINT "users_email_unique" UNIQUE("email")
      );
    `);
    
    // Create user_note_preferences table
    console.log("Creating user_note_preferences table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_note_preferences" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "last_selected_note_type" varchar(50),
        "default_chief_complaint" text,
        "default_physical_exam" text,
        "default_ros_negatives" text,
        "default_assessment_style" varchar(20),
        "use_voice_commands" boolean DEFAULT false,
        "auto_save_interval" integer DEFAULT 30,
        "show_template_suggestions" boolean DEFAULT true,
        "include_time_stamps" boolean DEFAULT false,
        "default_note_font_size" integer DEFAULT 14,
        "default_macro_set" varchar(50),
        "preferred_exam_order" text[],
        "custom_normal_exams" jsonb DEFAULT '{}',
        "abbreviation_expansions" jsonb DEFAULT '{}',
        "quick_phrases" jsonb DEFAULT '[]',
        "billing_reminder_enabled" boolean DEFAULT true,
        "sign_reminder_minutes" integer DEFAULT 30,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create patients table (needed for encounters)
    console.log("Creating patients table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" serial PRIMARY KEY NOT NULL,
        "external_id" varchar(100),
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "middle_name" varchar(100),
        "date_of_birth" date NOT NULL,
        "gender" varchar(20),
        "email" varchar(255),
        "phone" varchar(20),
        "phone_type" varchar(20),
        "address" varchar(255),
        "city" varchar(100),
        "state" varchar(2),
        "zip" varchar(10),
        "insurance_provider" varchar(100),
        "insurance_policy_number" varchar(50),
        "insurance_group_number" varchar(50),
        "emergency_contact_name" varchar(200),
        "emergency_contact_phone" varchar(20),
        "emergency_contact_relationship" varchar(50),
        "preferred_language" varchar(50) DEFAULT 'English',
        "race" varchar(50),
        "ethnicity" varchar(50),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create encounters table (needed for orders)
    console.log("Creating encounters table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "encounters" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL,
        "provider_id" integer NOT NULL,
        "encounter_date" timestamp DEFAULT CURRENT_TIMESTAMP,
        "encounter_type" varchar(50),
        "visit_reason" text,
        "status" varchar(20) DEFAULT 'in-progress',
        "location" varchar(100),
        "insurance_verified" boolean DEFAULT false,
        "copay_collected" numeric(10, 2),
        "notes" text,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create orders table
    console.log("Creating orders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL,
        "encounter_id" integer NOT NULL,
        "provider_id" integer NOT NULL,
        "order_type" varchar(50) NOT NULL,
        "order_date" timestamp DEFAULT CURRENT_TIMESTAMP,
        "priority" varchar(20) DEFAULT 'routine',
        "status" varchar(20) DEFAULT 'pending',
        "medication_name" varchar(255),
        "medication_dosage" varchar(100),
        "medication_route" varchar(50),
        "medication_frequency" varchar(100),
        "medication_duration" varchar(100),
        "medication_quantity" integer,
        "medication_refills" integer,
        "lab_test_name" varchar(255),
        "lab_test_code" varchar(50),
        "imaging_study_type" varchar(100),
        "imaging_body_part" varchar(100),
        "referral_specialty" varchar(100),
        "referral_reason" text,
        "instructions" text,
        "clinical_indication" text,
        "diagnosis_codes" varchar(20)[],
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Essential tables created successfully!");
    
    // Create default admin user
    console.log("Creating default admin user...");
    await db.execute(sql`
      INSERT INTO users (username, email, password, first_name, last_name, role, npi, credentials, specialties, license_number)
      VALUES ('admin', 'admin@clarafi.com', 'ef92b778b7e5d57ce73b3691e0e75e8de527bdf43fb7d29e97f0441291051926.cc38db05d3fb4adcb9631e672f2e40e1', 'System', 'Administrator', 'admin', '1234567890', 'MD', ARRAY['Internal Medicine'], 'MD123456')
      ON CONFLICT (username) DO NOTHING;
    `);
    
    console.log("Database initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

createEssentialTables();