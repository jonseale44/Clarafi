import { db } from "./db.js";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function analyzeSchemaMatchesComprehensive() {
  console.log("🔍 COMPREHENSIVE SCHEMA ANALYSIS");
  console.log("================================\n");

  try {
    // Get all tables from the database
    const dbTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const dbTables = dbTablesResult.rows.map(row => row.table_name as string);
    
    // Get all columns from the database
    const dbColumnsResult = await db.execute<TableColumn>(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    const dbColumns = dbColumnsResult.rows;
    
    // Get all tables from schema.ts
    const schemaTables = Object.keys(schema).filter(key => {
      const value = schema[key];
      return value && typeof value === 'object' && value._ && value._.name;
    });
    
    console.log("📊 SUMMARY");
    console.log("----------");
    console.log(`Tables in Database: ${dbTables.length}`);
    console.log(`Tables in Schema: ${schemaTables.length}\n`);
    
    // Find tables in database but not in schema
    console.log("🚨 TABLES IN DATABASE BUT NOT IN SCHEMA:");
    console.log("----------------------------------------");
    const tablesOnlyInDb = dbTables.filter(dbTable => 
      !schemaTables.some(schemaTable => schema[schemaTable]._.name === dbTable)
    );
    
    if (tablesOnlyInDb.length === 0) {
      console.log("✅ None found\n");
    } else {
      tablesOnlyInDb.forEach(table => {
        console.log(`❌ ${table}`);
        const cols = dbColumns.filter(col => col.table_name === table);
        cols.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      });
      console.log("");
    }
    
    // Find tables in schema but not in database
    console.log("🚨 TABLES IN SCHEMA BUT NOT IN DATABASE:");
    console.log("----------------------------------------");
    const tablesOnlyInSchema = schemaTables.filter(schemaTable => 
      !dbTables.includes(schema[schemaTable]._.name)
    );
    
    if (tablesOnlyInSchema.length === 0) {
      console.log("✅ None found\n");
    } else {
      tablesOnlyInSchema.forEach(table => {
        console.log(`❌ ${table} (maps to table: ${schema[table]._.name})`);
      });
      console.log("");
    }
    
    // Now check column mismatches for tables that exist in both
    console.log("🔍 COLUMN MISMATCHES FOR EXISTING TABLES:");
    console.log("------------------------------------------");
    
    let mismatchCount = 0;
    
    for (const schemaTableKey of schemaTables) {
      const schemaTable = schema[schemaTableKey];
      const tableName = schemaTable._.name;
      
      if (!dbTables.includes(tableName)) continue;
      
      // Get columns for this table from database
      const dbTableColumns = dbColumns
        .filter(col => col.table_name === tableName)
        .map(col => col.column_name);
      
      // Get columns from schema
      const schemaColumns = Object.keys(schemaTable).filter(key => key !== '_');
      const schemaColumnNames = schemaColumns.map(col => {
        const column = schemaTable[col];
        if (column && column.name) return column.name;
        if (column && column.config && column.config.name) return column.config.name;
        // For serial/integer columns
        if (column && column._ && column._.name) return column._.name;
        return col;
      });
      
      // Find columns in DB but not in schema
      const columnsOnlyInDb = dbTableColumns.filter(dbCol => 
        !schemaColumnNames.includes(dbCol)
      );
      
      // Find columns in schema but not in DB
      const columnsOnlyInSchema = schemaColumnNames.filter(schemaCol => 
        !dbTableColumns.includes(schemaCol)
      );
      
      if (columnsOnlyInDb.length > 0 || columnsOnlyInSchema.length > 0) {
        mismatchCount++;
        console.log(`\n📋 Table: ${tableName}`);
        
        if (columnsOnlyInDb.length > 0) {
          console.log("  ❌ Columns in DB but NOT in schema:");
          columnsOnlyInDb.forEach(col => {
            const colInfo = dbColumns.find(c => c.table_name === tableName && c.column_name === col);
            console.log(`     - ${col} (${colInfo?.data_type || 'unknown'})`);
          });
        }
        
        if (columnsOnlyInSchema.length > 0) {
          console.log("  ❌ Columns in schema but NOT in DB:");
          columnsOnlyInSchema.forEach(col => {
            console.log(`     - ${col}`);
          });
        }
      }
    }
    
    if (mismatchCount === 0) {
      console.log("✅ No column mismatches found for existing tables\n");
    }
    
    // Special check for the specific issues we've seen
    console.log("\n⚠️  SPECIFIC KNOWN ISSUES:");
    console.log("---------------------------");
    
    // Check health_systems table structure
    const healthSystemsColumns = dbColumns.filter(col => col.table_name === 'health_systems');
    const hasSystemType = healthSystemsColumns.some(col => col.column_name === 'system_type');
    const hasType = healthSystemsColumns.some(col => col.column_name === 'type');
    
    console.log(`health_systems table:`);
    console.log(`  - Has 'system_type' column: ${hasSystemType ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Has 'type' column: ${hasType ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Schema expects: 'systemType' (maps to column 'system_type')`);
    
    // Check locations table structure
    const locationsColumns = dbColumns.filter(col => col.table_name === 'locations');
    const hasOrganizationId = locationsColumns.some(col => col.column_name === 'organization_id');
    const hasHealthSystemId = locationsColumns.some(col => col.column_name === 'health_system_id');
    
    console.log(`\nlocations table:`);
    console.log(`  - Has 'organization_id' column: ${hasOrganizationId ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Has 'health_system_id' column: ${hasHealthSystemId ? '✅ YES' : '❌ NO'}`);
    
    console.log("\n🎯 RECOMMENDATION:");
    console.log("------------------");
    console.log("Run 'npm run db:push' to sync the schema with the database.");
    console.log("This will update the database structure to match schema.ts");
    
  } catch (error) {
    console.error("❌ Error analyzing schema:", error);
  }
  
  process.exit(0);
}

analyzeSchemaMatchesComprehensive();