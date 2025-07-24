/**
 * HL7 Receiver Service
 * 
 * Receives and processes HL7 messages from external labs
 * Works alongside existing GPT attachment processing
 */

import { db } from "./db.js";
import { 
  labOrders, 
  labResults, 
  externalLabs,
  patients,
  hl7Messages
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { HL7Parser, ParsedHL7Result } from "./hl7-parser.js";
import { LabCommunicationService } from "./lab-communication-service.js";

export interface HL7ProcessingResult {
  success: boolean;
  message: string;
  labOrderId?: number;
  resultCount?: number;
  errors?: string[];
}

export class HL7ReceiverService {
  /**
   * Process incoming HL7 message from external lab
   */
  static async processHL7Message(
    rawMessage: string,
    externalLabId: number,
    metadata?: Record<string, any>
  ): Promise<HL7ProcessingResult> {
    console.log(`🔬 [HL7] Processing HL7 message from lab ${externalLabId}`);
    
    try {
      // Validate message structure
      const validation = HL7Parser.validateMessage(rawMessage);
      if (!validation.valid) {
        console.error(`❌ [HL7] Invalid message structure:`, validation.errors);
        return {
          success: false,
          message: 'Invalid HL7 message structure',
          errors: validation.errors
        };
      }
      
      // Parse the message
      const parsedMessage = HL7Parser.parseMessage(rawMessage);
      console.log(`📋 [HL7] Parsed message type: ${parsedMessage.messageType}`);
      
      // Store raw message for audit trail
      const [storedMessage] = await db.insert(hl7Messages).values({
        externalLabId,
        messageType: parsedMessage.messageType,
        messageControlId: this.extractMessageControlId(parsedMessage),
        rawMessage: rawMessage,
        processedAt: new Date(),
        processingStatus: 'processing',
        metadata: metadata || {}
      }).returning();
      
      // Process based on message type
      let result: HL7ProcessingResult;
      
      if (parsedMessage.messageType.startsWith('ORU')) {
        result = await this.processORUMessage(parsedMessage, externalLabId);
      } else if (parsedMessage.messageType.startsWith('ORM')) {
        result = await this.processORMMessage(parsedMessage, externalLabId);
      } else {
        result = {
          success: false,
          message: `Unsupported message type: ${parsedMessage.messageType}`
        };
      }
      
      // Update message processing status
      await db.update(hl7Messages)
        .set({
          processingStatus: result.success ? 'completed' : 'failed',
          processingError: result.success ? null : result.message
        })
        .where(eq(hl7Messages.id, storedMessage.id));
      
      // Send ACK back to lab
      const ackMessage = HL7Parser.generateACK(parsedMessage, result.success, result.message);
      console.log(`📨 [HL7] Generated ACK: ${result.success ? 'AA' : 'AE'}`);
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ [HL7] Processing error:`, error);
      return {
        success: false,
        message: error.message || 'Unknown error processing HL7 message'
      };
    }
  }
  
  /**
   * Process ORU (Observation Result) message
   */
  private static async processORUMessage(
    message: any,
    externalLabId: number
  ): Promise<HL7ProcessingResult> {
    console.log(`🧪 [HL7] Processing ORU (lab results) message`);
    
    const parsedResult = HL7Parser.parseORU(message);
    
    // Find matching patient by identifier
    const patient = await this.findPatientByIdentifier(parsedResult.patientIdentifier);
    if (!patient) {
      return {
        success: false,
        message: `Patient not found with identifier: ${parsedResult.patientIdentifier}`
      };
    }
    
    // Find matching lab order
    const labOrder = await this.findLabOrderByExternalId(parsedResult.orderNumber);
    if (!labOrder) {
      return {
        success: false,
        message: `Lab order not found with external ID: ${parsedResult.orderNumber}`
      };
    }
    
    console.log(`✅ [HL7] Matched to patient ${patient.id} and lab order ${labOrder.id}`);
    
    // Insert results
    const insertedResults = [];
    for (const result of parsedResult.results) {
      try {
        const [inserted] = await db.insert(labResults).values({
          ...result,
          labOrderId: labOrder.id,
          patientId: patient.id,
          testCategory: labOrder.testCategory,
          externalLabId: externalLabId.toString(),
          sourceType: 'hl7_feed',
          sourceConfidence: 'high', // HL7 feeds are high confidence
          externalResultId: `HL7_${parsedResult.orderNumber}_${result.testCode}`,
          specimenCollectedAt: labOrder.collectedAt || new Date(),
          receivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          // GPT interpretation will be added by background service
          aiInterpretation: null
        }).returning();
        
        insertedResults.push(inserted);
      } catch (error) {
        console.error(`❌ [HL7] Failed to insert result:`, error);
      }
    }
    
    // Update lab order status
    await db.update(labOrders)
      .set({
        orderStatus: 'completed',
        resultReceivedAt: new Date()
      })
      .where(eq(labOrders.id, labOrder.id));
    
    // Trigger GPT analysis and patient communication
    if (insertedResults.length > 0) {
      console.log(`🤖 [HL7] Triggering GPT analysis for ${insertedResults.length} results`);
      
      // Use existing patient communication service
      setImmediate(async () => {
        try {
          await LabCommunicationService.processBatchMessagesByEncounter(labOrder.id);
          console.log(`✅ [HL7] GPT analysis and patient communication triggered`);
        } catch (error) {
          console.error(`❌ [HL7] Failed to trigger GPT analysis:`, error);
        }
      });
    }
    
    return {
      success: true,
      message: `Successfully processed ${insertedResults.length} lab results`,
      labOrderId: labOrder.id,
      resultCount: insertedResults.length
    };
  }
  
  /**
   * Process ORM (Order Message) - order status updates
   */
  private static async processORMMessage(
    message: any,
    externalLabId: number
  ): Promise<HL7ProcessingResult> {
    console.log(`📋 [HL7] Processing ORM (order status) message`);
    
    // Extract order number from ORC segment
    const orcSegment = message.segments.find((s: any) => s.type === 'ORC');
    if (!orcSegment) {
      return {
        success: false,
        message: 'ORM message missing ORC segment'
      };
    }
    
    const orderNumber = orcSegment.fields[2] || '';
    const orderStatus = orcSegment.fields[5] || '';
    
    // Find matching lab order
    const labOrder = await this.findLabOrderByExternalId(orderNumber);
    if (!labOrder) {
      return {
        success: false,
        message: `Lab order not found with external ID: ${orderNumber}`
      };
    }
    
    // Map HL7 status to our status
    const statusMap: Record<string, string> = {
      'IP': 'in_progress',
      'SC': 'specimen_collected',
      'CM': 'completed',
      'CA': 'cancelled',
      'HD': 'on_hold'
    };
    
    const mappedStatus = statusMap[orderStatus] || 'acknowledged';
    
    // Update order status
    await db.update(labOrders)
      .set({
        orderStatus: mappedStatus as any,
        acknowledgedAt: new Date()
      })
      .where(eq(labOrders.id, labOrder.id));
    
    console.log(`✅ [HL7] Updated order ${labOrder.id} status to ${mappedStatus}`);
    
    return {
      success: true,
      message: `Order status updated to ${mappedStatus}`,
      labOrderId: labOrder.id
    };
  }
  
  /**
   * Find patient by external identifier (MRN, etc)
   */
  private static async findPatientByIdentifier(identifier: string) {
    if (!identifier) return null;
    
    // Try exact MRN match first
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.mrn, identifier))
      .limit(1);
    
    if (patient) return patient;
    
    // Could add additional matching logic here (SSN, etc)
    return null;
  }
  
  /**
   * Find lab order by external order ID
   */
  private static async findLabOrderByExternalId(externalOrderId: string) {
    if (!externalOrderId) return null;
    
    const [order] = await db.select()
      .from(labOrders)
      .where(eq(labOrders.externalOrderId, externalOrderId))
      .limit(1);
    
    return order;
  }
  
  /**
   * Extract message control ID from parsed message
   */
  private static extractMessageControlId(message: any): string {
    const mshSegment = message.segments.find((s: any) => s.type === 'MSH');
    return mshSegment?.fields[9] || 'UNKNOWN';
  }
  
  /**
   * Send HL7 order message to external lab
   */
  static async sendOrderToLab(labOrderId: number, targetLabId: number): Promise<boolean> {
    console.log(`📤 [HL7] Sending order ${labOrderId} to lab ${targetLabId}`);
    
    try {
      // Get lab order details
      const [order] = await db.select()
        .from(labOrders)
        .where(eq(labOrders.id, labOrderId))
        .limit(1);
      
      if (!order) {
        console.error(`❌ [HL7] Lab order ${labOrderId} not found`);
        return false;
      }
      
      // Get external lab configuration
      const [lab] = await db.select()
        .from(externalLabs)
        .where(eq(externalLabs.id, targetLabId))
        .limit(1);
      
      if (!lab) {
        console.error(`❌ [HL7] External lab ${targetLabId} not found`);
        return false;
      }
      
      // Generate HL7 ORM message
      const hl7Message = await this.generateORMMessage(order, lab);
      
      // Store outgoing message
      await db.insert(hl7Messages).values({
        externalLabId: targetLabId,
        messageType: 'ORM^O01',
        messageControlId: order.hl7MessageId || `MSG${Date.now()}`,
        rawMessage: hl7Message,
        direction: 'outbound',
        processedAt: new Date(),
        processingStatus: 'sent'
      });
      
      // In production, this would send via MLLP, SFTP, or API
      console.log(`✅ [HL7] Order message generated for lab ${lab.name}`);
      
      // Update order status
      await db.update(labOrders)
        .set({
          transmittedAt: new Date(),
          orderStatus: 'transmitted'
        })
        .where(eq(labOrders.id, labOrderId));
      
      return true;
      
    } catch (error) {
      console.error(`❌ [HL7] Failed to send order:`, error);
      return false;
    }
  }
  
  /**
   * Generate HL7 ORM (Order) message
   */
  private static async generateORMMessage(order: any, lab: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const messageControlId = order.hl7MessageId || `MSG${timestamp}`;
    
    // Get patient info
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.id, order.patientId))
      .limit(1);
    
    const segments = [
      // MSH - Message Header
      `MSH|^~\\&|${lab.hl7ReceivingFacility || 'CLARAFI'}|${lab.hl7ReceivingApplication || 'EMR'}|${lab.hl7SendingFacility || lab.name}|${lab.hl7SendingApplication || 'LIS'}|${timestamp}||ORM^O01|${messageControlId}|P|${lab.hl7Version || '2.5.1'}`,
      
      // PID - Patient Identification
      `PID|1||${patient.mrn}^^^MRN||${patient.lastName}^${patient.firstName}||${patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10).replace(/-/g, '') : ''}|${patient.sex || 'U'}`,
      
      // ORC - Common Order
      `ORC|NW|${order.id}|${order.externalOrderId || order.id}||IP||||${timestamp}|||${order.orderedBy}`,
      
      // OBR - Observation Request
      `OBR|1|${order.id}|${order.externalOrderId || order.id}|${order.loincCode || order.testCode}^${order.testName}^LN|||${timestamp}||||||${order.clinicalIndication || ''}|||${order.orderedBy}||||||||F`
    ];
    
    return segments.join('\r\n');
  }
}