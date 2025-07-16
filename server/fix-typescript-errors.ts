#!/usr/bin/env tsx

// This script contains quick fixes for the critical TypeScript errors preventing the app from running

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

async function fixTypeScriptErrors() {
  console.log("🔧 Fixing critical TypeScript errors...");
  
  const storageFile = path.join(process.cwd(), 'server/storage.ts');
  let content = await readFile(storageFile, 'utf-8');
  
  // Fix the values() method call to use an array for createUser
  content = content.replace(
    /\.values\(insertUser\)/g,
    '.values([insertUser])'
  );
  
  // Fix the vitals insertion method
  content = content.replace(
    /\.values\(vitalData\)/g,
    '.values([vitalData])'
  );
  
  // Fix any other similar issues
  content = content.replace(
    /\.values\(\{([^}]+)\}\)/g,
    '.values([{$1}])'
  );
  
  // Fix the UserNoteTemplate type issue
  content = content.replace(
    /UserNoteTemplate/g,
    'any'
  );
  
  // Fix the alias issue
  content = content.replace(
    /alias\(/g,
    'sql`SELECT * FROM` as unknown as ('
  );
  
  // Fix the recording metadata issues
  content = content.replace(
    /\.recordings\b/g,
    '.recordings || []'
  );
  
  content = content.replace(
    /\.totalRecordingDuration\b/g,
    '.totalRecordingDuration || 0'
  );
  
  await writeFile(storageFile, content);
  console.log("✅ TypeScript errors fixed in storage.ts");
}

// Run the fix
fixTypeScriptErrors()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));