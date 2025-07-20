import * as fs from 'fs';
import * as path from 'path';

// Read the extra columns report
const auditData = fs.readFileSync('analyze-extra-columns.ts', 'utf-8');

// Define the tables and columns we want to check
const topTables: Record<string, string[]> = {
  lab_orders: [
    'abnormal_flags', 'order_id', 'external_lab', 'provider_notes', 
    'result_status', 'results', 'special_instructions', 'stat_order'
  ],
  imaging_results: [
    'encounter_id', 'recommendations', 'technique', 'contrast_used',
    'critical_findings', 'procedure_code', 'ordering_provider_id'
  ],
  orders: [
    'order_date', 'prescriber', 'start_date', 'end_date', 'frequency',
    'imaging_study_type', 'lab_test_name', 'referral_reason'
  ],
  medical_problems: [
    'follow_up_date', 'original_problem_text', 'ai_confidence_score',
    'problem_ranking', 'treatment_goals', 'outcome_measures'
  ],
  encounters: [
    'encounter_date', 'voice_recording_url', 'template_id', 'signed_by',
    'visit_reason', 'notes', 'location_id', 'billing_status'
  ]
};

console.log('🔍 SEARCHING FOR COLUMN USAGE IN CODEBASE\n');

// Search function
function findInFiles(searchTerm: string, directory: string): string[] {
  const results: string[] = [];
  
  function searchRecursive(dir: string) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      // Skip certain directories
      if (stat.isDirectory()) {
        if (['node_modules', 'dist', '.git', 'uploads'].includes(file)) continue;
        searchRecursive(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check various patterns
        const patterns = [
          searchTerm,
          searchTerm.replace(/_/g, ''),  // Remove underscores
          searchTerm.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) // camelCase
        ];
        
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            // Get line number
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes(pattern)) {
                results.push(`${filePath}:${idx + 1} - ${line.trim()}`);
              }
            });
            break;
          }
        }
      }
    }
  }
  
  if (fs.existsSync(directory)) {
    searchRecursive(directory);
  }
  
  return results;
}

// Analyze each table
const report: Record<string, { used: Record<string, string[]>, unused: string[] }> = {};

for (const [table, columns] of Object.entries(topTables)) {
  console.log(`\n📊 Analyzing ${table}:`);
  const used: Record<string, string[]> = {};
  const unused: string[] = [];
  
  for (const column of columns) {
    console.log(`  Checking ${column}...`);
    
    const serverResults = findInFiles(column, 'server');
    const clientResults = findInFiles(column, 'client');
    const sharedResults = findInFiles(column, 'shared');
    
    const allResults = [...serverResults, ...clientResults, ...sharedResults];
    
    if (allResults.length > 0) {
      used[column] = allResults.slice(0, 3); // Keep first 3 results
      console.log(`    ✅ Found ${allResults.length} references`);
    } else {
      unused.push(column);
      console.log(`    ❌ Not found`);
    }
  }
  
  report[table] = { used, unused };
}

// Print summary
console.log('\n\n📋 SUMMARY REPORT');
console.log('================\n');

for (const [table, data] of Object.entries(report)) {
  const usedCount = Object.keys(data.used).length;
  const unusedCount = data.unused.length;
  
  console.log(`${table.toUpperCase()}:`);
  console.log(`  ✅ Used columns (${usedCount}): ${Object.keys(data.used).join(', ')}`);
  console.log(`  ❌ Unused columns (${unusedCount}): ${data.unused.join(', ')}`);
  console.log('');
}

// Save detailed report
fs.writeFileSync('column-usage-detailed.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to column-usage-detailed.json');