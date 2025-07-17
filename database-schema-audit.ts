import { db } from "./server/db.js";
import * as schema from "./shared/schema.js";
import { sql } from "drizzle-orm";
import fs from 'fs';

async function comprehensiveDatabaseAudit() {
  console.log("🔍 COMPREHENSIVE DATABASE-SCHEMA AUDIT\n");
  console.log("=" .repeat(80));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const auditLog: string[] = [];
  
  // 1. First, create a complete backup of the current database structure
  auditLog.push("# DATABASE-SCHEMA AUDIT REPORT");
  auditLog.push(`Generated at: ${new Date().toISOString()}\n`);
  
  // Get all tables and their complete structure from database
  const dbStructure = await db.execute(sql`
    SELECT 
      t.table_name,
      array_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default,
          'ordinal_position', c.ordinal_position
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
    GROUP BY t.table_name
    ORDER BY t.table_name
  `);
  
  // Create backup JSON of current database structure
  const dbBackup = {
    timestamp: new Date().toISOString(),
    tables: dbStructure.rows
  };
  
  fs.writeFileSync(`database-backup-${timestamp}.json`, JSON.stringify(dbBackup, null, 2));
  auditLog.push(`✅ Database structure backed up to: database-backup-${timestamp}.json\n`);
  
  // Get all tables from schema
  const schemaTables = new Map<string, any>();
  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === 'object' && value.constructor.name === 'PgTable') {
      const table = value as any;
      if (table[Symbol.for("drizzle:Name")]) {
        const tableName = table[Symbol.for("drizzle:Name")];
        schemaTables.set(tableName, { 
          schemaKey: key, 
          table: table,
          columns: new Map()
        });
        
        // Extract columns
        for (const [colKey, colValue] of Object.entries(table)) {
          if (colValue && typeof colValue === 'object' && colValue.constructor.name.includes('Column')) {
            schemaTables.get(tableName)!.columns.set(colKey, colValue);
          }
        }
      }
    }
  }
  
  // Create database tables map
  const dbTables = new Map<string, Map<string, any>>();
  for (const table of dbStructure.rows) {
    const columnMap = new Map();
    for (const col of (table.columns as any[])) {
      columnMap.set(col.column_name, col);
    }
    dbTables.set(table.table_name, columnMap);
  }
  
  auditLog.push("## SUMMARY");
  auditLog.push(`- Schema tables: ${schemaTables.size}`);
  auditLog.push(`- Database tables: ${dbTables.size}\n`);
  
  // Categorize discrepancies
  const orphanedColumns: Array<{table: string, column: string, details: any}> = [];
  const missingColumns: Array<{table: string, column: string}> = [];
  const tablesOnlyInDb: string[] = [];
  const tablesOnlyInSchema: string[] = [];
  
  // Check tables only in database
  for (const [dbTable, dbColumns] of dbTables) {
    if (!schemaTables.has(dbTable) && dbTable !== 'session') { // session is from express-session
      tablesOnlyInDb.push(dbTable);
    }
  }
  
  // Check tables only in schema
  for (const [schemaTable] of schemaTables) {
    if (!dbTables.has(schemaTable)) {
      tablesOnlyInSchema.push(schemaTable);
    }
  }
  
  // Check columns for tables that exist in both
  for (const [tableName, schemaInfo] of schemaTables) {
    if (dbTables.has(tableName)) {
      const dbColumns = dbTables.get(tableName)!;
      const schemaColumns = schemaInfo.columns;
      
      // Columns in DB but not in schema (potentially rolled back)
      for (const [dbColName, dbColInfo] of dbColumns) {
        let foundInSchema = false;
        
        // Check both exact match and snake_case variations
        for (const [schemaColName] of schemaColumns) {
          if (dbColName === schemaColName || dbColName === toSnakeCase(schemaColName)) {
            foundInSchema = true;
            break;
          }
        }
        
        if (!foundInSchema && !['id', 'created_at', 'updated_at'].includes(dbColName)) {
          orphanedColumns.push({
            table: tableName,
            column: dbColName,
            details: dbColInfo
          });
        }
      }
      
      // Columns in schema but not in DB
      for (const [schemaColName] of schemaColumns) {
        const snakeCaseName = toSnakeCase(schemaColName);
        if (!dbColumns.has(schemaColName) && !dbColumns.has(snakeCaseName)) {
          missingColumns.push({
            table: tableName,
            column: schemaColName
          });
        }
      }
    }
  }
  
  // Generate report
  auditLog.push("## CRITICAL FINDINGS\n");
  
  auditLog.push("### 1. Tables Only in Database (might have been rolled back from schema):");
  if (tablesOnlyInDb.length === 0) {
    auditLog.push("None\n");
  } else {
    for (const table of tablesOnlyInDb) {
      auditLog.push(`- ${table}`);
      // Show sample data to help determine if it's important
      try {
        const count = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)}`);
        auditLog.push(`  Records: ${count.rows[0].count}`);
      } catch (e) {
        auditLog.push(`  Could not count records`);
      }
    }
    auditLog.push("");
  }
  
  auditLog.push("### 2. Tables Only in Schema (need to be created in database):");
  if (tablesOnlyInSchema.length === 0) {
    auditLog.push("None\n");
  } else {
    for (const table of tablesOnlyInSchema) {
      auditLog.push(`- ${table}`);
    }
    auditLog.push("");
  }
  
  auditLog.push("### 3. Orphaned Columns (in DB but not schema - POTENTIALLY VALID!):");
  auditLog.push("These might be columns that were rolled back in schema but are still being used.\n");
  
  if (orphanedColumns.length === 0) {
    auditLog.push("None\n");
  } else {
    // Group by table
    const groupedOrphans = orphanedColumns.reduce((acc, col) => {
      if (!acc[col.table]) acc[col.table] = [];
      acc[col.table].push(col);
      return acc;
    }, {} as Record<string, typeof orphanedColumns>);
    
    for (const [table, cols] of Object.entries(groupedOrphans)) {
      auditLog.push(`#### Table: ${table}`);
      for (const col of cols) {
        auditLog.push(`- ${col.column} (${col.details.data_type})`);
        
        // Check if column has data
        try {
          const hasData = await db.execute(
            sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)} 
                WHERE ${sql.identifier(col.column)} IS NOT NULL`
          );
          if (hasData.rows[0].count > 0) {
            auditLog.push(`  ⚠️  HAS DATA: ${hasData.rows[0].count} non-null values`);
          }
        } catch (e) {
          // Ignore errors
        }
      }
      auditLog.push("");
    }
  }
  
  auditLog.push("### 4. Missing Columns (in schema but not DB - need to be added):");
  if (missingColumns.length === 0) {
    auditLog.push("None\n");
  } else {
    const groupedMissing = missingColumns.reduce((acc, col) => {
      if (!acc[col.table]) acc[col.table] = [];
      acc[col.table].push(col);
      return acc;
    }, {} as Record<string, typeof missingColumns>);
    
    for (const [table, cols] of Object.entries(groupedMissing)) {
      auditLog.push(`#### Table: ${table}`);
      for (const col of cols) {
        auditLog.push(`- ${col.column}`);
      }
      auditLog.push("");
    }
  }
  
  // Generate safe migration script
  auditLog.push("\n## RECOMMENDED SAFE MIGRATION APPROACH\n");
  auditLog.push("1. **DO NOT DELETE ANY COLUMNS WITH DATA**");
  auditLog.push("2. First, add all orphaned columns back to schema.ts");
  auditLog.push("3. Then run db:push to add missing columns");
  auditLog.push("4. Test the application thoroughly");
  auditLog.push("5. Only remove truly unused columns after verification\n");
  
  // Save audit log
  const auditFilename = `database-audit-${timestamp}.md`;
  fs.writeFileSync(auditFilename, auditLog.join('\n'));
  
  // Print to console
  console.log(auditLog.join('\n'));
  console.log(`\n📄 Full audit saved to: ${auditFilename}`);
  
  // Generate recovery schema file
  await generateRecoverySchema(orphanedColumns, `schema-recovery-${timestamp}.ts`);
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

async function generateRecoverySchema(orphanedColumns: any[], filename: string) {
  const recoveryCode: string[] = [];
  recoveryCode.push("// RECOVERY SCHEMA - Add these to your schema.ts file");
  recoveryCode.push("// Generated from orphaned database columns\n");
  
  const grouped = orphanedColumns.reduce((acc, col) => {
    if (!acc[col.table]) acc[col.table] = [];
    acc[col.table].push(col);
    return acc;
  }, {} as Record<string, any[]>);
  
  for (const [table, cols] of Object.entries(grouped)) {
    recoveryCode.push(`// Add to ${table} table:`);
    for (const col of cols) {
      const dataType = col.details.data_type;
      let drizzleType = 'text("' + col.column + '")';
      
      // Map PostgreSQL types to Drizzle types
      if (dataType.includes('integer')) {
        drizzleType = `integer("${col.column}")`;
      } else if (dataType.includes('boolean')) {
        drizzleType = `boolean("${col.column}")`;
      } else if (dataType.includes('timestamp')) {
        drizzleType = `timestamp("${col.column}")`;
      } else if (dataType.includes('date')) {
        drizzleType = `date("${col.column}")`;
      } else if (dataType.includes('numeric') || dataType.includes('decimal')) {
        drizzleType = `decimal("${col.column}")`;
      }
      
      if (col.details.column_default) {
        drizzleType += `.default(${col.details.column_default})`;
      }
      
      recoveryCode.push(`  ${col.column}: ${drizzleType},`);
    }
    recoveryCode.push("");
  }
  
  fs.writeFileSync(filename, recoveryCode.join('\n'));
  console.log(`\n📄 Recovery schema saved to: ${filename}`);
}

// Run the audit
comprehensiveDatabaseAudit().catch(console.error);