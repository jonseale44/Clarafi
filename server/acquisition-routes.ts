import { Router } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { userAcquisition, users } from "../shared/schema.js";
import { desc, eq, gte, and } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";

// Simple admin middleware
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  console.log("🔍 [AcquisitionRoutes] Auth check - req.user:", req.user);
  console.log("🔍 [AcquisitionRoutes] Auth check - req.isAuthenticated:", req.isAuthenticated ? req.isAuthenticated() : 'no method');
  console.log("🔍 [AcquisitionRoutes] Auth check - req.session:", req.session);
  
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin" && req.user.role !== "system_admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const router = Router();

// Get acquisition statistics
router.get("/api/admin/acquisition/stats", requireAdmin, async (req, res) => {
  try {
    const { days = "30", healthSystemId } = req.query;
    
    const stats = await storage.getAcquisitionStats(
      healthSystemId ? parseInt(healthSystemId as string) : undefined,
      parseInt(days as string)
    );
    
    res.json(stats);
  } catch (error) {
    console.error("❌ [AcquisitionRoutes] Error fetching acquisition stats:", error);
    res.status(500).json({ message: "Failed to fetch acquisition statistics" });
  }
});

// Get detailed acquisition records
router.get("/api/admin/acquisition/records", requireAdmin, async (req, res) => {
  try {
    const { healthSystemId } = req.query;
    
    let acquisitions;
    if (healthSystemId) {
      acquisitions = await storage.getUserAcquisitionByHealthSystem(parseInt(healthSystemId as string));
    } else {
      // Get all acquisitions for system admin
      acquisitions = await db
        .select()
        .from(userAcquisition)
        .orderBy(desc(userAcquisition.acquisitionDate))
        .limit(100);
    }
    
    res.json(acquisitions);
  } catch (error) {
    console.error("❌ [AcquisitionRoutes] Error fetching acquisition records:", error);
    res.status(500).json({ message: "Failed to fetch acquisition records" });
  }
});

export default router;