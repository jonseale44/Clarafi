#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function completeAnalysis() {
  console.log("🔍 COMPREHENSIVE DATABASE VS SCHEMA COLUMN ANALYSIS\n");
  console.log("=" .repeat(100));
  
  // Read the schema tables file we just created
  const schemaTablesWithNames = fs.readFileSync('schema_tables_with_names.txt', 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^(\S+)\s+\((\w+)\)$/);
      return match ? { tableName: match[1], varName: match[2] } : null;
    })
    .filter(Boolean);
  
  const report: string[] = [];
  report.push("# Complete Database vs Schema Analysis Report");
  report.push(`Generated on: ${new Date().toLocaleDateString()}\n`);
  
  // Get all database tables
  const dbTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  const dbTableNames = dbTables.rows.map(row => row.table_name);
  const schemaTableNames = schemaTablesWithNames.map(t => t!.tableName);
  
  report.push("## Summary");
  report.push(`- Total tables in database: ${dbTableNames.length}`);
  report.push(`- Total tables in schema: ${schemaTableNames.length}`);
  report.push(`- Tables in DB but not in schema: ${dbTableNames.filter(t => !schemaTableNames.includes(t)).length}`);
  report.push(`- Tables in schema but not in DB: ${schemaTableNames.filter(t => !dbTableNames.includes(t)).length}\n`);
  
  report.push("## Tables Only in Database (not in schema)");
  const extraDbTables = dbTableNames.filter(t => !schemaTableNames.includes(t));
  if (extraDbTables.length === 0) {
    report.push("None");
  } else {
    extraDbTables.forEach(t => report.push(`- ${t}`));
  }
  
  report.push("\n## Tables Only in Schema (not in database)");
  const missingDbTables = schemaTableNames.filter(t => !dbTableNames.includes(t));
  if (missingDbTables.length === 0) {
    report.push("None");
  } else {
    missingDbTables.forEach(t => report.push(`- ${t}`));
  }
  
  report.push("\n## Column Analysis for Each Table");
  report.push("Tables are analyzed in alphabetical order. For each table that exists in both database and schema:");
  
  // Analyze each table that exists in both
  const commonTables = schemaTableNames.filter(t => dbTableNames.includes(t));
  
  // Read schema content once
  const schemaContent = fs.readFileSync('../shared/schema.ts', 'utf-8');
  
  for (const tableName of commonTables.sort()) {
    report.push(`\n### Table: ${tableName}`);
    
    // Get columns from database
    const dbColumns = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    
    // Get expected columns from schema file
    const tableVar = schemaTablesWithNames.find(t => t!.tableName === tableName)?.varName;
    
    if (!tableVar) {
      report.push("⚠️  Could not find schema definition");
      continue;
    }
    
    // Extract columns for this table from schema
    const tableRegex = new RegExp(`export const ${tableVar} = pgTable\\("${tableName}",\\s*{([^}]+)}`, 's');
    const tableMatch = schemaContent.match(tableRegex);
    
    const schemaColumns: string[] = [];
    if (tableMatch) {
      const columnsSection = tableMatch[1];
      const columnMatches = columnsSection.matchAll(/(\w+):\s*\w+\(/g);
      for (const match of columnMatches) {
        schemaColumns.push(match[1]);
      }
    }
    
    const dbColumnNames = dbColumns.rows.map(row => row.column_name);
    
    // Find differences
    const extraDbColumns = dbColumnNames.filter(c => !schemaColumns.includes(c));
    const missingDbColumns = schemaColumns.filter(c => !dbColumnNames.includes(c));
    
    if (extraDbColumns.length === 0 && missingDbColumns.length === 0) {
      report.push("✅ All columns match perfectly");
    } else {
      if (extraDbColumns.length > 0) {
        report.push("\n**Columns in database but NOT in schema:**");
        extraDbColumns.forEach(c => {
          const colInfo = dbColumns.rows.find(row => row.column_name === c);
          report.push(`- ${c} (${colInfo?.data_type}${colInfo?.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
        });
      }
      
      if (missingDbColumns.length > 0) {
        report.push("\n**Columns in schema but NOT in database:**");
        missingDbColumns.forEach(c => {
          report.push(`- ${c}`);
        });
      }
    }
    
    report.push(`\nTotal columns in database: ${dbColumnNames.length}`);
    report.push(`Total columns in schema: ${schemaColumns.length}`);
  }
  
  // Calculate totals
  let totalExtraColumns = 0;
  let totalMissingColumns = 0;
  let tablesWithMismatches = 0;
  
  for (const tableName of commonTables) {
    const dbColumns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = ${tableName}
    `);
    
    const tableVar = schemaTablesWithNames.find(t => t!.tableName === tableName)?.varName;
    if (!tableVar) continue;
    
    const tableMatch = schemaContent.match(new RegExp(`export const ${tableVar} = pgTable\\("${tableName}",\\s*{([^}]+)}`, 's'));
    const schemaColumns: string[] = [];
    if (tableMatch) {
      const columnsSection = tableMatch[1];
      const columnMatches = columnsSection.matchAll(/(\w+):\s*\w+\(/g);
      for (const match of columnMatches) {
        schemaColumns.push(match[1]);
      }
    }
    
    const dbColumnNames = dbColumns.rows.map(row => row.column_name);
    const extraCount = dbColumnNames.filter(c => !schemaColumns.includes(c)).length;
    const missingCount = schemaColumns.filter(c => !dbColumnNames.includes(c)).length;
    
    totalExtraColumns += extraCount;
    totalMissingColumns += missingCount;
    if (extraCount > 0 || missingCount > 0) {
      tablesWithMismatches++;
    }
  }
  
  report.push("\n## Final Statistics");
  report.push(`- Tables analyzed: ${commonTables.length}`);
  report.push(`- Tables with column mismatches: ${tablesWithMismatches}`);
  report.push(`- Total extra columns in database: ${totalExtraColumns}`);
  report.push(`- Total missing columns in database: ${totalMissingColumns}`);
  
  // Write report to file
  fs.writeFileSync('complete-db-schema-analysis.md', report.join('\n'));
  
  console.log("✅ Analysis complete! Report written to: complete-db-schema-analysis.md");
  console.log(`\n📊 Quick Summary:`);
  console.log(`   - Extra tables in DB: ${extraDbTables.length} (${extraDbTables.join(', ')})`);
  console.log(`   - Missing tables in DB: ${missingDbTables.length}`);
  console.log(`   - Tables with column mismatches: ${tablesWithMismatches}`);
  console.log(`   - Total extra columns: ${totalExtraColumns}`);
  console.log(`   - Total missing columns: ${totalMissingColumns}`);
}

// Run analysis
if (process.argv[1] === new URL(import.meta.url).pathname) {
  completeAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}