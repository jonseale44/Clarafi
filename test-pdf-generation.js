// Quick test to verify PDF generation is working
import { pdfService } from './server/pdf-generation-service.js';

async function testPDFGeneration() {
  console.log('Testing PDF generation...');
  
  try {
    await pdfService.initBrowser();
    console.log('Browser initialized successfully');
    
    // Test with sample order data
    const sampleOrder = {
      id: 1996,
      patientId: 121,
      orderType: 'medication',
      medicationName: 'Test PDF Medication',
      dosage: '10 mg',
      sig: 'Take once daily',
      quantity: 30,
      refills: 2,
      orderedBy: 2
    };
    
    const pdfBuffer = await pdfService.generateMedicationPDF([sampleOrder], 121, 2);
    
    // Save the PDF
    const fs = await import('fs');
    const filename = `/tmp/pdfs/test-medication-${Date.now()}.pdf`;
    fs.writeFileSync(filename, pdfBuffer);
    
    console.log(`PDF generated successfully: ${filename}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);
    
    await pdfService.closeBrowser();
    
    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return false;
  }
}

testPDFGeneration();