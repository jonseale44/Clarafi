/**
 * Lab Workflow Service - Advanced lab result processing workflows
 * Handles result-triggered encounters, automated follow-up ordering, and comprehensive reporting
 */

import { db } from "./db";
import { labResults, encounters, labOrders, patients, users } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { labIntelligenceService } from "./lab-intelligence-service";

export interface CriticalResultWorkflow {
  resultId: number;
  patientId: number;
  testName: string;
  resultValue: string;
  criticalFlag: boolean;
  encounterExtended?: number;
  providersNotified: number[];
  followUpOrders: number[];
}

export interface FollowUpRecommendation {
  testCode: string;
  testName: string;
  priority: 'urgent' | 'routine' | 'stat';
  clinicalReason: string;
  timeframe: string;
}

export class LabWorkflowService {
  
  /**
   * Process critical lab results and trigger automated workflows
   */
  static async processCriticalResult(resultId: number): Promise<CriticalResultWorkflow> {
    console.log(`🚨 [Lab Workflow] Processing critical result ${resultId}`);
    
    // Get the lab result with patient context
    const result = await db
      .select({
        id: labResults.id,
        patientId: labResults.patientId,
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        abnormalFlag: labResults.abnormalFlag,
        criticalFlag: sql<boolean>`case when ${labResults.abnormalFlag} in ('HH', 'LL', 'CRITICAL') then true else false end`,
        sourceType: labResults.sourceType,
        sourceConfidence: labResults.sourceConfidence
      })
      .from(labResults)
      .where(eq(labResults.id, resultId))
      .limit(1);

    if (!result.length) {
      throw new Error(`Lab result ${resultId} not found`);
    }

    const labResult = result[0];
    const workflow: CriticalResultWorkflow = {
      resultId,
      patientId: labResult.patientId,
      testName: labResult.testName,
      resultValue: labResult.resultValue,
      criticalFlag: labResult.criticalFlag,
      providersNotified: [],
      followUpOrders: []
    };

    // Only proceed with critical results
    if (!labResult.criticalFlag) {
      console.log(`⚠️ [Lab Workflow] Result ${resultId} is not critical, skipping workflow`);
      return workflow;
    }

    // Step 1: Extend existing encounter with critical result information
    const encounterId = await this.extendExistingEncounter(labResult.patientId, resultId);
    workflow.encounterExtended = encounterId;

    // Step 2: Generate follow-up recommendations using AI
    const recommendations = await this.generateFollowUpRecommendations(labResult);
    
    // Step 3: Create recommended follow-up orders
    for (const recommendation of recommendations) {
      const orderId = await this.createFollowUpOrder(
        labResult.patientId, 
        encounterId, 
        recommendation
      );
      workflow.followUpOrders.push(orderId);
    }

    // Step 4: Notify relevant providers
    const notifiedProviders = await this.notifyProviders(labResult.patientId, resultId);
    workflow.providersNotified = notifiedProviders;

    console.log(`✅ [Lab Workflow] Critical result workflow completed for ${resultId}`);
    return workflow;
  }

  /**
   * Extend existing encounter with critical lab result information
   */
  private static async extendExistingEncounter(patientId: number, resultId: number): Promise<number> {
    console.log(`📋 [Lab Workflow] Extending existing encounter for patient ${patientId} with critical result ${resultId}`);
    
    // Find the most recent encounter for this patient
    const recentEncounters = await db
      .select({
        id: encounters.id,
        note: encounters.note,
        encounterType: encounters.encounterType
      })
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.createdAt))
      .limit(1);

    if (!recentEncounters.length) {
      console.log(`⚠️ [Lab Workflow] No existing encounter found, creating new one for critical result`);
      // If no encounter exists, create a minimal one
      const [encounter] = await db.insert(encounters).values({
        patientId: patientId,
        providerId: 2,
        encounterType: 'lab_review',
        chiefComplaint: `Critical lab result review - Result ID: ${resultId}`,
        note: `Critical lab result requiring immediate attention and follow-up.`
      }).returning({ id: encounters.id });

      return encounter.id;
    }

    const encounter = recentEncounters[0];
    
    // Extend the existing encounter note with critical result information
    const criticalResultNote = `\n\n--- CRITICAL LAB RESULT ALERT ---\nResult ID: ${resultId}\nTime: ${new Date().toISOString()}\nStatus: Requires immediate provider review and follow-up\n--- END CRITICAL ALERT ---`;
    
    const updatedNote = (encounter.note || '') + criticalResultNote;
    
    // Update the encounter with extended information
    await db
      .update(encounters)
      .set({
        note: updatedNote,
        updatedAt: new Date()
      })
      .where(eq(encounters.id, encounter.id));

    console.log(`✅ [Lab Workflow] Extended encounter ${encounter.id} with critical result information`);
    return encounter.id;
  }

  /**
   * Generate AI-powered follow-up recommendations for critical results
   */
  private static async generateFollowUpRecommendations(labResult: any): Promise<FollowUpRecommendation[]> {
    console.log(`🤖 [Lab Workflow] Generating follow-up recommendations for ${labResult.testName}`);
    
    // Use the lab intelligence service to generate recommendations
    const recommendations: FollowUpRecommendation[] = [];
    
    // Basic rule-based recommendations (can be enhanced with GPT)
    if (labResult.testName.toLowerCase().includes('glucose') && parseFloat(labResult.resultValue) > 250) {
      recommendations.push({
        testCode: 'A1C',
        testName: 'Hemoglobin A1C',
        priority: 'routine',
        clinicalReason: 'Elevated glucose requires diabetes assessment',
        timeframe: '1-2 weeks'
      });
      
      recommendations.push({
        testCode: 'LIPID',
        testName: 'Lipid Panel',
        priority: 'routine',
        clinicalReason: 'Diabetic screening panel',
        timeframe: '1-2 weeks'
      });
    }

    if (labResult.testName.toLowerCase().includes('hemoglobin') && parseFloat(labResult.resultValue) < 8.0) {
      recommendations.push({
        testCode: 'IRON',
        testName: 'Iron Studies',
        priority: 'urgent',
        clinicalReason: 'Severe anemia workup',
        timeframe: '3-5 days'
      });
      
      recommendations.push({
        testCode: 'B12',
        testName: 'Vitamin B12',
        priority: 'routine',
        clinicalReason: 'Anemia evaluation',
        timeframe: '1 week'
      });
    }

    if (labResult.testName.toLowerCase().includes('creatinine') && parseFloat(labResult.resultValue) > 2.0) {
      recommendations.push({
        testCode: 'BUN',
        testName: 'Blood Urea Nitrogen',
        priority: 'urgent',
        clinicalReason: 'Kidney function assessment',
        timeframe: '24-48 hours'
      });
      
      recommendations.push({
        testCode: 'URINALYSIS',
        testName: 'Urinalysis',
        priority: 'urgent',
        clinicalReason: 'Renal function evaluation',
        timeframe: '24-48 hours'
      });
    }

    console.log(`💡 [Lab Workflow] Generated ${recommendations.length} follow-up recommendations`);
    return recommendations;
  }

  /**
   * Create follow-up lab orders based on recommendations
   */
  private static async createFollowUpOrder(
    patientId: number, 
    encounterId: number, 
    recommendation: FollowUpRecommendation
  ): Promise<number> {
    console.log(`📋 [Lab Workflow] Creating follow-up order: ${recommendation.testName}`);
    
    const [order] = await db.insert(labOrders).values({
      patientId: patientId,
      encounterId: encounterId,
      testCode: recommendation.testCode,
      testName: recommendation.testName,
      priority: recommendation.priority,
      clinicalIndication: recommendation.clinicalReason,
      orderedBy: 2, // System/AI generated
      specimenType: 'serum', // Default
      fastingRequired: false,
      orderStatus: 'pending',
      orderedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({ id: labOrders.id });

    console.log(`✅ [Lab Workflow] Created follow-up order ${order.id}`);
    return order.id;
  }

  /**
   * Notify providers about critical results
   */
  private static async notifyProviders(patientId: number, resultId: number): Promise<number[]> {
    console.log(`📢 [Lab Workflow] Notifying providers about critical result ${resultId}`);
    
    // Get all providers who have ordered labs for this patient in the last 30 days
    const recentProviders = await db
      .select({
        providerId: labOrders.orderedBy
      })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.patientId, patientId),
          gte(labOrders.orderedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(labOrders.orderedBy);

    const providerIds = recentProviders.map(p => p.providerId);
    
    // In a real system, this would send notifications via email, SMS, pager, etc.
    console.log(`📧 [Lab Workflow] Would notify providers: ${providerIds.join(', ')}`);
    
    return providerIds;
  }

  /**
   * Generate comprehensive lab report for a patient
   */
  static async generateComprehensiveReport(patientId: number, timeframeDays: number = 90): Promise<any> {
    console.log(`📊 [Lab Workflow] Generating comprehensive report for patient ${patientId}`);
    
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    
    // Get all lab results in timeframe
    const results = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        resultUnits: labResults.resultUnits,
        referenceRange: labResults.referenceRange,
        abnormalFlag: labResults.abnormalFlag,
        sourceType: labResults.sourceType,
        sourceConfidence: labResults.sourceConfidence,
        resultAvailableAt: labResults.resultAvailableAt
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          gte(labResults.resultAvailableAt, startDate)
        )
      )
      .orderBy(desc(labResults.resultAvailableAt));

    // Group by test name for trend analysis
    const groupedResults = results.reduce((groups: any, result) => {
      const testName = result.testName;
      if (!groups[testName]) {
        groups[testName] = [];
      }
      groups[testName].push(result);
      return groups;
    }, {});

    // Generate summary statistics
    const summary = {
      totalResults: results.length,
      abnormalResults: results.filter(r => r.abnormalFlag && r.abnormalFlag !== 'N').length,
      criticalResults: results.filter(r => r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL').length,
      sourceBreakdown: {
        labOrder: results.filter(r => r.sourceType === 'lab_order').length,
        patientReported: results.filter(r => r.sourceType === 'patient_reported').length,
        providerEntered: results.filter(r => r.sourceType === 'provider_entered').length,
        externalUpload: results.filter(r => r.sourceType === 'external_upload').length
      },
      averageConfidence: results.reduce((sum, r) => sum + r.sourceConfidence, 0) / results.length
    };

    console.log(`📈 [Lab Workflow] Report generated: ${summary.totalResults} results analyzed`);
    
    return {
      summary,
      groupedResults,
      timeframe: timeframeDays,
      generatedAt: new Date()
    };
  }

  /**
   * Process batch lab results for automated workflows
   */
  static async processBatchResults(resultIds: number[]): Promise<CriticalResultWorkflow[]> {
    console.log(`⚡ [Lab Workflow] Processing batch of ${resultIds.length} results`);
    
    const workflows: CriticalResultWorkflow[] = [];
    
    for (const resultId of resultIds) {
      try {
        const workflow = await this.processCriticalResult(resultId);
        workflows.push(workflow);
      } catch (error) {
        console.error(`❌ [Lab Workflow] Failed to process result ${resultId}:`, error);
      }
    }
    
    console.log(`✅ [Lab Workflow] Batch processing completed: ${workflows.length} workflows created`);
    return workflows;
  }
}

export default LabWorkflowService;