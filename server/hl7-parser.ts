/**
 * HL7 Parser Service
 * 
 * Converts HL7 messages from external labs into our lab results format
 * while preserving existing GPT processing capabilities for attachments
 */

import { InsertLabResult } from "@shared/schema";

export interface HL7Segment {
  type: string;
  fields: string[];
}

export interface HL7Message {
  messageType: string;
  segments: HL7Segment[];
  raw: string;
}

export interface ParsedHL7Result {
  patientIdentifier: string;
  orderNumber: string;
  results: Partial<InsertLabResult>[];
  rawMessage: string;
}

export class HL7Parser {
  /**
   * Parse raw HL7 message into structured format
   */
  static parseMessage(rawHL7: string): HL7Message {
    const lines = rawHL7.split(/\r?\n/).filter(line => line.trim());
    const segments: HL7Segment[] = [];
    
    for (const line of lines) {
      const fields = line.split('|');
      if (fields.length > 0) {
        segments.push({
          type: fields[0],
          fields: fields
        });
      }
    }
    
    // Get message type from MSH segment
    const mshSegment = segments.find(s => s.type === 'MSH');
    const messageType = mshSegment ? mshSegment.fields[8] : 'UNKNOWN';
    
    return {
      messageType,
      segments,
      raw: rawHL7
    };
  }
  
  /**
   * Convert HL7 ORU (Observation Result) message to lab results
   * ORU^R01 is the standard message type for lab results
   */
  static parseORU(message: HL7Message): ParsedHL7Result {
    const results: Partial<InsertLabResult>[] = [];
    let patientIdentifier = '';
    let orderNumber = '';
    
    // Extract patient info from PID segment
    const pidSegment = message.segments.find(s => s.type === 'PID');
    if (pidSegment) {
      // PID-3 contains patient identifiers (can be multiple)
      const identifiers = pidSegment.fields[3]?.split('~') || [];
      patientIdentifier = identifiers[0]?.split('^')[0] || '';
    }
    
    // Extract order info from ORC segment
    const orcSegment = message.segments.find(s => s.type === 'ORC');
    if (orcSegment) {
      // ORC-2 is the placer order number
      orderNumber = orcSegment.fields[2] || '';
    }
    
    // Process OBX segments (contain actual results)
    const obxSegments = message.segments.filter(s => s.type === 'OBX');
    
    for (const obx of obxSegments) {
      try {
        const result = this.parseOBXSegment(obx);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error('Error parsing OBX segment:', error);
      }
    }
    
    return {
      patientIdentifier,
      orderNumber,
      results,
      rawMessage: message.raw
    };
  }
  
  /**
   * Parse individual OBX (Observation) segment
   */
  private static parseOBXSegment(obx: HL7Segment): Partial<InsertLabResult> | null {
    if (obx.fields.length < 14) {
      return null;
    }
    
    // Parse observation identifier (LOINC code and test name)
    const observationId = obx.fields[3] || '';
    const [loincCode, testName] = observationId.split('^');
    
    // Parse result value
    const valueType = obx.fields[2]; // NM=numeric, ST=string, etc.
    const resultValue = obx.fields[5] || '';
    const units = obx.fields[6] || '';
    const referenceRange = obx.fields[7] || '';
    const abnormalFlag = obx.fields[8] || '';
    const resultStatus = obx.fields[11] || 'F'; // F=Final
    
    // Parse numeric value if applicable
    let resultNumeric: number | null = null;
    if (valueType === 'NM' && resultValue) {
      const parsed = parseFloat(resultValue);
      if (!isNaN(parsed)) {
        resultNumeric = parsed;
      }
    }
    
    // Map HL7 status codes to our schema
    const statusMap: Record<string, string> = {
      'F': 'final',
      'P': 'preliminary',
      'C': 'corrected',
      'X': 'cancelled'
    };
    
    // Map HL7 abnormal flags
    const criticalFlags = ['HH', 'LL', 'H>', 'L<'];
    
    return {
      loincCode: loincCode || null,
      testName: testName || 'Unknown Test',
      testCode: loincCode, // Use LOINC as test code
      resultValue,
      resultNumeric,
      resultUnits: units,
      referenceRange,
      abnormalFlag: abnormalFlag || null,
      criticalFlag: criticalFlags.includes(abnormalFlag),
      resultStatus: statusMap[resultStatus] || 'final',
      verificationStatus: 'verified', // HL7 results are pre-verified
      sourceType: 'hl7_feed',
      sourceSystem: 'HL7',
      interfaceVersion: '2.5.1',
      resultAvailableAt: new Date(),
      resultFinalizedAt: new Date(),
      needsReview: true,
      reviewStatus: 'pending'
    };
  }
  
  /**
   * Validate HL7 message structure
   */
  static validateMessage(rawHL7: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rawHL7 || !rawHL7.trim()) {
      errors.push('Empty message');
      return { valid: false, errors };
    }
    
    const lines = rawHL7.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('No segments found');
      return { valid: false, errors };
    }
    
    // Check for MSH segment
    if (!lines[0].startsWith('MSH|')) {
      errors.push('Message must start with MSH segment');
    }
    
    // Check MSH field count
    const mshFields = lines[0].split('|');
    if (mshFields.length < 12) {
      errors.push('MSH segment missing required fields');
    }
    
    // Check for required segments based on message type
    const messageType = mshFields[8];
    if (messageType?.startsWith('ORU')) {
      const hasPID = lines.some(l => l.startsWith('PID|'));
      const hasOBX = lines.some(l => l.startsWith('OBX|'));
      
      if (!hasPID) errors.push('ORU message missing PID segment');
      if (!hasOBX) errors.push('ORU message missing OBX segments');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Generate ACK (acknowledgment) message for received HL7
   */
  static generateACK(originalMessage: HL7Message, success: boolean, errorMessage?: string): string {
    const msh = originalMessage.segments.find(s => s.type === 'MSH');
    if (!msh) {
      throw new Error('Original message missing MSH segment');
    }
    
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const messageControlId = `ACK${timestamp}`;
    const originalControlId = msh.fields[9] || '';
    
    const ackCode = success ? 'AA' : 'AE'; // AA=Application Accept, AE=Application Error
    const ackMessage = success ? 'Message accepted' : (errorMessage || 'Message rejected');
    
    // Build ACK message
    const ack = [
      `MSH|^~\\&|${msh.fields[4]}|${msh.fields[5]}|${msh.fields[2]}|${msh.fields[3]}|${timestamp}||ACK^R01|${messageControlId}|P|2.5.1`,
      `MSA|${ackCode}|${originalControlId}|${ackMessage}`
    ];
    
    return ack.join('\r\n');
  }
}