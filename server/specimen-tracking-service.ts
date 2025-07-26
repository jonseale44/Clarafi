/**
 * Specimen Tracking Service
 * 
 * Production-ready specimen management system with barcode generation,
 * chain of custody tracking, and collection workflow management.
 * 
 * Features:
 * - Barcode generation for specimen labels
 * - Collection time validation
 * - Container type validation
 * - Chain of custody documentation
 * - Specimen status tracking
 */

import { db } from "./db.js";
import { labOrders, labResults } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import * as QRCode from "qrcode";

export interface SpecimenLabel {
  orderId: number;
  patientId: number;
  patientName: string;
  patientDOB: string;
  mrn: string;
  testName: string;
  loincCode: string;
  specimenType: string;
  containerType: string;
  collectionDate: Date;
  collectorId: number;
  barcode: string;
  barcodeImage: string; // Base64 encoded image
  specialInstructions?: string;
  fastingRequired?: boolean;
}

export interface SpecimenStatus {
  orderId: number;
  status: 'pending_collection' | 'collected' | 'in_transit' | 'received' | 'processing' | 'completed' | 'rejected';
  location: string;
  temperature?: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: string;
  performedBy: number;
  performedByName: string;
  location: string;
  notes?: string;
  temperature?: string;
}

export interface CollectionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SpecimenTrackingService {
  /**
   * Generate unique specimen barcode
   */
  static generateSpecimenBarcode(orderId: number, patientId: number): string {
    const timestamp = Date.now().toString(36);
    const orderStr = orderId.toString().padStart(6, '0');
    const patientStr = patientId.toString().padStart(6, '0');
    return `LAB-${orderStr}-${patientStr}-${timestamp}`.toUpperCase();
  }
  
  /**
   * Generate specimen label with barcode
   */
  static async generateSpecimenLabel(orderId: number): Promise<SpecimenLabel> {
    console.log(`🏷️ [SpecimenTracking] Generating label for order ${orderId}`);
    
    // Get order details
    const orderQuery = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!orderQuery.length) {
      throw new Error(`Lab order ${orderId} not found`);
    }
    
    const order = orderQuery[0];
    
    // Get patient details
    const { patients } = await import("@shared/schema");
    const patientQuery = await db
      .select()
      .from(patients)
      .where(eq(patients.id, order.patientId))
      .limit(1);
    
    if (!patientQuery.length) {
      throw new Error(`Patient ${order.patientId} not found`);
    }
    
    const patient = patientQuery[0];
    
    // Generate barcode
    const barcode = this.generateSpecimenBarcode(orderId, order.patientId);
    
    // Generate barcode image (QR code)
    const barcodeImage = await QRCode.toDataURL(barcode, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 200,
      margin: 2
    });
    
    const label: SpecimenLabel = {
      orderId: order.id,
      patientId: patient.id,
      patientName: `${patient.lastName}, ${patient.firstName}`,
      patientDOB: patient.dateOfBirth,
      mrn: patient.mrn,
      testName: order.testName,
      loincCode: order.loincCode,
      specimenType: order.specimenType || 'blood',
      containerType: order.containerType || this.getDefaultContainer(order.testCategory),
      collectionDate: new Date(),
      collectorId: order.orderedBy,
      barcode,
      barcodeImage,
      specialInstructions: order.collectionInstructions,
      fastingRequired: order.fastingRequired
    };
    
    console.log(`✅ [SpecimenTracking] Label generated with barcode: ${barcode}`);
    return label;
  }
  
  /**
   * Validate specimen collection
   */
  static async validateCollection(
    orderId: number,
    collectionData: {
      collectedAt: Date;
      collectorId: number;
      specimenType: string;
      containerType: string;
      volume?: string;
      temperature?: string;
    }
  ): Promise<CollectionValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get order details
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      errors.push(`Lab order ${orderId} not found`);
      return { isValid: false, errors, warnings };
    }
    
    // Validate specimen type matches order
    if (order.specimenType && order.specimenType !== collectionData.specimenType) {
      errors.push(`Specimen type mismatch: Expected ${order.specimenType}, got ${collectionData.specimenType}`);
    }
    
    // Validate container type
    const expectedContainer = order.containerType || this.getDefaultContainer(order.testCategory);
    if (expectedContainer && expectedContainer !== collectionData.containerType) {
      warnings.push(`Container type differs from expected: ${expectedContainer}`);
    }
    
    // Validate collection timing
    if (order.timingInstructions) {
      const timingValidation = this.validateTimingRequirements(
        order.timingInstructions,
        collectionData.collectedAt
      );
      if (!timingValidation.isValid) {
        errors.push(...timingValidation.errors);
      }
      warnings.push(...timingValidation.warnings);
    }
    
    // Validate fasting requirements
    if (order.fastingRequired) {
      // In production, this would check patient's last meal time
      warnings.push('Please confirm patient fasting status');
    }
    
    // Validate volume if specified
    if (order.specimenVolume && collectionData.volume) {
      const requiredVolume = parseFloat(order.specimenVolume);
      const actualVolume = parseFloat(collectionData.volume);
      if (actualVolume < requiredVolume * 0.8) {
        warnings.push(`Specimen volume may be insufficient: ${collectionData.volume} (required: ${order.specimenVolume})`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Update specimen status with chain of custody
   */
  static async updateSpecimenStatus(
    orderId: number,
    status: SpecimenStatus['status'],
    details: {
      performedBy: number;
      performedByName: string;
      location: string;
      notes?: string;
      temperature?: string;
    }
  ): Promise<void> {
    console.log(`📍 [SpecimenTracking] Updating specimen status for order ${orderId} to ${status}`);
    
    // Get current order
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      throw new Error(`Lab order ${orderId} not found`);
    }
    
    // Update order status based on specimen status
    let orderStatus = order.orderStatus;
    switch (status) {
      case 'collected':
        orderStatus = 'collected';
        break;
      case 'received':
        orderStatus = 'in_progress';
        break;
      case 'completed':
        orderStatus = 'resulted';
        break;
      case 'rejected':
        orderStatus = 'cancelled';
        break;
    }
    
    // Create chain of custody entry
    const chainEntry: ChainOfCustodyEntry = {
      timestamp: new Date(),
      action: `Specimen ${status}`,
      performedBy: details.performedBy,
      performedByName: details.performedByName,
      location: details.location,
      notes: details.notes,
      temperature: details.temperature
    };
    
    // Get existing chain of custody
    const existingChain = (order.metadata as any)?.chainOfCustody || [];
    const updatedChain = [...existingChain, chainEntry];
    
    // Update order with new status and chain of custody
    await db
      .update(labOrders)
      .set({
        orderStatus,
        collectedAt: status === 'collected' ? new Date() : order.collectedAt,
        metadata: {
          ...(order.metadata as any || {}),
          specimenStatus: status,
          chainOfCustody: updatedChain,
          lastStatusUpdate: new Date().toISOString()
        }
      })
      .where(eq(labOrders.id, orderId));
    
    console.log(`✅ [SpecimenTracking] Status updated successfully`);
  }
  
  /**
   * Get specimen tracking history
   */
  static async getSpecimenHistory(orderId: number): Promise<SpecimenStatus> {
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      throw new Error(`Lab order ${orderId} not found`);
    }
    
    const metadata = order.metadata as any || {};
    
    return {
      orderId,
      status: metadata.specimenStatus || 'pending_collection',
      location: metadata.currentLocation || 'Unknown',
      temperature: metadata.currentTemperature,
      chainOfCustody: metadata.chainOfCustody || []
    };
  }
  
  /**
   * Batch print specimen labels
   */
  static async generateBatchLabels(orderIds: number[]): Promise<SpecimenLabel[]> {
    console.log(`🖨️ [SpecimenTracking] Generating batch labels for ${orderIds.length} orders`);
    
    const labels = await Promise.all(
      orderIds.map(orderId => this.generateSpecimenLabel(orderId))
    );
    
    return labels;
  }
  
  /**
   * Get default container type based on test category
   */
  private static getDefaultContainer(testCategory?: string | null): string {
    const containerMap: Record<string, string> = {
      'chemistry': 'gold_top',
      'hematology': 'lavender_top',
      'coagulation': 'blue_top',
      'glucose': 'gray_top',
      'blood_bank': 'pink_top',
      'microbiology': 'sterile_container',
      'urinalysis': 'urine_cup',
      'molecular': 'specialized'
    };
    
    return containerMap[testCategory || 'chemistry'] || 'red_top';
  }
  
  /**
   * Validate timing requirements
   */
  private static validateTimingRequirements(
    requirements: string,
    collectionTime: Date
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const requirementsLower = requirements.toLowerCase();
    const hour = collectionTime.getHours();
    
    // Check for specific timing requirements
    if (requirementsLower.includes('fasting') || requirementsLower.includes('am')) {
      if (hour > 12) {
        warnings.push('Collection performed in afternoon - verify if morning collection was required');
      }
    }
    
    if (requirementsLower.includes('trough')) {
      warnings.push('Trough level collection - verify timing relative to last dose');
    }
    
    if (requirementsLower.includes('peak')) {
      warnings.push('Peak level collection - verify timing relative to dose administration');
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Check specimen stability
   */
  static async checkSpecimenStability(
    orderId: number
  ): Promise<{ isStable: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    const history = await this.getSpecimenHistory(orderId);
    
    if (!history.chainOfCustody.length) {
      return { isStable: true, warnings };
    }
    
    // Get collection time
    const collectionEntry = history.chainOfCustody.find(
      entry => entry.action.includes('collected')
    );
    
    if (!collectionEntry) {
      warnings.push('Collection time not documented');
      return { isStable: true, warnings };
    }
    
    const collectionTime = new Date(collectionEntry.timestamp);
    const currentTime = new Date();
    const hoursElapsed = (currentTime.getTime() - collectionTime.getTime()) / (1000 * 60 * 60);
    
    // Check stability based on specimen type and temperature
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      return { isStable: false, warnings: ['Order not found'] };
    }
    
    // Default stability limits
    const stabilityLimits: Record<string, number> = {
      'room_temperature': 2,
      'refrigerated': 48,
      'frozen': 720 // 30 days
    };
    
    const temperature = history.temperature || 'room_temperature';
    const limit = stabilityLimits[temperature] || 2;
    
    if (hoursElapsed > limit) {
      warnings.push(`Specimen may be unstable: ${hoursElapsed.toFixed(1)} hours at ${temperature}`);
    }
    
    return {
      isStable: hoursElapsed <= limit,
      warnings
    };
  }
}

export const specimenTrackingService = SpecimenTrackingService;