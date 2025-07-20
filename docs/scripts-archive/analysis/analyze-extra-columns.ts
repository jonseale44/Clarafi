import { execSync } from 'child_process';

interface ExtraColumn {
  table: string;
  column: string;
}

// Run the audit and capture output
const auditOutput = execSync('npx tsx database-schema-audit.ts 2>&1', { encoding: 'utf-8' });

// Parse extra columns from audit output
const extraColumns: ExtraColumn[] = [];
const lines = auditOutput.split('\n');

for (const line of lines) {
  if (line.includes('exists in DB but not in schema.ts')) {
    // Extract column name from line like: "  ⚠️  Column 'encounter_id' exists in DB but not in schema.ts"
    const columnMatch = line.match(/Column '([^']+)'/);
    if (columnMatch) {
      // Find the table name by looking backwards
      let tableIndex = lines.indexOf(line);
      while (tableIndex > 0) {
        tableIndex--;
        const tableLine = lines[tableIndex];
        if (tableLine.includes('Checking table:')) {
          const tableMatch = tableLine.match(/Checking table: ([^\s]+)/);
          if (tableMatch) {
            extraColumns.push({
              table: tableMatch[1],
              column: columnMatch[1]
            });
            break;
          }
        }
      }
    }
  }
}

// Group by table
const columnsByTable = new Map<string, string[]>();
for (const { table, column } of extraColumns) {
  if (!columnsByTable.has(table)) {
    columnsByTable.set(table, []);
  }
  columnsByTable.get(table)!.push(column);
}

// Sort tables by number of extra columns (descending)
const sortedTables = Array.from(columnsByTable.entries())
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n📊 EXTRA COLUMNS IN DATABASE (NOT IN SCHEMA.TS)\n`);
console.log(`Total: ${extraColumns.length} columns across ${columnsByTable.size} tables\n`);

for (const [table, columns] of sortedTables) {
  console.log(`\n${table} (${columns.length} extra columns):`);
  console.log('  ' + columns.sort().join(', '));
}

// Output tables with most extra columns for detailed review
console.log('\n\n🔍 TOP 10 TABLES WITH MOST EXTRA COLUMNS:');
sortedTables.slice(0, 10).forEach(([table, columns], index) => {
  console.log(`${index + 1}. ${table}: ${columns.length} columns`);
});