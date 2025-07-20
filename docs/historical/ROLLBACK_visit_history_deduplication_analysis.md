# Visit History Deduplication Analysis - Rollback Point
Created: January 9, 2025

## Current State Summary
- User reports that imaging has poor visit history deduplication
- Labs and some sections have robust deduplication
- Medical problems, family history, and social history may have inconsistent deduplication

## Key Files to Analyze
1. `server/unified-medical-problems-parser.ts` - Medical problems deduplication logic
2. `server/unified-surgical-history-parser.ts` - Has filterDuplicateVisitEntries method
3. `server/unified-social-history-parser.ts` - Only adds visits if status changes
4. `server/unified-family-history-parser.ts` - Appears to append without deduplication
5. `server/unified-imaging-parser.ts` - User reports poor deduplication
6. `server/unified-lab-parser.ts` - Need to examine its approach

## Next Steps
- Compare deduplication logic across all parsers
- Identify which approaches work best
- Standardize deduplication across all sections