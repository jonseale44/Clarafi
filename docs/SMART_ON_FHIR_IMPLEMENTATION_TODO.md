# SMART on FHIR Implementation TODO

## Overview
This document outlines the requirements and steps needed to implement SMART on FHIR capabilities for our EMR system to enable interoperability with major EMR platforms (Epic, Cerner/Oracle Health, Athena Health).

## Background Research Summary

### Industry Standards
- **FHIR R4** is the current standard (mandatory by 2025 regulations)
- **SMART on FHIR** enables apps to launch within EMR systems
- **OAuth 2.0** with PKCE is the authentication standard
- Major EMRs (Epic, Cerner, Athena) all support SMART on FHIR

### Integration Approaches
1. **Direct Integration** - Build connections to each EMR individually
2. **Integration Platforms** - Use services like Redox ($4-week implementation)
3. **SMART on FHIR** - Build once, deploy everywhere approach (recommended)

## Phase 1: Foundation (2-3 weeks)

### OAuth 2.0 Implementation
- [ ] Set up OAuth 2.0 authorization server
  - [ ] Support Authorization Code Flow (for EMR launches)
  - [ ] Support Client Credentials Flow (for backend services)
  - [ ] Implement PKCE for mobile apps
  - [ ] JWT token generation and validation
  - [ ] Refresh token support

### FHIR R4 Resource Mapping
- [ ] Map existing database schema to FHIR resources:
  - [ ] `patients` table → Patient resource
  - [ ] `encounters` table → Encounter resource
  - [ ] `medications` table → MedicationRequest resource
  - [ ] `labOrders`/`labResults` → Observation resource
  - [ ] `medicalProblems` → Condition resource
  - [ ] `allergies` → AllergyIntolerance resource
  - [ ] `providers` → Practitioner resource
  - [ ] `locations` → Location resource

### Basic FHIR Endpoints
- [ ] Implement base FHIR URL structure: `/fhir/r4/`
- [ ] Create read endpoints for core resources:
  - [ ] `GET /fhir/r4/Patient/{id}`
  - [ ] `GET /fhir/r4/Encounter/{id}`
  - [ ] `GET /fhir/r4/Observation/{id}`
  - [ ] `GET /fhir/r4/MedicationRequest/{id}`
  - [ ] `GET /fhir/r4/Condition/{id}`

### Metadata/Capability Statement
- [ ] Implement `GET /fhir/r4/metadata` endpoint
- [ ] Return CapabilityStatement resource describing:
  - [ ] Supported resources
  - [ ] Supported operations
  - [ ] Search parameters
  - [ ] Security requirements

## Phase 2: SMART Launch Framework (2-3 weeks)

### Launch Parameters
- [ ] Handle `launch` parameter for EHR launches
- [ ] Handle `iss` parameter for issuer identification
- [ ] Support standalone launch (patient selection)
- [ ] Support EHR launch (context provided)

### Context Passing
- [ ] Pass patient context in token response
- [ ] Pass encounter context when available
- [ ] Pass user/practitioner context
- [ ] Handle `intent` parameter for write operations

### App Registration System
- [ ] Create app registration database schema
- [ ] Build registration UI for developers
- [ ] Generate client credentials
- [ ] Store redirect URIs
- [ ] Define allowed scopes per app

### Authorization UI
- [ ] Create consent screen for patient data access
- [ ] Show requested scopes clearly
- [ ] Allow scope selection/limitation
- [ ] Remember consent decisions

## Phase 3: Search and Operations (2-3 weeks)

### Search Implementation
- [ ] Patient search:
  - [ ] `GET /fhir/r4/Patient?family=Smith`
  - [ ] `GET /fhir/r4/Patient?given=John`
  - [ ] `GET /fhir/r4/Patient?birthdate=1980-01-01`
  - [ ] `GET /fhir/r4/Patient?identifier=MRN123`

- [ ] Observation search:
  - [ ] `GET /fhir/r4/Observation?patient=123`
  - [ ] `GET /fhir/r4/Observation?category=vital-signs`
  - [ ] `GET /fhir/r4/Observation?date=ge2025-01-01`

- [ ] Encounter search:
  - [ ] `GET /fhir/r4/Encounter?patient=123`
  - [ ] `GET /fhir/r4/Encounter?date=2025-01-20`
  - [ ] `GET /fhir/r4/Encounter?status=finished`

### Bundle Support
- [ ] Implement Bundle resource for search results
- [ ] Support pagination with `_count` parameter
- [ ] Implement next/previous links

### Error Handling
- [ ] Return OperationOutcome for errors
- [ ] Use appropriate HTTP status codes
- [ ] Include detailed error messages

## Phase 4: Security and Compliance (1-2 weeks)

### Security Requirements
- [ ] Enforce HTTPS for all endpoints
- [ ] Implement CORS headers for browser apps
- [ ] Add rate limiting
- [ ] Implement audit logging
- [ ] Security headers (HSTS, CSP, etc.)

### Scope Management
- [ ] Implement standard SMART scopes:
  - [ ] `patient/*.read`
  - [ ] `patient/*.write`
  - [ ] `user/*.read`
  - [ ] `user/*.write`
  - [ ] `launch`
  - [ ] `launch/patient`
  - [ ] `launch/encounter`
  - [ ] `offline_access`

### Testing
- [ ] Test with SMART App Gallery apps
- [ ] Validate with FHIR validators
- [ ] Security penetration testing
- [ ] Load testing

## Phase 5: EMR-Specific Integration (2-3 weeks)

### Epic Integration
- [ ] Register at https://fhir.epic.com/
- [ ] Configure for Epic sandbox
- [ ] Test with Epic's test harness
- [ ] Apply for App Orchard listing

### Cerner/Oracle Health
- [ ] Register for developer program
- [ ] Test in Cerner Code sandbox
- [ ] Migrate any DSTU2 to R4 (deadline: Dec 2025)
- [ ] Consider OPN partnership ($5,000)

### Athena Health
- [ ] Register at developer portal
- [ ] Test with preview sandbox
- [ ] Handle Athena-specific extensions
- [ ] Plan for hybrid FHIR/proprietary API usage

## Phase 6: Production Readiness (1-2 weeks)

### Documentation
- [ ] API documentation for developers
- [ ] Integration guides per EMR
- [ ] Sample code repositories
- [ ] Postman collections

### Monitoring
- [ ] API usage metrics
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Uptime monitoring

### Support
- [ ] Developer support process
- [ ] Issue tracking system
- [ ] Version management strategy
- [ ] Deprecation policy

## Technical Implementation Notes

### OAuth Configuration Example
```javascript
// OAuth endpoints needed:
POST /oauth/authorize
POST /oauth/token
GET /oauth/introspect
POST /oauth/revoke
```

### FHIR Resource Example
```json
{
  "resourceType": "Patient",
  "id": "123",
  "identifier": [{
    "system": "http://hospital.org/mrn",
    "value": "MRN123"
  }],
  "name": [{
    "family": "Smith",
    "given": ["John", "Jacob"]
  }],
  "birthDate": "1980-01-01",
  "gender": "male"
}
```

### Launch Context Example
```json
{
  "patient": "123",
  "encounter": "456",
  "practitioner": "789",
  "intent": "order-sign"
}
```

## Considerations

### Data Mapping Challenges
- Our `medications` table has `sourceOrderId` not `orderId`
- Need to handle our complex order types (lab, imaging, referral)
- Map our provider roles to FHIR practitioner roles
- Handle our multi-location/health system model

### Quick Start Option
- Consider using existing libraries:
  - `node-oidc-provider` for OAuth
  - `node-fhir-server-core` for FHIR base
  - Start with read-only Patient and Observation

### Scaling Considerations
- When ready for multiple hospitals, consider Redox
- Plan for different EMR quirks and requirements
- Budget for compliance and security audits

## Next Steps
1. Decide on build vs. buy for OAuth implementation
2. Create project plan with timelines
3. Set up development FHIR endpoints
4. Begin with Patient resource as proof of concept
5. Register for EMR developer programs early (approval takes time)

## Resources
- SMART on FHIR Docs: https://docs.smarthealthit.org/
- FHIR R4 Spec: https://www.hl7.org/fhir/
- Epic FHIR: https://fhir.epic.com/
- Cerner FHIR: https://fhir.cerner.com/
- Athena FHIR: https://docs.athenahealth.com/api/
- SMART App Gallery: https://gallery.smarthealthit.org/

## Estimated Timeline
- Total implementation: 10-15 weeks
- MVP (Patient resource only): 3-4 weeks
- Full production ready: 4-6 months

## Budget Considerations
- Development time: 10-15 weeks
- Security audit: ~$10-20k
- EMR partnerships: $0-5k each
- Integration platform (optional): Varies
- Ongoing compliance: ~$5-10k/year