import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { generateSecurePassword } from "./password-validation";

async function resetAdminPassword() {
  try {
    console.log("Resetting admin password...");
    
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword(16);
    
    // Hash the password using the current system
    const hashedPassword = await hashPassword(tempPassword);
    
    // Update the admin user's password and force password change
    const result = await db.update(users)
      .set({ 
        password: hashedPassword,
        requirePasswordChange: true 
      })
      .where(eq(users.username, "admin"))
      .returning();
    
    if (result.length > 0) {
      console.log("✅ Admin password reset successfully!");
      console.log("You can now login with:");
      console.log("Username: admin");
      console.log("Password:", tempPassword);
      console.log("\n⚠️  You will be required to change this password on first login.");
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
        licenseNumber: "MD123456",
        requirePasswordChange: true
      });
      
      console.log("✅ Admin user created successfully!");
      console.log("You can now login with:");
      console.log("Username: admin");
      console.log("Password:", tempPassword);
      console.log("\n⚠️  You will be required to change this password on first login.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    process.exit(1);
  }
}

resetAdminPassword();