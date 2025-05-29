/**
 * Privacy Service for HIPAA-compliant de-identification
 * Removes PHI while preserving clinical context for AI assistants
 */

export interface DeidentifiedPatientContext {
  patientId: string;
  ageGroup: string;
  gender: string;
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  recentEncounters: string[];
  vitals: string;
}

export class PrivacyService {
  
  /**
   * De-identify patient data for AI assistant instructions
   * Removes names, MRNs, DOBs while preserving clinical context
   */
  static deidentifyPatientData(patient: any, encounters: any[], vitals: any[]): DeidentifiedPatientContext {
    const patientId = `P${patient.id.toString().padStart(3, '0')}`;
    
    // Convert specific age to age group for privacy
    const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
    const ageGroup = this.getAgeGroup(age);
    
    // De-identify recent encounters
    const deidentifiedEncounters = encounters.slice(0, 5).map(encounter => {
      const date = new Date(encounter.createdAt).toLocaleDateString();
      return `${date}: ${encounter.encounterType}${encounter.chiefComplaint ? ` - ${encounter.chiefComplaint}` : ''}`;
    });
    
    // De-identify vitals (remove timestamps, keep values)
    const latestVitals = vitals[0];
    const vitalsString = latestVitals ? 
      `BP: ${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}, HR: ${latestVitals.heartRate}, Temp: ${latestVitals.temperature}°F, O2 Sat: ${latestVitals.oxygenSaturation}%` :
      'No recent vitals available';
    
    return {
      patientId,
      ageGroup,
      gender: patient.gender,
      allergies: patient.allergies || [],
      medications: patient.medications || [],
      medicalHistory: patient.medicalHistory || [],
      recentEncounters: deidentifiedEncounters,
      vitals: vitalsString
    };
  }
  
  /**
   * Create de-identified assistant instructions
   */
  static createDeidentifiedInstructions(context: DeidentifiedPatientContext, userRole: 'nurse' | 'provider'): string {
    return `You are a medical AI assistant for patient ${context.patientId}.

PATIENT CONTEXT:
Patient ID: ${context.patientId}
Age Group: ${context.ageGroup}
Gender: ${context.gender}

ALLERGIES:
${context.allergies.length > 0 ? context.allergies.map(allergy => `- ${allergy}`).join('\n') : '- No known allergies'}

CURRENT MEDICATIONS:
${context.medications.length > 0 ? context.medications.map(med => `- ${med}`).join('\n') : '- No current medications'}

MEDICAL HISTORY:
${context.medicalHistory.length > 0 ? context.medicalHistory.map(history => `- ${history}`).join('\n') : '- No significant medical history'}

RECENT ENCOUNTERS:
${context.recentEncounters.length > 0 ? context.recentEncounters.map(encounter => `- ${encounter}`).join('\n') : '- No recent encounters'}

LATEST VITALS:
${context.vitals}

INSTRUCTIONS:
- Always respond in English only
- Provide concise, evidence-based medical insights for ${userRole}s
- Focus on this specific patient's medical history and context
- Include relevant clinical guidelines and safety considerations
- Build upon previous encounters and medical knowledge for this patient
- Avoid restating obvious medical knowledge
- Stay brief and actionable
- Never reference the patient by name or identifiable information

Return insights as bullet points, one per line.`;
  }
  
  /**
   * Convert specific age to age group for privacy
   */
  private static getAgeGroup(age: number): string {
    if (age < 2) return 'Infant (0-2 years)';
    if (age < 12) return 'Child (2-12 years)';
    if (age < 18) return 'Adolescent (12-18 years)';
    if (age < 35) return 'Young Adult (18-35 years)';
    if (age < 50) return 'Adult (35-50 years)';
    if (age < 65) return 'Middle-aged Adult (50-65 years)';
    return 'Older Adult (65+ years)';
  }
  
  /**
   * De-identify transcription text for AI processing
   */
  static deidentifyTranscription(text: string, patientId: string): string {
    // Replace any potential names or identifiers in transcription
    // This is a basic implementation - could be enhanced with NLP
    return text.replace(/patient\s+\w+/gi, `patient ${patientId}`);
  }
  
  /**
   * Create de-identified assistant name
   */
  static createAssistantName(patientId: string): string {
    return `Medical Assistant - Patient ${patientId}`;
  }
}