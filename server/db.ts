import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Log immediately to verify this module is being executed
console.log("[DB CONFIG] db.ts module loaded at:", new Date().toISOString());
console.log("[DB CONFIG] Environment check - NODE_ENV:", process.env.NODE_ENV);
console.log("[DB CONFIG] Environment check - DATABASE_URL exists:", !!process.env.DATABASE_URL);

// Create a global to track if this module was loaded
if (typeof global !== 'undefined') {
  (global as any).__DB_MODULE_LOADED = true;
  (global as any).__DB_MODULE_LOAD_TIME = new Date().toISOString();
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Debug logging to help diagnose SSL issues
console.log("[DB CONFIG] NODE_ENV:", process.env.NODE_ENV);
console.log("[DB CONFIG] DATABASE_URL includes RDS:", process.env.DATABASE_URL?.includes("rds.amazonaws.com"));

// Create pool configuration
const poolConfig: any = {
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Apply SSL for production - check both NODE_ENV and if DATABASE_URL contains AWS RDS
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("rds.amazonaws.com") ||
  process.env.DATABASE_URL?.includes("aws");

console.log("[DB CONFIG] isProduction:", isProduction);

// CRITICAL FIX: Always apply SSL configuration for AWS RDS connections
// This is required to fix the self-signed certificate error in production
if (isProduction || process.env.DATABASE_URL?.includes("amazonaws.com")) {
  console.log("[DB CONFIG] Applying SSL configuration for AWS RDS");
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required for AWS RDS self-signed certificates
    require: true, // Force SSL connection
    // Additional SSL options that might help with AWS RDS
    ca: undefined, // Let Node.js use its default CA bundle
    checkServerIdentity: () => undefined // Skip server identity check
  };
  
  // Log the full SSL configuration for debugging
  console.log("[DB CONFIG] SSL configuration applied:", JSON.stringify(poolConfig.ssl));
}

console.log("[DB CONFIG] Final poolConfig has SSL:", !!poolConfig.ssl);

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
