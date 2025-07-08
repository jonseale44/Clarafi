import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { VoiceRecordingScreen } from './src/screens/VoiceRecordingScreen';

type Screen = 'home' | 'voice' | 'patients' | 'orders';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // Voice Recording Screen
  if (currentScreen === 'voice') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Voice Recording</Text>
          <View style={{ width: 50 }} />
        </View>
        <VoiceRecordingScreen />
      </SafeAreaView>
    );
  }

  // Home Screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={styles.logoNavy}>CLAR</Text>
            <Text style={styles.logoGold}>AFI</Text>
          </Text>
          <Text style={styles.subtitle}>EMR Mobile</Text>
        </View>
        
        <Text style={styles.welcome}>Welcome to Clarafi Mobile!</Text>
        <Text style={styles.description}>
          Full-featured EMR with voice transcription
        </Text>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity 
            style={[styles.menuButton, styles.voiceButton]}
            onPress={() => setCurrentScreen('voice')}
          >
            <Text style={styles.menuIcon}>🎤</Text>
            <Text style={[styles.menuLabel, { color: '#fff' }]}>Voice</Text>
            <Text style={[styles.menuDesc, { color: '#FFD700' }]}>Record & Transcribe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuButton, styles.disabledButton]}>
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuLabel}>Patients</Text>
            <Text style={styles.menuDesc}>Coming Soon</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuButton, styles.disabledButton]}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>Orders</Text>
            <Text style={styles.menuDesc}>Coming Soon</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuButton, styles.disabledButton]}>
            <Text style={styles.menuIcon}>📄</Text>
            <Text style={styles.menuLabel}>Charts</Text>
            <Text style={styles.menuDesc}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
        
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backText: {
    fontSize: 16,
    color: '#003366',
    fontWeight: '500',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  logoNavy: {
    color: '#003366',
  },
  logoGold: {
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  menuButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButton: {
    backgroundColor: '#003366',
  },
  disabledButton: {
    opacity: 0.6,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  menuDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#003366',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
