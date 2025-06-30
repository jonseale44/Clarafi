/**
 * Production-Level Billing API Routes
 * 
 * External Billing System Integration Endpoints
 * - Athena-style API design for 2-3 month integration timeline
 * - CPT validation, modifier management, audit trails
 * - Revenue optimization and compliance tracking
 */

import { Express, Request, Response } from "express";
import { EnhancedCPTExtractor } from "./enhanced-cpt-extractor";
import { db } from "./db";
import { 
  encounters, 
  billingSystemIntegrations,
  billingExportQueue,
  cptDatabase,
  cptModifiers 
} from "../shared/schema";
import { eq } from "drizzle-orm";

export function setupBillingRoutes(app: Express) {

  // Enhanced CPT extraction with GPT-4.1 and modifier intelligence
  app.post('/api/billing/extract-cpt', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { soapNote, patientId, encounterId } = req.body;
      const providerId = req.user?.id;

      console.log(`🏥 [Billing API] Enhanced CPT extraction for encounter ${encounterId}`);

      const extractedCodes = await EnhancedCPTExtractor.extractCPTCodes(
        soapNote,
        patientId,
        encounterId,
        providerId
      );

      res.json({
        success: true,
        cptCodes: extractedCodes,
        extractionMethod: 'gpt_enhanced',
        validationStatus: 'database_validated',
        totalEstimatedRevenue: extractedCodes.reduce((sum, code) => sum + code.estimatedRevenueImpact, 0)
      });

    } catch (error) {
      console.error('❌ [Billing API] CPT extraction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract CPT codes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual CPT code update with validation and audit trail
  app.put('/api/billing/cpt-codes/:codeId', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { originalCode, updatedCode, patientId, encounterId, changeReason } = req.body;
      const providerId = req.user?.id;

      console.log(`🔧 [Billing API] Manual CPT update: ${originalCode.code} → ${updatedCode.code}`);

      const validationResult = await EnhancedCPTExtractor.updateCPTCode(
        originalCode,
        updatedCode,
        patientId,
        encounterId,
        providerId,
        changeReason
      );

      if (validationResult.isValid) {
        res.json({
          success: true,
          validatedCode: validationResult.validatedCode,
          revenueImpact: validationResult.revenueCalculation,
          auditTrailCreated: true
        });
      } else {
        res.status(400).json({
          success: false,
          validationIssues: validationResult.validationIssues,
          revenueCalculation: validationResult.revenueCalculation
        });
      }

    } catch (error) {
      console.error('❌ [Billing API] CPT update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update CPT code'
      });
    }
  });

  // CPT database search for autocomplete
  app.get('/api/billing/cpt-database', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { search, category } = req.query;

      const cptCodes = await EnhancedCPTExtractor.getCPTDatabase(
        search as string,
        category as string
      );

      res.json({
        success: true,
        cptCodes,
        totalCount: cptCodes.length
      });

    } catch (error) {
      console.error('❌ [Billing API] CPT database error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch CPT database'
      });
    }
  });

  // Available modifiers for specific CPT code
  app.get('/api/billing/cpt-codes/:cptCode/modifiers', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { cptCode } = req.params;

      const modifiers = await EnhancedCPTExtractor.getAvailableModifiers(cptCode);

      res.json({
        success: true,
        cptCode,
        availableModifiers: modifiers
      });

    } catch (error) {
      console.error('❌ [Billing API] Modifiers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available modifiers'
      });
    }
  });

  // Billing audit trail for encounter
  app.get('/api/billing/encounters/:encounterId/audit-trail', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);

      const auditTrail = await EnhancedCPTExtractor.getAuditTrail(encounterId);

      res.json({
        success: true,
        encounterId,
        auditTrail,
        totalEntries: auditTrail.length,
        totalRevenueImpact: auditTrail.reduce((sum, entry) => sum + entry.revenueImpact, 0)
      });

    } catch (error) {
      console.error('❌ [Billing API] Audit trail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit trail'
      });
    }
  });

  // External billing system integrations management
  app.get('/api/billing/integrations', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const integrations = await db.select().from(billingSystemIntegrations);

      res.json({
        success: true,
        integrations: integrations.map(integration => ({
          ...integration,
          credentials: undefined // Don't expose credentials
        }))
      });

    } catch (error) {
      console.error('❌ [Billing API] Integrations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch integrations'
      });
    }
  });

  // Create new billing system integration
  app.post('/api/billing/integrations', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { 
        systemName, 
        systemType, 
        apiEndpoint, 
        authType, 
        syncDirection, 
        syncFrequency 
      } = req.body;

      const integration = await db.insert(billingSystemIntegrations).values({
        systemName,
        systemType,
        apiEndpoint,
        authType,
        syncDirection,
        syncFrequency,
        createdBy: req.user?.id,
        connectionStatus: 'pending'
      }).returning();

      console.log(`🔗 [Billing API] Created integration: ${systemName}`);

      res.json({
        success: true,
        integration: integration[0]
      });

    } catch (error) {
      console.error('❌ [Billing API] Integration creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create integration'
      });
    }
  });

  // Export encounter to external billing system
  app.post('/api/billing/export/:encounterId', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const encounterId = parseInt(req.params.encounterId);
      const { integrationId, exportFormat, priority } = req.body;

      // Get encounter data
      const encounter = await db.select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);

      if (encounter.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Encounter not found'
        });
      }

      // Queue for export
      const exportEntry = await db.insert(billingExportQueue).values({
        exportType: 'encounter',
        entityId: encounterId,
        patientId: encounter[0].patientId,
        encounterId,
        integrationId,
        exportData: {
          encounter: encounter[0],
          cptCodes: encounter[0].cptCodes,
          diagnoses: encounter[0].draftDiagnoses,
          exportedAt: new Date().toISOString(),
          exportedBy: req.user?.id
        },
        exportFormat,
        priority: priority || 'normal'
      }).returning();

      console.log(`📤 [Billing API] Queued encounter ${encounterId} for export`);

      res.json({
        success: true,
        exportId: exportEntry[0].id,
        status: 'queued',
        estimatedProcessingTime: '2-5 minutes'
      });

    } catch (error) {
      console.error('❌ [Billing API] Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to queue export'
      });
    }
  });

  // Export queue status
  app.get('/api/billing/export-queue', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { status, integrationId } = req.query;

      let query = db.select().from(billingExportQueue);

      if (status) {
        query = query.where(eq(billingExportQueue.status, status as string));
      }

      const queueEntries = await query.orderBy(billingExportQueue.createdAt);

      res.json({
        success: true,
        queueEntries,
        totalCount: queueEntries.length,
        statusCounts: {
          pending: queueEntries.filter(e => e.status === 'pending').length,
          processing: queueEntries.filter(e => e.status === 'processing').length,
          sent: queueEntries.filter(e => e.status === 'sent').length,
          failed: queueEntries.filter(e => e.status === 'failed').length
        }
      });

    } catch (error) {
      console.error('❌ [Billing API] Export queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch export queue'
      });
    }
  });

  // Revenue analytics endpoint
  app.get('/api/billing/analytics/revenue', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { dateFrom, dateTo, patientId } = req.query;

      // This would typically query a revenue analytics table
      // For now, return mock analytics structure for external integration prep
      const analytics = {
        totalRevenue: 45890.50,
        averagePerEncounter: 289.75,
        topCPTCodes: [
          { code: '99214', count: 45, revenue: 9000.00 },
          { code: '99213', count: 32, revenue: 4800.00 },
          { code: '99396', count: 28, revenue: 6440.00 }
        ],
        modifierUsage: [
          { modifier: '-25', count: 12, revenueImpact: 2400.00 },
          { modifier: '-59', count: 8, revenueImpact: 1200.00 }
        ],
        complianceMetrics: {
          validationRate: 98.5,
          auditTrailCoverage: 100.0,
          documentationCompleteness: 94.2
        }
      };

      res.json({
        success: true,
        analytics,
        dateRange: { from: dateFrom, to: dateTo },
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [Billing API] Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate analytics'
      });
    }
  });

  // Development: Seed billing data endpoint
  app.post('/api/billing/seed', async (req: Request, res: Response) => {
    try {
      const { seedBillingData } = await import('./billing-data-seeder');
      await seedBillingData();
      
      res.json({
        success: true,
        message: 'Billing data seeded successfully'
      });
    } catch (error) {
      console.error('❌ [Billing Seeder] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed billing data'
      });
    }
  });

  console.log('🏥 [Billing API] Production billing routes initialized');
}