import { db } from "./server/db.js";
import * as schema from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function compareSchemaWithDatabase() {
  console.log("🔍 Comparing schema.ts with actual database structure...\n");

  // Get all tables and columns from the database
  const dbTables = await db.execute(sql`
    SELECT 
      t.table_name,
      array_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name
  `);

  // Convert database results to a map
  const dbStructure = new Map();
  for (const table of dbTables.rows) {
    const columnMap = new Map();
    for (const col of table.columns) {
      columnMap.set(col.column_name, col);
    }
    dbStructure.set(table.table_name, columnMap);
  }

  // Get all tables from schema.ts
  const schemaTables = Object.entries(schema).filter(([key, value]) => {
    return value && typeof value === 'object' && value.constructor.name === 'PgTable';
  });

  console.log(`Found ${schemaTables.length} tables in schema.ts`);
  console.log(`Found ${dbStructure.size} tables in database\n`);

  const mismatches = {
    missingTables: [],
    extraTables: [],
    missingColumns: [],
    extraColumns: []
  };

  // Check for missing tables in database
  for (const [tableName, tableSchema] of schemaTables) {
    const tableNameSnakeCase = tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    
    if (!dbStructure.has(tableNameSnakeCase)) {
      mismatches.missingTables.push(tableNameSnakeCase);
      console.log(`❌ Table missing in database: ${tableNameSnakeCase}`);
    } else {
      // Check columns for this table
      const dbColumns = dbStructure.get(tableNameSnakeCase);
      const schemaColumns = Object.entries(tableSchema).filter(([key, value]) => {
        return value && typeof value === 'object' && value.constructor.name.includes('Column');
      });

      // Check for missing columns
      for (const [colName, colSchema] of schemaColumns) {
        if (!dbColumns.has(colName)) {
          mismatches.missingColumns.push({ table: tableNameSnakeCase, column: colName });
          console.log(`❌ Column missing in database: ${tableNameSnakeCase}.${colName}`);
        }
      }

      // Check for extra columns in database
      for (const [colName] of dbColumns) {
        const hasInSchema = schemaColumns.some(([schemaColName]) => schemaColName === colName);
        if (!hasInSchema && colName !== 'id' && colName !== 'created_at' && colName !== 'updated_at') {
          mismatches.extraColumns.push({ table: tableNameSnakeCase, column: colName });
          console.log(`⚠️  Extra column in database: ${tableNameSnakeCase}.${colName}`);
        }
      }
    }
  }

  // Check for extra tables in database
  const schemaTableNames = schemaTables.map(([name]) => 
    name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  );
  
  for (const [dbTableName] of dbStructure) {
    if (!schemaTableNames.includes(dbTableName) && 
        !['spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews'].includes(dbTableName)) {
      mismatches.extraTables.push(dbTableName);
      console.log(`⚠️  Extra table in database: ${dbTableName}`);
    }
  }

  // Generate SQL to fix all mismatches
  console.log("\n📝 Generating SQL to fix all mismatches...\n");
  
  let sqlScript = "-- Comprehensive schema alignment script\n";
  sqlScript += "-- Generated on " + new Date().toISOString() + "\n\n";

  // Add missing columns
  if (mismatches.missingColumns.length > 0) {
    sqlScript += "-- Add missing columns\n";
    sqlScript += "DO $$ \nBEGIN\n";
    
    for (const { table, column } of mismatches.missingColumns) {
      // Try to determine column type from schema
      const tableSchema = schemaTables.find(([name]) => 
        name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') === table
      );
      
      if (tableSchema) {
        const [, tableObj] = tableSchema;
        const columnDef = tableObj[column];
        
        // Determine SQL type based on Drizzle column type
        let sqlType = "TEXT"; // default
        if (columnDef) {
          const columnType = columnDef.constructor.name;
          if (columnType.includes('Integer')) sqlType = "INTEGER";
          else if (columnType.includes('Boolean')) sqlType = "BOOLEAN";
          else if (columnType.includes('Timestamp')) sqlType = "TIMESTAMP";
          else if (columnType.includes('Decimal')) sqlType = "DECIMAL";
          else if (columnType.includes('Json')) sqlType = "JSONB";
        }
        
        // Check for default values
        let defaultClause = "";
        if (column === 'created_at' || column === 'updated_at') {
          defaultClause = " DEFAULT NOW()";
        } else if (sqlType === 'BOOLEAN') {
          defaultClause = " DEFAULT FALSE";
        } else if (sqlType === 'JSONB') {
          defaultClause = " DEFAULT '{}'::jsonb";
        }
        
        sqlScript += `    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='${table}' 
                   AND column_name='${column}') THEN
        ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}${defaultClause};
    END IF;\n\n`;
      }
    }
    
    sqlScript += "END $$;\n\n";
  }

  // Save the comprehensive fix script
  await db.execute(sql`SELECT 1`); // Just to keep connection alive
  
  return { mismatches, sqlScript };
}

// Run the comparison
compareSchemaWithDatabase()
  .then(({ mismatches, sqlScript }) => {
    console.log("\n📊 Summary:");
    console.log(`Missing tables: ${mismatches.missingTables.length}`);
    console.log(`Extra tables: ${mismatches.extraTables.length}`);
    console.log(`Missing columns: ${mismatches.missingColumns.length}`);
    console.log(`Extra columns: ${mismatches.extraColumns.length}`);
    
    // Write SQL script to file
    const fs = await import('fs');
    fs.writeFileSync('comprehensive-schema-fix.sql', sqlScript);
    console.log("\n✅ SQL script saved to comprehensive-schema-fix.sql");
    
    process.exit(0);
  })
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });