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
          console.log(`💊 [MedDelivery] ===== MEDICATION PDF GENERATION START =====`);
          console.log(`💊 [MedDelivery] Calling pdfService.generateMedicationPDF with:`);
          console.log(`💊 [MedDelivery] - Orders: ${medicationOrders.length} items`);
          console.log(`💊 [MedDelivery] - Patient ID: ${patientId}`);
          console.log(`💊 [MedDelivery] - Provider ID: ${providerId}`);
          console.log(`💊 [MedDelivery] - Orders details:`, JSON.stringify(medicationOrders, null, 2));
          
          const pdfBuffer = await pdfService.generateMedicationPDF(medicationOrders, patientId, providerId);
          
          console.log(`💊 [MedDelivery] ===== MEDICATION PDF GENERATION COMPLETE =====`);
          console.log(`💊 [MedDelivery] PDF buffer size: ${pdfBuffer.length} bytes`);
          console.log(`💊 [MedDelivery] PDF buffer type: ${typeof pdfBuffer}`);
          console.log(`💊 [MedDelivery] PDF buffer is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
          
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
    
    console.log(`🧪 [LabDelivery] ===== LAB DELIVERY START =====`);
    console.log(`🧪 [LabDelivery] Processing ${labOrders.length} lab orders`);
    console.log(`🧪 [LabDelivery] Delivery method: ${deliveryMethod}`);
    console.log(`🧪 [LabDelivery] Order IDs: [${orderIds.join(', ')}]`);
    console.log(`🧪 [LabDelivery] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          console.log(`🧪 [LabDelivery] ===== LAB PDF GENERATION START =====`);
          console.log(`🧪 [LabDelivery] Calling pdfService.generateLabPDF with:`);
          console.log(`🧪 [LabDelivery] - Orders: ${labOrders.length} items`);
          console.log(`🧪 [LabDelivery] - Patient ID: ${patientId}`);
          console.log(`🧪 [LabDelivery] - Provider ID: ${providerId}`);
          console.log(`🧪 [LabDelivery] - Orders details:`, JSON.stringify(labOrders, null, 2));
          
          const pdfBuffer = await pdfService.generateLabPDF(labOrders, patientId, providerId);
          
          console.log(`🧪 [LabDelivery] ===== LAB PDF GENERATION COMPLETE =====`);
          console.log(`🧪 [LabDelivery] PDF buffer size: ${pdfBuffer.length} bytes`);
          console.log(`🧪 [LabDelivery] PDF buffer type: ${typeof pdfBuffer}`);
          console.log(`🧪 [LabDelivery] PDF buffer is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
          
          const result = {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `lab_requisition_${patientId}_${Date.now()}.pdf`
          };
          console.log(`🧪 [LabDelivery] ===== LAB DELIVERY COMPLETE (SUCCESS) =====`);
          return result;
        } catch (error) {
          console.error('❌ [LabDelivery] Failed to generate lab PDF:', error);
          console.error('❌ [LabDelivery] Error details:', {
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
          console.log(`🧪 [LabDelivery] ===== LAB DELIVERY COMPLETE (FAILED) =====`);
          return result;
        }
        
      case 'mock_service':
        console.log(`🧪 [LabDelivery] Sending to mock lab service (existing workflow)`);
        const mockResult = {
          success: true,
          deliveryMethod: 'mock_service',
          orderIds
        };
        console.log(`🧪 [LabDelivery] ===== LAB DELIVERY COMPLETE (MOCK SERVICE) =====`);
        return mockResult;
        
      case 'real_service':
        console.log(`🧪 [LabDelivery] Would send to real lab service (placeholder)`);
        const realResult = {
          success: true,
          deliveryMethod: 'real_service',
          orderIds
        };
        console.log(`🧪 [LabDelivery] ===== LAB DELIVERY COMPLETE (REAL SERVICE) =====`);
        return realResult;
        
      default:
        console.error(`🧪 [LabDelivery] Unknown delivery method: ${deliveryMethod}`);
        const errorResult = {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: `Unknown delivery method: ${deliveryMethod}`
        };
        console.log(`🧪 [LabDelivery] ===== LAB DELIVERY COMPLETE (ERROR) =====`);
        return errorResult;
    }
  }
  
  private async processImagingDelivery(
    imagingOrders: any[], 
    deliveryMethod: string, 
    patientId: number, 
    providerId: number
  ): Promise<DeliveryResult> {
    
    const orderIds = imagingOrders.map(o => o.id);
    
    console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY START =====`);
    console.log(`📷 [ImagingDelivery] Processing ${imagingOrders.length} imaging orders`);
    console.log(`📷 [ImagingDelivery] Delivery method: ${deliveryMethod}`);
    console.log(`📷 [ImagingDelivery] Order IDs: [${orderIds.join(', ')}]`);
    console.log(`📷 [ImagingDelivery] Patient ID: ${patientId}, Provider ID: ${providerId}`);
    
    switch (deliveryMethod) {
      case 'print_pdf':
        try {
          console.log(`📷 [ImagingDelivery] ===== IMAGING PDF GENERATION START =====`);
          console.log(`📷 [ImagingDelivery] Calling pdfService.generateImagingPDF with:`);
          console.log(`📷 [ImagingDelivery] - Orders: ${imagingOrders.length} items`);
          console.log(`📷 [ImagingDelivery] - Patient ID: ${patientId}`);
          console.log(`📷 [ImagingDelivery] - Provider ID: ${providerId}`);
          console.log(`📷 [ImagingDelivery] - Orders details:`, JSON.stringify(imagingOrders, null, 2));
          
          const pdfBuffer = await pdfService.generateImagingPDF(imagingOrders, patientId, providerId);
          
          console.log(`📷 [ImagingDelivery] ===== IMAGING PDF GENERATION COMPLETE =====`);
          console.log(`📷 [ImagingDelivery] PDF buffer size: ${pdfBuffer.length} bytes`);
          console.log(`📷 [ImagingDelivery] PDF buffer type: ${typeof pdfBuffer}`);
          console.log(`📷 [ImagingDelivery] PDF buffer is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
          
          const result = {
            success: true,
            deliveryMethod: 'print_pdf',
            orderIds,
            pdfBuffer,
            filename: `imaging_requisition_${patientId}_${Date.now()}.pdf`
          };
          console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY COMPLETE (SUCCESS) =====`);
          return result;
        } catch (error) {
          console.error('❌ [ImagingDelivery] Failed to generate imaging PDF:', error);
          console.error('❌ [ImagingDelivery] Error details:', {
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
          console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY COMPLETE (FAILED) =====`);
          return result;
        }
        
      case 'mock_service':
        console.log(`📷 [ImagingDelivery] Would send to mock imaging service (placeholder)`);
        const mockResult = {
          success: true,
          deliveryMethod: 'mock_service',
          orderIds
        };
        console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY COMPLETE (MOCK SERVICE) =====`);
        return mockResult;
        
      case 'real_service':
        console.log(`📷 [ImagingDelivery] Would send to real imaging service (placeholder)`);
        const realResult = {
          success: true,
          deliveryMethod: 'real_service',
          orderIds
        };
        console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY COMPLETE (REAL SERVICE) =====`);
        return realResult;
        
      default:
        console.error(`📷 [ImagingDelivery] Unknown delivery method: ${deliveryMethod}`);
        const errorResult = {
          success: false,
          deliveryMethod: deliveryMethod,
          orderIds,
          error: `Unknown delivery method: ${deliveryMethod}`
        };
        console.log(`📷 [ImagingDelivery] ===== IMAGING DELIVERY COMPLETE (ERROR) =====`);
        return errorResult;
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