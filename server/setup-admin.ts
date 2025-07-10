#!/usr/bin/env tsx

import { db } from "./db";
import { users, healthSystems, locations, userLocations } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

// This script creates an initial admin account
// Run with: npm run setup-admin

async function setupAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@clarafi.com";
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.username, adminUsername))
      .limit(1);
      
    if (existingAdmin.length > 0) {
      console.log("❌ Admin user already exists!");
      process.exit(0);
    }
    
    // Get or create a health system for admin
    let healthSystem = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.name, "Clarafi System Admin"))
      .limit(1);
      
    let healthSystemId: number;
    if (healthSystem.length === 0) {
      const [newHealthSystem] = await db.insert(healthSystems).values({
        name: "Clarafi System Admin",
        subscriptionTier: 3, // Enterprise tier for admin
        subscriptionStatus: 'active',
        systemType: 'admin'
      }).returning();
      healthSystemId = newHealthSystem.id;
      console.log("✅ Created admin health system");
    } else {
      healthSystemId = healthSystem[0].id;
    }
    
    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const [adminUser] = await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      email: adminEmail,
      role: "admin",
      healthSystemId: healthSystemId,
      emailVerified: true, // Admin doesn't need email verification
      isActive: true
    }).returning();
    
    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email: ${adminEmail}`);
    console.log("\n⚠️  Please change the admin password after first login!");
    
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

setupAdmin();