import fs from 'fs';
import path from 'path';

/**
 * Fallback PDF Generation Service
 * 
 * When Puppeteer fails due to timeout issues, this service creates
 * structured text-based PDFs that can be converted later or provides
 * a basic PDF structure as a temporary solution.
 */
export class PDFFallbackService {
  
  static generateMedicationPDFContent(orders: any[], patientId: number, userId: number): string {
    const timestamp = new Date().toLocaleString();
    
    return `
MEDICATION ORDER
================

Patient ID: ${patientId}
Provider ID: ${userId}
Date: ${timestamp}

MEDICATIONS:
${orders.map(order => `
- ${order.medicationName} ${order.dosage || ''}
  Sig: ${order.sig || 'As directed'}
  Quantity: ${order.quantity || 'N/A'}
  Refills: ${order.refills || 0}
  Order ID: ${order.id}
`).join('')}

Electronically signed by Provider ${userId}
Generated: ${timestamp}
`;
  }
  
  static generateLabPDFContent(orders: any[], patientId: number, userId: number): string {
    const timestamp = new Date().toLocaleString();
    
    return `
LABORATORY ORDER
================

Patient ID: ${patientId}
Provider ID: ${userId}
Date: ${timestamp}

TESTS ORDERED:
${orders.map(order => `
- ${order.testName || 'Lab Test'}
  Priority: ${order.priority || 'Routine'}
  Order ID: ${order.id}
`).join('')}

Electronically signed by Provider ${userId}
Generated: ${timestamp}
`;
  }
  
  static generateImagingPDFContent(orders: any[], patientId: number, userId: number): string {
    const timestamp = new Date().toLocaleString();
    
    return `
IMAGING ORDER
=============

Patient ID: ${patientId}
Provider ID: ${userId}
Date: ${timestamp}

STUDIES ORDERED:
${orders.map(order => `
- ${order.studyType || 'Imaging Study'}
  Order ID: ${order.id}
`).join('')}

Electronically signed by Provider ${userId}
Generated: ${timestamp}
`;
  }
  
  static async saveFallbackPDF(content: string, orderType: string, orderId: number): Promise<string> {
    const pdfDir = '/tmp/pdfs';
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${orderType}-order-${orderId}-${timestamp}.txt`;
    const filepath = path.join(pdfDir, filename);
    
    fs.writeFileSync(filepath, content);
    
    console.log(`📄 [PDFFallback] ✅ Text-based order saved: ${filename}`);
    console.log(`📄 [PDFFallback] 📁 Location: ${filepath}`);
    
    return filename;
  }
}