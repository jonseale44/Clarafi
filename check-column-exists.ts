/**
 * Check if a specific column exists in production database
 * 
 * Usage: 
 * PROD_DATABASE_URL="your-prod-db-url" npx tsx check-column-exists.ts <table_name> <column_name>
 * 
 * Example:
 * PROD_DATABASE_URL="..." npx tsx check-column-exists.ts health_systems subscription_status
 */

import { Client } from 'pg';

async function checkColumnExists(connectionString: string, tableName: string, columnName: string) {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    `, [tableName, columnName]);
    
    if (result.rows.length > 0) {
      const column = result.rows[0];
      console.log(`✅ Column EXISTS in production: ${tableName}.${columnName}`);
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log(`   Default: ${column.column_default || 'none'}`);
    } else {
      console.log(`❌ Column MISSING in production: ${tableName}.${columnName}`);
      
      // Check if the table exists
      const tableCheck = await client.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (tableCheck.rows.length === 0) {
        console.log(`   ⚠️  Table '${tableName}' doesn't exist in production!`);
      } else {
        // Show existing columns in the table
        const existingColumns = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`\n   Existing columns in ${tableName}:`);
        existingColumns.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: npx tsx check-column-exists.ts <table_name> <column_name>');
  console.error('Example: npx tsx check-column-exists.ts health_systems subscription_status');
  process.exit(1);
}

const [tableName, columnName] = args;
const prodDbUrl = process.env.PROD_DATABASE_URL;

if (!prodDbUrl) {
  console.error('❌ Error: Please provide PROD_DATABASE_URL environment variable');
  console.error('Example: PROD_DATABASE_URL="..." npx tsx check-column-exists.ts health_systems subscription_status');
  process.exit(1);
}

console.log(`🔍 Checking if column '${columnName}' exists in table '${tableName}'...\n`);
checkColumnExists(prodDbUrl, tableName, columnName);