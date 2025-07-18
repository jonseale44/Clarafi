/**
 * Force push database schema without interactive prompts
 * This script bypasses the interactive questions that cause db:push to hang
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { sql as sqlTemplate } from "drizzle-orm";
import * as schema from "./shared/schema.js";

async function forcePush() {
  console.log("🚀 Starting force database push...");
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in environment");
  }

  const client = neon(databaseUrl);
  const db = drizzle(client, { schema });

  try {
    // Instead of using drizzle-kit push which has interactive prompts,
    // we'll manually apply the most common fixes that are causing issues
    
    console.log("📊 Applying manual schema fixes...");

    // Fix 1: Add missing columns that are in schema.ts but not in database
    const fixes = [
      // Lab results columns
      `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS previous_value DECIMAL(15,6)`,
      `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS previous_date TIMESTAMP`,
      `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS trend_direction TEXT`,
      `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS percent_change DECIMAL(5,2)`,
      `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS qc_flags JSONB`,
      
      // Imaging results columns
      `ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS study_type TEXT`,
      
      // Scheduling columns (that are causing the interactive prompts)
      `ALTER TABLE scheduling_ai_factors ADD COLUMN IF NOT EXISTS factor_category TEXT`,
      
      // Appointments columns
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS provider_scheduled_duration INTEGER`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_visible_duration INTEGER`,
    ];

    for (const fix of fixes) {
      try {
        console.log(`🔧 Running: ${fix.substring(0, 50)}...`);
        await db.execute(sqlTemplate.raw(fix));
        console.log(`✅ Applied successfully`);
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          console.log(`⏭️  Column already exists, skipping`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }

    console.log("\n✨ Database schema push completed!");
    console.log("🔍 Note: This is a temporary workaround for the interactive prompt issue.");
    console.log("📝 For a permanent solution, consider using Drizzle migrations instead of push.");
    
  } catch (error) {
    console.error("❌ Force push failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

forcePush();