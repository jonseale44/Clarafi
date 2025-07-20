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
    
    try {
      // Get provider information
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
      
      if (!provider) {
        console.log(`📄 [PDFService] Provider not found for ID ${providerId}`);
        return null;
      }
      
      console.log(`📄 [PDFService] Provider found: ${provider.firstName} ${provider.lastName}`);
      
      // Try to get location data - using a simpler query to avoid Drizzle issues
      let locationData = null;
      
      try {
        // First get the user's location ID
        const [userLocation] = await db.select({
          locationId: userLocations.locationId
        })
        .from(userLocations)
        .where(eq(userLocations.userId, providerId))
        .limit(1);
        
        if (userLocation) {
          // Then get the location details
          const [location] = await db.select({
            locationId: locations.id,
            locationName: locations.name,
            locationAddress: locations.address,
            locationAddress2: locations.address2,
            locationCity: locations.city,
            locationState: locations.state,
            locationZipCode: locations.zipCode,
            locationPhone: locations.phone,
            locationFax: locations.fax,
            organizationId: locations.organizationId
          })
          .from(locations)
          .where(eq(locations.id, userLocation.locationId));
          
          if (location) {
            // Get organization info
            const [organization] = await db.select({
              organizationName: organizations.name,
              healthSystemId: organizations.healthSystemId
            })
            .from(organizations)
            .where(eq(organizations.id, location.organizationId));
            
            if (organization) {
              // Get health system info
              const [healthSystem] = await db.select({
                healthSystemName: healthSystems.name
              })
              .from(healthSystems)
              .where(eq(healthSystems.id, organization.healthSystemId));
              
              // Combine all the data
              locationData = {
                ...location,
                organizationName: organization?.organizationName || 'Unknown Organization',
                healthSystemName: healthSystem?.healthSystemName || 'Unknown Health System'
              };
            }
          }
        }
      } catch (locationError) {
        console.log(`📄 [PDFService] Error getting location data:`, locationError);
      }
      
      if (locationData) {
        console.log(`📄 [PDFService] Location details:`, {
          name: locationData.locationName,
          address: locationData.locationAddress,
          organization: locationData.organizationName
        });
      } else {
        console.log(`📄 [PDFService] WARNING: No location data found for provider ${providerId}`);
      }
      
      return { provider, locationData };
    } catch (error) {
      console.error(`📄 [PDFService] Error in getProviderInfo:`, error);
      return null;
    }
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
      
      // Organization name
      console.log(`📄 [PDFService] Organization: ${locationData.organizationName}`);
      doc.text(`Practice: ${locationData.organizationName}`, 50, startY);
      startY += 15;
      
      // Address
      console.log(`📄 [PDFService] Address: ${locationData.locationAddress}`);
      doc.text(locationData.locationAddress, 50, startY);
      startY += 15;
      
      if (locationData.locationAddress2) {
        doc.text(locationData.locationAddress2, 50, startY);
        startY += 15;
      }
      
      doc.text(`${locationData.locationCity}, ${locationData.locationState} ${locationData.locationZipCode}`, 50, startY);
      startY += 15;
      
      // Phone
      if (locationData.locationPhone) {
        console.log(`📄 [PDFService] Phone: ${locationData.locationPhone}`);
        doc.text(`Phone: ${locationData.locationPhone}`, 50, startY);
        startY += 15;
      } else {
        console.log(`📄 [PDFService] No phone number available`);
      }
      
      // Fax
      if (locationData.locationFax) {
        console.log(`📄 [PDFService] Fax: ${locationData.locationFax}`);
        doc.text(`Fax: ${locationData.locationFax}`, 50, startY);
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
    
    // Validate and clean orders array to avoid Drizzle ORM issues
    const validOrders = orders.filter(order => {
      if (!order || typeof order !== 'object') {
        console.warn(`📄 [PDFService] Invalid order detected (null or non-object), skipping`);
        return false;
      }
      // Ensure we have the required fields for medication orders
      if (!order.medicationName) {
        console.warn(`📄 [PDFService] Order ${order.id} missing medicationName, skipping`);
        return false;
      }
      return true;
    });
    
    console.log(`📄 [PDFService] Valid orders after filtering: ${validOrders.length}`);
    
    // Fetch patient and provider info with error handling
    let patient, provider;
    try {
      patient = await this.getPatientInfo(patientId);
      console.log(`📄 [PDFService] Patient retrieved: ${patient ? `${patient.firstName} ${patient.lastName} (DOB: ${patient.dateOfBirth})` : 'NOT FOUND'}`);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching patient info:`, error);
      patient = null;
    }
    
    try {
      provider = await this.getProviderInfo(providerId);
      console.log(`📄 [PDFService] Provider retrieved: ${provider ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching provider info:`, error);
      provider = null;
    }
    
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
      console.log(`📄 [PDFService] Adding ${validOrders.length} medication orders`);
      
      validOrders.forEach((order, index) => {
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
    
    // Validate and clean orders array to avoid Drizzle ORM issues
    const validOrders = orders.filter(order => {
      if (!order || typeof order !== 'object') {
        console.warn(`📄 [PDFService] Invalid order detected (null or non-object), skipping`);
        return false;
      }
      // Ensure we have the required fields
      if (!order.testName) {
        console.warn(`📄 [PDFService] Order ${order.id} missing testName, skipping`);
        return false;
      }
      return true;
    });
    
    console.log(`📄 [PDFService] Valid orders after filtering: ${validOrders.length}`);
    
    // Fetch patient and provider info with error handling
    let patient, provider;
    try {
      patient = await this.getPatientInfo(patientId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching patient info:`, error);
      patient = { name: 'Unknown Patient', dateOfBirth: '', mrn: '' };
    }
    
    try {
      provider = await this.getProviderInfo(providerId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching provider info:`, error);
      provider = { name: 'Unknown Provider', npi: '', locationName: '', address: '' };
    }
    
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
      
      validOrders.forEach((order, index) => {
        doc.fontSize(12);
        // Use optional chaining in case fields are undefined
        const testName = order.testName || 'Unknown Test';
        doc.text(`${index + 1}. ${testName}`, 70, currentY);
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

  async generateMedicationPDF(orders: Order[], patientId: number, providerId: number): Promise<Buffer> {
    console.log(`📄 [PDFService] Generating medication PDF for ${orders.length} orders`);
    
    // Validate and clean orders array to avoid Drizzle ORM issues
    const validOrders = orders.filter(order => {
      if (!order || typeof order !== 'object') {
        console.warn(`📄 [PDFService] Invalid order detected (null or non-object), skipping`);
        return false;
      }
      // Ensure we have the required fields for medications
      if (!order.medicationName) {
        console.warn(`📄 [PDFService] Order ${order.id} missing medicationName, skipping`);
        return false;
      }
      return true;
    });
    
    console.log(`📄 [PDFService] Valid orders after filtering: ${validOrders.length}`);
    
    // Fetch patient and provider info with error handling
    let patient, provider;
    try {
      patient = await this.getPatientInfo(patientId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching patient info:`, error);
      patient = { name: 'Unknown Patient', dateOfBirth: '', mrn: '' };
    }
    
    try {
      provider = await this.getProviderInfo(providerId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching provider info:`, error);
      provider = { name: 'Unknown Provider', npi: '', locationName: '', address: '' };
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
      this.addHeader(doc, 'Medication Orders');
      
      let currentY = 130;
      currentY = this.addPatientInfo(doc, patient, currentY);
      currentY = this.addProviderInfo(doc, provider, currentY);
      
      // Add medication orders
      doc.fontSize(14).text('Medications Prescribed:', 50, currentY);
      currentY += 30;
      
      validOrders.forEach((order, index) => {
        doc.fontSize(12);
        // Use optional chaining in case fields are undefined
        const medicationName = order.medicationName || 'Unknown Medication';
        const dose = order.dose || '';
        const frequency = order.frequency || '';
        const quantity = order.quantity || '';
        const unit = order.quantityUnit || order.quantity_unit || '';
        
        doc.text(`${index + 1}. ${medicationName}`, 70, currentY);
        currentY += 20;
        
        if (dose || frequency) {
          doc.fontSize(10).text(`   Sig: ${dose} ${frequency}`, 70, currentY);
          currentY += 15;
        }
        
        if (quantity) {
          doc.fontSize(10).text(`   Quantity: ${quantity} ${unit}`, 70, currentY);
          currentY += 15;
        }
        
        currentY += 10; // Extra spacing between medications
        
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
    
    // Validate and clean orders array to avoid Drizzle ORM issues
    const validOrders = orders.filter(order => {
      if (!order || typeof order !== 'object') {
        console.warn(`📄 [PDFService] Invalid order detected (null or non-object), skipping`);
        return false;
      }
      // Ensure we have the required fields
      if (!order.studyType) {
        console.warn(`📄 [PDFService] Order ${order.id} missing studyType, skipping`);
        return false;
      }
      return true;
    });
    
    console.log(`📄 [PDFService] Valid orders after filtering: ${validOrders.length}`);
    
    // Fetch patient and provider info with error handling
    let patient, provider;
    try {
      patient = await this.getPatientInfo(patientId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching patient info:`, error);
      patient = { name: 'Unknown Patient', dateOfBirth: '', mrn: '' };
    }
    
    try {
      provider = await this.getProviderInfo(providerId);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching provider info:`, error);
      provider = { name: 'Unknown Provider', npi: '', locationName: '', address: '' };
    }
    
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
      
      validOrders.forEach((order, index) => {
        doc.fontSize(12);
        // Use optional chaining in case fields are undefined
        const studyType = order.studyType || 'Unknown Study';
        doc.text(`${index + 1}. ${studyType}`, 70, currentY);
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