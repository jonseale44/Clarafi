/**
 * GPT Lab Intelligence Service
 * 
 * Advanced AI-powered lab capabilities that go far beyond traditional EMR systems.
 * This demonstrates how GPT can enhance every aspect of lab operations with
 * clinical intelligence.
 */

import OpenAI from 'openai';
import { db } from './db.js';
import { labResults, labOrders, patients, medicalProblems, medications } from '@shared/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

export class GPTLabIntelligence {
  /**
   * Natural Language Lab Query
   * Allow providers to ask questions about labs in plain English
   */
  async queryLabs(patientId: number, query: string): Promise<{
    answer: string;
    relevantResults: any[];
    suggestedActions: string[];
  }> {
    // Get patient's lab history and medical context
    const [labHistory, problems, meds] = await Promise.all([
      db.select().from(labResults).where(eq(labResults.patientId, patientId)).orderBy(desc(labResults.resultDate)).limit(100),
      db.select().from(medicalProblems).where(and(eq(medicalProblems.patientId, patientId), eq(medicalProblems.status, 'active'))),
      db.select().from(medications).where(and(eq(medications.patientId, patientId), eq(medications.active, true)))
    ]);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert clinical laboratory consultant. Answer questions about lab results with clinical insight.
          Consider the patient's medical problems and medications when interpreting results.
          Provide actionable recommendations when appropriate.`
        },
        {
          role: "user",
          content: `Patient query: "${query}"
          
Lab History: ${JSON.stringify(labHistory, null, 2)}
Active Problems: ${JSON.stringify(problems.map(p => p.problemName), null, 2)}
Current Medications: ${JSON.stringify(meds.map(m => m.medicationName), null, 2)}

Please provide:
1. A clear answer to the query
2. Relevant lab results that support your answer
3. Any suggested follow-up actions`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Intelligent Lab Ordering Assistant
   * Suggests appropriate labs based on clinical context
   */
  async suggestLabs(patientId: number, clinicalContext: {
    chiefComplaint?: string;
    symptoms?: string[];
    physicalExam?: string;
    differentialDiagnosis?: string[];
  }): Promise<{
    recommendedTests: Array<{
      testName: string;
      loincCode: string;
      rationale: string;
      priority: 'routine' | 'urgent' | 'stat';
    }>;
    testingStrategy: string;
  }> {
    // Get recent labs to avoid duplicate ordering
    const recentLabs = await db.select()
      .from(labResults)
      .where(and(
        eq(labResults.patientId, patientId),
        gte(labResults.resultDate, sql`CURRENT_DATE - INTERVAL '30 days'`)
      ));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physician creating an evidence-based lab ordering strategy.
          Consider recent labs to avoid unnecessary duplication.
          Prioritize high-yield tests based on clinical presentation.`
        },
        {
          role: "user",
          content: `Clinical Context:
Chief Complaint: ${clinicalContext.chiefComplaint || 'Not specified'}
Symptoms: ${clinicalContext.symptoms?.join(', ') || 'Not specified'}
Physical Exam: ${clinicalContext.physicalExam || 'Not specified'}
Differential Diagnosis: ${clinicalContext.differentialDiagnosis?.join(', ') || 'Not specified'}

Recent Labs (last 30 days): ${JSON.stringify(recentLabs.map(l => ({ test: l.testName, date: l.resultDate })), null, 2)}

Recommend appropriate lab tests with:
1. Test name and LOINC code
2. Clinical rationale
3. Priority level
4. Overall testing strategy`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Lab Result Trend Analysis
   * Identifies clinically significant trends across time
   */
  async analyzeTrends(patientId: number, testNames: string[]): Promise<{
    trends: Array<{
      testName: string;
      trendDescription: string;
      clinicalSignificance: string;
      graphData: Array<{ date: string; value: number }>;
    }>;
    overallAssessment: string;
    recommendations: string[];
  }> {
    // Get historical data for specified tests
    const historicalResults = await db.select()
      .from(labResults)
      .where(and(
        eq(labResults.patientId, patientId),
        sql`${labResults.testName} = ANY(${testNames})`
      ))
      .orderBy(labResults.resultDate);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze lab trends for clinical significance. Consider:
          - Rate of change
          - Clinical thresholds
          - Pattern recognition (improving, worsening, stable)
          - Correlation between different tests`
        },
        {
          role: "user",
          content: `Analyze trends for these lab results:
${JSON.stringify(historicalResults, null, 2)}

Provide:
1. Trend analysis for each test
2. Clinical significance
3. Overall assessment
4. Recommendations for monitoring or intervention`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Critical Value Intelligence
   * Goes beyond simple thresholds to consider patient context
   */
  async assessCriticalValue(result: {
    testName: string;
    value: number;
    units: string;
    patientId: number;
  }): Promise<{
    isCritical: boolean;
    urgencyLevel: 'routine' | 'urgent' | 'critical' | 'panic';
    clinicalContext: string;
    recommendedActions: string[];
    notificationPriority: number; // 1-10
  }> {
    // Get patient context
    const [patient, problems, meds, recentResults] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, result.patientId)).limit(1),
      db.select().from(medicalProblems).where(and(eq(medicalProblems.patientId, result.patientId), eq(medicalProblems.status, 'active'))),
      db.select().from(medications).where(and(eq(medications.patientId, result.patientId), eq(medications.active, true))),
      db.select().from(labResults)
        .where(and(
          eq(labResults.patientId, result.patientId),
          eq(labResults.testName, result.testName)
        ))
        .orderBy(desc(labResults.resultDate))
        .limit(5)
    ]);

    const patientAge = patient[0] ? new Date().getFullYear() - new Date(patient[0].dateOfBirth).getFullYear() : null;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Assess lab values for clinical criticality considering patient-specific factors.
          Go beyond simple reference ranges to consider clinical context.`
        },
        {
          role: "user",
          content: `Lab Result: ${result.testName} = ${result.value} ${result.units}
          
Patient Context:
- Age: ${patientAge || 'Unknown'}
- Active Problems: ${problems.map(p => p.problemName).join(', ')}
- Current Medications: ${meds.map(m => m.medicationName).join(', ')}
- Recent Values for this test: ${recentResults.map(r => `${r.value} on ${r.resultDate}`).join(', ')}

Assess:
1. Is this truly critical given the patient's context?
2. Urgency level
3. Clinical interpretation
4. Recommended actions
5. Notification priority (1-10)`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Lab Panel Intelligence
   * Interprets complete lab panels holistically
   */
  async interpretPanel(panelResults: Array<{
    testName: string;
    value: number;
    units: string;
    referenceRange: string;
  }>, panelType: string): Promise<{
    overallInterpretation: string;
    keyFindings: string[];
    differentialConsiderations: string[];
    followUpRecommendations: string[];
    educationalPoints: string[];
  }> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Provide holistic interpretation of lab panels. Consider:
          - Patterns across multiple tests
          - Clinical correlations
          - Common causes of abnormal patterns
          - Educational insights for providers`
        },
        {
          role: "user",
          content: `Interpret this ${panelType} panel:
${JSON.stringify(panelResults, null, 2)}

Provide:
1. Overall clinical interpretation
2. Key findings
3. Differential considerations
4. Follow-up recommendations
5. Educational points about the results`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Pre-visit Lab Planning
   * Suggests labs to order before upcoming appointments
   */
  async planPreVisitLabs(patientId: number, appointmentType: string, daysBefore: number): Promise<{
    recommendedLabs: Array<{
      testName: string;
      rationale: string;
      orderTiming: string;
    }>;
    screeningDue: Array<{
      screening: string;
      lastDone: string | null;
      guideline: string;
    }>;
  }> {
    // Get patient demographics and problem list for screening recommendations
    const [patient, problems, lastLabs] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
      db.select().from(medicalProblems).where(and(eq(medicalProblems.patientId, patientId), eq(medicalProblems.status, 'active'))),
      db.select()
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.resultDate))
        .limit(50)
    ]);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Plan appropriate pre-visit labs based on appointment type and patient conditions.
          Consider disease monitoring, preventive screenings, and appointment-specific needs.`
        },
        {
          role: "user",
          content: `Plan pre-visit labs for:
          
Appointment Type: ${appointmentType}
Days Before Visit: ${daysBefore}
Patient Age: ${patient[0] ? new Date().getFullYear() - new Date(patient[0].dateOfBirth).getFullYear() : 'Unknown'}
Patient Sex: ${patient[0]?.sex || 'Unknown'}
Active Problems: ${problems.map(p => p.problemName).join(', ')}
Recent Labs: ${lastLabs.slice(0, 10).map(l => `${l.testName} on ${l.resultDate}`).join(', ')}

Recommend:
1. Specific labs needed for this visit type
2. Disease monitoring labs
3. Due preventive screenings
4. Optimal timing for each test`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

// Export singleton instance
export const gptLabIntelligence = new GPTLabIntelligence();