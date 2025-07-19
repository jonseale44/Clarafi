-- Add missing fax column to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS fax TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations' 
AND column_name = 'fax';