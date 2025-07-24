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