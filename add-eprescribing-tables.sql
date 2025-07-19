-- Add e-prescribing tables for production medication endpoints
-- Phase 1: Core infrastructure for pharmacy transmission

-- 1. Electronic Signatures table
CREATE TABLE IF NOT EXISTS electronic_signatures (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  encounter_id INTEGER REFERENCES encounters(id),
  
  -- Signature data
  signature_type TEXT NOT NULL CHECK (signature_type IN ('medication', 'encounter', 'lab', 'controlled_substance')),
  signature_data TEXT NOT NULL, -- Base64 encoded signature image or cryptographic signature
  signature_method TEXT NOT NULL CHECK (signature_method IN ('drawn', 'typed', 'biometric', 'cryptographic')),
  
  -- Two-factor authentication for controlled substances
  two_factor_method TEXT CHECK (two_factor_method IN ('sms', 'authenticator', 'biometric')),
  two_factor_verified BOOLEAN DEFAULT FALSE,
  two_factor_timestamp TIMESTAMP,
  
  -- GPT-enhanced compliance tracking
  compliance_checks JSONB DEFAULT '{}',
  dea_compliance_level TEXT CHECK (dea_compliance_level IN ('standard', 'epcs_ready', 'epcs_verified')),
  
  -- Audit trail
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pharmacy Master Data table
CREATE TABLE IF NOT EXISTS pharmacies (
  id SERIAL PRIMARY KEY,
  
  -- Core identification
  ncpdp_id TEXT NOT NULL UNIQUE, -- NCPDP Provider ID (7 digits)
  npi TEXT, -- National Provider Identifier (10 digits)
  dea_number TEXT, -- DEA registration number
  
  -- Pharmacy details
  name TEXT NOT NULL,
  dba_name TEXT, -- Doing Business As name
  corporate_name TEXT, -- Parent company
  
  -- Location
  address TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact information
  phone TEXT NOT NULL,
  fax TEXT,
  email TEXT,
  website TEXT,
  
  -- Hours and services
  hours JSONB DEFAULT '{}', -- {"monday": {"open": "09:00", "close": "18:00"}, ...}
  is_24_hour BOOLEAN DEFAULT FALSE,
  services TEXT[] DEFAULT '{}', -- ['retail', 'compounding', 'specialty', 'mail_order']
  
  -- E-prescribing capabilities
  accepts_eprescribing BOOLEAN DEFAULT TRUE,
  accepts_controlled_substances BOOLEAN DEFAULT FALSE,
  preferred_transmission_method TEXT DEFAULT 'surescripts' CHECK (preferred_transmission_method IN ('surescripts', 'fax', 'phone')),
  surescripts_version TEXT, -- '10.6', '6.0', etc.
  
  -- GPT-enhanced pharmacy intelligence
  specialty_types TEXT[] DEFAULT '{}', -- ['oncology', 'pediatric', 'fertility']
  insurance_networks JSONB DEFAULT '[]', -- GPT-parsed accepted insurances
  preferred_for_conditions TEXT[] DEFAULT '{}', -- GPT recommendations
  
  -- Status and metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  last_verified TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Prescription Transmission Tracking table
CREATE TABLE IF NOT EXISTS prescription_transmissions (
  id SERIAL PRIMARY KEY,
  
  -- References
  medication_id INTEGER NOT NULL REFERENCES medications(id),
  order_id INTEGER REFERENCES orders(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  provider_id INTEGER NOT NULL REFERENCES users(id),
  pharmacy_id INTEGER REFERENCES pharmacies(id),
  electronic_signature_id INTEGER REFERENCES electronic_signatures(id),
  
  -- Transmission details
  transmission_type TEXT NOT NULL CHECK (transmission_type IN ('new_rx', 'refill', 'change', 'cancel')),
  transmission_method TEXT NOT NULL CHECK (transmission_method IN ('surescripts', 'fax', 'print', 'phone')),
  message_id TEXT UNIQUE, -- SureScripts message ID
  
  -- NCPDP transaction data
  ncpdp_transaction_id TEXT,
  ncpdp_version TEXT, -- 'SCRIPT 10.6', etc.
  ncpdp_message_type TEXT CHECK (ncpdp_message_type IN ('NEWRX', 'RXFILL', 'RXCHG', 'CANRX')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'transmitted', 'accepted', 'rejected', 'error')),
  status_history JSONB DEFAULT '[]', -- Array of status changes with timestamps
  
  -- Response data
  pharmacy_response JSONB DEFAULT '{}', -- Full response from pharmacy
  pharmacy_notes TEXT, -- Human-readable notes from pharmacy
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- GPT-enhanced tracking
  gpt_analysis JSONB DEFAULT '{}', -- GPT analysis of transmission issues
  gpt_recommendations TEXT[] DEFAULT '{}', -- GPT suggestions for resolution
  
  -- Timestamps
  queued_at TIMESTAMP,
  transmitted_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add new columns to medications table for e-prescribing
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS dea_schedule TEXT CHECK (dea_schedule IN ('CI', 'CII', 'CIII', 'CIV', 'CV')),
ADD COLUMN IF NOT EXISTS pharmacy_ncpdp_id TEXT,
ADD COLUMN IF NOT EXISTS transmission_status TEXT CHECK (transmission_status IN ('pending', 'transmitted', 'accepted', 'rejected', 'error')),
ADD COLUMN IF NOT EXISTS transmission_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS transmission_message_id TEXT,
ADD COLUMN IF NOT EXISTS transmission_errors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS electronic_signature_id INTEGER REFERENCES electronic_signatures(id);

-- Create indexes for performance
CREATE INDEX idx_pharmacies_ncpdp_id ON pharmacies(ncpdp_id);
CREATE INDEX idx_pharmacies_city_state ON pharmacies(city, state);
CREATE INDEX idx_pharmacies_status ON pharmacies(status);
CREATE INDEX idx_prescription_transmissions_medication_id ON prescription_transmissions(medication_id);
CREATE INDEX idx_prescription_transmissions_status ON prescription_transmissions(status);
CREATE INDEX idx_prescription_transmissions_message_id ON prescription_transmissions(message_id);
CREATE INDEX idx_electronic_signatures_user_id ON electronic_signatures(user_id);
CREATE INDEX idx_electronic_signatures_signature_type ON electronic_signatures(signature_type);

-- Add comments for documentation
COMMENT ON TABLE electronic_signatures IS 'Stores electronic signatures for e-prescribing compliance, including two-factor authentication for controlled substances';
COMMENT ON TABLE pharmacies IS 'Master data for pharmacies including NCPDP IDs, capabilities, and GPT-enhanced intelligence';
COMMENT ON TABLE prescription_transmissions IS 'Detailed tracking of prescription transmissions to pharmacies via SureScripts or other methods';