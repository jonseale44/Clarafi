import { pdfService } from './pdf-generation-service.js';
import { db } from './db.js';
import { patientOrderPreferences, orders, signedOrders } from '../shared/schema.js';
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

  async processSignedOrder(orderId: number, userId: number): Promise<void> {
    console.log(`🚀 [OrderDelivery] ===== PROCESS SIGNED ORDER START =====`);
    console.log(`🚀 [OrderDelivery] Order ID: ${orderId}, User ID: ${userId}`);
    
    try {
      // Get order details
      console.log(`🚀 [OrderDelivery] Fetching order details...`);
      const orderDetails = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (orderDetails.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const order = orderDetails[0];
      console.log(`🚀 [OrderDelivery] Order found:`, JSON.stringify(order, null, 2));
      
      // Process the delivery
      const results = await this.processOrderDelivery([orderId], order.patientId, userId);
      console.log(`🚀 [OrderDelivery] Delivery results:`, JSON.stringify(results, null, 2));
      
      console.log(`✅ [OrderDelivery] ===== PROCESS SIGNED ORDER COMPLETE =====`);
    } catch (error) {
      console.error(`❌ [OrderDelivery] ===== PROCESS SIGNED ORDER FAILED =====`);
      console.error(`❌ [OrderDelivery] Error:`, error);
      throw error;
    }
  }
  
  async processOrderDelivery(orderIds: number[], patientId: number, providerId: number): Promise<DeliveryResult[]> {
    console.log(`📦 [OrderDelivery] ===== ORDER DELIVERY PROCESSING START =====`);
    console.log(`📦 [OrderDelivery] Order IDs: [${orderIds.join(', ')}]`);
    console.log(`📦 [OrderDelivery] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    
    try {
      // Get orders details
      console.log(`📦 [OrderDelivery] Fetching order details from database...`);
      const orderDetails = await db
        .select()
        .from(orders)
        .where(inArray(orders.id, orderIds));
      
      console.log(`📦 [OrderDelivery] Found ${orderDetails.length} orders in database`);
      console.log(`📦 [OrderDelivery] Order details:`, JSON.stringify(orderDetails, null, 2));
      
      // Get patient preferences
      console.log(`📦 [OrderDelivery] Fetching patient preferences...`);
      const preferences = await db
        .select()
        .from(patientOrderPreferences)
        .where(eq(patientOrderPreferences.patientId, patientId))
        .limit(1);
      
      const prefs = preferences[0] || this.getDefaultPreferences();
      console.log(`📦 [OrderDelivery] Patient preferences:`, JSON.stringify(prefs, null, 2));
      
      // Group orders by type
      const medicationOrders = orderDetails.filter(o => o.orderType === 'medication');
      const labOrders = orderDetails.filter(o => o.orderType === 'lab');
      const imagingOrders = orderDetails.filter(o => o.orderType === 'imaging');
      
      console.log(`📦 [OrderDelivery] Order grouping:`);
      console.log(`📦 [OrderDelivery] - Medications: ${medicationOrders.length}`);
      console.log(`📦 [OrderDelivery] - Labs: ${labOrders.length}`);
      console.log(`📦 [OrderDelivery] - Imaging: ${imagingOrders.length}`);
      
      const results: DeliveryResult[] = [];
      
      // Process medication orders
      if (medicationOrders.length > 0) {
        console.log(`📦 [OrderDelivery] Processing ${medicationOrders.length} medication orders...`);
        const result = await this.processMedicationDelivery(
          medicationOrders, 
          prefs.medicationDeliveryMethod, 
          patientId, 
          providerId
        );
        results.push(result);
        console.log(`📦 [OrderDelivery] Medication delivery result:`, JSON.stringify(result, null, 2));
      }
      
      // Process lab orders
      if (labOrders.length > 0) {
        console.log(`📦 [OrderDelivery] Processing ${labOrders.length} lab orders...`);
        const result = await this.processLabDelivery(
          labOrders, 
          prefs.labDeliveryMethod, 
          patientId, 
          providerId
        );
        results.push(result);
        console.log(`📦 [OrderDelivery] Lab delivery result:`, JSON.stringify(result, null, 2));
      }
      
      // Process imaging orders
      if (imagingOrders.length > 0) {
        console.log(`📦 [OrderDelivery] Processing ${imagingOrders.length} imaging orders...`);
        const result = await this.processImagingDelivery(
          imagingOrders, 
          prefs.imagingDeliveryMethod, 
          patientId, 
          providerId
        );
        results.push(result);
        console.log(`📦 [OrderDelivery] Imaging delivery result:`, JSON.stringify(result, null, 2));
      }
      
      // Record signed orders for post-signature management
      console.log(`📦 [OrderDelivery] Recording signed orders for post-signature management...`);
      for (const orderDetail of orderDetails) {
        try {
          const signedOrderData = {
            orderId: orderDetail.id,
            patientId: orderDetail.patientId,
            encounterId: orderDetail.encounterId,
            orderType: orderDetail.orderType,
            deliveryMethod: this.getDeliveryMethodForOrder(orderDetail.orderType, prefs),
            deliveryStatus: 'pending',
            originalDeliveryMethod: this.getDeliveryMethodForOrder(orderDetail.orderType, prefs),
            signedAt: new Date(),
            signedBy: providerId
          };

          await db.insert(signedOrders).values(signedOrderData);
          console.log(`📦 [OrderDelivery] Recorded signed order ${orderDetail.id} in tracking table`);
        } catch (recordError) {
          console.error(`❌ [OrderDelivery] Failed to record signed order ${orderDetail.id}:`, recordError);
        }
      }

      console.log(`📦 [OrderDelivery] ===== ORDER DELIVERY PROCESSING COMPLETE =====`);
      console.log(`📦 [OrderDelivery] Total results: ${results.length}`);
      
      return results;
    } catch (error) {
      console.error(`❌ [OrderDelivery] ORDER DELIVERY PROCESSING FAILED:`, error);
      console.error(`❌ [OrderDelivery] Error stack:`, error.stack);
      throw error;
    }
  }
  
  private async processMedicationDelivery(
    medicationOrders: any[], 
    deliveryMethod: string, 
    patientId: number, 
    providerId: number
  ): Promise<DeliveryResult> {
    
    const orderIds = medicationOrders.map(o => o.id);
    
    console.log(`💊 [MedDelivery] ===== MEDICATION DELIVERY START =====`);
    console.log(`💊 [MedDelivery] Processing ${medicationOrders.length} medication orders`);
    console.log(`💊 [MedDelivery] Delivery method: ${deliveryMethod}`);
    console.log(`💊 [MedDelivery] Order IDs: [${orderIds.join(', ')}]`);
    console.log(`💊 [MedDelivery] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          console.log(`💊 [MedDelivery] Generating PDF for medication orders...`);
          const pdfBuffer = await pdfService.generateMedicationPDF(medicationOrders, patientId, providerId);
          console.log(`💊 [MedDelivery] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
          
          const result = {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `prescription_${patientId}_${Date.now()}.pdf`
          };
          console.log(`💊 [MedDelivery] ===== MEDICATION DELIVERY COMPLETE (SUCCESS) =====`);
          return result;
        } catch (error) {
          console.error('❌ [MedDelivery] Failed to generate medication PDF:', error);
          console.error('❌ [MedDelivery] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          const result = {
            success: false,
            deliveryMethod: 'print_pdf',
            orderIds,
            error: `Failed to generate PDF: ${error.message}`
          };
          console.log(`💊 [MedDelivery] ===== MEDICATION DELIVERY COMPLETE (FAILED) =====`);
          return result;
        }
        
      case 'preferred_pharmacy':
        console.log(`💊 [MedDelivery] Would send to preferred pharmacy (placeholder)`);
        const result = {
          success: true,
          deliveryMethod: 'preferred_pharmacy',
          orderIds
        };
        console.log(`💊 [MedDelivery] ===== MEDICATION DELIVERY COMPLETE (PHARMACY) =====`);
        return result;
        
      default:
        console.error(`💊 [MedDelivery] Unknown delivery method: ${deliveryMethod}`);
        const errorResult = {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: `Unknown delivery method: ${deliveryMethod}`
        };
        console.log(`💊 [MedDelivery] ===== MEDICATION DELIVERY COMPLETE (ERROR) =====`);
        return errorResult;
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

  private getDeliveryMethodForOrder(orderType: string, prefs: any): string {
    switch (orderType) {
      case 'medication':
        return prefs.medicationDeliveryMethod || 'preferred_pharmacy';
      case 'lab':
        return prefs.labDeliveryMethod || 'mock_service';
      case 'imaging':
        return prefs.imagingDeliveryMethod || 'print_pdf';
      default:
        return 'unknown';
    }
  }
}

export const orderDeliveryService = new OrderDeliveryService();