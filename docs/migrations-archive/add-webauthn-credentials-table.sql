-- Add WebAuthn Credentials table for passkey authentication
-- This table stores passkey credentials for users enabling passwordless authentication

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id SERIAL PRIMARY KEY,
  
  -- User association
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credential details
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0 NOT NULL,
  
  -- Device information
  device_type TEXT,
  transports JSONB,
  registered_device TEXT,
  
  -- Metadata
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX webauthn_credentials_user_idx ON webauthn_credentials(user_id);
CREATE INDEX webauthn_credentials_credential_idx ON webauthn_credentials(credential_id);
CREATE INDEX webauthn_credentials_created_idx ON webauthn_credentials(created_at);

-- Grant permissions (adjust based on your database users)
-- GRANT ALL ON webauthn_credentials TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE webauthn_credentials_id_seq TO your_app_user;