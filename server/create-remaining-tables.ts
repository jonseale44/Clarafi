import { db } from './db';
import { sql } from 'drizzle-orm';

async function createRemainingTables() {
  console.log('Creating remaining tables...');
  
  try {
    // Create health_systems table if not exists
    console.log('Creating health_systems table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS health_systems (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        subscription_tier INTEGER DEFAULT 1,
        subscription_status VARCHAR(50) DEFAULT 'active',
        subscription_key VARCHAR(255) UNIQUE,
        is_migration BOOLEAN DEFAULT false,
        stripe_customer_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create locations table
    console.log('Creating locations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(2),
        zip VARCHAR(10),
        phone VARCHAR(20),
        health_system_id INTEGER REFERENCES health_systems(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create organizations table
    console.log('Creating organizations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(2),
        zip VARCHAR(10),
        phone VARCHAR(20),
        website VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create authentication_logs table
    console.log('Creating authentication_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS authentication_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username VARCHAR(255),
        event_type VARCHAR(50) NOT NULL,
        success BOOLEAN NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to orders table
    console.log('Adding order_status column to orders table...');
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending'
    `);

    // Create scheduling-related tables
    console.log('Creating scheduling AI factors table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scheduling_ai_factors (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        factor_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        data_type VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        default_weight NUMERIC(3,2) DEFAULT 0.50,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating scheduling AI weights table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scheduling_ai_weights (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER,
        location_id INTEGER,
        health_system_id INTEGER,
        created_by INTEGER NOT NULL,
        factor_name VARCHAR(255) NOT NULL,
        weight NUMERIC(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
        is_active BOOLEAN DEFAULT true,
        custom_parameters JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create appointment types table
    console.log('Creating appointment types table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appointment_types (
        id SERIAL PRIMARY KEY,
        health_system_id INTEGER,
        name VARCHAR(255) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        color VARCHAR(7),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create appointments table
    console.log('Creating appointments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        provider_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        appointment_type_id INTEGER,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER NOT NULL,
        ai_predicted_duration INTEGER,
        status VARCHAR(50) DEFAULT 'scheduled',
        chief_complaint TEXT,
        notes TEXT,
        checked_in_at TIMESTAMP WITH TIME ZONE,
        checked_in_by INTEGER,
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by INTEGER,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        cancelled_by INTEGER,
        cancellation_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_session_locations table
    console.log('Creating user_session_locations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_session_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        session_id VARCHAR(255),
        is_primary BOOLEAN DEFAULT false,
        permissions JSONB DEFAULT '{}',
        remembered BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_locations table
    console.log('Creating user_locations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add default health system for testing
    console.log('Creating default health system...');
    await db.execute(sql`
      INSERT INTO health_systems (id, name, type, subscription_tier)
      VALUES (2, 'Waco Family Medicine', 'clinic', 3)
      ON CONFLICT (id) DO NOTHING
    `);

    // Add default location
    console.log('Creating default location...');
    await db.execute(sql`
      INSERT INTO locations (id, name, health_system_id, address, city, state, zip)
      VALUES (1, 'Main Clinic', 2, '123 Main St', 'Waco', 'TX', '76701')
      ON CONFLICT (id) DO NOTHING
    `);

    // Add default appointment types
    console.log('Creating default appointment types...');
    await db.execute(sql`
      INSERT INTO appointment_types (health_system_id, name, duration_minutes, color)
      VALUES 
        (2, 'Sick Visit', 20, '#FF6B6B'),
        (2, 'Follow-up', 20, '#4ECDC4'),
        (2, 'Physical Exam', 40, '#45B7D1'),
        (2, 'New Patient', 40, '#96CEB4')
      ON CONFLICT DO NOTHING
    `);

    // Add health_system_id to users table if missing
    console.log('Adding health_system_id to users table if missing...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS health_system_id INTEGER DEFAULT 2
    `);

    // Add health_system_id to patients table if missing
    console.log('Adding health_system_id to patients table if missing...');
    await db.execute(sql`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS health_system_id INTEGER DEFAULT 2
    `);

    console.log('All remaining tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createRemainingTables();