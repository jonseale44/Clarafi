#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

async function comprehensiveAnalysis() {
  console.log("🔍 COMPREHENSIVE DATABASE VS SCHEMA ANALYSIS\n");
  console.log("=" .repeat(80));
  
  // Get all tables from database
  const dbTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  const dbTableNames = dbTables.rows.map(row => row.table_name);
  
  // Get all tables from schema - parse the actual table names
  const schemaTableNames: string[] = [];
  const schemaTableMap: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === 'object' && value.constructor.name === 'PgTable') {
      const table = value as any;
      if (table[Symbol.for("drizzle:Name")]) {
        const tableName = table[Symbol.for("drizzle:Name")];
        schemaTableNames.push(tableName);
        schemaTableMap[tableName] = table;
      }
    }
  }
  
  console.log(`📊 SUMMARY`);
  console.log(`Database tables: ${dbTableNames.length}`);
  console.log(`Schema tables: ${schemaTableNames.length}\n`);
  
  // Find tables in DB but not in schema
  console.log("🔴 TABLES IN DATABASE BUT NOT IN SCHEMA:");
  console.log("-".repeat(80));
  const extraDbTables = dbTableNames.filter(t => !schemaTableNames.includes(t));
  if (extraDbTables.length === 0) {
    console.log("None");
  } else {
    extraDbTables.forEach(t => console.log(`  - ${t}`));
  }
  console.log();
  
  // Find tables in schema but not in DB
  console.log("🔴 TABLES IN SCHEMA BUT NOT IN DATABASE:");
  console.log("-".repeat(80));
  const missingDbTables = schemaTableNames.filter(t => !dbTableNames.includes(t));
  if (missingDbTables.length === 0) {
    console.log("None");
  } else {
    missingDbTables.forEach(t => console.log(`  - ${t}`));
  }
  console.log();
  
  // For each table that exists in both, compare columns
  console.log("📋 COLUMN ANALYSIS FOR MATCHING TABLES:");
  console.log("=".repeat(80));
  
  const commonTables = schemaTableNames.filter(t => dbTableNames.includes(t));
  
  for (const tableName of commonTables.sort()) {
    // Get columns from database
    const dbColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    
    const dbColumnNames = dbColumns.rows.map(row => row.column_name);
    
    // Get columns from schema
    const schemaTable = schemaTableMap[tableName];
    
    const schemaColumnNames: string[] = [];
    if (schemaTable) {
      // Drizzle tables store columns as properties
      const columns = (schemaTable as any).columns || {};
      schemaColumnNames.push(...Object.keys(columns));
    }
    
    // Find differences
    const extraDbColumns = dbColumnNames.filter(c => !schemaColumnNames.includes(c));
    const missingDbColumns = schemaColumnNames.filter(c => !dbColumnNames.includes(c));
    
    if (extraDbColumns.length > 0 || missingDbColumns.length > 0) {
      console.log(`\n📊 ${tableName.toUpperCase()}`);
      console.log("-".repeat(40));
      
      if (extraDbColumns.length > 0) {
        console.log("  🔴 Columns in DB but not in schema:");
        extraDbColumns.forEach(c => {
          const colInfo = dbColumns.rows.find(row => row.column_name === c);
          console.log(`    - ${c} (${colInfo?.data_type})`);
        });
      }
      
      if (missingDbColumns.length > 0) {
        console.log("  🔴 Columns in schema but not in DB:");
        missingDbColumns.forEach(c => {
          const colDef = schemaTable.table.columns[c];
          console.log(`    - ${c} (${colDef?.dataType || 'unknown type'})`);
        });
      }
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ ANALYSIS COMPLETE\n");
  
  // Summary statistics
  let totalExtraDbColumns = 0;
  let totalMissingDbColumns = 0;
  
  for (const tableName of commonTables) {
    const dbColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = ${tableName}
    `);
    const dbColumnNames = dbColumns.rows.map(row => row.column_name);
    
    const schemaTable = Object.values(schema).find((t: any) => 
      t && typeof t === 'object' && 'table' in t && t.table.name === tableName
    ) as any;
    const schemaColumnNames = schemaTable ? Object.keys(schemaTable.table.columns) : [];
    
    totalExtraDbColumns += dbColumnNames.filter(c => !schemaColumnNames.includes(c)).length;
    totalMissingDbColumns += schemaColumnNames.filter(c => !dbColumnNames.includes(c)).length;
  }
  
  console.log("📈 FINAL STATISTICS:");
  console.log(`  - Extra tables in database: ${extraDbTables.length}`);
  console.log(`  - Missing tables in database: ${missingDbTables.length}`);
  console.log(`  - Extra columns in database: ${totalExtraDbColumns}`);
  console.log(`  - Missing columns in database: ${totalMissingDbColumns}`);
}

// Run analysis
if (process.argv[1] === new URL(import.meta.url).pathname) {
  comprehensiveAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}