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
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
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
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
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
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
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
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
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
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
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
}

export const intelligentMedication = new IntelligentMedicationService();