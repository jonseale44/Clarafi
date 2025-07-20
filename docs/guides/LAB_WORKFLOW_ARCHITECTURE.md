# Lab Workflow Architecture

## Core Principle: Encounter Extension vs. New Encounters

**KEY DECISION**: When critical lab results arrive, we **extend the existing encounter** rather than creating new follow-up encounters.

### Why Encounter Extension?

1. **Unified Care Story**: Keeps all related clinical information in one encounter record
2. **Provider Efficiency**: Single encounter to review instead of multiple related encounters
3. **Clinical Continuity**: Natural flow from original visit → lab order → results → follow-up actions
4. **Reduced Chart Fragmentation**: Avoids creating multiple encounter records for the same clinical episode

### Implementation Details

#### When a Critical Result Arrives:
1. **Find Most Recent Encounter** for the patient
2. **Append Critical Alert** to the encounter note:
   ```
   --- CRITICAL LAB RESULT ALERT ---
   Result ID: {resultId}
   Time: {timestamp}
   Status: Requires immediate provider review and follow-up
   --- END CRITICAL ALERT ---
   ```
3. **Generate Follow-up Orders** linked to the extended encounter
4. **Notify Providers** about the critical result and extended encounter

#### Fallback Behavior:
- If no existing encounter found, create a minimal `lab_review` encounter
- This becomes the container for critical result workflows

### API Endpoints:
- `GET /api/lab-workflow/extended-encounters/:patientId` - Find encounters that have been extended with critical results
- `POST /api/lab-workflow/process-critical/:resultId` - Process critical result and extend encounter

### Benefits:
- ✅ Single source of truth for clinical episode
- ✅ Reduced provider cognitive load
- ✅ Better audit trail and documentation flow
- ✅ Simplified encounter management
- ✅ Natural clinical workflow progression

### Database Impact:
- No new encounter created (unless none exists)
- Encounter `note` field updated with critical alert information
- Lab orders linked to extended encounter, not new encounter
- Provider notifications reference the extended encounter