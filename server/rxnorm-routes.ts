/**
 * RxNorm API Routes
 * Production medication search and validation endpoints
 */

import { Router, Request, Response } from "express";
import { RxNormService } from "./rxnorm-service.js";
import { storage } from "./storage.js";

export function createRxNormRoutes(): Router {
  const router = Router();

  /**
   * Search medications using RxNorm
   * GET /api/rxnorm/search?q=lisinopril
   */
  router.get("/search", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      console.log(`🔍 [RxNorm] Searching for medications: "${query}"`);
      
      const results = await RxNormService.searchMedications(query);
      
      // Format results for frontend autocomplete
      const formattedResults = results.map(med => ({
        rxcui: med.rxcui,
        name: med.name,
        displayName: med.brandName ? `${med.name} (${med.brandName})` : med.name,
        genericName: med.genericName,
        strength: med.strength,
        dosageForm: med.dosageForm,
        route: med.route,
        score: med.score
      }));

      console.log(`✅ [RxNorm] Found ${formattedResults.length} medications`);
      res.json({ results: formattedResults });

    } catch (error) {
      console.error("❌ [RxNorm] Search error:", error);
      res.status(500).json({ error: "Failed to search medications" });
    }
  });

  /**
   * Get medication details by RxCUI
   * GET /api/rxnorm/drug/:rxcui
   */
  router.get("/drug/:rxcui", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      const { rxcui } = req.params;
      
      console.log(`🔍 [RxNorm] Getting drug info for RxCUI: ${rxcui}`);
      
      const drugInfo = await RxNormService.getDrugInfo(rxcui);
      
      if (!drugInfo) {
        return res.status(404).json({ error: "Drug not found" });
      }

      res.json(drugInfo);

    } catch (error) {
      console.error("❌ [RxNorm] Drug info error:", error);
      res.status(500).json({ error: "Failed to get drug information" });
    }
  });

  /**
   * Validate medication name
   * POST /api/rxnorm/validate
   */
  router.post("/validate", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      const { medicationName } = req.body;
      
      if (!medicationName) {
        return res.status(400).json({ error: "Medication name required" });
      }

      console.log(`🔍 [RxNorm] Validating medication: "${medicationName}"`);
      
      const validation = await RxNormService.validateMedication(medicationName);
      
      res.json(validation);

    } catch (error) {
      console.error("❌ [RxNorm] Validation error:", error);
      res.status(500).json({ error: "Failed to validate medication" });
    }
  });

  /**
   * Get NDC codes for pharmacy transmission
   * GET /api/rxnorm/ndc/:rxcui
   */
  router.get("/ndc/:rxcui", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      const { rxcui } = req.params;
      
      console.log(`🔍 [RxNorm] Getting NDC codes for RxCUI: ${rxcui}`);
      
      const ndcCodes = await RxNormService.getNDCCodes(rxcui);
      
      res.json({ 
        rxcui,
        ndcCodes,
        count: ndcCodes.length 
      });

    } catch (error) {
      console.error("❌ [RxNorm] NDC lookup error:", error);
      res.status(500).json({ error: "Failed to get NDC codes" });
    }
  });

  /**
   * Check drug interactions
   * POST /api/rxnorm/interactions
   */
  router.post("/interactions", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      const { rxcuiList } = req.body;
      
      if (!Array.isArray(rxcuiList) || rxcuiList.length < 2) {
        return res.status(400).json({ 
          error: "At least 2 medications required for interaction check" 
        });
      }

      console.log(`🔍 [RxNorm] Checking interactions for ${rxcuiList.length} medications`);
      
      const interactions = await RxNormService.checkInteractions(rxcuiList);
      
      res.json(interactions);

    } catch (error) {
      console.error("❌ [RxNorm] Interaction check error:", error);
      res.status(500).json({ error: "Failed to check drug interactions" });
    }
  });

  /**
   * Build/update local medication cache
   * POST /api/rxnorm/cache/build
   */
  router.post("/cache/build", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
      
      // Only allow admin users to trigger cache building
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      console.log("🔨 [RxNorm] Starting cache build process...");
      
      // Run in background to avoid timeout
      RxNormService.buildLocalCache().catch(error => {
        console.error("❌ [RxNorm] Cache build failed:", error);
      });

      res.json({ 
        message: "Cache building started in background",
        estimatedTime: "5-10 minutes" 
      });

    } catch (error) {
      console.error("❌ [RxNorm] Cache build error:", error);
      res.status(500).json({ error: "Failed to start cache building" });
    }
  });

  return router;
}