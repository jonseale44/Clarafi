import { db } from "./server/db.js";
import * as schema from "./shared/schema.js";
import { sql } from "drizzle-orm";
import fs from 'fs';

// Helper to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// Check if the schema has specific columns that might be causing issues
async function checkSpecificIssues() {
  console.log("🔍 Checking specific known issues...\n");
  
  // Check imaging_results.laterality
  try {
    const imagingCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imaging_results' 
      AND column_name = 'laterality'
    `);
    console.log("imaging_results.laterality exists in DB:", imagingCheck.rows.length > 0);
  } catch (e) {
    console.error("Error checking imaging_results.laterality");
  }
  
  // Check document_processing_queue.attempts
  try {
    const docCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'document_processing_queue' 
      AND column_name = 'attempts'
    `);
    console.log("document_processing_queue.attempts exists in DB:", docCheck.rows.length > 0);
  } catch (e) {
    console.error("Error checking document_processing_queue.attempts");
  }
  
  // Check migrationInvitations export issue
  console.log("\n🔍 Checking schema exports...");
  console.log("migrationInvitations exported:", 'migrationInvitations' in schema);
  console.log("migration_invitations table in schema:", 'migration_invitations' in schema);
  
  // Look for the actual export
  const schemaKeys = Object.keys(schema);
  const migrationRelated = schemaKeys.filter(key => 
    key.toLowerCase().includes('migration') || 
    key.toLowerCase().includes('invitation')
  );
  console.log("Migration-related exports found:", migrationRelated);
  
  // Check dashboards table
  try {
    const dashboardsCheck = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'dashboards' 
      AND table_schema = 'public'
    `);
    console.log("\ndashboards table exists in DB:", dashboardsCheck.rows[0].count > 0);
  } catch (e) {
    console.error("Error checking dashboards table");
  }
}

checkSpecificIssues().catch(console.error);