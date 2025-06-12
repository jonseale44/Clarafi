/**
 * Intelligent Diagnosis Service
 * GPT-powered medical problem autocompletion and standardization
 * Prevents vague diagnoses by providing intelligent suggestions with ICD-10 codes
 */

import OpenAI from "openai";
import { db } from "./db";
import { patients, medicalProblems, encounters, orders } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface DiagnosisSuggestion {
  standardTitle: string;
  icd10Code: string;
  confidence: number;
  reasoning: string;
  severity?: "mild" | "moderate" | "severe";
  complexity?: "simple" | "complex" | "chronic";
  aliases: string[];
}

export interface PatientContext {
  age: number;
  gender: string;
  currentMedications: string[];
  existingProblems: string[];
  recentEncounterNotes: string[];
  labResults?: string[];
  vitalSigns?: any;
}

export class IntelligentDiagnosisService {
  private openai: OpenAI;

  constructor() {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Get intelligent diagnosis suggestions as user types
   * Provides real-time autocompletion with clinical context
   */
  async getIntelligentSuggestions(
    partialInput: string,
    patientId: number,
    limit: number = 5
  ): Promise<DiagnosisSuggestion[]> {
    console.log(`🧠 [IntelligentDx] Getting suggestions for: "${partialInput}" (Patient ${patientId})`);
    
    if (partialInput.length < 2) {
      return [];
    }

    try {
      // Get patient context for intelligent suggestions
      const context = await this.getPatientContext(patientId);
      console.log(`🧠 [IntelligentDx] Patient context: Age ${context.age}, ${context.existingProblems.length} problems, ${context.currentMedications.length} medications`);

      // Generate intelligent suggestions using GPT
      const suggestions = await this.generateDiagnosisSuggestions(partialInput, context, limit);
      console.log(`🧠 [IntelligentDx] Generated ${suggestions.length} suggestions`);

      return suggestions;
    } catch (error) {
      console.error("❌ [IntelligentDx] Error generating suggestions:", error);
      return [];
    }
  }

  /**
   * Standardize and validate diagnosis before saving
   * Ensures complete, accurate diagnosis with proper ICD-10 code
   */
  async standardizeDiagnosis(
    userInput: string,
    patientId: number
  ): Promise<DiagnosisSuggestion> {
    console.log(`🧠 [IntelligentDx] Standardizing diagnosis: "${userInput}" for patient ${patientId}`);

    try {
      const context = await this.getPatientContext(patientId);
      const standardized = await this.generateStandardizedDiagnosis(userInput, context);
      
      console.log(`🧠 [IntelligentDx] Standardized to: "${standardized.standardTitle}" (${standardized.icd10Code})`);
      return standardized;
    } catch (error) {
      console.error("❌ [IntelligentDx] Error standardizing diagnosis:", error);
      throw new Error("Failed to standardize diagnosis");
    }
  }

  /**
   * Get comprehensive patient context for intelligent suggestions
   */
  private async getPatientContext(patientId: number): Promise<PatientContext> {
    const [patient, problems, recentEncounters, currentOrders] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
      db.select().from(medicalProblems).where(eq(medicalProblems.patientId, patientId)),
      db.select().from(encounters).where(eq(encounters.patientId, patientId)).orderBy(encounters.startTime).limit(3),
      db.select().from(orders).where(eq(orders.patientId, patientId)).limit(10)
    ]);

    const patientData = patient[0];
    const age = this.calculateAge(patientData.dateOfBirth);

    // Extract current medications from orders
    const medications = currentOrders
      .filter(order => order.orderType === "medication" && order.orderStatus === "active")
      .map(order => order.medicationName)
      .filter((med): med is string => med !== null);

    // Extract existing problem titles
    const existingProblems = problems.map(p => p.problemTitle);

    // Extract recent clinical notes
    const recentNotes = recentEncounters
      .map(enc => enc.note)
      .filter((note): note is string => note !== null)
      .slice(0, 2); // Last 2 encounters

    return {
      age,
      gender: patientData.gender,
      currentMedications: medications,
      existingProblems,
      recentEncounterNotes: recentNotes
    };
  }

  /**
   * Generate intelligent diagnosis suggestions using GPT
   */
  private async generateDiagnosisSuggestions(
    input: string,
    context: PatientContext,
    limit: number
  ): Promise<DiagnosisSuggestion[]> {
    
    const prompt = `
You are a clinical decision support system helping providers enter accurate medical diagnoses.

PATIENT CONTEXT:
- Age: ${context.age}, Gender: ${context.gender}
- Existing Problems: ${context.existingProblems.join(", ") || "None"}
- Current Medications: ${context.currentMedications.join(", ") || "None"}
- Recent Clinical Notes: ${context.recentEncounterNotes.join(" | ") || "None"}

USER INPUT: "${input}"

TASK: Provide ${limit} intelligent diagnosis suggestions that match the user's input. Consider:
1. Clinical context from patient's age, gender, existing conditions, and medications
2. Standard medical terminology and ICD-10 coding
3. Common differential diagnoses
4. Medication implications (e.g., metformin suggests diabetes)

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "standardTitle": "Type 2 diabetes mellitus without complications",
      "icd10Code": "E11.9",
      "confidence": 0.95,
      "reasoning": "Patient on metformin, age-appropriate for T2DM onset",
      "severity": "moderate",
      "complexity": "chronic",
      "aliases": ["T2DM", "DM2", "Diabetes Type 2", "NIDDM"]
    }
  ]
}

RULES:
1. Use precise, standard medical terminology (not abbreviations like "DM2")
2. Include accurate ICD-10 codes
3. Consider patient context for relevance
4. Provide clinical reasoning
5. List common aliases/abbreviations
6. Assess complexity (simple/complex/chronic) and severity when applicable
7. Confidence should reflect clinical appropriateness given context
8. Do not suggest conditions that contradict existing medications or problems
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const result = JSON.parse(content);
      return result.suggestions || [];
    } catch (error) {
      console.error("❌ [GPT] Error generating diagnosis suggestions:", error);
      return [];
    }
  }

  /**
   * Generate standardized diagnosis from user input
   */
  private async generateStandardizedDiagnosis(
    input: string,
    context: PatientContext
  ): Promise<DiagnosisSuggestion> {
    
    const prompt = `
You are a clinical coding specialist helping standardize a medical diagnosis.

PATIENT CONTEXT:
- Age: ${context.age}, Gender: ${context.gender}
- Existing Problems: ${context.existingProblems.join(", ") || "None"}
- Current Medications: ${context.currentMedications.join(", ") || "None"}

USER INPUT: "${input}"

TASK: Standardize this diagnosis to proper medical terminology with accurate ICD-10 code.

Return ONLY valid JSON in this exact format:
{
  "standardTitle": "Type 2 diabetes mellitus without complications",
  "icd10Code": "E11.9",
  "confidence": 0.95,
  "reasoning": "Standardized from abbreviation 'DM2' to full medical terminology",
  "severity": "moderate",
  "complexity": "chronic",
  "aliases": ["T2DM", "DM2", "Diabetes Type 2", "NIDDM"]
}

RULES:
1. Convert abbreviations to full medical terms
2. Use most appropriate ICD-10 code given available context
3. Consider patient age, gender, medications for specificity
4. Provide clear reasoning for standardization choices
5. Include common aliases that should match this diagnosis
6. Be conservative with specificity - use broader codes if details are unclear
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from GPT");

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error("❌ [GPT] Error standardizing diagnosis:", error);
      throw error;
    }
  }

  /**
   * Calculate patient age from date of birth
   */
  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
}

export const intelligentDiagnosis = new IntelligentDiagnosisService();