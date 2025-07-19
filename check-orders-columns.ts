import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkOrdersColumns() {
  console.log('Checking database columns for orders table...');
  
  const result = await db.execute(sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    ORDER BY ordinal_position;
  `);
  
  console.log('\nDatabase columns:');
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name} (${row.data_type})${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  });
  
  console.log('\nTotal columns in database:', result.rows.length);
  
  // Now check what's in the schema
  console.log('\n\nColumns defined in schema:');
  const schemaColumns = [
    'id', 'patientId', 'encounterId', 'providerId', 'orderType', 'orderStatus',
    'referenceId', 'providerNotes', 'priority', 'clinicalIndication',
    'medicationName', 'dosage', 'quantity', 'quantityUnit', 'sig', 'refills',
    'form', 'routeOfAdministration', 'daysSupply', 'diagnosisCode',
    'requiresPriorAuth', 'priorAuthNumber', 'labName', 'testName', 'testCode',
    'specimenType', 'fastingRequired', 'studyType', 'region', 'laterality',
    'contrastNeeded', 'specialtyType', 'providerName', 'urgency', 'orderedBy',
    'orderedAt', 'approvedBy', 'approvedAt', 'prescriber', 'prescriberId',
    'orderDate', 'status', 'medicationDosage', 'medicationRoute',
    'startDate', 'endDate', 'frequency', 'medicationFrequency',
    'medicationDirections', 'createdAt', 'updatedAt'
  ];
  
  console.log('Schema columns count:', schemaColumns.length);
  
  // Find missing columns
  const dbColumns = result.rows.map(r => r.column_name);
  const missingInSchema = dbColumns.filter(col => !schemaColumns.includes(col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())));
  
  console.log('\n\nColumns in database but missing from schema:');
  missingInSchema.forEach(col => console.log(`  - ${col}`));
}

checkOrdersColumns().catch(console.error).finally(() => process.exit());