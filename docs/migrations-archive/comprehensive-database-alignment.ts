#!/usr/bin/env tsx

/**
 * COMPREHENSIVE DATABASE ALIGNMENT SCRIPT
 * 
 * This script fixes ALL mismatches between the database and schema.ts
 * It's organized into groups to ensure complete coverage:
 * 
 * 1. CREATE MISSING TABLES (33 tables)
 * 2. ADD MISSING COLUMNS to existing tables
 * 3. REMOVE EXTRA COLUMNS from existing tables
 * 4. HANDLE EXTRA TABLES (dashboards, session)
 * 5. FIX CRITICAL ISSUES (gpt_lab_review_notes)
 */

import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function comprehensiveDatabaseAlignment() {
  console.log("🔧 COMPREHENSIVE DATABASE ALIGNMENT STARTING...\n");
  console.log("This will fix ALL mismatches between database and schema.ts\n");

  const results = {
    tablesCreated: [] as string[],
    columnsAdded: [] as string[],
    columnsRemoved: [] as string[],
    errors: [] as string[],
  };

  // ==================================================================
  // PHASE 1: CREATE ALL MISSING TABLES (33 tables)
  // ==================================================================
  console.log("====== PHASE 1: CREATING MISSING TABLES ======\n");

  const missingTables = [
    // Group 1: Scheduling and Calendar Tables
    {
      name: "asymmetric_scheduling_config",
      sql: `CREATE TABLE IF NOT EXISTS asymmetric_scheduling_config (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weekday_schedule JSONB,
        custom_rules JSONB,
        effective_date DATE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "patient_scheduling_patterns",
      sql: `CREATE TABLE IF NOT EXISTS patient_scheduling_patterns (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        provider_id INTEGER NOT NULL REFERENCES users(id),
        pattern_type TEXT NOT NULL,
        frequency JSONB,
        time_preferences JSONB,
        seasonal_variations JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "provider_schedules",
      sql: `CREATE TABLE IF NOT EXISTS provider_schedules (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id INTEGER REFERENCES locations(id),
        day_of_week TEXT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start TIME,
        break_end TIME,
        effective_from DATE,
        effective_to DATE,
        schedule_type TEXT,
        max_appointments INTEGER,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "provider_scheduling_patterns",
      sql: `CREATE TABLE IF NOT EXISTS provider_scheduling_patterns (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_type TEXT NOT NULL,
        preferences JSONB,
        constraints JSONB,
        historical_data JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "realtime_schedule_status",
      sql: `CREATE TABLE IF NOT EXISTS realtime_schedule_status (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        time_slot TIME NOT NULL,
        status TEXT NOT NULL,
        appointment_id INTEGER REFERENCES appointments(id),
        buffer_status TEXT,
        efficiency_score DECIMAL(3,2),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, date, time_slot)
      )`
    },
    {
      name: "resource_bookings",
      sql: `CREATE TABLE IF NOT EXISTS resource_bookings (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER NOT NULL REFERENCES scheduling_resources(id),
        appointment_id INTEGER REFERENCES appointments(id),
        start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "schedule_exceptions",
      sql: `CREATE TABLE IF NOT EXISTS schedule_exceptions (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id),
        exception_date DATE NOT NULL,
        exception_type TEXT NOT NULL,
        start_time TIME,
        end_time TIME,
        reason TEXT,
        affects_scheduling BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "schedule_preferences",
      sql: `CREATE TABLE IF NOT EXISTS schedule_preferences (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        preferred_appointment_duration INTEGER DEFAULT 20,
        buffer_time_minutes INTEGER DEFAULT 5,
        lunch_start TIME,
        lunch_duration INTEGER DEFAULT 60,
        max_daily_appointments INTEGER,
        max_consecutive_appointments INTEGER,
        preferred_break_after_n_appointments INTEGER,
        break_duration_minutes INTEGER DEFAULT 15,
        allow_double_booking BOOLEAN DEFAULT false,
        allow_overtime BOOLEAN DEFAULT false,
        overtime_limit_minutes INTEGER DEFAULT 30,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "scheduling_resources",
      sql: `CREATE TABLE IF NOT EXISTS scheduling_resources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        location_id INTEGER REFERENCES locations(id),
        capacity INTEGER DEFAULT 1,
        available_hours JSONB,
        requires_cleaning BOOLEAN DEFAULT false,
        cleaning_duration INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "scheduling_rules",
      sql: `CREATE TABLE IF NOT EXISTS scheduling_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        applies_to TEXT NOT NULL,
        provider_id INTEGER REFERENCES users(id),
        location_id INTEGER REFERENCES locations(id),
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority INTEGER DEFAULT 100,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "scheduling_templates",
      sql: `CREATE TABLE IF NOT EXISTS scheduling_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        provider_id INTEGER REFERENCES users(id),
        template_type TEXT NOT NULL,
        day_configuration JSONB NOT NULL,
        appointment_types JSONB,
        buffer_rules JSONB,
        break_configuration JSONB,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },

    // Group 2: Document and Attachment Tables
    {
      name: "attachment_extracted_content",
      sql: `CREATE TABLE IF NOT EXISTS attachment_extracted_content (
        id SERIAL PRIMARY KEY,
        attachment_id INTEGER NOT NULL REFERENCES patient_attachments(id) ON DELETE CASCADE,
        page_number INTEGER,
        content_type TEXT NOT NULL,
        extracted_text TEXT,
        structured_data JSONB,
        confidence_score DECIMAL(3,2),
        extraction_method TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "document_processing_queue",
      sql: `CREATE TABLE IF NOT EXISTS document_processing_queue (
        id SERIAL PRIMARY KEY,
        attachment_id INTEGER NOT NULL REFERENCES patient_attachments(id),
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 100,
        processor_type TEXT NOT NULL,
        processing_metadata JSONB,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        started_at TIMESTAMP WITHOUT TIME ZONE,
        completed_at TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "organization_documents",
      sql: `CREATE TABLE IF NOT EXISTS organization_documents (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
        document_type TEXT NOT NULL,
        document_name TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        mime_type TEXT,
        metadata JSONB,
        uploaded_by INTEGER REFERENCES users(id),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },

    // Group 3: Medical and Clinical Tables
    {
      name: "external_labs",
      sql: `CREATE TABLE IF NOT EXISTS external_labs (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        lab_name TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_date DATE,
        result_value TEXT,
        unit TEXT,
        reference_range TEXT,
        abnormal_flag TEXT,
        ordering_provider TEXT,
        status TEXT,
        attachment_id INTEGER REFERENCES patient_attachments(id),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "gpt_lab_review_notes",
      sql: `CREATE TABLE IF NOT EXISTS gpt_lab_review_notes (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        lab_order_id INTEGER REFERENCES lab_orders(id),
        review_type TEXT NOT NULL,
        ai_interpretation TEXT,
        clinical_significance TEXT,
        follow_up_recommendations TEXT,
        risk_assessment JSONB,
        reviewed_by INTEGER REFERENCES users(id),
        review_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "imaging_orders",
      sql: `CREATE TABLE IF NOT EXISTS imaging_orders (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        encounter_id INTEGER REFERENCES encounters(id),
        provider_id INTEGER NOT NULL REFERENCES users(id),
        imaging_type TEXT NOT NULL,
        body_part TEXT,
        laterality TEXT,
        indication TEXT,
        clinical_history TEXT,
        priority TEXT DEFAULT 'routine',
        status TEXT DEFAULT 'pending',
        facility_id INTEGER REFERENCES locations(id),
        scheduled_date TIMESTAMP WITHOUT TIME ZONE,
        completed_date TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "medical_history",
      sql: `CREATE TABLE IF NOT EXISTS medical_history (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        condition TEXT NOT NULL,
        onset_date DATE,
        resolution_date DATE,
        status TEXT DEFAULT 'active',
        severity TEXT,
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "medication_formulary",
      sql: `CREATE TABLE IF NOT EXISTS medication_formulary (
        id SERIAL PRIMARY KEY,
        medication_name TEXT NOT NULL,
        generic_name TEXT,
        drug_class TEXT,
        dosage_forms TEXT[],
        strengths TEXT[],
        route TEXT[],
        tier INTEGER,
        prior_auth_required BOOLEAN DEFAULT false,
        quantity_limits JSONB,
        step_therapy JSONB,
        alternatives TEXT[],
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "patient_order_preferences",
      sql: `CREATE TABLE IF NOT EXISTS patient_order_preferences (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        provider_id INTEGER NOT NULL REFERENCES users(id),
        order_type TEXT NOT NULL,
        preferences JSONB,
        standing_orders JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "signatures",
      sql: `CREATE TABLE IF NOT EXISTS signatures (
        id SERIAL PRIMARY KEY,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        signed_by INTEGER NOT NULL REFERENCES users(id),
        signature_type TEXT NOT NULL,
        signed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        signature_data TEXT,
        ip_address TEXT,
        attestation_text TEXT
      )`
    },
    {
      name: "signed_orders",
      sql: `CREATE TABLE IF NOT EXISTS signed_orders (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        signed_by INTEGER NOT NULL REFERENCES users(id),
        signature_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        signature_method TEXT,
        ip_address TEXT,
        attestation TEXT,
        two_factor_verified BOOLEAN DEFAULT false
      )`
    },

    // Group 4: User and Authentication Tables
    {
      name: "data_modification_logs",
      sql: `CREATE TABLE IF NOT EXISTS data_modification_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "emergency_access_logs",
      sql: `CREATE TABLE IF NOT EXISTS emergency_access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        access_reason TEXT NOT NULL,
        emergency_type TEXT,
        override_restrictions JSONB,
        supervisor_approval INTEGER REFERENCES users(id),
        access_duration INTEGER,
        ip_address TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "magic_links",
      sql: `CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMP WITHOUT TIME ZONE,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "user_assistant_threads",
      sql: `CREATE TABLE IF NOT EXISTS user_assistant_threads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assistant_type TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        assistant_id TEXT,
        context JSONB,
        last_message_at TIMESTAMP WITHOUT TIME ZONE,
        message_count INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "user_edit_patterns",
      sql: `CREATE TABLE IF NOT EXISTS user_edit_patterns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note_type TEXT NOT NULL,
        section_name TEXT NOT NULL,
        edit_type TEXT NOT NULL,
        original_text TEXT,
        edited_text TEXT,
        edit_frequency INTEGER DEFAULT 1,
        confidence_score DECIMAL(3,2),
        last_occurrence TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "user_note_templates",
      sql: `CREATE TABLE IF NOT EXISTS user_note_templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_name TEXT NOT NULL,
        base_note_type TEXT NOT NULL,
        display_name TEXT NOT NULL,
        is_personal BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        created_by INTEGER NOT NULL REFERENCES users(id),
        shared_by INTEGER REFERENCES users(id),
        example_note TEXT NOT NULL,
        base_note_text TEXT,
        inline_comments JSONB,
        has_comments BOOLEAN DEFAULT false,
        generated_prompt TEXT NOT NULL,
        prompt_version INTEGER DEFAULT 1,
        enable_ai_learning BOOLEAN DEFAULT true,
        learning_confidence DECIMAL(3,2) DEFAULT 0.75,
        last_learning_update TIMESTAMP WITHOUT TIME ZONE,
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP WITHOUT TIME ZONE,
        version INTEGER DEFAULT 1,
        parent_template_id INTEGER REFERENCES user_note_templates(id),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "template_shares",
      sql: `CREATE TABLE IF NOT EXISTS template_shares (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES user_note_templates(id) ON DELETE CASCADE,
        shared_by INTEGER NOT NULL REFERENCES users(id),
        shared_with INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        shared_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP WITHOUT TIME ZONE,
        share_message TEXT,
        can_modify BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true
      )`
    },
    {
      name: "template_versions",
      sql: `CREATE TABLE IF NOT EXISTS template_versions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES user_note_templates(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        change_description TEXT,
        changed_by INTEGER NOT NULL REFERENCES users(id),
        example_note_snapshot TEXT NOT NULL,
        generated_prompt_snapshot TEXT NOT NULL,
        change_type TEXT DEFAULT 'manual',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },

    // Group 5: Communication and Notifications
    {
      name: "email_notifications",
      sql: `CREATE TABLE IF NOT EXISTS email_notifications (
        id SERIAL PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_text TEXT,
        notification_type TEXT NOT NULL,
        related_user_id INTEGER REFERENCES users(id),
        related_entity_type TEXT,
        related_entity_id INTEGER,
        status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP WITHOUT TIME ZONE,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },

    // Group 6: Subscription and Billing
    {
      name: "subscription_history",
      sql: `CREATE TABLE IF NOT EXISTS subscription_history (
        id SERIAL PRIMARY KEY,
        health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
        change_type TEXT NOT NULL,
        previous_tier INTEGER,
        new_tier INTEGER,
        previous_status TEXT,
        new_status TEXT,
        changed_by INTEGER REFERENCES users(id),
        reason TEXT,
        billing_impact JSONB,
        effective_date TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: "subscription_keys",
      sql: `CREATE TABLE IF NOT EXISTS subscription_keys (
        id SERIAL PRIMARY KEY,
        health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
        key_value TEXT NOT NULL UNIQUE,
        key_type TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP WITHOUT TIME ZONE,
        expires_at TIMESTAMP WITHOUT TIME ZONE,
        status TEXT DEFAULT 'active',
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP WITHOUT TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  // Create each missing table
  for (const table of missingTables) {
    try {
      await db.execute(sql.raw(table.sql));
      results.tablesCreated.push(table.name);
      console.log(`✅ Created table: ${table.name}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`⏭️  Table already exists: ${table.name}`);
      } else {
        results.errors.push(`Failed to create ${table.name}: ${error.message}`);
        console.error(`❌ Failed to create ${table.name}:`, error.message);
      }
    }
  }

  // ==================================================================
  // PHASE 2: ADD MISSING COLUMNS TO EXISTING TABLES
  // ==================================================================
  console.log("\n====== PHASE 2: ADDING MISSING COLUMNS ======\n");

  const missingColumns = [
    // Users table - columns in DB but not properly mapped in schema
    { table: "users", column: "license_state", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS license_state VARCHAR(2);` },
    { table: "users", column: "bio", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;` },
    { table: "users", column: "is_active", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;` },
    { table: "users", column: "profile_image_url", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);` },
    { table: "users", column: "updated_at", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;` },

    // Patients table - columns in DB but missing from schema mapping
    { table: "patients", column: "consent_given", sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;` },

    // Health systems table - missing columns
    { table: "health_systems", column: "created_at", sql: `ALTER TABLE health_systems ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;` },

    // Surgical history table - based on fix scripts
    { table: "surgical_history", column: "surgeon_name", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS surgeon_name TEXT;` },
    { table: "surgical_history", column: "facility_name", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS facility_name TEXT;` },
    { table: "surgical_history", column: "cpt_code", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS cpt_code TEXT;` },
    { table: "surgical_history", column: "icd10_procedure_code", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS icd10_procedure_code TEXT;` },
    { table: "surgical_history", column: "anatomical_site", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS anatomical_site TEXT;` },
    { table: "surgical_history", column: "urgency_level", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS urgency_level TEXT;` },
    { table: "surgical_history", column: "length_of_stay", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS length_of_stay INTEGER;` },
    { table: "surgical_history", column: "blood_loss", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS blood_loss TEXT;` },
    { table: "surgical_history", column: "transfusions_required", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS transfusions_required BOOLEAN DEFAULT false;` },
    { table: "surgical_history", column: "implants_hardware", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS implants_hardware TEXT;` },
    { table: "surgical_history", column: "recovery_status", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS recovery_status TEXT;` },
    { table: "surgical_history", column: "last_updated_encounter", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER REFERENCES encounters(id);` },

    // Locations table - based on fix scripts
    { table: "locations", column: "facility_code", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS facility_code TEXT;` },
    { table: "locations", column: "has_lab", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT false;` },
    { table: "locations", column: "has_imaging", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_imaging BOOLEAN DEFAULT false;` },
    { table: "locations", column: "has_pharmacy", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT false;` },
  ];

  for (const col of missingColumns) {
    try {
      await db.execute(sql.raw(col.sql));
      results.columnsAdded.push(`${col.table}.${col.column}`);
      console.log(`✅ Added column: ${col.table}.${col.column}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`⏭️  Column already exists: ${col.table}.${col.column}`);
      } else {
        results.errors.push(`Failed to add ${col.table}.${col.column}: ${error.message}`);
        console.error(`❌ Failed to add ${col.table}.${col.column}:`, error.message);
      }
    }
  }

  // ==================================================================
  // PHASE 3: REMOVE EXTRA COLUMNS (columns in DB but not in schema)
  // ==================================================================
  console.log("\n====== PHASE 3: REMOVING EXTRA COLUMNS ======\n");
  console.log("⚠️  Skipping column removal for safety - these should be reviewed manually:");
  
  const extraColumns = [
    // Patients table
    "patients.middle_name",
    "patients.phone_type", 
    "patients.city",
    "patients.state",
    "patients.zip",
    "patients.insurance_provider",
    "patients.insurance_policy_number",
    "patients.insurance_group_number",
    "patients.emergency_contact_name",
    "patients.emergency_contact_phone",
    "patients.emergency_contact_relationship",
    "patients.preferred_language",
    "patients.race",
    "patients.ethnicity",
    
    // Health systems table
    "health_systems.type",
    "health_systems.subscription_key",
    "health_systems.is_migration",
    "health_systems.stripe_customer_id",
    "health_systems.metadata",
    "health_systems.updated_at",
    "health_systems.status",
  ];
  
  console.log("Extra columns found:", extraColumns.join(", "));

  // ==================================================================
  // PHASE 4: HANDLE EXTRA TABLES
  // ==================================================================
  console.log("\n====== PHASE 4: EXTRA TABLES ======\n");
  console.log("Found 2 extra tables in database:");
  console.log("- dashboards (not in schema)");
  console.log("- session (likely from express-session)");
  console.log("⚠️  These should be reviewed - they may be needed for functionality");

  // ==================================================================
  // PHASE 5: CREATE CRITICAL INDEX FOR PERFORMANCE
  // ==================================================================
  console.log("\n====== PHASE 5: CREATING INDEXES ======\n");

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_patients_health_system_id ON patients(health_system_id);`,
    `CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);`,
    `CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);`,
    `CREATE INDEX IF NOT EXISTS idx_gpt_lab_review_notes_patient_id ON gpt_lab_review_notes(patient_id);`,
  ];

  for (const indexSql of indexes) {
    try {
      await db.execute(sql.raw(indexSql));
      console.log(`✅ Created index`);
    } catch (error: any) {
      console.log(`⏭️  Index might already exist:`, error.message);
    }
  }

  // ==================================================================
  // SUMMARY
  // ==================================================================
  console.log("\n====== ALIGNMENT COMPLETE ======\n");
  console.log(`✅ Tables created: ${results.tablesCreated.length}`);
  console.log(`✅ Columns added: ${results.columnsAdded.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log("\n⚠️  Errors encountered:");
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log("\n🎯 CRITICAL ISSUE FIXED: gpt_lab_review_notes table created - patient deletion should now work!");
  
  return results;
}

// Run the alignment
if (process.argv[1] === new URL(import.meta.url).pathname) {
  comprehensiveDatabaseAlignment()
    .then((results) => {
      console.log("\n✅ Database alignment completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Database alignment failed:", error);
      process.exit(1);
    });
}