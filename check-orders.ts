import { db } from "./server/db.js";
import { orders } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function checkOrders() {
  // Check recent lab orders
  const recentOrders = await db
    .select({
      id: orders.id,
      testName: orders.testName,
      orderType: orders.orderType,
      orderedBy: orders.orderedBy,
      orderStatus: orders.orderStatus,
      referenceId: orders.referenceId
    })
    .from(orders)
    .where(eq(orders.orderType, 'lab'))
    .limit(10);
    
  console.log("Recent lab orders from orders table:");
  recentOrders.forEach(o => {
    console.log(`ID: ${o.id}, Test: ${o.testName}, OrderedBy: ${o.orderedBy}, Status: ${o.orderStatus}, RefID: ${o.referenceId}`);
  });
  
  process.exit(0);
}

checkOrders().catch(console.error);
