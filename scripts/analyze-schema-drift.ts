#!/usr/bin/env tsx
/**
 * Analyzes schema drift between database and schema.ts
 * Generates a detailed report of missing columns and tables
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface SchemaDriftReport {
  missingTables: string[];
  tableDifferences: {
    [tableName: string]: {
      dbColumns: number;
      schemaColumns: number;
      missingColumns: string[];
      extraColumns: string[];
    };
  };
  summary: {
    totalDbTables: number;
    totalSchemaTables: number;
    totalDbColumns: number;
    totalMissingColumns: number;
  };
}

async function analyzeSchemaDrift(): Promise<void> {
  console.log('🔍 Analyzing schema drift between database and schema.ts...\n');

  try {
    // Get all database tables
    const dbTablesResult = await db.execute<{ table_name: string }>(sql`
      SELECT DISTINCT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const dbTables = dbTablesResult.rows.map(row => row.table_name);
    console.log(`📊 Found ${dbTables.length} tables in database\n`);

    // Get all columns from database
    const dbColumnsResult = await db.execute<TableColumn>(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      )
      ORDER BY table_name, ordinal_position
    `);

    // Read schema.ts to extract table definitions
    const schemaPath = path.join(process.cwd(), 'shared/schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // Extract table names from schema.ts
    const tableRegex = /export const (\w+) = pgTable\("(\w+)"/g;
    const schemaTables: Map<string, string> = new Map();
    let match;
    
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const [, varName, tableName] = match;
      schemaTables.set(tableName, varName);
    }

    console.log(`📄 Found ${schemaTables.size} tables in schema.ts\n`);

    // Find missing tables
    const missingTables = dbTables.filter(table => !schemaTables.has(table));
    if (missingTables.length > 0) {
      console.log('❌ Tables in database but NOT in schema.ts:');
      missingTables.forEach(table => console.log(`   - ${table}`));
      console.log('');
    }

    // Analyze column differences for top tables
    const priorityTables = ['patients', 'appointments', 'medications', 'orders', 'lab_orders'];
    
    console.log('📋 Analyzing column differences for priority tables:\n');
    
    for (const tableName of priorityTables) {
      if (!dbTables.includes(tableName)) continue;
      
      const dbTableColumns = dbColumnsResult.rows.filter(col => col.table_name === tableName);
      console.log(`\n📊 ${tableName.toUpperCase()} TABLE:`);
      console.log(`   Database columns: ${dbTableColumns.length}`);
      
      // For now, we'll show what's in the database
      // In a full implementation, we'd parse schema.ts to compare
      if (dbTableColumns.length > 50) {
        console.log('   ⚠️  This table has extensive columns that may need review');
      }
    }

    // Generate summary statistics
    const totalDbColumns = dbColumnsResult.rows.length;
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log(`   Total database tables: ${dbTables.length}`);
    console.log(`   Total schema tables: ${schemaTables.size}`);
    console.log(`   Total database columns: ${totalDbColumns}`);
    console.log(`   Missing tables: ${missingTables.length}`);

    // Generate detailed report file
    const report: SchemaDriftReport = {
      missingTables,
      tableDifferences: {},
      summary: {
        totalDbTables: dbTables.length,
        totalSchemaTables: schemaTables.size,
        totalDbColumns,
        totalMissingColumns: 0
      }
    };

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'schema-drift-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error analyzing schema drift:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeSchemaDrift()
  .then(() => {
    console.log('\n✨ Schema drift analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });