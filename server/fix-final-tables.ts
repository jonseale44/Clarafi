import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * FINAL FIX - Add missing columns to surgical_history and locations tables
 */

async function fixFinalTables() {
  console.log("🔧 FINAL SCHEMA FIX - surgical_history and locations tables\n");

  const results = {
    success: [] as string[],
    failed: [] as string[],
  };

  // Missing columns for surgical_history
  const surgicalHistoryColumns = [
    { name: "surgeon_name", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS surgeon_name TEXT;` },
    { name: "facility_name", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS facility_name TEXT;` },
    { name: "indication", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS indication TEXT;` },
    { name: "anesthesia_type", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS anesthesia_type TEXT;` },
    { name: "cpt_code", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS cpt_code TEXT;` },
    { name: "icd10_procedure_code", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS icd10_procedure_code TEXT;` },
    { name: "anatomical_site", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS anatomical_site TEXT;` },
    { name: "laterality", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS laterality TEXT;` },
    { name: "urgency_level", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS urgency_level TEXT;` },
    { name: "length_of_stay", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS length_of_stay INTEGER;` },
    { name: "blood_loss", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS blood_loss TEXT;` },
    { name: "transfusions_required", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS transfusions_required BOOLEAN DEFAULT false;` },
    { name: "implants_hardware", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS implants_hardware TEXT;` },
    { name: "follow_up_required", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT true;` },
    { name: "recovery_status", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS recovery_status TEXT;` },
    { name: "last_updated_encounter", sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS last_updated_encounter INTEGER REFERENCES encounters(id);` },
  ];

  // Missing columns for locations
  const locationsColumns = [
    { name: "facility_code", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS facility_code TEXT;` },
    { name: "has_lab", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT false;` },
    { name: "has_imaging", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_imaging BOOLEAN DEFAULT false;` },
    { name: "has_pharmacy", sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT false;` },
  ];

  // Add surgical_history columns
  console.log("📊 Adding columns to surgical_history...");
  for (const col of surgicalHistoryColumns) {
    try {
      console.log(`  Adding ${col.name}...`);
      await db.execute(sql.raw(col.sql));
      results.success.push(`surgical_history.${col.name}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        results.success.push(`surgical_history.${col.name} (already exists)`);
      } else {
        console.error(`  Failed to add ${col.name}:`, error.message);
        results.failed.push(`surgical_history.${col.name}: ${error.message}`);
      }
    }
  }

  // Add locations columns
  console.log("\n📊 Adding columns to locations...");
  for (const col of locationsColumns) {
    try {
      console.log(`  Adding ${col.name}...`);
      await db.execute(sql.raw(col.sql));
      results.success.push(`locations.${col.name}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        results.success.push(`locations.${col.name} (already exists)`);
      } else {
        console.error(`  Failed to add ${col.name}:`, error.message);
        results.failed.push(`locations.${col.name}: ${error.message}`);
      }
    }
  }

  // Final summary
  console.log("\n\n📋 FINAL FIX SUMMARY:");
  console.log("====================");
  console.log(`Successful: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log("\n✅ Successfully added:");
    results.success.forEach(col => console.log(`  - ${col}`));
  }
  
  if (results.failed.length > 0) {
    console.log("\n❌ Failed:");
    results.failed.forEach(col => console.log(`  - ${col}`));
  }

  console.log("\n🎯 Final fix complete!");
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run the fix
fixFinalTables().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});