#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as fs from "fs";

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

async function safeSchemaAnalysis() {
  console.log("🔍 SAFE SCHEMA ANALYSIS - Checking for data before suggesting changes\n");
  console.log("=" .repeat(80));
  
  // Read schema tables
  const schemaTablesWithNames = fs.readFileSync('schema_tables_with_names.txt', 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^(\S+)\s+\((\w+)\)$/);
      return match ? { tableName: match[1], varName: match[2] } : null;
    })
    .filter(Boolean);
  
  const schemaContent = fs.readFileSync('../shared/schema.ts', 'utf-8');
  
  const report: string[] = [];
  const safeFixes: string[] = [];
  const riskyColumns: string[] = [];
  
  report.push("# Safe Schema Analysis Report");
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
  
  // Check extra tables in database
  report.push("## Extra Tables in Database");
  const extraDbTables = dbTableNames.filter(t => !schemaTableNames.includes(t));
  for (const table of extraDbTables) {
    // Check if table has data
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)}`);
    const count = countResult.rows[0].count;
    
    report.push(`\n### Table: ${table}`);
    report.push(`- Row count: ${count}`);
    
    if (count === 0) {
      report.push(`- **SAFE TO REMOVE** (no data)`);
      if (table !== 'session') { // Never remove session table
        safeFixes.push(`-- Safe to remove: ${table} has no data`);
        safeFixes.push(`DROP TABLE IF EXISTS ${table} CASCADE;`);
      }
    } else {
      report.push(`- ⚠️  **CONTAINS DATA** - DO NOT REMOVE`);
      riskyColumns.push(`Table ${table} contains ${count} rows`);
    }
  }
  
  report.push("\n## Column Analysis for Each Table");
  
  // Analyze each common table
  for (const tableName of schemaTableNames.sort()) {
    if (!dbTableNames.includes(tableName)) continue;
    
    // Get database columns
    const dbColumns = await db.execute(sql`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    
    // Get schema columns
    const tableVar = schemaTablesWithNames.find(t => t!.tableName === tableName)?.varName;
    if (!tableVar) continue;
    
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
    const schemaColumnsSnakeCase = schemaColumns.map(col => camelToSnake(col));
    
    // Find columns that exist in DB but not in schema
    const extraDbColumns = dbColumnNames.filter(dbCol => {
      const camelVersion = dbCol.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      return !schemaColumns.includes(camelVersion) && !schemaColumnsSnakeCase.includes(dbCol) && !schemaColumns.includes(dbCol);
    });
    
    if (extraDbColumns.length > 0) {
      report.push(`\n### Table: ${tableName}`);
      report.push("#### Extra columns in database:");
      
      for (const col of extraDbColumns) {
        // Check if column has non-null data
        const nonNullCount = await db.execute(
          sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(col)} IS NOT NULL`
        );
        const count = nonNullCount.rows[0].count;
        
        const colInfo = dbColumns.rows.find(row => row.column_name === col);
        
        if (count === 0) {
          report.push(`- ${col} (${colInfo?.data_type}) - **NO DATA** ✅`);
          safeFixes.push(`-- Column ${col} in ${tableName} has no data`);
          safeFixes.push(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${col};`);
        } else {
          report.push(`- ${col} (${colInfo?.data_type}) - **HAS ${count} NON-NULL VALUES** ⚠️`);
          riskyColumns.push(`${tableName}.${col} has ${count} non-null values`);
          
          // Instead of removing, suggest adding to schema
          const camelName = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          report.push(`  → Consider adding "${camelName}" to schema.ts instead of removing from DB`);
        }
      }
    }
    
    // Find missing columns (in schema but not in DB)
    const missingDbColumns = schemaColumns.filter(schemaCol => {
      const snakeVersion = camelToSnake(schemaCol);
      return !dbColumnNames.includes(snakeVersion) && !dbColumnNames.includes(schemaCol);
    });
    
    if (missingDbColumns.length > 0) {
      if (extraDbColumns.length === 0) {
        report.push(`\n### Table: ${tableName}`);
      }
      report.push("#### Missing columns in database:");
      
      for (const col of missingDbColumns) {
        const snakeCol = camelToSnake(col);
        report.push(`- ${col} → ${snakeCol} (SAFE TO ADD)`);
        
        // Determine column type from schema
        const columnTypeMatch = tableMatch![1].match(new RegExp(`${col}:\\s*(\\w+)\\(`));
        let sqlType = 'TEXT'; // default
        
        if (columnTypeMatch) {
          const drizzleType = columnTypeMatch[1];
          switch(drizzleType) {
            case 'integer': sqlType = 'INTEGER'; break;
            case 'text': sqlType = 'TEXT'; break;
            case 'boolean': sqlType = 'BOOLEAN DEFAULT false'; break;
            case 'timestamp': sqlType = 'TIMESTAMP'; break;
            case 'date': sqlType = 'DATE'; break;
            case 'json': case 'jsonb': sqlType = 'JSONB'; break;
            case 'numeric': case 'decimal': sqlType = 'NUMERIC(10,2)'; break;
            case 'serial': sqlType = 'SERIAL'; break;
            case 'bigint': sqlType = 'BIGINT'; break;
          }
        }
        
        safeFixes.push(`-- Add missing column to ${tableName}`);
        safeFixes.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${snakeCol} ${sqlType};`);
      }
    }
  }
  
  // Summary
  report.push("\n## Summary");
  report.push(`- Total risky columns with data: ${riskyColumns.length}`);
  report.push(`- Safe fixes identified: ${safeFixes.length}`);
  
  if (riskyColumns.length > 0) {
    report.push("\n## ⚠️  RISKY COLUMNS (contain data):");
    riskyColumns.forEach(col => report.push(`- ${col}`));
    report.push("\n**RECOMMENDATION**: Add these columns to schema.ts instead of removing them!");
  }
  
  // Write reports
  fs.writeFileSync('safe-schema-analysis.md', report.join('\n'));
  
  if (safeFixes.length > 0) {
    safeFixes.unshift('-- SAFE Schema Fixes Only (no data loss)');
    safeFixes.unshift('-- Generated: ' + new Date().toISOString());
    safeFixes.unshift('');
    fs.writeFileSync('safe-schema-fixes.sql', safeFixes.join('\n'));
    console.log(`✅ Generated safe-schema-fixes.sql with ${safeFixes.length - 3} SAFE fixes`);
  }
  
  console.log(`⚠️  Found ${riskyColumns.length} columns with data that should NOT be removed`);
  console.log("📄 Full report: safe-schema-analysis.md");
  
  if (riskyColumns.length > 0) {
    console.log("\n🔴 IMPORTANT: Do NOT remove columns that contain data!");
    console.log("Instead, consider adding them to schema.ts to preserve your data.");
  }
}

// Run analysis
if (process.argv[1] === new URL(import.meta.url).pathname) {
  safeSchemaAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}