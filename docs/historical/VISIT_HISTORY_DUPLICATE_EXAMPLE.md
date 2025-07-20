# Visit History Duplicate Example

## The Problem Illustrated

### Scenario: User edits SOAP note 3 times in encounter #71

**Medical Problems (BROKEN) - What happens:**
1. First SOAP edit: "DM2 - checking A1c today"
   - Checks for existing visit with encounterId=71 and source="encounter"
   - None found → Creates visit entry #1

2. Second SOAP edit: "DM2 - A1c result 7.2%"  
   - Checks for existing visit with encounterId=71 and source="encounter"
   - Finds visit #1 but notes are different
   - Updates visit #1 with new notes

3. Third SOAP edit: "DM2 - A1c 7.2%, increasing metformin"
   - Checks for existing visit with encounterId=71 and source="encounter"
   - Logic gets confused or GPT returns slightly different structure
   - Creates visit entry #2 (DUPLICATE!)

**Result:** DM2 now has 2 visit entries for the same encounter

### Surgical History (WORKING) - What happens:
1. First SOAP edit: "Appendectomy follow-up"
   - Filters existing visits: none match encounterId=71
   - Creates visit entry #1

2. Second SOAP edit: "Appendectomy - healing well"
   - Filters existing visits: finds encounterId=71 with source="encounter"
   - REMOVES the old visit entry
   - Creates new visit entry (still just 1 total)

3. Third SOAP edit: "Appendectomy - cleared for activity"
   - Filters existing visits: finds encounterId=71 with source="encounter"
   - REMOVES the old visit entry
   - Creates new visit entry (still just 1 total)

**Result:** Appendectomy has only 1 visit entry for encounter #71

## The Fix

Replace the "check and update/add" pattern with "filter then add" pattern:

```typescript
// BROKEN PATTERN (medical problems, etc.)
if (existingVisitIndex >= 0) {
  // Update existing
} else {
  // Add new (can create duplicates)
}

// WORKING PATTERN (surgical history)
// First, filter out any duplicates
const filteredHistory = filterDuplicateVisitEntries(existingVisits, encounterId, attachmentId, sourceType);
// Then add the new entry
const updatedHistory = [...filteredHistory, newVisitEntry];
```