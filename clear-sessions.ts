/**
 * Clear All Sessions Script
 * 
 * This script clears all sessions from the session store to fix
 * deserialization errors after database changes.
 * 
 * Run with: npx tsx clear-sessions.ts
 */

import { db } from './server/db.js';
import { session } from './shared/schema.js';

async function clearAllSessions() {
  try {
    console.log('🗑️  Clearing all sessions from the database...');
    
    const result = await db.delete(session);
    
    console.log('✅ All sessions cleared successfully');
    console.log('ℹ️  Users will need to log in again');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    process.exit(1);
  }
}

clearAllSessions();