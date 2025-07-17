/**
 * Lab Order Integration Service
 * Handles automatic external lab transmission when orders are signed
 */

import { db } from "./db.js";
import { labOrders, labResults } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { labSimulator } from "./lab-simulator-service";

export class LabOrderIntegrationService {
  /**
   * Process lab order after signing - automatically send to external lab
   */
  static async processSignedLabOrder(orderId: number): Promise<void> {
    console.log(`🧪 [LabIntegration] Processing signed lab order: ${orderId}`);
    
    try {
      // First check if this is a regular order that needs to be converted to lab order
      const { orders } = await import("@shared/schema");
      const regularOrderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      
      if (regularOrderResult.length && regularOrderResult[0].orderType === 'lab') {
        // Convert regular lab order to lab_orders table for simulation
        const regularOrder = regularOrderResult[0];
        
        const labOrderData = {
          patientId: regularOrder.patientId,
          encounterId: regularOrder.encounterId,
          loincCode: `LOINC_${regularOrder.testCode || 'CBC'}`,
          testCode: regularOrder.testCode || 'CBC',
          testName: regularOrder.testName || regularOrder.orderDetails || 'Complete Blood Count',
          testCategory: 'hematology',
          priority: regularOrder.priority || 'routine',
          clinicalIndication: regularOrder.orderDetails || 'Laboratory testing as ordered',
          orderedBy: regularOrder.orderedBy,
          orderStatus: 'signed',
          specimenType: 'whole_blood',
          fastingRequired: false
        };
        
        // Create corresponding lab order
        const newLabOrder = await db.insert(labOrders).values(labOrderData).returning();
        const labOrderId = newLabOrder[0].id;
        
        console.log(`🔄 [LabIntegration] Converted regular order ${orderId} to lab order ${labOrderId}`);
        
        // Now process the lab order
        const simulation = await labSimulator.simulateLabOrderTransmission(labOrderId);
        console.log(`✅ [LabIntegration] Started simulation for converted order ${labOrderId} -> ${simulation.externalOrderId}`);
        return;
      }

      // Get the order details from lab_orders table
      const orderResult = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1);
      
      if (!orderResult.length) {
        console.log(`❌ [LabIntegration] Lab order ${orderId} not found`);
        return;
      }

      const order = orderResult[0];
      
      // Check if order is eligible for external lab transmission
      if (order.orderStatus !== 'signed') {
        console.log(`⚠️ [LabIntegration] Order ${orderId} status is ${order.orderStatus}, not transmitting`);
        return;
      }

      // Check if already transmitted
      if (order.externalOrderId) {
        console.log(`⚠️ [LabIntegration] Order ${orderId} already transmitted (${order.externalOrderId})`);
        return;
      }

      // Automatically start lab simulation for signed orders
      console.log(`🚀 [LabIntegration] Starting external lab simulation for order ${orderId}`);
      const simulation = await labSimulator.simulateLabOrderTransmission(orderId);
      
      console.log(`✅ [LabIntegration] Order ${orderId} transmitted to ${simulation.targetLab} as ${simulation.externalOrderId}`);
      
    } catch (error) {
      console.error(`❌ [LabIntegration] Error processing order ${orderId}:`, error);
    }
  }

  /**
   * Process multiple signed lab orders
   */
  static async processMultipleSignedOrders(orderIds: number[]): Promise<void> {
    console.log(`🧪 [LabIntegration] Processing ${orderIds.length} signed lab orders`);
    
    for (const orderId of orderIds) {
      await this.processSignedLabOrder(orderId);
      // Add small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Check for pending lab orders that should be transmitted
   */
  static async processPendingTransmissions(): Promise<void> {
    console.log(`🔍 [LabIntegration] Checking for pending lab transmissions`);
    
    try {
      // Find signed orders that haven't been transmitted yet
      const pendingOrders = await db
        .select()
        .from(labOrders)
        .where(
          and(
            eq(labOrders.orderStatus, 'signed'),
            eq(labOrders.externalOrderId, null)
          )
        );

      if (pendingOrders.length > 0) {
        console.log(`📤 [LabIntegration] Found ${pendingOrders.length} pending transmissions`);
        
        for (const order of pendingOrders) {
          await this.processSignedLabOrder(order.id);
        }
      } else {
        console.log(`✅ [LabIntegration] No pending transmissions found`);
      }
      
    } catch (error) {
      console.error(`❌ [LabIntegration] Error checking pending transmissions:`, error);
    }
  }
}

export const labOrderIntegration = LabOrderIntegrationService;