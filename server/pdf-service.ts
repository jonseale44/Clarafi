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
    // Select only the columns we need to avoid any schema mismatch issues
    const [patient] = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dateOfBirth: patients.dateOfBirth,
      mrn: patients.mrn,
      phone: patients.phone,
      address: patients.address,
      city: patients.city,
      state: patients.state,
      zipCode: patients.zipCode,
      insurance: patients.insurance
    }).from(patients).where(eq(patients.id, patientId));
    return patient;
  }

  private async getProviderInfo(providerId: number) {
    console.log(`📄 [PDFService] Getting provider info for providerId: ${providerId}`);
    
    // Select only the columns we need to avoid any schema mismatch issues
    const [provider] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      credentials: users.credentials,
      email: users.email,
      npi: users.npi,
      specialties: users.specialties,
      licenseNumber: users.licenseNumber,
      licenseState: users.licenseState
    }).from(users).where(eq(users.id, providerId));
    console.log(`📄 [PDFService] Provider found: ${provider ? `${provider.firstName} ${provider.lastName}` : 'NOT FOUND'}`);
    
    // Get provider's location information
    console.log(`📄 [PDFService] Looking for primary location for provider ${providerId}`);
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

    console.log(`📄 [PDFService] Primary location found: ${providerLocation.length > 0 ? 'YES' : 'NO'}`);

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

    if (locationData) {
      console.log(`📄 [PDFService] Location details:`, {
        name: locationData.location.name,
        address: locationData.location.address,
        phone: locationData.location.phone,
        fax: locationData.location.fax,
        organization: locationData.organization.name,
        healthSystem: locationData.healthSystem.name
      });
    } else {
      console.log(`📄 [PDFService] WARNING: No location data found for provider ${providerId}`);
    }

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
    console.log(`📄 [PDFService] addProviderInfo called with startY: ${startY}`);
    console.log(`📄 [PDFService] Provider data structure:`, JSON.stringify(providerData, null, 2));
    
    const { provider, locationData } = providerData;
    doc.fontSize(12);
    
    // Provider name and credentials
    const providerName = `Dr. ${provider.firstName} ${provider.lastName}${provider.credentials ? ', ' + provider.credentials : ''}`;
    console.log(`📄 [PDFService] Provider name: ${providerName}`);
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
      console.log(`📄 [PDFService] Location data available, adding practice information`);
      const { location, organization } = locationData;
      
      // Organization name
      console.log(`📄 [PDFService] Organization: ${organization.name}`);
      doc.text(`Practice: ${organization.name}`, 50, startY);
      startY += 15;
      
      // Address
      console.log(`📄 [PDFService] Address: ${location.address}`);
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
        console.log(`📄 [PDFService] Phone: ${location.phone}`);
        doc.text(`Phone: ${location.phone}`, 50, startY);
        startY += 15;
      } else {
        console.log(`📄 [PDFService] No phone number available`);
      }
      
      // Fax
      if (location.fax) {
        console.log(`📄 [PDFService] Fax: ${location.fax}`);
        doc.text(`Fax: ${location.fax}`, 50, startY);
        startY += 15;
      } else {
        console.log(`📄 [PDFService] No fax number available`);
      }
    } else {
      console.log(`📄 [PDFService] WARNING: No location data available for provider`);
    }
    
    // Date
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, startY);
    return startY + 30;
  }

  async generateMedicationPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFService] Starting medication PDF generation`);
    console.log(`📄 [PDFService] Orders: ${orders.length}, PatientId: ${patientId}, ProviderId: ${providerId}`);
    
    const patient = await this.getPatientInfo(patientId);
    console.log(`📄 [PDFService] Patient retrieved: ${patient ? `${patient.firstName} ${patient.lastName} (DOB: ${patient.dateOfBirth})` : 'NOT FOUND'}`);
    
    const provider = await this.getProviderInfo(providerId);
    console.log(`📄 [PDFService] Provider retrieved: ${provider ? 'SUCCESS' : 'FAILED'}`);
    
    if (!patient) {
      console.error(`📄 [PDFService] ERROR: Patient not found for ID ${patientId}`);
      throw new Error('Patient not found');
    }
    
    if (!provider) {
      console.error(`📄 [PDFService] ERROR: Provider not found or location data missing for ID ${providerId}`);
      throw new Error('Provider not found');
    }
    
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
      console.log(`📄 [PDFService] Starting PDF content generation`);
      this.addHeader(doc, 'Medication Orders');
      console.log(`📄 [PDFService] Header added`);
      
      let currentY = 130;
      currentY = this.addPatientInfo(doc, patient, currentY);
      console.log(`📄 [PDFService] Patient info added, currentY: ${currentY}`);
      
      currentY = this.addProviderInfo(doc, provider, currentY);
      console.log(`📄 [PDFService] Provider info added, currentY: ${currentY}`);
      
      // Add medication orders
      doc.fontSize(14).text('Prescribed Medications:', 50, currentY);
      currentY += 30;
      console.log(`📄 [PDFService] Adding ${orders.length} medication orders`);
      
      orders.forEach((order, index) => {
        console.log(`📄 [PDFService] Adding order ${index + 1}: ${order.medicationName}`);
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
      
      console.log(`📄 [PDFService] All medication orders added`);
      
      // Add signature section
      currentY += 30;
      console.log(`📄 [PDFService] Adding signature section at Y: ${currentY}`);
      doc.moveTo(50, currentY).lineTo(300, currentY).stroke();
      doc.text('Provider Signature', 50, currentY + 10);
      
      console.log(`📄 [PDFService] Ending PDF document generation`);
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