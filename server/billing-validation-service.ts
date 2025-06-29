import { db } from "./db.js";
import { 
  cptDatabase, 
  cptModifiers, 
  billingAuditTrail,
  type SelectCptDatabase,
  type SelectCptModifiers,
  type InsertBillingAuditTrail
} from "../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  revenueImpact?: number;
  suggestedModifiers?: string[];
}

interface CPTValidationContext {
  patientId: number;
  encounterId: number;
  userId: number;
  allCptCodes: Array<{
    code: string;
    modifiers: string[];
    description: string;
  }>;
}

export class BillingValidationService {
  /**
   * Validate CPT code against AMA database (Option A: Post-GPT validation)
   * Following Axiom 1: GPT makes medical decisions, this validates compliance
   */
  async validateCPTCode(
    cptCode: string, 
    modifiers: string[] = [],
    context: CPTValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestedModifiers: []
    };

    // 1. Validate CPT code exists and is active
    const cptRecord = await this.getCPTFromDatabase(cptCode);
    if (!cptRecord) {
      result.isValid = false;
      result.errors.push(`CPT code ${cptCode} not found in database`);
      await this.logValidationEvent(context, 'validation_failed', {
        code: cptCode,
        reason: 'code_not_found'
      });
      return result;
    }

    if (!cptRecord.isActive) {
      result.isValid = false;
      result.errors.push(`CPT code ${cptCode} is no longer active (terminated: ${cptRecord.terminationDate})`);
      await this.logValidationEvent(context, 'validation_failed', {
        code: cptCode,
        reason: 'code_inactive'
      });
      return result;
    }

    // 2. Validate modifiers
    const modifierValidation = await this.validateModifiers(cptCode, modifiers, cptRecord);
    result.errors.push(...modifierValidation.errors);
    result.warnings.push(...modifierValidation.warnings);
    result.suggestedModifiers = modifierValidation.suggested;

    if (modifierValidation.errors.length > 0) {
      result.isValid = false;
    }

    // 3. Check for bundling conflicts
    const bundlingValidation = await this.validateBundling(cptCode, context.allCptCodes);
    result.errors.push(...bundlingValidation.errors);
    result.warnings.push(...bundlingValidation.warnings);

    if (bundlingValidation.errors.length > 0) {
      result.isValid = false;
    }

    // 4. Calculate revenue impact
    result.revenueImpact = await this.calculateRevenueImpact(cptCode, modifiers, cptRecord);

    // 5. Log successful validation
    if (result.isValid) {
      await this.logValidationEvent(context, 'validation_passed', {
        code: cptCode,
        modifiers,
        revenueImpact: result.revenueImpact
      });
    }

    return result;
  }

  /**
   * Validate modifier combinations and compatibility
   */
  private async validateModifiers(
    cptCode: string, 
    modifiers: string[], 
    cptRecord: SelectCptDatabase
  ): Promise<{ errors: string[], warnings: string[], suggested: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggested: string[] = [];

    if (modifiers.length === 0) {
      if (cptRecord.requiresModifier) {
        errors.push(`CPT code ${cptCode} requires a modifier`);
        suggested.push(...(cptRecord.allowedModifiers || []));
      }
      return { errors, warnings, suggested };
    }

    // Validate each modifier exists and is active
    const modifierRecords = await db
      .select()
      .from(cptModifiers)
      .where(inArray(cptModifiers.modifier, modifiers));

    const foundModifiers = modifierRecords.map((m: any) => m.modifier);
    const missingModifiers = modifiers.filter(m => !foundModifiers.includes(m));

    if (missingModifiers.length > 0) {
      errors.push(`Invalid modifiers: ${missingModifiers.join(', ')}`);
    }

    // Check modifier compatibility with CPT category
    for (const modifierRecord of modifierRecords) {
      if (!modifierRecord.isActive) {
        errors.push(`Modifier ${modifierRecord.modifier} is no longer active`);
        continue;
      }

      // Check if modifier is applicable to this CPT category
      if (modifierRecord.applicableCptCategories && modifierRecord.applicableCptCategories.length > 0 && 
          !modifierRecord.applicableCptCategories.includes(cptRecord.category)) {
        warnings.push(`Modifier ${modifierRecord.modifier} may not be applicable to ${cptRecord.category} procedures`);
      }

      // Check modifier combination conflicts
      const conflictingModifiers = modifierRecord.cannotCombineWith || [];
      const hasConflict = modifiers.some(m => conflictingModifiers.includes(m) && m !== modifierRecord.modifier);
      
      if (hasConflict) {
        const conflicts = modifiers.filter(m => conflictingModifiers.includes(m));
        errors.push(`Modifier ${modifierRecord.modifier} cannot be combined with: ${conflicts.join(', ')}`);
      }
    }

    // Check for missing required modifiers based on allowed list
    if (cptRecord.allowedModifiers && cptRecord.allowedModifiers.length > 0) {
      const requiredButMissing = cptRecord.allowedModifiers.filter(allowed => 
        !modifiers.includes(allowed) && this.isModifierContextRequired(allowed, cptCode)
      );
      
      if (requiredButMissing.length > 0) {
        warnings.push(`Consider adding modifiers: ${requiredButMissing.join(', ')}`);
        suggested.push(...requiredButMissing);
      }
    }

    return { errors, warnings, suggested };
  }

  /**
   * Check for bundling conflicts between CPT codes
   */
  private async validateBundling(
    cptCode: string, 
    allCptCodes: Array<{ code: string; modifiers: string[] }>
  ): Promise<{ errors: string[], warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const cptRecord = await this.getCPTFromDatabase(cptCode);
    if (!cptRecord?.bundledCodes?.length) {
      return { errors, warnings };
    }

    const otherCodes = allCptCodes.filter(c => c.code !== cptCode).map(c => c.code);
    const bundleConflicts = cptRecord.bundledCodes.filter(bundled => otherCodes.includes(bundled));

    if (bundleConflicts.length > 0) {
      // Check if -59 modifier is used to override bundling
      const hasDistinctModifier = allCptCodes.some(c => 
        (c.code === cptCode || bundleConflicts.includes(c.code)) && 
        c.modifiers.includes('-59')
      );

      if (!hasDistinctModifier) {
        errors.push(`CPT code ${cptCode} is bundled with: ${bundleConflicts.join(', ')}. Consider -59 modifier if services are distinct.`);
      } else {
        warnings.push(`Bundling override detected with -59 modifier for ${cptCode}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate financial impact of CPT code and modifiers
   */
  private async calculateRevenueImpact(
    cptCode: string, 
    modifiers: string[], 
    cptRecord: SelectCptDatabase
  ): Promise<number> {
    let baseRevenue = Number(cptRecord.baseRate) || 0;

    // Apply modifier adjustments
    if (modifiers.length > 0) {
      const modifierRecords = await db
        .select()
        .from(cptModifiers)
        .where(inArray(cptModifiers.modifier, modifiers));

      for (const modifier of modifierRecords) {
        const adjustment = Number(modifier.reimbursementAdjustment) || 1.0;
        baseRevenue = baseRevenue * adjustment;
      }
    }

    return Math.round(baseRevenue * 100) / 100; // Round to cents
  }

  /**
   * Get CPT code from database with caching
   */
  private async getCPTFromDatabase(cptCode: string): Promise<SelectCptDatabase | null> {
    const results = await db
      .select()
      .from(cptDatabase)
      .where(eq(cptDatabase.code, cptCode))
      .limit(1);

    return results[0] || null;
  }

  /**
   * Athena-style audit trail logging
   */
  private async logValidationEvent(
    context: CPTValidationContext,
    eventType: string,
    details: any
  ): Promise<void> {
    try {
      const auditEntry: InsertBillingAuditTrail = {
        eventType,
        entityType: 'cpt_code',
        entityId: details.code,
        patientId: context.patientId,
        encounterId: context.encounterId,
        afterValue: details,
        changedBy: context.userId,
        changeSource: 'system_validation',
        validationStatus: eventType === 'validation_passed' ? 'validated' : 'flagged',
        revenueImpact: details.revenueImpact ? details.revenueImpact.toString() : null
      };

      await db.insert(billingAuditTrail).values(auditEntry);
    } catch (error) {
      console.error('❌ [BillingValidation] Failed to log audit event:', error);
    }
  }

  /**
   * Check if modifier is required based on clinical context
   */
  private isModifierContextRequired(modifier: string, cptCode: string): boolean {
    // This would be expanded with business rules
    // For now, basic heuristics
    
    if (modifier === '-25' && cptCode.startsWith('992')) {
      // E&M codes commonly need -25 when combined with procedures
      return true;
    }
    
    if ((modifier === '-RT' || modifier === '-LT') && 
        ['20610', '20605', '64450', '73060'].includes(cptCode)) {
      // Joint injections and imaging often need laterality
      return true;
    }

    return false;
  }

  /**
   * Batch validate multiple CPT codes for efficiency
   */
  async validateEncounterBilling(
    cptCodes: Array<{
      code: string;
      modifiers: string[];
      description: string;
    }>,
    context: CPTValidationContext
  ): Promise<{ [code: string]: ValidationResult }> {
    const results: { [code: string]: ValidationResult } = {};
    
    const extendedContext = {
      ...context,
      allCptCodes: cptCodes
    };

    for (const cpt of cptCodes) {
      results[cpt.code] = await this.validateCPTCode(
        cpt.code, 
        cpt.modifiers, 
        extendedContext
      );
    }

    return results;
  }

  /**
   * Get billing recommendations based on validation results
   */
  generateBillingRecommendations(
    validationResults: { [code: string]: ValidationResult }
  ): string[] {
    const recommendations: string[] = [];
    
    let totalRevenue = 0;
    let totalErrors = 0;

    for (const [code, result] of Object.entries(validationResults)) {
      if (!result.isValid) {
        totalErrors++;
        recommendations.push(`❌ ${code}: ${result.errors.join(', ')}`);
      }

      if (result.warnings.length > 0) {
        recommendations.push(`⚠️ ${code}: ${result.warnings.join(', ')}`);
      }

      if (result.suggestedModifiers && result.suggestedModifiers.length > 0) {
        recommendations.push(`💡 ${code}: Consider modifiers ${result.suggestedModifiers.join(', ')}`);
      }

      if (result.revenueImpact) {
        totalRevenue += result.revenueImpact;
      }
    }

    if (totalRevenue > 0) {
      recommendations.unshift(`💰 Total estimated revenue: $${totalRevenue.toFixed(2)}`);
    }

    if (totalErrors === 0) {
      recommendations.unshift(`✅ All CPT codes passed validation`);
    } else {
      recommendations.unshift(`⚠️ ${totalErrors} validation errors found`);
    }

    return recommendations;
  }
}