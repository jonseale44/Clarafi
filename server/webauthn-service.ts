import { db } from './db.js';
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
  
  // Get RP ID dynamically based on environment
  private static getRPID(origin?: string): string {
    // If we have a production domain environment variable, use it
    if (process.env.PRODUCTION_DOMAIN) {
      return process.env.PRODUCTION_DOMAIN;
    }
    
    // If origin is provided (from request), extract hostname
    if (origin) {
      try {
        const url = new URL(origin);
        return url.hostname;
      } catch (e) {
        console.error('🔑 [WebAuthn] Failed to parse origin:', origin);
      }
    }
    
    // Fallback to Replit dev domain or localhost
    return process.env.REPLIT_DEV_DOMAIN || 'localhost';
  }
  
  // Get origin dynamically based on environment
  private static getOrigin(origin?: string): string {
    // If origin is provided (from request), use it
    if (origin) {
      return origin;
    }
    
    // If we have a production domain, use it with https
    if (process.env.PRODUCTION_DOMAIN) {
      return `https://${process.env.PRODUCTION_DOMAIN}`;
    }
    
    // Fallback to Replit dev domain or localhost
    return process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
  }

  static {
    console.log('🔑 [WebAuthn] Configuration:', {
      RP_NAME: this.RP_NAME,
      DEFAULT_RP_ID: this.getRPID(),
      DEFAULT_ORIGIN: this.getOrigin(),
      ENV_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
      PRODUCTION_DOMAIN: process.env.PRODUCTION_DOMAIN
    });
  }

  /**
   * Generate registration options for a new passkey
   */
  static async generateRegistrationOptions(userId: number, origin?: string): Promise<{
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
      // Use raw SQL to avoid column name mismatch between schema and database
      const credQuery = await db.execute(sql`
        SELECT id, user_id, credential_id, credential_public_key, counter, device_type, transports
        FROM webauthn_credentials
        WHERE user_id = ${userId}
      `);
      
      existingCredentials = credQuery.rows || [];
      console.log('✅ [WebAuthn] Found existing credentials:', existingCredentials.length);
    } catch (error) {
      console.error('❌ [WebAuthn] Error fetching existing credentials:', error);
      console.error('Stack trace:', (error as any).stack);
      // Continue with empty credentials array
      existingCredentials = [];
    }

    const excludeCredentials = existingCredentials.map((cred: any) => ({
      id: cred.credential_id,
      type: 'public-key' as const,
      transports: (typeof cred.transports === 'string' ? JSON.parse(cred.transports) : cred.transports) as AuthenticatorTransport[] || []
    }));

    const challenge = randomBytes(32).toString('base64url');
    
    // Convert userId to Uint8Array - use a more robust encoding
    // Create a buffer with the numeric user ID (4 bytes for a 32-bit integer)
    const userIdBuffer = new Uint8Array(4);
    const view = new DataView(userIdBuffer.buffer);
    view.setUint32(0, userId, false); // false = big-endian
    console.log('🔍 [WebAuthn] Converting userID:', userId, 'to Uint8Array:', Array.from(userIdBuffer));

    const options = await generateRegistrationOptions({
      rpName: this.RP_NAME,
      rpID: this.getRPID(origin),
      userID: userIdBuffer,
      userName: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    });

    console.log('📋 [WebAuthn] Generated options:', JSON.stringify(options, null, 2));

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
    expectedChallenge: string,
    origin?: string
  ): Promise<{ verified: boolean; credentialId?: string }> {
    console.log('📝 [WebAuthn] verifyRegistrationResponse called with:', {
      userId,
      responseId: response?.id,
      responseType: response?.type,
      hasAttestationObject: !!response?.response?.attestationObject,
      hasClientDataJSON: !!response?.response?.clientDataJSON,
      expectedChallenge: expectedChallenge?.substring(0, 10) + '...',
      rpOrigin: this.getOrigin(origin),
      rpId: this.getRPID(origin)
    });

    try {
      const expectedOrigin = this.getOrigin(origin);
      const expectedRPID = this.getRPID(origin);
      
      console.log('🔍 [WebAuthn] Verification parameters:', {
        expectedOrigin,
        expectedRPID,
        expectedChallenge: expectedChallenge.substring(0, 20) + '...',
        responseChallenge: response?.response?.clientDataJSON ? 
          JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64').toString()).challenge?.substring(0, 20) + '...' : 
          'N/A'
      });
      
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: false
      });

      console.log('📝 [WebAuthn] Verification result:', {
        verified: verification.verified,
        hasRegistrationInfo: !!verification.registrationInfo,
        errorMessage: (verification as any).error
      });

      if (!verification.verified || !verification.registrationInfo) {
        console.error('❌ [WebAuthn] Verification failed:', {
          verified: verification.verified,
          verificationData: verification
        });
        return { verified: false };
      }

      const { credential } = verification.registrationInfo;

      // Determine device type from transports or default
      const deviceType = response.response.transports?.includes('internal') ? 'Platform' : 'Security Key';

      // Store the credential
      console.log('📝 [WebAuthn] Storing credential with columns:', {
        userId,
        credentialId: Buffer.from(credential.id).toString('base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: Number(credential.counter),
        deviceType,
        transports: response.response.transports || []
      });
      
      // Use raw SQL with actual column names from database
      const insertQuery = sql`
        INSERT INTO webauthn_credentials (
          user_id,
          credential_id,
          credential_public_key,
          counter,
          device_type,
          transports,
          created_at
        ) VALUES (
          ${userId},
          ${Buffer.from(credential.id).toString('base64url')},
          ${Buffer.from(credential.publicKey).toString('base64')},
          ${Number(credential.counter)},
          ${deviceType},
          ${JSON.stringify(response.response.transports || [])}::jsonb,
          NOW()
        )
      `;
      
      await db.execute(insertQuery);

      console.log(`✅ [WebAuthn] Passkey registered for user ${userId}`);
      return { verified: true, credentialId: Buffer.from(credential.id).toString('base64url') };
    } catch (error: any) {
      console.error('❌ [WebAuthn] Registration verification error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      });
      
      // Log specific error details for debugging
      if (error.message?.includes('origin')) {
        console.error('🔍 [WebAuthn] Origin mismatch error - check deployed domain configuration');
      } else if (error.message?.includes('challenge')) {
        console.error('🔍 [WebAuthn] Challenge mismatch error - session might have expired');
      } else if (error.message?.includes('rpId')) {
        console.error('🔍 [WebAuthn] RP ID mismatch error - domain configuration issue');
      }
      
      return { verified: false };
    }
  }

  /**
   * Generate authentication options for passkey login
   */
  static async generateAuthenticationOptions(email?: string, origin?: string): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challenge: string;
  }> {
    let allowCredentials: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[] = [];

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
      rpID: this.getRPID(origin),
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
    expectedChallenge: string,
    origin?: string
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
        hasPublicKey: !!credential.credential_public_key,
        counter: credential.counter
      });

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.getOrigin(origin),
        expectedRPID: this.getRPID(origin),
        credential: {
          id: Buffer.from(credential.credential_id as string, 'base64url'),
          publicKey: Buffer.from(credential.credential_public_key as string, 'base64'),
          counter: Number(credential.counter)
        },
        requireUserVerification: false
      });

      if (verification.verified) {
        // Update counter using raw SQL
        const updateQuery = sql`
          UPDATE webauthn_credentials
          SET counter = ${Number(verification.authenticationInfo.newCounter)},
              last_used_at = NOW()
          WHERE id = ${Number(credential.id)}
        `;
        
        await db.execute(updateQuery);

        console.log(`✅ [WebAuthn] Authentication successful for user ${Number(credential.user_id)}`);
        return { verified: true, userId: Number(credential.user_id) };
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
          device_type,
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
        deviceType: cred.device_type || 'unknown',
        displayName: this.getPasskeyDisplayName(cred.device_type || 'unknown', false),
        registeredDevice: cred.device_type // Use device_type as registeredDevice
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
      return (result.rowCount || 0) > 0;
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
    for (const [k, v] of Array.from(this.challenges.entries())) {
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