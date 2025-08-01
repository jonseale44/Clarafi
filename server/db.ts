import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// COMPREHENSIVE LOGGING START
console.log("\n========== DB CONFIG START ==========");
console.log("[DB CONFIG] db.ts module loaded at:", new Date().toISOString());
console.log("[DB CONFIG] Process info:");
console.log("  - NODE_ENV:", process.env.NODE_ENV);
console.log("  - NODE_VERSION:", process.version);
console.log("  - PLATFORM:", process.platform);
console.log("  - CWD:", process.cwd());

// Log ALL environment variables that might affect SSL/TLS
console.log("[DB CONFIG] SSL-related environment variables:");
console.log("  - NODE_TLS_REJECT_UNAUTHORIZED:", process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log("  - PGSSLMODE:", process.env.PGSSLMODE);
console.log("  - PGSSL:", process.env.PGSSL);
console.log("  - DATABASE_SSL:", process.env.DATABASE_SSL);
console.log("  - SSL_CERT_FILE:", process.env.SSL_CERT_FILE);
console.log("  - SSL_CERT_DIR:", process.env.SSL_CERT_DIR);

// Create a global to track if this module was loaded
if (typeof global !== 'undefined') {
  (global as any).__DB_MODULE_LOADED = true;
  (global as any).__DB_MODULE_LOAD_TIME = new Date().toISOString();
}

if (!process.env.DATABASE_URL) {
  console.error("[DB CONFIG] FATAL: DATABASE_URL is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log DATABASE_URL (with password hidden)
let connectionString = process.env.DATABASE_URL;
const urlForLogging = connectionString.replace(/:[^:@]+@/, ':***@');
console.log("[DB CONFIG] DATABASE_URL format:", urlForLogging);

// Parse the DATABASE_URL to understand its components
try {
  const url = new URL(connectionString);
  console.log("[DB CONFIG] DATABASE_URL components:");
  console.log("  - Protocol:", url.protocol);
  console.log("  - Host:", url.host);
  console.log("  - Hostname:", url.hostname);
  console.log("  - Port:", url.port);
  console.log("  - Database:", url.pathname);
  console.log("  - Search params:", url.search);
  console.log("  - Has SSL params:", url.search.includes('ssl') || url.search.includes('sslmode'));
  
  // CRITICAL FIX: Remove SSL parameters from connection string
  // IMPORTANT: Connection string SSL parameters OVERRIDE pool SSL configuration
  // This was causing "self-signed certificate in certificate chain" errors even with rejectUnauthorized: false
  // AWS App Runner adds ?sslmode=require to DATABASE_URL which forces SSL validation
  if (url.search.includes('ssl') || url.search.includes('sslmode')) {
    console.log("[DB CONFIG] WARNING: SSL parameters found in connection string!");
    console.log("[DB CONFIG] Removing SSL parameters to allow pool SSL config to take effect...");
    
    // Remove all SSL-related parameters
    url.searchParams.delete('ssl');
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');
    
    // Update the connection string
    connectionString = url.toString();
    console.log("[DB CONFIG] Updated connection string (SSL params removed):", connectionString.replace(/:[^:@]+@/, ':***@'));
  }
} catch (e) {
  console.error("[DB CONFIG] Failed to parse DATABASE_URL:", e);
}

// Check if we're connecting to AWS RDS
const isAWSRDS = connectionString.includes("rds.amazonaws.com");
const isProduction = process.env.NODE_ENV === "production";

console.log("[DB CONFIG] Connection type detection:");
console.log("  - isAWSRDS:", isAWSRDS);
console.log("  - isProduction:", isProduction);

// Create pool configuration
console.log("[DB CONFIG] Creating pool configuration...");
const poolConfig: any = {
  connectionString: connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// For AWS RDS in production, configure SSL
if (isAWSRDS || isProduction) {
  console.log("[DB CONFIG] AWS RDS/Production detected - configuring SSL");
  
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  
  console.log("[DB CONFIG] SSL configuration applied:");
  console.log("  - ssl:", JSON.stringify(poolConfig.ssl));
}

// Log final pool configuration (without password)
const configForLogging = {
  ...poolConfig,
  connectionString: urlForLogging
};
console.log("[DB CONFIG] Final pool configuration:", JSON.stringify(configForLogging, null, 2));

// Create the pool with error handling
console.log("[DB CONFIG] Creating PostgreSQL connection pool...");
let pool: Pool;
try {
  pool = new Pool(poolConfig);
  console.log("[DB CONFIG] Pool created successfully");
  
  // Add event listeners for debugging
  pool.on('error', (err) => {
    console.error("[DB CONFIG] Pool error event:", err);
    console.error("  - Error code:", err.code);
    console.error("  - Error message:", err.message);
    console.error("  - Error stack:", err.stack);
  });
  
  pool.on('connect', () => {
    console.log("[DB CONFIG] Pool connect event - client connected");
  });
  
  pool.on('acquire', () => {
    console.log("[DB CONFIG] Pool acquire event - client checked out");
  });
  
  pool.on('remove', () => {
    console.log("[DB CONFIG] Pool remove event - client removed");
  });
  
} catch (error: any) {
  console.error("[DB CONFIG] FATAL: Failed to create pool:", error);
  console.error("  - Error code:", error.code);
  console.error("  - Error message:", error.message);
  console.error("  - Error stack:", error.stack);
  throw error;
}

console.log("[DB CONFIG] Creating Drizzle instance...");
const db = drizzle(pool, { schema });
console.log("[DB CONFIG] Drizzle instance created");

console.log("========== DB CONFIG END ==========\n");

export { pool, db };
