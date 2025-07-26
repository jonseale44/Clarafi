/**
 * FHIR R4 Lab API Routes
 * 
 * RESTful endpoints for FHIR-compliant lab resources
 * Supports both read and search operations for DiagnosticReport and Observation
 */

import { Router, Request, Response } from "express";
import { FHIRLabResourceBuilder } from "./fhir-lab-resources";
import { UnifiedLabProcessor } from "./unified-lab-processor";
import { APIResponseHandler } from "./api-response-handler";
import { db } from "./db.js";
import { labResults, labOrders } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();

/**
 * GET /api/fhir/Observation/:id
 * Read a specific lab result as FHIR Observation
 */
router.get("/Observation/:id", async (req: Request, res: Response) => {
  try {
    const observationId = req.params.id;
    
    // Extract numeric ID from FHIR ID format (e.g., "lab-result-123" -> 123)
    const match = observationId.match(/lab-result-(\d+)/);
    if (!match) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "not-found",
          details: { text: "Observation not found" }
        }]
      });
    }
    
    const resultId = parseInt(match[1]);
    const observation = await FHIRLabResourceBuilder.buildObservation(resultId);
    
    res.setHeader("Content-Type", "application/fhir+json");
    return res.json(observation);
    
  } catch (error: any) {
    console.error("Error fetching FHIR Observation:", error);
    return res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{
        severity: "error",
        code: "exception",
        details: { text: error.message || "Internal server error" }
      }]
    });
  }
});

/**
 * GET /api/fhir/DiagnosticReport/:id
 * Read a specific lab order as FHIR DiagnosticReport
 */
router.get("/DiagnosticReport/:id", async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id;
    
    // Extract numeric ID from FHIR ID format
    const match = reportId.match(/lab-order-(\d+)/);
    if (!match) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "not-found",
          details: { text: "DiagnosticReport not found" }
        }]
      });
    }
    
    const orderId = parseInt(match[1]);
    const report = await FHIRLabResourceBuilder.buildDiagnosticReport(orderId);
    
    res.setHeader("Content-Type", "application/fhir+json");
    return res.json(report);
    
  } catch (error: any) {
    console.error("Error fetching FHIR DiagnosticReport:", error);
    return res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{
        severity: "error",
        code: "exception",
        details: { text: error.message || "Internal server error" }
      }]
    });
  }
});

/**
 * GET /api/fhir/Observation
 * Search for lab results
 * Supports: patient, code, date, category parameters
 */
router.get("/Observation", async (req: Request, res: Response) => {
  try {
    const { patient, code, date, category, _count = "10" } = req.query;
    
    if (!patient) {
      return res.status(400).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "required",
          details: { text: "Patient parameter is required" }
        }]
      });
    }
    
    // Build query conditions
    const conditions = [eq(labResults.patientId, parseInt(patient as string))];
    
    if (code) {
      conditions.push(eq(labResults.loincCode, code as string));
    }
    
    if (date) {
      // Parse FHIR date search syntax (e.g., "ge2024-01-01", "2024-01-01")
      const dateStr = date as string;
      if (dateStr.startsWith("ge")) {
        const startDate = new Date(dateStr.substring(2));
        conditions.push(gte(labResults.resultAvailableAt, startDate));
      } else if (dateStr.startsWith("le")) {
        const endDate = new Date(dateStr.substring(2));
        conditions.push(lte(labResults.resultAvailableAt, endDate));
      } else {
        // Exact date - search within that day
        const searchDate = new Date(dateStr);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        conditions.push(
          and(
            gte(labResults.resultAvailableAt, searchDate),
            lte(labResults.resultAvailableAt, nextDay)
          )!
        );
      }
    }
    
    // Execute query
    const results = await db
      .select()
      .from(labResults)
      .where(and(...conditions)!)
      .limit(parseInt(_count as string));
    
    // Build bundle
    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: results.length,
      entry: await Promise.all(
        results.map(async (result) => ({
          fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Observation/lab-result-${result.id}`,
          resource: await FHIRLabResourceBuilder.buildObservation(result.id),
          search: { mode: "match" as const }
        }))
      )
    };
    
    res.setHeader("Content-Type", "application/fhir+json");
    return res.json(bundle);
    
  } catch (error: any) {
    console.error("Error searching FHIR Observations:", error);
    return res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{
        severity: "error",
        code: "exception",
        details: { text: error.message || "Internal server error" }
      }]
    });
  }
});

/**
 * POST /api/fhir/Bundle
 * Process a bundle of lab results (for bulk upload)
 */
router.post("/Bundle", async (req: Request, res: Response) => {
  try {
    const bundle = req.body;
    
    if (bundle.resourceType !== "Bundle") {
      return res.status(400).json({
        resourceType: "OperationOutcome",
        issue: [{
          severity: "error",
          code: "invalid",
          details: { text: "Expected Bundle resource" }
        }]
      });
    }
    
    const responseBundle = {
      resourceType: "Bundle",
      type: "transaction-response",
      entry: [] as any[]
    };
    
    // Process each entry in the bundle
    for (const entry of bundle.entry || []) {
      const resource = entry.resource;
      
      if (resource.resourceType === "Observation") {
        // Process as lab result through unified processor
        const processed = await UnifiedLabProcessor.processLabResult('fhir', resource);
        const savedIds = await UnifiedLabProcessor.saveResults(processed);
        
        responseBundle.entry.push({
          response: {
            status: "201 Created",
            location: `/api/fhir/Observation/lab-result-${savedIds[0]}`
          }
        });
      } else {
        responseBundle.entry.push({
          response: {
            status: "422 Unprocessable Entity",
            outcome: {
              resourceType: "OperationOutcome",
              issue: [{
                severity: "error",
                code: "not-supported",
                details: { text: `Resource type ${resource.resourceType} not supported` }
              }]
            }
          }
        });
      }
    }
    
    res.setHeader("Content-Type", "application/fhir+json");
    return res.status(200).json(responseBundle);
    
  } catch (error: any) {
    console.error("Error processing FHIR Bundle:", error);
    return res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{
        severity: "error",
        code: "exception",
        details: { text: error.message || "Internal server error" }
      }]
    });
  }
});

/**
 * GET /api/fhir/metadata
 * Capability statement for the FHIR server
 */
router.get("/metadata", async (req: Request, res: Response) => {
  const capabilityStatement = {
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString(),
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["json"],
    implementation: {
      description: "CLARAFI EMR FHIR Lab API",
      url: `${req.protocol}://${req.get('host')}/api/fhir`
    },
    rest: [{
      mode: "server",
      resource: [
        {
          type: "Observation",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
          interaction: [
            { code: "read" },
            { code: "search-type" }
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient ID" },
            { name: "code", type: "token", documentation: "LOINC code" },
            { name: "date", type: "date", documentation: "Result date" },
            { name: "category", type: "token", documentation: "Category (laboratory)" }
          ]
        },
        {
          type: "DiagnosticReport",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-lab",
          interaction: [
            { code: "read" }
          ]
        }
      ]
    }]
  };
  
  res.setHeader("Content-Type", "application/fhir+json");
  return res.json(capabilityStatement);
});

export default router;