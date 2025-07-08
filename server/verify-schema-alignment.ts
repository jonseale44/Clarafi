import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * COMPREHENSIVE SCHEMA VERIFICATION
 * 
 * This script checks BOTH directions:
 * 1. Schema -> Database: Are all schema columns in the database?
 * 2. Database -> Schema: Are there extra columns in the database?
 */

// Get column names from schema definition
function getSchemaColumns(table: any): Set<string> {
  const columns = new Set<string>();
  const tableSchema = table as any;
  
  // Get all column names from the table schema
  for (const key in tableSchema) {
    if (tableSchema[key] && typeof tableSchema[key] === 'object' && tableSchema[key].name) {
      columns.add(tableSchema[key].name);
    }
  }
  
  return columns;
}

async function verifySchemaAlignment() {
  console.log("🔍 COMPREHENSIVE SCHEMA ALIGNMENT VERIFICATION\n");
  console.log("=" .repeat(60) + "\n");

  const issues = {
    missingInDb: [] as string[],
    extraInDb: [] as string[],
    perfect: [] as string[],
  };

  // Tables to verify
  const tablesToCheck = [
    { name: "users", schema: schema.users },
    { name: "patients", schema: schema.patients },
    { name: "encounters", schema: schema.encounters },
    { name: "vitals", schema: schema.vitals },
    { name: "medications", schema: schema.medications },
    { name: "medical_problems", schema: schema.medicalProblems },
    { name: "allergies", schema: schema.allergies },
    { name: "lab_results", schema: schema.labResults },
    { name: "lab_orders", schema: schema.labOrders },
    { name: "imaging_results", schema: schema.imagingResults },
    { name: "imaging_orders", schema: schema.imagingOrders },
    { name: "orders", schema: schema.orders },
    { name: "social_history", schema: schema.socialHistory },
    { name: "surgical_history", schema: schema.surgicalHistory },
    { name: "family_history", schema: schema.familyHistory },
    { name: "user_note_preferences", schema: schema.userNotePreferences },
    { name: "health_systems", schema: schema.healthSystems },
    { name: "organizations", schema: schema.organizations },
    { name: "locations", schema: schema.locations },
  ];

  for (const table of tablesToCheck) {
    console.log(`\n📊 Checking ${table.name}...`);
    
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
      
      // Find missing columns (in schema but not in database)
      const missingInDb = Array.from(schemaColumnSet).filter(col => !dbColumnSet.has(col));
      
      // Find extra columns (in database but not in schema)
      const extraInDb = Array.from(dbColumnSet).filter(col => !schemaColumnSet.has(col));
      
      if (missingInDb.length === 0 && extraInDb.length === 0) {
        console.log(`✅ PERFECT - ${table.name} is fully aligned!`);
        issues.perfect.push(table.name);
      } else {
        if (missingInDb.length > 0) {
          console.log(`❌ Missing in DB: ${missingInDb.join(", ")}`);
          missingInDb.forEach(col => {
            issues.missingInDb.push(`${table.name}.${col}`);
          });
        }
        if (extraInDb.length > 0) {
          console.log(`⚠️  Extra in DB: ${extraInDb.join(", ")}`);
          extraInDb.forEach(col => {
            issues.extraInDb.push(`${table.name}.${col}`);
          });
        }
      }
      
      console.log(`   Schema columns: ${schemaColumnSet.size}, DB columns: ${dbColumnSet.size}`);
      
    } catch (error: any) {
      console.error(`❌ Error checking ${table.name}:`, error.message);
    }
  }

  // Final report
  console.log("\n" + "=" .repeat(60));
  console.log("📋 FINAL ALIGNMENT REPORT");
  console.log("=" .repeat(60) + "\n");
  
  console.log(`✅ Perfectly aligned tables: ${issues.perfect.length}/${tablesToCheck.length}`);
  if (issues.perfect.length > 0) {
    console.log(`   ${issues.perfect.join(", ")}`);
  }
  
  if (issues.missingInDb.length > 0) {
    console.log(`\n❌ Columns missing in database: ${issues.missingInDb.length}`);
    issues.missingInDb.forEach(col => console.log(`   - ${col}`));
  }
  
  if (issues.extraInDb.length > 0) {
    console.log(`\n⚠️  Extra columns in database: ${issues.extraInDb.length}`);
    issues.extraInDb.forEach(col => console.log(`   - ${col}`));
  }
  
  if (issues.missingInDb.length === 0 && issues.extraInDb.length === 0) {
    console.log("\n🎉 PERFECT ALIGNMENT - Database and schema are 100% synchronized!");
  } else {
    console.log("\n⚠️  Schema drift detected - see issues above");
  }
  
  process.exit(issues.missingInDb.length > 0 ? 1 : 0);
}

// Run verification
verifySchemaAlignment().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});