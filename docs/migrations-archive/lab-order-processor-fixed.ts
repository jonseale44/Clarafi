/**
 * Fixed Lab Order Processor Service
 * 
 * Automatically converts signed lab orders from the unified orders table
 * to the production lab orders system with proper error handling and logging.
 */

import { db } from "./db.js";
import { orders, labOrders, labResults } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export class LabOrderProcessor {
  /**
   * Process all signed lab orders for a patient/encounter
   * This should be called after orders are signed
   */
  static async processSignedLabOrders(patientId: number, encounterId: number): Promise<void> {
    console.log(`🧪 [LabOrderProcessor] Processing signed lab orders for patient ${patientId}, encounter ${encounterId}`);
    
    try {
      // Find all signed lab orders that haven't been converted yet
      const signedLabOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.patientId, patientId),
            eq(orders.encounterId, encounterId),
            eq(orders.orderType, 'lab'),
            eq(orders.orderStatus, 'approved'),
            isNull(orders.referenceId) // referenceId will store the lab_orders.id after conversion
          )
        );

      console.log(`🔍 [LabOrderProcessor] Found ${signedLabOrders.length} signed lab orders to process`);

      for (const order of signedLabOrders) {
        await this.convertOrderToLabOrder(order);
      }

      console.log(`✅ [LabOrderProcessor] Completed processing ${signedLabOrders.length} lab orders`);
      
    } catch (error) {
      console.error(`❌ [LabOrderProcessor] Error processing lab orders:`, error);
      throw error;
    }
  }

  /**
   * Convert a single order from orders table to lab_orders table
   */
  private static async convertOrderToLabOrder(order: any): Promise<void> {
    console.log(`🔄 [LabOrderProcessor] Converting order ${order.id} to lab order`);
    
    try {
      // Map order data to lab order format
      const labOrderData = {
        patientId: order.patientId,
        encounterId: order.encounterId,
        loincCode: this.generateLoincCode(order.testCode || order.testName),
        cptCode: this.generateCptCode(order.testCode || order.testName),
        testCode: order.testCode || this.generateTestCode(order.testName),
        testName: order.testName || order.labName || 'Laboratory Test',
        testCategory: this.determineTestCategory(order.testCode || order.testName),
        priority: order.priority || 'routine',
        clinicalIndication: order.clinicalIndication || order.providerNotes || 'Laboratory testing as ordered',
        orderedBy: order.orderedBy,
        orderedAt: order.orderedAt || order.createdAt,
        orderStatus: 'signed', // Ready for external lab transmission
        specimenType: order.specimenType || this.getDefaultSpecimenType(order.testCode || order.testName),
        fastingRequired: order.fastingRequired || false,
        // Add ICD-10 codes if available
        icd10Codes: order.diagnosisCode ? [order.diagnosisCode] : [],
      };

      // Insert into lab_orders table
      const [newLabOrder] = await db.insert(labOrders).values(labOrderData).returning();
      
      // Update the original order to reference the new lab order
      await db
        .update(orders)
        .set({ referenceId: newLabOrder.id })
        .where(eq(orders.id, order.id));

      console.log(`✅ [LabOrderProcessor] Converted order ${order.id} → lab order ${newLabOrder.id}`);

      // Trigger external lab transmission
      await this.initiateExternalLabTransmission(newLabOrder.id);
      
    } catch (error) {
      console.error(`❌ [LabOrderProcessor] Failed to convert order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Initiate transmission to external lab
   */
  private static async initiateExternalLabTransmission(labOrderId: number): Promise<void> {
    try {
      console.log(`🚀 [LabOrderProcessor] Initiating external lab transmission for lab order ${labOrderId}`);
      
      // Import and use the lab simulator service
      const { labSimulator } = await import("./lab-simulator-service.js");
      const simulation = await labSimulator.simulateLabOrderTransmission(labOrderId);
      
      console.log(`📡 [LabOrderProcessor] Lab order ${labOrderId} transmitted as ${simulation.externalOrderId}`);
      
    } catch (error) {
      console.error(`❌ [LabOrderProcessor] Failed to transmit lab order ${labOrderId}:`, error);
      // Don't throw - order conversion succeeded even if transmission failed
    }
  }

  // Helper methods for mapping order data
  private static generateLoincCode(testIdentifier: string): string {
    const loincMap: Record<string, string> = {
      'CBC': '58410-2',
      'CMP': '24323-8',
      'BMP': '51990-0',
      'Lipid Panel': '57698-3',
      'TSH': '11579-0',
      'A1C': '4548-4',
      'PSA': '2857-1',
      'Comprehensive Metabolic Panel': '24323-8'
    };
    return loincMap[testIdentifier] || `LOINC_${testIdentifier.replace(/\s+/g, '_').toUpperCase()}`;
  }

  private static generateCptCode(testIdentifier: string): string {
    const cptMap: Record<string, string> = {
      'CBC': '85025',
      'CMP': '80053',
      'BMP': '80048',
      'Lipid Panel': '80061',
      'TSH': '84443',
      'A1C': '83036',
      'PSA': '84153',
      'Comprehensive Metabolic Panel': '80053'
    };
    return cptMap[testIdentifier] || '80047'; // Default to basic metabolic panel
  }

  private static generateTestCode(testName: string): string {
    return testName.replace(/\s+/g, '_').toUpperCase().substring(0, 10);
  }

  private static determineTestCategory(testIdentifier: string): string {
    const categoryMap: Record<string, string> = {
      'CBC': 'hematology',
      'CMP': 'chemistry',
      'BMP': 'chemistry',
      'Lipid Panel': 'chemistry',
      'TSH': 'endocrinology',
      'A1C': 'chemistry',
      'PSA': 'chemistry',
      'Comprehensive Metabolic Panel': 'chemistry'
    };
    return categoryMap[testIdentifier] || 'chemistry';
  }

  private static getDefaultSpecimenType(testIdentifier: string): string {
    const specimenMap: Record<string, string> = {
      'CBC': 'whole_blood',
      'CMP': 'serum',
      'BMP': 'serum',
      'Lipid Panel': 'serum',
      'TSH': 'serum',
      'A1C': 'whole_blood',
      'PSA': 'serum',
      'Comprehensive Metabolic Panel': 'serum'
    };
    return specimenMap[testIdentifier] || 'serum';
  }
}