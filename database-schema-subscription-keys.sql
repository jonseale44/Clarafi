-- Subscription Keys System Implementation
-- Phase 1: Database Schema Changes

-- 1. Add subscription key tracking
CREATE TABLE subscription_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(20) UNIQUE NOT NULL,
  healthSystemId INTEGER NOT NULL REFERENCES health_systems(id),
  keyType VARCHAR(20) NOT NULL CHECK (keyType IN ('provider', 'staff', 'admin')),
  subscriptionTier INTEGER NOT NULL CHECK (subscriptionTier IN (1, 2, 3)),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'deactivated')),
  createdAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP NOT NULL, -- 72 hours from creation for unused keys
  usedBy INTEGER REFERENCES users(id),
  usedAt TIMESTAMP,
  deactivatedBy INTEGER REFERENCES users(id),
  deactivatedAt TIMESTAMP,
  metadata JSONB DEFAULT '{}', -- For tracking regeneration count, notes, etc.
  INDEX idx_subscription_keys_health_system (healthSystemId),
  INDEX idx_subscription_keys_status (status),
  INDEX idx_subscription_keys_expiry (expiresAt)
);

-- 2. Add user verification status
ALTER TABLE users ADD COLUMN 
  verificationStatus VARCHAR(20) DEFAULT 'unverified' 
  CHECK (verificationStatus IN ('unverified', 'verified', 'tier3_verified'));

ALTER TABLE users ADD COLUMN
  verifiedWithKeyId INTEGER REFERENCES subscription_keys(id);

ALTER TABLE users ADD COLUMN
  verifiedAt TIMESTAMP;

-- 3. Track patient creation ownership
ALTER TABLE patients ADD COLUMN 
  createdByUserId INTEGER REFERENCES users(id);

-- Backfill existing patients with their creator (if trackable)
UPDATE patients p
SET createdByUserId = (
  SELECT u.id 
  FROM users u 
  WHERE u.healthSystemId = p.healthSystemId 
  LIMIT 1
)
WHERE createdByUserId IS NULL;

-- 4. Add subscription limits to health systems
ALTER TABLE health_systems ADD COLUMN
  subscriptionLimits JSONB DEFAULT '{
    "providerKeys": 0,
    "staffKeys": 0,
    "totalUsers": 0
  }';

-- Update existing tier 3 systems with default limits
UPDATE health_systems 
SET subscriptionLimits = jsonb_build_object(
  'providerKeys', CASE 
    WHEN subscriptionTier = 3 THEN 10  -- Default 10 provider keys for tier 3
    ELSE 0 
  END,
  'staffKeys', CASE 
    WHEN subscriptionTier = 3 THEN 20  -- Default 20 staff keys for tier 3
    ELSE 0 
  END,
  'totalUsers', CASE 
    WHEN subscriptionTier = 3 THEN 30
    WHEN subscriptionTier = 2 THEN 5
    ELSE 1 
  END
)
WHERE subscriptionLimits = '{"providerKeys": 0, "staffKeys": 0, "totalUsers": 0}';

-- 5. Track subscription history for grace periods and data retention
CREATE TABLE subscription_history (
  id SERIAL PRIMARY KEY,
  healthSystemId INTEGER NOT NULL REFERENCES health_systems(id),
  previousTier INTEGER,
  newTier INTEGER,
  changeType VARCHAR(20) CHECK (changeType IN ('upgrade', 'downgrade', 'expire', 'reactivate')),
  changedAt TIMESTAMP DEFAULT NOW(),
  gracePeriodEnds TIMESTAMP,
  dataExpiresAt TIMESTAMP, -- 30 days after grace period ends
  metadata JSONB DEFAULT '{}'
);

-- 6. Email notification tracking
CREATE TABLE email_notifications (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  healthSystemId INTEGER REFERENCES health_systems(id),
  notificationType VARCHAR(50) NOT NULL,
  sentAt TIMESTAMP DEFAULT NOW(),
  emailAddress VARCHAR(255) NOT NULL,
  subject TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 7. Add indexes for performance
CREATE INDEX idx_patients_created_by ON patients(createdByUserId);
CREATE INDEX idx_patients_health_system_created ON patients(healthSystemId, createdByUserId);
CREATE INDEX idx_users_verification_status ON users(verificationStatus);
CREATE INDEX idx_subscription_history_health_system ON subscription_history(healthSystemId);
CREATE INDEX idx_email_notifications_user ON email_notifications(userId, notificationType);