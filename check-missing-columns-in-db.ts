import { exec } from 'child_process';
import { promisify } from 'util';
import * as schema from './shared/schema.js';

const execAsync = promisify(exec);

async function checkMissingColumns() {
  // Get all tables from schema
  const tables = Object.entries(schema).filter(([key, value]) => {
    return key !== 'db' && value && typeof value === 'object' && value._ && value._.tableName;
  });

  console.log(`Found ${tables.length} tables in schema.ts`);
  
  const missingColumns: any[] = [];

  for (const [schemaName, table] of tables) {
    const tableName = (table as any)._.tableName;
    const schemaColumns = Object.entries((table as any)._.columns || {});
    
    console.log(`\nChecking table: ${tableName} (${schemaColumns.length} columns in schema)`);
    
    // Get columns from database
    const query = `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';`;
    
    try {
      const { stdout } = await execAsync(`echo "${query}" | psql $DATABASE_URL -t -A`);
      const dbColumns = stdout.trim().split('\n').filter(col => col && col !== 'column_name');
      
      // Check each schema column
      for (const [colKey, colDef] of schemaColumns) {
        const dbColumnName = (colDef as any).name;
        
        if (!dbColumns.includes(dbColumnName)) {
          missingColumns.push({
            table: tableName,
            schemaKey: colKey,
            dbColumn: dbColumnName,
            definition: colDef
          });
          console.log(`  ❌ Missing: ${dbColumnName} (${colKey} in schema)`);
        }
      }
    } catch (error) {
      console.error(`Error checking ${tableName}:`, error);
    }
  }
  
  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total missing columns: ${missingColumns.length}`);
  
  // Group by table
  const byTable = missingColumns.reduce((acc, col) => {
    if (!acc[col.table]) acc[col.table] = [];
    acc[col.table].push(col);
    return acc;
  }, {} as Record<string, any[]>);
  
  console.log('\nMissing columns by table:');
  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`\n${table}: ${cols.length} missing columns`);
    cols.forEach(col => {
      console.log(`  - ${col.dbColumn} (${col.schemaKey})`);
    });
  }
  
  // Generate SQL to fix all missing columns
  console.log('\n\n=== SQL TO FIX ALL MISSING COLUMNS ===\n');
  
  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`-- Fix ${table} (${cols.length} missing columns)`);
    console.log(`ALTER TABLE ${table}`);
    
    const alterStatements = cols.map((col, idx) => {
      const def = col.definition;
      let sqlType = 'TEXT'; // default
      
      // Determine SQL type
      if (def.dataType === 'integer') sqlType = 'INTEGER';
      else if (def.dataType === 'boolean') sqlType = 'BOOLEAN DEFAULT false';
      else if (def.dataType === 'timestamp') sqlType = 'TIMESTAMP';
      else if (def.dataType === 'date') sqlType = 'DATE';
      else if (def.dataType === 'serial') sqlType = 'SERIAL';
      else if (def.dataType === 'decimal') {
        const precision = def.precision || 10;
        const scale = def.scale || 2;
        sqlType = `DECIMAL(${precision},${scale})`;
      }
      else if (def.dataType === 'jsonb') sqlType = 'JSONB';
      
      // Handle defaults
      if (def.default && !sqlType.includes('DEFAULT')) {
        if (def.dataType === 'boolean') {
          sqlType = `BOOLEAN DEFAULT ${def.default === true ? 'true' : 'false'}`;
        } else if (def.dataType === 'text' || def.dataType === 'varchar') {
          sqlType += ` DEFAULT '${def.default}'`;
        } else if (def.dataType === 'integer' || def.dataType === 'decimal') {
          sqlType += ` DEFAULT ${def.default}`;
        }
      }
      
      const isLast = idx === cols.length - 1;
      return `ADD COLUMN ${col.dbColumn} ${sqlType}${isLast ? ';' : ','}`;
    });
    
    alterStatements.forEach(stmt => console.log(`  ${stmt}`));
    console.log();
  }
}

checkMissingColumns().catch(console.error);