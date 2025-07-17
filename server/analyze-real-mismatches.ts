#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as fs from "fs";

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function analyzeRealMismatches() {
  console.log("🔍 ANALYZING REAL MISMATCHES (not just naming conventions)\n");
  
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
  
  // Get all database tables
  const dbTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  const dbTableNames = dbTables.rows.map(row => row.table_name);
  const schemaTableNames = schemaTablesWithNames.map(t => t!.tableName);
  
  const report: string[] = [];
  const sqlFixes: string[] = [];
  
  report.push("# Real Database vs Schema Mismatches");
  report.push("(Excluding naming convention differences)\n");
  
  // Analyze each table
  for (const tableName of schemaTableNames.sort()) {
    if (!dbTableNames.includes(tableName)) {
      report.push(`\n## ❌ TABLE MISSING FROM DATABASE: ${tableName}`);
      continue;
    }
    
    // Get database columns
    const dbColumns = await db.execute(sql`
      SELECT 
        column_name, 
        data_type,
        column_default,
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
    
    // Convert schema columns to snake_case for comparison
    const schemaColumnsSnakeCase = schemaColumns.map(col => camelToSnake(col));
    
    // Find REAL differences (not naming)
    const realExtraDbColumns = dbColumnNames.filter(dbCol => {
      // Check if this DB column exists in schema (in any case form)
      const camelVersion = snakeToCamel(dbCol);
      return !schemaColumns.includes(camelVersion) && !schemaColumnsSnakeCase.includes(dbCol) && !schemaColumns.includes(dbCol);
    });
    
    const realMissingDbColumns = schemaColumns.filter(schemaCol => {
      // Check if schema column exists in DB (in any case form)
      const snakeVersion = camelToSnake(schemaCol);
      return !dbColumnNames.includes(snakeVersion) && !dbColumnNames.includes(schemaCol);
    });
    
    if (realExtraDbColumns.length > 0 || realMissingDbColumns.length > 0) {
      report.push(`\n## Table: ${tableName}`);
      
      if (realExtraDbColumns.length > 0) {
        report.push("\n### Columns to REMOVE from database:");
        realExtraDbColumns.forEach(col => {
          const colInfo = dbColumns.rows.find(row => row.column_name === col);
          report.push(`- ${col} (${colInfo?.data_type})`);
          sqlFixes.push(`-- Remove extra column from ${tableName}`);
          sqlFixes.push(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${col};`);
        });
      }
      
      if (realMissingDbColumns.length > 0) {
        report.push("\n### Columns to ADD to database:");
        realMissingDbColumns.forEach(col => {
          const snakeCol = camelToSnake(col);
          report.push(`- ${col} → ${snakeCol}`);
          
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
          
          sqlFixes.push(`-- Add missing column to ${tableName}`);
          sqlFixes.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${snakeCol} ${sqlType};`);
        });
      }
    }
  }
  
  // Tables in DB but not in schema
  const extraDbTables = dbTableNames.filter(t => !schemaTableNames.includes(t));
  if (extraDbTables.length > 0) {
    report.push("\n## Tables to REMOVE from database:");
    extraDbTables.forEach(table => {
      report.push(`- ${table}`);
      // Don't drop session table - it's needed
      if (table !== 'session') {
        sqlFixes.push(`-- Remove extra table`);
        sqlFixes.push(`DROP TABLE IF EXISTS ${table} CASCADE;`);
      }
    });
  }
  
  // Write reports
  fs.writeFileSync('real-mismatches-analysis.md', report.join('\n'));
  
  if (sqlFixes.length > 0) {
    sqlFixes.unshift('-- Comprehensive Database Schema Alignment');
    sqlFixes.unshift('-- Generated: ' + new Date().toISOString());
    sqlFixes.unshift('');
    fs.writeFileSync('fix-all-schema-mismatches.sql', sqlFixes.join('\n'));
    console.log(`✅ Generated fix-all-schema-mismatches.sql with ${sqlFixes.length - 3} fixes`);
  } else {
    console.log("✅ No real mismatches found (only naming conventions differ)");
  }
  
  console.log("📄 Full report: real-mismatches-analysis.md");
}

// Run analysis
if (process.argv[1] === new URL(import.meta.url).pathname) {
  analyzeRealMismatches()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}