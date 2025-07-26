import { db } from './server/db.js';
import { orders, labOrders } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function checkLabOrders() {
  console.log('Checking lab orders for patient 15...\n');

  // Check for lab orders in both tables
  const legacyLabOrders = await db.select().from(orders)
    .where(and(eq(orders.orderType, 'lab'), eq(orders.patientId, 15)))
    .limit(10);

  const consolidatedLabOrders = await db.select().from(labOrders)
    .where(eq(labOrders.patientId, 15))
    .limit(10);

  console.log('=== LEGACY LAB ORDERS (orders table) ===');
  if (legacyLabOrders.length === 0) {
    console.log('No legacy lab orders found');
  } else {
    legacyLabOrders.forEach(order => {
      console.log(`ID: ${order.id}, Test: ${order.testName}, Status: ${order.orderStatus}, ReferenceID: ${order.referenceId}`);
    });
  }

  console.log('\n=== CONSOLIDATED LAB ORDERS (labOrders table) ===');
  if (consolidatedLabOrders.length === 0) {
    console.log('No consolidated lab orders found');
  } else {
    consolidatedLabOrders.forEach(order => {
      console.log(`ID: ${order.id}, Test: ${order.testName}, Status: ${order.orderStatus}, TransmittedAt: ${order.transmittedAt}`);
    });
  }

  process.exit(0);
}

checkLabOrders().catch(console.error);