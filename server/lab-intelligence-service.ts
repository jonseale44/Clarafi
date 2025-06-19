/**
 * Laboratory Intelligence Service
 * 
 * AI-powered laboratory test analysis, interpretation, and clinical decision support
 * Integrates with OpenAI to provide sophisticated lab result analysis comparable to Epic/Athena
 */

import OpenAI from 'openai';
import { db } from './db';
import { labResults, labOrders, patients, encounters, labReferenceRanges } from '@shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

interface LabInterpretationRequest {
  resultId: number;
  includeHistoricalTrends?: boolean;
  includeClinicalContext?: boolean;
  includeRecommendations?: boolean;
}

interface LabTrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  percentChange: number;
  clinicalSignificance: string;
  timeframe: string;
}

interface ClinicalRecommendation {
  type: 'immediate_action' | 'follow_up' | 'monitoring' | 'additional_testing';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  action: string;
  timeframe?: string;
  reasoning: string;
}

interface LabInterpretationResult {
  clinicalSignificance: string;
  riskAssessment: string;
  trendAnalysis?: LabTrendAnalysis;
  suggestedActions: string[];
  followUpRecommendations: ClinicalRecommendation[];
  relatedFindings: string[];
  patientEducation?: string;
  qualityFlags?: string[];
}

export class LabIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Comprehensive AI analysis of laboratory results with clinical context
   */
  async interpretLabResult(request: LabInterpretationRequest): Promise<LabInterpretationResult> {
    const result = await this.getLabResultWithContext(request.resultId);
    const historicalData = request.includeHistoricalTrends ? 
      await this.getHistoricalResults(result.patientId, result.loincCode) : null;
    const clinicalContext = request.includeClinicalContext ? 
      await this.getClinicalContext(result.patientId, result.encounterId) : null;

    const prompt = this.buildInterpretationPrompt(result, historicalData, clinicalContext);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const interpretation = this.parseInterpretationResponse(response.choices[0].message.content);
    
    // Update the lab result with AI interpretation
    await db.update(labResults)
      .set({
        aiInterpretation: interpretation,
        updatedAt: new Date()
      })
      .where(eq(labResults.id, request.resultId));

    return interpretation;
  }

  /**
   * Intelligent lab ordering recommendations based on patient context
   */
  async getLabOrderRecommendations(patientId: number, encounterId: number, symptoms?: string[], diagnoses?: string[]): Promise<Array<{
    testName: string;
    loincCode: string;
    reasoning: string;
    priority: string;
    estimatedCost?: number;
  }>> {
    const patientContext = await this.getPatientContext(patientId);
    const currentMedications = await this.getCurrentMedications(patientId);
    const recentResults = await this.getRecentResults(patientId, 90); // Last 90 days

    const prompt = this.buildOrderRecommendationPrompt(
      patientContext,
      currentMedications,
      recentResults,
      symptoms,
      diagnoses
    );

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: this.getOrderRecommendationSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    return this.parseOrderRecommendations(response.choices[0].message.content);
  }

  /**
   * Critical value detection and alert generation
   * 
   * REFERENCE RANGE LOGIC:
   * 1. First tries structured labReferenceRanges table for precise critical thresholds
   * 2. Falls back to parsing referenceRange text field if structured data unavailable
   * 3. Uses basic range parsing as last resort
   */
  async analyzeCriticalValues(resultId: number): Promise<{
    isCritical: boolean;
    alertType?: string;
    severity?: string;
    message?: string;
    recommendedActions?: string[];
    dataSource?: string; // Indicates which reference range source was used
  }> {
    const result = await this.getLabResultWithContext(resultId);
    
    const analysis = {
      isCritical: false,
      alertType: undefined as string | undefined,
      severity: undefined as string | undefined,
      message: undefined as string | undefined,
      recommendedActions: undefined as string[] | undefined,
      dataSource: undefined as string | undefined,
    };

    if (!result.resultNumeric) {
      console.log(`[Lab Intelligence] No numeric result for ${result.testName}, cannot analyze critical values`);
      return analysis;
    }

    // STEP 1: Try structured reference ranges (preferred method)
    const structuredRanges = await this.getReferenceRanges(result.loincCode, result.patientAge, result.patientGender);
    
    if (structuredRanges && (structuredRanges.criticalLow || structuredRanges.criticalHigh)) {
      console.log(`[Lab Intelligence] Using STRUCTURED reference ranges for critical analysis`);
      analysis.dataSource = 'structured_table';
      
      if (structuredRanges.criticalLow && result.resultNumeric <= structuredRanges.criticalLow) {
        analysis.isCritical = true;
        analysis.alertType = 'critical_low';
        analysis.severity = 'critical';
        analysis.message = `${result.testName}: ${result.resultValue} ${result.resultUnits} is critically low (Critical: <${structuredRanges.criticalLow})`;
      } else if (structuredRanges.criticalHigh && result.resultNumeric >= structuredRanges.criticalHigh) {
        analysis.isCritical = true;
        analysis.alertType = 'critical_high';
        analysis.severity = 'critical';
        analysis.message = `${result.testName}: ${result.resultValue} ${result.resultUnits} is critically high (Critical: >${structuredRanges.criticalHigh})`;
      }
    } 
    // STEP 2: Fall back to text field parsing (basic method)
    else if (result.referenceRange) {
      console.log(`[Lab Intelligence] Falling back to TEXT reference range parsing: "${result.referenceRange}"`);
      analysis.dataSource = 'text_field_parsing';
      
      // Basic critical value estimation from text ranges
      // This is a simple heuristic - structured data is much better
      const criticalAnalysis = this.estimateCriticalFromTextRange(result.referenceRange, result.resultNumeric, result.testName);
      if (criticalAnalysis.isCritical) {
        Object.assign(analysis, criticalAnalysis);
      }
    }
    
    // Get AI-powered clinical recommendations for critical values
    if (analysis.isCritical) {
      analysis.recommendedActions = await this.getCriticalValueRecommendations(result);
    }

    return analysis;
  }

  /**
   * Basic critical value estimation from text reference ranges
   * This is a FALLBACK method when structured data is unavailable
   * 
   * NOTE: This is imprecise compared to structured critical thresholds!
   * Example: "150-450" might suggest critical at <75 or >900 (rough 2x rule)
   */
  private estimateCriticalFromTextRange(referenceRange: string, resultValue: number, testName: string): {
    isCritical: boolean;
    alertType?: string;
    severity?: string;
    message?: string;
  } {
    try {
      // Parse basic range like "150-450" or "0.7-1.2"
      const rangeMatch = referenceRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (!rangeMatch) {
        return { isCritical: false };
      }

      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      
      // Rough heuristic: critical might be 50% below low or 200% above high
      // This is VERY approximate - structured data is much better
      const estimatedCriticalLow = low * 0.5;
      const estimatedCriticalHigh = high * 2.0;
      
      if (resultValue <= estimatedCriticalLow) {
        return {
          isCritical: true,
          alertType: 'critical_low',
          severity: 'critical',
          message: `${testName}: ${resultValue} is estimated critically low (rough estimate from range ${referenceRange})`
        };
      } else if (resultValue >= estimatedCriticalHigh) {
        return {
          isCritical: true,
          alertType: 'critical_high', 
          severity: 'critical',
          message: `${testName}: ${resultValue} is estimated critically high (rough estimate from range ${referenceRange})`
        };
      }
      
      return { isCritical: false };
      
    } catch (error) {
      console.error(`[Lab Intelligence] Error parsing text reference range "${referenceRange}":`, error);
      return { isCritical: false };
    }
  }

  /**
   * Multi-lab result pattern analysis for complex conditions
   */
  async analyzeResultPatterns(patientId: number, timeframeDays: number = 30): Promise<{
    patterns: Array<{
      description: string;
      confidence: number;
      suggestedDiagnoses?: string[];
      recommendedFollowUp?: string[];
    }>;
    qualityMetrics: {
      completeness: number;
      consistency: number;
      clinicalRelevance: number;
    };
  }> {
    const results = await this.getRecentResults(patientId, timeframeDays);
    const patientContext = await this.getPatientContext(patientId);

    const prompt = this.buildPatternAnalysisPrompt(results, patientContext);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: this.getPatternAnalysisSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return this.parsePatternAnalysis(response.choices[0].message.content);
  }

  // Private helper methods

  private async getLabResultWithContext(resultId: number) {
    const result = await db
      .select({
        ...labResults,
        patientAge: patients.dateOfBirth,
        patientGender: patients.gender,
        encounterId: labResults.labOrderId
      })
      .from(labResults)
      .innerJoin(patients, eq(labResults.patientId, patients.id))
      .where(eq(labResults.id, resultId))
      .limit(1);

    return result[0];
  }

  private async getHistoricalResults(patientId: number, loincCode: string, limitDays: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);

    return await db
      .select()
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          eq(labResults.loincCode, loincCode),
          gte(labResults.resultAvailableAt, cutoffDate)
        )
      )
      .orderBy(desc(labResults.resultAvailableAt));
  }

  private async getClinicalContext(patientId: number, encounterId?: number) {
    // Get current medications, diagnoses, and encounter details
    const context = await db
      .select({
        encounterNotes: encounters.note,
        chiefComplaint: encounters.chiefComplaint,
      })
      .from(encounters)
      .where(eq(encounters.id, encounterId || 0))
      .limit(1);

    return context[0] || null;
  }

  private getSystemPrompt(): string {
    return `You are an expert clinical laboratory specialist and physician with extensive experience in laboratory medicine, clinical pathology, and diagnostic interpretation. Your role is to provide comprehensive, evidence-based analysis of laboratory results with the sophistication expected in major EMR systems like Epic and Athena.

Key responsibilities:
1. Interpret lab values in clinical context with consideration of patient demographics, medications, and conditions
2. Identify clinically significant abnormalities and their potential causes
3. Recommend appropriate follow-up actions and additional testing when indicated
4. Provide clear, actionable clinical guidance for healthcare providers
5. Consider differential diagnoses and clinical correlations
6. Flag critical values requiring immediate attention

Always consider:
- Age and gender-specific reference ranges
- Medication effects on lab values
- Disease states affecting interpretation
- Trending patterns and delta checks
- Quality control flags and specimen issues
- Clinical correlation requirements

Provide responses in structured JSON format with clear clinical reasoning.`;
  }

  private buildInterpretationPrompt(result: any, historicalData?: any[], clinicalContext?: any): string {
    let prompt = `Please analyze this laboratory result:

Test: ${result.testName} (LOINC: ${result.loincCode})
Result: ${result.resultValue} ${result.resultUnits}
Reference Range: ${result.referenceRange}
Abnormal Flag: ${result.abnormalFlag || 'None'}
Patient: ${result.patientAge ? this.calculateAge(result.patientAge) : 'Unknown'} years old, ${result.patientGender || 'Unknown gender'}`;

    if (result.qcFlags) {
      prompt += `\nSpecimen Quality: ${JSON.stringify(result.qcFlags)}`;
    }

    if (historicalData && historicalData.length > 0) {
      prompt += `\n\nHistorical Results (last ${historicalData.length} values):`;
      historicalData.forEach((hist, index) => {
        prompt += `\n${hist.resultAvailableAt}: ${hist.resultValue} ${hist.resultUnits}`;
      });
    }

    if (clinicalContext) {
      prompt += `\n\nClinical Context:`;
      if (clinicalContext.chiefComplaint) prompt += `\nChief Complaint: ${clinicalContext.chiefComplaint}`;
      if (clinicalContext.encounterNotes) prompt += `\nEncounter Notes: ${clinicalContext.encounterNotes.substring(0, 500)}...`;
    }

    prompt += `\n\nREFERENCE RANGE NOTE: The reference range "${result.referenceRange}" is the DISPLAY range for this result. Use this for interpretation and patient communication.

Please provide a comprehensive analysis including:
1. Clinical significance of this result
2. Risk assessment and urgency level
3. Possible causes for abnormal values
4. Recommended immediate actions
5. Follow-up recommendations
6. Patient education points
7. Quality considerations

Format as JSON with keys: clinicalSignificance, riskAssessment, suggestedActions, followUpRecommendations, relatedFindings, patientEducation, qualityFlags`;

    return prompt;
  }

  private parseInterpretationResponse(content: string | null): LabInterpretationResult {
    if (!content) {
      return {
        clinicalSignificance: "Unable to analyze result",
        riskAssessment: "Unknown",
        suggestedActions: [],
        followUpRecommendations: [],
        relatedFindings: []
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        clinicalSignificance: parsed.clinicalSignificance || "No interpretation available",
        riskAssessment: parsed.riskAssessment || "Unable to assess",
        suggestedActions: parsed.suggestedActions || [],
        followUpRecommendations: parsed.followUpRecommendations || [],
        relatedFindings: parsed.relatedFindings || [],
        patientEducation: parsed.patientEducation,
        qualityFlags: parsed.qualityFlags
      };
    } catch (error) {
      return {
        clinicalSignificance: content.substring(0, 500),
        riskAssessment: "Analysis completed",
        suggestedActions: [],
        followUpRecommendations: [],
        relatedFindings: []
      };
    }
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Get structured reference ranges for advanced AI analysis
   * 
   * IMPORTANT: This is DIFFERENT from the referenceRange text field in lab_results!
   * 
   * TWO REFERENCE RANGE SYSTEMS:
   * 1. labResults.referenceRange (text): Simple display string like "150-450" 
   *    - Used for: UI display, basic GPT prompts, fallback
   *    - Always present, human-readable
   * 
   * 2. labReferenceRanges (table): Structured data for advanced features
   *    - Used for: Age/gender-specific ranges, critical value detection, AI analysis
   *    - May be empty, requires population
   * 
   * This method queries the STRUCTURED table for advanced AI features.
   * If no data found, methods should fall back to parsing the TEXT field.
   */
  private async getReferenceRanges(loincCode: string, patientAge?: string, patientGender?: string) {
    const age = patientAge ? this.calculateAge(patientAge) : null;
    
    try {
      const ranges = await db
        .select()
        .from(labReferenceRanges)
        .where(
          and(
            eq(labReferenceRanges.loincCode, loincCode),
            eq(labReferenceRanges.active, true),
            // Age filtering - only apply if age is known
            age ? gte(labReferenceRanges.ageMax, age) : undefined,
            age ? lte(labReferenceRanges.ageMin, age) : undefined,
            // Gender filtering - null/undefined means applies to all genders
            patientGender ? 
              and(
                eq(labReferenceRanges.gender, patientGender),
                // Also include ranges that apply to all genders
                eq(labReferenceRanges.gender, null)
              ) : undefined
          )
        )
        .orderBy(desc(labReferenceRanges.lastVerified))
        .limit(1);

      if (ranges.length > 0) {
        console.log(`[Lab Intelligence] Found structured reference range for ${loincCode}`);
        return ranges[0];
      }
      
      console.log(`[Lab Intelligence] No structured reference range found for ${loincCode}, will fall back to text parsing`);
      return null;
      
    } catch (error) {
      console.error(`[Lab Intelligence] Error querying structured reference ranges:`, error);
      return null;
    }
  }

  private async getCriticalValueRecommendations(result: any): Promise<string[]> {
    const prompt = `Critical lab value detected:
${result.testName}: ${result.resultValue} ${result.resultUnits}

What immediate clinical actions should be taken? Provide 3-5 specific, actionable recommendations.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an emergency medicine physician providing immediate action recommendations for critical lab values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    return content ? content.split('\n').filter(line => line.trim().length > 0) : [];
  }

  // Additional helper methods for order recommendations and pattern analysis
  private getOrderRecommendationSystemPrompt(): string {
    return `You are a clinical decision support specialist providing evidence-based laboratory test recommendations. Consider patient demographics, current conditions, medications, symptoms, and cost-effectiveness when suggesting appropriate tests.`;
  }

  private buildOrderRecommendationPrompt(patientContext: any, medications: any[], recentResults: any[], symptoms?: string[], diagnoses?: string[]): string {
    return `Based on the following patient information, recommend appropriate laboratory tests:

Patient Context: ${JSON.stringify(patientContext)}
Current Medications: ${JSON.stringify(medications)}
Recent Lab Results: ${JSON.stringify(recentResults)}
Current Symptoms: ${symptoms?.join(', ') || 'None reported'}
Current Diagnoses: ${diagnoses?.join(', ') || 'None specified'}

Provide recommendations in JSON format with testName, loincCode, reasoning, priority, and estimatedCost.`;
  }

  private parseOrderRecommendations(content: string | null): Array<{
    testName: string;
    loincCode: string;
    reasoning: string;
    priority: string;
    estimatedCost?: number;
  }> {
    // Implementation for parsing order recommendations
    return [];
  }

  private getPatternAnalysisSystemPrompt(): string {
    return `You are a clinical pathologist specializing in laboratory result pattern recognition and diagnostic correlation.`;
  }

  private buildPatternAnalysisPrompt(results: any[], patientContext: any): string {
    return `Analyze these laboratory results for patterns and clinical correlations:
${JSON.stringify({ results, patientContext })}`;
  }

  private parsePatternAnalysis(content: string | null): any {
    // Implementation for parsing pattern analysis
    return {
      patterns: [],
      qualityMetrics: {
        completeness: 0,
        consistency: 0,
        clinicalRelevance: 0
      }
    };
  }

  private async getPatientContext(patientId: number) {
    // Implementation to get comprehensive patient context
    return {};
  }

  private async getCurrentMedications(patientId: number) {
    // Implementation to get current medications
    return [];
  }

  private async getRecentResults(patientId: number, days: number) {
    // Implementation to get recent results
    return [];
  }
}

export const labIntelligenceService = new LabIntelligenceService();