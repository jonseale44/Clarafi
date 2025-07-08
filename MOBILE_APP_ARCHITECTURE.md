# Clarafi Mobile App Architecture

## Recommended Approach: Shared Code Strategy

### 1. Create Shared Package Structure
```
workspace/
├── shared/                    # Already exists - enhance it
│   ├── schema.ts             # ✅ Use as-is
│   ├── types/                # ✅ Share all types
│   ├── api/                  # 🆕 Move API logic here
│   │   ├── client.ts         # API client
│   │   ├── patients.ts       # Patient endpoints
│   │   ├── encounters.ts     # Encounter endpoints
│   │   └── auth.ts          # Auth endpoints
│   ├── utils/                # 🆕 Shared utilities
│   │   ├── dateFormat.ts    
│   │   ├── validation.ts    
│   │   └── constants.ts     
│   └── services/             # 🆕 Business logic
│       ├── patientService.ts
│       └── chartService.ts
├── client/                   # Your web app
├── server/                   # Your backend
└── clarafi-mobile/          # Your mobile app
```

### 2. What to Convert First

**Phase 1: Core Infrastructure** (Do this first)
- Authentication flow (with token storage)
- API client setup
- Basic navigation structure
- Patient list screen

**Phase 2: Essential Features**
- Patient chart viewing
- Basic SOAP note creation
- Voice transcription
- Document upload

**Phase 3: Advanced Features**
- Full order management
- Lab results
- Medication management
- Offline support

### 3. Code Conversion Examples

#### Web React Component:
```tsx
// client/src/components/PatientCard.tsx
import { Card } from "@/components/ui/card"
import { Patient } from "@shared/schema"

export function PatientCard({ patient }: { patient: Patient }) {
  return (
    <Card className="p-4 hover:shadow-lg">
      <h3 className="font-bold">{patient.firstName} {patient.lastName}</h3>
      <p className="text-gray-600">MRN: {patient.mrn}</p>
    </Card>
  )
}
```

#### Mobile React Native Component:
```tsx
// clarafi-mobile/src/components/PatientCard.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Patient } from "@shared/schema"  // ✅ Same type!

export function PatientCard({ patient, onPress }: { patient: Patient, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{patient.firstName} {patient.lastName}</Text>
      <Text style={styles.mrn}>MRN: {patient.mrn}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mrn: {
    color: '#666',
    marginTop: 4,
  },
})
```

### 4. Shared API Client Example

```ts
// shared/api/client.ts
export class ApiClient {
  constructor(private baseURL: string, private getToken: () => Promise<string | null>) {}

  async request(endpoint: string, options?: RequestInit) {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }
}

// Web usage:
const apiClient = new ApiClient('/', () => Promise.resolve(null)); // Uses cookies

// Mobile usage:
import * as SecureStore from 'expo-secure-store';
const apiClient = new ApiClient('https://your-server.com', 
  () => SecureStore.getItemAsync('authToken')
);
```

## Recommendation: Hybrid Approach

1. **Start with barebones mobile UI** - Don't try to port the web UI
2. **Immediately connect to shared business logic** - Reuse types, API calls, utilities
3. **Build mobile-first interfaces** - Design for touch, not mouse
4. **Share what makes sense** - 70% logic reuse, 100% UI rebuild

This approach gives you:
- Fast development (reusing core logic)
- Native mobile experience (proper UI)
- Maintainable codebase (shared business logic)
- Type safety across platforms