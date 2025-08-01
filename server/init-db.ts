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
      const existingHealthSystems = await db.select().from(healthSystems).limit(1);
      let healthSystemId: number;
      
      if (existingHealthSystems.length === 0) {
        // Create a default health system if none exists
        const newHealthSystems = await db.insert(healthSystems).values({
          name: "Default Health System",
          shortName: "Default",
          systemType: "individual_provider"
        }).returning();
        if (newHealthSystems.length > 0 && newHealthSystems[0]) {
          healthSystemId = newHealthSystems[0].id;
        } else {
          throw new Error("Failed to create default health system");
        }
      } else {
        healthSystemId = existingHealthSystems[0].id;
      }
      
      await db.insert(users).values({
        username: "admin",
        email: "admin@clarafi.ai", 
        password: hashedPassword,
        healthSystemId: healthSystemId,
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