/**
 * Lab Status Dashboard Routes
 * Real-time monitoring of lab order lifecycle
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { labOrders, labResults, orders } from "@shared/schema";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import { labSimulator } from "./lab-simulator-service";

const router = Router();

/**
 * GET /api/lab-status/patient/:patientId
 * Get comprehensive lab order status for a patient
 */
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Valid patient ID is required");
    }

    // Get regular lab orders
    const regularLabOrders = await db
      .select({
        id: orders.id,
        type: orders.orderType,
        testName: orders.testName,
        orderDetails: orders.orderDetails,
        status: orders.orderStatus,
        orderedAt: orders.createdAt,
        source: 'regular'
      })
      .from(orders)
      .where(
        and(
          eq(orders.patientId, patientId),
          eq(orders.orderType, 'lab')
        )
      )
      .orderBy(desc(orders.createdAt));

    // Get lab_orders table entries
    const labOrderEntries = await db
      .select({
        id: labOrders.id,
        type: labOrders.testCategory,
        testName: labOrders.testName,
        orderDetails: labOrders.clinicalIndication,
        status: labOrders.orderStatus,
        orderedAt: labOrders.orderedAt,
        externalOrderId: labOrders.externalOrderId,
        targetLab: labOrders.targetLabId,
        source: 'lab_orders'
      })
      .from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));

    // Get active simulations
    const activeSimulations = labSimulator.getAllActiveSimulations();
    
    // Combine and enhance with simulation data
    const combinedOrders = [
      ...regularLabOrders.map(order => ({
        ...order,
        simulationStatus: null,
        externalLab: null
      })),
      ...labOrderEntries.map(order => {
        const simulation = activeSimulations.find(sim => sim.orderId === order.id);
        return {
          ...order,
          simulationStatus: simulation?.currentStatus || null,
          externalLab: simulation?.targetLab || null,
          processingSteps: simulation?.processingSteps || null
        };
      })
    ];

    return APIResponseHandler.success(res, {
      orders: combinedOrders,
      regularOrdersCount: regularLabOrders.length,
      labOrdersCount: labOrderEntries.length,
      activeSimulations: activeSimulations.length
    });

  } catch (error) {
    console.error("Error fetching lab status:", error);
    return APIResponseHandler.error(res, "LAB_STATUS_ERROR", "Failed to fetch lab status");
  }
});

/**
 * POST /api/lab-status/trigger-simulation/:orderId
 * Manually trigger external lab simulation for an existing order
 */
router.post("/trigger-simulation/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    const { orderType = 'regular' } = req.body;

    if (orderType === 'regular') {
      // Process regular order through lab integration
      const { labOrderIntegration } = await import("./lab-order-integration-service");
      await labOrderIntegration.processSignedLabOrder(orderId);
      
      return APIResponseHandler.success(res, {
        message: `Triggered external lab simulation for regular order ${orderId}`,
        orderId,
        type: 'regular'
      });
    } else {
      // Direct lab order simulation
      const simulation = await labSimulator.simulateLabOrderTransmission(orderId);
      
      return APIResponseHandler.success(res, {
        message: `Started simulation for lab order ${orderId}`,
        simulation
      });
    }

  } catch (error) {
    console.error("Error triggering simulation:", error);
    return APIResponseHandler.error(res, "SIMULATION_TRIGGER_ERROR", "Failed to trigger simulation");
  }
});

/**
 * GET /api/lab-status/active-simulations
 * Get all currently active lab simulations
 */
router.get("/active-simulations", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const activeSimulations = labSimulator.getAllActiveSimulations();
    
    return APIResponseHandler.success(res, {
      simulations: activeSimulations,
      count: activeSimulations.length
    });

  } catch (error) {
    console.error("Error fetching active simulations:", error);
    return APIResponseHandler.error(res, "ACTIVE_SIMS_ERROR", "Failed to fetch active simulations");
  }
});

/**
 * GET /api/lab-status/encounter/:encounterId
 * Get lab order status for a specific encounter
 */
router.get("/encounter/:encounterId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const encounterId = parseInt(req.params.encounterId);
    if (!encounterId) {
      return APIResponseHandler.badRequest(res, "Valid encounter ID is required");
    }

    // Get regular orders for this encounter
    const encounterOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.encounterId, encounterId),
          eq(orders.orderType, 'lab')
        )
      )
      .orderBy(desc(orders.createdAt));

    // Get lab orders for this encounter
    const encounterLabOrders = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.encounterId, encounterId))
      .orderBy(desc(labOrders.orderedAt));

    // Get active simulations for these orders
    const activeSimulations = labSimulator.getAllActiveSimulations();
    const encounterSimulations = activeSimulations.filter(sim => 
      encounterLabOrders.some(order => order.id === sim.orderId)
    );

    return APIResponseHandler.success(res, {
      regularOrders: encounterOrders,
      labOrders: encounterLabOrders,
      activeSimulations: encounterSimulations,
      summary: {
        totalOrders: encounterOrders.length + encounterLabOrders.length,
        activeSimulations: encounterSimulations.length,
        pendingOrders: encounterOrders.filter(o => o.orderStatus === 'approved').length
      }
    });

  } catch (error) {
    console.error("Error fetching encounter lab status:", error);
    return APIResponseHandler.error(res, "ENCOUNTER_LAB_STATUS_ERROR", "Failed to fetch encounter lab status");
  }
});

export default router;