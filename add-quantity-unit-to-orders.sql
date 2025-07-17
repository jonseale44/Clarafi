-- Add quantity_unit column to orders table for medication safety
-- This column stores the unit of measurement for medication quantities (e.g., 'tablets', 'mL', 'units', 'pens')
-- Critical for preventing dangerous ambiguity with injectable medications like insulin

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

-- Update existing medication orders to have appropriate units based on form
UPDATE orders 
SET quantity_unit = 
  CASE 
    WHEN form IN ('tablet', 'tablets') THEN 'tablets'
    WHEN form IN ('capsule', 'capsules') THEN 'capsules'
    WHEN form IN ('liquid', 'solution', 'suspension', 'syrup') THEN 'mL'
    WHEN form IN ('injection', 'injectable') AND medication_name ILIKE '%insulin%' THEN 'units'
    WHEN form IN ('injection', 'injectable') THEN 'mL'
    WHEN form IN ('cream', 'ointment', 'gel') THEN 'grams'
    WHEN form IN ('inhaler', 'inhalers') THEN 'inhalers'
    WHEN form IN ('patch', 'patches') THEN 'patches'
    WHEN form IN ('pen', 'pens') THEN 'pens'
    WHEN form IN ('vial', 'vials') THEN 'vials'
    ELSE NULL
  END
WHERE order_type = 'medication' AND quantity_unit IS NULL;

-- Also add to medications table for consistency
ALTER TABLE medications 
ADD COLUMN IF NOT EXISTS quantity_unit TEXT;

-- Update existing medications to have appropriate units
UPDATE medications 
SET quantity_unit = 
  CASE 
    WHEN dosage_form IN ('tablet', 'tablets') THEN 'tablets'
    WHEN dosage_form IN ('capsule', 'capsules') THEN 'capsules'
    WHEN dosage_form IN ('liquid', 'solution', 'suspension', 'syrup') THEN 'mL'
    WHEN dosage_form IN ('injection', 'injectable') AND medication_name ILIKE '%insulin%' THEN 'units'
    WHEN dosage_form IN ('injection', 'injectable') THEN 'mL'
    WHEN dosage_form IN ('cream', 'ointment', 'gel') THEN 'grams'
    WHEN dosage_form IN ('inhaler', 'inhalers') THEN 'inhalers'
    WHEN dosage_form IN ('patch', 'patches') THEN 'patches'
    WHEN dosage_form IN ('pen', 'pens') THEN 'pens'
    WHEN dosage_form IN ('vial', 'vials') THEN 'vials'
    ELSE NULL
  END
WHERE quantity_unit IS NULL;