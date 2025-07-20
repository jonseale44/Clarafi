-- Add per-user billing tracking columns to health_systems table

-- Add active_user_count column
ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS active_user_count JSONB DEFAULT '{"providers": 0, "clinicalStaff": 0, "adminStaff": 0, "lastUpdated": "2025-01-01T00:00:00.000Z"}'::jsonb;

-- Add billing_details column  
ALTER TABLE health_systems
ADD COLUMN IF NOT EXISTS billing_details JSONB DEFAULT '{"monthlyTotal": 0, "providerRate": 399, "clinicalStaffRate": 99, "adminStaffRate": 49}'::jsonb;