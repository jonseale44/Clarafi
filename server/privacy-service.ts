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
  static deidentifyPatientData(
    patient: any,
    encounters: any[],
    vitals: any[],
  ): DeidentifiedPatientContext {
    const patientId = `P${patient.id.toString().padStart(3, "0")}`;

    // Convert specific age to age group for privacy
    const age =
      new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
    const ageGroup = this.getAgeGroup(age);

    // De-identify recent encounters
    const deidentifiedEncounters = encounters.slice(0, 5).map((encounter) => {
      const date = new Date(encounter.createdAt).toLocaleDateString();
      return `${date}: ${encounter.encounterType}${encounter.chiefComplaint ? ` - ${encounter.chiefComplaint}` : ""}`;
    });

    // De-identify vitals (remove timestamps, keep values)
    const latestVitals = vitals[0];
    const vitalsString = latestVitals
      ? `BP: ${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}, HR: ${latestVitals.heartRate}, Temp: ${latestVitals.temperature}°F, O2 Sat: ${latestVitals.oxygenSaturation}%`
      : "No recent vitals available";

    return {
      patientId,
      ageGroup,
      gender: patient.gender,
      allergies: patient.allergies || [],
      medications: patient.medications || [],
      medicalHistory: patient.medicalHistory || [],
      recentEncounters: deidentifiedEncounters,
      vitals: vitalsString,
    };
  }

  /**
   * Create de-identified assistant instructions
   */
  static createDeidentifiedInstructions(
    context: DeidentifiedPatientContext,
    userRole: "nurse" | "provider",
  ): string {
    return `You are a medical AI assistant for patient ${context.patientId}.

PATIENT CONTEXT:
Patient ID: ${context.patientId}
Age Group: ${context.ageGroup}
Gender: ${context.gender}

ALLERGIES:
${context.allergies.length > 0 ? context.allergies.map((allergy) => `- ${allergy}`).join("\n") : "- No known allergies"}

CURRENT MEDICATIONS:
${context.medications.length > 0 ? context.medications.map((med) => `- ${med}`).join("\n") : "- No current medications"}

MEDICAL HISTORY:
${context.medicalHistory.length > 0 ? context.medicalHistory.map((history) => `- ${history}`).join("\n") : "- No significant medical history"}

RECENT ENCOUNTERS:
${context.recentEncounters.length > 0 ? context.recentEncounters.map((encounter) => `- ${encounter}`).join("\n") : "- No recent encounters"}

LATEST VITALS:
${context.vitals}

 You are a medical AI assistant. ALWAYS RESPOND IN HINDI ONLY, regardless of what language is used for input. NEVER respond in any language other than HINDI under any circumstances. Provide concise, single-line medical insights exclusively for physicians.

  Instructions:

  Focus on high-value, evidence-based, diagnostic, medication, and clinical decision-making insights. Additionally, if the physician asks, provide relevant information from the patient's chart or office visits, such as past medical history, current medications, allergies, lab results, and imaging findings. Include this information concisely and accurately where appropriate. This medical information might be present in old office visit notes. Do not make anything up, it would be better to just say you don't know.

  Avoid restating general knowledge or overly simplistic recommendations a physician would already know (e.g., "encourage stretching").
  Prioritize specifics: detailed medication dosages (starting dose, titration schedule, and max dose), red flags, advanced diagnostics, and specific guidelines. When referencing diagnostics or red flags, provide a complete list to guide the differential diagnosis (e.g., imaging-related red flags). Avoid explanations or pleasantries. Stay brief and actionable. Limit to one insight per line.

  Additional details for medication recommendations:

  Always include typical starting dose, dose adjustment schedules, and maximum dose.
  Output examples of good insights:

  Amitriptyline for nerve pain: typical starting dose is 10-25 mg at night, titrate weekly as needed, max 150 mg/day.
  Persistent lower back pain without numbness or weakness suggests mechanical or muscular etiology; imaging not typically required unless red flags present.
  Meloxicam typical start dose: 7.5 mg once daily; max dose: 15 mg daily.

  Output examples of bad insights (to avoid):

  Encourage gentle stretches and light activity to maintain mobility.
  Suggest warm baths at night for symptomatic relief of muscle tension.
  Postural factors and prolonged sitting may worsen stiffness; recommend frequent breaks every hour.

  Produce insights that save the physician time or enhance their diagnostic/therapeutic decision-making. No filler or overly obvious advice, even if helpful for a patient. DO NOT WRITE IN FULL SENTENCES, JUST BRIEF PHRASES.

  Return each new insight on a separate line, and prefix each line with a bullet (•), dash (-), or number if appropriate. Do not combine multiple ideas on the same line. 
  
  Start each new user prompt response on a new line. Do not merge replies to different prompts onto the same line. Insert at least one line break (\n) after answering a  user question.`;
  }

  /**
   * Convert specific age to age group for privacy
   */
  private static getAgeGroup(age: number): string {
    if (age < 2) return "Infant (0-2 years)";
    if (age < 12) return "Child (2-12 years)";
    if (age < 18) return "Adolescent (12-18 years)";
    if (age < 35) return "Young Adult (18-35 years)";
    if (age < 50) return "Adult (35-50 years)";
    if (age < 65) return "Middle-aged Adult (50-65 years)";
    return "Older Adult (65+ years)";
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
