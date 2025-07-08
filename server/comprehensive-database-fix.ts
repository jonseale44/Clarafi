import { db } from "./db";
import { sql } from "drizzle-orm";

async function comprehensiveDatabaseFix() {
  console.log("Starting comprehensive database fix...\n");
  
  try {
    // Start transaction for consistency
    await db.execute(sql`BEGIN`);
    
    // ==================== ORGANIZATIONAL HIERARCHY ====================
    
    // 1. Health Systems Table
    console.log("Checking health_systems table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS health_systems (
        id serial PRIMARY KEY,
        name text NOT NULL,
        short_name text,
        system_type text NOT NULL,
        subscription_tier integer DEFAULT 1,
        subscription_status text DEFAULT 'active',
        subscription_start_date timestamp,
        subscription_end_date timestamp,
        merged_into_health_system_id integer,
        merged_date timestamp,
        original_provider_id integer,
        primary_contact text,
        phone text,
        email text,
        website text,
        npi text,
        tax_id text,
        logo_url text,
        brand_colors jsonb,
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add missing columns if table exists
    await db.execute(sql`
      ALTER TABLE health_systems 
      ADD COLUMN IF NOT EXISTS subscription_tier integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS subscription_start_date timestamp,
      ADD COLUMN IF NOT EXISTS subscription_end_date timestamp,
      ADD COLUMN IF NOT EXISTS merged_into_health_system_id integer,
      ADD COLUMN IF NOT EXISTS merged_date timestamp,
      ADD COLUMN IF NOT EXISTS original_provider_id integer;
    `);
    
    // 2. Organizations Table
    console.log("Checking organizations table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id serial PRIMARY KEY,
        health_system_id integer REFERENCES health_systems(id),
        name text NOT NULL,
        short_name text,
        organization_type text NOT NULL,
        region text,
        city text,
        state text,
        zip_code text,
        phone text,
        email text,
        address text,
        npi text,
        tax_id text,
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. Locations Table
    console.log("Checking locations table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS locations (
        id serial PRIMARY KEY,
        organization_id integer REFERENCES organizations(id),
        health_system_id integer REFERENCES health_systems(id),
        name text NOT NULL,
        short_name text,
        location_type text NOT NULL,
        address text NOT NULL,
        city text NOT NULL,
        state text NOT NULL,
        zip_code text NOT NULL,
        phone text,
        fax text,
        email text,
        facility_code text,
        npi text,
        operating_hours jsonb,
        services text[],
        has_lab boolean DEFAULT false,
        has_imaging boolean DEFAULT false,
        has_pharmacy boolean DEFAULT false,
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 4. User Locations Table
    console.log("Checking user_locations table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_locations (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        location_id integer NOT NULL,
        role_at_location text NOT NULL,
        is_primary boolean DEFAULT false,
        work_schedule jsonb,
        can_schedule boolean DEFAULT true,
        can_view_all_patients boolean DEFAULT true,
        can_create_orders boolean DEFAULT true,
        active boolean DEFAULT true,
        start_date date,
        end_date date,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add foreign key constraints if missing
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_user_id_fkey') THEN
          ALTER TABLE user_locations ADD CONSTRAINT user_locations_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_location_id_fkey') THEN
          ALTER TABLE user_locations ADD CONSTRAINT user_locations_location_id_fkey 
          FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    
    // 5. User Session Locations Table
    console.log("Checking user_session_locations table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_session_locations (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        location_id integer NOT NULL,
        session_id text,
        selected_at timestamp DEFAULT CURRENT_TIMESTAMP,
        is_active boolean DEFAULT true,
        remember_selection boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add foreign key constraints
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_session_locations_user_id_fkey') THEN
          ALTER TABLE user_session_locations ADD CONSTRAINT user_session_locations_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_session_locations_location_id_fkey') THEN
          ALTER TABLE user_session_locations ADD CONSTRAINT user_session_locations_location_id_fkey 
          FOREIGN KEY (location_id) REFERENCES locations(id);
        END IF;
      END $$;
    `);
    
    // ==================== USERS AND RELATED TABLES ====================
    
    // 6. Users Table
    console.log("Checking users table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        username text NOT NULL UNIQUE,
        email text NOT NULL UNIQUE,
        password text NOT NULL,
        health_system_id integer,
        first_name text NOT NULL,
        last_name text NOT NULL,
        role text NOT NULL,
        npi text UNIQUE,
        credentials text,
        specialties text[],
        license_number text,
        mfa_enabled boolean DEFAULT false,
        mfa_secret text,
        account_status text DEFAULT 'active',
        last_login timestamp,
        failed_login_attempts integer DEFAULT 0,
        account_locked_until timestamp,
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add health_system_id column if missing
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS health_system_id integer;
    `);
    
    // Add foreign key constraint for health_system_id
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_health_system_id_fkey') THEN
          ALTER TABLE users ADD CONSTRAINT users_health_system_id_fkey 
          FOREIGN KEY (health_system_id) REFERENCES health_systems(id);
        END IF;
      END $$;
    `);
    
    // 7. User Note Templates Table
    console.log("Checking user_note_templates table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_note_templates (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_name text NOT NULL,
        base_note_type text NOT NULL,
        display_name text NOT NULL,
        is_personal boolean DEFAULT true,
        is_default boolean DEFAULT false,
        created_by integer NOT NULL REFERENCES users(id),
        shared_by integer REFERENCES users(id),
        example_note text NOT NULL,
        base_note_text text,
        inline_comments jsonb,
        has_comments boolean DEFAULT false,
        generated_prompt text NOT NULL,
        prompt_version integer DEFAULT 1,
        enable_ai_learning boolean DEFAULT true,
        learning_confidence decimal(3,2) DEFAULT 0.75,
        last_learning_update timestamp,
        usage_count integer DEFAULT 0,
        last_used timestamp,
        version integer DEFAULT 1,
        parent_template_id integer REFERENCES user_note_templates(id),
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 8. Template Shares Table
    console.log("Checking template_shares table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS template_shares (
        id serial PRIMARY KEY,
        template_id integer NOT NULL REFERENCES user_note_templates(id) ON DELETE CASCADE,
        shared_by integer NOT NULL REFERENCES users(id),
        shared_with integer NOT NULL REFERENCES users(id),
        status text DEFAULT 'pending',
        shared_at timestamp DEFAULT CURRENT_TIMESTAMP,
        responded_at timestamp,
        share_message text,
        can_modify boolean DEFAULT false,
        active boolean DEFAULT true
      );
    `);
    
    // 9. Template Versions Table
    console.log("Checking template_versions table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS template_versions (
        id serial PRIMARY KEY,
        template_id integer NOT NULL REFERENCES user_note_templates(id) ON DELETE CASCADE,
        version_number integer NOT NULL,
        change_description text,
        changed_by integer NOT NULL REFERENCES users(id),
        example_note_snapshot text NOT NULL,
        generated_prompt_snapshot text NOT NULL,
        change_type text DEFAULT 'manual',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 10. User Note Preferences Table
    console.log("Checking user_note_preferences table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_note_preferences (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        default_soap_template integer REFERENCES user_note_templates(id),
        default_apso_template integer REFERENCES user_note_templates(id),
        default_progress_template integer REFERENCES user_note_templates(id),
        default_h_and_p_template integer REFERENCES user_note_templates(id),
        default_discharge_template integer REFERENCES user_note_templates(id),
        default_procedure_template integer REFERENCES user_note_templates(id),
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
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 11. User Edit Patterns Table
    console.log("Checking user_edit_patterns table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_edit_patterns (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_id integer,
        encounter_id integer,
        original_text text NOT NULL,
        edited_text text NOT NULL,
        section_type text NOT NULL,
        pattern_type text NOT NULL,
        is_user_preference boolean,
        confidence_score decimal(3,2),
        extracted_pattern jsonb,
        applied boolean DEFAULT false,
        reviewed_by_user boolean DEFAULT false,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 12. User Assistant Threads Table
    console.log("Checking user_assistant_threads table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_assistant_threads (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thread_id text NOT NULL UNIQUE,
        thread_type text NOT NULL,
        is_active boolean DEFAULT true,
        last_interaction timestamp DEFAULT CURRENT_TIMESTAMP,
        message_count integer DEFAULT 0,
        patterns_learned integer DEFAULT 0,
        confidence_level decimal(3,2) DEFAULT 0.50,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // ==================== PATIENTS AND CLINICAL TABLES ====================
    
    // 13. Patients Table
    console.log("Checking patients table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patients (
        id serial PRIMARY KEY,
        mrn varchar NOT NULL UNIQUE,
        health_system_id integer,
        first_name text NOT NULL,
        last_name text NOT NULL,
        date_of_birth date NOT NULL,
        gender text NOT NULL,
        contact_number text,
        email text,
        address text,
        emergency_contact text,
        preferred_location_id integer REFERENCES locations(id),
        primary_provider_id integer REFERENCES users(id),
        insurance_primary text,
        insurance_secondary text,
        policy_number text,
        group_number text,
        assistant_id text,
        assistant_thread_id text,
        last_chart_summary text,
        chart_last_updated timestamp,
        active_problems jsonb DEFAULT '[]',
        critical_alerts jsonb DEFAULT '[]',
        profile_photo_filename text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add health_system_id column if missing
    await db.execute(sql`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS health_system_id integer;
    `);
    
    // Add foreign key constraint
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_health_system_id_fkey') THEN
          ALTER TABLE patients ADD CONSTRAINT patients_health_system_id_fkey 
          FOREIGN KEY (health_system_id) REFERENCES health_systems(id);
        END IF;
      END $$;
    `);
    
    // 14. Appointments Table
    console.log("Checking appointments table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        provider_id integer NOT NULL REFERENCES users(id),
        location_id integer NOT NULL REFERENCES locations(id),
        appointment_date date NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        duration integer NOT NULL,
        appointment_type text NOT NULL,
        chief_complaint text,
        visit_reason text,
        status text DEFAULT 'scheduled',
        confirmation_status text DEFAULT 'pending',
        checked_in_at timestamp,
        checked_in_by integer REFERENCES users(id),
        room_assignment text,
        urgency_level text DEFAULT 'routine',
        scheduling_notes text,
        patient_preferences jsonb,
        ai_scheduling_data jsonb,
        reminders_sent integer DEFAULT 0,
        last_reminder_sent timestamp,
        communication_preferences jsonb,
        external_appointment_id text,
        synced_at timestamp,
        insurance_verified boolean DEFAULT false,
        verified_by integer REFERENCES users(id),
        copay_amount decimal(10,2),
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        created_by integer NOT NULL REFERENCES users(id)
      );
    `);
    
    // 15. Provider Schedules Table
    console.log("Checking provider_schedules table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS provider_schedules (
        id serial PRIMARY KEY,
        provider_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id integer NOT NULL REFERENCES locations(id),
        day_of_week integer NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        schedule_type text NOT NULL,
        appointment_types text[],
        slot_duration integer DEFAULT 30,
        buffer_time integer DEFAULT 0,
        max_concurrent_appts integer DEFAULT 1,
        advance_booking_days integer DEFAULT 365,
        cancelation_policy_hours integer DEFAULT 24,
        is_available_for_urgent boolean DEFAULT true,
        allow_double_booking boolean DEFAULT false,
        requires_referral boolean DEFAULT false,
        effective_from date,
        effective_until date,
        active boolean DEFAULT true,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 16. Schedule Exceptions Table
    console.log("Checking schedule_exceptions table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schedule_exceptions (
        id serial PRIMARY KEY,
        provider_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id integer REFERENCES locations(id),
        exception_date date NOT NULL,
        start_time text,
        end_time text,
        exception_type text NOT NULL,
        reason text,
        cancels_existing_appts boolean DEFAULT false,
        allows_emergency_override boolean DEFAULT true,
        is_recurring boolean DEFAULT false,
        recurrence_pattern text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        created_by integer NOT NULL REFERENCES users(id)
      );
    `);
    
    // 17. Signatures Table
    console.log("Checking signatures table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signatures (
        id varchar PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id),
        signature_data text NOT NULL,
        signed_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 18. Encounters Table
    console.log("Checking encounters table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS encounters (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        provider_id integer NOT NULL REFERENCES users(id),
        encounter_type text NOT NULL,
        encounter_subtype text,
        start_time timestamp DEFAULT CURRENT_TIMESTAMP,
        end_time timestamp,
        encounter_status text DEFAULT 'scheduled',
        location_id integer REFERENCES locations(id),
        appointment_id integer REFERENCES appointments(id),
        room_number text,
        chief_complaint text,
        vital_signs jsonb,
        soap_note text,
        soap_subjective text,
        soap_objective text,
        soap_assessment text,
        soap_plan text,
        medical_decision_making text,
        procedure_notes text,
        complications text,
        follow_up_instructions text,
        patient_instructions text,
        is_signed boolean DEFAULT false,
        signed_at timestamp,
        signature_id varchar REFERENCES signatures(id),
        transcription_raw text,
        transcription_processed text,
        ai_conversation_state jsonb,
        special_instructions text,
        billed boolean DEFAULT false,
        note_type text DEFAULT 'soap',
        ai_enhancement_used boolean DEFAULT false,
        enhancement_preferences jsonb,
        custom_template_id integer REFERENCES user_note_templates(id),
        nurse_assigned_id integer REFERENCES users(id),
        nurse_notes text,
        intake_completed boolean DEFAULT false,
        intake_completed_at timestamp,
        intake_completed_by integer REFERENCES users(id),
        triage_priority text,
        ready_for_provider boolean DEFAULT false,
        ready_for_provider_at timestamp,
        nursing_vitals_completed boolean DEFAULT false,
        nursing_assessment text,
        nursing_chief_complaint text,
        medication_reconciliation_completed boolean DEFAULT false,
        allergies_reviewed boolean DEFAULT false,
        discharge_time timestamp,
        discharge_disposition text,
        discharge_instructions text,
        follow_up_appointments jsonb,
        transcription_duration integer,
        auto_save_enabled boolean DEFAULT true,
        last_auto_save timestamp,
        parent_encounter_id integer REFERENCES encounters(id),
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add missing columns to encounters table
    await db.execute(sql`
      ALTER TABLE encounters
      ADD COLUMN IF NOT EXISTS encounter_type text DEFAULT 'office_visit',
      ADD COLUMN IF NOT EXISTS encounter_subtype text,
      ADD COLUMN IF NOT EXISTS encounter_status text DEFAULT 'scheduled',
      ADD COLUMN IF NOT EXISTS location_id integer REFERENCES locations(id),
      ADD COLUMN IF NOT EXISTS appointment_id integer REFERENCES appointments(id),
      ADD COLUMN IF NOT EXISTS room_number text,
      ADD COLUMN IF NOT EXISTS vital_signs jsonb,
      ADD COLUMN IF NOT EXISTS medical_decision_making text,
      ADD COLUMN IF NOT EXISTS procedure_notes text,
      ADD COLUMN IF NOT EXISTS complications text,
      ADD COLUMN IF NOT EXISTS follow_up_instructions text,
      ADD COLUMN IF NOT EXISTS patient_instructions text,
      ADD COLUMN IF NOT EXISTS transcription_raw text,
      ADD COLUMN IF NOT EXISTS transcription_processed text,
      ADD COLUMN IF NOT EXISTS ai_conversation_state jsonb,
      ADD COLUMN IF NOT EXISTS special_instructions text,
      ADD COLUMN IF NOT EXISTS billed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS note_type text DEFAULT 'soap',
      ADD COLUMN IF NOT EXISTS ai_enhancement_used boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS enhancement_preferences jsonb,
      ADD COLUMN IF NOT EXISTS custom_template_id integer REFERENCES user_note_templates(id),
      ADD COLUMN IF NOT EXISTS nurse_assigned_id integer REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS nurse_notes text,
      ADD COLUMN IF NOT EXISTS intake_completed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS intake_completed_at timestamp,
      ADD COLUMN IF NOT EXISTS intake_completed_by integer REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS triage_priority text,
      ADD COLUMN IF NOT EXISTS ready_for_provider boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS ready_for_provider_at timestamp,
      ADD COLUMN IF NOT EXISTS nursing_vitals_completed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS nursing_assessment text,
      ADD COLUMN IF NOT EXISTS nursing_chief_complaint text,
      ADD COLUMN IF NOT EXISTS medication_reconciliation_completed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS allergies_reviewed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS discharge_time timestamp,
      ADD COLUMN IF NOT EXISTS discharge_disposition text,
      ADD COLUMN IF NOT EXISTS discharge_instructions text,
      ADD COLUMN IF NOT EXISTS follow_up_appointments jsonb,
      ADD COLUMN IF NOT EXISTS transcription_duration integer,
      ADD COLUMN IF NOT EXISTS auto_save_enabled boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_auto_save timestamp,
      ADD COLUMN IF NOT EXISTS parent_encounter_id integer REFERENCES encounters(id);
    `);
    
    // ==================== CLINICAL DATA TABLES ====================
    
    // 19. Diagnoses Table
    console.log("Checking diagnoses table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id serial PRIMARY KEY,
        encounter_id integer NOT NULL REFERENCES encounters(id),
        icd10_code text NOT NULL,
        description text NOT NULL,
        is_primary boolean DEFAULT false,
        notes text,
        status text DEFAULT 'active',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 20. CPT Codes Table
    console.log("Checking cpt_codes table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cpt_codes (
        id serial PRIMARY KEY,
        encounter_id integer NOT NULL REFERENCES encounters(id),
        cpt_code text NOT NULL,
        description text NOT NULL,
        units integer DEFAULT 1,
        modifier text,
        notes text,
        status text DEFAULT 'pending',
        billed boolean DEFAULT false,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 21. Allergies Table
    console.log("Checking allergies table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS allergies (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        allergen text NOT NULL,
        reaction text,
        severity text,
        allergy_type text,
        onset_date date,
        last_reaction_date date,
        status text DEFAULT 'active',
        verification_status text DEFAULT 'unconfirmed',
        drug_class text,
        cross_reactivity text[],
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        last_updated_encounter integer REFERENCES encounters(id),
        entered_by integer REFERENCES users(id),
        consolidation_reasoning text,
        extraction_notes text,
        temporal_conflict_resolution text,
        visit_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 22. Vitals Table
    console.log("Checking vitals table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vitals (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        recorded_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        recorded_by text NOT NULL,
        entry_type text NOT NULL DEFAULT 'routine',
        systolic_bp integer,
        diastolic_bp integer,
        heart_rate integer,
        temperature decimal,
        weight decimal,
        height decimal,
        bmi decimal,
        oxygen_saturation decimal,
        respiratory_rate integer,
        pain_scale integer,
        notes text,
        alerts text[],
        parsed_from_text boolean DEFAULT false,
        original_text text,
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        entered_by integer REFERENCES users(id),
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 23. Medications Table
    console.log("Checking medications table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS medications (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        medication_name text NOT NULL,
        brand_name text,
        generic_name text,
        dosage text NOT NULL,
        strength text,
        dosage_form text,
        route text,
        frequency text NOT NULL,
        quantity integer,
        days_supply integer,
        refills_remaining integer,
        total_refills integer,
        sig text,
        rxnorm_code text,
        ndc_code text,
        surescripts_id text,
        clinical_indication text,
        source_order_id integer,
        problem_mappings jsonb DEFAULT '[]',
        start_date date NOT NULL,
        end_date date,
        discontinued_date date,
        status text DEFAULT 'active',
        prescriber text,
        prescriber_id integer REFERENCES users(id),
        first_encounter_id integer REFERENCES encounters(id) ON DELETE SET NULL,
        last_updated_encounter_id integer REFERENCES encounters(id) ON DELETE SET NULL,
        reason_for_change text,
        medication_history jsonb DEFAULT '[]',
        change_log jsonb DEFAULT '[]',
        visit_history jsonb DEFAULT '[]',
        source_type text,
        source_confidence decimal(3,2),
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id) ON DELETE SET NULL,
        entered_by integer REFERENCES users(id),
        grouping_strategy text DEFAULT 'medical_problem',
        related_medications jsonb DEFAULT '[]',
        drug_interactions jsonb DEFAULT '[]',
        pharmacy_order_id text,
        insurance_auth_status text,
        prior_auth_required boolean DEFAULT false,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add missing columns to medications table
    console.log("Adding missing columns to medications table...");
    
    // Add all missing columns one by one
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS dosage_form text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS total_refills integer`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS refills_remaining integer`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS surescripts_id text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_order_id integer`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS problem_mappings jsonb DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescriber_id integer REFERENCES users(id)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS first_encounter_id integer REFERENCES encounters(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS last_updated_encounter_id integer REFERENCES encounters(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS reason_for_change text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS change_log jsonb DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacy_instructions text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS manufacturer text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS reconciliation_status text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS reconciliation_date timestamp`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS reconciled_by integer REFERENCES users(id)`);
    
    // Add more missing columns that were found
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescriber text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescribed_date timestamp`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescriber_name text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacy text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescribed_by integer REFERENCES users(id)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS discontinued_by integer REFERENCES users(id)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS discontinuation_reason text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS notes text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS lot_number text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS expiration_date date`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS dea_schedule text`);
    
    // Add remaining missing columns from the schema
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_confidence decimal(3,2)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_notes text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS extracted_from_attachment_id integer REFERENCES patient_attachments(id)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS confidence integer`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS entered_by integer REFERENCES users(id)`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS grouping_strategy text DEFAULT 'medical_problem'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS related_medications jsonb DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS drug_interactions jsonb DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacy_order_id text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS insurance_auth_status text`);
    await db.execute(sql`ALTER TABLE medications ADD COLUMN IF NOT EXISTS prior_auth_required boolean DEFAULT false`);
    
    // 24. Medical Problems Table
    console.log("Checking medical_problems table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS medical_problems (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        problem_title text NOT NULL,
        current_icd10_code text,
        problem_status text DEFAULT 'active',
        date_onset text,
        date_resolved text,
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        confidence_adjustment_reason text,
        temporal_status text DEFAULT 'chronic',
        consolidated_from jsonb DEFAULT '[]',
        last_updated_encounter integer REFERENCES encounters(id),
        last_reviewed_encounter integer REFERENCES encounters(id),
        added_by integer NOT NULL REFERENCES users(id),
        rank_score decimal(10,2) DEFAULT 100.00,
        visit_history jsonb DEFAULT '[]',
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        clinical_associations jsonb DEFAULT '[]',
        review_schedule text DEFAULT '12_months',
        is_problem_list_diagnosis boolean DEFAULT true,
        related_medications jsonb DEFAULT '[]',
        related_orders jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 25. Medical History Table (legacy support)
    console.log("Checking medical_history table...");
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
    
    // 26. Family History Table
    console.log("Checking family_history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS family_history (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        relationship text NOT NULL,
        condition text NOT NULL,
        age_of_onset text,
        notes text,
        status text DEFAULT 'active',
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        last_updated_encounter integer REFERENCES encounters(id),
        entered_by integer REFERENCES users(id),
        consolidation_reasoning text,
        extraction_notes text,
        visit_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 27. Social History Table
    console.log("Checking social_history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social_history (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        category text NOT NULL,
        current_status text NOT NULL,
        details text,
        start_date text,
        end_date text,
        frequency text,
        quantity text,
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        last_updated_encounter integer REFERENCES encounters(id),
        entered_by integer REFERENCES users(id),
        consolidation_reasoning text,
        extraction_notes text,
        visit_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 28. Surgical History Table
    console.log("Checking surgical_history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS surgical_history (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        procedure_name text NOT NULL,
        procedure_date date,
        surgeon text,
        facility text,
        indication text,
        outcome text,
        complications text,
        notes text,
        status text DEFAULT 'completed',
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        last_updated_encounter integer REFERENCES encounters(id),
        entered_by integer REFERENCES users(id),
        consolidation_reasoning text,
        extraction_notes text,
        visit_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 29. Imaging Results Table
    console.log("Checking imaging_results table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS imaging_results (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        imaging_type text NOT NULL,
        body_part text,
        performed_date date,
        ordering_provider text,
        facility text,
        findings text,
        impression text,
        critical_findings boolean DEFAULT false,
        follow_up_needed boolean DEFAULT false,
        status text DEFAULT 'final',
        source_type text DEFAULT 'manual_entry',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        related_order_id integer REFERENCES orders(id),
        last_updated_encounter integer REFERENCES encounters(id),
        entered_by integer REFERENCES users(id),
        consolidation_reasoning text,
        extraction_notes text,
        clinical_summary text,
        visit_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // ==================== ORDERS AND LAB TABLES ====================
    
    // 30. Orders Table
    console.log("Checking orders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer NOT NULL REFERENCES encounters(id),
        order_type text NOT NULL,
        order_status text DEFAULT 'draft',
        priority text DEFAULT 'routine',
        order_date timestamp DEFAULT CURRENT_TIMESTAMP,
        ordering_provider integer NOT NULL REFERENCES users(id),
        order_details jsonb NOT NULL,
        clinical_indication text,
        diagnosis_code text,
        special_instructions text,
        patient_instructions text,
        performing_location text,
        scheduled_date date,
        is_stat boolean DEFAULT false,
        requires_auth boolean DEFAULT false,
        auth_status text,
        auth_number text,
        insurance_status text,
        external_order_id text,
        result_status text DEFAULT 'pending',
        results_available_date timestamp,
        critical_result boolean DEFAULT false,
        signed_by integer REFERENCES users(id),
        signed_at timestamp,
        cancelled_by integer REFERENCES users(id),
        cancelled_at timestamp,
        cancellation_reason text,
        follow_up_required boolean DEFAULT false,
        follow_up_notes text,
        test_name text,
        test_code text,
        collection_date date,
        collection_time text,
        specimen_type text,
        fasting_required boolean DEFAULT false,
        lab_facility text,
        lab_notes text,
        modality text,
        body_part text,
        laterality text,
        contrast boolean DEFAULT false,
        contrast_type text,
        imaging_facility text,
        imaging_indication text,
        comparison_study text,
        protocol_notes text,
        tech_notes text,
        referring_to text,
        specialty text,
        referral_reason text,
        urgency text DEFAULT 'routine',
        referral_notes text,
        appointment_requested boolean DEFAULT false,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add missing columns to orders table
    await db.execute(sql`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS test_code text,
      ADD COLUMN IF NOT EXISTS fasting_required boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS modality text,
      ADD COLUMN IF NOT EXISTS body_part text,
      ADD COLUMN IF NOT EXISTS laterality text,
      ADD COLUMN IF NOT EXISTS contrast boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS contrast_type text,
      ADD COLUMN IF NOT EXISTS imaging_facility text,
      ADD COLUMN IF NOT EXISTS imaging_indication text,
      ADD COLUMN IF NOT EXISTS comparison_study text,
      ADD COLUMN IF NOT EXISTS protocol_notes text,
      ADD COLUMN IF NOT EXISTS tech_notes text,
      ADD COLUMN IF NOT EXISTS referring_to text,
      ADD COLUMN IF NOT EXISTS specialty text,
      ADD COLUMN IF NOT EXISTS referral_reason text,
      ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'routine',
      ADD COLUMN IF NOT EXISTS referral_notes text,
      ADD COLUMN IF NOT EXISTS appointment_requested boolean DEFAULT false;
    `);
    
    // 31. Lab Results Table
    console.log("Checking lab_results table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lab_results (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        order_id integer REFERENCES orders(id),
        test_name text NOT NULL,
        test_code text,
        loinc_code text,
        result_value text,
        units text,
        reference_range text,
        abnormal_flag text,
        critical_flag boolean DEFAULT false,
        result_status text DEFAULT 'final',
        collected_date timestamp,
        resulted_date timestamp,
        test_category text,
        specimen_type text,
        performing_lab text,
        ordering_provider integer REFERENCES users(id),
        interpreting_provider integer REFERENCES users(id),
        comments text,
        lab_comments text,
        method text,
        test_sensitivity text,
        source_type text DEFAULT 'interface',
        source_confidence decimal(3,2) DEFAULT 1.00,
        source_notes text,
        extracted_from_attachment_id integer REFERENCES patient_attachments(id),
        reviewed boolean DEFAULT false,
        reviewed_by integer REFERENCES users(id),
        reviewed_at timestamp,
        patient_notified boolean DEFAULT false,
        notified_at timestamp,
        notified_by integer REFERENCES users(id),
        notification_method text,
        consolidation_status text DEFAULT 'active',
        consolidation_reasoning text,
        extraction_notes text,
        visit_history jsonb DEFAULT '[]',
        encounter_id integer REFERENCES encounters(id),
        panel_name text,
        panel_code text,
        is_panel_component boolean DEFAULT false,
        reference_type text DEFAULT 'standard',
        age_specific_range text,
        gender_specific_range text,
        critical_low decimal,
        critical_high decimal,
        delta_check_flag boolean DEFAULT false,
        previous_value text,
        percent_change decimal,
        resulted_by_interface boolean DEFAULT false,
        interface_message_id text,
        requires_action boolean DEFAULT false,
        action_taken text,
        follow_up_ordered boolean DEFAULT false,
        billing_code text,
        accession_number text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add table if it doesn't exist (since it might be completely missing)
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_results') THEN
          CREATE TABLE lab_results (
            id serial PRIMARY KEY,
            patient_id integer NOT NULL REFERENCES patients(id),
            order_id integer REFERENCES orders(id),
            test_name text NOT NULL,
            test_code text,
            loinc_code text,
            result_value text,
            units text,
            reference_range text,
            abnormal_flag text,
            critical_flag boolean DEFAULT false,
            result_status text DEFAULT 'final',
            collected_date timestamp,
            resulted_date timestamp,
            test_category text,
            specimen_type text,
            performing_lab text,
            ordering_provider integer REFERENCES users(id),
            interpreting_provider integer REFERENCES users(id),
            comments text,
            lab_comments text,
            method text,
            test_sensitivity text,
            source_type text DEFAULT 'interface',
            source_confidence decimal(3,2) DEFAULT 1.00,
            source_notes text,
            extracted_from_attachment_id integer REFERENCES patient_attachments(id),
            reviewed boolean DEFAULT false,
            reviewed_by integer REFERENCES users(id),
            reviewed_at timestamp,
            patient_notified boolean DEFAULT false,
            notified_at timestamp,
            notified_by integer REFERENCES users(id),
            notification_method text,
            consolidation_status text DEFAULT 'active',
            consolidation_reasoning text,
            extraction_notes text,
            visit_history jsonb DEFAULT '[]',
            encounter_id integer REFERENCES encounters(id),
            panel_name text,
            panel_code text,
            is_panel_component boolean DEFAULT false,
            reference_type text DEFAULT 'standard',
            age_specific_range text,
            gender_specific_range text,
            critical_low decimal,
            critical_high decimal,
            delta_check_flag boolean DEFAULT false,
            previous_value text,
            percent_change decimal,
            resulted_by_interface boolean DEFAULT false,
            interface_message_id text,
            requires_action boolean DEFAULT false,
            action_taken text,
            follow_up_ordered boolean DEFAULT false,
            billing_code text,
            accession_number text,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP
          );
        END IF;
      END $$;
    `);
    
    // 32. Lab Orders Table
    console.log("Checking lab_orders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lab_orders (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer NOT NULL REFERENCES encounters(id),
        order_id integer NOT NULL REFERENCES orders(id),
        lab_name text NOT NULL,
        lab_code text,
        icd10_codes text[],
        priority text DEFAULT 'routine',
        fasting_required boolean DEFAULT false,
        special_instructions text,
        clinical_history text,
        ordering_provider_id integer NOT NULL REFERENCES users(id),
        ordering_provider_npi text,
        collection_date_requested date,
        collection_time_preference text,
        specimen_source text,
        external_lab_id integer REFERENCES external_labs(id),
        transmission_status text DEFAULT 'pending',
        transmitted_at timestamp,
        transmission_method text,
        order_control_id text,
        placer_order_number text,
        filler_order_number text,
        universal_service_id text,
        acknowledgment_status text,
        acknowledged_at timestamp,
        result_status text DEFAULT 'pending',
        resulted_at timestamp,
        collection_status text DEFAULT 'not_collected',
        collected_at timestamp,
        collected_by integer REFERENCES users(id),
        specimen_id text,
        rejection_reason text,
        cancelled_at timestamp,
        cancelled_by integer REFERENCES users(id),
        cancellation_reason text,
        insurance_auth_required boolean DEFAULT false,
        auth_number text,
        patient_preparation_instructions text,
        follow_up_instructions text,
        critical_callback_phone text,
        stat_callback_required boolean DEFAULT false,
        abn_required boolean DEFAULT false,
        abn_signed boolean DEFAULT false,
        abn_reason text,
        estimated_completion_time text,
        tat_hours integer,
        billing_type text,
        diagnosis_code_descriptions jsonb,
        compliance_flags jsonb,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_orders') THEN
          CREATE TABLE lab_orders (
            id serial PRIMARY KEY,
            patient_id integer NOT NULL REFERENCES patients(id),
            encounter_id integer NOT NULL REFERENCES encounters(id),
            order_id integer NOT NULL REFERENCES orders(id),
            lab_name text NOT NULL,
            lab_code text,
            icd10_codes text[],
            priority text DEFAULT 'routine',
            fasting_required boolean DEFAULT false,
            special_instructions text,
            clinical_history text,
            ordering_provider_id integer NOT NULL REFERENCES users(id),
            ordering_provider_npi text,
            collection_date_requested date,
            collection_time_preference text,
            specimen_source text,
            external_lab_id integer REFERENCES external_labs(id),
            transmission_status text DEFAULT 'pending',
            transmitted_at timestamp,
            transmission_method text,
            order_control_id text,
            placer_order_number text,
            filler_order_number text,
            universal_service_id text,
            acknowledgment_status text,
            acknowledged_at timestamp,
            result_status text DEFAULT 'pending',
            resulted_at timestamp,
            collection_status text DEFAULT 'not_collected',
            collected_at timestamp,
            collected_by integer REFERENCES users(id),
            specimen_id text,
            rejection_reason text,
            cancelled_at timestamp,
            cancelled_by integer REFERENCES users(id),
            cancellation_reason text,
            insurance_auth_required boolean DEFAULT false,
            auth_number text,
            patient_preparation_instructions text,
            follow_up_instructions text,
            critical_callback_phone text,
            stat_callback_required boolean DEFAULT false,
            abn_required boolean DEFAULT false,
            abn_signed boolean DEFAULT false,
            abn_reason text,
            estimated_completion_time text,
            tat_hours integer,
            billing_type text,
            diagnosis_code_descriptions jsonb,
            compliance_flags jsonb,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP
          );
        END IF;
      END $$;
    `);
    
    // Add collected_at column to lab_orders if missing
    await db.execute(sql`
      ALTER TABLE lab_orders
      ADD COLUMN IF NOT EXISTS collected_at timestamp;
    `);
    
    // 33. External Labs Table
    console.log("Checking external_labs table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS external_labs (
        id serial PRIMARY KEY,
        lab_name text NOT NULL,
        lab_code text UNIQUE,
        interface_type text NOT NULL,
        connection_details jsonb,
        supported_tests jsonb,
        turnaround_times jsonb,
        operating_hours jsonb,
        contact_phone text,
        contact_email text,
        technical_contact text,
        account_number text,
        api_endpoint text,
        api_key text,
        sftp_host text,
        sftp_username text,
        sftp_password text,
        sftp_directory text,
        hl7_version text DEFAULT '2.5.1',
        hl7_sending_facility text,
        hl7_receiving_facility text,
        test_mapping jsonb,
        result_mapping jsonb,
        requires_patient_consent boolean DEFAULT false,
        consent_form_url text,
        billing_info jsonb,
        active boolean DEFAULT true,
        last_connection_test timestamp,
        connection_status text DEFAULT 'untested',
        error_log jsonb,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default external lab if not exists
    await db.execute(sql`
      INSERT INTO external_labs (id, lab_name, lab_code, interface_type, active)
      VALUES (1, 'Default External Lab', 'DEFAULT', 'manual', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    
    // ==================== ATTACHMENT AND FILE TABLES ====================
    
    // 34. Patient Attachments Table
    console.log("Checking patient_attachments table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patient_attachments (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        file_name text NOT NULL,
        file_type text NOT NULL,
        file_size integer NOT NULL,
        storage_path text NOT NULL,
        upload_date timestamp DEFAULT CURRENT_TIMESTAMP,
        uploaded_by integer NOT NULL REFERENCES users(id),
        document_type text,
        document_date date,
        description text,
        is_processed boolean DEFAULT false,
        processed_at timestamp,
        processing_status text DEFAULT 'pending',
        processing_notes text,
        extracted_text text,
        parsed_data jsonb,
        ocr_confidence decimal(3,2),
        thumbnail_path text,
        page_count integer,
        tags text[],
        is_archived boolean DEFAULT false,
        archived_at timestamp,
        archived_by integer REFERENCES users(id),
        source text DEFAULT 'upload',
        external_id text,
        metadata jsonb,
        security_classification text DEFAULT 'standard',
        retention_date date,
        legal_hold boolean DEFAULT false,
        chart_filed boolean DEFAULT false,
        chart_filed_at timestamp,
        chart_filed_by integer REFERENCES users(id),
        requires_review boolean DEFAULT false,
        reviewed_by integer REFERENCES users(id),
        reviewed_at timestamp,
        review_notes text,
        content_hash varchar(64),
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add content_hash column if missing
    await db.execute(sql`
      ALTER TABLE patient_attachments
      ADD COLUMN IF NOT EXISTS content_hash varchar(64);
    `);
    
    // ==================== NURSING AND CARE TABLES ====================
    
    // 35. Nursing Assessments Table
    console.log("Checking nursing_assessments table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nursing_assessments (
        id serial PRIMARY KEY,
        encounter_id integer NOT NULL REFERENCES encounters(id),
        nurse_id integer NOT NULL REFERENCES users(id),
        assessment_time timestamp DEFAULT CURRENT_TIMESTAMP,
        general_appearance text,
        pain_assessment jsonb,
        fall_risk_score integer,
        fall_risk_factors text[],
        skin_assessment text,
        neurological_assessment text,
        cardiovascular_assessment text,
        respiratory_assessment text,
        gastrointestinal_assessment text,
        genitourinary_assessment text,
        musculoskeletal_assessment text,
        psychosocial_assessment text,
        education_needs text[],
        discharge_planning_needs text,
        additional_observations text,
        interventions_performed text[],
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 36. Care Plans Table
    console.log("Checking care_plans table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS care_plans (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        plan_type text NOT NULL,
        status text DEFAULT 'active',
        goals jsonb,
        interventions jsonb,
        barriers text,
        target_date date,
        review_date date,
        created_by integer NOT NULL REFERENCES users(id),
        assigned_to integer REFERENCES users(id),
        outcome_measures jsonb,
        progress_notes text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 37. GPT Lab Review Notes Table
    console.log("Checking gpt_lab_review_notes table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gpt_lab_review_notes (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        result_ids integer[] NOT NULL,
        clinical_review text NOT NULL,
        patient_message text NOT NULL,
        nurse_message text NOT NULL,
        patient_context jsonb,
        gpt_model text DEFAULT 'gpt-4',
        prompt_version text DEFAULT 'v1.0',
        revised_by integer REFERENCES users(id),
        revision_reason text,
        processing_time integer,
        tokens_used integer,
        status text DEFAULT 'draft',
        generated_by integer NOT NULL REFERENCES users(id),
        reviewed_by integer REFERENCES users(id),
        generated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        reviewed_at timestamp,
        patient_message_sent boolean DEFAULT false,
        nurse_message_sent boolean DEFAULT false,
        patient_message_sent_at timestamp,
        nurse_message_sent_at timestamp,
        revision_history jsonb DEFAULT '[]',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 38. Signed Orders Table
    console.log("Checking signed_orders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signed_orders (
        id serial PRIMARY KEY,
        order_id integer NOT NULL REFERENCES orders(id),
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer REFERENCES encounters(id),
        order_type varchar(50) NOT NULL,
        delivery_method varchar(50) NOT NULL,
        delivery_status varchar(50) NOT NULL DEFAULT 'pending',
        delivery_attempts integer NOT NULL DEFAULT 0,
        last_delivery_attempt timestamp,
        delivery_error text,
        can_change_delivery boolean NOT NULL DEFAULT true,
        delivery_lock_reason varchar(255),
        original_delivery_method varchar(50) NOT NULL,
        delivery_changes jsonb DEFAULT '[]',
        signed_at timestamp NOT NULL,
        signed_by integer NOT NULL REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 39. Imaging Orders Table
    console.log("Checking imaging_orders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS imaging_orders (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        encounter_id integer NOT NULL REFERENCES encounters(id),
        study_type text NOT NULL,
        body_part text NOT NULL,
        laterality text,
        contrast_needed boolean DEFAULT false,
        clinical_indication text NOT NULL,
        clinical_history text,
        relevant_symptoms text,
        ordered_by integer NOT NULL REFERENCES users(id),
        ordered_at timestamp DEFAULT CURRENT_TIMESTAMP,
        external_facility_id text,
        external_order_id text,
        dicom_accession_number text,
        order_status text DEFAULT 'pending',
        scheduled_at timestamp,
        completed_at timestamp,
        prep_instructions text,
        scheduling_notes text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 40. Document Processing Queue Table
    console.log("Checking document_processing_queue table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_processing_queue (
        id serial PRIMARY KEY,
        attachment_id integer NOT NULL REFERENCES patient_attachments(id),
        status text DEFAULT 'queued',
        attempts integer DEFAULT 0,
        last_attempt timestamp,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 41. Patient Order Preferences Table
    console.log("Checking patient_order_preferences table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patient_order_preferences (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id) UNIQUE,
        lab_delivery_method text DEFAULT 'mock_service',
        lab_service_provider text,
        imaging_delivery_method text DEFAULT 'print_pdf',
        imaging_service_provider text,
        medication_delivery_method text DEFAULT 'preferred_pharmacy',
        preferred_pharmacy text,
        pharmacy_phone text,
        pharmacy_fax text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        last_updated_by integer REFERENCES users(id)
      );
    `);
    
    // 42. Attachment Extracted Content Table
    console.log("Checking attachment_extracted_content table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attachment_extracted_content (
        id serial PRIMARY KEY,
        attachment_id integer NOT NULL REFERENCES patient_attachments(id) UNIQUE,
        extracted_text text,
        ai_generated_title text,
        document_type text,
        processing_status text DEFAULT 'pending',
        error_message text,
        processed_at timestamp,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // ==================== PATIENT ATTACHMENTS TABLE COLUMN FIX ====================
    
    console.log("\nChecking patient_attachments table columns...");
    
    // The database has 'filename' but schema expects 'file_name'
    // Rename column to match schema
    try {
      await db.execute(sql`
        ALTER TABLE patient_attachments 
        RENAME COLUMN filename TO file_name;
      `);
      console.log("✅ Renamed filename to file_name in patient_attachments table");
    } catch (error: any) {
      if (error.code === '42703') { // column does not exist
        // Column might already be correctly named, try adding it if missing
        await db.execute(sql`
          ALTER TABLE patient_attachments 
          ADD COLUMN IF NOT EXISTS file_name text;
        `);
      } else if (error.code !== '42701') { // column already exists
        throw error;
      }
    }
    
    // Check for all missing columns in patient_attachments table
    const attachmentColumns = [
      { name: 'original_file_name', type: 'text' },
      { name: 'file_size', type: 'integer' },
      { name: 'mime_type', type: 'text' },
      { name: 'file_extension', type: 'text' },
      { name: 'file_path', type: 'text' },
      { name: 'thumbnail_path', type: 'text' },
      { name: 'content_hash', type: 'text' },
      { name: 'category', type: 'text DEFAULT \'general\'' },
      { name: 'title', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'tags', type: 'text[]' },
      { name: 'uploaded_by', type: 'integer' },
      { name: 'is_confidential', type: 'boolean DEFAULT false' },
      { name: 'access_level', type: 'text DEFAULT \'standard\'' },
      { name: 'processing_status', type: 'text DEFAULT \'completed\'' },
      { name: 'virus_scan_status', type: 'text DEFAULT \'pending\'' }
    ];
    
    for (const col of attachmentColumns) {
      try {
        await db.execute(sql.raw(`
          ALTER TABLE patient_attachments 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
        `));
      } catch (error: any) {
        // Ignore if column already exists
        if (error.code !== '42701') {
          console.error(`Error adding column ${col.name}:`, error.message);
        }
      }
    }
    
    // ==================== COMMIT TRANSACTION ====================
    
    await db.execute(sql`COMMIT`);
    
    console.log("\n✅ Comprehensive database fix completed successfully!");
    console.log("\nAll tables have been checked and fixed with:");
    console.log("- Missing tables created");
    console.log("- Missing columns added");
    console.log("- Foreign key constraints verified");
    console.log("- Default data inserted where needed");
    
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    console.error("❌ Error during database fix:", error);
    throw error;
  }
  
  process.exit(0);
}

// Run the comprehensive fix
comprehensiveDatabaseFix().catch(console.error);