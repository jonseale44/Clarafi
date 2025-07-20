/**
 * Referral Order Processor Service
 * 
 * Converts signed referral orders from unified orders table
 * to production referral tracking system
 */

import { db } from "./db.js";
import { orders } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ReferralTracking {
  id: number;
  orderId: number;
  patientId: number;
  encounterId: number;
  specialtyType: string;
  providerName: string;
  clinicalIndication: string;
  urgency: string;
  referralStatus: string;
  scheduledAt?: Date;
  appointmentDate?: Date;
  consultNotes?: string;
  createdAt: Date;
}

export class ReferralOrderProcessor {
  
  /**
   * Process all signed referral orders for a patient/encounter
   */
  static async processSignedReferralOrders(patientId: number, encounterId?: number) {
    console.log(`👨‍⚕️ [ReferralProcessor] Processing signed referral orders for patient ${patientId}, encounter ${encounterId || 'all'}`);
    
    try {
      const whereConditions = [
        eq(orders.patientId, patientId),
        eq(orders.orderType, 'referral'),
        eq(orders.orderStatus, 'approved')
      ];
      
      if (encounterId) {
        whereConditions.push(eq(orders.encounterId, encounterId));
      }
      
      const signedReferralOrders = await db.select()
        .from(orders)
        .where(and(...whereConditions));
      
      console.log(`👨‍⚕️ [ReferralProcessor] Found ${signedReferralOrders.length} signed referral orders to process`);
      
      for (const order of signedReferralOrders) {
        await this.processReferralOrder(order);
      }
      
      console.log(`✅ [ReferralProcessor] Successfully processed ${signedReferralOrders.length} referral orders`);
      
    } catch (error) {
      console.error(`❌ [ReferralProcessor] Failed to process referral orders:`, error);
      throw error;
    }
  }
  
  /**
   * Process individual referral order
   */
  private static async processReferralOrder(order: any) {
    console.log(`🔄 [ReferralProcessor] Processing referral ${order.id}: ${order.specialtyType || 'Specialty Consultation'}`);
    
    try {
      // Check if already processed
      if (order.referenceId) {
        console.log(`⚠️ [ReferralProcessor] Order ${order.id} already has reference_id ${order.referenceId}, skipping`);
        return;
      }
      
      // Create referral tracking entry (using orders table with extended metadata for now)
      // In production, this would be a separate referrals table
      const referralData = {
        referralId: this.generateReferralId(order.id),
        specialtyType: order.specialtyType || 'General Medicine',
        providerName: order.providerName || 'TBD',
        clinicalIndication: order.clinicalIndication || 'Clinical consultation requested',
        urgency: order.urgency || 'routine',
        referralStatus: 'sent',
        externalReferralId: this.generateExternalReferralId(order.id)
      };
      
      // Update original order with referral tracking info
      await db.update(orders)
        .set({ 
          referenceId: parseInt(referralData.referralId),
          deliveryMethod: 'referral_network',
          deliveryStatus: 'sent',
          deliveryNotes: `Referral sent to ${referralData.specialtyType} - ${referralData.providerName}`
        })
        .where(eq(orders.id, order.id));
      
      console.log(`✅ [ReferralProcessor] Processed referral ${order.id} -> ${referralData.externalReferralId}`);
      
      // Simulate referral response (in production, this comes from external systems)
      setTimeout(async () => {
        await this.simulateReferralResponse(order.id, referralData);
      }, 20000); // 20 second delay for realistic processing
      
    } catch (error) {
      console.error(`❌ [ReferralProcessor] Failed to process referral ${order.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate internal referral ID
   */
  private static generateReferralId(orderId: number): string {
    const timestamp = Date.now().toString().slice(-4);
    return `${orderId}${timestamp}`;
  }
  
  /**
   * Generate external referral ID for specialty network
   */
  private static generateExternalReferralId(orderId: number): string {
    const timestamp = Date.now().toString().slice(-6);
    return `REF${orderId.toString().padStart(4, '0')}${timestamp}`;
  }
  
  /**
   * Simulate referral response (appointment scheduled, consultation completed)
   */
  private static async simulateReferralResponse(orderId: number, referralData: any) {
    console.log(`📞 [ReferralProcessor] Simulating referral response for order ${orderId}`);
    
    try {
      // Simulate appointment scheduling
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 14) + 7); // 1-3 weeks out
      
      // Update referral status
      await db.update(orders)
        .set({
          orderStatus: 'completed',
          providerNotes: `Appointment scheduled with ${referralData.specialtyType} for ${appointmentDate.toLocaleDateString()}`
        })
        .where(eq(orders.id, orderId));
      
      console.log(`✅ [ReferralProcessor] Referral ${orderId} - appointment scheduled for ${appointmentDate.toLocaleDateString()}`);
      
    } catch (error) {
      console.error(`❌ [ReferralProcessor] Failed to simulate referral response for order ${orderId}:`, error);
    }
  }
  
  /**
   * Get provider network for specialty type
   */
  private static getSpecialtyProviders(specialtyType: string): string[] {
    const networkMap: Record<string, string[]> = {
      'Cardiology': ['Dr. Smith - Metro Cardiology', 'Dr. Johnson - Heart Center'],
      'Pulmonology': ['Dr. Wilson - Lung Specialists', 'Dr. Brown - Respiratory Care'],
      'Endocrinology': ['Dr. Davis - Diabetes Center', 'Dr. Miller - Endocrine Associates'],
      'Orthopedics': ['Dr. Garcia - Bone & Joint Clinic', 'Dr. Rodriguez - Sports Medicine'],
      'Dermatology': ['Dr. Lee - Skin Care Center', 'Dr. Taylor - Dermatology Associates']
    };
    
    return networkMap[specialtyType] || ['Dr. Specialist - Specialty Clinic'];
  }
}