import { db } from "./db.js";
import { patients, encounters, medications, allergies, medicalHistory, medicalProblems, vitals, familyHistory, socialHistory, imagingResults } from "../shared/schema.js";
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
    allergies: any[];
    demographics: any;
    medicalProblems: any[];
    vitals: any[];
    familyHistory: any[];
    socialHistory: any[];
    imagingResults: any[];
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



      // Get allergies
      const allergyRecords = await db.select()
        .from(allergies)
        .where(eq(allergies.patientId, patientId));

      // Get medical problems
      const medicalProblemsRecords = await db.select()
        .from(medicalProblems)
        .where(eq(medicalProblems.patientId, patientId))
        .orderBy(desc(medicalProblems.updatedAt));

      // Get recent vitals (last 5 readings)
      const vitalsRecords = await db.select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(5);

      // Get family history
      const familyHistoryRecords = await db.select()
        .from(familyHistory)
        .where(eq(familyHistory.patientId, patientId))
        .orderBy(desc(familyHistory.updatedAt));

      // Get social history
      const socialHistoryRecords = await db.select()
        .from(socialHistory)
        .where(eq(socialHistory.patientId, patientId))
        .orderBy(desc(socialHistory.updatedAt));

      // Get imaging results (recent 10)
      const imagingResultsRecords = await db.select()
        .from(imagingResults)
        .where(eq(imagingResults.patientId, patientId))
        .orderBy(desc(imagingResults.studyDate))
        .limit(10);

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
          status: m.status
        })),

        allergies: allergyRecords.map(a => ({
          allergen: a.allergen,
          reaction: a.reaction,
          severity: a.severity
        })),
        demographics: {
          age: patient[0] ? this.calculateAge(patient[0].dateOfBirth) : null,
          gender: patient[0]?.gender
        },
        medicalProblems: medicalProblemsRecords.map(mp => ({
          id: mp.id,
          problemTitle: mp.problemTitle,
          currentIcd10Code: mp.currentIcd10Code,
          problemStatus: mp.problemStatus,
          firstDiagnosedDate: mp.firstDiagnosedDate,
          visitHistory: mp.visitHistory
        })),
        vitals: vitalsRecords.map(v => ({
          id: v.id,
          recordedAt: v.recordedAt,
          systolic: v.systolicBp,
          diastolic: v.diastolicBp,
          heartRate: v.heartRate,
          temperature: v.temperature,
          respiratoryRate: v.respiratoryRate,
          oxygenSaturation: v.oxygenSaturation,
          weight: v.weight,
          height: v.height,
          bmi: v.bmi,
          painScale: v.painScale
        })),
        familyHistory: familyHistoryRecords.map(fh => ({
          id: fh.id,
          relationship: fh.familyMember,
          condition: fh.medicalHistory,
          sourceType: fh.sourceType
        })),
        socialHistory: socialHistoryRecords.map(sh => ({
          id: sh.id,
          category: sh.category,
          details: sh.currentStatus,
          notes: sh.historyNotes,
          sourceType: sh.sourceType
        })),
        imagingResults: imagingResultsRecords.map(ir => ({
          id: ir.id,
          studyDate: ir.studyDate,
          modality: ir.modality,
          bodyPart: ir.bodyPart,
          clinicalSummary: ir.clinicalSummary,
          findings: ir.findings,
          impression: ir.impression,
          resultStatus: ir.resultStatus,
          radiologistName: ir.radiologistName
        }))
      };

      console.log(`[Chart Service] Retrieved chart data:`, {
        activeProblems: Array.isArray(chartData.activeProblems) ? chartData.activeProblems.length : 0,
        medicalHistory: chartData.medicalHistory.length,
        currentMedications: chartData.currentMedications.length,

        allergies: chartData.allergies.length,
        medicalProblems: chartData.medicalProblems.length,
        vitals: chartData.vitals.length,
        familyHistory: chartData.familyHistory.length,
        socialHistory: chartData.socialHistory.length,
        imagingResults: chartData.imagingResults.length
      });

      return chartData;
    } catch (error) {
      console.error('[Chart Service] Error fetching patient chart data:', error);
      return {
        activeProblems: [],
        medicalHistory: [],
        currentMedications: [],
        allergies: [],
        demographics: {},
        medicalProblems: [],
        vitals: [],
        familyHistory: [],
        socialHistory: [],
        imagingResults: []
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