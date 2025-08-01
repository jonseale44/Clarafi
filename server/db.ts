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

// AWS RDS SSL Fix: For production AWS RDS connections
// The key is to append SSL parameters directly to the connection string
let connectionString = process.env.DATABASE_URL;

// Check if we're connecting to AWS RDS
const isAWSRDS = connectionString.includes("rds.amazonaws.com");
const isProduction = process.env.NODE_ENV === "production";

console.log("[DB CONFIG] isAWSRDS:", isAWSRDS);
console.log("[DB CONFIG] isProduction:", isProduction);

// For AWS RDS, append SSL parameters to the connection string if not already present
if ((isAWSRDS || isProduction) && !connectionString.includes("sslmode=")) {
  console.log("[DB CONFIG] Appending SSL parameters to connection string for AWS RDS");
  // Add SSL parameters to the connection string
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${separator}sslmode=require&ssl=true`;
  console.log("[DB CONFIG] Modified connection string (SSL params added)");
}

// Create pool configuration
const poolConfig: any = {
  connectionString: connectionString,
  max: 5, // Reduce max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// For AWS RDS, we need to disable SSL certificate verification
// This is the proper way to handle AWS RDS self-signed certificates
if (isAWSRDS || isProduction) {
  console.log("[DB CONFIG] Setting SSL configuration for AWS RDS");
  
  // This is the correct configuration for AWS RDS with self-signed certificates
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  
  console.log("[DB CONFIG] SSL configuration applied:", JSON.stringify(poolConfig.ssl));
}

console.log("[DB CONFIG] Final poolConfig has SSL:", !!poolConfig.ssl);

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
