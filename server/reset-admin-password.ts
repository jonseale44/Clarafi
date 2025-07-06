import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

async function resetAdminPassword() {
  try {
    console.log("Resetting admin password...");
    
    // Hash the password using the current system
    const hashedPassword = await hashPassword("admin123");
    
    // Update the admin user's password
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, "admin"))
      .returning();
    
    if (result.length > 0) {
      console.log("✅ Admin password reset successfully!");
      console.log("You can now login with:");
      console.log("Username: admin");
      console.log("Password: admin123");
    } else {
      console.log("❌ Admin user not found. Creating new admin user...");
      
      // Create new admin user if not exists
      await db.insert(users).values({
        username: "admin",
        email: "admin@clarafi.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        npi: "1234567890",
        credentials: "MD",
        specialties: ["Internal Medicine"],
        licenseNumber: "MD123456"
      });
      
      console.log("✅ Admin user created successfully!");
      console.log("You can now login with:");
      console.log("Username: admin");
      console.log("Password: admin123");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    process.exit(1);
  }
}

resetAdminPassword();