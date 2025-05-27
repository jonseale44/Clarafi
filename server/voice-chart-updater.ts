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
    const startTime = Date.now();
    console.log('🎤 [VoiceChartUpdater] Starting voice recording processing...', {
      patientId,
      encounterId,
      userRole,
      transcriptionLength: transcription.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Initialize assistant if needed
      console.log('🤖 [VoiceChartUpdater] Initializing OpenAI Assistant...');
      await this.assistantService.initializeAssistant();
      
      // Get current chart data
      console.log('📋 [VoiceChartUpdater] Fetching current patient chart data...');
      const currentChart = await this.getCurrentChartData(patientId);
      console.log('📋 [VoiceChartUpdater] Chart data retrieved:', {
        hasPatient: !!currentChart.patient,
        familyHistoryCount: currentChart.familyHistory?.length || 0,
        socialHistoryCount: currentChart.socialHistory?.length || 0,
        allergiesCount: currentChart.allergies?.length || 0,
        vitalsCount: currentChart.recentVitals?.length || 0,
        medicationsCount: currentChart.currentMedications?.length || 0,
        diagnosesCount: currentChart.activeDiagnoses?.length || 0
      });
      
      // Get or create assistant thread
      console.log('🧵 [VoiceChartUpdater] Getting or creating AI thread...');
      const threadId = await this.assistantService.getOrCreateThread(patientId);
      
      // Process with AI Assistant
      console.log('🎯 [VoiceChartUpdater] Starting AI processing...');
      const aiResponse = await this.assistantService.processVoiceRecording(
        threadId,
        transcription,
        patientId,
        encounterId,
        userRole,
        currentChart
      );
      console.log('🎯 [VoiceChartUpdater] AI processing completed');
      
      // Apply all updates to database
      console.log('💾 [VoiceChartUpdater] Applying chart updates to database...');
      await this.applyChartUpdates(aiResponse, patientId, encounterId);
      
      // Update encounter with processed data
      console.log('📝 [VoiceChartUpdater] Updating encounter record...');
      await this.updateEncounter(encounterId, aiResponse, transcription);
      
      const processingTime = Date.now() - startTime;
      console.log('✅ [VoiceChartUpdater] Voice processing completed successfully!', {
        processingTimeMs: processingTime,
        processingTimeSec: (processingTime / 1000).toFixed(2)
      });
      
      return aiResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [VoiceChartUpdater] Voice processing failed:', {
        error: error.message,
        processingTimeMs: processingTime,
        patientId,
        encounterId,
        userRole
      });
      throw error;
    }
  }
  
  private async getCurrentChartData(patientId: number) {
    try {
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
        currentMedications: medicationsData.filter(m => m.status === 'active'),
        activeDiagnoses: diagnosesData.filter(d => d.status === 'active')
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      throw new Error('Failed to fetch patient chart data');
    }
  }
  
  private async applyChartUpdates(aiResponse: any, patientId: number, encounterId: number) {
    console.log('💾 [VoiceChartUpdater] Starting chart updates...', {
      hasChartUpdates: !!aiResponse.chartUpdates,
      hasHistoricalUpdates: !!aiResponse.chartUpdates?.historicalUpdates,
      hasFactualAppends: !!aiResponse.chartUpdates?.factualAppends
    });

    const { chartUpdates } = aiResponse;
    
    if (!chartUpdates) {
      console.log('💾 [VoiceChartUpdater] No chart updates to apply');
      return;
    }
    
    // HISTORICAL UPDATES (can modify existing records)
    if (chartUpdates?.historicalUpdates) {
      console.log('📚 [VoiceChartUpdater] Applying historical updates...');
      await this.updateHistoricalData(chartUpdates.historicalUpdates, patientId, encounterId);
      console.log('📚 [VoiceChartUpdater] ✅ Historical updates completed');
    }
    
    // FACTUAL APPENDS (always create new records)
    if (chartUpdates?.factualAppends) {
      console.log('📊 [VoiceChartUpdater] Applying factual appends...');
      await this.appendFactualData(chartUpdates.factualAppends, patientId, encounterId);
      console.log('📊 [VoiceChartUpdater] ✅ Factual appends completed');
    }
    
    console.log('💾 [VoiceChartUpdater] ✅ All chart updates applied successfully');
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
          patientId: patientId,
          encounterId: encounterId,
          medicationName: med.medicationName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          startDate: med.startDate,
          endDate: med.endDate || null,
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
          patientId: patientId,
          encounterId: encounterId,
          diagnosis: diagnosis.diagnosis,
          icd10Code: diagnosis.icd10Code,
          diagnosisDate: new Date().toISOString().split('T')[0],
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
        transcriptionRaw: transcription,
        aiSuggestions: aiResponse,
        draftOrders: aiResponse.draftOrders || [],
        draftDiagnoses: aiResponse.chartUpdates?.factualAppends?.diagnoses || []
      })
      .where(eq(encounters.id, encounterId));
  }
}