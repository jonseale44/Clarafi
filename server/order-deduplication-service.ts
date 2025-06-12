/**
 * Order Deduplication Service
 * Implements comprehensive deduplication logic at the database level
 * Handles all order generation scenarios to prevent duplicates
 */

import { db } from "./db";
import { orders, type InsertOrder, type Order } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

export interface OrderDuplicationKey {
  keyType: 'medication' | 'lab' | 'imaging' | 'referral' | 'other';
  keyValue: string;
  patientId: number;
  encounterId?: number; // Optional for cross-encounter deduplication
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingOrderId?: number;
  conflictReason?: string;
  shouldMerge?: boolean;
  mergeFields?: Partial<Order>;
}

export class OrderDeduplicationService {
  
  /**
   * Generate standardized deduplication key for an order
   */
  static generateOrderKey(order: InsertOrder): OrderDuplicationKey {
    let keyValue = '';
    let keyType: OrderDuplicationKey['keyType'] = 'other';

    switch (order.orderType) {
      case 'medication':
        keyType = 'medication';
        // Include strength/dosage for more precise matching
        const medName = order.medicationName?.toLowerCase().trim() || '';
        const dosage = order.dosage?.toLowerCase().trim() || '';
        keyValue = `${medName}_${dosage}`;
        break;
        
      case 'lab':
        keyType = 'lab';
        // Use LOINC code if available, otherwise fall back to test name
        if (order.testCode) {
          keyValue = order.testCode.toLowerCase().trim();
        } else {
          const testName = order.testName?.toLowerCase().trim() || '';
          const labName = order.labName?.toLowerCase().trim() || '';
          keyValue = `${testName}_${labName}`;
        }
        break;
        
      case 'imaging':
        keyType = 'imaging';
        const studyType = order.studyType?.toLowerCase().trim() || '';
        const region = order.region?.toLowerCase().trim() || '';
        const laterality = order.laterality?.toLowerCase().trim() || '';
        keyValue = `${studyType}_${region}_${laterality}`;
        break;
        
      case 'referral':
        keyType = 'referral';
        const specialty = order.specialtyType?.toLowerCase().trim() || '';
        keyValue = specialty;
        break;
        
      default:
        keyType = 'other';
        keyValue = `${order.orderType}_${JSON.stringify(order).substring(0, 50)}`;
    }

    return {
      keyType,
      keyValue,
      patientId: order.patientId,
      encounterId: order.encounterId || undefined
    };
  }

  /**
   * Check if an order would be a duplicate before insertion
   */
  static async checkForDuplicates(
    order: InsertOrder, 
    scope: 'encounter' | 'patient' = 'patient'
  ): Promise<DeduplicationResult> {
    const orderKey = this.generateOrderKey(order);
    
    console.log(`🔍 [OrderDedup] Checking for duplicates: ${orderKey.keyType} - ${orderKey.keyValue}`);

    // Build query conditions based on scope
    let whereConditions;
    if (scope === 'encounter' && order.encounterId) {
      // Check within same encounter only
      whereConditions = and(
        eq(orders.patientId, order.patientId),
        eq(orders.encounterId, order.encounterId),
        eq(orders.orderType, order.orderType)
      );
    } else {
      // Check across all patient encounters (more conservative)
      whereConditions = and(
        eq(orders.patientId, order.patientId),
        eq(orders.orderType, order.orderType),
        // Only check draft orders to avoid conflicts with signed orders
        eq(orders.orderStatus, 'draft')
      );
    }

    const existingOrders = await db
      .select()
      .from(orders)
      .where(whereConditions);

    console.log(`🔍 [OrderDedup] Found ${existingOrders.length} existing ${order.orderType} orders to check`);

    // Check each existing order for key conflicts
    for (const existingOrder of existingOrders) {
      const existingKey = this.generateOrderKey(existingOrder);
      
      if (existingKey.keyValue === orderKey.keyValue) {
        console.log(`🚫 [OrderDedup] Duplicate found: Order ID ${existingOrder.id}`);
        
        // Determine if we should merge or skip
        const shouldMerge = this.shouldMergeOrders(order, existingOrder);
        
        return {
          isDuplicate: true,
          existingOrderId: existingOrder.id,
          conflictReason: `Duplicate ${order.orderType}: ${orderKey.keyValue}`,
          shouldMerge,
          mergeFields: shouldMerge ? this.getMergeFields(order, existingOrder) : undefined
        };
      }
    }

    console.log(`✅ [OrderDedup] No duplicates found for ${orderKey.keyType} - ${orderKey.keyValue}`);
    return { isDuplicate: false };
  }

  /**
   * Create order with automatic deduplication
   */
  static async createOrderWithDeduplication(
    order: InsertOrder,
    deduplicationScope: 'encounter' | 'patient' = 'patient'
  ): Promise<{ order: Order | null; action: 'created' | 'merged' | 'skipped'; message: string }> {
    
    const duplicationResult = await this.checkForDuplicates(order, deduplicationScope);
    
    if (duplicationResult.isDuplicate) {
      if (duplicationResult.shouldMerge && duplicationResult.existingOrderId && duplicationResult.mergeFields) {
        // Merge with existing order
        console.log(`🔄 [OrderDedup] Merging order ${duplicationResult.existingOrderId}`);
        
        const [updatedOrder] = await db
          .update(orders)
          .set({
            ...duplicationResult.mergeFields,
            updatedAt: new Date()
          })
          .where(eq(orders.id, duplicationResult.existingOrderId))
          .returning();
          
        return {
          order: updatedOrder,
          action: 'merged',
          message: `Merged with existing order: ${duplicationResult.conflictReason}`
        };
      } else {
        // Skip duplicate
        console.log(`⏭️ [OrderDedup] Skipping duplicate order: ${duplicationResult.conflictReason}`);
        return {
          order: null,
          action: 'skipped',
          message: `Skipped duplicate: ${duplicationResult.conflictReason}`
        };
      }
    }

    // Create new order
    console.log(`➕ [OrderDedup] Creating new order: ${order.orderType}`);
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    return {
      order: newOrder,
      action: 'created',
      message: 'Order created successfully'
    };
  }

  /**
   * Bulk create orders with deduplication
   */
  static async createOrdersWithDeduplication(
    orderList: InsertOrder[],
    deduplicationScope: 'encounter' | 'patient' = 'patient'
  ): Promise<{
    created: Order[];
    merged: Order[];
    skipped: { order: InsertOrder; reason: string }[];
    summary: string;
  }> {
    const created: Order[] = [];
    const merged: Order[] = [];
    const skipped: { order: InsertOrder; reason: string }[] = [];

    console.log(`🔄 [OrderDedup] Processing ${orderList.length} orders with deduplication`);

    for (const order of orderList) {
      try {
        const result = await this.createOrderWithDeduplication(order, deduplicationScope);
        
        switch (result.action) {
          case 'created':
            if (result.order) created.push(result.order);
            break;
          case 'merged':
            if (result.order) merged.push(result.order);
            break;
          case 'skipped':
            skipped.push({ order, reason: result.message });
            break;
        }
      } catch (error: any) {
        console.error(`❌ [OrderDedup] Error processing order:`, error);
        skipped.push({ order, reason: `Error: ${error.message}` });
      }
    }

    const summary = `Processed ${orderList.length} orders: ${created.length} created, ${merged.length} merged, ${skipped.length} skipped`;
    console.log(`📊 [OrderDedup] ${summary}`);

    return { created, merged, skipped, summary };
  }

  /**
   * Determine if two orders should be merged rather than skipped
   */
  private static shouldMergeOrders(newOrder: InsertOrder, existingOrder: Order): boolean {
    // Merge if the new order has additional information
    const newOrderFields = Object.keys(newOrder).length;
    const existingOrderFields = Object.keys(existingOrder).filter(key => 
      existingOrder[key as keyof Order] !== null && 
      existingOrder[key as keyof Order] !== undefined &&
      existingOrder[key as keyof Order] !== ''
    ).length;

    // Also merge if clinical indication or notes are different/enhanced
    const hasEnhancedClinicalInfo = 
      (newOrder.clinicalIndication && newOrder.clinicalIndication !== existingOrder.clinicalIndication) ||
      (newOrder.providerNotes && newOrder.providerNotes !== existingOrder.providerNotes);

    return newOrderFields > existingOrderFields || hasEnhancedClinicalInfo;
  }

  /**
   * Generate merge fields for combining orders
   */
  private static getMergeFields(newOrder: InsertOrder, existingOrder: Order): Partial<Order> {
    const mergeFields: Partial<Order> = {};

    // Merge non-empty fields from new order
    Object.keys(newOrder).forEach(key => {
      const newValue = newOrder[key as keyof InsertOrder];
      const existingValue = existingOrder[key as keyof Order];
      
      if (newValue && (!existingValue || existingValue === '' || (typeof existingValue === 'boolean' && existingValue === false))) {
        mergeFields[key as keyof Order] = newValue as any;
      }
    });

    // Special handling for clinical fields - append rather than replace
    if (newOrder.clinicalIndication && existingOrder.clinicalIndication && 
        newOrder.clinicalIndication !== existingOrder.clinicalIndication) {
      mergeFields.clinicalIndication = `${existingOrder.clinicalIndication}; ${newOrder.clinicalIndication}`;
    }

    if (newOrder.providerNotes && existingOrder.providerNotes && 
        newOrder.providerNotes !== existingOrder.providerNotes) {
      mergeFields.providerNotes = `${existingOrder.providerNotes}; ${newOrder.providerNotes}`;
    }

    return mergeFields;
  }

  /**
   * Clean up duplicate orders for a patient (manual cleanup utility)
   */
  static async cleanupPatientDuplicates(patientId: number): Promise<{
    duplicatesRemoved: number;
    ordersProcessed: number;
  }> {
    console.log(`🧹 [OrderDedup] Starting duplicate cleanup for patient ${patientId}`);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.patientId, patientId),
        eq(orders.orderStatus, 'draft')
      ));

    const processedKeys = new Set<string>();
    const toRemove: number[] = [];
    let ordersProcessed = 0;

    for (const order of allOrders) {
      const key = this.generateOrderKey(order);
      const keyString = `${key.keyType}_${key.keyValue}`;
      
      if (processedKeys.has(keyString)) {
        toRemove.push(order.id);
        console.log(`🗑️ [OrderDedup] Marking duplicate for removal: Order ${order.id}`);
      } else {
        processedKeys.add(keyString);
      }
      ordersProcessed++;
    }

    // Remove duplicates
    for (const orderId of toRemove) {
      await db.delete(orders).where(eq(orders.id, orderId));
    }

    console.log(`✅ [OrderDedup] Cleanup complete: ${toRemove.length} duplicates removed from ${ordersProcessed} orders`);

    return {
      duplicatesRemoved: toRemove.length,
      ordersProcessed
    };
  }
}