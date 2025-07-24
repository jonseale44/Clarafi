import { db } from "./server/db.js";
import { labOrders, encounters } from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function fixLabOrdersProvider() {
  console.log("=== Fixing Lab Orders Provider IDs ===");
  
  try {
    // Get all lab orders with their encounter information
    const labOrdersWithEncounters = await db
      .select({
        labOrderId: labOrders.id,
        currentOrderedBy: labOrders.orderedBy,
        encounterId: labOrders.encounterId,
        encounterProviderId: encounters.providerId
      })
      .from(labOrders)
      .innerJoin(encounters, eq(labOrders.encounterId, encounters.id));
    
    console.log(`Found ${labOrdersWithEncounters.length} lab orders to check`);
    
    let updateCount = 0;
    
    for (const order of labOrdersWithEncounters) {
      // Only update if the orderedBy is 1 (default) and the encounter has a different provider
      if (order.currentOrderedBy === 1 && order.encounterProviderId && order.encounterProviderId !== 1) {
        await db
          .update(labOrders)
          .set({ orderedBy: order.encounterProviderId })
          .where(eq(labOrders.id, order.labOrderId));
        
        console.log(`Updated lab order ${order.labOrderId}: orderedBy 1 → ${order.encounterProviderId}`);
        updateCount++;
      }
    }
    
    console.log(`\n✅ Updated ${updateCount} lab orders with correct provider IDs`);
    
    // Verify the fix
    const stillDefault = await db
      .select({ count: sql<number>`count(*)` })
      .from(labOrders)
      .where(eq(labOrders.orderedBy, 1));
    
    console.log(`\nLab orders still with orderedBy = 1: ${stillDefault[0].count}`);
    
  } catch (error) {
    console.error("Error fixing lab orders:", error);
  }
  
  process.exit(0);
}

fixLabOrdersProvider().catch(console.error);