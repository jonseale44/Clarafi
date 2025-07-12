# Practical Mobile Migration Guide

## Quick Start Workflow

### 1. Initial Setup (Do This First)
```bash
# In your clarafi-mobile directory
npm install @tanstack/react-query axios @react-navigation/native @react-navigation/stack
npm install react-native-safe-area-context react-native-screens react-native-gesture-handler
```

### 2. File-by-File Migration Order

#### Week 1: Foundation
1. **API Service** (Most Critical)
   - Source: `client/src/lib/api-client.ts`
   - Target: `clarafi-mobile/src/services/api.ts`
   - Changes: Add environment detection, token storage

2. **Types/Interfaces**
   - Source: `shared/schema.ts`
   - Target: `clarafi-mobile/src/types/index.ts`
   - Changes: Copy as-is, these are reusable

3. **Authentication Flow**
   - Source: `client/src/pages/auth-page.tsx`
   - Target: `clarafi-mobile/src/screens/LoginScreen.tsx`
   - Add: Registration, Location Selection

#### Week 2: Core Features
4. **Patient List**
   - Source: `client/src/pages/patients-page.tsx`
   - Target: `clarafi-mobile/src/screens/PatientListScreen.tsx`
   - Add: Pull-to-refresh, search filters

5. **Patient Chart Structure**
   - Source: `client/src/pages/patient-detail.tsx`
   - Target: `clarafi-mobile/src/screens/PatientChartScreen.tsx`
   - Add: Tab navigation for sections

6. **Chart Sections** (Do in parallel)
   - Allergies: `client/src/components/chart-sections/allergies-section.tsx`
   - Medications: `client/src/components/chart-sections/medications-section.tsx`
   - Vitals: `client/src/components/chart-sections/vitals-section.tsx`

### 3. Code Transformation Patterns

#### Pattern 1: Component Structure
```typescript
// Web Component
export function AllergiesSection({ patientId }: { patientId: number }) {
  const { data: allergies, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/allergies`],
  });
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Allergies</h2>
      {allergies?.map(allergy => (
        <div key={allergy.id} className="p-4 border rounded">
          <p>{allergy.allergen}</p>
        </div>
      ))}
    </div>
  );
}

// Mobile Component
export function AllergiesSection({ patientId }: { patientId: number }) {
  const { data: allergies, isLoading } = useQuery({
    queryKey: ['allergies', patientId],
    queryFn: () => api.getAllergies(patientId),
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Allergies</Text>
      <ScrollView>
        {allergies?.map(allergy => (
          <View key={allergy.id} style={styles.allergyCard}>
            <Text>{allergy.allergen}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  allergyCard: { 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8 
  }
});
```

#### Pattern 2: Form Handling
```typescript
// Web Form
<form onSubmit={handleSubmit}>
  <input 
    type="text" 
    value={value} 
    onChange={e => setValue(e.target.value)}
    className="input"
  />
  <button type="submit">Submit</button>
</form>

// Mobile Form
<View>
  <TextInput
    value={value}
    onChangeText={setValue}
    style={styles.input}
    placeholder="Enter text"
  />
  <TouchableOpacity onPress={handleSubmit} style={styles.button}>
    <Text style={styles.buttonText}>Submit</Text>
  </TouchableOpacity>
</View>
```

#### Pattern 3: Lists and Scrolling
```typescript
// Web List
<div className="overflow-y-auto h-screen">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>

// Mobile List
<FlatList
  data={items}
  keyExtractor={item => item.id.toString()}
  renderItem={({ item }) => <ItemCard {...item} />}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

### 4. GitHub Workflow Setup

#### Repository Structure:
```bash
# Create branch for mobile development
git checkout -b mobile-migration

# Create feature branches for each component
git checkout -b mobile-migration/auth-flow
git checkout -b mobile-migration/patient-list
git checkout -b mobile-migration/chart-sections
```

#### Commit Strategy:
```bash
# Commit pattern
git commit -m "mobile: implement [feature] for React Native

- Converted [web component] to React Native
- Added [mobile-specific features]
- Tested on [iOS/Android]"
```

### 5. Component Library Setup

Create these base components first:

#### Button Component
```typescript
// clarafi-mobile/src/components/ui/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ title, onPress, loading, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={loading}
      style={[styles.button, styles[variant]]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
```

#### Input Component
```typescript
// clarafi-mobile/src/components/ui/Input.tsx
import { TextInput, View, Text } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

### 6. Testing Each Component

#### iOS Testing:
```bash
# Run on iOS simulator
npx expo run:ios

# Test on physical iOS device
npx expo start --tunnel
```

#### Android Testing:
```bash
# Run on Android emulator
npx expo run:android

# Test on physical Android device
npx expo start --tunnel
```

### 7. Performance Optimization

#### Lazy Loading:
```typescript
// Use React.lazy for screen components
const PatientChartScreen = lazy(() => import('./screens/PatientChartScreen'));

// In navigation
<Stack.Screen
  name="PatientChart"
  component={PatientChartScreen}
  options={{ lazy: true }}
/>
```

#### List Optimization:
```typescript
// Use getItemLayout for fixed height items
<FlatList
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

### 8. Daily Migration Checklist

- [ ] Choose one component to migrate
- [ ] Create mobile version in feature branch
- [ ] Test on both iOS and Android
- [ ] Create PR with screenshots
- [ ] Document any mobile-specific changes
- [ ] Update migration progress tracker

### 9. Common Pitfalls to Avoid

1. **Don't use web-specific APIs**: No `window`, `document`, `localStorage`
2. **Handle keyboard properly**: Use `KeyboardAvoidingView`
3. **Test gesture handlers**: Swipe, pinch, long press
4. **Consider offline support**: Cache critical data
5. **Handle deep linking**: For navigation from notifications

### 10. Progress Tracking Template

Create a `MIGRATION_PROGRESS.md` file:

```markdown
# Migration Progress

## Completed ✅
- [ ] API Service setup
- [ ] Authentication flow
- [ ] Basic navigation

## In Progress 🚧
- [ ] Patient list enhancements
- [ ] Chart section components

## Pending ⏳
- [ ] SOAP note editor
- [ ] Order management
- [ ] Document viewer
```