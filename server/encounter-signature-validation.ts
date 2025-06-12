import { db } from "./db.js";
import { encounters, orders, diagnoses, labResults, imagingResults, vitals, medicalProblems } from "../shared/schema.js";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Encounter Signature Validation Service
 * 
 * Validates that an encounter meets all requirements before it can be electronically signed
 * Based on standard EMR requirements (EPIC, Athena, etc.)
 */

export interface ValidationResult {
  canSign: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  category: 'documentation' | 'orders' | 'coding' | 'results' | 'legal';
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface ValidationWarning {
  category: 'documentation' | 'billing' | 'quality';
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface ValidationMetadata {
  encounterType: string;
  encounterStatus: string;
  patientId: number;
  providerId: number;
  validationTimestamp: Date;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

export class EncounterSignatureValidator {

  /**
   * Validate encounter readiness for signature
   */
  async validateEncounterForSignature(encounterId: number): Promise<ValidationResult> {
    const result: ValidationResult = {
      canSign: true,
      errors: [],
      warnings: [],
      metadata: {
        encounterType: '',
        encounterStatus: '',
        patientId: 0,
        providerId: 0,
        validationTimestamp: new Date(),
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0
      }
    };

    try {
      // Get encounter details
      const encounter = await this.getEncounterDetails(encounterId);
      if (!encounter) {
        result.errors.push({
          category: 'legal',
          code: 'ENCOUNTER_NOT_FOUND',
          message: 'Encounter not found or access denied'
        });
        result.canSign = false;
        return result;
      }

      result.metadata.encounterType = encounter.encounterType || '';
      result.metadata.encounterStatus = encounter.encounterStatus || '';
      result.metadata.patientId = encounter.patientId;
      result.metadata.providerId = encounter.providerId;

      // Run all validation checks
      const validationChecks = [
        () => this.validateDocumentationCompleteness(encounter, result),
        () => this.validateCodingRequirements(encounter, result),
        () => this.validateOrderSignatures(encounter, result),
        () => this.validateCriticalResults(encounter, result),
        () => this.validateMedicalProblems(encounter, result),
        () => this.validateBillingRequirements(encounter, result),
        () => this.validateLegalRequirements(encounter, result)
      ];

      for (const check of validationChecks) {
        result.metadata.totalChecks++;
        try {
          await check();
          result.metadata.passedChecks++;
        } catch (error: any) {
          result.metadata.failedChecks++;
          result.errors.push({
            category: 'legal',
            code: 'VALIDATION_ERROR',
            message: `Validation check failed: ${error?.message || 'Unknown error'}`,
            details: error
          });
        }
      }

      // Determine if encounter can be signed
      result.canSign = result.errors.length === 0;

    } catch (error) {
      result.canSign = false;
      result.errors.push({
        category: 'legal',
        code: 'VALIDATION_SYSTEM_ERROR',
        message: 'System error during validation',
        details: error
      });
    }

    return result;
  }

  /**
   * Validate documentation completeness
   */
  private async validateDocumentationCompleteness(encounter: any, result: ValidationResult): Promise<void> {
    // Check if SOAP note exists and is complete
    if (!encounter.note || encounter.note.trim().length === 0) {
      result.errors.push({
        category: 'documentation',
        code: 'MISSING_SOAP_NOTE',
        message: 'SOAP note is required before signing encounter',
        field: 'note'
      });
    }

    // Validate SOAP note structure
    if (encounter.note) {
      const soapSections = this.analyzeSoapStructure(encounter.note);
      
      if (!soapSections.hasSubjective) {
        result.errors.push({
          category: 'documentation',
          code: 'MISSING_SUBJECTIVE',
          message: 'Subjective section is required in SOAP note',
          field: 'note'
        });
      }

      if (!soapSections.hasObjective) {
        result.errors.push({
          category: 'documentation',
          code: 'MISSING_OBJECTIVE',
          message: 'Objective section is required in SOAP note',
          field: 'note'
        });
      }

      if (!soapSections.hasAssessment) {
        result.errors.push({
          category: 'documentation',
          code: 'MISSING_ASSESSMENT',
          message: 'Assessment section is required in SOAP note',
          field: 'note'
        });
      }

      if (!soapSections.hasPlan) {
        result.errors.push({
          category: 'documentation',
          code: 'MISSING_PLAN',
          message: 'Plan section is required in SOAP note',
          field: 'note'
        });
      }

      // Check for minimum content requirements
      if (encounter.note.trim().length < 100) {
        result.warnings.push({
          category: 'documentation',
          code: 'BRIEF_DOCUMENTATION',
          message: 'Documentation appears brief - ensure adequate detail for medical record',
          field: 'note'
        });
      }
    }

    // Check chief complaint for office visits
    if (encounter.encounterType === 'office_visit' && (!encounter.chiefComplaint || encounter.chiefComplaint.trim().length === 0)) {
      result.errors.push({
        category: 'documentation',
        code: 'MISSING_CHIEF_COMPLAINT',
        message: 'Chief complaint is required for office visits',
        field: 'chiefComplaint'
      });
    }

    // Check for vitals if required
    const vitalsRequired = ['office_visit', 'urgent_care', 'procedure_visit'].includes(encounter.encounterType);
    if (vitalsRequired) {
      const vitals = await this.getEncounterVitals(encounter.id);
      if (vitals.length === 0) {
        result.warnings.push({
          category: 'documentation',
          code: 'MISSING_VITALS',
          message: 'Vital signs are typically required for this encounter type',
          field: 'vitals'
        });
      }
    }
  }

  /**
   * Validate coding requirements
   */
  private async validateCodingRequirements(encounter: any, result: ValidationResult): Promise<void> {
    // Check for CPT codes
    const cptCodes = encounter.cptCodes || [];
    if (cptCodes.length === 0) {
      result.errors.push({
        category: 'coding',
        code: 'MISSING_CPT_CODE',
        message: 'At least one CPT code is required for billing',
        field: 'cptCodes'
      });
    }

    // Validate CPT codes are appropriate for encounter type
    if (cptCodes.length > 0) {
      for (const cpt of cptCodes) {
        if (!this.isValidCptCode(cpt.code)) {
          result.errors.push({
            category: 'coding',
            code: 'INVALID_CPT_CODE',
            message: `Invalid CPT code format: ${cpt.code}`,
            field: 'cptCodes',
            details: { code: cpt.code }
          });
        }
      }
    }

    // Check for diagnoses (ICD-10)
    const diagnoses = encounter.draftDiagnoses || [];
    if (diagnoses.length === 0) {
      result.errors.push({
        category: 'coding',
        code: 'MISSING_DIAGNOSIS',
        message: 'At least one diagnosis (ICD-10) is required',
        field: 'draftDiagnoses'
      });
    }

    // Check for primary diagnosis
    if (diagnoses.length > 0) {
      const hasPrimary = diagnoses.some((d: any) => d.isPrimary === true);
      if (!hasPrimary) {
        result.errors.push({
          category: 'coding',
          code: 'MISSING_PRIMARY_DIAGNOSIS',
          message: 'A primary diagnosis must be designated',
          field: 'draftDiagnoses'
        });
      }

      // Validate ICD-10 codes
      for (const diagnosis of diagnoses) {
        if (!this.isValidIcd10Code(diagnosis.icd10Code)) {
          result.errors.push({
            category: 'coding',
            code: 'INVALID_ICD10_CODE',
            message: `Invalid ICD-10 code format: ${diagnosis.icd10Code}`,
            field: 'draftDiagnoses',
            details: { code: diagnosis.icd10Code }
          });
        }
      }
    }
  }

  /**
   * Validate order signatures
   */
  private async validateOrderSignatures(encounter: any, result: ValidationResult): Promise<void> {
    // Get all orders for this encounter
    const ordersList = await db.select()
      .from(orders)
      .where(eq(orders.encounterId, encounter.id));

    const unsignedOrders = ordersList.filter((order: any) => 
      order.orderStatus === 'draft' || 
      (order.orderStatus === 'pending' && !order.approvedBy)
    );

    if (unsignedOrders.length > 0) {
      result.errors.push({
        category: 'orders',
        code: 'UNSIGNED_ORDERS',
        message: `${unsignedOrders.length} orders require signature before encounter can be signed`,
        field: 'orders',
        details: { 
          unsignedCount: unsignedOrders.length,
          orderIds: unsignedOrders.map((o: any) => o.id)
        }
      });
    }

    // Check for orders with missing required fields
    for (const order of ordersList) {
      if (order.orderType === 'medication') {
        if (!order.dosage || !order.sig || !order.quantity) {
          result.errors.push({
            category: 'orders',
            code: 'INCOMPLETE_MEDICATION_ORDER',
            message: `Medication order ${order.id} is missing required fields`,
            field: 'orders',
            details: { orderId: order.id, orderType: 'medication' }
          });
        }
      }

      if (order.orderType === 'lab') {
        if (!order.testName || !order.clinicalIndication) {
          result.errors.push({
            category: 'orders',
            code: 'INCOMPLETE_LAB_ORDER',
            message: `Lab order ${order.id} is missing required fields`,
            field: 'orders',
            details: { orderId: order.id, orderType: 'lab' }
          });
        }
      }
    }
  }

  /**
   * Validate critical results acknowledgment
   */
  private async validateCriticalResults(encounter: any, result: ValidationResult): Promise<void> {
    // Check for unacknowledged critical lab results
    const criticalLabResults = await db.select()
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, encounter.patientId),
          eq(labResults.abnormalFlag, 'HH'), // Critical high
          isNull(labResults.reviewedBy)
        )
      );

    if (criticalLabResults.length > 0) {
      result.errors.push({
        category: 'results',
        code: 'UNACKNOWLEDGED_CRITICAL_RESULTS',
        message: `${criticalLabResults.length} critical lab results require acknowledgment`,
        field: 'labResults',
        details: { 
          criticalCount: criticalLabResults.length,
          resultIds: criticalLabResults.map(r => r.id)
        }
      });
    }

    // Check for abnormal results that should be addressed
    const abnormalResults = await db.select()
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, encounter.patientId),
          sql`${labResults.abnormalFlag} IN ('H', 'L', 'A')`,
          isNull(labResults.reviewedBy)
        )
      );

    if (abnormalResults.length > 0) {
      result.warnings.push({
        category: 'quality',
        code: 'UNREVIEWED_ABNORMAL_RESULTS',
        message: `${abnormalResults.length} abnormal results have not been reviewed`,
        field: 'labResults',
        details: { abnormalCount: abnormalResults.length }
      });
    }
  }

  /**
   * Validate medical problems
   */
  private async validateMedicalProblems(encounter: any, result: ValidationResult): Promise<void> {
    // Check if medical problems have been addressed
    const medicalProblemsList = await db.select()
      .from(medicalProblems)
      .where(eq(medicalProblems.patientId, encounter.patientId));

    // For encounters with medical problems processing, ensure they're signed
    const problemsNeedingSigning = medicalProblemsList.filter((problem: any) => {
      const visitHistory = problem.visitHistory as any[];
      if (!visitHistory || visitHistory.length === 0) return false;
      
      return visitHistory.some((visit: any) => 
        visit.encounter_id === encounter.id && !visit.is_signed
      );
    });

    if (problemsNeedingSigning.length > 0) {
      result.errors.push({
        category: 'documentation',
        code: 'UNSIGNED_MEDICAL_PROBLEMS',
        message: `${problemsNeedingSigning.length} medical problem entries require signature`,
        field: 'medicalProblems',
        details: { 
          problemCount: problemsNeedingSigning.length,
          problemIds: problemsNeedingSigning.map((p: any) => p.id)
        }
      });
    }
  }

  /**
   * Validate billing requirements
   */
  private async validateBillingRequirements(encounter: any, result: ValidationResult): Promise<void> {
    // Check CPT/diagnosis linkage
    const cptCodes = encounter.cptCodes || [];
    const diagnoses = encounter.draftDiagnoses || [];

    if (cptCodes.length > 0 && diagnoses.length > 0) {
      // Ensure each CPT code has supporting diagnosis
      for (const cpt of cptCodes) {
        const hasLinkedDiagnosis = cpt.linkedDiagnoses && cpt.linkedDiagnoses.length > 0;
        if (!hasLinkedDiagnosis) {
          result.warnings.push({
            category: 'billing',
            code: 'CPT_DIAGNOSIS_LINKAGE',
            message: `CPT code ${cpt.code} should be linked to supporting diagnosis`,
            field: 'cptCodes',
            details: { cptCode: cpt.code }
          });
        }
      }
    }

    // Check for appropriate complexity level
    if (encounter.encounterType === 'office_visit') {
      const complexity = this.assessEncounterComplexity(encounter);
      if (complexity.needsReview) {
        result.warnings.push({
          category: 'billing',
          code: 'COMPLEXITY_REVIEW',
          message: complexity.message,
          field: 'encounterComplexity',
          details: complexity.details
        });
      }
    }
  }

  /**
   * Validate legal requirements
   */
  private async validateLegalRequirements(encounter: any, result: ValidationResult): Promise<void> {
    // Check encounter timing
    const encounterAge = new Date().getTime() - new Date(encounter.createdAt || encounter.startTime).getTime();
    const daysSinceEncounter = encounterAge / (1000 * 60 * 60 * 24);

    if (daysSinceEncounter > 30) {
      result.warnings.push({
        category: 'quality',
        code: 'DELAYED_SIGNATURE',
        message: 'Encounter is being signed more than 30 days after creation',
        field: 'timing',
        details: { daysSinceEncounter: Math.round(daysSinceEncounter) }
      });
    }

    // Check provider authorization
    if (!encounter.providerId) {
      result.errors.push({
        category: 'legal',
        code: 'NO_PROVIDER_ASSIGNED',
        message: 'Encounter must have an assigned provider before signing',
        field: 'providerId'
      });
    }

    // Check encounter status
    if (encounter.encounterStatus === 'signed') {
      result.errors.push({
        category: 'legal',
        code: 'ALREADY_SIGNED',
        message: 'Encounter has already been signed',
        field: 'encounterStatus'
      });
    }
  }

  /**
   * Helper methods
   */
  private async getEncounterDetails(encounterId: number) {
    const result = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId))
      .limit(1);
    
    return result[0] || null;
  }

  private async getEncounterVitals(encounterId: number) {
    return await db.select()
      .from(vitals)
      .where(eq(vitals.encounterId, encounterId));
  }

  private analyzeSoapStructure(soapNote: string) {
    const upperNote = soapNote.toUpperCase();
    return {
      hasSubjective: upperNote.includes('SUBJECTIVE') || upperNote.includes('**S**') || upperNote.includes('**SUBJECTIVE**'),
      hasObjective: upperNote.includes('OBJECTIVE') || upperNote.includes('**O**') || upperNote.includes('**OBJECTIVE**'),
      hasAssessment: upperNote.includes('ASSESSMENT') || upperNote.includes('**A**') || upperNote.includes('**ASSESSMENT**'),
      hasPlan: upperNote.includes('PLAN') || upperNote.includes('**P**') || upperNote.includes('**PLAN**')
    };
  }

  private isValidCptCode(code: string): boolean {
    // Basic CPT code validation (5 digits, possibly with modifier)
    return /^\d{5}(-\d{2})?$/.test(code);
  }

  private isValidIcd10Code(code: string): boolean {
    // Basic ICD-10 validation (letter + 2 digits + optional decimal + up to 4 more chars)
    return /^[A-Z]\d{2}(\.\d{1,4})?$/.test(code);
  }

  private assessEncounterComplexity(encounter: any) {
    // Simplified complexity assessment
    const soapLength = encounter.note?.length || 0;
    const orderCount = encounter.draftOrders?.length || 0;
    const diagnosisCount = encounter.draftDiagnoses?.length || 0;

    if (soapLength < 200 && orderCount === 0 && diagnosisCount <= 1) {
      return {
        needsReview: true,
        message: 'Encounter appears to be low complexity - verify appropriate CPT code selection',
        details: { soapLength, orderCount, diagnosisCount }
      };
    }

    return { needsReview: false };
  }
}

// Export singleton instance
export const encounterSignatureValidator = new EncounterSignatureValidator();