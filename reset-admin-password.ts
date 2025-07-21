
import { db } from "./server/db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function resetAdminPassword() {
  console.log("🔐 [AdminReset] Starting admin password reset...");
  
  try {
    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').substring(0, 12);
    
    // Hash the temporary password
    const salt = crypto.randomBytes(32).toString('hex');
    const hashedPassword = crypto.pbkdf2Sync(tempPassword, salt, 100000, 64, 'sha512').toString('hex') + '.' + salt;
    
    // Find admin user
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (adminUsers.length === 0) {
      console.log("❌ [AdminReset] No admin users found");
      return;
    }
    
    const admin = adminUsers[0];
    
    // Update admin password and require password change
    await db.update(users)
      .set({
        password: hashedPassword,
        requirePasswordChange: true,
        failedLoginAttempts: 0,
        accountLockedUntil: null
      })
      .where(eq(users.id, admin.id));
    
    console.log("✅ Admin password reset successfully!");
    console.log("You can now login with:");
    console.log(`Username: ${admin.username}`);
    console.log(`Password: ${tempPassword}`);
    console.log("");
    console.log("⚠️ You will be required to change this password on first login.");
    
  } catch (error) {
    console.error("❌ [AdminReset] Failed to reset admin password:", error);
  }
  
  process.exit(0);
}

resetAdminPassword();
