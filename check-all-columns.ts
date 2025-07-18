import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// First, get ALL extra columns from the database audit
const auditOutput = execSync('npx tsx database-schema-audit.ts 2>&1', { encoding: 'utf-8' });

// Parse all extra columns
const extraColumns: Map<string, string[]> = new Map();
let currentTable = '';
const lines = auditOutput.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('Checking table:')) {
    const tableMatch = line.match(/Checking table: ([^\s]+)/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      extraColumns.set(currentTable, []);
    }
  } else if (line.includes('exists in DB but not in schema.ts') && currentTable) {
    const columnMatch = line.match(/Column '([^']+)'/);
    if (columnMatch) {
      extraColumns.get(currentTable)!.push(columnMatch[1]);
    }
  }
}

// Directories to search
const searchDirs = ['server', 'client/src', 'shared'];

// Cache for file contents to speed up searching
const fileCache = new Map<string, string>();

function loadFileCache() {
  console.log('📂 Loading file cache...');
  
  function loadDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'uploads'].includes(file)) {
        loadDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        fileCache.set(filePath, fs.readFileSync(filePath, 'utf-8'));
      }
    }
  }
  
  searchDirs.forEach(loadDir);
  console.log(`✅ Loaded ${fileCache.size} files into cache\n`);
}

// Search for column usage
function searchForColumn(tableName: string, columnName: string): { found: boolean, locations: string[] } {
  const locations: string[] = [];
  
  // Different patterns to search for
  const patterns = [
    columnName,                          // Direct column name
    `"${columnName}"`,                   // Quoted column name
    `'${columnName}'`,                   // Single quoted
    `\`${columnName}\``,                 // Backtick quoted
    columnName.replace(/_/g, ''),        // Remove underscores
  ];
  
  // Convert snake_case to camelCase
  const camelCase = columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (camelCase !== columnName) {
    patterns.push(camelCase);
  }
  
  // Search in cached files
  for (const [filePath, content] of fileCache) {
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(pattern)) {
            locations.push(`${filePath}:${idx + 1}`);
          }
        });
        break; // Found in this file, no need to check other patterns
      }
    }
  }
  
  return { found: locations.length > 0, locations: locations.slice(0, 3) }; // Return first 3 matches
}

// Load file cache
loadFileCache();

// Analyze all tables and columns
console.log('🔍 ANALYZING ALL EXTRA COLUMNS FOR USAGE\n');

const results = new Map<string, { used: Map<string, string[]>, unused: string[] }>();
let totalChecked = 0;
let totalUsed = 0;

// Sort tables by number of extra columns (descending)
const sortedTables = Array.from(extraColumns.entries())
  .sort((a, b) => b[1].length - a[1].length);

for (const [table, columns] of sortedTables) {
  if (columns.length === 0) continue;
  
  console.log(`\n📊 Checking ${table} (${columns.length} extra columns)...`);
  const used = new Map<string, string[]>();
  const unused: string[] = [];
  
  for (const column of columns) {
    totalChecked++;
    process.stdout.write(`  [${totalChecked}/${Array.from(extraColumns.values()).flat().length}] ${column}... `);
    
    const result = searchForColumn(table, column);
    
    if (result.found) {
      used.set(column, result.locations);
      totalUsed++;
      console.log(`✅ USED`);
    } else {
      unused.push(column);
      console.log('❌ NOT FOUND');
    }
  }
  
  results.set(table, { used, unused });
  console.log(`  Summary: ${used.size} used, ${unused.length} unused`);
}

// Generate summary report
console.log('\n\n📋 FINAL SUMMARY REPORT');
console.log('======================\n');
console.log(`Total columns checked: ${totalChecked}`);
console.log(`Total used columns: ${totalUsed} (${Math.round(totalUsed / totalChecked * 100)}%)`);
console.log(`Total unused columns: ${totalChecked - totalUsed} (${Math.round((totalChecked - totalUsed) / totalChecked * 100)}%)`);

// Tables with most used columns
console.log('\n\n🏆 TABLES WITH MOST USED COLUMNS:');
const tablesWithUsage = Array.from(results.entries())
  .map(([table, data]) => ({ table, usedCount: data.used.size, unusedCount: data.unused.length }))
  .sort((a, b) => b.usedCount - a.usedCount)
  .slice(0, 10);

tablesWithUsage.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.table}: ${item.usedCount} used, ${item.unusedCount} unused`);
});

// Save detailed results
const detailedResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalChecked,
    totalUsed,
    totalUnused: totalChecked - totalUsed
  },
  byTable: Object.fromEntries(
    Array.from(results.entries()).map(([table, data]) => [
      table,
      {
        used: Object.fromEntries(data.used),
        unused: data.unused
      }
    ])
  )
};

fs.writeFileSync('all-columns-usage-report.json', JSON.stringify(detailedResults, null, 2));
console.log('\n\n📄 Detailed report saved to all-columns-usage-report.json');

// Generate schema.ts additions for used columns
console.log('\n\n📝 GENERATING SCHEMA.TS ADDITIONS FOR USED COLUMNS...');
const schemaAdditions: string[] = [];

for (const [table, data] of results) {
  if (data.used.size > 0) {
    schemaAdditions.push(`\n// ${table} - Additional columns found in active use`);
    for (const column of data.used.keys()) {
      // Convert snake_case to camelCase for TypeScript
      const camelCase = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Try to guess the type based on column name
      let tsType = 'text';
      if (column.endsWith('_id') || column.endsWith('_by')) tsType = 'integer';
      if (column.endsWith('_at') || column.endsWith('_date')) tsType = 'timestamp';
      if (column.includes('status') || column.includes('type')) tsType = 'text';
      if (column.includes('notes') || column.includes('description')) tsType = 'text';
      
      schemaAdditions.push(`  ${camelCase}: ${tsType}("${column}"),`);
    }
  }
}

fs.writeFileSync('schema-additions.txt', schemaAdditions.join('\n'));
console.log('✅ Schema additions saved to schema-additions.txt');