import { 
  users, patients, encounters, vitals, medications, diagnoses,
  familyHistory, medicalHistory, socialHistory, surgicalHistory, allergies,
  labOrders, labResults, imagingOrders, imagingResults, orders,
  patientPhysicalFindings, medicalProblems, externalLabs, patientOrderPreferences,
  signedOrders, gptLabReviewNotes, patientAttachments, attachmentExtractedContent, documentProcessingQueue,
  userNoteTemplates, templateShares, templateVersions, userNotePreferences, adminPromptReviews,
  healthSystems, organizations, locations, userLocations, userSessionLocations,
  phiAccessLogs, authenticationLogs,
  appointments, schedulingAiFactors, schedulingAiWeights, patientSchedulingPatterns,
  providerSchedulingPatterns, appointmentDurationHistory, schedulingTemplates,
  appointmentTypes, schedulePreferences, asymmetricSchedulingConfig,
  realtimeScheduleStatus, schedulingResources, resourceBookings,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Encounter, type InsertEncounter, type Vitals,
  type Order, type InsertOrder, type MedicalProblem, type InsertMedicalProblem,
  type Medication, type InsertMedication, type PatientOrderPreferences, type InsertPatientOrderPreferences,
 
  type SelectTemplateShare, type InsertTemplateShare,
  type SelectUserNotePreferences, type InsertUserNotePreferences,
  type AdminPromptReview, type InsertAdminPromptReview,
  type Appointment, type InsertAppointment,
  // Blog/Article System
  articles, articleRevisions, articleComments, articleGenerationQueue, newsletterSubscribers,
  type Article, type InsertArticle, type ArticleRevision, type InsertArticleRevision,
  type ArticleComment, type InsertArticleComment, type ArticleGenerationQueue, type InsertArticleGenerationQueue,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  // Removed orphaned UserPreferences imports - now handled via auth.ts
} from "@shared/schema";
import { db } from "./db.js";
import { eq, desc, and, sql, gte, lte, or, inArray, notInArray, ne, lt, gt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  // Location management
  getUserLocations(userId: number): Promise<any[]>;
  getLocation(id: number): Promise<any>;
  getHealthSystemLocations(healthSystemId: number): Promise<any[]>;
  setUserSessionLocation(userId: number, locationId: number, rememberSelection?: boolean): Promise<void>;
  getUserSessionLocation(userId: number): Promise<any>;
  clearUserSessionLocation(userId: number): Promise<void>;
  getRememberedLocation(userId: number): Promise<any>;
  
  // User preferences management (note: now handled via getUserNotePreferences in auth.ts)
  
  // Patient management - now with tenant isolation
  getPatient(id: number, healthSystemId: number): Promise<Patient | undefined>;
  getPatientByMrn(mrn: string, healthSystemId: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getAllPatients(healthSystemId: number): Promise<Patient[]>;
  searchPatients(query: string, healthSystemId: number): Promise<Patient[]>;
  deletePatient(id: number, healthSystemId: number): Promise<void>;
  
  // Encounter management
  getEncounter(id: number): Promise<Encounter | undefined>;
  getPatientEncounters(patientId: number): Promise<Encounter[]>;
  createEncounter(encounter: InsertEncounter): Promise<Encounter>;
  updateEncounter(id: number, updates: Partial<Encounter>): Promise<Encounter>;
  
  // Vitals management
  getPatientVitals(patientId: number): Promise<Vitals[]>;
  getLatestVitals(patientId: number): Promise<Vitals | undefined>;
  getEncounterVitals(encounterId: number): Promise<Vitals[]>;
  createVitals(vitals: Partial<Vitals>): Promise<Vitals>;
  updateVitals(id: number, updates: Partial<Vitals>): Promise<Vitals>;
  deleteVitals(id: number): Promise<void>;
  
  // Patient chart data
  getPatientAllergies(patientId: number): Promise<any[]>;
  // Medications methods
  getPatientMedications(patientId: number): Promise<Medication[]>;
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
  getPatientSurgicalHistory(patientId: number): Promise<any[]>;
  
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
  
  // Appointment and scheduling management
  getAppointments(params: {
    healthSystemId: number;
    startDate: Date;
    endDate: Date;
    providerId?: number;
    locationId?: number;
    patientId?: number;
  }): Promise<any[]>;
  createAppointment(data: any): Promise<Appointment>;
  updateAppointment(appointmentId: number, data: any, healthSystemId: number): Promise<Appointment | null>;
  getAppointmentById(appointmentId: number, healthSystemId: number): Promise<any>;
  deleteAppointment(appointmentId: number, healthSystemId: number): Promise<void>;
  getProvidersByHealthSystem(healthSystemId: number, locationId?: number): Promise<any[]>;
  getRealtimeScheduleStatus(providerId: number, date: Date): Promise<any>;
  predictAppointmentDuration(params: any): Promise<any>;
  getSchedulePreferences(providerId: number): Promise<any>;
  updateSchedulePreferences(providerId: number, data: any): Promise<any>;
  getAppointmentTypes(healthSystemId: number, locationId?: number): Promise<any[]>;
  getSchedulingAiFactors(): Promise<any[]>;
  updateAiFactorWeight(params: any): Promise<any>;
  
  // Recording Metadata
  saveRecordingMetadata(data: {
    userId: number;
    patientId: number;
    duration: number;
    startTime: Date;
    endTime: Date;
  }): Promise<void>;
  
  // Blog/Article System
  getArticles(params: {
    status?: string;
    category?: string;
    targetAudience?: string;
    limit?: number;
    offset?: number;
  }): Promise<Article[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, updates: Partial<Article>): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
  incrementArticleViews(id: number): Promise<void>;
  
  // Article Revisions
  getArticleRevisions(articleId: number): Promise<ArticleRevision[]>;
  createArticleRevision(revision: InsertArticleRevision): Promise<ArticleRevision>;
  
  // Article Comments
  getArticleComments(articleId: number, approved?: boolean): Promise<ArticleComment[]>;
  createArticleComment(comment: InsertArticleComment): Promise<ArticleComment>;
  updateArticleComment(id: number, updates: Partial<ArticleComment>): Promise<ArticleComment>;
  deleteArticleComment(id: number): Promise<void>;
  
  // Article Generation Queue
  getArticleGenerationQueue(status?: string): Promise<ArticleGenerationQueue[]>;
  createArticleGenerationQueueItem(item: InsertArticleGenerationQueue): Promise<ArticleGenerationQueue>;
  updateArticleGenerationQueueItem(id: number, updates: Partial<ArticleGenerationQueue>): Promise<ArticleGenerationQueue>;
  
  // Newsletter Subscribers
  getNewsletterSubscribers(unsubscribed?: boolean): Promise<NewsletterSubscriber[]>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  updateNewsletterSubscriber(id: number, updates: Partial<NewsletterSubscriber>): Promise<NewsletterSubscriber>;
  unsubscribeNewsletter(email: string): Promise<void>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: number): Promise<User & { healthSystemName?: string } | undefined> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(healthSystems, eq(users.healthSystemId, healthSystems.id))
      .where(eq(users.id, id));
    
    if (!result || result.length === 0) return undefined;
    
    const { users: user, health_systems: healthSystem } = result[0];
    
    return {
      ...user,
      healthSystemName: healthSystem?.name
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`LOWER(${users.username}) = LOWER(${username})`
    );
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByNPI(npi: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.npi, npi));
    return user || undefined;
  }

  async updateUserProfile(
    userId: number,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      credentials?: string;
      npi?: string | null;
    }
  ): Promise<User & { healthSystemName?: string }> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...(updates.firstName !== undefined && { firstName: updates.firstName }),
        ...(updates.lastName !== undefined && { lastName: updates.lastName }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.credentials !== undefined && { credentials: updates.credentials }),
        ...(updates.npi !== undefined && { npi: updates.npi }),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Fetch the full user data with health system name
    const fullUser = await this.getUser(userId);
    if (!fullUser) {
      throw new Error(`Could not fetch updated user with id ${userId}`);
    }
    
    return fullUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([insertUser])
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // Location management
  async getHealthSystemLocations(healthSystemId: number): Promise<any[]> {
    const locationsList = await db
      .select({
        id: locations.id,
        name: locations.name,
        shortName: locations.shortName,
        locationType: locations.locationType,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zipCode: locations.zipCode,
        phone: locations.phone,
        services: locations.services,
        organizationName: organizations.name,
        healthSystemName: healthSystems.name
      })
      .from(locations)
      .leftJoin(organizations, eq(locations.organizationId, organizations.id))
      .leftJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id))
      .where(eq(locations.healthSystemId, healthSystemId))
      .orderBy(locations.name);
    
    return locationsList;
  }

  async getLocation(id: number): Promise<any> {
    const [location] = await db
      .select({
        id: locations.id,
        name: locations.name,
        shortName: locations.shortName,
        locationType: locations.locationType,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zipCode: locations.zipCode,
        phone: locations.phone,
        services: locations.services,
        organizationId: locations.organizationId,
        healthSystemId: locations.healthSystemId
      })
      .from(locations)
      .where(eq(locations.id, id));
    
    return location;
  }

  async getUserLocations(userId: number): Promise<any[]> {
    const userLocationsList = await db
      .select({
        id: userLocations.id,
        userId: userLocations.userId,
        locationId: userLocations.locationId,
        roleAtLocation: userLocations.roleAtLocation,
        isPrimary: userLocations.isPrimary,
        canSchedule: userLocations.canSchedule,
        canViewAllPatients: userLocations.canViewAllPatients,
        canCreateOrders: userLocations.canCreateOrders,
        locationName: locations.name,
        locationShortName: locations.shortName,
        locationType: locations.locationType,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zipCode: locations.zipCode,
        phone: locations.phone,
        services: locations.services,
        organizationName: organizations.name,
        healthSystemName: healthSystems.name
      })
      .from(userLocations)
      .leftJoin(locations, eq(userLocations.locationId, locations.id))
      .leftJoin(organizations, eq(locations.organizationId, organizations.id))
      .leftJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id))
      .where(eq(userLocations.userId, userId))
      .orderBy(userLocations.isPrimary);
    
    return userLocationsList;
  }

  async setUserSessionLocation(userId: number, locationId: number, rememberSelection = false): Promise<void> {
    // Clear any existing active session location for this user
    await db
      .update(userSessionLocations)
      .set({ isActive: false })
      .where(eq(userSessionLocations.userId, userId));

    // Create new session location (no conflict handling needed since we cleared previous)
    await db
      .insert(userSessionLocations)
      .values([{
        userId,
        locationId,
        selectedAt: new Date(),
        isActive: true,
        rememberSelection
      }]);
  }

  async getUserSessionLocation(userId: number): Promise<any> {
    const [sessionLocation] = await db
      .select({
        userId: userSessionLocations.userId,
        locationId: userSessionLocations.locationId,
        selectedAt: userSessionLocations.selectedAt,
        isActive: userSessionLocations.isActive,
        rememberSelection: userSessionLocations.rememberSelection,
        locationName: locations.name,
        locationShortName: locations.shortName,
        locationType: locations.locationType,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        organizationName: organizations.name,
        healthSystemName: healthSystems.name
      })
      .from(userSessionLocations)
      .leftJoin(locations, eq(userSessionLocations.locationId, locations.id))
      .leftJoin(organizations, eq(locations.organizationId, organizations.id))
      .leftJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id))
      .where(and(
        eq(userSessionLocations.userId, userId),
        eq(userSessionLocations.isActive, true)
      ))
      .orderBy(desc(userSessionLocations.selectedAt))
      .limit(1);

    return sessionLocation;
  }

  async clearUserSessionLocation(userId: number): Promise<void> {
    await db
      .update(userSessionLocations)
      .set({ isActive: false })
      .where(eq(userSessionLocations.userId, userId));
  }

  async getRememberedLocation(userId: number): Promise<any> {
    // Get the most recent location where rememberSelection was true
    const [rememberedLocation] = await db
      .select({
        userId: userSessionLocations.userId,
        locationId: userSessionLocations.locationId,
        rememberSelection: userSessionLocations.rememberSelection,
        selectedAt: userSessionLocations.selectedAt
      })
      .from(userSessionLocations)
      .where(and(
        eq(userSessionLocations.userId, userId),
        eq(userSessionLocations.rememberSelection, true)
      ))
      .orderBy(desc(userSessionLocations.selectedAt))
      .limit(1);

    return rememberedLocation;
  }

  // Health System management
  async getHealthSystem(id: number): Promise<any> {
    const [healthSystem] = await db
      .select({
        id: healthSystems.id,
        name: healthSystems.name,
        systemType: healthSystems.systemType,
        subscriptionTier: healthSystems.subscriptionTier,
        subscriptionStatus: healthSystems.subscriptionStatus,
        subscriptionStartDate: healthSystems.subscriptionStartDate,
        subscriptionEndDate: healthSystems.subscriptionEndDate,
      })
      .from(healthSystems)
      .where(eq(healthSystems.id, id));
    
    return healthSystem;
  }

  // User preferences management removed - now handled via getUserNotePreferences in auth.ts

  // Patient management - with tenant isolation
  async getPatient(id: number, healthSystemId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients)
      .where(and(
        eq(patients.id, id),
        eq(patients.healthSystemId, healthSystemId)
      ));
    return patient || undefined;
  }

  async getPatientByMrn(mrn: string, healthSystemId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients)
      .where(and(
        eq(patients.mrn, mrn),
        eq(patients.healthSystemId, healthSystemId)
      ));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    // healthSystemId must be included in insertPatient
    if (!insertPatient.healthSystemId) {
      throw new Error("healthSystemId is required for patient creation");
    }
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async getAllPatients(healthSystemId: number): Promise<Patient[]> {
    return await db.select().from(patients)
      .where(eq(patients.healthSystemId, healthSystemId))
      .orderBy(desc(patients.createdAt));
  }

  async searchPatients(query: string, healthSystemId: number): Promise<Patient[]> {
    return await db.select().from(patients)
      .where(and(
        eq(patients.healthSystemId, healthSystemId),
        // Simple text search - in production you'd use full-text search
        // This is a basic implementation for demonstration
        eq(patients.mrn, query)
      ))
      .orderBy(desc(patients.createdAt));
  }

  async deletePatient(id: number, healthSystemId: number): Promise<void> {
    console.log(`🗑️ [Storage] Starting cascading deletion for patient ${id} in health system ${healthSystemId}`);
    
    // First verify the patient belongs to this health system
    const patient = await this.getPatient(id, healthSystemId);
    if (!patient) {
      throw new Error(`Patient ${id} not found in health system ${healthSystemId}`);
    }
    
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
      
      await db.delete(surgicalHistory).where(eq(surgicalHistory.patientId, id));
      console.log(`🗑️ [Storage] Deleted surgical history for patient ${id}`);
      
      await db.delete(labResults).where(eq(labResults.patientId, id));
      console.log(`🗑️ [Storage] Deleted lab results for patient ${id}`);
      
      // Delete GPT lab review notes before lab orders
      await db.delete(gptLabReviewNotes).where(eq(gptLabReviewNotes.patientId, id));
      console.log(`🗑️ [Storage] Deleted GPT lab review notes for patient ${id}`);
      
      await db.delete(labOrders).where(eq(labOrders.patientId, id));
      console.log(`🗑️ [Storage] Deleted lab orders for patient ${id}`);
      
      // Delete signed orders before deleting orders (foreign key constraint)
      await db.delete(signedOrders).where(eq(signedOrders.patientId, id));
      console.log(`🗑️ [Storage] Deleted signed orders for patient ${id}`);
      
      // Delete orders after medications (due to foreign key reference)
      await db.delete(orders).where(eq(orders.patientId, id));
      console.log(`🗑️ [Storage] Deleted orders for patient ${id}`);
      
      // Delete patient order preferences
      await db.delete(patientOrderPreferences).where(eq(patientOrderPreferences.patientId, id));
      console.log(`🗑️ [Storage] Deleted patient order preferences for patient ${id}`);
      
      // Delete imaging results BEFORE imaging orders (foreign key constraint)
      await db.delete(imagingResults).where(eq(imagingResults.patientId, id));
      console.log(`🗑️ [Storage] Deleted imaging results for patient ${id}`);
      
      // Delete imaging orders after imaging results
      await db.delete(imagingOrders).where(eq(imagingOrders.patientId, id));
      console.log(`🗑️ [Storage] Deleted imaging orders for patient ${id}`);
      
      // Delete attachment-related data before encounters
      // First get all attachment IDs for this patient
      const patientAttachmentIds = await db.select({ id: patientAttachments.id })
        .from(patientAttachments)
        .where(eq(patientAttachments.patientId, id));
      
      // Delete attachment extracted content
      for (const attachment of patientAttachmentIds) {
        await db.delete(attachmentExtractedContent).where(eq(attachmentExtractedContent.attachmentId, attachment.id));
      }
      console.log(`🗑️ [Storage] Deleted attachment extracted content for patient ${id}`);
      
      // Delete document processing queue entries
      for (const attachment of patientAttachmentIds) {
        await db.delete(documentProcessingQueue).where(eq(documentProcessingQueue.attachmentId, attachment.id));
      }
      console.log(`🗑️ [Storage] Deleted document processing queue for patient ${id}`);
      
      // Finally delete patient attachments
      await db.delete(patientAttachments).where(eq(patientAttachments.patientId, id));
      console.log(`🗑️ [Storage] Deleted patient attachments for patient ${id}`);
      
      // Delete encounters (main foreign key constraint)
      await db.delete(encounters).where(eq(encounters.patientId, id));
      console.log(`🗑️ [Storage] Deleted encounters for patient ${id}`);
      
      // Delete PHI access logs before deleting patient (HIPAA audit logs)
      await db.delete(phiAccessLogs).where(eq(phiAccessLogs.patientId, id));
      console.log(`🗑️ [Storage] Deleted PHI access logs for patient ${id}`);
      
      // Delete patient scheduling patterns (appointments AI data)
      await db.delete(patientSchedulingPatterns).where(eq(patientSchedulingPatterns.patientId, id));
      console.log(`🗑️ [Storage] Deleted patient scheduling patterns for patient ${id}`);
      
      // Delete appointments
      await db.delete(appointments).where(eq(appointments.patientId, id));
      console.log(`🗑️ [Storage] Deleted appointments for patient ${id}`);
      
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
      .orderBy(desc(vitals.recordedAt));
  }

  async getLatestVitals(patientId: number): Promise<Vitals | undefined> {
    const [latestVitals] = await db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.recordedAt))
      .limit(1);
    return latestVitals || undefined;
  }

  async getEncounterVitals(encounterId: number): Promise<Vitals[]> {
    return await db.select().from(vitals)
      .where(eq(vitals.encounterId, encounterId))
      .orderBy(desc(vitals.recordedAt));
  }

  async getVitalsByEncounter(encounterId: number) {
    return await db.select().from(vitals).where(eq(vitals.encounterId, encounterId));
  }

  async getVitalsByPatient(patientId: number) {
    return await db.select().from(vitals).where(eq(vitals.patientId, patientId));
  }

  async getVitalsEntry(id: number) {
    const [result] = await db.select().from(vitals).where(eq(vitals.id, id));
    return result;
  }

  async createVitalsEntry(data: any) {
    console.log("[Storage.createVitalsEntry] Input data:", JSON.stringify(data, null, 2));
    
    const insertData = {
      ...data,
      recordedAt: data.recordedAt || new Date()
    };
    
    console.log("[Storage.createVitalsEntry] Data to insert:", JSON.stringify(insertData, null, 2));
    console.log("[Storage.createVitalsEntry] Data types:", {
      patientId: typeof insertData.patientId,
      encounterId: typeof insertData.encounterId,
      recordedAt: typeof insertData.recordedAt,
      recordedBy: typeof insertData.recordedBy,
      enteredBy: typeof insertData.enteredBy,
      entryType: typeof insertData.entryType
    });
    
    try {
      const [result] = await db.insert(vitals).values(insertData).returning();
      console.log("[Storage.createVitalsEntry] Insert successful, result ID:", result.id);
      return result;
    } catch (error) {
      console.error("[Storage.createVitalsEntry] Insert failed:", error);
      console.error("[Storage.createVitalsEntry] SQL parameter details:", {
        param1: insertData.patientId,
        param2: insertData.encounterId,
        param3: insertData.recordedAt,
        param4: insertData.recordedBy,
        param5: insertData.entryType
      });
      throw error;
    }
  }

  async updateVitalsEntry(id: number, data: any) {
    const [result] = await db.update(vitals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vitals.id, id))
      .returning();
    return result;
  }

  async deleteVitalsEntry(id: number) {
    const [result] = await db.delete(vitals).where(eq(vitals.id, id)).returning();
    return result;
  }

  async createVitals(insertVitals: Partial<Vitals>): Promise<Vitals> {
    const [vital] = await db
      .insert(vitals)
      .values(insertVitals as any)
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
    
    return (medication[0].medicationHistory as any[]) || [];
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
    const results = await db.select().from(diagnoses)
      .where(eq(diagnoses.patientId, patientId))
      .orderBy(desc(diagnoses.createdAt));
    
    // Map the database fields to expected format for CPT extraction
    return results.map(d => ({
      ...d,
      diagnosis: d.diagnosis_description || d.diagnosis_code, // Use description first, fallback to code
    }));
  }

  async createDiagnosis(insertDiagnosis: any): Promise<any> {
    const [diagnosis] = await db
      .insert(diagnoses)
      .values([{
        ...insertDiagnosis,
        createdAt: new Date(),
        updatedAt: new Date()
      }])
      .returning();
    return diagnosis;
  }

  // Enhanced RCM methods for billing workflow
  async updateDiagnosisRCMStatus(diagnosisId: number, updates: {
    claimSubmissionStatus?: string;
    claimId?: string;
    clearinghouseId?: string;
    payerId?: string;
    allowedAmount?: number;
    paidAmount?: number;
    patientResponsibility?: number;
    adjustmentAmount?: number;
    denialReason?: string;
    denialCode?: string;
    appealStatus?: string;
    appealDeadline?: string;
    billingNotes?: string;
    lastBillingAction?: string;
    assignedBiller?: number;
    modifierApplied?: string;
  }): Promise<any> {
    // Map to actual column names in database
    const dbUpdates: any = {
      ...updates,
      updatedAt: new Date(),
      billing_action_date: new Date()
    };
    
    // Map to snake_case column names
    if (updates.claimSubmissionStatus) dbUpdates.claim_submission_status = updates.claimSubmissionStatus;
    if (updates.claimId) dbUpdates.claim_id = updates.claimId;
    if (updates.clearinghouseId) dbUpdates.clearinghouse_id = updates.clearinghouseId;
    if (updates.payerId) dbUpdates.payer_id = updates.payerId;
    if (updates.allowedAmount) dbUpdates.allowed_amount = updates.allowedAmount;
    if (updates.paidAmount) dbUpdates.paid_amount = updates.paidAmount;
    if (updates.patientResponsibility) dbUpdates.patient_responsibility = updates.patientResponsibility;
    if (updates.adjustmentAmount) dbUpdates.adjustment_amount = updates.adjustmentAmount;
    if (updates.denialReason) dbUpdates.denial_reason = updates.denialReason;
    if (updates.denialCode) dbUpdates.denial_code = updates.denialCode;
    if (updates.appealStatus) dbUpdates.appeal_status = updates.appealStatus;
    if (updates.appealDeadline) dbUpdates.appeal_deadline = updates.appealDeadline;
    if (updates.billingNotes) dbUpdates.billing_notes = updates.billingNotes;
    if (updates.lastBillingAction) dbUpdates.last_billing_action = updates.lastBillingAction;
    if (updates.assignedBiller) dbUpdates.assigned_biller = updates.assignedBiller;
    if (updates.modifierApplied) dbUpdates.modifier_applied = updates.modifierApplied;
    
    delete dbUpdates.claimSubmissionStatus;
    delete dbUpdates.claimId;
    delete dbUpdates.clearinghouseId;
    delete dbUpdates.payerId;
    delete dbUpdates.allowedAmount;
    delete dbUpdates.paidAmount;
    delete dbUpdates.patientResponsibility;
    delete dbUpdates.adjustmentAmount;
    delete dbUpdates.denialReason;
    delete dbUpdates.denialCode;
    delete dbUpdates.appealStatus;
    delete dbUpdates.appealDeadline;
    delete dbUpdates.billingNotes;
    delete dbUpdates.lastBillingAction;
    delete dbUpdates.assignedBiller;
    delete dbUpdates.modifierApplied;
    delete dbUpdates.billingActionDate;
    
    const [updatedDiagnosis] = await db
      .update(diagnoses)
      .set(dbUpdates)
      .where(eq(diagnoses.id, diagnosisId))
      .returning();
    return updatedDiagnosis;
  }

  async getDiagnosesForClaims(status?: string): Promise<any[]> {
    const query = db.select().from(diagnoses);
    
    if (status) {
      // Use raw SQL for now since column doesn't exist in schema
      const result = await db.execute(sql`SELECT * FROM diagnoses WHERE claim_submission_status = ${status} ORDER BY updated_at DESC`);
      return result.rows as any[];
    }
    
    return await query.orderBy(desc(diagnoses.updatedAt));
  }

  async getDiagnosesByPayer(payerId: string): Promise<any[]> {
    // Use raw SQL for now since column doesn't exist in schema
    const result = await db.execute(sql`SELECT * FROM diagnoses WHERE payer_id = ${payerId} ORDER BY updated_at DESC`);
    return result.rows as any[];
  }

  async getPatientFamilyHistory(patientId: number): Promise<any[]> {
    return await db.select().from(familyHistory)
      .where(eq(familyHistory.patientId, patientId))
      .orderBy(desc(familyHistory.updatedAt));
  }

  async createFamilyHistory(data: any): Promise<any> {
    const [created] = await db.insert(familyHistory).values(data).returning();
    return created;
  }

  async updateFamilyHistory(id: number, data: any): Promise<any> {
    const [updated] = await db.update(familyHistory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyHistory.id, id))
      .returning();
    return updated;
  }

  async deleteFamilyHistory(id: number): Promise<void> {
    await db.delete(familyHistory).where(eq(familyHistory.id, id));
  }

  async addFamilyHistoryVisitHistory(familyHistoryId: number, visitEntry: any): Promise<void> {
    // Get current visit history
    const [current] = await db.select({ visitHistory: familyHistory.visitHistory })
      .from(familyHistory)
      .where(eq(familyHistory.id, familyHistoryId));
    
    const currentVisitHistory = current?.visitHistory || [];
    const newVisitHistory = [...currentVisitHistory, visitEntry];
    
    await db.update(familyHistory)
      .set({ 
        visitHistory: newVisitHistory,
        updatedAt: new Date()
      })
      .where(eq(familyHistory.id, familyHistoryId));
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

  async getPatientSurgicalHistory(patientId: number): Promise<any[]> {
    return await db.select().from(surgicalHistory)
      .where(eq(surgicalHistory.patientId, patientId))
      .orderBy(desc(surgicalHistory.procedureDate));
  }

  // Lab orders and results - Enhanced for production EMR
  async getPatientLabOrders(patientId: number): Promise<any[]> {
    return await db
      .select({
        id: labOrders.id,
        testCode: labOrders.testCode,
        testName: labOrders.testName,
        priority: labOrders.priority,
        orderStatus: labOrders.orderStatus,
        orderedAt: labOrders.orderedAt,
        clinicalIndication: labOrders.clinicalIndication,
        specimenType: labOrders.specimenType,
        fastingRequired: labOrders.fastingRequired,
        
        // Provider info
        orderedByName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        
        // Status tracking
        acknowledgedAt: labOrders.acknowledgedAt,
      })
      .from(labOrders)
      .leftJoin(users, eq(labOrders.orderedBy, users.id))
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.orderedAt));
  }

  /**
   * BASIC LAB RESULTS ENDPOINT - Use for simple displays and fast loading
   * 
   * Features:
   * - Basic result data only
   * - Fast query performance
   * - Essential fields for display
   * 
   * Use cases: Lab result matrices, quick patient overviews, encounter summaries
   * Performance: Fast due to minimal joins
   * 
   * For comprehensive clinical review, use /api/patients/:patientId/lab-results-enhanced
   */
  async getPatientLabResults(patientId: number): Promise<any[]> {
    console.log(`🔍 [Storage] getPatientLabResults called for patient ${patientId}`);
    
    // First, let's check if any lab results exist at all in the database
    const allLabResults = await db.select({ count: sql<number>`count(*)` }).from(labResults);
    console.log(`🔍 [Storage] Total lab results in database: ${allLabResults[0]?.count || 0}`);
    
    // Check if any results exist for this specific patient
    const patientResultsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .where(eq(labResults.patientId, patientId));
    console.log(`🔍 [Storage] Lab results for patient ${patientId}: ${patientResultsCount[0]?.count || 0}`);
    
    const results = await db
      .select({
        id: labResults.id,
        labOrderId: labResults.labOrderId,
        testCode: labResults.testCode,
        testName: labResults.testName,
        resultValue: labResults.resultValue,
        resultUnits: labResults.resultUnits,
        referenceRange: labResults.referenceRange,
        abnormalFlag: labResults.abnormalFlag,
        
        // Timing
        specimenCollectedAt: labResults.specimenCollectedAt,
        resultAvailableAt: labResults.resultAvailableAt,
        receivedAt: labResults.receivedAt,
        
        // Status and review
        resultStatus: labResults.resultStatus,
        reviewedBy: labResults.reviewedBy,
        reviewedAt: labResults.reviewedAt,
        providerNotes: labResults.providerNotes,
        
        // Order context (null for attachment-extracted results)
        orderPriority: labOrders.priority,
        clinicalIndication: labOrders.clinicalIndication,
        orderedAt: labOrders.orderedAt,
        orderedByName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        
        // Attachment source tracking
        extractedFromAttachmentId: labResults.extractedFromAttachmentId,
        sourceType: labResults.sourceType,
        sourceConfidence: labResults.sourceConfidence,
      })
      .from(labResults)
      .leftJoin(labOrders, eq(labResults.labOrderId, labOrders.id)) // FIXED: leftJoin to include attachment results
      .leftJoin(users, eq(labOrders.orderedBy, users.id))
      .where(eq(labResults.patientId, patientId))
      .orderBy(desc(labResults.resultAvailableAt));
    
    console.log(`🔍 [Storage] Query returned ${results.length} lab results`);
    console.log(`🔍 [Storage] Sample result:`, results[0] ? {
      testName: results[0].testName,
      resultValue: results[0].resultValue,
      labOrderId: results[0].labOrderId,
      extractedFromAttachmentId: results[0].extractedFromAttachmentId,
      sourceType: results[0].sourceType,
      sourceConfidence: results[0].sourceConfidence
    } : 'No results found');
    
    return results;
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
        sql`${orders.orderStatus} IN ('draft', 'pending')`
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
      .values([{
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      }])
      .returning();
      
    console.log(`✅ [STORAGE] Order created with ID: ${order.id} at ${timestamp}`);
    
    // For medication orders, trigger medication processing
    if (order.orderType === "medication" && order.encounterId) {
      console.log(
        `💊 [STORAGE] Triggering medication processing for new medication order ${order.id}`,
      );
      try {
        const { medicationDelta } = await import(
          "./medication-delta-service.js"
        );
        
        // Get the providerId from the encounter
        const encounter = await this.getEncounter(order.encounterId);
        const providerId = encounter?.providerId;
        
        await medicationDelta.processOrderDelta(
          order.patientId,
          order.encounterId,
          providerId || (order as any).providerId,
        );
        console.log(
          `✅ [STORAGE] Medication processing completed for order ${order.id}`,
        );
      } catch (medicationError) {
        console.error(
          `❌ [STORAGE] Medication processing failed for order ${order.id}:`,
          medicationError,
        );
        // Don't fail the order creation if medication processing fails
      }
    }
    
    // Trigger lab order processing automatically for signed lab orders
    if (insertOrder.orderType === 'lab' && insertOrder.orderStatus === 'approved') {
      console.log(`🧪 [STORAGE] Triggering lab order processing for signed lab order`);
      try {
        // Import dynamically to avoid circular dependencies
        const { LabOrderProcessor } = await import("./lab-order-processor.js");
        // Use setImmediate to run after current execution cycle completes
        setImmediate(async () => {
          try {
            await LabOrderProcessor.processSignedLabOrders(insertOrder.patientId, insertOrder.encounterId || undefined);
            console.log(`✅ [STORAGE] Lab order processing completed for order ${order.id}`);
          } catch (labError) {
            console.error(`❌ [STORAGE] Lab order processing failed for order ${order.id}:`, labError);
          }
        });
      } catch (importError) {
        console.error(`❌ [STORAGE] Failed to import lab order processor:`, importError);
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
    // Get the order to check if it's a medication order
    const order = await this.getOrder(id);
    
    if (order && order.orderType === 'medication') {
      console.log(`🔄 [STORAGE] Reverting medication state for order ${id}`);
      
      // Find medications that have visit history entries created by this order
      const medicationsWithHistory = await db
        .select()
        .from(medications)
        .where(eq(medications.patientId, order.patientId));
      
      for (const medication of medicationsWithHistory) {
        if (medication.visitHistory && Array.isArray(medication.visitHistory)) {
          const visitHistory = medication.visitHistory as any[];
          
          // Find visit history entries created by this order
          const orderVisitEntries = visitHistory.filter((visit: any) => visit.orderId === id);
          
          if (orderVisitEntries.length > 0) {
            console.log(`🔄 [STORAGE] Found ${orderVisitEntries.length} visit history entries for medication ${medication.id}`);
            
            // Get the most recent visit entry created by this order
            const mostRecentOrderVisit = orderVisitEntries[orderVisitEntries.length - 1];
            
            // If this entry has previousState, revert the medication
            if (mostRecentOrderVisit.previousState) {
              console.log(`🔄 [STORAGE] Reverting medication ${medication.id} to previous state`);
              
              const previousState = mostRecentOrderVisit.previousState;
              const updateData: any = {};
              
              if (previousState.dosage !== undefined) updateData.dosage = previousState.dosage;
              if (previousState.frequency !== undefined) updateData.frequency = previousState.frequency;
              if (previousState.status !== undefined) updateData.status = previousState.status;
              if (previousState.clinicalIndication !== undefined) updateData.clinicalIndication = previousState.clinicalIndication;
              
              // Remove visit history entries created by this order
              const filteredVisitHistory = visitHistory.filter((visit: any) => visit.orderId !== id);
              updateData.visitHistory = filteredVisitHistory;
              
              // Update the medication
              await db
                .update(medications)
                .set(updateData)
                .where(eq(medications.id, medication.id));
                
              console.log(`✅ [STORAGE] Reverted medication ${medication.id} and removed order visit history`);
            }
          }
        }
      }
    }
    
    // Update any medications that reference this order to remove the reference
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
          confirmedCount: (current[0].confirmedCount || 0) + 1,
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
          contradictedCount: (current[0].contradictedCount || 0) + 1,
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

  async updateMedicalProblemStatus(problemId: number, status: string): Promise<void> {
    await db.update(medicalProblems)
      .set({ 
        problemStatus: status,
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, problemId));
  }

  async addMedicalProblemVisitHistory(problemId: number, visitEntry: any): Promise<void> {
    const [problem] = await db.select({ visitHistory: medicalProblems.visitHistory })
      .from(medicalProblems)
      .where(eq(medicalProblems.id, problemId));
    
    const existingHistory = (problem?.visitHistory as any[]) || [];
    const updatedHistory = [...existingHistory, visitEntry];
    
    await db.update(medicalProblems)
      .set({ 
        visitHistory: updatedHistory,
        updatedAt: new Date()
      })
      .where(eq(medicalProblems.id, problemId));
  }

  // Medication synchronization methods
  async getMedicationsByOrderId(orderId: number): Promise<Medication[]> {
    return await db.select().from(medications).where(eq(medications.sourceOrderId, orderId));
  }

  // User Note Templates Implementation
  async getUserNoteTemplates(userId: number): Promise<any[]> {
    return await db.select()
      .from(userNoteTemplates)
      .where(and(eq(userNoteTemplates.userId, userId), eq(userNoteTemplates.active, true)))
      .orderBy(userNoteTemplates.templateName);
  }

  async getUserNoteTemplate(id: number): Promise<any | undefined> {
    const [template] = await db.select()
      .from(userNoteTemplates)
      .where(eq(userNoteTemplates.id, id));
    return template || undefined;
  }

  async getUserTemplatesByType(userId: number, noteType: string): Promise<any[]> {
    console.log(`🔍 [Storage] Getting user templates for userId: ${userId}, noteType: ${noteType}`);
    console.log(`🔍 [Storage] Query details:`, {
      table: 'user_note_templates',
      conditions: {
        userId,
        baseNoteType: noteType,
        active: true
      }
    });
    
    try {
      // First check if any templates exist for this user at all
      const allUserTemplates = await db.select()
        .from(userNoteTemplates)  
        .where(eq(userNoteTemplates.userId, userId));
      
      console.log(`🔍 [Storage] Total templates for user ${userId}: ${allUserTemplates.length}`);
      
      if (allUserTemplates.length > 0) {
        console.log(`🔍 [Storage] User's templates:`, allUserTemplates.map(t => ({
          id: t.id,
          name: t.templateName,
          baseType: t.baseNoteType,
          active: t.active,
          isDefault: t.isDefault
        })));
      }
      
      // Now get templates for specific note type
      const templates = await db.select()
        .from(userNoteTemplates)
        .where(and(
          eq(userNoteTemplates.userId, userId),
          eq(userNoteTemplates.baseNoteType, noteType),
          eq(userNoteTemplates.active, true)
        ))
        .orderBy(userNoteTemplates.templateName);
      
      console.log(`✅ [Storage] Found ${templates.length} templates for user ${userId} and note type ${noteType}`);
      
      if (templates.length > 0) {
        console.log(`✅ [Storage] Matching templates:`, templates.map(t => ({
          id: t.id,
          name: t.templateName,
          isDefault: t.isDefault,
          promptLength: t.generatedPrompt?.length || 0
        })));
      }
      
      return templates;
    } catch (error: any) {
      console.error(`❌ [Storage] Error getting user templates:`, {
        error: error.message,
        code: error.code,
        userId,
        noteType,
        stack: error.stack
      });
      throw error;
    }
  }

  async createUserNoteTemplate(template: any): Promise<any> {
    const result = await db.insert(userNoteTemplates)
      .values(template)
      .returning();
    return Array.isArray(result) ? result[0] : (result as any).rows[0];
  }

  async updateUserNoteTemplate(id: number, updates: any): Promise<any> {
    const [updated] = await db.update(userNoteTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNoteTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteUserNoteTemplate(id: number): Promise<void> {
    await db.update(userNoteTemplates)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(userNoteTemplates.id, id));
  }

  async templateNameExists(userId: number, templateName: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(userNoteTemplates)
      .where(and(
        eq(userNoteTemplates.userId, userId),
        eq(userNoteTemplates.templateName, templateName),
        eq(userNoteTemplates.active, true)
      ));
    return !!existing;
  }

  async setDefaultTemplate(userId: number, templateId: number, noteType: string): Promise<void> {
    // First, unset any existing defaults for this note type
    await db.update(userNoteTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(
        eq(userNoteTemplates.userId, userId),
        eq(userNoteTemplates.baseNoteType, noteType)
      ));

    // Then set the new default
    await db.update(userNoteTemplates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(userNoteTemplates.id, templateId));
  }

  async incrementTemplateUsage(templateId: number): Promise<void> {
    await db.update(userNoteTemplates)
      .set({ 
        usageCount: sql`${userNoteTemplates.usageCount} + 1`,
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userNoteTemplates.id, templateId));
  }

  // Template Sharing Implementation
  async getTemplateShares(userId: number): Promise<SelectTemplateShare[]> {
    return await db.select()
      .from(templateShares)
      .where(eq(templateShares.sharedBy, userId))
      .orderBy(templateShares.sharedAt);
  }

  async getPendingTemplateShares(userId: number): Promise<SelectTemplateShare[]> {
    return await db.select()
      .from(templateShares)
      .where(and(
        eq(templateShares.sharedWith, userId),
        eq(templateShares.status, "pending")
      ))
      .orderBy(templateShares.sharedAt);
  }

  async createTemplateShare(share: InsertTemplateShare): Promise<SelectTemplateShare> {
    const [created] = await db.insert(templateShares)
      .values(share)
      .returning();
    return created;
  }

  async updateTemplateShareStatus(shareId: number, status: string): Promise<SelectTemplateShare> {
    const [updated] = await db.update(templateShares)
      .set({ status, respondedAt: new Date() })
      .where(eq(templateShares.id, shareId))
      .returning();
    return updated;
  }

  async adoptSharedTemplate(userId: number, shareId: number): Promise<any> {
    // Get the share details
    const [share] = await db.select()
      .from(templateShares)
      .where(eq(templateShares.id, shareId));
    
    if (!share || share.sharedWith !== userId) {
      throw new Error("Share not found or not authorized");
    }

    // Get the original template
    const [originalTemplate] = await db.select()
      .from(userNoteTemplates)
      .where(eq(userNoteTemplates.id, share.templateId));
    
    if (!originalTemplate) {
      throw new Error("Original template not found");
    }

    // Create a new template for the user
    const result = await db.insert(userNoteTemplates)
      .values({
        userId: userId,
        templateName: `${originalTemplate.templateName}-Copy`,
        baseNoteType: originalTemplate.baseNoteType,
        displayName: `${originalTemplate.displayName} (Shared)`,
        isPersonal: true,
        isDefault: false,
        createdBy: userId,
        sharedBy: originalTemplate.createdBy,
        exampleNote: originalTemplate.exampleNote,
        generatedPrompt: originalTemplate.generatedPrompt,
        enableAiLearning: originalTemplate.enableAiLearning,
        learningConfidence: originalTemplate.learningConfidence,
        parentTemplateId: originalTemplate.id
      })
      .returning();
    const adoptedTemplate = Array.isArray(result) ? result[0] : (result as any).rows[0];

    // Update share status
    await this.updateTemplateShareStatus(shareId, "accepted");

    return adoptedTemplate;
  }

  // User Note Preferences Implementation
  async getUserNotePreferences(userId: number): Promise<SelectUserNotePreferences | undefined> {
    const [preferences] = await db.select()
      .from(userNotePreferences)
      .where(eq(userNotePreferences.userId, userId));
    return preferences || undefined;
  }

  async createUserNotePreferences(preferences: InsertUserNotePreferences): Promise<SelectUserNotePreferences> {
    const [created] = await db.insert(userNotePreferences)
      .values(preferences)
      .returning();
    return created;
  }

  async updateUserNotePreferences(userId: number, updates: Partial<SelectUserNotePreferences>): Promise<SelectUserNotePreferences> {
    // First try to update existing preferences
    const [updated] = await db.update(userNotePreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNotePreferences.userId, userId))
      .returning();
    
    // If no record was updated (user has no preferences yet), create new ones
    if (!updated) {
      const [created] = await db.insert(userNotePreferences)
        .values([{ 
          userId, 
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .returning();
      return created;
    }
    
    return updated;
  }

  // Admin Prompt Review Implementation
  async createAdminPromptReview(review: InsertAdminPromptReview): Promise<AdminPromptReview> {
    const [created] = await db.insert(adminPromptReviews)
      .values(review)
      .returning();
    
    if (!created) {
      throw new Error("Failed to create admin prompt review");
    }
    
    return created;
  }

  async getAllPendingPromptReviews(): Promise<(AdminPromptReview & { template: any, user: User })[]> {
    const reviews = await db.select({
      review: adminPromptReviews,
      template: userNoteTemplates,
      user: users
    })
      .from(adminPromptReviews)
      .leftJoin(userNoteTemplates, eq(adminPromptReviews.templateId, userNoteTemplates.id))
      .leftJoin(users, eq(userNoteTemplates.userId, users.id))
      .where(eq(adminPromptReviews.reviewStatus, "pending"))
      .orderBy(desc(adminPromptReviews.createdAt));

    return reviews.map(r => ({ ...r.review, template: r.template!, user: r.user! }));
  }

  async getAdminPromptReview(reviewId: number): Promise<(AdminPromptReview & { template: any, user: User }) | undefined> {
    const [review] = await db.select({
      review: adminPromptReviews,
      template: userNoteTemplates,
      user: users
    })
      .from(adminPromptReviews)
      .leftJoin(userNoteTemplates, eq(adminPromptReviews.templateId, userNoteTemplates.id))
      .leftJoin(users, eq(userNoteTemplates.userId, users.id))
      .where(eq(adminPromptReviews.id, reviewId));

    return review ? { ...review.review, template: review.template!, user: review.user! } : undefined;
  }

  async updateAdminPromptReview(reviewId: number, updates: Partial<InsertAdminPromptReview>): Promise<AdminPromptReview> {
    const [updated] = await db.update(adminPromptReviews)
      .set({ ...updates, reviewedAt: new Date() })
      .where(eq(adminPromptReviews.id, reviewId))
      .returning();
    
    if (!updated) {
      throw new Error("Failed to update admin prompt review");
    }
    
    return updated;
  }

  async activateReviewedPrompt(reviewId: number, adminUserId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Deactivate any existing active reviews for this template
      const [review] = await tx.select()
        .from(adminPromptReviews)
        .where(eq(adminPromptReviews.id, reviewId));
      
      if (!review) {
        throw new Error("Review not found");
      }

      await tx.update(adminPromptReviews)
        .set({ isActive: false })
        .where(and(
          eq(adminPromptReviews.templateId, review.templateId),
          eq(adminPromptReviews.isActive, true)
        ));

      // Activate this review
      await tx.update(adminPromptReviews)
        .set({ 
          isActive: true, 
          reviewStatus: "approved",
          adminUserId: adminUserId,
          reviewedAt: new Date() 
        })
        .where(eq(adminPromptReviews.id, reviewId));
    });
  }

  // Admin methods for the routes
  async getPendingPromptReviews() {
    const reviews = await db
      .select({
        id: adminPromptReviews.id,
        templateId: adminPromptReviews.templateId,
        originalPrompt: adminPromptReviews.originalPrompt,
        reviewedPrompt: adminPromptReviews.reviewedPrompt,
        reviewStatus: adminPromptReviews.reviewStatus,
        reviewNotes: adminPromptReviews.reviewNotes,
        isActive: adminPromptReviews.isActive,
        createdAt: adminPromptReviews.createdAt,
        reviewedAt: adminPromptReviews.reviewedAt,
        template: {
          id: userNoteTemplates.id,
          templateName: userNoteTemplates.templateName,
          baseNoteType: userNoteTemplates.baseNoteType,
          displayName: userNoteTemplates.displayName,
          exampleNote: userNoteTemplates.exampleNote, // Original user template
          isDefault: userNoteTemplates.isDefault,
          createdAt: userNoteTemplates.createdAt,
        },
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(adminPromptReviews)
      .leftJoin(userNoteTemplates, eq(adminPromptReviews.templateId, userNoteTemplates.id))
      .leftJoin(users, eq(userNoteTemplates.userId, users.id))
      .where(eq(adminPromptReviews.reviewStatus, "pending"))
      .orderBy(desc(adminPromptReviews.createdAt));
    
    return reviews;
  }

  async getAllUserTemplatesForAdmin() {
    const templates = await db
      .select({
        id: userNoteTemplates.id,
        templateName: userNoteTemplates.templateName,
        baseNoteType: userNoteTemplates.baseNoteType,
        displayName: userNoteTemplates.displayName,
        userId: userNoteTemplates.userId,
        hasActivePrompt: sql<boolean>`CASE WHEN active_reviews.id IS NOT NULL THEN true ELSE false END`,
        activePromptLength: sql<number>`COALESCE(LENGTH(active_reviews.reviewed_prompt), 0)`,
      })
      .from(userNoteTemplates)
      .leftJoin(
        adminPromptReviews,
        and(
          eq(userNoteTemplates.id, adminPromptReviews.templateId),
          eq(adminPromptReviews.isActive, true)
        )
      )
      .orderBy(desc(userNoteTemplates.createdAt));
    
    return templates;
  }

  async updatePromptReview(reviewId: number, data: {
    reviewedPrompt?: string;
    reviewNotes?: string;
    reviewStatus?: "pending" | "reviewed" | "approved";
    reviewedAt?: Date;
  }) {
    const [review] = await db
      .update(adminPromptReviews)
      .set(data)
      .where(eq(adminPromptReviews.id, reviewId))
      .returning();
    return review;
  }

  async activatePromptReview(reviewId: number) {
    // First, get the review to find the template
    const [review] = await db
      .select({ templateId: adminPromptReviews.templateId })
      .from(adminPromptReviews)
      .where(eq(adminPromptReviews.id, reviewId));
    
    if (review) {
      // Deactivate existing active prompts for this template
      await db
        .update(adminPromptReviews)
        .set({ isActive: false })
        .where(eq(adminPromptReviews.templateId, review.templateId));
      
      // Activate the selected review
      await db
        .update(adminPromptReviews)
        .set({ 
          isActive: true, 
          reviewStatus: "approved",
          reviewedAt: new Date()
        })
        .where(eq(adminPromptReviews.id, reviewId));
    }
  }

  async getActivePromptForTemplate(templateId: number): Promise<string | null> {
    const [activeReview] = await db.select()
      .from(adminPromptReviews)
      .where(and(
        eq(adminPromptReviews.templateId, templateId),
        eq(adminPromptReviews.isActive, true)
      ));

    return activeReview?.reviewedPrompt || null;
  }

  // Social History Methods
  async getSocialHistory(patientId: number) {
    console.log(`🚬 [Storage] getSocialHistory called with patientId: ${patientId}`);
    console.log(`🚬 [Storage] Executing query: SELECT * FROM social_history WHERE patient_id = ${patientId}`);
    
    try {
      const result = await db.select().from(socialHistory).where(eq(socialHistory.patientId, patientId));
      console.log(`🚬 [Storage] Query successful, found ${result.length} social history entries`);
      console.log(`🚬 [Storage] Social history results:`, result.map(r => ({
        id: r.id,
        category: r.category,
        currentStatus: r.currentStatus,
        sourceType: r.sourceType,
        hasVisitHistory: !!r.visitHistory
      })));
      return result;
    } catch (error) {
      console.error(`🚬 [Storage] Database error in getSocialHistory:`, error);
      throw error;
    }
  }

  async createSocialHistory(socialHistoryData: any) {
    const [result] = await db.insert(socialHistory).values(socialHistoryData).returning();
    return result;
  }

  async updateSocialHistory(socialHistoryId: number, updateData: any) {
    const [result] = await db
      .update(socialHistory)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(socialHistory.id, socialHistoryId))
      .returning();
    return result;
  }

  async deleteSocialHistory(socialHistoryId: number) {
    await db.delete(socialHistory).where(eq(socialHistory.id, socialHistoryId));
  }

  async addSocialHistoryVisitHistory(socialHistoryId: number, visitEntry: any) {
    // Get current social history entry
    const [current] = await db
      .select()
      .from(socialHistory)
      .where(eq(socialHistory.id, socialHistoryId));

    if (current) {
      const currentVisitHistory = current.visitHistory || [];
      const updatedVisitHistory = [...currentVisitHistory, visitEntry];

      await db
        .update(socialHistory)
        .set({
          visitHistory: updatedVisitHistory,
          updatedAt: new Date()
        })
        .where(eq(socialHistory.id, socialHistoryId));
    }
  }

  // ===== SCHEDULING METHODS =====

  // Get providers by health system
  async getProvidersByHealthSystem(healthSystemId: number, locationId?: number) {
    let query = db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        credentials: users.credentials,
        npi: users.npi
      })
      .from(users)
      .where(and(
        eq(users.healthSystemId, healthSystemId),
        eq(users.role, 'provider'),
        eq(users.active, true)
      ));
      
    if (locationId) {
      // Filter by providers who work at this location
      query = db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          credentials: users.credentials,
          npi: users.npi
        })
        .from(users)
        .innerJoin(userLocations, eq(users.id, userLocations.userId))
        .where(and(
          eq(users.healthSystemId, healthSystemId),
          eq(users.role, 'provider'),
          eq(users.active, true),
          eq(userLocations.locationId, locationId)
        ));
    }
    
    return await query.execute();
  }

  // Get appointments
  async getAppointments(params: {
    healthSystemId: number;
    startDate: Date;
    endDate: Date;
    providerId?: number;
    locationId?: number;
    patientId?: number;
  }) {
    let conditions = [
      gte(appointments.appointmentDate, params.startDate.toISOString().split('T')[0]),
      lte(appointments.appointmentDate, params.endDate.toISOString().split('T')[0])
    ];
    
    if (params.providerId) {
      conditions.push(eq(appointments.providerId, params.providerId));
    }
    
    if (params.locationId) {
      conditions.push(eq(appointments.locationId, params.locationId));
    }
    
    if (params.patientId) {
      conditions.push(eq(appointments.patientId, params.patientId));
    }
    
    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        providerId: appointments.providerId,
        providerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        locationId: appointments.locationId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.startTime,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        duration: appointments.duration,
        patientVisibleDuration: appointments.patientVisibleDuration,
        providerScheduledDuration: appointments.providerScheduledDuration,
        appointmentType: appointments.appointmentType,
        status: appointments.status,
        chiefComplaint: appointments.chiefComplaint,
        notes: appointments.schedulingNotes,
        aiPredictedDuration: sql<number>`NULL` // TODO: Get from prediction history
      })
      .from(appointments)
      .innerJoin(patients, and(
        eq(appointments.patientId, patients.id),
        eq(patients.healthSystemId, params.healthSystemId)
      ))
      .innerJoin(users, eq(appointments.providerId, users.id))
      .where(and(...conditions))
      .orderBy(appointments.appointmentDate, appointments.startTime)
      .execute();
      
    return results;
  }

  // Get real-time schedule status
  async getRealtimeScheduleStatus(providerId: number, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    
    const status = await db
      .select()
      .from(realtimeScheduleStatus)
      .where(and(
        eq(realtimeScheduleStatus.providerId, providerId),
        eq(realtimeScheduleStatus.scheduleDate, dateStr)
      ))
      .execute();
      
    return status[0] || null;
  }

  // Predict appointment duration using AI
  async predictAppointmentDuration(params: {
    patientId: number;
    providerId: number;
    appointmentType: string;
    appointmentDate: Date;
    appointmentTime: string;
  }) {
    console.log('🤖 [AI SCHEDULING] Starting prediction for patient:', params.patientId);
    
    // Get provider's custom AI weights
    const providerWeights = await this.getProviderAiWeights(params.providerId, 2); // Using health system ID 2 for now
    console.log('🤖 [AI SCHEDULING] Provider weights loaded:', providerWeights);
    
    // Map frontend appointment types to standard durations
    const appointmentTypeMap: Record<string, string> = {
      'new-patient': 'new_patient',
      'follow-up': 'follow_up',
      'physical': 'annual_physical',
      'sick-visit': 'acute_visit',
      'procedure': 'procedure',
      'telehealth': 'follow_up'
    };
    
    // Base durations
    const standardDurations: Record<string, number> = {
      'new_patient': 45,
      'follow_up': 20,
      'annual_physical': 45,  // Physicals should be longer
      'acute_visit': 15,
      'procedure': 60
    };
    
    const mappedType = appointmentTypeMap[params.appointmentType] || params.appointmentType;
    let baseDuration = standardDurations[mappedType] || 20;
    let durationAdjustment = 0;
    let complexity = { problemCount: 0, medicationCount: 0, age: 0, allergiesCount: 0 };
    let patientPatterns: any = null;
    
    try {
      // 1. Get patient complexity factors
      const patientData = await db
        .select({
          problemCount: sql<number>`COUNT(DISTINCT ${medicalProblems.id})`,
          medicationCount: sql<number>`COUNT(DISTINCT ${medications.id})`,
          age: sql<number>`EXTRACT(YEAR FROM AGE(${patients.dateOfBirth}))`,
          allergiesCount: sql<number>`COUNT(DISTINCT ${allergies.id})`
        })
        .from(patients)
        .where(eq(patients.id, params.patientId))
        .leftJoin(medicalProblems, eq(medicalProblems.patientId, patients.id))
        .leftJoin(medications, and(
          eq(medications.patientId, patients.id),
          eq(medications.status, 'active')
        ))
        .leftJoin(allergies, eq(allergies.patientId, patients.id))
        .groupBy(patients.id, patients.dateOfBirth)
        .execute();
        
      complexity = patientData[0] || { problemCount: 0, medicationCount: 0, age: 0, allergiesCount: 0 };
      
      console.log('🤖 [AI SCHEDULING] Patient complexity:', complexity);
      
      // 2. Get patient scheduling patterns
      const patterns = await db
        .select()
        .from(patientSchedulingPatterns)
        .where(eq(patientSchedulingPatterns.patientId, params.patientId))
        .execute();
      
      patientPatterns = patterns[0] || null;
        
      console.log('🤖 [AI SCHEDULING] Patient patterns:', patientPatterns);
      
      // 3. Get provider patterns
      const [providerPatterns] = await db
        .select()
        .from(providerSchedulingPatterns)
        .where(eq(providerSchedulingPatterns.providerId, params.providerId))
        .execute();
        
      console.log('🤖 [AI SCHEDULING] Provider patterns:', providerPatterns);
      
      // 4. Calculate complexity-based adjustments using provider weights
      // Each active problem adds time based on weight
      if (complexity.problemCount > 0 && providerWeights.medicalProblemsWeight > 0) {
        const problemFactor = providerWeights.medicalProblemsWeight / 100;
        durationAdjustment += Math.min(complexity.problemCount * 1.5 * problemFactor, 15 * problemFactor);
      }
      
      // Multiple medications add time based on weight
      if (providerWeights.activeMedicationsWeight > 0) {
        const medFactor = providerWeights.activeMedicationsWeight / 100;
        if (complexity.medicationCount > 10) {
          durationAdjustment += 10 * medFactor;
        } else if (complexity.medicationCount > 5) {
          durationAdjustment += 5 * medFactor;
        }
      }
      
      // Age adjustments based on weight
      if (providerWeights.patientAgeWeight > 0) {
        const ageFactor = providerWeights.patientAgeWeight / 100;
        if (complexity.age > 80) {
          durationAdjustment += 10 * ageFactor;
        } else if (complexity.age > 65) {
          durationAdjustment += 5 * ageFactor;
        }
      }
      
      // 5. Use historical patterns if available - THIS IS THE MOST IMPORTANT FACTOR
      if (patientPatterns) {
        // Use patient's average visit duration if we have history
        const historicalAvg = parseFloat(patientPatterns.avgVisitDuration || '0');
        
        // Check for appointment-type-specific history
        let typeSpecificDuration = 0;
        if (patientPatterns.avgDurationByType) {
          try {
            const durationByType = typeof patientPatterns.avgDurationByType === 'string' 
              ? JSON.parse(patientPatterns.avgDurationByType) 
              : patientPatterns.avgDurationByType;
            typeSpecificDuration = durationByType[params.appointmentType] || 0;
          } catch (e) {
            console.log('🤖 [AI SCHEDULING] Could not parse appointment type history');
          }
        }
        
        // PRIORITIZE HISTORICAL DATA - it's the best predictor
        if (typeSpecificDuration > 0) {
          // We have specific history for this appointment type - use it as PRIMARY predictor
          baseDuration = typeSpecificDuration;
          console.log(`🤖 [AI SCHEDULING] Using type-specific historical duration: ${typeSpecificDuration} minutes for ${params.appointmentType}`);
        } else if (historicalAvg > 0) {
          // We have general visit history - weight it based on provider preference
          const historicalWeight = providerWeights.historicalVisitWeight / 100;
          baseDuration = Math.round((historicalAvg * historicalWeight) + (baseDuration * (1 - historicalWeight)));
          console.log(`🤖 [AI SCHEDULING] Using historical average duration: ${historicalAvg} minutes (weighted ${providerWeights.historicalVisitWeight}%)`);
        }
        
        // High no-show rate might mean scheduling shorter slots
        const noShowRate = parseFloat(patientPatterns.noShowRate || '0');
        if (noShowRate > 0.3 && providerWeights.noShowRiskWeight > 0) { // >30% no-show rate
          const noShowFactor = providerWeights.noShowRiskWeight / 100;
          durationAdjustment -= 5 * noShowFactor;
        }
        
        // Consistent late arrivals need buffer
        const avgArrivalDelta = parseFloat(patientPatterns.avgArrivalDelta || '0');
        if (avgArrivalDelta > 10 && providerWeights.averageArrivalTimeWeight > 0) { // Consistently >10 minutes late
          const arrivalFactor = providerWeights.averageArrivalTimeWeight / 100;
          durationAdjustment += 5 * arrivalFactor;
        }
      }
      
      // 6. Provider-specific adjustments
      if (providerPatterns && providerWeights.providerEfficiencyWeight > 0) {
        const providerAvg = parseFloat(providerPatterns.avgVisitDuration || '0');
        if (providerAvg > 0) {
          const efficiencyFactor = providerWeights.providerEfficiencyWeight / 100;
          // Some providers run longer/shorter than average
          const providerFactor = providerAvg / baseDuration;
          if (providerFactor > 1.2) { // Provider runs 20% longer
            durationAdjustment += 5 * efficiencyFactor;
          } else if (providerFactor < 0.8) { // Provider is efficient
            durationAdjustment -= 5 * efficiencyFactor;
          }
        }
      }
      
      // 7. Time of day adjustments (providers often run behind later in day)
      const appointmentHour = parseInt(params.appointmentTime.split(':')[0]);
      if (appointmentHour >= 15 && providerWeights.timeOfDayWeight > 0) { // After 3 PM
        const timeFactor = providerWeights.timeOfDayWeight / 100;
        durationAdjustment += 5 * timeFactor;
      }
      
    } catch (error) {
      console.error('🤖 [AI SCHEDULING] Error calculating AI prediction:', error);
    }
    
    // Calculate final durations with 10-minute interval rounding
    const aiPredictedDuration = Math.max(baseDuration + durationAdjustment, 10); // Minimum 10 minutes
    
    // Patient sees: Round DOWN to nearest 10, minimum 20
    const patientVisibleDuration = Math.max(20, Math.floor(aiPredictedDuration / 10) * 10);
    
    // Provider blocks: Round UP to nearest 10, minimum 10
    const providerScheduledDuration = Math.max(10, Math.ceil(aiPredictedDuration / 10) * 10);
    
    console.log('🤖 [AI SCHEDULING] Final prediction:', {
      baseDuration,
      durationAdjustment,
      aiPredictedDuration,
      patientVisibleDuration,
      providerScheduledDuration
    });
    
    return {
      aiPredictedDuration,
      patientVisibleDuration,
      providerScheduledDuration,
      complexityFactors: {
        baseDuration,
        durationAdjustment,
        problemCount: complexity.problemCount,
        medicationCount: complexity.medicationCount,
        age: complexity.age,
        noShowRate: patientPatterns ? parseFloat(patientPatterns.noShowRate || '0') : 0,
        avgArrivalDelta: patientPatterns ? parseFloat(patientPatterns.avgArrivalDelta || '0') : 0,
        historicalAvg: patientPatterns ? parseFloat(patientPatterns.avgVisitDuration || '0') : 0
      }
    };
  }

  // Check for appointment conflicts
  async checkAppointmentConflicts(params: {
    providerId: number;
    appointmentDate: string;
    startTime: string;
    duration: number;
    excludeAppointmentId?: number;
  }) {
    const { providerId, appointmentDate, startTime, duration, excludeAppointmentId } = params;
    
    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    console.log('🔍 [CONFLICT CHECK] Checking for conflicts:', {
      providerId,
      date: appointmentDate,
      requestedTime: `${startTime} - ${endTime}`,
      duration
    });
    
    // Query for overlapping appointments
    const conflicts = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        duration: appointments.duration,
        appointmentType: appointments.appointmentType,
        status: appointments.status,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.providerId, providerId),
        eq(appointments.appointmentDate, appointmentDate),
        // Only check active appointments (not cancelled or no-show)
        notInArray(appointments.status, ['cancelled', 'no_show']),
        // Exclude the appointment being updated if provided
        excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : sql`true`,
        // Check for time overlap
        or(
          // New appointment starts during existing appointment
          and(
            lte(appointments.startTime, startTime),
            gt(appointments.endTime, startTime)
          ),
          // New appointment ends during existing appointment
          and(
            lt(appointments.startTime, endTime),
            gte(appointments.endTime, endTime)
          ),
          // New appointment completely encompasses existing appointment
          and(
            gte(appointments.startTime, startTime),
            lte(appointments.endTime, endTime)
          ),
          // Existing appointment completely encompasses new appointment
          and(
            lte(appointments.startTime, startTime),
            gte(appointments.endTime, endTime)
          )
        )
      ))
      .execute();
    
    if (conflicts.length > 0) {
      console.log('❌ [CONFLICT CHECK] Found conflicts:', conflicts);
    } else {
      console.log('✅ [CONFLICT CHECK] No conflicts found');
    }
    
    return conflicts;
  }

  // Create appointment
  async createAppointment(data: any) {
    console.log('📅 [STORAGE] Creating appointment with raw data:', data);
    
    // Calculate end time based on duration
    const duration = data.providerScheduledDuration || data.duration || 20;
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    const endHours = Math.floor((minutes + duration) / 60) + hours;
    const endMinutes = (minutes + duration) % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    const appointmentData = {
      patientId: data.patientId,
      providerId: data.providerId,
      locationId: data.locationId,
      appointmentDate: data.appointmentDate, // e.g., "2025-07-18"
      startTime: data.appointmentTime,        // e.g., "09:00"
      endTime: endTime,                       // e.g., "09:30"
      duration: data.duration || 20,
      patientVisibleDuration: data.patientVisibleDuration || data.duration || 20,
      providerScheduledDuration: data.providerScheduledDuration || data.duration || 20,
      aiPredictedDuration: data.aiPredictedDuration,
      appointmentType: data.appointmentType,
      appointmentTypeId: data.appointmentTypeId || 1,
      chiefComplaint: data.chiefComplaint || '',
      status: data.status || 'scheduled',
      schedulingNotes: data.notes || '',
      createdBy: data.createdBy,
      createdAt: new Date()
    };
    
    console.log('📅 [STORAGE] Inserting appointment data:', appointmentData);
    
    const result = await db
      .insert(appointments)
      .values(appointmentData)
      .returning()
      .execute();
      
    return result[0];
  }

  // Update appointment
  async updateAppointment(appointmentId: number, data: any, healthSystemId: number) {
    // Verify appointment belongs to health system
    const existing = await db
      .select()
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.id, appointmentId),
        eq(patients.healthSystemId, healthSystemId)
      ))
      .execute();
      
    if (!existing.length) return null;
    
    const result = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, appointmentId))
      .returning()
      .execute();
      
    return result[0];
  }

  // Get appointment by ID
  async getAppointmentById(appointmentId: number, healthSystemId: number) {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        providerId: appointments.providerId,
        locationId: appointments.locationId,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        duration: appointments.duration,
        appointmentType: appointments.appointmentType,
        chiefComplaint: appointments.chiefComplaint,
        visitReason: appointments.visitReason,
        status: appointments.status,
        confirmationStatus: appointments.confirmationStatus,
        checkedInAt: appointments.checkedInAt,
        checkedInBy: appointments.checkedInBy,
        roomAssignment: appointments.roomAssignment,
        urgencyLevel: appointments.urgencyLevel,
        schedulingNotes: appointments.schedulingNotes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.id, appointmentId),
        eq(patients.healthSystemId, healthSystemId)
      ))
      .execute();
      
    return result[0] || null;
  }

  // Delete appointment
  async deleteAppointment(appointmentId: number, healthSystemId: number) {
    // Verify appointment belongs to health system
    const existing = await db
      .select()
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.id, appointmentId),
        eq(patients.healthSystemId, healthSystemId)
      ))
      .execute();
      
    if (!existing.length) throw new Error('Appointment not found');
    
    await db
      .delete(appointments)
      .where(eq(appointments.id, appointmentId))
      .execute();
  }

  // Get schedule preferences
  async getSchedulePreferences(providerId: number) {
    const prefs = await db
      .select()
      .from(schedulePreferences)
      .where(eq(schedulePreferences.providerId, providerId))
      .execute();
      
    return prefs[0];
  }

  // Update schedule preferences
  async updateSchedulePreferences(providerId: number, data: any) {
    const existing = await this.getSchedulePreferences(providerId);
    
    if (existing) {
      const result = await db
        .update(schedulePreferences)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(schedulePreferences.providerId, providerId))
        .returning()
        .execute();
        
      return result[0];
    } else {
      const result = await db
        .insert(schedulePreferences)
        .values([{
          providerId,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .returning()
        .execute();
        
      return result[0];
    }
  }

  // Get appointment types
  async getAppointmentTypes(healthSystemId: number, locationId?: number) {
    let conditions = [eq(appointmentTypes.healthSystemId, healthSystemId)];
    
    if (locationId) {
      conditions.push(eq(appointmentTypes.locationId, locationId));
    }
    
    return await db
      .select()
      .from(appointmentTypes)
      .where(and(...conditions))
      .orderBy(appointmentTypes.typeName)
      .execute();
  }

  // Get scheduling AI factors
  async getSchedulingAiFactors() {
    return await db
      .select()
      .from(schedulingAiFactors)
      .where(eq(schedulingAiFactors.active, true))
      .orderBy(schedulingAiFactors.factorCategory, schedulingAiFactors.factorName)
      .execute();
  }

  // Update AI factor weight
  async updateAiFactorWeight(params: {
    factorId: number;
    weight: number;
    providerId?: number;
    locationId?: number;
    healthSystemId: number;
    updatedBy: number;
  }) {
    // Check if weight already exists
    let conditions = [
      eq(schedulingAiWeights.factorId, params.factorId),
      eq(schedulingAiWeights.healthSystemId, params.healthSystemId)
    ];
    
    if (params.providerId) {
      conditions.push(eq(schedulingAiWeights.providerId, params.providerId));
    }
    if (params.locationId) {
      conditions.push(eq(schedulingAiWeights.locationId, params.locationId));
    }
    
    const existing = await db
      .select()
      .from(schedulingAiWeights)
      .where(and(...conditions))
      .execute();
      
    if (existing.length) {
      // Update existing
      const result = await db
        .update(schedulingAiWeights)
        .set({
          weight: params.weight.toString(),
          enabled: params.weight > 0
        })
        .where(eq(schedulingAiWeights.id, existing[0].id))
        .returning()
        .execute();
        
      return result[0];
    } else {
      // Create new
      const result = await db
        .insert(schedulingAiWeights)
        .values({
          factorId: params.factorId,
          weight: params.weight.toString(),
          enabled: params.weight > 0,
          providerId: params.providerId,
          locationId: params.locationId,
          healthSystemId: params.healthSystemId,
          createdBy: params.updatedBy,
          createdAt: new Date()
        })
        .returning()
        .execute();
        
      return result[0];
    }
  }

  async saveRecordingMetadata(data: {
    userId: number;
    patientId: number;
    duration: number;
    startTime: Date;
    endTime: Date;
  }) {
    // Find the most recent encounter for this patient
    const recentEncounter = await db
      .select()
      .from(encounters)
      .where(eq(encounters.patientId, data.patientId))
      .orderBy(desc(encounters.createdAt))
      .limit(1)
      .execute();

    if (recentEncounter.length === 0) {
      console.warn(`[saveRecordingMetadata] No encounter found for patient ${data.patientId}`);
      return;
    }

    const encounter = recentEncounter[0];
    
    // Store recording metadata in the aiSuggestions JSONB field
    const existingData = (encounter.aiSuggestions as any) || {};
    const recordingMetadata = {
      recordings: existingData.recordings || [],
      totalRecordingDuration: existingData.totalRecordingDuration || 0
    };

    // Add this recording
    recordingMetadata.recordings.push({
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      duration: data.duration,
      userId: data.userId
    });

    // Update total duration
    recordingMetadata.totalRecordingDuration += data.duration;

    // Update the encounter with recording metadata
    await db
      .update(encounters)
      .set({
        aiSuggestions: {
          ...existingData,
          ...recordingMetadata
        }
      })
      .where(eq(encounters.id, encounter.id))
      .execute();

    console.log(`[saveRecordingMetadata] Saved recording metadata for encounter ${encounter.id}: ${data.duration}s`);
  }

  // Get provider-specific AI weight preferences
  async getProviderAiWeights(providerId: number, healthSystemId: number) {
    // Define default weights matching the frontend defaults
    const defaultWeights = {
      historicalVisitWeight: 80,
      medicalProblemsWeight: 75,
      activeMedicationsWeight: 60,
      patientAgeWeight: 40,
      comorbidityIndexWeight: 50,
      appointmentTypeWeight: 85,
      timeOfDayWeight: 30,
      dayOfWeekWeight: 25,
      noShowRiskWeight: 70,
      averageArrivalTimeWeight: 35,
      providerEfficiencyWeight: 45,
      concurrentAppointmentsWeight: 20,
      bufferTimePreferenceWeight: 65,
      clinicVolumeWeight: 15,
      emergencyRateWeight: 55
    };

    // Define the factor name mapping
    const factorNameMapping: Record<string, string> = {
      historicalVisitWeight: 'historical_visit_average',
      medicalProblemsWeight: 'medical_problems_count',
      activeMedicationsWeight: 'active_medications_count',
      patientAgeWeight: 'patient_age',
      comorbidityIndexWeight: 'comorbidity_index',
      appointmentTypeWeight: 'appointment_type',
      timeOfDayWeight: 'time_of_day',
      dayOfWeekWeight: 'day_of_week',
      noShowRiskWeight: 'no_show_risk',
      averageArrivalTimeWeight: 'average_arrival_time',
      providerEfficiencyWeight: 'provider_efficiency',
      concurrentAppointmentsWeight: 'concurrent_appointments',
      bufferTimePreferenceWeight: 'buffer_time_preference',
      clinicVolumeWeight: 'clinic_volume',
      emergencyRateWeight: 'emergency_rate'
    };

    // Fetch all provider-specific weights
    const weights = await db
      .select({
        factorName: schedulingAiFactors.factorName,
        weight: schedulingAiWeights.weight
      })
      .from(schedulingAiWeights)
      .innerJoin(schedulingAiFactors, eq(schedulingAiWeights.factorId, schedulingAiFactors.id))
      .where(
        and(
          eq(schedulingAiWeights.providerId, providerId),
          eq(schedulingAiWeights.healthSystemId, healthSystemId)
        )
      )
      .execute();

    // Start with default weights
    const result = { ...defaultWeights };

    // Override with saved weights
    weights.forEach(w => {
      // Find the frontend key for this factor name
      const frontendKey = Object.entries(factorNameMapping).find(
        ([key, value]) => value === w.factorName
      )?.[0];
      
      if (frontendKey) {
        result[frontendKey as keyof typeof result] = parseFloat(w.weight);
      }
    });

    return result;
  }

  // Update provider-specific AI weight preferences
  async updateProviderAiWeights(providerId: number, healthSystemId: number, weights: any, updatedBy: number) {
    // Define the factor name mapping
    const factorNameMapping: Record<string, string> = {
      historicalVisitWeight: 'historical_visit_average',
      medicalProblemsWeight: 'medical_problems_count',
      activeMedicationsWeight: 'active_medications_count',
      patientAgeWeight: 'patient_age',
      comorbidityIndexWeight: 'comorbidity_index',
      appointmentTypeWeight: 'appointment_type',
      timeOfDayWeight: 'time_of_day',
      dayOfWeekWeight: 'day_of_week',
      noShowRiskWeight: 'no_show_risk',
      averageArrivalTimeWeight: 'average_arrival_time',
      providerEfficiencyWeight: 'provider_efficiency',
      concurrentAppointmentsWeight: 'concurrent_appointments',
      bufferTimePreferenceWeight: 'buffer_time_preference',
      clinicVolumeWeight: 'clinic_volume',
      emergencyRateWeight: 'emergency_rate'
    };

    // Get all AI factors to map names to IDs
    const factors = await db
      .select()
      .from(schedulingAiFactors)
      .execute();

    const factorMap = new Map(factors.map(f => [f.factorName, f.id]));

    // Update each weight
    for (const [key, weight] of Object.entries(weights)) {
      const factorName = factorNameMapping[key];
      if (!factorName) continue;

      const factorId = factorMap.get(factorName);
      if (!factorId) continue;

      // Check if weight exists
      const existing = await db
        .select()
        .from(schedulingAiWeights)
        .where(
          and(
            eq(schedulingAiWeights.factorId, factorId),
            eq(schedulingAiWeights.providerId, providerId),
            eq(schedulingAiWeights.healthSystemId, healthSystemId)
          )
        )
        .execute();

      if (existing.length) {
        // Update existing
        await db
          .update(schedulingAiWeights)
          .set({
            weight: String(weight),
            enabled: Number(weight) > 0
          })
          .where(eq(schedulingAiWeights.id, existing[0].id))
          .execute();
      } else {
        // Create new
        await db
          .insert(schedulingAiWeights)
          .values([{
            factorId,
            weight: String(weight),
            enabled: Number(weight) > 0,
            providerId,
            healthSystemId,
            createdBy: updatedBy
          }])
          .execute();
      }
    }

    return { success: true };
  }

  // Test patient management methods
  async getAllHealthSystems(): Promise<any[]> {
    return await db.select().from(healthSystems).orderBy(healthSystems.name);
  }



  async getLocationsByHealthSystem(healthSystemId: number): Promise<any[]> {
    return await db
      .select()
      .from(locations)
      .where(eq(locations.healthSystemId, healthSystemId))
      .orderBy(locations.name);
  }

  async getTestPatients(healthSystemId: number): Promise<any[]> {
    return await db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(
        and(
          eq(patients.healthSystemId, healthSystemId),
          sql`${patients.mrn} LIKE 'ZTEST%'`
        )
      )
      .orderBy(desc(patients.createdAt));
  }

  async deletePatientAndAllData(patientId: number): Promise<void> {
    // Delete in order to respect foreign key constraints
    // First delete all data that references the patient
    
    // Delete appointments
    await db.delete(appointments).where(eq(appointments.patientId, patientId));
    
    // Delete scheduling patterns
    await db.delete(patientSchedulingPatterns).where(eq(patientSchedulingPatterns.patientId, patientId));
    
    // Delete medical data
    await db.delete(medicalProblems).where(eq(medicalProblems.patientId, patientId));
    await db.delete(medications).where(eq(medications.patientId, patientId));
    await db.delete(allergies).where(eq(allergies.patientId, patientId));
    await db.delete(vitals).where(eq(vitals.patientId, patientId));
    await db.delete(labResults).where(eq(labResults.patientId, patientId));
    await db.delete(imagingResults).where(eq(imagingResults.patientId, patientId));
    await db.delete(familyHistory).where(eq(familyHistory.patientId, patientId));
    await db.delete(socialHistory).where(eq(socialHistory.patientId, patientId));
    await db.delete(surgicalHistory).where(eq(surgicalHistory.patientId, patientId));
    
    // Delete encounters (this will also cascade delete orders, etc.)
    await db.delete(encounters).where(eq(encounters.patientId, patientId));
    
    // Delete diagnoses
    await db.delete(diagnoses).where(eq(diagnoses.patientId, patientId));
    
    // Finally, delete the patient
    await db.delete(patients).where(eq(patients.id, patientId));
  }

  // Blog/Article System Implementation
  async getArticles(params: {
    status?: string;
    category?: string;
    targetAudience?: string;
    limit?: number;
    offset?: number;
  }): Promise<Article[]> {
    const conditions: any[] = [];
    
    if (params.status) {
      conditions.push(eq(articles.status, params.status));
    }
    
    if (params.category) {
      conditions.push(eq(articles.category, params.category));
    }
    
    if (params.targetAudience) {
      conditions.push(eq(articles.targetAudience, params.targetAudience));
    }
    
    let query = db.select().from(articles);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(articles.publishedAt), desc(articles.createdAt)) as any;
    
    if (params.limit) {
      query = query.limit(params.limit) as any;
    }
    
    if (params.offset) {
      query = query.offset(params.offset) as any;
    }
    
    return await query;
  }

  async getArticleById(id: number): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    return article || undefined;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug));
    return article || undefined;
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const [newArticle] = await db
      .insert(articles)
      .values(article)
      .returning();
    return newArticle;
  }

  async updateArticle(id: number, updates: Partial<Article>): Promise<Article> {
    const [updatedArticle] = await db
      .update(articles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  async incrementArticleViews(id: number): Promise<void> {
    await db
      .update(articles)
      .set({
        viewCount: sql`${articles.viewCount} + 1`,
      })
      .where(eq(articles.id, id));
  }

  // Article Revisions
  async getArticleRevisions(articleId: number): Promise<ArticleRevision[]> {
    return await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, articleId))
      .orderBy(desc(articleRevisions.createdAt));
  }

  async createArticleRevision(revision: InsertArticleRevision): Promise<ArticleRevision> {
    const [newRevision] = await db
      .insert(articleRevisions)
      .values(revision)
      .returning();
    return newRevision;
  }

  // Article Comments
  async getArticleComments(articleId: number, approved?: boolean): Promise<ArticleComment[]> {
    const conditions: any[] = [eq(articleComments.articleId, articleId)];
    
    if (approved !== undefined) {
      conditions.push(eq(articleComments.isApproved, approved));
    }
    
    return await db
      .select()
      .from(articleComments)
      .where(and(...conditions))
      .orderBy(desc(articleComments.createdAt));
  }

  async createArticleComment(comment: InsertArticleComment): Promise<ArticleComment> {
    const [newComment] = await db
      .insert(articleComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async updateArticleComment(id: number, updates: Partial<ArticleComment>): Promise<ArticleComment> {
    const [updatedComment] = await db
      .update(articleComments)
      .set(updates)
      .where(eq(articleComments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteArticleComment(id: number): Promise<void> {
    await db.delete(articleComments).where(eq(articleComments.id, id));
  }

  // Article Generation Queue
  async getArticleGenerationQueue(status?: string): Promise<ArticleGenerationQueue[]> {
    if (status) {
      return await db
        .select()
        .from(articleGenerationQueue)
        .where(eq(articleGenerationQueue.status, status))
        .orderBy(articleGenerationQueue.createdAt);
    }
    
    return await db
      .select()
      .from(articleGenerationQueue)
      .orderBy(articleGenerationQueue.createdAt);
  }

  async createArticleGenerationQueueItem(item: InsertArticleGenerationQueue): Promise<ArticleGenerationQueue> {
    const [newItem] = await db
      .insert(articleGenerationQueue)
      .values(item)
      .returning();
    return newItem;
  }

  async updateArticleGenerationQueueItem(id: number, updates: Partial<ArticleGenerationQueue>): Promise<ArticleGenerationQueue> {
    const [updatedItem] = await db
      .update(articleGenerationQueue)
      .set(updates)
      .where(eq(articleGenerationQueue.id, id))
      .returning();
    return updatedItem;
  }

  // Newsletter Subscribers
  async getNewsletterSubscribers(unsubscribed?: boolean): Promise<NewsletterSubscriber[]> {
    if (unsubscribed === false) {
      return await db
        .select()
        .from(newsletterSubscribers)
        .where(sql`${newsletterSubscribers.unsubscribedAt} IS NULL`)
        .orderBy(desc(newsletterSubscribers.subscribedAt));
    } else if (unsubscribed === true) {
      return await db
        .select()
        .from(newsletterSubscribers)
        .where(sql`${newsletterSubscribers.unsubscribedAt} IS NOT NULL`)
        .orderBy(desc(newsletterSubscribers.subscribedAt));
    }
    
    return await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [newSubscriber] = await db
      .insert(newsletterSubscribers)
      .values(subscriber)
      .returning();
    return newSubscriber;
  }

  async updateNewsletterSubscriber(id: number, updates: Partial<NewsletterSubscriber>): Promise<NewsletterSubscriber> {
    const [updatedSubscriber] = await db
      .update(newsletterSubscribers)
      .set(updates)
      .where(eq(newsletterSubscribers.id, id))
      .returning();
    return updatedSubscriber;
  }

  async unsubscribeNewsletter(email: string): Promise<void> {
    await db
      .update(newsletterSubscribers)
      .set({
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.email, email));
  }

  // Blog Generation Settings
  private blogGenerationSettings = new Map<number, any>();

  async getBlogGenerationSettings(userId: number): Promise<any> {
    return this.blogGenerationSettings.get(userId) || null;
  }

  async saveBlogGenerationSettings(userId: number, settings: any): Promise<void> {
    this.blogGenerationSettings.set(userId, settings);
  }
}

export const storage = new DatabaseStorage();
