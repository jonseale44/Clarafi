import { Express } from "express";
import { db } from "./db";
import { users, userLocations, locations, healthSystems, organizations, encounters, patients } from "@shared/schema";
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

  // Public endpoint to get health systems for registration
  // Does not require authentication since it's used on registration page
  app.get("/api/health-systems/public", async (req, res) => {
    try {
      const publicHealthSystems = await db
        .select({
          id: healthSystems.id,
          name: healthSystems.name,
          systemType: healthSystems.systemType,
        })
        .from(healthSystems)
        .where(eq(healthSystems.subscriptionStatus, 'active'))
        .orderBy(healthSystems.name);

      res.json(publicHealthSystems);
    } catch (error) {
      console.error("Error fetching public health systems:", error);
      res.status(500).json({ message: "Failed to fetch health systems" });
    }
  });

  // Enhanced public endpoint that includes both health systems and their locations
  // Supports search and location-based sorting
  app.get("/api/health-systems/public-with-locations", async (req, res) => {
    try {
      const search = (req.query.search as string)?.toLowerCase() || '';
      const userLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const userLng = req.query.lng ? parseFloat(req.query.lng as string) : null;

      // Get health systems with their locations
      const healthSystemsWithLocations = await db
        .select({
          healthSystemId: healthSystems.id,
          healthSystemName: healthSystems.name,
          healthSystemType: healthSystems.systemType,
          subscriptionTier: healthSystems.subscriptionTier,
          locationId: locations.id,
          locationName: locations.name,
          locationAddress: locations.address,
          locationCity: locations.city,
          locationState: locations.state,
          locationZipCode: locations.zipCode,
          locationPhone: locations.phone,
          locationNpi: locations.npi,
          locationType: locations.locationType,
        })
        .from(healthSystems)
        .leftJoin(locations, eq(locations.healthSystemId, healthSystems.id))
        .where(eq(healthSystems.subscriptionStatus, 'active'))
        .orderBy(healthSystems.name, locations.name);

      // Group by health system
      const groupedSystems = healthSystemsWithLocations.reduce((acc: any[], row) => {
        const existing = acc.find(hs => hs.id === row.healthSystemId);
        if (existing) {
          if (row.locationId) {
            existing.locations.push({
              id: row.locationId,
              name: row.locationName,
              address: row.locationAddress,
              city: row.locationCity,
              state: row.locationState,
              zipCode: row.locationZipCode,
              phone: row.locationPhone,
              npi: row.locationNpi,
              locationType: row.locationType,
            });
          }
        } else {
          acc.push({
            id: row.healthSystemId,
            name: row.healthSystemName,
            systemType: row.healthSystemType,
            subscriptionTier: row.subscriptionTier,
            locations: row.locationId ? [{
              id: row.locationId,
              name: row.locationName,
              address: row.locationAddress,
              city: row.locationCity,
              state: row.locationState,
              zipCode: row.locationZipCode,
              phone: row.locationPhone,
              npi: row.locationNpi,
              locationType: row.locationType,
            }] : []
          });
        }
        return acc;
      }, []);

      // Filter by search term
      let filtered = groupedSystems;
      if (search) {
        filtered = groupedSystems.filter(hs => {
          // Check health system name
          if (hs.name.toLowerCase().includes(search)) return true;
          
          // Check location names, cities, addresses
          return hs.locations.some((loc: any) => 
            loc.name.toLowerCase().includes(search) ||
            loc.city.toLowerCase().includes(search) ||
            loc.address.toLowerCase().includes(search) ||
            loc.state.toLowerCase().includes(search) ||
            loc.npi?.includes(search)
          );
        });
      }

      // TODO: Sort by distance if user location provided
      // This would require lat/lng in the database or a geocoding service

      res.json({
        healthSystems: filtered,
        totalLocations: filtered.reduce((sum, hs) => sum + hs.locations.length, 0),
        userLocation: userLat && userLng ? { lat: userLat, lng: userLng } : null
      });
    } catch (error) {
      console.error("Error fetching health systems with locations:", error);
      res.status(500).json({ message: "Failed to fetch health systems with locations" });
    }
  });

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

      // CRITICAL: Verify user and location are in the same health system
      const [user] = await db
        .select({ healthSystemId: users.healthSystemId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [location] = await db
        .select({ healthSystemId: locations.healthSystemId })
        .from(locations)
        .where(eq(locations.id, data.locationId))
        .limit(1);

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Prevent cross-health-system assignments
      if (user.healthSystemId !== location.healthSystemId) {
        console.error(`❌ [AdminUserRoutes] SECURITY: Attempted cross-health-system assignment - User ${userId} (HS: ${user.healthSystemId}) to Location ${data.locationId} (HS: ${location.healthSystemId})`);
        return res.status(403).json({ 
          message: "Security violation: Cannot assign user to location in different health system" 
        });
      }

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
      console.log(`🗑️ [AdminUserRoutes] Attempting to delete user ${userId}`);

      // Don't allow deleting the admin user
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        console.log(`❌ [AdminUserRoutes] User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.username === "admin") {
        console.log(`❌ [AdminUserRoutes] Attempted to delete system admin user`);
        return res.status(400).json({ message: "Cannot delete the system admin user" });
      }

      // Check for dependencies before deletion
      console.log(`🔍 [AdminUserRoutes] Checking for user dependencies...`);
      
      // Check encounters
      const encounterCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(encounters)
        .where(eq(encounters.providerId, userId));
      
      console.log(`📊 [AdminUserRoutes] User ${userId} has ${encounterCount[0].count} encounters`);

      // Check user locations
      const locationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userLocations)
        .where(eq(userLocations.userId, userId));
      
      console.log(`📊 [AdminUserRoutes] User ${userId} has ${locationCount[0].count} location assignments`);

      // Check patient assignments (if they're a primary provider)
      const patientCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(eq(patients.primaryProviderId, userId));
      
      console.log(`📊 [AdminUserRoutes] User ${userId} is primary provider for ${patientCount[0].count} patients`);

      // If there are dependencies, provide detailed error
      const dependencies = [];
      if (encounterCount[0].count > 0) {
        dependencies.push(`${encounterCount[0].count} encounter(s)`);
      }
      if (patientCount[0].count > 0) {
        dependencies.push(`primary provider for ${patientCount[0].count} patient(s)`);
      }

      if (dependencies.length > 0) {
        const message = `Cannot delete user ${user.username}. They have: ${dependencies.join(', ')}. Please reassign these records before deletion.`;
        console.log(`❌ [AdminUserRoutes] ${message}`);
        return res.status(400).json({ 
          message,
          details: {
            encounters: encounterCount[0].count,
            patients: patientCount[0].count,
            locations: locationCount[0].count
          }
        });
      }

      // Delete user locations first (no foreign key constraint)
      if (locationCount[0].count > 0) {
        console.log(`🗑️ [AdminUserRoutes] Deleting ${locationCount[0].count} location assignments for user ${userId}`);
        await db.delete(userLocations).where(eq(userLocations.userId, userId));
      }

      // Now delete the user
      console.log(`🗑️ [AdminUserRoutes] Deleting user ${userId} (${user.username})`);
      await db.delete(users).where(eq(users.id, userId));

      console.log(`✅ [AdminUserRoutes] Successfully deleted user ${userId} (${user.username})`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ [AdminUserRoutes] Error deleting user:", error);
      
      // Check for specific constraint violations
      if (error.code === '23503') {
        const constraintMessages: Record<string, string> = {
          'encounters_provider_id_users_id_fk': 'User has associated encounters',
          'patients_primary_provider_id_users_id_fk': 'User is a primary provider for patients',
          'user_locations_user_id_users_id_fk': 'User has location assignments'
        };
        
        const message = constraintMessages[error.constraint] || `Database constraint violation: ${error.constraint}`;
        console.log(`❌ [AdminUserRoutes] Constraint violation: ${message}`);
        
        return res.status(400).json({ 
          message: `Cannot delete user: ${message}. Please reassign or remove these associations first.`,
          constraint: error.constraint,
          detail: error.detail
        });
      }
      
      res.status(500).json({ message: "Failed to delete user", error: error.message });
    }
  });

  console.log("✅ [AdminUserRoutes] Admin user routes registered");
}