import { db } from "./server/db.js";
import { users, labOrders } from "./shared/schema.js";
import { eq, like } from "drizzle-orm";

async function checkUserOrders() {
  // Find Jonathan Seale's user ID
  const user = await db
    .select()
    .from(users)
    .where(like(users.username, "%jonseale%"))
    .limit(1);
    
  if (user.length > 0) {
    console.log(`Found user: ${user[0].username} (ID: ${user[0].id})`);
    
    // Check lab orders for this user
    const userOrders = await db
      .select({
        id: labOrders.id,
        testName: labOrders.testName,
        orderedBy: labOrders.orderedBy
      })
      .from(labOrders)
      .where(eq(labOrders.orderedBy, user[0].id))
      .limit(5);
      
    console.log(`\nLab orders for user ${user[0].id}: ${userOrders.length}`);
    userOrders.forEach(o => {
      console.log(`- Order ${o.id}: ${o.testName}`);
    });
  }
  
  // Check all unique orderedBy values
  const uniqueOrderedBy = await db
    .selectDistinct({ orderedBy: labOrders.orderedBy })
    .from(labOrders);
    
  console.log("\n\nUnique orderedBy values in labOrders:");
  uniqueOrderedBy.forEach(o => {
    console.log(`- ${o.orderedBy}`);
  });
  
  process.exit(0);
}

checkUserOrders().catch(console.error);
