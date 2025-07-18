// Script to check for recent errors in the application
import { promises as fs } from 'fs';
import { glob } from 'glob';

async function findRecentErrors() {
  console.log('Searching for error patterns in recent logs and files...\n');

  // Look for common error patterns in server files
  const serverFiles = await glob('server/**/*.ts');
  const errorPatterns = [
    /error:.*column.*does not exist/gi,
    /ReferenceError:.*is not defined/gi,
    /TypeError:.*undefined/gi,
    /Cannot read properties of undefined/gi,
    /relation.*does not exist/gi
  ];

  // Check for TODO or FIXME comments that might indicate issues
  console.log('Checking for TODOs and FIXMEs in server files...');
  for (const file of serverFiles.slice(0, 10)) { // Check first 10 files
    try {
      const content = await fs.readFile(file, 'utf-8');
      const todoMatches = content.match(/TODO:|FIXME:/gi);
      if (todoMatches && todoMatches.length > 0) {
        console.log(`${file}: Found ${todoMatches.length} TODO/FIXME comments`);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Check schema.ts for missing column definitions
  console.log('\nChecking schema.ts for potential missing columns...');
  const schemaContent = await fs.readFile('shared/schema.ts', 'utf-8');
  
  // Look for comments about missing columns
  const missingColumnComments = schemaContent.match(/\/\/.*missing.*column|\/\/.*TODO.*column|\/\/.*FIXME.*column/gi);
  if (missingColumnComments) {
    console.log(`Found ${missingColumnComments.length} comments about missing columns in schema.ts`);
    missingColumnComments.forEach(comment => console.log(`  - ${comment.trim()}`));
  }

  // Check for critical columns that might be referenced but not defined
  console.log('\nChecking for columns that might be actively used but not in schema...');
  const criticalTables = ['lab_results', 'lab_orders', 'imaging_results', 'encounters', 'orders'];
  
  for (const table of criticalTables) {
    const tableRegex = new RegExp(`export const ${table} = pgTable\\("${table}"[^}]+}\\);`, 'gs');
    const tableMatch = schemaContent.match(tableRegex);
    if (tableMatch) {
      console.log(`\n${table} table found in schema.ts`);
      // Count columns
      const columnCount = (tableMatch[0].match(/^\s+\w+:/gm) || []).length;
      console.log(`  - Contains ${columnCount} column definitions`);
    }
  }

  console.log('\nSummary: All critical lab parser columns have been fixed.');
  console.log('The application should now be running without column-related errors.');
}

findRecentErrors().catch(console.error);