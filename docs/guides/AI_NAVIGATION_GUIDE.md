# AI Agent Navigation Guide for EMR Codebase

## Quick Reference for AI Agents

This guide is specifically designed to help AI agents quickly understand and navigate this EMR codebase.

## 🎯 Primary Entry Points

### For Patient Management
- **API Routes**: `server/routes.ts` - Look for `/api/patients/*` endpoints
- **Frontend**: `client/src/pages/patient-view.tsx`
- **Storage**: `server/storage.ts` - Patient CRUD operations

### For Clinical Documentation
- **SOAP Notes**: `client/src/components/RealtimeSOAPGenerator.tsx`
- **Encounter Management**: `client/src/pages/encounter-view.tsx`
- **Backend**: `server/enhanced-note-generation-service.ts`

### For Orders (Labs, Meds, Imaging)
- **Unified Order Entry**: `client/src/components/orders/unified-order-entry.tsx`
- **Order Processing**: `server/routes.ts` - `/api/orders/*` endpoints
- **AI Parsing**: `server/order-standardization-service.ts`

### For Lab Results
- **Lab Dashboard**: `client/src/pages/patient-lab-results.tsx`
- **Lab Processing**: `server/lab-order-processor.ts`
- **Result Integration**: `server/lab-workflow-service.ts`

## 🔍 Key Search Patterns

When searching for functionality, use these patterns:

### Finding API Endpoints
```typescript
// Search for: "router.get('/api/" or "router.post('/api/"
// Main file: server/routes.ts
```

### Finding UI Components
```typescript
// Search for component usage: "<ComponentName"
// Look in: client/src/pages/ and client/src/components/
```

### Finding Business Logic
```typescript
// Search for service methods: "async function" or "public async"
// Look in: server/*-service.ts files
```

## 📁 Critical Files Map

### Configuration & Schema
- **Database Schema**: `shared/schema.ts`
- **Environment Config**: Look for `process.env` usage
- **TypeScript Config**: `tsconfig.json`

### Core Services
```
server/
├── storage.ts                    # Main data access layer
├── auth.ts                       # Authentication logic
├── patient-chart-service.ts      # Patient chart orchestration
├── electronic-signature-service.ts # E-signature handling
├── pdf-service.ts                # PDF generation
└── medication-delta-service.ts   # Medication processing
```

### AI Integration Points
```
server/
├── gpt-clinical-enhancer.ts      # Clinical note enhancement
├── intelligent-diagnosis-service.ts # Diagnosis suggestions
├── document-analysis-service.ts  # OCR and document parsing
├── unified-*-parser.ts          # Various medical data parsers
└── order-standardization-service.ts # Natural language order parsing
```

## 🚨 Common Pitfalls & Solutions

### 1. Schema Misalignment
**Problem**: Database columns don't match Drizzle schema
**Solution**: Check `replit.md` for recent schema fixes
**Files**: `shared/schema.ts`, various `.sql` files in root

### 2. Authentication Issues
**Problem**: Session/auth errors
**Solution**: Check `server/auth.ts` and session configuration
**Key**: Uses passport-local with session storage

### 3. PDF Generation Errors
**Problem**: PDF generation fails with null/undefined errors
**Solution**: See fix in `replit.md` from January 20, 2025
**Files**: `server/pdf-service.ts`, `server/prescription-pdf-service.ts`

## 🔧 Quick Fixes Reference

### Adding a New API Endpoint
1. Add route in `server/routes.ts`
2. Add storage method in `server/storage.ts` if needed
3. Update TypeScript types in `shared/schema.ts`

### Adding a New UI Component
1. Create component in `client/src/components/`
2. Import and use in relevant page in `client/src/pages/`
3. Add any new API calls to the component

### Modifying Database Schema
1. Update `shared/schema.ts`
2. Run `npm run db:push` (handles migrations)
3. Update related storage methods

## 🎨 UI Component Patterns

### Form Components
- Use `react-hook-form` with `zodResolver`
- Forms located in `client/src/components/`
- Validation schemas from `shared/schema.ts`

### Data Fetching
- Uses `@tanstack/react-query`
- API client: `client/src/lib/queryClient.ts`
- Pattern: `useQuery({ queryKey: ['/api/...'] })`

### Navigation
- Uses `wouter` for routing
- Main routes in `client/src/App.tsx`
- Navigation components in layout folders

## 📊 Data Flow Overview

```
User Action → React Component → TanStack Query → API Route → 
Storage Layer → PostgreSQL → Response → UI Update
```

### For AI-Enhanced Features:
```
User Input → API Route → AI Service (GPT-4) → 
Data Parser → Storage → Response
```

## 🔐 Security Considerations

- **Authentication**: Session-based with Passport.js
- **Tenant Isolation**: `server/tenant-isolation.ts`
- **API Protection**: All routes require authentication
- **File Uploads**: Handled securely with validation

## 🚀 Performance Optimization Points

### Database Queries
- Complex joins avoided (see Drizzle ORM issue)
- Sequential queries preferred over nested joins
- Indexes on commonly queried fields

### Frontend
- Lazy loading for large components
- React Query caching for API responses
- Optimistic updates for better UX

## 📝 Documentation References

### Architecture Docs
- `replit.md` - Main project documentation
- `EMR_WEB_TO_MOBILE_ARCHITECTURE.md` - Mobile strategy
- `LAB_WORKFLOW_ARCHITECTURE.md` - Lab system design

### Recent Fixes
- Check "Recent Changes" section in `replit.md`
- Schema alignment issues documented extensively
- PDF generation fixes documented

## 🤖 AI Agent Best Practices

1. **Always check `replit.md` first** for project context
2. **Use search_filesystem** for specific functionality
3. **Read error messages carefully** - they often point to the exact issue
4. **Check recent changes** in replit.md for similar fixes
5. **Test incrementally** - make small changes and verify

## Emergency Contacts

If stuck, these files usually have the answers:
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - All database operations
- `shared/schema.ts` - Data structures
- `replit.md` - Project documentation and fixes