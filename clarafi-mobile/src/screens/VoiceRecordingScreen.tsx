import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { apiClient } from '../services/api';
import { VoiceRecordingState } from '../types';

interface VoiceRecordingScreenProps {
  navigation: any;
  route?: any;
}

export const VoiceRecordingScreen: React.FC<VoiceRecordingScreenProps> = ({ navigation, route }) => {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    recordingUri: undefined,
    transcription: undefined,
    isTranscribing: false,
    error: undefined,
  });
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [generatedNote, setGeneratedNote] = useState<string>('');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  
  const patientId = route?.params?.patientId;
  const encounterId = route?.params?.encounterId;

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required for voice recording');
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setRecordingState(prev => ({ ...prev, isRecording: true, error: undefined }));
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setRecordingState(prev => ({ ...prev, isRecording: false }));
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        setRecordingState(prev => ({ ...prev, recordingUri: uri }));
        // TODO: Upload audio and get transcription
        // For now, simulate transcription
        await transcribeAudio(uri);
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording');
    }
  };

  const transcribeAudio = async (uri: string) => {
    setRecordingState(prev => ({ ...prev, isTranscribing: true }));
    
    try {
      // TODO: Implement actual audio upload and transcription
      // For now, simulate with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTranscription = `Patient presents with chest pain that started 3 days ago. 
The pain is described as sharp, located in the center of the chest, radiating to the left arm. 
Pain is 7 out of 10 in severity. Associated with shortness of breath and mild nausea. 
No fever or cough. Patient has history of hypertension, currently on lisinopril 10mg daily.
Vital signs: BP 145/90, HR 88, RR 18, Temp 98.6F, O2 sat 97% on room air.`;
      
      setRecordingState(prev => ({
        ...prev,
        transcription: mockTranscription,
        isTranscribing: false,
      }));
    } catch (error) {
      console.error('Transcription failed:', error);
      setRecordingState(prev => ({
        ...prev,
        isTranscribing: false,
        error: 'Failed to transcribe audio',
      }));
    }
  };

  const generateSOAPNote = async () => {
    if (!recordingState.transcription) return;

    setIsGeneratingNote(true);
    try {
      const result = await apiClient.generateSOAPNote(
        recordingState.transcription,
        encounterId
      );
      setGeneratedNote(result.soapNote || '');
    } catch (error) {
      console.error('Failed to generate SOAP note:', error);
      Alert.alert('Error', 'Failed to generate SOAP note');
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const updateChart = async () => {
    if (!generatedNote) return;

    try {
      await apiClient.updateChartFromNote(generatedNote, encounterId || 0);
      Alert.alert('Success', 'Chart updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update chart:', error);
      Alert.alert('Error', 'Failed to update chart');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Recording Controls */}
        <View style={styles.recordingSection}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              recordingState.isRecording && styles.recordButtonActive
            ]}
            onPress={recordingState.isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.recordButtonIcon}>
              {recordingState.isRecording ? '⏹️' : '🎙️'}
            </Text>
            <Text style={styles.recordButtonText}>
              {recordingState.isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {recordingState.isRecording && (
            <Text style={styles.recordingIndicator}>Recording...</Text>
          )}
        </View>

        {/* Transcription Section */}
        {(recordingState.isTranscribing || recordingState.transcription) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transcription</Text>
            {recordingState.isTranscribing ? (
              <ActivityIndicator size="large" color="#003366" />
            ) : (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionText}>
                  {recordingState.transcription}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Generate SOAP Note Button */}
        {recordingState.transcription && !generatedNote && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={generateSOAPNote}
            disabled={isGeneratingNote}
          >
            {isGeneratingNote ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Generate SOAP Note</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Generated SOAP Note */}
        {generatedNote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated SOAP Note</Text>
            <View style={styles.soapBox}>
              <Text style={styles.soapText}>{generatedNote}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={updateChart}
            >
              <Text style={styles.actionButtonText}>Update Patient Chart</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
  },
  recordingSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#003366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordButtonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingIndicator: {
    marginTop: 16,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  transcriptionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  soapBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  soapText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});