import { Express } from "express";
import { db } from "./db";
import { users, userLocations, locations, healthSystems, organizations } from "@shared/schema";
import { eq, sql, and, isNull, desc } from "drizzle-orm";
import { z } from "zod";

export function registerAdminUserRoutes(app: Express) {
  // Middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Get all users with location count
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const usersWithLocationCount = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          npi: users.npi,
          credentials: users.credentials,
          active: users.active,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          locationCount: sql<number>`COUNT(DISTINCT ${userLocations.locationId})`.as("locationCount"),
        })
        .from(users)
        .leftJoin(userLocations, eq(users.id, userLocations.userId))
        .groupBy(users.id)
        .orderBy(users.lastName, users.firstName);

      console.log("🔍 [AdminUserRoutes] Fetched", usersWithLocationCount.length, "users");
      res.json(usersWithLocationCount);
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all locations with hierarchy
  app.get("/api/admin/locations", requireAdmin, async (req, res) => {
    try {
      const locationsWithHierarchy = await db
        .select({
          id: locations.id,
          name: locations.name,
          shortName: locations.shortName,
          locationType: locations.locationType,
          address: locations.address,
          city: locations.city,
          state: locations.state,
          zipCode: locations.zipCode,
          phone: locations.phone,
          healthSystemName: healthSystems.name,
          organizationName: organizations.name,
        })
        .from(locations)
        .leftJoin(organizations, eq(locations.organizationId, organizations.id))
        .leftJoin(healthSystems, eq(organizations.healthSystemId, healthSystems.id))
        .orderBy(healthSystems.name, organizations.name, locations.name);

      console.log("🔍 [AdminUserRoutes] Fetched", locationsWithHierarchy.length, "locations");
      res.json(locationsWithHierarchy);
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Get user locations
  app.get("/api/admin/users/:userId/locations", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const userLocationAssignments = await db
        .select({
          id: userLocations.id,
          userId: userLocations.userId,
          locationId: userLocations.locationId,
          roleAtLocation: userLocations.roleAtLocation,
          isPrimary: userLocations.isPrimary,
          canSchedule: userLocations.canSchedule,
          canViewAllPatients: userLocations.canViewAllPatients,
          canCreateOrders: userLocations.canCreateOrders,
          active: userLocations.active,
          startDate: userLocations.startDate,
          endDate: userLocations.endDate,
          location: {
            id: locations.id,
            name: locations.name,
            shortName: locations.shortName,
            locationType: locations.locationType,
            address: locations.address,
            city: locations.city,
            state: locations.state,
            zipCode: locations.zipCode,
            phone: locations.phone,
            healthSystemName: sql<string>`${healthSystems.name}`.as("healthSystemName"),
            organizationName: sql<string>`${organizations.name}`.as("organizationName"),
          },
        })
        .from(userLocations)
        .innerJoin(locations, eq(userLocations.locationId, locations.id))
        .leftJoin(organizations, eq(locations.organizationId, organizations.id))
        .leftJoin(healthSystems, eq(organizations.healthSystemId, healthSystems.id))
        .where(eq(userLocations.userId, userId))
        .orderBy(desc(userLocations.isPrimary), locations.name);

      console.log(`🔍 [AdminUserRoutes] Found ${userLocationAssignments.length} locations for user ${userId}`);
      res.json(userLocationAssignments);
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error fetching user locations:", error);
      res.status(500).json({ message: "Failed to fetch user locations" });
    }
  });

  // Assign user to location
  app.post("/api/admin/users/:userId/locations", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const assignmentSchema = z.object({
        locationId: z.number(),
        roleAtLocation: z.string(),
        isPrimary: z.boolean(),
        permissions: z.object({
          canSchedule: z.boolean(),
          canViewAllPatients: z.boolean(),
          canCreateOrders: z.boolean(),
        }),
      });

      const data = assignmentSchema.parse(req.body);

      // Check if assignment already exists
      const existing = await db
        .select()
        .from(userLocations)
        .where(
          and(
            eq(userLocations.userId, userId),
            eq(userLocations.locationId, data.locationId)
          )
        );

      if (existing.length > 0) {
        return res.status(400).json({ message: "User already assigned to this location" });
      }

      // If setting as primary, unset other primary locations
      if (data.isPrimary) {
        await db
          .update(userLocations)
          .set({ isPrimary: false })
          .where(eq(userLocations.userId, userId));
      }

      // Create new assignment
      const [assignment] = await db
        .insert(userLocations)
        .values({
          userId,
          locationId: data.locationId,
          roleAtLocation: data.roleAtLocation,
          isPrimary: data.isPrimary,
          canSchedule: data.permissions.canSchedule,
          canViewAllPatients: data.permissions.canViewAllPatients,
          canCreateOrders: data.permissions.canCreateOrders,
          active: true,
          startDate: new Date().toISOString().split("T")[0],
        })
        .returning();

      console.log(`✅ [AdminUserRoutes] Assigned user ${userId} to location ${data.locationId}`);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("❌ [AdminUserRoutes] Error assigning location:", error);
      res.status(500).json({ message: "Failed to assign location" });
    }
  });

  // Remove user from location
  app.delete("/api/admin/users/:userId/locations/:locationId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const locationId = parseInt(req.params.locationId);

      await db
        .delete(userLocations)
        .where(
          and(
            eq(userLocations.userId, userId),
            eq(userLocations.locationId, locationId)
          )
        );

      console.log(`✅ [AdminUserRoutes] Removed user ${userId} from location ${locationId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error removing location:", error);
      res.status(500).json({ message: "Failed to remove location" });
    }
  });

  // Update user status
  app.put("/api/admin/users/:userId/status", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { active } = req.body;

      const [updated] = await db
        .update(users)
        .set({ active })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ [AdminUserRoutes] Updated user ${userId} status to ${active ? "active" : "inactive"}`);
      res.json(updated);
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Don't allow deleting the admin user
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user[0]?.username === "admin") {
        return res.status(400).json({ message: "Cannot delete the system admin user" });
      }

      await db.delete(users).where(eq(users.id, userId));

      console.log(`✅ [AdminUserRoutes] Deleted user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [AdminUserRoutes] Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  console.log("✅ [AdminUserRoutes] Admin user routes registered");
}