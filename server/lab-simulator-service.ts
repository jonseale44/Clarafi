/**
 * Lab Order Lifecycle Simulator
 * Simulates realistic lab order processing including external lab integration
 * Supports LabCorp, Quest, and hospital lab workflows
 */

import { db } from "./db.js";
import { labOrders, labResults, patients, encounters } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { APIResponseHandler } from "./api-response-handler";

export interface LabSimulatorConfig {
  simulationMode: 'development' | 'staging' | 'production';
  enableRealtimeUpdates: boolean;
  defaultProcessingDelay: number; // minutes
  externalLabEndpoints: {
    labcorp?: string;
    quest?: string;
    hospital?: string;
  };
}

export interface SimulatedLabOrder {
  orderId: number;
  externalOrderId: string;
  targetLab: 'labcorp' | 'quest' | 'hospital' | 'internal';
  processingSteps: LabProcessingStep[];
  estimatedCompletionTime: Date;
  currentStatus: string;
}

export interface LabProcessingStep {
  stepName: string;
  description: string;
  estimatedDuration: number; // minutes
  completed: boolean;
  completedAt?: Date;
  nextStep?: string;
}

export class LabSimulatorService {
  private config: LabSimulatorConfig;
  private activeSimulations: Map<number, SimulatedLabOrder> = new Map();

  constructor(config: LabSimulatorConfig) {
    this.config = config;
  }

  /**
   * Simulate placing a lab order to external lab
   */
  async simulateLabOrderTransmission(orderId: number): Promise<SimulatedLabOrder> {
    const order = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1);
    if (!order.length) {
      throw new Error('Lab order not found');
    }

    const labOrder = order[0];
    const targetLab = this.determineTargetLab(labOrder.testCode);
    const externalOrderId = this.generateExternalOrderId(targetLab);
    
    const processingSteps = this.getProcessingSteps(labOrder.testCode, targetLab);
    const estimatedCompletion = this.calculateEstimatedCompletion(processingSteps);

    const simulation: SimulatedLabOrder = {
      orderId,
      externalOrderId,
      targetLab,
      processingSteps,
      estimatedCompletionTime: estimatedCompletion,
      currentStatus: 'transmitted'
    };

    this.activeSimulations.set(orderId, simulation);

    // Update order status in database
    await db.update(labOrders)
      .set({
        orderStatus: 'transmitted',
        externalOrderId,
        transmittedAt: new Date(),
        hl7MessageId: `HL7_${externalOrderId}`,
        requisitionNumber: `REQ_${externalOrderId}`
      })
      .where(eq(labOrders.id, orderId));

    // Start processing simulation
    this.startProcessingSimulation(orderId);

    return simulation;
  }

  /**
   * Get realistic processing steps based on test type and lab
   */
  private getProcessingSteps(testCode: string, targetLab: string): LabProcessingStep[] {
    const baseSteps: LabProcessingStep[] = [
      {
        stepName: 'order_received',
        description: 'Order received at external lab',
        estimatedDuration: 5,
        completed: false
      },
      {
        stepName: 'specimen_collection',
        description: 'Specimen collection scheduled/completed',
        estimatedDuration: 60,
        completed: false
      },
      {
        stepName: 'specimen_transport',
        description: 'Specimen transported to processing lab',
        estimatedDuration: 240,
        completed: false
      },
      {
        stepName: 'specimen_processing',
        description: 'Specimen processed and analyzed',
        estimatedDuration: this.getProcessingTime(testCode),
        completed: false
      },
      {
        stepName: 'result_verification',
        description: 'Results verified by lab technician',
        estimatedDuration: 30,
        completed: false
      },
      {
        stepName: 'result_transmission',
        description: 'Results transmitted back to EMR',
        estimatedDuration: 15,
        completed: false
      }
    ];

    // Add lab-specific steps
    if (targetLab === 'quest') {
      baseSteps.splice(2, 0, {
        stepName: 'quest_quality_check',
        description: 'Quest Diagnostics quality verification',
        estimatedDuration: 20,
        completed: false
      });
    } else if (targetLab === 'labcorp') {
      baseSteps.splice(2, 0, {
        stepName: 'labcorp_intake',
        description: 'LabCorp specimen intake process',
        estimatedDuration: 15,
        completed: false
      });
    }

    return baseSteps;
  }

  /**
   * Determine target lab based on test code and routing rules
   */
  private determineTargetLab(testCode: string): 'labcorp' | 'quest' | 'hospital' | 'internal' {
    const routingRules = {
      'CBC': 'labcorp',
      'CMP': 'labcorp',
      'BMP': 'quest',
      'TSH': 'quest',
      'HBA1C': 'labcorp',
      'PSA': 'quest',
      'CULTURE': 'hospital',
      'PATHOLOGY': 'hospital'
    };

    return routingRules[testCode as keyof typeof routingRules] || 'internal';
  }

  /**
   * Get realistic processing time based on test complexity
   */
  private getProcessingTime(testCode: string): number {
    const processingTimes = {
      'CBC': 120,        // 2 hours
      'CMP': 180,        // 3 hours
      'BMP': 120,        // 2 hours
      'TSH': 240,        // 4 hours
      'HBA1C': 360,      // 6 hours
      'PSA': 480,        // 8 hours
      'CULTURE': 2880,   // 48 hours
      'PATHOLOGY': 4320  // 72 hours
    };

    return processingTimes[testCode as keyof typeof processingTimes] || 240;
  }

  /**
   * Generate realistic external order ID
   */
  private generateExternalOrderId(targetLab: string): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const prefixes = {
      'labcorp': 'LC',
      'quest': 'QD',
      'hospital': 'HB',
      'internal': 'IN'
    };

    return `${prefixes[targetLab as keyof typeof prefixes]}${timestamp}${random}`;
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(steps: LabProcessingStep[]): Date {
    const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    return new Date(Date.now() + (totalMinutes * 60 * 1000));
  }

  /**
   * Start processing simulation with realistic delays
   */
  private async startProcessingSimulation(orderId: number): Promise<void> {
    const simulation = this.activeSimulations.get(orderId);
    if (!simulation) return;

    let currentDelay = 0;

    for (const step of simulation.processingSteps) {
      setTimeout(async () => {
        await this.completeProcessingStep(orderId, step.stepName);
      }, currentDelay * 60 * 1000); // Convert minutes to milliseconds

      currentDelay += step.estimatedDuration;
    }
  }

  /**
   * Complete a processing step and update status
   */
  private async completeProcessingStep(orderId: number, stepName: string): Promise<void> {
    const simulation = this.activeSimulations.get(orderId);
    if (!simulation) return;

    const step = simulation.processingSteps.find(s => s.stepName === stepName);
    if (!step) return;

    step.completed = true;
    step.completedAt = new Date();

    // Update order status based on completed step
    let newStatus = stepName;
    
    if (stepName === 'order_received') {
      newStatus = 'acknowledged';
      await db.update(labOrders)
        .set({ orderStatus: 'acknowledged', acknowledgedAt: new Date() })
        .where(eq(labOrders.id, orderId));
    } else if (stepName === 'specimen_collection') {
      newStatus = 'collected';
      await db.update(labOrders)
        .set({ orderStatus: 'collected', collectedAt: new Date() })
        .where(eq(labOrders.id, orderId));
    } else if (stepName === 'result_transmission') {
      newStatus = 'completed';
      await this.generateRealisticResults(orderId);
    }

    simulation.currentStatus = newStatus;

    console.log(`🧪 [LabSimulator] Order ${orderId} completed step: ${stepName}`);
  }

  /**
   * Generate realistic lab results when processing is complete
   */
  private async generateRealisticResults(orderId: number): Promise<void> {
    const orderResult = await db.select().from(labOrders).where(eq(labOrders.id, orderId)).limit(1);
    if (!orderResult.length) return;

    const order = orderResult[0];
    const results = this.generateResultsForTest(order.testCode);

    for (const result of results) {
      await db.insert(labResults).values({
        labOrderId: orderId,
        patientId: order.patientId,
        loincCode: result.loincCode,
        testCode: result.testCode,
        testName: result.testName,
        testCategory: order.testCategory || 'chemistry',
        resultValue: result.value,
        resultNumeric: result.numeric,
        resultUnits: result.units,
        referenceRange: result.referenceRange,
        abnormalFlag: result.abnormalFlag,
        criticalFlag: result.criticalFlag,
        resultStatus: 'final',
        verificationStatus: 'verified',
        specimenCollectedAt: order.collectedAt,
        resultAvailableAt: new Date(),
        resultFinalizedAt: new Date(),
        receivedAt: new Date(),
        reviewStatus: 'pending'
      });
    }

    // Update order status
    await db.update(labOrders)
      .set({ 
        orderStatus: 'completed',
        resultAvailableAt: new Date(),
        resultFinalizedAt: new Date()
      })
      .where(eq(labOrders.id, orderId));

    console.log(`🧪 [LabSimulator] Generated ${results.length} results for order ${orderId}`);
  }

  /**
   * Generate realistic test results based on test type
   */
  private generateResultsForTest(testCode: string): any[] {
    const testDefinitions = {
      'CBC': [
        { testCode: 'WBC', testName: 'White Blood Cell Count', loincCode: '26464-8', units: 'K/uL', referenceRange: '4.0-11.0' },
        { testCode: 'RBC', testName: 'Red Blood Cell Count', loincCode: '26453-1', units: 'M/uL', referenceRange: '4.2-5.4' },
        { testCode: 'HGB', testName: 'Hemoglobin', loincCode: '718-7', units: 'g/dL', referenceRange: '12.0-16.0' },
        { testCode: 'HCT', testName: 'Hematocrit', loincCode: '20570-8', units: '%', referenceRange: '36-46' },
        { testCode: 'PLT', testName: 'Platelet Count', loincCode: '26515-7', units: 'K/uL', referenceRange: '150-450' }
      ],
      'CMP': [
        { testCode: 'GLU', testName: 'Glucose', loincCode: '2345-7', units: 'mg/dL', referenceRange: '70-100' },
        { testCode: 'BUN', testName: 'Blood Urea Nitrogen', loincCode: '6299-2', units: 'mg/dL', referenceRange: '7-20' },
        { testCode: 'CR', testName: 'Creatinine', loincCode: '2160-0', units: 'mg/dL', referenceRange: '0.6-1.2' },
        { testCode: 'NA', testName: 'Sodium', loincCode: '2947-0', units: 'mEq/L', referenceRange: '136-145' },
        { testCode: 'K', testName: 'Potassium', loincCode: '2823-3', units: 'mEq/L', referenceRange: '3.5-5.1' },
        { testCode: 'CL', testName: 'Chloride', loincCode: '2075-0', units: 'mEq/L', referenceRange: '98-107' },
        { testCode: 'CO2', testName: 'Carbon Dioxide', loincCode: '2028-9', units: 'mEq/L', referenceRange: '22-29' },
        { testCode: 'ALB', testName: 'Albumin', loincCode: '1751-7', units: 'g/dL', referenceRange: '3.5-5.0' }
      ]
    };

    const testDef = testDefinitions[testCode as keyof typeof testDefinitions] || [];
    
    return testDef.map(test => {
      const { value, numeric, abnormalFlag, criticalFlag } = this.generateRealisticValue(test.referenceRange);
      
      return {
        ...test,
        value,
        numeric,
        abnormalFlag,
        criticalFlag
      };
    });
  }

  /**
   * Generate realistic values within or outside reference ranges
   */
  private generateRealisticValue(referenceRange: string): { value: string, numeric: string, abnormalFlag: string | null, criticalFlag: boolean } {
    const [min, max] = referenceRange.split('-').map(v => parseFloat(v.trim()));
    
    // 80% normal, 15% abnormal, 5% critical
    const rand = Math.random();
    let value: number;
    let abnormalFlag: string | null = null;
    let criticalFlag = false;

    if (rand < 0.80) {
      // Normal range
      value = min + (Math.random() * (max - min));
    } else if (rand < 0.95) {
      // Abnormal but not critical
      if (Math.random() < 0.5) {
        value = min - (Math.random() * min * 0.3); // Below normal
        abnormalFlag = 'L';
      } else {
        value = max + (Math.random() * max * 0.3); // Above normal
        abnormalFlag = 'H';
      }
    } else {
      // Critical values
      if (Math.random() < 0.5) {
        value = min - (Math.random() * min * 0.6); // Critically low
        abnormalFlag = 'LL';
        criticalFlag = true;
      } else {
        value = max + (Math.random() * max * 0.6); // Critically high
        abnormalFlag = 'HH';
        criticalFlag = true;
      }
    }

    const roundedValue = Math.round(value * 100) / 100;
    
    return {
      value: roundedValue.toString(),
      numeric: roundedValue.toString(),
      abnormalFlag,
      criticalFlag
    };
  }

  /**
   * Get simulation status for an order
   */
  getSimulationStatus(orderId: number): SimulatedLabOrder | null {
    return this.activeSimulations.get(orderId) || null;
  }

  /**
   * Get all active simulations
   */
  getAllActiveSimulations(): SimulatedLabOrder[] {
    return Array.from(this.activeSimulations.values());
  }

  /**
   * Cancel a simulation
   */
  cancelSimulation(orderId: number): boolean {
    return this.activeSimulations.delete(orderId);
  }
}

// Export configured instance
export const labSimulator = new LabSimulatorService({
  simulationMode: 'development',
  enableRealtimeUpdates: true,
  defaultProcessingDelay: 5, // 5 minutes for testing
  externalLabEndpoints: {
    labcorp: 'https://api-mock.labcorp.com',
    quest: 'https://api-mock.questdiagnostics.com',
    hospital: 'https://api-mock.hospitallabs.com'
  }
});