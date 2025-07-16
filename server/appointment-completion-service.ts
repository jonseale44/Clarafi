import { db } from '../shared/schema.js';
import { appointments, encounters, appointmentDurationHistory, patientSchedulingPatterns, providerSchedulingPatterns } from '../shared/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';

export class AppointmentCompletionService {
  /**
   * Complete an appointment and record actual duration data
   * This is the core function for tracking historical appointment durations
   */
  static async completeAppointment(appointmentId: number, userId: number) {
    console.log('📊 [APPOINTMENT COMPLETION] Starting completion for appointment:', appointmentId);
    
    try {
      // Get appointment with all necessary data
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .execute();
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      if (appointment.status === 'completed') {
        console.log('📊 [APPOINTMENT COMPLETION] Appointment already completed');
        return { success: true, message: 'Appointment already completed' };
      }
      
      // Get associated encounter if exists
      const [encounter] = await db
        .select()
        .from(encounters)
        .where(eq(encounters.appointmentId, appointmentId))
        .execute();
      
      // Calculate actual duration using multiple data points
      const actualDuration = await this.calculateActualDuration(appointment, encounter);
      
      console.log('📊 [APPOINTMENT COMPLETION] Calculated actual duration:', actualDuration);
      
      // Update appointment status
      const completedAt = new Date();
      await db
        .update(appointments)
        .set({
          status: 'completed',
          completedAt: completedAt,
          completedBy: userId,
          actualDuration: actualDuration
        })
        .where(eq(appointments.id, appointmentId));
      
      // Record duration history for AI learning
      await this.recordDurationHistory(appointment, actualDuration);
      
      // Update patient scheduling patterns
      await this.updatePatientPatterns(appointment.patientId, appointment.appointmentType, actualDuration);
      
      // Update provider scheduling patterns
      await this.updateProviderPatterns(appointment.providerId, appointment.appointmentType, actualDuration);
      
      // Complete the encounter if exists
      if (encounter && encounter.encounterStatus !== 'completed') {
        await db
          .update(encounters)
          .set({
            encounterStatus: 'completed',
            endTime: completedAt
          })
          .where(eq(encounters.id, encounter.id));
      }
      
      return {
        success: true,
        actualDuration,
        message: `Appointment completed. Actual duration: ${actualDuration} minutes`
      };
      
    } catch (error) {
      console.error('❌ [APPOINTMENT COMPLETION] Error:', error);
      throw error;
    }
  }
  
  /**
   * Calculate actual appointment duration using multiple data sources
   */
  private static async calculateActualDuration(appointment: any, encounter: any): Promise<number> {
    const durationSources: { source: string; duration: number; confidence: number }[] = [];
    
    // 1. Check-in to completion time (most reliable)
    if (appointment.checkedInAt) {
      const checkInTime = new Date(appointment.checkedInAt).getTime();
      const completionTime = new Date().getTime();
      const checkInDuration = Math.round((completionTime - checkInTime) / 1000 / 60);
      
      if (checkInDuration > 0 && checkInDuration < 480) { // Max 8 hours
        durationSources.push({
          source: 'check_in_to_completion',
          duration: checkInDuration,
          confidence: 0.95
        });
      }
    }
    
    // 2. Encounter start to end time
    if (encounter && encounter.startTime) {
      const startTime = new Date(encounter.startTime).getTime();
      const endTime = encounter.endTime ? new Date(encounter.endTime).getTime() : new Date().getTime();
      const encounterDuration = Math.round((endTime - startTime) / 1000 / 60);
      
      if (encounterDuration > 0 && encounterDuration < 480) {
        durationSources.push({
          source: 'encounter_time',
          duration: encounterDuration,
          confidence: 0.90
        });
      }
    }
    
    // 3. Recording duration (if voice recording was used)
    if (encounter && encounter.transcriptionRaw) {
      // Extract recording duration from transcription metadata if available
      try {
        const recordingMetadata = encounter.aiSuggestions?.recordingMetadata;
        if (recordingMetadata?.duration) {
          const recordingDuration = Math.round(recordingMetadata.duration / 60);
          
          // Recording is usually shorter than actual appointment
          // Apply multiplier based on appointment type
          const multiplier = this.getRecordingMultiplier(appointment.appointmentType);
          const estimatedDuration = Math.round(recordingDuration * multiplier);
          
          durationSources.push({
            source: 'recording_duration',
            duration: estimatedDuration,
            confidence: 0.70
          });
        }
      } catch (e) {
        console.log('📊 [APPOINTMENT COMPLETION] Could not extract recording duration');
      }
    }
    
    // 4. Activity tracking (time between first and last save)
    if (encounter && encounter.createdAt && encounter.updatedAt) {
      const firstActivity = new Date(encounter.createdAt).getTime();
      const lastActivity = new Date(encounter.updatedAt).getTime();
      const activityDuration = Math.round((lastActivity - firstActivity) / 1000 / 60);
      
      if (activityDuration > 5 && activityDuration < 480) { // At least 5 minutes of activity
        durationSources.push({
          source: 'activity_tracking',
          duration: activityDuration,
          confidence: 0.60
        });
      }
    }
    
    // 5. Scheduled duration as fallback
    if (appointment.providerScheduledDuration) {
      durationSources.push({
        source: 'scheduled_duration',
        duration: appointment.providerScheduledDuration,
        confidence: 0.30
      });
    }
    
    console.log('📊 [APPOINTMENT COMPLETION] Duration sources:', durationSources);
    
    // Calculate weighted average based on confidence
    if (durationSources.length === 0) {
      // Default to scheduled duration or 20 minutes
      return appointment.providerScheduledDuration || 20;
    }
    
    // Use the highest confidence source if available
    const primarySource = durationSources.reduce((max, current) => 
      current.confidence > max.confidence ? current : max
    );
    
    // Blend with other sources based on confidence
    let totalWeight = 0;
    let weightedSum = 0;
    
    durationSources.forEach(source => {
      const weight = source.confidence;
      totalWeight += weight;
      weightedSum += source.duration * weight;
    });
    
    const calculatedDuration = Math.round(weightedSum / totalWeight);
    
    // Apply sanity checks
    const minDuration = 5; // Minimum 5 minutes
    const maxDuration = 120; // Maximum 2 hours for regular appointments
    
    return Math.max(minDuration, Math.min(maxDuration, calculatedDuration));
  }
  
  /**
   * Get multiplier for converting recording duration to actual appointment duration
   */
  private static getRecordingMultiplier(appointmentType: string): number {
    const multipliers: Record<string, number> = {
      'new-patient': 2.5, // New patients need more non-recording time
      'new_patient': 2.5,
      'physical': 2.2, // Physicals have exam time not in recording
      'annual_physical': 2.2,
      'procedure': 3.0, // Procedures have prep/recovery time
      'follow-up': 1.8, // Follow-ups are more straightforward
      'follow_up': 1.8,
      'sick-visit': 1.5, // Sick visits are focused
      'acute_visit': 1.5,
      'telehealth': 1.2 // Telehealth has minimal non-recording time
    };
    
    return multipliers[appointmentType] || 2.0;
  }
  
  /**
   * Record duration history for AI learning
   */
  private static async recordDurationHistory(appointment: any, actualDuration: number) {
    const accuracyScore = this.calculateAccuracyScore(
      appointment.aiPredictedDuration || appointment.providerScheduledDuration,
      actualDuration
    );
    
    await db.insert(appointmentDurationHistory).values({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      locationId: appointment.locationId,
      appointmentType: appointment.appointmentType,
      scheduledDuration: appointment.providerScheduledDuration,
      predictedDuration: appointment.aiPredictedDuration,
      actualDuration: actualDuration,
      accuracyScore: accuracyScore,
      dayOfWeek: new Date(appointment.scheduledDate).getDay(),
      timeOfDay: appointment.scheduledTime,
      patientAge: appointment.patientAge || null,
      patientComplexity: appointment.patientComplexity || null,
      recordedAt: new Date()
    });
  }
  
  /**
   * Calculate accuracy score for AI predictions
   */
  private static calculateAccuracyScore(predicted: number, actual: number): string {
    if (!predicted || !actual) return '0.00';
    
    const difference = Math.abs(predicted - actual);
    const percentageError = (difference / actual) * 100;
    
    // Convert percentage error to accuracy score (0-1)
    const accuracy = Math.max(0, 1 - (percentageError / 100));
    
    return accuracy.toFixed(2);
  }
  
  /**
   * Update patient scheduling patterns with new duration data
   */
  private static async updatePatientPatterns(patientId: number, appointmentType: string, actualDuration: number) {
    const [existingPattern] = await db
      .select()
      .from(patientSchedulingPatterns)
      .where(eq(patientSchedulingPatterns.patientId, patientId))
      .execute();
    
    if (existingPattern) {
      // Update existing pattern
      const currentAvg = parseFloat(existingPattern.avgVisitDuration || '0');
      const visitCount = existingPattern.totalVisits || 0;
      
      // Calculate new average
      const newAvg = ((currentAvg * visitCount) + actualDuration) / (visitCount + 1);
      
      // Update appointment type specific averages
      let durationByType = {};
      try {
        durationByType = existingPattern.avgDurationByType ? 
          JSON.parse(existingPattern.avgDurationByType as string) : {};
      } catch (e) {
        durationByType = {};
      }
      
      // Update type-specific average
      const typeCount = durationByType[`${appointmentType}_count`] || 0;
      const typeAvg = durationByType[appointmentType] || 0;
      durationByType[appointmentType] = ((typeAvg * typeCount) + actualDuration) / (typeCount + 1);
      durationByType[`${appointmentType}_count`] = typeCount + 1;
      
      await db
        .update(patientSchedulingPatterns)
        .set({
          avgVisitDuration: newAvg.toFixed(1),
          avgDurationByType: JSON.stringify(durationByType),
          totalVisits: visitCount + 1,
          lastVisitDate: new Date()
        })
        .where(eq(patientSchedulingPatterns.id, existingPattern.id));
        
    } else {
      // Create new pattern
      const durationByType = {
        [appointmentType]: actualDuration,
        [`${appointmentType}_count`]: 1
      };
      
      await db.insert(patientSchedulingPatterns).values({
        patientId: patientId,
        avgVisitDuration: actualDuration.toString(),
        avgDurationByType: JSON.stringify(durationByType),
        totalVisits: 1,
        noShowRate: '0',
        avgArrivalDelta: '0',
        arrivalConsistency: '100',
        lastVisitDate: new Date()
      });
    }
  }
  
  /**
   * Update provider scheduling patterns with new duration data
   */
  private static async updateProviderPatterns(providerId: number, appointmentType: string, actualDuration: number) {
    const [existingPattern] = await db
      .select()
      .from(providerSchedulingPatterns)
      .where(eq(providerSchedulingPatterns.providerId, providerId))
      .execute();
    
    if (existingPattern) {
      // Update existing pattern
      const currentAvg = parseFloat(existingPattern.avgVisitDuration || '0');
      const appointmentCount = existingPattern.totalAppointments || 0;
      
      // Calculate new average
      const newAvg = ((currentAvg * appointmentCount) + actualDuration) / (appointmentCount + 1);
      
      await db
        .update(providerSchedulingPatterns)
        .set({
          avgVisitDuration: newAvg.toFixed(1),
          totalAppointments: appointmentCount + 1
        })
        .where(eq(providerSchedulingPatterns.id, existingPattern.id));
        
    } else {
      // Create new pattern
      await db.insert(providerSchedulingPatterns).values({
        providerId: providerId,
        avgVisitDuration: actualDuration.toString(),
        totalAppointments: 1,
        efficiencyFactor: '1.0',
        avgDelayMinutes: '0',
        bufferPreference: '5',
        preferredComplexPatientTime: '45',
        catchUpThreshold: '15'
      });
    }
  }
}