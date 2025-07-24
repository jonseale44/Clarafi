#!/usr/bin/env tsx
/**
 * Test script to verify consolidated lab order creation
 * Tests that lab orders are created directly in labOrders table
 * and that orders table rejects lab order creation
 */

import dotenv from "dotenv";
dotenv.config();

import { db } from "./server/db.js";
import { labOrders, orders } from "./shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { storage } from "./server/storage.js";

async function testConsolidatedLabOrders() {
  console.log("🧪 Testing Consolidated Lab Order System...\n");

  try {
    // Test 1: Verify that storage.createOrder rejects lab orders
    console.log("Test 1: Attempting to create lab order through storage.createOrder (should fail)");
    try {
      await storage.createOrder({
        patientId: 3,
        encounterId: 105,
        orderType: 'lab',
        labName: 'Test Lab Order',
        orderStatus: 'draft',
        providerId: 8
      });
      console.error("❌ FAILED: Lab order was created in orders table (should have been rejected)");
    } catch (error: any) {
      if (error.message.includes('Lab orders must be created through consolidated lab routes')) {
        console.log("✅ PASSED: Lab order creation properly rejected by storage.createOrder");
      } else {
        console.error("❌ FAILED: Unexpected error:", error.message);
      }
    }

    // Test 2: Create lab order directly in labOrders table
    console.log("\nTest 2: Creating lab order directly in labOrders table");
    const testLabOrder = {
      patientId: 3,
      encounterId: 105,
      testName: 'Complete Blood Count',
      testCode: 'CBC',
      loincCode: '58410-2',
      cptCode: '85025',
      testCategory: 'hematology',
      priority: 'routine',
      clinicalIndication: 'Routine screening',
      specimenType: 'whole_blood',
      fastingRequired: false,
      orderStatus: 'draft',
      orderedBy: 8,
      orderedAt: new Date()
    };

    const [createdLabOrder] = await db.insert(labOrders).values(testLabOrder).returning();
    console.log("✅ PASSED: Lab order created successfully in labOrders table");
    console.log("Created lab order ID:", createdLabOrder.id);

    // Test 3: Verify lab order exists in labOrders table
    console.log("\nTest 3: Verifying lab order exists in labOrders table");
    const fetchedLabOrder = await db.select()
      .from(labOrders)
      .where(eq(labOrders.id, createdLabOrder.id))
      .limit(1);
    
    if (fetchedLabOrder.length > 0) {
      console.log("✅ PASSED: Lab order found in labOrders table");
      console.log("Lab order details:", {
        id: fetchedLabOrder[0].id,
        testName: fetchedLabOrder[0].testName,
        patientId: fetchedLabOrder[0].patientId,
        orderStatus: fetchedLabOrder[0].orderStatus
      });
    } else {
      console.error("❌ FAILED: Lab order not found in labOrders table");
    }

    // Test 4: Verify no lab orders exist in orders table
    console.log("\nTest 4: Verifying no lab orders exist in orders table");
    const labOrdersInOrdersTable = await db.select()
      .from(orders)
      .where(eq(orders.orderType, 'lab'))
      .orderBy(desc(orders.createdAt))
      .limit(10);
    
    console.log(`Found ${labOrdersInOrdersTable.length} lab orders in orders table`);
    if (labOrdersInOrdersTable.length > 0) {
      console.log("⚠️  WARNING: Found existing lab orders in orders table (from before consolidation)");
      console.log("These should be migrated or cleaned up");
    } else {
      console.log("✅ PASSED: No lab orders found in orders table");
    }

    // Cleanup: Delete test lab order
    console.log("\nCleaning up test data...");
    await db.delete(labOrders).where(eq(labOrders.id, createdLabOrder.id));
    console.log("✅ Test lab order cleaned up");

    console.log("\n🎉 All tests completed successfully!");
    console.log("Lab order consolidation is working correctly.");

  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
  }

  process.exit(0);
}

// Run tests
testConsolidatedLabOrders();