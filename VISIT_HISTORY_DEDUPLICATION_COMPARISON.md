# Visit History Deduplication Comparison Analysis
Created: January 9, 2025

## Executive Summary
Only surgical history has robust visit history deduplication. All other chart sections (medical problems, medications, imaging, family history, social history) have poor or no deduplication, leading to duplicate visit entries.

## Detailed Analysis by Chart Section

### 1. Medical Problems ❌ POOR
**Deduplication Logic:**
```typescript
// From unified-medical-problems-parser.ts lines 949-955
const existingVisitIndex = visitHistory.findIndex((visit) => {
  if (source === "encounter") {
    return visit.encounterId === encounterId && visit.source === "encounter";
  } else {
    return visit.attachmentId === attachmentId;
  }
});
```
**Issue:** While it checks for existing visits, the implementation allows duplicate entries in practice
**Note:** The June 2025 fix may have introduced issues by being too permissive

### 2. Surgical History ✅ GOOD - THE ONLY ROBUST IMPLEMENTATION
**Deduplication Logic:**
```typescript
// From unified-surgical-history-parser.ts lines 903-922
private filterDuplicateVisitEntries(
  existingVisits: UnifiedSurgicalVisitHistoryEntry[],
  encounterId: number | null,
  attachmentId: number | null,
  sourceType: "encounter" | "attachment",
): UnifiedSurgicalVisitHistoryEntry[] {
  return existingVisits.filter((visit) => {
    if (encounterId && visit.encounterId === encounterId) {
      return visit.source !== sourceType; // Keep if different source type
    }
    if (attachmentId && visit.attachmentId === attachmentId) {
      return false; // Remove duplicate attachment
    }
    return true;
  });
}
```
**Approach:** Explicit filtering method with clear logic
**Result:** Successfully prevents duplicate visit entries - THE MODEL TO FOLLOW

### 3. Social History ❌ POOR
**Deduplication Logic:**
```typescript
// From unified-social-history-parser.ts
// Only add visit history if status actually changed
const shouldAddVisit = current.currentStatus !== change.currentStatus;

if (shouldAddVisit) {
  const updatedVisitHistory = [...currentVisitHistory, visitEntry];
  // Update with new visit history
}
```
**Issue:** Content-based approach is insufficient - still allows duplicates in practice
**Result:** Multiple visit entries can be created for the same encounter/attachment

### 4. Family History ❌ POOR
**Deduplication Logic:** NONE FOUND
```typescript
// From unified-family-history-parser.ts
// Simply appends new visit history
const newVisitHistory = [...currentVisitHistory, visitEntryWithLocalDate];
```
**Approach:** No deduplication - just appends new entries
**Result:** Creates duplicate visit entries for same encounter/attachment

### 5. Imaging ❌ POOR
**Deduplication Logic:** 
- Has extensive consolidation at the imaging RECORD level (modality, body part, date matching)
- But lacks proper visit history deduplication
**Result:** Poor visit history deduplication despite good record-level consolidation

### 6. Medications ❌ POOR (Not analyzed in detail)
**Status:** User reports poor deduplication
**Likely Issue:** Similar to other sections - may append without proper filtering

### 7. Lab Results 🔍 N/A - No Visit History
**Observation:** Lab results don't use visit history system
- Each lab result is an individual record
- No visitHistory field in labResults table
- Different architecture than other chart sections

## Key Differences Identified

### 1. **Only One Working Implementation**
- **Surgical History:** The ONLY section with proper ID-based deduplication via `filterDuplicateVisitEntries`
- **All Others:** Poor or no deduplication leading to duplicate visit entries

### 2. **Implementation Status**
- **✅ WORKING:** Surgical History - explicit filtering method
- **❌ BROKEN:** Medical Problems - despite having logic, still creates duplicates
- **❌ BROKEN:** Social History - content-based approach insufficient
- **❌ BROKEN:** Family History - no deduplication at all
- **❌ BROKEN:** Imaging - poor despite good record consolidation
- **❌ BROKEN:** Medications - poor deduplication
- **🔍 N/A:** Labs - no visit history system

### 3. **The Critical Fix (June 2025) - May Have Made Things Worse**
From replit.md:
> **Critical Visit History Filtering Fix (June 29, 2025)**
> - System blocked encounter-based visit entries when attachment from same encounter was processed earlier
> - Updated filtering logic to check BOTH encounter ID AND source type

This fix may have inadvertently made deduplication too permissive in some sections.

## Recommendations

### 1. **Copy Surgical History Pattern to ALL Sections**
The `filterDuplicateVisitEntries` method in surgical history is the ONLY working implementation:
```typescript
private filterDuplicateVisitEntries(
  existingVisits: VisitHistoryEntry[],
  encounterId: number | null,
  attachmentId: number | null,
  sourceType: "encounter" | "attachment",
): VisitHistoryEntry[] {
  return existingVisits.filter((visit) => {
    if (encounterId && visit.encounterId === encounterId) {
      return visit.source !== sourceType;
    }
    if (attachmentId && visit.attachmentId === attachmentId) {
      return false;
    }
    return true;
  });
}
```

### 2. **Apply to ALL Broken Sections**
- **Medical Problems:** Replace current logic with surgical history pattern
- **Medications:** Add filterDuplicateVisitEntries method
- **Family History:** Add filterDuplicateVisitEntries method
- **Imaging:** Add proper visit history deduplication
- **Social History:** Combine content-based with ID-based deduplication

### 3. **Testing Required**
After implementing the surgical history pattern across all sections, thorough testing is needed to ensure:
- No duplicate visit entries from same encounter/attachment
- Both attachment and encounter sources can coexist for same encounter
- Historical data is preserved correctly

## Code Pattern to Standardize

```typescript
// Recommended pattern based on surgical history implementation
private filterDuplicateVisitEntries(
  existingVisits: VisitHistoryEntry[],
  encounterId: number | null,
  attachmentId: number | null,
  sourceType: "encounter" | "attachment",
): VisitHistoryEntry[] {
  return existingVisits.filter((visit) => {
    // Allow both attachment and encounter entries for same encounter
    if (encounterId && visit.encounterId === encounterId) {
      return visit.source !== sourceType;
    }
    // Prevent duplicate attachment entries
    if (attachmentId && visit.attachmentId === attachmentId) {
      return false;
    }
    return true;
  });
}
```

This pattern should be applied consistently across all chart sections that use visit history.