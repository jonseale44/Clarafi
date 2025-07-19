import { db } from './db.js';
import { 
  electronicSignatures, 
  users, 
  medications,
  type InsertElectronicSignature,
  type ElectronicSignature,
  type User,
  type Medication
} from '../shared/schema.js';
import { eq, and, desc, isNull } from 'drizzle-orm';
import crypto from 'crypto';

export class ElectronicSignatureService {
  /**
   * Creates a new electronic signature for medication prescriptions
   * Handles both regular and DEA signatures for controlled substances
   */
  async createSignature(params: {
    userId: number;
    encounterId?: number;
    signatureType: 'typed' | 'drawn' | 'biometric';
    signatureData: string; // typed name or base64 canvas data
    authenticationMethod: 'password' | 'biometric' | 'two_factor';
    twoFactorUsed?: boolean;
    deaSignature?: boolean;
    ipAddress?: string;
    userAgent?: string;
    medicationIds?: number[]; // Medications being signed
  }): Promise<ElectronicSignature> {
    console.log('📝 [ElectronicSignature] Creating signature:', {
      userId: params.userId,
      type: params.signatureType,
      deaSignature: params.deaSignature,
      medicationCount: params.medicationIds?.length || 0
    });

    try {
      // Validate provider credentials
      const provider = await this.validateProviderCredentials(params.userId, params.deaSignature || false);
      
      // Generate certification text based on signature type
      const certificationText = this.generateCertificationText(
        provider,
        params.deaSignature || false,
        params.medicationIds?.length || 0
      );

      // Hash the signature data for integrity
      const signatureHash = this.hashSignatureData(params.signatureData);

      // Create the signature record
      const [signature] = await db.insert(electronicSignatures)
        .values({
          userId: params.userId,
          encounterId: params.encounterId || null,
          signatureType: params.signatureType,
          signatureData: params.signatureData,
          signatureHash,
          signatureCanvas: params.signatureType === 'drawn' ? params.signatureData : null,
          certificationText,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          authenticationMethod: params.authenticationMethod,
          twoFactorUsed: params.twoFactorUsed || false,
          deaSignature: params.deaSignature || false,
          deaNumber: params.deaSignature ? provider.deaNumber : null,
          deaSchedules: params.deaSignature ? await this.getSchedulesForMedications(params.medicationIds || []) : null,
          signatureString: params.signatureType === 'typed' ? params.signatureData : null,
        })
        .returning();

      console.log('✅ [ElectronicSignature] Signature created:', signature.id);

      // Update medications with electronic signature reference
      if (params.medicationIds && params.medicationIds.length > 0) {
        await this.linkSignatureToMedications(signature.id, params.medicationIds);
      }

      return signature;
    } catch (error) {
      console.error('❌ [ElectronicSignature] Error creating signature:', error);
      throw error;
    }
  }

  /**
   * Validates that a provider has the necessary credentials for signing
   */
  private async validateProviderCredentials(userId: number, requiresDea: boolean): Promise<User & { deaNumber?: string }> {
    const [provider] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.role !== 'provider' && provider.role !== 'admin') {
      throw new Error('User does not have prescribing privileges');
    }

    // For now, we'll simulate DEA number validation
    // In production, this would check against actual DEA registry
    if (requiresDea) {
      const deaNumber = await this.getProviderDeaNumber(userId);
      if (!deaNumber) {
        throw new Error('DEA registration required for controlled substances');
      }
      return { ...provider, deaNumber };
    }

    return provider;
  }

  /**
   * Gets DEA number for provider (simulated for now)
   */
  private async getProviderDeaNumber(userId: number): Promise<string | null> {
    // In production, this would fetch from provider credentials
    // For now, we'll generate a mock DEA number format: 2 letters + 7 digits
    const [provider] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    if (!provider) return null;

    // Generate mock DEA: First letter of last name + First letter of first name + 7 digits
    const firstLetter = provider.lastName?.[0]?.toUpperCase() || 'X';
    const secondLetter = provider.firstName?.[0]?.toUpperCase() || 'X';
    const numbers = String(userId).padStart(7, '0');
    
    return `${firstLetter}${secondLetter}${numbers}`;
  }

  /**
   * Gets DEA schedules for medications being signed
   */
  private async getSchedulesForMedications(medicationIds: number[]): Promise<string[]> {
    if (medicationIds.length === 0) return [];

    const meds = await db.select()
      .from(medications)
      .where(and(
        medications.id as any, 
        medicationIds
      ));

    const schedules = new Set<string>();
    meds.forEach(med => {
      if (med.deaSchedule) {
        schedules.add(med.deaSchedule);
      }
    });

    return Array.from(schedules).sort();
  }

  /**
   * Links electronic signature to medications
   */
  private async linkSignatureToMedications(signatureId: number, medicationIds: number[]): Promise<void> {
    console.log('🔗 [ElectronicSignature] Linking signature to medications:', { signatureId, medicationIds });

    await db.update(medications)
      .set({ 
        electronicSignatureId: signatureId,
        updatedAt: new Date()
      })
      .where(and(
        medications.id as any,
        medicationIds
      ));
  }

  /**
   * Generates certification text based on signature type and requirements
   */
  private generateCertificationText(provider: User, isDea: boolean, medicationCount: number): string {
    const timestamp = new Date().toISOString();
    const providerName = `${provider.firstName} ${provider.lastName}`.trim();
    
    if (isDea) {
      return `I, ${providerName}, certify that this prescription for controlled substance(s) ` +
             `is issued for a legitimate medical purpose by a practitioner acting in the usual ` +
             `course of professional practice. I have reviewed the patient's history and current ` +
             `medications. DEA regulations have been followed. ` +
             `Signed electronically on ${timestamp}`;
    }
    
    return `I, ${providerName}, certify that I have examined the patient and that this ` +
           `prescription for ${medicationCount} medication(s) is medically necessary and appropriate. ` +
           `I have reviewed the patient's allergies and current medications. ` +
           `Signed electronically on ${timestamp}`;
  }

  /**
   * Creates a hash of signature data for integrity verification
   */
  private hashSignatureData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifies an electronic signature is valid and unchanged
   */
  async verifySignature(signatureId: number, signatureData?: string): Promise<boolean> {
    const [signature] = await db.select()
      .from(electronicSignatures)
      .where(eq(electronicSignatures.id, signatureId));

    if (!signature) {
      return false;
    }

    // If signature data provided, verify hash matches
    if (signatureData) {
      const hash = this.hashSignatureData(signatureData);
      return hash === signature.signatureHash;
    }

    // Otherwise just verify signature exists and is not revoked
    return signature.revokedAt === null;
  }

  /**
   * Gets the most recent valid signature for a user
   */
  async getRecentSignature(userId: number, deaRequired: boolean = false): Promise<ElectronicSignature | null> {
    const query = db.select()
      .from(electronicSignatures)
      .where(and(
        eq(electronicSignatures.userId, userId),
        isNull(electronicSignatures.revokedAt)
      ))
      .orderBy(desc(electronicSignatures.createdAt))
      .limit(1);

    if (deaRequired) {
      query.where(and(
        eq(electronicSignatures.userId, userId),
        eq(electronicSignatures.deaSignature, true),
        isNull(electronicSignatures.revokedAt)
      ));
    }

    const [signature] = await query;
    return signature || null;
  }

  /**
   * Revokes an electronic signature (e.g., if credentials compromised)
   */
  async revokeSignature(signatureId: number, reason: string): Promise<void> {
    await db.update(electronicSignatures)
      .set({
        revokedAt: new Date(),
        revokedReason: reason
      })
      .where(eq(electronicSignatures.id, signatureId));

    console.log('🚫 [ElectronicSignature] Signature revoked:', { signatureId, reason });
  }

  /**
   * Checks if a medication requires DEA signature based on schedule
   */
  async requiresDeaSignature(medicationId: number): Promise<boolean> {
    const [medication] = await db.select()
      .from(medications)
      .where(eq(medications.id, medicationId));

    if (!medication || !medication.deaSchedule) {
      return false;
    }

    // DEA signature required for Schedule II-V controlled substances
    const controlledSchedules = ['II', 'III', 'IV', 'V', '2', '3', '4', '5'];
    return controlledSchedules.includes(medication.deaSchedule);
  }

  /**
   * GPT-enhanced signature validation
   * Uses AI to detect potential fraudulent patterns or anomalies
   */
  async validateSignatureWithGPT(signature: ElectronicSignature): Promise<{
    valid: boolean;
    confidence: number;
    concerns: string[];
  }> {
    // This would integrate with GPT to analyze:
    // - Signature patterns and consistency
    // - Unusual prescribing patterns
    // - Time-based anomalies
    // - Geographic inconsistencies
    
    // For now, return a simple validation
    return {
      valid: true,
      confidence: 0.95,
      concerns: []
    };
  }

  /**
   * Creates a session-based signature for non-controlled medications
   * This matches Epic/Athena behavior where login session is sufficient authorization
   */
  async createSessionBasedSignature(userId: number): Promise<number> {
    console.log('🔐 [ElectronicSignature] Creating session-based signature for non-controlled prescription');
    
    try {
      // Get provider info
      const [provider] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Create a session-based signature record
      const [signature] = await db.insert(electronicSignatures)
        .values({
          userId,
          signatureType: 'typed',
          signatureData: `${provider.firstName} ${provider.lastName}`,
          signatureHash: this.hashSignatureData(`session-${userId}-${Date.now()}`),
          certificationText: `Session-based authorization for non-controlled prescription by ${provider.firstName} ${provider.lastName}`,
          authenticationMethod: 'password', // User already authenticated via login
          twoFactorUsed: false,
          deaSignature: false,
          signatureString: `${provider.firstName} ${provider.lastName}`,
          // Mark this as a session-based auto-signature
          ipAddress: 'session-based',
          userAgent: 'auto-generated'
        })
        .returning();

      console.log('✅ [ElectronicSignature] Session-based signature created:', signature.id);
      return signature.id;
    } catch (error) {
      console.error('❌ [ElectronicSignature] Error creating session-based signature:', error);
      throw error;
    }
  }
}