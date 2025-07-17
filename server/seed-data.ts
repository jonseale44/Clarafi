import { db } from "./db.js";
import { patients, encounters, vitals, allergies, medications, diagnoses, labOrders, labResults, orders } from "@shared/schema";
import { storage } from "./storage";

export async function seedSampleData() {
  try {
    // Check if we already have patients
    const existingPatients = await storage.getAllPatients();
    if (existingPatients.length > 0) {
      console.log("Sample data already exists, skipping seed");
      return;
    }

    console.log("Seeding sample EMR data...");

    // Create sample patients
    const patient1 = await storage.createPatient({
      mrn: "MRN001234",
      firstName: "Sarah",
      lastName: "Johnson",
      dateOfBirth: "1985-03-15",
      gender: "female",
      contactNumber: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      address: "123 Main St, Anytown, ST 12345",
      emergencyContact: "John Johnson (husband) - (555) 123-4568"
    });

    const patient2 = await storage.createPatient({
      mrn: "MRN005678",
      firstName: "Robert",
      lastName: "Chen",
      dateOfBirth: "1970-08-22",
      gender: "male",
      contactNumber: "(555) 987-6543",
      email: "robert.chen@email.com",
      address: "456 Oak Ave, Somewhere, ST 54321",
      emergencyContact: "Linda Chen (wife) - (555) 987-6544"
    });

    const patient3 = await storage.createPatient({
      mrn: "MRN009876",
      firstName: "Maria",
      lastName: "Rodriguez",
      dateOfBirth: "1992-12-03",
      gender: "female",
      contactNumber: "(555) 456-7890",
      email: "maria.rodriguez@email.com",
      address: "789 Pine Rd, Elsewhere, ST 98765",
      emergencyContact: "Carlos Rodriguez (father) - (555) 456-7891"
    });

    // Create sample encounters
    const encounter1 = await storage.createEncounter({
      patientId: patient1.id,
      providerId: 1, // Assuming the registered user is provider ID 1
      encounterType: "office_visit",
      encounterSubtype: "preventive_care",
      encounterStatus: "completed",
      chiefComplaint: "Annual physical examination",
      subjective: "Patient reports feeling well overall. No acute complaints. Regular exercise 3x/week. Non-smoker.",
      objective: "Well-appearing 39-year-old female in no acute distress. Vital signs stable.",
      assessment: "Healthy adult female. Up to date with preventive care.",
      plan: "Continue current lifestyle. Return in 1 year for routine follow-up.",
      location: "Main Clinic - Room 102"
    });

    const encounter2 = await storage.createEncounter({
      patientId: patient2.id,
      providerId: 1,
      encounterType: "office_visit",
      encounterSubtype: "urgent_care",
      encounterStatus: "completed",
      chiefComplaint: "Chest pain and shortness of breath",
      subjective: "54-year-old male with 2-hour history of chest pressure and mild SOB. Pain is substernal, non-radiating.",
      objective: "Alert, anxious appearing male. Chest wall tenderness present. Heart rate regular.",
      assessment: "Chest wall strain vs anxiety. Cardiac workup negative.",
      plan: "Muscle relaxants, follow up in 48 hours if symptoms persist.",
      location: "Urgent Care - Room 5"
    });

    const encounter3 = await storage.createEncounter({
      patientId: patient3.id,
      providerId: 1,
      encounterType: "virtual_visit",
      encounterStatus: "completed",
      chiefComplaint: "Follow-up for diabetes management",
      subjective: "32-year-old female with T2DM. Reports good glucose control with current regimen. Checking feet daily.",
      objective: "Patient appears well on video call. Reports home glucose readings 80-140 mg/dL.",
      assessment: "Type 2 diabetes, well controlled",
      plan: "Continue current metformin. HbA1c in 3 months. Nutrition consult scheduled.",
      location: "Telehealth"
    });

    // Create sample vitals
    await storage.createVitals({
      patientId: patient1.id,
      encounterId: encounter1.id,
      measuredAt: new Date(),
      systolicBp: 118,
      diastolicBp: 76,
      heartRate: 72,
      temperature: "98.6",
      weight: "145",
      height: "65",
      bmi: "24.1",
      oxygenSaturation: "99",
      respiratoryRate: 16,
      painScale: 0,
      recordedBy: "Nurse Thompson"
    });

    await storage.createVitals({
      patientId: patient2.id,
      encounterId: encounter2.id,
      measuredAt: new Date(),
      systolicBp: 142,
      diastolicBp: 88,
      heartRate: 96,
      temperature: "98.2",
      weight: "185",
      height: "70",
      bmi: "26.5",
      oxygenSaturation: "97",
      respiratoryRate: 20,
      painScale: 6,
      recordedBy: "Nurse Wilson"
    });

    await storage.createVitals({
      patientId: patient3.id,
      encounterId: encounter3.id,
      measuredAt: new Date(),
      systolicBp: 125,
      diastolicBp: 80,
      heartRate: 78,
      temperature: "98.4",
      weight: "132",
      height: "62",
      bmi: "24.2",
      oxygenSaturation: "98",
      respiratoryRate: 18,
      painScale: 0,
      recordedBy: "Self-reported"
    });

    // Add sample allergies
    await db.insert(allergies).values([
      {
        patientId: patient1.id,
        allergen: "Penicillin",
        reaction: "Rash, hives",
        severity: "moderate",
        lastUpdatedEncounter: encounter1.id
      },
      {
        patientId: patient2.id,
        allergen: "Shellfish",
        reaction: "Swelling, difficulty breathing",
        severity: "severe",
        lastUpdatedEncounter: encounter2.id
      }
    ]);

    // Add sample medications
    await db.insert(medications).values([
      {
        patientId: patient3.id,
        encounterId: encounter3.id,
        medicationName: "Metformin",
        dosage: "500mg",
        frequency: "twice daily",
        route: "oral",
        startDate: "2023-01-15",
        prescriber: "Dr. Smith",
        status: "active",
        medicalProblem: "Type 2 Diabetes"
      },
      {
        patientId: patient1.id,
        encounterId: encounter1.id,
        medicationName: "Multivitamin",
        dosage: "1 tablet",
        frequency: "daily",
        route: "oral",
        startDate: "2024-01-01",
        prescriber: "Dr. Smith",
        status: "active",
        medicalProblem: "Preventive care"
      }
    ]);

    // Add sample diagnoses
    await db.insert(diagnoses).values([
      {
        patientId: patient3.id,
        encounterId: encounter3.id,
        diagnosis: "Type 2 Diabetes Mellitus",
        icd10Code: "E11.9",
        diagnosisDate: "2023-01-15",
        status: "active",
        notes: "Well controlled with medication"
      },
      {
        patientId: patient2.id,
        encounterId: encounter2.id,
        diagnosis: "Chest wall pain",
        icd10Code: "M79.1",
        diagnosisDate: new Date().toISOString().split('T')[0],
        status: "resolved",
        notes: "Muscular strain, resolved with treatment"
      }
    ]);

    console.log("Sample EMR data seeded successfully!");
    console.log(`Created ${[patient1, patient2, patient3].length} patients with encounters, vitals, and clinical data`);

  } catch (error) {
    console.error("Error seeding sample data:", error);
  }
}