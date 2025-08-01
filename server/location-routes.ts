import { Express } from "express";
import { storage } from "./storage.js";
import { tenantIsolation } from "./tenant-isolation.js";

export function setupLocationRoutes(app: Express) {
  
  // Get all locations for the user's health system
  app.get("/api/locations", tenantIsolation, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const healthSystemId = req.userHealthSystemId!;
      const locations = await storage.getHealthSystemLocations(healthSystemId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });
  
  // Get user's assigned locations
  app.get("/api/user/locations", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // First try to get user's assigned locations
      const assignedLocations = await storage.getUserLocations(req.user.id);
      
      // If user has no assigned locations, return ALL locations from their health system
      if (assignedLocations.length === 0) {
        const healthSystemId = req.user.healthSystemId || req.userHealthSystemId;
        console.log(`📍 User ${req.user.username} has no assigned locations. Returning all locations for health system ${healthSystemId}`);
        
        if (healthSystemId) {
          const allLocations = await storage.getHealthSystemLocations(healthSystemId);
          // Transform to match the expected format from getUserLocations
          const transformedLocations = allLocations.map(loc => ({
            ...loc,
            userId: req.user!.id,
            locationId: loc.id,
            roleAtLocation: 'provider', // Default role for unassigned users
            isPrimary: false,
            canSchedule: true,
            canViewAllPatients: true,
            canCreateOrders: true,
            locationName: loc.name,
            locationShortName: loc.shortName,
            locationType: loc.locationType,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            zipCode: loc.zipCode,
            phone: loc.phone,
            services: loc.services,
            organizationName: null,
            healthSystemName: null
          }));
          return res.json(transformedLocations);
        }
      }
      
      res.json(assignedLocations);
    } catch (error) {
      console.error("Error fetching user locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  // Set user's session location (login location selection)
  app.post("/api/user/session-location", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { locationId, rememberSelection } = req.body;
      
      if (!locationId) {
        return res.status(400).json({ error: "Location ID is required" });
      }

      await storage.setUserSessionLocation(req.user.id, locationId, rememberSelection);
      
      // Get the updated session location with details
      const sessionLocation = await storage.getUserSessionLocation(req.user.id);
      
      res.json({ 
        success: true, 
        sessionLocation,
        message: `Location set to ${sessionLocation?.locationName}` 
      });
    } catch (error) {
      console.error("Error setting session location:", error);
      res.status(500).json({ error: "Failed to set location" });
    }
  });

  // Get user's current session location
  app.get("/api/user/session-location", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const sessionLocation = await storage.getUserSessionLocation(req.user.id);
      res.json(sessionLocation);
    } catch (error) {
      console.error("Error fetching session location:", error);
      res.status(500).json({ error: "Failed to fetch session location" });
    }
  });

  // Clear user's session location (logout)
  app.delete("/api/user/session-location", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.clearUserSessionLocation(req.user.id);
      res.json({ success: true, message: "Session location cleared" });
    } catch (error) {
      console.error("Error clearing session location:", error);
      res.status(500).json({ error: "Failed to clear session location" });
    }
  });
}