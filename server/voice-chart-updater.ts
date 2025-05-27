import { AssistantService } from './assistant-service.js';
import { db } from './db.js';
import { encounters, patients, familyHistory, socialHistory, allergies, vitals, medications, diagnoses } from '@shared/schema.js';
import { eq, desc } from 'drizzle-orm';

export class VoiceChartUpdater {
  private assistantService: AssistantService;
  
  constructor() {
    this.assistantService = new AssistantService();
  }
  
  async processVoiceRecording(
    transcription: string,
    patientId: number,
    encounterId: number,
    userRole: string
  ) {
    console.log('🎤 Processing voice recording for patient', patientId);
    
    // Initialize assistant if needed
    await this.assistantService.initializeAssistant();
    
    // Get current chart data
    const currentChart = await this.getCurrentChartData(patientId);
    
    // Get or create assistant thread
    const threadId = await this.assistantService.getOrCreateThread(patientId);
    
    // Process with AI Assistant
    const aiResponse = await this.assistantService.processVoiceRecording(
      threadId,
      transcription,
      patientId,
      encounterId,
      userRole,
      currentChart
    );
    
    // Apply all updates to database
    await this.applyChartUpdates(aiResponse, patientId, encounterId);
    
    // Update encounter with processed data
    await this.updateEncounter(encounterId, aiResponse, transcription);
    
    console.log('✅ Voice processing complete');
    return aiResponse;
  }
  
  private async getCurrentChartData(patientId: number) {
    const [
      patientData,
      familyHistoryData,
      socialHistoryData,
      allergiesData,
      vitalsData,
      medicationsData,
      diagnosesData
    ] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
      db.select().from(familyHistory).where(eq(familyHistory.patientId, patientId)),
      db.select().from(socialHistory).where(eq(socialHistory.patientId, patientId)),
      db.select().from(allergies).where(eq(allergies.patientId, patientId)),
      db.select().from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.measuredAt)).limit(10),
      db.select().from(medications).where(eq(medications.patientId, patientId)),
      db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId))
    ]);
    
    return {
      patient: patientData[0],
      familyHistory: familyHistoryData,
      socialHistory: socialHistoryData,
      allergies: allergiesData,
      recentVitals: vitalsData,
      currentMedications: medicationsData,
      activeDiagnoses: diagnosesData
    };
  }
  
  private async applyChartUpdates(aiResponse: any, patientId: number, encounterId: number) {
    const { chartUpdates } = aiResponse;
    
    // HISTORICAL UPDATES (can modify existing records)
    if (chartUpdates?.historicalUpdates) {
      await this.updateHistoricalData(chartUpdates.historicalUpdates, patientId, encounterId);
    }
    
    // FACTUAL APPENDS (always create new records)
    if (chartUpdates?.factualAppends) {
      await this.appendFactualData(chartUpdates.factualAppends, patientId, encounterId);
    }
  }
  
  private async updateHistoricalData(updates: any, patientId: number, encounterId: number) {
    // Family History - UPSERT (update or insert)
    if (updates.familyHistory && Array.isArray(updates.familyHistory)) {
      for (const family of updates.familyHistory) {
        await db.insert(familyHistory)
          .values({
            patientId,
            familyMember: family.familyMember,
            medicalHistory: family.medicalHistory,
            lastUpdatedEncounter: encounterId
          })
          .onConflictDoUpdate({
            target: [familyHistory.patientId, familyHistory.familyMember],
            set: {
              medicalHistory: family.medicalHistory,
              lastUpdatedEncounter: encounterId,
              updatedAt: new Date()
            }
          });
      }
    }
    
    // Social History - UPSERT
    if (updates.socialHistory && Array.isArray(updates.socialHistory)) {
      for (const social of updates.socialHistory) {
        await db.insert(socialHistory)
          .values({
            patientId,
            category: social.category,
            currentStatus: social.currentStatus,
            historyNotes: social.historyNotes || '',
            lastUpdatedEncounter: encounterId
          })
          .onConflictDoUpdate({
            target: [socialHistory.patientId, socialHistory.category],
            set: {
              currentStatus: social.currentStatus,
              historyNotes: social.historyNotes || '',
              lastUpdatedEncounter: encounterId,
              updatedAt: new Date()
            }
          });
      }
    }
    
    // Allergies - UPSERT
    if (updates.allergies && Array.isArray(updates.allergies)) {
      for (const allergy of updates.allergies) {
        await db.insert(allergies)
          .values({
            patientId,
            allergen: allergy.allergen,
            reaction: allergy.reaction,
            severity: allergy.severity,
            lastUpdatedEncounter: encounterId
          })
          .onConflictDoUpdate({
            target: [allergies.patientId, allergies.allergen],
            set: {
              reaction: allergy.reaction,
              severity: allergy.severity,
              lastUpdatedEncounter: encounterId,
              updatedAt: new Date()
            }
          });
      }
    }
  }
  
  private async appendFactualData(appends: any, patientId: number, encounterId: number) {
    // Vitals - ALWAYS INSERT NEW RECORDS
    if (appends.vitals && Array.isArray(appends.vitals)) {
      for (const vital of appends.vitals) {
        await db.insert(vitals).values({
          patientId,
          encounterId,
          measuredAt: new Date(vital.measuredAt),
          systolicBp: vital.systolicBp,
          diastolicBp: vital.diastolicBp,
          heartRate: vital.heartRate,
          temperature: vital.temperature,
          weight: vital.weight,
          height: vital.height,
          recordedBy: 'AI Assistant'
        });
      }
    }
    
    // Medications - ALWAYS INSERT NEW RECORDS
    if (appends.medications && Array.isArray(appends.medications)) {
      for (const med of appends.medications) {
        await db.insert(medications).values({
          patientId,
          encounterId,
          medicationName: med.medicationName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          startDate: new Date(med.startDate),
          endDate: med.endDate ? new Date(med.endDate) : null,
          status: med.status || 'active',
          prescriber: 'AI Assistant',
          medicalProblem: med.medicalProblem || ''
        });
      }
    }
    
    // Diagnoses - ALWAYS INSERT NEW RECORDS
    if (appends.diagnoses && Array.isArray(appends.diagnoses)) {
      for (const diagnosis of appends.diagnoses) {
        await db.insert(diagnoses).values({
          patientId,
          encounterId,
          diagnosis: diagnosis.diagnosis,
          icd10Code: diagnosis.icd10Code,
          diagnosisDate: new Date(),
          status: diagnosis.status || 'active',
          notes: diagnosis.notes || ''
        });
      }
    }
  }
  
  private async updateEncounter(encounterId: number, aiResponse: any, transcription: string) {
    const soapNote = aiResponse.soapNote || {};
    
    await db.update(encounters)
      .set({
        subjective: soapNote.subjective || '',
        objective: soapNote.objective || '',
        assessment: soapNote.assessment || '',
        plan: soapNote.plan || '',
        transcription: transcription,
        aiProcessed: true,
        lastUpdated: new Date()
      })
      .where(eq(encounters.id, encounterId));
  }
}