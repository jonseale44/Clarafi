import { 
  users, patients, encounters, vitals, medications, diagnoses,
  familyHistory, medicalHistory, socialHistory, allergies,
  labOrders, labResults, imagingOrders, imagingResults, orders,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Encounter, type InsertEncounter, type Vitals, type InsertVitals,
  type Order, type InsertOrder
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Patient management
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByMrn(mrn: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getAllPatients(): Promise<Patient[]>;
  searchPatients(query: string): Promise<Patient[]>;
  deletePatient(id: number): Promise<void>;
  
  // Encounter management
  getEncounter(id: number): Promise<Encounter | undefined>;
  getPatientEncounters(patientId: number): Promise<Encounter[]>;
  createEncounter(encounter: InsertEncounter): Promise<Encounter>;
  updateEncounter(id: number, updates: Partial<Encounter>): Promise<Encounter>;
  
  // Vitals management
  getPatientVitals(patientId: number): Promise<Vitals[]>;
  getLatestVitals(patientId: number): Promise<Vitals | undefined>;
  createVitals(vitals: InsertVitals): Promise<Vitals>;
  
  // Patient chart data
  getPatientAllergies(patientId: number): Promise<any[]>;
  getPatientMedications(patientId: number): Promise<any[]>;
  getPatientDiagnoses(patientId: number): Promise<any[]>;
  getPatientFamilyHistory(patientId: number): Promise<any[]>;
  getPatientMedicalHistory(patientId: number): Promise<any[]>;
  getPatientSocialHistory(patientId: number): Promise<any[]>;
  
  // Lab orders and results
  getPatientLabOrders(patientId: number): Promise<any[]>;
  getPatientLabResults(patientId: number): Promise<any[]>;
  
  // Imaging orders and results
  getPatientImagingOrders(patientId: number): Promise<any[]>;
  getPatientImagingResults(patientId: number): Promise<any[]>;
  
  // Unified Orders management (for draft orders processing system)
  getOrder(id: number): Promise<Order | undefined>;
  getPatientOrders(patientId: number): Promise<Order[]>;
  getPatientDraftOrders(patientId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  deleteAllPatientDraftOrders(patientId: number): Promise<void>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Patient management
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByMrn(mrn: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.mrn, mrn));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await db.select().from(patients)
      .where(
        // Simple text search - in production you'd use full-text search
        // This is a basic implementation for demonstration
        eq(patients.mrn, query)
      )
      .orderBy(desc(patients.createdAt));
  }

  async deletePatient(id: number): Promise<void> {
    // Delete in proper order to handle foreign key constraints
    // Only delete from tables that actually exist in the database
    
    // Delete orders (references encounters)
    await db.delete(orders).where(eq(orders.patientId, id));
    
    // Delete patient-related data
    await db.delete(vitals).where(eq(vitals.patientId, id));
    await db.delete(allergies).where(eq(allergies.patientId, id));
    await db.delete(medications).where(eq(medications.patientId, id));
    await db.delete(diagnoses).where(eq(diagnoses.patientId, id));
    await db.delete(labResults).where(eq(labResults.patientId, id));
    await db.delete(labOrders).where(eq(labOrders.patientId, id));
    
    // Delete encounters (main foreign key constraint)
    await db.delete(encounters).where(eq(encounters.patientId, id));
    
    // Finally, delete the patient
    await db.delete(patients).where(eq(patients.id, id));
  }

  // Encounter management
  async getEncounter(id: number): Promise<Encounter | undefined> {
    const [encounter] = await db.select().from(encounters).where(eq(encounters.id, id));
    return encounter || undefined;
  }

  async getPatientEncounters(patientId: number): Promise<Encounter[]> {
    return await db.select().from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.startTime));
  }

  async createEncounter(insertEncounter: InsertEncounter): Promise<Encounter> {
    const [encounter] = await db
      .insert(encounters)
      .values(insertEncounter)
      .returning();
    return encounter;
  }

  async updateEncounter(id: number, updates: Partial<Encounter>): Promise<Encounter> {
    const [encounter] = await db
      .update(encounters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(encounters.id, id))
      .returning();
    return encounter;
  }

  // Vitals management
  async getPatientVitals(patientId: number): Promise<Vitals[]> {
    return await db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.measuredAt));
  }

  async getLatestVitals(patientId: number): Promise<Vitals | undefined> {
    const [latestVitals] = await db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.measuredAt))
      .limit(1);
    return latestVitals || undefined;
  }

  async createVitals(insertVitals: InsertVitals): Promise<Vitals> {
    const [vital] = await db
      .insert(vitals)
      .values(insertVitals)
      .returning();
    return vital;
  }

  // Patient chart data
  async getPatientAllergies(patientId: number): Promise<any[]> {
    return await db.select().from(allergies)
      .where(eq(allergies.patientId, patientId))
      .orderBy(desc(allergies.updatedAt));
  }

  async getPatientMedications(patientId: number): Promise<any[]> {
    return await db.select().from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.createdAt));
  }

  async getPatientDiagnoses(patientId: number): Promise<any[]> {
    return await db.select().from(diagnoses)
      .where(eq(diagnoses.patientId, patientId))
      .orderBy(desc(diagnoses.createdAt));
  }

  async getPatientFamilyHistory(patientId: number): Promise<any[]> {
    return await db.select().from(familyHistory)
      .where(eq(familyHistory.patientId, patientId))
      .orderBy(desc(familyHistory.updatedAt));
  }

  async getPatientMedicalHistory(patientId: number): Promise<any[]> {
    return await db.select().from(medicalHistory)
      .where(eq(medicalHistory.patientId, patientId))
      .orderBy(desc(medicalHistory.updatedAt));
  }

  async getPatientSocialHistory(patientId: number): Promise<any[]> {
    return await db.select().from(socialHistory)
      .where(eq(socialHistory.patientId, patientId))
      .orderBy(desc(socialHistory.updatedAt));
  }

  // Lab orders and results
  async getPatientLabOrders(patientId: number): Promise<any[]> {
    return await db.select().from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));
  }

  async getPatientLabResults(patientId: number): Promise<any[]> {
    return await db.select().from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(desc(labResults.receivedAt));
  }

  // Imaging orders and results
  async getPatientImagingOrders(patientId: number): Promise<any[]> {
    return await db.select().from(imagingOrders)
      .where(eq(imagingOrders.patientId, patientId))
      .orderBy(desc(imagingOrders.orderedAt));
  }

  async getPatientImagingResults(patientId: number): Promise<any[]> {
    return await db.select().from(imagingResults)
      .where(eq(imagingResults.patientId, patientId))
      .orderBy(desc(imagingResults.createdAt));
  }

  // Unified Orders management (for draft orders processing system)
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getPatientOrders(patientId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.patientId, patientId))
      .orderBy(desc(orders.createdAt));
  }

  async getPatientDraftOrders(patientId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(and(
        eq(orders.patientId, patientId),
        eq(orders.orderStatus, 'draft')
      ))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    // Clean the updates object to remove any timestamp strings that could cause issues
    const cleanedUpdates = { ...updates };
    
    // Remove any timestamp fields that might be invalid strings
    delete cleanedUpdates.createdAt;
    delete cleanedUpdates.updatedAt;
    delete cleanedUpdates.orderedAt;
    delete cleanedUpdates.approvedAt;
    
    const [order] = await db
      .update(orders)
      .set({
        ...cleanedUpdates,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async deleteAllPatientDraftOrders(patientId: number): Promise<void> {
    await db
      .delete(orders)
      .where(and(eq(orders.patientId, patientId), eq(orders.orderStatus, "draft")));
  }
}

export const storage = new DatabaseStorage();
