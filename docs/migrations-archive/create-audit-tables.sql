-- HIPAA-Compliant Audit Logging Tables
-- Required for production EMR deployment
-- Minimum 6 year retention for HIPAA compliance

-- PHI Access Audit Log
-- Tracks every access to patient health information
CREATE TABLE IF NOT EXISTS phi_access_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who accessed the data
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL, -- Denormalized for immutability
  user_role TEXT NOT NULL, -- Denormalized for immutability
  health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  location_id INTEGER REFERENCES locations(id),
  
  -- What was accessed
  patient_id INTEGER REFERENCES patients(id),
  patient_name TEXT, -- Denormalized for immutability (encrypted)
  resource_type TEXT NOT NULL, -- 'patient', 'encounter', 'medication', 'lab_result', etc.
  resource_id INTEGER NOT NULL,
  
  -- How it was accessed
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'print', 'export'
  access_method TEXT NOT NULL, -- 'web', 'api', 'mobile', 'report'
  http_method TEXT, -- GET, POST, PUT, DELETE
  api_endpoint TEXT, -- /api/patients/:id
  
  -- Context
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  session_id TEXT,
  
  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time INTEGER, -- milliseconds
  
  -- Additional compliance data
  access_reason TEXT, -- 'treatment', 'payment', 'operations', 'patient_request'
  emergency_access BOOLEAN DEFAULT FALSE,
  break_glass_reason TEXT, -- For emergency override access
  
  -- Immutable timestamp
  accessed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Authentication Audit Log
-- Tracks all authentication attempts and session events
CREATE TABLE IF NOT EXISTS authentication_logs (
  id SERIAL PRIMARY KEY,
  
  -- User info (may be null for failed login attempts)
  user_id INTEGER REFERENCES users(id),
  username TEXT NOT NULL,
  email TEXT,
  health_system_id INTEGER REFERENCES health_systems(id),
  
  -- Event details
  event_type TEXT NOT NULL, -- 'login_attempt', 'login_success', 'login_failure', 'logout', 'session_timeout', 'password_change', 'mfa_challenge', 'account_locked'
  success BOOLEAN NOT NULL,
  failure_reason TEXT, -- 'invalid_password', 'account_locked', 'mfa_failed', etc.
  
  -- Security info
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  geolocation JSONB,
  
  -- Session info
  session_id TEXT,
  session_duration INTEGER, -- seconds
  
  -- MFA info
  mfa_type TEXT, -- 'totp', 'sms', 'email'
  mfa_success BOOLEAN,
  
  -- Risk assessment
  risk_score INTEGER, -- 0-100
  risk_factors TEXT[], -- ['new_device', 'unusual_location', 'multiple_failures']
  
  -- Immutable timestamp
  event_time TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Data Modification Audit Log
-- Tracks all changes to clinical data
CREATE TABLE IF NOT EXISTS data_modification_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who made the change
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL, -- Denormalized
  user_role TEXT NOT NULL, -- Denormalized
  health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  
  -- What was changed
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  patient_id INTEGER REFERENCES patients(id), -- If applicable
  
  -- Change details
  operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
  field_name TEXT, -- For updates, which field changed
  old_value JSONB, -- Previous value (encrypted if PHI)
  new_value JSONB, -- New value (encrypted if PHI)
  
  -- Context
  change_reason TEXT, -- User-provided reason for change
  encounter_id INTEGER REFERENCES encounters(id),
  order_authority TEXT, -- For order-related changes
  
  -- Validation
  validated BOOLEAN DEFAULT FALSE,
  validated_by INTEGER REFERENCES users(id),
  validated_at TIMESTAMP,
  
  -- Immutable timestamp
  modified_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Emergency Access Log
-- Special logging for break-glass emergency access scenarios
CREATE TABLE IF NOT EXISTS emergency_access_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who accessed
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  
  -- What was accessed
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  patient_name TEXT NOT NULL, -- Encrypted
  
  -- Emergency details
  emergency_type TEXT NOT NULL, -- 'life_threatening', 'urgent_care', 'disaster_response'
  justification TEXT NOT NULL, -- Required detailed explanation
  authorizing_physician TEXT,
  
  -- Access scope
  access_start_time TIMESTAMP DEFAULT NOW() NOT NULL,
  access_end_time TIMESTAMP,
  accessed_resources JSONB DEFAULT '[]', -- Array of resources accessed
  
  -- Review process
  review_required BOOLEAN DEFAULT TRUE,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_outcome TEXT, -- 'approved', 'violation_found', 'additional_training_required'
  review_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_phi_access_logs_user_id ON phi_access_logs(user_id);
CREATE INDEX idx_phi_access_logs_patient_id ON phi_access_logs(patient_id);
CREATE INDEX idx_phi_access_logs_accessed_at ON phi_access_logs(accessed_at);
CREATE INDEX idx_phi_access_logs_health_system_id ON phi_access_logs(health_system_id);

CREATE INDEX idx_authentication_logs_user_id ON authentication_logs(user_id);
CREATE INDEX idx_authentication_logs_username ON authentication_logs(username);
CREATE INDEX idx_authentication_logs_event_time ON authentication_logs(event_time);
CREATE INDEX idx_authentication_logs_event_type ON authentication_logs(event_type);

CREATE INDEX idx_data_modification_logs_user_id ON data_modification_logs(user_id);
CREATE INDEX idx_data_modification_logs_patient_id ON data_modification_logs(patient_id);
CREATE INDEX idx_data_modification_logs_table_name ON data_modification_logs(table_name);
CREATE INDEX idx_data_modification_logs_modified_at ON data_modification_logs(modified_at);

CREATE INDEX idx_emergency_access_logs_user_id ON emergency_access_logs(user_id);
CREATE INDEX idx_emergency_access_logs_patient_id ON emergency_access_logs(patient_id);
CREATE INDEX idx_emergency_access_logs_created_at ON emergency_access_logs(created_at);

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only_audit_role;
-- GRANT INSERT ON phi_access_logs, authentication_logs, data_modification_logs, emergency_access_logs TO application_role;

COMMENT ON TABLE phi_access_logs IS 'HIPAA-compliant audit log for all PHI access. Required 6+ year retention.';
COMMENT ON TABLE authentication_logs IS 'Tracks all authentication events for security auditing.';
COMMENT ON TABLE data_modification_logs IS 'Tracks all changes to clinical data for compliance.';
COMMENT ON TABLE emergency_access_logs IS 'Special logging for break-glass emergency access scenarios.';