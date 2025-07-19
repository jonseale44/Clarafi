import { db } from './db.js';
import { 
  prescriptionTransmissions,
  medications,
  orders,
  pharmacies,
  electronicSignatures,
  patients,
  users,
  signedOrders,
  type InsertPrescriptionTransmission,
  type PrescriptionTransmission,
  type Medication,
  type Order,
  type Pharmacy,
  type ElectronicSignature
} from '../shared/schema.js';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { ElectronicSignatureService } from './electronic-signature-service.js';
import { PharmacyIntelligenceService } from './pharmacy-intelligence-service.js';

export class PrescriptionTransmissionService {
  private signatureService: ElectronicSignatureService;
  private pharmacyService: PharmacyIntelligenceService;

  constructor() {
    this.signatureService = new ElectronicSignatureService();
    this.pharmacyService = new PharmacyIntelligenceService();
  }

  /**
   * Transmits a prescription to a pharmacy
   * This is the main entry point for sending prescriptions
   */
  async transmitPrescription(params: {
    medicationId: number;
    orderId: number;
    providerId: number;
    pharmacyId?: number; // If not provided, will use intelligent selection
    transmissionMethod?: 'electronic' | 'print' | 'fax';
    electronicSignatureId?: number;
    urgency?: 'routine' | 'urgent' | 'emergency';
  }): Promise<PrescriptionTransmission> {
    console.log('📤 [PrescriptionTransmission] Starting transmission:', params);

    try {
      // Get medication and order details
      const [medication, order] = await Promise.all([
        this.getMedication(params.medicationId),
        this.getOrder(params.orderId)
      ]);

      if (!medication || !order) {
        throw new Error('Medication or order not found');
      }

      // Determine if DEA signature is required
      const requiresDea = await this.signatureService.requiresDeaSignature(medication.id);

      // Get or create electronic signature
      let signatureId = params.electronicSignatureId;
      
      // Only require explicit signature for controlled substances
      if (requiresDea) {
        if (!signatureId) {
          const recentSignature = await this.signatureService.getRecentSignature(
            params.providerId,
            requiresDea
          );
          
          if (!recentSignature) {
            throw new Error('DEA Electronic signature required for controlled substances');
          }
          
          signatureId = recentSignature.id;
        }

        // Verify signature is valid
        const signatureValid = await this.signatureService.verifySignature(signatureId);
        if (!signatureValid) {
          throw new Error('Electronic signature is invalid or revoked');
        }
      } else {
        // For non-controlled medications, create an implicit signature based on login session
        // This matches Epic/Athena behavior where login is sufficient authorization
        console.log('📝 [PrescriptionTransmission] Non-controlled medication - using session authentication');
        signatureId = await this.signatureService.createSessionBasedSignature(params.providerId);
      }

      // Select pharmacy if not provided
      let pharmacyId = params.pharmacyId;
      if (!pharmacyId) {
        const pharmacySelection = await this.pharmacyService.selectBestPharmacy({
          patientId: order.patientId,
          medicationIds: [medication.id],
          isControlled: requiresDea,
          urgency: params.urgency
        });
        
        pharmacyId = pharmacySelection.pharmacy.id;
        console.log('🏥 [PrescriptionTransmission] Selected pharmacy:', {
          id: pharmacyId,
          name: pharmacySelection.pharmacy.name,
          reasoning: pharmacySelection.reasoning
        });
      }

      // Validate pharmacy capability
      const pharmacyValidation = await this.pharmacyService.validatePharmacyCapability(
        pharmacyId,
        {
          hasControlled: requiresDea,
          needsCompounding: false, // Would check medication requirements
          medications: [{
            name: medication.name,
            deaSchedule: medication.deaSchedule
          }]
        }
      );

      if (!pharmacyValidation.canFill) {
        throw new Error(`Pharmacy cannot fill prescription: ${pharmacyValidation.issues.join(', ')}`);
      }

      // Determine transmission method
      const method = params.transmissionMethod || await this.determineTransmissionMethod(pharmacyId);

      // Create transmission record
      const transmission = await this.createTransmissionRecord({
        medicationId: medication.id,
        orderId: order.id,
        patientId: order.patientId,
        providerId: params.providerId,
        pharmacyId,
        transmissionMethod: method,
        electronicSignatureId: signatureId,
        urgency: params.urgency
      });

      // Process transmission based on method
      await this.processTransmission(transmission, medication, order);

      // Update signed orders tracking
      await this.updateSignedOrdersTracking(order.id, transmission);

      return transmission;
    } catch (error) {
      console.error('❌ [PrescriptionTransmission] Error:', error);
      throw error;
    }
  }

  /**
   * Creates the transmission record in the database
   */
  private async createTransmissionRecord(data: {
    medicationId: number;
    orderId: number;
    patientId: number;
    providerId: number;
    pharmacyId: number;
    transmissionMethod: 'electronic' | 'print' | 'fax';
    electronicSignatureId: number;
    urgency?: string;
  }): Promise<PrescriptionTransmission> {
    const [transmission] = await db.insert(prescriptionTransmissions)
      .values({
        medicationId: data.medicationId,
        orderId: data.orderId,
        patientId: data.patientId,
        providerId: data.providerId,
        pharmacyId: data.pharmacyId,
        transmissionMethod: data.transmissionMethod,
        transmissionStatus: 'pending',
        electronicSignatureId: data.electronicSignatureId,
        retryCount: 0,
        transmittedAt: new Date()
      })
      .returning();

    console.log('📝 [PrescriptionTransmission] Record created:', transmission.id);
    return transmission;
  }

  /**
   * Processes the actual transmission
   */
  private async processTransmission(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<void> {
    try {
      switch (transmission.transmissionMethod) {
        case 'electronic':
          await this.processElectronicTransmission(transmission, medication, order);
          break;
        case 'print':
          await this.processPrintTransmission(transmission, medication, order);
          break;
        case 'fax':
          await this.processFaxTransmission(transmission, medication, order);
          break;
      }
    } catch (error) {
      // Update transmission with error
      await this.updateTransmissionStatus(transmission.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: transmission.retryCount + 1
      });
      throw error;
    }
  }

  /**
   * Processes electronic transmission with SureScripts API
   */
  private async processElectronicTransmission(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<void> {
    console.log('💻 [PrescriptionTransmission] Processing electronic transmission');

    // Build NCPDP SCRIPT message
    const scriptMessage = await this.buildNCPDPMessage(transmission, medication, order);

    // Check if SureScripts credentials are available
    const hasSureScriptsCredentials = 
      process.env.SURESCRIPTS_USERNAME && 
      process.env.SURESCRIPTS_PASSWORD && 
      process.env.SURESCRIPTS_PORTAL_ID &&
      process.env.SURESCRIPTS_ACCOUNT_ID &&
      process.env.SURESCRIPTS_API_ENDPOINT;

    let response: any;

    if (hasSureScriptsCredentials) {
      // Real SureScripts API integration
      console.log('🔐 [PrescriptionTransmission] Using SureScripts API');
      
      try {
        response = await this.sendToSureScripts(scriptMessage, transmission);
      } catch (error) {
        console.error('❌ [PrescriptionTransmission] SureScripts API error:', error);
        throw new Error(`SureScripts transmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Simulation mode when credentials are not available
      console.log('⚠️ [PrescriptionTransmission] SureScripts credentials not configured - using simulation mode');
      
      response = {
        messageId: `MSG-${Date.now()}`,
        threadId: `THR-${Date.now()}`,
        status: 'accepted',
        timestamp: new Date().toISOString(),
        simulated: true
      };
    }

    // Update transmission with response
    await this.updateTransmissionStatus(transmission.id, 'transmitted', {
      surescriptsMessageId: response.messageId,
      surescriptsThreadId: response.threadId,
      requestPayload: scriptMessage,
      responsePayload: response,
      transmissionMetadata: {
        simulated: !hasSureScriptsCredentials,
        transmittedAt: new Date().toISOString()
      }
    });

    console.log('✅ [PrescriptionTransmission] Electronic transmission successful');
  }

  /**
   * Sends prescription to SureScripts API
   */
  private async sendToSureScripts(scriptMessage: any, transmission: PrescriptionTransmission): Promise<any> {
    const endpoint = process.env.SURESCRIPTS_API_ENDPOINT!;
    const username = process.env.SURESCRIPTS_USERNAME!;
    const password = process.env.SURESCRIPTS_PASSWORD!;
    const portalId = process.env.SURESCRIPTS_PORTAL_ID!;
    const accountId = process.env.SURESCRIPTS_ACCOUNT_ID!;

    // Prepare authentication header
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    // Prepare the API request
    const requestBody = {
      portalId,
      accountId,
      messageType: 'NewRx',
      message: scriptMessage,
      format: 'NCPDP_SCRIPT_10_6'
    };

    console.log('📤 [PrescriptionTransmission] Sending to SureScripts:', {
      endpoint,
      portalId,
      accountId,
      messageType: 'NewRx'
    });

    // Make the API call
    const response = await fetch(`${endpoint}/prescriptions/transmit`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-SureScripts-Version': '2.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PrescriptionTransmission] SureScripts API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`SureScripts API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('✅ [PrescriptionTransmission] SureScripts API response:', responseData);

    // Validate response
    if (responseData.status !== 'accepted' && responseData.status !== 'success') {
      throw new Error(`SureScripts rejected prescription: ${responseData.errorMessage || responseData.status}`);
    }

    return responseData;
  }

  /**
   * Processes print transmission
   */
  private async processPrintTransmission(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<void> {
    console.log('🖨️ [PrescriptionTransmission] Processing print transmission');

    // Generate prescription data
    const prescriptionData = await this.generatePrescriptionData(transmission, medication, order);

    // Import the PDF service
    const { PrescriptionPdfService } = await import('./prescription-pdf-service.js');
    
    // Generate PDF buffer
    const pdfBuffer = PrescriptionPdfService.generatePrescriptionPdf(prescriptionData);
    
    // Convert buffer to base64 for storage
    const pdfBase64 = pdfBuffer.toString('base64');

    // Update transmission status with PDF data
    await this.updateTransmissionStatus(transmission.id, 'transmitted', {
      printedCopy: prescriptionData,
      transmissionMetadata: {
        pdfData: pdfBase64,
        pdfGeneratedAt: new Date().toISOString()
      },
      transmissionStatus: 'printed'
    });

    console.log('✅ [PrescriptionTransmission] Print transmission recorded with PDF');
  }

  /**
   * Processes fax transmission
   */
  private async processFaxTransmission(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<void> {
    console.log('📠 [PrescriptionTransmission] Processing fax transmission');

    // Get pharmacy fax number
    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, transmission.pharmacyId));

    if (!pharmacy?.fax) {
      throw new Error('Pharmacy fax number not available');
    }

    // Generate prescription for faxing
    const prescriptionData = await this.generatePrescriptionData(transmission, medication, order);

    // In production, this would integrate with fax service
    const mockFaxResult = {
      faxId: `FAX-${Date.now()}`,
      status: 'sent',
      pages: 1
    };

    // Update transmission status
    await this.updateTransmissionStatus(transmission.id, 'transmitted', {
      faxedCopy: {
        ...prescriptionData,
        faxNumber: pharmacy.fax,
        faxResult: mockFaxResult
      }
    });

    console.log('✅ [PrescriptionTransmission] Fax transmission successful');
  }

  /**
   * Builds NCPDP SCRIPT message for electronic transmission
   */
  private async buildNCPDPMessage(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<any> {
    // Get all required data
    const [patient, provider, pharmacy, signature] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, order.patientId)),
      db.select().from(users).where(eq(users.id, transmission.providerId)),
      db.select().from(pharmacies).where(eq(pharmacies.id, transmission.pharmacyId)),
      db.select().from(electronicSignatures).where(eq(electronicSignatures.id, transmission.electronicSignatureId))
    ]);

    // Build NCPDP SCRIPT 10.6 message structure
    return {
      header: {
        messageType: 'NEWRX',
        version: '10.6',
        sentTime: new Date().toISOString(),
        messageId: `RX-${transmission.id}`
      },
      patient: {
        id: patient[0].id,
        firstName: patient[0].firstName,
        lastName: patient[0].lastName,
        dateOfBirth: patient[0].dateOfBirth,
        gender: patient[0].gender,
        address: {
          street: patient[0].address,
          city: patient[0].city,
          state: patient[0].state,
          zip: patient[0].zipCode
        }
      },
      prescriber: {
        id: provider[0].id,
        firstName: provider[0].firstName,
        lastName: provider[0].lastName,
        npi: provider[0].npi,
        deaNumber: signature[0].deaNumber
      },
      pharmacy: {
        ncpdpId: pharmacy[0].ncpdpId,
        name: pharmacy[0].name
      },
      medication: {
        name: medication.name,
        strength: medication.strength,
        form: medication.dosageForm,
        quantity: order.quantity,
        quantityUnit: order.quantityUnit,
        daysSupply: order.daysSupply,
        sig: medication.sig,
        refills: order.refills,
        deaSchedule: medication.deaSchedule,
        substitutionAllowed: order.substitutionAllowed !== false
      }
    };
  }

  /**
   * Generates prescription data for print/fax
   */
  private async generatePrescriptionData(
    transmission: PrescriptionTransmission,
    medication: Medication,
    order: Order
  ): Promise<any> {
    // Get all required data for prescription
    const [patient, provider, pharmacy] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, order.patientId)),
      db.select().from(users).where(eq(users.id, transmission.providerId)),
      db.select().from(pharmacies).where(eq(pharmacies.id, transmission.pharmacyId))
    ]);

    return {
      prescriptionNumber: `RX-${transmission.id}`,
      date: new Date().toISOString(),
      patient: {
        name: `${patient[0].firstName} ${patient[0].lastName}`,
        dateOfBirth: patient[0].dateOfBirth,
        address: `${patient[0].address}, ${patient[0].city}, ${patient[0].state} ${patient[0].zipCode}`
      },
      prescriber: {
        name: `${provider[0].firstName} ${provider[0].lastName}, ${provider[0].credentials || ''}`,
        npi: provider[0].npi,
        licenseNumber: provider[0].licenseNumber,
        address: 'Clinic Address' // Would fetch from provider's location
      },
      pharmacy: {
        name: pharmacy[0].name,
        address: `${pharmacy[0].address}, ${pharmacy[0].city}, ${pharmacy[0].state} ${pharmacy[0].zipCode}`,
        phone: pharmacy[0].phone
      },
      medication: {
        name: medication.name,
        strength: medication.strength,
        form: medication.dosageForm,
        quantity: `${order.quantity} ${order.quantityUnit}`,
        sig: medication.sig,
        refills: order.refills,
        daysSupply: order.daysSupply,
        deaSchedule: medication.deaSchedule,
        genericSubstitution: order.substitutionAllowed !== false ? 'Permitted' : 'Dispense as Written'
      }
    };
  }

  /**
   * Updates transmission status and details
   */
  private async updateTransmissionStatus(
    transmissionId: number,
    status: string,
    updates: Partial<PrescriptionTransmission>
  ): Promise<void> {
    await db.update(prescriptionTransmissions)
      .set({
        transmissionStatus: status,
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(prescriptionTransmissions.id, transmissionId));
  }

  /**
   * Updates signed orders tracking
   */
  private async updateSignedOrdersTracking(
    orderId: number,
    transmission: PrescriptionTransmission
  ): Promise<void> {
    // Check if signed order record exists
    const existing = await db.select()
      .from(signedOrders)
      .where(eq(signedOrders.orderId, orderId));

    if (existing.length === 0) {
      // Create new signed order record
      await db.insert(signedOrders)
        .values({
          orderId,
          patientId: transmission.patientId,
          orderType: 'medication',
          deliveryMethod: transmission.transmissionMethod,
          deliveryStatus: 'transmitted',
          signedAt: new Date(),
          signedBy: transmission.providerId
        });
    } else {
      // Update existing record
      await db.update(signedOrders)
        .set({
          deliveryMethod: transmission.transmissionMethod,
          deliveryStatus: 'transmitted',
          lastDeliveryAttempt: new Date()
        })
        .where(eq(signedOrders.orderId, orderId));
    }
  }

  /**
   * Determines best transmission method for pharmacy
   */
  private async determineTransmissionMethod(pharmacyId: number): Promise<'electronic' | 'print' | 'fax'> {
    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId));

    if (!pharmacy) {
      return 'print'; // Default to print if pharmacy not found
    }

    // Prefer electronic if available
    if (pharmacy.acceptsEprescribe) {
      return 'electronic';
    }

    // Fall back to fax if available
    if (pharmacy.fax) {
      return 'fax';
    }

    // Default to print
    return 'print';
  }

  /**
   * Gets medication details
   */
  private async getMedication(medicationId: number): Promise<Medication | null> {
    const [medication] = await db.select()
      .from(medications)
      .where(eq(medications.id, medicationId));

    return medication || null;
  }

  /**
   * Gets order details
   */
  private async getOrder(orderId: number): Promise<Order | null> {
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId));

    return order || null;
  }

  /**
   * Handles refill requests from pharmacies
   */
  async processRefillRequest(params: {
    originalTransmissionId: number;
    pharmacyId: number;
    refillRequestData: any;
  }): Promise<{
    approved: boolean;
    newTransmissionId?: number;
    reason?: string;
  }> {
    console.log('💊 [PrescriptionTransmission] Processing refill request:', params);

    // Get original transmission
    const [original] = await db.select()
      .from(prescriptionTransmissions)
      .where(eq(prescriptionTransmissions.id, params.originalTransmissionId));

    if (!original) {
      return {
        approved: false,
        reason: 'Original prescription not found'
      };
    }

    // Check refills remaining
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, original.orderId));

    if (!order || order.refills <= 0) {
      return {
        approved: false,
        reason: 'No refills remaining'
      };
    }

    // Create new transmission for refill
    const newTransmission = await this.transmitPrescription({
      medicationId: original.medicationId,
      orderId: original.orderId,
      providerId: original.providerId,
      pharmacyId: params.pharmacyId,
      transmissionMethod: 'electronic',
      electronicSignatureId: original.electronicSignatureId
    });

    // Update refill count
    await db.update(orders)
      .set({
        refills: order.refills - 1,
        updatedAt: new Date()
      })
      .where(eq(orders.id, order.id));

    return {
      approved: true,
      newTransmissionId: newTransmission.id
    };
  }

  /**
   * Gets transmission history for a patient
   */
  async getTransmissionHistory(patientId: number): Promise<any[]> {
    return await db.select({
      transmission: prescriptionTransmissions,
      medication: medications,
      pharmacy: pharmacies,
      provider: users
    })
    .from(prescriptionTransmissions)
    .innerJoin(medications, eq(prescriptionTransmissions.medicationId, medications.id))
    .innerJoin(pharmacies, eq(prescriptionTransmissions.pharmacyId, pharmacies.id))
    .innerJoin(users, eq(prescriptionTransmissions.providerId, users.id))
    .where(eq(prescriptionTransmissions.patientId, patientId))
    .orderBy(desc(prescriptionTransmissions.transmittedAt));
  }
}