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