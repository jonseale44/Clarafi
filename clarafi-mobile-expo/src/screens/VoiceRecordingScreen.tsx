import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export const VoiceRecordingScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState('');

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      // Here you would call your API to transcribe
      setTranscription('Recording saved. Transcription will appear here...');
    }
    
    setRecording(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.recordingSection}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons 
            name={isRecording ? "stop" : "mic"} 
            size={48} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        
        {isRecording && (
          <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
        )}
        
        <Text style={styles.statusText}>
          {isRecording ? 'Recording...' : 'Tap to start recording'}
        </Text>
      </View>

      <ScrollView style={styles.transcriptionSection}>
        <Text style={styles.sectionTitle}>Transcription</Text>
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionText}>
            {transcription || 'Your transcription will appear here'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text" size={24} color="#003366" />
          <Text style={styles.actionButtonText}>Generate SOAP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="list" size={24} color="#003366" />
          <Text style={styles.actionButtonText}>Parse Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#003366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingActive: {
    backgroundColor: '#FF4444',
  },
  duration: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  transcriptionSection: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  transcriptionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#003366',
  },
});