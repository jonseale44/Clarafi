# Modern Authentication Implementation Plan for Clarafi EMR

## Current State Analysis

### Technical Debt Identified

#### 1. Password Validation Inconsistencies
- **`/api/validate-password`**: Still uses old 8-char + uppercase/lowercase/number/special requirements
- **`auth-page.tsx` registration**: Uses old 8-char + complex regex validation
- **`password-change-required.tsx`**: Uses new 12-char evidence-based approach
- **`/api/change-password`**: Recently updated to 12-char
- **Mobile apps (4 separate implementations!)**: No password strength validation at all

#### 2. Hardcoded Temporary Passwords
- `server/clinic-admin-verification-service.ts`: Uses 'ChangeMe123!' hardcoded
- `server/reset-admin-password.ts`: Uses 'admin123' hardcoded
- `server/setup-admin.ts`: Uses 'admin123' as default

#### 3. Incomplete MFA Implementation
- Database schema has `twoFactorRequired` field
- Audit logging mentions 'mfa_challenge' events
- Admin accounts set `twoFactorRequired: true` but no actual MFA implementation
- No TOTP secret storage or verification logic

#### 4. Multiple Mobile App Implementations
- `clarafi-mobile`: React Native implementation
- `clarafi-mobile-expo`: Expo implementation
- `clarafi-mobile-web`: React web implementation
- `clarafi-mobile-capacitor`: Ionic implementation
- Each has separate authentication code that needs updating

#### 5. Security Vulnerabilities
- WebSocket connections expose OpenAI API keys in browser
- Direct frontend-to-OpenAI connections
- No rate limiting on authentication endpoints
- No account lockout after failed attempts

## Proposed Modern Authentication Architecture

### 1. WebAuthn/Passkeys (Primary - Most Secure)
**Benefits:**
- No passwords to remember or steal
- Phishing-proof by design
- Uses device biometrics (Touch ID, Face ID)
- Works with hardware security keys (YubiKey)
- Meets highest enterprise security standards

**Implementation Requirements:**
- Add `webauthn_credentials` table for storing public keys
- Implement registration ceremony for enrolling devices
- Support multiple devices per user
- Fallback to other methods when device unavailable

### 2. Magic Links (Secondary - Best UX)
**Benefits:**
- No passwords needed
- Simple email-based authentication
- Great for initial account setup
- Reduces support burden

**Implementation Requirements:**
- Replace temporary passwords with secure tokens
- Add `magic_links` table with expiring tokens
- Email template for magic link delivery
- Token expiration (15 minutes)
- Single-use tokens

### 3. TOTP/2FA (Additional Layer)
**Benefits:**
- Industry standard (Google Authenticator)
- Works offline
- Free for users
- Familiar to healthcare professionals

**Implementation Requirements:**
- Add `totp_secrets` table
- QR code generation for easy setup
- Backup codes for recovery
- Grace period for clock drift

### 4. Password Improvements (Fallback)
**Benefits:**
- Familiar to all users
- Works everywhere
- No external dependencies

**Implementation Requirements:**
- Standardize to 12+ character minimum everywhere
- Remove complex character requirements
- Add password strength meter to all forms
- Implement haveibeenpwned.com API check
- Add password history to prevent reuse

## Implementation Priority & Timeline

### Phase 1: Password Consistency (1 day)
1. Update `/api/validate-password` to use 12-char minimum
2. Update `auth-page.tsx` registration form validation
3. Update all mobile app password validation
4. Remove hardcoded temporary passwords
5. Implement secure random password generation

### Phase 2: Magic Links (2 days)
1. Create `magic_links` table
2. Implement token generation and validation
3. Create email templates
4. Update registration flow to use magic links
5. Add "Login with Email" option

### Phase 3: WebAuthn/Passkeys (3 days)
1. Create `webauthn_credentials` table
2. Implement registration ceremony
3. Implement authentication ceremony
4. Add device management UI
5. Support multiple devices per user

### Phase 4: TOTP/2FA (2 days)
1. Create `totp_secrets` table
2. Implement secret generation and QR codes
3. Add verification logic
4. Create backup codes system
5. Add 2FA enrollment UI

### Phase 5: Security Hardening (1 day)
1. Add rate limiting to auth endpoints
2. Implement account lockout after failures
3. Add device fingerprinting
4. Implement IP geolocation
5. Enhanced audit logging

## Database Schema Changes

```sql
-- WebAuthn credentials
CREATE TABLE webauthn_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Magic links
CREATE TABLE magic_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TOTP secrets
CREATE TABLE totp_secrets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update users table
ALTER TABLE users 
ADD COLUMN preferred_auth_method TEXT DEFAULT 'password',
ADD COLUMN last_password_change TIMESTAMP,
ADD COLUMN password_history TEXT[],
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP;
```

## User Experience Flow

### New User Registration
1. User enters email only
2. System sends magic link
3. User clicks link to set up account
4. Prompted to set up WebAuthn if device supports
5. Optional: Set up backup password
6. Optional: Enable 2FA

### Returning User Login
1. Email entry screen with options:
   - "Use Passkey" (if enrolled)
   - "Send Magic Link"
   - "Use Password" (if set)
2. If 2FA enabled, prompt for code
3. Session established

### Progressive Security Enhancement
- Start with magic link (easiest)
- Prompt to add passkey after first login
- Suggest 2FA for admin/provider roles
- Never force complexity on users

## API Endpoint Changes

### New Endpoints
- `POST /api/auth/webauthn/register-options`
- `POST /api/auth/webauthn/register`
- `POST /api/auth/webauthn/login-options`
- `POST /api/auth/webauthn/login`
- `POST /api/auth/magic-link/send`
- `POST /api/auth/magic-link/verify`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/verify`
- `POST /api/auth/totp/disable`
- `GET /api/auth/methods` (available auth methods for user)

### Updated Endpoints
- `/api/login` - Support multiple auth methods
- `/api/register` - Use magic links instead of temporary passwords
- `/api/validate-password` - Update to 12-char minimum
- `/api/change-password` - Add password history check

## Security Considerations

### WebAuthn Security
- Store only public keys (private keys never leave device)
- Implement replay attack prevention with counters
- Support attestation for high-security deployments
- Handle device loss scenarios

### Magic Link Security
- Tokens must be cryptographically random (32 bytes)
- Single-use enforcement
- Short expiration (15 minutes)
- Rate limit email sending
- Clear tokens after use

### TOTP Security
- Secrets never exposed after generation
- Time window tolerance (±30 seconds)
- Backup codes for recovery
- Rate limit verification attempts

### General Security
- All auth methods subject to rate limiting
- Account lockout after 5 failed attempts
- Comprehensive audit logging
- Session security improvements
- CSRF protection on all endpoints

## Mobile App Considerations

### Unified Authentication Service
Create shared authentication service that all mobile apps can use:
- Consistent password validation
- WebAuthn support where available
- Magic link handling
- Biometric authentication wrapper

### Platform-Specific Features
- **iOS**: Face ID, Touch ID integration
- **Android**: Fingerprint, face unlock
- **Web**: WebAuthn with fallbacks
- **Capacitor/Ionic**: Native biometric plugins

## Backwards Compatibility

### Gradual Migration
1. Existing passwords continue to work
2. Prompt users to upgrade security on login
3. Admin can enforce methods by role
4. No forced password resets
5. Graceful fallbacks

### Legacy Support
- Keep password auth as fallback
- Support session-based auth
- Maintain cookie authentication
- Gradual deprecation plan

## Success Metrics

### Security Metrics
- Reduction in password reset requests
- Decrease in account compromises
- Faster authentication times
- Higher MFA adoption rates

### User Experience Metrics
- Reduced time to first login
- Lower abandonment rates
- Fewer support tickets
- Higher user satisfaction

## Next Steps

1. **Review & Approve Plan**: Ensure alignment with business goals
2. **Create Database Migrations**: Set up new tables
3. **Implement Phase 1**: Password consistency across codebase
4. **Progressive Rollout**: Start with magic links, add features gradually
5. **Monitor & Iterate**: Track metrics and adjust

## Estimated Total Timeline: 9 days

With parallel work on some phases, could be completed in 5-7 days.