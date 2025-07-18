# Schema Cleanup Report - Extra Columns Analysis

## Summary
- **Total Extra Columns**: 542 columns exist in DB but not in schema.ts
- **Total Tables Affected**: 57 tables
- **Critical Finding**: Many actively used columns need to be added to schema.ts

## High Priority Tables (Most Extra Columns)

### 1. lab_orders (54 extra columns)
**Actively Used (6):**
- `order_id` - 231 references - CRITICAL: Used for order tracking
- `external_lab` - 35 references - Used for lab routing
- `provider_notes` - 139 references - Clinical notes
- `result_status` - 17 references - Order status tracking
- `results` - 776 references - CRITICAL: Lab results data
- `special_instructions` - 29 references - Lab instructions

**Sample Unused:** abnormal_flags, stat_order

### 2. imaging_results (38 extra columns)
**Actively Used (4):**
- `encounter_id` - 971 references - CRITICAL: Links to encounters
- `recommendations` - 134 references - Clinical recommendations
- `technique` - 31 references - Imaging technique details
- `procedure_code` - 70 references - Billing codes

**Sample Unused:** contrast_used, critical_findings, ordering_provider_id

### 3. orders (30 extra columns)
**Actively Used (8):**
- `order_date` - 24 references
- `prescriber` - 147 references - Prescribing provider
- `start_date` - 31 references
- `end_date` - 11 references
- `frequency` - 87 references - Dosing frequency
- `imaging_study_type` - 12 references
- `lab_test_name` - 16 references
- `referral_reason` - 7 references

### 4. medical_problems (29 extra columns)
**Sample Unused (6 checked):**
- follow_up_date, original_problem_text, ai_confidence_score
- problem_ranking, treatment_goals, outcome_measures

### 5. encounters (27 extra columns)
**Actively Used (6):**
- `encounter_date` - 58 references
- `template_id` - 56 references - Note templates
- `signed_by` - 16 references - Provider signature
- `visit_reason` - 26 references - Chief complaint
- `notes` - 444 references - CRITICAL: Clinical notes
- `location_id` - 113 references - Clinic location

**Sample Unused:** voice_recording_url, billing_status

### 6. lab_results (24 extra columns)
**Already Fixed:** source_system added to DB

### 7. medications (22 extra columns)
**Need to analyze usage**

### 8. external_labs (19 extra columns)
**Need to analyze usage**

### 9. allergies (16 extra columns)
**Need to analyze usage**

### 10. diagnoses (16 extra columns)
**Need to analyze usage**

## Recommendations

### Phase 1: Add Critical Columns to schema.ts
These columns have high usage and are causing application errors:
1. lab_orders.order_id (231 refs)
2. lab_orders.results (776 refs)
3. imaging_results.encounter_id (971 refs)
4. encounters.notes (444 refs)
5. orders.prescriber (147 refs)

### Phase 2: Add Moderately Used Columns
Columns with 10+ references should be evaluated for addition

### Phase 3: Remove Unused Columns from DB
After schema.ts is updated, remove columns with 0 references

## Next Steps
1. ✅ Fixed immediate errors (imaging UI, lab source_system)
2. ⏳ Add critical columns to schema.ts
3. ⏳ Run full column usage analysis
4. ⏳ Clean up unused columns from database