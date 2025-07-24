/**
 * HL7 API Routes
 * 
 * Endpoints for receiving and processing HL7 messages from external labs
 * Works alongside existing GPT attachment processing
 */

import express from "express";
import { db } from "./db.js";
import { hl7Messages, externalLabs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { HL7ReceiverService } from "./hl7-receiver-service.js";
import { HL7Parser } from "./hl7-parser.js";

const router = express.Router();

/**
 * POST /api/hl7/receive
 * Receive and process HL7 message from external lab
 * 
 * Body format:
 * {
 *   "message": "MSH|^~\\&|SENDINGAPP|SENDINGFAC|RECEIVINGAPP|RECEIVINGFAC|...",
 *   "labId": 1,
 *   "metadata": { ... }
 * }
 */
router.post("/receive", async (req, res) => {
  try {
    const { message, labId, metadata } = req.body;
    
    if (!message || !labId) {
      return res.status(400).json({
        error: "Missing required fields: message and labId"
      });
    }
    
    console.log(`📨 [HL7] Received message from lab ${labId}`);
    
    // Verify external lab exists
    const [lab] = await db.select()
      .from(externalLabs)
      .where(eq(externalLabs.id, labId))
      .limit(1);
    
    if (!lab) {
      return res.status(404).json({
        error: `External lab ${labId} not found`
      });
    }
    
    // Process the HL7 message
    const result = await HL7ReceiverService.processHL7Message(message, labId, metadata);
    
    // Generate ACK response
    const parsedMessage = HL7Parser.parseMessage(message);
    const ackMessage = HL7Parser.generateACK(parsedMessage, result.success, result.message);
    
    // Return appropriate response based on processing result
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        labOrderId: result.labOrderId,
        resultCount: result.resultCount,
        ack: ackMessage
      });
    } else {
      return res.status(422).json({
        success: false,
        message: result.message,
        errors: result.errors,
        ack: ackMessage
      });
    }
    
  } catch (error: any) {
    console.error("❌ [HL7] Error processing message:", error);
    return res.status(500).json({
      error: "Internal server error processing HL7 message",
      details: error.message
    });
  }
});

/**
 * GET /api/hl7/messages
 * Get list of HL7 messages with optional filtering
 */
router.get("/messages", async (req, res) => {
  try {
    const { labId, status, direction, limit = 50 } = req.query;
    
    let query = db.select({
      id: hl7Messages.id,
      externalLabId: hl7Messages.externalLabId,
      messageType: hl7Messages.messageType,
      messageControlId: hl7Messages.messageControlId,
      direction: hl7Messages.direction,
      processedAt: hl7Messages.processedAt,
      processingStatus: hl7Messages.processingStatus,
      processingError: hl7Messages.processingError,
      createdAt: hl7Messages.createdAt
    })
    .from(hl7Messages)
    .orderBy(hl7Messages.createdAt);
    
    // Apply filters
    const conditions = [];
    if (labId) {
      conditions.push(eq(hl7Messages.externalLabId, Number(labId)));
    }
    if (status) {
      conditions.push(eq(hl7Messages.processingStatus, status as string));
    }
    if (direction) {
      conditions.push(eq(hl7Messages.direction, direction as string));
    }
    
    // Execute query with filters
    const messages = conditions.length > 0 
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).limit(Number(limit))
      : await query.limit(Number(limit));
    
    return res.json(messages);
    
  } catch (error: any) {
    console.error("❌ [HL7] Error fetching messages:", error);
    return res.status(500).json({
      error: "Failed to fetch HL7 messages",
      details: error.message
    });
  }
});

/**
 * GET /api/hl7/messages/:id
 * Get full HL7 message details including raw content
 */
router.get("/messages/:id", async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    
    const [message] = await db.select()
      .from(hl7Messages)
      .where(eq(hl7Messages.id, messageId))
      .limit(1);
    
    if (!message) {
      return res.status(404).json({
        error: `HL7 message ${messageId} not found`
      });
    }
    
    return res.json(message);
    
  } catch (error: any) {
    console.error("❌ [HL7] Error fetching message:", error);
    return res.status(500).json({
      error: "Failed to fetch HL7 message",
      details: error.message
    });
  }
});

/**
 * POST /api/hl7/validate
 * Validate an HL7 message without processing it
 */
router.post("/validate", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: "Missing required field: message"
      });
    }
    
    const validation = HL7Parser.validateMessage(message);
    
    return res.json({
      valid: validation.valid,
      errors: validation.errors,
      messageType: validation.valid ? HL7Parser.parseMessage(message).messageType : null
    });
    
  } catch (error: any) {
    console.error("❌ [HL7] Error validating message:", error);
    return res.status(500).json({
      error: "Failed to validate HL7 message",
      details: error.message
    });
  }
});

/**
 * POST /api/hl7/test
 * Test HL7 integration with sample messages
 */
router.post("/test", async (req, res) => {
  try {
    const { testType = "oru" } = req.body;
    
    // Generate sample HL7 message based on test type
    let sampleMessage = "";
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    
    if (testType === "oru") {
      // Sample lab result message
      sampleMessage = [
        `MSH|^~\\&|LAB|LABCORP|CLARAFI|EMR|${timestamp}||ORU^R01|MSG${timestamp}|P|2.5.1`,
        `PID|1||1234567^^^MRN||DOE^JOHN^A||19800101|M`,
        `ORC|RE|123456|LAB123456||CM||||${timestamp}|||PROVIDER123`,
        `OBR|1|123456|LAB123456|83036^HEMOGLOBIN A1C^LN|||${timestamp}|||||||${timestamp}||||||||||F`,
        `OBX|1|NM|83036^HEMOGLOBIN A1C^LN||7.2|%|4.0-6.0|H|||F|||${timestamp}|`,
        `OBX|2|ST|83036^HEMOGLOBIN A1C^LN||See provider notes||||||F|||${timestamp}|`
      ].join('\r\n');
    } else if (testType === "orm") {
      // Sample order status update
      sampleMessage = [
        `MSH|^~\\&|LAB|LABCORP|CLARAFI|EMR|${timestamp}||ORM^O01|MSG${timestamp}|P|2.5.1`,
        `PID|1||1234567^^^MRN||DOE^JOHN^A||19800101|M`,
        `ORC|SC|123456|LAB123456||CM||||${timestamp}|||PROVIDER123`
      ].join('\r\n');
    }
    
    // Process the test message
    const result = await HL7ReceiverService.processHL7Message(sampleMessage, 1, {
      testMode: true,
      testType
    });
    
    return res.json({
      success: true,
      testType,
      sampleMessage,
      processingResult: result
    });
    
  } catch (error: any) {
    console.error("❌ [HL7] Error in test endpoint:", error);
    return res.status(500).json({
      error: "Failed to process test HL7 message",
      details: error.message
    });
  }
});

export default router;