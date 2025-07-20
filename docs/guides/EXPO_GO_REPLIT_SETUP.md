# Expo Go on Replit: Setup & Integration Guide

## Overview
This guide specifically addresses setting up Expo Go with direct connection on Replit for your Clarafi EMR mobile app.

## Replit + Expo Go Architecture

### How It Works
1. **Replit Workspace**: Hosts your Expo development server
2. **Expo Go App**: Connects directly to Replit's exposed URL
3. **Backend API**: Your existing Express server on port 5000
4. **Direct Connection**: No need for local development setup

## Step-by-Step Setup

### 1. Create New Replit for Mobile App
```bash
# Option A: Create separate Replit for mobile
# - Cleaner separation
# - Independent deployment
# - Easier to manage

# Option B: Add to existing Replit
# - Shared backend code
# - Single deployment
# - More complex but unified
```

### 2. Initialize Expo Project
```bash
# In Replit shell
npx create-expo-app clarafi-mobile-expo --template blank-typescript
cd clarafi-mobile-expo

# Install core dependencies
npx expo install expo-dev-client
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install @tanstack/react-query
npx expo install expo-secure-store expo-av
```

### 3. Configure for Replit Environment

#### app.json Configuration
```json
{
  "expo": {
    "name": "Clarafi Mobile",
    "slug": "clarafi-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#003366"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.clarafi.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#003366"
      },
      "package": "com.clarafi.mobile"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

#### Environment Variables (.env)
```bash
# Create .env file in mobile project
EXPO_PUBLIC_API_URL=https://your-replit-url.repl.co:5000
EXPO_PUBLIC_WS_URL=wss://your-replit-url.repl.co:5000
```

### 4. Replit-Specific Scripts

#### package.json Scripts
```json
{
  "scripts": {
    "start": "expo start --tunnel",
    "start:clear": "expo start -c --tunnel",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

#### Start Script (start.sh)
```bash
#!/bin/bash
# Replit start script for Expo

# Clear metro cache
rm -rf .expo
rm -rf node_modules/.cache/metro

# Start Expo with tunnel (required for Replit)
npx expo start --tunnel --non-interactive
```

### 5. Backend API Modifications

#### CORS Configuration
```javascript
// In server/index.ts or server/routes.ts
import cors from 'cors';

// Allow Expo Go connections
app.use(cors({
  origin: [
    'http://localhost:*',
    'https://*.repl.co',
    'exp://*',
    'https://*.exp.direct'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Token Authentication Support
```javascript
// Add to server/auth.ts
export const tokenAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    // Fall back to session auth for web
    return sessionAuth(req, res, next);
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await storage.getUserById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add token generation to login
app.post('/api/login', async (req, res) => {
  // ... existing login logic
  
  if (req.headers['x-client-type'] === 'mobile') {
    const token = jwt.sign(
      { userId: user.id, healthSystemId: user.healthSystemId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      ...userData,
      token
    });
  } else {
    // Existing session-based response
  }
});
```

### 6. Mobile API Service Configuration

```typescript
// src/services/api.ts
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

class ApiService {
  private baseURL: string;
  private wsURL: string;
  private token: string | null = null;

  constructor() {
    // Use Replit URL from environment
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://your-app.repl.co:5000';
    this.wsURL = process.env.EXPO_PUBLIC_WS_URL || 'wss://your-app.repl.co:5000';
  }

  async init() {
    try {
      this.token = await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  async apiRequest(method: string, endpoint: string, data?: any) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Handle token expiration
          await this.logout();
          throw new Error('Authentication expired');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // WebSocket connection for voice transcription
  connectWebSocket() {
    return new WebSocket(`${this.wsURL}/api/voice/stream?token=${this.token}`);
  }
}

export const api = new ApiService();
```

### 7. Handling Replit-Specific Challenges

#### Network Configuration
```javascript
// Handle Replit's dynamic URLs
const getReplitUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    // Web environment
    return window.location.origin;
  }
  // Mobile environment - use environment variable
  return process.env.EXPO_PUBLIC_API_URL;
};
```

#### File Uploads from Mobile
```javascript
// Adapt file uploads for mobile
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const uploadAttachment = async (patientId: number, uri: string) => {
  const formData = new FormData();
  
  // Convert URI to blob for upload
  const response = await fetch(uri);
  const blob = await response.blob();
  
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'attachment.jpg',
  } as any);

  return api.apiRequest('POST', `/api/patients/${patientId}/attachments`, formData);
};
```

### 8. Development Workflow

#### Starting Development
1. **Start Backend** (if separate Replit):
   ```bash
   npm run dev  # Starts on port 5000
   ```

2. **Start Expo** (in mobile Replit):
   ```bash
   npm start
   # or
   ./start.sh
   ```

3. **Connect via Expo Go**:
   - Scan QR code with Expo Go app
   - Or enter URL manually in Expo Go

#### Hot Reload Configuration
```javascript
// Enable fast refresh
if (__DEV__) {
  const DevMenu = require('react-native').DevMenu;
  DevMenu.reload();
}
```

### 9. Data Synchronization Strategy

```typescript
// src/services/sync.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SyncService {
  private syncQueue: any[] = [];
  
  async init() {
    // Load pending sync items
    const pending = await AsyncStorage.getItem('syncQueue');
    if (pending) {
      this.syncQueue = JSON.parse(pending);
    }
    
    // Monitor network status
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processSyncQueue();
      }
    });
  }
  
  async addToQueue(action: any) {
    this.syncQueue.push({
      ...action,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    
    await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }
  
  async processSyncQueue() {
    while (this.syncQueue.length > 0) {
      const action = this.syncQueue[0];
      
      try {
        await this.executeAction(action);
        this.syncQueue.shift();
        await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
      } catch (error) {
        console.error('Sync failed:', error);
        break;
      }
    }
  }
}
```

### 10. Shared Code Strategy

#### Option 1: Copy Shared Types
```bash
# Create script to copy types
#!/bin/bash
cp ../shared/schema.ts ./src/types/schema.ts
cp ../server/types/*.ts ./src/types/
```

#### Option 2: Monorepo Structure
```json
// package.json in root
{
  "workspaces": [
    "client",
    "server",
    "mobile",
    "shared"
  ]
}
```

#### Option 3: Git Submodules
```bash
# Add shared code as submodule
git submodule add ../clarafi-shared shared
```

## Testing on Replit

### 1. Expo Go Direct URL
```
exp://your-replit-username.your-app-name.repl.co
```

### 2. Development Menu Access
- Shake device for dev menu
- Or press `m` in terminal

### 3. Debugging
```javascript
// Enable remote debugging
if (__DEV__) {
  import('react-native-debugger').then(() => {
    console.log('Debugger connected');
  });
}
```

## Common Issues & Solutions

### Issue 1: Connection Refused
```javascript
// Solution: Use tunnel mode
expo start --tunnel
```

### Issue 2: CORS Errors
```javascript
// Solution: Whitelist Expo origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow all Expo origins
    if (!origin || origin.includes('exp://') || origin.includes('.exp.direct')) {
      callback(null, true);
    } else {
      callback(null, true); // Or false for production
    }
  }
}));
```

### Issue 3: WebSocket Connection
```javascript
// Solution: Use Replit's WebSocket proxy
const ws = new WebSocket(
  `${wsURL}/api/voice/stream`.replace('https://', 'wss://')
);
```

## Production Deployment

### 1. Build for App Stores
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### 2. Environment Configuration
```javascript
// Use different configs for dev/prod
const API_URL = __DEV__ 
  ? 'https://dev.repl.co:5000'
  : 'https://api.clarafi.com';
```

### 3. Update Backend
- Add production CORS origins
- Implement rate limiting
- Add mobile-specific monitoring

## Next Steps

1. **Start with Basic Setup**: Create Expo project on Replit
2. **Test Connection**: Ensure mobile can reach backend API
3. **Implement Auth**: Get login working with token auth
4. **Add First Screen**: Implement patient list
5. **Test on Devices**: Use Expo Go on real devices
6. **Iterate**: Add features incrementally

## Resources

- [Expo on Replit Guide](https://docs.replit.com/tutorials/react-native-expo)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)