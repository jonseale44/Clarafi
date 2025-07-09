import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { api } from './src/services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Initialize API service
    api.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#003366" />
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}