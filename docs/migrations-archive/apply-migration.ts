import { db } from "./db.js";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function applyMigration() {
  try {
    console.log("Reading migration file...");
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), "migrations/0000_high_freak.sql"),
      "utf-8"
    );
    
    console.log("Applying migration to database...");
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(";")
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ";");
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.execute(sql.raw(statement));
    }
    
    console.log("Migration applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  }
}

applyMigration();