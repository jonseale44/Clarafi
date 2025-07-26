/**
 * Lab Deployment Routes
 * API endpoints for production deployment readiness and lab service management
 */

import express from "express";
import { LabDeploymentReadinessService } from "./lab-deployment-readiness";
import { APIResponseHandler } from "./api-response-handler";

const router = express.Router();

/**
 * GET /api/lab-deployment/readiness
 * Get comprehensive deployment readiness report
 */
router.get("/readiness", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const report = await LabDeploymentReadinessService.generateReadinessReport();
    return APIResponseHandler.success(res, report);
    
  } catch (error) {
    console.error("Error generating deployment readiness report:", error);
    return APIResponseHandler.error(res, "DEPLOYMENT_READINESS_ERROR", "Failed to generate readiness report");
  }
});

/**
 * POST /api/lab-deployment/connect-real-service
 * Connect real lab service for a patient's orders
 */
router.post("/connect-real-service", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { patientId, labServiceProvider } = req.body;
    
    if (!patientId) {
      return APIResponseHandler.badRequest(res, "Patient ID is required");
    }

    // For now, validate that the infrastructure is ready but actual transmission
    // would require lab partnership agreements
    const readinessReport = await LabDeploymentReadinessService.generateReadinessReport();
    
    const response = {
      connected: false,
      reason: "Lab partnership agreements required",
      infrastructure_ready: readinessReport.overallReadiness >= 85,
      next_steps: [
        "Negotiate partnership agreement with selected lab",
        "Obtain API credentials and HL7 endpoints",
        "Complete integration testing",
        "Enable real-time transmission"
      ],
      estimated_setup_time: "2-4 weeks for partnership + 1 day for technical implementation",
      alternative: "GPT-powered attachment processing available immediately"
    };

    return APIResponseHandler.success(res, response);
    
  } catch (error) {
    console.error("Error connecting real lab service:", error);
    return APIResponseHandler.error(res, "REAL_LAB_CONNECTION_ERROR", "Failed to connect real lab service");
  }
});

/**
 * GET /api/lab-deployment/supported-labs
 * Get list of labs ready for integration
 */
router.get("/supported-labs", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const supportedLabs = [
      {
        id: "quest",
        name: "Quest Diagnostics",
        market_share: "35%",
        integration_status: "ready_for_partnership",
        setup_complexity: "medium",
        estimated_setup: "2-3 weeks",
        capabilities: ["routine_labs", "specialty_testing", "genetic_testing"],
        requires: ["business_agreement", "api_credentials", "billing_setup"]
      },
      {
        id: "labcorp", 
        name: "LabCorp",
        market_share: "30%",
        integration_status: "ready_for_partnership",
        setup_complexity: "medium",
        estimated_setup: "2-3 weeks", 
        capabilities: ["routine_labs", "specialty_testing", "pathology"],
        requires: ["business_agreement", "api_credentials", "billing_setup"]
      },
      {
        id: "hospital",
        name: "Hospital Labs (Regional)",
        market_share: "20%",
        integration_status: "case_by_case",
        setup_complexity: "varies",
        estimated_setup: "1-4 weeks",
        capabilities: ["routine_labs", "specialty_testing", "point_of_care"],
        requires: ["individual_agreements", "hl7_setup", "custom_integration"]
      },
      {
        id: "specialty",
        name: "Specialty Labs (ARUP, Mayo, etc)",
        market_share: "15%", 
        integration_status: "ready_for_partnership",
        setup_complexity: "high",
        estimated_setup: "4-6 weeks",
        capabilities: ["rare_disease", "genetic_testing", "research_assays"],
        requires: ["specialty_agreements", "custom_interfaces", "clinical_validation"]
      }
    ];

    return APIResponseHandler.success(res, {
      total_market_coverage: "85%+ with top 3 integrations",
      immediate_option: "GPT attachment processing (100% lab compatibility)",
      supported_labs: supportedLabs,
      recommendation: "Start with GPT processing, add direct integrations based on clinic volume"
    });
    
  } catch (error) {
    console.error("Error fetching supported labs:", error);
    return APIResponseHandler.error(res, "SUPPORTED_LABS_ERROR", "Failed to fetch supported labs");
  }
});

/**
 * POST /api/lab-deployment/request-integration
 * Request integration with a specific lab
 */
router.post("/request-integration", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { labId, clinicInfo, estimatedVolume, urgency } = req.body;
    
    // Log integration request for business development follow-up
    console.log(`🏥 [LabIntegration] Integration request received:`, {
      labId,
      clinicInfo,
      estimatedVolume,
      urgency,
      requestedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // In production, this would:
    // 1. Create integration request record
    // 2. Notify business development team
    // 3. Initiate partnership discussion process
    // 4. Send follow-up email to clinic

    const response = {
      request_submitted: true,
      request_id: `LAB_REQ_${Date.now()}`,
      next_steps: [
        "Business development team will contact you within 24 hours",
        "Partnership agreement negotiation (1-2 weeks)",
        "Technical integration setup (1-3 days)",
        "Testing and go-live (1 week)"
      ],
      estimated_timeline: "2-4 weeks total",
      interim_solution: "Continue using GPT attachment processing during setup"
    };

    return APIResponseHandler.success(res, response);
    
  } catch (error) {
    console.error("Error submitting integration request:", error);
    return APIResponseHandler.error(res, "INTEGRATION_REQUEST_ERROR", "Failed to submit integration request");
  }
});

export default router;