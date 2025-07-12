# Database Schema Alignment Plan

## Overview
This document tracks the systematic alignment of the database with schema.ts. 
Schema.ts is the source of truth - anything not in schema.ts should be removed from the database.

## Tables to REMOVE from database (not in schema.ts):
1. care_plans
2. cpt_codes
3. lab_reference_ranges
4. migration_invitations
5. nursing_assessments
6. patient_physical_findings
7. problem_rank_overrides
8. session
9. user_problem_list_preferences

## Tables to ADD to database (in schema.ts but not in database):
1. admin_prompt_reviews
2. medication_formulary

## Step-by-Step Execution Plan

### Phase 1: Add Missing Tables
We'll add the missing tables first since this is safer than dropping tables.

### Phase 2: Drop Extra Tables
We'll drop tables that aren't in schema.ts one by one.

### Phase 3: Column-Level Alignment
After tables are aligned, we'll check each table's columns against schema.ts.

## Execution Log
- [x] Phase 1: Add missing tables
  - Created admin_prompt_reviews table
  - Created medication_formulary table
- [x] Phase 2: Drop extra tables  
  - Dropped 9 tables not in schema.ts
- [x] Phase 3: Column-level alignment
  - Fixed diagnoses table (added missing columns, dropped extra columns)
  - Dropped created_by_user_id from patients table
  - Continuing systematic checks...