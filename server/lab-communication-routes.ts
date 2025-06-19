/**
 * Lab Communication Routes - Phase 2: GPT Message Generation
 * 
 * API endpoints for AI-powered patient communication workflows
 */

import { Router, Request, Response } from 'express';
import { APIResponseHandler } from './api-response-handler';
import { LabCommunicationService, MessageGenerationRequest } from './lab-communication-service';

const router = Router();

/**
 * POST /api/lab-communication/generate-message
 * Generate AI-powered message for lab results
 */
router.post("/generate-message", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const request: MessageGenerationRequest = req.body;
    
    if (!request.patientId || !request.encounterId || !request.resultIds?.length) {
      return APIResponseHandler.badRequest(res, "Patient ID, encounter ID, and result IDs are required");
    }

    const message = await LabCommunicationService.generateLabMessage(request);

    return APIResponseHandler.success(res, {
      message,
      generatedAt: new Date().toISOString(),
      requiresApproval: message.status === 'pending_approval'
    });
  } catch (error) {
    console.error("Error generating lab message:", error);
    return APIResponseHandler.error(res, error as Error, 500, "MESSAGE_GENERATION_ERROR");
  }
});

/**
 * POST /api/lab-communication/generate-encounter-messages/:encounterId
 * Generate messages for all patients with results in an encounter
 */
router.post("/generate-encounter-messages/:encounterId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const encounterId = parseInt(req.params.encounterId);
    if (!encounterId) {
      return APIResponseHandler.badRequest(res, "Valid encounter ID is required");
    }

    const messages = await LabCommunicationService.processBatchMessagesByEncounter(encounterId);

    return APIResponseHandler.success(res, {
      messages,
      totalGenerated: messages.length,
      pendingApproval: messages.filter(m => m.status === 'pending_approval').length,
      readyToSend: messages.filter(m => m.status === 'approved').length
    });
  } catch (error) {
    console.error("Error generating encounter messages:", error);
    return APIResponseHandler.error(res, error as Error, 500, "BATCH_MESSAGE_ERROR");
  }
});

/**
 * POST /api/lab-communication/approve-message/:messageId
 * Approve a message for sending
 */
router.post("/approve-message/:messageId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const messageId = parseInt(req.params.messageId);
    const providerId = req.user.id;

    if (!messageId) {
      return APIResponseHandler.badRequest(res, "Valid message ID is required");
    }

    const approved = await LabCommunicationService.approveMessage(messageId, providerId);

    if (approved) {
      return APIResponseHandler.success(res, {
        messageId,
        approvedBy: providerId,
        approvedAt: new Date().toISOString(),
        status: 'approved'
      });
    } else {
      return APIResponseHandler.error(res, "Failed to approve message", 500, "APPROVAL_ERROR");
    }
  } catch (error) {
    console.error("Error approving message:", error);
    return APIResponseHandler.error(res, error as Error, 500, "APPROVAL_ERROR");
  }
});

/**
 * POST /api/lab-communication/send-message/:messageId
 * Send an approved message
 */
router.post("/send-message/:messageId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const messageId = parseInt(req.params.messageId);

    if (!messageId) {
      return APIResponseHandler.badRequest(res, "Valid message ID is required");
    }

    const sent = await LabCommunicationService.sendMessage(messageId);

    if (sent) {
      return APIResponseHandler.success(res, {
        messageId,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
    } else {
      return APIResponseHandler.error(res, "Failed to send message", 500, "SEND_ERROR");
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return APIResponseHandler.error(res, error as Error, 500, "SEND_ERROR");
  }
});

/**
 * GET /api/lab-communication/preview/:patientId/:encounterId
 * Preview what message would be generated without creating it
 */
router.get("/preview/:patientId/:encounterId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const patientId = parseInt(req.params.patientId);
    const encounterId = parseInt(req.params.encounterId);
    const resultIds = req.query.resultIds as string;

    if (!patientId || !encounterId || !resultIds) {
      return APIResponseHandler.badRequest(res, "Patient ID, encounter ID, and result IDs are required");
    }

    const resultIdArray = resultIds.split(',').map(id => parseInt(id.trim()));

    // Generate preview without saving
    const previewMessage = await LabCommunicationService.generateLabMessage({
      patientId,
      encounterId,
      resultIds: resultIdArray
    });

    return APIResponseHandler.success(res, {
      preview: {
        content: previewMessage.content,
        messageType: previewMessage.messageType,
        urgencyLevel: previewMessage.urgencyLevel,
        recommendedChannel: previewMessage.channel,
        requiresApproval: previewMessage.status === 'pending_approval'
      },
      resultCount: resultIdArray.length
    });
  } catch (error) {
    console.error("Error generating message preview:", error);
    return APIResponseHandler.error(res, error as Error, 500, "PREVIEW_ERROR");
  }
});

/**
 * GET /api/lab-communication/pending-approval
 * Get messages pending provider approval
 */
router.get("/pending-approval", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    // In production, this would query a lab_messages table
    const pendingMessages = [
      {
        id: 1,
        patientName: "John Doe",
        messageType: "critical_results",
        urgencyLevel: "critical",
        generatedAt: new Date().toISOString(),
        previewText: "Your recent lab results require immediate attention..."
      }
    ];

    return APIResponseHandler.success(res, {
      pendingMessages,
      totalPending: pendingMessages.length
    });
  } catch (error) {
    console.error("Error fetching pending messages:", error);
    return APIResponseHandler.error(res, error as Error, 500, "FETCH_ERROR");
  }
});

/**
 * POST /api/lab-communication/bulk-approve
 * Approve multiple messages at once
 */
router.post("/bulk-approve", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return APIResponseHandler.unauthorized(res);
    }

    const { messageIds } = req.body;
    const providerId = req.user.id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return APIResponseHandler.badRequest(res, "Message IDs array is required");
    }

    const approvalResults = await Promise.all(
      messageIds.map(async (id: number) => {
        try {
          const approved = await LabCommunicationService.approveMessage(id, providerId);
          return { messageId: id, success: approved };
        } catch (error) {
          return { messageId: id, success: false, error: (error as Error).message };
        }
      })
    );

    const successful = approvalResults.filter(r => r.success).length;
    const failed = approvalResults.filter(r => !r.success).length;

    return APIResponseHandler.success(res, {
      approvalResults,
      summary: {
        total: messageIds.length,
        successful,
        failed
      },
      approvedBy: providerId,
      approvedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error bulk approving messages:", error);
    return APIResponseHandler.error(res, error as Error, 500, "BULK_APPROVAL_ERROR");
  }
});

export default router;