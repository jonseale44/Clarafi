-- Fix critical schema issues to get the app working immediately

-- 1. Fix health_systems table: Ensure system_type matches type column
UPDATE health_systems 
SET system_type = type 
WHERE system_type IS NULL OR system_type != type;

-- 2. Add missing columns to health_systems if they don't exist
ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS short_name VARCHAR(255);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS merged_into_health_system_id INTEGER;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS merged_date TIMESTAMP;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS original_provider_id INTEGER;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS primary_contact VARCHAR(255);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS npi VARCHAR(50);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS brand_colors JSONB;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS subscription_limits JSONB;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS active_user_count JSONB;

ALTER TABLE health_systems 
ADD COLUMN IF NOT EXISTS billing_details JSONB;

-- 3. Add some test health systems with proper structure
INSERT INTO health_systems (name, type, system_type, subscription_tier, subscription_status, active)
VALUES 
    ('Hillsboro Community Hospital', 'hospital', 'hospital', 2, 'active', true),
    ('Hillsboro Family Medical Center', 'clinic_group', 'clinic_group', 2, 'active', true),
    ('Austin Regional Clinic', 'multi_location_practice', 'multi_location_practice', 2, 'active', true),
    ('Hill Country Family Medicine', 'clinic', 'clinic', 1, 'active', true)
ON CONFLICT (name) DO UPDATE
SET subscription_status = 'active',
    active = true,
    type = EXCLUDED.type,
    system_type = EXCLUDED.system_type;

-- 4. Add locations for the health systems
WITH hs AS (
    SELECT id, name FROM health_systems WHERE name IN (
        'Hillsboro Community Hospital',
        'Hillsboro Family Medical Center',
        'Hill Country Family Medicine'
    )
)
INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
SELECT 
    hs.id,
    hs.name || ' - Main',
    CASE 
        WHEN hs.name LIKE '%Hospital%' THEN 'hospital'
        ELSE 'clinic'
    END,
    '100 Main Street',
    'Hillsboro',
    'TX',
    '76645',
    '(254) 555-' || (1000 + hs.id),
    true
FROM hs
ON CONFLICT DO NOTHING;

-- 5. Add Austin locations
WITH austin AS (
    SELECT id FROM health_systems WHERE name = 'Austin Regional Clinic'
)
INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
SELECT 
    austin.id,
    location_name,
    'clinic',
    address,
    'Austin',
    'TX',
    '78701',
    phone,
    true
FROM austin
CROSS JOIN (VALUES 
    ('Austin Regional Clinic - North', '1000 N Lamar Blvd', '(512) 555-2001'),
    ('Austin Regional Clinic - South', '2000 S Congress Ave', '(512) 555-2002'),
    ('Austin Regional Clinic - West', '3000 W 6th St', '(512) 555-2003')
) AS locations(location_name, address, phone)
ON CONFLICT DO NOTHING;

-- Show results
SELECT 
    hs.id,
    hs.name,
    hs.type,
    hs.system_type,
    hs.subscription_status,
    hs.active,
    COUNT(l.id) as location_count
FROM health_systems hs
LEFT JOIN locations l ON l.health_system_id = hs.id
WHERE hs.subscription_status = 'active'
GROUP BY hs.id, hs.name, hs.type, hs.system_type, hs.subscription_status, hs.active
ORDER BY hs.name;