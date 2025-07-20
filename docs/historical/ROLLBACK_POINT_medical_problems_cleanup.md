# Rollback Point: Medical Problems Technical Debt Cleanup

**Date**: June 27, 2025
**Purpose**: Document system state before cleaning up medical problems technical debt

## Current System State

### Frontend Components
1. **enhanced-medical-problems.tsx** - ORPHANED COMPONENT
   - Location: client/src/components/patient/enhanced-medical-problems.tsx
   - Endpoint: `/api/patients/${patientId}/medical-problems-enhanced`
   - Status: Has document linking badges implemented but NOT USED anywhere
   - Interface: Includes attachmentId and confidence fields

2. **enhanced-medical-problems-list.tsx** - ACTIVE PRODUCTION COMPONENT
   - Location: client/src/components/patient/enhanced-medical-problems-list.tsx
   - Endpoint: `/api/medical-problems/${patientId}` (unified API)
   - Status: Actually used in SharedChartSections and PatientChartView
   - Interface: Missing attachmentId and confidence fields

3. **medical-problems-section.tsx** - LEGACY COMPONENT
   - Location: client/src/components/patient/medical-problems-section.tsx
   - Endpoint: `/api/patients/${patientId}/medical-problems`
   - Status: Not currently used in patient chart

### Backend Endpoints
1. **unified-medical-problems-api.ts** - ACTIVE API
   - Route: `/api/medical-problems/${patientId}`
   - Registration: Line 567 in routes.ts
   - Status: Used by production component
   - Data: Returns visitHistory with attachmentId and confidence

2. **enhanced-medical-problems-routes.ts** - ORPHANED API
   - Route: `/api/patients/${patientId}/medical-problems-enhanced`
   - Registration: Line 571 in routes.ts
   - Status: Only used by orphaned component
   - Data: Strips attachmentId and confidence from visitHistory

### Document Linking Implementation
- **Current Status**: Implemented in wrong component (enhanced-medical-problems.tsx)
- **Issue**: Component is never used, so badges don't appear
- **Correct Target**: enhanced-medical-problems-list.tsx needs the implementation

### Database State
- Visit histories contain attachmentId and confidence data
- Example from patient 16: attachmentId: 13, confidence: 0.99
- Data is available but not being displayed due to wrong component

## Planned Cleanup Steps
1. Remove orphaned enhanced-medical-problems.tsx component
2. Remove orphaned enhanced-medical-problems-routes.ts endpoint
3. Update route registration in server/routes.ts
4. Test system functionality
5. Implement document linking in correct component

## Rollback Instructions
If cleanup causes issues:
1. Restore enhanced-medical-problems.tsx from this rollback point
2. Restore enhanced-medical-problems-routes.ts from this rollback point
3. Restore route registration on line 571 in server/routes.ts
4. Restart application workflow

## System Verification
- Application currently running on workflow "Start application"
- Patient chart displaying medical problems via enhanced-medical-problems-list.tsx
- Backend unified API functioning correctly
- No visible document linking badges (expected - wrong component)