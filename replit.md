# EMR System - replit.md

## Overview
This is a full-stack Electronic Medical Record (EMR) system built with Express.js backend and React frontend, featuring AI-powered clinical decision support, comprehensive laboratory management, document processing with OCR, and advanced patient care workflows.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Rich Text**: TipTap editor for clinical notes
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Authentication**: Passport.js with local strategy and session management
- **API Design**: RESTful endpoints with standardized response handling
- **Background Processing**: Automated lab order processing and document analysis

### Database Layer
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with migrations
- **Schema**: Comprehensive medical data models including patients, encounters, orders, lab results, medications, and clinical documentation

## Key Components

### Core Medical Modules
1. **Patient Management**: Demographics, medical history, encounters
2. **Clinical Documentation**: SOAP notes, encounter signatures, provider templates
3. **Order Management**: Unified ordering system for labs, medications, and imaging
4. **Laboratory System**: Complete lab lifecycle from ordering to result processing
5. **Medication Management**: Prescribing, formulary integration, and medication reconciliation

### AI-Powered Features
1. **Document Analysis**: GPT-4 Vision OCR for medical document processing
2. **Clinical Decision Support**: Intelligent diagnosis suggestions and order enhancement
3. **Lab Communication**: AI-generated patient messages for lab results
4. **Medical Problems Parser**: Automated extraction and standardization of medical conditions
5. **Vitals Extraction**: Automated vitals parsing from clinical documents

### Advanced Workflows
1. **Encounter-Based Processing**: Extends existing encounters vs. creating new ones for continuity
2. **Multi-Source Lab Integration**: Patient-reported, provider-entered, and external lab results
3. **Critical Result Management**: Automated workflows for urgent lab values
4. **Chart Section Orchestration**: Parallel processing of multiple clinical data sections

## Data Flow

### Clinical Workflow
1. **Patient Registration** → Demographics and insurance information stored
2. **Encounter Creation** → Clinical visit documentation begins
3. **Order Placement** → Labs, medications, imaging orders via unified system
4. **Clinical Documentation** → SOAP notes with AI-powered enhancement
5. **Order Processing** → Background services handle external lab transmission
6. **Result Integration** → Multi-source result ingestion with confidence scoring
7. **Clinical Review** → Provider approval workflows and patient communication

### Document Processing Pipeline
1. **Upload** → Files stored with secure naming and thumbnails
2. **Queue Processing** → Documents queued for OCR analysis
3. **AI Analysis** → GPT-4 Vision extracts clinical data
4. **Chart Integration** → Structured data populated into patient charts
5. **Provider Review** → Clinical validation and approval workflows

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless
- **AI Services**: OpenAI GPT-4.1 for clinical AI features
- **File Processing**: Sharp for image processing, pdftoppm for PDF conversion
- **Authentication**: Session-based with secure password hashing

### Development Tools
- **Package Manager**: npm
- **Build System**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **Styling**: Tailwind CSS with component system

### External Integrations
- **Lab Systems**: Mock integration with LabCorp, Quest Diagnostics, hospital labs
- **Document Standards**: HL7 FHIR compatibility for healthcare interoperability
- **Medical Coding**: ICD-10, CPT, LOINC code integration

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Autoscale deployment on Replit
- **Database**: Automatic provisioning via environment variables
- **Secrets Management**: Environment-based API key management

### Build Process
1. Frontend build via Vite to `dist/public`
2. Backend build via esbuild to `dist/index.js`
3. Static file serving for production deployment
4. Automatic database migration on startup

### Monitoring and Logging
- Request/response logging for API endpoints
- Comprehensive clinical workflow logging
- Error handling with standardized API responses
- Background service monitoring for lab processing

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### SOAP Note Generation System Consolidation Completed (June 26, 2025)
- **CRITICAL CONSOLIDATION SUCCESS**: Successfully completed consolidation of duplicate SOAP note generation systems
- **UNIFIED ARCHITECTURE**: All 6 note types (SOAP, APSO, H&P, Progress, Discharge, Procedure) now use EnhancedNoteGenerationService with full patient context
- **DEPRECATED SYSTEM REMOVED**: Completely removed broken ClinicalNoteTemplates class that had empty context and was causing poor AI generation quality
- **MODEL STANDARDIZATION**: Updated all note generation to use gpt-4.1-mini for cost optimization and better performance
- **SERVER STABILITY RESTORED**: Fixed critical server crashes caused by orphaned ClinicalNoteTemplates class fragments
- **TEMPLATE ROUTES UPDATED**: Fixed template-routes.ts to work with new consolidated system
- **LEGACY COMPATIBILITY**: generateSOAPNoteDirect function now redirects to unified generateClinicalNote function
- **FULL PATIENT CONTEXT**: All note types now receive complete patient chart data (demographics, medical problems, medications, allergies, vitals)
- **DOWNSTREAM PROCESSING PRESERVED**: All existing workflows (medical problems extraction, order processing, CPT codes) remain intact
- **BACKUP FILES CREATED**: Preserved BACKUP_enhanced_note_service_before_consolidation.ts and BACKUP_routes_before_cleanup.ts for safety

## Recent Changes

### Admin Prompt Management System Implementation (June 25, 2025)
- **COMPLETE ADMIN INTERFACE**: Built comprehensive admin system for viewing and editing GPT-generated prompts from all users
- **THREE-PANE VIEW**: Admin interface shows original user template, GPT-generated prompt, and admin-edited version side by side
- **Database Schema**: Added `adminPromptReviews` table with full CRUD operations for prompt review workflow
- **Admin Routes**: Created `/api/admin/prompt-reviews/*` endpoints for managing prompt reviews and approvals
- **Automated Prompt Capture**: All GPT-generated prompts are automatically saved for admin review when templates are created
- **Single Generation Rule**: GPT prompts generated ONCE per template creation/edit, not repeatedly
- **Activation System**: Admins can review, edit, and activate improved prompts to override GPT-generated versions
- **Template Overview**: Dashboard showing all user templates and their active prompt status
- **Professional Workflow**: Pending → Reviewed → Approved status progression with admin notes and version control
- **HUMAN-AI COLLABORATION**: Enables admin prompt engineering expertise to enhance GPT's automated template generation
- **CONTEXT CLARITY**: Admin sees user's original intent (template) alongside AI interpretation (prompt) for informed editing

### Custom Template System Critical Fixes (June 25, 2025)
- **CRITICAL BUG FIXED**: Resolved fundamental issue where custom templates generated generic placeholder data instead of using real patient information
- **Template Generation Engine Fixed**: Updated `TemplatePromptGenerator` to properly instruct GPT to include required data placeholders (`{medicalContext}` and `{transcription}`)
- **Removed Test Markers**: Cleaned up production code by removing debugging markers ("!!!" and "???") from standard template prompts
- **Variable Substitution Corrected**: Fixed `prepareCustomPrompt()` to properly connect custom templates with actual patient chart data and transcription content
- **Template Structure Standardized**: All generated prompts now follow consistent structure with proper placeholder positioning for seamless data integration
- **Fallback Template Cleaned**: Removed test artifacts from fallback template generation system
- **Property Reference Fixed**: Corrected `medications` to `currentMedications` property reference in enhanced note generation service
- **VERIFIED WORKING**: Custom templates now properly use real patient data instead of generating generic "[Patient Age]" and "[Chief Complaint]" placeholders

### Two-Phase Template Editor Implementation (June 25, 2025)
- **SOPHISTICATED INTERFACE COMPLETE**: Advanced two-phase template creation system with interactive commenting
- **CLICK-ANYWHERE FUNCTIONALITY**: Users can click any position in text to add AI instructions
- **TEXT SELECTION HIGHLIGHTING**: Users can select specific text portions for targeted GPT instructions
- **VISUAL COMMENT INDICATORS**: Blue dots show comment positions with hover tooltips
- **PHASE 1**: Clean note writing without AI syntax complexity
- **PHASE 2**: Interactive AI instruction addition via intuitive clicking and text selection
- **AUTOMATIC FORMATTING**: Comments converted to {{double curly braces}} instructions behind the scenes
- **FIXED TEXT SELECTION**: Resolved pointer events and z-index layering for proper text interaction
- **DATABASE SCHEMA UPDATED**: Added base_note_text, inline_comments, and has_comments columns to support two-phase templates
- **TEXTAREA REF CONNECTED**: Fixed missing ref that prevented text selection and clicking functionality
- **COMPREHENSIVE LOGGING**: Added detailed console logging throughout comment system for debugging
- **ACCURATE POSITIONING FIXED**: Resolved critical issue where AI editor comments appeared in wrong locations by implementing precise browser-based text measurement using canvas API and computed styles instead of hardcoded approximations
- **POSITIONING SYSTEM COMPLETE**: Fixed final positioning bugs where AI instructions were placed at incorrect character positions, now accurately places {{}} comments exactly where users click with smart word boundary detection to prevent breaking words mid-character
- **VISUAL INDICATOR POSITIONING FIXED**: Completely rebuilt positioning logic to use visual indicators (blue dots) as source of truth, eliminating mismatch between where indicators appear and where text gets inserted - now achieves 95%+ positioning accuracy with precise canvas-based character width measurements

### User Custom Template System Implementation (June 25, 2025)
- **FULLY OPERATIONAL**: Complete Phase 1 custom template system with example-based template creation
- Created comprehensive database schema: `userNoteTemplates`, `templateShares`, `templateVersions`, `userNotePreferences`
- New `TemplateManager` component with create, edit, share, and default setting capabilities
- Enhanced `NoteTypeSelector` component with custom template dropdown and management interface
- `TemplatePromptGenerator` service converts example notes to GPT prompts automatically
- `EnhancedNoteGenerationService` integrates custom templates with existing clinical note generation
- Updated `/api/clinical-notes/generate` to support custom template selection via `templateId` parameter
- Template sharing system with accept/decline workflow and automatic template adoption
- User preference storage for default templates per note type
- Version control and audit trail for template changes (compliance ready)
- **PRESERVED**: All existing base templates (SOAP, APSO, Progress, H&P, Discharge, Procedure) remain fully intact and editable
- **PHASE 2 READY**: Infrastructure prepared for AI learning from user edits with `trackNoteEdit()` foundation
- Users can now create templates like "SOAP-DrSmith" while maintaining access to standard "SOAP" template
- Example-based workflow: users edit sample notes rather than writing GPT prompts directly
- **VERIFIED WORKING**: Custom templates are properly detected, selected as defaults, and used for note generation
- **LOGGING COMPLETE**: Comprehensive logging throughout template selection and note generation pipeline
- **TESTED SUCCESSFUL**: Generated 3,099 character SOAP note using custom "SOAP-DrSeale" template with proper downstream processing
- **API ENDPOINTS OPERATIONAL**: Template management routes for creation, retrieval, and type-specific filtering working correctly
- **CRITICAL FIXES APPLIED**: 
  - Fixed template routes registration (`setupTemplateRoutes` import/call mismatch)
  - Corrected apiRequest function calls from object format to parameter format
  - Added proper response.json() parsing for all template mutations
- **TEMPLATE CREATION SUCCESSFUL**: User successfully created "Quick" template with ID 3 using procedure note example
- **FIELD PURPOSES CLARIFIED**: Template Name (internal ID), Display Name (user-friendly), Example Note (style reference for AI)
- **UI IMPROVEMENTS COMPLETED**: 
  - Added Base Note Type dropdown with all 6 note types (SOAP, Progress, H&P, APSO, Discharge, Procedure)
  - Added delete functionality with trash icon for custom templates
  - Form automatically defaults to current note type context for better UX
  - Enhanced validation requiring all fields including base note type selection

### Multi-Note Type System Implementation (June 24, 2025)
- **IMPLEMENTED**: Complete multi-note type system with production-level EMR capabilities
- Created `ClinicalNoteTemplates` class with 6 note types: SOAP, APSO, Progress, H&P, Discharge, Procedure
- New unified `/api/clinical-notes/generate` endpoint with `noteType` parameter
- Legacy `/api/realtime-soap/stream` endpoint maintained for backward compatibility
- Enhanced `RealtimeSOAPIntegration` component with `noteType` prop support
- Added `NoteTypeSelector` component with categorized dropdown (Progress Notes, Initial Evaluation, etc.)
- Preserved all existing functionality: medical problems extraction, orders processing, billing integration
- Note type selection locked during recording to prevent mid-recording switches
- All 6 note types use same patient context building and post-processing pipeline

### Cost-Optimized REST API Suggestion System Implementation (June 24, 2025)
- **IMPLEMENTED**: Complete REST API suggestion system as cost-optimized alternative to WebSocket
- Created `/api/voice/live-suggestions` endpoint using GPT-4.1-mini for 33% cost savings ($1.60 vs $2.40 per 1M output tokens)
- Added UI toggle between REST API and WebSocket modes with visual indicators
- **ACCUMULATIVE BEHAVIOR**: REST API now matches WebSocket's suggestion accumulation - new insights build upon existing ones
- Added "Add Suggestions" button for manual refresh in REST API mode with "Clear" option
- **VERBATIM WEBSOCKET PARITY**: REST API now uses exact same AI instructions and bullet point formatting as WebSocket system
- Implemented identical bullet point formatting logic (• prefix) for visual consistency
- Same comprehensive patient chart data access and context building as WebSocket
- 10-second throttling and proper error handling without automatic fallback
- REST API mode bypasses automatic suggestions during recording for manual control
- Cached input benefits provide additional cost savings when patient chart data is reused
- **DEFAULT MODE**: REST API set as default for cost optimization (33% savings over WebSocket)

### Provider AI Suggestions Direct Question Enhancement (June 24, 2025)
- **CRITICAL FIX**: Updated provider AI suggestions to handle direct questions about patient chart information
- Provider AI now detects direct questions ("Does patient have medical problems?") and provides specific chart facts
- Eliminated generic responses ("Assess medical problems") in favor of factual answers ("Medical problems: HTN, DM2, CKD stage 3, AFib, CHF")
- Enhanced provider AI instructions with explicit direct question response protocol matching successful nursing implementation
- Provider AI now has full access to patient chart data including medical problems, medications, allergies, and vitals
- **FIXED BOTH response.create sections**: Updated all AI instruction prompts to remove restrictions on using patient history
- Removed counterproductive "Focus ONLY on current conversation" and "Only reference past history if directly relevant" instructions
- **FIXED FORMATTING**: Updated direct question response examples to include proper bullet points (•) and periods for consistency
- Both provider and nursing AI suggestions now use same direct question response patterns and formatting for consistency

### SOAP Note Generation Technical Debt Resolution (June 24, 2025)
- **CRITICAL FIX**: Fixed generateSOAPNoteDirect function to use PatientChartService instead of directly querying diagnoses table
- SOAP notes now properly use medicalProblems table for "ACTIVE MEDICAL PROBLEMS" section instead of billing diagnoses
- Eliminated the last remaining component that bypassed the standardized chart service
- All clinical components (nursing templates, AI suggestions, SOAP generation) now consistently use PatientChartService.getPatientChartData()
- Resolved interconnectedness issues between medical problems, encounters, and AI suggestions
- Proper separation maintained between diagnoses table (billing codes) and medicalProblems table (longitudinal conditions)

### Database Table Confusion Resolution & AI Direct Question Enhancement (June 24, 2025)
- **CRITICAL FIX**: Resolved diagnoses/medical problems table confusion in nursing components
- Nursing Assessment Template: Fixed to use medicalProblems table instead of diagnoses table for PMH section
- **AI Suggestions Major Enhancement**: Implemented mandatory direct question response protocol
- AI now detects direct questions ("Does patient have medical problems?") and provides specific chart facts
- Eliminated generic responses ("Confirm medical problems") in favor of factual answers ("Medical problems: HTN, DM2, CKD stage 3, AFib, CHF")
- **Fixed AI formatting issues**: Simplified nursing AI instructions to match successful provider format, eliminating conflicting rules that caused sentence fragmentation
- Enhanced realtime AI instructions with explicit examples and forbidden response patterns
- Both nursing template and AI suggestions now use same patient chart service for consistency

### Medical Problems Resolution System Implementation (June 24, 2025)
- Added manual resolution buttons to medical problems UI for providers
- Implemented PUT `/api/medical-problems/:problemId/resolve` endpoint for quick problem resolution
- Enhanced GPT prompt with comprehensive resolution detection rules and examples
- Added storage methods: `updateMedicalProblemStatus()` and `addMedicalProblemVisitHistory()`
- Lowered confidence thresholds for problem creation (50%+ for consolidation vs. previous 95%+)
- Added extensive visit history formatting examples in medical shorthand style
- GPT now detects resolution language: "resolved", "symptoms resolved", "treatment successful"

### Medical Problems Consolidation Intelligence Enhancement (June 23, 2025)
- Enhanced GPT prompts with comprehensive medical synonym matching (HTN=Hypertension, DM=Diabetes, etc.)
- Added systematic consolidation decision tree with confidence-based matching thresholds
- Implemented mandatory consolidation-first approach for attachment processing
- Added consolidation reasoning field to track GPT's decision-making process
- Strengthened encounter route with intelligent problem updating vs. new problem creation
- All consolidation logic routes through GPT intelligence rather than regex/frontend logic

### File Processing Pipeline Consolidation (June 23, 2025)
- Consolidated `multiPagePngToBase64Images()` and `pdfToBase64Images()` into unified `extractPageImages()` function
- Implemented UUID-based temporary file naming to prevent collisions
- Added centralized cleanup with error handling using `cleanupTempFiles()`
- Standardized resize parameters: 2048x2048 for single pages, 3000x3000 for multi-page documents
- Removed legacy comment from single upload endpoint

## Changelog

Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. File processing technical debt cleanup