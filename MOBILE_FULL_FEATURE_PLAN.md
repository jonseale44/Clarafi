# Clarafi Mobile - Full Feature Implementation Plan

## Core Requirements
- ✅ Complete feature parity with web app
- ✅ Voice recording with real-time transcription (CRITICAL)
- ✅ AI suggestions and note generation
- ✅ Natural language order entry
- ✅ Full chart management capabilities

## Phase 1: Foundation & Voice (Week 1)

### 1.1 Core Setup
```bash
# Required packages for full functionality
expo install expo-av                    # Audio recording
expo install expo-file-system           # File handling
expo install expo-document-picker       # Document upload
expo install expo-camera               # Document scanning
expo install @react-native-async-storage/async-storage  # Token storage
expo install react-native-webview      # For complex displays
```

### 1.2 Voice Recording Implementation
```typescript
// Mobile WebSocket + Audio Recording
import { Audio } from 'expo-av';

class VoiceTranscriptionService {
  private ws: WebSocket;
  private recording: Audio.Recording;
  
  async startRecording() {
    // 1. Connect to your existing WebSocket proxy
    this.ws = new WebSocket('wss://your-server.com/api/realtime/connect');
    
    // 2. Start audio recording
    const { granted } = await Audio.requestPermissionsAsync();
    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
    });
    
    // 3. Stream audio chunks to WebSocket
    this.recording.setOnRecordingStatusUpdate(this.handleAudioData);
    await this.recording.startAsync();
  }
  
  private handleAudioData = async (status) => {
    if (status.isRecording && this.ws.readyState === WebSocket.OPEN) {
      // Send audio chunks to your WebSocket proxy
      const uri = this.recording.getURI();
      const chunk = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: chunk
      }));
    }
  };
}
```

## Phase 2: Core EMR Features (Week 2)

### 2.1 Navigation Structure
```typescript
// Bottom tabs matching web functionality
<Tab.Navigator>
  <Tab.Screen name="Dashboard" component={DashboardScreen} />
  <Tab.Screen name="Patients" component={PatientListScreen} />
  <Tab.Screen name="Record" component={VoiceRecordingScreen} />
  <Tab.Screen name="Orders" component={OrdersScreen} />
  <Tab.Screen name="Settings" component={SettingsScreen} />
</Tab.Navigator>
```

### 2.2 API Integration
```typescript
// Reuse ALL existing endpoints
class MobileApiClient {
  // Authentication with token storage
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    await AsyncStorage.setItem('authToken', data.token);
    return data;
  }
  
  // Reuse all existing endpoints
  async getPatients() {
    return this.authenticatedRequest('/api/patients');
  }
  
  async startEncounter(patientId: number) {
    return this.authenticatedRequest('/api/encounters', {
      method: 'POST',
      body: JSON.stringify({ patientId })
    });
  }
  
  // AI endpoints work exactly the same
  async generateSOAPNote(transcription: string) {
    return this.authenticatedRequest('/api/generate-soap', {
      method: 'POST',
      body: JSON.stringify({ transcription })
    });
  }
}
```

## Phase 3: AI Features (Week 3)

### 3.1 Natural Language Orders
```typescript
// Exact same GPT-powered order parsing
<TextInput
  placeholder="Type orders naturally: 'CBC, BMP, chest xray for cough'"
  onChangeText={text => {
    // Debounced API call to parse orders
    parseOrdersWithAI(text);
  }}
/>
```

### 3.2 Chart Updates
```typescript
// Parallel processing like web
async function updateChartFromNote(soapNote: string) {
  const updates = await Promise.all([
    apiClient.post('/api/medical-problems/process-unified', { soapNote }),
    apiClient.post('/api/medications/process-unified', { soapNote }),
    apiClient.post('/api/allergies/process-unified', { soapNote }),
    apiClient.post('/api/social-history/process-unified', { soapNote }),
  ]);
  
  // Refresh all chart sections
  queryClient.invalidateQueries(['chart']);
}
```

## Technical Architecture

### Shared Code Structure
```
workspace/
├── shared/
│   ├── api/
│   │   ├── endpoints.ts      # All API endpoints (shared)
│   │   ├── types.ts          # Request/Response types
│   │   └── parsers.ts        # Data transformers
│   ├── services/
│   │   ├── voice.ts          # Voice/transcription logic
│   │   ├── ai.ts             # AI integration logic
│   │   └── orders.ts         # Order parsing logic
│   └── schema.ts             # Database schemas
│
├── clarafi-mobile/
│   ├── src/
│   │   ├── screens/          # Mobile-specific UI
│   │   ├── components/       # React Native components
│   │   ├── hooks/            # Shared hooks adapted for mobile
│   │   └── services/         # Mobile-specific services
│   │       └── audio.ts      # Expo Audio implementation
```

### Key Mobile Adaptations

1. **WebSocket Proxy Connection**
   - Mobile connects to same `/api/realtime/connect` endpoint
   - Server handles OpenAI connection with API key

2. **Audio Streaming**
   - Use Expo Audio API for recording
   - Stream chunks to WebSocket proxy
   - Receive transcription updates

3. **State Management**
   - Same React Query setup
   - AsyncStorage for persistence
   - Offline queue for reliability

4. **Document Processing**
   - Camera for document capture
   - Upload to same endpoints
   - View OCR results

## Implementation Priority

1. **Week 1**: Voice recording + transcription + basic patient list
2. **Week 2**: SOAP generation + order parsing + chart viewing
3. **Week 3**: Full chart editing + document upload + offline support

## Code Reuse Summary

- **100% Backend Reuse**: All endpoints work as-is
- **90% Business Logic Reuse**: Services, parsers, validators
- **80% State Management Reuse**: React Query, data flows
- **0% UI Reuse**: Build native mobile UI from scratch

This gives you a fully-featured mobile EMR with all AI capabilities!