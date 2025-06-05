import { db } from "./db.js";
import { patients, encounters, medications, diagnoses, allergies, medicalHistory } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

/**
 * Patient Chart Service
 * Retrieves comprehensive patient data for clinical decision-making
 */
export class PatientChartService {
  
  /**
   * Gets comprehensive patient chart data for GPT clinical enhancement
   */
  static async getPatientChartData(patientId: number): Promise<{
    activeProblems: any[];
    medicalHistory: any[];
    currentMedications: any[];
    recentDiagnoses: any[];
    allergies: any[];
    demographics: any;
  }> {
    try {
      console.log(`[Chart Service] Fetching chart data for patient ${patientId}`);
      
      // Get patient demographics
      const patient = await db.select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      // Get active problems from patient record
      const activeProblems = Array.isArray(patient[0]?.activeProblems) ? patient[0].activeProblems : [];

      // Get medical history
      const medicalHistoryRecords = await db.select()
        .from(medicalHistory)
        .where(eq(medicalHistory.patientId, patientId))
        .orderBy(desc(medicalHistory.createdAt))
        .limit(10);

      // Get current medications (recent 30 days)
      const currentMedications = await db.select()
        .from(medications)
        .where(eq(medications.patientId, patientId))
        .orderBy(desc(medications.createdAt))
        .limit(10);

      // Get recent diagnoses (last 6 months)
      const recentDiagnoses = await db.select()
        .from(diagnoses)
        .where(eq(diagnoses.patientId, patientId))
        .orderBy(desc(diagnoses.createdAt))
        .limit(10);

      // Get allergies
      const allergyRecords = await db.select()
        .from(allergies)
        .where(eq(allergies.patientId, patientId));

      const chartData = {
        activeProblems: activeProblems,
        medicalHistory: medicalHistoryRecords.map(h => ({
          conditionCategory: h.conditionCategory,
          historyText: h.historyText,
          lastUpdated: h.updatedAt
        })),
        currentMedications: currentMedications.map(m => ({
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.startDate,
          status: m.status,
          medicalProblem: m.medicalProblem
        })),
        recentDiagnoses: recentDiagnoses.map(d => ({
          diagnosis: d.diagnosis,
          icd10Code: d.icd10Code,
          diagnosisDate: d.diagnosisDate,
          status: d.status
        })),
        allergies: allergyRecords.map(a => ({
          allergen: a.allergen,
          reaction: a.reaction,
          severity: a.severity
        })),
        demographics: {
          age: patient[0] ? this.calculateAge(patient[0].dateOfBirth) : null,
          gender: patient[0]?.gender
        }
      };

      console.log(`[Chart Service] Retrieved chart data:`, {
        activeProblems: chartData.activeProblems.length,
        medicalHistory: chartData.medicalHistory.length,
        currentMedications: chartData.currentMedications.length,
        recentDiagnoses: chartData.recentDiagnoses.length,
        allergies: chartData.allergies.length
      });

      return chartData;
    } catch (error) {
      console.error('[Chart Service] Error fetching patient chart data:', error);
      return {
        activeProblems: [],
        medicalHistory: [],
        currentMedications: [],
        recentDiagnoses: [],
        allergies: [],
        demographics: {}
      };
    }
  }

  /**
   * Calculates patient age from date of birth
   */
  private static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}