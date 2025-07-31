import pg from 'pg';

const { Client } = pg;

async function checkProductionSchema() {
  console.log('Checking production database schema...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Check if subscription_status column exists in health_systems table
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'health_systems'
      AND column_name = 'subscription_status'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ Missing column: subscription_status in health_systems table');
      console.log('\nTo fix, run this SQL in your production database:');
      console.log(`
ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

-- Update existing records
UPDATE health_systems 
SET subscription_status = 'active' 
WHERE subscription_status IS NULL;
      `);
    } else {
      console.log('✅ Column subscription_status exists in health_systems table');
      console.log('Details:', columnCheck.rows[0]);
    }
    
    // Check all health_systems columns
    const allColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'health_systems'
      ORDER BY ordinal_position
    `);
    
    console.log('\nAll columns in health_systems table:');
    allColumns.rows.forEach((col: any) => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await client.end();
  }
  
  process.exit(0);
}

checkProductionSchema();