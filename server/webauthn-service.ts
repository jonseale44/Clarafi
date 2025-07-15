import { db } from './db';
import { webauthnCredentials, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
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
    
    // First check table structure
    try {
      const columnInfo = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'webauthn_credentials'
        ORDER BY ordinal_position
      `);
      console.log('📋 [WebAuthn] webauthn_credentials columns:', JSON.stringify(columnInfo.rows, null, 2));
    } catch (colError) {
      console.error('❌ [WebAuthn] Error fetching column info:', colError);
    }
    
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
    
    // Convert userId to Uint8Array as required by SimpleWebAuthn v10+
    const userIdBuffer = new TextEncoder().encode(userId.toString());
    console.log('🔍 [WebAuthn] Converting userID:', userId, 'to Uint8Array:', userIdBuffer);

    const options = await generateRegistrationOptions({
      rpName: this.RP_NAME,
      rpID: this.RP_ID,
      userID: userIdBuffer,
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
    console.log('📝 [WebAuthn] verifyRegistrationResponse called with:', {
      userId,
      responseId: response?.id,
      responseType: response?.type,
      hasAttestationObject: !!response?.response?.attestationObject,
      hasClientDataJSON: !!response?.response?.clientDataJSON,
      expectedChallenge: expectedChallenge?.substring(0, 10) + '...',
      rpOrigin: this.ORIGIN,
      rpId: this.RP_ID
    });

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
      
      // Use raw SQL with actual column names from database
      const insertQuery = sql`
        INSERT INTO webauthn_credentials (
          user_id,
          credential_id,
          public_key,
          counter,
          device_name,
          transports,
          created_at
        ) VALUES (
          ${userId},
          ${Buffer.from(credentialID).toString('base64url')},
          ${Buffer.from(credentialPublicKey).toString('base64')},
          ${Number(counter)},
          ${credentialDeviceType || response.response.authenticatorAttachment || 'Security Key'},
          ${JSON.stringify(response.response.transports || [])}::jsonb,
          NOW()
        )
      `;
      
      await db.execute(insertQuery);

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
        // Use raw SQL with correct column names
        const credQuery = sql`
          SELECT credential_id, transports
          FROM webauthn_credentials
          WHERE user_id = ${user.id}
        `;
        
        const credResult = await db.execute(credQuery);
        
        allowCredentials = credResult.rows.map((cred: any) => ({
          id: cred.credential_id,
          type: 'public-key' as const,
          transports: JSON.parse(cred.transports || '[]') as AuthenticatorTransport[]
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
      // Find the credential using raw SQL
      const credentialId = response.id;
      const credQuery = sql`
        SELECT *
        FROM webauthn_credentials
        WHERE credential_id = ${credentialId}
        LIMIT 1
      `;
      
      const credResult = await db.execute(credQuery);
      const credential = credResult.rows[0];

      if (!credential) {
        console.error('❌ [WebAuthn] Credential not found:', credentialId);
        return { verified: false };
      }

      console.log('🔍 [WebAuthn] Verifying with credential:', {
        credentialId: credential.credential_id,
        hasPublicKey: !!credential.public_key,
        counter: credential.counter
      });

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        authenticator: {
          credentialID: Buffer.from(credential.credential_id, 'base64url'),
          credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
          counter: credential.counter
        },
        requireUserVerification: false
      });

      if (verification.verified) {
        // Update counter using raw SQL
        const updateQuery = sql`
          UPDATE webauthn_credentials
          SET counter = ${verification.authenticationInfo.newCounter},
              last_used_at = NOW()
          WHERE id = ${credential.id}
        `;
        
        await db.execute(updateQuery);

        console.log(`✅ [WebAuthn] Authentication successful for user ${credential.user_id}`);
        return { verified: true, userId: credential.user_id };
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
      // Use the actual column names from the database
      const query = sql`
        SELECT 
          id,
          credential_id,
          created_at,
          last_used_at,
          device_name,
          transports
        FROM webauthn_credentials
        WHERE user_id = ${userId}
      `;
      
      const credentials = await db.execute(query);
      
      console.log(`✅ [WebAuthn] Found ${credentials.rows.length} passkeys for user ${userId}`);
      console.log('📝 [WebAuthn] Raw query result:', credentials.rows);

      return credentials.rows.map((cred: any) => ({
        id: cred.id,
        credentialId: cred.credential_id,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
        deviceType: cred.device_name || 'unknown',
        displayName: this.getPasskeyDisplayName(cred.device_name || 'unknown', false),
        registeredDevice: cred.device_name // Use device_name as registeredDevice
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
    try {
      // Use raw SQL with actual column names
      const deleteQuery = sql`
        DELETE FROM webauthn_credentials
        WHERE id = ${passkeyId} AND user_id = ${userId}
      `;
      
      const result = await db.execute(deleteQuery);

      console.log(`✅ [WebAuthn] Passkey ${passkeyId} deleted for user ${userId}`);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`❌ [WebAuthn] Error deleting passkey ${passkeyId}:`, error);
      return false;
    }
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