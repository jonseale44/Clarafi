import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../hooks/useAuth';

// Import screens
import { LoginScreen } from '../screens/LoginScreen';
import { PatientListScreen } from '../screens/PatientListScreen';
import { VoiceRecordingScreen } from '../screens/VoiceRecordingScreen';
import { PatientChartScreen } from '../screens/PatientChartScreen';
import { OrderEntryScreen } from '../screens/OrderEntryScreen';

// Stack Navigator Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PatientChart: { patientId: number };
  VoiceRecording: { patientId?: number; encounterId?: number };
  EncounterDetail: { encounterId: number };
  OrderEntry: { encounterId: number };
};

export type MainTabParamList = {
  Patients: undefined;
  Voice: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens (to be implemented)
const OrdersScreen = () => <Text>Orders Screen</Text>;
const ProfileScreen = () => <Text>Profile Screen</Text>;

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#003366',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Patients"
        component={PatientListScreen}
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Voice"
        component={VoiceRecordingScreen}
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🎙️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
export const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // TODO: Add splash screen
    return <Text>Loading...</Text>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#003366',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PatientChart"
              component={PatientChartScreen}
              options={{ title: 'Patient Chart' }}
            />
            <Stack.Screen
              name="VoiceRecording"
              component={VoiceRecordingScreen}
              options={{ title: 'Voice Recording' }}
            />
            <Stack.Screen
              name="OrderEntry"
              component={OrderEntryScreen}
              options={{ title: 'Order Entry' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};