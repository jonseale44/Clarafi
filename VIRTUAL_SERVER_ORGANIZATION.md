# Virtual Server Organization Guide

## Overview
This document shows how the server files WOULD be organized if we were to restructure them, without actually moving any files. This helps developers mentally group related functionality.

## Virtual Structure

### 📁 server/api/ (Route Files)
These files define API endpoints and should logically be grouped together:
```
admin-routes.ts
admin-stats-routes.ts
admin-user-routes.ts
admin-verification-routes.ts
blog-routes.ts
clinic-admin-routes.ts
dashboard-routes.ts
encounter-validation-routes.ts
eprescribing-routes.ts
health-system-upgrade-routes.ts
intelligent-diagnosis-routes.ts
lab-routes.ts
location-routes.ts
magic-link-routes.ts
migration-routes.ts
nursing-summary-routes.ts
parse-routes.ts
patient-attachments-routes.ts
pdf-download-routes.ts
pdf-viewer-routes.ts
prescription-pdf-routes.ts
routes.ts (main routes file)
scheduling-routes.ts
signed-orders-routes.ts
subscription-key-routes.ts
template-routes.ts
test-patient-routes.ts
unified-allergy-api.ts
unified-family-history-api.ts
unified-imaging-api.ts
unified-medical-problems-api.ts
unified-medication-intelligence-routes.ts
unified-social-history-api.ts
unified-surgical-history-api.ts
unified-vitals-api.ts
validation-routes.ts
vitals-flowsheet-routes.ts
webauthn-routes.ts
```

### 📁 server/services/ (Business Logic)
Core services that handle business logic:
```
# Clinical Services
patient-chart-service.ts
encounter-signature-validation.ts
electronic-signature-service.ts
enhanced-note-generation-service.ts
nursing-summary-generator.ts
soap-orders-extractor.ts
user-soap-preference-service.ts

# AI/ML Services
gpt-clinical-enhancer.ts
gpt-lab-review-service.ts
gpt-order-deduplication-service.ts
gpt-order-reconciliation.ts
intelligent-diagnosis-service.ts
document-analysis-service.ts
physical-exam-learning-service.ts

# Lab Services
lab-order-processor.ts
lab-workflow-service.ts
lab-intelligence-service.ts
lab-communication-service.ts
lab-review-service.ts
lab-simulator-service.ts
external-lab-mock-service.ts
production-lab-integration-service.ts

# Medication Services
medication-delta-service.ts
medication-formulary-service.ts
medication-intelligence-service.ts
medication-standardization-service.ts
prescription-transmission-service.ts
prescription-pdf-service.ts
pharmacy-intelligence-service.ts
pharmacy-validation-service.ts

# Order Services
order-standardization-service.ts
imaging-order-processor.ts
referral-order-processor.ts
lab-order-background-processor.ts

# Infrastructure Services
api-response-handler.ts
audit-logging.ts
billing-calculation-service.ts
chart-section-orchestrator.ts
chart-section-queue.ts
medical-chart-index-service.ts
privacy-service.ts
subscription-config.ts
token-cost-analyzer.ts
```

### 📁 server/parsers/ (Data Parsing)
All parser services that extract structured data:
```
patient-parser-service.ts
vitals-parser-service.ts
unified-allergy-parser.ts
unified-family-history-parser.ts
unified-imaging-parser.ts
unified-lab-parser.ts
unified-medical-problems-parser.ts
unified-social-history-parser.ts
unified-surgical-history-parser.ts
cpt-extractor.ts
```

### 📁 server/integrations/ (External Services)
Third-party service integrations:
```
stripe-service.ts
twilio-fax-service.ts
rxnorm-service.ts
loinc-lookup-service.ts
npi-registry-service.ts
email-verification-service.ts
webauthn-service.ts
clinic-data-import-service.ts
attachment-chart-processor.ts
```

### 📁 server/utils/ (Utilities)
Helper functions and utilities:
```
pdf-service.ts
pdf-utils.ts
password-validation.ts
realtime-proxy.ts
web-search-wrapper.ts
template-prompt-generator.ts
```

### 📁 server/core/ (Core Infrastructure)
Core application files:
```
index.ts
db.ts
auth.ts
vite.ts
tenant-isolation.ts
storage.ts
api-response-handler.ts
```

### 📁 server/scripts/ (One-time Scripts)
Scripts for setup and maintenance:
```
seed-data.ts
test-patient-generator.ts
add-test-health-systems.ts
check-column-usage.ts
create-essential-tables.ts
create-remaining-tables.ts
download-nppes-data.ts
fix-health-systems-data.ts
lab-integration-health-check.ts
restore-locations.ts
setup-admin.ts
system-initialization.ts
```

## Benefits of This Virtual Organization

1. **Mental Model**: Developers can think of files as being in these logical groups
2. **Search Efficiency**: When looking for a file, check the appropriate virtual folder
3. **Code Reviews**: Easier to identify which "virtual folder" a new file belongs in
4. **Future Planning**: If we ever do reorganize, this guide provides the blueprint

## Quick Reference

When looking for:
- **API endpoints** → Check the "api" virtual folder
- **Business logic** → Check the "services" virtual folder  
- **Data extraction** → Check the "parsers" virtual folder
- **External APIs** → Check the "integrations" virtual folder
- **Helper functions** → Check the "utils" virtual folder
- **Main app files** → Check the "core" virtual folder
- **Setup scripts** → Check the "scripts" virtual folder

## Using This Guide

1. Use Ctrl+F to search for specific files
2. Reference the virtual folder when discussing code location
3. When adding new files, consider which virtual folder it belongs in
4. Update this guide when adding significant new files