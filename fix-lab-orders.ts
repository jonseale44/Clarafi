import { db } from './server/db.js';
import { labOrders } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function fixLabOrders() {
  console.log('Fixing cancelled lab orders for patient 15...\n');

  // Get all cancelled lab orders for patient 15
  const cancelledOrders = await db.select().from(labOrders)
    .where(and(eq(labOrders.patientId, 15), eq(labOrders.orderStatus, 'cancelled')))
    .limit(5); // Fix the first 5 orders

  console.log(`Found ${cancelledOrders.length} cancelled lab orders to fix`);

  // Update them to signed status
  for (const order of cancelledOrders) {
    await db.update(labOrders)
      .set({
        orderStatus: 'signed',
        signedAt: new Date(),
        signedBy: 4 // Your user ID
      })
      .where(eq(labOrders.id, order.id));
    
    console.log(`✅ Fixed lab order ${order.id}: ${order.testName} - changed from cancelled to signed`);
  }

  console.log('\nThe mock lab system should generate results for these orders within 30-60 seconds.');
  process.exit(0);
}

fixLabOrders().catch(console.error);