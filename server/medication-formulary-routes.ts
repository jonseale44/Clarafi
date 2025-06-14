/**
 * Medication Formulary API Routes
 * 
 * Endpoints for accessing the 500-medication formulary database
 * and testing the hybrid medication intelligence system
 */

import { Router, Request, Response } from 'express';
import { APIResponseHandler } from './api-response-handler.js';
import { medicationFormularyService } from './medication-formulary-service.js';
import { db } from './db.js';
import { medicationFormulary } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/formulary/search
 * Search the 500-medication formulary database
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q: query, limit = '10' } = req.query;
    
    if (!query || typeof query !== 'string') {
      return APIResponseHandler.badRequest(res, 'Search query is required');
    }

    const matches = await medicationFormularyService.searchMedications(
      query, 
      parseInt(limit as string, 10)
    );

    return APIResponseHandler.success(res, {
      query,
      matches: matches.length,
      results: matches
    });
  } catch (error) {
    console.error('Formulary search error:', error);
    return APIResponseHandler.error(res, 'SEARCH_ERROR', 'Failed to search formulary');
  }
});

/**
 * GET /api/formulary/medication/:name
 * Get detailed information for a specific medication
 */
router.get('/medication/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    const medication = await medicationFormularyService.getMedicationByGenericName(name);
    
    if (!medication) {
      return APIResponseHandler.notFound(res, 'medication');
    }

    const alerts = medicationFormularyService.getMedicationAlerts(medication);
    
    return APIResponseHandler.success(res, {
      medication,
      alerts,
      smartSigs: {
        '25mg_tablet': medicationFormularyService.generateSmartSig(medication, '25 mg', 'tablet'),
        '50mg_tablet': medicationFormularyService.generateSmartSig(medication, '50 mg', 'tablet')
      }
    });
  } catch (error) {
    console.error('Medication lookup error:', error);
    return APIResponseHandler.error(res, 'LOOKUP_ERROR', 'Failed to lookup medication');
  }
});

/**
 * GET /api/formulary/stats
 * Get formulary database statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await medicationFormularyService.getFormularyStats();
    
    // Add some additional database metrics
    const totalCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(medicationFormulary);
    
    return APIResponseHandler.success(res, {
      ...stats,
      databaseTotal: totalCount[0]?.count || 0,
      coverage: '85-90% of all prescriptions',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Formulary stats error:', error);
    return APIResponseHandler.error(res, 'STATS_ERROR', 'Failed to get formulary statistics');
  }
});

/**
 * GET /api/formulary/popular
 * Get most popular medications from the formulary
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    
    const popular = await db
      .select({
        genericName: medicationFormulary.genericName,
        brandNames: medicationFormulary.brandNames,
        therapeuticClass: medicationFormulary.therapeuticClass,
        popularityRank: medicationFormulary.popularityRank,
        prescriptionVolume: medicationFormulary.prescriptionVolume
      })
      .from(medicationFormulary)
      .where(sql`${medicationFormulary.popularityRank} IS NOT NULL`)
      .orderBy(medicationFormulary.popularityRank)
      .limit(parseInt(limit as string, 10));

    return APIResponseHandler.success(res, {
      popularMedications: popular,
      total: popular.length
    });
  } catch (error) {
    console.error('Popular medications error:', error);
    return APIResponseHandler.error(res, 'POPULAR_ERROR', 'Failed to get popular medications');
  }
});

/**
 * GET /api/formulary/therapeutic-classes
 * Get medications grouped by therapeutic class
 */
router.get('/therapeutic-classes', async (req: Request, res: Response) => {
  try {
    const classes = await db
      .select({
        therapeuticClass: medicationFormulary.therapeuticClass,
        count: sql<number>`COUNT(*)`,
        medications: sql<string[]>`ARRAY_AGG(${medicationFormulary.genericName} ORDER BY ${medicationFormulary.popularityRank} NULLS LAST)`
      })
      .from(medicationFormulary)
      .groupBy(medicationFormulary.therapeuticClass)
      .orderBy(sql<number>`COUNT(*) DESC`);

    const classData = classes.map(cls => ({
      therapeuticClass: cls.therapeuticClass,
      medicationCount: cls.count,
      topMedications: cls.medications.slice(0, 5) // Top 5 per class
    }));

    return APIResponseHandler.success(res, {
      therapeuticClasses: classData,
      totalClasses: classes.length
    });
  } catch (error) {
    console.error('Therapeutic classes error:', error);
    return APIResponseHandler.error(res, 'CLASSES_ERROR', 'Failed to get therapeutic classes');
  }
});

/**
 * POST /api/formulary/test-hybrid
 * Test the hybrid medication intelligence system
 */
router.post('/test-hybrid', async (req: Request, res: Response) => {
  try {
    const { medications } = req.body;
    
    if (!Array.isArray(medications)) {
      return APIResponseHandler.badRequest(res, 'Medications array is required');
    }

    const testResults = [];
    
    for (const medName of medications) {
      const startTime = Date.now();
      
      // Try local formulary first
      const localMatch = await medicationFormularyService.searchMedications(medName, 1);
      const localTime = Date.now() - startTime;
      
      const result = {
        medication: medName,
        localLookupTime: `${localTime}ms`,
        foundInFormulary: localMatch.length > 0,
        matchType: localMatch[0]?.matchType || null,
        confidence: localMatch[0]?.confidence || 0,
        source: localMatch.length > 0 ? 'local_formulary' : 'would_use_ai_fallback'
      };
      
      if (localMatch.length > 0) {
        result.formularyData = {
          genericName: localMatch[0].medication.genericName,
          therapeuticClass: localMatch[0].medication.therapeuticClass,
          strengths: localMatch[0].medication.standardStrengths.length,
          forms: localMatch[0].medication.availableForms.length
        };
      }
      
      testResults.push(result);
    }

    const coverage = testResults.filter(r => r.foundInFormulary).length;
    const averageTime = testResults.reduce((sum, r) => 
      sum + parseInt(r.localLookupTime), 0) / testResults.length;

    return APIResponseHandler.success(res, {
      testResults,
      summary: {
        totalTested: medications.length,
        foundInFormulary: coverage,
        coveragePercentage: (coverage / medications.length * 100).toFixed(1),
        averageLookupTime: `${averageTime.toFixed(1)}ms`,
        hybridStrategy: 'Local formulary first, AI fallback for missing medications'
      }
    });
  } catch (error) {
    console.error('Hybrid test error:', error);
    return APIResponseHandler.error(res, 'TEST_ERROR', 'Failed to test hybrid system');
  }
});

export default router;