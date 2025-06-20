// Temporary script to fix the lab order processing issue
const { ProductionLabIntegrationService } = require('./server/production-lab-integration-service.js');

async function processStuckLabOrders() {
  console.log('Processing stuck lab orders...');
  
  // Process the approved CMP orders for encounter 319
  const orderIds = [1803, 1804, 1805]; // From the SQL query results
  
  for (const orderId of orderIds) {
    try {
      console.log(`Processing order ${orderId}...`);
      await ProductionLabIntegrationService.processProductionLabOrder(orderId);
      console.log(`✅ Successfully processed order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to process order ${orderId}:`, error.message);
    }
  }
}

processStuckLabOrders().catch(console.error);