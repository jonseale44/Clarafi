/**
 * Consolidated Lab Order Routes
 * Direct lab order creation in labOrders table without duplication
 */

import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { labOrders, labResults } from "@shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import { InsertLabOrder } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Validation schema for lab order creation
const createLabOrderSchema = z.object({
  patientId: z.number(),
  encounterId: z.number(),
  testName: z.string(),
  testCode: z.string().optional(),
  loincCode: z.string().optional(),
  priority: z.enum(["stat", "urgent", "routine"]).default("routine"),
  clinicalIndication: z.string().optional(),
  specimenType: z.string().optional(),
  fastingRequired: z.boolean().default(false),
  orderStatus: z.enum(["draft", "signed", "transmitted", "completed", "cancelled"]).default("draft"),
  orderedBy: z.number(),
  icd10Codes: z.array(z.string()).optional(),
});

/**
 * POST /api/lab-orders/create
 * Create a lab order directly in labOrders table
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const userId = (req as any).user?.id;
    const validatedData = createLabOrderSchema.parse(req.body);

    // Generate standardized codes if not provided
    const testMapping = getTestMapping(validatedData.testName);
    
    const labOrderData: InsertLabOrder = {
      patientId: validatedData.patientId,
      encounterId: validatedData.encounterId,
      testName: validatedData.testName,
      testCode: validatedData.testCode || testMapping.testCode,
      loincCode: validatedData.loincCode || testMapping.loincCode,
      cptCode: testMapping.cptCode,
      testCategory: testMapping.category,
      priority: validatedData.priority,
      clinicalIndication: validatedData.clinicalIndication || "Laboratory testing as ordered",
      specimenType: validatedData.specimenType || testMapping.specimenType,
      fastingRequired: validatedData.fastingRequired,
      orderStatus: validatedData.orderStatus,
      orderedBy: validatedData.orderedBy || userId,
      orderedAt: new Date(),
      icd10Codes: validatedData.icd10Codes,
    };

    console.log(`🧪 [ConsolidatedLab] Creating direct lab order for patient ${validatedData.patientId}`);
    
    const [newLabOrder] = await db.insert(labOrders).values(labOrderData).returning();
    
    console.log(`✅ [ConsolidatedLab] Created lab order ${newLabOrder.id} directly in labOrders table`);

    // If order is signed, trigger external lab processing
    if (newLabOrder.orderStatus === "signed") {
      console.log(`🔄 [ConsolidatedLab] Triggering external lab processing for signed order ${newLabOrder.id}`);
      
      // Import dynamically to avoid circular dependencies
      const { labSimulator } = await import("./lab-simulator-service");
      
      setImmediate(async () => {
        try {
          await labSimulator.simulateLabOrderTransmission(newLabOrder.id);
          console.log(`✅ [ConsolidatedLab] Lab simulation started for order ${newLabOrder.id}`);
        } catch (error) {
          console.error(`❌ [ConsolidatedLab] Failed to start lab simulation:`, error);
        }
      });
    }

    return APIResponseHandler.success(res, newLabOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return APIResponseHandler.badRequest(res, "Validation error", error.errors);
    }
    console.error("Error creating lab order:", error);
    return APIResponseHandler.error(res, "CREATE_LAB_ORDER_ERROR", "Failed to create lab order");
  }
});

/**
 * GET /api/lab-orders/patient/:patientId
 * Get all lab orders for a patient (from labOrders table only)
 */
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    const patientLabOrders = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));

    // Check for any associated results
    const ordersWithResultCount = await Promise.all(
      patientLabOrders.map(async (order) => {
        const resultCount = await db
          .select({ count: labResults.id })
          .from(labResults)
          .where(eq(labResults.labOrderId, order.id));
        
        return {
          ...order,
          hasResults: resultCount.length > 0,
          resultCount: resultCount.length
        };
      })
    );

    return APIResponseHandler.success(res, ordersWithResultCount);
  } catch (error) {
    console.error("Error fetching patient lab orders:", error);
    return APIResponseHandler.error(res, "FETCH_LAB_ORDERS_ERROR", "Failed to fetch lab orders");
  }
});

/**
 * PUT /api/lab-orders/:orderId/sign
 * Sign a lab order and trigger external processing
 */
router.put("/:orderId/sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    const userId = (req as any).user?.id;

    // Update order status to signed
    const [updatedOrder] = await db
      .update(labOrders)
      .set({
        orderStatus: "signed",
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(labOrders.id, orderId),
          eq(labOrders.orderStatus, "draft")
        )
      )
      .returning();

    if (!updatedOrder) {
      return APIResponseHandler.notFound(res, "Lab order not found or already signed");
    }

    // Trigger external lab processing
    console.log(`🔄 [ConsolidatedLab] Triggering external lab processing for newly signed order ${orderId}`);
    
    const { labSimulator } = await import("./lab-simulator-service");
    
    setImmediate(async () => {
      try {
        await labSimulator.simulateLabOrderTransmission(orderId);
        console.log(`✅ [ConsolidatedLab] Lab simulation started for signed order ${orderId}`);
      } catch (error) {
        console.error(`❌ [ConsolidatedLab] Failed to start lab simulation:`, error);
      }
    });

    return APIResponseHandler.success(res, updatedOrder);
  } catch (error) {
    console.error("Error signing lab order:", error);
    return APIResponseHandler.error(res, "SIGN_LAB_ORDER_ERROR", "Failed to sign lab order");
  }
});

/**
 * DELETE /api/lab-orders/:orderId
 * Cancel a lab order (only if not yet transmitted)
 */
router.delete("/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    const userId = (req as any).user?.id;

    // Update order status to cancelled (only if draft or signed)
    const [cancelledOrder] = await db
      .update(labOrders)
      .set({
        orderStatus: "cancelled",
        discontinuedAt: new Date(),
        discontinuedBy: userId,
        discontinuedReason: req.body.reason || "Cancelled by provider",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(labOrders.id, orderId),
          isNull(labOrders.transmittedAt) // Can't cancel if already transmitted
        )
      )
      .returning();

    if (!cancelledOrder) {
      return APIResponseHandler.badRequest(res, "Cannot cancel - order already transmitted to lab");
    }

    return APIResponseHandler.success(res, cancelledOrder);
  } catch (error) {
    console.error("Error cancelling lab order:", error);
    return APIResponseHandler.error(res, "CANCEL_LAB_ORDER_ERROR", "Failed to cancel lab order");
  }
});

// Helper function to get test mapping
function getTestMapping(testName: string) {
  const testMappings: Record<string, any> = {
    'Complete Blood Count': {
      testCode: 'CBC',
      loincCode: '58410-2',
      cptCode: '85025',
      category: 'hematology',
      specimenType: 'whole_blood',
    },
    'Comprehensive Metabolic Panel': {
      testCode: 'CMP',
      loincCode: '24323-8',
      cptCode: '80053',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Lipid Panel': {
      testCode: 'LIPID',
      loincCode: '24331-1',
      cptCode: '80061',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Lipase': {
      testCode: 'LIPASE',
      loincCode: '3040-3',
      cptCode: '83690',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Thyroid Stimulating Hormone': {
      testCode: 'TSH',
      loincCode: '3016-3',
      cptCode: '84443',
      category: 'endocrinology',
      specimenType: 'serum',
    }
  };
  
  return testMappings[testName] || {
    testCode: testName.replace(/\s+/g, '_').toUpperCase().substring(0, 20),
    loincCode: `CUSTOM_${Date.now()}`,
    cptCode: '99999',
    category: 'other',
    specimenType: 'serum',
  };
}

export default router;