import PDFDocument from 'pdfkit';
import fs from 'fs';
import { db } from './db.js';
import { patients, users, orders, locations, organizations, healthSystems, userLocations } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { ensurePDFDirectory, getPDFFilePath } from './pdf-utils.js';

// Debug logging for imports
console.log(`📄 [PDFService] === MODULE INITIALIZATION ===`);
console.log(`📄 [PDFService] patients table imported:`, typeof patients);
console.log(`📄 [PDFService] db object imported:`, typeof db);
if (patients) {
  console.log(`📄 [PDFService] patients table structure:`, Object.keys(patients).slice(0, 10));
}
if (db) {
  console.log(`📄 [PDFService] db object structure:`, Object.keys(db).slice(0, 10));
}
console.log(`📄 [PDFService] === MODULE INITIALIZATION END ===`);

export interface Order {
  id: number;
  patientId: number;
  orderType: string;
  medicationName?: string;
  dosage?: string;
  sig?: string;
  quantity?: number;
  quantityUnit?: string;
  refills?: number;
  testName?: string;
  studyType?: string;
  orderedBy: number;
  approvedBy?: number;
  approvedAt?: Date;
  providerNotes?: string;
  form?: string;
  routeOfAdministration?: string;
  daysSupply?: number;
  specimenType?: string;
  priority?: string;
}

export class PDFService {

  private async getPatientInfo(patientId: number) {
    try {
      console.log(`📄 [PDFService] === GETPATIENTINFO START ===`);
      console.log(`📄 [PDFService] Input patientId:`, patientId);
      console.log(`📄 [PDFService] Type of patientId:`, typeof patientId);
      
      // Validate patientId
      if (!patientId || typeof patientId !== 'number') {
        console.error(`📄 [PDFService] Invalid patientId: ${patientId}`);
        return null;
      }
      
      console.log(`📄 [PDFService] Building database query...`);
      console.log(`📄 [PDFService] patients table:`, typeof patients);
      console.log(`📄 [PDFService] db object:`, typeof db);
      
      // Log table columns to debug
      console.log(`📄 [PDFService] Checking patients table columns...`);
      console.log(`📄 [PDFService] patients.id:`, typeof patients?.id);
      console.log(`📄 [PDFService] patients.firstName:`, typeof patients?.firstName);
      
      // Select only the columns we need to avoid any schema mismatch issues
      console.log(`📄 [PDFService] Executing database query...`);
      
      let result;
      try {
        console.log(`📄 [PDFService] Building select object...`);
        
        // Check each column individually
        console.log(`📄 [PDFService] Checking individual columns:`);
        console.log(`  - patients.id:`, patients.id ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.firstName:`, patients.firstName ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.lastName:`, patients.lastName ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.dateOfBirth:`, patients.dateOfBirth ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.mrn:`, patients.mrn ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.phone:`, patients.phone ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.address:`, patients.address ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.city:`, patients.city ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.state:`, patients.state ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.zip:`, patients.zip ? 'defined' : 'UNDEFINED!');
        console.log(`  - patients.insurancePrimary:`, patients.insurancePrimary ? 'defined' : 'UNDEFINED!');
        
        const selectObject = {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          dateOfBirth: patients.dateOfBirth,
          mrn: patients.mrn,
          phone: patients.phone,
          address: patients.address,
          city: patients.city,
          state: patients.state,
          zip: patients.zip,
          insurancePrimary: patients.insurancePrimary
        };
        console.log(`📄 [PDFService] Select object built successfully`);
        
        console.log(`📄 [PDFService] Creating db.select()...`);
        const query = db.select(selectObject);
        console.log(`📄 [PDFService] db.select() created, type:`, typeof query);
        
        console.log(`📄 [PDFService] Adding from(patients)...`);
        const fromQuery = query.from(patients);
        console.log(`📄 [PDFService] from() added, type:`, typeof fromQuery);
        
        console.log(`📄 [PDFService] Adding where clause...`);
        const whereQuery = fromQuery.where(eq(patients.id, patientId));
        console.log(`📄 [PDFService] where() added, type:`, typeof whereQuery);
        
        console.log(`📄 [PDFService] Executing query...`);
        result = await whereQuery;
        console.log(`📄 [PDFService] Query executed!`);
      } catch (queryError) {
        console.error(`📄 [PDFService] Error during query building:`, queryError);
        console.error(`📄 [PDFService] Query error name:`, (queryError as Error).name);
        console.error(`📄 [PDFService] Query error message:`, (queryError as Error).message);
        console.error(`📄 [PDFService] Query error stack:`, (queryError as Error).stack);
        throw queryError;
      }
      
      console.log(`📄 [PDFService] Query executed successfully`);
      console.log(`📄 [PDFService] Query result for patient ${patientId}:`, result?.length || 0, 'records found');
      console.log(`📄 [PDFService] Result type:`, typeof result);
      console.log(`📄 [PDFService] Result is array:`, Array.isArray(result));
      
      if (!result || result.length === 0) {
        console.log(`📄 [PDFService] No patient found with ID: ${patientId}`);
        return null;
      }
      
      const patient = result[0];
      console.log(`📄 [PDFService] Patient found: ${patient.firstName} ${patient.lastName}`);
      console.log(`📄 [PDFService] === GETPATIENTINFO END SUCCESS ===`);
      return patient;
    } catch (error) {
      console.error(`📄 [PDFService] === GETPATIENTINFO ERROR ===`);
      console.error(`📄 [PDFService] Error in getPatientInfo:`, error);
      console.error(`📄 [PDFService] Error type:`, typeof error);
      console.error(`📄 [PDFService] Error name:`, (error as Error).name);
      console.error(`📄 [PDFService] Error message:`, (error as Error).message);
      console.error(`📄 [PDFService] Error stack:`, (error as Error).stack);
      console.error(`📄 [PDFService] === GETPATIENTINFO ERROR END ===`);
      throw error;
    }
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
            .where(eq(organizations.id, location.organizationId!));
            
            if (organization) {
              // Get health system info
              const [healthSystem] = await db.select({
                healthSystemName: healthSystems.name
              })
              .from(healthSystems)
              .where(eq(healthSystems.id, organization.healthSystemId));
              
              // Combine all the data
              locationData = {
                ...(location || {}),
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
      const providerData = await this.getProviderInfo(providerId);
      provider = providerData;
      console.log(`📄 [PDFService] Provider retrieved: ${providerData && providerData.provider ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error(`📄 [PDFService] Error fetching provider info:`, error);
      provider = null;
    }
    
    if (!patient) {
      console.error(`📄 [PDFService] ERROR: Patient not found for ID ${patientId}`);
      throw new Error('Patient not found');
    }
    
    if (!provider || !provider.provider) {
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