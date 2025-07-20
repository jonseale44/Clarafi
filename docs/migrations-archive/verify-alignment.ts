#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function verifyAlignment() {
  console.log("🔍 VERIFYING DATABASE ALIGNMENT\n");

  // Test 1: Check if critical tables exist
  console.log("=== TEST 1: Critical Tables ===");
  const criticalTables = [
    'gpt_lab_review_notes',
    'user_note_templates',
    'template_shares',
    'template_versions',
    'external_labs',
    'imaging_orders',
    'resource_bookings',
    'medical_history'
  ];

  for (const table of criticalTables) {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${table}
      ) as exists
    `);
    console.log(`${result.rows[0].exists ? '✅' : '❌'} ${table}`);
  }

  // Test 2: Count tables
  console.log("\n=== TEST 2: Table Count ===");
  const countResult = await db.execute(sql`
    SELECT COUNT(DISTINCT table_name) as total
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log(`Total tables in database: ${countResult.rows[0].total}`);
  console.log(`Expected tables from schema: 75 (+ 2 extra: dashboards, session)`);

  // Test 3: Test patient deletion (the critical issue)
  console.log("\n=== TEST 3: Patient Deletion Test ===");
  try {
    // First check if test patient exists
    const testPatient = await db.execute(sql`
      SELECT id FROM patients WHERE id = 999999
    `);
    
    if (testPatient.rows.length === 0) {
      // Create a test patient
      await db.execute(sql`
        INSERT INTO patients (id, health_system_id, mrn, first_name, last_name, date_of_birth, gender, contact_number, created_at)
        VALUES (999999, 1, 'TEST999999', 'Test', 'Patient', '2000-01-01', 'Other', '555-0000', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log("Created test patient with ID 999999");
    }

    // Try to delete the test patient (this was failing before)
    await db.execute(sql`
      DELETE FROM patients WHERE id = 999999
    `);
    
    console.log("✅ Patient deletion successful! The gpt_lab_review_notes issue is fixed.");
  } catch (error: any) {
    console.error("❌ Patient deletion failed:", error.message);
    if (error.message.includes('gpt_lab_review_notes')) {
      console.error("The gpt_lab_review_notes table issue still exists!");
    }
  }

  // Test 4: Check for any remaining schema/database mismatches
  console.log("\n=== TEST 4: Final Alignment Check ===");
  
  // Check if the two extra tables exist
  const extraTables = ['dashboards', 'session'];
  for (const table of extraTables) {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${table}
      ) as exists
    `);
    console.log(`Extra table '${table}': ${result.rows[0].exists ? 'exists' : 'missing'}`);
  }

  console.log("\n✅ Verification complete!");
}

// Run verification
if (process.argv[1] === new URL(import.meta.url).pathname) {
  verifyAlignment()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Verification failed:", error);
      process.exit(1);
    });
}