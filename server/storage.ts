import { 
  users, patients, encounters, vitals, medications, diagnoses,
  familyHistory, medicalHistory, socialHistory, allergies,
  labOrders, labResults, imagingOrders, imagingResults, orders,
  patientPhysicalFindings, medicalProblems,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Encounter, type InsertEncounter, type Vitals, type InsertVitals,
  type Order, type InsertOrder, type MedicalProblem, type InsertMedicalProblem,
  type Medication, type InsertMedication
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
  getAllUsers(): Promise<User[]>;
  
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
  getEncounterVitals(encounterId: number): Promise<Vitals[]>;
  createVitals(vitals: InsertVitals): Promise<Vitals>;
  updateVitals(id: number, updates: Partial<Vitals>): Promise<Vitals>;
  deleteVitals(id: number): Promise<void>;
  
  // Patient chart data
  getPatientAllergies(patientId: number): Promise<any[]>;
  // Enhanced medications methods
  getPatientMedications(patientId: number): Promise<Medication[]>;
  getPatientMedicationsEnhanced(patientId: number): Promise<Medication[]>;
  getMedicationById(id: number): Promise<Medication | undefined>;
  getPatientMedicationsByEncounter(encounterId: number): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, updates: Partial<Medication>): Promise<Medication>;
  deleteMedication(id: number): Promise<void>;
  getMedicationHistory(medicationId: number): Promise<any[]>;
  getDraftOrdersByEncounter(encounterId: number): Promise<Order[]>;
  getOrdersByEncounter(encounterId: number): Promise<Order[]>;
  getPatientDiagnoses(patientId: number): Promise<any[]>;
  createDiagnosis(diagnosis: any): Promise<any>;
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
  getDraftOrdersByEncounter(encounterId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  deleteAllPatientDraftOrders(patientId: number): Promise<void>;
  
  // Physical Findings management (GPT-driven persistent findings)
  getPatientPhysicalFindings(patientId: number): Promise<any[]>;
  getActivePhysicalFindings(patientId: number): Promise<any[]>;
  createPhysicalFinding(finding: any): Promise<any>;
  updatePhysicalFinding(id: number, updates: any): Promise<any>;
  markPhysicalFindingConfirmed(id: number, encounterId: number): Promise<void>;
  markPhysicalFindingContradicted(id: number, encounterId: number): Promise<void>;
  
  // Medical Problems management (Enhanced JSONB approach)
  getPatientMedicalProblems(patientId: number): Promise<MedicalProblem[]>;
  getMedicalProblem(id: number): Promise<MedicalProblem | undefined>;
  createMedicalProblem(problem: InsertMedicalProblem): Promise<MedicalProblem>;
  updateMedicalProblem(id: number, updates: Partial<MedicalProblem>): Promise<MedicalProblem>;
  deleteMedicalProblem(id: number): Promise<void>;
  getMedicalProblemVisitHistory(problemId: number): Promise<any[]>;
  
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
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
    console.log(`🗑️ [Storage] Starting cascading deletion for patient ${id}`);
    
    try {
      // Delete in proper order to handle foreign key constraints
      // Medications reference orders through source_order_id, so delete medications first
      
      // Delete patient-related data first
      await db.delete(vitals).where(eq(vitals.patientId, id));
      console.log(`🗑️ [Storage] Deleted vitals for patient ${id}`);
      
      await db.delete(allergies).where(eq(allergies.patientId, id));
      console.log(`🗑️ [Storage] Deleted allergies for patient ${id}`);
      
      await db.delete(medications).where(eq(medications.patientId, id)); // Delete before orders
      console.log(`🗑️ [Storage] Deleted medications for patient ${id}`);
      
      await db.delete(diagnoses).where(eq(diagnoses.patientId, id));
      console.log(`🗑️ [Storage] Deleted diagnoses for patient ${id}`);
      
      await db.delete(medicalProblems).where(eq(medicalProblems.patientId, id));
      console.log(`🗑️ [Storage] Deleted medical problems for patient ${id}`);
      
      await db.delete(familyHistory).where(eq(familyHistory.patientId, id));
      console.log(`🗑️ [Storage] Deleted family history for patient ${id}`);
      
      await db.delete(medicalHistory).where(eq(medicalHistory.patientId, id));
      console.log(`🗑️ [Storage] Deleted medical history for patient ${id}`);
      
      await db.delete(socialHistory).where(eq(socialHistory.patientId, id));
      console.log(`🗑️ [Storage] Deleted social history for patient ${id}`);
      
      await db.delete(labResults).where(eq(labResults.patientId, id));
      console.log(`🗑️ [Storage] Deleted lab results for patient ${id}`);
      
      await db.delete(labOrders).where(eq(labOrders.patientId, id));
      console.log(`🗑️ [Storage] Deleted lab orders for patient ${id}`);
      
      // Delete orders after medications (due to foreign key reference)
      await db.delete(orders).where(eq(orders.patientId, id));
      console.log(`🗑️ [Storage] Deleted orders for patient ${id}`);
      
      // Delete encounters (main foreign key constraint)
      await db.delete(encounters).where(eq(encounters.patientId, id));
      console.log(`🗑️ [Storage] Deleted encounters for patient ${id}`);
      
      // Finally, delete the patient
      await db.delete(patients).where(eq(patients.id, id));
      console.log(`✅ [Storage] Successfully deleted patient ${id}`);
      
    } catch (error) {
      console.error(`❌ [Storage] Failed to delete patient ${id}:`, error);
      throw error;
    }
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

  async getEncounterVitals(encounterId: number): Promise<Vitals[]> {
    return await db.select().from(vitals)
      .where(eq(vitals.encounterId, encounterId))
      .orderBy(desc(vitals.measuredAt));
  }

  async createVitals(insertVitals: InsertVitals): Promise<Vitals> {
    const [vital] = await db
      .insert(vitals)
      .values(insertVitals)
      .returning();
    return vital;
  }

  async updateVitals(id: number, updates: Partial<Vitals>): Promise<Vitals> {
    const [vital] = await db
      .update(vitals)
      .set(updates)
      .where(eq(vitals.id, id))
      .returning();
    return vital;
  }

  async deleteVitals(id: number): Promise<void> {
    await db.delete(vitals).where(eq(vitals.id, id));
  }

  // Patient chart data
  async getPatientAllergies(patientId: number): Promise<any[]> {
    return await db.select().from(allergies)
      .where(eq(allergies.patientId, patientId))
      .orderBy(desc(allergies.updatedAt));
  }

  async getPatientMedications(patientId: number): Promise<Medication[]> {
    return await db.select().from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.createdAt));
  }

  async getPatientMedicationsEnhanced(patientId: number): Promise<Medication[]> {
    const patientMedications = await db.select().from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.createdAt));
    
    return patientMedications;
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {

    
    const [newMedication] = await db.insert(medications)
      .values(medication)
      .returning();
    
    console.log(`✅ [STORAGE] Created medication with ID: ${newMedication.id}`);
    return newMedication;
  }

  async updateMedication(id: number, updates: Partial<Medication>): Promise<Medication> {

    
    const [updatedMedication] = await db.update(medications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(medications.id, id))
      .returning();
    
    console.log(`✅ [STORAGE] Updated medication: ${updatedMedication.medicationName}`);
    return updatedMedication;
  }

  async deleteMedication(id: number): Promise<void> {
    console.log(`🔍 [STORAGE] Deleting medication ID: ${id}`);
    
    await db.delete(medications)
      .where(eq(medications.id, id));
    
    console.log(`✅ [STORAGE] Deleted medication`);
  }

  async getMedicationHistory(medicationId: number): Promise<any[]> {
    console.log(`🔍 [STORAGE] Fetching medication history for ID: ${medicationId}`);
    
    const medication = await db.select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .limit(1);
    
    if (medication.length === 0) {
      return [];
    }
    
    return medication[0].medicationHistory || [];
  }

  async getMedicationById(id: number): Promise<Medication | undefined> {
    console.log(`🔍 [STORAGE] Fetching medication by ID: ${id}`);
    
    const [medication] = await db.select()
      .from(medications)
      .where(eq(medications.id, id));
    
    return medication || undefined;
  }

  async getPatientMedicationsByEncounter(encounterId: number): Promise<Medication[]> {
    console.log(`🔍 [STORAGE] Fetching medications by encounter ID: ${encounterId}`);
    
    return await db.select()
      .from(medications)
      .where(eq(medications.encounterId, encounterId))
      .orderBy(desc(medications.createdAt));
  }

  async getPatientDiagnoses(patientId: number): Promise<any[]> {
    return await db.select().from(diagnoses)
      .where(eq(diagnoses.patientId, patientId))
      .orderBy(desc(diagnoses.createdAt));
  }

  async createDiagnosis(insertDiagnosis: any): Promise<any> {
    const [diagnosis] = await db
      .insert(diagnoses)
      .values({
        ...insertDiagnosis,
        createdAt: new Date()
      })
      .returning();
    return diagnosis;
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
    // Track all order creation sources with detailed logging
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log(`🔍 [STORAGE] === ORDER CREATION TRACKING ===`);
    console.log(`🔍 [STORAGE] Time: ${timestamp}`);
    console.log(`🔍 [STORAGE] Called from: ${caller}`);
    console.log(`🔍 [STORAGE] Order Type: ${insertOrder.orderType}`);
    console.log(`🔍 [STORAGE] Patient: ${insertOrder.patientId}, Encounter: ${insertOrder.encounterId}`);
    console.log(`🔍 [STORAGE] Order Name: ${insertOrder.medicationName || insertOrder.labName || insertOrder.studyType || 'unknown'}`);
    console.log(`🔍 [STORAGE] Full Order Data:`, JSON.stringify(insertOrder, null, 2));
    console.log(`🔍 [STORAGE] ===============================`);
    
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    console.log(`✅ [STORAGE] Order created with ID: ${order.id} at ${timestamp}`);
    
    // Trigger medication processing automatically for medication orders
    if (insertOrder.orderType === 'medication') {
      console.log(`💊 [STORAGE] Triggering medication processing for new medication order`);
      try {
        // Import dynamically to avoid circular dependencies
        const { medicationDelta } = await import("./medication-delta-service.js");
        // Use setImmediate to run after current execution cycle completes
        setImmediate(async () => {
          try {
            await medicationDelta.processOrderDelta(insertOrder.patientId, insertOrder.encounterId || 0, 1);
            console.log(`✅ [STORAGE] Medication processing completed for order ${order.id}`);
          } catch (medicationError) {
            console.error(`❌ [STORAGE] Medication processing failed for order ${order.id}:`, medicationError);
          }
        });
      } catch (importError) {
        console.error(`❌ [STORAGE] Failed to import medication service:`, importError);
      }
    }
    
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
    // First, update any medications that reference this order to remove the reference
    await db
      .update(medications)
      .set({ sourceOrderId: null })
      .where(eq(medications.sourceOrderId, id));
    
    // Then delete the order
    await db.delete(orders).where(eq(orders.id, id));
  }

  async deleteOrderWithCascade(id: number): Promise<void> {
    console.log(`🗑️ [STORAGE] Deleting order ${id} with cascading deletion`);
    
    // Get the order first to check if it's a medication order
    const order = await this.getOrder(id);
    if (!order) {
      throw new Error("Order not found");
    }
    
    // If it's a medication order, delete linked medications first
    if (order.orderType === 'medication') {
      console.log(`🗑️ [STORAGE] Finding linked medications for medication order ${id}`);
      const linkedMedications = await this.getMedicationsByOrderId(id);
      
      console.log(`🗑️ [STORAGE] Found ${linkedMedications.length} linked medications to delete`);
      for (const medication of linkedMedications) {
        console.log(`🗑️ [STORAGE] Deleting medication ${medication.id} linked to order ${id}`);
        await this.deleteMedication(medication.id);
      }
      
      console.log(`🗑️ [STORAGE] Deleted ${linkedMedications.length} linked medications for order ${id}`);
    }
    
    // Delete the order
    console.log(`🗑️ [STORAGE] Deleting order ${id}`);
    await this.deleteOrder(id);
    console.log(`✅ [STORAGE] Successfully deleted order ${id} with cascade`);
  }

  async deleteAllPatientDraftOrders(patientId: number): Promise<void> {
    console.log(`🗑️ [STORAGE] Deleting all draft orders for patient ${patientId} with cascading deletion`);
    
    // Get all draft orders for this patient first
    const draftOrders = await db.select().from(orders)
      .where(and(eq(orders.patientId, patientId), eq(orders.orderStatus, "draft")));
    
    console.log(`🗑️ [STORAGE] Found ${draftOrders.length} draft orders to delete`);
    
    // Delete linked medications for medication orders
    let medicationsDeleted = 0;
    for (const order of draftOrders) {
      if (order.orderType === 'medication') {
        console.log(`🗑️ [STORAGE] Checking for linked medications for order ${order.id}`);
        const linkedMedications = await this.getMedicationsByOrderId(order.id);
        
        for (const medication of linkedMedications) {
          console.log(`🗑️ [STORAGE] Deleting linked medication ${medication.id} for order ${order.id}`);
          await this.deleteMedication(medication.id);
          medicationsDeleted++;
        }
      }
    }
    
    // Delete all draft orders
    await db
      .delete(orders)
      .where(and(eq(orders.patientId, patientId), eq(orders.orderStatus, "draft")));
    
    console.log(`✅ [STORAGE] Successfully deleted ${draftOrders.length} draft orders and ${medicationsDeleted} linked medications for patient ${patientId}`);
  }

  // Two-phase medication workflow support
  async getDraftOrdersByEncounter(encounterId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(and(
        eq(orders.encounterId, encounterId),
        eq(orders.orderStatus, "draft")
      ))
      .orderBy(orders.createdAt);
  }

  async getOrdersByEncounter(encounterId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.encounterId, encounterId))
      .orderBy(orders.createdAt);
  }

  async findPendingMedicationByOrder(patientId: number, orderId: number): Promise<any> {
    const medicationsList = await db.select().from(medications)
      .where(and(
        eq(medications.patientId, patientId),
        eq(medications.status, "pending")
      ));
    
    return medicationsList.find(med => med.sourceOrderId === orderId);
  }

  // Physical Findings management (GPT-driven persistent findings)
  async getPatientPhysicalFindings(patientId: number): Promise<any[]> {
    return await db.select().from(patientPhysicalFindings)
      .where(eq(patientPhysicalFindings.patientId, patientId))
      .orderBy(desc(patientPhysicalFindings.lastSeenEncounter));
  }

  async getActivePhysicalFindings(patientId: number): Promise<any[]> {
    return await db.select().from(patientPhysicalFindings)
      .where(
        and(
          eq(patientPhysicalFindings.patientId, patientId),
          eq(patientPhysicalFindings.status, "active")
        )
      )
      .orderBy(desc(patientPhysicalFindings.confidence));
  }

  async createPhysicalFinding(finding: any): Promise<any> {
    const [created] = await db.insert(patientPhysicalFindings)
      .values(finding)
      .returning();
    return created;
  }

  async updatePhysicalFinding(id: number, updates: any): Promise<any> {
    const [updated] = await db.update(patientPhysicalFindings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patientPhysicalFindings.id, id))
      .returning();
    return updated;
  }

  async markPhysicalFindingConfirmed(id: number, encounterId: number): Promise<void> {
    const current = await db.select({ confirmedCount: patientPhysicalFindings.confirmedCount })
      .from(patientPhysicalFindings)
      .where(eq(patientPhysicalFindings.id, id));
    
    if (current.length > 0) {
      await db.update(patientPhysicalFindings)
        .set({
          confirmedCount: current[0].confirmedCount + 1,
          lastConfirmedEncounter: encounterId,
          lastSeenEncounter: encounterId,
          updatedAt: new Date()
        })
        .where(eq(patientPhysicalFindings.id, id));
    }
  }

  async markPhysicalFindingContradicted(id: number, encounterId: number): Promise<void> {
    const current = await db.select({ contradictedCount: patientPhysicalFindings.contradictedCount })
      .from(patientPhysicalFindings)
      .where(eq(patientPhysicalFindings.id, id));
    
    if (current.length > 0) {
      await db.update(patientPhysicalFindings)
        .set({
          contradictedCount: current[0].contradictedCount + 1,
          lastSeenEncounter: encounterId,
          updatedAt: new Date()
        })
        .where(eq(patientPhysicalFindings.id, id));
    }
  }

  // Medical Problems management (Enhanced JSONB approach)
  async getPatientMedicalProblems(patientId: number): Promise<MedicalProblem[]> {
    return await db.select().from(medicalProblems).where(eq(medicalProblems.patientId, patientId));
  }

  async getMedicalProblem(id: number): Promise<MedicalProblem | undefined> {
    const [problem] = await db.select().from(medicalProblems).where(eq(medicalProblems.id, id));
    return problem || undefined;
  }

  async createMedicalProblem(problem: InsertMedicalProblem): Promise<MedicalProblem> {
    const [created] = await db.insert(medicalProblems).values(problem).returning();
    return created;
  }

  async updateMedicalProblem(id: number, updates: Partial<MedicalProblem>): Promise<MedicalProblem> {
    const [updated] = await db.update(medicalProblems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(medicalProblems.id, id))
      .returning();
    return updated;
  }

  async deleteMedicalProblem(id: number): Promise<void> {
    await db.delete(medicalProblems).where(eq(medicalProblems.id, id));
  }

  async getMedicalProblemVisitHistory(problemId: number): Promise<any[]> {
    const [problem] = await db.select({ visitHistory: medicalProblems.visitHistory })
      .from(medicalProblems)
      .where(eq(medicalProblems.id, problemId));
    return (problem?.visitHistory as any[]) || [];
  }

  // Medication synchronization methods
  async getMedicationsByOrderId(orderId: number): Promise<Medication[]> {
    return await db.select().from(medications).where(eq(medications.sourceOrderId, orderId));
  }
}

export const storage = new DatabaseStorage();
