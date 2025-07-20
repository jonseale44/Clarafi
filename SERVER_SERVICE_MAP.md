# EMR Server Directory Service Map

## Overview
This document maps all files in the server directory to help developers quickly understand what each file does.

## Core Infrastructure Files

### Application Entry & Configuration
- **index.ts** - Main Express server entry point, middleware setup, route registration
- **db.ts** - Database connection setup and configuration
- **auth.ts** - Passport.js authentication strategies and session management
- **vite.ts** - Vite dev server integration for frontend
- **tenant-isolation.ts** - Multi-tenant data isolation middleware

### Data Access Layer
- **storage.ts** - Main data access interface (IStorage) - ALL database operations go through here

## API Route Files

### Primary Routes
- **routes.ts** - Main API route definitions for core resources (patients, encounters, orders, etc.)

### Specialized Route Files
- **admin-routes.ts** - Admin dashboard and management endpoints
- **admin-stats-routes.ts** - Statistics and analytics for admin dashboard
- **admin-user-routes.ts** - Admin user management endpoints
- **admin-verification-routes.ts** - Clinic verification workflow endpoints
- **blog-routes.ts** - Blog/content management endpoints
- **clinic-admin-routes.ts** - Clinic-level admin functionality
- **dashboard-routes.ts** - Provider dashboard data endpoints
- **encounter-validation-routes.ts** - Encounter signature validation endpoints
- **eprescribing-routes.ts** - E-prescribing and prescription transmission
- **health-system-upgrade-routes.ts** - Health system tier management
- **intelligent-diagnosis-routes.ts** - AI-powered diagnosis suggestions
- **lab-routes.ts** - Laboratory order and result management
- **location-routes.ts** - Clinic location management
- **magic-link-routes.ts** - Passwordless authentication endpoints
- **migration-routes.ts** - Practice migration endpoints
- **nursing-summary-routes.ts** - Nursing documentation endpoints
- **parse-routes.ts** - Document parsing and patient info extraction
- **patient-attachments-routes.ts** - Patient document upload/management
- **pdf-download-routes.ts** - PDF generation and download
- **prescription-pdf-routes.ts** - Prescription PDF specific endpoints
- **scheduling-routes.ts** - Appointment scheduling endpoints
- **signed-orders-routes.ts** - Order signing workflows
- **subscription-key-routes.ts** - API key management for clinics
- **template-routes.ts** - Clinical note template management
- **test-patient-routes.ts** - Test patient generation for demos
- **validation-routes.ts** - Data validation endpoints
- **vitals-flowsheet-routes.ts** - Vitals tracking and flowsheets
- **webauthn-routes.ts** - WebAuthn/passkey authentication

### Unified API Endpoints
- **unified-allergy-api.ts** - Allergy data management
- **unified-family-history-api.ts** - Family history management
- **unified-imaging-api.ts** - Imaging order management
- **unified-medical-problems-api.ts** - Medical problems/conditions
- **unified-medication-intelligence-routes.ts** - Medication intelligence
- **unified-social-history-api.ts** - Social history management
- **unified-surgical-history-api.ts** - Surgical history management
- **unified-vitals-api.ts** - Vitals management

## Service Layer Files

### Clinical Services
- **patient-chart-service.ts** - Patient chart data orchestration
- **encounter-signature-validation.ts** - Encounter signing validation logic
- **electronic-signature-service.ts** - E-signature implementation
- **enhanced-note-generation-service.ts** - AI-enhanced clinical notes
- **nursing-summary-generator.ts** - Nursing documentation generation
- **soap-orders-extractor.ts** - Extract orders from SOAP notes
- **user-soap-preference-service.ts** - User preferences for SOAP notes

### AI/ML Services
- **gpt-clinical-enhancer.ts** - GPT-4 clinical note enhancement
- **gpt-lab-review-service.ts** - AI lab result interpretation
- **gpt-order-deduplication-service.ts** - Remove duplicate orders
- **gpt-order-reconciliation.ts** - Reconcile orders with existing data
- **intelligent-diagnosis-service.ts** - AI diagnosis suggestions
- **document-analysis-service.ts** - OCR and document parsing
- **physical-exam-learning-service.ts** - Learn provider exam patterns

### Laboratory Services
- **lab-order-processor.ts** - Process lab orders
- **lab-workflow-service.ts** - Lab workflow management
- **lab-intelligence-service.ts** - Lab result intelligence
- **lab-communication-service.ts** - Patient lab result communication
- **lab-review-service.ts** - Lab review workflows
- **lab-simulator-service.ts** - Simulate lab environments
- **external-lab-mock-service.ts** - Mock external lab integrations
- **production-lab-integration-service.ts** - Real lab integrations

### Medication Services
- **medication-delta-service.ts** - Track medication changes
- **medication-formulary-service.ts** - Formulary management
- **medication-intelligence-service.ts** - Medication intelligence
- **medication-standardization-service.ts** - Standardize medication data
- **prescription-transmission-service.ts** - Send prescriptions
- **prescription-pdf-service.ts** - Generate prescription PDFs
- **pharmacy-intelligence-service.ts** - Pharmacy selection logic
- **pharmacy-validation-service.ts** - Validate pharmacy data

### Order Processing Services
- **order-standardization-service.ts** - Standardize order formats
- **imaging-order-processor.ts** - Process imaging orders
- **referral-order-processor.ts** - Process referral orders
- **lab-order-background-processor.ts** - Background lab processing

### Parser Services
- **patient-parser-service.ts** - Parse patient demographics
- **vitals-parser-service.ts** - Parse vitals from documents
- **unified-allergy-parser.ts** - Parse allergy data
- **unified-family-history-parser.ts** - Parse family history
- **unified-imaging-parser.ts** - Parse imaging orders
- **unified-lab-parser.ts** - Parse lab results
- **unified-medical-problems-parser.ts** - Parse medical problems
- **unified-social-history-parser.ts** - Parse social history
- **unified-surgical-history-parser.ts** - Parse surgical history

### Integration Services
- **stripe-service.ts** - Payment processing
- **twilio-fax-service.ts** - Fax transmission
- **rxnorm-service.ts** - RxNorm medication codes
- **loinc-lookup-service.ts** - LOINC lab code lookup
- **npi-registry-service.ts** - NPI provider lookup
- **email-verification-service.ts** - Email verification
- **webauthn-service.ts** - WebAuthn implementation
- **clinic-data-import-service.ts** - Import clinic data
- **attachment-chart-processor.ts** - Process uploaded documents

### Infrastructure Services
- **api-response-handler.ts** - Standardized API responses
- **audit-logging.ts** - Audit trail logging
- **billing-calculation-service.ts** - Calculate billing amounts
- **chart-section-orchestrator.ts** - Orchestrate chart updates
- **chart-section-queue.ts** - Queue chart section updates
- **medical-chart-index-service.ts** - Index medical charts
- **privacy-service.ts** - HIPAA privacy compliance
- **subscription-config.ts** - Subscription configuration
- **token-cost-analyzer.ts** - Analyze AI token costs

## Utility Files

### PDF Generation
- **pdf-service.ts** - Core PDF generation service
- **pdf-utils.ts** - PDF utility functions
- **pdf-viewer-routes.ts** - PDF viewing endpoints

### Data Management
- **seed-data.ts** - Seed test data
- **test-patient-generator.ts** - Generate test patients
- **password-validation.ts** - Password strength validation
- **cpt-extractor.ts** - Extract CPT codes

### Development Tools
- **realtime-proxy.ts** - Proxy for realtime features
- **web-search-wrapper.ts** - Web search integration
- **template-prompt-generator.ts** - Generate AI prompts

## Database Migration & Schema Files

### Schema Analysis (These should be archived)
- **analyze-schema-mismatches.ts**
- **analyze-real-mismatches.ts**
- **check-column-usage.ts**
- **comprehensive-database-alignment.ts**
- **comprehensive-db-schema-analysis.ts**
- **fix-database-schema.ts**
- **fix-schema-drift.ts**
- **fix-typescript-errors.ts**
- **verify-alignment.ts**
- **verify-schema-alignment.ts**

### SQL Migration Files (Should be in migrations folder)
- **comprehensive-safe-migration.sql**
- **fix-all-schema-mismatches.sql**
- **fix-critical-schema-issues.sql**
- **safe-incremental-fix.sql**
- **safe-schema-fixes.sql**

### One-time Scripts
- **add-test-health-systems.ts**
- **check-health-systems.ts**
- **create-essential-tables.ts**
- **create-remaining-tables.ts**
- **fix-health-systems-data.ts**
- **init-db.ts**
- **restore-locations.ts**
- **setup-admin.ts**
- **system-initialization.ts**

## Documentation Files (Should be moved)
- **complete-db-schema-analysis.md**
- **comprehensive-lab-testing-guide.md**
- **real-mismatches-analysis.md**
- **safe-schema-analysis.md**

## Recommended Actions

1. **Create subdirectories**:
   - `/api` - All route files
   - `/services` - All service files
   - `/parsers` - All parser services
   - `/utils` - Utility functions
   - `/migrations` - Database migrations
   - `/scripts` - One-time scripts

2. **Archive old schema fixes** - Move all schema analysis/fix files to migrations-archive

3. **Consolidate duplicate functionality**:
   - Multiple lab processors could be merged
   - Schema analysis scripts could be consolidated
   - Parser services could share common logic

4. **Document service dependencies** - Many services depend on each other but it's not clear from file names