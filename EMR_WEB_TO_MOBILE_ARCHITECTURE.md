# EMR Web to Mobile Architecture Guide

## Overview
This guide maps the entire EMR web application structure and provides a roadmap for migrating to React Native/Expo.

## Core Architecture Components

### 1. Frontend Structure (Web → Mobile Migration)

#### Entry Points
- **Web**: `client/src/main.tsx` → **Mobile**: `clarafi-mobile/App.tsx`
- **Web**: `client/src/App.tsx` → **Mobile**: `clarafi-mobile/src/navigation/AppNavigator.tsx`

#### Routing/Navigation
- **Web**: Uses `wouter` for routing
- **Mobile**: Uses `react-navigation` (Stack + Tab navigators)

#### State Management
- **Web**: TanStack Query + local state
- **Mobile**: TanStack Query + React Context (AuthContext)

### 2. Key Feature Modules

#### Authentication System
**Web Files**:
- `client/src/pages/auth-page.tsx` - Login/Registration/Location selection
- `client/src/lib/auth.ts` - Auth utilities
- `client/src/components/auth/` - Auth components

**Mobile Equivalent Needed**:
- Login screen ✓ (exists)
- Registration screen (needs implementation)
- Location selection (needs implementation)
- Remember me functionality

#### Patient Management
**Web Files**:
- `client/src/pages/patients-page.tsx` - Patient list
- `client/src/pages/patient-detail.tsx` - Patient chart
- `client/src/components/patients/` - Patient components

**Mobile Equivalent**:
- PatientListScreen ✓ (basic version exists)
- PatientChartScreen ✓ (basic version exists)
- Need: Advanced search, filters, patient creation

#### Clinical Documentation
**Web Files**:
- `client/src/components/encounters/` - Encounter management
- `client/src/components/notes/` - SOAP notes, templates
- `client/src/components/voice-notes/` - Voice recording

**Mobile Equivalent**:
- VoiceRecordingScreen ✓ (basic)
- Need: Full SOAP editor, template selection, AI enhancements

#### Order Management
**Web Files**:
- `client/src/components/orders/` - Orders interface
- `client/src/components/medications/` - Medication orders
- `client/src/components/labs/` - Lab orders

**Mobile Equivalent**:
- OrderEntryScreen ✓ (basic)
- Need: Full order types, validation, pharmacy integration

### 3. Shared Components to Migrate

#### UI Components (Web → Mobile)
```
client/src/components/ui/ → clarafi-mobile/src/components/ui/
- Button → TouchableOpacity/Pressable
- Input → TextInput with styling
- Card → View with shadow/elevation
- Dialog → Modal
- Select → Picker or custom modal
- Toast → React Native Toast
```

#### Chart Sections
```
client/src/components/chart-sections/
- AllergiesSection
- MedicationsSection
- VitalsSection
- LabResultsSection
- ImagingSection
- ProblemsSection
```

### 4. API Integration Layer

**Web**: `client/src/lib/api-client.ts`
**Mobile**: `clarafi-mobile/src/services/api.ts`

Key differences:
- Web uses relative URLs (`/api/*`)
- Mobile needs absolute URLs with proper environment detection
- Mobile needs token storage (SecureStore vs cookies)

### 5. Feature Priority Matrix

| Feature | Web Status | Mobile Status | Priority | Complexity |
|---------|-----------|---------------|----------|------------|
| Login/Auth | ✓ Complete | ✓ Basic | High | Low |
| Patient List | ✓ Complete | ✓ Basic | High | Medium |
| Patient Chart | ✓ Complete | ✓ Basic | High | High |
| Voice Recording | ✓ Complete | ✓ Basic | High | Medium |
| SOAP Notes | ✓ Complete | ❌ Missing | High | High |
| Order Entry | ✓ Complete | ✓ Basic | High | High |
| Medications | ✓ Complete | ❌ Missing | High | High |
| Lab Results | ✓ Complete | ❌ Missing | Medium | Medium |
| Allergies | ✓ Complete | ❌ Missing | High | Low |
| Vitals | ✓ Complete | ❌ Missing | High | Low |
| Imaging | ✓ Complete | ❌ Missing | Medium | Medium |
| Documents | ✓ Complete | ❌ Missing | Low | High |
| Appointments | ✓ Complete | ❌ Missing | Medium | Medium |

## Migration Workflow

### Phase 1: Foundation (Week 1-2)
1. Set up proper navigation structure
2. Implement complete authentication flow
3. Create reusable UI component library
4. Set up API service with proper error handling

### Phase 2: Core Features (Week 3-4)
1. Complete patient management
2. Implement chart sections (allergies, medications, vitals)
3. Add SOAP note creation/editing
4. Enhance voice recording with transcription

### Phase 3: Advanced Features (Week 5-6)
1. Order management system
2. Lab results display
3. Imaging viewer
4. Document management

### Phase 4: Polish (Week 7-8)
1. Offline support
2. Push notifications
3. Performance optimization
4. Testing and bug fixes

## File Mapping Strategy

### Step 1: Create Mobile Component Structure
```
clarafi-mobile/
├── src/
│   ├── components/
│   │   ├── ui/           # Basic UI components
│   │   ├── chart/        # Chart section components
│   │   ├── orders/       # Order components
│   │   └── common/       # Shared components
│   ├── screens/          # Main screens
│   ├── services/         # API and utilities
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript types
│   └── utils/            # Helper functions
```

### Step 2: Component Migration Pattern
For each web component:
1. Identify React Native equivalents for web elements
2. Replace CSS with StyleSheet
3. Convert mouse events to touch events
4. Adapt responsive design for mobile
5. Implement platform-specific features

### Step 3: Code Refactoring Guidelines

#### Web to Mobile Conversions:
```typescript
// Web (React)
<div className="flex flex-col p-4">
  <button onClick={handleClick}>Click me</button>
</div>

// Mobile (React Native)
<View style={styles.container}>
  <TouchableOpacity onPress={handlePress}>
    <Text>Click me</Text>
  </TouchableOpacity>
</View>
```

#### Style Conversions:
```typescript
// Web (Tailwind)
className="bg-blue-500 p-4 rounded-lg shadow-md"

// Mobile (StyleSheet)
style={{
  backgroundColor: '#3B82F6',
  padding: 16,
  borderRadius: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  elevation: 3,
}}
```

## GitHub Integration Strategy

### Repository Structure:
```
clarafi-emr/
├── web/              # Current web app
├── mobile/           # Expo mobile app
├── shared/           # Shared types and utilities
└── docs/             # Documentation
```

### Branch Strategy:
- `main` - Production code
- `mobile-dev` - Mobile development
- `feature/*` - Individual features
- `mobile-parity/*` - Feature parity branches

### Migration Process:
1. Create feature branch for each component
2. Refactor web code for mobile
3. Test on iOS and Android
4. Create PR with before/after comparison
5. Merge to mobile-dev
6. Periodic merges to main

## Next Steps

1. **Immediate Actions**:
   - Set up GitHub repository structure
   - Create base mobile UI component library
   - Implement proper API service

2. **This Week**:
   - Complete authentication flow
   - Enhance patient list/search
   - Add patient creation

3. **Next Week**:
   - Implement chart sections
   - Add SOAP note functionality
   - Enhance order entry

## Component Dependency Map

### Critical Path Components:
1. API Service (all features depend on this)
2. Authentication (gates all other features)
3. Navigation (app structure)
4. Patient Context (provides data to all clinical features)
5. Chart Sections (modular, can be built independently)

### Parallel Development Opportunities:
- UI Components (can be built independently)
- Chart Sections (each can be developed separately)
- Utility Functions (can be migrated as needed)