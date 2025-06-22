/**
 * Background Lab Order Processor
 * 
 * Continuously monitors for signed lab orders that need processing
 * and automatically converts them to the production lab system.
 * This ensures no lab orders are missed in the workflow.
 */

import { db } from "./db.js";
import { orders } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { LabOrderProcessor } from "./lab-order-processor.js";

export class LabOrderBackgroundProcessor {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the background processor
   */
  static start() {
    if (this.isRunning) {
      console.log(`⚠️ [LabBackground] Processor already running`);
      return;
    }

    console.log(`🚀 [LabBackground] Starting background lab order processor`);
    this.isRunning = true;

    // Process immediately on start
    this.processOrders();

    // Then process every 30 seconds
    this.intervalId = setInterval(() => {
      this.processOrders();
    }, 30000);
  }

  /**
   * Stop the background processor
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log(`🛑 [LabBackground] Stopped background lab order processor`);
  }

  /**
   * Process all pending lab orders
   */
  private static async processOrders() {
    try {
      // Step 1: Find signed lab orders that haven't been processed yet (no reference_id)
      const pendingOrders = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.orderType, 'lab'),
            eq(orders.orderStatus, 'approved'),
            isNull(orders.referenceId)
          )
        );

      if (pendingOrders.length > 0) {
        console.log(`📋 [LabBackground] Found ${pendingOrders.length} pending lab orders to process`);
        
        // Group by patient/encounter for efficient processing
        const groupedOrders = new Map<string, typeof pendingOrders>();
        for (const order of pendingOrders) {
          const key = `${order.patientId}-${order.encounterId}`;
          if (!groupedOrders.has(key)) {
            groupedOrders.set(key, []);
          }
          groupedOrders.get(key)!.push(order);
        }

        // Process each group
        for (const [key, orderGroup] of groupedOrders) {
          const [patientId, encounterId] = key.split('-').map(Number);
          try {
            console.log(`🔄 [LabBackground] Processing ${orderGroup.length} orders for patient ${patientId}, encounter ${encounterId}`);
            await LabOrderProcessor.processSignedLabOrders(patientId, encounterId, "mock_service");
            console.log(`✅ [LabBackground] Successfully processed orders for patient ${patientId}, encounter ${encounterId}`);
          } catch (error) {
            console.error(`❌ [LabBackground] Failed to process orders for patient ${patientId}, encounter ${encounterId}:`, error);
          }
        }
      }

      // Step 2: Process transmitted lab orders that are ready for results (simulate lab processing delay)
      await this.processTransmittedOrders();
      
    } catch (error) {
      console.error(`❌ [LabBackground] Error in background processor:`, error);
    }
  }

  /**
   * Process transmitted lab orders that are ready for result generation
   */
  private static async processTransmittedOrders() {
    try {
      const { labOrders } = await import("@shared/schema");
      const { eq, and, lt } = await import("drizzle-orm");
      
      // Find transmitted orders that are older than 30 seconds (simulating lab processing time)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      
      const transmittedOrders = await db.select()
        .from(labOrders)
        .where(
          and(
            eq(labOrders.orderStatus, 'transmitted'),
            lt(labOrders.transmittedAt, thirtySecondsAgo)
          )
        );

      if (transmittedOrders.length > 0) {
        console.log(`🧪 [LabBackground] Found ${transmittedOrders.length} transmitted orders ready for result generation`);
        
        for (const labOrder of transmittedOrders) {
          try {
            console.log(`📊 [LabBackground] Generating results for ${labOrder.testName} (ID: ${labOrder.id})`);
            await LabOrderProcessor.generateLabResultsForOrder(labOrder);
            console.log(`✅ [LabBackground] Successfully generated results for ${labOrder.testName}`);
          } catch (error) {
            console.error(`❌ [LabBackground] Failed to generate results for order ${labOrder.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [LabBackground] Error processing transmitted orders:`, error);
    }
  }
}

// Auto-start the background processor
LabOrderBackgroundProcessor.start();

export const labOrderBackgroundProcessor = LabOrderBackgroundProcessor;