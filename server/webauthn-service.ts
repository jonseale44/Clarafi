import { db } from './db';
import { webauthnCredentials, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import type { 
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

export class WebAuthnService {
  // Relying Party configuration
  private static readonly RP_NAME = 'Clarafi EMR';
  private static readonly RP_ID = process.env.REPLIT_DEV_DOMAIN?.replace('.replit.dev', '.replit.app') || 'localhost';
  private static readonly ORIGIN = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';

  /**
   * Generate registration options for a new passkey
   */
  static async generateRegistrationOptions(userId: number): Promise<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challenge: string;
  }> {
    console.log('🔍 [WebAuthn] Looking up user with ID:', userId);
    
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }
    
    console.log('✅ [WebAuthn] Found user:', { id: user.id, email: user.email });

    // Get existing credentials to exclude
    console.log('🔍 [WebAuthn] Fetching existing credentials for user:', userId);
    
    let existingCredentials: any[] = [];
    try {
      existingCredentials = await db.select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId));
      
      console.log('✅ [WebAuthn] Found existing credentials:', existingCredentials.length);
    } catch (error) {
      console.error('❌ [WebAuthn] Error fetching existing credentials:', error);
      console.error('Stack trace:', (error as any).stack);
      // Continue with empty credentials array
      existingCredentials = [];
    }

    const excludeCredentials = existingCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
      transports: cred.transports as AuthenticatorTransport[] || []
    }));

    const challenge = randomBytes(32).toString('base64url');

    const options = await generateRegistrationOptions({
      rpName: this.RP_NAME,
      rpID: this.RP_ID,
      userID: userId.toString(),
      userName: user.email,
      userDisplayName: user.displayName || user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    });

    // Store challenge in session or temporary storage
    await this.storeChallenge(userId, challenge, 'registration');

    return { options, challenge };
  }

  /**
   * Verify registration response from the client
   */
  static async verifyRegistrationResponse(
    userId: number,
    response: RegistrationResponseJSON,
    expectedChallenge: string
  ): Promise<{ verified: boolean; credentialId?: string }> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        requireUserVerification: false
      });

      if (!verification.verified || !verification.registrationInfo) {
        return { verified: false };
      }

      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Store the credential
      console.log('📝 [WebAuthn] Storing credential with columns:', {
        userId,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter: Number(counter),
        deviceType: credentialDeviceType || 'unknown',
        transports: response.response.transports || []
      });
      
      await db.insert(webauthnCredentials).values({
        userId,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'), // Fixed column name
        counter: Number(counter),
        deviceType: credentialDeviceType || 'unknown',
        transports: response.response.transports || [],
        registeredDevice: navigator.userAgent || 'Unknown device',
        displayName: response.response.authenticatorAttachment || 'Security Key',
        createdAt: new Date()
      });

      console.log(`✅ [WebAuthn] Passkey registered for user ${userId}`);
      return { verified: true, credentialId: Buffer.from(credentialID).toString('base64url') };
    } catch (error) {
      console.error('❌ [WebAuthn] Registration verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Generate authentication options for passkey login
   */
  static async generateAuthenticationOptions(email?: string): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challenge: string;
  }> {
    let allowCredentials = [];

    if (email) {
      // Get user and their credentials
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user) {
        const credentials = await db.select()
          .from(webauthnCredentials)
          .where(eq(webauthnCredentials.userId, user.id));

        allowCredentials = credentials.map(cred => ({
          id: cred.credentialId,
          type: 'public-key' as const,
          transports: cred.transports as AuthenticatorTransport[] || []
        }));
      }
    }

    const challenge = randomBytes(32).toString('base64url');

    const options = await generateAuthenticationOptions({
      rpID: this.RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
      timeout: 60000 // 60 seconds
    });

    // Store challenge for verification
    await this.storeChallenge(null, challenge, 'authentication');

    return { options, challenge };
  }

  /**
   * Verify authentication response from the client
   */
  static async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    expectedChallenge: string
  ): Promise<{ verified: boolean; userId?: number }> {
    try {
      // Find the credential
      const credentialId = response.id;
      const [credential] = await db.select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.credentialId, credentialId))
        .limit(1);

      if (!credential) {
        console.error('❌ [WebAuthn] Credential not found:', credentialId);
        return { verified: false };
      }

      console.log('🔍 [WebAuthn] Verifying with credential:', {
        credentialId: credential.credentialId,
        hasPublicKey: !!credential.credentialPublicKey,
        counter: credential.counter
      });

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64url'),
          credentialPublicKey: Buffer.from(credential.credentialPublicKey, 'base64'), // Fixed column name
          counter: credential.counter
        },
        requireUserVerification: false
      });

      if (verification.verified) {
        // Update counter
        await db.update(webauthnCredentials)
          .set({ 
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date()
          })
          .where(eq(webauthnCredentials.id, credential.id));

        console.log(`✅ [WebAuthn] Authentication successful for user ${credential.userId}`);
        return { verified: true, userId: credential.userId };
      }

      return { verified: false };
    } catch (error) {
      console.error('❌ [WebAuthn] Authentication verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Get all passkeys for a user
   */
  static async getUserPasskeys(userId: number) {
    console.log(`📝 [WebAuthn] Fetching passkeys for user ${userId}`);
    
    try {
      const credentials = await db.select({
        id: webauthnCredentials.id,
        credentialId: webauthnCredentials.credentialId,
        createdAt: webauthnCredentials.createdAt,
        lastUsedAt: webauthnCredentials.lastUsedAt,
        deviceType: webauthnCredentials.deviceType,
        displayName: webauthnCredentials.displayName,
        registeredDevice: webauthnCredentials.registeredDevice
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

      console.log(`✅ [WebAuthn] Found ${credentials.length} passkeys for user ${userId}`);

      return credentials.map(cred => ({
        ...cred,
        displayName: cred.displayName || this.getPasskeyDisplayName(cred.deviceType || 'unknown', false)
      }));
    } catch (error) {
      console.error(`❌ [WebAuthn] Error fetching passkeys for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a passkey
   */
  static async deletePasskey(userId: number, passkeyId: number): Promise<boolean> {
    const result = await db.delete(webauthnCredentials)
      .where(and(
        eq(webauthnCredentials.id, passkeyId),
        eq(webauthnCredentials.userId, userId)
      ));

    return result.rowCount > 0;
  }

  /**
   * Store challenge temporarily (in production, use Redis or similar)
   */
  private static challenges = new Map<string, { challenge: string; type: string; expires: number }>();
  
  private static async storeChallenge(userId: number | null, challenge: string, type: 'registration' | 'authentication') {
    const key = type === 'registration' ? `reg_${userId}` : `auth_${challenge}`;
    this.challenges.set(key, {
      challenge,
      type,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Clean up expired challenges
    for (const [k, v] of this.challenges.entries()) {
      if (v.expires < Date.now()) {
        this.challenges.delete(k);
      }
    }
  }

  /**
   * Get display name for passkey based on device type
   */
  private static getPasskeyDisplayName(deviceType: string, backedUp: boolean): string {
    const backupText = backedUp ? ' (synced)' : '';
    
    switch (deviceType) {
      case 'singleDevice':
        return `Device passkey${backupText}`;
      case 'multiDevice':
        return `Cloud passkey${backupText}`;
      default:
        return `Passkey${backupText}`;
    }
  }
}