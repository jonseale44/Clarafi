import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export const VoiceRecordingScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Request audio permissions on mount
  useEffect(() => {
    Audio.requestPermissionsAsync();
  }, []);

  const connectWebSocket = () => {
    // Connect to your existing WebSocket proxy
    const websocket = new WebSocket('ws://localhost:5000/api/realtime/connect');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Send session configuration
      websocket.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a medical scribe. Transcribe the audio clearly.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            silence_duration_ms: 500
          },
          tool_choice: 'auto'
        }
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'conversation.item.created' && data.item.type === 'message') {
        // Update transcription with new text
        if (data.item.content?.[0]?.transcript) {
          setTranscription(prev => prev + ' ' + data.item.content[0].transcript);
        }
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    setWs(websocket);
  };

  const startRecording = async () => {
    try {
      // Connect WebSocket first
      connectWebSocket();

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

      // Start monitoring recording status
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && ws && ws.readyState === WebSocket.OPEN) {
          // In a real implementation, we'd stream audio chunks here
          console.log('Recording...', status.durationMillis);
        }
      });

    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording saved to', uri);

      // In production, we'd upload this to server for processing
      // For now, let's simulate transcription completion
      setTimeout(() => {
        setTranscription(prev => prev + '\n\n[Recording completed]');
      }, 1000);

      // Close WebSocket
      if (ws) {
        ws.close();
      }

      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Recording</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <View style={[styles.recordIcon, isRecording && styles.recordingIcon]} />
        <Text style={styles.recordText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      <View style={styles.transcriptionContainer}>
        <Text style={styles.sectionTitle}>Live Transcription</Text>
        <View style={styles.transcriptionBox}>
          {transcription ? (
            <Text style={styles.transcriptionText}>{transcription}</Text>
          ) : (
            <Text style={styles.placeholderText}>
              Transcription will appear here as you speak...
            </Text>
          )}
        </View>
      </View>

      {transcription && (
        <TouchableOpacity style={styles.generateButton}>
          <Text style={styles.generateButtonText}>Generate SOAP Note</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  recordButton: {
    backgroundColor: '#003366',
    borderRadius: 100,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  recordingIcon: {
    borderRadius: 5,
  },
  recordText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transcriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003366',
    marginBottom: 10,
  },
  transcriptionBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#003366',
  },
});