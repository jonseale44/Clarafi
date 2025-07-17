#!/usr/bin/env tsx

import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Search for column usage in codebase
function searchForColumnUsage(columnName: string, tableName: string): { found: boolean, locations: string[] } {
  const locations: string[] = [];
  
  // Search patterns to check
  const patterns = [
    columnName,  // Direct column name
    `"${columnName}"`,  // Quoted column name
    `'${columnName}'`,  // Single quoted
    `\`${columnName}\``,  // Template literal
    `${tableName}.${columnName}`,  // Table.column reference
    `.${columnName}`,  // Property access
    `["${columnName}"]`,  // Bracket notation
    `['${columnName}']`,  // Bracket notation single quote
  ];
  
  try {
    for (const pattern of patterns) {
      try {
        // Search in server and client directories
        const serverResults = execSync(
          `grep -r "${pattern}" ../server --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist | head -20`,
          { encoding: 'utf-8', stdio: 'pipe' }
        ).trim();
        
        if (serverResults) {
          locations.push(...serverResults.split('\n').map(line => line.split(':')[0]));
        }
        
        const clientResults = execSync(
          `grep -r "${pattern}" ../client --include="*.tsx" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist | head -20`,
          { encoding: 'utf-8', stdio: 'pipe' }
        ).trim();
        
        if (clientResults) {
          locations.push(...clientResults.split('\n').map(line => line.split(':')[0]));
        }
      } catch (e) {
        // grep returns exit code 1 if no matches, that's ok
      }
    }
  } catch (error) {
    console.error(`Error searching for ${columnName}:`, error);
  }
  
  const uniqueLocations = [...new Set(locations)];
  return { found: uniqueLocations.length > 0, locations: uniqueLocations };
}

async function checkColumnUsage() {
  console.log("🔍 CHECKING COLUMN USAGE IN CODEBASE\n");
  console.log("=" .repeat(80));
  console.log("This will check if 'extra' database columns are actually used in the code.\n");
  
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
  const columnsInUse: string[] = [];
  const safeToRemove: string[] = [];
  
  report.push("# Column Usage Analysis Report");
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
  
  // Analyze each table
  for (const tableName of schemaTableNames.sort()) {
    if (!dbTableNames.includes(tableName)) continue;
    
    // Get database columns
    const dbColumns = await db.execute(sql`
      SELECT 
        column_name, 
        data_type
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
      report.push(`\n## Table: ${tableName}`);
      report.push("### Extra columns in database (not in schema):");
      
      let foundInTable = false;
      
      for (const col of extraDbColumns) {
        const colInfo = dbColumns.rows.find(row => row.column_name === col);
        const usage = searchForColumnUsage(col, tableName);
        
        if (usage.found) {
          foundInTable = true;
          report.push(`\n#### ⚠️  ${col} (${colInfo?.data_type}) - FOUND IN CODE`);
          columnsInUse.push(`${tableName}.${col}`);
          
          // Show first few locations
          report.push("Found in:");
          usage.locations.slice(0, 5).forEach(loc => {
            report.push(`  - ${loc}`);
          });
          if (usage.locations.length > 5) {
            report.push(`  - ... and ${usage.locations.length - 5} more locations`);
          }
          
          report.push(`\n**RECOMMENDATION**: Add this column to schema.ts!`);
        } else {
          report.push(`\n#### ✅ ${col} (${colInfo?.data_type}) - NOT FOUND IN CODE`);
          safeToRemove.push(`${tableName}.${col}`);
        }
      }
      
      if (!foundInTable) {
        report.push("\n*None of these extra columns are used in the codebase.*");
      }
    }
  }
  
  // Summary
  report.push("\n## Summary");
  report.push(`- Columns USED in code: ${columnsInUse.length}`);
  report.push(`- Columns NOT used in code: ${safeToRemove.length}`);
  
  if (columnsInUse.length > 0) {
    report.push("\n## ⚠️  COLUMNS IN USE (DO NOT REMOVE):");
    columnsInUse.forEach(col => report.push(`- ${col}`));
    report.push("\n**ACTION REQUIRED**: These columns are actively used by the application!");
    report.push("Add them to schema.ts to fix the mismatch.");
  }
  
  if (safeToRemove.length > 0) {
    report.push("\n## ✅ COLUMNS NOT IN USE (probably safe to remove):");
    report.push("*But double-check before removing!*");
    safeToRemove.slice(0, 20).forEach(col => report.push(`- ${col}`));
    if (safeToRemove.length > 20) {
      report.push(`- ... and ${safeToRemove.length - 20} more`);
    }
  }
  
  // Write report
  fs.writeFileSync('column-usage-analysis.md', report.join('\n'));
  
  console.log(`⚠️  Found ${columnsInUse.length} columns that are USED IN CODE but not in schema`);
  console.log(`✅ Found ${safeToRemove.length} columns that appear unused`);
  console.log("📄 Full report: column-usage-analysis.md");
  
  if (columnsInUse.length > 0) {
    console.log("\n🔴 CRITICAL: Some database columns are actively used by the application!");
    console.log("These must be added to schema.ts, NOT removed from the database.");
  }
}

// Run analysis
if (process.argv[1] === new URL(import.meta.url).pathname) {
  checkColumnUsage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}