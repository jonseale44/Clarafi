/**
 * Intelligent Medication Service
 * GPT-powered medication standardization, organization, and interaction checking
 * Mirrors the medical problems processing architecture for consistency
 */

import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertMedication, Medication } from "@shared/schema";

export interface MedicationStandardization {
  standardizedName: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosageForm: string;
  rxNormCode?: string;
  ndcCode?: string;
  confidence: number;
  reasoning: string;
}

export interface DrugInteraction {
  medicationName: string;
  interactionType: "major" | "moderate" | "minor";
  severity: string;
  mechanism: string;
  clinicalSignificance: string;
  recommendation: string;
}

export interface MedicationGrouping {
  groupName: string;
  groupType: "medical_problem" | "drug_class" | "organ_system";
  medications: string[];
  reasoning: string;
  priority: number;
}

export interface ProcessedMedicationData {
  standardizedMedications: MedicationStandardization[];
  drugInteractions: DrugInteraction[];
  medicationGroupings: MedicationGrouping[];
  problemMappings: any[];
  processingTimeMs: number;
  medicationsAffected: number;
}

export interface PatientMedicationContext {
  currentMedications: Medication[];
  medicalProblems: any[];
  allergies: any[];
  patientAge: number;
  patientWeight?: number;
  renalFunction?: string;
  hepaticFunction?: string;
}

export class IntelligentMedicationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process SOAP note for medications using delta approach
   * Parallels the medical problems processing workflow
   */
  async processMedicationsFromSOAP(
    encounterId: number,
    soapNote: string,
    patientId: number
  ): Promise<ProcessedMedicationData> {
    const startTime = Date.now();
    console.log(`🏥 [IntelligentMedication] Processing medications for encounter ${encounterId}`);

    try {
      // Get patient context for intelligent processing
      const context = await this.getPatientMedicationContext(patientId);
      
      // Extract medications from SOAP note
      const extractedMedications = await this.extractMedicationsFromSOAP(soapNote, context);
      
      // Process in parallel for speed
      const [
        standardizedMedications,
        drugInteractions,
        medicationGroupings,
        problemMappings
      ] = await Promise.all([
        this.standardizeMedications(extractedMedications, context),
        this.analyzeDrugInteractions(extractedMedications, context),
        this.generateMedicationGroupings(extractedMedications, context),
        this.mapMedicationsToProblems(extractedMedications, context)
      ]);

      // Update or create medication records using delta approach
      const updatedCount = await this.updateMedicationRecords(
        patientId,
        encounterId,
        standardizedMedications,
        problemMappings,
        drugInteractions,
        medicationGroupings
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ [IntelligentMedication] Processed ${updatedCount} medications in ${processingTime}ms`);

      return {
        standardizedMedications,
        drugInteractions,
        medicationGroupings,
        problemMappings,
        processingTimeMs: processingTime,
        medicationsAffected: updatedCount
      };

    } catch (error) {
      console.error(`❌ [IntelligentMedication] Processing failed:`, error);
      throw error;
    }
  }

  /**
   * Extract medications mentioned in SOAP note using GPT
   */
  private async extractMedicationsFromSOAP(
    soapNote: string,
    context: PatientMedicationContext
  ): Promise<any[]> {
    const prompt = `
Analyze this SOAP note and extract ALL medication-related information with clinical context.

PATIENT CONTEXT:
- Age: ${context.patientAge}
- Current medications: ${context.currentMedications.map(m => `${m.medicationName} ${m.dosage}`).join(", ") || "None"}
- Medical problems: ${context.medicalProblems.map(p => p.problemTitle).join(", ") || "None"}
- Known allergies: ${context.allergies.map(a => a.allergen).join(", ") || "None"}

SOAP NOTE:
${soapNote}

Extract medications in the following categories:
1. NEW medications being prescribed
2. EXISTING medications being continued
3. EXISTING medications being modified (dose, frequency, etc.)
4. EXISTING medications being discontinued
5. MEDICATIONS mentioned in assessment/history

For each medication, provide:
- Medication name (brand and/or generic)
- Strength/dosage
- Frequency/instructions
- Route of administration
- Clinical indication (what it treats)
- Action required (new, continue, modify, discontinue)
- Related medical problem

Return JSON array of medication objects with these fields.
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.medications || [];
  }

  /**
   * Standardize medications with RxNorm codes and proper formatting
   */
  private async standardizeMedications(
    extractedMedications: any[],
    context: PatientMedicationContext
  ): Promise<MedicationStandardization[]> {
    if (extractedMedications.length === 0) return [];

    const prompt = `
Standardize these medications for EMR integration using pharmaceutical standards:

MEDICATIONS TO STANDARDIZE:
${JSON.stringify(extractedMedications, null, 2)}

PATIENT CONTEXT:
- Age: ${context.patientAge}
- Weight: ${context.patientWeight || "Not available"}
- Renal function: ${context.renalFunction || "Normal assumed"}

For each medication, provide:
1. Standardized medication name (generic preferred)
2. Brand name if commonly used
3. Strength (separate from dosage form)
4. Dosage form (tablet, capsule, liquid, etc.)
5. RxNorm concept ID (if known, otherwise null)
6. NDC code (if specific product, otherwise null)
7. Confidence score (0-100)
8. Clinical reasoning for standardization choices

Focus on:
- Use generic names unless brand is medically necessary
- Standardize strengths to common formulations
- Age-appropriate dosing considerations
- Drug-drug interaction potential
- Renal/hepatic dosing adjustments if needed

Return JSON array with standardization objects.
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.standardizedMedications || [];
  }

  /**
   * Analyze drug interactions using GPT clinical knowledge
   */
  private async analyzeDrugInteractions(
    extractedMedications: any[],
    context: PatientMedicationContext
  ): Promise<DrugInteraction[]> {
    const allMedications = [
      ...extractedMedications,
      ...context.currentMedications.map(m => ({
        medicationName: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency
      }))
    ];

    if (allMedications.length < 2) return [];

    const prompt = `
Analyze potential drug-drug interactions for this medication regimen:

COMPLETE MEDICATION LIST:
${JSON.stringify(allMedications, null, 2)}

PATIENT FACTORS:
- Age: ${context.patientAge}
- Renal function: ${context.renalFunction || "Normal"}
- Hepatic function: ${context.hepaticFunction || "Normal"}

Identify clinically significant interactions and provide:
1. Interacting medications
2. Interaction type (major/moderate/minor)
3. Mechanism of interaction
4. Clinical significance
5. Management recommendations
6. Monitoring requirements

Focus on:
- Major interactions requiring immediate attention
- Moderate interactions needing monitoring
- Age-specific interaction risks
- Dose-dependent interactions

Return JSON array of interaction objects.
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.drugInteractions || [];
  }

  /**
   * Generate intelligent medication groupings by medical problem
   */
  private async generateMedicationGroupings(
    extractedMedications: any[],
    context: PatientMedicationContext
  ): Promise<MedicationGrouping[]> {
    const allMedications = [
      ...extractedMedications,
      ...context.currentMedications
    ];

    const prompt = `
Organize these medications into intelligent clinical groupings:

MEDICATIONS:
${JSON.stringify(allMedications, null, 2)}

MEDICAL PROBLEMS:
${JSON.stringify(context.medicalProblems, null, 2)}

Create groupings that help providers understand:
1. Which medications treat which medical problems
2. Related medications that work together (e.g., diabetes regimen)
3. Medications by organ system/therapeutic class
4. Preventive medications vs treatment medications

For each group, provide:
- Group name (medical problem or therapeutic category)
- Group type (medical_problem, drug_class, organ_system)
- List of medications in the group
- Clinical reasoning for grouping
- Priority order (1=highest priority conditions)

Prioritize groupings by:
1. Chronic disease management (diabetes, hypertension, etc.)
2. Acute treatment needs
3. Preventive care
4. Symptomatic treatment

Return JSON array of grouping objects.
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.medicationGroupings || [];
  }

  /**
   * Map medications to specific medical problems
   */
  private async mapMedicationsToProblems(
    extractedMedications: any[],
    context: PatientMedicationContext
  ): Promise<any[]> {
    const prompt = `
Create specific mappings between medications and medical problems:

MEDICATIONS:
${JSON.stringify(extractedMedications, null, 2)}

MEDICAL PROBLEMS:
${JSON.stringify(context.medicalProblems, null, 2)}

For each medication, identify:
1. Primary medical problem it treats
2. Secondary indications if applicable
3. Confidence in the mapping
4. Clinical reasoning

Return JSON array of mapping objects with medicationName, problemId, indication, confidence.
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.problemMappings || [];
  }

  /**
   * Get comprehensive patient context for medication processing
   */
  private async getPatientMedicationContext(patientId: number): Promise<PatientMedicationContext> {
    const [currentMedications, medicalProblems, allergies, patient] = await Promise.all([
      storage.getPatientMedications(patientId),
      storage.getPatientMedicalProblems(patientId),
      storage.getPatientAllergies(patientId),
      storage.getPatient(patientId)
    ]);

    // Calculate age from date of birth
    const patientAge = patient?.dateOfBirth 
      ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
      : 0;

    return {
      currentMedications: currentMedications.filter(m => m.status === 'active'),
      medicalProblems,
      allergies,
      patientAge
    };
  }

  /**
   * Update medication records using delta approach (like medical problems)
   */
  private async updateMedicationRecords(
    patientId: number,
    encounterId: number,
    standardizedMedications: MedicationStandardization[],
    problemMappings: any[],
    drugInteractions: DrugInteraction[],
    medicationGroupings: MedicationGrouping[]
  ): Promise<number> {
    let updatedCount = 0;

    for (const medication of standardizedMedications) {
      try {
        // Find existing medication or create new one
        const existingMedications = await storage.getPatientMedications(patientId);
        const existing = existingMedications.find(m => 
          m.medicationName.toLowerCase() === medication.standardizedName.toLowerCase() &&
          m.status === 'active'
        );

        const problemMapping = problemMappings.find(p => 
          p.medicationName.toLowerCase() === medication.standardizedName.toLowerCase()
        );

        const medicationData: InsertMedication = {
          patientId,
          encounterId,
          medicationName: medication.standardizedName,
          genericName: medication.genericName,
          brandName: medication.brandName || null,
          dosage: medication.strength,
          strength: medication.strength,
          dosageForm: medication.dosageForm,
          route: "oral", // Default, should be extracted from SOAP
          frequency: "daily", // Default, should be extracted from SOAP
          rxNormCode: medication.rxNormCode || null,
          ndcCode: medication.ndcCode || null,
          clinicalIndication: problemMapping?.indication || null,
          problemMappings: problemMapping ? [problemMapping] : [],
          startDate: new Date().toISOString().split('T')[0],
          status: "active",
          firstEncounterId: existing?.firstEncounterId || encounterId,
          lastUpdatedEncounterId: encounterId,
          medicationHistory: existing?.medicationHistory || [],
          changeLog: [
            ...(existing?.changeLog || []),
            {
              timestamp: new Date().toISOString(),
              action: existing ? 'updated' : 'created',
              encounterId,
              changes: medication.reasoning
            }
          ],
          groupingStrategy: "medical_problem",
          relatedMedications: medicationGroupings.filter(g => 
            g.medications.includes(medication.standardizedName)
          ),
          drugInteractions: drugInteractions.filter(i => 
            i.medicationName.toLowerCase() === medication.standardizedName.toLowerCase()
          )
        };

        if (existing) {
          await storage.updateMedication(existing.id, medicationData);
        } else {
          await storage.createMedication(medicationData);
        }

        updatedCount++;
      } catch (error) {
        console.error(`❌ [IntelligentMedication] Failed to process ${medication.standardizedName}:`, error);
      }
    }

    return updatedCount;
  }

  /**
   * Phase 1: Create pending medications from draft orders
   * Shows all medication options immediately after recording stops
   */
  async createPendingMedicationsFromOrders(
    patientId: number,
    encounterId: number
  ): Promise<number> {
    console.log(`🏥 [Phase1] Creating pending medications from draft orders for encounter ${encounterId}`);
    
    try {
      // Get all draft medication orders for this encounter
      const draftOrders = await storage.getDraftOrdersByEncounter(encounterId);
      const medicationOrders = draftOrders.filter(order => order.orderType === 'medication');
      
      if (medicationOrders.length === 0) {
        console.log(`🏥 [Phase1] No medication orders found for encounter ${encounterId}`);
        return 0;
      }

      let createdCount = 0;

      for (const order of medicationOrders) {
        try {
          // Parse order details for medication name
          const medicationName = order.orderDetails?.medicationName || 
                                order.description?.split(' - ')[0] || 
                                order.description;

          const medicationData = {
            patientId,
            encounterId,
            medicationName,
            genericName: order.orderDetails?.genericName || null,
            brandName: order.orderDetails?.brandName || null,
            dosage: order.orderDetails?.dosage || "As directed",
            route: order.orderDetails?.route || "oral",
            frequency: order.orderDetails?.frequency || "daily",
            rxNormCode: order.orderDetails?.rxNormCode || null,
            ndcCode: order.orderDetails?.ndcCode || null,
            clinicalIndication: order.orderDetails?.indication || null,
            startDate: new Date().toISOString().split('T')[0],
            status: "pending", // Key: pending status until order is signed
            firstEncounterId: encounterId,
            lastUpdatedEncounterId: encounterId,
            sourceOrderId: order.id, // Link to the draft order
            medicationHistory: [],
            changeLog: [{
              timestamp: new Date().toISOString(),
              action: 'pending_from_order',
              encounterId,
              orderId: order.id,
              changes: `Pending medication created from draft order: ${order.description}`
            }],
            groupingStrategy: "medical_problem",
            relatedMedications: [],
            drugInteractions: []
          };

          await storage.createMedication(medicationData);
          createdCount++;
          
          console.log(`✅ [Phase1] Created pending medication: ${medicationData.medicationName}`);
        } catch (error) {
          console.error(`❌ [Phase1] Failed to create pending medication for order ${order.id}:`, error);
        }
      }

      console.log(`✅ [Phase1] Created ${createdCount} pending medications`);
      return createdCount;
    } catch (error) {
      console.error(`❌ [Phase1] Error creating pending medications:`, error);
      return 0;
    }
  }

  /**
   * Phase 2: Update medications when orders are signed
   * Finalizes medications based on signed orders and removes alternatives
   */
  async updateMedicationsFromSignedOrder(
    patientId: number,
    signedOrderId: number
  ): Promise<void> {
    console.log(`🏥 [Phase2] Updating medications from signed order ${signedOrderId}`);
    
    try {
      // Get the signed order details
      const signedOrder = await storage.getOrder(signedOrderId);
      if (!signedOrder || signedOrder.orderType !== 'medication') {
        console.log(`🏥 [Phase2] Order ${signedOrderId} is not a medication order`);
        return;
      }

      // Find the pending medication linked to this order
      const allMedications = await storage.getPatientMedications(patientId);
      const pendingMedication = allMedications.find(med => 
        med.sourceOrderId === signedOrderId && med.status === 'pending'
      );
      
      if (!pendingMedication) {
        console.log(`🏥 [Phase2] No pending medication found for order ${signedOrderId}`);
        return;
      }

      // Update the pending medication to active status
      const updatedMedicationData = {
        ...pendingMedication,
        status: "active",
        changeLog: [
          ...pendingMedication.changeLog,
          {
            timestamp: new Date().toISOString(),
            action: 'activated_from_signed_order',
            encounterId: signedOrder.encounterId,
            orderId: signedOrderId,
            changes: `Medication activated from signed order: ${signedOrder.description}`
          }
        ]
      };

      await storage.updateMedication(pendingMedication.id, updatedMedicationData);

      // Remove alternative pending medications for the same medication class
      await this.removeAlternativePendingMedications(
        patientId, 
        pendingMedication.medicationName,
        signedOrderId
      );

      console.log(`✅ [Phase2] Activated medication: ${pendingMedication.medicationName}`);
    } catch (error) {
      console.error(`❌ [Phase2] Error updating medication from signed order:`, error);
    }
  }

  /**
   * Remove alternative pending medications when one is selected
   */
  private async removeAlternativePendingMedications(
    patientId: number,
    activatedMedicationName: string,
    selectedOrderId: number
  ): Promise<void> {
    try {
      // Get all pending medications for this patient with similar names
      const allPendingMedications = await storage.getPatientMedications(patientId);
      const pendingAlternatives = allPendingMedications.filter(med => 
        med.status === 'pending' && 
        med.sourceOrderId !== selectedOrderId &&
        this.isSameMedicationClass(med.medicationName, activatedMedicationName)
      );

      for (const alternative of pendingAlternatives) {
        // Mark as discontinued instead of deleting
        await storage.updateMedication(alternative.id, {
          ...alternative,
          status: "discontinued",
          changeLog: [
            ...alternative.changeLog,
            {
              timestamp: new Date().toISOString(),
              action: 'discontinued_alternative',
              changes: `Alternative option discontinued when ${activatedMedicationName} was selected`
            }
          ]
        });
        
        console.log(`🗑️ [Phase2] Discontinued alternative: ${alternative.medicationName}`);
      }
    } catch (error) {
      console.error(`❌ [Phase2] Error removing alternative medications:`, error);
    }
  }

  /**
   * Check if two medications are the same class (e.g., both Amoxicillin)
   */
  private isSameMedicationClass(med1: string, med2: string): boolean {
    // Extract base medication name (before dosage/strength)
    const baseName1 = med1.toLowerCase().split(/\s+/)[0];
    const baseName2 = med2.toLowerCase().split(/\s+/)[0];
    return baseName1 === baseName2;
  }
}

export const intelligentMedication = new IntelligentMedicationService();