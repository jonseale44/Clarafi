# Clarafi EMR to Expo Go Migration Strategy

## Overview
This document provides a comprehensive strategy for migrating the Clarafi EMR system to a mobile application using Expo Go on Replit. Since automated migration isn't possible, this guide serves as a manual migration template.

## Current Architecture Analysis

### Backend (Can be Reused)
- **Express.js API**: Already mobile-ready at port 5000
- **Authentication**: Session-based (may need token-based for mobile)
- **Database**: PostgreSQL via Neon (no changes needed)
- **WebSocket Services**: Real-time features ready

### Frontend Components to Migrate
1. **Core Features**:
   - Patient management
   - Encounter creation/editing
   - Voice recording & transcription
   - Order entry (labs, medications, imaging)
   - Clinical documentation (SOAP notes)
   - Chart viewing (medical problems, medications, allergies, etc.)

2. **UI Components**:
   - Authentication flow
   - Patient list/search
   - Chart sections
   - Forms and inputs
   - Navigation patterns

## Migration Strategy

### Phase 1: Project Setup (Week 1)
1. **Initialize Expo Project**
   ```bash
   # In Replit, create new Expo project
   npm create expo-app clarafi-mobile-expo
   cd clarafi-mobile-expo
   npx expo install
   ```

2. **Core Dependencies**
   ```json
   {
     "dependencies": {
       "expo": "~49.0.0",
       "@react-navigation/native": "^6.1.9",
       "@react-navigation/stack": "^6.3.20",
       "@react-navigation/bottom-tabs": "^6.5.11",
       "react-native-screens": "~3.22.0",
       "react-native-safe-area-context": "4.6.3",
       "@tanstack/react-query": "^5.0.0",
       "expo-av": "~13.4.1",
       "expo-secure-store": "~12.3.1",
       "react-hook-form": "^7.48.0",
       "@hookform/resolvers": "^3.3.0",
       "zod": "^3.22.0"
     }
   }
   ```

3. **File Structure**
   ```
   clarafi-mobile-expo/
   ├── src/
   │   ├── components/
   │   ├── screens/
   │   ├── navigation/
   │   ├── services/
   │   ├── hooks/
   │   ├── types/
   │   └── utils/
   ├── assets/
   └── app.json
   ```

### Phase 2: Core Infrastructure (Week 1-2)

#### 1. Copy Shared Types
```typescript
// src/types/index.ts
// Copy from clarafi-mobile/src/types/index.ts
// These are already mobile-optimized
```

#### 2. API Service Setup
```typescript
// src/services/api.ts
// Adapt from clarafi-mobile/src/services/api.ts
// Key changes:
// - Update API_BASE_URL for Replit environment
// - Consider token-based auth for mobile
// - Add offline queue for requests
```

#### 3. Authentication
```typescript
// src/contexts/AuthContext.tsx
// Mobile-specific auth considerations:
// - Use expo-secure-store for token storage
// - Implement biometric authentication
// - Handle session persistence
```

#### 4. Navigation Structure
```typescript
// src/navigation/AppNavigator.tsx
// Copy base structure from clarafi-mobile/src/navigation/AppNavigator.tsx
// Add deep linking support for Expo Go
```

### Phase 3: Screen Migration (Week 2-3)

#### Priority Order:
1. **Login Screen** (src/screens/LoginScreen.tsx)
   - Adapt from clarafi-mobile-web/src/screens/LoginScreen.tsx
   - Add touch ID/face ID support
   - Handle keyboard avoiding views

2. **Patient List** (src/screens/PatientListScreen.tsx)
   - Implement pull-to-refresh
   - Add search functionality
   - Optimize for large lists with FlashList

3. **Voice Recording** (src/screens/VoiceRecordingScreen.tsx)
   - Use expo-av for recording
   - WebSocket connection for transcription
   - Visual feedback during recording

4. **Patient Chart** (src/screens/PatientChartScreen.tsx)
   - Tabbed interface for chart sections
   - Collapsible sections for mobile UX
   - Swipe gestures for navigation

5. **Order Entry** (src/screens/OrderEntryScreen.tsx)
   - Natural language input
   - Voice-to-order capability
   - Quick templates

### Phase 4: Component Migration (Week 3-4)

#### Key Components to Migrate:
1. **Form Components**
   - Replace Radix UI with React Native equivalents
   - Create custom select/dropdown components
   - Date/time pickers using expo packages

2. **Chart Sections**
   - Medical Problems list
   - Medications with interactions
   - Allergies with severity indicators
   - Vitals with graphs
   - Lab results matrix

3. **UI Components**
   - Replace Tailwind with React Native StyleSheet
   - Create theme system for consistency
   - Build reusable card/list components

### Phase 5: Advanced Features (Week 4-5)

1. **Offline Support**
   - Implement data caching strategy
   - Queue actions for sync
   - Conflict resolution

2. **Push Notifications**
   - Critical lab results
   - Appointment reminders
   - Order status updates

3. **Native Features**
   - Camera for document capture
   - Barcode scanning for medications
   - Location services for facility check-in

## Migration Checklist

### Backend Preparation
- [ ] Add CORS configuration for Expo Go development
- [ ] Implement token-based authentication endpoint
- [ ] Add mobile-specific API versioning
- [ ] Optimize API responses for mobile bandwidth
- [ ] Set up push notification service

### Data Migration Tasks
- [ ] Copy type definitions from shared/schema.ts
- [ ] Create mobile-optimized API interfaces
- [ ] Implement data synchronization strategy
- [ ] Set up offline data storage schema
- [ ] Configure real-time updates via WebSocket

### UI/UX Migration
- [ ] Convert Tailwind styles to React Native StyleSheet
- [ ] Replace Radix UI components with React Native equivalents
- [ ] Adapt responsive layouts for mobile screens
- [ ] Implement mobile navigation patterns
- [ ] Add gesture handlers and animations

### Authentication & Security
- [ ] Implement secure token storage
- [ ] Add biometric authentication
- [ ] Configure session management
- [ ] Set up multi-tenant isolation
- [ ] Implement role-based access control

### Testing & Deployment
- [ ] Set up Expo Go development builds
- [ ] Configure environment variables
- [ ] Test on multiple device sizes
- [ ] Implement error tracking
- [ ] Prepare for app store submission

## Replit-Specific Considerations

### Expo Go Direct Connection
1. **Development URL**: Use Replit's exposed URL for API connections
2. **WebSocket Proxy**: Configure for real-time features
3. **Asset Handling**: Use Expo's asset system for images/fonts
4. **Environment Variables**: Use Expo's EXPO_PUBLIC_ prefix

### File References to Copy
From existing projects:
- `clarafi-mobile/src/types/index.ts` → Complete type system
- `clarafi-mobile/src/services/api.ts` → API client structure
- `clarafi-mobile/src/navigation/AppNavigator.tsx` → Navigation setup
- `clarafi-mobile-web/src/screens/*` → Screen logic (needs React Native conversion)

### API Endpoints to Prioritize
1. Authentication: `/api/login`, `/api/user`
2. Patient Data: `/api/patients`, `/api/patients/:id`
3. Encounters: `/api/encounters`, `/api/patients/:id/encounters`
4. Voice/Orders: `/api/voice/transcribe`, `/api/parse-orders`
5. Chart Updates: `/api/*/process-unified` endpoints

## Conversion Patterns

### React Web to React Native
```javascript
// Web (React)
<div className="flex flex-col p-4">
  <h1 className="text-2xl font-bold">Title</h1>
  <button onClick={handler}>Click</button>
</div>

// Mobile (React Native)
<View style={styles.container}>
  <Text style={styles.title}>Title</Text>
  <TouchableOpacity onPress={handler}>
    <Text>Click</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### Form Handling
```javascript
// Use react-hook-form with React Native inputs
import { Controller } from 'react-hook-form';
import { TextInput } from 'react-native';

<Controller
  control={control}
  name="fieldName"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput
      onBlur={onBlur}
      onChangeText={onChange}
      value={value}
    />
  )}
/>
```

## Recommended Timeline

**Week 1**: Project setup, core infrastructure
**Week 2**: Authentication, navigation, basic screens
**Week 3**: Patient management, chart viewing
**Week 4**: Voice recording, order entry
**Week 5**: Testing, optimization, deployment prep

## Next Steps

1. Create new Expo project in Replit
2. Copy this migration strategy to project
3. Start with Phase 1 setup
4. Use existing `clarafi-mobile` as reference
5. Test each component as you migrate

## Support Resources

- Expo Documentation: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- React Native: https://reactnative.dev
- Existing mobile code in `/clarafi-mobile` and `/clarafi-mobile-web`