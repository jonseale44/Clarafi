import { pdfService } from './pdf-generation-service.ts';

async function testPDFService() {
  console.log('🧪 Testing PDF Service directly...');
  
  try {
    await pdfService.initBrowser();
    console.log('✅ Browser initialized successfully');
    
    // Test orders data
    const testOrders = [
      {
        id: 1986,
        patientId: 121,
        orderType: 'medication',
        medicationName: 'PDF Test Medication',
        dosage: '20 mg',
        sig: 'Take 1 tablet twice daily',
        quantity: 60,
        refills: 1,
        orderedBy: 2,
        orderedAt: new Date().toISOString()
      }
    ];
    
    console.log('🧪 Generating medication PDF...');
    const pdfBuffer = await pdfService.generateMedicationPDF(testOrders, 121, 2);
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Save for verification
    const fs = await import('fs');
    fs.writeFileSync('/tmp/service-test-medication.pdf', pdfBuffer);
    console.log('✅ PDF saved to /tmp/service-test-medication.pdf');
    
    await pdfService.closeBrowser();
    console.log('✅ Browser closed successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ PDF Service test failed:', error);
    return false;
  }
}

testPDFService().then(success => {
  process.exit(success ? 0 : 1);
});