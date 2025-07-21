
import { db } from "./server/db.js";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./server/auth";

async function verifyAndFixAdmin() {
  try {
    console.log("🔍 [AdminCheck] Checking for admin user...");
    
    // Check if admin user exists
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (adminUser.length === 0) {
      console.log("❌ [AdminCheck] No admin user found, creating one...");
      
      // Create admin user
      const hashedPassword = await hashPassword("admin123");
      const newAdmin = await db
        .insert(users)
        .values({
          username: "admin",
          email: "admin@clarafi.com",
          password: hashedPassword,
          firstName: "System",
          lastName: "Administrator",
          role: "admin",
          healthSystemId: 1, // Default to first health system
          emailVerified: true,
          active: true,
          specialties: []
        })
        .returning();

      console.log("✅ [AdminCheck] Created admin user:", newAdmin[0].username);
      console.log("🔑 [AdminCheck] Login credentials:");
      console.log("   Username: admin");
      console.log("   Password: admin123");
    } else {
      console.log("✅ [AdminCheck] Admin user exists:", adminUser[0].username);
      console.log("📊 [AdminCheck] User details:", {
        id: adminUser[0].id,
        username: adminUser[0].username,
        email: adminUser[0].email,
        role: adminUser[0].role,
        active: adminUser[0].active,
        emailVerified: adminUser[0].emailVerified
      });
      
      // Reset password to ensure it's admin123
      console.log("🔄 [AdminCheck] Resetting admin password to admin123...");
      const hashedPassword = await hashPassword("admin123");
      
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          emailVerified: true,
          active: true
        })
        .where(eq(users.id, adminUser[0].id));
      
      console.log("✅ [AdminCheck] Admin password reset successfully");
      console.log("🔑 [AdminCheck] Login credentials:");
      console.log("   Username: admin");
      console.log("   Password: admin123");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ [AdminCheck] Error:", error);
    process.exit(1);
  }
}

verifyAndFixAdmin();
