-- Create clinic_admin_verifications table
CREATE TABLE IF NOT EXISTS clinic_admin_verifications (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  verification_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  health_system_id INTEGER REFERENCES health_systems(id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  approved_by INTEGER REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinic_admin_verifications_email ON clinic_admin_verifications(email);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_verifications_status ON clinic_admin_verifications(status);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_verifications_expires_at ON clinic_admin_verifications(expires_at);