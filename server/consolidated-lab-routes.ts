/**
 * Consolidated Lab Order Routes
 * Direct lab order creation in labOrders table without duplication
 */

import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { labOrders, labResults, patientOrderPreferences } from "@shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";
import { InsertLabOrder } from "@shared/schema";
import { z } from "zod";
import { storage } from "./storage.js";

const router = Router();

// Validation schema for lab order creation
const createLabOrderSchema = z.object({
  patientId: z.number(),
  encounterId: z.number(),
  testName: z.string(),
  testCode: z.string().optional(),
  loincCode: z.string().optional(),
  priority: z.enum(["stat", "urgent", "routine"]).default("routine"),
  clinicalIndication: z.string().optional(),
  specimenType: z.string().optional(),
  fastingRequired: z.boolean().default(false),
  orderStatus: z.enum(["draft", "signed", "transmitted", "completed", "cancelled"]).default("draft"),
  orderedBy: z.number(),
  icd10Codes: z.array(z.string()).optional(),
});

/**
 * POST /api/lab-orders/create
 * Create a lab order directly in labOrders table
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const userId = (req as any).user?.id;
    const validatedData = createLabOrderSchema.parse(req.body);

    // Generate standardized codes if not provided
    const testMapping = await getTestMapping(validatedData.testName);
    
    const labOrderData: InsertLabOrder = {
      patientId: validatedData.patientId,
      encounterId: validatedData.encounterId,
      testName: validatedData.testName,
      testCode: validatedData.testCode || testMapping.testCode,
      loincCode: validatedData.loincCode || testMapping.loincCode,
      cptCode: testMapping.cptCode,
      testCategory: testMapping.category,
      priority: validatedData.priority,
      clinicalIndication: validatedData.clinicalIndication || "Laboratory testing as ordered",
      specimenType: validatedData.specimenType || testMapping.specimenType,
      fastingRequired: validatedData.fastingRequired,
      orderStatus: validatedData.orderStatus,
      orderedBy: validatedData.orderedBy || userId,
      orderedAt: new Date(),
      icd10Codes: validatedData.icd10Codes,
    };

    console.log(`🧪 [ConsolidatedLab] Creating direct lab order for patient ${validatedData.patientId}`);
    
    const [newLabOrder] = await db.insert(labOrders).values(labOrderData).returning();
    
    console.log(`✅ [ConsolidatedLab] Created lab order ${newLabOrder.id} directly in labOrders table`);

    // If order is signed, trigger external lab processing
    if (newLabOrder.orderStatus === "signed") {
      console.log(`🔄 [ConsolidatedLab] Triggering external lab processing for signed order ${newLabOrder.id}`);
      
      // Import dynamically to avoid circular dependencies
      const { labSimulator } = await import("./lab-simulator-service");
      
      setImmediate(async () => {
        try {
          await labSimulator.simulateLabOrderTransmission(newLabOrder.id);
          console.log(`✅ [ConsolidatedLab] Lab simulation started for order ${newLabOrder.id}`);
        } catch (error) {
          console.error(`❌ [ConsolidatedLab] Failed to start lab simulation:`, error);
        }
      });
    }

    return APIResponseHandler.success(res, newLabOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return APIResponseHandler.badRequest(res, "Validation error", error.errors);
    }
    console.error("Error creating lab order:", error);
    return APIResponseHandler.error(res, "CREATE_LAB_ORDER_ERROR", "Failed to create lab order");
  }
});

/**
 * GET /api/lab-orders/patient/:patientId
 * Get all lab orders for a patient (from labOrders table only)
 */
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    
    const patientLabOrders = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));

    // Check for any associated results
    const ordersWithResultCount = await Promise.all(
      patientLabOrders.map(async (order) => {
        const resultCount = await db
          .select({ count: labResults.id })
          .from(labResults)
          .where(eq(labResults.labOrderId, order.id));
        
        return {
          ...order,
          hasResults: resultCount.length > 0,
          resultCount: resultCount.length
        };
      })
    );

    return APIResponseHandler.success(res, ordersWithResultCount);
  } catch (error) {
    console.error("Error fetching patient lab orders:", error);
    return APIResponseHandler.error(res, "FETCH_LAB_ORDERS_ERROR", "Failed to fetch lab orders");
  }
});

/**
 * PUT /api/lab-orders/:orderId/sign
 * Sign a lab order and trigger external processing
 */
router.put("/:orderId/sign", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    const userId = (req as any).user?.id;

    // Update order status to signed
    const [updatedOrder] = await db
      .update(labOrders)
      .set({
        orderStatus: "signed",
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(labOrders.id, orderId),
          eq(labOrders.orderStatus, "draft")
        )
      )
      .returning();

    if (!updatedOrder) {
      return APIResponseHandler.notFound(res, "Lab order not found or already signed");
    }

    // Assign requisition number
    const { LabRequisitionService } = await import("./lab-requisition-service");
    const requisitionNumber = await LabRequisitionService.assignRequisitionNumber(orderId);
    console.log(`📋 [ConsolidatedLab] Assigned requisition number ${requisitionNumber} to order ${orderId}`);

    // Get patient order preferences for delivery method
    const [patientPrefs] = await db
      .select()
      .from(patientOrderPreferences)
      .where(eq(patientOrderPreferences.patientId, updatedOrder.patientId));
    
    const deliveryMethod = patientPrefs?.labDeliveryMethod || 'mock_service';
    console.log(`📤 [ConsolidatedLab] Lab order ${orderId} delivery method: ${deliveryMethod}`);

    // Handle different delivery methods
    switch (deliveryMethod) {
      case 'efax_lab':
        // Production-ready e-fax to external lab
        console.log(`📠 [ConsolidatedLab] Preparing e-fax delivery for order ${orderId}`);
        setImmediate(async () => {
          try {
            const pdfBuffer = await LabRequisitionService.generateRequisitionPDF(orderId);
            const { efaxService } = await import("./efax-service");
            
            // Get external lab fax number from preferences or use default
            const labFaxNumber = patientPrefs?.labServiceProvider || process.env.DEFAULT_LAB_FAX_NUMBER || '+1-555-LAB-RESULTS';
            
            const faxResult = await efaxService.sendLabOrder(orderId, labFaxNumber);
            
            // Update order with transmission details
            await db.update(labOrders)
              .set({
                transmittedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(labOrders.id, orderId));
              
            console.log(`✅ [ConsolidatedLab] E-fax sent successfully for order ${orderId}, SID: ${faxResult.sid}`);
          } catch (error) {
            console.error(`❌ [ConsolidatedLab] Failed to send e-fax:`, error);
            // Update order with error
            // Log error but don't store in non-existent field
            console.error(`❌ [ConsolidatedLab] E-fax transmission error details:`, {
              orderId,
              error: error.message,
              attemptedAt: new Date()
            });
          }
        });
        break;
        
      case 'mock_service':
        // Existing mock service for testing
        console.log(`🔄 [ConsolidatedLab] Triggering mock lab processing for order ${orderId}`);
        const { labSimulator } = await import("./lab-simulator-service");
        setImmediate(async () => {
          try {
            await labSimulator.simulateLabOrderTransmission(orderId);
            console.log(`✅ [ConsolidatedLab] Lab simulation started for signed order ${orderId}`);
          } catch (error) {
            console.error(`❌ [ConsolidatedLab] Failed to start lab simulation:`, error);
          }
        });
        break;
        
      case 'hl7_direct':
        // Future HL7 direct integration
        console.log(`⚠️ [ConsolidatedLab] HL7 direct integration not yet implemented for order ${orderId}`);
        break;
        
      case 'print_pdf':
        // Generate PDF for patient to take to lab
        console.log(`🖨️ [ConsolidatedLab] PDF generation for patient requested for order ${orderId}`);
        // PDF will be generated on-demand when patient/provider downloads it
        break;
        
      default:
        console.warn(`⚠️ [ConsolidatedLab] Unknown delivery method '${deliveryMethod}' for order ${orderId}`);
    }

    return APIResponseHandler.success(res, updatedOrder);
  } catch (error) {
    console.error("Error signing lab order:", error);
    return APIResponseHandler.error(res, "SIGN_LAB_ORDER_ERROR", "Failed to sign lab order");
  }
});

/**
 * DELETE /api/lab-orders/:orderId
 * Cancel a lab order (only if not yet transmitted)
 */
router.delete("/:orderId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const orderId = parseInt(req.params.orderId);
    const userId = (req as any).user?.id;

    // Update order status to cancelled (only if draft or signed)
    const [cancelledOrder] = await db
      .update(labOrders)
      .set({
        orderStatus: "cancelled",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(labOrders.id, orderId),
          isNull(labOrders.transmittedAt) // Can't cancel if already transmitted
        )
      )
      .returning();

    if (!cancelledOrder) {
      return APIResponseHandler.badRequest(res, "Cannot cancel - order already transmitted to lab");
    }

    return APIResponseHandler.success(res, cancelledOrder);
  } catch (error) {
    console.error("Error cancelling lab order:", error);
    return APIResponseHandler.error(res, "CANCEL_LAB_ORDER_ERROR", "Failed to cancel lab order");
  }
});

// Helper function to get test mapping with comprehensive LOINC codes
async function getTestMapping(testName: string) {
  const testMappings: Record<string, any> = {
    // Hematology
    'Complete Blood Count': {
      testCode: 'CBC',
      loincCode: '58410-2',
      cptCode: '85025',
      category: 'hematology',
      specimenType: 'whole_blood',
    },
    'Complete Blood Count with differential': {
      testCode: 'CBCDIFF',
      loincCode: '57021-8',
      cptCode: '85025',
      category: 'hematology',
      specimenType: 'whole_blood',
    },
    
    // Chemistry - Basic Panels
    'Comprehensive Metabolic Panel': {
      testCode: 'CMP',
      loincCode: '24323-8',
      cptCode: '80053',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Basic Metabolic Panel': {
      testCode: 'BMP',
      loincCode: '24320-4',
      cptCode: '80048',
      category: 'chemistry',
      specimenType: 'serum',
    },
    
    // Lipids
    'Lipid Panel': {
      testCode: 'LIPID',
      loincCode: '24331-1',
      cptCode: '80061',
      category: 'chemistry',
      specimenType: 'serum',
    },
    
    // Liver Function
    'Liver Function Panel': {
      testCode: 'LFT',
      loincCode: '24325-3',
      cptCode: '80076',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Lipase': {
      testCode: 'LIPASE',
      loincCode: '3040-3',
      cptCode: '83690',
      category: 'chemistry',
      specimenType: 'serum',
    },
    
    // Endocrinology
    'Thyroid Stimulating Hormone': {
      testCode: 'TSH',
      loincCode: '3016-3',
      cptCode: '84443',
      category: 'endocrinology',
      specimenType: 'serum',
    },
    'Thyroid Stimulating Hormone (TSH)': {
      testCode: 'TSH',
      loincCode: '3016-3',
      cptCode: '84443',
      category: 'endocrinology',
      specimenType: 'serum',
    },
    'Free T4': {
      testCode: 'FT4',
      loincCode: '3024-7',
      cptCode: '84439',
      category: 'endocrinology',
      specimenType: 'serum',
    },
    'Hemoglobin A1c': {
      testCode: 'HBA1C',
      loincCode: '4548-4',
      cptCode: '83036',
      category: 'endocrinology',
      specimenType: 'whole_blood',
    },
    
    // Electrolytes & Minerals
    'Serum Magnesium Level': {
      testCode: 'MG',
      loincCode: '2601-3',
      cptCode: '83735',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Serum Calcium Level': {
      testCode: 'CA',
      loincCode: '17861-6',
      cptCode: '82310',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Serum Phosphorus Level': {
      testCode: 'PHOS',
      loincCode: '2777-1',
      cptCode: '84100',
      category: 'chemistry',
      specimenType: 'serum',
    },
    
    // Cardiac Markers
    'Troponin I': {
      testCode: 'TROP',
      loincCode: '10839-9',
      cptCode: '84484',
      category: 'cardiac',
      specimenType: 'serum',
    },
    'B-type Natriuretic Peptide': {
      testCode: 'BNP',
      loincCode: '30934-4',
      cptCode: '83880',
      category: 'cardiac',
      specimenType: 'plasma',
    },
    
    // Renal Function
    'Creatinine': {
      testCode: 'CREAT',
      loincCode: '2160-0',
      cptCode: '82565',
      category: 'chemistry',
      specimenType: 'serum',
    },
    'Blood Urea Nitrogen': {
      testCode: 'BUN',
      loincCode: '3094-0',
      cptCode: '84520',
      category: 'chemistry',
      specimenType: 'serum',
    },
    
    // Urinalysis
    'Urinalysis': {
      testCode: 'UA',
      loincCode: '24356-8',
      cptCode: '81003',
      category: 'urinalysis',
      specimenType: 'urine',
    },
    'Urine Culture': {
      testCode: 'UCULT',
      loincCode: '630-4',
      cptCode: '87086',
      category: 'microbiology',
      specimenType: 'urine',
    },
    
    // Infectious Disease
    'HIV Screen': {
      testCode: 'HIV',
      loincCode: '75622-1',
      cptCode: '86703',
      category: 'infectious_disease',
      specimenType: 'serum',
    },
    'Hepatitis C Antibody': {
      testCode: 'HEPC',
      loincCode: '16128-1',
      cptCode: '86803',
      category: 'infectious_disease',
      specimenType: 'serum',
    },
    
    // Coagulation
    'Prothrombin Time': {
      testCode: 'PT',
      loincCode: '5902-2',
      cptCode: '85610',
      category: 'coagulation',
      specimenType: 'plasma',
    },
    'INR': {
      testCode: 'INR',
      loincCode: '34714-6',
      cptCode: '85610',
      category: 'coagulation',
      specimenType: 'plasma',
    }
  };
  
  // Check for case-insensitive match
  const normalizedTestName = testName.trim();
  const mapping = testMappings[normalizedTestName] || 
    Object.entries(testMappings).find(([key, _]) => 
      key.toLowerCase() === normalizedTestName.toLowerCase()
    )?.[1];
  
  if (mapping) {
    return mapping;
  }
  
  // Try to find in lab catalog database for unmapped tests
  try {
    const catalogTest = await storage.searchLabTests({ 
      searchTerm: normalizedTestName,
      includeObsolete: false 
    });
    
    if (catalogTest && catalogTest.length > 0) {
      const match = catalogTest[0];
      console.log(`✅ [ConsolidatedLab] Found LOINC mapping in catalog for "${testName}": ${match.loincCode}`);
      return {
        testCode: match.testCode || match.testName.replace(/\s+/g, '_').toUpperCase().substring(0, 10),
        loincCode: match.loincCode,
        cptCode: match.cptCode,
        category: match.category || 'other',
        specimenType: match.specimenType || 'serum',
      };
    }
  } catch (error) {
    console.warn(`⚠️ [ConsolidatedLab] Error searching lab catalog:`, error);
  }
  
  // For unmapped tests, return a structure that clearly indicates LOINC code is needed
  console.warn(`⚠️ [ConsolidatedLab] No LOINC mapping found for test: "${testName}". Provider should specify LOINC code.`);
  
  return {
    testCode: null, // Don't generate fake codes
    loincCode: null, // Require provider to specify
    cptCode: null,
    category: 'other',
    specimenType: 'blood', // Default to most common
  };
}

export default router;