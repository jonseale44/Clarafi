import { db } from "./db.js";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

export async function initializeDatabase() {
  try {
    console.log("Initializing database...");
    
    // Check if any users exist
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log("Creating default admin user...");
      
      // Create default admin user
      const hashedPassword = await hashPassword("admin123");
      
      await db.insert(users).values({
        username: "admin",
        email: "admin@clarafi.ai",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        npi: "1234567890",
        credentials: "MD",
        specialties: ["Internal Medicine"],
        licenseNumber: "MD123456"
      });
      
      console.log("Default admin user created (username: admin, password: admin123)");
    }
    
    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// Hash password function
async function hashPassword(password: string) {
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}