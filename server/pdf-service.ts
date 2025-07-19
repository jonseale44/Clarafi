import PDFDocument from 'pdfkit';
import fs from 'fs';
import { db } from './db.js';
import { patients, users, orders, locations, organizations, healthSystems, userLocations } from '@shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { ensurePDFDirectory, getPDFFilePath } from './pdf-utils.js';

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

  private async getPatientInfo(patientId: number) {
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    return patient;
  }

  private async getProviderInfo(providerId: number) {
    const [provider] = await db.select().from(users).where(eq(users.id, providerId));
    
    // Get provider's location information
    const providerLocation = await db.select({
      location: locations,
      organization: organizations,
      healthSystem: healthSystems
    })
    .from(userLocations)
    .innerJoin(locations, eq(userLocations.locationId, locations.id))
    .innerJoin(organizations, eq(locations.organizationId, organizations.id))
    .innerJoin(healthSystems, eq(organizations.healthSystemId, healthSystems.id))
    .where(
      and(
        eq(userLocations.userId, providerId),
        eq(userLocations.isPrimary, true)
      )
    )
    .limit(1);

    // Use the first location if no primary is marked
    const locationData = providerLocation[0] || await db.select({
      location: locations,
      organization: organizations,
      healthSystem: healthSystems
    })
    .from(userLocations)
    .innerJoin(locations, eq(userLocations.locationId, locations.id))
    .innerJoin(organizations, eq(locations.organizationId, organizations.id))
    .innerJoin(healthSystems, eq(organizations.healthSystemId, healthSystems.id))
    .where(eq(userLocations.userId, providerId))
    .limit(1)
    .then(results => results[0]);

    return { provider, locationData };
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

  private addProviderInfo(doc: PDFKit.PDFDocument, providerData: any, startY: number): number {
    const { provider, locationData } = providerData;
    doc.fontSize(12);
    
    // Provider name and credentials
    const providerName = `Dr. ${provider.firstName} ${provider.lastName}${provider.credentials ? ', ' + provider.credentials : ''}`;
    doc.text(`Ordering Provider: ${providerName}`, 50, startY);
    startY += 15;
    
    // NPI
    if (provider.npi) {
      doc.text(`NPI: ${provider.npi}`, 50, startY);
      startY += 15;
    }
    
    // DEA number (if available)
    if (provider.deaNumber) {
      doc.text(`DEA: ${provider.deaNumber}`, 50, startY);
      startY += 15;
    }
    
    // License number
    if (provider.licenseNumber) {
      const licenseText = provider.licenseState 
        ? `License: ${provider.licenseNumber} (${provider.licenseState})`
        : `License: ${provider.licenseNumber}`;
      doc.text(licenseText, 50, startY);
      startY += 15;
    }
    
    // Practice information
    if (locationData) {
      const { location, organization } = locationData;
      
      // Organization name
      doc.text(`Practice: ${organization.name}`, 50, startY);
      startY += 15;
      
      // Address
      doc.text(location.address, 50, startY);
      startY += 15;
      
      if (location.address2) {
        doc.text(location.address2, 50, startY);
        startY += 15;
      }
      
      doc.text(`${location.city}, ${location.state} ${location.zipCode}`, 50, startY);
      startY += 15;
      
      // Phone
      if (location.phone) {
        doc.text(`Phone: ${location.phone}`, 50, startY);
        startY += 15;
      }
    }
    
    // Date
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, startY);
    return startY + 30;
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
          await ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `medication-orders-${patientId}-${timestamp}.pdf`;
          const filepath = getPDFFilePath(filename);
          
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
          await ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `lab-orders-${patientId}-${timestamp}.pdf`;
          const filepath = getPDFFilePath(filename);
          
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
          await ensurePDFDirectory();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `imaging-orders-${patientId}-${timestamp}.pdf`;
          const filepath = getPDFFilePath(filename);
          
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