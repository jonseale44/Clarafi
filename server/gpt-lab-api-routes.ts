/**
 * GPT Lab API Routes
 * 
 * Exposes the revolutionary GPT-powered lab capabilities
 * that make CLARAFI's lab system superior to traditional EMRs
 */

import { Router } from 'express';
import { z } from 'zod';
import { gptInterfaceEngine } from './gpt-interface-engine.js';
import { gptLabIntelligence } from './gpt-lab-intelligence.js';
import { db } from './db.js';
import { patients } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const gptLabAPIRoutes = Router();

// GPT Interface Engine Routes

/**
 * Parse any lab message format using GPT
 * Replaces traditional interface engines like Mirth
 */
const parseMessageSchema = z.object({
  rawMessage: z.string(),
  sourceSystem: z.string(),
  messageTypeHint: z.enum(['lab_result', 'lab_order', 'status_update', 'unknown']).optional(),
  sourceContext: z.object({
    labName: z.string().optional(),
    expectedFormat: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

gptLabAPIRoutes.post('/parse-message', async (req, res) => {
  try {
    const parsed = parseMessageSchema.parse(req.body);
    
    console.log(`[GPTLabAPI] Parsing message from ${parsed.sourceSystem}`);
    
    // Use GPT to intelligently parse ANY format
    const response = await gptInterfaceEngine.parseMessage(parsed);
    
    // Optionally route the message for processing
    if (response.confidence > 80 && response.messageType !== 'error') {
      await gptInterfaceEngine.routeMessage(response, parsed.sourceSystem);
    }
    
    res.json({
      success: true,
      ...response,
      processingNote: response.confidence > 80 ? 'Message automatically processed' : 'Manual review recommended'
    });
  } catch (error) {
    console.error('[GPTLabAPI] Parse error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse message' 
    });
  }
});

/**
 * Natural language lab queries
 * "Show me all of John's liver function tests from the past year"
 */
const queryLabsSchema = z.object({
  patientId: z.number(),
  query: z.string(),
});

gptLabAPIRoutes.post('/query-labs', async (req, res) => {
  try {
    const { patientId, query } = queryLabsSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    if (patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Natural language query: "${query}" for patient ${patientId}`);
    
    const result = await gptLabIntelligence.queryLabs(patientId, query);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[GPTLabAPI] Query error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Query failed' 
    });
  }
});

/**
 * Intelligent lab ordering suggestions
 */
const suggestLabsSchema = z.object({
  patientId: z.number(),
  clinicalContext: z.object({
    chiefComplaint: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    physicalExam: z.string().optional(),
    differentialDiagnosis: z.array(z.string()).optional(),
  }),
});

gptLabAPIRoutes.post('/suggest-labs', async (req, res) => {
  try {
    const { patientId, clinicalContext } = suggestLabsSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient.length || patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Generating lab suggestions for patient ${patientId}`);
    
    const suggestions = await gptLabIntelligence.suggestLabs(patientId, clinicalContext);
    
    res.json({
      success: true,
      ...suggestions
    });
  } catch (error) {
    console.error('[GPTLabAPI] Suggestion error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate suggestions' 
    });
  }
});

/**
 * Lab trend analysis with clinical insights
 */
const analyzeTrendsSchema = z.object({
  patientId: z.number(),
  testNames: z.array(z.string()),
});

gptLabAPIRoutes.post('/analyze-trends', async (req, res) => {
  try {
    const { patientId, testNames } = analyzeTrendsSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient.length || patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Analyzing trends for ${testNames.length} tests`);
    
    const analysis = await gptLabIntelligence.analyzeTrends(patientId, testNames);
    
    res.json({
      success: true,
      ...analysis
    });
  } catch (error) {
    console.error('[GPTLabAPI] Trend analysis error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    });
  }
});

/**
 * Intelligent critical value assessment
 */
const assessCriticalSchema = z.object({
  testName: z.string(),
  value: z.number(),
  units: z.string(),
  patientId: z.number(),
});

gptLabAPIRoutes.post('/assess-critical-value', async (req, res) => {
  try {
    const result = assessCriticalSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, result.patientId))
      .limit(1);
    
    if (!patient.length || patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Assessing critical value: ${result.testName} = ${result.value}`);
    
    const assessment = await gptLabIntelligence.assessCriticalValue(result);
    
    res.json({
      success: true,
      ...assessment
    });
  } catch (error) {
    console.error('[GPTLabAPI] Critical assessment error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Assessment failed' 
    });
  }
});

/**
 * Lab panel interpretation
 */
const interpretPanelSchema = z.object({
  panelResults: z.array(z.object({
    testName: z.string(),
    value: z.number(),
    units: z.string(),
    referenceRange: z.string(),
  })),
  panelType: z.string(),
});

gptLabAPIRoutes.post('/interpret-panel', async (req, res) => {
  try {
    const { panelResults, panelType } = interpretPanelSchema.parse(req.body);
    
    console.log(`[GPTLabAPI] Interpreting ${panelType} panel with ${panelResults.length} results`);
    
    const interpretation = await gptLabIntelligence.interpretPanel(panelResults, panelType);
    
    res.json({
      success: true,
      ...interpretation
    });
  } catch (error) {
    console.error('[GPTLabAPI] Panel interpretation error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Interpretation failed' 
    });
  }
});

/**
 * Pre-visit lab planning
 */
const planPreVisitLabsSchema = z.object({
  patientId: z.number(),
  appointmentType: z.string(),
  daysBefore: z.number(),
});

gptLabAPIRoutes.post('/plan-previsit-labs', async (req, res) => {
  try {
    const { patientId, appointmentType, daysBefore } = planPreVisitLabsSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient.length || patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Planning pre-visit labs for ${appointmentType} appointment`);
    
    const plan = await gptLabIntelligence.planPreVisitLabs(patientId, appointmentType, daysBefore);
    
    res.json({
      success: true,
      ...plan
    });
  } catch (error) {
    console.error('[GPTLabAPI] Pre-visit planning error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Planning failed' 
    });
  }
});

/**
 * Suggest follow-up tests based on current results
 */
const suggestFollowUpSchema = z.object({
  labResults: z.array(z.object({
    testName: z.string(),
    value: z.number(),
    units: z.string(),
    abnormalFlag: z.string().optional(),
  })),
});

gptLabAPIRoutes.post('/suggest-followup-tests', async (req, res) => {
  try {
    const { labResults } = suggestFollowUpSchema.parse(req.body);
    
    console.log(`[GPTLabAPI] Suggesting follow-up tests for ${labResults.length} results`);
    
    const suggestions = await gptInterfaceEngine.suggestFollowUpTests(labResults);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('[GPTLabAPI] Follow-up suggestion error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Suggestion failed' 
    });
  }
});

/**
 * Generate clinical narrative for lab results
 */
const generateNarrativeSchema = z.object({
  labResults: z.array(z.object({
    testName: z.string(),
    value: z.number(),
    units: z.string(),
    referenceRange: z.string(),
    abnormalFlag: z.string().optional(),
  })),
});

gptLabAPIRoutes.post('/generate-narrative', async (req, res) => {
  try {
    const { labResults } = generateNarrativeSchema.parse(req.body);
    
    console.log(`[GPTLabAPI] Generating clinical narrative for ${labResults.length} results`);
    
    const narrative = await gptInterfaceEngine.generateClinicalNarrative(labResults);
    
    res.json({
      success: true,
      narrative
    });
  } catch (error) {
    console.error('[GPTLabAPI] Narrative generation error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Generation failed' 
    });
  }
});

/**
 * Reconcile lab test naming across different labs
 */
const reconcileNamingSchema = z.object({
  testName: z.string(),
  sourceLabId: z.number(),
});

gptLabAPIRoutes.post('/reconcile-naming', async (req, res) => {
  try {
    const { testName, sourceLabId } = reconcileNamingSchema.parse(req.body);
    
    console.log(`[GPTLabAPI] Reconciling test name "${testName}" from lab ${sourceLabId}`);
    
    const standardizedName = await gptInterfaceEngine.reconcileLabNaming(testName, sourceLabId);
    
    res.json({
      success: true,
      originalName: testName,
      standardizedName,
      sourceLabId
    });
  } catch (error) {
    console.error('[GPTLabAPI] Naming reconciliation error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Reconciliation failed' 
    });
  }
});

/**
 * Detect critical patterns across multiple lab results
 */
const detectPatternsSchema = z.object({
  patientId: z.number(),
});

gptLabAPIRoutes.post('/detect-critical-patterns', async (req, res) => {
  try {
    const { patientId } = detectPatternsSchema.parse(req.body);
    
    // Verify patient access
    const patient = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patient.length || patient[0].healthSystemId !== req.user?.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[GPTLabAPI] Detecting critical patterns for patient ${patientId}`);
    
    const patterns = await gptInterfaceEngine.detectCriticalPatterns(patientId);
    
    res.json({
      success: true,
      ...patterns
    });
  } catch (error) {
    console.error('[GPTLabAPI] Pattern detection error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Detection failed' 
    });
  }
});