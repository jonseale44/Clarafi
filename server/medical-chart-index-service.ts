import OpenAI from "openai";
import { db } from "./db.js";
import {
  patients,
  encounters,
  allergies,
  medications,
  diagnoses,
  vitals
} from "../shared/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";

/**
 * Medical Chart Index Service
 * 
 * Provides fast, efficient access to patient medical information for AI assistance
 * Uses a three-tier approach:
 * 1. Fast Medical Summary Cache - Pre-computed structured summaries
 * 2. Semantic Medical Index - Vector embeddings for concept search
 * 3. Intelligent Chart Updating - Differential updates only
 */

export interface MedicalSummaryCache {
  patientId: number;
  
  // Core demographics (rarely change)
  basicInfo: {
    age: number;
    gender: string;
    mrn: string;
  };
  
  // Active medical context (changes frequently)
  activeContext: {
    currentProblems: string[];
    activeMedications: string[];
    criticalAllergies: string[];
    recentDiagnoses: string[];
    lastVitals: Record<string, any>;
  };
  
  // Stable medical background (changes infrequently)
  medicalBackground: {
    medicalHistory: string[];
    familyHistory: string[];
    socialHistory: Record<string, string>;
    persistentFindings: string[];
    chronicConditions: string[];
  };
  
  // AI-optimized context for realtime API
  realtimeContext: {
    tokenOptimizedSummary: string; // < 500 tokens
    prioritizedAlerts: string[];
    relevantHistory: string;
  };
  
  // Metadata
  lastUpdated: Date;
  lastEncounterId: number;
  version: number;
}

export interface MedicalConcept {
  id: string;
  patientId: number;
  conceptType: 'diagnosis' | 'medication' | 'symptom' | 'finding' | 'procedure';
  conceptText: string;
  embedding?: number[]; // Vector embedding for semantic search
  relevanceScore: number;
  lastSeen: Date;
  sourceEncounters: number[];
}

export class MedicalChartIndexService {
  private openai: OpenAI;
  private summaryCache: Map<number, MedicalSummaryCache> = new Map();
  private concepts: Map<number, MedicalConcept[]> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Get fast medical context for realtime OpenAI API calls
   * This is the main method for your realtime voice transcription system
   */
  async getFastMedicalContext(patientId: number): Promise<{
    summary: string;
    activeProblems: string[];
    medications: string[];
    allergies: string[];
    alerts: string[];
    tokenCount: number;
  }> {
    // Try to get from cache first
    let summary = this.summaryCache.get(patientId);
    
    if (!summary || this.isCacheStale(summary)) {
      console.log(`🔄 [MedicalIndex] Refreshing cache for patient ${patientId}`);
      summary = await this.refreshPatientSummary(patientId);
    }

    const context = {
      summary: summary.realtimeContext.tokenOptimizedSummary,
      activeProblems: summary.activeContext.currentProblems,
      medications: summary.activeContext.activeMedications,
      allergies: summary.activeContext.criticalAllergies,
      alerts: summary.realtimeContext.prioritizedAlerts,
      tokenCount: this.estimateTokens(summary.realtimeContext.tokenOptimizedSummary)
    };

    console.log(`✅ [MedicalIndex] Fast context retrieved for patient ${patientId} (${context.tokenCount} tokens)`);
    return context;
  }

  /**
   * Update medical index after encounter completion
   * This replaces your expensive full-chart update
   */
  async updateAfterEncounter(encounterId: number, soapNote: string): Promise<void> {
    const encounter = await db.select()
      .from(encounters)
      .where(eq(encounters.id, encounterId))
      .limit(1);
    
    if (encounter.length === 0) {
      throw new Error(`Encounter ${encounterId} not found`);
    }

    const patientId = encounter[0].patientId;
    console.log(`🔄 [MedicalIndex] Starting incremental update for patient ${patientId}, encounter ${encounterId}`);

    // Get current summary
    const currentSummary = this.summaryCache.get(patientId) || 
      await this.refreshPatientSummary(patientId);

    // Extract new medical concepts from SOAP note
    const newConcepts = await this.extractMedicalConcepts(soapNote, encounterId);
    
    // Perform intelligent differential update
    const updatedSummary = await this.performDifferentialUpdate(
      currentSummary,
      newConcepts,
      encounterId
    );

    // Update cache
    this.summaryCache.set(patientId, updatedSummary);
    
    // Store concepts for semantic search
    await this.updateConceptIndex(patientId, newConcepts);

    console.log(`✅ [MedicalIndex] Incremental update completed for patient ${patientId}`);
  }

  /**
   * Search for medically relevant context using semantic similarity
   * Useful for finding related past encounters or conditions
   */
  async findRelevantMedicalContext(
    patientId: number, 
    query: string, 
    limit: number = 5
  ): Promise<MedicalConcept[]> {
    // Get query embedding
    const queryEmbedding = await this.getTextEmbedding(query);
    
    // Get patient concepts
    const patientConcepts = this.concepts.get(patientId) || [];
    
    // Calculate similarity scores
    const scoredConcepts = patientConcepts
      .filter(concept => concept.embedding)
      .map(concept => ({
        ...concept,
        similarity: this.cosineSimilarity(queryEmbedding, concept.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scoredConcepts;
  }

  /**
   * Refresh complete patient summary (used when cache is stale or missing)
   */
  private async refreshPatientSummary(patientId: number): Promise<MedicalSummaryCache> {
    console.log(`🔄 [MedicalIndex] Building fresh summary for patient ${patientId}`);

    // Get all patient data in parallel (using existing database structure)
    const [
      patient,
      recentEncounters,
      allergiesList,
      currentMeds,
      activeDiagnoses,
      recentVitals
    ] = await Promise.all([
      this.getPatientBasicInfo(patientId),
      this.getRecentEncounters(patientId, 5),
      this.getAllergies(patientId),
      this.getCurrentMedications(patientId),
      this.getActiveDiagnoses(patientId),
      this.getRecentVitals(patientId)
    ]);

    // Build structured summary
    const summary: MedicalSummaryCache = {
      patientId,
      basicInfo: {
        age: this.calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        mrn: patient.mrn
      },
      activeContext: {
        currentProblems: activeDiagnoses.filter(d => d.status === 'active').map(d => d.diagnosis),
        activeMedications: currentMeds.filter(m => m.status === 'active').map(m => `${m.medicationName} ${m.dosage}`),
        criticalAllergies: allergiesList.filter(a => a.severity === 'severe' || a.severity === 'critical').map(a => a.allergen),
        recentDiagnoses: activeDiagnoses.slice(0, 5).map(d => d.diagnosis),
        lastVitals: recentVitals.length > 0 ? this.formatVitals(recentVitals[0]) : {}
      },
      medicalBackground: {
        medicalHistory: [], // Will be populated from encounters
        familyHistory: [], // Will be populated from encounters
        socialHistory: {}, // Will be populated from encounters
        persistentFindings: [], // Will be populated from encounters
        chronicConditions: activeDiagnoses.filter(d => d.status === 'chronic').map(d => d.diagnosis)
      },
      realtimeContext: await this.generateRealtimeContext(patientId, {
        currentProblems: activeDiagnoses.filter(d => d.status === 'active').map(d => d.diagnosis),
        medications: currentMeds.filter(m => m.status === 'active'),
        allergies: allergiesList,
        medicalHistory: []
      }),
      lastUpdated: new Date(),
      lastEncounterId: recentEncounters[0]?.id || 0,
      version: 1
    };

    return summary;
  }

  /**
   * Generate optimized context for OpenAI realtime API (under 500 tokens)
   */
  private async generateRealtimeContext(
    patientId: number,
    rawData: any
  ): Promise<{ tokenOptimizedSummary: string; prioritizedAlerts: string[]; relevantHistory: string; }> {
    const prompt = `
Create a token-efficient medical summary for realtime AI assistance. Maximum 400 tokens.

Patient Data:
- Active Problems: ${rawData.currentProblems.join(', ') || 'None documented'}
- Medications: ${rawData.medications.map((m: any) => `${m.medicationName} ${m.dosage}`).join(', ') || 'None'}
- Allergies: ${rawData.allergies.map((a: any) => `${a.allergen} (${a.reaction || 'reaction unknown'})`).join(', ') || 'NKDA'}
- Key History: ${rawData.medicalHistory.length > 0 ? rawData.medicalHistory.slice(0, 3).join('; ') : 'No significant history'}

Create:
1. conciseSummary: Essential medical context in 1-2 sentences
2. alerts: Critical items requiring immediate attention
3. relevantHistory: Brief relevant background

Return JSON: {
  "conciseSummary": "string",
  "alerts": ["alert1", "alert2"],
  "relevantHistory": "string"
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a medical AI that creates concise, accurate summaries for clinical use. Always return valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || "{}";
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      result = {
        conciseSummary: content.slice(0, 200),
        alerts: [],
        relevantHistory: "Unable to parse structured response"
      };
    }

    return {
      tokenOptimizedSummary: result.conciseSummary || "",
      prioritizedAlerts: result.alerts || [],
      relevantHistory: result.relevantHistory || ""
    };
  }

  /**
   * Extract medical concepts from SOAP note for indexing
   */
  private async extractMedicalConcepts(soapNote: string, encounterId: number): Promise<MedicalConcept[]> {
    const prompt = `
Extract medical concepts from this SOAP note for indexing:

${soapNote}

Return JSON array of concepts:
[{
  "conceptType": "diagnosis|medication|symptom|finding|procedure",
  "conceptText": "exact text",
  "relevanceScore": 0.0-1.0
}]`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Extract structured medical concepts for clinical indexing." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const extracted = JSON.parse(response.choices[0].message.content || "[]");
    
    return extracted.map((concept: any, index: number) => ({
      id: `${encounterId}-${index}`,
      patientId: 0, // Will be set by caller
      conceptType: concept.conceptType,
      conceptText: concept.conceptText,
      relevanceScore: concept.relevanceScore || 0.5,
      lastSeen: new Date(),
      sourceEncounters: [encounterId]
    }));
  }

  /**
   * Perform intelligent differential update
   */
  private async performDifferentialUpdate(
    currentSummary: MedicalSummaryCache,
    newConcepts: MedicalConcept[],
    encounterId: number
  ): Promise<MedicalSummaryCache> {
    // Analyze what changed
    const changes = await this.analyzeChanges(currentSummary, newConcepts);
    
    // Update only changed sections
    const updatedSummary = { ...currentSummary };
    
    if (changes.hasNewDiagnoses) {
      // Update active problems
      const newDiagnoses = newConcepts
        .filter(c => c.conceptType === 'diagnosis')
        .map(c => c.conceptText);
      const combinedProblems = [...updatedSummary.activeContext.currentProblems, ...newDiagnoses];
      updatedSummary.activeContext.currentProblems = combinedProblems.filter((item, index) => combinedProblems.indexOf(item) === index);
    }

    if (changes.hasNewMedications) {
      // Update medications
      const newMeds = newConcepts
        .filter(c => c.conceptType === 'medication')
        .map(c => c.conceptText);
      const combinedMeds = [...updatedSummary.activeContext.activeMedications, ...newMeds];
      updatedSummary.activeContext.activeMedications = combinedMeds.filter((item, index) => combinedMeds.indexOf(item) === index);
    }

    // Regenerate realtime context only if significant changes
    if (changes.hasSignificantChanges) {
      updatedSummary.realtimeContext = await this.generateRealtimeContext(
        updatedSummary.patientId,
        updatedSummary.activeContext
      );
    }

    updatedSummary.lastUpdated = new Date();
    updatedSummary.lastEncounterId = encounterId;
    updatedSummary.version += 1;

    return updatedSummary;
  }

  // Helper methods
  private isCacheStale(summary: MedicalSummaryCache): boolean {
    const ageInMinutes = (Date.now() - summary.lastUpdated.getTime()) / (1000 * 60);
    return ageInMinutes > 30; // Cache expires after 30 minutes
  }

  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private async getTextEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Database query helpers (using existing database structure)
  private async getPatientBasicInfo(patientId: number) {
    const result = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    return result[0];
  }

  private async getRecentEncounters(patientId: number, limit: number) {
    return await db.select()
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.startTime))
      .limit(limit);
  }

  private async getAllergies(patientId: number) {
    return await db.select().from(allergies).where(eq(allergies.patientId, patientId));
  }

  private async getCurrentMedications(patientId: number) {
    return await db.select().from(medications).where(eq(medications.patientId, patientId));
  }

  private async getActiveDiagnoses(patientId: number) {
    return await db.select().from(diagnoses).where(eq(diagnoses.patientId, patientId));
  }

  private async getRecentVitals(patientId: number) {
    return await db.select()
      .from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.measuredAt))
      .limit(1);
  }

  private formatVitals(vitals: any): Record<string, any> {
    return {
      bp: vitals.systolicBp && vitals.diastolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp}` : null,
      hr: vitals.heartRate,
      temp: vitals.temperature,
      o2sat: vitals.oxygenSaturation
    };
  }

  private async analyzeChanges(currentSummary: MedicalSummaryCache, newConcepts: MedicalConcept[]) {
    const hasNewDiagnoses = newConcepts.some(c => c.conceptType === 'diagnosis');
    const hasNewMedications = newConcepts.some(c => c.conceptType === 'medication');
    const hasSignificantChanges = hasNewDiagnoses || hasNewMedications || 
      newConcepts.some(c => c.relevanceScore > 0.8);

    return {
      hasNewDiagnoses,
      hasNewMedications,
      hasSignificantChanges
    };
  }

  private async updateConceptIndex(patientId: number, concepts: MedicalConcept[]) {
    // Update in-memory concept index
    const patientConcepts = this.concepts.get(patientId) || [];
    concepts.forEach(concept => {
      concept.patientId = patientId;
    });
    this.concepts.set(patientId, [...patientConcepts, ...concepts]);
  }
}

export const medicalChartIndex = new MedicalChartIndexService();