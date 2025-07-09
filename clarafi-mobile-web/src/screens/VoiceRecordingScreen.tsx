import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Save, ChevronLeft } from 'lucide-react'
import axios from 'axios'

const VoiceRecordingScreen: React.FC = () => {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [soapNote, setSoapNote] = useState('')
  const [loading, setLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone')
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setLoading(true)

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Simulate transcription (in production, you'd send to your transcription endpoint)
      const mockTranscript = "Patient presents today with complaints of chest pain that started 3 days ago. Pain is described as sharp, 7/10 severity, worse with deep breathing. No associated shortness of breath, fever, or cough. Patient denies any recent trauma. Vital signs are stable. Physical exam reveals tenderness over the left chest wall."
      
      setTranscript(mockTranscript)
      
      // Generate SOAP note
      const soapResponse = await axios.post('/api/generate-soap', {
        transcript: mockTranscript,
        patientId
      }, { withCredentials: true })
      
      setSoapNote(soapResponse.data.soapNote || "SOAP note generation in progress...")
    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Transcription failed')
    } finally {
      setLoading(false)
    }
  }

  const saveEncounter = async () => {
    try {
      setLoading(true)
      await axios.post(`/api/patients/${patientId}/encounters`, {
        transcript,
        soapNote,
        date: new Date().toISOString()
      }, { withCredentials: true })
      
      navigate(`/patient/${patientId}`)
    } catch (error) {
      console.error('Error saving encounter:', error)
      alert('Failed to save encounter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-blue text-white p-4">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Voice Recording</h1>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="p-6">
        <div className="flex flex-col items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`rounded-full p-8 mb-6 transition-all ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gold hover:bg-yellow-600'
            }`}
            disabled={loading}
          >
            {isRecording ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-navy-blue" />
            )}
          </button>
          
          <p className="text-gray-600 mb-8">
            {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2">Transcript</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        )}

        {/* SOAP Note */}
        {soapNote && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2">SOAP Note</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{soapNote}</div>
          </div>
        )}

        {/* Save Button */}
        {transcript && (
          <button
            onClick={saveEncounter}
            disabled={loading}
            className="w-full bg-navy-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Encounter
          </button>
        )}

        {loading && (
          <div className="text-center mt-6">
            <div className="text-gray-500">Processing...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceRecordingScreen