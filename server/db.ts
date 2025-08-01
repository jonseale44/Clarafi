import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

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
  process.env.DATABASE_URL?.includes("rds.amazonaws.com");

if (isProduction) {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required for AWS RDS
  };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
