// Test PDF generation for existing approved orders
import { PDFService } from './server/pdf-service.js';
import { db } from './server/db.js';
import { orders } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testPDFGeneration() {
  try {
    console.log('🧪 [TEST] Starting PDF generation test...');
    
    // Get one medication order from patient 55
    const medicationOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, 364)) // One of the approved medication orders
      .limit(1);
      
    if (medicationOrder.length === 0) {
      console.error('❌ [TEST] No order found with ID 364');
      return;
    }
    
    const order = medicationOrder[0];
    console.log('📋 [TEST] Found order:', {
      id: order.id,
      type: order.orderType,
      medicationName: order.medicationName,
      patientId: order.patientId,
      status: order.orderStatus
    });
    
    // Test PDF generation
    const pdfService = new PDFService();
    console.log('📄 [TEST] Creating PDF service instance...');
    
    const pdfBuffer = await pdfService.generateMedicationPDF(
      [order], 
      order.patientId, 
      order.approvedBy || 5 // Use provider ID 5
    );
    
    console.log(`✅ [TEST] PDF generated successfully! Size: ${pdfBuffer.length} bytes`);
    console.log('📂 [TEST] Checking uploads/pdfs directory...');
    
    // List files in uploads/pdfs
    const fs = await import('fs');
    const files = await fs.promises.readdir('uploads/pdfs');
    console.log('📂 [TEST] PDF files found:', files);
    
  } catch (error) {
    console.error('❌ [TEST] PDF generation failed:', error);
  }
}

testPDFGeneration().then(() => {
  console.log('🧪 [TEST] Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 [TEST] Test crashed:', error);
  process.exit(1);
});