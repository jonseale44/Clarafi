-- Add healthSystemId to users table for multi-tenant isolation
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS health_system_id INTEGER NOT NULL DEFAULT 1 REFERENCES health_systems(id);

-- Add healthSystemId to patients table for multi-tenant isolation
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS health_system_id INTEGER NOT NULL DEFAULT 1 REFERENCES health_systems(id);

-- Add subscription management fields to health_systems table
ALTER TABLE health_systems
ADD COLUMN IF NOT EXISTS subscription_tier INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS merged_into_health_system_id INTEGER REFERENCES health_systems(id),
ADD COLUMN IF NOT EXISTS merged_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_provider_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_health_system_id ON users(health_system_id);
CREATE INDEX IF NOT EXISTS idx_patients_health_system_id ON patients(health_system_id);
CREATE INDEX IF NOT EXISTS idx_health_systems_subscription_status ON health_systems(subscription_status);

-- Add comment to explain the tiers
COMMENT ON COLUMN health_systems.subscription_tier IS 'Subscription tiers: 1=Individual Provider, 2=Small Group Practice, 3=Enterprise';
COMMENT ON COLUMN health_systems.subscription_status IS 'Subscription status: active, suspended, cancelled, trial';
COMMENT ON COLUMN health_systems.merged_into_health_system_id IS 'For tracking when individual providers join larger health systems';
COMMENT ON COLUMN health_systems.original_provider_id IS 'Original provider ID for individual provider health systems';