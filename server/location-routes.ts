import { Express } from "express";
import { storage } from "./storage";
import { tenantIsolation } from "./tenant-isolation";

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

      const locations = await storage.getUserLocations(req.user.id);
      res.json(locations);
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