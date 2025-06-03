import { db } from "@db";
import { eq, and } from "drizzle-orm";
import {
  patients,
  soapNotes,
  medicalProblems,
  medications,
  allergies,
  labs,
  vitals,
  imaging,
  appointments,
  surgicalHistory,
  familyHistory,
  socialHistory,
  attachments,
  type InsertPatient,
  type InsertSoapNote,
  type InsertMedicalProblem,
  type InsertMedication,
  type InsertAllergy,
  type InsertLab,
  type InsertVital,
  type InsertImaging,
  type InsertAppointment,
  type InsertSurgicalHistory,
  type InsertFamilyHistory,
  type InsertSocialHistory,
  type InsertAttachment,
  orders,
  type InsertOrder,
} from "@db/schema";

// Patient CRUD operations
export async function createPatient(data: InsertPatient) {
  const [patient] = await db.insert(patients).values(data).returning();
  return patient;
}

export async function getPatientById(id: number) {
  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: {
      soapNotes: true,
      medicalProblems: true,
      medications: true,
      allergies: true,
      labs: true,
      vitals: true,
      imaging: true,
      appointments: true,
      surgicalHistory: true,
      familyHistory: true,
      socialHistory: true,
      attachments: true,
    },
  });
  return patient;
}

export async function updatePatient(id: number, data: Partial<InsertPatient>) {
  const [patient] = await db
    .update(patients)
    .set({ ...data, updated_at: new Date() })
    .where(eq(patients.id, id))
    .returning();
  return patient;
}

export async function deletePatient(id: number) {
  const [patient] = await db
    .delete(patients)
    .where(eq(patients.id, id))
    .returning();
  return patient;
}

// SOAP Notes CRUD operations
export async function createSoapNote(data: InsertSoapNote) {
  const [note] = await db.insert(soapNotes).values(data).returning();
  return note;
}

export async function getSoapNoteById(id: number) {
  const note = await db.query.soapNotes.findFirst({
    where: eq(soapNotes.id, id),
  });
  return note;
}

export async function getPatientSoapNotes(patientId: number) {
  const notes = await db.query.soapNotes.findMany({
    where: eq(soapNotes.patient_id, patientId),
    orderBy: (notes, { desc }) => [desc(notes.created_at)],
  });
  return notes;
}

export async function updateSoapNote(
  id: number,
  data: Partial<InsertSoapNote>,
) {
  const [note] = await db
    .update(soapNotes)
    .set({ ...data, updated_at: new Date() })
    .where(eq(soapNotes.id, id))
    .returning();
  return note;
}

export async function deleteSoapNote(id: number) {
  const [note] = await db
    .delete(soapNotes)
    .where(eq(soapNotes.id, id))
    .returning();
  return note;
}

// Medical Problems CRUD operations
export async function createMedicalProblem(data: InsertMedicalProblem) {
  const [problem] = await db.insert(medicalProblems).values(data).returning();
  return problem;
}

export async function getMedicalProblemById(id: number) {
  const problem = await db.query.medicalProblems.findFirst({
    where: eq(medicalProblems.id, id),
  });
  return problem;
}

export async function getPatientMedicalProblems(patientId: number) {
  const problems = await db.query.medicalProblems.findMany({
    where: eq(medicalProblems.patient_id, patientId),
    orderBy: (problems, { desc }) => [desc(problems.created_at)],
  });
  return problems;
}

export async function updateMedicalProblem(
  id: number,
  data: Partial<InsertMedicalProblem>,
) {
  const [problem] = await db
    .update(medicalProblems)
    .set({ ...data, updated_at: new Date() })
    .where(eq(medicalProblems.id, id))
    .returning();
  return problem;
}

export async function deleteMedicalProblem(id: number) {
  const [problem] = await db
    .delete(medicalProblems)
    .where(eq(medicalProblems.id, id))
    .returning();
  return problem;
}

// Medications CRUD operations
export async function createMedication(data: InsertMedication) {
  const [medication] = await db.insert(medications).values(data).returning();
  return medication;
}

export async function getMedicationById(id: number) {
  const medication = await db.query.medications.findFirst({
    where: eq(medications.id, id),
  });
  return medication;
}

export async function getPatientMedications(patientId: number) {
  const patientMedications = await db.query.medications.findMany({
    where: eq(medications.patient_id, patientId),
    orderBy: (meds, { desc }) => [desc(meds.created_at)],
  });
  return patientMedications;
}

export async function updateMedication(
  id: number,
  data: Partial<InsertMedication>,
) {
  const [medication] = await db
    .update(medications)
    .set({ ...data, updated_at: new Date() })
    .where(eq(medications.id, id))
    .returning();
  return medication;
}

export async function deleteMedication(id: number) {
  const [medication] = await db
    .delete(medications)
    .where(eq(medications.id, id))
    .returning();
  return medication;
}

// Allergies CRUD operations
export async function createAllergy(data: InsertAllergy) {
  const [allergy] = await db.insert(allergies).values(data).returning();
  return allergy;
}

export async function getAllergyById(id: number) {
  const allergy = await db.query.allergies.findFirst({
    where: eq(allergies.id, id),
  });
  return allergy;
}

export async function getPatientAllergies(patientId: number) {
  const patientAllergies = await db.query.allergies.findMany({
    where: eq(allergies.patient_id, patientId),
    orderBy: (allrg, { desc }) => [desc(allrg.created_at)],
  });
  return patientAllergies;
}

export async function updateAllergy(id: number, data: Partial<InsertAllergy>) {
  const [allergy] = await db
    .update(allergies)
    .set({ ...data, updated_at: new Date() })
    .where(eq(allergies.id, id))
    .returning();
  return allergy;
}

export async function deleteAllergy(id: number) {
  const [allergy] = await db
    .delete(allergies)
    .where(eq(allergies.id, id))
    .returning();
  return allergy;
}

// Labs CRUD operations
export async function createLab(data: InsertLab) {
  const [lab] = await db.insert(labs).values(data).returning();
  return lab;
}

export async function getLabById(id: number) {
  const lab = await db.query.labs.findFirst({
    where: eq(labs.id, id),
  });
  return lab;
}

export async function getPatientLabs(patientId: number) {
  const patientLabs = await db.query.labs.findMany({
    where: eq(labs.patient_id, patientId),
    orderBy: (lab, { desc }) => [desc(lab.created_at)],
  });
  return patientLabs;
}

export async function updateLab(id: number, data: Partial<InsertLab>) {
  const [lab] = await db
    .update(labs)
    .set({ ...data, updated_at: new Date() })
    .where(eq(labs.id, id))
    .returning();
  return lab;
}

export async function deleteLab(id: number) {
  const [lab] = await db.delete(labs).where(eq(labs.id, id)).returning();
  return lab;
}

// Vitals CRUD operations
export async function createVital(data: InsertVital) {
  const [vital] = await db.insert(vitals).values(data).returning();
  return vital;
}

export async function getVitalById(id: number) {
  const vital = await db.query.vitals.findFirst({
    where: eq(vitals.id, id),
  });
  return vital;
}

export async function getPatientVitals(patientId: number) {
  const patientVitals = await db.query.vitals.findMany({
    where: eq(vitals.patient_id, patientId),
    orderBy: (vital, { desc }) => [desc(vital.created_at)],
  });
  return patientVitals;
}

export async function updateVital(id: number, data: Partial<InsertVital>) {
  try {
    console.log(`[CRUD] Attempting to update vital with ID: ${id}`);
    console.log(`[CRUD] Update data:`, JSON.stringify(data));

    // Clean up the input data to prevent issues
    const cleanedData: any = {};

    // Only include fields that aren't undefined
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    }

    // Special handling for numeric fields to ensure proper NULL handling
    if (cleanedData.blood_pressure_systolic === "")
      cleanedData.blood_pressure_systolic = null;
    if (cleanedData.blood_pressure_diastolic === "")
      cleanedData.blood_pressure_diastolic = null;
    if (cleanedData.heart_rate === "") cleanedData.heart_rate = null;
    if (cleanedData.respiratory_rate === "")
      cleanedData.respiratory_rate = null;
    if (cleanedData.oxygen_saturation === "")
      cleanedData.oxygen_saturation = null;
    if (cleanedData.temperature === "") cleanedData.temperature = null;

    // Add the updated_at timestamp
    cleanedData.updated_at = new Date();

    console.log(`[CRUD] Cleaned update data:`, JSON.stringify(cleanedData));

    // Check if vital exists first to avoid foreign key constraint errors
    const existingVital = await db
      .select()
      .from(vitals)
      .where(eq(vitals.id, id))
      .limit(1);

    if (!existingVital.length) {
      throw new Error(`Vital with ID ${id} does not exist`);
    }

    // Directly use the drizzle ORM method for update
    const updateResult = await db
      .update(vitals)
      .set(cleanedData)
      .where(eq(vitals.id, id))
      .returning();

    console.log(`[CRUD] Update result:`, updateResult);

    if (!updateResult.length) {
      throw new Error(`Failed to update vital with ID ${id}`);
    }

    console.log(`[CRUD] Update successful:`, updateResult[0]);
    return updateResult[0];
  } catch (error) {
    console.error(`[CRUD] Error updating vital with ID ${id}:`, error);
    throw error;
  }
}

export async function deleteVital(id: number) {
  try {
    console.log(`[CRUD] Attempting to delete vital with ID: ${id}`);
    const [vital] = await db
      .delete(vitals)
      .where(eq(vitals.id, id))
      .returning();
    console.log(`[CRUD] Deleted vital result:`, vital);
    return vital;
  } catch (error) {
    console.error(`[CRUD] Error deleting vital with ID ${id}:`, error);
    throw error;
  }
}

// Imaging CRUD operations
export async function createImaging(data: InsertImaging) {
  const [image] = await db.insert(imaging).values(data).returning();
  return image;
}

export async function getImagingById(id: number) {
  const image = await db.query.imaging.findFirst({
    where: eq(imaging.id, id),
  });
  return image;
}

export async function getPatientImaging(patientId: number) {
  const patientImages = await db.query.imaging.findMany({
    where: eq(imaging.patient_id, patientId),
    orderBy: (img, { desc }) => [desc(img.created_at)],
  });
  return patientImages;
}

export async function updateImaging(id: number, data: Partial<InsertImaging>) {
  const [image] = await db
    .update(imaging)
    .set({ ...data, updated_at: new Date() })
    .where(eq(imaging.id, id))
    .returning();
  return image;
}

export async function deleteImaging(id: number) {
  const [image] = await db
    .delete(imaging)
    .where(eq(imaging.id, id))
    .returning();
  return image;
}

// Appointments CRUD operations
export async function createAppointment(data: InsertAppointment) {
  const [appointment] = await db.insert(appointments).values(data).returning();
  return appointment;
}

export async function getAppointmentById(id: number) {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
  });
  return appointment;
}

export async function getPatientAppointments(patientId: number) {
  const patientAppointments = await db.query.appointments.findMany({
    where: eq(appointments.patient_id, patientId),
    orderBy: (apt, { desc }) => [desc(apt.appointment_date)],
  });
  return patientAppointments;
}

export async function updateAppointment(
  id: number,
  data: Partial<InsertAppointment>,
) {
  const [appointment] = await db
    .update(appointments)
    .set({ ...data, updated_at: new Date() })
    .where(eq(appointments.id, id))
    .returning();
  return appointment;
}

export async function deleteAppointment(id: number) {
  const [appointment] = await db
    .delete(appointments)
    .where(eq(appointments.id, id))
    .returning();
  return appointment;
}

// Surgical History CRUD operations
export async function createSurgicalHistory(data: InsertSurgicalHistory) {
  const [surgery] = await db.insert(surgicalHistory).values(data).returning();
  return surgery;
}

export async function getSurgicalHistoryById(id: number) {
  const surgery = await db.query.surgicalHistory.findFirst({
    where: eq(surgicalHistory.id, id),
  });
  return surgery;
}

export async function getPatientSurgicalHistory(patientId: number) {
  const surgeries = await db.query.surgicalHistory.findMany({
    where: eq(surgicalHistory.patient_id, patientId),
    orderBy: (surgery, { desc }) => [desc(surgery.date)],
  });
  return surgeries;
}

export async function updateSurgicalHistory(
  id: number,
  data: Partial<InsertSurgicalHistory>,
) {
  const [surgery] = await db
    .update(surgicalHistory)
    .set({ ...data, updated_at: new Date() })
    .where(eq(surgicalHistory.id, id))
    .returning();
  return surgery;
}

export async function deleteSurgicalHistory(id: number) {
  const [surgery] = await db
    .delete(surgicalHistory)
    .where(eq(surgicalHistory.id, id))
    .returning();
  return surgery;
}

// Family History CRUD operations
export async function createFamilyHistory(data: InsertFamilyHistory) {
  const [history] = await db.insert(familyHistory).values(data).returning();
  return history;
}

export async function getFamilyHistoryById(id: number) {
  const history = await db.query.familyHistory.findFirst({
    where: eq(familyHistory.id, id),
  });
  return history;
}

export async function getPatientFamilyHistory(patientId: number) {
  const histories = await db.query.familyHistory.findMany({
    where: eq(familyHistory.patient_id, patientId),
    orderBy: (history, { desc }) => [desc(history.created_at)],
  });
  return histories;
}

export async function updateFamilyHistory(
  id: number,
  data: Partial<InsertFamilyHistory>,
) {
  const [history] = await db
    .update(familyHistory)
    .set({ ...data, updated_at: new Date() })
    .where(eq(familyHistory.id, id))
    .returning();
  return history;
}

export async function deleteFamilyHistory(id: number) {
  const [history] = await db
    .delete(familyHistory)
    .where(eq(familyHistory.id, id))
    .returning();
  return history;
}

// Social History CRUD operations
export async function createSocialHistory(data: InsertSocialHistory) {
  const [history] = await db.insert(socialHistory).values(data).returning();
  return history;
}

export async function getSocialHistoryById(id: number) {
  const history = await db.query.socialHistory.findFirst({
    where: eq(socialHistory.id, id),
  });
  return history;
}

export async function getPatientSocialHistory(patientId: number) {
  const history = await db.query.socialHistory.findMany({
    where: eq(socialHistory.patient_id, patientId),
    orderBy: (history, { desc }) => [desc(history.created_at)],
  });
  return history;
}

export async function updateSocialHistory(
  id: number,
  data: Partial<InsertSocialHistory>,
) {
  const [history] = await db
    .update(socialHistory)
    .set({ ...data, updated_at: new Date() })
    .where(eq(socialHistory.id, id))
    .returning();
  return history;
}

export async function deleteSocialHistory(id: number) {
  const [history] = await db
    .delete(socialHistory)
    .where(eq(socialHistory.id, id))
    .returning();
  return history;
}

// Attachments CRUD operations
export async function createAttachment(data: InsertAttachment) {
  const [attachment] = await db.insert(attachments).values(data).returning();
  return attachment;
}

export async function getAttachmentById(id: number) {
  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, id),
  });
  return attachment;
}

export async function getPatientAttachments(patientId: number) {
  const patientAttachments = await db.query.attachments.findMany({
    where: eq(attachments.patient_id, patientId),
    orderBy: (attachment, { desc }) => [desc(attachment.created_at)],
  });
  return patientAttachments;
}

export async function updateAttachment(
  id: number,
  data: Partial<InsertAttachment>,
) {
  const [attachment] = await db
    .update(attachments)
    .set({ ...data, updated_at: new Date() })
    .where(eq(attachments.id, id))
    .returning();
  return attachment;
}

export async function deleteAttachment(id: number) {
  const [attachment] = await db
    .delete(attachments)
    .where(eq(attachments.id, id))
    .returning();
  return attachment;
}

// Orders CRUD operations
export async function createOrder(data: InsertOrder) {
  const [order] = await db.insert(orders).values(data).returning();
  return order;
}

export async function getOrderById(id: number) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });
  return order;
}

export async function getPatientOrders(patientId: number) {
  const patientOrders = await db.query.orders.findMany({
    where: eq(orders.patient_id, patientId),
    orderBy: (orders, { desc }) => [desc(orders.created_at)],
  });
  return patientOrders;
}

export async function getPatientDraftOrders(patientId: number) {
  const draftOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.patient_id, patientId),
      eq(orders.order_status, "draft"),
    ),
    orderBy: (orders, { desc }) => [desc(orders.created_at)],
  });
  return draftOrders;
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const [order] = await db
    .update(orders)
    .set({ ...data, updated_at: new Date() })
    .where(eq(orders.id, id))
    .returning();
  return order;
}

export async function deleteOrder(id: number) {
  const [order] = await db.delete(orders).where(eq(orders.id, id)).returning();
  return order;
}

// Token Usage CRUD operations
export async function createTokenUsage(data: InsertTokenUsage) {
  const [usage] = await db.insert(tokenUsage).values(data).returning();
  return usage;
}

export async function getTokenUsageForVisit(visitId: number) {
  const usage = await db.query.tokenUsage.findFirst({
    where: eq(tokenUsage.office_visit_id, visitId),
  });
  return usage;
}

export async function getTokenUsageForPatient(patientId: number) {
  const usage = await db.query.tokenUsage.findMany({
    where: eq(tokenUsage.patient_id, patientId),
    orderBy: (usage, { desc }) => [desc(usage.created_at)],
  });
  return usage;
}
