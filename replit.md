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
- **CRITICAL FIX**: Removed legacy `/api/user/soap-templates` endpoints causing separate S/O/A/P format without ORDERS section
- **TEMPLATE ROUTING CORRECTED**: Fixed `ClinicalNoteTemplates.getPrompt()` to use correct `buildSOAPPrompt()` function (lines 85-210) with integrated Assessment/Plan and ORDERS sections

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