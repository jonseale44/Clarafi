/**
 * Background Lab Order Processor
 * 
 * Continuously monitors for signed lab orders that need processing
 * and automatically converts them to the production lab system.
 * This ensures no lab orders are missed in the workflow.
 */

import { db } from "./db.js";
import { orders, labOrders, labResults } from "@shared/schema";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { LabOrderProcessor } from "./lab-order-processor.js";
import { PatientNotificationService } from "./patient-notification-service.js";

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
      // Step 1A: Find legacy signed lab orders that haven't been processed yet (no reference_id)
      const pendingLegacyOrders = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.orderType, 'lab'),
            eq(orders.orderStatus, 'approved'),
            isNull(orders.referenceId)
          )
        );
      
      // Step 1B: Find consolidated lab orders that need processing
      // These are orders created directly in labOrders table that are signed but not yet processed
      const pendingConsolidatedOrders = await db.select()
        .from(labOrders)
        .where(
          and(
            eq(labOrders.orderStatus, 'signed'),
            // Order is signed but not yet transmitted to lab
            isNull(labOrders.transmittedAt)
          )
        );

      // Process legacy orders
      if (pendingLegacyOrders.length > 0) {
        console.log(`📋 [LabBackground] Found ${pendingLegacyOrders.length} pending legacy lab orders to process`);
        
        // Import signed orders table to check delivery preferences
        const { signedOrders } = await import("@shared/schema");
        
        // Get delivery preferences for each order
        const ordersWithPreferences = [];
        for (const order of pendingLegacyOrders) {
          const signedOrderData = await db.select()
            .from(signedOrders)
            .where(eq(signedOrders.orderId, order.id))
            .limit(1);
          
          const deliveryMethod = signedOrderData[0]?.deliveryMethod || "mock_service";
          console.log(`📋 [LabBackground] Legacy order ${order.id} (${order.testName}) delivery method: ${deliveryMethod}`);
          
          // Only process orders that should go through lab services
          if (deliveryMethod === "mock_service" || deliveryMethod === "real_service") {
            ordersWithPreferences.push({ order, deliveryMethod });
            console.log(`✅ [LabBackground] Legacy order ${order.id} will be processed through lab system`);
          } else {
            console.log(`📄 [LabBackground] Legacy order ${order.id} is PDF-only (${deliveryMethod}) - skipping lab processing`);
          }
        }
        
        if (ordersWithPreferences.length > 0) {
          // Group by patient/encounter for efficient processing
          const groupedOrders = new Map<string, typeof ordersWithPreferences>();
          for (const { order, deliveryMethod } of ordersWithPreferences) {
            const key = `${order.patientId}-${order.encounterId}-${deliveryMethod}`;
            if (!groupedOrders.has(key)) {
              groupedOrders.set(key, []);
            }
            groupedOrders.get(key)!.push({ order, deliveryMethod });
          }

          // Process each group
          for (const [key, orderGroup] of groupedOrders) {
            const [patientId, encounterId, deliveryMethod] = key.split('-');
            try {
              console.log(`🔄 [LabBackground] Processing ${orderGroup.length} legacy lab service orders for patient ${patientId}, encounter ${encounterId} (${deliveryMethod})`);
              await LabOrderProcessor.processSignedLabOrders(Number(patientId), Number(encounterId), deliveryMethod);
              console.log(`✅ [LabBackground] Successfully processed ${orderGroup.length} legacy lab service orders`);
            } catch (error) {
              console.error(`❌ [LabBackground] Failed to process legacy lab service orders for patient ${patientId}, encounter ${encounterId}:`, error);
            }
          }
        } else {
          console.log(`📄 [LabBackground] All pending legacy orders are PDF-only - no lab processing needed`);
        }
      }
      
      // Process consolidated orders (created directly in labOrders table)
      if (pendingConsolidatedOrders.length > 0) {
        console.log(`📋 [LabBackground] Found ${pendingConsolidatedOrders.length} pending consolidated lab orders to process`);
        
        for (const order of pendingConsolidatedOrders) {
          try {
            console.log(`🔄 [LabBackground] Processing consolidated lab order ${order.id} (${order.testName})`);
            
            // Mark as transmitted
            await db.update(labOrders)
              .set({
                orderStatus: 'transmitted',
                transmittedAt: new Date(),
                externalOrderId: `EXT_${order.id}_${Date.now()}`,
                hl7MessageId: `HL7_${order.id}_${Date.now()}`,
                requisitionNumber: `REQ_${order.id}_${Date.now()}`
              })
              .where(eq(labOrders.id, order.id));
              
            console.log(`✅ [LabBackground] Consolidated order ${order.id} marked as transmitted`);
          } catch (error) {
            console.error(`❌ [LabBackground] Failed to process consolidated order ${order.id}:`, error);
          }
        }
      }

      // Step 2: Process transmitted lab orders that are ready for results (simulate lab processing delay)
      await this.processTransmittedOrders();
      
      // Step 3: Check for critical results requiring immediate notification
      await this.checkCriticalResults();
      
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
            const generatedResultIds = await LabOrderProcessor.generateLabResultsForOrder(labOrder);
            console.log(`✅ [LabBackground] Successfully generated results for ${labOrder.testName}`);
            
            // Step 3: Send patient notifications for generated results
            if (generatedResultIds && generatedResultIds.length > 0) {
              console.log(`📧 [LabBackground] Triggering patient notifications for ${generatedResultIds.length} results`);
              try {
                await PatientNotificationService.processNewResults(generatedResultIds, {
                  urgency: 'routine',
                  includeEducation: true
                });
                console.log(`✅ [LabBackground] Patient notifications sent successfully`);
              } catch (notificationError) {
                console.error(`❌ [LabBackground] Failed to send patient notifications:`, notificationError);
                // Don't fail the whole process if notifications fail
              }
            }
          } catch (error) {
            console.error(`❌ [LabBackground] Failed to generate results for order ${labOrder.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [LabBackground] Error processing transmitted orders:`, error);
    }
  }
  
  /**
   * Check for critical lab results and send immediate notifications
   */
  private static async checkCriticalResults() {
    try {
      await PatientNotificationService.checkCriticalResults();
    } catch (error) {
      console.error(`❌ [LabBackground] Error checking critical results:`, error);
    }
  }
}

// Auto-start the background processor
LabOrderBackgroundProcessor.start();

export const labOrderBackgroundProcessor = LabOrderBackgroundProcessor;