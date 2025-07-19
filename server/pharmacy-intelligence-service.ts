import { db } from './db.js';
import { 
  pharmacies, 
  patientOrderPreferences,
  medications,
  patients,
  prescriptionTransmissions,
  type Pharmacy,
  type PatientOrderPreferences,
  type Patient,
  type Medication
} from '../shared/schema.js';
import { eq, and, or, sql, desc, isNull, inArray } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class PharmacyIntelligenceService {
  /**
   * GPT-enhanced pharmacy selection based on multiple factors
   * This is where the magic happens - GPT makes intelligent decisions
   */
  async selectBestPharmacy(params: {
    patientId: number;
    medicationIds: number[];
    preferredPharmacyId?: number;
    requiresCompounding?: boolean;
    isControlled?: boolean;
    urgency?: 'routine' | 'urgent' | 'emergency';
    patientLocation?: { lat: number; lng: number };
  }): Promise<{
    pharmacy: Pharmacy;
    reasoning: string;
    confidence: number;
    alternatives: Pharmacy[];
  }> {
    console.log('🧠 [PharmacyIntelligence] Selecting best pharmacy:', params);

    try {
      // Gather all relevant data for GPT decision-making
      const [patient, preferences, medicationDetails, nearbyPharmacies] = await Promise.all([
        this.getPatientDetails(params.patientId),
        this.getPatientPreferences(params.patientId),
        this.getMedicationDetails(params.medicationIds),
        this.getNearbyPharmacies(params.patientLocation, params.preferredPharmacyId)
      ]);

      // Get transmission history for pattern analysis
      const transmissionHistory = await this.getTransmissionHistory(params.patientId);

      // Let GPT make the intelligent decision
      const gptDecision = await this.getGPTPharmacyRecommendation({
        patient,
        preferences,
        medications: medicationDetails,
        nearbyPharmacies,
        transmissionHistory,
        requirements: {
          compounding: params.requiresCompounding || false,
          controlled: params.isControlled || false,
          urgency: params.urgency || 'routine'
        }
      });

      console.log('✨ [PharmacyIntelligence] GPT recommendation:', {
        pharmacyId: gptDecision.recommendedPharmacyId,
        confidence: gptDecision.confidence,
        reasoning: gptDecision.reasoning
      });

      // Fetch the recommended pharmacy
      const [recommendedPharmacy] = await db.select()
        .from(pharmacies)
        .where(eq(pharmacies.id, gptDecision.recommendedPharmacyId));

      if (!recommendedPharmacy) {
        throw new Error('Recommended pharmacy not found');
      }

      // Get alternative pharmacies
      const alternatives = await this.getAlternativePharmacies(
        gptDecision.alternativeIds,
        gptDecision.recommendedPharmacyId
      );

      return {
        pharmacy: recommendedPharmacy,
        reasoning: gptDecision.reasoning,
        confidence: gptDecision.confidence,
        alternatives
      };
    } catch (error) {
      console.error('❌ [PharmacyIntelligence] Error selecting pharmacy:', error);
      throw error;
    }
  }

  /**
   * Uses GPT to make intelligent pharmacy recommendation
   */
  private async getGPTPharmacyRecommendation(data: {
    patient: Patient;
    preferences: PatientOrderPreferences | null;
    medications: Medication[];
    nearbyPharmacies: Pharmacy[];
    transmissionHistory: any[];
    requirements: {
      compounding: boolean;
      controlled: boolean;
      urgency: string;
    };
  }): Promise<{
    recommendedPharmacyId: number;
    alternativeIds: number[];
    reasoning: string;
    confidence: number;
  }> {
    const prompt = `You are an expert pharmacy selection AI for an EMR system. Analyze the following data and recommend the best pharmacy for this prescription:

PATIENT INFORMATION:
- Location: ${data.patient.city}, ${data.patient.state}
- Previous pharmacy preference: ${data.preferences?.preferredPharmacyName || 'None set'}
- Insurance considerations: ${data.preferences?.preferredDeliveryMethod || 'Standard'}

MEDICATIONS TO FILL:
${data.medications.map(med => `- ${med.name} ${med.strength || ''} ${med.dosageForm || ''} ${med.deaSchedule ? `(DEA Schedule ${med.deaSchedule})` : ''}`).join('\n')}

SPECIAL REQUIREMENTS:
- Needs compounding: ${data.requirements.compounding ? 'YES' : 'NO'}
- Controlled substances: ${data.requirements.controlled ? 'YES' : 'NO'}
- Urgency: ${data.requirements.urgency}

AVAILABLE PHARMACIES:
${data.nearbyPharmacies.map(p => `
ID: ${p.id}
Name: ${p.name}
Type: ${p.pharmacyType}
Address: ${p.address}, ${p.city}, ${p.state}
E-Prescribe: ${p.acceptsEprescribe ? 'YES' : 'NO'}
Controlled: ${p.acceptsControlled ? 'YES' : 'NO'}
Compounding: ${p.acceptsCompounding ? 'YES' : 'NO'} ${p.compoundingLevel ? `(Level: ${p.compoundingLevel})` : ''}
Hours: ${p.hours || 'Not specified'}
`).join('\n---')}

PREVIOUS TRANSMISSION HISTORY:
${data.transmissionHistory.slice(0, 5).map(t => `- ${t.pharmacyName}: ${t.status} (${t.daysAgo} days ago)`).join('\n')}

Based on this information, recommend the BEST pharmacy considering:
1. Capability to fill all medications (especially controlled substances if needed)
2. Patient convenience and location
3. Previous successful transmissions
4. Operating hours for urgency level
5. Special requirements like compounding
6. E-prescribing capability for efficiency

Provide your response as JSON with this structure:
{
  "recommendedPharmacyId": <number>,
  "alternativeIds": [<up to 2 alternative pharmacy IDs>],
  "reasoning": "<clear explanation of why this pharmacy is best>",
  "confidence": <0.0 to 1.0>
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent decisions
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate the response
    if (!response.recommendedPharmacyId || typeof response.confidence !== 'number') {
      throw new Error('Invalid GPT response format');
    }

    // Ensure alternativeIds is always an array
    if (!Array.isArray(response.alternativeIds)) {
      response.alternativeIds = [];
    }

    return response;
  }

  /**
   * Gets patient details for context
   */
  private async getPatientDetails(patientId: number): Promise<Patient> {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId)
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return patient;
  }

  /**
   * Gets patient's pharmacy preferences
   */
  private async getPatientPreferences(patientId: number): Promise<PatientOrderPreferences | null> {
    const preferences = await db.query.patientOrderPreferences.findFirst({
      where: eq(patientOrderPreferences.patientId, patientId)
    });

    return preferences || null;
  }

  /**
   * Gets medication details including DEA schedules
   */
  private async getMedicationDetails(medicationIds: number[]): Promise<Medication[]> {
    if (medicationIds.length === 0) return [];

    return await db.query.medications.findMany({
      where: inArray(medications.id, medicationIds)
    });
  }

  /**
   * Gets nearby pharmacies based on location
   */
  private async getNearbyPharmacies(
    location?: { lat: number; lng: number },
    preferredId?: number
  ): Promise<Pharmacy[]> {
    try {
      // For now, get all active pharmacies
      // In production, this would use geospatial queries
      const pharmacyList = await db.query.pharmacies.findMany({
        where: eq(pharmacies.status, 'active'),
        limit: 10
      });

      // If preferred pharmacy specified, ensure it's included
      if (preferredId) {
        const hasPreferred = pharmacyList.some(p => p.id === preferredId);
        
        if (!hasPreferred) {
          const preferred = await db.query.pharmacies.findFirst({
            where: eq(pharmacies.id, preferredId)
          });
          
          if (preferred) {
            pharmacyList.unshift(preferred);
          }
        }
      }

      return pharmacyList;
    } catch (error) {
      console.error('❌ [PharmacyIntelligence] Error getting nearby pharmacies:', error);
      // Return empty array if no pharmacies found
      return [];
    }
  }

  /**
   * Gets recent transmission history for pattern analysis
   */
  private async getTransmissionHistory(patientId: number): Promise<any[]> {
    try {
      // Get transmission records with pharmacy info using query API
      const transmissions = await db.query.prescriptionTransmissions.findMany({
        where: eq(prescriptionTransmissions.patientId, patientId),
        orderBy: [desc(prescriptionTransmissions.createdAt)],
        limit: 10,
        with: {
          pharmacy: true
        }
      });

      // Transform the data to include calculated fields
      const recentTransmissions = transmissions.map(t => ({
        pharmacyName: t.pharmacy?.name || 'Unknown Pharmacy',
        status: t.transmissionStatus,
        createdAt: t.createdAt,
        daysAgo: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }));

      return recentTransmissions;
    } catch (error) {
      console.error('❌ [PharmacyIntelligence] Error getting transmission history:', error);
      return [];
    }
  }

  /**
   * Gets alternative pharmacy options
   */
  private async getAlternativePharmacies(
    alternativeIds: number[],
    primaryId: number
  ): Promise<Pharmacy[]> {
    // Ensure alternativeIds is an array and filter out invalid values
    const validIds = Array.isArray(alternativeIds) 
      ? alternativeIds.filter(id => typeof id === 'number' && id !== primaryId)
      : [];
    
    if (validIds.length === 0) return [];

    const alternatives = await db.query.pharmacies.findMany({
      where: inArray(pharmacies.id, validIds)
    });

    return alternatives;
  }

  /**
   * Validates a pharmacy can handle specific prescriptions
   */
  async validatePharmacyCapability(
    pharmacyId: number,
    requirements: {
      hasControlled: boolean;
      needsCompounding: boolean;
      medications: Array<{ name: string; deaSchedule?: string | null }>;
    }
  ): Promise<{
    canFill: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId));

    if (!pharmacy) {
      return {
        canFill: false,
        issues: ['Pharmacy not found in system'],
        recommendations: ['Select a different pharmacy']
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check e-prescribing capability
    if (!pharmacy.acceptsEprescribe) {
      issues.push('Pharmacy does not accept electronic prescriptions');
      recommendations.push('Print prescription for manual delivery or select e-prescribe capable pharmacy');
    }

    // Check controlled substance capability
    if (requirements.hasControlled && !pharmacy.acceptsControlled) {
      issues.push('Pharmacy cannot dispense controlled substances');
      recommendations.push('Select a pharmacy authorized for controlled substances');
    }

    // Check compounding capability
    if (requirements.needsCompounding && !pharmacy.acceptsCompounding) {
      issues.push('Pharmacy does not offer compounding services');
      recommendations.push('Select a compounding pharmacy');
    }

    // GPT can analyze specific medication requirements
    const gptAnalysis = await this.analyzeSpecificMedicationRequirements(
      pharmacy,
      requirements.medications
    );

    if (gptAnalysis.issues.length > 0) {
      issues.push(...gptAnalysis.issues);
      recommendations.push(...gptAnalysis.recommendations);
    }

    return {
      canFill: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * GPT analyzes specific medication requirements
   */
  private async analyzeSpecificMedicationRequirements(
    pharmacy: Pharmacy,
    medications: Array<{ name: string; deaSchedule?: string | null }>
  ): Promise<{ issues: string[]; recommendations: string[] }> {
    // This could use GPT to check for:
    // - Specialty medication availability
    // - Insurance formulary issues
    // - Drug interaction concerns
    // - Supply chain considerations

    // For now, return empty
    return { issues: [], recommendations: [] };
  }

  /**
   * Creates or updates pharmacy from external data
   */
  async upsertPharmacy(pharmacyData: {
    ncpdpId: string;
    npi?: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone?: string;
    fax?: string;
    acceptsEprescribe?: boolean;
    acceptsControlled?: boolean;
    healthSystemId: number;
  }): Promise<Pharmacy> {
    // Check if pharmacy exists by NCPDP ID
    const existing = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.ncpdpId, pharmacyData.ncpdpId));

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db.update(pharmacies)
        .set({
          ...pharmacyData,
          updatedAt: new Date()
        })
        .where(eq(pharmacies.ncpdpId, pharmacyData.ncpdpId))
        .returning();
      
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(pharmacies)
        .values({
          ...pharmacyData,
          pharmacyType: 'retail', // Default type
          active: true
        })
        .returning();
      
      return created;
    }
  }
}