/**
 * Imaging Order Processor Service
 * 
 * Converts signed imaging orders from unified orders table
 * to production imaging orders system for PACS integration
 */

import { db } from "./db.js";
import { orders, imagingOrders } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class ImagingOrderProcessor {
  
  /**
   * Process all signed imaging orders for a patient/encounter
   */
  static async processSignedImagingOrders(patientId: number, encounterId?: number) {
    console.log(`🩻 [ImagingProcessor] Processing signed imaging orders for patient ${patientId}, encounter ${encounterId || 'all'}`);
    
    try {
      const whereConditions = [
        eq(orders.patientId, patientId),
        eq(orders.orderType, 'imaging'),
        eq(orders.orderStatus, 'approved')
      ];
      
      if (encounterId) {
        whereConditions.push(eq(orders.encounterId, encounterId));
      }
      
      const signedImagingOrders = await db.select()
        .from(orders)
        .where(and(...whereConditions));
      
      console.log(`🩻 [ImagingProcessor] Found ${signedImagingOrders.length} signed imaging orders to process`);
      
      for (const order of signedImagingOrders) {
        await this.convertToProductionImagingOrder(order);
      }
      
      console.log(`✅ [ImagingProcessor] Successfully processed ${signedImagingOrders.length} imaging orders`);
      
    } catch (error) {
      console.error(`❌ [ImagingProcessor] Failed to process imaging orders:`, error);
      throw error;
    }
  }
  
  /**
   * Convert a single signed imaging order to production system
   */
  private static async convertToProductionImagingOrder(order: any) {
    console.log(`🔬 [ImagingProcessor] Converting order ${order.id}: ${order.studyType || 'Imaging Study'}`);
    
    try {
      // Check if already converted
      if (order.referenceId) {
        console.log(`⚠️ [ImagingProcessor] Order ${order.id} already has reference_id ${order.referenceId}, skipping`);
        return;
      }
      
      // Create production imaging order using actual database column names
      const [newImagingOrder] = await db.insert(imagingOrders).values({
        patientId: order.patientId,
        encounterId: order.encounterId,
        providerId: order.orderedBy || 2,
        imagingType: order.studyType || 'X-ray',
        bodyPart: order.region || order.bodyPart || 'Chest',
        laterality: order.laterality || null,
        indication: order.clinicalIndication || 'Clinical correlation',
        clinicalHistory: order.clinicalHistory || null,
        priority: 'routine',
        status: 'scheduled',
        facilityId: this.getPreferredImagingCenter(order.studyType || 'X-ray')
      }).returning();
      
      console.log(`✅ [ImagingProcessor] Created imaging order ${newImagingOrder.id} for external processing`);
      
      // Update reference in original order
      await db.update(orders)
        .set({ referenceId: newImagingOrder.id })
        .where(eq(orders.id, order.id));
      
      // Schedule result simulation (longer delay for imaging)
      setTimeout(async () => {
        await this.simulateImagingResult(newImagingOrder);
      }, 15000); // 15 second delay for realistic processing
      
    } catch (error) {
      console.error(`❌ [ImagingProcessor] Failed to convert order ${order.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get preferred imaging center based on study type
   */
  private static getPreferredImagingCenter(studyType: string): number {
    const centerMap: Record<string, number> = {
      'MRI': 2,
      'CT': 2,
      'X-ray': 1,
      'Ultrasound': 1,
      'Nuclear Medicine': 2
    };
    
    return centerMap[studyType] || 1;
  }
  
  /**
   * Generate external order ID for PACS integration
   */
  private static generateExternalOrderId(orderId: number): string {
    const timestamp = Date.now().toString().slice(-6);
    return `IMG${orderId.toString().padStart(4, '0')}${timestamp}`;
  }
  
  /**
   * Generate DICOM accession number
   */
  private static generateAccessionNumber(orderId: number): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${date}.${orderId.toString().padStart(6, '0')}`;
  }
  
  /**
   * Get preparation instructions based on study type
   */
  private static getPrepInstructions(studyType: string, contrastNeeded: boolean): string {
    if (contrastNeeded) {
      return "NPO 4 hours prior to exam. Arrive 30 minutes early for contrast screening.";
    }
    
    const prepMap: Record<string, string> = {
      'MRI': 'Remove all metal objects. Inform technologist of any implants.',
      'CT': 'No special preparation required unless contrast ordered.',
      'X-ray': 'No preparation required.',
      'Ultrasound': 'Full bladder may be required - check with scheduling.',
      'Nuclear Medicine': 'Specific preparation will be provided at scheduling.'
    };
    
    return prepMap[studyType] || 'No special preparation required.';
  }
  
  /**
   * Simulate imaging result (production EMRs integrate with PACS)
   */
  private static async simulateImagingResult(imagingOrder: any) {
    console.log(`📊 [ImagingProcessor] Simulating imaging result for ${imagingOrder.imagingType}`);
    
    try {
      // Update order status to completed
      await db.update(imagingOrders)
        .set({ 
          status: 'completed',
          completedDate: new Date()
        })
        .where(eq(imagingOrders.id, imagingOrder.id));
      
      console.log(`✅ [ImagingProcessor] Imaging study ${imagingOrder.id} completed`);
      
    } catch (error) {
      console.error(`❌ [ImagingProcessor] Failed to simulate result for order ${imagingOrder.id}:`, error);
    }
  }
}