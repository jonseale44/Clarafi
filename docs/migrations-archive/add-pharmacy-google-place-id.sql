-- Add Google Place ID to pharmacies table for organic database building
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS health_system_id INTEGER REFERENCES health_systems(id);

-- Make some fields optional since Google Places won't have all data
ALTER TABLE pharmacies ALTER COLUMN ncpdp_id DROP NOT NULL;
ALTER TABLE pharmacies ALTER COLUMN phone DROP NOT NULL;