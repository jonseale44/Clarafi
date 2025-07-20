#!/usr/bin/env tsx
/**
 * Generates Drizzle schema definitions from the actual database structure
 * This will create a new schema file that matches the database exactly
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  udt_name: string;
}

interface ForeignKey {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

// Map PostgreSQL types to Drizzle types
function mapPostgresToDrizzle(
  dataType: string, 
  udtName: string,
  isNullable: boolean,
  columnDefault: string | null,
  maxLength: number | null,
  precision: number | null,
  scale: number | null
): string {
  const nullable = isNullable ? '' : '.notNull()';
  const defaultVal = columnDefault && !columnDefault.includes('nextval') ? 
    `.default(${formatDefaultValue(columnDefault, dataType)})` : '';

  switch (udtName) {
    case 'int4':
      return columnDefault?.includes('nextval') ? 
        `serial("${snakeCase(columnName)}")${nullable}` : 
        `integer("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case 'int8':
      return `bigint("${snakeCase(columnName)}", { mode: "number" })${nullable}${defaultVal}`;
    case 'text':
      return `text("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case 'varchar':
      return maxLength ? 
        `varchar("${snakeCase(columnName)}", { length: ${maxLength} })${nullable}${defaultVal}` :
        `varchar("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case 'bool':
      return `boolean("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case 'timestamp':
    case 'timestamptz':
      return `timestamp("${snakeCase(columnName)}", { mode: 'date', withTimezone: true })${nullable}${defaultVal}`;
    case 'date':
      return `date("${snakeCase(columnName)}", { mode: 'date' })${nullable}${defaultVal}`;
    case 'numeric':
      return precision && scale ? 
        `decimal("${snakeCase(columnName)}", { precision: ${precision}, scale: ${scale} })${nullable}${defaultVal}` :
        `decimal("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case 'jsonb':
      return `jsonb("${snakeCase(columnName)}")${nullable}${defaultVal}`;
    case '_text':
      return `text("${snakeCase(columnName)}")${nullable}.array()${defaultVal}`;
    case '_int4':
      return `integer("${snakeCase(columnName)}")${nullable}.array()${defaultVal}`;
    default:
      console.warn(`Unknown type ${udtName} for column, using text`);
      return `text("${snakeCase(columnName)}")${nullable}${defaultVal}`;
  }
}

function formatDefaultValue(defaultVal: string, dataType: string): string {
  if (defaultVal.startsWith("'") && defaultVal.endsWith("'::")) {
    return defaultVal.split("'::")[0] + "'";
  }
  if (defaultVal === 'true' || defaultVal === 'false') {
    return defaultVal;
  }
  if (dataType === 'integer' || dataType === 'numeric') {
    return defaultVal.split('::')[0];
  }
  return `"${defaultVal}"`;
}

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

async function generateSchema() {
  console.log('🔍 Generating schema from database...\n');

  try {
    // Get all tables
    const tablesResult = await db.execute<{ table_name: string }>(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get all columns
    const columnsResult = await db.execute<ColumnInfo>(sql`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.udt_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      AND c.table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      )
      ORDER BY c.table_name, c.ordinal_position
    `);

    // Get foreign keys
    const foreignKeysResult = await db.execute<ForeignKey>(sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `);

    // Group columns by table
    const tableColumns = new Map<string, ColumnInfo[]>();
    for (const col of columnsResult.rows) {
      if (!tableColumns.has(col.table_name)) {
        tableColumns.set(col.table_name, []);
      }
      tableColumns.get(col.table_name)!.push(col);
    }

    // Group foreign keys by table
    const tableForeignKeys = new Map<string, ForeignKey[]>();
    for (const fk of foreignKeysResult.rows) {
      if (!tableForeignKeys.has(fk.table_name)) {
        tableForeignKeys.set(fk.table_name, []);
      }
      tableForeignKeys.get(fk.table_name)!.push(fk);
    }

    // Generate schema file
    let schemaContent = `// Auto-generated schema from database
// Generated on: ${new Date().toISOString()}
// Tables: ${tablesResult.rows.length}
// Total columns: ${columnsResult.rows.length}

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  varchar,
  jsonb,
  bigint,
  primaryKey,
  foreignKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

`;

    // Generate table definitions
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      const columns = tableColumns.get(tableName) || [];
      const foreignKeys = tableForeignKeys.get(tableName) || [];
      
      console.log(`📊 Generating ${tableName} with ${columns.length} columns...`);

      // Generate table export
      const varName = camelCase(tableName);
      schemaContent += `export const ${varName} = pgTable("${tableName}", {\n`;

      // Generate columns
      for (const col of columns) {
        columnName = col.column_name;
        const fieldName = camelCase(col.column_name);
        const drizzleType = mapPostgresToDrizzle(
          col.data_type,
          col.udt_name,
          col.is_nullable === 'YES',
          col.column_default,
          col.character_maximum_length,
          col.numeric_precision,
          col.numeric_scale
        );
        
        schemaContent += `  ${fieldName}: ${drizzleType},\n`;
      }

      schemaContent += `});\n\n`;

      // Generate insert schema
      schemaContent += `export const insert${varName.charAt(0).toUpperCase() + varName.slice(1)}Schema = createInsertSchema(${varName});\n`;
      schemaContent += `export type Insert${varName.charAt(0).toUpperCase() + varName.slice(1)} = z.infer<typeof insert${varName.charAt(0).toUpperCase() + varName.slice(1)}Schema>;\n`;
      schemaContent += `export type Select${varName.charAt(0).toUpperCase() + varName.slice(1)} = typeof ${varName}.$inferSelect;\n\n`;
    }

    // Save the generated schema
    const outputPath = path.join(process.cwd(), 'generated-schema.ts');
    fs.writeFileSync(outputPath, schemaContent);
    
    console.log(`\n✅ Schema generated successfully!`);
    console.log(`📁 Output saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Tables: ${tablesResult.rows.length}`);
    console.log(`   - Columns: ${columnsResult.rows.length}`);
    console.log(`   - Foreign Keys: ${foreignKeysResult.rows.length}`);

  } catch (error) {
    console.error('❌ Error generating schema:', error);
    process.exit(1);
  }
}

// Fix for undefined columnName
let columnName: string;

// Run the generator
generateSchema()
  .then(() => {
    console.log('\n✨ Schema generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });