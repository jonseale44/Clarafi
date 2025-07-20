-- Modern Authentication Tables for Clarafi EMR
-- This migration adds support for WebAuthn, Magic Links, and TOTP

-- WebAuthn credentials for passkey support
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[], -- ['usb', 'nfc', 'ble', 'internal']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_credential UNIQUE(user_id, credential_id)
);

-- Magic links for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'login', -- 'login', 'registration', 'password_reset'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for magic_links
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

-- TOTP secrets for two-factor authentication
CREATE TABLE IF NOT EXISTS totp_secrets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to users table for modern auth
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_auth_method TEXT DEFAULT 'password' CHECK (preferred_auth_method IN ('password', 'webauthn', 'magic_link')),
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_history TEXT[],
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webauthn_enabled BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_totp_user_id ON totp_secrets(user_id);

-- Add comments for documentation
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn/Passkey credentials for passwordless authentication';
COMMENT ON TABLE magic_links IS 'Temporary tokens for passwordless email authentication';
COMMENT ON TABLE totp_secrets IS 'TOTP secrets for two-factor authentication (Google Authenticator compatible)';
COMMENT ON COLUMN users.preferred_auth_method IS 'User''s preferred authentication method';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts, resets on successful login';
COMMENT ON COLUMN users.locked_until IS 'Account locked until this timestamp due to too many failed attempts';