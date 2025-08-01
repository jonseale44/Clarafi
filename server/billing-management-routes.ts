// Billing Management Routes
// Provides administrative endpoints for viewing and managing per-user billing

import { Request, Response, Router } from 'express';
import { BillingCalculationService } from './billing-calculation-service.js';
import { db } from './db.js';
import { healthSystems } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export function registerBillingRoutes(app: Router) {
  console.log('💰 [BillingRoutes] Registering billing management routes...');

  // Get current billing calculation for a health system
  app.get('/api/billing/health-systems/:healthSystemId/current', requireAuth, async (req: Request, res: Response) => {
    try {
      const healthSystemId = parseInt(req.params.healthSystemId);
      const user = req.user as any;

      // Check if user has access to this health system
      if (user.role !== 'admin' && user.healthSystemId !== healthSystemId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const billing = await BillingCalculationService.calculateMonthlyBilling(healthSystemId);
      res.json(billing);
    } catch (error: any) {
      console.error('Error calculating billing:', error);
      res.status(500).json({ error: 'Failed to calculate billing' });
    }
  });

  // Get billing report for a health system
  app.get('/api/billing/health-systems/:healthSystemId/report', requireAuth, async (req: Request, res: Response) => {
    try {
      const healthSystemId = parseInt(req.params.healthSystemId);
      const user = req.user as any;

      // Check if user has access to this health system
      if (user.role !== 'admin' && user.healthSystemId !== healthSystemId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const report = await BillingCalculationService.generateBillingReport(healthSystemId);
      res.json(report);
    } catch (error: any) {
      console.error('Error generating billing report:', error);
      res.status(500).json({ error: 'Failed to generate billing report' });
    }
  });

  // Get all health systems with billing info (admin only)
  app.get('/api/billing/health-systems', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get all health systems with billing info
      const systems = await db.select().from(healthSystems).orderBy(healthSystems.name);
      
      // Calculate billing for each system
      const systemsWithBilling = await Promise.all(
        systems.map(async (system) => {
          try {
            const billing = await BillingCalculationService.calculateMonthlyBilling(system.id);
            return {
              id: system.id,
              name: system.name,
              tier: system.tier,
              activeUserCount: system.activeUserCount,
              monthlyTotal: billing.monthlyTotal,
              userCounts: billing.activeUsers,
              lastUpdated: (system.activeUserCount as any)?.lastUpdated || null
            };
          } catch (error) {
            console.error(`Error calculating billing for system ${system.id}:`, error);
            return {
              id: system.id,
              name: system.name,
              tier: system.tier,
              activeUserCount: system.activeUserCount,
              monthlyTotal: 0,
              userCounts: {
                providers: 0,
                clinicalStaff: 0,
                adminStaff: 0,
                readOnly: 0
              },
              lastUpdated: null
            };
          }
        })
      );

      res.json(systemsWithBilling);
    } catch (error: any) {
      console.error('Error fetching health systems billing:', error);
      res.status(500).json({ error: 'Failed to fetch billing information' });
    }
  });

  // Update billing calculation for a health system
  app.post('/api/billing/health-systems/:healthSystemId/recalculate', requireAuth, async (req: Request, res: Response) => {
    try {
      const healthSystemId = parseInt(req.params.healthSystemId);
      const user = req.user as any;

      // Check if user has access to this health system
      if (user.role !== 'admin' && user.healthSystemId !== healthSystemId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const billing = await BillingCalculationService.calculateMonthlyBilling(healthSystemId);
      
      // Update the active user count in the database
      await db.update(healthSystems)
        .set({
          activeUserCount: {
            providers: billing.activeUsers.providers,
            clinicalStaff: billing.activeUsers.clinicalStaff,
            adminStaff: billing.activeUsers.adminStaff,
            readOnly: billing.activeUsers.readOnly,
            lastUpdated: new Date().toISOString()
          } as any,
          billingDetails: {
            monthlyTotal: billing.monthlyTotal,
            breakdown: billing.breakdown,
            lastCalculated: new Date().toISOString()
          } as any
        })
        .where(eq(healthSystems.id, healthSystemId));

      res.json({ success: true, billing });
    } catch (error: any) {
      console.error('Error recalculating billing:', error);
      res.status(500).json({ error: 'Failed to recalculate billing' });
    }
  });

  console.log('✅ [BillingRoutes] Billing management routes registered');
}