# EMR Codebase Cleanup Progress

## Completed Improvements (July 20, 2025)

### Documentation Organization ✓
- Reduced root markdown files from 61 to 3
- Created comprehensive SERVER_SERVICE_MAP.md for AI navigation
- Established organized docs/ structure with subdirectories
- Archived 79 old migration and schema analysis files

### Root Directory Cleanup ✓
- Moved 30+ temporary analysis files (.txt, .json) to archives
- Moved test scripts and one-time utilities to docs/scripts-archive/
- Kept only essential configuration files in root

### Created Documentation Structure ✓
```
docs/
├── api/               # API documentation
├── architecture/      # System design documents
├── guides/           # Technical guides
├── historical/       # Old documentation for reference
├── migrations-archive/ # Old schema fixes and SQL scripts
└── scripts-archive/   # Analysis and test scripts
```

## Next Recommended Improvements

### 1. Server Directory Organization (High Impact)
The server directory has 150+ files with no logical grouping. Recommended structure:
```
server/
├── api/          # All route files (*-routes.ts)
├── services/     # Business logic services
├── parsers/      # All parser services
├── utils/        # Utility functions
├── integrations/ # External service integrations
└── scripts/      # One-time scripts
```

### 2. Client Component Organization 
The client/src/components directory could benefit from better structure:
```
components/
├── common/       # Shared components
├── patient/      # Patient-related components
├── provider/     # Provider-specific components
├── admin/        # Admin components
└── labs/         # Lab-related components
```

### 3. Mobile App Consolidation
- 4 mobile app directories exist (clarafi-mobile, clarafi-mobile-capacitor, clarafi-mobile-expo, clarafi-mobile-web)
- Consider consolidating or clearly documenting which is active
- Based on analysis:
  - clarafi-mobile: Contains React Native Expo app
  - clarafi-mobile-capacitor: Contains Capacitor-based mobile app
  - clarafi-mobile-expo: Another Expo setup
  - clarafi-mobile-web: Web version of mobile app
- RECOMMENDATION: Create MOBILE_APP_GUIDE.md to explain each directory's purpose

### 4. Configuration Consolidation
Multiple configuration files in root could be grouped:
- Create a `config/` directory for non-essential configs
- Keep only critical configs (package.json, tsconfig.json) in root

### 5. Test Organization
- Create proper test structure (currently tests mixed with source)
- Move test files to dedicated test directories

## Benefits of These Improvements
1. **AI Navigation**: Clear folder structure helps AI agents find files quickly
2. **Developer Onboarding**: New developers understand the codebase faster
3. **Maintainability**: Related files grouped together reduce context switching
4. **Scalability**: Organized structure supports future growth

## Implementation Approach
- Start with server directory organization (highest impact)
- Use git to track all moves for rollback safety
- Update imports after moving files
- Test thoroughly after each major move