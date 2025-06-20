import { pdfService } from './pdf-generation-service.js';
import { db } from './db.js';
import { patientOrderPreferences, orders } from '../shared/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

interface DeliveryResult {
  success: boolean;
  deliveryMethod: string;
  orderIds: number[];
  pdfBuffer?: Buffer;
  filename?: string;
  error?: string;
}

export class OrderDeliveryService {
  
  async processOrderDelivery(orderIds: number[], patientId: number, providerId: number): Promise<DeliveryResult[]> {
    console.log(`📦 [OrderDelivery] Processing delivery for orders: [${orderIds.join(', ')}]`);
    
    // Get orders details
    const orderDetails = await db
      .select()
      .from(orders)
      .where(inArray(orders.id, orderIds));
    
    // Get patient preferences
    const preferences = await db
      .select()
      .from(patientOrderPreferences)
      .where(eq(patientOrderPreferences.patientId, patientId))
      .limit(1);
    
    const prefs = preferences[0] || this.getDefaultPreferences();
    
    // Group orders by type
    const medicationOrders = orderDetails.filter(o => o.orderType === 'medication');
    const labOrders = orderDetails.filter(o => o.orderType === 'lab');
    const imagingOrders = orderDetails.filter(o => o.orderType === 'imaging');
    
    const results: DeliveryResult[] = [];
    
    // Process medication orders
    if (medicationOrders.length > 0) {
      const result = await this.processMedicationDelivery(
        medicationOrders, 
        prefs.medicationDeliveryMethod, 
        patientId, 
        providerId
      );
      results.push(result);
    }
    
    // Process lab orders
    if (labOrders.length > 0) {
      const result = await this.processLabDelivery(
        labOrders, 
        prefs.labDeliveryMethod, 
        patientId, 
        providerId
      );
      results.push(result);
    }
    
    // Process imaging orders
    if (imagingOrders.length > 0) {
      const result = await this.processImagingDelivery(
        imagingOrders, 
        prefs.imagingDeliveryMethod, 
        patientId, 
        providerId
      );
      results.push(result);
    }
    
    return results;
  }
  
  private async processMedicationDelivery(
    medicationOrders: any[], 
    deliveryMethod: string, 
    patientId: number, 
    providerId: number
  ): Promise<DeliveryResult> {
    
    const orderIds = medicationOrders.map(o => o.id);
    
    console.log(`💊 [MedDelivery] Processing ${medicationOrders.length} medication orders via ${deliveryMethod}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          const pdfBuffer = await pdfService.generateMedicationPDF(medicationOrders, patientId, providerId);
          return {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `prescription_${patientId}_${Date.now()}.pdf`
          };
        } catch (error) {
          console.error('Failed to generate medication PDF:', error);
          return {
            success: false,
            deliveryMethod: 'print_pdf',
            orderIds,
            error: 'Failed to generate PDF'
          };
        }
        
      case 'preferred_pharmacy':
        // Placeholder for SureScripts integration
        console.log(`💊 [MedDelivery] Would send to preferred pharmacy (placeholder)`);
        return {
          success: true,
          deliveryMethod: 'preferred_pharmacy',
          orderIds
        };
        
      default:
        return {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: 'Unknown delivery method'
        };
    }
  }
  
  private async processLabDelivery(
    labOrders: any[], 
    deliveryMethod: string, 
    patientId: number, 
    providerId: number
  ): Promise<DeliveryResult> {
    
    const orderIds = labOrders.map(o => o.id);
    
    console.log(`🧪 [LabDelivery] Processing ${labOrders.length} lab orders via ${deliveryMethod}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          const pdfBuffer = await pdfService.generateLabPDF(labOrders, patientId, providerId);
          return {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `lab_requisition_${patientId}_${Date.now()}.pdf`
          };
        } catch (error) {
          console.error('Failed to generate lab PDF:', error);
          return {
            success: false,
            deliveryMethod: 'print_pdf',
            orderIds,
            error: 'Failed to generate PDF'
          };
        }
        
      case 'mock_service':
        // This goes through existing lab processor
        console.log(`🧪 [LabDelivery] Sending to mock lab service (existing workflow)`);
        return {
          success: true,
          deliveryMethod: 'mock_service',
          orderIds
        };
        
      case 'real_service':
        // Placeholder for real lab service integration
        console.log(`🧪 [LabDelivery] Would send to real lab service (placeholder)`);
        return {
          success: true,
          deliveryMethod: 'real_service',
          orderIds
        };
        
      default:
        return {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: 'Unknown delivery method'
        };
    }
  }
  
  private async processImagingDelivery(
    imagingOrders: any[], 
    deliveryMethod: string, 
    patientId: number, 
    providerId: number
  ): Promise<DeliveryResult> {
    
    const orderIds = imagingOrders.map(o => o.id);
    
    console.log(`📷 [ImagingDelivery] Processing ${imagingOrders.length} imaging orders via ${deliveryMethod}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          const pdfBuffer = await pdfService.generateImagingPDF(imagingOrders, patientId, providerId);
          return {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `imaging_requisition_${patientId}_${Date.now()}.pdf`
          };
        } catch (error) {
          console.error('Failed to generate imaging PDF:', error);
          return {
            success: false,
            deliveryMethod: 'print_pdf',
            orderIds,
            error: 'Failed to generate PDF'
          };
        }
        
      case 'mock_service':
        // Placeholder for mock imaging service
        console.log(`📷 [ImagingDelivery] Would send to mock imaging service (placeholder)`);
        return {
          success: true,
          deliveryMethod: 'mock_service',
          orderIds
        };
        
      case 'real_service':
        // Placeholder for real imaging service integration
        console.log(`📷 [ImagingDelivery] Would send to real imaging service (placeholder)`);
        return {
          success: true,
          deliveryMethod: 'real_service',
          orderIds
        };
        
      default:
        return {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: 'Unknown delivery method'
        };
    }
  }
  
  private getDefaultPreferences() {
    return {
      labDeliveryMethod: 'mock_service',
      imagingDeliveryMethod: 'print_pdf',
      medicationDeliveryMethod: 'preferred_pharmacy'
    };
  }
}

export const orderDeliveryService = new OrderDeliveryService();