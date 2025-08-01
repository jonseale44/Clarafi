/**
 * Compare Database Schemas
 * 
 * This script compares the schemas between development and production databases
 * to identify any differences in table structures, particularly columns.
 * 
 * Usage: 
 * DEV_DATABASE_URL="your-dev-db-url" PROD_DATABASE_URL="your-prod-db-url" npx tsx compare-db-schemas.ts
 */

import { Client } from 'pg';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getSchemaInfo(connectionString: string, label: string): Promise<Map<string, ColumnInfo[]>> {
  const client = new Client({ 
    connectionString,
    ssl: connectionString.includes('rds.amazonaws.com') ? {
      rejectUnauthorized: false
    } : undefined
  });
  
  try {
    await client.connect();
    console.log(`✓ Connected to ${label} database`);
    
    // Query all columns from all tables (excluding system tables)
    const result = await client.query<ColumnInfo>(`
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
    
    // Group columns by table
    const schema = new Map<string, ColumnInfo[]>();
    for (const row of result.rows) {
      if (!schema.has(row.table_name)) {
        schema.set(row.table_name, []);
      }
      schema.get(row.table_name)!.push(row);
    }
    
    return schema;
  } finally {
    await client.end();
  }
}

async function compareSchemas() {
  const devDbUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  const prodDbUrl = process.env.PROD_DATABASE_URL;
  
  if (!devDbUrl || !prodDbUrl) {
    console.error('❌ Error: Please provide both DEV_DATABASE_URL and PROD_DATABASE_URL environment variables');
    console.error('Example: DEV_DATABASE_URL="..." PROD_DATABASE_URL="..." npx tsx compare-db-schemas.ts');
    process.exit(1);
  }
  
  console.log('🔍 Comparing database schemas...\n');
  
  try {
    // Get schemas from both databases
    const [devSchema, prodSchema] = await Promise.all([
      getSchemaInfo(devDbUrl, 'Development'),
      getSchemaInfo(prodDbUrl, 'Production')
    ]);
    
    console.log(`\n📊 Development: ${devSchema.size} tables`);
    console.log(`📊 Production: ${prodSchema.size} tables\n`);
    
    let differencesFound = false;
    
    // Check for tables that exist in dev but not in prod
    console.log('=== TABLES ONLY IN DEVELOPMENT ===');
    for (const [tableName] of devSchema) {
      if (!prodSchema.has(tableName)) {
        console.log(`❌ Table missing in production: ${tableName}`);
        differencesFound = true;
      }
    }
    if (!differencesFound) {
      console.log('✓ No tables missing in production');
    }
    
    // Check for columns that exist in dev but not in prod
    console.log('\n=== COLUMNS ONLY IN DEVELOPMENT ===');
    differencesFound = false;
    for (const [tableName, devColumns] of devSchema) {
      const prodColumns = prodSchema.get(tableName);
      if (!prodColumns) continue; // Table doesn't exist in prod, already reported
      
      const prodColumnNames = new Set(prodColumns.map(c => c.column_name));
      
      for (const devColumn of devColumns) {
        if (!prodColumnNames.has(devColumn.column_name)) {
          console.log(`❌ Column missing in production: ${tableName}.${devColumn.column_name} (${devColumn.data_type})`);
          differencesFound = true;
        }
      }
    }
    if (!differencesFound) {
      console.log('✓ No columns missing in production');
    }
    
    // Check for columns that exist in prod but not in dev (reverse check)
    console.log('\n=== COLUMNS ONLY IN PRODUCTION ===');
    differencesFound = false;
    for (const [tableName, prodColumns] of prodSchema) {
      const devColumns = devSchema.get(tableName);
      if (!devColumns) {
        console.log(`❌ Table only in production: ${tableName}`);
        differencesFound = true;
        continue;
      }
      
      const devColumnNames = new Set(devColumns.map(c => c.column_name));
      
      for (const prodColumn of prodColumns) {
        if (!devColumnNames.has(prodColumn.column_name)) {
          console.log(`⚠️  Column only in production: ${tableName}.${prodColumn.column_name} (${prodColumn.data_type})`);
          differencesFound = true;
        }
      }
    }
    if (!differencesFound) {
      console.log('✓ No extra columns in production');
    }
    
    // Check for column type differences
    console.log('\n=== COLUMN TYPE DIFFERENCES ===');
    differencesFound = false;
    for (const [tableName, devColumns] of devSchema) {
      const prodColumns = prodSchema.get(tableName);
      if (!prodColumns) continue;
      
      const prodColumnMap = new Map(prodColumns.map(c => [c.column_name, c]));
      
      for (const devColumn of devColumns) {
        const prodColumn = prodColumnMap.get(devColumn.column_name);
        if (!prodColumn) continue;
        
        if (devColumn.data_type !== prodColumn.data_type || 
            devColumn.is_nullable !== prodColumn.is_nullable) {
          console.log(`⚠️  Column difference in ${tableName}.${devColumn.column_name}:`);
          console.log(`   Dev:  ${devColumn.data_type} ${devColumn.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
          console.log(`   Prod: ${prodColumn.data_type} ${prodColumn.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
          differencesFound = true;
        }
      }
    }
    if (!differencesFound) {
      console.log('✓ No column type differences found');
    }
    
    console.log('\n✅ Schema comparison complete!');
    
  } catch (error) {
    console.error('❌ Error comparing schemas:', error);
    process.exit(1);
  }
}

// Run the comparison
compareSchemas();