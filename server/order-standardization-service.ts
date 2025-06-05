import { InsertOrder } from "../shared/schema.js";

/**
 * Order Standardization Service
 * Ensures all orders meet real-world EMR integration requirements
 * regardless of creation method (manual entry or AI extraction)
 */
export class OrderStandardizationService {
  
  /**
   * Standardizes and validates a draft order to ensure all required fields
   * for external integrations are properly populated
   */
  static standardizeOrder(order: Partial<InsertOrder>): InsertOrder {
    const standardized = { ...order } as InsertOrder;
    
    // Apply standardization based on order type
    switch (order.orderType) {
      case 'medication':
        return this.standardizeMedicationOrder(standardized);
      case 'lab':
        return this.standardizeLabOrder(standardized);
      case 'imaging':
        return this.standardizeImagingOrder(standardized);
      case 'referral':
        return this.standardizeReferralOrder(standardized);
      default:
        throw new Error(`Unknown order type: ${order.orderType}`);
    }
  }

  /**
   * Standardizes medication orders for pharmacy integrations
   * Required for systems like SureScripts, Epic MyChart Pharmacy
   */
  private static standardizeMedicationOrder(order: InsertOrder): InsertOrder {
    return {
      ...order,
      // Core medication fields (required for pharmacy integration)
      medicationName: order.medicationName || '',
      dosage: order.dosage || '',
      quantity: order.quantity || 30, // Default 30-day supply
      sig: order.sig || 'Take as directed',
      refills: order.refills || 0,
      
      // Pharmacy-specific requirements
      form: order.form || 'tablet', // Required for NDC lookup
      routeOfAdministration: order.routeOfAdministration || 'oral',
      daysSupply: order.daysSupply || 30,
      
      // Clinical requirements (will be enhanced by GPT if incomplete)
      clinicalIndication: order.clinicalIndication || 'Clinical evaluation needed',
      diagnosisCode: order.diagnosisCode || '', // Will be populated by GPT enhancement
      requiresPriorAuth: order.requiresPriorAuth || false, // Will be determined by GPT
      
      // Default values for required fields
      priority: order.priority || 'routine',
      orderStatus: order.orderStatus || 'draft'
    };
  }

  /**
   * Standardizes lab orders for laboratory integrations
   * Required for LabCorp, Quest Diagnostics, hospital lab systems
   */
  private static standardizeLabOrder(order: InsertOrder): InsertOrder {
    return {
      ...order,
      // Core lab identification (required for lab routing)
      testName: order.testName || '',
      labName: order.labName || order.testName || '', // Panel name for grouping
      
      // Collection requirements (critical for lab processing)
      specimenType: order.specimenType || 'blood', // Default to blood
      fastingRequired: order.fastingRequired || false,
      
      // Clinical requirements
      clinicalIndication: order.clinicalIndication || 'Routine screening',
      testCode: order.testCode || '', // LOINC or CPT code for billing
      
      // Priority and timing (affects lab processing queue)
      priority: order.priority || 'routine',
      orderStatus: order.orderStatus || 'draft',
      
      // Additional lab-specific fields for integration
      providerNotes: order.providerNotes || ''
    };
  }

  /**
   * Standardizes imaging orders for radiology integrations
   * Required for PACS systems, imaging centers, hospital radiology
   */
  private static standardizeImagingOrder(order: InsertOrder): InsertOrder {
    return {
      ...order,
      // Core imaging identification (required for DICOM routing)
      studyType: order.studyType || '',
      region: order.region || '', // Body part/anatomical region
      
      // Technical requirements (affects imaging protocol)
      laterality: order.laterality || '', // Critical for bilateral structures
      contrastNeeded: order.contrastNeeded || false, // Affects prep and scheduling
      
      // Clinical requirements
      clinicalIndication: order.clinicalIndication || 'Clinical correlation needed',
      
      // Scheduling and priority
      priority: order.priority || 'routine',
      orderStatus: order.orderStatus || 'draft',
      
      // Additional imaging-specific fields
      providerNotes: order.providerNotes || '',
      urgency: order.urgency || order.priority || 'routine'
    };
  }

  /**
   * Standardizes referral orders for provider network integrations
   * Required for Epic Care Everywhere, health information exchanges
   */
  private static standardizeReferralOrder(order: InsertOrder): InsertOrder {
    return {
      ...order,
      // Core referral identification
      specialtyType: order.specialtyType || '',
      providerName: order.providerName || '', // Specific provider if known
      
      // Clinical requirements
      clinicalIndication: order.clinicalIndication || 'Specialist evaluation needed',
      
      // Urgency and priority
      urgency: order.urgency || 'routine',
      priority: order.priority || 'routine',
      orderStatus: order.orderStatus || 'draft',
      
      // Additional referral-specific fields
      providerNotes: order.providerNotes || ''
    };
  }

  /**
   * Validates that an order has all required fields for external integration
   * Returns validation errors if any critical fields are missing
   */
  static validateOrderForIntegration(order: InsertOrder): string[] {
    const errors: string[] = [];
    
    // Common required fields for all orders
    if (!order.patientId) errors.push('Patient ID is required');
    if (!order.orderType) errors.push('Order type is required');
    if (!order.clinicalIndication) errors.push('Clinical indication is required for all orders');
    
    // Type-specific validation
    switch (order.orderType) {
      case 'medication':
        if (!order.medicationName) errors.push('Medication name is required');
        if (!order.dosage) errors.push('Dosage is required for medication orders');
        if (!order.sig) errors.push('Sig (instructions) is required for medication orders');
        if (!order.quantity || order.quantity <= 0) errors.push('Valid quantity is required for medication orders');
        break;
        
      case 'lab':
        if (!order.testName) errors.push('Test name is required for lab orders');
        if (!order.specimenType) errors.push('Specimen type is required for lab orders');
        break;
        
      case 'imaging':
        if (!order.studyType) errors.push('Study type is required for imaging orders');
        if (!order.region) errors.push('Body region is required for imaging orders');
        break;
        
      case 'referral':
        if (!order.specialtyType) errors.push('Specialty type is required for referral orders');
        break;
    }
    
    return errors;
  }

  /**
   * Maps internal priority values to external system standards
   * Ensures compatibility with HL7 FHIR and other integration standards
   */
  static mapPriorityForIntegration(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'stat': 'STAT',
      'urgent': 'URGENT', 
      'routine': 'ROUTINE',
      'asap': 'URGENT'
    };
    
    return priorityMap[priority.toLowerCase()] || 'ROUTINE';
  }

  /**
   * Generates HL7-compatible order identifiers for external integrations
   */
  static generateIntegrationIdentifier(order: InsertOrder): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const orderTypePrefix = order.orderType.substring(0, 3).toUpperCase();
    return `${orderTypePrefix}-${order.patientId}-${timestamp}`;
  }


}