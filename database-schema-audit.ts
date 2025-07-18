/**
 * Comprehensive Database Schema Audit Tool
 * Compares actual database structure with schema.ts definitions
 * to identify ALL mismatches and drift
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "./shared/schema.js";
import { sql } from "drizzle-orm";

interface TableColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
}

interface SchemaDifference {
  type: 'missing_in_db' | 'missing_in_schema' | 'type_mismatch' | 'name_mismatch';
  table: string;
  column?: string;
  dbInfo?: any;
  schemaInfo?: any;
  details?: string;
}

async function auditSchema() {
  console.log("🔍 Starting comprehensive schema audit...\n");
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in environment");
  }

  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient, { schema });

  const differences: SchemaDifference[] = [];

  try {
    // Get all tables and columns from the database
    const dbTablesQuery = await sqlClient(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const dbTables = dbTablesQuery as any[];
    
    // Group columns by table
    const dbStructure: Record<string, Record<string, any>> = {};
    for (const col of dbTables) {
      const tableName = col.table_name;
      const columnName = col.column_name;
      
      if (!dbStructure[tableName]) {
        dbStructure[tableName] = {};
      }
      dbStructure[tableName][columnName] = {
        tableName,
        columnName,
        dataType: col.data_type,
        isNullable: col.is_nullable,
        columnDefault: col.column_default
      };
    }

    // Get all tables from schema.ts
    const schemaTables = Object.entries(schema).filter(([key, value]) => {
      return value && typeof value === 'object' && value.constructor.name.includes('Table');
    });

    console.log(`📊 Found ${Object.keys(dbStructure).length} tables in database`);
    console.log(`📋 Found ${schemaTables.length} tables in schema.ts\n`);

    // Check each schema table
    for (const [schemaKey, tableSchema] of schemaTables) {
      const tableName = (tableSchema as any)[Symbol.for("drizzle:Name")];
      if (!tableName) continue;

      console.log(`\n🔍 Checking table: ${tableName}`);

      // Check if table exists in database
      if (!dbStructure[tableName]) {
        differences.push({
          type: 'missing_in_db',
          table: tableName,
          details: `Table '${tableName}' defined in schema.ts but not found in database`
        });
        console.log(`  ❌ Table missing in database!`);
        continue;
      }

      // Get columns from schema
      const schemaColumns = (tableSchema as any)[Symbol.for("drizzle:Columns")];
      
      // Check each schema column
      for (const [colKey, colDef] of Object.entries(schemaColumns || {})) {
        const colConfig = colDef as any;
        const schemaColName = colConfig.name;
        
        // Check if column exists in database
        if (!dbStructure[tableName][schemaColName]) {
          differences.push({
            type: 'missing_in_db',
            table: tableName,
            column: schemaColName,
            details: `Column '${schemaColName}' defined in schema.ts but not found in database table '${tableName}'`
          });
          console.log(`  ❌ Column '${schemaColName}' missing in database`);
        }
      }

      // Check for extra columns in database
      for (const dbColName of Object.keys(dbStructure[tableName])) {
        let foundInSchema = false;
        
        for (const [colKey, colDef] of Object.entries(schemaColumns || {})) {
          const colConfig = colDef as any;
          if (colConfig.name === dbColName) {
            foundInSchema = true;
            break;
          }
        }

        if (!foundInSchema) {
          differences.push({
            type: 'missing_in_schema',
            table: tableName,
            column: dbColName,
            dbInfo: dbStructure[tableName][dbColName],
            details: `Column '${dbColName}' exists in database but not defined in schema.ts for table '${tableName}'`
          });
          console.log(`  ⚠️  Column '${dbColName}' exists in DB but not in schema.ts`);
        }
      }
    }

    // Check for extra tables in database
    for (const dbTableName of Object.keys(dbStructure)) {
      let foundInSchema = false;
      
      for (const [schemaKey, tableSchema] of schemaTables) {
        const tableName = (tableSchema as any)[Symbol.for("drizzle:Name")];
        if (tableName === dbTableName) {
          foundInSchema = true;
          break;
        }
      }

      if (!foundInSchema) {
        differences.push({
          type: 'missing_in_schema',
          table: dbTableName,
          details: `Table '${dbTableName}' exists in database but not defined in schema.ts`
        });
        console.log(`\n⚠️  Table '${dbTableName}' exists in DB but not in schema.ts`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 AUDIT SUMMARY");
    console.log("=".repeat(60));
    
    const missingInDb = differences.filter(d => d.type === 'missing_in_db');
    const missingInSchema = differences.filter(d => d.type === 'missing_in_schema');
    
    console.log(`\n🔴 Missing in Database: ${missingInDb.length} items`);
    missingInDb.forEach(d => {
      console.log(`   - ${d.table}${d.column ? '.' + d.column : ''}`);
    });
    
    console.log(`\n🟡 Missing in Schema.ts: ${missingInSchema.length} items`);
    missingInSchema.forEach(d => {
      console.log(`   - ${d.table}${d.column ? '.' + d.column : ''}`);
    });

    // Generate SQL fixes for missing columns
    if (missingInDb.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("🔧 SQL FIXES FOR MISSING COLUMNS");
      console.log("=".repeat(60));
      
      const columnFixes = missingInDb.filter(d => d.column);
      columnFixes.forEach(d => {
        console.log(`ALTER TABLE ${d.table} ADD COLUMN IF NOT EXISTS ${d.column} TEXT;`);
      });
    }

    // Generate schema.ts additions for extra DB columns
    if (missingInSchema.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("📝 SCHEMA.TS ADDITIONS NEEDED");
      console.log("=".repeat(60));
      
      const columnAdditions = missingInSchema.filter(d => d.column);
      const groupedByTable = columnAdditions.reduce((acc, d) => {
        if (!acc[d.table!]) acc[d.table!] = [];
        acc[d.table!].push(d);
        return acc;
      }, {} as Record<string, SchemaDifference[]>);

      for (const [table, cols] of Object.entries(groupedByTable)) {
        console.log(`\n// Add to ${table} table definition:`);
        cols.forEach(d => {
          const dbCol = d.dbInfo as TableColumn;
          const nullable = dbCol.isNullable === 'YES' ? '.notNull()' : '';
          console.log(`  ${d.column}: text("${d.column}")${nullable},`);
        });
      }
    }

  } catch (error) {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

auditSchema();