import { Router } from "express";
import { db } from "./db.js";
import { signedOrders, orders, patients, users } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler.js";

const router = Router();

/**
 * GET /api/patients/:patientId/signed-orders
 * Get all signed orders for a patient with delivery status
 */
router.get("/:patientId/signed-orders", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    console.log(`📋 [SignedOrders] Fetching signed orders for patient ${patientId}`);

    // Get signed orders with full order details
    const signedOrdersData = await db
      .select({
        signedOrder: signedOrders,
        order: orders,
        patient: patients,
        signedByUser: users
      })
      .from(signedOrders)
      .leftJoin(orders, eq(signedOrders.orderId, orders.id))
      .leftJoin(patients, eq(signedOrders.patientId, patients.id))
      .leftJoin(users, eq(signedOrders.signedBy, users.id))
      .where(eq(signedOrders.patientId, patientId))
      .orderBy(desc(signedOrders.signedAt));

    console.log(`📋 [SignedOrders] Found ${signedOrdersData.length} signed orders`);

    return APIResponseHandler.success(res, signedOrdersData);

  } catch (error: any) {
    console.error("❌ [SignedOrders] Error fetching signed orders:", error);
    return APIResponseHandler.error(res, "FETCH_SIGNED_ORDERS_ERROR", "Failed to fetch signed orders", error.message);
  }
});

/**
 * POST /api/signed-orders/:signedOrderId/change-delivery
 * Change delivery method for a signed order (if allowed)
 */
router.post("/:signedOrderId/change-delivery", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const signedOrderId = parseInt(req.params.signedOrderId);
    const { newDeliveryMethod, reason } = req.body;
    const userId = (req.user as any).id;

    console.log(`📋 [SignedOrders] Changing delivery method for signed order ${signedOrderId}`);
    console.log(`📋 [SignedOrders] New method: ${newDeliveryMethod}, Reason: ${reason}`);

    // Get the signed order
    const [existingSignedOrder] = await db
      .select()
      .from(signedOrders)
      .where(eq(signedOrders.id, signedOrderId))
      .limit(1);

    if (!existingSignedOrder) {
      return APIResponseHandler.notFound(res, "Signed order");
    }

    if (!existingSignedOrder.canChangeDelivery) {
      return APIResponseHandler.conflict(res, `Cannot change delivery method: ${existingSignedOrder.deliveryLockReason}`);
    }

    // Create audit trail entry
    const changeEntry = {
      timestamp: new Date().toISOString(),
      fromMethod: existingSignedOrder.deliveryMethod,
      toMethod: newDeliveryMethod,
      changedBy: userId,
      reason: reason || 'Provider request'
    };

    const currentChanges = Array.isArray(existingSignedOrder.deliveryChanges) 
      ? existingSignedOrder.deliveryChanges 
      : [];

    // Update signed order with new delivery method
    const [updatedSignedOrder] = await db
      .update(signedOrders)
      .set({
        deliveryMethod: newDeliveryMethod,
        deliveryStatus: 'pending',
        deliveryChanges: [...currentChanges, changeEntry],
        updatedAt: new Date()
      })
      .where(eq(signedOrders.id, signedOrderId))
      .returning();

    console.log(`📋 [SignedOrders] Successfully changed delivery method for signed order ${signedOrderId}`);

    // TODO: Trigger new delivery processing based on new method
    // const { orderDeliveryService } = await import('./order-delivery-service.js');
    // await orderDeliveryService.processOrderDelivery([existingSignedOrder.orderId], existingSignedOrder.patientId, userId);

    return APIResponseHandler.success(res, updatedSignedOrder);

  } catch (error: any) {
    console.error("❌ [SignedOrders] Error changing delivery method:", error);
    return APIResponseHandler.error(res, "CHANGE_DELIVERY_ERROR", "Failed to change delivery method", error.message);
  }
});

/**
 * GET /api/signed-orders/:signedOrderId/delivery-status
 * Get detailed delivery status for a signed order
 */
router.get("/:signedOrderId/delivery-status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const signedOrderId = parseInt(req.params.signedOrderId);

    const [signedOrder] = await db
      .select()
      .from(signedOrders)
      .where(eq(signedOrders.id, signedOrderId))
      .limit(1);

    if (!signedOrder) {
      return APIResponseHandler.notFound(res, "Signed order");
    }

    // Add computed status information
    const statusInfo = {
      ...signedOrder,
      canChangeDelivery: signedOrder.canChangeDelivery,
      timeSinceSigned: Date.now() - new Date(signedOrder.signedAt).getTime(),
      changeWindow: signedOrder.orderType === 'medication' ? 30 * 60 * 1000 : null, // 30 minutes for medications
    };

    return APIResponseHandler.success(res, statusInfo);

  } catch (error: any) {
    console.error("❌ [SignedOrders] Error fetching delivery status:", error);
    return APIResponseHandler.error(res, "FETCH_DELIVERY_STATUS_ERROR", "Failed to fetch delivery status", error.message);
  }
});

export default router;