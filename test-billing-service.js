// Test BillingValidationService import
async function testBillingService() {
  try {
    console.log('Testing BillingValidationService import...');
    
    // Try to import the service
    const { BillingValidationService } = await import('./server/billing-validation-service.js');
    console.log('✅ BillingValidationService imported successfully');
    
    // Try to instantiate
    const service = new BillingValidationService();
    console.log('✅ BillingValidationService instantiated successfully');
    
  } catch (error) {
    console.error('❌ BillingValidationService error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testBillingService();