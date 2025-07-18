import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Get extra columns from the audit
const auditOutput = execSync('npx tsx analyze-extra-columns.ts 2>&1', { encoding: 'utf-8' });

// Parse the table/column data
const tableData = new Map<string, string[]>();
let currentTable = '';
const lines = auditOutput.split('\n');

for (const line of lines) {
  const tableMatch = line.match(/^(\w+) \((\d+) extra columns\):$/);
  if (tableMatch) {
    currentTable = tableMatch[1];
    continue;
  }
  
  if (currentTable && line.trim().startsWith('')) {
    const columns = line.trim().split(', ').filter(c => c);
    if (columns.length > 0) {
      tableData.set(currentTable, columns);
    }
  }
}

// Directories to search (excluding node_modules, dist, etc.)
const searchDirs = ['server', 'client/src', 'shared'];

// Function to search for column usage
function searchForColumn(tableName: string, columnName: string): string[] {
  const results: string[] = [];
  
  // Different patterns to search for
  const patterns = [
    columnName,                          // Direct column name
    `"${columnName}"`,                   // Quoted column name
    `'${columnName}'`,                   // Single quoted
    `\`${columnName}\``,                 // Backtick quoted
    `${tableName}.${columnName}`,       // Table.column format
    columnName.replace(/_/g, ''),        // camelCase version (remove underscores)
  ];
  
  // Convert snake_case to camelCase
  const camelCase = columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (camelCase !== columnName) {
    patterns.push(camelCase);
  }
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    for (const pattern of patterns) {
      try {
        // Use grep to search for the pattern
        const grepCmd = `grep -r -l "${pattern}" ${dir} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null || true`;
        const grepResult = execSync(grepCmd, { encoding: 'utf-8' }).trim();
        
        if (grepResult) {
          const files = grepResult.split('\n').filter(f => f);
          for (const file of files) {
            // Get context around the match
            const contextCmd = `grep -n -C 1 "${pattern}" "${file}" 2>/dev/null || true`;
            const context = execSync(contextCmd, { encoding: 'utf-8' }).trim();
            if (context && !results.includes(`${file}: ${pattern}`)) {
              results.push(`${file}: ${pattern}`);
            }
          }
        }
      } catch (e) {
        // Ignore grep errors
      }
    }
  }
  
  return results;
}

// Analyze usage for top tables with most extra columns
console.log('🔍 ANALYZING COLUMN USAGE IN CODE\n');

const topTables = ['lab_orders', 'imaging_results', 'orders', 'medical_problems', 'encounters'];
const usedColumns = new Map<string, Map<string, string[]>>();
const unusedColumns = new Map<string, string[]>();

for (const table of topTables) {
  const columns = tableData.get(table) || [];
  console.log(`\n📊 Checking ${table} (${columns.length} extra columns)...`);
  
  const tableUsed = new Map<string, string[]>();
  const tableUnused: string[] = [];
  
  for (const column of columns) {
    process.stdout.write(`  Checking ${column}... `);
    const usage = searchForColumn(table, column);
    
    if (usage.length > 0) {
      tableUsed.set(column, usage);
      console.log(`✅ USED (${usage.length} references)`);
    } else {
      tableUnused.push(column);
      console.log('❌ NOT FOUND');
    }
  }
  
  usedColumns.set(table, tableUsed);
  unusedColumns.set(table, tableUnused);
}

// Summary report
console.log('\n\n📋 SUMMARY REPORT\n');

for (const table of topTables) {
  const used = usedColumns.get(table) || new Map();
  const unused = unusedColumns.get(table) || [];
  
  console.log(`\n${table.toUpperCase()}:`);
  console.log(`  ✅ Used columns (${used.size}):`);
  for (const [col, refs] of used) {
    console.log(`     - ${col} (${refs.length} refs)`);
  }
  
  console.log(`\n  ❌ Unused columns (${unused.length}):`);
  console.log(`     ${unused.join(', ')}`);
}

// Save detailed results
const results = {
  timestamp: new Date().toISOString(),
  usedColumns: Object.fromEntries(
    Array.from(usedColumns.entries()).map(([table, cols]) => [
      table,
      Object.fromEntries(cols)
    ])
  ),
  unusedColumns: Object.fromEntries(unusedColumns)
};

fs.writeFileSync('column-usage-report.json', JSON.stringify(results, null, 2));
console.log('\n\n📄 Detailed report saved to column-usage-report.json');