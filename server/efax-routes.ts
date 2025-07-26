import { Router } from 'express';
import { authenticateUser } from './auth.js';
import { efaxService } from './efax-service.js';
import { db } from './db.js';
import { labOrders } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Send lab order via e-fax
 */
router.post('/api/lab-orders/:orderId/send-fax', authenticateUser, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { faxNumber } = req.body;
    const userId = req.user!.id;
    
    if (!faxNumber) {
      return res.status(400).json({ error: 'Fax number is required' });
    }
    
    // Verify order exists and user has access
    const order = await db.query.labOrders.findFirst({
      where: eq(labOrders.id, orderId),
      with: {
        patient: {
          columns: {
            healthSystemId: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    
    if (order.patient.healthSystemId !== req.user!.healthSystemId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Send via e-fax
    console.log(`📠 [EFax] Sending lab order ${orderId} to ${faxNumber}`);
    const result = await efaxService.sendLabOrder(orderId, faxNumber);
    
    if (result.success) {
      console.log(`✅ [EFax] Successfully sent lab order ${orderId}`);
      res.json({ 
        success: true, 
        message: 'Lab order sent via fax',
        faxSid: result.faxSid 
      });
    } else {
      console.error(`❌ [EFax] Failed to send lab order ${orderId}: ${result.error}`);
      res.status(500).json({ 
        error: result.error || 'Failed to send fax' 
      });
    }
  } catch (error) {
    console.error('[EFax] Error in send-fax route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get available fax numbers for a lab
 */
router.get('/api/lab-fax-numbers/:labName', authenticateUser, async (req, res) => {
  try {
    const labName = req.params.labName;
    
    // Common lab fax numbers (would be stored in database in production)
    const labFaxNumbers: Record<string, string> = {
      'LabCorp': '1-800-LAB-CORP',
      'Quest Diagnostics': '1-800-QUEST-LAB',
      'BioReference': '1-800-BIO-REF',
      'Sonora Quest': '1-800-SONORA',
      // Add more as needed
    };
    
    const faxNumber = labFaxNumbers[labName];
    
    if (faxNumber) {
      res.json({ 
        success: true, 
        labName,
        faxNumber 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Fax number not found for this lab' 
      });
    }
  } catch (error) {
    console.error('[EFax] Error getting lab fax number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Webhook endpoint for incoming faxes (called by Twilio)
 */
router.post('/api/webhooks/fax-received', async (req, res) => {
  try {
    console.log('📠 [EFax] Incoming fax webhook received');
    const { FaxSid, MediaUrl, From, To, NumPages } = req.body;
    
    // Process the incoming fax
    const result = await efaxService.processIncomingLabResult(FaxSid, MediaUrl);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('[EFax] Error processing fax webhook:', error);
    res.status(500).send('Error');
  }
});

export default router;