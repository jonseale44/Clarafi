import { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      userHealthSystemId?: number;
    }
  }
}

/**
 * Middleware to ensure tenant isolation for multi-tenant SaaS
 * Extracts the user's healthSystemId and attaches it to the request
 * This ensures all queries are automatically scoped to the user's health system
 */
export const tenantIsolation = async (req: Request, res: Response, next: NextFunction) => {
  // Skip tenant isolation for non-authenticated routes
  if (!req.isAuthenticated() || !req.user) {
    return next();
  }

  try {
    // Get the user's health system ID
    const userId = (req.user as any).id;
    
    // Fetch user with healthSystemId
    const [user] = await db.select({
      id: users.id,
      healthSystemId: users.healthSystemId
    })
    .from(users)
    .where(eq(users.id, userId));

    if (!user || !user.healthSystemId) {
      console.error(`❌ [TenantIsolation] User ${userId} has no health system assigned`);
      return res.status(403).json({ 
        error: "Access denied: No health system assigned to user" 
      });
    }

    // Attach tenant context to request
    req.tenantId = user.healthSystemId;
    req.userHealthSystemId = user.healthSystemId;

    console.log(`🔒 [TenantIsolation] User ${userId} accessing data for health system ${user.healthSystemId}`);
    
    next();
  } catch (error) {
    console.error("❌ [TenantIsolation] Error in tenant isolation middleware:", error);
    return res.status(500).json({ 
      error: "Internal server error during tenant validation" 
    });
  }
};

/**
 * Middleware to ensure admin-only access
 * Admins can potentially access cross-tenant data for support purposes
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userRole = (req.user as any).role;
  if (userRole !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};