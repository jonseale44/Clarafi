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
router.post('/webauthn/register/options', async (req: any, res) => {
  try {
    console.log('📝 [WebAuthn] Registration options request:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      sessionId: req.sessionID,
      headers: req.headers
    });

    if (!req.isAuthenticated()) {
      console.error('❌ [WebAuthn] User not authenticated for registration');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('🔍 [WebAuthn] Generating registration options for user:', req.user!.id);
    const { options, challenge } = await WebAuthnService.generateRegistrationOptions((req as any).user!.id);
    
    // Store challenge in session
    req.session.webauthnChallenge = challenge;
    console.log('✅ [WebAuthn] Challenge stored in session:', challenge);
    
    res.json(options);
  } catch (error) {
    console.error('❌ [WebAuthn] Registration options error:', error);
    console.error('Stack trace:', (error as any).stack);
    res.status(500).json({ error: 'Failed to generate registration options', details: (error as any).message });
  }
});

/**
 * Verify registration response and save passkey
 * Requires authenticated user
 */
router.post('/webauthn/register/verify', async (req: any, res) => {
  console.log('📝 [WebAuthn] Registration verify request:', {
    method: req.method,
    url: req.url,
    isAuthenticated: req.isAuthenticated(),
    userId: req.user?.id,
    sessionId: req.sessionID,
    hasChallenge: !!req.session?.webauthnChallenge,
    bodyKeys: Object.keys(req.body || {}),
    contentType: req.headers['content-type']
  });

  try {
    if (!req.isAuthenticated()) {
      console.error('❌ [WebAuthn] User not authenticated for registration verify');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { response, displayName } = req.body;
    console.log('📝 [WebAuthn] Registration response received:', {
      hasResponse: !!response,
      displayName: displayName,
      responseType: response?.type,
      responseId: response?.id,
      responseKeys: response ? Object.keys(response) : []
    });

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
    console.error('Stack trace:', (error as any).stack);
    console.error('Error details:', {
      name: (error as any).name,
      message: (error as any).message,
      code: (error as any).code
    });
    res.status(500).json({ error: 'Failed to verify registration', details: (error as any).message });
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
    console.log('📝 [WebAuthn] Get passkeys request:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      sessionId: req.sessionID
    });

    if (!req.isAuthenticated()) {
      console.error('❌ [WebAuthn] User not authenticated for getting passkeys');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('🔍 [WebAuthn] Fetching passkeys for user:', req.user!.id);
    const passkeys = await WebAuthnService.getUserPasskeys((req as any).user!.id);
    console.log(`✅ [WebAuthn] Returning ${passkeys.length} passkeys`);
    res.json(passkeys);
  } catch (error) {
    console.error('❌ [WebAuthn] Get passkeys error:', error);
    console.error('Stack trace:', (error as any).stack);
    res.status(500).json({ error: 'Failed to retrieve passkeys', details: (error as any).message });
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