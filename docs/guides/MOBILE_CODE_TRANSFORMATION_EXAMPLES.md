# Real EMR Code Transformation Examples

## 1. Patient List Transformation

### Web Version (from patients-page.tsx)
```tsx
// Web: Using Tailwind CSS and HTML elements
export function PatientsPage() {
  const { data: patients, isLoading } = useQuery({
    queryKey: ['/api/patients'],
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Patients</h1>
        <Button onClick={() => navigate('/patients/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Patient
        </Button>
      </div>
      
      <div className="grid gap-4">
        {patients?.map(patient => (
          <Card key={patient.id} className="p-4 hover:shadow-lg">
            <h3>{patient.firstName} {patient.lastName}</h3>
            <p>DOB: {patient.dateOfBirth}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Mobile Version
```tsx
// Mobile: Using React Native components and StyleSheet
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export function PatientListScreen() {
  const navigation = useNavigation();
  const { data: patients, isLoading, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients(),
  });

  const renderPatient = ({ item }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientChart', { patientId: item.id })}
    >
      <Text style={styles.patientName}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.patientInfo}>
        DOB: {new Date(item.dateOfBirth).toLocaleDateString()}
      </Text>
      <Text style={styles.patientInfo}>
        MRN: {item.mrn}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('NewPatient')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPatient}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  patientCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  patientInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});
```

## 2. Allergies Section Transformation

### Web Version
```tsx
// Web: From allergies-section.tsx
export function AllergiesSection({ patientId }: { patientId: number }) {
  const { data: allergies } = useQuery({
    queryKey: [`/api/patients/${patientId}/allergies`],
  });

  return (
    <Accordion type="single" collapsible defaultValue="allergies">
      <AccordionItem value="allergies">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Allergies</span>
            {allergies?.some(a => a.severity === 'severe') && (
              <Badge variant="destructive">Severe</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {allergies?.map(allergy => (
              <div key={allergy.id} className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <h4 className="font-medium">{allergy.allergen}</h4>
                  <Badge variant={getSeverityVariant(allergy.severity)}>
                    {allergy.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Reaction: {allergy.reaction}
                </p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

### Mobile Version
```tsx
// Mobile: Allergies component with collapsible section
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export function AllergiesSection({ patientId }: { patientId: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: allergies } = useQuery({
    queryKey: ['allergies', patientId],
    queryFn: () => api.getAllergies(patientId),
  });

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return '#DC2626';
      case 'moderate': return '#F59E0B';
      case 'mild': return '#10B981';
      default: return '#6B7280';
    }
  };

  const hasSevereAllergies = allergies?.some(a => a.severity === 'severe');

  return (
    <View style={styles.section}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name="warning" 
            size={20} 
            color={hasSevereAllergies ? '#DC2626' : '#6B7280'} 
          />
          <Text style={styles.headerTitle}>Allergies</Text>
          {hasSevereAllergies && (
            <View style={styles.severeBadge}>
              <Text style={styles.severeBadgeText}>Severe</Text>
            </View>
          )}
        </View>
        <MaterialIcons 
          name={isExpanded ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#6B7280" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {allergies?.length === 0 ? (
            <Text style={styles.emptyText}>No known allergies</Text>
          ) : (
            allergies?.map(allergy => (
              <View key={allergy.id} style={styles.allergyItem}>
                <View style={styles.allergyHeader}>
                  <Text style={styles.allergen}>{allergy.allergen}</Text>
                  <View style={[
                    styles.severityBadge, 
                    { backgroundColor: getSeverityColor(allergy.severity) }
                  ]}>
                    <Text style={styles.severityText}>
                      {allergy.severity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reaction}>
                  Reaction: {allergy.reaction}
                </Text>
                {allergy.notes && (
                  <Text style={styles.notes}>{allergy.notes}</Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  severeBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  allergyItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  allergyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  allergen: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reaction: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
```

## 3. Voice Recording Transformation

### Web Version
```tsx
// Web: Voice recording with WebSocket
export function VoiceRecording({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef<WebSocket>();

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    wsRef.current = new WebSocket('/api/realtime/connect');
    
    mediaRecorder.ondataavailable = (event) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }
    };
    
    mediaRecorder.start(100);
    setIsRecording(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          "rounded-full p-6",
          isRecording ? "bg-red-500" : "bg-blue-500"
        )}
      >
        <Mic className="w-8 h-8 text-white" />
      </button>
      {isRecording && <p>Recording...</p>}
    </div>
  );
}
```

### Mobile Version
```tsx
// Mobile: Voice recording with Expo AV
import { Audio } from 'expo-av';
import { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function VoiceRecording({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startRecording = async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert('Permission to access microphone is required!');
        return;
      }

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);

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
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    pulseAnim.stopAnimation();

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    // Upload audio for transcription
    const formData = new FormData();
    formData.append('audio', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    try {
      const response = await api.transcribeAudio(formData);
      onTranscript(response.transcript);
    } catch (error) {
      console.error('Transcription failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        style={[
          styles.recordButton,
          isRecording && styles.recordingButton
        ]}
      >
        <Animated.View
          style={[
            styles.pulseCircle,
            isRecording && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={32} 
          color="white" 
        />
      </TouchableOpacity>
      
      {isRecording && (
        <Text style={styles.recordingText}>Recording...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#003366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingButton: {
    backgroundColor: '#DC2626',
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  recordingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
});
```

## 4. Form Handling Transformation

### Web Version (Login Form)
```tsx
// Web: Using react-hook-form and zod
export function LoginForm() {
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Login</Button>
      </form>
    </Form>
  );
}
```

### Mobile Version
```tsx
// Mobile: Using React Hook Form with React Native
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function LoginForm() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[
                styles.input,
                errors.username && styles.inputError
              ]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter username"
              autoCapitalize="none"
            />
            {errors.username && (
              <Text style={styles.errorText}>
                {errors.username.message}
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[
                styles.input,
                errors.password && styles.inputError
              ]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter password"
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.errorText}>
                {errors.password.message}
              </Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit(onSubmit)}
      >
        <Text style={styles.submitButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 5. Modal/Dialog Transformation

### Web Version
```tsx
// Web: Using Radix UI Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Allergy</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Input
        placeholder="Allergen"
        value={allergen}
        onChange={(e) => setAllergen(e.target.value)}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Mobile Version
```tsx
// Mobile: Using React Native Modal
<Modal
  visible={open}
  transparent
  animationType="slide"
  onRequestClose={() => setOpen(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Allergy</Text>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        <TextInput
          style={styles.input}
          placeholder="Allergen"
          value={allergen}
          onChangeText={setAllergen}
        />
      </View>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => setOpen(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

## Common Patterns Summary

1. **Styling**: Tailwind classes → StyleSheet objects
2. **Events**: onClick → onPress
3. **Scrolling**: overflow-y-auto → ScrollView/FlatList
4. **Forms**: HTML forms → Controlled components
5. **Icons**: Lucide React → Expo vector icons
6. **Navigation**: React Router → React Navigation
7. **Modals**: Radix/Headless UI → React Native Modal
8. **Animations**: CSS transitions → Animated API