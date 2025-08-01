/**
 * External Lab Mock Service
 * Simulates LabCorp, Quest Diagnostics, and Hospital Lab APIs
 * Provides realistic external lab integration testing
 */

import express, { Request, Response } from 'express';
import { APIResponseHandler } from './api-response-handler.js';

// Mock LabCorp API responses
export class LabCorpMockAPI {
  static createOrderResponse(orderData: any) {
    return {
      success: true,
      labcorp_order_id: `LC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      requisition_number: `REQ_LC_${Date.now()}`,
      status: 'received',
      estimated_completion: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
      collection_instructions: {
        specimen_type: orderData.specimen_type || 'serum',
        fasting_required: orderData.fasting_required || false,
        collection_tubes: this.getCollectionTubes(orderData.test_code),
        special_instructions: this.getSpecialInstructions(orderData.test_code)
      },
      processing_lab: {
        name: 'LabCorp Burlington',
        address: '1447 York Court, Burlington, NC 27215',
        phone: '1-800-LAB-CORP'
      }
    };
  }

  static getStatusUpdate(orderId: string) {
    const statuses = [
      { status: 'received', message: 'Order received at LabCorp facility' },
      { status: 'collected', message: 'Specimen collected and logged' },
      { status: 'in_transit', message: 'Specimen in transit to processing lab' },
      { status: 'processing', message: 'Specimen being analyzed' },
      { status: 'verified', message: 'Results verified by laboratory director' },
      { status: 'complete', message: 'Results available for transmission' }
    ];
    
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  static generateResults(testCode: string) {
    const resultTemplates = {
      'CBC': {
        components: [
          { name: 'White Blood Cell Count', value: '6.8', units: 'K/uL', reference: '4.0-11.0', flag: null },
          { name: 'Red Blood Cell Count', value: '4.5', units: 'M/uL', reference: '4.2-5.4', flag: null },
          { name: 'Hemoglobin', value: '14.2', units: 'g/dL', reference: '12.0-16.0', flag: null },
          { name: 'Hematocrit', value: '42.1', units: '%', reference: '36-46', flag: null },
          { name: 'Platelet Count', value: '285', units: 'K/uL', reference: '150-450', flag: null }
        ]
      },
      'CMP': {
        components: [
          { name: 'Glucose', value: '95', units: 'mg/dL', reference: '70-100', flag: null },
          { name: 'BUN', value: '15', units: 'mg/dL', reference: '7-20', flag: null },
          { name: 'Creatinine', value: '1.0', units: 'mg/dL', reference: '0.6-1.2', flag: null },
          { name: 'Sodium', value: '140', units: 'mEq/L', reference: '136-145', flag: null },
          { name: 'Potassium', value: '4.2', units: 'mEq/L', reference: '3.5-5.1', flag: null }
        ]
      }
    };

    return resultTemplates[testCode as keyof typeof resultTemplates] || { components: [] };
  }

  private static getCollectionTubes(testCode: string): string[] {
    const tubeMap = {
      'CBC': ['Lavender top (EDTA)'],
      'CMP': ['Gold top (SST)', 'Red top (No additive)'],
      'LIPID': ['Gold top (SST) - Fasting required'],
      'TSH': ['Gold top (SST)']
    };
    return tubeMap[testCode as keyof typeof tubeMap] || ['Gold top (SST)'];
  }

  private static getSpecialInstructions(testCode: string): string {
    const instructions = {
      'LIPID': 'Patient must fast for 12 hours prior to collection',
      'CULTURE': 'Collect before antibiotic administration',
      'GLUCOSE': 'Collect at specified time intervals'
    };
    return instructions[testCode as keyof typeof instructions] || 'Standard collection procedures apply';
  }
}

// Mock Quest Diagnostics API responses
export class QuestMockAPI {
  static createOrderResponse(orderData: any) {
    return {
      success: true,
      quest_order_id: `QD${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      accession_number: `ACC_QD_${Date.now()}`,
      order_status: 'accepted',
      expected_results: new Date(Date.now() + (18 * 60 * 60 * 1000)), // 18 hours
      patient_service_center: {
        name: 'Quest Diagnostics - Main Lab',
        address: '400 Hills Street, Elmwood Park, NJ 07407',
        phone: '1-866-MYQUEST'
      },
      tracking_url: `https://myquest.questdiagnostics.com/web/patients/track/${Date.now()}`
    };
  }

  static getStatusUpdate(orderId: string) {
    const updates = [
      { phase: 'order_entry', status: 'complete', timestamp: new Date() },
      { phase: 'collection', status: 'scheduled', timestamp: new Date(Date.now() + 3600000) },
      { phase: 'transport', status: 'pending', timestamp: null },
      { phase: 'analysis', status: 'pending', timestamp: null },
      { phase: 'review', status: 'pending', timestamp: null }
    ];
    
    return { order_id: orderId, workflow_status: updates };
  }
}

// Mock Hospital Lab API responses
export class HospitalLabMockAPI {
  static createOrderResponse(orderData: any) {
    return {
      success: true,
      hospital_order_id: `HB${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      internal_accession: `INT_${Date.now()}`,
      priority_level: orderData.priority || 'routine',
      department: this.getDepartment(orderData.test_code),
      estimated_tat: this.getTurnaroundTime(orderData.test_code),
      contact_info: {
        lab_phone: '555-HOSPITAL',
        emergency_contact: '555-STAT-LAB',
        pathologist_on_call: 'Dr. Smith (ext. 4567)'
      }
    };
  }

  private static getDepartment(testCode: string): string {
    const deptMap = {
      'CULTURE': 'Microbiology',
      'PATHOLOGY': 'Anatomic Pathology',
      'TROP': 'Chemistry - Stat Lab',
      'CBC': 'Hematology'
    };
    return deptMap[testCode as keyof typeof deptMap] || 'Core Laboratory';
  }

  private static getTurnaroundTime(testCode: string): string {
    const tatMap = {
      'CULTURE': '24-48 hours',
      'PATHOLOGY': '3-5 business days',
      'TROP': '30 minutes',
      'STAT': '1 hour'
    };
    return tatMap[testCode as keyof typeof tatMap] || '2-4 hours';
  }
}

// Mock API Router
export function createExternalLabMockRouter() {
  const router = express.Router();

  // LabCorp Mock Endpoints
  router.post('/labcorp/orders', (req: Request, res: Response) => {
    const response = LabCorpMockAPI.createOrderResponse(req.body);
    setTimeout(() => {
      res.json(response);
    }, Math.random() * 2000 + 1000); // 1-3 second delay
  });

  router.get('/labcorp/orders/:orderId/status', (req: Request, res: Response) => {
    const status = LabCorpMockAPI.getStatusUpdate(req.params.orderId);
    res.json(status);
  });

  router.get('/labcorp/orders/:orderId/results', (req: Request, res: Response) => {
    const testCode = req.query.test_code as string;
    const results = LabCorpMockAPI.generateResults(testCode);
    res.json(results);
  });

  // Quest Mock Endpoints
  router.post('/quest/orders', (req: Request, res: Response) => {
    const response = QuestMockAPI.createOrderResponse(req.body);
    setTimeout(() => {
      res.json(response);
    }, Math.random() * 1500 + 500); // 0.5-2 second delay
  });

  router.get('/quest/orders/:orderId/workflow', (req: Request, res: Response) => {
    const workflow = QuestMockAPI.getStatusUpdate(req.params.orderId);
    res.json(workflow);
  });

  // Hospital Lab Mock Endpoints
  router.post('/hospital/orders', (req: Request, res: Response) => {
    const response = HospitalLabMockAPI.createOrderResponse(req.body);
    setTimeout(() => {
      res.json(response);
    }, Math.random() * 3000 + 2000); // 2-5 second delay
  });

  router.get('/hospital/orders/:orderId', (req: Request, res: Response) => {
    res.json({
      order_id: req.params.orderId,
      current_status: 'in_progress',
      last_updated: new Date(),
      next_update_expected: new Date(Date.now() + 3600000)
    });
  });

  // Webhook simulation endpoints
  router.post('/webhook/labcorp-result', (req: Request, res: Response) => {
    console.log('🧪 [LabCorp Webhook] Received result notification:', req.body);
    res.json({ received: true, processed: true });
  });

  router.post('/webhook/quest-status', (req: Request, res: Response) => {
    console.log('🧪 [Quest Webhook] Received status update:', req.body);
    res.json({ acknowledged: true });
  });

  return router;
}

// Export for use in main routes
export const externalLabMockRouter = createExternalLabMockRouter();