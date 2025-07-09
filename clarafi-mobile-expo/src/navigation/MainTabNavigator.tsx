import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { PatientListScreen } from '../screens/PatientListScreen';
import { VoiceRecordingScreen } from '../screens/VoiceRecordingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#003366',
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#FFFFFF',
        headerStyle: {
          backgroundColor: '#003366',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tab.Screen
        name="Patients"
        component={PatientListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={VoiceRecordingScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};