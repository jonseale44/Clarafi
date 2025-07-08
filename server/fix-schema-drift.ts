import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * COMPREHENSIVE SCHEMA DRIFT FIX
 * 
 * This script systematically compares schema.ts with the actual database
 * and adds missing columns. Each operation is isolated to prevent timeouts.
 */

async function fixSchemaDrift() {
  console.log("🔧 Starting comprehensive schema drift fix...\n");

  // Track results
  const results = {
    success: [] as string[],
    failed: [] as string[],
  };

  // Define all missing columns based on our analysis
  const missingColumns = [
    // Social History missing columns
    {
      table: "social_history",
      column: "consolidation_reasoning",
      sql: `ALTER TABLE social_history ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;`,
    },
    {
      table: "social_history",
      column: "extraction_notes",
      sql: `ALTER TABLE social_history ADD COLUMN IF NOT EXISTS extraction_notes TEXT;`,
    },
    
    // Surgical History missing columns
    {
      table: "surgical_history",
      column: "consolidation_reasoning",
      sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;`,
    },
    {
      table: "surgical_history",
      column: "extraction_notes",
      sql: `ALTER TABLE surgical_history ADD COLUMN IF NOT EXISTS extraction_notes TEXT;`,
    },
    
    // Medical Problems missing columns
    {
      table: "medical_problems",
      column: "consolidation_reasoning",
      sql: `ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;`,
    },
    {
      table: "medical_problems",
      column: "extraction_notes",
      sql: `ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS extraction_notes TEXT;`,
    },
    {
      table: "medical_problems",
      column: "source_confidence",
      sql: `ALTER TABLE medical_problems ADD COLUMN IF NOT EXISTS source_confidence DECIMAL(3,2) DEFAULT 0.95;`,
    },
    
    // Medications missing columns
    {
      table: "medications",
      column: "consolidation_reasoning",
      sql: `ALTER TABLE medications ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;`,
    },
    {
      table: "medications",
      column: "extraction_notes",
      sql: `ALTER TABLE medications ADD COLUMN IF NOT EXISTS extraction_notes TEXT;`,
    },
    
    // Family History missing columns
    {
      table: "family_history",
      column: "consolidation_reasoning",
      sql: `ALTER TABLE family_history ADD COLUMN IF NOT EXISTS consolidation_reasoning TEXT;`,
    },
    {
      table: "family_history",
      column: "extraction_notes",
      sql: `ALTER TABLE family_history ADD COLUMN IF NOT EXISTS extraction_notes TEXT;`,
    },
    
    // Vitals missing columns
    {
      table: "vitals",
      column: "visit_history",
      sql: `ALTER TABLE vitals ADD COLUMN IF NOT EXISTS visit_history JSONB DEFAULT '[]'::jsonb;`,
    },
    
    // Lab Results missing columns
    {
      table: "lab_results",
      column: "visit_history",
      sql: `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS visit_history JSONB DEFAULT '[]'::jsonb;`,
    },
  ];

  // Execute each column addition separately to avoid timeouts
  for (const missing of missingColumns) {
    try {
      console.log(`Adding ${missing.column} to ${missing.table}...`);
      await db.execute(sql.raw(missing.sql));
      results.success.push(`✅ Added ${missing.column} to ${missing.table}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        results.success.push(`✅ ${missing.column} already exists in ${missing.table}`);
      } else {
        console.error(`Failed to add ${missing.column} to ${missing.table}:`, error.message);
        results.failed.push(`❌ Failed: ${missing.column} in ${missing.table} - ${error.message}`);
      }
    }
  }

  // Now verify what we have vs what we should have
  console.log("\n📊 Verification Phase - Checking all tables...\n");

  const tablesToVerify = [
    "social_history",
    "surgical_history",
    "medical_problems",
    "medications",
    "family_history",
    "vitals",
    "lab_results",
    "allergies",
  ];

  for (const table of tablesToVerify) {
    try {
      const columns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
        AND column_name IN ('consolidation_reasoning', 'extraction_notes', 'visit_history', 'source_confidence', 'source_type')
        ORDER BY column_name
      `);
      
      console.log(`\n${table} has:`, columns.rows.map(r => r.column_name).join(", ") || "NONE");
    } catch (error) {
      console.error(`Failed to verify ${table}:`, error);
    }
  }

  // Final summary
  console.log("\n\n📋 FINAL SUMMARY:");
  console.log("================");
  console.log(`Successful operations: ${results.success.length}`);
  console.log(`Failed operations: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log("\n✅ Successes:");
    results.success.forEach(s => console.log(s));
  }
  
  if (results.failed.length > 0) {
    console.log("\n❌ Failures:");
    results.failed.forEach(f => console.log(f));
  }

  console.log("\n🎯 Schema drift fix complete!");
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run the fix
fixSchemaDrift().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});