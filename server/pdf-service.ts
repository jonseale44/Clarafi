import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from './db.js';
import { patients, users, orders } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

export interface Order {
  id: number;
  patientId: number;
  orderType: string;
  medicationName?: string;
  dosage?: string;
  sig?: string;
  quantity?: number;
  refills?: number;
  testName?: string;
  studyType?: string;
  orderedBy: number;
  approvedBy?: number;
  approvedAt?: Date;
  providerNotes?: string;
}

export class PDFService {
  private async ensurePDFDirectory(): Promise<void> {
    const pdfDir = '/tmp/pdfs';
    try {
      await fs.promises.access(pdfDir);
    } catch {
      await fs.promises.mkdir(pdfDir, { recursive: true });
    }
  }

  private async getPatientInfo(patientId: number) {
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    return patient;
  }

  private async getProviderInfo(providerId: number) {
    const [provider] = await db.select().from(users).where(eq(users.id, providerId));
    return provider;
  }

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(20).text('Medical Orders', 50, 50);
    doc.fontSize(16).text(title, 50, 80);
    doc.moveTo(50, 110).lineTo(550, 110).stroke();
  }

  private addPatientInfo(doc: PDFKit.PDFDocument, patient: any, startY: number): number {
    doc.fontSize(12);
    doc.text(`Patient: ${patient.firstName} ${patient.lastName}`, 50, startY);
    doc.text(`MRN: ${patient.mrn}`, 50, startY + 15);
    if (patient.dateOfBirth) {
      doc.text(`DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}`, 50, startY + 30);
    }
    return startY + 60;
  }

  private addProviderInfo(doc: PDFKit.PDFDocument, provider: any, startY: number): number {
    doc.fontSize(12);
    doc.text(`Ordering Provider: Dr. ${provider.firstName} ${provider.lastName}`, 50, startY);
    if (provider.credentials) {
      doc.text(`Credentials: ${provider.credentials}`, 50, startY + 15);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, startY + 30);
    return startY + 60;
  }

  async generateMedicationPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFService] Generating medication PDF for ${orders.length} orders`);
    
    const patient = await this.getPatientInfo(patientId);
    const provider = await this.getProviderInfo(providerId);
    
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`📄 [PDFService] Medication PDF generated: ${pdfBuffer.length} bytes`);
        
        try {
          // Save to filesystem
          await this.ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `medication-orders-${patientId}-${timestamp}.pdf`;
          const filepath = path.join('/tmp/pdfs', filename);
          
          await fs.promises.writeFile(filepath, pdfBuffer);
          console.log(`📄 [PDFService] PDF saved: ${filepath}`);
          
          resolve(pdfBuffer);
        } catch (error) {
          reject(error);
        }
      });
      
      doc.on('error', reject);
      
      // Generate PDF content
      this.addHeader(doc, 'Medication Orders');
      
      let currentY = 130;
      currentY = this.addPatientInfo(doc, patient, currentY);
      currentY = this.addProviderInfo(doc, provider, currentY);
      
      // Add medication orders
      doc.fontSize(14).text('Prescribed Medications:', 50, currentY);
      currentY += 30;
      
      orders.forEach((order, index) => {
        doc.fontSize(12);
        doc.text(`${index + 1}. ${order.medicationName}`, 70, currentY);
        currentY += 15;
        
        if (order.dosage) {
          doc.text(`   Dosage: ${order.dosage}`, 70, currentY);
          currentY += 15;
        }
        
        if (order.sig) {
          doc.text(`   Instructions: ${order.sig}`, 70, currentY);
          currentY += 15;
        }
        
        if (order.quantity) {
          doc.text(`   Quantity: ${order.quantity}`, 70, currentY);
          currentY += 15;
        }
        
        if (order.refills !== undefined) {
          doc.text(`   Refills: ${order.refills}`, 70, currentY);
          currentY += 15;
        }
        
        currentY += 10; // Space between orders
        
        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });
      
      // Add signature section
      currentY += 30;
      doc.moveTo(50, currentY).lineTo(300, currentY).stroke();
      doc.text('Provider Signature', 50, currentY + 10);
      
      doc.end();
    });
  }

  async generateLabPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFService] Generating lab PDF for ${orders.length} orders`);
    
    const patient = await this.getPatientInfo(patientId);
    const provider = await this.getProviderInfo(providerId);
    
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`📄 [PDFService] Lab PDF generated: ${pdfBuffer.length} bytes`);
        
        try {
          // Save to filesystem
          await this.ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `lab-orders-${patientId}-${timestamp}.pdf`;
          const filepath = path.join('/tmp/pdfs', filename);
          
          await fs.promises.writeFile(filepath, pdfBuffer);
          console.log(`📄 [PDFService] PDF saved: ${filepath}`);
          
          resolve(pdfBuffer);
        } catch (error) {
          reject(error);
        }
      });
      
      doc.on('error', reject);
      
      // Generate PDF content
      this.addHeader(doc, 'Laboratory Orders');
      
      let currentY = 130;
      currentY = this.addPatientInfo(doc, patient, currentY);
      currentY = this.addProviderInfo(doc, provider, currentY);
      
      // Add lab orders
      doc.fontSize(14).text('Laboratory Tests Ordered:', 50, currentY);
      currentY += 30;
      
      orders.forEach((order, index) => {
        doc.fontSize(12);
        doc.text(`${index + 1}. ${order.testName}`, 70, currentY);
        currentY += 20;
        
        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });
      
      // Add signature section
      currentY += 30;
      doc.moveTo(50, currentY).lineTo(300, currentY).stroke();
      doc.text('Provider Signature', 50, currentY + 10);
      
      doc.end();
    });
  }

  async generateImagingPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFService] Generating imaging PDF for ${orders.length} orders`);
    
    const patient = await this.getPatientInfo(patientId);
    const provider = await this.getProviderInfo(providerId);
    
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`📄 [PDFService] Imaging PDF generated: ${pdfBuffer.length} bytes`);
        
        try {
          // Save to filesystem
          await this.ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `imaging-orders-${patientId}-${timestamp}.pdf`;
          const filepath = path.join('/tmp/pdfs', filename);
          
          await fs.promises.writeFile(filepath, pdfBuffer);
          console.log(`📄 [PDFService] PDF saved: ${filepath}`);
          
          resolve(pdfBuffer);
        } catch (error) {
          reject(error);
        }
      });
      
      doc.on('error', reject);
      
      // Generate PDF content
      this.addHeader(doc, 'Imaging Orders');
      
      let currentY = 130;
      currentY = this.addPatientInfo(doc, patient, currentY);
      currentY = this.addProviderInfo(doc, provider, currentY);
      
      // Add imaging orders
      doc.fontSize(14).text('Imaging Studies Ordered:', 50, currentY);
      currentY += 30;
      
      orders.forEach((order, index) => {
        doc.fontSize(12);
        doc.text(`${index + 1}. ${order.studyType}`, 70, currentY);
        currentY += 20;
        
        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });
      
      // Add signature section
      currentY += 30;
      doc.moveTo(50, currentY).lineTo(300, currentY).stroke();
      doc.text('Provider Signature', 50, currentY + 10);
      
      doc.end();
    });
  }
}

export const pdfService = new PDFService();