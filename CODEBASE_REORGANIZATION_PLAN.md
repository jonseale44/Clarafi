# EMR Codebase Reorganization Plan

## Executive Summary

Your EMR codebase has grown to production scale but lacks the organizational structure needed for maintainability. This document provides a practical reorganization plan to reduce technical debt and improve developer efficiency.

## Current Issues

### 1. Root Directory Chaos
- **Problem**: 80+ documentation files, SQL scripts, and analysis files cluttering the root
- **Impact**: Difficult to find relevant documentation, unclear what's current vs. historical

### 2. Server Directory Overload
- **Problem**: 150+ files in a single directory with no subfolder organization
- **Impact**: Hard to locate specific functionality, understand module boundaries

### 3. Schema Drift Management
- **Problem**: Multiple schema fix attempts, ongoing database/code misalignment
- **Impact**: Frequent runtime errors, difficult deployments, data integrity risks

### 4. Documentation Sprawl
- **Problem**: Documentation mixed with code, no clear hierarchy
- **Impact**: Developers can't find what they need, outdated docs cause confusion

## Proposed Directory Structure

```
├── /docs                          # All documentation
│   ├── /architecture             # System design docs
│   │   ├── README.md            # Architecture overview
│   │   ├── database-schema.md   # Current schema documentation
│   │   ├── api-design.md        # API patterns and standards
│   │   └── mobile-strategy.md   # Mobile app architecture
│   ├── /guides                   # How-to guides
│   │   ├── development.md       # Dev environment setup
│   │   ├── deployment.md        # Deployment procedures
│   │   └── troubleshooting.md   # Common issues and fixes
│   ├── /historical              # Archive of old analyses
│   └── /api                     # API documentation
│
├── /migrations                    # Database migrations
│   ├── /applied                 # Successfully applied migrations
│   ├── /pending                 # Migrations to be applied
│   └── migration-runner.ts      # Migration execution tool
│
├── /scripts                      # Utility scripts
│   ├── /analysis               # Database analysis tools
│   ├── /maintenance            # Cleanup and maintenance
│   └── /development            # Dev helper scripts
│
├── /server
│   ├── /api                    # API route handlers
│   │   ├── /auth              # Authentication endpoints
│   │   ├── /patients          # Patient management
│   │   ├── /encounters        # Encounter workflows
│   │   ├── /orders            # Order management
│   │   ├── /labs              # Laboratory system
│   │   └── /admin             # Admin functionality
│   ├── /services              # Business logic layer
│   │   ├── /clinical          # Clinical services
│   │   ├── /ai               # AI/ML services
│   │   ├── /integration      # External integrations
│   │   └── /validation       # Data validation
│   ├── /middleware            # Express middleware
│   ├── /utils                 # Shared utilities
│   └── /workers              # Background jobs
│
├── /client/src
│   ├── /features             # Feature-based organization
│   │   ├── /auth            # Authentication feature
│   │   ├── /patients        # Patient management
│   │   ├── /encounters      # Clinical encounters
│   │   ├── /orders          # Order entry
│   │   └── /labs            # Lab results
│   ├── /shared              # Shared components
│   └── /services            # API client services
│
└── /shared                   # Shared between client/server
    ├── /types               # TypeScript types
    ├── /constants           # Shared constants
    └── /validators          # Shared validation logic
```

## Implementation Strategy

### Phase 1: Documentation Consolidation (Week 1)
1. Create `/docs` directory structure
2. Move all `.md` files to appropriate subdirectories
3. Archive historical analyses in `/docs/historical`
4. Create clear README files for each section

### Phase 2: Server Reorganization (Week 2-3)
1. Create service layer subdirectories
2. Group related functionality:
   - Authentication & authorization → `/api/auth`
   - Patient operations → `/api/patients`
   - Clinical workflows → `/api/encounters`
   - Order management → `/api/orders`
3. Extract business logic to `/services`
4. Move background processors to `/workers`

### Phase 3: Client Reorganization (Week 3-4)
1. Implement feature-based folder structure
2. Consolidate related components
3. Extract shared components
4. Standardize service layer

### Phase 4: Database Schema Stabilization (Week 4-5)
1. Create formal migration system
2. Document current schema state
3. Implement schema validation on startup
4. Add database version tracking

## Technical Debt Reduction

### 1. Schema Management
```typescript
// /migrations/migration-runner.ts
export class MigrationRunner {
  async run() {
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();
    
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
      await this.recordMigration(migration);
    }
  }
}
```

### 2. Service Layer Pattern
```typescript
// /server/services/clinical/encounter-service.ts
export class EncounterService {
  constructor(
    private storage: IStorage,
    private validator: EncounterValidator,
    private auditLogger: AuditLogger
  ) {}
  
  async createEncounter(data: CreateEncounterDto) {
    await this.validator.validate(data);
    const encounter = await this.storage.createEncounter(data);
    await this.auditLogger.log('encounter.created', encounter);
    return encounter;
  }
}
```

### 3. API Route Organization
```typescript
// /server/api/encounters/index.ts
export function registerEncounterRoutes(app: Express) {
  const router = Router();
  const service = new EncounterService();
  
  router.post('/', createEncounterHandler(service));
  router.get('/:id', getEncounterHandler(service));
  router.put('/:id', updateEncounterHandler(service));
  
  app.use('/api/encounters', router);
}
```

## Code Navigation Improvements

### 1. Index Files
Create index files for each major module:
```typescript
// /server/services/index.ts
export * from './clinical';
export * from './ai';
export * from './integration';
```

### 2. Import Aliases
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@api/*": ["server/api/*"],
      "@services/*": ["server/services/*"],
      "@clinical/*": ["server/services/clinical/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

### 3. Module Documentation
Each module should have a README:
```markdown
# Clinical Services Module

## Overview
Handles all clinical workflows including encounters, SOAP notes, and clinical documentation.

## Key Services
- EncounterService: Manages patient encounters
- SOAPService: SOAP note generation and management
- DocumentationService: Clinical documentation workflows

## Dependencies
- Storage layer for data persistence
- AI services for note enhancement
- Validation services for data integrity
```

## Developer Experience Improvements

### 1. Service Discovery
Create a service registry:
```typescript
// /server/services/registry.ts
export const ServiceRegistry = {
  clinical: {
    encounters: () => new EncounterService(),
    soap: () => new SOAPService(),
    documentation: () => new DocumentationService()
  },
  ai: {
    enhancer: () => new ClinicalEnhancerService(),
    parser: () => new MedicalDataParser()
  }
};
```

### 2. Standardized Error Handling
```typescript
// /server/utils/errors.ts
export class EMRError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export class ValidationError extends EMRError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}
```

### 3. Development Tools
Create helper scripts:
```bash
# /scripts/dev/find-service.sh
#!/bin/bash
# Usage: ./find-service.sh EncounterService
# Quickly locate service implementations

# /scripts/dev/check-schema.sh
#!/bin/bash
# Compare database schema with Drizzle definitions
```

## Monitoring and Maintenance

### 1. Code Quality Metrics
- Set up ESLint rules for consistent code style
- Add pre-commit hooks for code formatting
- Implement complexity metrics monitoring

### 2. Documentation Standards
- Every service must have JSDoc comments
- API endpoints need OpenAPI documentation
- Complex algorithms require inline explanations

### 3. Regular Maintenance Tasks
- Weekly: Review and archive old analysis files
- Monthly: Update architecture documentation
- Quarterly: Review and refactor large modules

## Migration Timeline

**Week 1**: Documentation reorganization
**Week 2-3**: Server-side restructuring
**Week 3-4**: Client-side improvements
**Week 4-5**: Schema stabilization
**Week 6**: Testing and validation

## Success Metrics

1. **Developer Efficiency**
   - Time to locate specific functionality: < 30 seconds
   - Time to understand a module: < 10 minutes
   - New developer onboarding: < 1 day

2. **Code Quality**
   - No files > 500 lines
   - Clear separation of concerns
   - Consistent patterns across modules

3. **Maintenance Burden**
   - Schema changes require single migration file
   - New features don't require modifying core files
   - Clear boundaries between modules

## Conclusion

This reorganization will transform your codebase from a monolithic structure to a well-organized, maintainable system. The investment in reorganization will pay dividends in:
- Faster feature development
- Reduced bugs from schema misalignment
- Easier onboarding for new developers
- Better AI agent navigation

The key is to implement incrementally while maintaining system stability.