# Component Migration Template: React Web to React Native

## Overview
This template provides specific examples of how to migrate your existing Clarafi EMR components from React web to React Native for Expo Go.

## Core Component Conversions

### 1. Patient List Component

#### Current Web Version (React + Tailwind)
```jsx
// From: client/src/components/dashboard/patient-table.tsx
<div className="flex flex-col space-y-4">
  <div className="flex justify-between items-center">
    <Input 
      placeholder="Search patients..." 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="max-w-sm"
    />
    <Button onClick={onAddPatient}>
      <UserPlus className="h-4 w-4 mr-2" />
      Add Patient
    </Button>
  </div>
  <Table>
    {patients.map(patient => (
      <TableRow key={patient.id} onClick={() => onSelectPatient(patient.id)}>
        <TableCell>{patient.firstName} {patient.lastName}</TableCell>
        <TableCell>{patient.dateOfBirth}</TableCell>
      </TableRow>
    ))}
  </Table>
</div>
```

#### Mobile Version (React Native)
```jsx
// To: src/screens/PatientListScreen.tsx
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

<View style={styles.container}>
  <View style={styles.header}>
    <TextInput 
      style={styles.searchInput}
      placeholder="Search patients..."
      value={searchTerm}
      onChangeText={setSearchTerm}
      placeholderTextColor="#999"
    />
    <TouchableOpacity style={styles.addButton} onPress={onAddPatient}>
      <Ionicons name="person-add" size={20} color="white" />
      <Text style={styles.buttonText}>Add</Text>
    </TouchableOpacity>
  </View>
  <FlatList
    data={patients}
    keyExtractor={(item) => item.id.toString()}
    renderItem={({ item }) => (
      <TouchableOpacity 
        style={styles.patientRow} 
        onPress={() => onSelectPatient(item.id)}
      >
        <Text style={styles.patientName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.patientDob}>{item.dateOfBirth}</Text>
      </TouchableOpacity>
    )}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
  />
</View>

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#003366',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', marginLeft: 8, fontWeight: '600' },
  patientRow: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientName: { fontSize: 16, fontWeight: '600', color: '#333' },
  patientDob: { fontSize: 14, color: '#666', marginTop: 4 },
});
```

### 2. Form Components

#### Current Web Version (React Hook Form + Radix)
```jsx
// From: client/src/pages/PatientCreation.tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="firstName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>First Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Select value={sex} onValueChange={setSex}>
      <SelectTrigger>
        <SelectValue placeholder="Select sex" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="male">Male</SelectItem>
        <SelectItem value="female">Female</SelectItem>
      </SelectContent>
    </Select>
    <Button type="submit">Create Patient</Button>
  </form>
</Form>
```

#### Mobile Version (React Hook Form + React Native)
```jsx
// To: src/components/PatientForm.tsx
import { Controller, useForm } from 'react-hook-form';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const form = useForm({
  resolver: zodResolver(patientSchema),
});

<View style={styles.form}>
  <Controller
    control={form.control}
    name="firstName"
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          placeholder="Enter first name"
        />
        {error && <Text style={styles.errorText}>{error.message}</Text>}
      </View>
    )}
  />
  
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>Sex</Text>
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={sex}
        onValueChange={setSex}
        style={styles.picker}
      >
        <Picker.Item label="Select sex" value="" />
        <Picker.Item label="Male" value="male" />
        <Picker.Item label="Female" value="female" />
      </Picker>
    </View>
  </View>
  
  <TouchableOpacity 
    style={styles.submitButton} 
    onPress={form.handleSubmit(onSubmit)}
  >
    <Text style={styles.submitButtonText}>Create Patient</Text>
  </TouchableOpacity>
</View>
```

### 3. Chart Section Component

#### Current Web Version
```jsx
// From: client/src/components/patient/medical-problems-section.tsx
<Card>
  <CardHeader>
    <CardTitle>Medical Problems</CardTitle>
  </CardHeader>
  <CardContent>
    {problems.map(problem => (
      <div key={problem.id} className="border-b py-2">
        <div className="flex justify-between">
          <span className="font-medium">{problem.problemName}</span>
          <Badge variant={problem.status === 'active' ? 'default' : 'secondary'}>
            {problem.status}
          </Badge>
        </div>
        <span className="text-sm text-gray-500">{problem.icdCode}</span>
      </div>
    ))}
  </CardContent>
</Card>
```

#### Mobile Version
```jsx
// To: src/components/chart/MedicalProblemsSection.tsx
import { View, Text, ScrollView } from 'react-native';

<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Medical Problems</Text>
  </View>
  <ScrollView style={styles.cardContent}>
    {problems.map(problem => (
      <View key={problem.id} style={styles.problemItem}>
        <View style={styles.problemRow}>
          <Text style={styles.problemName}>{problem.problemName}</Text>
          <View style={[
            styles.badge,
            problem.status === 'active' ? styles.badgeActive : styles.badgeInactive
          ]}>
            <Text style={styles.badgeText}>{problem.status}</Text>
          </View>
        </View>
        <Text style={styles.icdCode}>{problem.icdCode}</Text>
      </View>
    ))}
  </ScrollView>
</View>
```

### 4. Voice Recording Component

#### Current Web Version
```jsx
// From: clarafi-mobile-web/src/screens/VoiceRecordingScreen.tsx
<div className="voice-recorder">
  <button 
    onClick={isRecording ? stopRecording : startRecording}
    className={`record-button ${isRecording ? 'recording' : ''}`}
  >
    {isRecording ? '⏹️' : '🎙️'}
  </button>
  <div className="transcription-display">
    {transcription}
  </div>
</div>
```

#### Mobile Version with Expo AV
```jsx
// To: src/screens/VoiceRecordingScreen.tsx
import { Audio } from 'expo-av';
import { View, TouchableOpacity, Text, Animated } from 'react-native';

const [recording, setRecording] = useState(null);
const pulseAnim = useRef(new Animated.Value(1)).current;

const startRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
    
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  } catch (err) {
    console.error('Failed to start recording', err);
  }
};

<View style={styles.container}>
  <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
    <Animated.View 
      style={[
        styles.recordButton,
        recording && styles.recordingButton,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <Text style={styles.recordIcon}>
        {recording ? '⏹' : '🎙'}
      </Text>
    </Animated.View>
  </TouchableOpacity>
  <ScrollView style={styles.transcriptionContainer}>
    <Text style={styles.transcriptionText}>{transcription}</Text>
  </ScrollView>
</View>
```

### 5. API Service Adaptation

#### Current Web Version
```javascript
// From: client/src/lib/queryClient.ts
export const apiRequest = async (method, url, data) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('API request failed');
  return response.json();
};
```

#### Mobile Version with Token Auth
```javascript
// To: src/services/api.ts
import * as SecureStore from 'expo-secure-store';

class ApiService {
  private baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
  private token: string | null = null;

  async init() {
    // Load token from secure storage
    this.token = await SecureStore.getItemAsync('authToken');
  }

  async apiRequest(method: string, endpoint: string, data?: any) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      await SecureStore.deleteItemAsync('authToken');
      this.token = null;
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async login(username: string, password: string) {
    const data = await this.apiRequest('POST', '/api/login', { username, password });
    if (data.token) {
      this.token = data.token;
      await SecureStore.setItemAsync('authToken', data.token);
    }
    return data;
  }
}

export const api = new ApiService();
```

## Style System Migration

### Web (Tailwind Classes)
```css
/* Tailwind utility classes */
.flex .flex-col .space-y-4 .bg-white .rounded-lg .shadow-md .p-4
.text-gray-700 .font-semibold .hover:bg-gray-100
```

### Mobile (StyleSheet)
```javascript
// Create a theme system
export const theme = {
  colors: {
    primary: '#003366',
    secondary: '#FFD700',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    error: '#f44336',
    success: '#4caf50',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16 },
    caption: { fontSize: 14 },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
};

// Common styles
export const commonStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
  },
});
```

## Navigation Pattern Migration

### Web (React Router/Wouter)
```jsx
// From: client/src/App.tsx
import { Switch, Route } from "wouter";

<Switch>
  <Route path="/patients/:id" component={PatientView} />
  <Route path="/encounters/:id" component={EncounterView} />
</Switch>
```

### Mobile (React Navigation)
```jsx
// To: src/navigation/AppNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

<Stack.Navigator>
  <Stack.Screen 
    name="PatientView" 
    component={PatientView}
    options={({ route }) => ({
      title: 'Patient Chart',
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: 'white',
    })}
  />
  <Stack.Screen 
    name="EncounterView" 
    component={EncounterView}
    options={{ title: 'Encounter Details' }}
  />
</Stack.Navigator>

// Navigation usage
navigation.navigate('PatientView', { patientId: 123 });
```

## Data Management Migration

### Web (TanStack Query)
```jsx
// From: client/src/pages/dashboard.tsx
const { data: patient, isLoading } = useQuery({
  queryKey: ["/api/patients", patientId],
  enabled: !!patientId,
});
```

### Mobile (TanStack Query with React Native)
```jsx
// To: src/hooks/usePatient.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const usePatient = (patientId: number) => {
  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: () => api.apiRequest('GET', `/api/patients/${patientId}`),
    enabled: !!patientId,
  });
};

// Usage in component
const { data: patient, isLoading, refetch } = usePatient(patientId);
```

## Common Pitfalls & Solutions

### 1. Keyboard Handling
```jsx
// Always wrap forms in KeyboardAvoidingView
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* Your form content */}
</KeyboardAvoidingView>
```

### 2. Safe Area Handling
```jsx
// Use SafeAreaView for proper screen boundaries
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  {/* Your screen content */}
</SafeAreaView>
```

### 3. List Performance
```jsx
// Use FlatList for large lists, not ScrollView
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemComponent item={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews={true}
/>
```

### 4. Image Handling
```jsx
// Use expo-image for better performance
import { Image } from 'expo-image';

<Image
  source={{ uri: patient.photoUrl }}
  style={styles.avatar}
  placeholder={blurhash}
  contentFit="cover"
  transition={1000}
/>
```

## Testing Your Migration

1. **Component Testing**
   ```bash
   # Install testing dependencies
   npm install --save-dev @testing-library/react-native jest-expo
   ```

2. **API Testing**
   ```javascript
   // Test your API connections
   const testConnection = async () => {
     try {
       await api.init();
       const user = await api.apiRequest('GET', '/api/user');
       console.log('API connection successful:', user);
     } catch (error) {
       console.error('API connection failed:', error);
     }
   };
   ```

3. **Device Testing**
   - Use Expo Go app on physical devices
   - Test on both iOS and Android
   - Check different screen sizes
   - Test offline scenarios

## Next Steps

1. Start with the login screen (most isolated)
2. Build the navigation structure
3. Migrate patient list (core functionality)
4. Add voice recording (unique mobile feature)
5. Implement chart viewing
6. Add order entry
7. Test thoroughly on devices