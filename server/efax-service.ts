import { twilioFaxService } from './twilio-fax-service.js';
import { db } from './db.js';
import { labOrders, labResults, patients, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';

interface LabOrderFaxData {
  orderId: number;
  patientName: string;
  patientDOB: string;
  patientMRN: string;
  providerName: string;
  providerNPI: string;
  labTests: Array<{
    name: string;
    loincCode?: string;
    specimenType?: string;
  }>;
  labDestination: string;
  faxNumber: string;
}

export class EFaxService {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'lab-orders');

  constructor() {
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('[EFax] Error creating uploads directory:', error);
    }
  }

  /**
   * Generate PDF lab order with tracking barcode
   */
  async generateLabOrderPDF(data: LabOrderFaxData): Promise<string> {
    const doc = new PDFDocument();
    const filename = `lab-order-${data.orderId}-${Date.now()}.pdf`;
    const filepath = path.join(this.uploadsDir, filename);
    
    doc.pipe(createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('LABORATORY ORDER', { align: 'center' });
    doc.moveDown();

    // Order tracking ID (for automatic linking when results come back)
    doc.fontSize(12).text(`ORDER ID: LAB-${data.orderId}`, { align: 'right' });
    doc.fontSize(10).text(`*LAB-${data.orderId}*`, { align: 'right' }); // Barcode format
    doc.moveDown();

    // Patient Information
    doc.fontSize(14).text('PATIENT INFORMATION', { underline: true });
    doc.fontSize(12);
    doc.text(`Name: ${data.patientName}`);
    doc.text(`DOB: ${data.patientDOB}`);
    doc.text(`MRN: ${data.patientMRN}`);
    doc.moveDown();

    // Provider Information
    doc.fontSize(14).text('ORDERING PROVIDER', { underline: true });
    doc.fontSize(12);
    doc.text(`Provider: ${data.providerName}`);
    doc.text(`NPI: ${data.providerNPI}`);
    doc.text(`Date Ordered: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Lab Tests
    doc.fontSize(14).text('TESTS ORDERED', { underline: true });
    doc.fontSize(12);
    data.labTests.forEach((test, index) => {
      doc.text(`${index + 1}. ${test.name}`);
      if (test.loincCode) {
        doc.text(`   LOINC: ${test.loincCode}`, { indent: 20 });
      }
      if (test.specimenType) {
        doc.text(`   Specimen: ${test.specimenType}`, { indent: 20 });
      }
    });
    doc.moveDown();

    // Footer with return fax instructions
    doc.fontSize(10).text('--- RESULTS RETURN INSTRUCTIONS ---', { align: 'center' });
    doc.text('Please include ORDER ID on all result reports', { align: 'center' });
    doc.text('Fax results to: 1-800-CLARAFI', { align: 'center' });

    doc.end();
    return filepath;
  }

  /**
   * Send lab order via e-fax
   */
  async sendLabOrder(orderId: number, faxNumber: string): Promise<{ success: boolean; faxSid?: string; error?: string }> {
    try {
      // Get lab order details
      const [orderData] = await db
        .select({
          order: labOrders,
          patient: patients,
          provider: users
        })
        .from(labOrders)
        .leftJoin(patients, eq(labOrders.patientId, patients.id))
        .leftJoin(users, eq(labOrders.orderedBy, users.id))
        .where(eq(labOrders.id, orderId));

      if (!orderData) {
        return { success: false, error: 'Lab order not found' };
      }

      const { order, patient, provider } = orderData;

      // Parse test details
      const tests = order.testDetails as any[] || [];
      
      // Generate PDF
      const pdfPath = await this.generateLabOrderPDF({
        orderId: order.id,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
        patientDOB: patient?.dateOfBirth || 'Unknown',
        patientMRN: patient?.mrn || 'N/A',
        providerName: provider ? `${provider.firstName} ${provider.lastName}, ${provider.credentials || 'MD'}` : 'Unknown Provider',
        providerNPI: provider?.npi || 'N/A',
        labTests: tests.map(test => ({
          name: test.name || test.testName,
          loincCode: test.loincCode,
          specimenType: test.specimenType
        })),
        labDestination: order.externalLab || 'Lab',
        faxNumber
      });

      // Read PDF file as buffer
      const pdfBuffer = await fs.readFile(pdfPath);
      
      // Send via Twilio Fax
      const result = await twilioFaxService.sendFax({
        to: faxNumber,
        pdfBuffer
      });

      if (result.success) {
        // Update order with fax tracking
        await db.update(labOrders)
          .set({
            transmittedAt: new Date(),
            transmissionMethod: 'efax',
            transmissionDetails: {
              method: 'fax',
              faxNumber,
              sentAt: new Date().toISOString(),
              faxSid: result.faxSid,
              pdfPath
            },
            updatedAt: new Date()
          })
          .where(eq(labOrders.id, orderId));
      }

      return result;
    } catch (error) {
      console.error('[EFax] Error sending lab order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process incoming fax and link to original order
   */
  async processIncomingLabResult(faxSid: string, pdfUrl: string): Promise<{ success: boolean; orderId?: number }> {
    try {
      // This would be called by a webhook when fax is received
      // For now, returning success
      console.log('[EFax] Would process incoming fax:', faxSid, pdfUrl);
      
      // TODO: 
      // 1. Download PDF from pdfUrl
      // 2. Save to uploads directory
      // 3. Use UnifiedLabParser to extract order ID
      // 4. Create attachment record
      // 5. Update lab order status
      
      return { success: true };
    } catch (error) {
      console.error('[EFax] Error processing incoming result:', error);
      return { success: false };
    }
  }

  /**
   * Extract order ID from faxed lab result using GPT
   */
  private async extractOrderIdFromFax(filepath: string): Promise<{ orderId?: number; patientId?: number }> {
    // This would integrate with your existing GPT attachment processor
    // For now, returning a placeholder
    // The GPT would look for "ORDER ID: LAB-XXX" pattern in the document
    
    // TODO: Integrate with UnifiedLabParser to extract order ID
    return {
      orderId: undefined,
      patientId: undefined
    };
  }
}

export const efaxService = new EFaxService();