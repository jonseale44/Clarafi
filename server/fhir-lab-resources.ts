/**
 * FHIR R4 Lab Resources Implementation
 * 
 * Provides FHIR-compliant DiagnosticReport and Observation resources
 * for modern lab integrations while maintaining compatibility with
 * existing GPT processing capabilities.
 * 
 * Compliant with:
 * - FHIR R4 specification
 * - US Core Lab Result profiles
 * - SMART on FHIR authentication
 */

import { db } from "./db.js";
import { labResults, labOrders, patients, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    reference: string;
    display?: string;
  }>;
  result?: Array<{
    reference: string;
    display?: string;
  }>;
  conclusion?: string;
  conclusionCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    reference: string;
    display?: string;
  }>;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  note?: Array<{
    text: string;
  }>;
  referenceRange?: Array<{
    low?: {
      value: number;
      unit: string;
    };
    high?: {
      value: number;
      unit: string;
    };
    text?: string;
  }>;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  type: 'searchset' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'collection';
  total?: number;
  link?: Array<{
    relation: string;
    url: string;
  }>;
  entry?: Array<{
    fullUrl?: string;
    resource: FHIRResource;
    search?: {
      mode?: 'match' | 'include' | 'outcome';
      score?: number;
    };
  }>;
}

export class FHIRLabResourceBuilder {
  /**
   * Convert lab result to FHIR Observation
   */
  static async buildObservation(resultId: number): Promise<FHIRObservation> {
    const [result] = await db
      .select()
      .from(labResults)
      .where(eq(labResults.id, resultId))
      .limit(1);
    
    if (!result) {
      throw new Error(`Lab result ${resultId} not found`);
    }
    
    // Get patient info for display
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, result.patientId))
      .limit(1);
    
    const observation: FHIRObservation = {
      resourceType: 'Observation',
      id: `lab-result-${result.id}`,
      meta: {
        lastUpdated: result.updatedAt?.toISOString() || new Date().toISOString(),
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab']
      },
      identifier: [{
        system: 'urn:oid:2.16.840.1.113883.4.642.1.1',
        value: `LAB-${result.id}`
      }],
      status: this.mapResultStatus(result.resultStatus),
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'Laboratory'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: result.loincCode,
          display: result.testName
        }],
        text: result.testName
      },
      subject: {
        reference: `Patient/${result.patientId}`,
        display: patient ? `${patient.firstName} ${patient.lastName}` : undefined
      },
      effectiveDateTime: result.specimenCollectedAt?.toISOString() || 
                        result.resultAvailableAt?.toISOString(),
      issued: result.resultAvailableAt?.toISOString()
    };
    
    // Add result value
    if (result.resultNumeric !== null) {
      observation.valueQuantity = {
        value: parseFloat(result.resultNumeric.toString()),
        unit: result.resultUnits || '',
        system: 'http://unitsofmeasure.org',
        code: result.resultUnits
      };
    } else if (result.resultValue) {
      observation.valueString = result.resultValue;
    }
    
    // Add interpretation
    if (result.abnormalFlag) {
      observation.interpretation = [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: this.mapAbnormalFlag(result.abnormalFlag),
          display: this.getAbnormalFlagDisplay(result.abnormalFlag)
        }]
      }];
    }
    
    // Add reference range
    if (result.referenceRange) {
      const range = this.parseReferenceRange(result.referenceRange);
      if (range) {
        observation.referenceRange = [{
          low: range.low ? { value: range.low, unit: result.resultUnits || '' } : undefined,
          high: range.high ? { value: range.high, unit: result.resultUnits || '' } : undefined,
          text: result.referenceRange
        }];
      }
    }
    
    // Add notes if reviewed
    if (result.providerNotes || result.reviewNote) {
      observation.note = [{
        text: result.reviewNote || result.providerNotes || ''
      }];
    }
    
    return observation;
  }
  
  /**
   * Convert lab order to FHIR DiagnosticReport
   */
  static async buildDiagnosticReport(orderId: number): Promise<FHIRDiagnosticReport> {
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      throw new Error(`Lab order ${orderId} not found`);
    }
    
    // Get all results for this order
    const results = await db
      .select()
      .from(labResults)
      .where(eq(labResults.labOrderId, orderId));
    
    // Get patient and provider info
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, order.patientId))
      .limit(1);
    
    const [provider] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.orderedBy))
      .limit(1);
    
    const report: FHIRDiagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: `lab-order-${order.id}`,
      meta: {
        lastUpdated: order.updatedAt?.toISOString() || new Date().toISOString(),
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-lab']
      },
      identifier: [{
        system: 'urn:oid:2.16.840.1.113883.4.642.1.1',
        value: order.requisitionNumber || `ORDER-${order.id}`
      }],
      status: this.mapOrderStatus(order.orderStatus),
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'LAB',
          display: 'Laboratory'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: order.loincCode,
          display: order.testName
        }],
        text: order.testName
      },
      subject: {
        reference: `Patient/${order.patientId}`,
        display: patient ? `${patient.firstName} ${patient.lastName}` : undefined
      },
      effectiveDateTime: order.collectedAt?.toISOString() || order.orderedAt.toISOString(),
      issued: order.updatedAt?.toISOString()
    };
    
    // Add encounter reference if available
    if (order.encounterId) {
      report.encounter = {
        reference: `Encounter/${order.encounterId}`
      };
    }
    
    // Add performer
    if (provider) {
      report.performer = [{
        reference: `Practitioner/${provider.id}`,
        display: `${provider.firstName} ${provider.lastName}`
      }];
    }
    
    // Add result references
    if (results.length > 0) {
      report.result = results.map(result => ({
        reference: `Observation/lab-result-${result.id}`,
        display: result.testName
      }));
    }
    
    // Add conclusion if available
    if (order.clinicalIndication) {
      report.conclusion = order.clinicalIndication;
    }
    
    return report;
  }
  
  /**
   * Create a FHIR Bundle of lab results
   */
  static async buildLabResultBundle(
    patientId: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<FHIRBundle> {
    // Query lab results with filters
    let query = db
      .select()
      .from(labResults)
      .where(eq(labResults.patientId, patientId));
    
    const results = await query;
    
    // Build bundle
    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      id: `lab-results-${patientId}-${Date.now()}`,
      type: 'searchset',
      total: results.length,
      entry: []
    };
    
    // Add observations to bundle
    for (const result of results) {
      const observation = await this.buildObservation(result.id);
      bundle.entry!.push({
        fullUrl: `urn:uuid:${result.id}`,
        resource: observation,
        search: {
          mode: 'match'
        }
      });
    }
    
    return bundle;
  }
  
  /**
   * Map internal result status to FHIR status
   */
  private static mapResultStatus(status: string | null): FHIRObservation['status'] {
    const statusMap: Record<string, FHIRObservation['status']> = {
      'pending': 'registered',
      'preliminary': 'preliminary',
      'final': 'final',
      'corrected': 'corrected',
      'cancelled': 'cancelled',
      'entered_in_error': 'entered-in-error'
    };
    
    return statusMap[status || 'final'] || 'final';
  }
  
  /**
   * Map internal order status to FHIR status
   */
  private static mapOrderStatus(status: string | null): FHIRDiagnosticReport['status'] {
    const statusMap: Record<string, FHIRDiagnosticReport['status']> = {
      'draft': 'registered',
      'pending': 'registered',
      'transmitted': 'partial',
      'collected': 'partial',
      'in_progress': 'partial',
      'resulted': 'preliminary',
      'reviewed': 'final',
      'cancelled': 'cancelled'
    };
    
    return statusMap[status || 'final'] || 'final';
  }
  
  /**
   * Map abnormal flags to FHIR interpretation codes
   */
  private static mapAbnormalFlag(flag: string): string {
    const flagMap: Record<string, string> = {
      'H': 'H',      // High
      'L': 'L',      // Low
      'HH': 'HH',    // Critical high
      'LL': 'LL',    // Critical low
      'A': 'A',      // Abnormal
      'AA': 'AA',    // Critical abnormal
      'N': 'N'       // Normal
    };
    
    return flagMap[flag] || 'A';
  }
  
  /**
   * Get display text for abnormal flag
   */
  private static getAbnormalFlagDisplay(flag: string): string {
    const displayMap: Record<string, string> = {
      'H': 'High',
      'L': 'Low',
      'HH': 'Critical high',
      'LL': 'Critical low',
      'A': 'Abnormal',
      'AA': 'Critical abnormal',
      'N': 'Normal'
    };
    
    return displayMap[flag] || 'Abnormal';
  }
  
  /**
   * Parse reference range string to low/high values
   */
  private static parseReferenceRange(range: string): { low?: number; high?: number } | null {
    // Try to parse common formats: "10-20", "< 5", "> 10", etc.
    const rangeMatch = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      return {
        low: parseFloat(rangeMatch[1]),
        high: parseFloat(rangeMatch[2])
      };
    }
    
    const lessThanMatch = range.match(/<\s*(\d+\.?\d*)/);
    if (lessThanMatch) {
      return {
        high: parseFloat(lessThanMatch[1])
      };
    }
    
    const greaterThanMatch = range.match(/>\s*(\d+\.?\d*)/);
    if (greaterThanMatch) {
      return {
        low: parseFloat(greaterThanMatch[1])
      };
    }
    
    return null;
  }
}