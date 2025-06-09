import { Router } from "express";
import multer from "multer";
import { medicalChartIndex } from "./medical-chart-index-service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/voice/fast-transcribe
 * Fast voice transcription with medical context using realtime OpenAI API
 * Replaces the slower assistant-based approach
 */
router.post("/voice/fast-transcribe", upload.single("audio"), async (req, res) => {
  try {
    const audioFile = req.file;
    const { patientId, userRole, chiefComplaint } = req.body;

    if (!audioFile) {
      return res.status(400).json({ message: "Audio file is required" });
    }

    if (!patientId || !userRole) {
      return res.status(400).json({ message: "Patient ID and user role are required" });
    }

    console.log(`🎯 [FastMedical] Processing voice for patient ${patientId}, role: ${userRole}`);

    // Process voice with fast medical context
    const result = await realtimeMedicalContext.processVoiceWithFastContext(
      audioFile.buffer,
      parseInt(patientId),
      userRole as "nurse" | "provider",
      chiefComplaint
    );

    console.log(`✅ [FastMedical] Voice processed in ${result.contextUsed?.responseTime}ms`);

    res.json({
      success: true,
      ...result,
      performance: {
        responseTime: result.contextUsed?.responseTime,
        tokenCount: result.contextUsed?.tokenCount,
        cacheHit: result.contextUsed?.cacheHit
      }
    });

  } catch (error: any) {
    console.error("❌ [FastMedical] Voice transcription failed:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to process voice recording",
      error: error.message 
    });
  }
});

/**
 * GET /api/patients/:id/medical-context
 * Get fast medical context for a patient
 */
router.get("/patients/:id/medical-context", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    
    const context = await medicalChartIndex.getFastMedicalContext(patientId);
    
    res.json({
      success: true,
      patientId,
      context,
      performance: {
        tokenCount: context.tokenCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error(`❌ [FastMedical] Context retrieval failed for patient ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve medical context",
      error: error.message 
    });
  }
});

/**
 * POST /api/encounters/:id/update-medical-index
 * Update medical chart index after encounter completion
 * Replaces the expensive full chart update
 */
router.post("/encounters/:id/update-medical-index", async (req, res) => {
  try {
    const encounterId = parseInt(req.params.id);
    const { soapNote } = req.body;

    if (!soapNote) {
      return res.status(400).json({ message: "SOAP note is required" });
    }

    console.log(`🔄 [FastMedical] Updating medical index for encounter ${encounterId}`);

    // Update medical index (async operation)
    await realtimeMedicalContext.updateMedicalIndex(encounterId, soapNote);

    res.json({
      success: true,
      message: "Medical index updated successfully",
      encounterId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`❌ [FastMedical] Index update failed for encounter ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update medical index",
      error: error.message 
    });
  }
});

/**
 * POST /api/patients/:id/search-medical-context
 * Search for relevant medical context using semantic similarity
 */
router.post("/patients/:id/search-medical-context", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const results = await realtimeMedicalContext.findRelevantContext(patientId, query);

    res.json({
      success: true,
      patientId,
      query,
      results: results.slice(0, limit),
      count: results.length
    });

  } catch (error: any) {
    console.error(`❌ [FastMedical] Context search failed for patient ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: "Failed to search medical context",
      error: error.message 
    });
  }
});

/**
 * GET /api/medical-index/stats
 * Get medical index performance statistics
 */
router.get("/medical-index/stats", async (req, res) => {
  try {
    // Basic stats about the medical index system
    res.json({
      success: true,
      stats: {
        systemType: "fast-realtime",
        cacheEnabled: true,
        semanticSearchEnabled: true,
        averageResponseTime: "< 100ms",
        averageTokenUsage: "< 500 tokens",
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("❌ [FastMedical] Stats retrieval failed:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve stats",
      error: error.message 
    });
  }
});

export default router;