import { db } from "./db";
import { 
  patients, 
  medicalProblems, 
  medications, 
  allergies, 
  vitals, 
  labResults, 
  imagingResults,
  familyHistory,
  socialHistory,
  surgicalHistory,
  encounters,
  appointments,
  patientSchedulingPatterns,
  appointmentDurationHistory,
  diagnoses,
  InsertPatient,
  InsertEncounter,
  InsertMedicalProblem,
  InsertMedication,
  InsertAllergy,
  InsertVital,
  InsertLabResult,
  InsertImagingResult,
  InsertFamilyHistory,
  InsertSocialHistory,
  InsertSurgicalHistory,
  InsertAppointment,
  InsertDiagnosis
} from "@shared/schema";
import { eq } from "drizzle-orm";

// Test patient configuration interface
export interface TestPatientConfig {
  healthSystemId: number;
  providerId: number;
  locationId: number;
  patientComplexity: "low" | "medium" | "high" | "extreme";
  numberOfMedicalProblems: number;
  numberOfMedications: number;
  numberOfAllergies: number;
  numberOfPriorEncounters: number;
  numberOfFutureAppointments: number;
  includeLabResults: boolean;
  includeImagingResults: boolean;
  includeVitals: boolean;
  includeFamilyHistory: boolean;
  includeSocialHistory: boolean;
  includeSurgicalHistory: boolean;
  noShowRate: number; // 0-100
  avgArrivalDelta: number; // minutes early/late
  customFirstName?: string;
  customLastName?: string;
}

// Realistic data pools for generation
const MEDICAL_PROBLEMS_POOL = [
  { title: "Type 2 Diabetes Mellitus", icd10: "E11.9", complexity: 3 },
  { title: "Essential Hypertension", icd10: "I10", complexity: 2 },
  { title: "Hyperlipidemia", icd10: "E78.5", complexity: 2 },
  { title: "Coronary Artery Disease", icd10: "I25.10", complexity: 4 },
  { title: "Congestive Heart Failure", icd10: "I50.9", complexity: 5 },
  { title: "Atrial Fibrillation", icd10: "I48.91", complexity: 4 },
  { title: "Chronic Kidney Disease Stage 3", icd10: "N18.3", complexity: 4 },
  { title: "COPD", icd10: "J44.9", complexity: 4 },
  { title: "Asthma", icd10: "J45.909", complexity: 2 },
  { title: "Major Depressive Disorder", icd10: "F33.9", complexity: 3 },
  { title: "Generalized Anxiety Disorder", icd10: "F41.1", complexity: 2 },
  { title: "Osteoarthritis", icd10: "M19.90", complexity: 2 },
  { title: "Rheumatoid Arthritis", icd10: "M06.9", complexity: 3 },
  { title: "Hypothyroidism", icd10: "E03.9", complexity: 2 },
  { title: "GERD", icd10: "K21.9", complexity: 1 },
  { title: "Chronic Pain Syndrome", icd10: "G89.4", complexity: 3 },
  { title: "Obesity", icd10: "E66.9", complexity: 2 },
  { title: "Sleep Apnea", icd10: "G47.33", complexity: 3 },
  { title: "Diabetic Neuropathy", icd10: "E11.40", complexity: 3 },
  { title: "Chronic Migraine", icd10: "G43.709", complexity: 2 }
];

const MEDICATIONS_POOL = [
  { name: "Metformin", dosage: "1000 mg", frequency: "twice daily", indication: "Type 2 Diabetes" },
  { name: "Lisinopril", dosage: "10 mg", frequency: "once daily", indication: "Hypertension" },
  { name: "Atorvastatin", dosage: "40 mg", frequency: "once daily at bedtime", indication: "Hyperlipidemia" },
  { name: "Aspirin", dosage: "81 mg", frequency: "once daily", indication: "CAD prophylaxis" },
  { name: "Metoprolol", dosage: "50 mg", frequency: "twice daily", indication: "Hypertension/AFib" },
  { name: "Warfarin", dosage: "5 mg", frequency: "once daily", indication: "Anticoagulation" },
  { name: "Furosemide", dosage: "40 mg", frequency: "once daily", indication: "CHF" },
  { name: "Albuterol inhaler", dosage: "90 mcg", frequency: "as needed", indication: "Asthma/COPD" },
  { name: "Levothyroxine", dosage: "100 mcg", frequency: "once daily", indication: "Hypothyroidism" },
  { name: "Sertraline", dosage: "100 mg", frequency: "once daily", indication: "Depression" },
  { name: "Gabapentin", dosage: "300 mg", frequency: "three times daily", indication: "Neuropathic pain" },
  { name: "Omeprazole", dosage: "20 mg", frequency: "once daily", indication: "GERD" },
  { name: "Insulin glargine", dosage: "20 units", frequency: "once daily at bedtime", indication: "Diabetes" },
  { name: "Amlodipine", dosage: "5 mg", frequency: "once daily", indication: "Hypertension" },
  { name: "Hydrochlorothiazide", dosage: "25 mg", frequency: "once daily", indication: "Hypertension" },
  { name: "Simvastatin", dosage: "20 mg", frequency: "once daily", indication: "Hyperlipidemia" },
  { name: "Losartan", dosage: "50 mg", frequency: "once daily", indication: "Hypertension" },
  { name: "Clopidogrel", dosage: "75 mg", frequency: "once daily", indication: "Antiplatelet" },
  { name: "Tramadol", dosage: "50 mg", frequency: "every 6 hours as needed", indication: "Pain" },
  { name: "Duloxetine", dosage: "60 mg", frequency: "once daily", indication: "Depression/Neuropathy" }
];

const ALLERGIES_POOL = [
  { allergen: "Penicillin", reaction: "Rash", severity: "moderate", allergyType: "drug" },
  { allergen: "Sulfa drugs", reaction: "Hives", severity: "moderate", allergyType: "drug" },
  { allergen: "Aspirin", reaction: "GI upset", severity: "mild", allergyType: "drug" },
  { allergen: "Codeine", reaction: "Nausea/vomiting", severity: "moderate", allergyType: "drug" },
  { allergen: "Morphine", reaction: "Itching", severity: "mild", allergyType: "drug" },
  { allergen: "Latex", reaction: "Contact dermatitis", severity: "mild", allergyType: "contact" },
  { allergen: "Shellfish", reaction: "Anaphylaxis", severity: "severe", allergyType: "food" },
  { allergen: "Peanuts", reaction: "Throat swelling", severity: "severe", allergyType: "food" },
  { allergen: "Eggs", reaction: "Hives", severity: "moderate", allergyType: "food" },
  { allergen: "Iodine contrast", reaction: "Anaphylactoid reaction", severity: "severe", allergyType: "drug" }
];

const SURGICAL_HISTORY_POOL = [
  { procedure: "Appendectomy", year: 2015 },
  { procedure: "Cholecystectomy", year: 2018 },
  { procedure: "Total knee replacement", year: 2020 },
  { procedure: "Coronary angioplasty with stent", year: 2019 },
  { procedure: "Cataract surgery", year: 2021 },
  { procedure: "Hernia repair", year: 2017 },
  { procedure: "Hysterectomy", year: 2016 },
  { procedure: "CABG x3", year: 2018 },
  { procedure: "Hip replacement", year: 2019 },
  { procedure: "Rotator cuff repair", year: 2020 }
];

const CHIEF_COMPLAINTS_POOL = [
  "Follow-up diabetes management",
  "Blood pressure check",
  "Medication refill",
  "Annual physical exam",
  "Chest pain",
  "Shortness of breath",
  "Joint pain",
  "Fatigue",
  "Dizziness",
  "Chronic pain management",
  "Depression follow-up",
  "Lab results review",
  "Post-hospital follow-up",
  "Pre-operative clearance",
  "Routine preventive care"
];

export class TestPatientGenerator {
  
  // Generate a unique test patient MRN
  private generateTestMRN(): string {
    const timestamp = Date.now();
    return `ZTEST${timestamp}`;
  }

  // Generate test patient name
  private generateTestName(config: TestPatientConfig): { firstName: string; lastName: string } {
    const timestamp = new Date().getTime();
    const firstName = config.customFirstName || `Ztest${timestamp}`;
    const lastName = config.customLastName || `Patient${timestamp}`;
    return { firstName, lastName };
  }

  // Generate age based on complexity
  private generateAge(complexity: string): Date {
    const baseYear = new Date().getFullYear();
    let age: number;
    
    switch (complexity) {
      case "low":
        age = Math.floor(Math.random() * 20) + 20; // 20-40
        break;
      case "medium":
        age = Math.floor(Math.random() * 20) + 40; // 40-60
        break;
      case "high":
        age = Math.floor(Math.random() * 20) + 60; // 60-80
        break;
      case "extreme":
        age = Math.floor(Math.random() * 15) + 75; // 75-90
        break;
      default:
        age = 45;
    }
    
    return new Date(baseYear - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  }

  // Select medical problems based on complexity and count
  private selectMedicalProblems(count: number, complexity: string): typeof MEDICAL_PROBLEMS_POOL {
    const complexityThreshold = complexity === "low" ? 2 : complexity === "medium" ? 3 : complexity === "high" ? 4 : 5;
    const eligibleProblems = MEDICAL_PROBLEMS_POOL.filter(p => 
      complexity === "extreme" ? p.complexity >= 3 : p.complexity <= complexityThreshold
    );
    
    // Shuffle and select
    const shuffled = [...eligibleProblems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Select medications based on medical problems
  private selectMedications(count: number, medicalProblems: typeof MEDICAL_PROBLEMS_POOL): typeof MEDICATIONS_POOL {
    // Try to match medications to problems where possible
    const relevantMeds = MEDICATIONS_POOL.filter(med => {
      const problemTitles = medicalProblems.map(p => p.title.toLowerCase());
      return problemTitles.some(title => 
        med.indication.toLowerCase().includes("diabetes") && title.includes("diabetes") ||
        med.indication.toLowerCase().includes("hypertension") && title.includes("hypertension") ||
        med.indication.toLowerCase().includes("hyperlipidemia") && title.includes("hyperlipidemia") ||
        med.indication.toLowerCase().includes("depression") && title.includes("depression") ||
        med.indication.toLowerCase().includes("pain") && (title.includes("arthritis") || title.includes("pain"))
      );
    });
    
    // Add some random medications if needed
    const allMeds = [...relevantMeds];
    const remainingMeds = MEDICATIONS_POOL.filter(m => !relevantMeds.includes(m));
    const shuffledRemaining = remainingMeds.sort(() => Math.random() - 0.5);
    
    return [...allMeds, ...shuffledRemaining].slice(0, count);
  }

  // Generate realistic vitals
  private generateVitals(hasHypertension: boolean, hasDiabetes: boolean): Partial<InsertVital> {
    return {
      systolicBp: hasHypertension ? 
        Math.floor(Math.random() * 30) + 130 : // 130-160
        Math.floor(Math.random() * 20) + 110, // 110-130
      diastolicBp: hasHypertension ?
        Math.floor(Math.random() * 20) + 80 : // 80-100
        Math.floor(Math.random() * 15) + 65, // 65-80
      heartRate: Math.floor(Math.random() * 30) + 60, // 60-90
      temperature: Number((Math.random() * 1.5 + 97.5).toFixed(1)), // 97.5-99.0
      respiratoryRate: Math.floor(Math.random() * 8) + 12, // 12-20
      oxygenSaturation: Math.floor(Math.random() * 4) + 95, // 95-99
      weight: Math.floor(Math.random() * 80) + 120, // 120-200 lbs
      height: Math.floor(Math.random() * 20) + 60, // 60-80 inches
      bmi: Number((Math.random() * 15 + 20).toFixed(1)), // 20-35
      painScale: Math.floor(Math.random() * 6), // 0-5
    };
  }

  // Generate SOAP note
  private generateSOAPNote(chiefComplaint: string, problems: typeof MEDICAL_PROBLEMS_POOL): string {
    const subjective = `Patient presents for ${chiefComplaint}. Reports feeling generally stable with current medication regimen. 
No new complaints today. Denies chest pain, shortness of breath, or other acute symptoms.`;
    
    const objective = `Vital signs stable (see vitals section). Patient appears well-developed, well-nourished, in no acute distress.
Heart: Regular rate and rhythm, no murmurs. Lungs: Clear to auscultation bilaterally. 
Abdomen: Soft, non-tender, non-distended. Extremities: No edema.`;
    
    const assessment = `${problems.map(p => `${p.title} - stable`).join(", ")}`;
    
    const plan = `Continue current medications. Follow up in 3 months. 
Labs ordered for next visit. Patient counseled on medication compliance and lifestyle modifications.`;
    
    return `SUBJECTIVE:\n${subjective}\n\nOBJECTIVE:\n${objective}\n\nASSESSMENT:\n${assessment}\n\nPLAN:\n${plan}`;
  }

  // Main generation method
  async generateTestPatient(config: TestPatientConfig): Promise<{ 
    patientId: number; 
    summary: string;
  }> {
    console.log("[TestPatientGenerator] Starting generation with config:", config);
    console.log("[TestPatientGenerator] Config providerId:", config.providerId, "type:", typeof config.providerId);
    
    // Generate basic patient data
    const { firstName, lastName } = this.generateTestName(config);
    const mrn = this.generateTestMRN();
    const dateOfBirth = this.generateAge(config.patientComplexity);
    
    // Create patient
    const patientData: InsertPatient = {
      mrn,
      healthSystemId: config.healthSystemId,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth.toISOString().split('T')[0],
      gender: Math.random() > 0.5 ? "male" : "female",
      contactNumber: `555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testpatient.com`,
      address: "123 Test Street, Test City, TX 75001",
      preferredLocationId: config.locationId,
      primaryProviderId: config.providerId,
      insurancePrimary: "Test Insurance Co",
      policyNumber: `TEST${Math.floor(Math.random() * 1000000)}`,
    };

    const [patient] = await db.insert(patients).values(patientData).returning();
    const patientId = patient.id;

    // Generate medical problems
    const selectedProblems = this.selectMedicalProblems(config.numberOfMedicalProblems, config.patientComplexity);
    const hasHypertension = selectedProblems.some(p => p.title.includes("Hypertension"));
    const hasDiabetes = selectedProblems.some(p => p.title.includes("Diabetes"));
    
    for (const problem of selectedProblems) {
      const problemData: InsertMedicalProblem = {
        patientId,
        problemTitle: problem.title,
        currentIcd10Code: problem.icd10,
        problemStatus: "active",
        firstDiagnosedDate: new Date(
          new Date().getFullYear() - Math.floor(Math.random() * 5) - 1,
          Math.floor(Math.random() * 12),
          1
        ).toISOString().split('T')[0],
        visitHistory: [],
        rankingFactors: {
          clinical_severity: Math.floor(Math.random() * 100),
          treatment_complexity: Math.floor(Math.random() * 100),
          patient_frequency: Math.floor(Math.random() * 100),
          clinical_relevance: Math.floor(Math.random() * 100),
        },
      };
      await db.insert(medicalProblems).values(problemData);
    }

    // Generate medications
    const selectedMedications = this.selectMedications(config.numberOfMedications, selectedProblems);
    
    for (const med of selectedMedications) {
      const medicationData: InsertMedication = {
        patientId,
        medicationName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: new Date(
          new Date().getFullYear() - Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 12),
          1
        ).toISOString().split('T')[0],
        status: "active",
        prescriber: "Test Provider, MD",
        prescriberId: config.providerId,
        clinicalIndication: med.indication,
        visitHistory: [],
      };
      await db.insert(medications).values(medicationData);
    }

    // Generate allergies
    const shuffledAllergies = [...ALLERGIES_POOL].sort(() => Math.random() - 0.5);
    const selectedAllergies = shuffledAllergies.slice(0, config.numberOfAllergies);
    
    for (const allergy of selectedAllergies) {
      const allergyData: InsertAllergy = {
        patientId,
        allergen: allergy.allergen,
        reaction: allergy.reaction,
        severity: allergy.severity as any,
        allergyType: allergy.allergyType,
        onsetDate: new Date(
          new Date().getFullYear() - Math.floor(Math.random() * 10) - 5,
          Math.floor(Math.random() * 12),
          1
        ).toISOString().split('T')[0],
        status: "active",
        visitHistory: [],
      };
      await db.insert(allergies).values(allergyData);
    }

    // Generate past encounters
    const encounterDates: Date[] = [];
    for (let i = 0; i < config.numberOfPriorEncounters; i++) {
      const monthsAgo = i * 3 + Math.floor(Math.random() * 2); // Roughly every 3 months
      const encounterDate = new Date();
      encounterDate.setMonth(encounterDate.getMonth() - monthsAgo);
      encounterDates.push(encounterDate);
    }

    for (const [index, encounterDate] of encounterDates.entries()) {
      const chiefComplaint = CHIEF_COMPLAINTS_POOL[Math.floor(Math.random() * CHIEF_COMPLAINTS_POOL.length)];
      
      console.log(`[TestPatientGenerator] Creating encounter ${index + 1} of ${config.numberOfPriorEncounters}`);
      console.log("[TestPatientGenerator] providerId:", config.providerId, "type:", typeof config.providerId);
      
      // Create encounter
      const encounterData: InsertEncounter = {
        patientId,
        providerId: config.providerId,
        encounterType: "office_visit",
        startTime: encounterDate,
        endTime: new Date(encounterDate.getTime() + 30 * 60000), // 30 minutes later
        encounterStatus: "signed",
        chiefComplaint,
        note: this.generateSOAPNote(chiefComplaint, selectedProblems),
        location: "Test Location",
      };
      
      console.log("[TestPatientGenerator] Encounter data to insert:", encounterData);
      
      let encounter;
      try {
        const result = await db.insert(encounters).values(encounterData).returning();
        encounter = result[0];
        console.log("[TestPatientGenerator] Encounter created successfully with ID:", encounter.id);
      } catch (error) {
        console.error("[TestPatientGenerator] Error creating encounter:", error);
        throw error;
      }
      
      // Add vitals for encounter
      if (config.includeVitals) {
        console.log("[TestPatientGenerator] Generating vitals for encounter", encounter.id);
        console.log("[TestPatientGenerator] Vital data fields:", {
          patientId,
          encounterId: encounter.id,
          recordedAt: encounterDate,
          recordedBy: `Provider ${config.providerId}`,
          entryType: "routine"
        });
        
        const vitalData: InsertVital = {
          patientId,
          encounterId: encounter.id,
          recordedAt: encounterDate,
          recordedBy: `Provider ${config.providerId}`,
          entryType: "routine",
          enteredBy: config.providerId, // Add the integer user ID
          ...this.generateVitals(hasHypertension, hasDiabetes),
        };
        
        console.log("[TestPatientGenerator] Full vital data to insert:", vitalData);
        
        try {
          await db.insert(vitals).values(vitalData);
          console.log("[TestPatientGenerator] Vitals inserted successfully");
        } catch (error) {
          console.error("[TestPatientGenerator] Error inserting vitals:", error);
          throw error;
        }
      }

      // Add diagnoses for encounter
      const encounterProblems = selectedProblems.slice(0, Math.min(3, selectedProblems.length));
      for (const [idx, problem] of encounterProblems.entries()) {
        const diagnosisData: InsertDiagnosis = {
          patientId,
          encounterId: encounter.id,
          diagnosis_code: problem.icd10,
          diagnosis_description: problem.title,
          diagnosis_type: idx === 0 ? "primary" : "secondary",
          status: "active",
          clinician_id: config.providerId,
        };
        await db.insert(diagnoses).values(diagnosisData);
      }

      // Add lab results for some encounters
      if (config.includeLabResults && index % 2 === 0) {
        const labData: InsertLabResult = {
          patientId,
          encounterId: encounter.id,
          orderDate: encounterDate.toISOString().split('T')[0],
          resultDate: new Date(encounterDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          testName: hasDiabetes ? "Hemoglobin A1C" : "Comprehensive Metabolic Panel",
          resultValue: hasDiabetes ? String((Math.random() * 4 + 6).toFixed(1)) : "Normal",
          referenceRange: hasDiabetes ? "< 7.0%" : "See report",
          abnormalFlag: hasDiabetes && Math.random() > 0.5 ? "H" : undefined,
          status: "final",
          performingLab: "Test Laboratory",
        };
        await db.insert(labResults).values(labData);
      }
    }

    // Generate future appointments
    for (let i = 0; i < config.numberOfFutureAppointments; i++) {
      const daysInFuture = (i + 1) * 30 + Math.floor(Math.random() * 14); // Roughly monthly
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + daysInFuture);
      
      const appointmentData: InsertAppointment = {
        patientId,
        providerId: config.providerId,
        locationId: config.locationId,
        appointmentDate: appointmentDate.toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "09:30",
        duration: 30,
        patientVisibleDuration: 20,
        providerScheduledDuration: 30,
        appointmentType: i === 0 ? "follow_up" : "annual_physical",
        status: "scheduled",
        createdBy: config.providerId,
      };
      
      await db.insert(appointments).values(appointmentData);
    }

    // Create scheduling patterns
    await db.insert(patientSchedulingPatterns).values({
      patientId,
      avgVisitDuration: "25.5",
      noShowRate: String(config.noShowRate),
      avgArrivalDelta: String(config.avgArrivalDelta),
      arrivalConsistency: String(100 - config.noShowRate),
      preferredContactMethod: "sms",
    });

    // Generate family history
    if (config.includeFamilyHistory) {
      await db.insert(familyHistory).values({
        patientId,
        familyMember: "father",
        medicalHistory: "Type 2 Diabetes, Myocardial Infarction at age 65",
        visitHistory: [],
      });
      
      await db.insert(familyHistory).values({
        patientId,
        familyMember: "mother",
        medicalHistory: "Breast cancer at age 58, Hypertension",
        visitHistory: [],
      });
    }

    // Generate social history
    if (config.includeSocialHistory) {
      await db.insert(socialHistory).values({
        patientId,
        category: "smoking",
        currentStatus: config.patientComplexity === "extreme" ? "Current smoker - 1 PPD" : "Former smoker, quit 5 years ago",
        visitHistory: [],
      });
      
      await db.insert(socialHistory).values({
        patientId,
        category: "alcohol",
        currentStatus: "Occasional social drinking",
        visitHistory: [],
      });
    }

    // Generate surgical history
    if (config.includeSurgicalHistory) {
      const shuffledSurgeries = [...SURGICAL_HISTORY_POOL].sort(() => Math.random() - 0.5);
      const selectedSurgeries = shuffledSurgeries.slice(0, Math.min(3, shuffledSurgeries.length));
      
      for (const surgery of selectedSurgeries) {
        await db.insert(surgicalHistory).values({
          patientId,
          procedureName: surgery.procedure,
          procedureDate: `${surgery.year}-01-01`,
          surgeon: "Test Surgeon, MD",
          facilityName: "Test Hospital",
          outcome: "successful",
          visitHistory: [],
        });
      }
    }

    // Generate summary
    const summary = `Test patient created successfully!
Name: ${firstName} ${lastName}
MRN: ${mrn}
Age: ${new Date().getFullYear() - dateOfBirth.getFullYear()} years
Complexity: ${config.patientComplexity}
Medical Problems: ${config.numberOfMedicalProblems}
Medications: ${config.numberOfMedications}
Allergies: ${config.numberOfAllergies}
Prior Encounters: ${config.numberOfPriorEncounters}
Future Appointments: ${config.numberOfFutureAppointments}`;

    return { patientId, summary };
  }
}