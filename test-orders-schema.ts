import { orders } from './shared/schema.js';

// Count the number of columns defined in the schema
const schemaColumns = Object.keys(orders);
console.log(`✅ Schema now defines ${schemaColumns.length} columns in the orders table`);
console.log('\nAll columns:', schemaColumns.sort().join(', '));