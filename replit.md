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

### Mobile Layout Optimization with Median Web Overrides
Implemented mobile-specific layout optimizations using Median's Web Overrides CSS system:

1. **Patient Chart View Mobile Layout**
   - UnifiedChartPanel now takes full horizontal screen space on mobile (`data-median="mobile-full-width-chart"`)
   - Desktop split-panel layout hidden on mobile (`data-median="desktop-chart-panel"` and `data-median="desktop-only"`)
   - "New Encounter" button moved from header to encounters tab for better mobile accessibility

2. **Encounter View Mobile Layout** 
   - Chart panel slides in/out from left side using fixed positioning
   - Panel is completely off-screen by default (`left: -320px`)
   - Expand button fixed on left edge of screen (blue circular button with menu icon)
   - Collapse button inside expanded panel (top right corner)
   - Provider documentation takes full screen width when chart is collapsed
   - Smooth slide animation when toggling panel visibility

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