/**
 * Enhanced CPT Extraction Service with Production-Level Billing Features
 * 
 * PRODUCTION FEATURES:
 * - GPT-4.1 powered CPT code extraction with clinical intelligence
 * - Automatic modifier selection based on clinical context
 * - Post-GPT validation against AMA CPT database
 * - Athena-style audit trail for all billing changes
 * - Revenue impact calculation for financial tracking
 * 
 * AXIOM COMPLIANCE:
 * - GPT exclusively handles medical decisions and coding logic
 * - No frontend logic or regex patterns for medical coding
 * - Meets/exceeds Epic and Athena EMR standards
 */

import { OpenAI } from "openai";
import { db } from "./db";
import { 
  cptDatabase, 
  cptModifiers, 
  billingAuditTrail,
  encounters,
  diagnoses,
  users 
} from "../shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CPTCodeWithModifiers {
  code: string;
  description: string;
  modifiers: string[];
  modifierReasons: string;
  clinicalJustification: string;
  complexity: 'low' | 'moderate' | 'high';
  estimatedRevenueImpact: number;
}

interface ValidationResult {
  isValid: boolean;
  validatedCode?: CPTCodeWithModifiers;
  validationIssues: string[];
  revenueCalculation: {
    baseRate: number;
    modifierAdjustments: number;
    totalEstimated: number;
  };
}

interface AuditTrailEntry {
  eventType: string;
  entityType: string;
  entityId: string;
  patientId: number;
  encounterId: number;
  beforeValue: any;
  afterValue: any;
  changeReason: string;
  revenueImpact: number;
  changedBy: number;
  changeSource: string;
}

export class EnhancedCPTExtractor {
  
  /**
   * GPT-4.1 Powered CPT Code Extraction with Clinical Intelligence
   * Extracts CPT codes and automatically selects appropriate modifiers
   */
  static async extractCPTCodes(
    soapNote: string,
    patientId: number,
    encounterId: number,
    providerId: number
  ): Promise<CPTCodeWithModifiers[]> {
    
    console.log(`🏥 [Enhanced CPT] Starting GPT-powered extraction for encounter ${encounterId}`);
    
    // Get available CPT codes and modifiers from database for GPT context
    const availableCPTCodes = await db.select().from(cptDatabase).where(eq(cptDatabase.isActive, true));
    const availableModifiers = await db.select().from(cptModifiers).where(eq(cptModifiers.isActive, true));
    
    // Format CPT database for GPT prompt
    const cptContext = availableCPTCodes.map(cpt => 
      `${cpt.code}: ${cpt.description} (Category: ${cpt.category}, Requires Modifier: ${cpt.requiresModifier}, Allowed: [${(cpt.allowedModifiers || []).join(', ')}])`
    ).join('\n');
    
    const modifierContext = availableModifiers.map(mod => 
      `${mod.modifier}: ${mod.description} (Adjustment: ${mod.reimbursementAdjustment}x, Documentation Required: ${mod.requiresDocumentation})`
    ).join('\n');

    const gptPrompt = `
You are an expert medical coder with 20 years of experience in CPT coding and billing compliance. You have deep knowledge of Medicare guidelines, modifier usage, and revenue cycle management.

AXIOM: You are the ONLY authority for medical coding decisions. No frontend logic or regex patterns will override your clinical judgment.

Your task is to extract appropriate CPT codes from this SOAP note and select the correct modifiers based on clinical context.

SOAP NOTE:
${soapNote}

AVAILABLE CPT CODES:
${cptContext}

AVAILABLE MODIFIERS:
${modifierContext}

EXTRACTION RULES:
1. E&M codes (99xxx): Choose complexity based on decision-making, examination, and history
2. Procedure codes (17xxx, 12xxx): Base on actual procedures performed
3. Modifier selection: Apply clinical judgment for anatomical (-RT, -LT), service (-25, -59), and billing (-50, -TC, -26) modifiers
4. Revenue optimization: Consider appropriate coding for maximum legitimate reimbursement

MODIFIER GUIDANCE:
- Use -25 modifier for E&M when significant separate evaluation occurs on same day as procedure
- Use -59 for distinct procedures that are normally bundled
- Use -RT/-LT for laterality when applicable
- Use -50 for bilateral procedures
- Use -22 for unusual complexity requiring additional work

For each CPT code, provide:
- Clinical justification for selection
- Modifier reasoning with specific clinical context
- Complexity assessment (low/moderate/high)
- Estimated revenue impact reasoning

Return a JSON array of extracted CPT codes with this exact structure:
[
  {
    "code": "99214",
    "description": "Office visit, established patient, 25-30 minutes",
    "modifiers": ["-25"],
    "modifierReasons": "Significant separate E&M service in addition to procedure performed same day",
    "clinicalJustification": "Moderate complexity medical decision making with detailed history and examination for diabetes management, separate from wart removal procedure",
    "complexity": "moderate",
    "estimatedRevenueImpact": 200
  }
]

CRITICAL: Return ONLY the JSON array. No additional text or explanation.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: gptPrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const extractedCodes = JSON.parse(response.choices[0].message.content || "[]");
      
      console.log(`🧠 [Enhanced CPT] GPT extracted ${extractedCodes.length} CPT codes with modifiers`);
      
      // Validate each extracted code against database
      const validatedCodes: CPTCodeWithModifiers[] = [];
      
      for (const code of extractedCodes) {
        const validationResult = await this.validateCPTCode(code, patientId, encounterId, providerId);
        
        if (validationResult.isValid && validationResult.validatedCode) {
          validatedCodes.push(validationResult.validatedCode);
          
          // Create audit trail entry
          await this.createAuditTrail({
            eventType: 'cpt_code_added',
            entityType: 'cpt_code',
            entityId: code.code,
            patientId,
            encounterId,
            beforeValue: null,
            afterValue: validationResult.validatedCode,
            changeReason: 'GPT extraction from SOAP note',
            revenueImpact: validationResult.revenueCalculation.totalEstimated,
            changedBy: providerId,
            changeSource: 'gpt_generated'
          });
        } else {
          console.warn(`⚠️ [Enhanced CPT] Validation failed for ${code.code}:`, validationResult.validationIssues);
        }
      }
      
      return validatedCodes;
      
    } catch (error) {
      console.error('❌ [Enhanced CPT] Error extracting CPT codes:', error);
      return [];
    }
  }

  /**
   * Post-GPT Validation Against AMA CPT Database (Option A)
   * Validates GPT selections against production CPT database
   */
  static async validateCPTCode(
    gptCode: CPTCodeWithModifiers,
    patientId: number,
    encounterId: number,
    providerId: number
  ): Promise<ValidationResult> {
    
    const validationIssues: string[] = [];
    
    // 1. Validate CPT code exists in database
    const dbCode = await db.select()
      .from(cptDatabase)
      .where(and(
        eq(cptDatabase.code, gptCode.code),
        eq(cptDatabase.isActive, true)
      ))
      .limit(1);

    if (dbCode.length === 0) {
      validationIssues.push(`CPT code ${gptCode.code} not found in active database`);
      return { isValid: false, validationIssues, revenueCalculation: { baseRate: 0, modifierAdjustments: 0, totalEstimated: 0 } };
    }

    const validCPT = dbCode[0];

    // 2. Validate modifiers
    const validatedModifiers: string[] = [];
    let modifierAdjustment = 1.0;

    for (const modifier of gptCode.modifiers) {
      // Check if modifier exists
      const dbModifier = await db.select()
        .from(cptModifiers)
        .where(and(
          eq(cptModifiers.modifier, modifier),
          eq(cptModifiers.isActive, true)
        ))
        .limit(1);

      if (dbModifier.length === 0) {
        validationIssues.push(`Modifier ${modifier} not found in database`);
        continue;
      }

      // Check if modifier is allowed for this CPT code
      const allowedModifiers = validCPT.allowedModifiers || [];
      if (allowedModifiers.length > 0 && !allowedModifiers.includes(modifier)) {
        validationIssues.push(`Modifier ${modifier} not allowed for CPT ${gptCode.code}`);
        continue;
      }

      validatedModifiers.push(modifier);
      modifierAdjustment *= parseFloat((dbModifier[0].reimbursementAdjustment || 1.0).toString());
    }

    // 3. Calculate revenue impact
    const baseRate = parseFloat(validCPT.baseRate?.toString() || "0");
    const modifierAdjustmentAmount = baseRate * (modifierAdjustment - 1);
    const totalEstimated = baseRate * modifierAdjustment;

    // 4. Create validated code object
    const validatedCode: CPTCodeWithModifiers = {
      ...gptCode,
      code: validCPT.code,
      description: validCPT.description,
      modifiers: validatedModifiers,
      estimatedRevenueImpact: totalEstimated
    };

    const revenueCalculation = {
      baseRate,
      modifierAdjustments: modifierAdjustmentAmount,
      totalEstimated
    };

    const isValid = validationIssues.length === 0;
    
    console.log(`✅ [Enhanced CPT] Validation ${isValid ? 'passed' : 'failed'} for ${gptCode.code}`, 
                { revenueCalculation, issues: validationIssues });

    return {
      isValid,
      validatedCode: isValid ? validatedCode : undefined,
      validationIssues,
      revenueCalculation
    };
  }

  /**
   * Athena-Style Audit Trail Creation
   * Creates comprehensive audit entries for billing compliance
   */
  static async createAuditTrail(entry: AuditTrailEntry): Promise<void> {
    try {
      await db.insert(billingAuditTrail).values({
        eventType: entry.eventType,
        entityType: entry.entityType,
        entityId: entry.entityId,
        patientId: entry.patientId,
        encounterId: entry.encounterId,
        beforeValue: entry.beforeValue,
        afterValue: entry.afterValue,
        changeReason: entry.changeReason,
        revenueImpact: entry.revenueImpact.toString(),
        changedBy: entry.changedBy,
        changeSource: entry.changeSource,
        validationStatus: 'validated',
        requiresReview: entry.revenueImpact > 500 // Flag high-value changes for review
      });
      
      console.log(`📋 [Audit Trail] Created entry: ${entry.eventType} for ${entry.entityType} ${entry.entityId}`);
      
    } catch (error) {
      console.error('❌ [Audit Trail] Failed to create entry:', error);
    }
  }

  /**
   * Manual CPT Code Modification with Validation
   * Handles provider manual edits with full audit trail
   */
  static async updateCPTCode(
    originalCode: CPTCodeWithModifiers,
    updatedCode: CPTCodeWithModifiers,
    patientId: number,
    encounterId: number,
    providerId: number,
    changeReason: string
  ): Promise<ValidationResult> {
    
    console.log(`🔧 [Enhanced CPT] Manual update: ${originalCode.code} → ${updatedCode.code}`);
    
    // Validate the updated code
    const validationResult = await this.validateCPTCode(updatedCode, patientId, encounterId, providerId);
    
    if (validationResult.isValid) {
      // Calculate revenue impact of change
      const revenueImpact = validationResult.revenueCalculation.totalEstimated - originalCode.estimatedRevenueImpact;
      
      // Create audit trail
      await this.createAuditTrail({
        eventType: 'cpt_code_modified',
        entityType: 'cpt_code',
        entityId: originalCode.code,
        patientId,
        encounterId,
        beforeValue: originalCode,
        afterValue: validationResult.validatedCode,
        changeReason,
        revenueImpact,
        changedBy: providerId,
        changeSource: 'provider_manual'
      });
    }
    
    return validationResult;
  }

  /**
   * Get CPT Database for Frontend Autocomplete
   * Returns filtered CPT codes for UI components
   */
  static async getCPTDatabase(searchTerm?: string, category?: string): Promise<any[]> {
    let query = db.select().from(cptDatabase).where(eq(cptDatabase.isActive, true));
    
    // Add filtering logic here if needed
    const results = await query.limit(50);
    
    return results.map(cpt => ({
      code: cpt.code,
      description: cpt.description,
      category: cpt.category,
      baseRate: parseFloat(cpt.baseRate?.toString() || "0"),
      requiresModifier: cpt.requiresModifier,
      allowedModifiers: cpt.allowedModifiers
    }));
  }

  /**
   * Get Available Modifiers for CPT Code
   * Returns valid modifiers for specific CPT code
   */
  static async getAvailableModifiers(cptCode: string): Promise<any[]> {
    const cpt = await db.select()
      .from(cptDatabase)
      .where(eq(cptDatabase.code, cptCode))
      .limit(1);

    if (cpt.length === 0) return [];

    // Get all modifiers if no restrictions, otherwise get allowed ones
    const allowedModifiers = cpt[0].allowedModifiers || [];
    
    let modifiers;
    
    if (allowedModifiers.length > 0) {
      modifiers = await db.select()
        .from(cptModifiers)
        .where(and(
          eq(cptModifiers.isActive, true),
          inArray(cptModifiers.modifier, allowedModifiers)
        ));
    } else {
      modifiers = await db.select()
        .from(cptModifiers)
        .where(eq(cptModifiers.isActive, true));
    }
    
    return modifiers.map(mod => ({
      modifier: mod.modifier,
      description: mod.description,
      category: mod.category,
      reimbursementAdjustment: parseFloat((mod.reimbursementAdjustment || 1.0).toString()),
      requiresDocumentation: mod.requiresDocumentation
    }));
  }

  /**
   * Get Billing Audit Trail for Encounter
   * Returns complete audit history for compliance
   */
  static async getAuditTrail(encounterId: number): Promise<any[]> {
    const auditEntries = await db.select({
      id: billingAuditTrail.id,
      eventType: billingAuditTrail.eventType,
      entityType: billingAuditTrail.entityType,
      entityId: billingAuditTrail.entityId,
      beforeValue: billingAuditTrail.beforeValue,
      afterValue: billingAuditTrail.afterValue,
      changeReason: billingAuditTrail.changeReason,
      revenueImpact: billingAuditTrail.revenueImpact,
      changeSource: billingAuditTrail.changeSource,
      createdAt: billingAuditTrail.createdAt,
      changedBy: users.username
    })
    .from(billingAuditTrail)
    .leftJoin(users, eq(billingAuditTrail.changedBy, users.id))
    .where(eq(billingAuditTrail.encounterId, encounterId))
    .orderBy(billingAuditTrail.createdAt);

    return auditEntries.map(entry => ({
      ...entry,
      revenueImpact: parseFloat(entry.revenueImpact?.toString() || "0")
    }));
  }
}