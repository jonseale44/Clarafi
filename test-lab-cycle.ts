/**
 * Test script to verify the complete lab cycle from order to patient notification
 * 
 * This tests:
 * 1. Creating a lab order
 * 2. Signing the order
 * 3. Background processor picks it up
 * 4. Results are generated
 * 5. Patient notifications are sent
 */

import { db } from "./server/db.js";
import { orders, labOrders, labResults, patientCommunications } from "./shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { LabOrderBackgroundProcessor } from "./server/lab-order-background-processor.js";

async function testLabCycle() {
  console.log("🧪 Testing Complete Lab Cycle\n");

  try {
    // Step 1: Create a test lab order
    console.log("📝 Step 1: Creating test lab order...");
    const [testOrder] = await db.insert(orders).values({
      patientId: 14, // Using an existing patient
      encounterId: null,
      providerId: 4, // Using the current provider
      orderType: 'lab',
      orderDate: new Date(),
      testName: 'Complete Blood Count (CBC)',
      testCode: 'CBC_COMPLETE',
      priority: 'routine',
      clinicalIndication: 'Annual checkup',
      orderStatus: 'pending',
      instructions: 'Fasting not required',
      deliveryMethod: 'mock_service', // Use mock service for testing
      isSigned: false,
      signedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`✅ Created lab order ID: ${testOrder.id}`);
    
    // Step 2: Sign the order
    console.log("\n✏️ Step 2: Signing the lab order...");
    await db.update(orders)
      .set({ 
        isSigned: true, 
        signedAt: new Date(),
        signedBy: 4 
      })
      .where(eq(orders.id, testOrder.id));
    console.log("✅ Order signed");
    
    // Step 3: Run the background processor
    console.log("\n⚙️ Step 3: Running background processor...");
    await LabOrderBackgroundProcessor.processOrders();
    
    // Step 4: Check if the order was converted to labOrders
    const [labOrder] = await db.select()
      .from(labOrders)
      .where(eq(labOrders.sourceOrderId, testOrder.id))
      .limit(1);
      
    if (labOrder) {
      console.log(`✅ Lab order created in production system: ${labOrder.id}`);
      console.log(`📤 Order status: ${labOrder.orderStatus}`);
      
      // Step 5: Wait and run processor again to generate results
      console.log("\n⏳ Waiting for simulated lab processing time...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("⚙️ Running processor again to generate results...");
      await LabOrderBackgroundProcessor.processOrders();
      
      // Step 6: Check for generated results
      const results = await db.select()
        .from(labResults)
        .where(eq(labResults.labOrderId, labOrder.id));
        
      if (results.length > 0) {
        console.log(`\n✅ Generated ${results.length} lab results`);
        console.log("📊 Sample results:");
        results.slice(0, 3).forEach(result => {
          console.log(`  - ${result.testName}: ${result.resultValue} ${result.resultUnits} (${result.abnormalFlag || 'Normal'})`);
        });
        
        // Step 7: Check for patient communications
        const communications = await db.select()
          .from(patientCommunications)
          .where(eq(patientCommunications.patientId, testOrder.patientId))
          .orderBy(desc(patientCommunications.createdAt))
          .limit(1);
          
        if (communications.length > 0) {
          const comm = communications[0];
          console.log("\n✅ Patient notification sent!");
          console.log(`📧 Communication type: ${comm.communicationType}`);
          console.log(`📧 Channel: ${comm.channel}`);
          console.log(`📧 Status: ${comm.status}`);
          console.log(`📧 Subject: ${comm.subject}`);
          console.log("\n🎉 Complete lab cycle test PASSED!");
        } else {
          console.log("\n⚠️ No patient communications found - checking notification service configuration");
        }
      } else {
        console.log("\n❌ No lab results generated");
      }
    } else {
      console.log("\n❌ Lab order was not converted to production system");
    }
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
  
  process.exit(0);
}

// Run the test
testLabCycle();