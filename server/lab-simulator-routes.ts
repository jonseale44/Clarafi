/**
 * Lab Simulator API Routes
 * Endpoints for testing the complete lab order lifecycle
 */

import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { labOrders, labResults, patients, encounters } from "@shared/schema";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import { labSimulator } from "./lab-simulator-service";

const router = Router();

/**
 * POST /api/lab-simulator/place-order
 * Create and immediately simulate a lab order
 */
router.post("/place-order", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { patientId, encounterId, testCode, testName, priority = 'routine', clinicalIndication } = req.body;

    if (!patientId || !encounterId || !testCode || !testName) {
      return APIResponseHandler.badRequest(res, "Missing required fields: patientId, encounterId, testCode, testName");
    }

    // Create the lab order
    const newOrder = await db.insert(labOrders).values({
      patientId,
      encounterId,
      loincCode: `LOINC_${testCode}`,
      testCode,
      testName,
      testCategory: getTestCategory(testCode),
      priority,
      clinicalIndication: clinicalIndication || `Simulated order for ${testName}`,
      orderedBy: req.user.id,
      orderStatus: 'draft',
      specimenType: getSpecimenType(testCode),
      fastingRequired: getFastingRequirement(testCode)
    }).returning();

    const orderId = newOrder[0].id;

    // Immediately start simulation
    const simulation = await labSimulator.simulateLabOrderTransmission(orderId);

    return APIResponseHandler.success(res, {
      order: newOrder[0],
      simulation,
      message: `Lab order ${orderId} created and simulation started`
    });

  } catch (error) {
    console.error("Error creating simulated lab order:", error);
    return APIResponseHandler.error(res, "ORDER_CREATION_ERROR", "Failed to create and simulate lab order");
  }
});

/**
 * POST /api/lab-simulator/simulate-existing/:orderId
 * Start simulation for an existing lab order
 */
router.post("/simulate-existing/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    if (!orderId) {
      return APIResponseHandler.badRequest(res, "Valid order ID is required");
    }

    // Check if order exists
    const orderResult = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1);
    if (!orderResult.length) {
      return APIResponseHandler.notFound(res, `Lab order ${orderId}`);
    }

    // Start simulation
    const simulation = await labSimulator.simulateLabOrderTransmission(orderId);

    return APIResponseHandler.success(res, {
      simulation,
      message: `Simulation started for order ${orderId}`
    });

  } catch (error) {
    console.error("Error starting simulation:", error);
    return APIResponseHandler.error(res, "SIMULATION_ERROR", "Failed to start simulation");
  }
});

/**
 * GET /api/lab-simulator/status/:orderId
 * Get simulation status for a specific order
 */
router.get("/status/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    if (!orderId) {
      return APIResponseHandler.badRequest(res, "Valid order ID is required");
    }

    const simulation = labSimulator.getSimulationStatus(orderId);
    if (!simulation) {
      return APIResponseHandler.notFound(res, `Simulation for order ${orderId}`);
    }

    return APIResponseHandler.success(res, simulation);

  } catch (error) {
    console.error("Error getting simulation status:", error);
    return APIResponseHandler.error(res, "STATUS_ERROR", "Failed to get simulation status");
  }
});

/**
 * GET /api/lab-simulator/all-active
 * Get all active simulations
 */
router.get("/all-active", async (req: Request, res: Response) => {
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
    console.error("Error getting active simulations:", error);
    return APIResponseHandler.error(res, "ACTIVE_SIMS_ERROR", "Failed to get active simulations");
  }
});

/**
 * POST /api/lab-simulator/create-comprehensive-order-set
 * Create a comprehensive set of lab orders for testing
 */
router.post("/create-comprehensive-order-set", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { patientId, encounterId } = req.body;

    if (!patientId || !encounterId) {
      return APIResponseHandler.badRequest(res, "Missing required fields: patientId, encounterId");
    }

    // Define comprehensive test panel
    const testPanels = [
      // Hematology
      { testCode: 'CBC', testName: 'Complete Blood Count', category: 'hematology', priority: 'routine' },
      { testCode: 'PT', testName: 'Prothrombin Time', category: 'hematology', priority: 'routine' },
      { testCode: 'PTT', testName: 'Partial Thromboplastin Time', category: 'hematology', priority: 'routine' },
      
      // Chemistry
      { testCode: 'CMP', testName: 'Comprehensive Metabolic Panel', category: 'chemistry', priority: 'routine' },
      { testCode: 'LIPID', testName: 'Lipid Panel', category: 'chemistry', priority: 'routine' },
      { testCode: 'HBA1C', testName: 'Hemoglobin A1c', category: 'chemistry', priority: 'routine' },
      
      // Endocrine
      { testCode: 'TSH', testName: 'Thyroid Stimulating Hormone', category: 'endocrine', priority: 'routine' },
      { testCode: 'T4', testName: 'Thyroxine (T4)', category: 'endocrine', priority: 'routine' },
      
      // Cardiac
      { testCode: 'TROP', testName: 'Troponin I', category: 'cardiac', priority: 'stat' },
      { testCode: 'BNP', testName: 'B-type Natriuretic Peptide', category: 'cardiac', priority: 'urgent' },
      
      // Infectious Disease
      { testCode: 'CULTURE', testName: 'Blood Culture', category: 'microbiology', priority: 'urgent' },
      { testCode: 'STREP', testName: 'Strep A Rapid Test', category: 'microbiology', priority: 'stat' }
    ];

    const createdOrders = [];
    const simulations = [];

    for (const test of testPanels) {
      const order = await db.insert(labOrders).values({
        patientId,
        encounterId,
        loincCode: `LOINC_${test.testCode}`,
        testCode: test.testCode,
        testName: test.testName,
        testCategory: test.category,
        priority: test.priority,
        clinicalIndication: 'Comprehensive testing panel for diagnostic workup',
        orderedBy: req.user.id,
        orderStatus: 'draft',
        specimenType: getSpecimenType(test.testCode),
        fastingRequired: getFastingRequirement(test.testCode)
      }).returning();

      createdOrders.push(order[0]);

      // Start simulation with staggered timing
      setTimeout(async () => {
        const simulation = await labSimulator.simulateLabOrderTransmission(order[0].id);
        simulations.push(simulation);
      }, Math.random() * 5000); // Random delay up to 5 seconds
    }

    return APIResponseHandler.success(res, {
      orders: createdOrders,
      message: `Created ${createdOrders.length} lab orders with simulations`,
      orderCount: createdOrders.length
    });

  } catch (error) {
    console.error("Error creating comprehensive order set:", error);
    return APIResponseHandler.error(res, "ORDER_SET_ERROR", "Failed to create comprehensive order set");
  }
});

/**
 * POST /api/lab-simulator/cancel/:orderId
 * Cancel a running simulation
 */
router.post("/cancel/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    if (!orderId) {
      return APIResponseHandler.badRequest(res, "Valid order ID is required");
    }

    const cancelled = labSimulator.cancelSimulation(orderId);
    
    if (cancelled) {
      // Update order status in database
      await db.update(labOrders)
        .set({ orderStatus: 'cancelled' })
        .where(eq(labOrders.id, orderId));

      return APIResponseHandler.success(res, {
        message: `Simulation for order ${orderId} cancelled`,
        orderId
      });
    } else {
      return APIResponseHandler.notFound(res, `Active simulation for order ${orderId}`);
    }

  } catch (error) {
    console.error("Error cancelling simulation:", error);
    return APIResponseHandler.error(res, "CANCEL_ERROR", "Failed to cancel simulation");
  }
});

/**
 * GET /api/lab-simulator/test-definitions
 * Get available test definitions for simulation
 */
router.get("/test-definitions", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const testDefinitions = {
      hematology: [
        { code: 'CBC', name: 'Complete Blood Count', turnaround: '2-4 hours', fasting: false },
        { code: 'PT', name: 'Prothrombin Time', turnaround: '1-2 hours', fasting: false },
        { code: 'PTT', name: 'Partial Thromboplastin Time', turnaround: '1-2 hours', fasting: false }
      ],
      chemistry: [
        { code: 'CMP', name: 'Comprehensive Metabolic Panel', turnaround: '2-4 hours', fasting: true },
        { code: 'BMP', name: 'Basic Metabolic Panel', turnaround: '2-4 hours', fasting: true },
        { code: 'LIPID', name: 'Lipid Panel', turnaround: '2-4 hours', fasting: true },
        { code: 'HBA1C', name: 'Hemoglobin A1c', turnaround: '4-6 hours', fasting: false }
      ],
      endocrine: [
        { code: 'TSH', name: 'Thyroid Stimulating Hormone', turnaround: '4-6 hours', fasting: false },
        { code: 'T4', name: 'Thyroxine (T4)', turnaround: '4-6 hours', fasting: false }
      ],
      cardiac: [
        { code: 'TROP', name: 'Troponin I', turnaround: '30 minutes', fasting: false },
        { code: 'BNP', name: 'B-type Natriuretic Peptide', turnaround: '1 hour', fasting: false }
      ],
      microbiology: [
        { code: 'CULTURE', name: 'Blood Culture', turnaround: '24-48 hours', fasting: false },
        { code: 'STREP', name: 'Strep A Rapid Test', turnaround: '15 minutes', fasting: false }
      ]
    };

    return APIResponseHandler.success(res, testDefinitions);

  } catch (error) {
    console.error("Error getting test definitions:", error);
    return APIResponseHandler.error(res, "TEST_DEFS_ERROR", "Failed to get test definitions");
  }
});

// Helper functions
function getTestCategory(testCode: string): string {
  const categories = {
    'CBC': 'hematology',
    'PT': 'hematology',
    'PTT': 'hematology',
    'CMP': 'chemistry',
    'BMP': 'chemistry',
    'LIPID': 'chemistry',
    'HBA1C': 'chemistry',
    'TSH': 'endocrine',
    'T4': 'endocrine',
    'TROP': 'cardiac',
    'BNP': 'cardiac',
    'CULTURE': 'microbiology',
    'STREP': 'microbiology'
  };
  return categories[testCode as keyof typeof categories] || 'chemistry';
}

function getSpecimenType(testCode: string): string {
  const specimenTypes = {
    'CBC': 'whole_blood',
    'PT': 'plasma',
    'PTT': 'plasma',
    'CMP': 'serum',
    'BMP': 'serum',
    'LIPID': 'serum',
    'HBA1C': 'whole_blood',
    'TSH': 'serum',
    'T4': 'serum',
    'TROP': 'serum',
    'BNP': 'plasma',
    'CULTURE': 'whole_blood',
    'STREP': 'throat_swab'
  };
  return specimenTypes[testCode as keyof typeof specimenTypes] || 'serum';
}

function getFastingRequirement(testCode: string): boolean {
  const fastingTests = ['CMP', 'BMP', 'LIPID'];
  return fastingTests.includes(testCode);
}

export default router;