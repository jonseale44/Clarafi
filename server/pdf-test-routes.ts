import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { orders } from "../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { orderDeliveryService } from "./order-delivery-service.js";

const router = Router();

/**
 * POST /api/test/pdf-generation/:patientId
 * Test PDF generation for a specific patient's orders
 */
router.post("/test/pdf-generation/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    const userId = req.user!.id;
    const { orderIds } = req.body;

    console.log(`🧪 [PDFTest] ===== PDF GENERATION TEST START =====`);
    console.log(`🧪 [PDFTest] Patient ID: ${patientId}, User ID: ${userId}`);
    console.log(`🧪 [PDFTest] Order IDs to test: [${orderIds?.join(', ') || 'ALL'}]`);

    // Get orders for testing
    let ordersQuery = db.select().from(orders).where(eq(orders.patientId, patientId));
    
    if (orderIds && orderIds.length > 0) {
      ordersQuery = ordersQuery.where(inArray(orders.id, orderIds));
    }

    const testOrders = await ordersQuery;
    console.log(`🧪 [PDFTest] Found ${testOrders.length} orders for testing`);
    console.log(`🧪 [PDFTest] Orders:`, JSON.stringify(testOrders.map(o => ({
      id: o.id,
      type: o.orderType,
      status: o.orderStatus,
      medicationName: o.medicationName,
      testName: o.testName,
      studyType: o.studyType
    })), null, 2));

    if (testOrders.length === 0) {
      return res.status(404).json({ 
        error: "No orders found for testing",
        patientId,
        orderIds
      });
    }

    // Process the orders through the delivery service
    console.log(`🧪 [PDFTest] Processing orders through delivery service...`);
    const deliveryResults = await orderDeliveryService.processOrderDelivery(
      testOrders.map(o => o.id),
      patientId,
      userId
    );

    console.log(`🧪 [PDFTest] ===== PDF GENERATION TEST COMPLETE =====`);
    console.log(`🧪 [PDFTest] Results count: ${deliveryResults.length}`);
    console.log(`🧪 [PDFTest] Results summary:`, deliveryResults.map(r => ({
      success: r.success,
      deliveryMethod: r.deliveryMethod,
      orderCount: r.orderIds.length,
      hasPDF: !!r.pdfBuffer,
      pdfSize: r.pdfBuffer?.length || 0,
      error: r.error
    })));

    res.json({
      success: true,
      message: "PDF generation test completed",
      patientId,
      ordersProcessed: testOrders.length,
      deliveryResults: deliveryResults.map(r => ({
        success: r.success,
        deliveryMethod: r.deliveryMethod,
        orderIds: r.orderIds,
        filename: r.filename,
        pdfGenerated: !!r.pdfBuffer,
        pdfSize: r.pdfBuffer?.length || 0,
        error: r.error
      }))
    });

  } catch (error) {
    console.error("❌ [PDFTest] PDF generation test failed:", error);
    res.status(500).json({ 
      error: "PDF generation test failed",
      details: error.message
    });
  }
});

/**
 * POST /api/test/sign-and-generate-pdf/:orderId
 * Sign a specific order and trigger PDF generation
 */
router.post("/test/sign-and-generate-pdf/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;

    console.log(`🧪 [PDFSignTest] ===== SIGN AND PDF TEST START =====`);
    console.log(`🧪 [PDFSignTest] Order ID: ${orderId}, User ID: ${userId}`);

    // Get the order
    const orderResult = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderResult.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult[0];
    console.log(`🧪 [PDFSignTest] Order found:`, JSON.stringify({
      id: order.id,
      type: order.orderType,
      status: order.orderStatus,
      patientId: order.patientId
    }, null, 2));

    // Sign the order
    console.log(`🧪 [PDFSignTest] Signing order...`);
    const [signedOrder] = await db
      .update(orders)
      .set({
        orderStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    console.log(`🧪 [PDFSignTest] Order signed successfully`);

    // Trigger PDF generation
    console.log(`🧪 [PDFSignTest] Triggering PDF generation...`);
    await orderDeliveryService.processSignedOrder(orderId, userId);

    console.log(`🧪 [PDFSignTest] ===== SIGN AND PDF TEST COMPLETE =====`);

    res.json({
      success: true,
      message: "Order signed and PDF generation triggered",
      orderId,
      signedOrder: {
        id: signedOrder.id,
        orderType: signedOrder.orderType,
        orderStatus: signedOrder.orderStatus,
        approvedAt: signedOrder.approvedAt
      }
    });

  } catch (error) {
    console.error("❌ [PDFSignTest] Sign and PDF test failed:", error);
    res.status(500).json({ 
      error: "Sign and PDF test failed",
      details: error.message
    });
  }
});

export default router;