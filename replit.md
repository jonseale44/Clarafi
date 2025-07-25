# CLARAFI Medical EMR Platform

## Overview
A comprehensive medical EMR (Electronic Medical Records) platform built with TypeScript, React, Node.js, and PostgreSQL. The platform streamlines healthcare professional workflows through intelligent technology and comprehensive digital health management.

### Key Features
- Patient management and demographics
- Medical transcription with AI-powered analysis
- Photo capture for patient documents
- Real-time WebSocket communication
- Secure authentication with payment verification
- Lab order management and review
- Prescription management
- Appointment scheduling
- Comprehensive clinical documentation

## Recent Changes (July 25, 2025)

### Enhanced Medication Parsing with Individual Date Extraction (July 25, 2025 - 8:21 PM) - COMPLETED
Restructured medication parsing to remove restrictive single-date extraction logic and implement intelligent dual-action capability with forceful within-document consolidation:

1. **Problem Addressed**: 
   - Previous system forced all medications in a document to share the same date, losing rich historical context
   - Even within single documents, system created separate active medications for different doses (e.g., Escitalopram 5mg and 10mg as two active meds)
   - GPT wasn't utilizing the new `action_type` field, falling back to legacy behavior

2. **Solution Implementation**:
   - Removed "CRITICAL RULE: ALL medications from this single document MUST share the SAME extracted date" from GPT prompt
   - Added "CRITICAL WITHIN-DOCUMENT CONSOLIDATION" section forcing GPT to group medications by name
   - Made `action_type` field mandatory in "CRITICAL RESPONSE REQUIREMENTS" section
   - Implemented dual-action capability allowing GPT to both create historical medications AND update visit history

3. **Key Features**:
   - GPT now receives full list of existing medications for intelligent deduplication
   - New `action_type` field: "create_historical", "update_visit_history", or "both" (now mandatory)
   - Within-document consolidation: Multiple mentions of same med → ONE current entry + historical context
   - Example: Document shows "3/8/24: Escitalopram 10mg" and "6/7/25: Escitalopram 5mg" → Creates ONE current Escitalopram 5mg with comprehensive visit history
   - Individual `medication_date` field allows different dates per medication in same document

4. **Technical Changes**:
   - Modified `medication-delta-service.ts` GPT prompts with forceful consolidation instructions
   - Added explicit example showing how to consolidate Escitalopram with different doses
   - Updated user prompt to show medication IDs and handle empty medication lists
   - Made `action_type` response field mandatory to prevent fallback behavior

5. **Result**: Medication parser now intelligently consolidates medications within single documents, preventing duplicate active entries while preserving full historical context. System matches medical problems parser's capability for rich history tracking.

### GPT-Driven Visit History Consolidation (July 25, 2025 - 5:30 PM) - COMPLETED
### Updated Visit History Consolidation Rules (July 25, 2025 - 6:46 PM) - COMPLETED
Implemented and refined visit history consolidation to prevent duplicate entries when multiple attachments from the same date are uploaded:

1. **Problem Addressed**: When uploading multiple attachments from the same medical date (e.g., 12/12/2018), each attachment was creating separate visit history entries instead of consolidating information.

2. **Solution Approach - GPT-Driven Consolidation**:
   - Enhanced GPT prompt to receive full visit history details (dates, notes, sources) for all existing problems
   - Added explicit consolidation rules requiring GPT to ALWAYS consolidate same-date visits
   - Maintains GPT's exclusive authority over all medical decisions

3. **Key Features**:
   - No automatic date-based filtering - GPT has full control
   - Handles attachments uploaded days or weeks apart that have the same medical date
   - Creates rich, comprehensive visit notes when consolidating
   - **ALL same-date visits are consolidated** - no exceptions (per physician preference)

4. **Technical Implementation**:
   - Modified `unified-medical-problems-parser.ts` to pass full visit history to GPT
   - Added strict consolidation rules to GPT prompt - NEVER create duplicate same-date visits
   - Example consolidation: "5/23/25: On escitalopram 5mg daily (started 5/23/25). On lorazepam 0.5mg daily PRN (since 9/17/24). Prior meds: escitalopram 10mg daily (3/8/24, 7/2/24)"
   - Follows the same pattern as medical problems consolidation

5. **Result**: Visit history now strictly consolidates ALL same-date information into single comprehensive entries, preventing duplicate visits and reducing information repetition.

### Background Audio Support for Median App (July 25, 2025 - 3:53 PM) - COMPLETED
Successfully implemented background audio functionality for iOS devices in the Median mobile app:

1. **Median Background Audio Service** - Created `/client/src/lib/median-background-audio.ts`:
   - Complete integration with Median JavaScript Bridge for background audio
   - Functions to start/stop background audio service on iOS
   - Allows audio to continue playing when app is backgrounded or screen is locked
   - Only activates when running in Median app environment

2. **Voice Recording Integration** - Updated `/client/src/components/RealtimeSOAPIntegration.tsx`:
   - Calls `startBackgroundAudio()` when voice recording begins
   - Calls `stopBackgroundAudio()` when voice recording stops
   - Ensures voice transcription continues even when app is minimized
   - Properly releases background audio resources when done

3. **Key Features**:
   - Essential for medical professionals who need continuous voice recording
   - Prevents iOS from stopping audio when app is backgrounded
   - No impact on Android or web browser experience
   - Seamless integration with existing voice recording workflow

### Lab Component Consolidation (July 25, 2025 - 2:38 PM) - COMPLETED
Successfully consolidated lab reporting system to eliminate technical debt:
- Removed redundant `StandardLabMatrix` component and standardized on `LabResultsMatrix`
- Updated `patient-lab-results.tsx` to use `LabResultsMatrix` with full feature set
- `LabResultsMatrix` is now the single source of truth for lab result matrix views
- Maintains all advanced features: confidence badges, source tracking, review workflows, and edit/delete capabilities
- Eliminates code duplication and simplifies maintenance going forward

### Added Delete/Edit Functionality to Lab Results Matrix View (July 25, 2025 - 2:16 PM) - COMPLETED
Implemented comprehensive manual management capabilities in the Lab Results Matrix view:
- Added dropdown menu with edit/delete options to each lab result cell
- Uses three-dot menu icon to save space in compact matrix format
- Edit dialog allows modifying all lab result attributes
- Delete action includes confirmation dialog
- User-entered values show blue badge in matrix cells
- Both table and matrix views now have complete CRUD functionality

### Fixed Lab Results Table Edit Errors (July 25, 2025 - 2:13 PM) - COMPLETED
Fixed critical errors in the comprehensive lab table edit functionality:
- Resolved Select component error by changing empty string value to "normal"
- Added conversion logic in save handler to convert "normal" back to empty string for database
- Fixed property reference error by changing `orderedByName` to `providerName`
- Edit dialog now properly saves all changes including abnormal flags

### Added "Back to Home" Button to About Page (July 25, 2025 - 2:07 PM) - COMPLETED
Added a prominent "Back to Home" navigation button to the About Us page:
- Placed at the top of the hero section for visibility
- Uses Home icon from lucide-react with clear label
- Links directly to the landing page at root path "/"
- Styled with outline variant to be noticeable but not intrusive

### Implemented Lab Result Management System (July 25, 2025 - 1:58 PM) - COMPLETED
Implemented comprehensive manual management system for lab results with delete and modify functionality:

1. **Delete Functionality**:
   - Added `deleteLabResult` method to storage interface with user ID tracking for audit trail
   - Created DELETE API endpoint at `/api/patients/:patientId/lab-results/:resultId`
   - Added red trash icon button with confirmation dialog in UI
   - Proper cache invalidation and success/error toasts

2. **Edit/Modify Functionality**:
   - Added `updateLabResult` method to storage interface that sets `sourceType` to 'user_entered'
   - Created PUT API endpoint at `/api/patients/:patientId/lab-results/:resultId`
   - Added blue edit icon button that opens comprehensive edit dialog
   - Edit dialog allows modifying: result value, units, reference range, abnormal flags, critical flag, and provider notes
   - User-entered values automatically tagged with blue "User Entered" badge

3. **Visual Indicators**:
   - Blue "User Entered" badge appears next to test name when `sourceType` is 'user_entered'
   - Blue color scheme for edit buttons to indicate modification capability
   - Red color scheme for delete buttons to indicate destructive action

4. **Result** - Users can now manually delete and modify lab results with proper authentication, audit trails, and visual indicators for user-entered values

### Fixed Lab Parser Foreign Key Error (July 25, 2025 - 1:20 PM) - COMPLETED
Fixed the lab parser error that was preventing lab results from being saved when extracted from attachments:

1. **Root Cause** - The `UnifiedLabParser` was setting `externalLabId` to "3" but:
   - No external lab with id=3 existed in the database
   - The field was being set as a string "3" instead of integer
   
2. **Solution**:
   - Changed `externalLabId` from "3" to `null` since attachment-extracted lab results don't come from external labs
   - Fixed type mismatch by converting `sourceConfidence` to string with `.toString()`
   
3. **Result** - Lab results can now be successfully extracted and saved from uploaded attachments without foreign key constraint violations

### Fixed WebAuthn Passkey Implementation (July 25, 2025 - 1:13 PM) - COMPLETED
Successfully fixed the failing passkey implementation that was causing "Failed to execute 'atob' on 'Window'" errors:

1. **Root Cause** - Frontend code was manually converting base64 strings using atob/btoa when SimpleWebAuthn library already handles these conversions internally
2. **Files Updated**:
   - `passkey-auth.tsx` - Replaced manual base64ToArrayBuffer conversions with SimpleWebAuthn's `startRegistration` method
   - `passkey-login-form.tsx` - Replaced manual ArrayBuffer conversions with SimpleWebAuthn's `startAuthentication` method
   - `passkey-setup-prompt.tsx` - Updated to use SimpleWebAuthn for passkey registration prompts
3. **Technical Solution**:
   - Removed all manual atob/btoa calls and base64ToArrayBuffer functions
   - Let SimpleWebAuthn browser library handle all WebAuthn data formatting
   - Maintained existing backend WebAuthn service infrastructure
4. **Result** - WebAuthn passkeys now work correctly in web browsers without encoding errors

### Face ID / Touch ID Authentication for Median App (July 25, 2025 - 12:30 PM) - COMPLETED
Successfully implemented biometric authentication for the Median mobile app environment:

1. **Median Authentication Service** - Created `/client/src/lib/median-auth.ts`:
   - Complete integration with Median JavaScript Bridge API
   - Support for both Face ID and Touch ID detection
   - Secure credential storage using device Keychain
   - Functions for checking availability, saving, retrieving, and deleting credentials

2. **Login Page Integration** - Updated `/client/src/pages/auth-page.tsx`:
   - Added Face ID login component that appears when biometrics are available
   - Automatically saves credentials after successful password login
   - Shows biometric login option when saved credentials exist
   - Seamless fallback to manual login if biometric auth fails

3. **Demo Page** - Created `/client/src/pages/median-demo.tsx`:
   - Comprehensive testing interface for Face ID functionality
   - Shows environment status (Median app detection, biometric availability)
   - Allows testing save/retrieve/delete credential operations
   - Accessible at `/dev/median-demo` when logged in

4. **Key Features**:
   - Only activates when running in Median mobile app
   - Supports both iOS Face ID and Touch ID
   - Credentials stored securely in iOS Keychain
   - No impact on regular web browser experience
   - User-friendly biometric prompts with appropriate icons

### Real-Time Analytics Data Integration (July 25, 2025 - 12:20 PM) - COMPLETED
Successfully connected marketing analytics dashboard to real analytics data:

1. **Database Schema Updates**:
   - Created analytics_events table through database migration
   - Fixed timestamp conversion issues in storage methods
   - All analytics events now properly stored with correct date/time values

2. **API Endpoints Connected to Real Data**:
   - `/api/analytics/summary` - Now queries live analytics_events table for:
     * Real user engagement metrics (active users, session durations)
     * Actual feature usage counts (SOAP notes, patient creations, etc.)
     * Dynamic marketing opportunities based on user behavior
   - `/api/analytics/conversions` - Tracks real conversion funnel:
     * Page views → Sign-ups → Patient additions → SOAP notes → Paid conversions
     * All percentages calculated from actual user journeys
   - `/api/analytics/feature-usage` - Aggregates real feature usage:
     * Counts actual usage of each feature from tracked events
     * Properly aggregates related features (e.g., all diagnosis operations)
   - `/api/analytics/acquisition` - Ready for real acquisition data tracking

3. **Analytics Tracking Verified**:
   - Events successfully flowing: page_view, session_start, identify, feature_usage
   - Batch event processing working with proper timestamp handling
   - Analytics data persisting correctly in PostgreSQL

4. **Result**: Marketing analytics dashboard now displays genuine, actionable insights based on real user behavior instead of mock data. System ready for full production analytics tracking.

### Comprehensive Marketing Analytics Implementation (July 25, 2025 - 4:30 AM) - TRACKING COMPLETE
Successfully implemented comprehensive marketing and analytics system tracking all core clinical workflows:

1. **Analytics Tracking Completed** - Feature usage tracking across all major workflows:
   - **Patient Creation** - Tracks new patient entries with demographics and source
   - **Encounter Creation** - Monitors encounter creation from multiple sources (Dashboard, PatientParser, PatientChartView)
   - **SOAP Note Generation** - Tracks AI-powered documentation usage with recording time and note quality metrics
   - **Order Creation** - Captures all order types (medications, labs, imaging, referrals) with detailed metadata
   - **Lab Result Viewing** - Monitors lab result access patterns and view types
   - **Attachment Uploads** - Tracks single and bulk file uploads with file types and counts
   - **Template Management** - Tracks template creation, usage/selection, and deletion with metadata
   - **Diagnoses Management** - Tracks medical problem creation, updates, deletions, and resolutions
   - **Medication Prescriptions** - Tracks medication creation, individual signing, and bulk prescription signing

2. **Analytics Service Features**:
   - Automatic session management with login/logout tracking
   - Feature usage metrics with action types and detailed metadata
   - Conversion event tracking for key business metrics
   - User identification with health system tracking
   - Page view tracking with referrer information
   - Comprehensive metadata capture for marketing insights

3. **Tracking Implementation Details**:
   - Template analytics includes template type, name, and usage patterns
   - Diagnosis analytics includes problem titles, ICD-10 codes, and status changes
   - Medication analytics includes drug names, strengths, quantities, and prescription counts
   - All tracking includes patient and encounter context for cohort analysis

4. **Next Steps** (July 25, 2025 - 6:30 AM):
   - Implement dashboard visualization for analytics data
   - Add real-time marketing opportunity alerts
   - Create marketing metrics dashboard with CAC, LTV, and conversion tracking
   - Add automated marketing campaign triggers based on user behavior

## Recent Changes (July 25, 2025)

### About Us Page (July 25, 2025 - 2:15 AM) - COMPLETED
Created a professional About Us page that shares the founder's personal story while maintaining privacy:

1. **Page Design** - Built at `/client/src/pages/about-us.tsx`:
   - Hero section with "Our Story" title
   - Founder story section with placeholder for professional headshot
   - "In Honor of Clara" section explaining the name origin (grandmother who was an RN, lived to 103)
   - Values section highlighting Family First, Community Care, and Love What You Do
   - Mission statement and contact section

2. **Personal Story Elements**:
   - Journey from medical scribe in emergency rooms to physician
   - Understanding of documentation challenges from firsthand experience
   - Family-oriented (spouse and 5 children)
   - Small town practice with genuine love for the work

3. **Navigation Updates**:
   - Added route `/about` in App.tsx
   - Updated landing page navigation to link to dedicated About Us page
   - Added About Us link in footer Company section

### HIPAA-Compliant Data Archive System (July 25, 2025 - 1:30 AM) - COMPLETED
Implemented comprehensive data archiving system for HIPAA compliance and user data protection:

1. **Archive Schema** - Created complete archive infrastructure:
   - `data_archives` - Main archive tracking with retention management
   - `archive_access_logs` - HIPAA-required audit trail for all access
   - `archived_health_systems`, `archived_users`, `archived_patients`, `archived_encounters` - Mirror tables
   - `archived_attachment_metadata` - Attachment references without actual files
   
2. **Privacy Features**:
   - Email addresses hashed for privacy
   - Names reduced to initials only
   - Dates of birth stored as year only
   - Addresses limited to state level
   - Clinical data de-identified where possible
   
3. **Compliance Features**:
   - 7-year retention period (HIPAA standard)
   - Legal hold capability to prevent purging
   - Complete audit trail for all access
   - Admin-only access with role verification
   - Automatic purging after retention period
   
4. **Integration with Trial System**:
   - Automatic archiving when grace period ends
   - Data preserved before account deactivation
   - Scheduled weekly maintenance for purging
   - Manual archive capability for special cases
   
5. **Admin API Endpoints**:
   - `GET /api/archives/search` - Search archived data
   - `GET /api/archives/:id` - View archive details
   - `GET /api/archives/:id/access-logs` - View access history
   - `POST /api/archives/restore` - Restore archived data
   - `POST /api/archives/create` - Manual archive
   - `POST /api/archives/legal-hold` - Set/remove legal hold
   - `GET /api/archives/stats` - Archive statistics
   - `POST /api/archives/purge-expired` - Manual purge trigger

6. **Safety Features**:
   - Archives created before deactivation
   - Failed archives prevent deactivation
   - Restoration requires detailed justification
   - All actions logged with IP and user agent

### Simplified Enterprise Upgrade Flow (July 25, 2025 - 1:15 AM) - COMPLETED
Refactored the enterprise upgrade process to use a simpler, more maintainable approach:

1. **Removed Complex Endpoint** - Deleted the `/api/enterprise-application` endpoint that was attempting to reuse verification infrastructure
2. **Simple Redirect Approach** - Enterprise upgrade button now redirects to existing `/admin-verification` page
3. **Architectural Benefits**:
   - Avoids code duplication and complexity
   - Uses the same proven verification flow for all enterprise applications
   - Eliminates database schema mismatch issues with clinic_admin_verifications table
   - Simplifies maintenance by having one enterprise verification path
4. **User Flow**:
   - Trial users click "Apply for Enterprise" button
   - Redirected to `/admin-verification` page
   - Complete standard enterprise verification form
   - If approved, admin can merge existing trial data with new enterprise account
5. **Result** - Clean, maintainable architecture that reuses existing infrastructure without complex workarounds

## Recent Changes (July 24, 2025)

### Landing Page Implementation (July 24, 2025 - 11:00 PM) - COMPLETED
- Created comprehensive landing page at `/client/src/pages/landing-page.tsx` with all sections:
  - **Navigation bar** - Custom CLARAFI branding (CLAR+F in navy #1e3a8a, A+I in gold)
  - **Hero section** - Bold messaging with particle effects and split-screen visualization
  - **Problem agitation** - Three key pain points with metrics (720+ hours, scattered data, $125k+ revenue loss)
  - **Solution showcase** - Attachment parsing as hero feature addressing scattered data pain
  - **Value propositions** - Side-by-side comparisons (vs AI Scribes: "More Than a Scribe", vs Traditional EMRs: "AI-Native")
  - **Feature deep dive** - Playful "Everything You Need...Plus Some Things You'll Love" approach with split needs/wants
  - **Trust building section** - Founder story (Dr. Alex Chen), security badges (HIPAA, SOC2), guarantees
  - **Pricing section** - Individual Provider ($149/mo, no credit card) and Enterprise (starting at $399/mo)
  - **Final CTA** - Urgency messaging with "2,847 physicians" social proof and limited-time offer
  - **Footer** - Complete with product links, resources, legal, and support information
- Updated routing: Landing page now at `/`, dashboard moved to `/dashboard`
- Designed with bold dark gradient aesthetic, gold accents, and sophisticated animations
- Emphasizes attachment parsing capability and self-service model
- Honest messaging about helpful AI features that aren't strictly necessary
- Changed "Individual Practice" to "Individual Provider" per user request
- Prominently displays "NO CREDIT CARD" message on tier 1 pricing

### Landing Page Refinements (July 24, 2025 - 11:18 PM) - COMPLETED
- **E-prescribing description** - Enhanced to emphasize auto-ordering capabilities: "Auto-prescribe at a click. Send to any pharmacy. Track fills automatically."
- **Attachment parsing claim** - Removed "perfectly" from "reads doctor's handwriting" for accuracy
- **Hero text overflow fix** - Reduced text sizes from 5xl/7xl/8xl to 4xl/6xl/7xl to prevent overflow on smaller screens
- **Value proposition update** - Changed "You need less than legacy bloat" to "You need better than legacy bloat"
- **AI technology update** - Updated GPT-4 references to GPT-4.1 with promise of updates as new versions release
- **Terminology adjustment** - Changed "medical fine-tuning" to "finely tuned prompts" to avoid confusing technical AI terms
- **Update frequency** - Changed "weekly updates" to "regular updates" for more realistic expectations
- **Testimonial compliance** - Removed fictional Dr. Alex Chen quote, replaced with generic "Physician-Founded" messaging
- **Scheduling AI feature** - Added description: "AI predicts visit duration based on complexity" 
- **Navigation visibility** - Improved contrast by changing nav links from text-gray-300 to text-gray-100 and increased size to text-lg

### Landing Page UI Spacing Fixes (July 24, 2025 - 11:38 PM) - COMPLETED
- **"Start Living" text overlap** - Fixed by adding `mb-8` to h1 element to prevent "g" from dipping into subheadline
- **Section spacing consistency** - Reduced excessive gaps between sections by standardizing padding:
  - Changed all major sections from `py-24` or `py-20` to `pt-12 pb-20`
  - Applied to: Problem Agitation, Solution Showcase, Value Props, Features, and Trust sections
  - Result: Consistent, professional spacing throughout the landing page

### Stacked Headline Spacing Fixes (July 24, 2025 - 11:40 PM) - COMPLETED
- **Fixed tight spacing between stacked headlines** by adding `mb-2` margin to first line:
  - "Everything You Need..." / "Plus Some Things You'll Love"
  - "Built by Physicians." / "For Physicians."
  - "Your Patient's Entire History." / "Instantly Organized."
- Result: Better visual hierarchy and improved readability for multi-line headlines

### Complete HL7 Integration Implementation
Successfully implemented full HL7 integration architecture while preserving all existing GPT functionality:

1. **Dual Pathway Architecture** - Created complementary system that supports both:
   - Manual attachment uploads processed by GPT (existing functionality)
   - Automated HL7 feeds from external labs (new functionality)
   - Both pathways populate same lab_results table for unified patient communication

2. **HL7 Components Implemented**:
   - **HL7Parser** - Parses HL7 ORU (lab result) messages and converts to lab results format
   - **HL7ReceiverService** - Processes incoming HL7 messages from external labs
   - **hl7Messages table** - Stores all HL7 messages for audit trail and debugging
   - **HL7 API Routes** (`/api/hl7`) - RESTful endpoints for receiving and processing HL7 messages

3. **Key Features**:
   - Automatic patient matching via MRN
   - Lab order tracking with external order IDs
   - Support for both ORU (results) and ORM (order status) messages
   - Integration with existing GPT patient communication service
   - Full message audit trail and error handling

4. **API Endpoints**:
   - `POST /api/hl7/receive` - Receive raw HL7 messages from external labs
   - `GET /api/hl7/messages` - Query HL7 message history with filters
   - `GET /api/hl7/messages/:id` - Get full message details
   - `POST /api/hl7/test` - Test HL7 parsing without processing

5. **Result** - Production-ready HL7 integration that complements GPT processing, enabling both manual and automated lab result workflows

### Fixed Lab Results Dashboard Issue
Resolved critical issue where lab results weren't appearing in dashboard's "Lab Orders to Review" section:

1. **Root Cause** - Orders table had null `providerId` values, lab processor defaulted `orderedBy` to user ID 1
2. **Dashboard Filter** - Dashboard filtered by current user ID (8), so no results appeared
3. **Fix Applied**:
   - Updated lab processor to use `providerId` from original order: `orderedBy: order.providerId || order.orderedBy || 1`
   - Fixed 12 existing lab orders to have correct provider ID (changed from 1 to 8)
   - Dashboard now correctly shows 96 lab results to review for the logged-in provider
4. **Result** - Lab ordering and review system now properly tracks ordering provider, preserving GPT processing capabilities

### Lab System Database Schema Alignment
Aligned TypeScript schema with production database structure for lab-related tables:

1. **external_labs table** - Added production-ready fields:
   - SFTP integration fields (host, username, password, directory)
   - HL7 configuration (version, sending/receiving facility)
   - Contact information (phone, email, technical contact)
   - Test and result mappings (JSON)
   - Connection monitoring (status, last test, error log)
   - Billing information and patient consent tracking

2. **lab_results table** - Added missing fields:
   - Patient communication tracking (sent status, method, timestamp, message)
   - Extraction metadata (notes, consolidation reasoning, merged IDs)
   - Visit history tracking (JSON)
   - Delta check and trend indicators
   - Changed sourceConfidence from decimal to text to match database

These changes preserve existing GPT processing capabilities while ensuring schema matches production database structure.

### Lab Order System Consolidation
Successfully consolidated lab ordering system to eliminate technical debt while maintaining production standards:

1. **Single Source of Truth** - Lab orders now created directly in `labOrders` table:
   - SOAP order extraction updated to create lab orders in labOrders table
   - Storage.ts now prevents lab orders from being created in orders table
   - Eliminated dual-table architecture and conversion process
   - Removed LabOrderProcessor trigger from storage.createOrder

2. **Key Changes**:
   - Modified `/api/encounters/:encounterId/extract-orders-from-soap` to separate lab orders
   - Lab orders created directly with LOINC codes, CPT codes, and lab-specific fields
   - Non-lab orders (medications, imaging, referrals) continue using existing flow
   - Storage.createOrder now throws error if orderType='lab' to enforce consolidation

3. **Preserved Functionality**:
   - GPT processing for attachment uploads remains intact
   - UnifiedLabParser continues processing lab results from attachments
   - GPT lab review service still generates patient communication
   - All existing lab result reporting features maintained

4. **Result** - Production-ready single-table lab order system with full HL7 integration support

## Recent Changes (July 24, 2025)

### Fixed "New Encounter" Button Navigation Issue
Fixed issue where "New Encounter" buttons in the left sidebar were trying to navigate to non-existent route:

1. **Issue Identified** - Buttons in Recent Encounters section and encounters tab were navigating to `/patients/{id}/encounters/new` which doesn't exist
2. **Root Cause** - `handleNewEncounter` function was using navigation instead of API mutation
3. **Solution Implemented** - Updated to create encounter via API POST to `/api/encounters` then navigate to created encounter
4. **Affected Components** - `EncountersTab` component used in both Recent Encounters section and expandable encounters tab
5. **Result** - All "New Encounter" buttons now work consistently, creating encounters properly

### Mobile Layout Optimization with Median Web Overrides
Implemented mobile-specific layout optimizations using Median's Web Overrides CSS system:

1. **Patient Chart View Mobile Layout**
   - UnifiedChartPanel now takes full horizontal screen space on mobile (`data-median="mobile-full-width-chart"`)
   - Desktop split-panel layout hidden on mobile (`data-median="desktop-chart-panel"` and `data-median="desktop-only"`)
   - "New Encounter" button moved from header to encounters tab for better mobile accessibility

2. **Encounter View Mobile Layout** 
   - Chart panel slides in/out from left side using fixed positioning
   - Panel is completely off-screen by default (`left: -320px`)
   - Expand button fixed at top of screen (80px from top, aligned with header)
   - Blue circular button with menu icon, only visible when panel is collapsed
   - Collapse button inside expanded panel (top right corner)
   - Provider documentation takes full screen width when chart is collapsed
   - Smooth slide animation when toggling panel visibility
   - Landscape orientation properly maintains collapsed state

3. **Button Overflow Fixes**
   - Added responsive CSS rules for narrow screens (max-width: 768px)
   - Buttons wrap properly within their containers
   - "Update from SOAP" and "Add Order" buttons scale down on mobile
   - Fixed spacing and padding issues that caused content spillover
   - Solutions apply to both web (narrow windows) and mobile views

4. **CSS Implementation**
   - All mobile-specific styles controlled via data-median attributes in MEDIAN_APP_TAGS.md
   - CSS-only solution with JavaScript for expand/collapse functionality
   - Styles only apply in Median mobile app, desktop experience unchanged
   - Uses fixed positioning for slide-out panel behavior

5. **Technical Approach**
   - Using `data-median` attributes throughout components for mobile-specific targeting
   - CSS rules with `!important` to override default styles in mobile context
   - Panel slides completely off-screen when collapsed
   - Fixed expand button always visible on left edge
   - Responsive button sizing to prevent overflow

6. **Toast Notification Removal**
   - Removed frequent toast notifications that interfere with mobile UX
   - Hidden notifications include: "Enhanced Recording Started", "Recording Complete", "Generating SOAP Note", and "Content Saved"
   - Implementation uses CSS to hide all toasts in mobile app via Median Web Overrides
   - Desktop experience remains unchanged with full toast functionality

## Recent Changes (July 23, 2025)

### Fixed Allergy Source Badge Linking Issue  
Resolved issue where allergy badges from attachments weren't linking to source documents:

1. **Root Cause Identified** - `extractedFromAttachmentId` field was null in database for attachment-extracted allergies
2. **Updated GPT Prompt** - Added explicit instruction for GPT to include attachmentId in visitEntry when processing attachments
3. **Frontend Fallback** - Added logic to check visitHistory for attachmentId if extractedFromAttachmentId is null
4. **Conditional Clickability** - Badge is only clickable when attachment ID exists, with appropriate visual feedback

### Fixed Medication Intelligent Grouping Infinite Loop
Resolved critical issue where medications were flashing and disappearing due to infinite API calls:

1. **Replaced useEffect with React Query** - Removed problematic useEffect that was causing infinite loops
2. **Added Proper Caching** - Implemented 30-second stale time and 5-minute cache time for grouping results
3. **Stable Query Keys** - Created stable medication ID keys to prevent unnecessary refetches
4. **Maintained Polling** - Preserved 2-second medication polling without triggering grouping API calls
5. **Fixed State Management** - Removed useState for intelligent groups in favor of React Query data

### Enhanced Patient Parser Logging
Added comprehensive logging and validation to diagnose and fix "Invalid MIME type" errors when parsing patient information from images:

1. **Request Logging** - Logs incoming request details, image data length, and MIME type
2. **Image Data Validation** - Checks if data has data URL prefix and validates base64 format
3. **MIME Type Validation** - Ensures only OpenAI-supported formats (JPEG, PNG, GIF, WebP)
4. **HEIF/HEIC Detection** - Warns users these formats aren't supported by OpenAI
5. **Enhanced Error Messages** - Provides specific feedback about unsupported formats
6. **Base64 Validation** - Ensures image data is properly encoded

### Photo Capture Flow
- Photos are uploaded via `/api/photo-capture/sessions/:sessionId/upload`
- Stored in `/uploads/photo-capture/` directory
- Served with proper MIME types via Express static middleware
- Client fetches photos and converts to base64 before sending to patient parser

### QR Code Photo Capture in Patient Attachments
Replicated the QR code photo capture functionality from PatientParser to the patient attachments section:

1. **Added Photo Capture States** - Session management, QR code display, and polling logic
2. **QR Code Generation** - Creates scannable QR codes for mobile photo capture
3. **Session Polling** - Polls for uploaded photos every 2 seconds
4. **Automatic OCR Processing** - Photos are automatically processed with GPT-4 Vision when uploaded
5. **UI Integration** - Added "Capture Photo with Mobile Device" button alongside traditional upload
6. **Error Handling** - Comprehensive error messages and cleanup on failure

The OCR processing happens automatically through the existing document analysis pipeline:
- Files uploaded as attachments are queued for processing
- GPT-4 Vision extracts text, generates titles, and classifies document types
- Results are stored in the `attachmentExtractedContent` table

## Project Architecture

### Frontend (React + TypeScript)
- Located in `client/src/`
- Uses Vite for development and building
- Shadcn UI components with Tailwind CSS
- React Query for data fetching
- Wouter for routing

### Backend (Node.js + Express)
- Located in `server/`
- RESTful API with comprehensive routing
- WebSocket support for real-time features
- Multer for file uploads
- OpenAI integration for AI features
- Drizzle ORM for database operations

### Database (PostgreSQL)
- Managed through Drizzle ORM
- Schema defined in `shared/schema.ts`
- Migrations handled via `npm run db:push`

### Key Services
- **PatientParserService** - Extracts patient info from images/text using GPT-4 Vision
- **PhotoCaptureService** - Handles mobile photo uploads via QR codes
- **LabOrderService** - Manages lab orders and results
- **AuthService** - Handles authentication and session management

## User Preferences
- Prefer clear, actionable error messages
- Focus on data integrity and real API usage
- Document all major architectural changes

## Development Guidelines
1. Never modify `vite.config.ts` or `server/vite.ts`
2. Use the package installer tool instead of manual package.json edits
3. Always update this file when making architectural changes
4. Use `npm run dev` to start the development server
5. Database changes should be made through Drizzle schema updates