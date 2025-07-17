import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * REMOVE EXTRA DATABASE COLUMNS
 * 
 * This script removes columns that exist in the database but NOT in schema.ts
 * Schema.ts is the source of truth - anything not there should be removed.
 */

// Get column names from schema definition
function getSchemaColumns(table: any): Set<string> {
  const columns = new Set<string>();
  const tableSchema = table as any;
  
  for (const key in tableSchema) {
    if (tableSchema[key] && typeof tableSchema[key] === 'object' && tableSchema[key].name) {
      columns.add(tableSchema[key].name);
    }
  }
  
  return columns;
}

async function removeExtraColumns() {
  console.log("🗑️  REMOVING EXTRA DATABASE COLUMNS\n");
  console.log("Schema.ts is the source of truth - removing anything not defined there.\n");

  const results = {
    removed: [] as string[],
    failed: [] as string[],
  };

  // Critical tables to clean up based on verification results
  const tablesToClean = [
    { name: "patients", schema: schema.patients },
    { name: "encounters", schema: schema.encounters },
    { name: "vitals", schema: schema.vitals },
    { name: "medications", schema: schema.medications },
    { name: "medical_problems", schema: schema.medicalProblems },
    { name: "allergies", schema: schema.allergies },
    { name: "lab_results", schema: schema.labResults },
    { name: "lab_orders", schema: schema.labOrders },
    { name: "surgical_history", schema: schema.surgicalHistory },
    { name: "family_history", schema: schema.familyHistory },
    { name: "health_systems", schema: schema.healthSystems },
    { name: "locations", schema: schema.locations },
  ];

  for (const table of tablesToClean) {
    console.log(`\n🔧 Processing ${table.name}...`);
    
    try {
      // Get columns from database
      const dbColumns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table.name}
        ORDER BY ordinal_position
      `);
      
      const dbColumnSet = new Set(dbColumns.rows.map(r => r.column_name as string));
      const schemaColumnSet = getSchemaColumns(table.schema);
      
      // Find extra columns (in database but not in schema)
      const extraColumns = Array.from(dbColumnSet).filter(col => !schemaColumnSet.has(col));
      
      if (extraColumns.length === 0) {
        console.log(`✅ No extra columns in ${table.name}`);
        continue;
      }
      
      console.log(`Found ${extraColumns.length} extra columns to remove: ${extraColumns.join(", ")}`);
      
      // Remove each extra column
      for (const column of extraColumns) {
        try {
          const dropSql = `ALTER TABLE ${table.name} DROP COLUMN IF EXISTS ${column};`;
          console.log(`  Dropping ${column}...`);
          await db.execute(sql.raw(dropSql));
          results.removed.push(`${table.name}.${column}`);
        } catch (error: any) {
          console.error(`  Failed to drop ${column}:`, error.message);
          results.failed.push(`${table.name}.${column}: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      console.error(`Failed to process ${table.name}:`, error.message);
    }
  }

  // Fix missing columns in lab_results that were identified
  console.log("\n🔧 Adding missing columns to lab_results...");
  const missingLabColumns = [
    { name: "previous_date", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS previous_date DATE;` },
    { name: "trend_direction", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS trend_direction TEXT;` },
    { name: "percent_change", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS percent_change DECIMAL;` },
    { name: "qc_flags", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS qc_flags TEXT[];` },
    { name: "source_system", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'internal';` },
    { name: "interface_version", sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS interface_version TEXT;` },
  ];

  for (const col of missingLabColumns) {
    try {
      console.log(`  Adding ${col.name}...`);
      await db.execute(sql.raw(col.sql));
      console.log(`  ✅ Added ${col.name}`);
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        console.error(`  Failed to add ${col.name}:`, error.message);
      }
    }
  }

  // Final summary
  console.log("\n\n📋 CLEANUP SUMMARY:");
  console.log("==================");
  console.log(`Columns removed: ${results.removed.length}`);
  console.log(`Failed removals: ${results.failed.length}`);
  
  if (results.removed.length > 0) {
    console.log("\n✅ Successfully removed:");
    results.removed.forEach(col => console.log(`  - ${col}`));
  }
  
  if (results.failed.length > 0) {
    console.log("\n❌ Failed to remove:");
    results.failed.forEach(col => console.log(`  - ${col}`));
  }

  console.log("\n🎯 Column cleanup complete!");
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run the cleanup
removeExtraColumns().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});