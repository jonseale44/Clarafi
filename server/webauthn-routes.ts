import { Router } from 'express';
import { WebAuthnService } from './webauthn-service';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Generate registration options for a new passkey
 * Requires authenticated user
 */
router.get('/webauthn/register/options', async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { options, challenge } = await WebAuthnService.generateRegistrationOptions((req as any).user!.id);
    
    // Store challenge in session
    req.session.webauthnChallenge = challenge;
    
    res.json(options);
  } catch (error) {
    console.error('❌ [WebAuthn] Registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

/**
 * Verify registration response and save passkey
 * Requires authenticated user
 */
router.post('/webauthn/register/verify', async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { response } = req.body;
    const expectedChallenge = req.session.webauthnChallenge;

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No challenge found. Please start registration again.' });
    }

    const result = await WebAuthnService.verifyRegistrationResponse(
      (req as any).user!.id,
      response,
      expectedChallenge
    );

    // Clear challenge from session
    delete req.session.webauthnChallenge;

    if (result.verified) {
      res.json({ 
        verified: true, 
        message: 'Passkey registered successfully',
        credentialId: result.credentialId 
      });
    } else {
      res.status(400).json({ error: 'Registration verification failed' });
    }
  } catch (error) {
    console.error('❌ [WebAuthn] Registration verification error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

/**
 * Generate authentication options for passkey login
 * No authentication required (this is for login)
 */
router.post('/webauthn/authenticate/options', async (req, res) => {
  try {
    const { email } = req.body;
    
    const { options, challenge } = await WebAuthnService.generateAuthenticationOptions(email);
    
    // Store challenge in session
    req.session.webauthnChallenge = challenge;
    
    res.json(options);
  } catch (error) {
    console.error('❌ [WebAuthn] Authentication options error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

/**
 * Verify authentication response and log user in
 * No authentication required (this is for login)
 */
router.post('/webauthn/authenticate/verify', async (req, res) => {
  try {
    const { response } = req.body;
    const expectedChallenge = req.session.webauthnChallenge;

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No challenge found. Please start authentication again.' });
    }

    const result = await WebAuthnService.verifyAuthenticationResponse(
      response,
      expectedChallenge
    );

    // Clear challenge from session
    delete req.session.webauthnChallenge;

    if (result.verified && result.userId) {
      // Get user details
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Log the user in
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userHealthSystemId = user.healthSystemId;
      req.session.userName = user.displayName || user.email;

      console.log(`✅ [WebAuthn] User ${user.email} logged in successfully with passkey`);

      res.json({ 
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          healthSystemId: user.healthSystemId,
          displayName: user.displayName
        }
      });
    } else {
      res.status(400).json({ error: 'Authentication verification failed' });
    }
  } catch (error) {
    console.error('❌ [WebAuthn] Authentication verification error:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});

/**
 * Get all passkeys for the current user
 * Requires authentication
 */
router.get('/webauthn/passkeys', async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const passkeys = await WebAuthnService.getUserPasskeys((req as any).user!.id);
    res.json(passkeys);
  } catch (error) {
    console.error('❌ [WebAuthn] Get passkeys error:', error);
    res.status(500).json({ error: 'Failed to retrieve passkeys' });
  }
});

/**
 * Delete a passkey
 * Requires authentication
 */
router.delete('/webauthn/passkeys/:id', async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const passkeyId = parseInt(req.params.id);
    if (isNaN(passkeyId)) {
      return res.status(400).json({ error: 'Invalid passkey ID' });
    }

    const deleted = await WebAuthnService.deletePasskey(req.user.id, passkeyId);
    
    if (deleted) {
      res.json({ success: true, message: 'Passkey deleted successfully' });
    } else {
      res.status(404).json({ error: 'Passkey not found' });
    }
  } catch (error) {
    console.error('❌ [WebAuthn] Delete passkey error:', error);
    res.status(500).json({ error: 'Failed to delete passkey' });
  }
});

console.log('🔑 [WebAuthn] WebAuthn routes registered');
export default router;