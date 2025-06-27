# ROLLBACK POINT - Visit History Analysis (June 27, 2025)

## Issues Identified for Visit History System

### 1. **Confidence Level Logic Analysis**
Based on code analysis, confidence levels in visit history badges (e.g., "Doc Extract 98%") are calculated from:

**Source**: `server/unified-medical-problems-parser.ts` and attachment processing
- **NOT based on OCR clarity** - confidence is GPT-generated based on medical content analysis
- **NOT based on document quality** - OCR process is separate from confidence scoring
- **IS based on medical intelligence** - GPT assigns confidence based on:
  - Clarity of medical problems mentioned in text
  - Specificity of diagnoses and clinical details
  - Certainty of medical terminology used
  - Completeness of clinical information

**Example**: A perfectly clear scanned document with vague clinical notes ("patient feels unwell") would get low confidence, while a blurry document with specific diagnoses ("Type 2 DM, A1c 8.4, started metformin") would get high confidence.

### 2. **Visit History Sorting Issues**
**Current State**: Visit history appears to be sorted by creation time (when added to system) rather than chronological medical date

**Root Cause Analysis**:
- Frontend dialog sorts correctly: `new Date(b.date).getTime() - new Date(a.date).getTime()` (descending)
- List view may not be applying same sorting logic
- Backend doesn't enforce sorting order when returning data

**Expected Behavior**: Most recent medical date should appear first, regardless of when information was added to system

### 3. **Date Display Timezone Issue**
**Critical Bug Identified**: Two different date formatting functions causing one-day discrepancy

**Dialog Component** (`enhanced-medical-problems-dialog.tsx`):
```javascript
const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day); // CORRECT - avoids timezone
  return localDate.toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit'
  });
}
```

**List Component** (`enhanced-medical-problems-list.tsx`):
```javascript
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { // INCORRECT - timezone conversion
    month: 'numeric', day: 'numeric', year: '2-digit'
  });
}
```

**The Problem**: 
- List component uses `new Date(dateString)` which interprets "2010-06-18" as UTC midnight
- When converted to local timezone, it becomes the previous day
- Dialog component correctly parses date components to avoid timezone conversion

## System State Before Changes
- Medical problems list showing dates one day early (incorrect)
- Visit history dialog showing correct dates  
- Visit history not sorted chronologically within problems
- Confidence levels working as designed (GPT medical analysis, not OCR quality)

## Files Requiring Updates
1. `client/src/components/patient/enhanced-medical-problems-list.tsx` - Fix date formatting
2. Backend sorting logic for visit history chronological order
3. Potential frontend sorting consistency check

## Database State
- Visit history data contains correct dates in ISO format
- Issue is purely in frontend display formatting
- Sorting issue is in display order, not data integrity