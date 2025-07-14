-- Create organization_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_documents (
  id SERIAL PRIMARY KEY,
  health_system_id INTEGER NOT NULL REFERENCES health_systems(id),
  document_type TEXT NOT NULL, -- 'baa', 'business_license', 'medical_license', 'insurance', 'tax_exempt'
  document_url TEXT NOT NULL,
  document_name TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP, -- For licenses that expire
  metadata JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organization_documents_health_system_id ON organization_documents(health_system_id);
CREATE INDEX IF NOT EXISTS idx_organization_documents_document_type ON organization_documents(document_type);