import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

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

// Do NOT append SSL parameters to connection string - handle via poolConfig.ssl instead
// This prevents conflicts between connection string SSL and pool SSL settings

// Create pool configuration
const poolConfig: any = {
  connectionString: connectionString,
  max: 5, // Reduce max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// For AWS RDS, we need to use the AWS certificate bundle
// This is the proper way to handle AWS RDS SSL certificates securely
if (isAWSRDS || isProduction) {
  console.log("[DB CONFIG] Setting SSL configuration for AWS RDS with certificate bundle");
  
  try {
    // Try to load certificate from file for local development
    const certPath = path.join(process.cwd(), 'server', 'certs', 'aws-global-bundle.pem');
    
    if (fs.existsSync(certPath)) {
      console.log("[DB CONFIG] Loading AWS certificate bundle from file");
      const awsCertBundle = fs.readFileSync(certPath, 'utf8');
      
      poolConfig.ssl = {
        ca: awsCertBundle,
        rejectUnauthorized: true
      };
      
      console.log("[DB CONFIG] SSL configuration applied with certificate bundle from file");
    } else {
      console.log("[DB CONFIG] Certificate file not found, using standard SSL configuration");
      
      // Use standard SSL configuration for AWS App Runner
      // AWS handles certificates properly in their environment
      poolConfig.ssl = {
        rejectUnauthorized: false // AWS RDS requires SSL but handles certs internally
      };
      
      console.log("[DB CONFIG] SSL configuration applied for AWS environment");
    }
  } catch (error) {
    console.error("[DB CONFIG] Error configuring SSL:", error);
    // Fallback to basic SSL configuration
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
  
  console.log("[DB CONFIG] SSL configuration applied:", poolConfig.ssl ? "SSL enabled" : "SSL disabled");
}

console.log("[DB CONFIG] Final poolConfig has SSL:", !!poolConfig.ssl);

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
