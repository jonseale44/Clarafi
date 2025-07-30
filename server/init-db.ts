import { db } from "./db.js";
import { users, healthSystems } from "@shared/schema";
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
      
      // First, ensure we have at least one health system
      const [defaultHealthSystem] = await db.select().from(healthSystems).limit(1);
      let healthSystemId = defaultHealthSystem?.id;
      
      if (!healthSystemId) {
        // Create a default health system if none exists
        const [newHealthSystem] = await db.insert(healthSystems).values({
          name: "Default Health System",
          short_name: "Default",
          system_type: "individual_provider"
        }).returning();
        healthSystemId = newHealthSystem.id;
      }
      
      await db.insert(users).values({
        username: "admin",
        email: "admin@clarafi.ai", 
        password: hashedPassword,
        health_system_id: healthSystemId,
        first_name: "System",
        last_name: "Administrator",
        role: "admin",
        npi: "1234567890",
        credentials: "MD",
        specialties: ["Internal Medicine"],
        license_number: "MD123456"
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